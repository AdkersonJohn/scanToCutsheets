"""
import_inventory.py — one-shot loader for RefreshAssetInventory SharePoint list.

Reads an Excel export and pushes rows to SharePoint via REST $batch using
user-delegated credentials (device code flow). No admin consent required.

Run via: npm run inventory
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterator


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
