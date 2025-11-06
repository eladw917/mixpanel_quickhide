# Mixpanel Quickhide

A Chrome extension that helps you quickly hide and manage events across different user profiles in Mixpanel's activity feed.

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Features](#features)
- [Installation](#installation)
- [Usage Guide](#usage-guide)
- [How It Works](#how-it-works)
- [File Structure](#file-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [Technical Details](#technical-details)

## Problem Statement

When viewing user activity feeds in Mixpanel, you often need to hide irrelevant events to focus on what matters. However, these hidden events don't persist when you:
- Navigate to a different user's profile
- Refresh the page
- Open a new session

This means you have to manually hide the same events over and over again for each user, which is time-consuming and frustrating.

## Features

### Filter Events Tab
✅ **Automatic Event Detection** - Discovers and saves hidden events from Mixpanel URLs in real-time  
✅ **Persistent Storage** - Events are stored locally and persist across sessions  
✅ **Quick Selection** - Checkbox interface with "Check All" and "Uncheck All" buttons  
✅ **URL Sync** - Checkboxes automatically reflect what's currently hidden in the URL  
✅ **Real-Time Updates** - Detects when you hide events in Mixpanel and adds them to the list  
✅ **Export/Import** - Save events to a shareable `.txt` file and import them later  
✅ **Manual Event Addition** - Add events manually if needed, with temporary storage  
✅ **Event Management** - Delete individual events from your list  
✅ **Search & Filter** - Quickly find events with built-in search

### Filter Properties Tab
✅ **Automatic Property Discovery** - Finds all user properties on the current profile  
✅ **Instant Value Display** - Check properties to see their values immediately  
✅ **Missing Property Detection** - Shows which properties don't exist for current user  
✅ **Formatted Names** - Displays clean names (e.g., "City" instead of "$city")  
✅ **Quick Copy** - One-click copy for property names and values  
✅ **Export/Import** - Share property lists with your team  
✅ **Smart Search** - Search both original and formatted property names

### Event Timeline Tab
✅ **Event Tracking** - Select specific events to track across user journeys  
✅ **Chronological Timeline** - View selected events in time order with timestamps  
✅ **Day Separators** - Events grouped by day for easy navigation  
✅ **Click to Expand** - Click timeline events to open them in Mixpanel's activity feed  
✅ **Load More** - Load older events with visible start date  
✅ **Event Counter** - See exactly how many tracked events are displayed  
✅ **Global Selection** - Event selections persist across all user profiles  
✅ **Fresh Data** - Always shows current page state, never stale

### General
✅ **Smart Activation** - Only activates on actual user activity feed pages  
✅ **Tab System** - Organized interface with easy navigation  
✅ **Helpful Feedback** - Clear notifications and status indicators  

## Installation

### Prerequisites

- Google Chrome browser
- Access to Mixpanel

### Steps

1. **Clone or download this repository** to your local machine

2. **Ensure icon files exist** (already included):
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in the top right corner)
   - Click **"Load unpacked"**
   - Select the `mixpanel_hide_events` directory
   - The extension icon should appear in your Chrome toolbar

4. **You're ready to go!** The extension will automatically activate when you visit Mixpanel user activity pages.

## Usage Guide

### First Time Setup

1. **Navigate to a Mixpanel user activity page**:
   ```
   https://mixpanel.com/project/YOUR_PROJECT/view/YOUR_VIEW/app/profile#distinct_id=...
   ```

2. **Hide some events** using Mixpanel's built-in feature:
   - Click the event's menu (three dots or right-click)
   - Select the option to hide the event
   - The URL will update with `excludedEvents~(~'event_name)`

3. **The extension automatically detects and saves these events**
   - Check the browser console for confirmation: `[Mixpanel Hidden Events] Discovered new events: [...]`

### Daily Workflow

#### Viewing Stored Events

1. Click the extension icon in your Chrome toolbar
2. You'll see all previously discovered events as checkboxes
3. Checked boxes = currently hidden in this user's profile
4. Unchecked boxes = currently visible

#### Hiding Events in a User Profile

1. Navigate to any user's activity feed
2. Click the extension icon
3. **Check the boxes** for events you want to hide
4. Click **"Apply Selected"**
5. The page will reload with those events hidden

#### Quick Actions

- **Check All** - Select all visible events to hide them
- **Uncheck All** - Deselect all visible events to show them
- **Apply Selected** - Apply your current selection (page reloads)
- **Search** - Filter events by name
- **Export Events** - Download all events to a shareable `mixpanel_events.txt` file
- **Import Events** - Load events from a `.txt` file (choose to replace or merge)

### Example Workflow

```
Day 1: 
- View User A's profile
- Hide "page_view", "button_click", "form_submit" manually in Mixpanel
- Extension saves these events automatically

Day 2:
- View User B's profile (clean slate, nothing hidden)
- Click extension icon
- Click "Check All" or manually select events
- Click "Apply Selected"
- User B's profile now shows with those events hidden!

Sharing with Team:
- Click "Export Events" button
- Share the downloaded mixpanel_events.txt file with teammates
- They click "Import Events" and select the file
- Everyone has the same event list!
```

### Export/Import Guide

#### Exporting Events

1. Click the extension icon
2. Click **"📥 Export Events"** button
3. A `mixpanel_events.txt` file downloads to your Downloads folder
4. The file contains one event per line (simple text format)

**Use Cases:**
- Share event lists with teammates
- Backup your events
- Transfer events between computers
- Version control with git (file is gitignored by default)

#### Importing Events

1. Click the extension icon
2. Click **"📤 Import Events"** button
3. Select a `.txt` file with event names (one per line)
4. Choose option in the confirmation dialog:
   - **OK (Replace)**: Removes existing events and uses only imported ones
   - **Cancel (Merge)**: Combines imported events with existing ones
5. Events are loaded and deduplicated automatically

**File Format:**
```
btn_click_header
page_view
form_submit
custom_event
```

- One event per line
- No special formatting or JSON
- Empty lines are ignored
- Whitespace is trimmed automatically

### Manual Event Addition

If you need to add an event that hasn't been auto-discovered yet:

1. Use the search bar to search for the event name
2. If no results found, click **"+ Add manually"** button
3. The event is added with a `[m]` indicator (manual)
4. Manual events are temporary - they're converted to auto-discovered after "Apply Selected" if valid

### Event Timeline Usage

Track specific events across user journeys:

#### Selecting Events to Track

1. Navigate to any user's activity feed
2. Click the extension icon → **Event Timeline** tab
3. See all events from the current page
4. Use search box to filter event names
5. Check events you want to track (e.g., `exit_beyond_bp`, `quick_actions_completed`)
6. Selections save automatically

#### Viewing the Timeline

1. Timeline shows only selected events in chronological order
2. Events grouped by day with separators
3. See event count: "Timeline (X events tracked)"
4. Timeline takes most of the extension space for easy viewing

#### Interacting with Events

1. **Click any event** in the timeline to expand it in Mixpanel's activity feed
2. Event automatically scrolls into view
3. Mixpanel's collapsible section opens to show details

#### Loading More Events

1. Click **"Load more since [date]"** button at bottom
2. Extension clicks Mixpanel's "Show more" button
3. Timeline refreshes with all loaded events
4. Button updates with new earliest date
5. When all events loaded: "All events loaded since [date]"

#### Clearing Selection

1. Click trash icon (🗑️) in header while on Event Timeline tab
2. All checkboxes unchecked instantly
3. Timeline shows empty state
4. No confirmation needed

#### Cross-User Tracking

1. Select events on User A's profile
2. Navigate to User B's profile
3. Same events automatically selected
4. Timeline shows User B's instances of those events
5. Selections persist across browser sessions

**Example Workflow:**
```
Goal: Track checkout flow errors

1. Open User A's profile
2. Go to Event Timeline tab
3. Search "checkout" or "error"
4. Check:
   - checkout_started
   - payment_failed
   - checkout_completed
5. See timeline showing these events

6. Navigate to User B's profile
7. Open extension → Event Timeline tab
8. Same events already checked
9. See User B's checkout events
10. Click event to investigate in Mixpanel

11. Need more history? Click "Load more"
12. Timeline expands with older events
```

## How It Works

### Architecture Overview

The extension consists of three main components:

1. **Content Script** (`content.js`)
   - Runs on Mixpanel profile pages
   - Monitors URL hash changes
   - Extracts hidden events from URL
   - Modifies URL to apply selected events
   - Communicates with popup

2. **Popup UI** (`popup.html`, `popup.js`, `styles.css`)
   - Displays stored events as checkboxes
   - Syncs checkbox state with current URL
   - Sends commands to content script
   - Manages user interactions

3. **Storage Layer** (`chrome.storage.local`)
   - Persists discovered events across sessions
   - Automatically updates when new events are found

### URL Structure

Mixpanel uses a complex URL hash structure to store hidden events:

```
#distinct_id=USER_ID&~(excludedEvents~(~'event1~'event2~'event3)~dateRange~(...))
```

**Components:**
- `distinct_id=USER_ID` - The user being viewed
- `excludedEvents~(~'event1~'event2)` - List of hidden events
- `dateRange~(...)` - Date range filters
- Multiple parameters separated by `~`

### Event Flow

#### Discovery Flow
```
1. User hides event in Mixpanel
2. Mixpanel updates URL hash
3. Content script detects hash change (hashchange event + polling)
4. Content script extracts event names
5. Event names saved to chrome.storage.local
6. Storage change event triggers popup update (if open)
```

#### Application Flow
```
1. User checks events in popup
2. User clicks "Apply Selected"
3. Popup sends message to content script
4. Content script modifies URL hash
5. Page reloads with new hash
6. Mixpanel processes new hidden events
```

### Real-Time Synchronization

The extension uses multiple mechanisms to stay in sync:

1. **URL Monitoring** (content.js):
   - `hashchange` event listener
   - 500ms polling interval (backup)

2. **Checkbox Syncing** (popup.js):
   - On popup open
   - After displaying events
   - After applying changes

3. **Storage Monitoring**:
   - `chrome.storage.onChanged` listener
   - Updates popup in real-time

## File Structure

```
mixpanel_hide_events/
├── manifest.json          # Extension configuration (Manifest V3)
├── content.js             # Content script - runs on Mixpanel pages
├── popup.html             # Extension popup interface
├── popup.js               # Popup logic and interactions
├── styles.css             # Popup styling
├── icon16.png             # Extension icon (16x16)
├── icon48.png             # Extension icon (48x48)
├── icon128.png            # Extension icon (128x128)
├── .gitignore            # Git ignore rules (includes mixpanel_events.txt)
├── README.md              # This file
├── QUICK_START.md         # Quick reference guide
└── mixpanel_events.txt    # (Generated) Exported events - shareable, gitignored
```

### Key Files Explained

#### `manifest.json`
- Defines extension metadata and permissions
- Configures content script injection rules
- Specifies popup HTML file
- Uses Manifest V3 (latest standard)

#### `content.js`
- **Functions**:
  - `isOnActivityFeedPage()` - Validates we're on the right page
  - `extractHiddenEvents()` - Parses events from URL
  - `saveDiscoveredEvents()` - Saves to storage
  - `applyHiddenEventsToURL()` - Modifies URL with selected events
  - `checkAndExtractEvents()` - Main discovery loop
- **Event Listeners**:
  - Message listener for popup commands
  - Hash change listener for URL monitoring
  - Polling interval for backup detection

#### `popup.js`
- **Functions**:
  - `checkCurrentTab()` - Validates page and content script
  - `loadStoredEvents()` - Loads from storage (auto + manual events)
  - `displayEvents()` - Renders checkbox list with preserved states
  - `syncCheckboxesWithURL()` - Syncs UI with page state
  - `getSelectedEvents()` - Gets checked events
  - `exportEvents()` - Downloads events as `.txt` file
  - `importEvents()` - Loads events from `.txt` file
  - `addManualEvent()` - Adds events manually (temporary)
  - `deleteEvent()` - Removes individual events
  - `filterEvents()` - Search/filter functionality
- **Event Handlers**:
  - Apply button → sends message to content script
  - Check All → checks all visible checkboxes
  - Uncheck All → unchecks all visible checkboxes
  - Export button → downloads events file
  - Import button → triggers file picker
  - Search input → filters event list
  - Storage change → updates display

## Development

### Prerequisites

- Node.js (for any build tools, optional)
- Chrome browser
- Code editor (VS Code recommended)

### Setup Development Environment

1. Clone the repository
2. Make your changes to the source files
3. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension card
   - Refresh any open Mixpanel pages

### Debugging

#### Content Script
- Open the page console (F12 on the Mixpanel page)
- Look for `[Mixpanel Hidden Events]` log messages
- Check for errors or unexpected behavior

#### Popup
- Right-click the extension icon
- Select **"Inspect popup"**
- Look for `[Popup]` log messages
- Monitor network requests and errors

#### Background/Service Worker
- Go to `chrome://extensions/`
- Click **"Inspect views: service worker"** (if applicable)

### Common Development Tasks

#### Adding New Features

1. Determine which component needs changes (content/popup/both)
2. Make changes to the relevant files
3. Test thoroughly on Mixpanel
4. Update documentation

#### Modifying URL Parsing Logic

- Edit `extractHiddenEvents()` in `content.js`
- Edit `applyHiddenEventsToURL()` in `content.js`
- Test with various URL formats
- Check for edge cases (no events, special characters, etc.)

#### Changing UI/Styling

- Edit `popup.html` for structure
- Edit `styles.css` for appearance
- Edit `popup.js` for interactions
- Test with different screen sizes

### Testing Checklist

- [ ] Extension loads without errors
- [ ] Detects activity feed pages correctly
- [ ] Discovers new hidden events in real-time
- [ ] Checkboxes sync with URL on popup open
- [ ] "Apply Selected" correctly modifies URL
- [ ] Page reloads and Mixpanel processes changes
- [ ] "Check All" and "Uncheck All" work
- [ ] Events persist across browser sessions
- [ ] Works on different user profiles
- [ ] Handles page refresh gracefully
- [ ] Shows appropriate error messages

## Troubleshooting

### Extension Icon Not Showing
**Cause**: Icon files missing  
**Solution**: Ensure `icon16.png`, `icon48.png`, and `icon128.png` exist in the directory

### "Extension Context Invalidated" Error
**Cause**: Extension was reloaded while page was open  
**Solution**: Refresh the Mixpanel page after reloading the extension

### "Could Not Establish Connection" Error
**Cause**: Content script not loaded on the page  
**Solution**: 
1. Make sure you're on a Mixpanel activity feed page (URL contains `distinct_id=`)
2. Refresh the page
3. Check that the extension is enabled

### Events Not Applying to Page
**Cause**: Page not reloading properly  
**Solution**: The extension now forces a page reload. If still not working, manually refresh after clicking "Apply Selected"

### Checkboxes Not Syncing
**Cause**: Content script communication failure  
**Solution**: 
1. Check browser console for errors
2. Refresh the page
3. Reload the extension

### No Events Being Discovered
**Cause**: Not hiding events correctly in Mixpanel  
**Solution**: 
1. Make sure you're using Mixpanel's built-in hide feature
2. Check that URL contains `excludedEvents` after hiding
3. Look for console messages confirming discovery

### "Please Refresh the Page" Message
**Cause**: Extension updated or content script not loaded  
**Solution**: Refresh the Mixpanel page as instructed

## Technical Details

### Permissions

The extension requires:

- **`storage`** - To persist discovered events locally
- **`activeTab`** - To access current tab information
- **`scripting`** - To send messages to content scripts
- **Host permissions for `mixpanel.com`** - To inject content script and monitor pages

### Storage Schema

```javascript
{
  hiddenEvents: [
    "event_name_1",    // Auto-discovered events
    "event_name_2",
    "event_name_3"
  ],
  manualEvents: [
    "manual_event_1"   // Manually added (temporary)
  ]
}
```

Events are stored as arrays of strings in `chrome.storage.local`:
- **`hiddenEvents`**: Auto-discovered from Mixpanel URLs (persistent)
- **`manualEvents`**: Manually added via search (temporary, cleared after applying)

### URL Manipulation

The extension uses regex patterns to safely manipulate Mixpanel's URL structure:

```javascript
// Extract pattern
/excludedEvents~\(([^)]*)\)/

// Insert/replace patterns handle:
// - Adding events when none exist
// - Replacing existing events
// - Removing all events
// - Preserving other URL parameters
```

### Performance Considerations

- **Polling interval**: 500ms is a balance between responsiveness and performance
- **Storage updates**: Only saves when new events are discovered
- **URL parsing**: Regex-based for speed
- **Reload approach**: Forces page reload to ensure Mixpanel processes changes

### Browser Compatibility

- **Chrome**: ✅ Fully supported (Manifest V3)
- **Edge**: ✅ Should work (Chromium-based, Manifest V3)
- **Firefox**: ⚠️ Requires Manifest V2 adaptation
- **Safari**: ❌ Would require complete rewrite

### Security & Privacy

- **No external servers** - All data stored locally
- **No tracking** - Extension doesn't track your activity
- **Minimal permissions** - Only requests what's necessary
- **Open source** - All code is visible and auditable
- **Domain restricted** - Only runs on mixpanel.com

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

Please follow the existing code style and add comments for complex logic.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [How It Works](#how-it-works) section
3. Check browser console for error messages
4. Open an issue with details about your problem

## Changelog

### Version 1.3.0 (Current)
- ✅ **Event Timeline Tab** - Track specific events across user journeys
- ✅ Chronological timeline view with day separators
- ✅ Click timeline events to expand in Mixpanel
- ✅ Load more events with visible start date
- ✅ Event counter showing tracked instances
- ✅ Global selection persisting across users
- ✅ Fresh data always reflecting current page
- ✅ Search and filter timeline event names
- ✅ Auto-save selections

### Version 1.2.0
- ✅ **Filter Properties Tab** - Track user properties
- ✅ Automatic property discovery
- ✅ Instant value display for selected properties
- ✅ Missing property detection
- ✅ Formatted property names
- ✅ Quick copy for names and values
- ✅ Export/Import properties
- ✅ Tab system for organized interface

### Version 1.1.0
- ✅ Rebranded to "Mixpanel Quickhide"
- ✅ Export events to `.txt` file
- ✅ Import events from `.txt` file (replace or merge)
- ✅ Manual event addition via search
- ✅ Delete individual events
- ✅ Search and filter events
- ✅ Selection count display
- ✅ Context-aware "Open Mixpanel" button
- ✅ Icon buttons in header (Export, Import, Clear All)

### Version 1.0.0
- ✅ Initial release
- ✅ Automatic event detection and storage
- ✅ Checkbox interface with sync
- ✅ URL modification with page reload
- ✅ Check All / Uncheck All buttons
- ✅ Real-time URL monitoring
- ✅ Smart content script detection
- ✅ Helpful error messages
- ✅ Status indicators

## Future Enhancements

Potential features for future versions:
- Event categories/tags
- Different profiles/presets
- Keyboard shortcuts
- Event usage statistics
- Dark mode
- Bulk edit operations
- Event name aliases

---

**Made with ❤️ to make Mixpanel workflows more efficient**
