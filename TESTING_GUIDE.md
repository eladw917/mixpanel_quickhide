# Testing Guide - Style Updates

## How to Test the Updated Extension

### 1. Load the Extension in Chrome/Edge

#### Option A: Load from `src` directory
1. Open Chrome/Edge
2. Navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `/Users/eladweller/dev/mixpanel_hide_events/src` directory

#### Option B: Load from `mixpanel-activity-navigator` directory
1. Follow same steps as Option A
2. Select the `/Users/eladweller/dev/mixpanel_hide_events/mixpanel-activity-navigator/src` directory

### 2. Visual Checks

#### Header
- [ ] Background is Mixpanel purple (#4F45E0)
- [ ] Title uses HK Grotesk font
- [ ] Icon buttons have proper hover states

#### Tabs
- [ ] Tab navigation has light gray background (#F6F6F6)
- [ ] Active tab shows purple underline (#4F45E0)
- [ ] Tab labels use HK Grotesk font

#### Feed Cleaner Tab
- [ ] "Events to hide from feed" headline is purple (#4F45E0)
- [ ] Search bar has light gray background (#F6F6F6)
- [ ] Search bar focus shows purple border (#4F45E0)
- [ ] Event text is dark gray (#505055)
- [ ] "Hide Selected" button is purple (#4F45E0)
- [ ] Secondary buttons have proper styling

#### Property Finder Tab
- [ ] Headlines are purple (#4F45E0)
- [ ] Property names are purple (#4F45E0)
- [ ] Property values are dark gray (#505055)
- [ ] Search bar matches Feed Cleaner styling

#### Quick Timeline Tab
- [ ] Timeline headline is purple (#4F45E0)
- [ ] Day separators are purple (#4F45E0)
- [ ] Event names are dark gray (#505055)
- [ ] Hover state shows light purple background (#e8e6fc)
- [ ] Search bar matches other tabs

### 3. Font Verification

Open browser DevTools (F12) and:
1. Click on any text element
2. Check Computed styles
3. Verify `font-family` shows "HK Grotesk"

### 4. Functional Testing

Ensure the style changes didn't break functionality:
- [ ] Can select/deselect events
- [ ] Search functionality works
- [ ] Buttons respond to clicks
- [ ] Tabs switch properly
- [ ] Timeline displays correctly
- [ ] Properties can be highlighted

### 5. Browser Console Check

1. Open DevTools Console (F12)
2. Look for any errors related to:
   - Font loading failures
   - CSS parsing errors
   - Resource loading issues

### 6. Accessibility Check

- [ ] Text contrast is sufficient (WCAG AA standard)
- [ ] Hover states are visible
- [ ] Focus states are clear
- [ ] All interactive elements are distinguishable

## Expected Results

### Colors
- **Purple (#4F45E0)**: Headers, headlines, primary buttons, active states
- **Light Gray (#F6F6F6)**: Search bars, tab navigation
- **Dark Gray (#505055)**: All text content

### Typography
- All text should render in HK Grotesk
- Fallback to system fonts if HK Grotesk fails to load

## Troubleshooting

### Font Not Loading
1. Check browser console for 404 errors
2. Verify font files exist in `src/assets/fonts/`
3. Check manifest.json has `web_accessible_resources` entry
4. Try reloading the extension

### Colors Not Updating
1. Clear browser cache
2. Reload the extension
3. Check if CSS file was properly updated
4. Verify no inline styles are overriding

### Extension Not Working
1. Check browser console for JavaScript errors
2. Verify all files are in correct locations
3. Check manifest.json is valid JSON
4. Try removing and re-adding the extension

## Performance Check

- [ ] Extension loads quickly
- [ ] No lag when switching tabs
- [ ] Search is responsive
- [ ] Scrolling is smooth

## Cross-Browser Testing

Test in multiple browsers:
- [ ] Chrome (latest)
- [ ] Edge (latest)
- [ ] Brave (if available)

## Final Checklist

- [ ] All visual elements match Mixpanel brand
- [ ] HK Grotesk font is loading
- [ ] No console errors
- [ ] All functionality works as expected
- [ ] Performance is acceptable
- [ ] Accessibility standards met

## Notes

If you find any issues, document:
1. What you were doing
2. What you expected to happen
3. What actually happened
4. Browser and version
5. Any console errors

