# Scan to Cut Sheets - Project Instructions

## Mobile Simulator Configuration

> **IMPORTANT: Only run ONE simulator at a time!**
> This machine cannot reliably run both iOS and Android simulators simultaneously due to resource constraints.
> - Complete all iOS simulator testing first
> - Fully shut down iOS simulator (`xcrun simctl shutdown all`)
> - Then start Android emulator for Android testing
> - Never run both simulators concurrently

### iOS Simulator

**Location:** Xcode is installed on the external drive at `/Volumes/bingobango/Xcode.app`

**Starting the Simulator:**
```bash
open /Volumes/bingobango/Xcode.app/Contents/Developer/Applications/Simulator.app
```

**Key Commands:**
```bash
# List all available devices
xcrun simctl list devices

# Check which devices are booted
xcrun simctl list devices | grep "Booted"

# Boot a specific device (e.g., iPhone 16 Pro)
xcrun simctl boot "iPhone 16 Pro"

# Open a URL in the booted simulator's Safari
xcrun simctl openurl booted "http://LOCAL_IP:5173"

# Take a screenshot
xcrun simctl io booted screenshot /tmp/screenshot.png

# Shutdown the simulator
xcrun simctl shutdown booted
```

**Network Access:**
- iOS Simulator CAN access `localhost` directly
- For reliability, use the host machine's local IP (e.g., `http://172.16.x.x:5173`)
- Get local IP with: `ipconfig getifaddr en0`

**Vite Configuration:**
- Run Vite with `--host` flag to enable network access: `npx vite --host`

---

### Android Emulator

**Status:** Working, but slow performance causes "Chrome isn't responding" dialogs. App renders correctly - just tap "Wait" repeatedly.

**Location:** Android SDK is installed on the external drive at `/Volumes/bingobango/android-sdk`

**Environment Variables (required):**
```bash
export ANDROID_HOME="/Volumes/bingobango/android-sdk"
export ANDROID_SDK_ROOT="/Volumes/bingobango/android-sdk"
```

**AVD Configuration:**
- AVD Name: `Pixel_7_API_34`
- System Image: Android 14 (API 34) ARM64 with Google APIs

**Starting the Emulator:**
```bash
cd "$ANDROID_HOME/emulator"
./emulator -avd Pixel_7_API_34 -no-snapshot-load -no-audio -gpu host
```

**Key ADB Commands:**
```bash
# Check connected devices
$ANDROID_HOME/platform-tools/adb devices

# Open a URL in Chrome
$ANDROID_HOME/platform-tools/adb shell am start -a android.intent.action.VIEW -d "http://10.0.2.2:5173"

# Take a screenshot
$ANDROID_HOME/platform-tools/adb shell screencap -p /sdcard/screen.png
$ANDROID_HOME/platform-tools/adb pull /sdcard/screen.png /tmp/android-screenshot.png

# View logcat errors
$ANDROID_HOME/platform-tools/adb logcat -d | grep -iE "(error|exception)"

# Restart ADB server (if emulator shows offline)
$ANDROID_HOME/platform-tools/adb kill-server
$ANDROID_HOME/platform-tools/adb start-server
```

**Network Access:**
- Android Emulator CANNOT access `localhost` directly
- Use `10.0.2.2` to access the host machine (e.g., `http://10.0.2.2:5173`)

**Known Issues:**
- If emulator process gets stuck (shows as "UNE" in `ps aux`), it cannot be killed normally
  - Solution: Close emulator window manually via Activity Monitor or restart Mac
- Use `-gpu host` for hardware acceleration (avoid `-gpu swiftshader_indirect` which causes System UI freezes)
- "Chrome isn't responding" dialogs appear frequently due to emulator performance
  - The app IS working behind the dialogs - just keep tapping "Wait"
  - Give Chrome 10-15 seconds to fully render the page after opening a URL
- First boot after a fresh start takes longer - subsequent interactions are faster

**Taking Screenshots (fast method):**
```bash
# Use exec-out for faster screenshot capture (no file push/pull)
/Volumes/bingobango/android-sdk/platform-tools/adb exec-out screencap -p > /tmp/screenshot.png
```

**Simulating User Input:**
```bash
# Tap at coordinates (x, y)
$ANDROID_HOME/platform-tools/adb shell input tap 540 1200

# Swipe from (x1,y1) to (x2,y2) with duration in ms
$ANDROID_HOME/platform-tools/adb shell input swipe 540 400 540 1200 300

# Press Back button
$ANDROID_HOME/platform-tools/adb shell input keyevent 4

# Press Home button
$ANDROID_HOME/platform-tools/adb shell input keyevent 3
```

---

## Development Scripts

**Start dev environment with both simulators:**
```bash
npm run dev
```
This runs `./scripts/dev-mobile.sh` which:
1. Starts Vite dev server with `--host`
2. Launches iOS Simulator and opens the app in Safari
3. Launches Android Emulator and opens the app in Chrome

**Start Vite only (web development):**
```bash
npm run dev:web
```

---

## Barcode Scanning Implementation

### Scan Pair Workflow
The app captures barcodes in pairs:
1. **Asset Tag** (first scan) - Format: `EW##-#####` (e.g., EW26-03975)
2. **Serial Number** (second scan) - Format: 7 alphanumeric characters (e.g., ABC1234)

The scanning screen shows which type is expected and validates the format before accepting.

### Validation Patterns
```typescript
// Asset Tag: EW followed by 2 digits, hyphen, 5 digits
const ASSET_TAG_PATTERN = /^EW\d{2}-\d{5}$/;

// Serial Number: exactly 7 alphanumeric characters
const SERIAL_NUMBER_PATTERN = /^[A-Z0-9]{7}$/i;
```

### Scanner Types
1. **Teams Native** (`microsoftTeams.barCode.scanBarCode`) - Used when running inside Microsoft Teams app
2. **Quagga2** - Browser-based fallback using camera for standalone testing

### Supported Barcode Formats
- Code 128
- Code 39
- EAN
- UPC

---

## Azure Configuration

### App Registration (Personal Tenant - Demo)
- **App Name:** Scan to Cut Sheets
- **Client ID:** `2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749`
- **Tenant ID:** `d5a7739d-02bc-4ac7-8edd-9c2253141e57`
- **Application ID URI:** `api://localhost:5173/2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749`
- **Subscription:** Azure subscription 1 (Free tier)

### API Permissions (Delegated)
- `User.Read` - Read user profile
- `Sites.ReadWrite.All` - Read/write SharePoint sites

### Redirect URIs (SPA)
- `http://localhost:5173`
- `http://localhost:5173/auth-end`

### Pre-authorized Teams Clients
- `1fec8e78-bce4-4aaf-ab1b-5451cc387264` - Teams desktop/mobile
- `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` - Teams web

### Environment Variables
Stored in `.env.local` (not committed to git):
```bash
VITE_AZURE_CLIENT_ID=2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749
VITE_AZURE_TENANT_ID=d5a7739d-02bc-4ac7-8edd-9c2253141e57
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_TEAMS_APP_ID_URI=api://localhost:5173/2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749
```

### Azure CLI Commands
```bash
# Login
az login

# View app registration
az ad app show --id "2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749"

# Grant admin consent
az ad app permission admin-consent --id "2f32f0cc-9c19-43f2-9c1c-6dd2b7b8b749"
```

### Migration to Corporate Tenant
When ready to move to Encore's tenant:
1. Create new app registration in Encore's Entra ID
2. Update `.env.local` with new Client ID and Tenant ID
3. Update Application ID URI to use production domain
4. Have Encore admin grant API permissions consent

---

## MCP Servers

### Android Emulator MCP
Location: `/mcp-servers/android-emulator/`

Provides tools for:
- Starting/stopping the emulator
- Taking screenshots
- Opening URLs
- Reading logcat
- Simulating taps and swipes
- Executing shell commands
