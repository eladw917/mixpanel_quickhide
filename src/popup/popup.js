// Popup entry point for Mixpanel Activity Navigator
// Location: src/popup/popup.js
//
// Dependencies (loaded via <script> tags before this file):
//   ui.js           — shared helpers (showNotification, setBadge, formatPropertyName, tabs, etc.)
//   storage.js      — chrome.storage helpers (loadStoredEvents, checkContentScript, etc.)
//   events-tab.js   — Feed Cleaner tab logic
//   properties-tab.js — Property Finder tab logic
//   timeline-tab.js — Quick Timeline tab logic

let currentTab = null;
let sidebarPreferredTab = null;
let currentSidebarMode = 'none';

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadPropertyDisplayNames();
  await checkCurrentTab();
  await loadStoredEvents();
  await loadStoredPropertyNames();
  await loadBookmarks();
  setupEventListeners();
  setupTabNavigation();
  await restoreLastActiveTab();
});

// Check if current tab is a Mixpanel profile page or has sidebar feed
async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  sidebarPreferredTab = null;
  currentSidebarMode = 'none';

  const applyBtn = document.getElementById('applyBtn');
  const content = document.getElementById('content');
  const inactiveView = document.getElementById('inactiveView');
  const tabNavigation = document.getElementById('tabNavigation');

  const headerButtons = [
    document.getElementById('copyAnalyticsIdBtn'),
    document.getElementById('shareUserPageBtn'),
    document.getElementById('bookmarkIconBtn'),
    document.getElementById('exportIconBtn'),
    document.getElementById('importIconBtn'),
    document.getElementById('trashIconBtn')
  ];

  function setHeaderButtonsEnabled(enabled) {
    headerButtons.forEach(btn => {
      if (btn) btn.disabled = !enabled;
    });
  }

  function enableSidebarBookmarkButton() {
    const bookmarkBtn = document.getElementById('bookmarkIconBtn');
    if (bookmarkBtn) bookmarkBtn.disabled = false;
  }

  // Check for full profile page
  const isFullProfile = currentTab && currentTab.url &&
      currentTab.url.includes('mixpanel.com/project/') &&
      currentTab.url.includes('/app/profile') &&
      currentTab.url.includes('distinct_id=');

  if (isFullProfile) {
    currentSidebarMode = 'full_profile';
    const isContentScriptLoaded = await checkContentScript();

    if (isContentScriptLoaded) {
      applyBtn.disabled = false;
      content.style.display = 'flex';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'flex';
      setHeaderButtonsEnabled(true);
      setBadge('!', '#4CAF50', '#FFFFFF');
      if (typeof updateSidebarTabAvailability === 'function') updateSidebarTabAvailability();
    } else {
      applyBtn.disabled = true;
      content.style.display = 'none';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'none';
      setHeaderButtonsEnabled(false);
      clearBadge();
      if (typeof updateSidebarTabAvailability === 'function') updateSidebarTabAvailability();

      const warning = document.createElement('div');
      warning.className = 'inactive-view';
      warning.style.display = 'block';
      warning.innerHTML = `
        <div class="inactive-content">
          <h3>Page Refresh Required</h3>
          <p>The extension was updated. Please refresh the Mixpanel page to activate.</p>
        </div>
      `;
      content.parentNode.insertBefore(warning, content);
    }
    return;
  }

  // Check for sidebar feed on report pages
  const isOnMixpanel = currentTab && currentTab.url && 
      currentTab.url.includes('mixpanel.com/project/');
  
  if (isOnMixpanel) {
    const isContentScriptLoaded = await checkContentScript();
    
    if (isContentScriptLoaded) {
      // Check which sidebar tab is active via content script
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getSidebarViewMode' });

        if (response && (response.mode === 'activities' || response.mode === 'properties')) {
          // Enable timeline + properties mode (no URL mutation in sidebar)
          currentSidebarMode = response.mode;
          applyBtn.disabled = true; // Can't mutate URL in sidebar
          content.style.display = 'flex';
          inactiveView.style.display = 'none';
          if (tabNavigation) tabNavigation.style.display = 'flex';
          setHeaderButtonsEnabled(false); // Most header actions need full profile
          enableSidebarBookmarkButton(); // Keep bookmarking available in sidebar mode
          setBadge('!', '#4CAF50', '#FFFFFF');
          sidebarPreferredTab = response.mode === 'properties' ? 'filterProperties' : 'eventTimeline';
          if (typeof updateSidebarTabAvailability === 'function') updateSidebarTabAvailability();
          return;
        }
      } catch (error) {
        // Feed not present, fall through to inactive state
      }
    }
  }

  // No valid context found
  applyBtn.disabled = true;
  content.style.display = 'none';
  inactiveView.style.display = 'block';
  // Show tab navigation so bookmarks tab is always accessible
  if (tabNavigation) tabNavigation.style.display = 'flex';
  setHeaderButtonsEnabled(false);
  clearBadge();
  if (typeof updateSidebarTabAvailability === 'function') updateSidebarTabAvailability();
  updateMixpanelButtonText();
}

// Update the Mixpanel button text based on context
function updateMixpanelButtonText() {
  const openMixpanelBtn = document.getElementById('openMixpanelBtn');
  const goToUsersBtn = document.getElementById('goToUsersBtn');
  const goToEventsBtn = document.getElementById('goToEventsBtn');
  const inactiveTitle = document.getElementById('inactiveTitle');
  const inactiveMessage = document.getElementById('inactiveMessage');

  if (!openMixpanelBtn) return;

  if (currentTab && currentTab.url && currentTab.url.includes('mixpanel.com/project/')) {
    // On users or events page — tell user to click a distinct ID
    if (currentTab.url.includes('/app/users') || currentTab.url.includes('/app/events')) {
      if (inactiveTitle) {
        inactiveTitle.style.display = 'block';
        inactiveTitle.textContent = 'Follow instruction to activate';
      }
      if (inactiveMessage) {
        inactiveMessage.style.display = 'block';
        inactiveMessage.innerHTML = 'Click on a user distinct ID';
      }
      openMixpanelBtn.style.display = 'none';
      if (goToUsersBtn) goToUsersBtn.style.display = 'none';
      if (goToEventsBtn) goToEventsBtn.style.display = 'none';
      return;
    }

    // On a project page but not on users or events page
    if (inactiveTitle) {
      inactiveTitle.style.display = 'block';
      inactiveTitle.textContent = 'Follow instruction to activate';
    }
    if (inactiveMessage) {
      inactiveMessage.style.display = 'block';
      inactiveMessage.innerHTML = 'Click the <strong>"Users"</strong> or <strong>"Events"</strong> button on the left pane';
    }

    const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
    if (match) {
      openMixpanelBtn.style.display = 'none';
      if (goToUsersBtn) { goToUsersBtn.style.display = 'block'; goToUsersBtn.disabled = false; }
      if (goToEventsBtn) { goToEventsBtn.style.display = 'block'; goToEventsBtn.disabled = false; }
      return;
    }
  }

  // Default state — not in Mixpanel
  if (inactiveTitle) {
    inactiveTitle.style.display = 'block';
    inactiveTitle.textContent = 'Follow instruction to activate';
  }
  if (inactiveMessage) {
    inactiveMessage.style.display = 'block';
    inactiveMessage.innerHTML = 'Go to Mixpanel, then click the <strong>"Users"</strong> or <strong>"Events"</strong> button on the left pane';
  }
  openMixpanelBtn.style.display = 'block';
  openMixpanelBtn.disabled = false;
  openMixpanelBtn.style.opacity = '1';
  openMixpanelBtn.style.cursor = 'pointer';
  if (goToUsersBtn) goToUsersBtn.style.display = 'none';
  if (goToEventsBtn) goToEventsBtn.style.display = 'none';
}

// Copy Analytics ID (distinct_id) from URL
async function copyAnalyticsId() {
  try {
    if (!currentTab || !currentTab.url) {
      showNotification('No active tab found', 'error');
      return;
    }

    const match = currentTab.url.match(/distinct_id=([^&]+)/);
    if (!match || !match[1]) {
      showNotification('No analytics ID found in URL', 'error');
      return;
    }

    const analyticsId = decodeURIComponent(match[1]);
    await navigator.clipboard.writeText(analyticsId);
    showNotification('Analytics ID copied!', 'success');
  } catch (error) {
    console.error('[Popup] Error copying analytics ID:', error);
    showNotification('Failed to copy ID', 'error');
  }
}

// Share User Page (copy full URL)
async function shareUserPage() {
  try {
    if (!currentTab || !currentTab.url) {
      showNotification('No active tab found', 'error');
      return;
    }
    await navigator.clipboard.writeText(currentTab.url);
    showNotification('Page URL copied!', 'success');
  } catch (error) {
    console.error('[Popup] Error copying URL:', error);
    showNotification('Failed to copy URL', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Open Mixpanel button
  document.getElementById('openMixpanelBtn').addEventListener('click', () => {
    const url = 'https://www.mixpanel.com';
    if (currentTab) {
      chrome.tabs.update(currentTab.id, { url });
    } else {
      chrome.tabs.create({ url });
    }
  });

  // Go to Users button
  const goToUsersBtn = document.getElementById('goToUsersBtn');
  if (goToUsersBtn) {
    goToUsersBtn.addEventListener('click', () => {
      if (currentTab) chrome.tabs.update(currentTab.id, { url: getMixpanelURL('users') });
    });
  }

  // Go to Events button
  const goToEventsBtn = document.getElementById('goToEventsBtn');
  if (goToEventsBtn) {
    goToEventsBtn.addEventListener('click', () => {
      if (currentTab) chrome.tabs.update(currentTab.id, { url: getMixpanelURL('events') });
    });
  }

  // Search input (events tab)
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', (e) => {
    filterEvents(e.target.value);
    clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterEvents('');
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
  });

  // Apply button
  document.getElementById('applyBtn').addEventListener('click', async () => {
    const selectedEvents = getSelectedEvents();

    if (currentTab) {
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'applyHiddenEvents',
          events: selectedEvents
        });

        if (response && response.success) {
          await chrome.storage.local.set({ manualEvents: [] });

          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          filterEvents('');

          showNotification('Events applied successfully!', 'success');
          setTimeout(() => syncCheckboxesWithURL(), 500);
        } else {
          showNotification('Error: ' + (response?.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        console.error('[Popup] Error applying events:', error);
        if (error.message && error.message.includes('Could not establish connection')) {
          showNotification('Please refresh the Mixpanel page', 'error');
        } else if (error.message && error.message.includes('invalidated')) {
          showNotification('Extension updated. Please refresh the page.', 'error');
        } else {
          showNotification('Error applying events. Try refreshing the page.', 'error');
        }
      }
    }
  });

  // Check all button
  document.getElementById('checkAllBtn').addEventListener('click', () => {
    document.querySelectorAll('.event-checkbox').forEach(cb => {
      if (cb.closest('.event-item').style.display !== 'none') cb.checked = true;
    });
    updateSelectionCount();
    showNotification('All visible checkboxes checked', 'success');
  });

  // Clear all button
  document.getElementById('clearBtn').addEventListener('click', () => {
    document.querySelectorAll('.event-checkbox').forEach(cb => {
      if (cb.closest('.event-item').style.display !== 'none') cb.checked = false;
    });
    updateSelectionCount();
    showNotification('All visible checkboxes unchecked', 'success');
  });

  // Storage change listener
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && (changes.hiddenEvents || changes.manualEvents)) {
      await loadStoredEvents();
    }
    if (areaName === 'local' && (changes.discoveredProperties || changes.propertyDisplayNames)) {
      if (changes.propertyDisplayNames) {
        propertyDisplayNamesCache = changes.propertyDisplayNames.newValue || {};
      }
      await loadStoredPropertyNames();
    }
    if (areaName === 'local' && changes.bookmarks) {
      await loadBookmarks();
    }
  });

  // Property search input
  const propertySearchInput = document.getElementById('propertySearchInput');
  const clearPropertySearchBtn = document.getElementById('clearPropertySearchBtn');

  propertySearchInput.addEventListener('input', (e) => {
    filterPropertyNames(e.target.value);
    clearPropertySearchBtn.style.display = e.target.value ? 'flex' : 'none';
  });

  clearPropertySearchBtn.addEventListener('click', () => {
    propertySearchInput.value = '';
    filterPropertyNames('');
    clearPropertySearchBtn.style.display = 'none';
    propertySearchInput.focus();
  });

  // Timeline search input
  const timelineSearchInput = document.getElementById('timelineSearchInput');
  const clearTimelineSearchBtn = document.getElementById('clearTimelineSearchBtn');

  if (timelineSearchInput && clearTimelineSearchBtn) {
    timelineSearchInput.addEventListener('input', (e) => {
      filterTimelineEventNames(e.target.value);
      clearTimelineSearchBtn.style.display = e.target.value ? 'flex' : 'none';
    });

    clearTimelineSearchBtn.addEventListener('click', () => {
      timelineSearchInput.value = '';
      filterTimelineEventNames('');
      clearTimelineSearchBtn.style.display = 'none';
      timelineSearchInput.focus();
    });
  }

  // Load More Events button
  const loadMoreEventsBtn = document.getElementById('loadMoreEventsBtn');
  if (loadMoreEventsBtn) {
    loadMoreEventsBtn.addEventListener('click', async () => {
      if (!currentTab) return;

      const originalText = loadMoreEventsBtn.textContent;
      loadMoreEventsBtn.textContent = 'Loading...';
      loadMoreEventsBtn.disabled = true;

      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'clickShowMore'
        });

        if (response && response.success) {
          setTimeout(async () => {
            await loadTimelineData();
            loadMoreEventsBtn.disabled = false;
          }, 1500);
        } else {
          try {
            const earliestResponse = await chrome.tabs.sendMessage(currentTab.id, {
              action: 'getEarliestEvent'
            });

            if (earliestResponse && earliestResponse.earliestEvent) {
              const dateText = earliestResponse.earliestEvent.replace(/^Since\s+/i, '');
              loadMoreEventsBtn.textContent = 'All events loaded';
              const dateInfoDiv = document.getElementById('loadMoreDateInfo');
              if (dateInfoDiv) dateInfoDiv.textContent = `since ${dateText}`;
            } else {
              loadMoreEventsBtn.textContent = 'All events loaded';
              const dateInfoDiv = document.getElementById('loadMoreDateInfo');
              if (dateInfoDiv) dateInfoDiv.textContent = '';
            }
          } catch (err) {
            loadMoreEventsBtn.textContent = 'All events loaded';
            const dateInfoDiv = document.getElementById('loadMoreDateInfo');
            if (dateInfoDiv) dateInfoDiv.textContent = '';
          }

          loadMoreEventsBtn.disabled = true;
        }
      } catch (error) {
        console.error('[Popup] Error clicking Show more:', error);
        loadMoreEventsBtn.textContent = originalText;
        loadMoreEventsBtn.disabled = false;
      }
    });
  }

  // Header action buttons
  document.getElementById('copyAnalyticsIdBtn').addEventListener('click', copyAnalyticsId);
  document.getElementById('shareUserPageBtn').addEventListener('click', shareUserPage);
  document.getElementById('bookmarkIconBtn').addEventListener('click', toggleBookmark);

  async function switchSidebarTab(targetMode, targetPopupTab) {
    if (!currentTab) return;
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'setSidebarViewMode',
        mode: targetMode
      });

      if (response && response.success) {
        setTimeout(async () => {
          await checkCurrentTab();
          if (typeof switchTab === 'function') await switchTab(targetPopupTab);
        }, 250);
      }
    } catch (error) {
      console.error('[Popup] Failed switching sidebar tab:', error);
    }
  }

  const switchToPropertiesBtn = document.getElementById('switchToPropertiesSidebarBtn');
  if (switchToPropertiesBtn) {
    switchToPropertiesBtn.addEventListener('click', async () => {
      await switchSidebarTab('properties', 'filterProperties');
    });
  }

  const switchToActivitiesBtn = document.getElementById('switchToActivitiesSidebarBtn');
  if (switchToActivitiesBtn) {
    switchToActivitiesBtn.addEventListener('click', async () => {
      await switchSidebarTab('activities', 'eventTimeline');
    });
  }

  // Collapse All button
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', async () => {
      if (!currentTab) return;
      try {
        await chrome.tabs.sendMessage(currentTab.id, { action: 'collapseAllEvents' });
        showNotification('All events collapsed', 'success');
        // Refresh expand state indicators
        if (activeTabName === 'eventTimeline') await refreshExpandState();
      } catch (error) {
        console.error('[Popup] Error collapsing all events:', error);
      }
    });
  }

  document.getElementById('exportIconBtn').addEventListener('click', async () => {
    if (activeTabName === 'filterProperties') await exportProperties();
    else if (activeTabName === 'eventTimeline') await exportTimeline();
    else await exportEvents();
  });

  document.getElementById('importIconBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  document.getElementById('trashIconBtn').addEventListener('click', async () => {
    if (activeTabName === 'filterProperties') await clearProperties();
    else if (activeTabName === 'eventTimeline') await clearTimelineSelections();
    else if (activeTabName === 'bookmarks') await clearBookmarks();
    else await clearEvents();
  });

  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      showNotification('Please select a .txt file', 'error');
      return;
    }

    try {
      const content = await file.text();
      if (activeTabName === 'filterProperties') {
        await importProperties(content);
      } else {
        await importEvents(content);
      }
    } catch (error) {
      console.error('[Popup] Error reading file:', error);
      showNotification('Error reading file', 'error');
    }

    e.target.value = '';
  });
}
