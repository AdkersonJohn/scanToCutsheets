# Power Apps Deployment Guide: Asset Tag Scanner

**For:** Jake (IT Admin)
**From:** John Adkerson
**Date:** March 2026

---

## Overview

This guide walks through deploying a Power Apps barcode scanner that checks if computer asset tags already have cut sheets in SharePoint. Field technicians scan asset tags and instantly see:

- **Green checkmark** = Asset needs a cut sheet (not found in system)
- **Red X** = Asset already has a cut sheet (skip it)

---

## Prerequisites

- [ ] Admin access to Power Apps (make.powerapps.com)
- [ ] Admin access to SharePoint site: `CCHMCRefreshSupport`
- [ ] Power Apps mobile app installed on test device

---

## Step 1: Verify SharePoint Access

The app needs to read from this existing list:

| Setting | Value |
|---------|-------|
| Site | `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport` |
| List | `FY26 Cut Sheets Part 2` |
| Lookup Column | `Legacy Asset Tag` |

**No changes needed to this list** - we only read from it.

---

## Step 2: Create the Power App

### 2.1 Create New App

1. Go to [make.powerapps.com](https://make.powerapps.com)
2. Ensure you're in the **default environment**
3. Click **+ Create** → **Blank app** → **Blank canvas app**
4. Settings:
   - **Name:** `Asset Tag Scanner`
   - **Format:** Phone
5. Click **Create**

### 2.2 Connect to SharePoint

1. In left panel, click **Data** (cylinder icon)
2. Click **+ Add data**
3. Search for **SharePoint**
4. Enter site URL: `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport`
5. Select list: **FY26 Cut Sheets Part 2**
6. Click **Connect**

---

## Step 3: Configure App.OnStart

1. In Tree View, select **App**
2. Set **OnStart** formula:

```powerfx
// Initialize variables
Set(varCurrentUser, User());
Set(varScannedValue, Blank());
Set(varMatchFound, Blank());
Set(varMatchRecord, Blank());
Set(varIsSearching, false);
Set(varShowResult, false);
```

3. Click **...** menu on App → **Run OnStart**

---

## Step 4: Build the Main Screen

### 4.1 Header

| Control | Property | Value |
|---------|----------|-------|
| Rectangle | Name | `rectHeader` |
| | Fill | `RGBA(0, 137, 209, 1)` |
| | Height | `80` |
| | Width | `Parent.Width` |
| | Y | `0` |
| Label | Name | `lblTitle` |
| | Text | `"Asset Tag Scanner"` |
| | Color | `White` |
| | Size | `24` |
| | FontWeight | `FontWeight.Bold` |
| | Align | `Align.Center` |
| | Y | `20` |
| | Width | `Parent.Width` |

### 4.2 Barcode Scanner

1. **Insert** → **Media** → **Barcode scanner**

| Property | Value |
|----------|-------|
| Name | `brcScanner` |
| X | `(Parent.Width - 300) / 2` |
| Y | `120` |
| Width | `300` |
| Height | `220` |
| BarcodeType | `BarcodeType.Auto` |

2. Set **OnScan**:

```powerfx
// Store scanned value
Set(varScannedValue, brcScanner.Value);
Set(varIsSearching, true);
Set(varShowResult, false);

// Search for match in cut sheets
Set(
    varMatchRecord,
    LookUp(
        'FY26 Cut Sheets Part 2',
        'Legacy Asset Tag' = brcScanner.Value
    )
);

// Determine if match was found
Set(varMatchFound, !IsBlank(varMatchRecord));
Set(varIsSearching, false);
Set(varShowResult, true);
```

### 4.3 Result Display - Success (No Match = Needs Cut Sheet)

| Control | Property | Value |
|---------|----------|-------|
| Circle | Name | `circleSuccess` |
| | Fill | `RGBA(16, 185, 129, 1)` |
| | Visible | `varShowResult && !varMatchFound` |
| | Width | `200` |
| | Height | `200` |
| | X | `(Parent.Width - 200) / 2` |
| | Y | `380` |
| Icon | Name | `iconSuccess` |
| | Icon | `Icon.Check` |
| | Color | `White` |
| | Width | `120` |
| | Height | `120` |
| | X | `(Parent.Width - 120) / 2` |
| | Y | `420` |
| | Visible | `varShowResult && !varMatchFound` |
| Label | Name | `lblSuccessTitle` |
| | Text | `"NEEDS CUT SHEET"` |
| | Color | `RGBA(16, 185, 129, 1)` |
| | Size | `22` |
| | FontWeight | `FontWeight.Bold` |
| | Align | `Align.Center` |
| | Y | `600` |
| | Width | `Parent.Width` |
| | Visible | `varShowResult && !varMatchFound` |
| Label | Name | `lblSuccessAsset` |
| | Text | `varScannedValue` |
| | Size | `18` |
| | Align | `Align.Center` |
| | Y | `640` |
| | Width | `Parent.Width` |
| | Visible | `varShowResult && !varMatchFound` |

### 4.4 Result Display - Failure (Match Found = Already Has Cut Sheet)

| Control | Property | Value |
|---------|----------|-------|
| Circle | Name | `circleFailure` |
| | Fill | `RGBA(239, 68, 68, 1)` |
| | Visible | `varShowResult && varMatchFound` |
| | Width | `200` |
| | Height | `200` |
| | X | `(Parent.Width - 200) / 2` |
| | Y | `380` |
| Icon | Name | `iconFailure` |
| | Icon | `Icon.Cancel` |
| | Color | `White` |
| | Width | `120` |
| | Height | `120` |
| | X | `(Parent.Width - 120) / 2` |
| | Y | `420` |
| | Visible | `varShowResult && varMatchFound` |
| Label | Name | `lblFailureTitle` |
| | Text | `"ALREADY HAS CUT SHEET"` |
| | Color | `RGBA(239, 68, 68, 1)` |
| | Size | `22` |
| | FontWeight | `FontWeight.Bold` |
| | Align | `Align.Center` |
| | Y | `600` |
| | Width | `Parent.Width` |
| | Visible | `varShowResult && varMatchFound` |
| Label | Name | `lblFailureAsset` |
| | Text | `varScannedValue` |
| | Size | `18` |
| | Align | `Align.Center` |
| | Y | `640` |
| | Width | `Parent.Width` |
| | Visible | `varShowResult && varMatchFound` |
| Label | Name | `lblExistingEWR` |
| | Text | `"EWR: " & varMatchRecord.'EWR Number'` |
| | Size | `14` |
| | Color | `RGBA(107, 114, 128, 1)` |
| | Align | `Align.Center` |
| | Y | `670` |
| | Width | `Parent.Width` |
| | Visible | `varShowResult && varMatchFound` |

### 4.5 Loading Indicator

| Control | Property | Value |
|---------|----------|-------|
| Label | Name | `lblSearching` |
| | Text | `"Searching..."` |
| | Visible | `varIsSearching` |
| | Size | `20` |
| | Align | `Align.Center` |
| | Y | `450` |
| | Width | `Parent.Width` |

### 4.6 Scan Again Button

| Control | Property | Value |
|---------|----------|-------|
| Button | Name | `btnScanAgain` |
| | Text | `"Scan Another"` |
| | Fill | `RGBA(0, 137, 209, 1)` |
| | Color | `White` |
| | Visible | `varShowResult` |
| | Y | `720` |
| | Width | `200` |
| | Height | `50` |
| | X | `(Parent.Width - 200) / 2` |
| | BorderRadius | `25` |
| | OnSelect | `Set(varShowResult, false); Set(varScannedValue, Blank())` |

### 4.7 WiFi Warning Overlay

| Control | Property | Value |
|---------|----------|-------|
| Rectangle | Name | `rectOfflineOverlay` |
| | Fill | `RGBA(0, 0, 0, 0.85)` |
| | Visible | `!Connection.Connected` |
| | Width | `Parent.Width` |
| | Height | `Parent.Height` |
| | X | `0` |
| | Y | `0` |
| Icon | Name | `iconWifiWarning` |
| | Icon | `Icon.Warning` |
| | Color | `RGBA(251, 191, 36, 1)` |
| | Width | `80` |
| | Height | `80` |
| | X | `(Parent.Width - 80) / 2` |
| | Y | `280` |
| | Visible | `!Connection.Connected` |
| Label | Name | `lblWifiWarning` |
| | Text | `"Warning: Connect to WiFi Before You Continue"` |
| | Color | `White` |
| | Size | `20` |
| | FontWeight | `FontWeight.Bold` |
| | Align | `Align.Center` |
| | Y | `380` |
| | Width | `Parent.Width - 40` |
| | X | `20` |
| | Visible | `!Connection.Connected` |
| Label | Name | `lblWifiSubtext` |
| | Text | `"This app requires an internet connection to check for existing cut sheets."` |
| | Color | `RGBA(156, 163, 175, 1)` |
| | Size | `14` |
| | Align | `Align.Center` |
| | Y | `430` |
| | Width | `Parent.Width - 60` |
| | X | `30` |
| | Visible | `!Connection.Connected` |

**Note:** The overlay covers the entire screen and prevents interaction until WiFi is restored. `Connection.Connected` automatically updates when connectivity changes.

### 4.8 Instructions (Initial State)

| Control | Property | Value |
|---------|----------|-------|
| Label | Name | `lblInstructions` |
| | Text | `"Point camera at asset tag barcode"` |
| | Visible | `!varShowResult && !varIsSearching && Connection.Connected` |
| | Size | `16` |
| | Color | `RGBA(107, 114, 128, 1)` |
| | Align | `Align.Center` |
| | Y | `360` |
| | Width | `Parent.Width` |

---

## Step 5: Test the App

### In Power Apps Studio:
1. Click **Preview** (F5)
2. Use "Manual Entry" for testing (scanner won't work in preview)
3. Test with known asset tags:
   - `EW21-04734` → Should show RED (exists in list)
   - `EW99-99999` → Should show GREEN (doesn't exist)

### On Mobile Device:
1. **Save** the app (Ctrl+S)
2. **Publish** the app
3. Open **Power Apps** mobile app
4. Find "Asset Tag Scanner"
5. Test with real barcodes

---

## Step 6: Publish and Share

1. Click **File** → **Save**
2. Click **Publish**
3. Click **Share**
4. Add: **Everyone in CCHMC Refresh Support**
5. Permission: **User** (can use, not edit)

---

## Step 7: Distribute to Users

Users can access via:
1. **Power Apps mobile app** (iOS/Android)
2. **Teams** → Apps → Power Apps → Asset Tag Scanner
3. **Direct link** (generated after publishing)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Scanner not working | Check camera permissions in device settings |
| "No data" error | Verify SharePoint connection in Data panel |
| Wrong results | Check column name is exactly `Legacy Asset Tag` |
| App not appearing | Ensure user has SharePoint access to CCHMCRefreshSupport |

---

## Technical Details

| Setting | Value |
|---------|-------|
| SharePoint Site | `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport` |
| List Name | `FY26 Cut Sheets Part 2` |
| Lookup Column | `Legacy Asset Tag` |
| Environment | Default |
| App Format | Phone |
| Branding Color | `RGBA(0, 137, 209, 1)` (Encore Blue) |

---

## ⚠️ Known Limitations & Watch Points

Before going live, verify these items to ensure reliable operation:

### 1. Delegation Limit (Critical)

Power Apps has a **2,000 row delegation limit** for SharePoint lookups. If the `FY26 Cut Sheets Part 2` list exceeds 2,000 rows:

- The `LookUp()` function may return false negatives (miss existing records)
- **Solution:** Index the `Legacy Asset Tag` column in SharePoint:
  1. Go to List Settings → Indexed columns
  2. Create new index on `Legacy Asset Tag`
  3. This allows queries up to **12,000 rows**

**Action required:** Check current row count. If approaching 2,000, index the column immediately.

### 2. Single List Search

This app **only searches `FY26 Cut Sheets Part 2`**. It will NOT find matches in:
- FY25 Cut Sheets
- FY24 Cut Sheets
- Any other historical lists

**If you need to search multiple lists:** Contact John to discuss options (union queries, consolidated list, or multiple lookups).

### 3. Column Name Sensitivity

The lookup depends on the **exact column name**: `Legacy Asset Tag`

If the column is renamed, has extra spaces, or uses a different internal name, the app will break silently (always show green checkmarks).

**Verification:** After connecting to SharePoint, check that the column appears exactly as `Legacy Asset Tag` in the Data panel.

### 4. WiFi Required

The app blocks all functionality when offline. Users must have:
- Active WiFi or cellular data connection
- Network access to SharePoint (not blocked by firewall)

The warning overlay appears automatically when connection drops.

### 5. User Permissions

Users need **at minimum Read access** to the SharePoint site `CCHMCRefreshSupport` and the `FY26 Cut Sheets Part 2` list. If a user can't access the list directly in SharePoint, they can't use the app.

### 6. Barcode Format

The scanner uses `BarcodeType.Auto` which handles most formats. Asset tags should scan as plain text (e.g., `EW21-04734`). If barcodes include prefix/suffix characters from the scanner hardware, results may not match.

**Test with real hardware** before deploying to field technicians.

---

## Pre-Deployment Checklist

- [ ] Verified row count in `FY26 Cut Sheets Part 2` (if >2000, index the column)
- [ ] Confirmed `Legacy Asset Tag` column name matches exactly
- [ ] Tested with known asset tags: one that exists, one that doesn't
- [ ] Tested on both iOS and Android devices
- [ ] Tested WiFi disconnect behavior (overlay appears)
- [ ] Shared with test user to verify permissions work
- [ ] Published app and generated distribution link

---

## Contact

Questions? Contact John Adkerson
