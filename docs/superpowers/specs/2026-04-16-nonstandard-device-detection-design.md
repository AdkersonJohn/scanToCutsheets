# Nonstandard Device Detection — Design Spec

**Date:** 2026-04-16
**Status:** Draft
**Scope:** Add nonstandard device classification to the Asset Tag Scanner Power App

---

## Problem

When scanning asset tags and submitting session data to `scanToCutsheetsViableAssetTags.xlsx`, the team has no way to identify whether a device is a standard fleet model or an uncommon/nonstandard device that may require special refresh handling. The `Refresh Asset Data.xlsx` sheet (maintained in SharePoint) contains full device inventory with make, model, and specs for ~65k devices.

## Goal

At scan time, after a device is determined eligible (GREEN result), the app looks up the asset tag in the inventory data, retrieves Make + Model, and classifies the device as standard or nonstandard based on fleet-wide model frequency. The result is shown to the user and written to the Excel output.

---

## Definition of Nonstandard

A device is **nonstandard** if its (Make, Model) combination appears **fewer than 50 times** in `Refresh Asset Data.xlsx`.

- **Standard:** (Make, Model) appears ≥ 50 times in the fleet (~80 make+model pairs, covering ~94.8% of devices)
- **Nonstandard:** (Make, Model) appears < 50 times (488 rare models — Macs, Alienware, Precision workstations, Toughbooks, XPS, etc.)
- **Unknown:** Asset tag not found in inventory at all

The ≥ 50 threshold was selected based on frequency analysis of the 65,441-row inventory dataset (see analysis in project conversation history).

---

## Architecture: Approach 1 — Pre-imported SharePoint Lists

### Why not direct Excel lookup?

`Refresh Asset Data.xlsx` has 65,441 rows. The PowerApps Excel connector `LookUp` is not delegable on large tables and silently returns incorrect data beyond the delegation limit (~2,000 rows). A SharePoint list with an indexed column supports delegable `LookUp` at any scale.

### New SharePoint Lists

Both lists are created on the existing `CCHMCRefreshSupport` SharePoint site.

#### `RefreshAssetInventory` (~65k rows)

Mirrors the relevant columns from `Refresh Asset Data.xlsx`.

| Column | Type | Source Column | Notes |
|---|---|---|---|
| DeviceName | Single line text, **indexed** | B: Device name | Primary lookup key (EWxx-xxxxx format) |
| SerialNumber | Single line text | C: Serial number | |
| Make | Single line text | G: Make | |
| Model | Single line text | H: Model | |

Only 4 of the 23 source columns are imported — the minimum needed for classification.

#### `StandardModels` (~80 rows)

Pre-computed from frequency analysis. Each row is a (Make, Model) pair that appeared ≥ 50 times in the inventory.

| Column | Type |
|---|---|
| Make | Single line text |
| Model | Single line text |
| DeviceCount | Number (informational — not used by app logic) |

### Refresh Mechanism

A **scheduled Power Automate flow** runs weekly (or on-demand):

1. Reads `Refresh Asset Data.xlsx` from SharePoint Documents folder
2. Clears and repopulates `RefreshAssetInventory` list
3. Recalculates model frequencies across all rows
4. Updates `StandardModels` list with (Make, Model) pairs having count ≥ 50

---

## App Changes

### New Variables

| Variable | Type | Purpose |
|---|---|---|
| `varDeviceRecord` | Record | Result from `RefreshAssetInventory` lookup |
| `varDeviceFound` | Boolean | Whether asset tag exists in inventory |
| `varNonstandardStatus` | Text | `"Yes"` / `"No"` / `"Unknown"` |
| `colStandardModels` | Collection | Loaded at OnStart from `StandardModels` list |

### OnStart Addition

```powerfx
// Load standard models reference (~80 rows)
ClearCollect(colStandardModels, StandardModels);
```

`RefreshAssetInventory` is NOT loaded into a collection — it remains a delegable data source queried per-scan via `LookUp`.

### OnScan Logic Addition

After the existing GREEN determination (year ≤ 22, not found in cut sheet lists), before showing the result:

```powerfx
// Only check if device passed GREEN (needs cut sheet)
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
)
```

### Updated Scan Decision Flow

```
Scan Asset Tag
    │
    ▼
Extract year → Too new? → YELLOW (done)
    │ no
    ▼
Check cut sheet lists → Found? → RED (done)
    │ no
    ▼
GREEN — nonstandard check:
    │
    ▼
LookUp DeviceName in RefreshAssetInventory
    │
    ├─ NOT FOUND → varNonstandardStatus = "Unknown"
    │               warn: "Device not in inventory"
    │
    └─ FOUND → get Make + Model
               │
               ▼
               LookUp (Make, Model) in colStandardModels
               │
               ├─ FOUND → varNonstandardStatus = "No"  (standard)
               └─ NOT FOUND → varNonstandardStatus = "Yes" (nonstandard)
    │
    ▼
Show GREEN result + warning banner if nonstandard/unknown
```

---

## UI Changes

### Screen1 — GREEN Result State

The existing green circle and "NEEDS CUT SHEET" label remain unchanged. Three substates based on `varNonstandardStatus`:

| Status | UI Addition |
|---|---|
| `"No"` (standard) | No change — green circle, "Add to Session" button |
| `"Yes"` (nonstandard) | Orange warning banner below green circle: `"⚠ Nonstandard device: " & varDeviceRecord.Make & " " & varDeviceRecord.Model` |
| `"Unknown"` | Yellow-orange warning banner: `"⚠ Device not in inventory — verify asset tag"` |

"Add to Session" button remains available in all three cases.

### Warning Banner Specs

- **Position:** Below the green circle / result text, above the "Add to Session" button
- **Visibility:** `varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> ""`
- **Fill:** `RGBA(255, 165, 0, 0.15)` (light orange background)
- **Border:** `RGBA(255, 140, 0, 1)` (orange left border, 3px)
- **Font color:** `RGBA(180, 100, 0, 1)` (dark orange text)

### Screen1 — Form Popup

Two new read-only display fields added to the form popup:

| Field | Value | Editable? |
|---|---|---|
| Make | `varDeviceRecord.Make` (blank if unknown) | No — read-only |
| Model | `If(varDeviceFound, varDeviceRecord.Model, txtModel.Text)` | Auto-filled if found; user-editable if unknown |

If the device is found in inventory, the Model field is pre-filled from inventory data. If unknown, the user enters it manually (existing behavior).

### Screen2 — Review List

Each gallery item displays:
- Existing fields (Asset Tag, Serial #, Department, Location, Model)
- **Make** field added
- **Orange "NS" badge** visible when `ThisItem.Nonstandard = "Yes"` or `ThisItem.Nonstandard = "Unknown"`

---

## Session List Changes

### colSessionList Schema Update

Three new fields added to each collected item:

```powerfx
Collect(colSessionList,
    {
        // existing fields
        AssetTag: varCurrentAssetTag,
        SerialNumber: txtSerialNumber.Text,
        Department: txtDepartment.Text,
        Location: txtLocation.Text,
        Model: If(varDeviceFound, varDeviceRecord.Model, txtModel.Text),
        Operator: User().FullName,
        DateScanned: Now(),
        // new fields
        Make: If(varDeviceFound, varDeviceRecord.Make, ""),
        Nonstandard: varNonstandardStatus,
        DeviceFound: varDeviceFound
    }
)
```

### Excel Output Update

`scanToCutsheetsViableAssetTags.xlsx` gets three new columns appended to the existing schema:

| Existing Columns | New Columns |
|---|---|
| Date Scanned, Asset Tag, Serial Number, Department, Location, Operator, Model | **Make**, **Nonstandard** (Yes/No/Unknown), **Device Found** (true/false) |

The Office Script or Power Automate flow that writes to this Excel file must be updated to include the new columns.

---

## Error Handling

If the `RefreshAssetInventory` lookup fails (network issue, SharePoint throttling, data source unavailable):

- `varDeviceFound` = false
- `varNonstandardStatus` = "Unknown"
- App continues normally — the nonstandard check degrades gracefully
- User can still add items to the session
- The "Unknown" flag signals the data needs post-hoc verification

The core scan workflow (year check + cut sheet lookup) is never blocked by a nonstandard check failure.

---

## Data Source Summary

| Data Source | Type | Size | App Usage |
|---|---|---|---|
| `FY26 Cut Sheets` | SharePoint list (existing) | Variable | Delegable LookUp per scan |
| `FY26 Cut Sheets Part 2` | SharePoint list (existing) | Variable | Delegable LookUp per scan |
| `RefreshAssetInventory` | SharePoint list (new) | ~65k rows | Delegable LookUp per scan |
| `StandardModels` | SharePoint list (new) | ~80 rows | Loaded into `colStandardModels` at OnStart |
| `scanToCutsheetsViableAssetTags.xlsx` | Excel file (existing) | Growing | Written to at submit time (3 new columns) |
| `Refresh Asset Data.xlsx` | Excel file (existing) | ~65k rows | Source for Power Automate sync flow — NOT accessed by app |

---

## Implementation Components

1. **SharePoint lists:** Create `RefreshAssetInventory` and `StandardModels` on CCHMCRefreshSupport site
2. **Initial data load:** One-time import of Refresh Asset Data into RefreshAssetInventory; compute and populate StandardModels
3. **Power Automate sync flow:** Scheduled weekly refresh from Excel source
4. **App OnStart:** Add `ClearCollect(colStandardModels, StandardModels)`
5. **App OnScan:** Add nonstandard lookup logic after GREEN determination
6. **App Screen1 UI:** Warning banner + form popup updates (Make, Model pre-fill)
7. **App Screen2 UI:** Make column + NS badge in review gallery
8. **Excel output:** Update submission logic to write Make, Nonstandard, DeviceFound columns
