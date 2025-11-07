// Analytics configuration for Mixpanel Activity Navigator
// Location: src/analytics.js

// Configuration - Replace with your Google Analytics 4 credentials
const ANALYTICS_CONFIG = {
  // TODO: Replace with your GA4 Measurement ID (G-XXXXXXXXXX)
  MEASUREMENT_ID: 'G-TDP2TFGSGC',
  // TODO: Replace with your GA4 API Secret (from GA4 Admin > Data Streams > Measurement Protocol API secrets)
  API_SECRET: 'oFhiTpttS3yXyvog660t9A',
  // Enable/disable analytics globally
  ENABLED: true,
  // Debug mode for development
  DEBUG: true
};

// Initialize analytics
function initializeAnalytics() {
  if (!ANALYTICS_CONFIG.ENABLED) {
    console.log('Analytics disabled');
    return false;
  }

  try {
    // Get or create client ID
    chrome.storage.local.get(['analytics_client_id'], (result) => {
      let clientId = result.analytics_client_id;
      if (!clientId) {
        clientId = generateClientId();
        chrome.storage.local.set({ analytics_client_id: clientId });
      }
    });

    if (ANALYTICS_CONFIG.DEBUG) {
      console.log('Analytics initialized');
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    return false;
  }
}

// Generate a unique client ID for Google Analytics
function generateClientId() {
  return 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Track custom events using Google Analytics 4 Measurement Protocol
async function trackEvent(eventName, properties = {}, useBeacon = false) {
  if (!ANALYTICS_CONFIG.ENABLED) {
    return;
  }

  try {
    // Get client ID from storage
    const result = await chrome.storage.local.get(['analytics_client_id']);
    const clientId = result.analytics_client_id || generateClientId();

    // Get extension version
    const extensionVersion = chrome.runtime.getManifest().version;

    // Prepare GA4 Measurement Protocol payload
    const payload = {
      client_id: clientId,
      events: [{
        name: eventName.toLowerCase().replace(/\s+/g, '_'), // GA4 event name format
        params: {
          extension_version: extensionVersion,
          extension_name: 'Mixpanel Activity Navigator',
          session_id: getSessionId(),
          timestamp: new Date().toISOString(),
          ...properties
        }
      }]
    };

    // Send to GA4 Measurement Protocol
    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${ANALYTICS_CONFIG.MEASUREMENT_ID}&api_secret=${ANALYTICS_CONFIG.API_SECRET}`;
    
    if (useBeacon) {
      // Use sendBeacon for events that fire during page unload (more reliable)
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const sent = navigator.sendBeacon(url, blob);
      console.log('[GA4] Event sent via beacon:', eventName, '| Properties:', properties, '| Sent:', sent);
    } else {
      // Use fetch for normal events
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Always log events sent to GA4
      console.log('[GA4] Event sent:', eventName, '| Properties:', properties, '| Status:', response.status);
      
      if (ANALYTICS_CONFIG.DEBUG) {
        console.log('[GA4] Full payload:', payload);
      }
    }
  } catch (error) {
    console.error('Failed to track event:', eventName, error);
  }
}

// Track errors with context
async function trackError(error, context = {}) {
  await trackEvent('extension_error', {
    error_message: error.message || error.toString(),
    error_stack: error.stack,
    error_type: error.name || 'UnknownError',
    context: JSON.stringify(context)
  });
}

// Track performance metrics
async function trackPerformance(metricName, value, additionalData = {}) {
  await trackEvent('performance_metric', {
    metric_name: metricName,
    metric_value: value,
    ...additionalData
  });
}

// Get or create session ID
function getSessionId() {
  const sessionKey = 'analytics_session_id';
  let sessionId = sessionStorage.getItem(sessionKey);
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(sessionKey, sessionId);
  }
  return sessionId;
}

// Export functions for use in other scripts
window.ExtensionAnalytics = {
  initialize: initializeAnalytics,
  trackEvent: trackEvent,
  trackError: trackError,
  trackPerformance: trackPerformance,
  getSessionId: getSessionId
};
