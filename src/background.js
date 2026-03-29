// Background script for Mixpanel Activity Navigator
// Location: src/background.js
//
// Handles immediate badge updates when navigating between pages

const ACTIVE_BADGE_TEXT = '!';
const ACTIVE_BADGE_BACKGROUND = '#4CAF50';
const ACTIVE_BADGE_TEXT_COLOR = '#FFFFFF';

// Set notification badge on extension icon (always per-tab to avoid global leaks)
async function setBadge(tabId) {
  if (typeof tabId !== 'number') return;
  try {
    await chrome.action.setBadgeText({ tabId, text: ACTIVE_BADGE_TEXT });
    await chrome.action.setBadgeBackgroundColor({ tabId, color: ACTIVE_BADGE_BACKGROUND });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ tabId, color: ACTIVE_BADGE_TEXT_COLOR });
    }
  } catch (error) {
    // Tab may have been closed
  }
}

// Clear notification badge on extension icon (per-tab)
async function clearBadge(tabId) {
  if (typeof tabId !== 'number') return;
  try {
    await chrome.action.setBadgeText({ tabId, text: '' });
  } catch (error) {
    // Tab may have been closed
  }
}

// Ensure the global (default) badge is always empty so new tabs never inherit stale state
async function clearGlobalBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (error) {
    // Ignore
  }
}

// Check if a tab is on an active Mixpanel activity feed page
async function isActiveMixpanelPage(tabId) {
  try {
    if (!tabId) return false;

    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return false;

    const isOnMixpanel = tab.url.includes('mixpanel.com/project/');
    if (!isOnMixpanel) {
      return false;
    }

    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'getSidebarViewMode'
      });
      return !!(response && (response.mode === 'activities' || response.mode === 'properties'));
    } catch (error) {
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
    if (!activeTab) return;

    if (await isActiveMixpanelPage(activeTab.id)) {
      await setBadge(activeTab.id);
    } else {
      await clearBadge(activeTab.id);
    }
  } catch (error) {
    console.error('[Background] Error updating badge:', error);
  }
}

// Allow content scripts to push immediate badge updates on sidebar open/close.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'setBadgeActive') return;

  const tabId = sender?.tab?.id;
  if (typeof tabId !== 'number') {
    sendResponse({ success: false });
    return;
  }

  if (request.active) {
    setBadge(tabId).then(() => sendResponse({ success: true }));
  } else {
    clearBadge(tabId).then(() => sendResponse({ success: true }));
  }
  return true;
});

// Clear badge immediately when a new tab is created so it never flashes
chrome.tabs.onCreated.addListener(async (tab) => {
  await clearBadge(tab.id);
});

// Listen for tab activation (when user switches tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await clearBadge(activeInfo.tabId);
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

// Initialize badge on startup — clear global first
chrome.runtime.onStartup.addListener(async () => {
  await clearGlobalBadge();
  await updateBadgeForActiveTab();
});

// Initialize badge when extension is installed/updated — clear global first
chrome.runtime.onInstalled.addListener(async () => {
  await clearGlobalBadge();
  await updateBadgeForActiveTab();
});
