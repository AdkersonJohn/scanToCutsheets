# Deploying Nonstandard Device Detection to the Live App

The feature was built locally (in committed YAML) but never published. This guide
walks through landing it in the live "Asset Tag Scanner" app via Power Apps Studio.

Prereq: `RefreshAssetInventory` SharePoint list is populated (done — 65,441 rows).

## Step 1: Add the data source

1. Open https://make.powerapps.com → Apps → "Asset Tag Scanner" → Edit
2. Left rail → **Data** → **Add data**
3. Search **SharePoint** → choose the existing connection
4. Site: `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport`
5. Check **`RefreshAssetInventory`** → Connect

## Step 2: Update App.OnStart

Open the **App** object → OnStart formula. Append before the final closing line:

```powerfx
Set(varDeviceTooNew, false);
Set(varAssetYear, 0);
Set(varDeviceRecord, Blank());
Set(varDeviceFound, false);
Set(varNonstandardStatus, "");
Set(varNonstandardReason, "");
Set(varModelIsStandard, false)
```

Then click **Run OnStart** (in the App object's "..." menu) so the new vars
initialize for your editor session.

## Step 3: Replace brcScanner.OnScan

Select **brcScanner** → OnScan property → paste this entire formula:

```powerfx
// Capture scanned value
Set(varScannedValue, Trim(First(brcScanner.Barcodes).Value));
Set(varIsSearching, true);
Set(varShowResult, false);
Set(varSubmitSuccess, false);
Set(varShowForm, false);

// Extract year from asset tag (chars 3-4)
Set(varAssetYear, Value(Mid(varScannedValue, 3, 2)));
Set(varDeviceTooNew, varAssetYear > 22 || IsBlank(varAssetYear));

// Cut sheet check (skip if too new)
If(
    !varDeviceTooNew,
    Set(varMatchRecord,
        Coalesce(
            LookUp('FY26 Cut Sheets', 'Legacy Asset Tag' = Trim(varScannedValue)),
            LookUp('FY26 Cut Sheets Part 2', 'Legacy Asset Tag' = Trim(varScannedValue))
        )
    ),
    Set(varMatchRecord, Blank())
);
Set(varMatchFound, !IsBlank(varMatchRecord));

// Nonstandard classification (only on GREEN path)
If(
    !varMatchFound && !varDeviceTooNew,
    Set(varDeviceRecord, LookUp(RefreshAssetInventory, DeviceName = varScannedValue));
    Set(varDeviceFound, !IsBlank(varDeviceRecord));
    If(
        !varDeviceFound,
        Set(varNonstandardStatus, "Unknown");
        Set(varNonstandardReason, ""),

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
            Set(varNonstandardStatus, "Yes"); Set(varNonstandardReason, "model"),
            If(
                (varDeviceRecord.RAM >= 15 && varDeviceRecord.RAM <= 16) &&
                ("I5" in Upper(varDeviceRecord.CPU) || "ULTRA 5" in Upper(varDeviceRecord.CPU)) &&
                (varDeviceRecord.DiskSize >= 230 && varDeviceRecord.DiskSize <= 260),
                Set(varNonstandardStatus, "No"); Set(varNonstandardReason, ""),
                Set(varNonstandardStatus, "Yes"); Set(varNonstandardReason, "specs")
            )
        )
    ),
    Set(varDeviceFound, false);
    Set(varNonstandardStatus, "");
    Set(varNonstandardReason, "")
);

Set(varIsSearching, false);
Set(varShowResult, true)
```

## Step 4: Add the orange warning banner (3 controls)

On Screen1, after `lblSuccessAsset`, insert:

**rectNSBanner** (Rectangle):
- Fill: `RGBA(255, 165, 0, 0.15)`
- BorderColor: `RGBA(255, 140, 0, 1)`
- BorderThickness: `0`
- X: `40`, Y: `650`, Width: `Parent.Width - 80`, Height: `40`
- Visible: `varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> "" && !varShowForm && !varSubmitSuccess`

**rectNSBorderLeft** (Rectangle):
- Fill: `RGBA(255, 140, 0, 1)`
- X: `40`, Y: `650`, Width: `3`, Height: `40`
- Visible: `rectNSBanner.Visible`

**lblNSWarning** (Label):
- Color: `RGBA(180, 100, 0, 1)`
- Size: `12`, Align: `Align.Left`, VerticalAlign: `VerticalAlign.Middle`
- X: `50`, Y: `650`, Width: `Parent.Width - 100`, Height: `40`
- Visible: `rectNSBanner.Visible`
- Text:
```powerfx
If(
    varNonstandardStatus = "Unknown",
    "⚠ Device not in inventory — verify asset tag",
    varNonstandardReason = "model",
    "⚠ Nonstandard model: " & varDeviceRecord.Make & " " & varDeviceRecord.Model,
    "⚠ Nonstandard specs: " & varDeviceRecord.RAM & " GB RAM, " & varDeviceRecord.CPU & " (expected 16 GB, i5/Ultra 5, 256 GB SSD)"
)
```

## Step 5: Update form popup controls

**lblFormMake** (existing label in the form popup) — update:
- Color: `If(varNonstandardStatus = "No", RGBA(107, 114, 128, 1), RGBA(180, 100, 0, 1))`
- FontWeight: `If(varNonstandardStatus <> "No" && varNonstandardStatus <> "", FontWeight.Semibold, FontWeight.Normal)`
- Text: `If(varDeviceFound, "Make: " & varDeviceRecord.Make & " | Model: " & varDeviceRecord.Model, "Device not in inventory")`

**txtModel** (existing text input) — update Default:
```powerfx
If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Model,
   If(varDeviceFound, varDeviceRecord.Model, ""))
```

## Step 6: Update btnSaveItem.OnSelect

Inside both the `UpdateIf` and `Collect` calls of btnSaveItem.OnSelect, add these
fields to the record:

```powerfx
Make: If(varDeviceFound, varDeviceRecord.Make, ""),
Nonstandard: varNonstandardStatus,
DeviceFound: varDeviceFound,
NonstandardReason: varNonstandardReason
```

## Step 7: Save → Publish → Test

1. Save (Ctrl+S)
2. App Checker (left rail) — fix any errors before publishing
3. **Publish**
4. On the iOS device: force-close Power Apps, reopen, scan a known device

### Test cases

| Asset tag | Expected |
|---|---|
| Standard Latitude 5540 with 16 GB / i5 / 256 GB | GREEN, no banner |
| Latitude with 8 GB RAM | GREEN with orange banner: `⚠ Nonstandard specs: 8 GB RAM, ...` |
| Dell Pro Max Tower | GREEN with orange banner: `⚠ Nonstandard model: Dell DELL PRO MAX TOWER...` |
| Asset tag not in inventory | GREEN with orange banner: `⚠ Device not in inventory — verify asset tag` |
| Cut sheet exists | RED (unchanged) |
| EW23+ | YELLOW too new (unchanged) |

## If something breaks

- **Formula error on `RefreshAssetInventory`** — data source not connected. Redo Step 1.
- **Banner never appears** — likely visibility formula typo. Use the App Checker.
- **Wrong classification** — the actual model string in inventory may not match the
  allowlist. Check the live data via `RefreshAssetInventory` filter view in SharePoint.
