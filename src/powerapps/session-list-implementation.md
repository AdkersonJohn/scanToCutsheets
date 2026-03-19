# Session List & Excel Submission - Implementation Guide

Step-by-step instructions to add batch scanning with Excel submission to the Asset Tag Scanner.

---

## Overview

This update adds:
1. **Form Popup** - After GREEN scan, collect Serial #, Department, Location, Model
2. **Session Collection** - Store multiple scans in memory
3. **Review Screen** - View, edit, and delete items before submission
4. **Excel Submission** - Write all items to SharePoint Excel file

---

## Step 1: Update App.OnStart

1. Select **App** in the Tree View
2. Replace the **OnStart** formula with:

```powerfx
// Initialize user
Set(varCurrentUser, User());

// Scan state variables
Set(varScannedValue, Blank());
Set(varMatchFound, Blank());
Set(varMatchRecord, Blank());
Set(varIsSearching, false);
Set(varShowResult, false);

// NEW: Session collection (stores items for batch submission)
ClearCollect(colSessionList, Blank());
Clear(colSessionList);

// NEW: Form popup state
Set(varShowForm, false);
Set(varCurrentAssetTag, Blank());

// NEW: Edit mode state
Set(varIsEditing, false);
Set(varEditIndex, -1);

// NEW: Submission state
Set(varIsSubmitting, false);
Set(varSubmitSuccess, false);
Set(varSubmitError, Blank())
```

3. Click **...** menu on App → **Run OnStart**

---

## Step 2: Update OnScan Formula

1. Select **brcScanner** control
2. Replace the **OnScan** formula with:

```powerfx
// Capture scanned value
Set(varScannedValue, Trim(First(brcScanner.Barcodes).Value));
Set(varIsSearching, true);
Set(varShowResult, false);
Set(varSubmitSuccess, false);

// Check both SharePoint lists for existing cut sheet
Set(
    varMatchRecord,
    Coalesce(
        LookUp('FY26 Cut Sheets', 'Legacy Asset Tag' = Trim(First(brcScanner.Barcodes).Value)),
        LookUp('FY26 Cut Sheets Part 2', 'Legacy Asset Tag' = Trim(First(brcScanner.Barcodes).Value))
    )
);

Set(varMatchFound, !IsBlank(varMatchRecord));
Set(varIsSearching, false);
Set(varShowResult, true);

// AUTO-TRIGGER: If GREEN result (needs cut sheet), show form popup
If(
    varShowResult && !varMatchFound,
    Set(varShowForm, true);
    Set(varCurrentAssetTag, varScannedValue);
    Set(varIsEditing, false)
)
```

---

## Step 3: Add Data Connection

Before adding the form, connect to the Excel file:

1. In left panel, click **Data** (cylinder icon)
2. Click **+ Add data**
3. Search for **Office 365 Groups** or **Excel Online (Business)**
4. Connect to site: `encoretch.sharepoint.com/sites/CCHMCRefreshSupport`
5. Navigate to the Excel file: `scanToCutsheetsViableAssetTags.xlsx`
6. Select **Table1** (the table you created with headers)

---

## Step 4: Add Form Popup Controls to Screen1

### 4.1 Form Overlay Background

| Control | Type | Properties |
|---------|------|------------|
| `rectFormOverlay` | Rectangle | |

```yaml
rectFormOverlay:
  Control: Rectangle
  Properties:
    Fill: =RGBA(0, 0, 0, 0.7)
    Height: =Parent.Height
    Width: =Parent.Width
    Visible: =varShowForm
    X: =0
    Y: =0
```

### 4.2 Form Container

| Control | Type | Properties |
|---------|------|------------|
| `rectFormContainer` | Rectangle | |

```yaml
rectFormContainer:
  Control: Rectangle
  Properties:
    Fill: =Color.White
    Height: =500
    Width: =Parent.Width - 40
    Visible: =varShowForm
    X: =20
    Y: =(Parent.Height - 500) / 2
    BorderRadius: =10
```

### 4.3 Form Title

```yaml
lblFormTitle:
  Control: Label
  Properties:
    Text: =If(varIsEditing, "Edit Item", "Add to Session")
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Size: =20
    Color: =RGBA(0, 137, 209, 1)
    Align: =Align.Center
    Width: =Parent.Width - 80
    Height: =40
    X: =40
    Y: =rectFormContainer.Y + 20
    Visible: =varShowForm
```

### 4.4 Asset Tag Display (Read-only)

```yaml
lblFormAssetTag:
  Control: Label
  Properties:
    Text: ="Asset Tag: " & varCurrentAssetTag
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Semibold
    Size: =16
    Align: =Align.Center
    Width: =Parent.Width - 80
    X: =40
    Y: =rectFormContainer.Y + 60
    Visible: =varShowForm
```

### 4.5 Serial Number Input

```yaml
lblSerialNumber:
  Control: Label
  Properties:
    Text: ="Serial Number *"
    Font: =Font.'Open Sans'
    Size: =14
    Width: =Parent.Width - 80
    X: =40
    Y: =rectFormContainer.Y + 100
    Visible: =varShowForm

txtSerialNumber:
  Control: TextInput
  Properties:
    HintText: ="Enter serial number"
    Width: =Parent.Width - 80
    Height: =45
    X: =40
    Y: =rectFormContainer.Y + 125
    Visible: =varShowForm
    BorderColor: =If(IsBlank(Self.Text), RGBA(239, 68, 68, 1), RGBA(200, 200, 200, 1))
```

### 4.6 Department Input

```yaml
lblDepartment:
  Control: Label
  Properties:
    Text: ="Department *"
    Font: =Font.'Open Sans'
    Size: =14
    Width: =Parent.Width - 80
    X: =40
    Y: =rectFormContainer.Y + 180
    Visible: =varShowForm

txtDepartment:
  Control: TextInput
  Properties:
    HintText: ="Enter department"
    Width: =Parent.Width - 80
    Height: =45
    X: =40
    Y: =rectFormContainer.Y + 205
    Visible: =varShowForm
    BorderColor: =If(IsBlank(Self.Text), RGBA(239, 68, 68, 1), RGBA(200, 200, 200, 1))
```

### 4.7 Location Input

```yaml
lblLocation:
  Control: Label
  Properties:
    Text: ="Location *"
    Font: =Font.'Open Sans'
    Size: =14
    Width: =Parent.Width - 80
    X: =40
    Y: =rectFormContainer.Y + 260
    Visible: =varShowForm

txtLocation:
  Control: TextInput
  Properties:
    HintText: ="Enter location"
    Width: =Parent.Width - 80
    Height: =45
    X: =40
    Y: =rectFormContainer.Y + 285
    Visible: =varShowForm
    BorderColor: =If(IsBlank(Self.Text), RGBA(239, 68, 68, 1), RGBA(200, 200, 200, 1))
```

### 4.8 Model Input

```yaml
lblModel:
  Control: Label
  Properties:
    Text: ="Model *"
    Font: =Font.'Open Sans'
    Size: =14
    Width: =Parent.Width - 80
    X: =40
    Y: =rectFormContainer.Y + 340
    Visible: =varShowForm

txtModel:
  Control: TextInput
  Properties:
    HintText: ="Enter model"
    Width: =Parent.Width - 80
    Height: =45
    X: =40
    Y: =rectFormContainer.Y + 365
    Visible: =varShowForm
    BorderColor: =If(IsBlank(Self.Text), RGBA(239, 68, 68, 1), RGBA(200, 200, 200, 1))
```

### 4.9 Save Button

```yaml
btnSaveItem:
  Control: Button
  Properties:
    Text: =If(varIsEditing, "Update", "Add to List")
    Fill: =RGBA(16, 185, 129, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Width: =140
    Height: =45
    X: =40
    Y: =rectFormContainer.Y + 430
    Visible: =varShowForm
    OnSelect: |
      =If(
          // Validate all fields
          IsBlank(txtSerialNumber.Text) ||
          IsBlank(txtDepartment.Text) ||
          IsBlank(txtLocation.Text) ||
          IsBlank(txtModel.Text),

          Notify("All fields are required", NotificationType.Error),

          // Check if editing existing or adding new
          If(
              varIsEditing,
              // UPDATE existing item
              UpdateIf(
                  colSessionList,
                  ID = varEditIndex,
                  {
                      SerialNumber: txtSerialNumber.Text,
                      Department: txtDepartment.Text,
                      Location: txtLocation.Text,
                      Model: txtModel.Text
                  }
              ),
              // ADD new item
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
                      Operator: User().FullName
                  }
              )
          );

          // Clear form and close
          Reset(txtSerialNumber);
          Reset(txtDepartment);
          Reset(txtLocation);
          Reset(txtModel);
          Set(varShowForm, false);
          Set(varIsEditing, false)
      )
```

### 4.10 Cancel Button

```yaml
btnCancelForm:
  Control: Button
  Properties:
    Text: ="Cancel"
    Fill: =RGBA(107, 114, 128, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    Width: =100
    Height: =45
    X: =Parent.Width - 140
    Y: =rectFormContainer.Y + 430
    Visible: =varShowForm
    OnSelect: |
      =Reset(txtSerialNumber);
       Reset(txtDepartment);
       Reset(txtLocation);
       Reset(txtModel);
       Set(varShowForm, false);
       Set(varIsEditing, false)
```

---

## Step 5: Add Session Counter & Review Button to Screen1

### 5.1 Session Counter Label

```yaml
lblSessionCount:
  Control: Label
  Properties:
    Text: =CountRows(colSessionList) & " item(s) in session"
    Font: =Font.'Open Sans'
    Size: =14
    Color: =RGBA(107, 114, 128, 1)
    Align: =Align.Center
    Width: =Parent.Width
    Height: =30
    Y: =680
    Visible: =!varShowForm && CountRows(colSessionList) > 0
```

### 5.2 Review List Button

```yaml
btnReviewList:
  Control: Button
  Properties:
    Text: ="Review List (" & CountRows(colSessionList) & ")"
    Fill: =RGBA(59, 130, 246, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Width: =200
    Height: =50
    X: =(Parent.Width - 200) / 2
    Y: =780
    Visible: =varShowResult && CountRows(colSessionList) > 0 && !varShowForm
    OnSelect: =Navigate(Screen2, ScreenTransition.Fade)
```

---

## Step 6: Create Review Screen (Screen2)

### 6.1 Create New Screen

1. In Tree View, click **+** (New screen)
2. Select **Blank** layout
3. Rename to **Screen2**

### 6.2 Header

```yaml
rectHeader2:
  Control: Rectangle
  Properties:
    Fill: =RGBA(0, 137, 209, 1)
    Height: =80
    Width: =Parent.Width

lblTitle2:
  Control: Label
  Properties:
    Text: ="Review Session"
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Size: =24
    Color: =Color.White
    Align: =Align.Center
    Width: =Parent.Width
    Y: =20
```

### 6.3 Back Button

```yaml
btnBack:
  Control: Button
  Properties:
    Text: ="< Back"
    Fill: =Transparent
    Color: =Color.White
    Font: =Font.'Open Sans'
    Width: =80
    Height: =40
    X: =10
    Y: =20
    OnSelect: =Navigate(Screen1, ScreenTransition.Fade)
```

### 6.4 Item Count Label

```yaml
lblItemCount:
  Control: Label
  Properties:
    Text: =CountRows(colSessionList) & " item(s) ready to submit"
    Font: =Font.'Open Sans'
    Size: =16
    Align: =Align.Center
    Width: =Parent.Width
    Y: =100
```

### 6.5 Session List Gallery

```yaml
galSessionList:
  Control: Gallery (Blank vertical)
  Properties:
    Items: =colSessionList
    Width: =Parent.Width - 20
    Height: =Parent.Height - 280
    X: =10
    Y: =140
    TemplateSize: =100
    TemplatePadding: =5
```

**Inside the gallery template, add:**

```yaml
# Item background
rectItemBg:
  Control: Rectangle
  Properties:
    Fill: =RGBA(249, 250, 251, 1)
    Height: =Parent.TemplateHeight - 10
    Width: =Parent.TemplateWidth - 10
    X: =5
    Y: =5
    BorderRadius: =8

# Asset Tag (bold)
lblGalAssetTag:
  Control: Label
  Properties:
    Text: =ThisItem.AssetTag
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Size: =16
    X: =15
    Y: =10
    Width: =Parent.TemplateWidth - 130

# Model info
lblGalModel:
  Control: Label
  Properties:
    Text: =ThisItem.Model
    Font: =Font.'Open Sans'
    Size: =14
    Color: =RGBA(107, 114, 128, 1)
    X: =15
    Y: =35
    Width: =Parent.TemplateWidth - 130

# Department & Location
lblGalDetails:
  Control: Label
  Properties:
    Text: =ThisItem.Department & " | " & ThisItem.Location
    Font: =Font.'Open Sans'
    Size: =12
    Color: =RGBA(156, 163, 175, 1)
    X: =15
    Y: =60
    Width: =Parent.TemplateWidth - 130

# Edit Button
btnGalEdit:
  Control: Button
  Properties:
    Text: ="Edit"
    Fill: =RGBA(59, 130, 246, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    Width: =50
    Height: =35
    X: =Parent.TemplateWidth - 120
    Y: =30
    OnSelect: |
      =Set(varCurrentAssetTag, ThisItem.AssetTag);
       Set(varEditIndex, ThisItem.ID);
       Set(varIsEditing, true);

       // Pre-fill form fields
       SetFocus(txtSerialNumber);

       Navigate(Screen1, ScreenTransition.Fade);
       Set(varShowForm, true)

# Remove Button
btnGalRemove:
  Control: Button
  Properties:
    Text: ="X"
    Fill: =RGBA(239, 68, 68, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Width: =40
    Height: =35
    X: =Parent.TemplateWidth - 60
    Y: =30
    OnSelect: =Remove(colSessionList, ThisItem)
```

### 6.6 Submit All Button

```yaml
btnSubmitAll:
  Control: Button
  Properties:
    Text: =If(varIsSubmitting, "Submitting...", "Submit All to Excel")
    Fill: =RGBA(16, 185, 129, 1)
    Color: =Color.White
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Width: =250
    Height: =55
    X: =(Parent.Width - 250) / 2
    Y: =Parent.Height - 120
    DisplayMode: =If(varIsSubmitting || CountRows(colSessionList) = 0, DisplayMode.Disabled, DisplayMode.Edit)
    OnSelect: |
      =Set(varIsSubmitting, true);
       Set(varSubmitError, Blank());

       // Submit each item to Excel
       ForAll(
           colSessionList As item,
           'scanToCutsheetsViableAssetTags'.AddRow(
               {
                   'Date Scanned': Text(item.DateScanned, "yyyy-mm-dd hh:mm:ss"),
                   'Asset Tag': item.AssetTag,
                   'Serial Number': item.SerialNumber,
                   Department: item.Department,
                   Location: item.Location,
                   Operator: item.Operator,
                   Model: item.Model
               }
           )
       );

       // Clear collection and show success
       Clear(colSessionList);
       Set(varIsSubmitting, false);
       Set(varSubmitSuccess, true);

       // Navigate back to scan screen
       Navigate(Screen1, ScreenTransition.Fade)
```

### 6.7 Empty State (when no items)

```yaml
lblEmptyState:
  Control: Label
  Properties:
    Text: ="No items in session.\nGo back and scan some assets!"
    Font: =Font.'Open Sans'
    Size: =16
    Color: =RGBA(156, 163, 175, 1)
    Align: =Align.Center
    Width: =Parent.Width - 40
    Height: =100
    X: =20
    Y: =300
    Visible: =CountRows(colSessionList) = 0
```

---

## Step 7: Add Success Message to Screen1

After submission completes, show a success message:

```yaml
rectSuccessOverlay:
  Control: Rectangle
  Properties:
    Fill: =RGBA(16, 185, 129, 0.95)
    Height: =Parent.Height
    Width: =Parent.Width
    Visible: =varSubmitSuccess

iconSuccessSubmit:
  Control: Icon
  Properties:
    Icon: =Icon.CheckBadge
    Color: =Color.White
    Height: =80
    Width: =80
    X: =(Parent.Width - 80) / 2
    Y: =280
    Visible: =varSubmitSuccess

lblSuccessSubmit:
  Control: Label
  Properties:
    Text: ="Successfully Submitted!"
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Size: =24
    Color: =Color.White
    Align: =Align.Center
    Width: =Parent.Width
    Y: =380
    Visible: =varSubmitSuccess

btnReturnToScan:
  Control: Button
  Properties:
    Text: ="Return to Scanning"
    Fill: =Color.White
    Color: =RGBA(16, 185, 129, 1)
    Font: =Font.'Open Sans'
    FontWeight: =FontWeight.Bold
    Width: =200
    Height: =50
    X: =(Parent.Width - 200) / 2
    Y: =460
    Visible: =varSubmitSuccess
    OnSelect: |
      =Set(varSubmitSuccess, false);
       Set(varShowResult, false);
       Set(varScannedValue, Blank())
```

---

## Step 8: Handle Edit Mode Pre-fill

When editing an item, the form should be pre-filled. Add this to **Screen1.OnVisible**:

```powerfx
If(
    varIsEditing,
    // Find the item being edited and pre-fill form
    With(
        LookUp(colSessionList, ID = varEditIndex),
        // Pre-fill would need JavaScript or additional logic
        // For now, user manually fills in - see Note below
    )
)
```

**Note:** Power Apps doesn't directly support setting TextInput.Text programmatically. Options:
1. Use Default property: `txtSerialNumber.Default = If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).SerialNumber, "")`
2. Or instruct users that edit opens a blank form where they re-enter details

**Recommended approach - Update TextInput Default properties:**

```yaml
txtSerialNumber:
  Properties:
    Default: =If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).SerialNumber, "")

txtDepartment:
  Properties:
    Default: =If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Department, "")

txtLocation:
  Properties:
    Default: =If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Location, "")

txtModel:
  Properties:
    Default: =If(varIsEditing, LookUp(colSessionList, ID = varEditIndex).Model, "")
```

---

## Excel File Setup (User Must Do First)

Before testing, the user must set up the Excel file:

1. Open `scanToCutsheetsViableAssetTags.xlsx` in SharePoint
2. Add headers in Row 1:
   - A1: `Date Scanned`
   - B1: `Asset Tag`
   - C1: `Serial Number`
   - D1: `Department`
   - E1: `Location`
   - F1: `Operator`
   - G1: `Model`
3. Select cells A1:G1
4. Click **Insert** → **Table**
5. Check "My table has headers"
6. Click **OK**
7. Note the table name (usually "Table1") - may need to rename

---

## Testing Checklist

- [ ] App.OnStart runs without errors
- [ ] Scanning GREEN asset shows form popup
- [ ] Form validates all fields are required
- [ ] Save adds item to collection
- [ ] Session counter shows correct count
- [ ] Review List button appears after adding items
- [ ] Screen2 displays all items in gallery
- [ ] Edit button opens form with pre-filled data
- [ ] Remove button deletes item from list
- [ ] Submit All writes to Excel
- [ ] Excel shows correct data in all columns
- [ ] Success screen appears after submission
- [ ] Return to Scanning clears everything
- [ ] RED scans do NOT trigger form popup

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Form popup doesn't appear | Check `varShowForm` is set in OnScan |
| Items not added to collection | Check `Collect()` formula syntax |
| Excel submission fails | Verify data connection and table name |
| Edit doesn't pre-fill | Check Default properties on TextInputs |
| Gallery empty | Verify `Items: =colSessionList` |

---

## Complete Control List for Screen1

| Control | Type | Purpose |
|---------|------|---------|
| Rectangle1 | Rectangle | Header background |
| lblTitle | Label | App title |
| brcScanner | BarcodeReader | Barcode scanning |
| circleSuccess | Circle | GREEN result indicator |
| iconSuccess | Icon | Checkmark for GREEN |
| lblSuccessTitle | Label | "CUT SHEET NEEDED" |
| lblSuccessAsset | Label | Shows scanned value |
| circleFailure | Circle | RED result indicator |
| iconFailure | Icon | X for RED |
| lblFailureTitle | Label | "ALREADY HAS CUT SHEET" |
| lblFailureAsset | Label | Shows scanned value |
| lblSearching | Label | "Searching..." |
| btnScanAgain | Button | Reset for next scan |
| rectOfflineOverlay | Rectangle | WiFi warning overlay |
| iconWifiWarning | Icon | Warning icon |
| lblWifiWarning | Label | WiFi message |
| lblInstructions | Label | Scan instructions |
| **NEW** rectFormOverlay | Rectangle | Form modal background |
| **NEW** rectFormContainer | Rectangle | Form container |
| **NEW** lblFormTitle | Label | Form title |
| **NEW** lblFormAssetTag | Label | Shows asset tag |
| **NEW** lblSerialNumber | Label | Field label |
| **NEW** txtSerialNumber | TextInput | Serial number entry |
| **NEW** lblDepartment | Label | Field label |
| **NEW** txtDepartment | TextInput | Department entry |
| **NEW** lblLocation | Label | Field label |
| **NEW** txtLocation | TextInput | Location entry |
| **NEW** lblModel | Label | Field label |
| **NEW** txtModel | TextInput | Model entry |
| **NEW** btnSaveItem | Button | Save to collection |
| **NEW** btnCancelForm | Button | Cancel form |
| **NEW** lblSessionCount | Label | Session item count |
| **NEW** btnReviewList | Button | Navigate to review |
| **NEW** rectSuccessOverlay | Rectangle | Success message bg |
| **NEW** iconSuccessSubmit | Icon | Success checkmark |
| **NEW** lblSuccessSubmit | Label | Success message |
| **NEW** btnReturnToScan | Button | Return after submit |

---

## Complete Control List for Screen2

| Control | Type | Purpose |
|---------|------|---------|
| rectHeader2 | Rectangle | Header background |
| lblTitle2 | Label | "Review Session" |
| btnBack | Button | Navigate back |
| lblItemCount | Label | Item count |
| galSessionList | Gallery | Display all items |
| ├─ rectItemBg | Rectangle | Item background |
| ├─ lblGalAssetTag | Label | Asset tag |
| ├─ lblGalModel | Label | Model |
| ├─ lblGalDetails | Label | Dept & Location |
| ├─ btnGalEdit | Button | Edit item |
| └─ btnGalRemove | Button | Remove item |
| btnSubmitAll | Button | Submit to Excel |
| lblEmptyState | Label | No items message |
