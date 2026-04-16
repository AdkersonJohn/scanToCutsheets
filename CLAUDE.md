# Project: Asset Tag Scanner (Power App)

## Overview

A Power Apps canvas app that scans asset tag barcodes and checks SharePoint lists to determine if a cut sheet already exists.

---

## Asset Tag Format & Refresh Cycle

### Asset Tag Format
Asset tags follow the pattern: `EWxx-xxxxx`
- `EW` = Fixed prefix
- `xx` = Two-digit year of deployment (e.g., `22` = 2022)
- `xxxxx` = Sequential identifier

**Examples:** `EW22-01322`, `EW21-05678`, `EW19-12345`

### 4-Year Refresh Cycle
Devices are eligible for refresh 4 years after deployment. In **2026**, only devices from **2022 and older** are eligible (EW22-, EW21-, EW20-, etc.).

The year threshold is extracted from characters 3-4 of the asset tag: `Mid(AssetTag, 3, 2)`

---

## Scan Result Logic

| Result | Color | Condition | Meaning |
|--------|-------|-----------|---------|
| **NEEDS CUT SHEET** | GREEN | Year ≤ 22 AND not found in SharePoint | Device is eligible for refresh and needs a cut sheet |
| **NEEDS CUT SHEET (NS)** | GREEN + orange banner | GREEN AND model frequency < 50 in fleet | Eligible but nonstandard device — verify with team lead |
| **NEEDS CUT SHEET (?)** | GREEN + orange banner | GREEN AND not in RefreshAssetInventory | Eligible but device not in inventory — verify asset tag |
| **HAS CUT SHEET** | RED | Found in SharePoint | Device already has a cut sheet on file |
| **TOO NEW** | YELLOW | Year > 22 | Device is too new for the 4-year refresh cycle |

### Decision Flow
```
Scan Asset Tag (e.g., EW22-01322)
        │
        ▼
Extract year from tag (22)
        │
        ▼
Is year > 22? ──YES──► YELLOW (Too New)
        │
        NO
        ▼
Check SharePoint lists
        │
        ▼
Found in SharePoint? ──YES──► RED (Has Cut Sheet)
        │
        NO
        ▼
GREEN (Needs Cut Sheet) → Show "Add to Session" button
```

### Test Asset Tags

| Asset Tag | Year | Expected Result | Reason |
|-----------|------|-----------------|--------|
| `EW22-01322` | 22 | GREEN or RED | Eligible - check SharePoint |
| `EW21-05678` | 21 | GREEN or RED | Eligible - check SharePoint |
| `EW19-12345` | 19 | GREEN or RED | Eligible - check SharePoint |
| `EW23-00001` | 23 | YELLOW | Too new (2023 > 2022) |
| `EW24-00001` | 24 | YELLOW | Too new (2024 > 2022) |
| `EW99-99999` | 99 | YELLOW | Too new (invalid/future year) |

---

## Power Platform Debug MCP Server

### Location
```
/Volumes/bingobango/code/scanToCutsheets/mcp-servers/powerplatform-debug/
```

### Configuration
The MCP server is configured in `.mcp.json` at the project root.

### Available Tools

| Tool | Description | Example Usage |
|------|-------------|---------------|
| `pac_command` | Execute Power Platform CLI commands | "Run pac canvas list" |
| `analyze_app_formulas` | Analyze OnScan and other formulas from extracted app | "Analyze the app formulas" |
| `search_app_source` | Search app source for patterns/variables | "Search for varMatchFound in the app" |
| `get_datasource_info` | Get SharePoint data source and column mappings | "Show me the data sources" |
| `list_app_variables` | List all app variables with their purposes | "List all variables in the app" |
| `validate_lookup_formula` | Check LookUp formulas for potential issues | "Validate the lookup formulas" |
| `simulate_scan_logic` | Trace through scan logic with a test barcode | "Simulate scanning EW22-01322" |
| `parse_monitor_export` | Parse Power Apps Monitor session exports | "Parse this monitor export" |
| `get_app_check_results` | Get static analysis warnings from App Checker | "Show app checker results" |
| `explain_visibility_logic` | Explain UI element visibility conditions | "Explain when the green checkmark shows" |

### Setup Requirements

1. **Power Platform CLI installed:**
   ```bash
   dotnet tool install --global Microsoft.PowerApps.CLI.Tool
   ```

2. **Environment variables (set in shell profile):**
   ```bash
   export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"
   export PATH="$PATH:$HOME/.dotnet/tools"
   ```

3. **Authenticated:**
   ```bash
   pac auth create
   ```

### Refreshing App Source

To download the latest version of the app for analysis:
```bash
pac canvas download --name "Asset Tag Scanner" -d ./app-debug --overwrite
```

---

## Real-Time Mobile Debugging

### Power Apps Monitor (Recommended)

1. Go to https://make.powerapps.com
2. Open "Asset Tag Scanner" app
3. Click **Monitor** in the left navigation
4. Click **Play published app**
5. On iOS device, open the app and scan barcodes
6. Watch Monitor for:
   - Network requests to SharePoint
   - Variable changes (`varMatchFound`, `varScannedValue`, `varMatchRecord`)
   - Error events

### Debug Label

The app has a debug label showing:
```
"Scanned: " & varScannedValue & " | Match: " & varMatchFound
```

---

## Key Formulas

### OnScan (brcScanner) - With Session List Feature
```powerfx
// Capture scanned value
Set(varScannedValue, Trim(First(brcScanner.Barcodes).Value));
Set(varIsSearching, true);
Set(varShowResult, false);
Set(varSubmitSuccess, false);
Set(varShowForm, false);

// Extract year from asset tag (characters 3-4, e.g., "22" from "EW22-01322")
Set(varAssetYear, Value(Mid(varScannedValue, 3, 2)));

// Check if device is too new for 4-year refresh cycle (year > 22 in 2026)
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
Set(varIsSearching, false);
Set(varShowResult, true)
```

**Note:** The form popup is NOT auto-triggered. User must tap "Add to Session" button after seeing GREEN result.

### Visibility Logic
```
circleSuccess (GREEN):  varShowResult && !varMatchFound && !varDeviceTooNew && !varShowForm && !varSubmitSuccess
circleFailure (RED):    varShowResult && varMatchFound && !varShowForm && !varSubmitSuccess
circleTooNew (YELLOW):  varShowResult && varDeviceTooNew && !varShowForm && !varSubmitSuccess
Form Popup:             varShowForm
Success Overlay:        varSubmitSuccess
Add to Session button:  varShowResult && !varMatchFound && !varDeviceTooNew && !varShowForm && !varSubmitSuccess
Warning Banner (NS):    varShowResult && !varMatchFound && !varDeviceTooNew && varNonstandardStatus <> "No" && varNonstandardStatus <> "" && !varShowForm && !varSubmitSuccess
```

---

## Session List Feature (Phase 2)

### App Flow
1. Scan barcode → Check SharePoint
2. If GREEN (needs cut sheet) → Show form popup
3. User enters: Serial #, Department, Location, Model
4. Save → Item added to `colSessionList` collection
5. Repeat scanning
6. Review List → Screen2 shows all items
7. Submit All → Writes to Excel file
8. Success → Clear list, return to scanning

### Variables
| Variable | Type | Purpose |
|----------|------|---------|
| `colSessionList` | Collection | Stores scanned items for batch submission |
| `varShowForm` | Boolean | Controls form popup visibility |
| `varCurrentAssetTag` | Text | Asset tag being added/edited |
| `varIsEditing` | Boolean | True when editing existing item |
| `varEditIndex` | Number | ID of item being edited |
| `varIsSubmitting` | Boolean | True during Excel submission |
| `varSubmitSuccess` | Boolean | Shows success overlay after submission |
| `varDeviceTooNew` | Boolean | True when asset tag year > 22 (device too new for refresh) |
| `varAssetYear` | Number | Extracted year from asset tag (e.g., 22 from EW22-01322) |
| `varDeviceRecord` | Record | Result from RefreshAssetInventory lookup |
| `varDeviceFound` | Boolean | Whether asset tag exists in inventory |
| `varNonstandardStatus` | Text | "Yes" / "No" / "Unknown" — nonstandard classification |
| `colStandardModels` | Collection | Loaded at OnStart from StandardModels SharePoint list (~80 rows) |

### Excel Output File
- **File:** `scanToCutsheetsViableAssetTags.xlsx`
- **Location:** SharePoint Documents folder
- **Columns:** Date Scanned, Asset Tag, Serial Number, Department, Location, Operator, Model

### Implementation Files
| File | Purpose |
|------|---------|
| `src/powerapps/session-list-implementation.md` | Full implementation guide |
| `src/powerapps/formulas-quick-reference.md` | Copy-paste ready formulas |
| `app-debug/Src\Screen1.pa.yaml` | Updated Screen1 with form popup |
| `app-debug/Src\Screen2.pa.yaml` | New review screen |
| `app-debug/Src\App.pa.yaml` | Updated OnStart with new variables |

---

## SharePoint Data Sources

| List | Site | Lookup Column |
|------|------|---------------|
| FY26 Cut Sheets | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | Legacy Asset Tag |
| FY26 Cut Sheets Part 2 | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | Legacy Asset Tag |
| RefreshAssetInventory | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | DeviceName (indexed) |
| StandardModels | https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport | Make, Model |

---

## Debugging Rules

**IMPORTANT: Always use Power Platform CLI and MCP tools for debugging Power Apps issues.**

When debugging any Power Apps issue:
1. **First**, download the latest app source:
   ```bash
   export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"
   export PATH="$PATH:$HOME/.dotnet/tools"
   pac canvas download --name "Asset Tag Scanner" -d ./app-debug --overwrite
   ```

2. **Then**, use MCP tools to analyze:
   - `analyze_app_formulas` - Check OnScan and behavior formulas
   - `search_app_source` - Find specific patterns or variables
   - `get_app_check_results` - Get static analysis warnings
   - `explain_visibility_logic` - Understand UI state conditions
   - `list_app_variables` - See all variables and their purposes

3. **Read source files directly** from `app-debug/Src/` to inspect:
   - Control positions (X, Y, Width, Height)
   - Visibility formulas
   - OnSelect/OnScan formulas

Never guess at Power Apps issues - always download and analyze the actual source.

---

## Common Issues & Debugging

### Issue: Always showing GREEN (no match found)

**Possible causes:**
1. Column name mismatch - verify `'Legacy Asset Tag'` is exact
2. Delegation limit - lists with >500 items may not return all records
3. Data type mismatch - barcode text vs number
4. Leading/trailing whitespace in data

**Debug steps:**
1. Check Power Apps Monitor for SharePoint query/response
2. Verify debug label shows correct scanned value
3. Manually search SharePoint list for the barcode
4. Check if the barcode exists in FY26 Cut Sheets vs Part 2

### Issue: App not refreshing on mobile

1. Force close Power Apps app
2. Pull down to refresh app list
3. Reopen the app

---

## Project Files

| Path | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | Step-by-step guide for IT admin (Jake) to deploy |
| `app-debug/` | Extracted Power App source (from pac canvas download) |
| `app-debug/Src\Screen1.pa.yaml` | Main scan screen (with form popup) |
| `app-debug/Src\Screen2.pa.yaml` | Review screen for session list |
| `app-debug/Src\App.pa.yaml` | App-level OnStart formulas |
| `mcp-servers/powerplatform-debug/` | MCP server for debugging |
| `src/powerapps/build-guide.md` | Original build guide |
| `src/powerapps/session-list-implementation.md` | Session list feature implementation |
| `src/powerapps/formulas-quick-reference.md` | Quick-copy formulas reference |
| `src/sharepoint/` | SharePoint list schema and PowerShell scripts |
