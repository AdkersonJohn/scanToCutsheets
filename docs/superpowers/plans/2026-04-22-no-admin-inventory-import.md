# No-Admin Inventory Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local Python script (`npm run inventory`) that loads 65k rows from `Refresh Asset Data.xlsx` into the `RefreshAssetInventory` SharePoint list, authenticating as the user with zero admin consent.

**Architecture:** Single Python file (`src/sharepoint/import_inventory.py`) with pure functions for Excel reading, data transformation, batch body construction, and HTTP retry logic. Auth via MSAL device code flow against a pre-consented public Microsoft client ID. Writes via SharePoint REST `$batch` endpoint (100 items per HTTP call). Rerunnable with `--clear-first` / `--resume` / `--dry-run` / `--limit` flags.

**Tech Stack:** Python 3, `msal`, `openpyxl`, `requests`, `pytest` (tests), `responses` (HTTP mocking).

**Spec:** `docs/superpowers/specs/2026-04-22-no-admin-inventory-import-design.md`

---

## File Structure

### New files
- `src/sharepoint/import_inventory.py` — main script
- `src/sharepoint/requirements.txt` — runtime deps
- `src/sharepoint/requirements-dev.txt` — test deps
- `src/sharepoint/README-import.md` — usage docs
- `src/sharepoint/tests/__init__.py` — test package marker
- `src/sharepoint/tests/test_excel.py` — Excel reader tests
- `src/sharepoint/tests/test_batch.py` — batch body tests
- `src/sharepoint/tests/test_http.py` — retry/backoff tests
- `src/sharepoint/tests/test_progress.py` — progress state tests
- `src/sharepoint/tests/fixtures/sample.xlsx` — tiny 3-row fixture

### Modified files
- `package.json` — add `"inventory"` script
- `.gitignore` — add venv, token cache, progress file
- `CLAUDE.md` — update inventory section
- `src/powerapps/power-automate-sync-flow-guide.md` — mark obsolete

### Module layout inside `import_inventory.py`

Single file, grouped into sections:
```
# --- Constants ---
TENANT_URL, SITE_URL, LIST_NAME, CLIENT_IDS, SCOPES, BATCH_SIZE, HEADER_MAP

# --- Excel ---
load_headers(sheet) -> dict[str, int]
validate_headers(headers) -> None | raises
transform_row(row_values, header_index) -> dict | None
iter_rows(xlsx_path, limit=None) -> Iterator[dict]

# --- Auth ---
build_msal_app(client_id, cache_path) -> PublicClientApplication
acquire_token(cache_path) -> str  # tries primary then fallback client

# --- SharePoint HTTP ---
sp_headers(token, extra=None) -> dict
sp_get(path, token) -> dict
list_item_count(token) -> int
build_batch_body(items, list_name) -> tuple[str, str]  # (body, boundary)
build_delete_batch_body(item_ids, list_name) -> tuple[str, str]
post_batch(body, boundary, token) -> None  # raises on failure after retries

# --- Progress ---
load_progress() -> dict | None
save_progress(phase, last_batch, total) -> None
clear_progress() -> None

# --- Orchestration ---
clear_list(token) -> int  # returns count deleted
import_items(token, rows, resume_from=0) -> None
main() -> int  # argparse + entrypoint
```

---

## Task 1: Scaffold Python package + deps + ignore rules

**Files:**
- Create: `src/sharepoint/requirements.txt`
- Create: `src/sharepoint/requirements-dev.txt`
- Create: `src/sharepoint/tests/__init__.py` (empty)
- Modify: `.gitignore`

- [ ] **Step 1: Write `requirements.txt`**

Create `src/sharepoint/requirements.txt`:
```
msal>=1.26,<2.0
openpyxl>=3.1,<4.0
requests>=2.31,<3.0
```

- [ ] **Step 2: Write `requirements-dev.txt`**

Create `src/sharepoint/requirements-dev.txt`:
```
-r requirements.txt
pytest>=8.0,<9.0
responses>=0.25,<1.0
```

- [ ] **Step 3: Create empty test package marker**

Create empty file `src/sharepoint/tests/__init__.py`.

- [ ] **Step 4: Extend `.gitignore`**

Append to `.gitignore`:
```

# Python venv + import script state (src/sharepoint/import_inventory.py)
src/sharepoint/.venv/
src/sharepoint/.token_cache.json
src/sharepoint/.import_progress.json
src/sharepoint/__pycache__/
src/sharepoint/tests/__pycache__/
src/sharepoint/.pytest_cache/
```

- [ ] **Step 5: Verify venv bootstraps**

Run: `python3 -m venv src/sharepoint/.venv && src/sharepoint/.venv/bin/pip install -q -r src/sharepoint/requirements-dev.txt`
Expected: exits 0, installs msal/openpyxl/requests/pytest/responses with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/sharepoint/requirements.txt src/sharepoint/requirements-dev.txt src/sharepoint/tests/__init__.py .gitignore
git commit -m "chore: add python deps and gitignore for inventory import script"
```

---

## Task 2: Add `npm run inventory` script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add inventory script**

In `package.json`, add to the `"scripts"` object (after the `"prepare"` entry):
```json
"inventory": "test -d src/sharepoint/.venv || python3 -m venv src/sharepoint/.venv && src/sharepoint/.venv/bin/pip install -q -r src/sharepoint/requirements.txt && src/sharepoint/.venv/bin/python src/sharepoint/import_inventory.py --file \"Refresh Asset Data.xlsx\"",
"inventory:test": "src/sharepoint/.venv/bin/pip install -q -r src/sharepoint/requirements-dev.txt && src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests -v"
```

- [ ] **Step 2: Verify the script line is parseable**

Run: `node -e "console.log(require('./package.json').scripts.inventory)"`
Expected: prints the command string with no JSON parse error.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add npm run inventory script"
```

---

## Task 3: Excel header mapping + validation

**Files:**
- Create: `src/sharepoint/import_inventory.py`
- Create: `src/sharepoint/tests/test_excel.py`

- [ ] **Step 1: Write the failing test**

Create `src/sharepoint/tests/test_excel.py`:
```python
import pytest
from openpyxl import Workbook
from src.sharepoint.import_inventory import (
    HEADER_MAP,
    load_headers,
    validate_headers,
)


def _sheet_with_headers(headers):
    wb = Workbook()
    ws = wb.active
    for col, h in enumerate(headers, start=1):
        ws.cell(row=1, column=col, value=h)
    return ws


def test_load_headers_maps_names_to_column_indexes():
    ws = _sheet_with_headers(["Device name", "Serial number", "Make"])
    result = load_headers(ws)
    assert result == {"device name": 1, "serial number": 2, "make": 3}


def test_load_headers_is_case_insensitive_and_trims_whitespace():
    ws = _sheet_with_headers(["  DEVICE NAME  ", " Make "])
    result = load_headers(ws)
    assert result["device name"] == 1
    assert result["make"] == 2


def test_validate_headers_passes_when_all_required_present():
    headers = {k.lower(): i for i, k in enumerate(HEADER_MAP.keys(), start=1)}
    validate_headers(headers)  # must not raise


def test_validate_headers_raises_listing_missing_and_found():
    headers = {"device name": 1, "make": 2}
    with pytest.raises(ValueError) as exc:
        validate_headers(headers)
    msg = str(exc.value)
    assert "Missing required headers" in msg
    assert "Serial number" in msg
    assert "Found headers" in msg
    assert "Make" in msg
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_excel.py -v`
Expected: FAIL (`ModuleNotFoundError: No module named 'src.sharepoint.import_inventory'`).

- [ ] **Step 3: Create the script skeleton with constants and the two functions**

Create `src/sharepoint/import_inventory.py`:
```python
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
        found = sorted(headers.keys())
        raise ValueError(
            f"Missing required headers: {missing}. "
            f"Found headers: {found}"
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_excel.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_excel.py
git commit -m "feat: add Excel header loading and validation"
```

---

## Task 4: Row transform + row iterator

**Files:**
- Modify: `src/sharepoint/import_inventory.py`
- Modify: `src/sharepoint/tests/test_excel.py`

- [ ] **Step 1: Write the failing tests**

Append to `src/sharepoint/tests/test_excel.py`:
```python
from src.sharepoint.import_inventory import (
    BYTES_PER_GB,
    transform_row,
    iter_rows,
)


def _full_headers():
    return {
        "device name": 1,
        "serial number": 2,
        "make": 3,
        "model": 4,
        "disk 1 size": 5,
        "total physical memory": 6,
        "cpu name": 7,
    }


def test_transform_row_strips_text_and_converts_gb():
    row = ("  EW22-01322 ", "ABC123", "Dell", "LATITUDE 5530",
           256 * BYTES_PER_GB, 16 * BYTES_PER_GB, "Intel Core i5-1235U")
    result = transform_row(row, _full_headers())
    assert result == {
        "DeviceName": "EW22-01322",
        "SerialNumber": "ABC123",
        "Make": "Dell",
        "Model": "LATITUDE 5530",
        "DiskSize": 256,
        "RAM": 16,
        "CPU": "Intel Core i5-1235U",
    }


def test_transform_row_rounds_nearest_gb():
    # 15.9 GB of bytes -> 16 after rounding
    almost_16 = int(15.9 * BYTES_PER_GB)
    row = ("EW22-0", "S", "Dell", "L", almost_16, almost_16, "i5")
    result = transform_row(row, _full_headers())
    assert result["DiskSize"] == 16
    assert result["RAM"] == 16


def test_transform_row_returns_none_when_device_name_blank():
    row = ("   ", "S", "Dell", "L", 100, 100, "i5")
    assert transform_row(row, _full_headers()) is None


def test_transform_row_handles_non_numeric_spec_by_emitting_zero():
    row = ("EW22-0", "S", "Dell", "L", "N/A", None, "i5")
    result = transform_row(row, _full_headers())
    assert result["DiskSize"] == 0
    assert result["RAM"] == 0


def test_iter_rows_yields_dicts_and_respects_limit(tmp_path):
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.append(list(_full_headers().keys()))  # headers as-is
    for i in range(5):
        ws.append([f"EW22-0000{i}", f"SN{i}", "Dell", "LATITUDE 5530",
                   256 * BYTES_PER_GB, 16 * BYTES_PER_GB, "i5"])
    xlsx = tmp_path / "sample.xlsx"
    wb.save(xlsx)

    rows = list(iter_rows(str(xlsx), limit=3))
    assert len(rows) == 3
    assert rows[0]["DeviceName"] == "EW22-00000"
    assert rows[2]["DeviceName"] == "EW22-00002"


def test_iter_rows_skips_blank_device_name_rows(tmp_path):
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.append(list(_full_headers().keys()))
    ws.append(["EW22-00001", "SN1", "Dell", "L", 256 * BYTES_PER_GB, 16 * BYTES_PER_GB, "i5"])
    ws.append(["", "SN2", "Dell", "L", 256 * BYTES_PER_GB, 16 * BYTES_PER_GB, "i5"])
    ws.append(["EW22-00003", "SN3", "Dell", "L", 256 * BYTES_PER_GB, 16 * BYTES_PER_GB, "i5"])
    xlsx = tmp_path / "sample.xlsx"
    wb.save(xlsx)

    rows = list(iter_rows(str(xlsx)))
    names = [r["DeviceName"] for r in rows]
    assert names == ["EW22-00001", "EW22-00003"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_excel.py -v`
Expected: 6 new tests FAIL with `ImportError` on `transform_row` / `iter_rows`.

- [ ] **Step 3: Add `transform_row` and `iter_rows` to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
from openpyxl import load_workbook


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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_excel.py -v`
Expected: 10 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_excel.py
git commit -m "feat: add row transform and streaming row iterator"
```

---

## Task 5: SharePoint batch body builders

**Files:**
- Modify: `src/sharepoint/import_inventory.py`
- Create: `src/sharepoint/tests/test_batch.py`

- [ ] **Step 1: Write the failing tests**

Create `src/sharepoint/tests/test_batch.py`:
```python
from src.sharepoint.import_inventory import (
    LIST_NAME,
    SITE_URL,
    build_batch_body,
    build_delete_batch_body,
)


def test_build_batch_body_returns_body_and_boundary():
    items = [{"DeviceName": "EW22-0001", "RAM": 16}]
    body, boundary = build_batch_body(items, LIST_NAME)
    assert boundary.startswith("batch_")
    assert body.startswith(f"--{boundary}")
    assert body.rstrip().endswith(f"--{boundary}--")


def test_build_batch_body_contains_item_json_and_list_url():
    items = [
        {"DeviceName": "EW22-0001", "RAM": 16, "DiskSize": 256,
         "Make": "Dell", "Model": "LATITUDE 5530", "SerialNumber": "SN1",
         "CPU": "i5"},
    ]
    body, _ = build_batch_body(items, LIST_NAME)

    assert "POST " in body
    assert f"{SITE_URL}/_api/web/lists/getbytitle('{LIST_NAME}')/items" in body
    assert '"DeviceName":"EW22-0001"' in body
    assert '"RAM":16' in body
    assert '"__metadata":{"type":"SP.Data.RefreshAssetInventoryListItem"}' in body
    assert "Content-Type: application/json;odata=verbose" in body


def test_build_batch_body_emits_one_changeset_entry_per_item():
    items = [{"DeviceName": f"EW22-{i:05d}"} for i in range(3)]
    body, _ = build_batch_body(items, LIST_NAME)
    # One changeset boundary marker per item plus opening + closing.
    # We just assert the POST line count equals the number of items.
    assert body.count("POST ") == 3


def test_build_delete_batch_body_contains_delete_verbs_per_id():
    body, boundary = build_delete_batch_body([1, 2, 3], LIST_NAME)
    assert body.count("DELETE ") == 3
    for i in (1, 2, 3):
        assert f"getbytitle('{LIST_NAME}')/items({i})" in body
    assert 'IF-MATCH: *' in body.upper() or 'If-Match: *' in body
    assert body.rstrip().endswith(f"--{boundary}--")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_batch.py -v`
Expected: 4 FAIL on import.

- [ ] **Step 3: Add batch body builders to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
import json
import uuid


def _list_item_type(list_name: str) -> str:
    # SharePoint list item content type: SP.Data.<ListName>ListItem
    return f"SP.Data.{list_name}ListItem"


def build_batch_body(items: list[dict], list_name: str) -> tuple[str, str]:
    """
    Build a multipart/mixed $batch body containing a single changeset with one
    POST per item. Returns (body, outer_boundary).
    """
    batch_boundary = f"batch_{uuid.uuid4()}"
    changeset_boundary = f"changeset_{uuid.uuid4()}"
    list_url = f"{SITE_URL}/_api/web/lists/getbytitle('{list_name}')/items"
    item_type = _list_item_type(list_name)

    lines: list[str] = []
    lines.append(f"--{batch_boundary}")
    lines.append(f"Content-Type: multipart/mixed; boundary={changeset_boundary}")
    lines.append("Content-Length: 1")
    lines.append("Content-Transfer-Encoding: binary")
    lines.append("")

    for idx, item in enumerate(items, start=1):
        payload = {"__metadata": {"type": item_type}, **item}
        body_json = json.dumps(payload, separators=(",", ":"))
        lines.append(f"--{changeset_boundary}")
        lines.append("Content-Type: application/http")
        lines.append("Content-Transfer-Encoding: binary")
        lines.append(f"Content-ID: {idx}")
        lines.append("")
        lines.append(f"POST {list_url} HTTP/1.1")
        lines.append("Accept: application/json;odata=verbose")
        lines.append("Content-Type: application/json;odata=verbose")
        lines.append("")
        lines.append(body_json)
        lines.append("")

    lines.append(f"--{changeset_boundary}--")
    lines.append(f"--{batch_boundary}--")
    lines.append("")
    return "\r\n".join(lines), batch_boundary


def build_delete_batch_body(item_ids: list[int], list_name: str) -> tuple[str, str]:
    """Build a $batch body that deletes each given item id."""
    batch_boundary = f"batch_{uuid.uuid4()}"
    changeset_boundary = f"changeset_{uuid.uuid4()}"
    list_url = f"{SITE_URL}/_api/web/lists/getbytitle('{list_name}')/items"

    lines: list[str] = []
    lines.append(f"--{batch_boundary}")
    lines.append(f"Content-Type: multipart/mixed; boundary={changeset_boundary}")
    lines.append("Content-Length: 1")
    lines.append("Content-Transfer-Encoding: binary")
    lines.append("")

    for idx, item_id in enumerate(item_ids, start=1):
        lines.append(f"--{changeset_boundary}")
        lines.append("Content-Type: application/http")
        lines.append("Content-Transfer-Encoding: binary")
        lines.append(f"Content-ID: {idx}")
        lines.append("")
        lines.append(f"DELETE {list_url}({item_id}) HTTP/1.1")
        lines.append("Accept: application/json;odata=verbose")
        lines.append("If-Match: *")
        lines.append("")

    lines.append(f"--{changeset_boundary}--")
    lines.append(f"--{batch_boundary}--")
    lines.append("")
    return "\r\n".join(lines), batch_boundary
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_batch.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_batch.py
git commit -m "feat: add multipart $batch body builders for inserts and deletes"
```

---

## Task 6: HTTP post_batch with retry + backoff

**Files:**
- Modify: `src/sharepoint/import_inventory.py`
- Create: `src/sharepoint/tests/test_http.py`

- [ ] **Step 1: Write the failing tests**

Create `src/sharepoint/tests/test_http.py`:
```python
import pytest
import responses
from src.sharepoint.import_inventory import (
    SITE_URL,
    post_batch,
    RetryExhaustedError,
)


BATCH_URL = f"{SITE_URL}/_api/$batch"


@responses.activate
def test_post_batch_succeeds_on_200():
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")
    post_batch("body", "boundary_x", token="t", max_retries=3, base_delay=0)
    assert len(responses.calls) == 1


@responses.activate
def test_post_batch_retries_on_429_respecting_retry_after(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep",
        lambda s: sleeps.append(s),
    )
    responses.add(responses.POST, BATCH_URL, status=429,
                  headers={"Retry-After": "2"}, body="throttled")
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")

    post_batch("body", "b", token="t", max_retries=3, base_delay=1)
    assert len(responses.calls) == 2
    assert sleeps == [2.0]


@responses.activate
def test_post_batch_exponential_backoff_when_no_retry_after(monkeypatch):
    sleeps: list[float] = []
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep",
        lambda s: sleeps.append(s),
    )
    for _ in range(3):
        responses.add(responses.POST, BATCH_URL, status=503, body="down")
    responses.add(responses.POST, BATCH_URL, status=200, body="ok")

    post_batch("body", "b", token="t", max_retries=5, base_delay=1)
    assert sleeps == [1.0, 2.0, 4.0]


@responses.activate
def test_post_batch_raises_after_max_retries(monkeypatch):
    monkeypatch.setattr(
        "src.sharepoint.import_inventory.time.sleep", lambda s: None)
    for _ in range(5):
        responses.add(responses.POST, BATCH_URL, status=503, body="down")
    with pytest.raises(RetryExhaustedError):
        post_batch("body", "b", token="t", max_retries=4, base_delay=1)


@responses.activate
def test_post_batch_does_not_retry_on_400():
    responses.add(responses.POST, BATCH_URL, status=400, body="bad")
    with pytest.raises(RetryExhaustedError):
        post_batch("body", "b", token="t", max_retries=5, base_delay=0)
    assert len(responses.calls) == 1  # no retries on 4xx other than 429
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py -v`
Expected: 5 FAIL on import.

- [ ] **Step 3: Add HTTP primitives to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
import time
import requests


class RetryExhaustedError(RuntimeError):
    """Raised when a $batch call fails all retries."""


def sp_headers(token: str, extra: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json;odata=verbose",
    }
    if extra:
        headers.update(extra)
    return headers


def post_batch(body: str, boundary: str, token: str,
               max_retries: int = 5, base_delay: float = 2.0) -> None:
    """
    POST a multipart/mixed $batch body to SharePoint with retry/backoff.
    Retries 429 and 5xx; raises RetryExhaustedError on any other failure
    or after max_retries exhausted.
    """
    url = f"{SITE_URL}/_api/$batch"
    headers = sp_headers(token, {
        "Content-Type": f"multipart/mixed; boundary={boundary}",
    })

    attempt = 0
    while True:
        resp = requests.post(url, headers=headers, data=body.encode("utf-8"), timeout=120)
        if 200 <= resp.status_code < 300:
            return
        should_retry = resp.status_code == 429 or resp.status_code >= 500
        if not should_retry or attempt >= max_retries:
            raise RetryExhaustedError(
                f"Batch POST failed: HTTP {resp.status_code}. Body: {resp.text[:500]}"
            )
        retry_after = resp.headers.get("Retry-After")
        if retry_after is not None:
            try:
                delay = float(retry_after)
            except ValueError:
                delay = base_delay * (2 ** attempt)
        else:
            delay = base_delay * (2 ** attempt)
        time.sleep(delay)
        attempt += 1
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py -v`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_http.py
git commit -m "feat: add post_batch with 429/5xx retry and backoff"
```

---

## Task 7: Progress state save/load/clear

**Files:**
- Modify: `src/sharepoint/import_inventory.py`
- Create: `src/sharepoint/tests/test_progress.py`

- [ ] **Step 1: Write the failing tests**

Create `src/sharepoint/tests/test_progress.py`:
```python
import json
from pathlib import Path

import src.sharepoint.import_inventory as mod


def test_save_and_load_progress_round_trip(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / ".progress.json")
    mod.save_progress(phase="insert", last_batch=12, total=655)
    loaded = mod.load_progress()
    assert loaded["phase"] == "insert"
    assert loaded["last_batch"] == 12
    assert loaded["total"] == 655
    assert "started_at" in loaded


def test_load_progress_returns_none_when_absent(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / ".nope.json")
    assert mod.load_progress() is None


def test_clear_progress_removes_file(tmp_path, monkeypatch):
    p = tmp_path / ".progress.json"
    p.write_text(json.dumps({"phase": "insert"}))
    monkeypatch.setattr(mod, "PROGRESS_PATH", p)
    mod.clear_progress()
    assert not p.exists()


def test_clear_progress_is_idempotent(tmp_path, monkeypatch):
    monkeypatch.setattr(mod, "PROGRESS_PATH", tmp_path / "never.json")
    mod.clear_progress()  # must not raise
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_progress.py -v`
Expected: FAIL on `save_progress` / `load_progress` / `clear_progress` not found.

- [ ] **Step 3: Add progress helpers to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
from datetime import datetime, timezone


def save_progress(phase: str, last_batch: int, total: int) -> None:
    existing = load_progress() or {}
    started_at = existing.get("started_at") or datetime.now(timezone.utc).isoformat()
    data = {
        "phase": phase,
        "last_batch": last_batch,
        "total": total,
        "started_at": started_at,
    }
    PROGRESS_PATH.write_text(json.dumps(data, indent=2))


def load_progress() -> dict | None:
    if not PROGRESS_PATH.exists():
        return None
    try:
        return json.loads(PROGRESS_PATH.read_text())
    except (OSError, json.JSONDecodeError):
        return None


def clear_progress() -> None:
    try:
        PROGRESS_PATH.unlink()
    except FileNotFoundError:
        pass
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_progress.py -v`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_progress.py
git commit -m "feat: add progress state for resume support"
```

---

## Task 8: Auth — MSAL device code flow with client ID fallback

**Files:**
- Modify: `src/sharepoint/import_inventory.py`

*Note:* Auth talks to Microsoft's live identity platform and is hard to meaningfully unit test without heavy mocking. We ship it with manual verification on first run. We add a small unit test only for the fallback logic (pure function behavior).

- [ ] **Step 1: Write the failing test**

Append to `src/sharepoint/tests/test_http.py`:
```python
def test_acquire_token_falls_back_when_primary_client_returns_none(monkeypatch):
    import src.sharepoint.import_inventory as mod

    calls: list[str] = []

    class FakeApp:
        def __init__(self, client_id, authority=None, token_cache=None):
            self.client_id = client_id

        def get_accounts(self):
            return []

        def acquire_token_silent(self, scopes, account):
            return None

        def initiate_device_flow(self, scopes):
            return {"user_code": "ABC", "message": "go here", "device_code": "d"}

        def acquire_token_by_device_flow(self, flow):
            calls.append(self.client_id)
            # Primary client returns an error; fallback returns success.
            if self.client_id == mod.CLIENT_IDS[0]:
                return {"error": "invalid_client", "error_description": "blocked"}
            return {"access_token": "TOKEN_FROM_FALLBACK"}

    monkeypatch.setattr(mod, "_build_msal_app", lambda client_id: FakeApp(client_id))
    token = mod.acquire_token()
    assert token == "TOKEN_FROM_FALLBACK"
    assert calls == mod.CLIENT_IDS  # primary tried first, then fallback
```

- [ ] **Step 2: Run test to verify it fails**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py::test_acquire_token_falls_back_when_primary_client_returns_none -v`
Expected: FAIL (`acquire_token` / `_build_msal_app` not found).

- [ ] **Step 3: Add auth helpers to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
import sys
import msal


AUTH_AUTHORITY = "https://login.microsoftonline.com/common"


def _build_msal_app(client_id: str):
    cache = msal.SerializableTokenCache()
    if CACHE_PATH.exists():
        try:
            cache.deserialize(CACHE_PATH.read_text())
        except Exception:
            pass
    app = msal.PublicClientApplication(
        client_id,
        authority=AUTH_AUTHORITY,
        token_cache=cache,
    )
    app._token_cache_ref = cache  # keep a ref for save-on-exit
    return app


def _save_cache(app) -> None:
    cache = getattr(app, "_token_cache_ref", None)
    if cache is not None and cache.has_state_changed:
        CACHE_PATH.write_text(cache.serialize())


def _try_client(client_id: str) -> str | None:
    app = _build_msal_app(client_id)
    # Try silent token acquisition first.
    for acct in app.get_accounts():
        result = app.acquire_token_silent(SCOPES, account=acct)
        if result and "access_token" in result:
            _save_cache(app)
            return result["access_token"]

    flow = app.initiate_device_flow(scopes=SCOPES)
    if "user_code" not in flow:
        return None
    print(flow.get("message", "Visit https://microsoft.com/devicelogin"))
    sys.stdout.flush()
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" in result:
        _save_cache(app)
        return result["access_token"]
    # Print the error so the user can distinguish "I cancelled" from "blocked".
    print(f"Auth failed with client {client_id}: "
          f"{result.get('error')} — {result.get('error_description')}",
          file=sys.stderr)
    return None


def acquire_token() -> str:
    """
    Try each client ID in CLIENT_IDS in order. Return the first access token
    obtained. Raises RuntimeError if all fail.
    """
    for client_id in CLIENT_IDS:
        token = _try_client(client_id)
        if token:
            return token
    raise RuntimeError(
        "Could not acquire a SharePoint token with any public client ID. "
        "Ask your site owner to grant consent to "
        f"one of: {CLIENT_IDS}"
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py -v`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_http.py
git commit -m "feat: add MSAL device code auth with client id fallback"
```

---

## Task 9: SharePoint read helpers — list_item_count + list_all_item_ids

**Files:**
- Modify: `src/sharepoint/import_inventory.py`
- Modify: `src/sharepoint/tests/test_http.py`

- [ ] **Step 1: Write the failing tests**

Append to `src/sharepoint/tests/test_http.py`:
```python
@responses.activate
def test_list_item_count_parses_json():
    from src.sharepoint.import_inventory import list_item_count, LIST_NAME, SITE_URL
    url = f"{SITE_URL}/_api/web/lists/getbytitle('{LIST_NAME}')/ItemCount"
    responses.add(responses.GET, url, status=200,
                  json={"d": {"ItemCount": 65438}})
    assert list_item_count("t") == 65438


@responses.activate
def test_list_all_item_ids_follows_nextlink_pagination():
    from src.sharepoint.import_inventory import list_all_item_ids, LIST_NAME, SITE_URL
    base = f"{SITE_URL}/_api/web/lists/getbytitle('{LIST_NAME}')/items"
    responses.add(
        responses.GET, base,
        status=200,
        match=[responses.matchers.query_param_matcher(
            {"$select": "Id", "$top": "5000"})],
        json={"d": {"results": [{"Id": 1}, {"Id": 2}],
                    "__next": f"{base}?$skiptoken=abc"}},
    )
    responses.add(
        responses.GET, f"{base}",
        status=200,
        match=[responses.matchers.query_param_matcher({"$skiptoken": "abc"})],
        json={"d": {"results": [{"Id": 3}]}},
    )
    ids = list_all_item_ids("t")
    assert ids == [1, 2, 3]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py -v`
Expected: 2 new FAIL on imports.

- [ ] **Step 3: Add helpers to the script**

Append to `src/sharepoint/import_inventory.py`:
```python
def list_item_count(token: str) -> int:
    url = f"{SITE_URL}/_api/web/lists/getbytitle('{LIST_NAME}')/ItemCount"
    resp = requests.get(url, headers=sp_headers(token), timeout=60)
    resp.raise_for_status()
    return int(resp.json()["d"]["ItemCount"])


def list_all_item_ids(token: str) -> list[int]:
    """Return every item Id in the list, following OData paging."""
    base = f"{SITE_URL}/_api/web/lists/getbytitle('{LIST_NAME}')/items"
    params = {"$select": "Id", "$top": "5000"}
    ids: list[int] = []
    url = base
    while url:
        resp = requests.get(url, headers=sp_headers(token),
                            params=params if url == base else None,
                            timeout=120)
        resp.raise_for_status()
        data = resp.json()["d"]
        ids.extend(int(r["Id"]) for r in data.get("results", []))
        url = data.get("__next")
    return ids
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests/test_http.py -v`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/sharepoint/import_inventory.py src/sharepoint/tests/test_http.py
git commit -m "feat: add list_item_count and paginated list_all_item_ids"
```

---

## Task 10: Orchestration — clear_list, import_items, main

**Files:**
- Modify: `src/sharepoint/import_inventory.py`

*Note:* `main()` / `clear_list` / `import_items` wire together already-tested primitives. We verify with a manual dry-run in Task 13.

- [ ] **Step 1: Add the orchestration layer at the bottom of the script**

Append to `src/sharepoint/import_inventory.py`:
```python
import argparse


def _chunks(seq: list, n: int):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def clear_list(token: str) -> int:
    ids = list_all_item_ids(token)
    if not ids:
        return 0
    total = len(ids)
    print(f"Deleting {total} existing items...")
    for i, chunk in enumerate(_chunks(ids, BATCH_SIZE), start=1):
        body, boundary = build_delete_batch_body(chunk, LIST_NAME)
        post_batch(body, boundary, token)
        done = min(i * BATCH_SIZE, total)
        print(f"  deleted {done}/{total}")
    return total


def import_items(token: str, rows, resume_from: int = 0) -> None:
    buffer: list[dict] = []
    batch_idx = 0
    sent = 0

    for row in rows:
        buffer.append(row)
        if len(buffer) >= BATCH_SIZE:
            batch_idx += 1
            if batch_idx <= resume_from:
                buffer.clear()
                continue
            body, boundary = build_batch_body(buffer, LIST_NAME)
            post_batch(body, boundary, token)
            sent += len(buffer)
            save_progress("insert", batch_idx, total=-1)
            if batch_idx % 10 == 0:
                print(f"  inserted batch {batch_idx} ({sent} items)")
            buffer.clear()

    if buffer:
        batch_idx += 1
        if batch_idx > resume_from:
            body, boundary = build_batch_body(buffer, LIST_NAME)
            post_batch(body, boundary, token)
            sent += len(buffer)
            save_progress("insert", batch_idx, total=-1)

    print(f"Inserted {sent} items across {batch_idx} batches.")


def _confirm(prompt: str) -> bool:
    try:
        ans = input(prompt).strip().lower()
    except EOFError:
        return False
    return ans == "yes"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Load Refresh Asset Data.xlsx into SharePoint RefreshAssetInventory."
    )
    parser.add_argument("--file", required=True, help="Path to Refresh Asset Data.xlsx")
    parser.add_argument("--clear-first", action="store_true",
                        help="Delete all existing items before importing")
    parser.add_argument("--resume", action="store_true",
                        help="Resume an interrupted insert phase")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print first 5 transformed rows, post nothing")
    parser.add_argument("--limit", type=int, default=None,
                        help="Only process the first N rows")
    args = parser.parse_args()

    xlsx = Path(args.file)
    if not xlsx.exists():
        print(f"Excel file not found: {xlsx}", file=sys.stderr)
        return 2

    if args.dry_run:
        print(f"Reading {xlsx} (dry run)...")
        sample = []
        for row in iter_rows(str(xlsx), limit=args.limit or 5):
            sample.append(row)
            if len(sample) >= 5:
                break
        for r in sample:
            print(json.dumps(r, indent=2))
        print(f"Dry run OK. {len(sample)} rows shown.")
        return 0

    print("Authenticating...")
    token = acquire_token()
    print("Authenticated.")

    count = list_item_count(token)
    print(f"List currently has {count} items.")

    resume_from = 0
    if args.resume:
        state = load_progress()
        if not state or state.get("phase") != "insert":
            print("No insert phase to resume.", file=sys.stderr)
            return 2
        resume_from = int(state.get("last_batch", 0))
        print(f"Resuming from batch {resume_from}.")
    elif args.clear_first:
        if count > 0:
            if not _confirm(
                f"This will delete all {count} existing items in {LIST_NAME}. "
                "Type 'yes' to continue: "):
                print("Aborted.")
                return 1
            clear_list(token)
        clear_progress()
    else:
        if count > 0:
            print(f"List has {count} items. Use --clear-first to replace, "
                  "or empty the list manually first.", file=sys.stderr)
            return 2

    print(f"Reading {xlsx}...")
    rows = iter_rows(str(xlsx), limit=args.limit)
    import_items(token, rows, resume_from=resume_from)
    clear_progress()
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Verify the script parses and `--help` runs**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python src/sharepoint/import_inventory.py --help`
Expected: prints argparse help text with all 5 flags (`--file`, `--clear-first`, `--resume`, `--dry-run`, `--limit`). Exit code 0.

- [ ] **Step 3: Verify the full test suite still passes**

Run: `PYTHONPATH=. src/sharepoint/.venv/bin/python -m pytest src/sharepoint/tests -v`
Expected: all tests pass (24 total across the 4 test files).

- [ ] **Step 4: Commit**

```bash
git add src/sharepoint/import_inventory.py
git commit -m "feat: add clear_list, import_items, and CLI main"
```

---

## Task 11: Documentation — README-import.md

**Files:**
- Create: `src/sharepoint/README-import.md`

- [ ] **Step 1: Write the README**

Create `src/sharepoint/README-import.md`:
```markdown
# Inventory Import — `npm run inventory`

One-shot loader that pushes `Refresh Asset Data.xlsx` into the
`RefreshAssetInventory` SharePoint list. Uses MSAL device code flow
with a pre-consented Microsoft public app — no Power Platform admin,
no tenant app registration, no admin consent required.

Cadence: run once initially, then again ~every 4 years when Ryan
re-exports the inventory from Absolute.

## First-time setup

1. Ensure Python 3.10+ is on PATH: `python3 --version`
2. Place `Refresh Asset Data.xlsx` in the project root.
3. From the project root: `npm run inventory -- --dry-run --limit 5`
   - Verifies Excel read and transforms without writing anything.

## Normal run

```bash
# Initial load (list must be empty)
npm run inventory

# Periodic refresh (clears existing items, reloads all)
npm run inventory -- --clear-first
```

First run opens a browser for Microsoft sign-in. Token is cached at
`src/sharepoint/.token_cache.json` for ~1 hour.

## Other flags

| Flag | Purpose |
|---|---|
| `--dry-run` | Read + transform + print 5 rows. No auth, no writes. |
| `--limit N` | Only process first N rows (smoke test). |
| `--clear-first` | Delete all existing items before inserting. Prompts for `yes`. |
| `--resume` | Resume an interrupted insert phase (reads `.import_progress.json`). |

## Troubleshooting

**"Could not acquire a SharePoint token with any public client ID"**
Both Microsoft public apps are blocked in your tenant. Ask Jake (site
owner) to consent to *one* of these apps — this is far smaller than
Power Platform admin access:
- `14d82eec-204b-4c2f-b7e8-296a70dab67e` (Microsoft Graph CLI Tools)
- `31359c7f-bd7e-475c-86db-fdb8c937548e` (PnP Management Shell)

**"Missing required headers: [...]"**
Absolute's export format changed. Compare the `Found headers` list
against `HEADER_MAP` in `import_inventory.py` and rename the const
to match.

**"List has N items. Use --clear-first..."**
List already populated. Either:
- `npm run inventory -- --clear-first` to wipe and reload
- empty the list manually in SharePoint UI

**Interrupted mid-run**
Re-run with `--resume`. The script skips already-posted batches.

## Run tests

```bash
npm run inventory:test
```
```

- [ ] **Step 2: Commit**

```bash
git add src/sharepoint/README-import.md
git commit -m "docs: add README for npm run inventory"
```

---

## Task 12: Deprecate the Power Automate sync doc + update CLAUDE.md

**Files:**
- Modify: `src/powerapps/power-automate-sync-flow-guide.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Mark the Power Automate doc obsolete**

At the top of `src/powerapps/power-automate-sync-flow-guide.md`, prepend:
```markdown
> **OBSOLETE (2026-04-22):** The Excel Online Business connector cannot
> handle the 65k-row `Refresh Asset Data.xlsx` — it throttles via
> `throttle.aad.ags.excel.flow` even after hour-plus cooldowns, and
> there is no admin-consent-free way around it. The list is now
> populated by `npm run inventory` (see `src/sharepoint/README-import.md`).
> Keeping this file for reference only — do not try to build the flow
> described below.

---

```

- [ ] **Step 2: Update CLAUDE.md inventory section**

In `CLAUDE.md`, find the "SharePoint Data Sources" table and replace it with:
```markdown
## SharePoint Data Sources

| List | Site | Lookup Column |
|------|------|---------------|
| FY26 Cut Sheets | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | Legacy Asset Tag |
| FY26 Cut Sheets Part 2 | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | Legacy Asset Tag |
| RefreshAssetInventory | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | DeviceName (indexed) |

The `RefreshAssetInventory` list is populated by running
`npm run inventory -- --clear-first` from the project root — a local
Python script that reads `Refresh Asset Data.xlsx` and writes to
SharePoint using the current user's delegated credentials. See
`src/sharepoint/README-import.md`. The list refreshes about every
four years, when Ryan re-exports the inventory from Absolute.
```

- [ ] **Step 3: Commit**

```bash
git add src/powerapps/power-automate-sync-flow-guide.md CLAUDE.md
git commit -m "docs: mark power-automate sync obsolete, point to npm run inventory"
```

---

## Task 13: End-to-end smoke test

**Files:** none

*Note:* This task validates against the live SharePoint list. It is the only task that requires the real `Refresh Asset Data.xlsx` file and live credentials.

- [ ] **Step 1: Dry run (no auth, no writes)**

Run: `npm run inventory -- --dry-run --limit 5`
Expected:
- venv created on first run
- deps install silently
- script reads Excel, prints 5 JSON-formatted rows
- each row has all 7 fields populated, RAM and DiskSize are integers, not bytes

- [ ] **Step 2: Authenticated test with `--limit 10` against empty list**

Ensure `RefreshAssetInventory` is empty in SharePoint UI.
Run: `npm run inventory -- --limit 10`
Expected:
- browser opens, user signs in once (device code flow)
- script prints "Authenticated."
- 10 items posted; verify by refreshing SharePoint list view in browser
- exit code 0

- [ ] **Step 3: Verify the `--clear-first` path**

Run: `npm run inventory -- --clear-first --limit 10`
Expected:
- prompt: "This will delete all 10 existing items..."
- type `yes`
- 10 items deleted, then 10 re-inserted
- SharePoint UI shows 10 items

- [ ] **Step 4: Full load**

Empty the list in SharePoint UI (or rely on `--clear-first`).
Run: `npm run inventory -- --clear-first`
Expected:
- confirmation prompt
- clear phase completes (~5 min)
- insert phase completes (~15-25 min)
- final message: `Inserted 65438 items across 655 batches. Done.`
- SharePoint list item count matches

- [ ] **Step 5: Verify a known asset tag is queryable**

In SharePoint UI, filter `RefreshAssetInventory` by `DeviceName = EW22-01322`.
Expected: one row, all 7 columns populated, RAM and DiskSize in GB (e.g., 16 and 256).

- [ ] **Step 6: No commit needed**

This task is verification only. If anything above failed, open an issue before calling the plan done.

---

## Self-Review Notes

Coverage against the spec:
- Architecture (§Architecture): Tasks 1-3 scaffold; Task 10 wires it
- File Layout (§File Layout): Task 1 (deps/gitignore), Task 2 (npm script), Task 11 (README)
- Authentication (§Authentication): Task 8 (primary + fallback client IDs)
- Excel Read & Transform (§Excel Read...): Tasks 3 + 4
- SharePoint Writes — batch, throttle, idempotency (§SharePoint Writes): Tasks 5, 6, 9, 10
- Progress + resume (§Resume Capability): Task 7
- Testing flags (§Testing Flags): Task 10 main + Task 13
- Safety rail (§Safety Rail): Task 10 `_confirm` + Task 13 step 3
- Docs updates (§Implementation: Files to Change): Tasks 11 + 12

No placeholders (no TBD/TODO). Type/method names are consistent across tasks: `iter_rows`, `transform_row`, `build_batch_body`, `build_delete_batch_body`, `post_batch`, `RetryExhaustedError`, `list_item_count`, `list_all_item_ids`, `clear_list`, `import_items`, `acquire_token`, `_build_msal_app`, `save_progress`, `load_progress`, `clear_progress`, `HEADER_MAP`, `BATCH_SIZE`, `SITE_URL`, `LIST_NAME`, `CLIENT_IDS`, `SCOPES`, `CACHE_PATH`, `PROGRESS_PATH`, `BYTES_PER_GB`.
