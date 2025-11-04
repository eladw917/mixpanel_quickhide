# Deployment Guide - Mixpanel Quickhide v1.1.0

## 🚀 Quick Deploy

### For Personal Use
1. Load extension in Chrome (see below)
2. Navigate to Mixpanel
3. Start using!

### For Team Distribution
1. Create release package (see below)
2. Share ZIP file with team
3. Team loads extension
4. Share events file via Export/Import

---

## 📦 Creating Release Package

### Step 1: Prepare Files
```bash
cd /Users/eladweller/dev/mixpanel_hide_events

# Clean up any temp files
rm -f *.log
rm -f mixpanel_events.txt
```

### Step 2: Create ZIP
```bash
# Create release directory
mkdir -p releases/v1.1.0

# Copy necessary files
cp manifest.json releases/v1.1.0/
cp content.js releases/v1.1.0/
cp popup.html releases/v1.1.0/
cp popup.js releases/v1.1.0/
cp styles.css releases/v1.1.0/
cp *.png releases/v1.1.0/
cp README.md releases/v1.1.0/
cp LICENSE releases/v1.1.0/

# Create ZIP
cd releases/v1.1.0
zip -r ../mixpanel-quickhide-v1.1.0.zip .
cd ../..
```

### Step 3: Test ZIP
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the unzipped folder
5. Test all functionality

---

## 🔧 Loading in Chrome (Development)

### First Time Setup
1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" toggle (top right)
4. Click "Load unpacked"
5. Select `/Users/eladweller/dev/mixpanel_hide_events`
6. Extension icon appears in toolbar

### After Code Changes
1. Go to `chrome://extensions/`
2. Find "Mixpanel Quickhide"
3. Click refresh icon ↻
4. Refresh any open Mixpanel pages
5. Test changes

---

## 📤 Distributing to Team

### Option 1: Direct File Sharing
1. Create ZIP package (see above)
2. Share via email/Slack/Drive
3. Recipients follow "Loading in Chrome" steps with ZIP

### Option 2: GitHub Release
```bash
git tag v1.1.0
git push origin v1.1.0
```
Create GitHub release with:
- Tag: v1.1.0
- Title: Mixpanel Quickhide v1.1.0
- Description: See VERSION_1.1.0_SUMMARY.md
- Attachment: ZIP file

### Option 3: Chrome Web Store (Future)
Requirements:
- Developer account ($5 one-time fee)
- Store listing with screenshots
- Privacy policy
- Support email

---

## 🧪 Pre-Deployment Testing

### Functional Tests
- [ ] Load extension fresh
- [ ] Navigate to Mixpanel users page
- [ ] Hide an event in Mixpanel
- [ ] Verify event appears in extension
- [ ] Check all events
- [ ] Click "Apply Selected"
- [ ] Verify events hidden in new profile
- [ ] Test Export functionality
- [ ] Test Import functionality (both Replace and Merge)
- [ ] Test Search and filter
- [ ] Test Manual add
- [ ] Test Delete event
- [ ] Test Clear All (trash icon)

### UI Tests
- [ ] All buttons clickable
- [ ] Icon buttons show labels
- [ ] Tooltips display
- [ ] Notifications appear
- [ ] Checkboxes respond
- [ ] Search clears correctly
- [ ] All three inactive states work

### Edge Cases
- [ ] Empty events list
- [ ] 100+ events
- [ ] Events with special characters
- [ ] Rapid checkbox toggling
- [ ] Extension reload mid-session
- [ ] Multiple browser tabs

---

## 📋 Deployment Checklist

### Pre-Deploy
- [ ] All tests pass
- [ ] No console errors
- [ ] Version updated in manifest.json
- [ ] Documentation updated
- [ ] CHANGELOG updated in README.md
- [ ] Git committed
- [ ] Git tagged

### Package
- [ ] ZIP created
- [ ] ZIP tested
- [ ] Release notes prepared
- [ ] Screenshots captured (if needed)

### Deploy
- [ ] ZIP shared with team OR
- [ ] Published to store
- [ ] Team notified
- [ ] Support channel ready

### Post-Deploy
- [ ] Monitor for issues
- [ ] Collect feedback
- [ ] Document any bugs
- [ ] Plan next iteration

---

## 🔐 Security Considerations

### What Data is Stored
- Event names (strings)
- User preferences (checkboxes)
- Nothing sensitive or personal

### Where Data is Stored
- Chrome local storage (on user's machine)
- Never sent to external servers
- Not synced across devices (unless exported manually)

### Permissions Requested
- `storage` - To save events
- `activeTab` - To read current tab URL
- `scripting` - To inject content script
- `*://mixpanel.com/*` - To access Mixpanel pages only

### Privacy
- No tracking
- No analytics
- No external API calls
- All data local to user's browser

---

## 🆘 Troubleshooting Deployment

### Issue: Extension won't load
**Solution:**
- Check manifest.json syntax (use JSON validator)
- Ensure all files present
- Check Chrome console for errors

### Issue: Icons missing
**Solution:**
- Verify icon files exist
- Check file names match manifest
- Regenerate icons if needed

### Issue: Content script not working
**Solution:**
- Check matches pattern in manifest
- Verify user is on correct URL
- Refresh Mixpanel page after loading

### Issue: Team can't load extension
**Solution:**
- Ensure they enable Developer mode
- Provide clear instructions
- Share screenshots of steps
- Consider recorded video walkthrough

---

## 📊 Success Metrics

### User Adoption
- Number of users who installed
- Number of active users (weekly)
- Events per user (average)

### Usage Patterns
- Most commonly hidden events
- Export/Import usage frequency
- Search feature usage

### Feedback
- Bug reports
- Feature requests
- User satisfaction

---

## 🔄 Update Process

### For Minor Updates (1.1.x)
1. Make changes in code
2. Update version in manifest.json
3. Test thoroughly
4. Create new ZIP
5. Share updated package
6. Users reload extension

### For Major Updates (1.x.0 or 2.0.0)
1. Plan breaking changes
2. Update documentation
3. Test extensively
4. Create migration guide if needed
5. Announce update in advance
6. Provide clear upgrade instructions

---

## 📞 Support Plan

### User Support
- Provide README.md for self-service
- Provide QUICK_START.md for quick reference
- Designate support contact (email/Slack)
- Create FAQ based on common questions

### Bug Reports
- Create GitHub Issues OR
- Use shared Slack channel OR
- Email bug reports
- Track in spreadsheet

### Feature Requests
- Collect in shared doc
- Prioritize based on:
  - User impact
  - Implementation effort
  - Alignment with vision
- Plan for future releases

---

## 🎯 Rollout Strategy

### Phase 1: Alpha (1-2 users)
- Load on your machine
- Use in real workflow for 1 week
- Fix critical bugs
- Refine UX based on personal use

### Phase 2: Beta (Small team, 5-10 users)
- Share with close teammates
- Collect feedback
- Fix bugs
- Improve documentation

### Phase 3: Team Release (Full team)
- Announce in team meeting/Slack
- Share installation guide
- Offer hands-on help
- Monitor usage and feedback

### Phase 4: Company-Wide (If applicable)
- Polish based on team feedback
- Create video tutorial
- Announce broadly
- Provide support channel

---

## 📝 Release Notes Template

```markdown
# Mixpanel Quickhide v1.1.0

## What's New
- Export/Import events for team sharing
- Search and filter events
- Manual event addition
- Individual event deletion
- Icon button header
- Selection counter

## Improvements
- Better UI layout
- Context-aware navigation
- Improved error handling
- Comprehensive documentation

## Bug Fixes
- Fixed checkbox state preservation
- Fixed URL corruption on clear
- Fixed extension reload issues

## Installation
1. Download mixpanel-quickhide-v1.1.0.zip
2. Extract to folder
3. Load in Chrome (chrome://extensions/)
4. Enable Developer mode
5. Click "Load unpacked"
6. Select extracted folder

## Need Help?
- See README.md for full documentation
- See QUICK_START.md for quick reference
- Contact: [your-email@example.com]
```

---

## ✅ Go-Live Checklist

- [ ] All code tested
- [ ] Documentation complete
- [ ] ZIP package created
- [ ] ZIP tested on fresh Chrome profile
- [ ] Release notes prepared
- [ ] Distribution method chosen
- [ ] Support plan in place
- [ ] Team notified
- [ ] Installation guide shared
- [ ] Feedback mechanism ready

---

**Ready to deploy! 🚀**

*Good luck with your release!*
