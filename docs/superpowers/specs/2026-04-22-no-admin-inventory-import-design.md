# No-Admin Inventory Import — Design Spec

**Date:** 2026-04-22
**Status:** Draft
**Scope:** Replace the broken Power Automate Excel-to-SharePoint sync flow with a local Python script that loads the 65k-row `Refresh Asset Data.xlsx` into the `RefreshAssetInventory` SharePoint list. Must work with user-level permissions only — no tenant admin approval, no Managed Environment, no admin consent for app registrations.

---

## Problem

The planned Power Automate sync flow (`List rows present in a table` from Excel Online Business → SharePoint list) fails reliably on a 65k-row Excel file. Symptoms: `TooManyRequests` / `TooManyConsecutiveFailures` from Microsoft Graph workbook endpoints, and `throttle.aad.ags.excel.flow` errors from the Excel Online connector — observed persistently even after hour-plus cooldowns. The Excel Online connector's `GetTable` operation is not designed for workbook-sized inputs at this scale, and the throttle is tenant-wide per Microsoft's documented limits (~100 calls/60s against workbook API).

Secondary problem: the user does not have Power Platform admin rights at Encore Technologies and cannot grant admin consent, register new app registrations in Azure AD, or enable Managed Environments. Any solution that requires these is blocked regardless of technical merit.

## Goal

One script the user runs on their Mac that:
- Reads `Refresh Asset Data.xlsx` locally (not via Graph API)
- Authenticates as the user with zero admin consent
- Populates the `RefreshAssetInventory` SharePoint list with all 65k rows in one run
- Handles throttling gracefully
- Is rerunnable when Ryan provides a new export (estimated cadence: every ~4 years)

## Non-Goals

- Continuous/scheduled sync (not needed — data refreshes ~every 4 years)
- Multi-tenant support (single tenant: `encoretch.sharepoint.com`)
- Two-way sync, conflict detection, or change tracking (full replace only)
- Incremental/delta loads (clear-and-reload is simpler and fits the cadence)
- Running in CI/GitHub Actions/cloud (local-only by design — avoids credential storage concerns)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User's Mac                                              │
│                                                          │
│  Refresh Asset Data.xlsx  ──►  import_inventory.py       │
│  (local file)                   ├─ MSAL device code auth │
│                                 ├─ openpyxl read-only    │
│                                 ├─ bytes → GB transform  │
│                                 └─ batch POST $batch     │
└──────────────────────────────────┬───────────────────────┘
                                   │ HTTPS
                                   ▼
           SharePoint: RefreshAssetInventory list
           (65k items, DeviceName indexed)
```

### File Layout

| File | Purpose |
|---|---|
| `src/sharepoint/import_inventory.py` | Main script (~150 lines estimated) |
| `src/sharepoint/requirements.txt` | Python deps: `msal`, `openpyxl`, `requests` |
| `src/sharepoint/README-import.md` | Setup notes, usage examples, troubleshooting |
| `src/sharepoint/.venv/` | Virtualenv (gitignored) |
| `src/sharepoint/.token_cache.json` | MSAL token cache (gitignored) |
| `src/sharepoint/.import_progress.json` | Resume state (gitignored) |
| `package.json` | Add `"inventory"` script that sets up venv + runs script |
| `.gitignore` | Add the three dotfiles/dir above |

### Invocation

Launched from project root via npm:

```bash
npm run inventory                        # normal run (exits if list not empty)
npm run inventory -- --clear-first       # clear existing items, then reload
npm run inventory -- --dry-run --limit 10  # test: print 10 transformed rows, post nothing
npm run inventory -- --resume            # resume an interrupted insert phase
```

`package.json` script definition:
```json
"inventory": "test -d src/sharepoint/.venv || python3 -m venv src/sharepoint/.venv && src/sharepoint/.venv/bin/pip install -q -r src/sharepoint/requirements.txt && src/sharepoint/.venv/bin/python src/sharepoint/import_inventory.py --file \"Refresh Asset Data.xlsx\""
```

---

## Authentication

**Library:** `msal` (Microsoft's official Python auth library)

**Flow:** Device code flow (`acquire_token_by_device_flow`) — prints a code and URL to terminal, user completes sign-in in browser, script receives token.

**Client ID:** Pre-consented public Microsoft app. No app registration required.

| Priority | Client ID | App Name | Notes |
|---|---|---|---|
| Primary | `14d82eec-204b-4c2f-b7e8-296a70dab67e` | Microsoft Graph Command Line Tools | Microsoft's own PowerShell SDK app, pre-consented in virtually all M365 tenants |
| Fallback | `31359c7f-bd7e-475c-86db-fdb8c937548e` | PnP Management Shell | Widely pre-consented, commonly used for SharePoint automation |

On auth failure with the primary client ID, the script automatically retries with the fallback. If both fail, exit with a clear error instructing the user to ask Jake (site owner) to grant consent to one of these two apps — much smaller ask than Power Platform admin access.

**Scope:** `https://encoretch.sharepoint.com/.default` — SharePoint REST API. The user's existing site permissions (list write access) cover all operations the script performs. No extra delegated Graph scopes needed.

**Token cache:** `src/sharepoint/.token_cache.json` (gitignored). Re-runs within token lifetime (~1 hour for access tokens, ~14 days for refresh tokens) skip the browser prompt.

**First-run experience:**
```
$ npm run inventory
To sign in, use a web browser to open https://microsoft.com/devicelogin
and enter the code ABC123DEF to authenticate.
Authenticated as john.adkerson@encoretech.com. Proceeding...
```

---

## Excel Read & Data Transformation

**Library:** `openpyxl` with `read_only=True` and `data_only=True` — streams rows without loading the full workbook into memory. Handles 65k+ rows without memory pressure.

**Column mapping:** Header-based, not letter-based. The script reads row 1 as headers (case-insensitive match, whitespace-trimmed) and maps to destination columns.

| Source Header (in Excel) | Destination Field | Type | Transform |
|---|---|---|---|
| `Device name` | `DeviceName` | Text | `str(value).strip()` |
| `Serial number` | `SerialNumber` | Text | `str(value).strip()` |
| `Make` | `Make` | Text | `str(value).strip()` |
| `Model` | `Model` | Text | `str(value).strip()` |
| `Disk 1 size` | `DiskSize` | Number | `round(float(value) / 1073741824)` |
| `Total physical memory` | `RAM` | Number | `round(float(value) / 1073741824)` |
| `CPU name` | `CPU` | Text | `str(value).strip()` |

**Header mismatch handling:** If any required header is missing from row 1, hard-fail with a message listing the headers the script did find. This catches column renames/reorders in Absolute's export format.

**Row filtering:**
- Skip rows where `DeviceName` is blank (required field on SharePoint list)
- Skip rows where `RAM` or `DiskSize` can't be parsed as a number (log count, continue)
- Other missing fields → empty string (SharePoint accepts blank on non-required columns)

**Output:** A generator yielding dicts:
```python
{"DeviceName": "EW22-01322", "SerialNumber": "ABC123", "Make": "Dell",
 "Model": "LATITUDE 5530", "RAM": 16, "DiskSize": 256, "CPU": "Intel Core i5-1235U"}
```

---

## SharePoint Writes

### Batch Endpoint

`POST https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport/_api/$batch` with `multipart/mixed` content. Up to 100 item create operations per HTTP call.

- 65,000 rows ÷ 100 items/batch = 650 batch requests
- Estimated throughput: ~1.5 sec/batch on a clean run → **~15-20 min total**

Each batch's changeset contains 100 POSTs to `/_api/web/lists/getbytitle('RefreshAssetInventory')/items` with JSON bodies:
```json
{"__metadata": {"type": "SP.Data.RefreshAssetInventoryListItem"},
 "DeviceName": "...", "SerialNumber": "...", ...}
```

### Throttle Handling

- On `429 Too Many Requests` or `503 Service Unavailable`: read `Retry-After` header, sleep that many seconds, retry
- Exponential backoff when no `Retry-After` is provided: 2s, 4s, 8s, 16s, 32s (max 5 retries per batch)
- If a batch fails all 5 retries: log the batch's row range to a failures list, continue with next batch
- End-of-run summary lists any failed row ranges so the user can target a re-run at just those rows

### Idempotency

Two modes controlled by flags:

| Flag | Behavior |
|---|---|
| (none) | Query list item count first. If > 0, exit with error: "List has N items. Use --clear-first to replace, or empty it manually via SharePoint UI first." Prevents accidental duplicates. |
| `--clear-first` | Prompt: "This will delete all N existing items in RefreshAssetInventory. Type 'yes' to continue:" then batch-delete all items (also via `$batch`, ~5 min), then insert. This is the normal path for the 4-year refresh. |
| `--resume` | Read `.import_progress.json` for last successful insert batch index; resume inserts from there. Only valid if a prior run was interrupted mid-insert. |

### Progress Reporting

Console output during run:
```
Authenticating... OK (john.adkerson@encoretech.com)
Reading Excel... 65,438 rows (12 skipped: blank DeviceName)
Clearing existing items... [████████] 65,000/65,000 (5:12)
Inserting... [███░░░░░] 24,100/65,438  (7:34 elapsed, ~13:00 remaining)
```

Progress state persisted to `.import_progress.json` after each successful batch:
```json
{"phase": "insert", "last_batch": 241, "total_batches": 655, "started_at": "2026-04-22T14:33:12Z"}
```

### Testing Flags

- `--dry-run` → authenticates, reads Excel, transforms rows, prints first 5 transformed records, posts nothing
- `--limit N` → only process first N rows (useful for a 10-row smoke test)

---

## Error Handling

| Error Class | Handling |
|---|---|
| Auth failure (both client IDs) | Exit with instructions to ask Jake for consent |
| Excel file not found | Exit with path that was tried |
| Required header missing | Exit listing found headers vs expected |
| Row-level parse error (non-numeric RAM/disk) | Log count, skip row, continue |
| Batch `429`/`503` | Respect `Retry-After`, then exponential backoff, max 5 retries |
| Batch fails all retries | Log row range, continue; summary at end |
| Network error / connection reset | Treated as 503 (retry with backoff) |
| Unexpected exception | Print traceback, save progress state, exit non-zero |

---

## Rerun Scenarios

| Scenario | Command |
|---|---|
| Initial load (empty list) | `npm run inventory` |
| Periodic refresh (~every 4 years when Ryan re-exports) | `npm run inventory -- --clear-first` |
| Smoke test first | `npm run inventory -- --dry-run --limit 10` |
| Resume after Ctrl-C mid-insert | `npm run inventory -- --resume` |
| Resume after connection died | `npm run inventory -- --resume` |

---

## Security Considerations

- Token cache and progress files are gitignored — no secrets committed
- No app registration, no client secret — device code flow uses Microsoft's public apps
- Script only uses the user's own delegated permissions — cannot elevate beyond what the user can already do in the SharePoint web UI
- `--clear-first` prompts for explicit `yes` confirmation to prevent accidental wipes

---

## Implementation: Files to Change

| File | Action | Notes |
|---|---|---|
| `src/sharepoint/import_inventory.py` | **Create** | Main script |
| `src/sharepoint/requirements.txt` | **Create** | `msal>=1.26`, `openpyxl>=3.1`, `requests>=2.31` |
| `src/sharepoint/README-import.md` | **Create** | Setup, usage, troubleshooting, rerun instructions |
| `package.json` | **Update** | Add `"inventory"` script |
| `.gitignore` | **Update** | Add `src/sharepoint/.venv/`, `src/sharepoint/.token_cache.json`, `src/sharepoint/.import_progress.json` |
| `src/powerapps/power-automate-sync-flow-guide.md` | **Delete or mark obsolete** | Superseded by this approach |
| `CLAUDE.md` | **Update** | Document that inventory is populated via `npm run inventory`, not a Power Automate flow |

---

## Open Questions (none currently)

Design is complete pending user review.
