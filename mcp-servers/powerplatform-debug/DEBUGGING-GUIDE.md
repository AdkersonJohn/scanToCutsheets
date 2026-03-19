# Power Platform Debug MCP Server - Debugging Guide

## Overview

This MCP server provides tools for debugging the "Asset Tag Scanner" Power App when testing on iOS mobile devices. It helps investigate why scans that should show RED X (match found) are showing GREEN checkmark (no match).

## Available Tools

### 1. `pac_command`
Execute Power Platform CLI commands directly.

**Example usage:**
```
pac_command: "canvas list"
pac_command: "env who"
pac_command: "auth list"
```

### 2. `analyze_app_formulas`
Analyze the OnScan and other formulas in the extracted app source.

**Use when:** You want to understand the app's scan logic.

### 3. `search_app_source`
Search for specific patterns in the app source code.

**Example:** Search for "varMatchFound" to see all usages.

### 4. `get_datasource_info`
Get information about the SharePoint data sources.

**Shows:** List names, column mappings, SharePoint site URL.

### 5. `list_app_variables`
List all variables used in the app with their purposes.

### 6. `validate_lookup_formula`
Analyze a LookUp formula for potential issues.

**Use when:** Checking if the formula syntax is correct.

### 7. `simulate_scan_logic`
Trace through what should happen when a barcode is scanned.

**Example:** `simulate_scan_logic: { "barcodeValue": "ABC123" }`

### 8. `parse_monitor_export`
Parse a Power Apps Monitor session export file.

**Use when:** You have exported a debugging session from Power Apps Monitor.

### 9. `get_app_check_results`
Get static analysis warnings from the App Checker (SARIF file).

### 10. `explain_visibility_logic`
Detailed explanation of when each UI element should be visible.

---

## Debugging Workflow

### Step 1: Understand the Current Logic

Use `explain_visibility_logic` to see the visibility conditions:

| Element | Visible When | Meaning |
|---------|--------------|---------|
| Green Circle + Checkmark | `varShowResult && !varMatchFound` | Barcode NOT in SharePoint |
| Red Circle + X | `varShowResult && varMatchFound` | Barcode IS in SharePoint |

**Key insight:** The app currently shows GREEN when no match is found (needs cut sheet) and RED when a match is found (already has cut sheet).

### Step 2: Verify the Data

1. Note the exact barcode value being scanned (visible in the debug label)
2. Manually check both SharePoint lists:
   - `FY26 Cut Sheets`
   - `FY26 Cut Sheets Part 2`
3. Search for the exact barcode value in the "Legacy Asset Tag" column

### Step 3: Check for Data Issues

Common problems:
- **Leading/trailing spaces** in barcode or SharePoint data
- **Case sensitivity** (Power Fx is case-insensitive, but check anyway)
- **Column name mismatch** ("Legacy Asset Tag" must be exact)
- **Data in wrong list** (app checks Part 1 first, then Part 2)

### Step 4: Use Power Apps Monitor

For real-time debugging on mobile:

1. Open https://make.powerapps.com
2. Navigate to your app
3. Click "Monitor" in the left nav
4. Select "Connect to current session"
5. Run the app on your iOS device
6. Scan a barcode
7. Watch the Monitor for:
   - Data operation events
   - Variable changes
   - Any errors

After the session, export the data and use `parse_monitor_export` to analyze.

---

## Known Issue Analysis

### Current OnScan Formula

```
Set(varScannedValue, First(brcScanner.Barcodes).Value);
Set(varIsSearching, true);
Set(varShowResult, false);

Set(
    varMatchRecord,
    Coalesce(
        LookUp('FY26 Cut Sheets', 'Legacy Asset Tag' = First(brcScanner.Barcodes).Value),
        LookUp('FY26 Cut Sheets Part 2', 'Legacy Asset Tag' = First(brcScanner.Barcodes).Value)
    )
);

Set(varMatchFound, !IsBlank(varMatchRecord));
Set(varIsSearching, false);
Set(varShowResult, true)
```

### Potential Issues

1. **Delegation**: If lists have >500 items, LookUp may not search all records
   - Fix: Check app settings for delegation limit

2. **Data Type**: If "Legacy Asset Tag" is a Number column, string comparison fails
   - Fix: Verify column type in SharePoint is "Single line of text"

3. **SharePoint Connection**: Connection may be stale or have permission issues
   - Fix: Remove and re-add the data connection

4. **Barcode Format**: Scanner might return different format than stored
   - Fix: Compare exact values character-by-character

---

## SharePoint Verification

To verify data exists, you can use the Microsoft Graph API or PnP PowerShell.

### Using Graph API (requires Azure AD app)

See `sharepoint-verify.js` in this directory.

### Manual Check

1. Go to https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport
2. Open "FY26 Cut Sheets" list
3. Filter "Legacy Asset Tag" column for the exact barcode value
4. Repeat for "FY26 Cut Sheets Part 2"

---

## Environment Variables

The MCP server uses these environment variables (configured in `.mcp.json`):

| Variable | Value | Purpose |
|----------|-------|---------|
| `DOTNET_ROOT` | `/opt/homebrew/Cellar/dotnet/10.0.105/libexec` | .NET runtime location |
| `PAC_PATH` | `/Users/johnadkerson/.dotnet/tools/pac` | Power Platform CLI path |
| `APP_DEBUG_DIR` | `/Volumes/bingobango/code/scanToCutsheets/app-debug` | Extracted app source |
| `SHAREPOINT_SITE` | `https://encoretch.sharepoint.com/sites/CCHMCRefreshSupport` | SharePoint site URL |

---

## Quick Reference

### What each variable means:

- `varScannedValue` - The barcode that was just scanned
- `varIsSearching` - True while SharePoint lookup is running
- `varShowResult` - True after lookup completes, enables result UI
- `varMatchRecord` - The SharePoint record if found, blank if not
- `varMatchFound` - `!IsBlank(varMatchRecord)` - True if barcode exists

### Debug Label

The app has a debug label showing:
```
"Scanned: " & varScannedValue & " | Match: " & varMatchFound
```

Watch this during testing to see actual runtime values.
