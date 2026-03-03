# Scan to Cut Sheets - Project Instructions

## Mobile Simulator Configuration

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
