#!/bin/bash
# Package Teams app manifest for sideloading

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEAMS_DIR="$PROJECT_ROOT/teams"
OUTPUT_FILE="$PROJECT_ROOT/scanToCutsheets.zip"

echo "Packaging Teams app..."

# Remove old package if exists
rm -f "$OUTPUT_FILE"

# Create zip package
cd "$TEAMS_DIR"
zip -r "$OUTPUT_FILE" manifest.json color.png outline.png

echo "Teams app packaged: $OUTPUT_FILE"
echo ""
echo "To sideload in Teams:"
echo "1. Open Microsoft Teams"
echo "2. Click Apps in the sidebar"
echo "3. Click 'Manage your apps'"
echo "4. Click 'Upload an app'"
echo "5. Select 'Upload a custom app'"
echo "6. Choose: $OUTPUT_FILE"
