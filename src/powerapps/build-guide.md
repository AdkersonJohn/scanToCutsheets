# Power Apps Build Guide: Asset Barcode Scanner

Step-by-step instructions to build the barcode scanner app in Power Apps Studio.

---

## Prerequisites

Before starting:
- [ ] Access to [make.powerapps.com](https://make.powerapps.com)
- [ ] SharePoint list "Computer Asset Scans" created (see `src/sharepoint/create-list.ps1`)
- [ ] Mobile device with Power Apps app installed (for testing)

---

## Step 1: Create the App

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Click **+ Create** in the left nav
3. Select **Blank app** → **Blank canvas app**
4. Enter app name: `Asset Barcode Scanner`
5. Select **Phone** format (optimized for mobile scanning)
6. Click **Create**

---

## Step 2: Connect to SharePoint

1. In the left panel, click **Data** (cylinder icon)
2. Click **+ Add data**
3. Search for **SharePoint**
4. Select your SharePoint site
5. Check **Computer Asset Scans** list
6. Click **Connect**

---

## Step 3: Configure App.OnStart

1. Select **App** in the Tree View
2. In the formula bar, select **OnStart**
3. Paste:

```powerfx
Set(varCurrentUser, User());
Set(varIsOnline, Connection.Connected);
Set(varSessionHistory, Table());
Set(varShowManualEntry, false);
Set(varLastError, Blank());
Set(varIsSubmitting, false);
Set(varScannedValue, Blank())
```

4. Click the **...** menu on App → **Run OnStart**

---

## Step 4: Build the Main Screen

### 4.1 Header Section

| Control | Property | Value |
|---------|----------|-------|
| Label | Name | `lblHeader` |
| | Text | `"Asset Scanner"` |
| | Font | `Font.'Segoe UI'` |
| | FontWeight | `FontWeight.Bold` |
| | Size | `24` |
| | Align | `Align.Center` |
| | Fill | `RGBA(0, 120, 212, 1)` |
| | Color | `White` |
| | Height | `60` |
| | Width | `Parent.Width` |

### 4.2 Barcode Scanner Control

1. Insert → **Media** → **Barcode scanner**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `brcScanner` |
| BarcodeType | `BarcodeType.Auto` |
| X | `(Parent.Width - Self.Width) / 2` |
| Y | `80` |
| Width | `280` |
| Height | `200` |

3. Set **OnScan**:

```powerfx
Set(varScannedValue, brcScanner.Value);
Set(varLastError, Blank());
If(
    Len(brcScanner.Value) > 128,
    Set(varLastError, "Barcode too long. Maximum 128 characters.")
)
```

### 4.3 Manual Entry Toggle

1. Insert → **Button**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `btnManualEntry` |
| Text | `If(varShowManualEntry, "Use Scanner", "Manual Entry")` |
| OnSelect | `Set(varShowManualEntry, !varShowManualEntry)` |
| Y | `300` |
| Width | `200` |
| Height | `40` |

### 4.4 Manual Entry Text Input

1. Insert → **Input** → **Text input**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `txtManualBarcode` |
| Visible | `varShowManualEntry` |
| HintText | `"Enter barcode value..."` |
| MaxLength | `128` |
| OnChange | `Set(varScannedValue, Self.Text)` |
| Y | `350` |
| Width | `Parent.Width - 40` |

### 4.5 Scanned Value Display

1. Insert → **Label**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `lblScannedValue` |
| Text | `If(IsBlank(varScannedValue), "No barcode scanned", varScannedValue)` |
| FontWeight | `FontWeight.Semibold` |
| Size | `18` |
| Align | `Align.Center` |
| Y | `400` |
| Width | `Parent.Width - 40` |
| Height | `40` |

### 4.6 Optional Fields

**Location Input:**

| Property | Value |
|----------|-------|
| Name | `txtLocation` |
| HintText | `"Location (optional)"` |
| MaxLength | `255` |
| Y | `460` |
| Width | `Parent.Width - 40` |

**Notes Input:**

| Property | Value |
|----------|-------|
| Name | `txtNotes` |
| Mode | `TextMode.MultiLine` |
| HintText | `"Notes (optional)"` |
| MaxLength | `1000` |
| Y | `520` |
| Width | `Parent.Width - 40` |
| Height | `80` |

### 4.7 Submit Button

1. Insert → **Button**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `btnSubmit` |
| Text | `If(varIsSubmitting, "Submitting...", "Submit")` |
| Fill | `RGBA(0, 120, 212, 1)` |
| Color | `White` |
| DisplayMode | `If(IsBlank(varScannedValue) Or varIsSubmitting, DisplayMode.Disabled, DisplayMode.Edit)` |
| Y | `620` |
| Width | `200` |
| Height | `50` |

3. Set **OnSelect**:

```powerfx
Set(varIsSubmitting, true);
Set(varLastError, Blank());

If(
    IsBlank(varScannedValue),
    Set(varLastError, "Please scan or enter a barcode first.");
    Set(varIsSubmitting, false),

    IfError(
        Patch(
            'Computer Asset Scans',
            Defaults('Computer Asset Scans'),
            {
                Title: "Scan: " & Left(varScannedValue, 20) & " (" & Text(Now(), "yyyy-mm-dd") & ")",
                BarcodeValue: varScannedValue,
                ScannedBy: varCurrentUser,
                ScannedDate: Now(),
                Location: If(IsBlank(txtLocation.Text), Blank(), txtLocation.Text),
                Notes: If(IsBlank(txtNotes.Text), Blank(), txtNotes.Text)
            }
        );
        Collect(varSessionHistory, {BarcodeValue: varScannedValue, ScannedAt: Now(), Location: txtLocation.Text});
        Reset(txtLocation);
        Reset(txtNotes);
        Reset(txtManualBarcode);
        Set(varScannedValue, Blank());
        Set(varShowManualEntry, false);
        Set(varIsSubmitting, false);
        Notify("Scan saved successfully!", NotificationType.Success),

        Set(varLastError, "Failed to save scan. Please try again.");
        Set(varIsSubmitting, false)
    )
)
```

### 4.8 Error Display

1. Insert → **Label**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `lblError` |
| Text | `varLastError` |
| Visible | `!IsBlank(varLastError)` |
| Color | `RGBA(220, 53, 69, 1)` |
| FontWeight | `FontWeight.Semibold` |
| Y | `680` |
| Width | `Parent.Width - 40` |

### 4.9 Session History Gallery

1. Insert → **Gallery** → **Blank vertical**
2. Configure:

| Property | Value |
|----------|-------|
| Name | `galSessionHistory` |
| Items | `Sort(varSessionHistory, ScannedAt, SortOrder.Descending)` |
| Visible | `CountRows(varSessionHistory) > 0` |
| Y | `720` |
| Width | `Parent.Width - 40` |
| Height | `200` |
| TemplateSize | `60` |

3. Add labels inside gallery template:
   - `ThisItem.BarcodeValue`
   - `Text(ThisItem.ScannedAt, "hh:mm AM/PM")`
   - `ThisItem.Location`

---

## Step 5: Test the App

### In Power Apps Studio:
1. Click **Preview** (play button) or press **F5**
2. Note: Barcode scanner won't work in preview, use manual entry

### On Mobile Device:
1. Save and publish the app
2. Open **Power Apps** mobile app
3. Find "Asset Barcode Scanner"
4. Test full scanning workflow

---

## Step 6: Publish and Share

1. Click **File** → **Save**
2. Click **Publish**
3. Click **Share**
4. Add users/groups who need access
5. Set permission level (User or Co-owner)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Barcode scanner not appearing | Ensure device has camera; check app permissions |
| SharePoint connection fails | Verify list exists and user has access |
| Submit button stays disabled | Check that `varScannedValue` is being set |
| Data not appearing in SharePoint | Check for errors in `lblError`; verify column names match |

---

## Control Checklist

- [ ] `lblHeader` - App title
- [ ] `brcScanner` - Barcode scanner control
- [ ] `btnManualEntry` - Toggle manual entry
- [ ] `txtManualBarcode` - Manual barcode input
- [ ] `lblScannedValue` - Display scanned value
- [ ] `txtLocation` - Optional location field
- [ ] `txtNotes` - Optional notes field
- [ ] `btnSubmit` - Submit to SharePoint
- [ ] `lblError` - Error message display
- [ ] `galSessionHistory` - Session scan history

---

## Next Steps

After basic functionality works:
1. Add styling to match company branding
2. Add offline indicator icon
3. Test on multiple devices (iOS, Android, tablet)
4. Gather user feedback
5. Iterate on UX improvements
