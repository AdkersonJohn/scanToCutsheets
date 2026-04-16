# Power Fx Formulas - Quick Reference

Copy-paste ready formulas for the Session List & Excel Submission feature.

---

## App.OnStart

```powerfx
// Initialize user
Set(varCurrentUser, User());

// Scan state variables
Set(varScannedValue, Blank());
Set(varMatchFound, Blank());
Set(varMatchRecord, Blank());
Set(varIsSearching, false);
Set(varShowResult, false);

// Session collection (stores items for batch submission)
ClearCollect(colSessionList, Blank());
Clear(colSessionList);

// Form popup state
Set(varShowForm, false);
Set(varCurrentAssetTag, Blank());

// Edit mode state
Set(varIsEditing, false);
Set(varEditIndex, -1);

// Submission state
Set(varIsSubmitting, false);
Set(varSubmitSuccess, false);
Set(varSubmitError, Blank());

// NEW: Nonstandard device detection variables
Set(varDeviceRecord, Blank());
Set(varDeviceFound, false);
Set(varNonstandardStatus, "");

// NEW: Load standard models reference (~80 rows)
ClearCollect(colStandardModels, StandardModels)
```

---

## brcScanner.OnScan

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

---

## btnSaveItem.OnSelect (Save Form)

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

---

## btnCancelForm.OnSelect

```powerfx
Reset(txtSerialNumber);
Reset(txtDepartment);
Reset(txtLocation);
Reset(txtModel);
Set(varShowForm, false);
Set(varIsEditing, false)
```

---

## btnReviewList.OnSelect

```powerfx
Navigate(Screen2, ScreenTransition.Fade)
```

---

## btnBack.OnSelect (Screen2)

```powerfx
Navigate(Screen1, ScreenTransition.Fade)
```

---

## btnGalEdit.OnSelect (Gallery Edit Button)

```powerfx
Set(varCurrentAssetTag, ThisItem.AssetTag);
Set(varEditIndex, ThisItem.ID);
Set(varIsEditing, true);
Navigate(Screen1, ScreenTransition.Fade);
Set(varShowForm, true)
```

---

## btnGalRemove.OnSelect (Gallery Remove Button)

```powerfx
Remove(colSessionList, ThisItem)
```

---

## btnSubmitAll.OnSelect

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

---

## btnReturnToScan.OnSelect

```powerfx
Set(varSubmitSuccess, false);
Set(varShowResult, false);
Set(varScannedValue, Blank())
```

---

## btnScanAgain.OnSelect

```powerfx
Set(varShowResult, false);
Set(varScannedValue, Blank())
```

---

## TextInput Default Properties (for Edit Pre-fill)

**txtSerialNumber.Default:**
```powerfx
If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).SerialNumber, "")
```

**txtDepartment.Default:**
```powerfx
If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Department, "")
```

**txtLocation.Default:**
```powerfx
If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Location, "")
```

**txtModel.Default:**
```powerfx
If(
    varIsEditing,
    LookUp(colSessionList, ID = varEditIndex).Model,
    If(varDeviceFound, varDeviceRecord.Model, "")
)
```

---

## Visibility Formulas

| Control | Visible Formula |
|---------|-----------------|
| Form popup controls | `varShowForm` |
| Success result (GREEN) | `varShowResult && !varMatchFound && !varShowForm && !varSubmitSuccess` |
| Failure result (RED) | `varShowResult && varMatchFound && !varShowForm && !varSubmitSuccess` |
| Session counter | `!varShowForm && CountRows(colSessionList) > 0 && !varSubmitSuccess` |
| Review List button | `varShowResult && CountRows(colSessionList) > 0 && !varShowForm && !varSubmitSuccess` |
| Scan Again button | `varShowResult && !varShowForm && !varSubmitSuccess` |
| Success overlay | `varSubmitSuccess` |
| Empty state (Screen2) | `CountRows(colSessionList) = 0` |
| Instructions | `!varShowResult && !varIsSearching && Connection.Connected && !varSubmitSuccess` |
| WiFi overlay | `!Connection.Connected` |
| Warning Banner (NS) | `varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> "" && !varShowForm && !varSubmitSuccess` |

---

## Collection Structure: colSessionList

| Column | Type | Source |
|--------|------|--------|
| ID | Number | Auto-generated |
| AssetTag | Text | From barcode scan |
| SerialNumber | Text | Form input |
| Department | Text | Form input |
| Location | Text | Form input |
| Model | Text | Form input |
| DateScanned | DateTime | Now() |
| Operator | Text | User().FullName |
| Make | Text | RefreshAssetInventory lookup (blank if unknown) |
| Nonstandard | Text | "Yes" / "No" / "Unknown" |
| DeviceFound | Boolean | true if found in RefreshAssetInventory |

---

## Excel Data Source Name

When you connect to the Excel file, Power Apps will create a data source. The default name is typically:

```
scanToCutsheetsViableAssetTags
```

If the name differs in your environment, update the `btnSubmitAll.OnSelect` formula to use the correct name.

---

## Troubleshooting Formulas

**Check if collection has items:**
```powerfx
CountRows(colSessionList)
```

**View collection contents (debug label):**
```powerfx
JSON(colSessionList, JSONFormat.IndentFour)
```

**Test Excel connection:**
```powerfx
CountRows(scanToCutsheetsViableAssetTags)
```
