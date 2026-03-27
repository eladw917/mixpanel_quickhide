// Background script for Mixpanel Activity Navigator
// Location: src/background.js
//
// Handles immediate badge updates when navigating between pages

// Set notification badge on extension icon
async function setBadge(text, backgroundColor, textColor) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: backgroundColor });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: textColor });
    }
  } catch (error) {
    console.error('[Background] Error setting badge:', error);
  }
}

// Clear notification badge from extension icon
async function clearBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (error) {
    console.error('[Background] Error clearing badge:', error);
  }
}

// Check if a tab is on an active Mixpanel activity feed page
async function isActiveMixpanelPage(tabId) {
  try {
    if (!tabId) return false;

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return false;

    // Check if on activity feed page (must have distinct_id in URL)
    const isActivityFeed = tab.url.includes('mixpanel.com/project/') &&
                          tab.url.includes('/app/profile') &&
                          tab.url.includes('distinct_id=');

    if (!isActivityFeed) {
      return false;
    }

    // Check if content script is loaded and responding
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'getCurrentEvents'
      });
      return response !== undefined;
    } catch (error) {
      // Content script not loaded or not responding
      return false;
    }
  } catch (error) {
    console.error('[Background] Error checking tab:', error);
    return false;
  }
}

// Update badge for the currently active tab
async function updateBadgeForActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab && await isActiveMixpanelPage(activeTab.id)) {
      setBadge('!', '#4CAF50', '#FFFFFF');
    } else {
      clearBadge();
    }
  } catch (error) {
    console.error('[Background] Error updating badge:', error);
    clearBadge();
  }
}

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await updateBadgeForActiveTab();
});

// Listen for tab updates (when user navigates within a tab)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when the URL changes or the tab becomes complete
  if (changeInfo.status === 'complete' || changeInfo.url) {
    // Check if this is the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].id === tabId) {
      await updateBadgeForActiveTab();
    }
  }
});

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    await updateBadgeForActiveTab();
  }
});

// Initialize badge on startup
chrome.runtime.onStartup.addListener(async () => {
  await updateBadgeForActiveTab();
});

// Initialize badge when extension is installed/updated
chrome.runtime.onInstalled.addListener(async () => {
  await updateBadgeForActiveTab();
});
