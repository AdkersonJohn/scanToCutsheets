> **OBSOLETE (2026-04-22):** The Excel Online Business connector cannot
> handle the 65k-row `Refresh Asset Data.xlsx` — it throttles via
> `throttle.aad.ags.excel.flow` even after hour-plus cooldowns, and
> there is no admin-consent-free way around it. The list is now
> populated by `npm run inventory` (see `src/sharepoint/README-import.md`).
> Keeping this file for reference only — do not try to build the flow
> described below.

---

# Power Automate: Refresh Asset Data Sync Flow

## Overview

This flow reads `Refresh Asset Data.xlsx` from SharePoint and populates the
`RefreshAssetInventory` SharePoint list.

**Schedule:** Weekly (Sunday 2:00 AM) or triggered manually.

---

## Flow: Sync RefreshAssetInventory

### Trigger
- **Recurrence** — Every 1 week, Sunday, 02:00 AM

### Actions

1. **List rows present in a table** (Excel Online)
   - Location: CCHMCRefreshSupport SharePoint site
   - Document Library: Documents
   - File: Refresh Asset Data.xlsx
   - Table: Table1 (or whatever the Excel table is named)

2. **Get items** (SharePoint) — get all existing RefreshAssetInventory items
   - Site: https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport
   - List: RefreshAssetInventory
   - Top Count: 100000

3. **Apply to each** — delete existing items (clear the list)
   - Input: items from step 2
   - Inside: **Delete item** (SharePoint)
     - Site: CCHMCRefreshSupport
     - List: RefreshAssetInventory
     - Id: current item ID

   > **Performance note:** Deleting 65k items one-by-one is slow. Alternative:
   > use a **Send an HTTP request to SharePoint** action with batch delete,
   > or delete and recreate the list via the provisioning script.

4. **Apply to each** — add new items from Excel
   - Input: rows from step 1
   - Inside: **Create item** (SharePoint)
     - Site: CCHMCRefreshSupport
     - List: RefreshAssetInventory
     - DeviceName: `Device name` column from Excel row
     - SerialNumber: `Serial number` column from Excel row
     - Make: `Make` column from Excel row
     - Model: `Model` column from Excel row
     - RAM: Use expression: `int(div(float(items('Apply_to_each')?['Total physical memory']), 1073741824))`
     - CPU: `CPU name` column from Excel row
     - DiskSize: Use expression: `int(div(float(items('Apply_to_each')?['Disk 1 size']), 1073741824))`

   > **Performance note:** For 65k rows, enable **Concurrency Control**
   > on the Apply to each loop (Settings > Concurrency Control > On,
   > Degree of Parallelism: 20). This runs 20 inserts in parallel.

---

## StandardModels — No Longer Needed

The standard device definition is now hardcoded in the Power App's OnScan formula
(6 model families + spec thresholds). There is no StandardModels SharePoint list
or sync flow to maintain.

If the standard model list changes, update the OnScan formula in Power Apps Studio.
See `src/powerapps/formulas-quick-reference.md` for the current formula.

---

## Testing the Flow

1. Run the flow manually (click "Run" in Power Automate)
2. Verify RefreshAssetInventory has ~65k items:
   - Go to the list in SharePoint
   - Check item count in list settings
3. Verify a known device can be found:
   - Search for `EW22-01322` in the DeviceName column
   - Confirm Make and Model are populated
4. Verify RAM and DiskSize fields are populated with GB values (not bytes)
