#!/bin/bash

# Mobile Development Script
# Launches Vite dev server + iOS Simulator + Android Emulator

set -e

# Android SDK Configuration - External drive location
export ANDROID_HOME="/Volumes/bingobango/android-sdk"
export ANDROID_SDK_ROOT="/Volumes/bingobango/android-sdk"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"

ANDROID_AVD="Pixel_7_API_34"
EMULATOR="$ANDROID_HOME/emulator/emulator"
ADB="$ANDROID_HOME/platform-tools/adb"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting mobile development environment...${NC}"

# Get the local network IP for simulators to access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo -e "${GREEN}📍 Local IP: ${LOCAL_IP}${NC}"

# Start Vite dev server in background
echo -e "${BLUE}📦 Starting Vite dev server...${NC}"
npx vite --host &
VITE_PID=$!

# Wait for Vite to be ready
echo -e "${YELLOW}⏳ Waiting for dev server to start...${NC}"
sleep 4

# Get the port Vite is running on
PORT=5173
for p in 5173 5174 5175 5176 5177; do
  if curl -s "http://localhost:$p" > /dev/null 2>&1; then
    PORT=$p
    break
  fi
done

APP_URL="http://${LOCAL_IP}:${PORT}"
ANDROID_URL="http://10.0.2.2:${PORT}"

echo -e "${GREEN}✅ Dev server running at http://localhost:${PORT}${NC}"
echo -e "${GREEN}📱 Mobile URL: ${APP_URL}${NC}"

# Launch iOS Simulator
echo -e "${BLUE}🍎 Launching iOS Simulator...${NC}"
open -a Simulator

# Wait for iOS Simulator to boot
sleep 3

# Get booted iOS device or boot one
IOS_DEVICE=$(xcrun simctl list devices | grep -m1 "Booted" | grep -oE "[A-F0-9-]{36}" || true)

if [ -z "$IOS_DEVICE" ]; then
  echo -e "${YELLOW}📱 Booting iPhone simulator...${NC}"
  # Find any available iPhone
  IOS_DEVICE=$(xcrun simctl list devices available | grep "iPhone" | grep -v "unavailable" | grep -oE "[A-F0-9-]{36}" | head -1 || true)
  if [ -n "$IOS_DEVICE" ]; then
    xcrun simctl boot "$IOS_DEVICE" 2>/dev/null || true
    sleep 5
  fi
fi

# Open Safari on iOS Simulator
if [ -n "$IOS_DEVICE" ]; then
  echo -e "${GREEN}🌐 Opening app in iOS Safari...${NC}"
  xcrun simctl openurl booted "$APP_URL" 2>/dev/null || true
fi

# Launch Android Emulator
echo -e "${BLUE}🤖 Launching Android Emulator...${NC}"
if [ -f "$EMULATOR" ]; then
  # Kill stale adb server and check properly
  "$ADB" kill-server 2>/dev/null || true
  "$ADB" start-server 2>/dev/null || true

  # Check if emulator is ACTUALLY running (device state, not offline)
  EMULATOR_STATUS=$("$ADB" devices 2>/dev/null | grep "emulator" | grep "device" || true)
  if [ -z "$EMULATOR_STATUS" ]; then
    echo -e "${YELLOW}⏳ Starting Android emulator (this may take a minute)...${NC}"

    # Launch emulator from its directory with all environment variables
    # Use host GPU for hardware acceleration on M-series Macs
    cd "$ANDROID_HOME/emulator"
    ./emulator -avd "$ANDROID_AVD" -no-snapshot-load -no-audio -gpu host &
    ANDROID_PID=$!
    cd - > /dev/null

    # Wait for emulator to be ready
    echo -e "${YELLOW}⏳ Waiting for Android emulator to boot...${NC}"
    "$ADB" wait-for-device 2>/dev/null

    # Wait for boot to complete (with timeout)
    BOOT_TIMEOUT=90
    BOOT_COUNT=0
    while [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]; do
      sleep 2
      BOOT_COUNT=$((BOOT_COUNT + 2))
      if [ $BOOT_COUNT -ge $BOOT_TIMEOUT ]; then
        echo -e "${YELLOW}⚠️  Android boot timeout, continuing anyway...${NC}"
        break
      fi
    done
    echo -e "${GREEN}✅ Android emulator ready${NC}"
  else
    echo -e "${GREEN}✅ Android emulator already running${NC}"
  fi

  # Open URL in Android browser (works even without Chrome setup)
  sleep 3
  echo -e "${GREEN}🌐 Opening app in Android browser...${NC}"
  "$ADB" shell am start -a android.intent.action.VIEW -d "$ANDROID_URL" 2>/dev/null || true
  echo -e "${YELLOW}   If Google sign-in appears, skip it and manually open:${NC}"
  echo -e "${YELLOW}   Chrome → http://10.0.2.2:${PORT}${NC}"
else
  echo -e "${YELLOW}⚠️  Android emulator not found at $EMULATOR${NC}"
  echo -e "${YELLOW}    Run: sdkmanager 'emulator' to install${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Mobile dev environment ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════${NC}"
echo -e "   Dev server: http://localhost:${PORT}"
echo -e "   iOS URL:    ${APP_URL}"
echo -e "   Android:    ${ANDROID_URL}"
echo -e ""
echo -e "   Press Ctrl+C to stop all services"
echo -e "${GREEN}════════════════════════════════════════════${NC}"

# Cleanup function
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down...${NC}"
  kill $VITE_PID 2>/dev/null || true
  echo -e "${GREEN}✅ Dev server stopped. Emulators left running.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running (wait for Vite)
wait $VITE_PID
