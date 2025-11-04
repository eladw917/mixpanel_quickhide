# Mixpanel Quickhide - Quick Start Guide

## 🚀 Installation (2 minutes)

1. **Load the Extension**:
   - Open Chrome → `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select this folder

2. **Done!** The extension icon will appear in your toolbar.

## 📖 First Use

### Step 1: Let the Extension Learn Events

1. Go to a Mixpanel user profile:
   ```
   mixpanel.com/project/[ID]/view/[ID]/app/profile#distinct_id=...
   ```

2. Hide some events using Mixpanel's interface:
   - Right-click event → Hide
   - Or use the event menu

3. The extension **automatically saves** these events!

### Step 2: Use Saved Events on Other Profiles

1. Navigate to a different user's profile
2. Click the extension icon
3. Check which events you want to hide
4. Click **"Apply Selected"**
5. Page reloads with events hidden! ✨

## 🎯 Quick Actions

| Button | What It Does |
|--------|--------------|
| **Apply Selected** | Hide checked events in current profile (page reloads) |
| **Check All** | Select all visible events |
| **Uncheck All** | Deselect all visible events |
| **📥 Export Events** | Download events to `.txt` file (shareable!) |
| **📤 Import Events** | Load events from `.txt` file (replace or merge) |
| **Search** | Filter events by name |
| **× (delete)** | Remove individual events from list |

## 💡 Pro Tips

1. **Check All once**: Hide all events across all users with one click
2. **Checkboxes sync**: They show what's currently hidden on the page
3. **Real-time detection**: Hide new events in Mixpanel, they're auto-added to the list
4. **Works offline**: Events are stored locally, no internet needed
5. **Share with team**: Export events and share the `.txt` file with teammates
6. **Use search**: Type to quickly find events (if not found, add manually!)
7. **Manual events**: Search for an event → "Add manually" → temporary until applied
8. **Clean up**: Hover over events to see delete button (×)

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
