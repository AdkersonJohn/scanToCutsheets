"""
import_inventory.py — one-shot loader for RefreshAssetInventory SharePoint list.

Reads an Excel export and pushes rows to SharePoint via REST $batch using
user-delegated credentials (device code flow). No admin consent required.

Run via: npm run inventory
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator

from openpyxl import load_workbook


# --- Constants ---

TENANT_URL = "https://encoretch.sharepoint.com"
SITE_PATH = "/sites/CCHMCRefreshSupport"
SITE_URL = f"{TENANT_URL}{SITE_PATH}"
LIST_NAME = "RefreshAssetInventory"

# Pre-consented Microsoft public apps (device code flow, no admin needed).
CLIENT_IDS = [
    "14d82eec-204b-4c2f-b7e8-296a70dab67e",  # Microsoft Graph CLI Tools
    "31359c7f-bd7e-475c-86db-fdb8c937548e",  # PnP Management Shell
]
SCOPES = [f"{TENANT_URL}/.default"]

BATCH_SIZE = 100
BYTES_PER_GB = 1073741824

# Source Excel header -> (destination SP column, transform kind).
# Transforms: "text" = str(v).strip(); "gb" = round(float(v) / BYTES_PER_GB).
HEADER_MAP: dict[str, tuple[str, str]] = {
    "Device name":            ("DeviceName",   "text"),
    "Serial number":          ("SerialNumber", "text"),
    "Make":                   ("Make",         "text"),
    "Model":                  ("Model",        "text"),
    "Disk 1 size":            ("DiskSize",     "gb"),
    "Total physical memory":  ("RAM",          "gb"),
    "CPU name":               ("CPU",          "text"),
}

CACHE_PATH = Path(__file__).parent / ".token_cache.json"
PROGRESS_PATH = Path(__file__).parent / ".import_progress.json"


# --- Excel ---

def load_headers(sheet) -> dict[str, int]:
    """Read row 1 as headers, return {normalized_header: 1-based column index}."""
    result: dict[str, int] = {}
    for cell in sheet[1]:
        if cell.value is None:
            continue
        key = str(cell.value).strip().lower()
        if key:
            result[key] = cell.column
    return result


def validate_headers(headers: dict[str, int]) -> None:
    """Raise ValueError if any required header from HEADER_MAP is missing."""
    missing = [name for name in HEADER_MAP if name.lower() not in headers]
    if missing:
        # Map normalized headers back to their original HEADER_MAP names for display
        original_map = {k.lower(): k for k in HEADER_MAP}
        found = sorted([original_map.get(h, h) for h in headers.keys()])
        raise ValueError(
            f"Missing required headers: {missing}. Found headers: {found}"
        )


def transform_row(row_values: tuple, header_index: dict[str, int]) -> dict | None:
    """
    Transform a raw Excel row tuple into a SharePoint item dict.
    Returns None for rows that should be skipped (blank DeviceName).
    """
    out: dict = {}
    for src_header, (dest_col, kind) in HEADER_MAP.items():
        col_idx = header_index.get(src_header.lower())
        if col_idx is None:
            # validate_headers should have caught this; defensive fallback.
            out[dest_col] = "" if kind == "text" else 0
            continue
        raw = row_values[col_idx - 1]
        if kind == "text":
            out[dest_col] = "" if raw is None else str(raw).strip()
        elif kind == "gb":
            try:
                out[dest_col] = round(float(raw) / BYTES_PER_GB)
            except (TypeError, ValueError):
                out[dest_col] = 0

    if not out.get("DeviceName"):
        return None
    return out


def iter_rows(xlsx_path: str, limit: int | None = None) -> Iterator[dict]:
    """
    Stream transformed rows from the workbook. Validates headers on open.
    Skips rows where DeviceName is blank. Respects `limit` if given (counts
    emitted rows, not skipped ones).
    """
    wb = load_workbook(filename=xlsx_path, read_only=True, data_only=True)
    try:
        sheet = wb.active
        headers = load_headers(sheet)
        validate_headers(headers)

        emitted = 0
        for idx, row in enumerate(sheet.iter_rows(values_only=True)):
            if idx == 0:
                continue  # header row
            transformed = transform_row(row, headers)
            if transformed is None:
                continue
            yield transformed
            emitted += 1
            if limit is not None and emitted >= limit:
                return
    finally:
        wb.close()
