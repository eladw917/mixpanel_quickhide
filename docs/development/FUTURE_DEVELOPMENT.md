# Future Development Guide - Mixpanel Quickhide

## 📦 Current Version: 1.1.0

This document provides everything you need to know to continue developing Mixpanel Quickhide.

---

## 🎯 What This Extension Does

**Mixpanel Quickhide** solves the problem of having to manually hide the same events repeatedly when viewing different user profiles in Mixpanel.

### Core Functionality
1. **Auto-discovers** hidden events from Mixpanel URLs
2. **Stores** them persistently in Chrome's local storage
3. **Applies** saved events to new user profiles with one click
4. **Exports/Imports** events for team sharing
5. **Provides** a clean, intuitive UI with real-time sync

---

## 🏗️ Architecture

### Three Main Components

#### 1. Content Script (`content.js`)
- **Runs on:** `mixpanel.com/project/*/view/*/app/profile*`
- **Purpose:** Interacts with Mixpanel pages
- **Key Functions:**
  - `isOnActivityFeedPage()` - Validates we're on a user activity page
  - `extractHiddenEvents()` - Parses URL hash for hidden events
  - `saveDiscoveredEvents()` - Saves new events to storage
  - `applyHiddenEventsToURL()` - Modifies URL with selected events
  - `checkAndExtractEvents()` - Main loop for discovering events

**Event Detection:**
- Listens to `hashchange` events
- Polls every 500ms as backup
- Extracts events from URL pattern: `excludedEvents~(~'event1~'event2)`

#### 2. Popup UI (`popup.html`, `popup.js`, `styles.css`)
- **Purpose:** User interface for managing events
- **Key Features:**
  - Event list with checkboxes (all checked by default)
  - Search and filter
  - Manual event addition (temporary until applied)
  - Delete individual events
  - Export/Import functionality
  - Context-aware instructions

**State Management:**
- Syncs checkbox states with current URL
- Preserves states during re-renders
- Listens to storage changes for real-time updates
- Handles three UI states:
  1. Not in Mixpanel
  2. In Mixpanel but not on users page
  3. On users page

#### 3. Storage Layer (`chrome.storage.local`)
- **Schema:**
  ```javascript
  {
    hiddenEvents: [        // Auto-discovered (persistent)
      "event1",
      "event2"
    ],
    manualEvents: [        // Manually added (temporary)
      "manual_event1"
    ]
  }
  ```

- **Deduplication:** Manual events are removed if they appear in auto-discovered
- **Cleanup:** Manual events cleared after "Apply Selected"

---

## 🎨 UI Components

### Header (Active State)
```
┌─────────────────────────────────────────┐
│ Mixpanel Quickhide      📥  📤  🗑️     │
│                        EXPORT IMPORT CLEAR│
└─────────────────────────────────────────┘
```

### Icon Buttons (Top Right)
1. **📥 Export** - Downloads `mixpanel_events.txt`
2. **📤 Import** - Loads events from file (replace or merge)
3. **🗑️ Clear** - Deletes ALL events (with confirmation)

### Main Content
- **Search Bar** - Filter events, add manual if not found
- **Events List** - Scrollable, max 200px height
- **Selection Count** - "X events selected"
- **Action Buttons:**
  - Apply Selected (primary)
  - Check All / Uncheck All

### Inactive States
Three context-aware instruction screens:

1. **Not in Mixpanel:**
   ```
   🔒 How to use
   Go to Mixpanel, then click the "Users" button
   [Open Mixpanel]
   ```

2. **In Mixpanel (not on users page):**
   ```
   How to use
   Go to the "Users" button on the left pane, or click below
   [Go to Users Page]
   ```

3. **On Users Page:**
   ```
   How to use
   Choose a user from the list
   ```

---

## 🔄 Data Flow

### Discovery Flow
```
User hides event in Mixpanel
    ↓
Mixpanel updates URL hash
    ↓
Content script detects change (hashchange + polling)
    ↓
extractHiddenEvents() parses URL
    ↓
saveDiscoveredEvents() merges with storage
    ↓
chrome.storage.onChanged fires
    ↓
Popup updates UI (if open)
```

### Application Flow
```
User checks events in popup
    ↓
Clicks "Apply Selected"
    ↓
popup.js sends message to content.js
    ↓
applyHiddenEventsToURL() modifies hash
    ↓
window.location.reload() after 100ms
    ↓
Mixpanel processes new URL
    ↓
Events are hidden
    ↓
Content script extracts from new URL
    ↓
Popup syncs checkboxes
```

### Export/Import Flow
```
EXPORT:
User clicks 📥
    ↓
Get all events from storage
    ↓
Combine, deduplicate, sort
    ↓
Create Blob (text/plain)
    ↓
Download as mixpanel_events.txt

IMPORT:
User clicks 📤 → selects file
    ↓
Read file content
    ↓
Parse (split by newlines, trim, filter empty)
    ↓
User chooses: Replace or Merge
    ↓
Update storage
    ↓
Reload UI
```

---

## 🛠️ Development Setup

### Prerequisites
- Chrome browser
- Code editor (VS Code recommended)
- Basic knowledge of JavaScript, Chrome Extensions API

### Loading the Extension
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the extension directory
5. Extension appears in toolbar

### Making Changes
1. Edit source files (`content.js`, `popup.js`, etc.)
2. Go to `chrome://extensions/`
3. Click refresh icon ↻ on extension card
4. **Important:** Refresh any open Mixpanel pages
5. Test changes

### Debugging

#### Content Script
- Open page console (F12 on Mixpanel page)
- Look for `[Mixpanel Quickhide]` messages
- Check Network tab for URL changes

#### Popup
- Right-click extension icon → "Inspect popup"
- Look for `[Popup]` messages
- Monitor storage changes

#### Common Issues
- **"Extension context invalidated"** → Reload extension + refresh page
- **"Could not establish connection"** → Content script not loaded, refresh page
- **Checkboxes not syncing** → Check console for errors

---

## 📝 Key Implementation Details

### URL Parsing
Mixpanel uses a complex URL hash structure:
```
#distinct_id=USER_ID&~(excludedEvents~(~'event1~'event2)~dateRange~(...))
```

**Regex Pattern:**
```javascript
/excludedEvents~\(([^)]*)\)/
```

**Event Extraction:**
- Split by `~'`
- Filter out empty strings
- Trim whitespace

### URL Modification
```javascript
// Adding events
if (eventsToHide.length > 0) {
  excludedEventsString = `excludedEvents~(${eventsList})`;
} else {
  // Remove excludedEvents entirely
}

// Update hash
window.location.hash = newHash;
setTimeout(() => window.location.reload(), 100);
```

### Checkbox State Preservation
```javascript
// Save states before re-rendering
const currentStates = {};
document.querySelectorAll('.event-checkbox').forEach(cb => {
  currentStates[cb.value] = cb.checked;
});

// Restore after rendering
checkbox.checked = currentStates.hasOwnProperty(eventName) 
  ? currentStates[eventName] 
  : true; // Default to checked
```

### Real-Time Sync
```javascript
// Listen to storage changes
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === 'local' && (changes.hiddenEvents || changes.manualEvents)) {
    await loadStoredEvents();
  }
});

// Listen to hash changes
window.addEventListener('hashchange', checkAndExtractEvents);

// Backup polling
setInterval(checkAndExtractEvents, 500);
```

---

## 🚀 Feature Additions Guide

### Adding a New Button/Action

1. **Update HTML** (`popup.html`)
   ```html
   <button id="myNewBtn" class="btn btn-secondary">New Action</button>
   ```

2. **Add Event Listener** (`popup.js`)
   ```javascript
   document.getElementById('myNewBtn').addEventListener('click', async () => {
     // Your logic here
   });
   ```

3. **Style if Needed** (`styles.css`)
   ```css
   #myNewBtn {
     /* Custom styles */
   }
   ```

### Adding a Storage Field

1. **Define Schema** (in code comments)
   ```javascript
   {
     hiddenEvents: [...],
     manualEvents: [...],
     myNewField: []  // Your new field
   }
   ```

2. **Update Get/Set Operations**
   ```javascript
   const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents', 'myNewField']);
   ```

3. **Handle in Storage Listener**
   ```javascript
   chrome.storage.onChanged.addListener(async (changes, areaName) => {
     if (changes.myNewField) {
       // Handle change
     }
   });
   ```

### Adding Content Script Functionality

1. **Add Function** (`content.js`)
   ```javascript
   function myNewFunction() {
     // Your logic
   }
   ```

2. **Add Message Handler** (if popup needs to trigger it)
   ```javascript
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     if (request.action === 'myNewAction') {
       myNewFunction();
       sendResponse({ success: true });
     }
   });
   ```

3. **Call from Popup** (`popup.js`)
   ```javascript
   const response = await chrome.tabs.sendMessage(currentTab.id, {
     action: 'myNewAction'
   });
   ```

---

## 🎨 Styling Guidelines

### Color Palette
- **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Success Green:** `#22c55e`
- **Error Red:** `#ef4444`
- **Text Primary:** `#374151`
- **Text Secondary:** `#6b7280`
- **Border:** `#d1d5db`
- **Background:** `#f9fafb`

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

### Size Constraints
- **Width:** `350px` (fixed)
- **Height:** `550px` (fixed)
- **Overflow:** Hidden on body, scroll on events list

### Design Principles
1. **Compact** - Fits in 350x550px without scrolling (except event list)
2. **Clear Hierarchy** - Header → Content → Actions → Footer
3. **Responsive Feedback** - Hover states, transitions, notifications
4. **Icon Usage** - Emojis for visual clarity (📥📤🗑️🔒)

---

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Extension loads without errors
- [ ] Detects activity feed pages correctly
- [ ] Discovers new hidden events in real-time
- [ ] Checkboxes default to checked
- [ ] Checkboxes sync with URL on popup open
- [ ] "Apply Selected" modifies URL correctly
- [ ] Page reloads and Mixpanel processes changes
- [ ] Events persist across browser sessions

### Search & Filter
- [ ] Search filters events correctly
- [ ] Clear search button works
- [ ] Search count displays correctly
- [ ] "Add manually" appears when no results
- [ ] Manual events show [m] indicator
- [ ] Manual events cleared after apply

### Export/Import
- [ ] Export creates valid .txt file
- [ ] File format is correct (one per line)
- [ ] Import validates file type
- [ ] Replace option removes old events
- [ ] Merge option combines events
- [ ] Duplicates are removed

### UI States
- [ ] Not in Mixpanel: Shows full instructions
- [ ] In Mixpanel (not users): Shows "Go to Users" button
- [ ] On users page: Shows "Choose a user" message
- [ ] Button visibility correct in each state

### Edge Cases
- [ ] Empty events list handled
- [ ] No events in URL doesn't uncheck all
- [ ] URL with special characters parsed correctly
- [ ] Rapid checkbox changes preserved
- [ ] Extension reload handled gracefully
- [ ] Multiple popup instances work correctly

### Browser Compatibility
- [ ] Chrome (primary target) ✅
- [ ] Edge (Chromium-based) - should work
- [ ] Firefox - would need Manifest V2 adaptation
- [ ] Safari - would need complete rewrite

---

## 🐛 Known Limitations

### Current Limitations
1. **Mixpanel Only:** Only works on mixpanel.com
2. **Chrome Only:** Manifest V3 is Chrome-specific
3. **Manual Reload:** Page must reload to apply changes
4. **No Event Categories:** All events in one flat list
5. **No Profiles/Presets:** Can't save different event sets
6. **No Keyboard Shortcuts:** All actions require clicks

### Technical Constraints
1. **Polling Interval:** 500ms might miss very rapid changes
2. **Storage Limit:** Chrome storage has ~5MB limit (unlikely to hit)
3. **URL Length:** Very long event lists might hit URL limits
4. **SPA Detection:** Relies on hash changes, might break if Mixpanel changes

---

## 🔮 Future Enhancement Ideas

### High Priority
- [ ] **Event Categories/Tags** - Organize events into groups
- [ ] **Multiple Profiles** - Save different event sets (e.g., "Mobile", "Web")
- [ ] **Keyboard Shortcuts** - Quick hide/unhide (e.g., `Cmd+Shift+H`)
- [ ] **Bulk Operations** - Select by pattern, invert selection
- [ ] **Event Statistics** - Show which events are most hidden

### Medium Priority
- [ ] **Dark Mode** - For night-time usage
- [ ] **Event Aliases** - Rename events for clarity
- [ ] **Recently Used** - Quick access to recently hidden events
- [ ] **Sync Across Devices** - Use Chrome sync storage
- [ ] **Team Sharing** - Cloud-based event list sharing

### Low Priority
- [ ] **Event Descriptions** - Add notes to events
- [ ] **Hide History** - Track when events were hidden
- [ ] **Export Formats** - JSON, CSV support
- [ ] **Import from URL** - Share lists via URL
- [ ] **Undo/Redo** - Revert recent actions

### Technical Improvements
- [ ] **TypeScript** - Type safety
- [ ] **Build Process** - Webpack/Vite for optimization
- [ ] **Unit Tests** - Jest for business logic
- [ ] **E2E Tests** - Playwright for integration tests
- [ ] **CI/CD** - Automated testing and releases
- [ ] **Firefox Support** - Manifest V2 version
- [ ] **Performance** - Reduce polling, optimize rendering

---

## 📦 Release Process

### Version Numbering
- **Major (X.0.0):** Breaking changes, major rewrites
- **Minor (1.X.0):** New features, non-breaking changes
- **Patch (1.1.X):** Bug fixes, small improvements

### Before Release
1. **Test Everything** - Run full testing checklist
2. **Update Version** - `manifest.json` version field
3. **Update Docs** - README.md, CHANGELOG in README
4. **Clean Up** - Remove debug logs, console.logs
5. **Create Icons** - If changed, regenerate all sizes
6. **Test Load** - Fresh install in new Chrome profile

### Creating a Release
1. **Git Tag** - `git tag v1.1.0`
2. **Create ZIP** - Package extension files (exclude .git, node_modules, etc.)
3. **Test ZIP** - Load from ZIP in Chrome
4. **Release Notes** - Document changes
5. **Distribute** - Share via Chrome Web Store or direct download

### Files to Include in ZIP
```
manifest.json
content.js
popup.html
popup.js
styles.css
icon16.png
icon48.png
icon128.png
README.md
LICENSE
```

### Files to Exclude
```
.git/
.gitignore
.DS_Store
node_modules/
*.log
*_SUMMARY.md
*_FEATURE.md
mixpanel_events.txt
```

---

## 📚 Useful Resources

### Chrome Extension APIs
- [Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/mv3/)
- [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [chrome.tabs API](https://developer.chrome.com/docs/extensions/reference/tabs/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### JavaScript References
- [MDN Web Docs](https://developer.mozilla.org/)
- [Regular Expressions](https://regex101.com/)
- [Modern JavaScript](https://javascript.info/)

### Design Resources
- [Chrome Extension UX Best Practices](https://developer.chrome.com/docs/extensions/mv3/ux/)
- [Material Design Icons](https://fonts.google.com/icons)
- [Tailwind CSS Colors](https://tailwindcss.com/docs/customizing-colors) (for reference)

---

## 🤝 Contributing Guidelines

### Code Style
- Use `const` and `let`, avoid `var`
- Use async/await instead of .then()
- Add comments for complex logic
- Keep functions small and focused
- Use descriptive variable names

### Git Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test
3. Commit: `git commit -m "feat: add new feature"`
4. Push: `git push origin feature/my-feature`
5. Create pull request (if using GitHub)

### Commit Message Format
```
type: subject

body (optional)
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📞 Support & Maintenance

### Common User Questions

**Q: Events not being discovered?**
A: Make sure you're using Mixpanel's built-in hide feature. Check that URL contains `excludedEvents` after hiding.

**Q: Apply Selected not working?**
A: Wait for page reload (happens automatically). If still not working, manually refresh.

**Q: Lost all my events?**
A: Check `chrome://extensions/` → Extension Details → "Inspect views: service worker" for errors. Events stored in Chrome local storage should persist unless cleared.

**Q: Can I share events with my team?**
A: Yes! Use the Export button (📥) to download `mixpanel_events.txt`, share the file, and teammates can import (📤).

### Troubleshooting Steps
1. Check Chrome console for errors
2. Verify extension is enabled
3. Refresh the Mixpanel page
4. Reload the extension
5. Try in incognito mode (enable extension for incognito first)
6. Check if Mixpanel changed their URL structure

---

## 🎓 Learning Path

### For Beginners
1. Read [Chrome Extension Getting Started](https://developer.chrome.com/docs/extensions/mv3/getstarted/)
2. Understand `manifest.json` structure
3. Learn about content scripts vs popup scripts
4. Study `chrome.storage` API
5. Practice with simpler extensions first

### For Intermediate
1. Understand message passing between components
2. Learn about Chrome extension lifecycle
3. Study URL manipulation and parsing
4. Understand async/await patterns
5. Learn DOM manipulation best practices

### For Advanced
1. Optimize performance (reduce polling, debounce)
2. Implement proper error handling
3. Add TypeScript for type safety
4. Set up build pipeline (Webpack/Vite)
5. Implement comprehensive testing

---

## 📄 File Reference

### Core Files
| File | Purpose | Lines | Key Functions |
|------|---------|-------|---------------|
| `manifest.json` | Extension config | 37 | N/A |
| `content.js` | Page interaction | 189 | extractHiddenEvents, applyHiddenEventsToURL |
| `popup.html` | UI structure | 95 | N/A |
| `popup.js` | UI logic | 717 | loadStoredEvents, displayEvents, exportEvents |
| `styles.css` | Styling | 491 | N/A |

### Documentation
| File | Purpose |
|------|---------|
| `README.md` | User-facing documentation |
| `QUICK_START.md` | Quick reference guide |
| `DEVELOPMENT.md` | Development guide |
| `FUTURE_DEVELOPMENT.md` | This file |

### Generated/Optional
| File | Purpose |
|------|---------|
| `mixpanel_events.txt` | Exported events (gitignored) |
| `*.png` | Extension icons |
| `.gitignore` | Git ignore rules |
| `LICENSE` | MIT License |

---

## ✅ Final Checklist Before Shipping

- [ ] All features working as expected
- [ ] No console errors or warnings
- [ ] All buttons and interactions tested
- [ ] Export/Import tested with real data
- [ ] Tested on different Mixpanel projects
- [ ] Tested with many events (100+)
- [ ] Tested with special characters in event names
- [ ] Documentation is up-to-date
- [ ] Version number updated
- [ ] Git committed and tagged
- [ ] Extension reloaded and tested fresh
- [ ] Tested in incognito mode
- [ ] Icons display correctly
- [ ] No sensitive data in code
- [ ] .gitignore includes all temp files

---

**Built with ❤️ to make Mixpanel workflows more efficient**

*Last Updated: November 2025 - Version 1.1.0*

