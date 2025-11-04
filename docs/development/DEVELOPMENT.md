# Development Guide - Mixpanel Quickhide

## 🏗️ Architecture

### Component Overview

```
┌─────────────────────────────────────────┐
│          Mixpanel Webpage               │
│  ┌──────────────────────────────────┐   │
│  │      content.js                  │   │
│  │  - Monitors URL changes          │   │
│  │  - Extracts hidden events        │   │
│  │  - Modifies URL                  │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↕ (messages)
┌─────────────────────────────────────────┐
│       Extension Popup                   │
│  ┌──────────────────────────────────┐   │
│  │      popup.js                    │   │
│  │  - Displays events               │   │
│  │  - Handles user input            │   │
│  │  - Syncs with page               │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              ↕ (storage API)
┌─────────────────────────────────────────┐
│     chrome.storage.local                │
│  { hiddenEvents: [...] }                │
└─────────────────────────────────────────┘
```

### Communication Flow

1. **Content → Storage**: Saves discovered events
2. **Storage → Popup**: Notifies of new events
3. **Popup → Content**: Commands to apply events
4. **Content → Page**: Modifies URL, triggers reload

## 🔍 Code Walkthrough

### content.js

#### Key Functions

**`isOnActivityFeedPage()`**
```javascript
// Returns true if we're on a user activity page
// Checks for distinct_id in URL hash
```

**`extractHiddenEvents()`**
```javascript
// Input: window.location.hash
// Output: Array of event names
// Uses regex: /excludedEvents~\(([^)]*)\)/
```

**`saveDiscoveredEvents(events)`**
```javascript
// Merges new events with existing storage
// Avoids duplicates using Set
// Only writes if new events found (optimization)
```

**`applyHiddenEventsToURL(eventsToHide)`**
```javascript
// Modifies URL hash with selected events
// Handles 3 cases:
//   1. Replace existing excludedEvents
//   2. Add new excludedEvents section
//   3. Remove excludedEvents entirely
// Forces page reload
```

#### Event Listeners

```javascript
// Primary detection
window.addEventListener('hashchange', checkAndExtractEvents);

// Backup polling (catches edge cases)
setInterval(() => { /* check for changes */ }, 500);

// Message handler for popup commands
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle 'applyHiddenEvents' and 'getCurrentEvents'
});
```

### popup.js

#### Key Functions

**`checkCurrentTab()`**
```javascript
// Validates page and checks content script status
// Shows appropriate UI state:
//   - Active (content script loaded)
//   - Inactive (not on Mixpanel)
//   - Needs refresh (content script not loaded)
```

**`displayEvents(events, shouldSync)`**
```javascript
// Renders checkbox list from event array
// Optionally syncs with URL if content script available
// Sorts alphabetically
```

**`syncCheckboxesWithURL()`**
```javascript
// Queries content script for current URL events
// Updates checkbox.checked state to match
// Fails silently if content script unavailable
```

**`getSelectedEvents()`**
```javascript
// Returns array of checked event names
// Uses querySelectorAll('.event-checkbox:checked')
```

#### State Management

```javascript
let currentTab = null;  // Cached tab reference

// Loaded on popup open
await checkCurrentTab();
await loadStoredEvents();

// Updated on storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  await displayEvents(changes.hiddenEvents.newValue || []);
});
```

## 🛠️ Common Development Tasks

### Adding Console Logging

Content script logs:
```javascript
console.log('[Mixpanel Hidden Events] Your message here');
```

Popup logs:
```javascript
console.log('[Popup] Your message here');
```

### Testing Event Discovery

1. Open console on Mixpanel page
2. Hide event in UI
3. Look for: `[Mixpanel Hidden Events] Discovered new events: [...]`
4. Check storage: `chrome.storage.local.get(['hiddenEvents'])`

### Testing URL Modification

```javascript
// In content script console:
const testEvents = ['event1', 'event2'];
applyHiddenEventsToURL(testEvents);
// Page should reload with those events in URL
```

### Modifying UI

Edit `popup.html` and `styles.css`:
```css
/* Example: Change primary button color */
.btn-primary {
  background: linear-gradient(135deg, #YOUR_COLOR 0%, #YOUR_COLOR_2 100%);
}
```

### Adding New Button

1. Add HTML:
```html
<button id="myBtn" class="btn btn-secondary">My Button</button>
```

2. Add event listener in `setupEventListeners()`:
```javascript
document.getElementById('myBtn').addEventListener('click', () => {
  // Your logic here
});
```

## 🧪 Testing Strategy

### Manual Testing Checklist

```
□ Install/load extension
□ Navigate to non-Mixpanel page
  □ Extension shows "Inactive" state
□ Navigate to Mixpanel (not profile)
  □ Extension shows "Inactive" state
□ Navigate to user profile
  □ Extension shows "Active" state
□ Hide event in Mixpanel
  □ Console shows "Discovered new events"
  □ Open popup, event appears in list
□ Navigate to different user
  □ Open popup, event is unchecked
  □ Check event, click "Apply Selected"
  □ Page reloads, event is hidden
  □ Checkbox is now checked (synced)
□ Click "Check All"
  □ All checkboxes checked
□ Click "Uncheck All"
  □ All checkboxes unchecked
□ Reload extension
  □ Refresh Mixpanel page
  □ Extension works normally
```

### Edge Cases to Test

1. **Empty state**: No events discovered yet
2. **Single event**: Only one event
3. **Many events**: 20+ events (scrolling)
4. **Special characters**: Events with underscores, numbers
5. **Rapid changes**: Hide/unhide quickly
6. **Multiple tabs**: Multiple Mixpanel tabs open
7. **Page navigation**: Switch between users
8. **Browser restart**: Events persist?

## 🐛 Debugging Tips

### Content Script Not Loading

Check:
```javascript
// In page console:
console.log('Content script loaded?', 
  typeof extractHiddenEvents !== 'undefined'
);
```

If false:
- Check `manifest.json` matches pattern
- Reload extension
- Refresh page

### Messages Not Reaching Content Script

```javascript
// In popup console:
chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, {action: 'getCurrentEvents'}, (response) => {
    console.log('Response:', response);
    console.log('Error:', chrome.runtime.lastError);
  });
});
```

### Storage Issues

```javascript
// Check what's in storage:
chrome.storage.local.get(null, (items) => {
  console.log('All storage:', items);
});

// Clear storage:
chrome.storage.local.clear(() => {
  console.log('Storage cleared');
});
```

### URL Regex Testing

```javascript
const testURL = 'distinct_id=xxx&~(excludedEvents~(~\'event1~\'event2)~dateRange~(...))';
const match = testURL.match(/excludedEvents~\(([^)]*)\)/);
console.log('Match:', match);
console.log('Events string:', match[1]);
```

## 📦 Building for Distribution

### Preparing for Chrome Web Store

1. **Update version** in `manifest.json`
2. **Test thoroughly** on fresh install
3. **Create screenshots** (1280x800 or 640x400)
4. **Write store description**
5. **Create promotional images**
6. **Zip the extension**:
   ```bash
   cd mixpanel_hide_events
   zip -r extension.zip . -x "*.git*" "*.DS_Store" "node_modules/*"
   ```

### Version Bumping

Update these files:
- `manifest.json` → `version`
- `README.md` → Changelog section

### Pre-release Checklist

```
□ All features working
□ No console errors
□ Documentation updated
□ Code cleaned up (no debug logs)
□ Icons look good
□ Permissions minimized
□ Privacy policy created (if needed)
□ Screenshots taken
```

## 🚀 Performance Optimization

### Current Optimizations

1. **Conditional syncing**: Only sync when content script available
2. **Smart storage updates**: Only write when new events found
3. **Efficient polling**: 500ms interval (not too frequent)
4. **Cached tab reference**: Don't query tabs repeatedly

### Potential Improvements

1. **Debouncing**: Debounce URL monitoring
2. **Lazy loading**: Load events on demand
3. **Caching**: Cache parsed URL data
4. **Virtual scrolling**: For 100+ events

## 📝 Code Style Guide

### JavaScript

```javascript
// Use async/await
async function myFunction() {
  const result = await chrome.storage.local.get(['key']);
  return result;
}

// Use arrow functions for callbacks
events.forEach(event => {
  console.log(event);
});

// Use template literals
const message = `Found ${count} events`;

// Use const/let, never var
const immutable = 'value';
let mutable = 'value';
```

### Naming Conventions

- Functions: `camelCase` (`getSelectedEvents`)
- Constants: `UPPER_SNAKE_CASE` (`MAX_EVENTS`)
- DOM IDs: `camelCase` (`applyBtn`, `eventsList`)
- CSS classes: `kebab-case` (`event-item`, `btn-primary`)

### Comments

```javascript
// Short explanation for simple code
const events = [];

/**
 * Longer explanation for complex functions
 * @param {Array} events - Array of event names
 * @returns {Promise<void>}
 */
async function saveDiscoveredEvents(events) {
  // Implementation
}
```

## 🔐 Security Considerations

### Input Validation

```javascript
// Always validate message data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !request.action) return;
  if (!Array.isArray(request.events)) return;
  // Process...
});
```

### XSS Prevention

```javascript
// Use textContent, not innerHTML for user data
span.textContent = event;  // ✅ Safe
span.innerHTML = event;    // ❌ Dangerous
```

### Permission Minimization

Only request necessary permissions in `manifest.json`. Currently:
- `storage` ✅ (needed)
- `activeTab` ✅ (needed)
- `scripting` ✅ (needed)
- Host permissions only for `mixpanel.com` ✅ (restricted)

## 🤝 Contributing Guidelines

1. **Fork and branch**: Create feature branches
2. **Test thoroughly**: All functionality must work
3. **Document changes**: Update README and comments
4. **Follow style**: Match existing code style
5. **Small commits**: Logical, atomic commits
6. **Clear messages**: Descriptive commit messages

### Commit Message Format

```
type: Brief description

Longer explanation if needed.

Fixes #issue_number
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## 📞 Getting Help

- Check [README.md](README.md) for usage
- Check [QUICK_START.md](QUICK_START.md) for basics
- Look at code comments
- Use browser DevTools console
- Search Chrome extension documentation

---

**Happy coding! 🎉**

