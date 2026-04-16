# GitHub App-Level Git Integration — Design Spec

**Date:** 2026-04-16
**Status:** Draft
**Scope:** Connect the Asset Tag Scanner Power App to the GitHub repo for formula/property sync

---

## Problem

Every time we modify Power Fx formulas or control properties in the `.pa.yaml` source files, we must manually copy-paste each change into Power Apps Studio control-by-control. For the nonstandard device detection feature alone, this meant 7 separate formula paste operations across 3 screens. This is slow, error-prone, and doesn't scale.

## Goal

Connect the Power App to the GitHub repo so that formula and property changes made in `.pa.yaml` files can be synced into Power Apps Studio with a single click, eliminating per-control copy-paste.

---

## What This Covers

### Synced via Git (formulas & properties):
- Formula text: OnSelect, OnScan, OnStart, Visible, Text, Default, Fill, Color, etc.
- Control properties: X, Y, Width, Height, Size, FontWeight, etc.
- Any property in `.pa.yaml` that starts with `=`

### Still requires Power Apps Studio:
- Adding new controls
- Removing controls
- Adding/removing screens
- Connecting new data sources
- Adding code components

---

## Setup

### Prerequisites

1. **GitHub Personal Access Token** with `repo` scope
   - Generate at: https://github.com/settings/tokens
   - Recommended: use a fine-grained token scoped to `AdkersonJohn/scanToCutsheets` only
   - Token must be kept secure — do not commit to repo

2. **Power Platform environment** set as a **Managed Environment**
   - Toggled in Power Platform admin center (https://admin.powerplatform.microsoft.com)
   - Requires system administrator role
   - This is a one-time admin toggle — does not affect app functionality

3. **System administrator role** on the Power Platform environment

### Connection Steps

1. Open "Asset Tag Scanner" in Power Apps Studio at https://make.powerapps.com
2. Go to **Settings > Git version control**
3. Enable Git version control
4. Configure connection:
   - **Git provider:** GitHub
   - **Repository:** `AdkersonJohn/scanToCutsheets`
   - **Branch:** `main`
   - **Directory:** `app-debug/Src`
   - **Authentication:** Paste GitHub PAT
5. Click **Connect**
6. Perform initial sync to establish baseline

### Post-Setup Behavior Changes

- **Autosave is disabled** when Git version control is active — you must manually save or sync
- The `app-debug/Src/*.pa.yaml` files become the live sync source, not just reference docs
- `pac canvas download --overwrite` is no longer needed for routine updates (Git sync replaces it)
- `pac canvas download` can still be used for one-off diagnostics

---

## Day-to-Day Workflows

### Workflow A: Formula/Property Changes (the common case)

```
Developer edits .pa.yaml in Git (via Claude Code, VS Code, etc.)
    │
    ▼
Push to main (or merge PR)
    │
    ▼
Open Power Apps Studio
    │
    ▼
Click "Sync" button at top of Studio
    │
    ▼
Studio pulls all .pa.yaml changes from Git
    │
    ▼
Review changes in Studio
    │
    ▼
Click "Publish" to deploy to users
```

### Workflow B: New Controls/Screens (structural changes)

```
Create new controls in Power Apps Studio
    │
    ▼
Save in Studio
    │
    ▼
Click "Sync" to push changes to Git
    │
    ▼
Git repo now has the new controls in .pa.yaml
    │
    ▼
Future formula edits to those controls go through Workflow A
```

### Workflow C: Mixed Changes (new feature with new controls + formulas)

```
1. Create new controls in Power Apps Studio (Workflow B)
2. Sync to push control definitions to Git
3. Edit formulas in Git (refine OnSelect, Visible, etc.)
4. Sync to pull formula changes back into Studio
5. Publish
```

This is the workflow for features like nonstandard device detection where you need both new UI controls AND formula changes.

---

## Impact on Current Feature (Nonstandard Device Detection)

For the PR #11 deployment, the workflow becomes:

| Task | Method |
|---|---|
| Task 4: OnStart variables | **Git Sync** — pulls from App.pa.yaml |
| Task 5: OnScan logic | **Git Sync** — pulls from Screen1.pa.yaml |
| Task 6: Warning banner (3 new controls) | **Manual in Studio** — create controls, then Sync pushes definitions to Git |
| Task 7: Form popup (lblFormMake + Y shifts + Default) | **Mixed** — lblFormMake created in Studio; Y values and Default synced from Git |
| Task 8: btnSaveItem formula | **Git Sync** — pulls from Screen1.pa.yaml |
| Task 9: Screen2 (lblGalNSBadge + text change) | **Mixed** — badge created in Studio; text formula synced from Git |
| Task 10: btnSubmitAll formula | **Git Sync** — pulls from Screen2.pa.yaml |
| Task 11: Data source connections | **Manual in Studio** |

~60% of deployment work becomes a single Sync click.

---

## Repo Structure

No changes to repo structure. The existing layout works:

```
app-debug/
  Src\App.pa.yaml          ← synced with Power Apps Studio
  Src\Screen1.pa.yaml      ← synced with Power Apps Studio
  Src\Screen2.pa.yaml      ← synced with Power Apps Studio
  Src\_EditorState.pa.yaml ← synced (editor state)
  Controls\*.json           ← not used for Git sync
  References\*.json         ← not used for Git sync
```

Only `Src/*.pa.yaml` files participate in the sync. JSON files in other folders are not part of the Git integration workflow.

---

## Limitations & Gotchas

1. **No auto-sync** — you must click "Sync" in Studio to pull/push changes
2. **Autosave disabled** — remember to manually save or sync; unsaved work can be lost
3. **Last edit wins** — if two people edit the same property, the last sync overwrites. Not a concern for a small team but worth knowing.
4. **Code components** — if the app ever adds PCF (code) components, YAML editing will break the app. Currently the app has no code components, so this is not an issue.
5. **Schema changes** — Microsoft's `.pa.yaml` schema is actively evolving. Stick to editing property values, not structural YAML.
6. **17 MB file limit** — Azure DevOps limit; GitHub has a higher limit (100 MB) so this won't be an issue.

---

## Implementation Steps

1. **Generate GitHub PAT** — create fine-grained token with repo access to `AdkersonJohn/scanToCutsheets`
2. **Enable Managed Environment** — admin toggles this in Power Platform admin center
3. **Connect app to GitHub** — follow connection steps above in Power Apps Studio
4. **Initial sync** — establish baseline between current app state and Git
5. **Test round-trip** — make a trivial formula edit in Git, sync, verify it appears in Studio
6. **Update CLAUDE.md** — document the Git integration workflow for future sessions
7. **Update deployment workflow** — update the nonstandard feature deployment guide to use Sync where applicable
