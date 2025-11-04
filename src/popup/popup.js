// Popup script for Mixpanel Quickhide
// Location: src/popup/popup.js

let currentTab = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkCurrentTab();
  await loadStoredEvents();
  // syncCheckboxesWithURL is called in displayEvents if content script is available
  setupEventListeners();
  setupTabNavigation();
});

// Check if current tab is a Mixpanel profile page
async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  const applyBtn = document.getElementById('applyBtn');
  const content = document.getElementById('content');
  const inactiveView = document.getElementById('inactiveView');
  const tabNavigation = document.getElementById('tabNavigation');
  
  // Check if on activity feed page (must have distinct_id in URL)
  if (currentTab && currentTab.url && 
      currentTab.url.includes('mixpanel.com/project/') && 
      currentTab.url.includes('/app/profile') &&
      currentTab.url.includes('distinct_id=')) {
    
    // Check if content script is loaded
    const isContentScriptLoaded = await checkContentScript();
    
    if (isContentScriptLoaded) {
      // Active state - show full interface
      statusIcon.className = 'status-icon active';
      statusText.textContent = 'Activity feed page detected';
      applyBtn.disabled = false;
      content.style.display = 'flex';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'flex';
    } else {
      // Content script not loaded - show warning
      statusIcon.className = 'status-icon inactive';
      statusText.textContent = 'Please refresh the page';
      applyBtn.disabled = true;
      content.style.display = 'none';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'none';
      
      // Show a helpful message
      const warning = document.createElement('div');
      warning.className = 'inactive-view';
      warning.style.display = 'block';
      warning.innerHTML = `
        <div class="inactive-content">
          <div class="inactive-icon">🔄</div>
          <h3>Page Refresh Required</h3>
          <p>The extension was updated. Please refresh the Mixpanel page to activate.</p>
        </div>
      `;
      content.parentNode.insertBefore(warning, content);
    }
  } else {
    // Inactive state - show disabled message
    statusIcon.className = 'status-icon inactive';
    statusText.textContent = 'Extension Inactive';
    applyBtn.disabled = true;
    content.style.display = 'none';
    inactiveView.style.display = 'block';
    if (tabNavigation) tabNavigation.style.display = 'none';
    
    // Update button text based on current page
    updateMixpanelButtonText();
  }
}

// Update the Mixpanel button text based on context
function updateMixpanelButtonText() {
  const btnText = document.getElementById('openMixpanelBtnText');
  const btn = document.getElementById('openMixpanelBtn');
  const inactiveIcon = document.getElementById('inactiveIcon');
  const inactiveTitle = document.getElementById('inactiveTitle');
  const inactiveMessage = document.getElementById('inactiveMessage');
  
  if (!btnText || !btn) return;
  
  if (currentTab && currentTab.url && currentTab.url.includes('mixpanel.com/project/')) {
    // Check if already on users page
    if (currentTab.url.includes('/app/users')) {
      if (inactiveIcon) inactiveIcon.style.display = 'none';
      if (inactiveTitle) {
        inactiveTitle.style.display = 'block';
        inactiveTitle.textContent = 'How to use';
      }
      if (inactiveMessage) {
        inactiveMessage.style.display = 'block';
        inactiveMessage.innerHTML = 'Choose a user from the list';
      }
      // Hide the button completely
      btn.style.display = 'none';
      return;
    }
    
    // On a project page but not users page - show instructions
    if (inactiveIcon) inactiveIcon.style.display = 'none';
    if (inactiveTitle) {
      inactiveTitle.style.display = 'block';
      inactiveTitle.textContent = 'How to use';
    }
    if (inactiveMessage) {
      inactiveMessage.style.display = 'block';
      inactiveMessage.innerHTML = 'Go to the <strong>"Users"</strong> button on the left pane, or click the button below';
    }
    
    const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
    if (match) {
      btn.style.display = 'block'; // Make sure button is visible
      btnText.textContent = 'Go to Users Page';
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      return;
    }
  }
  
  // Default state - not in Mixpanel, show full message
  if (inactiveIcon) inactiveIcon.style.display = 'block';
  if (inactiveTitle) {
    inactiveTitle.style.display = 'block';
    inactiveTitle.textContent = 'How to use';
  }
  if (inactiveMessage) {
    inactiveMessage.style.display = 'block';
    inactiveMessage.innerHTML = 'Go to Mixpanel, then click the <strong>"Users"</strong> button on the left pane';
  }
  btn.style.display = 'block'; // Make sure button is visible
  btnText.textContent = 'Open Mixpanel';
  btn.disabled = false;
  btn.style.opacity = '1';
  btn.style.cursor = 'pointer';
}

// Check if content script is loaded and responding
async function checkContentScript() {
  if (!currentTab) return false;
  
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getCurrentEvents'
    });
    return response !== undefined;
  } catch (error) {
    console.log('[Popup] Content script not loaded:', error.message);
    return false;
  }
}

// Load stored events from chrome.storage
async function loadStoredEvents() {
  const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
  const autoEvents = result.hiddenEvents || [];
  const manualEvents = result.manualEvents || [];
  
  // Remove any manual events that are now in auto-discovered (deduplication)
  const uniqueManualEvents = manualEvents.filter(name => !autoEvents.includes(name));
  
  // Update storage if we removed duplicates
  if (uniqueManualEvents.length !== manualEvents.length) {
    await chrome.storage.local.set({ manualEvents: uniqueManualEvents });
  }
  
  // Combine both arrays with manual flag
  const allEvents = [
    ...autoEvents.map(name => ({ name, manual: false })),
    ...uniqueManualEvents.map(name => ({ name, manual: true }))
  ];
  
  // Check if content script is loaded before syncing
  const isLoaded = currentTab && await checkContentScript();
  await displayEvents(allEvents, isLoaded);
}

// Display events as checkboxes
async function displayEvents(events, shouldSync = true) {
  const eventsList = document.getElementById('eventsList');
  
  if (events.length === 0) {
    eventsList.innerHTML = '<p class="empty-state">No events stored yet. Visit a Mixpanel profile page with hidden events to start.</p>';
    updateSelectionCount();
    return;
  }
  
  // Save current checkbox states before re-rendering
  const currentStates = {};
  document.querySelectorAll('.event-checkbox').forEach(cb => {
    currentStates[cb.value] = cb.checked;
  });
  
  // Sort events alphabetically by name
  events.sort((a, b) => a.name.localeCompare(b.name));
  
  eventsList.innerHTML = '';
  
  events.forEach(eventObj => {
    const label = document.createElement('label');
    label.className = 'event-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = eventObj.name;
    checkbox.className = 'event-checkbox';
    // Preserve previous state if it exists, otherwise default to checked
    checkbox.checked = currentStates.hasOwnProperty(eventObj.name) ? currentStates[eventObj.name] : true;
    checkbox.dataset.manual = eventObj.manual;
    
    // Add change listener to update count
    checkbox.addEventListener('change', updateSelectionCount);
    
    const span = document.createElement('span');
    span.textContent = eventObj.manual ? `${eventObj.name} [m]` : eventObj.name;
    span.className = eventObj.manual ? 'manual-event-text' : '';
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-event-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete event';
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await deleteEvent(eventObj.name, eventObj.manual);
    });
    
    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(deleteBtn);
    eventsList.appendChild(label);
  });
  
  // Only sync if requested and content script is available
  // Don't sync if we already have preserved states (user is interacting)
  if (shouldSync && Object.keys(currentStates).length === 0) {
    await syncCheckboxesWithURL();
  }
  
  // Update selection count after displaying
  updateSelectionCount();
}

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      switchTab(targetTab);
    });
  });
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    }
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  const targetContent = document.getElementById(`${tabName}Tab`);
  if (targetContent) {
    targetContent.classList.add('active');
  }
  
  console.log('[Popup] Switched to tab:', tabName);
}

// Setup event listeners
function setupEventListeners() {
  // Open Mixpanel button (in inactive view)
  document.getElementById('openMixpanelBtn').addEventListener('click', () => {
    const url = getMixpanelURL();
    if (currentTab) {
      chrome.tabs.update(currentTab.id, { url });
    } else {
      chrome.tabs.create({ url });
    }
  });
  
  // Search input
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  searchInput.addEventListener('input', (e) => {
    filterEvents(e.target.value);
    // Show/hide clear button
    clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
  });
  
  // Clear search button
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterEvents('');
    clearSearchBtn.style.display = 'none';
    searchInput.focus();
  });
  
  // Apply button
  document.getElementById('applyBtn').addEventListener('click', async () => {
    const selectedEvents = getSelectedEvents();
    console.log('[Popup] Applying events:', selectedEvents);
    
    if (currentTab) {
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'applyHiddenEvents',
          events: selectedEvents
        });
        
        console.log('[Popup] Response from content script:', response);
        
        if (response && response.success) {
          // Clear manual events after applying - they'll be auto-discovered if valid
          await chrome.storage.local.set({ manualEvents: [] });
          console.log('[Popup] Cleared manual events - will be auto-discovered if valid');
          
          // Clear search bar
          const searchInput = document.getElementById('searchInput');
          const clearSearchBtn = document.getElementById('clearSearchBtn');
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          filterEvents('');
          
          showNotification('Events applied successfully!', 'success');
          // Re-sync checkboxes after applying
          setTimeout(() => syncCheckboxesWithURL(), 500);
        } else {
          showNotification('Error: ' + (response?.error || 'Unknown error'), 'error');
        }
      } catch (error) {
        console.error('[Popup] Error applying events:', error);
        
        // Check if it's a connection error (content script not loaded)
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
    console.log('[Popup] Check All clicked');
    // Only check visible checkboxes (respects search filter)
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(cb => {
      const isVisible = cb.closest('.event-item').style.display !== 'none';
      if (isVisible) {
        cb.checked = true;
        console.log('[Popup] Checked:', cb.value);
      }
    });
    updateSelectionCount();
    showNotification('All visible checkboxes checked', 'success');
  });
  
  // Clear all button (uncheck all checkboxes)
  document.getElementById('clearBtn').addEventListener('click', () => {
    console.log('[Popup] Uncheck All clicked');
    // Only uncheck visible checkboxes (respects search filter)
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(cb => {
      const isVisible = cb.closest('.event-item').style.display !== 'none';
      if (isVisible) {
        cb.checked = false;
        console.log('[Popup] Unchecked:', cb.value);
      }
    });
    updateSelectionCount();
    showNotification('All visible checkboxes unchecked', 'success');
  });
  
  // Listen for storage changes (new events discovered)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && (changes.hiddenEvents || changes.manualEvents)) {
      // Reload all events when either changes
      await loadStoredEvents();
    }
  });
  
  // Export icon button
  document.getElementById('exportIconBtn').addEventListener('click', async () => {
    await exportEvents();
  });
  
  // Import icon button
  document.getElementById('importIconBtn').addEventListener('click', () => {
    // Trigger file input
    document.getElementById('importFileInput').click();
  });
  
  // Trash icon button - clear all events
  document.getElementById('trashIconBtn').addEventListener('click', async () => {
    const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
    const totalEvents = (result.hiddenEvents || []).length + (result.manualEvents || []).length;
    
    if (totalEvents === 0) {
      showNotification('No events to clear', 'error');
      return;
    }
    
    const confirmed = confirm(
      `Are you sure you want to delete ALL ${totalEvents} event${totalEvents !== 1 ? 's' : ''}?\n\n` +
      `This will permanently remove all auto-discovered and manual events from storage.`
    );
    
    if (confirmed) {
      await chrome.storage.local.set({ 
        hiddenEvents: [],
        manualEvents: []
      });
      console.log('[Popup] Cleared all events');
      showNotification('All events cleared', 'success');
    }
  });
  
  // File input change handler
  document.getElementById('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.endsWith('.txt')) {
      showNotification('Please select a .txt file', 'error');
      return;
    }
    
    try {
      // Read file content
      const content = await file.text();
      await importEvents(content);
    } catch (error) {
      console.error('[Popup] Error reading file:', error);
      showNotification('Error reading file', 'error');
    }
    
    // Reset file input so the same file can be selected again
    e.target.value = '';
  });
}

// Sync checkboxes with URL's current hidden events
async function syncCheckboxesWithURL() {
  // Only sync if we're on an activity feed page
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  
  if (!tab || !tab.url || 
      !tab.url.includes('mixpanel.com/project/') || 
      !tab.url.includes('/app/profile') ||
      !tab.url.includes('distinct_id=')) {
    return;
  }
  
  try {
    // Get current events from the page URL
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getCurrentEvents'
    });
    
    console.log('[Popup] Sync response:', response);
    
    if (response && response.events) {
      const currentURLEvents = response.events;
      console.log('[Popup] Current URL events:', currentURLEvents);
      
      // Only sync if there are actually events in the URL
      // Otherwise keep the default "all checked" state
      if (currentURLEvents.length > 0) {
        // Update checkboxes to match URL
        const checkboxes = document.querySelectorAll('.event-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = currentURLEvents.includes(checkbox.value);
        });
        console.log('[Popup] Checkboxes synced with URL events');
      } else {
        console.log('[Popup] No events in URL, keeping default checked state');
      }
    }
  } catch (error) {
    // Silently fail - this is expected when content script isn't loaded
    console.log('[Popup] Content script not available for sync');
  }
}

// Filter events based on search term
function filterEvents(searchTerm) {
  const eventItems = document.querySelectorAll('.event-item');
  const searchLower = searchTerm.toLowerCase().trim();
  
  let visibleCount = 0;
  
  eventItems.forEach(item => {
    const eventName = item.querySelector('span').textContent.toLowerCase();
    const matches = eventName.includes(searchLower);
    
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });
  
  // Update search count
  const searchCount = document.getElementById('searchCount');
  if (searchTerm.trim()) {
    searchCount.textContent = `${visibleCount} of ${eventItems.length}`;
  } else {
    searchCount.textContent = '';
  }
  
  // Show "no results" message with add button if needed
  const eventsList = document.getElementById('eventsList');
  let noResults = eventsList.querySelector('.no-results-container');
  
  if (visibleCount === 0 && eventItems.length > 0 && searchTerm.trim()) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.className = 'no-results-container';
      
      const message = document.createElement('p');
      message.className = 'no-results';
      message.textContent = `No events matching "${searchTerm}"`;
      
      const addBtn = document.createElement('button');
      addBtn.className = 'btn btn-secondary add-manual-btn';
      addBtn.innerHTML = `+ Add "${searchTerm}" manually`;
      addBtn.addEventListener('click', async () => {
        await addManualEvent(searchTerm);
      });
      
      noResults.appendChild(message);
      noResults.appendChild(addBtn);
      eventsList.appendChild(noResults);
    } else {
      const message = noResults.querySelector('.no-results');
      const addBtn = noResults.querySelector('.add-manual-btn');
      message.textContent = `No events matching "${searchTerm}"`;
      addBtn.innerHTML = `+ Add "${searchTerm}" manually`;
      addBtn.onclick = async () => {
        await addManualEvent(searchTerm);
      };
    }
  } else if (noResults) {
    noResults.remove();
  }
}

// Add a manual event
async function addManualEvent(eventName) {
  const trimmedName = eventName.trim();
  
  if (!trimmedName) {
    showNotification('Event name cannot be empty', 'error');
    return;
  }
  
  // Get current events from storage
  const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
  const autoEvents = result.hiddenEvents || [];
  const manualEvents = result.manualEvents || [];
  
  // Check if already exists
  if (autoEvents.includes(trimmedName) || manualEvents.includes(trimmedName)) {
    showNotification('Event already exists', 'error');
    return;
  }
  
  // Add to manual events
  manualEvents.push(trimmedName);
  
  // Save to storage
  await chrome.storage.local.set({ manualEvents });
  
  console.log('[Popup] Added manual event:', trimmedName);
  
  // Clear search and reload
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  await loadStoredEvents();
  
  showNotification(`"${trimmedName}" added [m]`, 'success');
}

// Delete an event from storage
async function deleteEvent(eventName, isManual) {
  // Confirm deletion
  if (!confirm(`Delete "${eventName}"?\n\n${isManual ? 'This manual event will be removed.' : 'It will be removed until you hide it again in Mixpanel.'}`)) {
    return;
  }
  
  // Get current events from storage
  const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
  const autoEvents = result.hiddenEvents || [];
  const manualEvents = result.manualEvents || [];
  
  if (isManual) {
    // Remove from manual events
    const updatedManual = manualEvents.filter(e => e !== eventName);
    await chrome.storage.local.set({ manualEvents: updatedManual });
  } else {
    // Remove from auto-discovered events
    const updatedAuto = autoEvents.filter(e => e !== eventName);
    await chrome.storage.local.set({ hiddenEvents: updatedAuto });
  }
  
  console.log('[Popup] Deleted event:', eventName, isManual ? '(manual)' : '(auto)');
  
  // Reload the events list
  await loadStoredEvents();
  
  showNotification(`"${eventName}" deleted`, 'success');
}

// Update selection count display
function updateSelectionCount() {
  const selectedCount = document.querySelectorAll('.event-checkbox:checked').length;
  const selectionCountEl = document.getElementById('selectionCount');
  
  if (selectionCountEl) {
    selectionCountEl.textContent = `${selectedCount} event${selectedCount !== 1 ? 's' : ''} selected`;
  }
}

// Get Mixpanel URL to navigate to
function getMixpanelURL() {
  // Check if we're already on a Mixpanel page with project/view IDs
  if (currentTab && currentTab.url && currentTab.url.includes('mixpanel.com/project/')) {
    // Extract project ID and view ID from URL
    // Example: https://mixpanel.com/project/2582735/view/3122095/app/home
    const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
    
    if (match) {
      const projectId = match[1];
      const viewId = match[2];
      return `https://mixpanel.com/project/${projectId}/view/${viewId}/app/users`;
    }
  }
  
  // Default to Mixpanel homepage
  return 'https://www.mixpanel.com';
}

// Get selected events from checkboxes
function getSelectedEvents() {
  const checkboxes = document.querySelectorAll('.event-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Export events to a .txt file
async function exportEvents() {
  try {
    // Get all events from storage
    const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
    const autoEvents = result.hiddenEvents || [];
    const manualEvents = result.manualEvents || [];
    
    // Combine and deduplicate
    const allEvents = [...new Set([...autoEvents, ...manualEvents])];
    
    if (allEvents.length === 0) {
      showNotification('No events to export', 'error');
      return;
    }
    
    // Sort alphabetically
    allEvents.sort();
    
    // Format as simple list (one event per line)
    const content = allEvents.join('\n');
    
    // Create blob
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mixpanel_events.txt';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[Popup] Exported events:', allEvents.length);
    showNotification(`${allEvents.length} event${allEvents.length !== 1 ? 's' : ''} exported`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting events:', error);
    showNotification('Error exporting events', 'error');
  }
}

// Import events from a .txt file
async function importEvents(fileContent) {
  try {
    // Parse file: split by newlines, trim, filter empty
    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      showNotification('No events found in file', 'error');
      return;
    }
    
    // Remove duplicates
    const uniqueEvents = [...new Set(lines)];
    
    // Ask user: Replace or Merge?
    const replace = confirm(
      `Found ${uniqueEvents.length} event${uniqueEvents.length !== 1 ? 's' : ''} in file.\n\n` +
      `Click OK to REPLACE existing events.\n` +
      `Click Cancel to MERGE with existing events.`
    );
    
    if (replace) {
      // Replace: save directly to hiddenEvents, clear manualEvents
      await chrome.storage.local.set({ 
        hiddenEvents: uniqueEvents,
        manualEvents: []
      });
      console.log('[Popup] Replaced events with imported ones');
    } else {
      // Merge: combine with existing events
      const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
      const existingAuto = result.hiddenEvents || [];
      const existingManual = result.manualEvents || [];
      
      // Combine all and deduplicate
      const mergedEvents = [...new Set([...existingAuto, ...existingManual, ...uniqueEvents])];
      
      await chrome.storage.local.set({ 
        hiddenEvents: mergedEvents,
        manualEvents: []
      });
      console.log('[Popup] Merged imported events with existing ones');
    }
    
    // Reload events
    await loadStoredEvents();
    
    showNotification(
      `${uniqueEvents.length} event${uniqueEvents.length !== 1 ? 's' : ''} imported ${replace ? '(replaced)' : '(merged)'}`,
      'success'
    );
  } catch (error) {
    console.error('[Popup] Error importing events:', error);
    showNotification('Error importing events', 'error');
  }
}

// Show notification
function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

