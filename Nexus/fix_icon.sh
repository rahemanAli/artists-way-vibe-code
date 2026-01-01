#!/bin/bash
set -e

# Cleanup
rm -rf IconGen.iconset IconGen.icns
mkdir IconGen.iconset

# Source Icon (Absolute Path to be safe)
src="/Users/mac/Documents/Gravity/Nexus/Nexus/Assets.xcassets/AppIcon.appiconset/Icon-1024.png"

echo "Generating PNGs..."
sips -s format png -z 16 16     "$src" --out IconGen.iconset/icon_16x16.png
sips -s format png -z 32 32     "$src" --out IconGen.iconset/icon_16x16@2x.png
sips -s format png -z 32 32     "$src" --out IconGen.iconset/icon_32x32.png
sips -s format png -z 64 64     "$src" --out IconGen.iconset/icon_32x32@2x.png
sips -s format png -z 128 128   "$src" --out IconGen.iconset/icon_128x128.png
sips -s format png -z 256 256   "$src" --out IconGen.iconset/icon_128x128@2x.png
sips -s format png -z 256 256   "$src" --out IconGen.iconset/icon_256x256.png
sips -s format png -z 512 512   "$src" --out IconGen.iconset/icon_256x256@2x.png
sips -s format png -z 512 512   "$src" --out IconGen.iconset/icon_512x512.png
sips -s format png -z 1024 1024 "$src" --out IconGen.iconset/icon_512x512@2x.png

echo "Building ICNS..."
iconutil -c icns IconGen.iconset

echo "Injecting into Desktop App..."
cp IconGen.icns /Users/mac/Desktop/Nexus.app/Contents/Resources/AppIcon.icns

echo "Updating Info.plist..."
defaults write /Users/mac/Desktop/Nexus.app/Contents/Info.plist CFBundleIconFile AppIcon

echo "Touching App..."
touch /Users/mac/Desktop/Nexus.app

echo "Done!"
