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
