# Nonstandard Device Detection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add nonstandard device classification to the Asset Tag Scanner Power App so devices are flagged as standard, nonstandard, or unknown at scan time and the result is written to the Excel output.

**Architecture:** Two new SharePoint lists (RefreshAssetInventory for ~65k device records, StandardModels for ~80 frequent make+model pairs). At scan time, after GREEN result, the app does a delegable LookUp in RefreshAssetInventory, then checks colStandardModels collection for the (Make, Model) pair. A Power Automate flow syncs the lists weekly from the source Excel file.

**Tech Stack:** Power Apps (canvas app), SharePoint Online lists, Power Automate (cloud flow), PowerShell (for initial list creation), Power Fx formulas

**Spec:** `docs/superpowers/specs/2026-04-16-nonstandard-device-detection-design.md`

---

## Important Context

- **App source files** are at `app-debug/Src\*.pa.yaml` (backslash filenames from Power Apps export). These files are reference-only — actual changes are made in Power Apps Studio at https://make.powerapps.com. The YAML files document what formulas and properties to set.
- **SharePoint site:** `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport`
- **Existing data sources:** `FY26 Cut Sheets`, `FY26 Cut Sheets Part 2`, `Table1` (Excel connector to `scanToCutsheetsViableAssetTags.xlsx`)
- **Current submission uses:** `Patch(Table1, Defaults(Table1), {...})` inside a `ForAll` loop (see `app-debug/Src\Screen2.pa.yaml:179`)
- **Source Excel file:** `Refresh Asset Data.xlsx` in SharePoint Documents folder

---

### Task 1: Generate StandardModels Data File

**Purpose:** Extract the ~80 (Make, Model) pairs that appear ≥ 50 times from `Refresh Asset Data.xlsx` and save as a CSV for importing into SharePoint.

**Files:**
- Create: `src/sharepoint/standard-models.csv`
- Create: `src/sharepoint/generate-standard-models.py`

- [ ] **Step 1: Write the extraction script**

```python
# src/sharepoint/generate-standard-models.py
"""
Extract standard model pairs from Refresh Asset Data.xlsx.
A model is "standard" if its (Make, Model) pair appears >= 50 times.
Output: CSV file for importing into SharePoint StandardModels list.
"""
import xml.etree.ElementTree as ET
from collections import Counter
import csv
import os
import sys
import tempfile
import zipfile

THRESHOLD = 50

def extract_xlsx_data(xlsx_path):
    """Extract Make and Model columns from xlsx without openpyxl."""
    with tempfile.TemporaryDirectory() as tmpdir:
        with zipfile.ZipFile(xlsx_path, 'r') as z:
            z.extractall(tmpdir)

        ns = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        # Load shared strings
        tree = ET.parse(os.path.join(tmpdir, 'xl', 'sharedStrings.xml'))
        strings = []
        for si in tree.getroot().findall('m:si', ns):
            texts = [t.text for t in si.iter(f'{{{ns["m"]}}}t') if t.text]
            strings.append(''.join(texts))

        # Load sheet data
        tree = ET.parse(os.path.join(tmpdir, 'xl', 'worksheets', 'sheet1.xml'))
        rows = tree.getroot().find('m:sheetData', ns).findall('m:row', ns)

        def cell_val(c):
            v = c.find('m:v', ns)
            if v is None:
                return ''
            return strings[int(v.text)] if c.get('t') == 's' else (v.text or '')

        def col_letter(ref):
            return ''.join(ch for ch in ref if ch.isalpha())

        # Count (Make, Model) pairs — columns G and H
        model_counts = Counter()
        for row in rows[1:]:  # skip header
            vals = {col_letter(c.get('r')): cell_val(c) for c in row.findall('m:c', ns)}
            make = vals.get('G', '').strip()
            model = vals.get('H', '').strip()
            if make and model:
                model_counts[(make, model)] += 1

        return model_counts


def main():
    xlsx_path = os.path.join(os.path.dirname(__file__), '..', '..', 'Refresh Asset Data.xlsx')
    if not os.path.exists(xlsx_path):
        print(f"Error: {xlsx_path} not found")
        sys.exit(1)

    print(f"Reading {xlsx_path}...")
    model_counts = extract_xlsx_data(xlsx_path)

    # Filter to standard models (>= THRESHOLD)
    standard = [(make, model, count) for (make, model), count in model_counts.items() if count >= THRESHOLD]
    standard.sort(key=lambda x: -x[2])

    # Write CSV
    csv_path = os.path.join(os.path.dirname(__file__), 'standard-models.csv')
    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Make', 'Model', 'DeviceCount'])
        for make, model, count in standard:
            writer.writerow([make, model, count])

    print(f"Wrote {len(standard)} standard models to {csv_path}")
    print(f"Total unique models: {len(model_counts)}")
    print(f"Models below threshold (<{THRESHOLD}): {len(model_counts) - len(standard)}")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run the script**

```bash
cd /Volumes/bingobango/code/scanToCutsheets
python3 src/sharepoint/generate-standard-models.py
```

Expected output:
```
Reading Refresh Asset Data.xlsx...
Wrote ~80 standard models to src/sharepoint/standard-models.csv
```

- [ ] **Step 3: Verify the CSV output**

```bash
head -10 src/sharepoint/standard-models.csv
wc -l src/sharepoint/standard-models.csv
```

Expected: CSV with columns `Make,Model,DeviceCount`, approximately 80 rows, sorted by count descending.

- [ ] **Step 4: Commit**

```bash
git add src/sharepoint/generate-standard-models.py src/sharepoint/standard-models.csv
git commit -m "feat: generate standard models CSV from refresh asset data"
```

---

### Task 2: Create SharePoint List Provisioning Scripts

**Purpose:** PowerShell scripts to create the two new SharePoint lists on the CCHMCRefreshSupport site. These will be run by the IT admin (Jake) or the developer with SharePoint admin access.

**Files:**
- Create: `src/sharepoint/Create-StandardModelsList.ps1`
- Create: `src/sharepoint/Create-RefreshAssetInventoryList.ps1`

- [ ] **Step 1: Write the StandardModels list creation script**

```powershell
# src/sharepoint/Create-StandardModelsList.ps1
# Creates the StandardModels SharePoint list on CCHMCRefreshSupport site.
# Run with: Connect-PnPOnline first, then ./Create-StandardModelsList.ps1

param(
    [string]$SiteUrl = "https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport"
)

# Connect if not already connected
try {
    Get-PnPContext | Out-Null
} catch {
    Connect-PnPOnline -Url $SiteUrl -Interactive
}

$listName = "StandardModels"

# Create the list (GenericList = custom list)
Write-Host "Creating list: $listName"
New-PnPList -Title $listName -Template GenericList -ErrorAction Stop

# Add columns
Write-Host "Adding columns..."
Add-PnPField -List $listName -DisplayName "Make" -InternalName "Make" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "Model" -InternalName "Model" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "DeviceCount" -InternalName "DeviceCount" -Type Number

# Remove default Title column requirement
$titleField = Get-PnPField -List $listName -Identity "Title"
Set-PnPField -List $listName -Identity "Title" -Values @{Required=$false; Hidden=$true}

Write-Host "StandardModels list created successfully."
Write-Host ""
Write-Host "Next step: Import data from src/sharepoint/standard-models.csv"
Write-Host "You can use the SharePoint UI: List Settings > Import from CSV"
Write-Host "Or use Import-Csv + Add-PnPListItem in PowerShell."
```

- [ ] **Step 2: Write the RefreshAssetInventory list creation script**

```powershell
# src/sharepoint/Create-RefreshAssetInventoryList.ps1
# Creates the RefreshAssetInventory SharePoint list on CCHMCRefreshSupport site.
# This list will hold ~65k device records and needs an indexed DeviceName column.

param(
    [string]$SiteUrl = "https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport"
)

# Connect if not already connected
try {
    Get-PnPContext | Out-Null
} catch {
    Connect-PnPOnline -Url $SiteUrl -Interactive
}

$listName = "RefreshAssetInventory"

# Create the list
Write-Host "Creating list: $listName"
New-PnPList -Title $listName -Template GenericList -ErrorAction Stop

# Add columns
Write-Host "Adding columns..."
Add-PnPField -List $listName -DisplayName "DeviceName" -InternalName "DeviceName" -Type Text -Required $true
Add-PnPField -List $listName -DisplayName "SerialNumber" -InternalName "SerialNumber" -Type Text
Add-PnPField -List $listName -DisplayName "Make" -InternalName "Make" -Type Text
Add-PnPField -List $listName -DisplayName "Model" -InternalName "Model" -Type Text

# Remove default Title column requirement
Set-PnPField -List $listName -Identity "Title" -Values @{Required=$false; Hidden=$true}

# CRITICAL: Index the DeviceName column for delegable LookUp queries
Write-Host "Indexing DeviceName column for delegation..."
$field = Get-PnPField -List $listName -Identity "DeviceName"
$field.Indexed = $true
$field.Update()
Invoke-PnPQuery

Write-Host ""
Write-Host "RefreshAssetInventory list created with indexed DeviceName column."
Write-Host ""
Write-Host "IMPORTANT: SharePoint list view threshold is 5,000 items."
Write-Host "With ~65k items, you MUST use indexed columns for all queries."
Write-Host "The DeviceName column has been indexed for delegable LookUp from Power Apps."
Write-Host ""
Write-Host "Next step: Set up the Power Automate flow to populate this list"
Write-Host "from Refresh Asset Data.xlsx (see Task 3 in the implementation plan)."
```

- [ ] **Step 3: Commit**

```bash
git add src/sharepoint/Create-StandardModelsList.ps1 src/sharepoint/Create-RefreshAssetInventoryList.ps1
git commit -m "feat: add SharePoint list provisioning scripts for nonstandard detection"
```

---

### Task 3: Document Power Automate Sync Flow

**Purpose:** Step-by-step guide for building the Power Automate flow that populates RefreshAssetInventory from the Excel source and recalculates StandardModels. This is documentation-only (Power Automate flows are built in the browser, not in code).

**Files:**
- Create: `src/powerapps/power-automate-sync-flow-guide.md`

- [ ] **Step 1: Write the flow guide**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add src/powerapps/power-automate-sync-flow-guide.md
git commit -m "docs: add Power Automate sync flow guide for nonstandard detection"
```

---

### Task 4: Update App.OnStart — Initialize Nonstandard Variables

**Purpose:** Add new variables and load the StandardModels collection at app startup.

**Files:**
- Modify: `app-debug/Src\App.pa.yaml` (reference for what to change in Power Apps Studio)
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Document the updated OnStart formula**

The full `App.OnStart` formula to paste in Power Apps Studio:

```powerfx
Set(varCurrentUser, User());
Set(varScannedValue, Blank());
Set(varMatchFound, Blank());
Set(varMatchRecord, Blank());
Set(varIsSearching, false);
Set(varShowResult, false);
Set(varShowForm, false);
Set(varCurrentAssetTag, "");
Set(varIsEditing, false);
Set(varEditIndex, -1);
Set(varIsSubmitting, false);
Set(varSubmitSuccess, false);
Set(varSubmitError, "");
Set(varDeviceTooNew, false);
Set(varAssetYear, 0);

// NEW: Nonstandard device detection variables
Set(varDeviceRecord, Blank());
Set(varDeviceFound, false);
Set(varNonstandardStatus, "");

// NEW: Load standard models reference (~80 rows)
ClearCollect(colStandardModels, StandardModels)
```

- [ ] **Step 2: Update the App.pa.yaml reference file**

Update `app-debug/Src\App.pa.yaml` to reflect the new OnStart. This is the reference copy — the actual change is made in Power Apps Studio.

- [ ] **Step 3: Update formulas-quick-reference.md — OnStart section**

Add the new variables and `ClearCollect` to the App.OnStart section in `src/powerapps/formulas-quick-reference.md`.

- [ ] **Step 4: Commit**

```bash
git add "app-debug/Src\App.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add nonstandard detection variables to App.OnStart"
```

---

### Task 5: Update OnScan — Add Nonstandard Lookup Logic

**Purpose:** After the existing GREEN determination, add the RefreshAssetInventory lookup and standard/nonstandard classification.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — brcScanner.OnScan property
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Document the updated OnScan formula**

The full `brcScanner.OnScan` formula to paste in Power Apps Studio. New lines are marked with `// NEW`:

```powerfx
// Capture scanned value
Set(varScannedValue, Trim(First(brcScanner.Barcodes).Value));
Set(varIsSearching, true);
Set(varShowResult, false);
Set(varSubmitSuccess, false);
Set(varShowForm, false);

// Extract year from asset tag (characters 3-4, e.g., "23" from "EW23-00001")
Set(varAssetYear, Value(Mid(varScannedValue, 3, 2)));

// Check if device is too new for 4-year refresh cycle (year > 22)
Set(varDeviceTooNew, varAssetYear > 22 || IsBlank(varAssetYear));

// Only check SharePoint if device is old enough
If(
    !varDeviceTooNew,
    Set(
        varMatchRecord,
        Coalesce(
            LookUp('FY26 Cut Sheets', 'Legacy Asset Tag' = Trim(varScannedValue)),
            LookUp('FY26 Cut Sheets Part 2', 'Legacy Asset Tag' = Trim(varScannedValue))
        )
    ),
    Set(varMatchRecord, Blank())
);

Set(varMatchFound, !IsBlank(varMatchRecord));

// NEW: Nonstandard device check (only for GREEN results)
If(
    !varMatchFound && !varDeviceTooNew,

    // Lookup device in inventory
    Set(varDeviceRecord,
        LookUp(RefreshAssetInventory, DeviceName = varScannedValue));
    Set(varDeviceFound, !IsBlank(varDeviceRecord));

    // Determine nonstandard status
    Set(varNonstandardStatus,
        If(
            !varDeviceFound, "Unknown",
            IsBlank(LookUp(colStandardModels,
                Make = varDeviceRecord.Make && Model = varDeviceRecord.Model)),
            "Yes",
            "No"
        )
    ),

    // Not a GREEN result — clear nonstandard state
    Set(varDeviceFound, false);
    Set(varNonstandardStatus, "")
);

Set(varIsSearching, false);
Set(varShowResult, true)
```

- [ ] **Step 2: Update the Screen1.pa.yaml reference file**

Replace the `OnScan` property value of `brcScanner` in `app-debug/Src\Screen1.pa.yaml` with the formula above.

- [ ] **Step 3: Update formulas-quick-reference.md — OnScan section**

Replace the `brcScanner.OnScan` section with the updated formula.

- [ ] **Step 4: Verify in Power Apps Studio**

After pasting in Studio:
1. Check for formula errors (red underlines)
2. Verify `RefreshAssetInventory` appears as a connected data source
3. Verify `colStandardModels` is recognized (from OnStart)

- [ ] **Step 5: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add nonstandard device lookup to OnScan formula"
```

---

### Task 6: Add Warning Banner to Screen1

**Purpose:** Show an orange warning banner below the GREEN result when a device is nonstandard or unknown.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — add new controls

- [ ] **Step 1: Add the warning banner controls in Power Apps Studio**

Add these controls to Screen1 (between `lblSuccessAsset` and `btnAddToSession`):

**Control: `rectNSBanner`** (Rectangle)
| Property | Value |
|---|---|
| Control type | Rectangle |
| X | `40` |
| Y | `650` |
| Width | `Parent.Width - 80` |
| Height | `40` |
| Fill | `RGBA(255, 165, 0, 0.15)` |
| BorderColor | `RGBA(255, 140, 0, 1)` |
| BorderThickness | `0` |
| Visible | `varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> "" && !varShowForm && !varSubmitSuccess` |

**Control: `rectNSBorderLeft`** (Rectangle — left accent border)
| Property | Value |
|---|---|
| Control type | Rectangle |
| X | `40` |
| Y | `650` |
| Width | `3` |
| Height | `40` |
| Fill | `RGBA(255, 140, 0, 1)` |
| Visible | `rectNSBanner.Visible` |

**Control: `lblNSWarning`** (Label)
| Property | Value |
|---|---|
| Control type | Label |
| X | `50` |
| Y | `650` |
| Width | `Parent.Width - 100` |
| Height | `40` |
| Text | `If(varNonstandardStatus = "Unknown", "⚠ Device not in inventory — verify asset tag", "⚠ Nonstandard: " & varDeviceRecord.Make & " " & varDeviceRecord.Model)` |
| Color | `RGBA(180, 100, 0, 1)` |
| Font | `Font.'Open Sans'` |
| Size | `12` |
| Align | `Align.Left` |
| VerticalAlign | `VerticalAlign.Middle` |
| Visible | `rectNSBanner.Visible` |

- [ ] **Step 2: Update Screen1.pa.yaml reference file**

Add the three new controls to `app-debug/Src\Screen1.pa.yaml` in the Children list, between `lblSuccessAsset` and `circleFailure`:

```yaml
      - rectNSBanner:
          Control: Rectangle@2.3.0
          Properties:
            Fill: =RGBA(255, 165, 0, 0.15)
            BorderColor: =RGBA(255, 140, 0, 1)
            BorderThickness: =0
            Height: =40
            Visible: =varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> "" && !varShowForm && !varSubmitSuccess
            Width: =Parent.Width - 80
            X: =40
            Y: =650
      - rectNSBorderLeft:
          Control: Rectangle@2.3.0
          Properties:
            Fill: =RGBA(255, 140, 0, 1)
            Height: =40
            Visible: =rectNSBanner.Visible
            Width: =3
            X: =40
            Y: =650
      - lblNSWarning:
          Control: Label@2.5.1
          Properties:
            Align: =Align.Left
            Color: =RGBA(180, 100, 0, 1)
            Font: =Font.'Open Sans'
            Height: =40
            Size: =12
            Text: =If(varNonstandardStatus = "Unknown", "⚠ Device not in inventory — verify asset tag", "⚠ Nonstandard: " & varDeviceRecord.Make & " " & varDeviceRecord.Model)
            VerticalAlign: =VerticalAlign.Middle
            Visible: =rectNSBanner.Visible
            Width: =Parent.Width - 100
            X: =50
            Y: =650
```

- [ ] **Step 3: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml"
git commit -m "feat: add nonstandard warning banner to Screen1 GREEN result"
```

---

### Task 7: Update Form Popup — Add Make Display and Auto-fill Model

**Purpose:** Show device Make as a read-only field in the form popup. Auto-fill the Model field from inventory data when the device is found.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — form popup controls
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Expand the form container**

In Power Apps Studio, update `rectFormContainer`:
- **Height:** Change from `520` to `560` (add 40px for the Make display row)

- [ ] **Step 2: Add Make display label**

Add a new label control inside the form area:

**Control: `lblFormMake`** (Label)
| Property | Value |
|---|---|
| X | `40` |
| Y | `240` |
| Width | `Parent.Width - 80` |
| Height | `30` |
| Text | `If(varDeviceFound, "Make: " & varDeviceRecord.Make & " | Model: " & varDeviceRecord.Model, "Device not in inventory")` |
| Color | `If(varNonstandardStatus = "No", RGBA(107, 114, 128, 1), RGBA(180, 100, 0, 1))` |
| Font | `Font.'Open Sans'` |
| Size | `12` |
| FontWeight | `If(varNonstandardStatus <> "No", FontWeight.Semibold, FontWeight.Normal)` |
| Visible | `varShowForm` |

- [ ] **Step 3: Shift existing form fields down by 30px**

Update Y positions for all form fields below the new Make label. In Power Apps Studio, select each control and update Y:

| Control | Old Y | New Y |
|---|---|---|
| `lblSerialNumber` | 250 | 280 |
| `txtSerialNumber` | 275 | 305 |
| `lblDepartment` | 330 | 360 |
| `txtDepartment` | 355 | 385 |
| `lblLocation` | 410 | 440 |
| `txtLocation` | 435 | 465 |
| `lblModel` | 490 | 520 |
| `txtModel` | 515 | 545 |
| `btnSaveItem` | 580 | 610 |
| `btnCancelForm` | 580 | 610 |

- [ ] **Step 4: Update txtModel.Default for auto-fill**

Change `txtModel.Default` to:

```powerfx
If(
    varIsEditing,
    LookUp(colSessionList, ID = varEditIndex).Model,
    If(varDeviceFound, varDeviceRecord.Model, "")
)
```

When adding a new item (not editing) and the device was found in inventory, the Model field pre-fills from inventory data. User can still override it.

- [ ] **Step 5: Update Screen1.pa.yaml reference file**

Update the YAML to reflect:
- New `lblFormMake` control
- Updated Y positions for shifted controls
- Updated `rectFormContainer` Height
- Updated `txtModel` Default property

- [ ] **Step 6: Update formulas-quick-reference.md — TextInput defaults**

Update the `txtModel.Default` entry in the formulas quick reference.

- [ ] **Step 7: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add Make display and Model auto-fill to form popup"
```

---

### Task 8: Update btnSaveItem — Add New Fields to colSessionList

**Purpose:** When saving a form item, include Make, Nonstandard, and DeviceFound fields in the collection.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — btnSaveItem.OnSelect
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Document the updated btnSaveItem.OnSelect formula**

Full formula for Power Apps Studio:

```powerfx
If(
    IsBlank(txtSerialNumber.Text) || IsBlank(txtDepartment.Text) || IsBlank(txtLocation.Text) || IsBlank(txtModel.Text),
    Notify("All fields are required", NotificationType.Error),

    If(
        varIsEditing,
        UpdateIf(
            colSessionList,
            ID = varEditIndex,
            {
                SerialNumber: txtSerialNumber.Text,
                Department: txtDepartment.Text,
                Location: txtLocation.Text,
                Model: txtModel.Text,
                Make: If(varDeviceFound, varDeviceRecord.Make, ""),
                Nonstandard: varNonstandardStatus,
                DeviceFound: varDeviceFound
            }
        ),
        Collect(
            colSessionList,
            {
                ID: If(CountRows(colSessionList) = 0, 1, Max(colSessionList, ID) + 1),
                AssetTag: varCurrentAssetTag,
                SerialNumber: txtSerialNumber.Text,
                Department: txtDepartment.Text,
                Location: txtLocation.Text,
                Model: txtModel.Text,
                DateScanned: Now(),
                Operator: User().FullName,
                Make: If(varDeviceFound, varDeviceRecord.Make, ""),
                Nonstandard: varNonstandardStatus,
                DeviceFound: varDeviceFound
            }
        )
    );

    Reset(txtSerialNumber);
    Reset(txtDepartment);
    Reset(txtLocation);
    Reset(txtModel);
    Set(varShowForm, false);
    Set(varIsEditing, false)
)
```

- [ ] **Step 2: Update Screen1.pa.yaml reference file**

Replace the `btnSaveItem.OnSelect` property value.

- [ ] **Step 3: Update formulas-quick-reference.md — btnSaveItem section**

Replace the btnSaveItem.OnSelect formula and update the colSessionList schema table to include:

| Column | Type | Source |
|---|---|---|
| Make | Text | RefreshAssetInventory lookup (blank if unknown) |
| Nonstandard | Text | "Yes" / "No" / "Unknown" |
| DeviceFound | Boolean | true if found in RefreshAssetInventory |

- [ ] **Step 4: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add Make, Nonstandard, DeviceFound to session list collection"
```

---

### Task 9: Update Screen2 Gallery — Add Make and NS Badge

**Purpose:** Show Make and a nonstandard badge in the review list gallery.

**Files:**
- Modify: `app-debug/Src\Screen2.pa.yaml` — galSessionList children

- [ ] **Step 1: Update gallery item layout in Power Apps Studio**

Update `lblGalModel` to show Make + Model:

**lblGalModel.Text** — change from:
```powerfx
ThisItem.Model
```
to:
```powerfx
If(!IsBlank(ThisItem.Make), ThisItem.Make & " ", "") & ThisItem.Model
```

- [ ] **Step 2: Add NS badge control**

Add a new label inside `galSessionList`:

**Control: `lblGalNSBadge`** (Label — inside gallery)
| Property | Value |
|---|---|
| X | `Parent.TemplateWidth - 130` |
| Y | `10` |
| Width | `30` |
| Height | `20` |
| Text | `"NS"` |
| Align | `Align.Center` |
| VerticalAlign | `VerticalAlign.Middle` |
| Size | `9` |
| FontWeight | `FontWeight.Bold` |
| Color | `Color.White` |
| Fill | `If(ThisItem.Nonstandard = "Unknown", RGBA(251, 191, 36, 1), RGBA(255, 140, 0, 1))` |
| Visible | `ThisItem.Nonstandard = "Yes" \|\| ThisItem.Nonstandard = "Unknown"` |

- [ ] **Step 3: Update Screen2.pa.yaml reference file**

Add `lblGalNSBadge` to the gallery Children list and update `lblGalModel.Text`.

```yaml
            - lblGalNSBadge:
                Control: Label@2.5.1
                Properties:
                  Align: =Align.Center
                  Color: =Color.White
                  Fill: =If(ThisItem.Nonstandard = "Unknown", RGBA(251, 191, 36, 1), RGBA(255, 140, 0, 1))
                  Font: =Font.'Open Sans'
                  FontWeight: =FontWeight.Bold
                  Height: =20
                  Size: =9
                  Text: ="NS"
                  VerticalAlign: =VerticalAlign.Middle
                  Visible: =ThisItem.Nonstandard = "Yes" || ThisItem.Nonstandard = "Unknown"
                  Width: =30
                  X: =Parent.TemplateWidth - 130
                  Y: =10
```

- [ ] **Step 4: Commit**

```bash
git add "app-debug/Src\Screen2.pa.yaml"
git commit -m "feat: add Make display and NS badge to Screen2 review gallery"
```

---

### Task 10: Update btnSubmitAll — Add New Columns to Excel Output

**Purpose:** Write Make, Nonstandard, and DeviceFound to the Excel output when submitting the session.

**Files:**
- Modify: `app-debug/Src\Screen2.pa.yaml` — btnSubmitAll.OnSelect
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Add new columns to the Excel file first**

Before updating the app, open `scanToCutsheetsViableAssetTags.xlsx` in SharePoint and add three new column headers to the table:

| Existing Headers | New Headers |
|---|---|
| Date Scanned, Asset Tag, Serial Number, Department, Location, Operator, Model | **Make**, **Nonstandard**, **Device Found** |

Make sure the Excel table (Table1) includes these new columns. Save the file.

- [ ] **Step 2: Document the updated btnSubmitAll.OnSelect formula**

Full formula for Power Apps Studio:

```powerfx
Set(varIsSubmitting, true);
ForAll(
    colSessionList,
    Patch(
        Table1,
        Defaults(Table1),
        {
            'Date Scanned': Text(Now(), "yyyy-mm-dd hh:mm:ss"),
            'Asset Tag': AssetTag,
            'Serial Number': SerialNumber,
            Department: Department,
            Location: Location,
            Operator: User().FullName,
            Model: Model,
            Make: Make,
            Nonstandard: Nonstandard,
            'Device Found': If(DeviceFound, "Yes", "No")
        }
    )
);
Clear(colSessionList);
Set(varIsSubmitting, false);
Set(varSubmitSuccess, true);
Navigate(Screen1, ScreenTransition.Fade)
```

> **Note:** The column names `Make`, `Nonstandard`, and `Device Found` must exactly match the Excel table headers added in Step 1. If Power Apps shows an error, verify the column names match.

- [ ] **Step 3: Update Screen2.pa.yaml reference file**

Replace the `btnSubmitAll.OnSelect` property value.

- [ ] **Step 4: Update formulas-quick-reference.md — btnSubmitAll section**

Replace the btnSubmitAll.OnSelect formula.

- [ ] **Step 5: Commit**

```bash
git add "app-debug/Src\Screen2.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add Make, Nonstandard, DeviceFound columns to Excel submission"
```

---

### Task 11: Connect Data Sources in Power Apps Studio

**Purpose:** Add the two new SharePoint lists as data sources in the app.

**Files:**
- Modify: `app-debug/References\DataSources.json` (updated after connecting in Studio)

- [ ] **Step 1: Add RefreshAssetInventory data source**

In Power Apps Studio:
1. Click **Data** in the left panel
2. Click **+ Add data**
3. Search for "SharePoint"
4. Select the CCHMCRefreshSupport site
5. Check **RefreshAssetInventory**
6. Click **Connect**

- [ ] **Step 2: Add StandardModels data source**

Repeat the process:
1. Click **+ Add data**
2. Select the CCHMCRefreshSupport site
3. Check **StandardModels**
4. Click **Connect**

- [ ] **Step 3: Verify data sources appear**

In the Data panel, you should now see:
- `FY26 Cut Sheets` (existing)
- `FY26 Cut Sheets Part 2` (existing)
- `Table1` / `scanToCutsheetsViableAssetTags` (existing Excel connector)
- `RefreshAssetInventory` (new)
- `StandardModels` (new)

- [ ] **Step 4: Re-download app source to update reference files**

```bash
export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"
export PATH="$PATH:$HOME/.dotnet/tools"
pac canvas download --name "Asset Tag Scanner" -d ./app-debug --overwrite
```

- [ ] **Step 5: Commit updated reference files**

```bash
git add app-debug/
git commit -m "feat: add RefreshAssetInventory and StandardModels data sources"
```

---

### Task 12: End-to-End Testing

**Purpose:** Verify the complete nonstandard detection flow works on a mobile device.

- [ ] **Step 1: Verify OnStart loads colStandardModels**

1. Open the app in Power Apps Studio
2. Click **Play** (preview mode)
3. Add a debug label: `CountRows(colStandardModels)`
4. Verify it shows ~80

- [ ] **Step 2: Test a STANDARD device scan**

Scan or manually enter an asset tag for a device with a common model (e.g., a Dell LATITUDE 7420):
- Expected: GREEN result, NO warning banner
- `varNonstandardStatus` should be "No"
- Form popup should show "Make: Dell | Model: LATITUDE 7420"
- Model field should be pre-filled

- [ ] **Step 3: Test a NONSTANDARD device scan**

Scan or manually enter an asset tag for a device with a rare model (e.g., an Alienware or Panasonic):
- Expected: GREEN result WITH orange warning banner
- Banner text: "⚠ Nonstandard: Alienware [model name]"
- `varNonstandardStatus` should be "Yes"
- Form popup should still show Make/Model info
- User can still add to session

- [ ] **Step 4: Test an UNKNOWN device scan**

Enter a fabricated asset tag that doesn't exist in RefreshAssetInventory (e.g., `EW20-99999`):
- Expected: GREEN result WITH yellow-orange warning banner
- Banner text: "⚠ Device not in inventory — verify asset tag"
- `varNonstandardStatus` should be "Unknown"
- Model field should be empty (user must enter manually)

- [ ] **Step 5: Test session list and submission**

1. Add a standard device, a nonstandard device, and an unknown device to the session
2. Navigate to Screen2 (Review List)
3. Verify: Make + Model shows on each row, NS badge appears on nonstandard/unknown items
4. Submit all
5. Open `scanToCutsheetsViableAssetTags.xlsx` in SharePoint
6. Verify new columns are populated:
   - Standard device: Make=Dell, Nonstandard=No, Device Found=Yes
   - Nonstandard device: Make=Alienware, Nonstandard=Yes, Device Found=Yes
   - Unknown device: Make=(blank), Nonstandard=Unknown, Device Found=No

- [ ] **Step 6: Test RED and YELLOW results are unaffected**

Scan a device that already has a cut sheet (RED) and a too-new device (YELLOW):
- No warning banner should appear
- `varNonstandardStatus` should be "" (empty)
- Behavior should be identical to before this feature

---

### Task 13: Update CLAUDE.md and Documentation

**Purpose:** Update project documentation to reflect the new nonstandard detection feature.

**Files:**
- Modify: `CLAUDE.md` — add nonstandard detection to relevant sections
- Modify: `src/powerapps/formulas-quick-reference.md` — final review

- [ ] **Step 1: Update CLAUDE.md — Scan Result Logic table**

Add nonstandard substates to the scan result table:

```markdown
| Result | Color | Condition | Meaning |
|--------|-------|-----------|---------|
| **NEEDS CUT SHEET** | GREEN | Year ≤ 22 AND not found in SharePoint | Device is eligible for refresh and needs a cut sheet |
| **NEEDS CUT SHEET (NS)** | GREEN + orange banner | GREEN AND model frequency < 50 | Eligible but nonstandard device — verify with team lead |
| **NEEDS CUT SHEET (?)** | GREEN + orange banner | GREEN AND not in inventory | Eligible but device not found in inventory — verify asset tag |
| **HAS CUT SHEET** | RED | Found in SharePoint | Device already has a cut sheet on file |
| **TOO NEW** | YELLOW | Year > 22 | Device is too new for the 4-year refresh cycle |
```

- [ ] **Step 2: Update CLAUDE.md — Variables table**

Add the new variables to the Variables section.

- [ ] **Step 3: Update CLAUDE.md — Data Sources table**

Add RefreshAssetInventory and StandardModels to the SharePoint Data Sources section.

- [ ] **Step 4: Final review of formulas-quick-reference.md**

Read through the entire file and verify all formulas match what was implemented. Check:
- OnStart includes `ClearCollect(colStandardModels, StandardModels)`
- OnScan includes the nonstandard lookup block
- btnSaveItem includes Make, Nonstandard, DeviceFound fields
- btnSubmitAll includes Make, Nonstandard, Device Found columns
- colSessionList schema table includes new fields
- Visibility formulas table includes `rectNSBanner`

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md src/powerapps/formulas-quick-reference.md
git commit -m "docs: update CLAUDE.md and formulas reference for nonstandard detection"
```
