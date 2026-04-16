# Nonstandard Detection v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revise nonstandard device detection from frequency-based (v1) to Jake's curated allowlist + hardware spec checks (v2) on the existing `feature/nonstandard-device-detection` branch.

**Architecture:** Same scan-time lookup via RefreshAssetInventory SharePoint list, but replace the StandardModels collection check with hardcoded model family pattern matching + RAM/CPU/disk spec comparison. Delete all StandardModels infrastructure.

**Tech Stack:** Power Apps (canvas app), SharePoint Online lists, Power Automate, Power Fx formulas, PowerShell (PnP)

**Spec:** `docs/superpowers/specs/2026-04-16-nonstandard-detection-v2-design.md`

**Branch:** `feature/nonstandard-device-detection` (already exists with v1 commits)

---

## Important Context

- This is a **revision** of existing v1 work, not a greenfield implementation. Files already exist and need updating.
- App source files are at `app-debug/Src\*.pa.yaml` (backslash filenames). These are reference copies — actual changes are made in Power Apps Studio.
- The current OnScan formula already has a nonstandard check block that uses `colStandardModels` — this gets replaced.
- The current OnStart already has `varDeviceRecord`, `varDeviceFound`, `varNonstandardStatus`, and `ClearCollect(colStandardModels, StandardModels)` — the ClearCollect gets removed and new vars get added.

---

### Task 1: Delete v1 StandardModels Files

**Purpose:** Remove the frequency-based StandardModels infrastructure that's no longer needed.

**Files:**
- Delete: `src/sharepoint/Create-StandardModelsList.ps1`
- Delete: `src/sharepoint/generate-standard-models.py`
- Delete: `src/sharepoint/standard-models.csv`

- [ ] **Step 1: Delete the files**

```bash
git rm src/sharepoint/Create-StandardModelsList.ps1
git rm src/sharepoint/generate-standard-models.py
git rm src/sharepoint/standard-models.csv
```

- [ ] **Step 2: Commit**

```bash
git commit -m "refactor: remove v1 StandardModels files (replaced by hardcoded allowlist)"
```

---

### Task 2: Update RefreshAssetInventory Provisioning Script

**Purpose:** Add RAM, CPU, and DiskSize columns to the SharePoint list creation script.

**Files:**
- Modify: `src/sharepoint/Create-RefreshAssetInventoryList.ps1`

- [ ] **Step 1: Add three new columns to the script**

After the existing `Add-PnPField` lines for DeviceName, SerialNumber, Make, and Model, add:

```powershell
Add-PnPField -List $listName -DisplayName "RAM" -InternalName "RAM" -Type Number
Add-PnPField -List $listName -DisplayName "CPU" -InternalName "CPU" -Type Text
Add-PnPField -List $listName -DisplayName "DiskSize" -InternalName "DiskSize" -Type Number
```

- [ ] **Step 2: Update the completion message**

Change the final Write-Host messages to mention 7 columns instead of 4, and note the byte-to-GB conversion requirement:

```powershell
Write-Host ""
Write-Host "RefreshAssetInventory list created with 7 columns and indexed DeviceName."
Write-Host ""
Write-Host "Columns: DeviceName (indexed), SerialNumber, Make, Model, RAM, CPU, DiskSize"
Write-Host ""
Write-Host "IMPORTANT: RAM and DiskSize are stored in GB (not bytes)."
Write-Host "The Power Automate sync flow must convert bytes to GB during import:"
Write-Host "  RAM = Total physical memory / 1073741824 (rounded)"
Write-Host "  DiskSize = Disk 1 size / 1073741824 (rounded)"
Write-Host ""
Write-Host "IMPORTANT: SharePoint list view threshold is 5,000 items."
Write-Host "With ~65k items, you MUST use indexed columns for all queries."
Write-Host "The DeviceName column has been indexed for delegable LookUp from Power Apps."
Write-Host ""
Write-Host "Next step: Set up the Power Automate flow to populate this list"
Write-Host "from Refresh Asset Data.xlsx (see the sync flow guide)."
```

- [ ] **Step 3: Commit**

```bash
git add src/sharepoint/Create-RefreshAssetInventoryList.ps1
git commit -m "feat: add RAM, CPU, DiskSize columns to RefreshAssetInventory script"
```

---

### Task 3: Update Power Automate Sync Flow Guide

**Purpose:** Update the documentation to reflect 7 columns and byte-to-GB conversion.

**Files:**
- Modify: `src/powerapps/power-automate-sync-flow-guide.md`

- [ ] **Step 1: Update the Create item action**

Find the section describing the **Create item** action inside the "Apply to each — add new items from Excel" step. Replace it with:

```markdown
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
```

- [ ] **Step 2: Remove the StandardModels recalculation section**

Delete the entire `## Flow: Recalculate StandardModels` section (including the Office Script and manual refresh subsections). Replace with:

```markdown
## StandardModels — No Longer Needed

The standard device definition is now hardcoded in the Power App's OnScan formula
(6 model families + spec thresholds). There is no StandardModels SharePoint list
or sync flow to maintain.

If the standard model list changes, update the OnScan formula in Power Apps Studio.
See `src/powerapps/formulas-quick-reference.md` for the current formula.
```

- [ ] **Step 3: Commit**

```bash
git add src/powerapps/power-automate-sync-flow-guide.md
git commit -m "docs: update sync flow guide for 7 columns and remove StandardModels section"
```

---

### Task 4: Update App.OnStart

**Purpose:** Remove `ClearCollect(colStandardModels, StandardModels)`, add `varNonstandardReason` and `varModelIsStandard`.

**Files:**
- Modify: `app-debug/Src\App.pa.yaml`
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Update App.pa.yaml**

The current OnStart ends with:

```yaml
        Set(varDeviceRecord, Blank());
        Set(varDeviceFound, false);
        Set(varNonstandardStatus, "");

        ClearCollect(colStandardModels, StandardModels)
```

Replace with:

```yaml
        Set(varDeviceRecord, Blank());
        Set(varDeviceFound, false);
        Set(varNonstandardStatus, "");
        Set(varNonstandardReason, "");
        Set(varModelIsStandard, false)
```

Note: remove the `ClearCollect` line entirely and add two new `Set` lines. The last line has no semicolon (it's the final statement).

- [ ] **Step 2: Update formulas-quick-reference.md — OnStart section**

Find the `## App.OnStart` code block. Replace the nonstandard variables section:

From:
```powerfx
// NEW: Nonstandard device detection variables
Set(varDeviceRecord, Blank());
Set(varDeviceFound, false);
Set(varNonstandardStatus, "");

// NEW: Load standard models reference (~80 rows)
ClearCollect(colStandardModels, StandardModels)
```

To:
```powerfx
// Nonstandard device detection variables
Set(varDeviceRecord, Blank());
Set(varDeviceFound, false);
Set(varNonstandardStatus, "");
Set(varNonstandardReason, "");
Set(varModelIsStandard, false)
```

- [ ] **Step 3: Commit**

```bash
git add "app-debug/Src\App.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: replace colStandardModels with hardcoded allowlist variables in OnStart"
```

---

### Task 5: Update OnScan — Replace Frequency Check with Allowlist + Specs

**Purpose:** Replace the v1 nonstandard check (colStandardModels lookup) with the v2 model family pattern matching + spec comparison.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — brcScanner.OnScan property
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Replace the nonstandard check block in the OnScan formula**

In the brcScanner.OnScan inline string, find the nonstandard check block. It currently starts with:

```
// Nonstandard device check (only for GREEN results)
```

and ends with:

```
      Set(varNonstandardStatus, "")
  );
```

Replace the entire block (from `// Nonstandard device check` through the closing `);` of the outer If) with:

```powerfx
  // Nonstandard device check (only for GREEN results)
  If(
      !varMatchFound && !varDeviceTooNew,

      // Lookup device in inventory
      Set(varDeviceRecord,
          LookUp(RefreshAssetInventory, DeviceName = varScannedValue));
      Set(varDeviceFound, !IsBlank(varDeviceRecord));

      If(
          !varDeviceFound,
          // Not in inventory
          Set(varNonstandardStatus, "Unknown");
          Set(varNonstandardReason, ""),

          // Check model family
          Set(varModelIsStandard,
              "LATITUDE 55" in Upper(varDeviceRecord.Model) ||
              "LATITUDE 74" in Upper(varDeviceRecord.Model) ||
              "OPTIPLEX MICRO" in Upper(varDeviceRecord.Model) ||
              "DELL PRO 14 PLUS" in Upper(varDeviceRecord.Model) ||
              "DELL PRO MICRO PLUS" in Upper(varDeviceRecord.Model) ||
              ("DELL PRO 16" in Upper(varDeviceRecord.Model) &&
               !("PLUS" in Upper(varDeviceRecord.Model)))
          );

          If(
              !varModelIsStandard,
              // Model doesn't match any standard family
              Set(varNonstandardStatus, "Yes");
              Set(varNonstandardReason, "model"),

              // Model matches — check specs
              If(
                  (varDeviceRecord.RAM >= 15 && varDeviceRecord.RAM <= 16) &&
                  ("I5" in Upper(varDeviceRecord.CPU) || "ULTRA 5" in Upper(varDeviceRecord.CPU)) &&
                  (varDeviceRecord.DiskSize >= 230 && varDeviceRecord.DiskSize <= 260),

                  // Fully standard
                  Set(varNonstandardStatus, "No");
                  Set(varNonstandardReason, ""),

                  // Standard model but wrong specs
                  Set(varNonstandardStatus, "Yes");
                  Set(varNonstandardReason, "specs")
              )
          )
      ),

      // Not a GREEN result
      Set(varDeviceFound, false);
      Set(varNonstandardStatus, "");
      Set(varNonstandardReason, "")
  );
```

IMPORTANT: This is inside a double-quoted YAML string with `\n` separators. Maintain that format.

- [ ] **Step 2: Update formulas-quick-reference.md — OnScan section**

Replace the nonstandard check block in the `## brcScanner.OnScan` code block with the same formula above.

- [ ] **Step 3: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: replace frequency-based check with allowlist + specs in OnScan"
```

---

### Task 6: Update Warning Banner Text

**Purpose:** Change the warning banner to show reason-specific messaging (model vs specs).

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — lblNSWarning.Text property

- [ ] **Step 1: Update lblNSWarning.Text**

Find `lblNSWarning` in Screen1.pa.yaml (around line 108). Change the `Text` property from:

```yaml
            Text: =If(varNonstandardStatus = "Unknown", "⚠ Device not in inventory — verify asset tag", "⚠ Nonstandard: " & varDeviceRecord.Make & " " & varDeviceRecord.Model)
```

to:

```yaml
            Text: =If(varNonstandardStatus = "Unknown", "⚠ Device not in inventory — verify asset tag", varNonstandardReason = "model", "⚠ Nonstandard model: " & varDeviceRecord.Make & " " & varDeviceRecord.Model, "⚠ Nonstandard specs: " & varDeviceRecord.RAM & " GB RAM, " & varDeviceRecord.CPU & " (expected 16 GB, i5/Ultra 5, 256 GB SSD)")
```

- [ ] **Step 2: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml"
git commit -m "feat: update warning banner with reason-specific messaging"
```

---

### Task 7: Update btnSaveItem — Add NonstandardReason

**Purpose:** Add `NonstandardReason` field to the colSessionList collection in both Collect and UpdateIf branches.

**Files:**
- Modify: `app-debug/Src\Screen1.pa.yaml` — btnSaveItem.OnSelect
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Add NonstandardReason to both branches**

In the btnSaveItem.OnSelect inline string, find the Collect block's object. After the `DeviceFound: varDeviceFound` line, add:

```
NonstandardReason: varNonstandardReason
```

Do the same in the UpdateIf block — after `DeviceFound: varDeviceFound`, add:

```
NonstandardReason: varNonstandardReason
```

- [ ] **Step 2: Update formulas-quick-reference.md — btnSaveItem section and colSessionList schema**

Add `NonstandardReason: varNonstandardReason` to both Collect and UpdateIf blocks in the formula reference.

Add to the colSessionList table:

```markdown
| NonstandardReason | Text | "model" / "specs" / "" |
```

- [ ] **Step 3: Commit**

```bash
git add "app-debug/Src\Screen1.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add NonstandardReason to session list collection"
```

---

### Task 8: Update btnSubmitAll — Add NonstandardReason to Excel Output

**Purpose:** Write the NonstandardReason field to the Excel output.

**Files:**
- Modify: `app-debug/Src\Screen2.pa.yaml` — btnSubmitAll.OnSelect
- Modify: `src/powerapps/formulas-quick-reference.md`

- [ ] **Step 1: Add NonstandardReason to the Patch object**

In the btnSubmitAll.OnSelect inline string, find the Patch object. After the `'Device Found': If(DeviceFound, "Yes", "No")` line, add:

```
'Nonstandard Reason': NonstandardReason
```

- [ ] **Step 2: Update formulas-quick-reference.md — btnSubmitAll section**

Add `'Nonstandard Reason': NonstandardReason` to the Patch object in the formula reference.

- [ ] **Step 3: Commit**

```bash
git add "app-debug/Src\Screen2.pa.yaml" src/powerapps/formulas-quick-reference.md
git commit -m "feat: add NonstandardReason column to Excel submission"
```

---

### Task 9: Update CLAUDE.md

**Purpose:** Update project documentation to reflect the v2 allowlist approach.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the OnScan formula in Key Formulas section**

Find the `### OnScan (brcScanner)` section. The nonstandard check block in the formula needs to be replaced with the v2 allowlist + specs version (same formula as Task 5).

- [ ] **Step 2: Update the Variables table**

Add to the Variables table in the Session List Feature section:

```markdown
| `varNonstandardReason` | Text | "model" / "specs" / "" — why device is nonstandard |
| `varModelIsStandard` | Boolean | Intermediate check: does model match a standard family? |
```

Remove any reference to `colStandardModels`.

- [ ] **Step 3: Add Standard Device Definition section**

Add a new section after the Scan Result Logic section:

```markdown
## Standard Device Definition

### Standard Model Families (Allowlist)
- Latitude 55 (matches LATITUDE 5520, 5530, 5540, 5550)
- Latitude 74 (matches LATITUDE 7400-7450)
- Optiplex Micro (matches OPTIPLEX MICRO, OPTIPLEX MICRO PLUS)
- Dell Pro 14 Plus
- Dell Pro 16 (NOT Plus variant)
- Dell Pro Micro Plus

### Standard Hardware Specs
All three must pass for a device to be classified as standard:
- RAM: 16 GB (15-16 GB accepted due to reporting variance)
- CPU: i5 or Ultra 5
- Disk: 256 GB SSD (230-260 GB accepted due to rounding)

### Classification
- **Standard:** Model matches a family AND all specs pass
- **Nonstandard (model):** Model doesn't match any family
- **Nonstandard (specs):** Model matches but specs fail (e.g., 8 GB RAM)
- **Unknown:** Asset tag not found in RefreshAssetInventory
```

- [ ] **Step 4: Update SharePoint Data Sources table**

Remove the `StandardModels` row from the SharePoint Data Sources table. The `RefreshAssetInventory` row stays.

- [ ] **Step 5: Update Visibility Logic section**

No changes needed — the warning banner visibility formula is unchanged.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for v2 allowlist-based nonstandard detection"
```

---

### Task 10: Manual Steps Checklist

**Purpose:** Document the manual steps that cannot be automated. These are for the developer/admin to execute.

No files to commit — this is a reference for the developer.

- [ ] **Step 1: Add Nonstandard Reason column to Excel file**

Open `scanToCutsheetsViableAssetTags.xlsx` in SharePoint. Add a `Nonstandard Reason` column header to the Excel table (Table1), after the `Device Found` column.

- [ ] **Step 2: Re-run SharePoint provisioning (if list already created)**

If `RefreshAssetInventory` was already created with v1's 4 columns, either:
- Delete and recreate it with the updated script (7 columns)
- Or manually add RAM (Number), CPU (Text), DiskSize (Number) columns in SharePoint

- [ ] **Step 3: Remove StandardModels data source from Power Apps**

In Power Apps Studio:
1. Click **Data** in the left panel
2. Find `StandardModels`
3. Click the `...` menu → **Remove**

If `StandardModels` was never connected, skip this step.

- [ ] **Step 4: Update Power Automate flow**

Update the sync flow to import 7 columns instead of 4, with byte-to-GB conversion for RAM and DiskSize. See `src/powerapps/power-automate-sync-flow-guide.md` for updated instructions.

- [ ] **Step 5: Paste updated formulas into Power Apps Studio**

Using `src/powerapps/formulas-quick-reference.md` as reference, paste:
- App.OnStart (updated — no ClearCollect, new vars)
- brcScanner.OnScan (updated — allowlist + specs check)
- lblNSWarning.Text (updated — reason-specific messaging)
- btnSaveItem.OnSelect (updated — NonstandardReason field)
- btnSubmitAll.OnSelect (updated — NonstandardReason column)

- [ ] **Step 6: Test on device**

Test cases:
1. Scan a standard device (Latitude 7440, 16 GB RAM, i5) → GREEN, no banner
2. Scan a nonstandard model (HP EliteBook 840) → GREEN + "Nonstandard model" banner
3. Scan a standard model with wrong specs (Latitude 7420, 8 GB RAM) → GREEN + "Nonstandard specs" banner
4. Scan unknown tag → GREEN + "Device not in inventory" banner
5. Scan RED/YELLOW devices → no banner, unchanged behavior
6. Submit session → verify Nonstandard Reason column populated in Excel
