// Shared UI helpers for Mixpanel Activity Navigator
// Location: src/popup/ui.js

let activeTabName = 'filterEvents';

function updateSidebarTabAvailability() {
  const timelineBtn = document.querySelector('.tab-btn[data-tab="eventTimeline"]');
  const propertiesBtn = document.querySelector('.tab-btn[data-tab="filterProperties"]');
  const timelineInactiveCta = document.getElementById('timelineInactiveCta');
  const propertiesInactiveCta = document.getElementById('propertiesInactiveCta');
  const timelineDisplaySection = document.querySelector('#eventTimelineTab .timeline-display-section');
  const eventSelectionSection = document.querySelector('#eventTimelineTab .event-selection-section');
  const loadMoreWrap = document.getElementById('loadMoreEventsBtn')?.parentElement;
  const timelineFilterActions = document.querySelector('.timeline-filter-actions');
  const propertiesSections = document.querySelectorAll('#filterPropertiesTab .section, #filterPropertiesTab .footer');

  if (!timelineBtn || !propertiesBtn) return;

  timelineBtn.disabled = false;
  propertiesBtn.disabled = false;
  if (timelineInactiveCta) timelineInactiveCta.style.display = 'none';
  if (propertiesInactiveCta) propertiesInactiveCta.style.display = 'none';
  if (timelineDisplaySection) timelineDisplaySection.style.display = 'flex';
  if (eventSelectionSection) eventSelectionSection.style.display = 'flex';
  if (loadMoreWrap) loadMoreWrap.style.display = 'block';
  if (timelineFilterActions) timelineFilterActions.style.display = 'flex';
  propertiesSections.forEach((el) => { el.style.display = ''; });

  if (currentSidebarMode === 'activities') {
    if (propertiesInactiveCta) propertiesInactiveCta.style.display = 'flex';
    propertiesSections.forEach((el) => { el.style.display = 'none'; });
  } else if (currentSidebarMode === 'properties') {
    if (timelineInactiveCta) timelineInactiveCta.style.display = 'flex';
    if (timelineDisplaySection) timelineDisplaySection.style.display = 'none';
    if (eventSelectionSection) eventSelectionSection.style.display = 'none';
    if (loadMoreWrap) loadMoreWrap.style.display = 'none';
    if (timelineFilterActions) timelineFilterActions.style.display = 'none';
  }
}

// Check if current tab is on a Mixpanel activity feed page (full profile or sidebar)
async function isOnMixpanelActivityPage() {
  // Check for full profile page first
  const isFullProfile = currentTab && currentTab.url &&
    currentTab.url.includes('mixpanel.com/project/') &&
    currentTab.url.includes('/app/profile') &&
    currentTab.url.includes('distinct_id=');
  
  if (isFullProfile) return true;
  
  // Check for sidebar feed on report pages
  const isOnMixpanel = currentTab && currentTab.url && 
    currentTab.url.includes('mixpanel.com/project/');
  
  if (isOnMixpanel) {
    try {
      const isLoaded = await checkContentScript();
      if (!isLoaded) return false;

      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'getSidebarViewMode'
      });

      return response && (response.mode === 'activities' || response.mode === 'properties');
    } catch (error) {
      return false;
    }
  }
  
  return false;
}

// Synchronous version for quick checks where async isn't possible
function isOnFullProfilePage() {
  return currentTab && currentTab.url &&
    currentTab.url.includes('mixpanel.com/project/') &&
    currentTab.url.includes('/app/profile') &&
    currentTab.url.includes('distinct_id=');
}

// Show notification (intentionally disabled)
function showNotification(message, type) {
  return;
}

// Get the current tab ID for tab-scoped badge operations
async function getCurrentTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

// Set notification badge on extension icon (tab-scoped to avoid global leaks)
async function setBadge(text, backgroundColor, textColor) {
  try {
    const tabId = await getCurrentTabId();
    const details = typeof tabId === 'number' ? { tabId } : {};
    await chrome.action.setBadgeText({ ...details, text });
    await chrome.action.setBadgeBackgroundColor({ ...details, color: backgroundColor });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ ...details, color: textColor });
    }
  } catch (error) {
    console.error('[Popup] Error setting badge:', error);
  }
}

// Clear notification badge from extension icon (tab-scoped)
async function clearBadge() {
  try {
    const tabId = await getCurrentTabId();
    const details = typeof tabId === 'number' ? { tabId } : {};
    await chrome.action.setBadgeText({ ...details, text: '' });
  } catch (error) {
    console.error('[Popup] Error clearing badge:', error);
  }
}

// Known prefixes to strip (after removing leading $)
const KNOWN_PROPERTY_PREFIXES = ['ae_', 'mp_', 'android_', 'ios_'];

// Cached display names from Mixpanel DOM
let propertyDisplayNamesCache = {};

// Load display names from storage
async function loadPropertyDisplayNames() {
  const result = await chrome.storage.local.get(['propertyDisplayNames']);
  propertyDisplayNamesCache = result.propertyDisplayNames || {};
}

// Format property name to match Mixpanel UI
function formatPropertyName(propertyName) {
  // Use Mixpanel's display name if available
  if (propertyDisplayNamesCache[propertyName]) {
    return propertyDisplayNamesCache[propertyName];
  }

  let formatted = propertyName.startsWith('$') ? propertyName.substring(1) : propertyName;

  // Strip known prefixes
  for (const prefix of KNOWN_PROPERTY_PREFIXES) {
    if (formatted.startsWith(prefix)) {
      formatted = formatted.substring(prefix.length);
      break;
    }
  }

  formatted = formatted.replace(/_/g, ' ');
  formatted = formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return formatted;
}

// Update event selection count display
function updateSelectionCount() {
  const selectedCount = document.querySelectorAll('.event-checkbox:checked').length;
  const selectionCountEl = document.getElementById('selectionCount');
  if (selectionCountEl) {
    selectionCountEl.textContent = `${selectedCount} event${selectedCount !== 1 ? 's' : ''} selected`;
  }
}

// Update property selection count display
function updatePropertySelectionCount() {
  const selectedCount = document.querySelectorAll('.property-checkbox:checked').length;
  const selectionCountEl = document.getElementById('propertySelectionCount');
  if (selectionCountEl) {
    selectionCountEl.textContent = `${selectedCount} propert${selectedCount !== 1 ? 'ies' : 'y'} selected`;
  }
}

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
      await switchTab(button.dataset.tab);
    });
  });
}

// Switch between tabs
async function switchTab(tabName) {
  updateSidebarTabAvailability();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const targetContent = document.getElementById(`${tabName}Tab`);
  if (targetContent) {
    targetContent.classList.add('active');
  }

  // Bookmarks, Timeline, and Properties tabs work in both full profile and sidebar modes
  // Cleaner tab needs full profile page (URL mutation)
  const contentEl = document.getElementById('content');
  const inactiveView = document.getElementById('inactiveView');
  const sidebarAllowedTabs = ['bookmarks', 'eventTimeline', 'filterProperties'].includes(tabName);
  
  if (sidebarAllowedTabs) {
    const hasAnyFeed = await isOnMixpanelActivityPage();
    if (hasAnyFeed || tabName === 'bookmarks') {
      // Show content for timeline/properties (if feed exists) or bookmarks (always)
      if (contentEl) contentEl.style.display = 'flex';
      if (inactiveView) inactiveView.style.display = 'none';
    } else {
      // No feed, show inactive
      if (contentEl) contentEl.style.display = 'none';
      if (inactiveView) inactiveView.style.display = 'block';
    }
  } else {
    // Cleaner tab needs full profile page
    if (!isOnFullProfilePage()) {
      if (contentEl) contentEl.style.display = 'none';
      if (inactiveView) inactiveView.style.display = 'block';
    }
  }

  activeTabName = tabName;
  chrome.storage.local.set({ lastActiveTab: tabName });

  if (tabName === 'filterProperties') {
    loadAndDisplayPropertyValues();
  }

  if (tabName === 'eventTimeline') {
    loadTimelineData();
  }

  if (tabName === 'bookmarks') {
    loadBookmarks();
  }

  updateHeaderButtonsForTab(tabName);

  // Auto-focus search input for the active tab
  const searchInputMap = {
    filterEvents: 'searchInput',
    filterProperties: 'propertySearchInput',
    eventTimeline: 'timelineSearchInput',
    bookmarks: 'bookmarksSearchInput'
  };
  const searchId = searchInputMap[tabName];
  if (searchId) {
    const input = document.getElementById(searchId);
    if (input) setTimeout(() => input.focus(), 50);
  }
}

// Update header buttons based on active tab
function updateHeaderButtonsForTab(tabName) {
  const exportBtn = document.getElementById('exportIconBtn');
  const importBtn = document.getElementById('importIconBtn');
  const trashBtn = document.getElementById('trashIconBtn');

  if (tabName === 'eventTimeline') {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.style.opacity = '1'; }
    if (importBtn) { importBtn.disabled = true; importBtn.style.opacity = '0.3'; }
    if (trashBtn) { trashBtn.disabled = false; trashBtn.style.opacity = '1'; }
  } else if (tabName === 'bookmarks') {
    if (exportBtn) { exportBtn.disabled = true; exportBtn.style.opacity = '0.3'; }
    if (importBtn) { importBtn.disabled = true; importBtn.style.opacity = '0.3'; }
    if (trashBtn) { trashBtn.disabled = false; trashBtn.style.opacity = '1'; }
  } else {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.style.opacity = '1'; }
    if (importBtn) { importBtn.disabled = false; importBtn.style.opacity = '1'; }
    if (trashBtn) { trashBtn.disabled = false; trashBtn.style.opacity = '1'; }
  }
}

// Restore last active tab from storage
async function restoreLastActiveTab() {
  try {
    const result = await chrome.storage.local.get(['lastActiveTab']);
    const savedTab = result.lastActiveTab || 'filterEvents';
    const initialTab = sidebarPreferredTab || savedTab;
    await switchTab(initialTab);
    updateHeaderButtonsForTab(initialTab);
  } catch (error) {
    console.error('[Popup] Error restoring last active tab:', error);
    const fallbackTab = sidebarPreferredTab || 'filterEvents';
    await switchTab(fallbackTab);
    updateHeaderButtonsForTab(fallbackTab);
  }
}

// Get Mixpanel URL to navigate to
function getMixpanelURL(page = 'users') {
  if (currentTab && currentTab.url && currentTab.url.includes('mixpanel.com/project/')) {
    const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
    if (match) {
      return `https://mixpanel.com/project/${match[1]}/view/${match[2]}/app/${page}`;
    }
  }
  return 'https://www.mixpanel.com';
}

// Download helper for export functions
function downloadTextFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
