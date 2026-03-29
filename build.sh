#!/bin/bash
# Build script for Mixpanel Activity Navigator extension
# Creates a production-ready ZIP file for Chrome Web Store submission

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building Mixpanel Activity Navigator Extension${NC}"
echo ""

# Get version from manifest.json
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo -e "${GREEN}Version: ${VERSION}${NC}"

# Create dist directory if it doesn't exist
mkdir -p dist

# Define output filename
OUTPUT_FILE="dist/mixpanel-activity-navigator-v${VERSION}.zip"

# Remove old build if exists
if [ -f "$OUTPUT_FILE" ]; then
    echo -e "${YELLOW}Removing old build...${NC}"
    rm "$OUTPUT_FILE"
fi

echo -e "${BLUE}Creating distribution package...${NC}"

# Create ZIP file with necessary files
zip -r "$OUTPUT_FILE" \
    manifest.json \
    LICENSE \
    README.md \
    src/ \
    -x "*.DS_Store" \
    -x "*/.DS_Store" \
    -x "*/node_modules/*" \
    -x "*/.git/*" \
    -x "*.zip" \
    -q

# Get file size
SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "${GREEN}📦 Package: ${OUTPUT_FILE}${NC}"
echo -e "${GREEN}📏 Size: ${SIZE}${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Test the extension by loading the dist folder"
echo "2. Upload ${OUTPUT_FILE} to Chrome Web Store"
echo "3. Tag the release in git: git tag v${VERSION}"
echo ""

