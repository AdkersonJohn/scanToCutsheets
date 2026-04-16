# Nonstandard Device Detection v2 — Design Spec

**Date:** 2026-04-16
**Status:** Draft
**Scope:** Revise nonstandard device classification from frequency-based to curated allowlist + spec check
**Supersedes:** `2026-04-16-nonstandard-device-detection-design.md` (v1 — frequency-based approach)

---

## Problem

The v1 approach defined "standard" as any (Make, Model) pair appearing ≥ 50 times in the fleet inventory. This was a statistical approximation. The team lead (Jake) has since provided the actual definition: a curated list of 6 standard model families plus required hardware specs (RAM, CPU, disk). A device is only standard if it matches both a model family AND the spec requirements.

## Goal

Same as v1 — at scan time, after GREEN result, classify the device as standard/nonstandard/unknown. But now using Jake's authoritative allowlist instead of frequency analysis, and checking hardware specs in addition to model name.

---

## Standard Device Definition

### Standard Model Families

| Family | Matches (substring in Model field) | Example inventory entries |
|---|---|---|
| Latitude 55 | `LATITUDE 55` | LATITUDE 5520, 5530, 5540, 5550 |
| Latitude 74 | `LATITUDE 74` | LATITUDE 7400, 7410, 7420, 7430, 7440, 7450 |
| Optiplex Micro | `OPTIPLEX MICRO` | OPTIPLEX MICRO PLUS 7010, 7020 |
| Dell Pro 14 Plus | `DELL PRO 14 PLUS` | DELL PRO 14 PLUS PB14250 |
| Dell Pro 16 (not Plus) | `DELL PRO 16` AND NOT `PLUS` | DELL PRO 16 PC16250 |
| Dell Pro Micro Plus | `DELL PRO MICRO PLUS` | DELL PRO MICRO PLUS QBM1250 |

### Standard Hardware Specs

All three must pass:

| Spec | Standard Value | Accepted Range | Source Column |
|---|---|---|---|
| RAM | 16 GB | 15-16 GB (reporting variance) | O: Total physical memory (converted from bytes to GB) |
| CPU | i5 or Ultra 5 | Model string contains "i5" OR "Ultra 5" | P: CPU name |
| Disk | 256 GB SSD | 230-260 GB (rounding variance) | N: Disk 1 size (converted from bytes to GB) |

### Classification Rules

| Condition | Status | Reason |
|---|---|---|
| Asset tag not in RefreshAssetInventory | Unknown | — |
| Model does not match any standard family | Nonstandard | model |
| Model matches but specs fail | Nonstandard | specs |
| Model matches AND all specs pass | Standard | — |

### Why Hardcoded (No StandardModels SharePoint List)

- Only 6 model families — changes infrequently
- Power Fx has no regex — pattern matching from a SharePoint collection is awkward
- Spec thresholds (16 GB, i5/Ultra 5, 256 GB) are even less likely to change
- Adding a model family = adding one line to the Power Fx formula
- Eliminates an entire SharePoint list, OnStart collection load, and sync flow

---

## Architecture Changes from v1

### Eliminated Components

| Component | Reason |
|---|---|
| `StandardModels` SharePoint list | Replaced by hardcoded Power Fx rules |
| `colStandardModels` collection | No longer needed at OnStart |
| `Create-StandardModelsList.ps1` | No list to create |
| `generate-standard-models.py` | No frequency analysis needed |
| `standard-models.csv` | No CSV to import |

### Modified Components

#### RefreshAssetInventory (SharePoint list) — 3 new columns

| Column | Type | Source Column | Notes |
|---|---|---|---|
| DeviceName | Text, **indexed** | B: Device name | Unchanged |
| SerialNumber | Text | C: Serial number | Unchanged |
| Make | Text | G: Make | Unchanged |
| Model | Text | H: Model | Unchanged |
| **RAM** | **Number** | **O: Total physical memory** | **NEW — stored in GB (converted from bytes during sync)** |
| **CPU** | **Text** | **P: CPU name** | **NEW** |
| **DiskSize** | **Number** | **N: Disk 1 size** | **NEW — stored in GB (converted from bytes during sync)** |

The Power Automate sync flow must convert bytes to GB during import:
- RAM: `Total physical memory / 1073741824` rounded to nearest integer
- DiskSize: `Disk 1 size / 1073741824` rounded to nearest integer

#### Create-RefreshAssetInventoryList.ps1 — add 3 columns

Add `RAM` (Number), `CPU` (Text), `DiskSize` (Number) to the provisioning script.

#### Power Automate sync flow — import 7 columns

Update the flow guide to map the 3 new Excel columns and include byte-to-GB conversion.

---

## App Changes

### Variables

| Variable | Type | Change | Purpose |
|---|---|---|---|
| `varDeviceRecord` | Record | Unchanged | Result from RefreshAssetInventory lookup |
| `varDeviceFound` | Boolean | Unchanged | Whether asset tag exists in inventory |
| `varNonstandardStatus` | Text | Unchanged | "Yes" / "No" / "Unknown" |
| `varNonstandardReason` | Text | **NEW** | "model" / "specs" / "" — why it's nonstandard |
| `varModelIsStandard` | Boolean | **NEW** | Intermediate: does model match a standard family? |
| `colStandardModels` | Collection | **REMOVED** | No longer needed |

### OnStart Changes

Remove:
```powerfx
ClearCollect(colStandardModels, StandardModels);
```

Add:
```powerfx
Set(varNonstandardReason, "");
Set(varModelIsStandard, false);
```

### OnScan Logic (nonstandard check block)

Replaces the v1 frequency-based check:

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
)
```

---

## UI Changes

### Warning Banner Text (lblNSWarning)

Updated to show reason-specific messaging:

```powerfx
If(
    varNonstandardStatus = "Unknown",
    "⚠ Device not in inventory — verify asset tag",
    varNonstandardReason = "model",
    "⚠ Nonstandard model: " & varDeviceRecord.Make & " " & varDeviceRecord.Model,
    varNonstandardReason = "specs",
    "⚠ Nonstandard specs: " &
        varDeviceRecord.RAM & " GB RAM, " &
        varDeviceRecord.CPU & " (" &
        "expected 16 GB, i5/Ultra 5, 256 GB SSD)"
)
```

All other UI controls (rectNSBanner, rectNSBorderLeft, lblFormMake, NS badge) remain unchanged from v1.

---

## Session List & Excel Output Changes

### colSessionList — add NonstandardReason

```powerfx
// In btnSaveItem Collect:
NonstandardReason: varNonstandardReason
```

### Excel Output — add NonstandardReason column

`scanToCutsheetsViableAssetTags.xlsx` gets one additional column beyond v1:

| v1 Columns | v2 Addition |
|---|---|
| Date Scanned, Asset Tag, Serial Number, Department, Location, Operator, Model, Make, Nonstandard, Device Found | **Nonstandard Reason** ("model" / "specs" / "") |

---

## Fleet Impact Analysis

Based on the 65,438 devices in the current inventory:

| Classification | Count | % of Fleet |
|---|---|---|
| Standard (model + specs pass) | 18,734 | 28.6% |
| Nonstandard — model not in allowlist | 38,122 | 58.3% |
| Nonstandard — model matches but specs fail | 8,582 | 13.1% |
| Spec failures breakdown: | | |
| — RAM only (8 GB instead of 16 GB) | 7,373 | 11.3% |
| — RAM + other specs | 720 | 1.1% |
| — CPU/Disk only | 489 | 0.7% |

The most common nonstandard scenario is a standard model family with 8 GB RAM — these are older units of the same model line that shipped with lower specs.

---

## Implementation: Files to Change

These files need updating on the existing `feature/nonstandard-device-detection` branch:

| File | Action | What Changes |
|---|---|---|
| `src/sharepoint/Create-StandardModelsList.ps1` | **Delete** | No longer needed |
| `src/sharepoint/generate-standard-models.py` | **Delete** | No longer needed |
| `src/sharepoint/standard-models.csv` | **Delete** | No longer needed |
| `src/sharepoint/Create-RefreshAssetInventoryList.ps1` | **Update** | Add RAM, CPU, DiskSize columns |
| `src/powerapps/power-automate-sync-flow-guide.md` | **Update** | 7 columns, byte-to-GB conversion |
| `app-debug/Src\App.pa.yaml` | **Update** | Remove ClearCollect, add new vars |
| `app-debug/Src\Screen1.pa.yaml` (OnScan) | **Update** | Replace frequency check with allowlist + specs |
| `app-debug/Src\Screen1.pa.yaml` (lblNSWarning) | **Update** | Reason-specific banner text |
| `app-debug/Src\Screen1.pa.yaml` (btnSaveItem) | **Update** | Add NonstandardReason to Collect |
| `app-debug/Src\Screen2.pa.yaml` (btnSubmitAll) | **Update** | Add NonstandardReason to Patch |
| `src/powerapps/formulas-quick-reference.md` | **Update** | All formula changes |
| `CLAUDE.md` | **Update** | Document allowlist approach |
