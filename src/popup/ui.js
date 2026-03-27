// Shared UI helpers for Mixpanel Activity Navigator
// Location: src/popup/ui.js

let activeTabName = 'filterEvents';

// Show notification (intentionally disabled)
function showNotification(message, type) {
  return;
}

// Set notification badge on extension icon
async function setBadge(text, backgroundColor, textColor) {
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: backgroundColor });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: textColor });
    }
  } catch (error) {
    console.error('[Popup] Error setting badge:', error);
  }
}

// Clear notification badge from extension icon
async function clearBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (error) {
    console.error('[Popup] Error clearing badge:', error);
  }
}

// Format property name to match Mixpanel UI
function formatPropertyName(propertyName) {
  let formatted = propertyName.startsWith('$') ? propertyName.substring(1) : propertyName;
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
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });
}

// Switch between tabs
function switchTab(tabName) {
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

  activeTabName = tabName;
  chrome.storage.local.set({ lastActiveTab: tabName });

  if (tabName === 'filterProperties') {
    loadAndDisplayPropertyValues();
  }

  if (tabName === 'eventTimeline') {
    loadTimelineData();
  }

  updateHeaderButtonsForTab(tabName);
}

// Update header buttons based on active tab
function updateHeaderButtonsForTab(tabName) {
  const exportBtn = document.getElementById('exportIconBtn');
  const importBtn = document.getElementById('importIconBtn');

  if (tabName === 'eventTimeline') {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.style.opacity = '1'; }
    if (importBtn) { importBtn.disabled = true; importBtn.style.opacity = '0.3'; }
  } else {
    if (exportBtn) { exportBtn.disabled = false; exportBtn.style.opacity = '1'; }
    if (importBtn) { importBtn.disabled = false; importBtn.style.opacity = '1'; }
  }
}

// Restore last active tab from storage
async function restoreLastActiveTab() {
  try {
    const result = await chrome.storage.local.get(['lastActiveTab']);
    const savedTab = result.lastActiveTab || 'filterEvents';
    switchTab(savedTab);
    updateHeaderButtonsForTab(savedTab);
  } catch (error) {
    console.error('[Popup] Error restoring last active tab:', error);
    switchTab('filterEvents');
    updateHeaderButtonsForTab('filterEvents');
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
