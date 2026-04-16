# Power Automate: Refresh Asset Data Sync Flow

## Overview

This flow reads `Refresh Asset Data.xlsx` from SharePoint, populates the
`RefreshAssetInventory` SharePoint list, and recalculates the `StandardModels` list.

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

   > **Performance note:** For 65k rows, enable **Concurrency Control**
   > on the Apply to each loop (Settings > Concurrency Control > On,
   > Degree of Parallelism: 20). This runs 20 inserts in parallel.

---

## Flow: Recalculate StandardModels

This is harder to do purely in Power Automate (no native GROUP BY / COUNT).

### Recommended approach: Office Script

Create an Office Script in `Refresh Asset Data.xlsx` that:
1. Reads all rows
2. Counts (Make, Model) pairs
3. Writes pairs with count >= 50 to a named range or output

Then a second Power Automate flow:
1. Runs the Office Script
2. Reads the output
3. Clears and repopulates StandardModels list

### Alternative: Manual refresh

Since StandardModels changes infrequently (only when new device types are
deployed fleet-wide), you can re-run `generate-standard-models.py` locally
and re-import the CSV to SharePoint whenever the fleet composition changes
significantly (quarterly).

---

## Testing the Flow

1. Run the flow manually (click "Run" in Power Automate)
2. Verify RefreshAssetInventory has ~65k items:
   - Go to the list in SharePoint
   - Check item count in list settings
3. Verify a known device can be found:
   - Search for `EW22-01322` in the DeviceName column
   - Confirm Make and Model are populated
4. Verify StandardModels has ~80 items (if using automated recalculation)
