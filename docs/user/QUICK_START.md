# Mixpanel Activity Navigator - Quick Start Guide

**Version:** 1.3.0  
**Three Powerful Tabs:** Feed Cleaner | Property Finder | Quick Timeline

## 🚀 Installation (2 minutes)

1. **Load the Extension**:
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select this folder

2. **Done!** The extension icon will appear in your toolbar.

## 📖 First Use

### 🎯 Feed Cleaner Tab

#### Step 1: Let the Extension Learn Events

1. Go to a Mixpanel user profile:
   ```
   mixpanel.com/project/[ID]/view/[ID]/app/profile#distinct_id=...
   ```

2. Hide some events using Mixpanel's interface:
   - Right-click event → Hide
   - Or use the event menu

3. The extension **automatically saves** these events!

#### Step 2: Use Saved Events on Other Profiles

1. Navigate to a different user's profile
2. Click the extension icon → **Feed Cleaner** tab
3. Check which events you want to hide
4. Click **"Apply Selected"**
5. Page reloads with events hidden! ✨

### 👤 Property Finder Tab

#### Step 1: Automatic Property Discovery

1. Visit any Mixpanel user profile
2. Extension automatically discovers all user properties
3. Properties appear in the **Property Finder** tab

#### Step 2: View Properties You Care About

1. Click the extension icon → **Property Finder** tab
2. Check properties you want to track (e.g., City, Age, Email)
3. Values appear instantly at the top!
4. Missing properties show in **red**

## 🎯 Quick Actions

### Feed Cleaner Tab
| Button | What It Does |
|--------|--------------|
| **Apply Selected** | Hide checked events in current profile (page reloads) |
| **Check All** | Select all visible events |
| **Uncheck All** | Deselect all visible events |
| **📥 Export** | Download all events to `.txt` file |
| **📤 Import** | Load events from `.txt` file (replace or merge) |
| **🗑️ Clear** | Delete all events from database |
| **Search** | Filter events by name |
| **× (delete)** | Remove individual events from list |

### Property Finder Tab
| Button | What It Does |
|--------|--------------|
| **Check/Uncheck** | Auto-saves, shows values instantly |
| **📥 Export** | Download selected properties to `.txt` file |
| **📤 Import** | Load properties from file (adds to DB and selects) |
| **🗑️ Clear** | Delete all properties from database |
| **Search** | Filter properties by name |
| **📋 Copy** (values) | Copy property value to clipboard |
| **📋 Copy** (names) | Copy formatted property name |
| **× Remove** (values) | Unselect property |
| **× Delete** (names) | Remove property from database |

### Quick Timeline Tab
| Button | What It Does |
|--------|--------------|
| **Check/Uncheck events** | Select events to track, auto-saves |
| **Timeline events** | Click to expand in Mixpanel activity feed |
| **Load more since [date]** | Load older events from Mixpanel |
| **🗑️ Clear** | Uncheck all selected events |
| **Search** | Filter event names |
| **📥 Export/📤 Import** | Disabled (not applicable for timeline) |

## 💡 Pro Tips

### For Feed Cleaner
1. **Check All once**: Hide all events across all users with one click
2. **Checkboxes sync**: They show what's currently hidden on the page
3. **Real-time detection**: Hide new events in Mixpanel, they're auto-added to the list
4. **Manual events**: Search for an event → "Add manually" → temporary until applied
5. **Share with team**: Export events and share the `.txt` file with teammates

### For Property Finder
1. **Instant updates**: Check a property, see its value immediately
2. **Missing data**: Red text shows which properties aren't on current profile
3. **Formatted names**: Hover to see original names (e.g., `$city`)
4. **Quick copy**: Hover over values to copy them
5. **Search both**: Search works on both original and formatted names
6. **Share standards**: Export property lists so team tracks same attributes
7. **Works offline**: Everything stored locally, no internet needed

### For Quick Timeline
1. **Global selection**: Selected events apply to all users automatically
2. **Click to expand**: Click timeline events to open them in Mixpanel
3. **Fresh data**: Event list always reflects current page state
4. **Day separators**: Timeline grouped by day for easy scanning
5. **Load more**: Button shows timeline start date
6. **Track journeys**: Focus on key events to understand user flows
7. **Event count**: See exactly how many instances are tracked

## ⚠️ Common Issues

### "Please refresh the page" message
**Fix**: Refresh the Mixpanel page (F5 or Cmd+R)

### Extension icon grayed out
**Why**: You're not on a user activity page (needs `distinct_id` in URL)

### Events not applying
**Fix**: Make sure to wait for the page to reload after clicking "Apply Selected"

## 🔧 After Updating Extension

Whenever you reload the extension:
1. Go to `chrome://extensions/`
2. Click the refresh icon ↻ on the extension
3. **Refresh all open Mixpanel pages** (important!)

## 📚 Need More Help?

See the full [README.md](README.md) for:
- Detailed architecture
- Development guide  
- Troubleshooting
- Technical details

---

**That's it! Start hiding events efficiently! 🎉**
