# Power Apps Barcode Scanner — Requirements Specification

## 1. Project Overview

**Purpose:** Enable team members to scan computer asset barcodes using mobile devices and automatically log them to a SharePoint list for inventory tracking.

**Constraints:**
- Must use existing Microsoft 365 Business suite resources only
- No additional licenses, premium connectors, or third-party tools
- No IT approval required beyond enabling Power Apps maker access

---

## 2. Functional Requirements

### 2.1 Barcode Scanning

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | App shall use device camera to scan barcodes | Must Have |
| FR-02 | App shall support common barcode formats (Code 128, Code 39, QR Code) | Must Have |
| FR-03 | App shall display scanned barcode value on screen for verification | Must Have |
| FR-04 | App shall provide visual/audio feedback on successful scan | Should Have |
| FR-05 | App shall allow manual entry as fallback if scan fails | Should Have |

### 2.2 SharePoint Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | App shall connect to designated SharePoint list as data source | Must Have |
| FR-07 | App shall create new list item on each successful scan | Must Have |
| FR-08 | App shall auto-populate timestamp on each entry | Must Have |
| FR-09 | App shall auto-populate current user on each entry | Must Have |
| FR-10 | App shall confirm successful write to SharePoint | Must Have |
| FR-11 | App shall handle offline scenarios and sync when online | Could Have |

### 2.3 User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-12 | App shall have single-screen interface for simplicity | Must Have |
| FR-13 | App shall display scan button prominently | Must Have |
| FR-14 | App shall show recent scans in current session | Should Have |
| FR-15 | App shall allow adding optional notes/location per scan | Should Have |
| FR-16 | App shall provide clear error messages on failure | Must Have |

### 2.4 Data Capture Fields

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-17 | Capture: Barcode value (text) | Must Have |
| FR-18 | Capture: Scan timestamp (auto) | Must Have |
| FR-19 | Capture: Scanned by user (auto) | Must Have |
| FR-20 | Capture: Location/notes (optional text) | Should Have |
| FR-21 | Capture: Device type or identifier (optional) | Could Have |

---

## 3. Non-Functional Requirements

### 3.1 Security

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | App shall use existing Microsoft 365 authentication | Must Have |
| NFR-02 | SharePoint list shall inherit site permissions | Must Have |
| NFR-03 | No sensitive data stored locally on device | Must Have |

### 3.2 Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-04 | Barcode scan shall complete in under 2 seconds | Should Have |
| NFR-05 | SharePoint write shall complete in under 5 seconds | Should Have |
| NFR-06 | App shall load in under 10 seconds on mobile | Should Have |

### 3.3 Compatibility

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-07 | App shall work on iOS devices | Must Have |
| NFR-08 | App shall work on Android devices | Must Have |
| NFR-09 | App shall work on tablets | Should Have |
| NFR-10 | App shall work via Power Apps mobile app | Must Have |

### 3.4 Usability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-11 | App shall be usable with minimal training | Must Have |
| NFR-12 | Primary workflow shall require 3 taps or fewer | Should Have |
| NFR-13 | App shall use consistent Microsoft design patterns | Should Have |

---

## 4. Data Model

### 4.1 SharePoint List: "Computer Asset Scans"

| Column Name | Type | Required | Notes |
|-------------|------|----------|-------|
| Title | Single line text | No | Auto-generated or hidden |
| BarcodeValue | Single line text | Yes | Primary scanned data |
| ScannedBy | Person | Yes | Auto-populated from logged-in user |
| ScannedDate | Date and Time | Yes | Auto-populated on submission |
| Location | Single line text | No | Optional user input |
| Notes | Multiple lines text | No | Optional user input |

### 4.2 Data Retention

- Data retained per organization SharePoint policies
- No automatic deletion from app
- List admin manages archival/cleanup

---

## 5. User Workflows

### 5.1 Primary Workflow: Scan and Log

```
1. User opens Power Apps mobile app
2. User selects "Asset Scanner" app
3. User taps "Scan Barcode" button
4. Camera opens, user points at barcode
5. App captures barcode value
6. Value displays on screen for verification
7. User optionally adds location/notes
8. User taps "Submit"
9. App writes to SharePoint
10. App confirms success
11. Screen resets for next scan
```

### 5.2 Alternate Workflow: Manual Entry

```
1. User opens app
2. User taps "Manual Entry" option
3. User types barcode value
4. User optionally adds location/notes
5. User taps "Submit"
6. App writes to SharePoint
7. App confirms success
```

### 5.3 Error Workflow

```
1. Scan or submit fails
2. App displays error message
3. User retries or enters manually
4. On persistent failure, user notes issue for IT
```

---

## 6. Technical Architecture

### 6.1 Components

```
┌─────────────────────────────────────────────────────┐
│                    Power Apps                        │
│                  (Canvas App)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  Barcode    │  │   Form      │  │   Submit    │  │
│  │  Scanner    │  │   Fields    │  │   Button    │  │
│  │  Control    │  │             │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      │ SharePoint Connector
                      │ (Standard, no premium)
                      ▼
┌─────────────────────────────────────────────────────┐
│              SharePoint Online                       │
│         List: "Computer Asset Scans"                │
└─────────────────────────────────────────────────────┘
```

### 6.2 Technology Stack

| Layer | Technology | License |
|-------|------------|---------|
| Frontend | Power Apps Canvas App | Included in M365 |
| Data | SharePoint List | Included in M365 |
| Auth | Microsoft Entra ID (Azure AD) | Included in M365 |
| Mobile | Power Apps Mobile App | Free download |

---

## 7. Acceptance Criteria

### 7.1 Minimum Viable Product (MVP)

- [ ] User can scan a barcode with device camera
- [ ] Scanned value appears on screen
- [ ] User can submit scan to SharePoint
- [ ] Entry appears in SharePoint list with barcode, user, and timestamp
- [ ] App works on at least one mobile platform (iOS or Android)

### 7.2 Full Release

- [ ] All MVP criteria met
- [ ] Manual entry fallback works
- [ ] Optional location/notes field works
- [ ] App works on both iOS and Android
- [ ] Error handling displays clear messages
- [ ] Session history shows recent scans

---

## 8. Out of Scope

- Asset database lookup (checking if barcode exists in another system)
- Integration with other systems beyond SharePoint
- Barcode generation/printing
- Offline mode with local storage
- Admin dashboard or reporting (use SharePoint list views)
- Automated workflows (can be added later via Power Automate)

---

## 9. Future Enhancements (Not in Initial Release)

- Power Automate flow to notify on scan
- Lookup against existing asset inventory
- Photo capture alongside barcode
- GPS location auto-capture
- Export to Excel functionality
- Multi-list support for different asset types

---

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| IT blocks Power Apps access | Cannot build app | Request maker access (no cost) |
| Camera quality issues on old devices | Poor scan reliability | Provide manual entry fallback |
| SharePoint connectivity issues | Data not saved | Display clear error, retry option |
| User adoption resistance | Low usage | Keep UI minimal, provide brief training |

---

## 11. Stakeholders

| Role | Responsibility |
|------|----------------|
| Team Lead | Approve requirements, manage SharePoint list |
| Developer (You) | Build and test Power App |
| End Users | Scan assets, provide feedback |
| IT Admin | Enable Power Apps access if blocked |

---

## 12. Timeline Milestones

| Milestone | Description |
|-----------|-------------|
| M1 | SharePoint list created and configured |
| M2 | Basic app with barcode scanner working |
| M3 | SharePoint integration complete |
| M4 | UI polish and error handling |
| M5 | Testing on mobile devices |
| M6 | User training and deployment |

---

*Document Version: 1.0*
*Created: 2026-03-11*
