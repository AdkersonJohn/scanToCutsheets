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
