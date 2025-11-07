# Google Analytics 4 Setup Guide

This guide explains how to set up Google Analytics 4 (GA4) for the Mixpanel Activity Navigator Chrome extension using the Measurement Protocol API.

## Why Google Analytics 4?

GA4 works perfectly with Chrome extensions because:
- **No external scripts needed** - Uses direct HTTP API calls
- **No CSP violations** - Doesn't require loading JavaScript from CDNs
- **Privacy-friendly** - You control what data is sent
- **Free and powerful** - Full analytics dashboard included

## Setup Steps

### 1. Create a Google Analytics 4 Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon in bottom left)
3. Click **Create Property**
4. Enter property details:
   - Property name: "Mixpanel Activity Navigator"
   - Time zone: Your timezone
   - Currency: Your currency
5. Click **Next** and complete the setup

### 2. Create a Data Stream

1. In your new property, click **Data Streams**
2. Click **Add stream** → **Web**
3. Enter:
   - Website URL: `chrome-extension://your-extension-id` (or use a placeholder)
   - Stream name: "Chrome Extension"
4. Click **Create stream**
5. **Copy the Measurement ID** (looks like `G-XXXXXXXXXX`)

### 3. Generate API Secret

1. In your Data Stream, scroll down to **Measurement Protocol API secrets**
2. Click **Create**
3. Enter:
   - Nickname: "Chrome Extension"
4. Click **Create**
5. **Copy the Secret value** (you won't be able to see it again!)

### 4. Configure the Extension

1. Open `src/analytics.js`
2. Replace the configuration values:

```javascript
const ANALYTICS_CONFIG = {
  MEASUREMENT_ID: 'G-XXXXXXXXXX',  // Your Measurement ID from step 2
  API_SECRET: 'your_api_secret',    // Your API Secret from step 3
  ENABLED: true,
  DEBUG: false  // Set to true to see console logs
};
```

### 5. Test the Integration

1. Set `DEBUG: true` in the config
2. Reload the extension in Chrome
3. Open the extension popup
4. Check the browser console - you should see "Analytics event sent: popup_opened 204"
5. Go to GA4 → Reports → Realtime
6. You should see the event appear within a few seconds!

## What Gets Tracked

Currently tracking:
- **popup_opened** - When user opens the extension popup

Event parameters include:
- `extension_version` - Current version
- `extension_name` - "Mixpanel Activity Navigator"
- `session_id` - Unique session identifier
- `timestamp` - ISO timestamp

## Viewing Your Data

### Real-time Reports
1. Go to GA4 → **Reports** → **Realtime**
2. See events as they happen

### Event Reports
1. Go to GA4 → **Reports** → **Engagement** → **Events**
2. See all tracked events and their counts

### Custom Reports
1. Go to GA4 → **Explore**
2. Create custom reports and funnels

## Privacy Considerations

✅ **Privacy-friendly implementation:**
- No cookies used
- No personal information collected
- Anonymous client IDs
- No IP tracking
- User can disable analytics by setting `ENABLED: false`

## Troubleshooting

### Events not appearing in GA4

1. **Wait 5-10 minutes** - Real-time can be delayed
2. **Check DEBUG mode** - Set `DEBUG: true` and check console
3. **Verify credentials** - Double-check Measurement ID and API Secret
4. **Check network tab** - Look for requests to `google-analytics.com`
5. **Verify response** - Should get HTTP 204 (success)

### CSP Errors

If you see Content Security Policy errors:
- Make sure you're NOT loading GA4 JavaScript (gtag.js)
- We use Measurement Protocol API (direct HTTP) instead
- No external scripts should be loaded

### Common Errors

**"Failed to track event"**
- Check that `host_permissions` includes Google Analytics in manifest.json
- Verify API credentials are correct

**"Analytics disabled"**
- Check `ENABLED: true` in config
- Make sure analytics.js is loading properly

## Adding More Events

To track additional events, use:

```javascript
// In popup.js or content.js
if (window.ExtensionAnalytics) {
  ExtensionAnalytics.trackEvent('event_name', {
    custom_param: 'value',
    another_param: 123
  });
}
```

Event names should be lowercase with underscores (GA4 format).

## Cost

Google Analytics 4 is **completely free** for standard usage. The extension will generate minimal events, well within free tier limits.

## Support

- [GA4 Measurement Protocol Documentation](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [GA4 Help Center](https://support.google.com/analytics/)
- Check browser console for debug logs
