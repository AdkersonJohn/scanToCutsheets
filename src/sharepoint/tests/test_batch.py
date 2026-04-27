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
