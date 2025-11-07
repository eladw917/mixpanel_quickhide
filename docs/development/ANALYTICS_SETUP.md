# Mixpanel Analytics Setup Guide

This guide explains how to set up Mixpanel analytics for the Mixpanel Activity Navigator Chrome extension.

## Overview

The extension now includes comprehensive analytics tracking to understand user behavior and improve the product. Analytics are implemented using Mixpanel and track various user interactions while respecting privacy.

## Setup Steps

### 1. Create a Mixpanel Project

1. Go to [Mixpanel](https://mixpanel.com/) and sign in (or create an account)
2. Click "Create Project"
3. Name your project (e.g., "Mixpanel Activity Navigator Analytics")
4. Choose your timezone and save

### 2. Get Your Project Token

1. In your Mixpanel project, go to **Settings** → **Project Settings**
2. Copy the **Project Token** (it looks like a long string of letters and numbers)

### 3. Configure the Extension

1. Open `src/analytics.js` in your code editor
2. Find this line:
   ```javascript
   TOKEN: 'YOUR_MIXPANEL_PROJECT_TOKEN',
   ```
3. Replace `'YOUR_MIXPANEL_PROJECT_TOKEN'` with your actual token:
   ```javascript
   TOKEN: 'abcd1234567890abcdef1234567890ab',
   ```

### 4. Deploy the Extension

1. Reload the extension in Chrome
2. The analytics will start tracking automatically

## What Gets Tracked

### User Identification
- Each extension installation gets a unique ID
- Tracks extension version, Chrome version, and platform
- No personally identifiable information is collected

### Events Tracked

#### Popup Interactions
- **Popup Opened**: When user clicks extension icon

#### Error Tracking (Framework Available)
- **Extension Error**: Any errors that occur in the extension (framework available but not currently used)
- Includes error type, message, and context

#### Performance Tracking (Framework Available)
- **Performance Metric**: Custom performance measurements (framework available but not currently used)

### Privacy Considerations

- Event names and property names are limited to first 10 items for privacy
- URLs are truncated to base domain only
- No user-specific Mixpanel data is sent to analytics
- All tracking is opt-out (can be disabled in config)

## Configuration Options

In `src/analytics.js`, you can modify these settings:

```javascript
const MIXPANEL_CONFIG = {
  TOKEN: 'your_project_token',  // Your Mixpanel project token
  ENABLED: true,                // Set to false to disable analytics
  DEBUG: false                  // Set to true for debug logging
};
```

## Testing Analytics

### Enable Debug Mode

1. Set `DEBUG: true` in `src/analytics.js`
2. Reload the extension
3. Open browser console to see analytics events

### View Events in Mixpanel

1. Go to your Mixpanel project dashboard
2. Events should appear in real-time (may take a few minutes)
3. Use the **Events** tab to see what events are being tracked

## Event Properties

All events include these common properties:
- `extension_version`: Current version of the extension
- `extension_name`: "Mixpanel Activity Navigator"
- `chrome_version`: User's Chrome version
- `platform`: User's operating system
- `timestamp`: When the event occurred
- `session_id`: Unique session identifier

## Troubleshooting

### Analytics Not Working

1. Check that `MIXPANEL_CONFIG.TOKEN` is set correctly
2. Verify `MIXPANEL_CONFIG.ENABLED` is `true`
3. Check browser console for errors
4. Ensure the extension has network access

### No Events in Mixpanel

1. Wait 5-10 minutes for events to appear
2. Check if you're looking at the correct project
3. Verify the token is for the correct project
4. Check browser network tab for failed requests to `cdn.mxpnl.com`

### Privacy Compliance

- The analytics implementation follows privacy best practices
- No sensitive user data is collected
- Users are not individually identifiable
- Analytics can be completely disabled if needed

## Support

For questions about analytics setup:
1. Check this documentation
2. Review Mixpanel's documentation
3. Check browser console for errors
4. Create an issue in the project repository
