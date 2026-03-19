#!/bin/bash
#
# Wrapper script for Power Platform CLI (pac)
# Sets up the correct .NET environment on macOS with Homebrew
#

export DOTNET_ROOT="/opt/homebrew/Cellar/dotnet/10.0.105/libexec"
export PATH="$DOTNET_ROOT:$PATH"

PAC_PATH="$HOME/.dotnet/tools/pac"

if [ ! -f "$PAC_PATH" ]; then
    echo "Error: pac CLI not found at $PAC_PATH"
    echo "Install with: dotnet tool install --global Microsoft.PowerApps.CLI.Tool"
    exit 1
fi

exec "$PAC_PATH" "$@"
