# Project Structure - Mixpanel Activity Navigator

## 📁 Directory Organization

```
mixpanel_hide_events/
├── manifest.json                   # Chrome Extension configuration (root level)
├── LICENSE                         # MIT License (root level)
├── .gitignore                     # Git ignore rules (root level)
├── README.md                      # Main documentation entry point
│
├── src/                           # 🔧 Source Code
│   ├── content.js                 # Content script (injected into Mixpanel)
│   │                              # - Runs on mixpanel.com/project/.../profile pages
│   │                              # - Extracts hidden events from URL
│   │                              # - Applies selected events to URL
│   │                              # - Communicates with popup
│   │
│   ├── popup/                     # Extension popup UI
│   │   ├── popup.html             # HTML structure
│   │   ├── popup.js               # Popup logic and event handlers
│   │   └── popup.css              # Styling (formerly styles.css)
│   │
│   └── assets/                    # Static assets
│       └── icons/                 # Extension icons
│           ├── icon16.png         # 16x16 for toolbar
│           ├── icon48.png         # 48x48 for management page
│           └── icon128.png        # 128x128 for webstore
│
├── docs/                          # 📚 Documentation
│   ├── user/                      # User-facing documentation
│   │   ├── README.md              # Complete user guide
│   │   │                          # - Installation instructions
│   │   │                          # - Usage guide with examples
│   │   │                          # - Troubleshooting
│   │   │                          # - Technical details
│   │   │
│   │   └── QUICK_START.md         # Quick reference guide
│   │                              # - 2-minute installation
│   │                              # - Quick actions table
│   │                              # - Pro tips
│   │
│   ├── development/               # Developer documentation
│   │   ├── DEVELOPMENT.md         # Development guide
│   │   │                          # - Setup instructions
│   │   │                          # - Architecture overview
│   │   │                          # - Testing guidelines
│   │   │                          # - Debugging tips
│   │   │
│   │   ├── FUTURE_DEVELOPMENT.md  # Complete development reference
│   │   │                          # - Detailed architecture
│   │   │                          # - Component breakdowns
│   │   │                          # - Feature addition guides
│   │   │                          # - Enhancement ideas
│   │   │                          # - Best practices
│   │   │
│   │   └── DEPLOYMENT_GUIDE.md    # Deployment and distribution
│   │                              # - Release process
│   │                              # - Package creation
│   │                              # - Testing checklists
│   │                              # - Distribution strategies
│   │
│   ├── features/                  # Feature-specific documentation
│   │   ├── VERSION_1.1.0_SUMMARY.md    # Release summary
│   │   ├── EXPORT_IMPORT_FEATURE.md    # Export/Import details
│   │   ├── ICON_BUTTONS_UPDATE.md      # Icon button changes
│   │   ├── REBRAND_SUMMARY.md          # Rebranding notes
│   │   └── IMPLEMENTATION_COMPLETE.md  # Implementation notes
│   │
│   └── PROJECT_STRUCTURE.md       # This file!
│
└── [Generated at runtime]         # Not in repository
    └── mixpanel_events.txt        # Exported events (gitignored)
```

---

## 📝 File Descriptions

### Root Level Files

#### `manifest.json`
**Purpose:** Chrome Extension configuration  
**Contains:**
- Extension metadata (name, version, description)
- Required permissions (storage, activeTab, scripting)
- Content script configuration (what pages to inject into)
- Popup and icon paths
- Host permissions (mixpanel.com only)

#### `LICENSE`
**Purpose:** MIT License file  
**Contains:** Open source license terms

#### `.gitignore`
**Purpose:** Git ignore rules  
**Ignores:** 
- System files (.DS_Store, Thumbs.db)
- Editor files (.vscode, .idea)
- Generated files (mixpanel_events.txt)
- Build artifacts

#### `README.md`
**Purpose:** Main entry point for documentation  
**Contains:**
- Quick links to all documentation
- Quick start instructions
- Project structure overview
- Development setup basics

---

## 🔧 Source Code Details

### `src/content.js` (189 lines)
**Role:** Content script injected into Mixpanel pages  

**Key Functions:**
- `isOnActivityFeedPage()` - Validates we're on user activity page
- `extractHiddenEvents()` - Parses URL hash for hidden events
- `saveDiscoveredEvents()` - Merges and saves events to storage
- `applyHiddenEventsToURL()` - Modifies URL with selected events
- `checkAndExtractEvents()` - Main discovery loop

**Event Listeners:**
- `hashchange` - Detects URL changes
- `setInterval` - Polls every 500ms as backup
- `chrome.runtime.onMessage` - Receives commands from popup

### `src/popup/popup.html` (95 lines)
**Role:** Extension popup UI structure  

**Main Sections:**
- Header with title and icon buttons (📥📤🗑️)
- Status bar (hidden by default)
- Inactive view with context-aware instructions
- Active view with:
  - Search bar with clear button
  - Events list (scrollable, max 200px)
  - Selection counter
  - Action buttons (Apply, Check All, Uncheck All)
  - Footer with instructions

### `src/popup/popup.js` (717 lines)
**Role:** Popup logic and event handling  

**Key Functions:**
- `checkCurrentTab()` - Validates page and content script
- `loadStoredEvents()` - Loads from chrome.storage.local
- `displayEvents()` - Renders event list with preserved states
- `syncCheckboxesWithURL()` - Syncs UI with current page
- `exportEvents()` - Creates .txt download
- `importEvents()` - Reads and processes import file
- `addManualEvent()` - Adds temporary manual events
- `deleteEvent()` - Removes individual events
- `filterEvents()` - Search functionality
- `updateSelectionCount()` - Updates counter
- `updateMixpanelButtonText()` - Context-aware navigation

**Event Handlers:**
- Export/Import/Clear icon buttons
- Search input and clear
- Apply Selected, Check All, Uncheck All
- Storage change listener
- Individual event delete buttons

### `src/popup/popup.css` (491 lines)
**Role:** Extension popup styling  

**Key Sections:**
- Global styles and resets
- Header with gradient and icon buttons
- Search container with clear button
- Events list (scrollable with custom scrollbar)
- Button styles (primary and secondary)
- Inactive view states
- Notifications and animations
- Manual event indicators

**Design System:**
- Primary gradient: `#667eea` to `#764ba2`
- Success green: `#22c55e`
- Error red: `#ef4444`
- Popup size: 350x550px (fixed)

### `src/assets/icons/`
**Purpose:** Extension icons in various sizes  

**Files:**
- `icon16.png` - Used in browser toolbar
- `icon48.png` - Used in extension management page
- `icon128.png` - Used in Chrome Web Store (if published)

**Created with:** Simple Python script (placeholder icons)

---

## 📚 Documentation Organization

### User Documentation (`docs/user/`)
**Audience:** End users of the extension  
**Focus:** How to use, troubleshooting, features

### Development Documentation (`docs/development/`)
**Audience:** Developers maintaining/extending the extension  
**Focus:** Architecture, code structure, development workflow

### Feature Documentation (`docs/features/`)
**Audience:** Both users and developers  
**Focus:** Specific features, release notes, implementation details

---

## 🔄 File Relationships

### Dependency Graph
```
manifest.json
    ├─> src/content.js (injected into Mixpanel)
    ├─> src/popup/popup.html (popup window)
    │   ├─> src/popup/popup.css (styling)
    │   └─> src/popup/popup.js (logic)
    └─> src/assets/icons/*.png (icons)

content.js ←─ messages ─→ popup.js
    ↓                          ↓
chrome.storage.local (shared data store)
```

### Data Flow
```
User hides event in Mixpanel
    ↓
URL hash changes
    ↓
content.js detects change
    ↓
Extracts event names
    ↓
Saves to chrome.storage.local
    ↓
popup.js receives storage change event
    ↓
Updates UI (if open)
```

---

## 🗂️ Why This Structure?

### Benefits

1. **Separation of Concerns**
   - Source code in `src/`
   - Documentation in `docs/`
   - Configuration at root

2. **Logical Grouping**
   - Popup files together in `src/popup/`
   - Assets separate in `src/assets/`
   - Docs by audience in `docs/user/` and `docs/development/`

3. **Easy Navigation**
   - Clear folder names
   - Logical hierarchy
   - Quick access to relevant docs

4. **Scalability**
   - Easy to add new features
   - Clear place for new documentation
   - Can add build process later

5. **Clean Root**
   - Only essential files at root level
   - Reduces clutter
   - Professional appearance

---

## 📦 Packaging for Distribution

### Files to Include in ZIP
```
manifest.json
src/
  ├── content.js
  ├── popup/
  │   ├── popup.html
  │   ├── popup.js
  │   └── popup.css
  └── assets/
      └── icons/
          ├── icon16.png
          ├── icon48.png
          └── icon128.png
docs/user/README.md (optional)
LICENSE
```

### Files to Exclude
```
.git/
.gitignore
.DS_Store
docs/development/ (optional)
docs/features/ (optional)
mixpanel_events.txt
```

---

## 🔧 Working with This Structure

### Adding a New Source File
1. Place in appropriate `src/` subfolder
2. Update `manifest.json` if needed (for content scripts)
3. Update imports/references in HTML/JS files
4. Document in relevant `docs/` section

### Adding Documentation
1. Determine audience (user/developer)
2. Place in appropriate `docs/` subfolder
3. Update root `README.md` with link
4. Cross-reference with related docs

### Modifying Existing Files
1. File paths are relative to their location
2. `popup.html` references `popup.css` and `popup.js` relatively
3. `manifest.json` uses paths relative to root
4. Update docs if behavior changes

---

## ⚠️ Important Notes

### Path References

**In `manifest.json`:** All paths are relative to project root
```json
"default_popup": "src/popup/popup.html"
"js": ["src/content.js"]
```

**In `popup.html`:** Paths are relative to `src/popup/`
```html
<link rel="stylesheet" href="popup.css">
<script src="popup.js"></script>
```

**In documentation:** Use relative links
```markdown
[Development Guide](docs/development/DEVELOPMENT.md)
```

### Git Repository
- `.gitignore` is at root level
- Excludes `mixpanel_events.txt` (user-generated)
- Excludes system files and editor configs
- Includes all source and documentation

### Chrome Extension Loading
- Point Chrome to the **project root** directory
- Chrome reads `manifest.json` from root
- All paths in manifest are relative to root
- Structure is transparent to Chrome

---

## 🚀 Migration Notes

### Changes from Original Structure
**Before:**
```
mixpanel_hide_events/
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── styles.css
├── icon*.png
├── README.md
├── QUICK_START.md
├── DEVELOPMENT.md
├── (many more docs)
└── LICENSE
```

**After:**
```
mixpanel_hide_events/
├── manifest.json
├── LICENSE
├── README.md (new, navigation-focused)
├── src/
│   ├── content.js
│   ├── popup/ (new folder)
│   └── assets/ (new folder)
└── docs/ (new folder)
    ├── user/
    ├── development/
    └── features/
```

### Files Renamed
- `styles.css` → `src/popup/popup.css`

### Paths Updated In
- ✅ `manifest.json` - All file paths
- ✅ `popup.html` - CSS reference
- ✅ All source files - Added location comments
- ✅ Root `README.md` - Created as navigation hub

---

**Last Updated:** November 2025  
**Version:** 1.1.0  
**Structure Status:** Organized and Production Ready ✅

