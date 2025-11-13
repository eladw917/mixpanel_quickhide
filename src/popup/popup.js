// Popup script for Mixpanel Activity Navigator
// Location: src/popup/popup.js
// 
// CODING STANDARDS:
// - Use SVG icons only - NO EMOJIS in production code
// - All icons must be in src/assets/icons/ as SVG files
// - Reference icons using <img> tags with proper alt text

let currentTab = null;
let activeTabName = 'filterEvents'; // Track which tab is currently active
let eventDatabase = []; // Store all events from activity feed
let selectedTimelineEvents = []; // Store which event names user wants to track
let hiddenTimelineEvents = []; // Store hidden event instances (by unique key)

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await checkCurrentTab();
  await loadStoredEvents();
  await loadStoredPropertyNames();
  // syncCheckboxesWithURL is called in displayEvents if content script is available
  setupEventListeners();
  setupTabNavigation();
  await restoreLastActiveTab();
});

// Check if current tab is a Mixpanel profile page
async function checkCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  const applyBtn = document.getElementById('applyBtn');
  const content = document.getElementById('content');
  const inactiveView = document.getElementById('inactiveView');
  const tabNavigation = document.getElementById('tabNavigation');
  
  // Get header buttons
  const copyAnalyticsIdBtn = document.getElementById('copyAnalyticsIdBtn');
  const shareUserPageBtn = document.getElementById('shareUserPageBtn');
  const exportIconBtn = document.getElementById('exportIconBtn');
  const importIconBtn = document.getElementById('importIconBtn');
  const trashIconBtn = document.getElementById('trashIconBtn');
  
  // Check if on activity feed page (must have distinct_id in URL)
  if (currentTab && currentTab.url && 
      currentTab.url.includes('mixpanel.com/project/') && 
      currentTab.url.includes('/app/profile') &&
      currentTab.url.includes('distinct_id=')) {
    // Check if content script is loaded
    const isContentScriptLoaded = await checkContentScript();
    
    if (isContentScriptLoaded) {
      // Active state - show full interface
      applyBtn.disabled = false;
      content.style.display = 'flex';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'flex';
      
      // Enable header buttons
      if (copyAnalyticsIdBtn) copyAnalyticsIdBtn.disabled = false;
      if (shareUserPageBtn) shareUserPageBtn.disabled = false;
      if (exportIconBtn) exportIconBtn.disabled = false;
      if (importIconBtn) importIconBtn.disabled = false;
      if (trashIconBtn) trashIconBtn.disabled = false;
    } else {
      // Content script not loaded - show warning
      applyBtn.disabled = true;
      content.style.display = 'none';
      inactiveView.style.display = 'none';
      if (tabNavigation) tabNavigation.style.display = 'none';
      
      // Disable header buttons
      if (copyAnalyticsIdBtn) copyAnalyticsIdBtn.disabled = true;
      if (shareUserPageBtn) shareUserPageBtn.disabled = true;
      if (exportIconBtn) exportIconBtn.disabled = true;
      if (importIconBtn) importIconBtn.disabled = true;
      if (trashIconBtn) trashIconBtn.disabled = true;
      
      // Show a helpful message
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
  } else {
    // Inactive state - show disabled message
    applyBtn.disabled = true;
    content.style.display = 'none';
    inactiveView.style.display = 'block';
    if (tabNavigation) tabNavigation.style.display = 'none';
    
    // Disable header buttons
    if (copyAnalyticsIdBtn) copyAnalyticsIdBtn.disabled = true;
    if (shareUserPageBtn) shareUserPageBtn.disabled = true;
    if (exportIconBtn) exportIconBtn.disabled = true;
    if (importIconBtn) importIconBtn.disabled = true;
    if (trashIconBtn) trashIconBtn.disabled = true;
    
    // Update button text based on current page
    updateMixpanelButtonText();
  }
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
    // Check if already on users page
    if (currentTab.url.includes('/app/users')) {
      if (inactiveTitle) {
        inactiveTitle.style.display = 'block';
        inactiveTitle.textContent = 'Follow instruction to activate';
      }
      if (inactiveMessage) {
        inactiveMessage.style.display = 'block';
        inactiveMessage.innerHTML = 'Click on a user distinct ID';
      }
      // Hide all buttons
      openMixpanelBtn.style.display = 'none';
      if (goToUsersBtn) goToUsersBtn.style.display = 'none';
      if (goToEventsBtn) goToEventsBtn.style.display = 'none';
      return;
    }
    
    // Check if already on events page
    if (currentTab.url.includes('/app/events')) {
      if (inactiveTitle) {
        inactiveTitle.style.display = 'block';
        inactiveTitle.textContent = 'Follow instruction to activate';
      }
      if (inactiveMessage) {
        inactiveMessage.style.display = 'block';
        inactiveMessage.innerHTML = 'Click on a user distinct ID';
      }
      // Hide all buttons
      openMixpanelBtn.style.display = 'none';
      if (goToUsersBtn) goToUsersBtn.style.display = 'none';
      if (goToEventsBtn) goToEventsBtn.style.display = 'none';
      return;
    }
    
    // On a project page but not on users or events page - show both navigation buttons
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
      // Hide the "Open Mixpanel" button
      openMixpanelBtn.style.display = 'none';
      
      // Show and enable both navigation buttons
      if (goToUsersBtn) {
        goToUsersBtn.style.display = 'block';
        goToUsersBtn.disabled = false;
      }
      if (goToEventsBtn) {
        goToEventsBtn.style.display = 'block';
        goToEventsBtn.disabled = false;
      }
      return;
    }
  }
  
  // Default state - not in Mixpanel, show only "Open Mixpanel" button
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
  
  // Hide navigation buttons
  if (goToUsersBtn) goToUsersBtn.style.display = 'none';
  if (goToEventsBtn) goToEventsBtn.style.display = 'none';
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
    eventsList.innerHTML = '<p class="empty-state">Select events to hide from future activity feed. Either press the "Hide Events" button or write event name manually</p>';
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
  
  // Update active tab tracker
  activeTabName = tabName;
  
  // Save last active tab to storage
  chrome.storage.local.set({ lastActiveTab: tabName });
  
  
  // Load property values when switching to properties tab
  if (tabName === 'filterProperties') {
    loadAndDisplayPropertyValues();
  }
  
  // Load timeline data when switching to timeline tab
  if (tabName === 'eventTimeline') {
    loadTimelineData();
    // Disable Export/Import buttons on timeline tab
    updateHeaderButtonsForTab('eventTimeline');
  } else {
    // Re-enable Export/Import buttons on other tabs
    updateHeaderButtonsForTab(tabName);
  }
}

// Update header buttons based on active tab
function updateHeaderButtonsForTab(tabName) {
  const exportBtn = document.getElementById('exportIconBtn');
  const importBtn = document.getElementById('importIconBtn');
  
  if (tabName === 'eventTimeline') {
    // Enable Export but disable Import on timeline tab
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.style.opacity = '1';
    }
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.style.opacity = '0.3';
    }
  } else {
    // Enable Export/Import on other tabs
    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.style.opacity = '1';
    }
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.style.opacity = '1';
    }
  }
}

// Restore last active tab from storage
async function restoreLastActiveTab() {
  try {
    const result = await chrome.storage.local.get(['lastActiveTab']);
    const savedTab = result.lastActiveTab || 'filterEvents'; // Default to filterEvents
    
    
    // Switch to the saved tab (or default)
    switchTab(savedTab);
    
    // Ensure button states are correct for the active tab
    updateHeaderButtonsForTab(savedTab);
  } catch (error) {
    console.error('[Popup] Error restoring last active tab:', error);
    // Fallback to default if error
    switchTab('filterEvents');
    updateHeaderButtonsForTab('filterEvents');
  }
}

// ============ PROPERTY MANAGEMENT FUNCTIONS ============

// Format property name to match Mixpanel UI
function formatPropertyName(propertyName) {
  // Remove leading $ if present
  let formatted = propertyName.startsWith('$') ? propertyName.substring(1) : propertyName;
  
  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Capitalize each word
  formatted = formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}

// Load stored property names from storage
async function loadStoredPropertyNames() {
  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const discoveredProperties = result.discoveredProperties || [];
  const selectedProperties = result.selectedProperties || [];
  
  await displayPropertyNames(discoveredProperties, selectedProperties);
}

// Display property names as checkboxes
async function displayPropertyNames(propertyNames, selectedProperties) {
  const propertiesList = document.getElementById('propertiesList');
  
  if (propertyNames.length === 0) {
    propertiesList.innerHTML = '<p class="empty-state">No properties stored yet. Visit a Mixpanel profile page to start.</p>';
    updatePropertySelectionCount();
    return;
  }
  
  // Save current checkbox states before re-rendering
  const currentStates = {};
  document.querySelectorAll('.property-checkbox').forEach(cb => {
    currentStates[cb.value] = cb.checked;
  });
  
  // Sort properties alphabetically
  propertyNames.sort((a, b) => a.localeCompare(b));
  
  propertiesList.innerHTML = '';
  
  propertyNames.forEach(propertyName => {
    const label = document.createElement('label');
    label.className = 'event-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = propertyName;
    checkbox.className = 'property-checkbox';
    
    // Set checked state: use saved state if exists, otherwise check if in selectedProperties
    if (currentStates.hasOwnProperty(propertyName)) {
      checkbox.checked = currentStates[propertyName];
    } else {
      checkbox.checked = selectedProperties.includes(propertyName);
    }
    
    // Add change listener to update count and auto-save
    checkbox.addEventListener('change', async () => {
      await onPropertyCheckboxChange();
    });
    
    const span = document.createElement('span');
    span.textContent = formatPropertyName(propertyName);
    span.title = propertyName; // Show original name on hover
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'property-item-buttons';
    buttonContainer.style.cssText = 'display: flex; gap: 4px; margin-left: auto;';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'delete-event-btn';
    const copyIcon = document.createElement('img');
    copyIcon.src = '../assets/icons/content_copy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
    copyIcon.alt = 'Copy';
    copyIcon.style.cssText = 'width: 14px; height: 14px;';
    copyBtn.appendChild(copyIcon);
    copyBtn.title = 'Copy property name';
    copyBtn.style.opacity = '0';
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await copyPropertyName(propertyName);
    });
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-event-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete property';
    deleteBtn.style.opacity = '0';
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await deleteProperty(propertyName);
    });
    
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(deleteBtn);
    
    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(buttonContainer);
    propertiesList.appendChild(label);
    
    // Show buttons on hover
    label.addEventListener('mouseenter', () => {
      copyBtn.style.opacity = '1';
      deleteBtn.style.opacity = '1';
    });
    label.addEventListener('mouseleave', () => {
      copyBtn.style.opacity = '0';
      deleteBtn.style.opacity = '0';
    });
  });
  
  // Update selection count after displaying
  updatePropertySelectionCount();
}

// Copy property name to clipboard
async function copyPropertyName(propertyName) {
  try {
    const formattedName = formatPropertyName(propertyName);
    await navigator.clipboard.writeText(formattedName);
    showNotification(`"${formattedName}" copied!`, 'success');
  } catch (error) {
    console.error('[Popup] Error copying to clipboard:', error);
    showNotification('Failed to copy', 'error');
  }
}

// Delete a property from storage
async function deleteProperty(propertyName) {
  const formattedName = formatPropertyName(propertyName);
  // Confirm deletion
  if (!confirm(`Delete "${formattedName}"?\n\nIt will be removed until discovered again.`)) {
    return;
  }
  
  // Get current properties from storage
  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const discoveredProperties = result.discoveredProperties || [];
  const selectedProperties = result.selectedProperties || [];
  
  // Remove from both arrays
  const updatedDiscovered = discoveredProperties.filter(p => p !== propertyName);
  const updatedSelected = selectedProperties.filter(p => p !== propertyName);
  
  await chrome.storage.local.set({ 
    discoveredProperties: updatedDiscovered,
    selectedProperties: updatedSelected
  });
  
  
  // Reload the properties list
  await loadStoredPropertyNames();
  
  // Reload property values display
  await loadAndDisplayPropertyValues();
  
  showNotification(`"${formattedName}" deleted`, 'success');
}

// Update property selection count display
function updatePropertySelectionCount() {
  const selectedCount = document.querySelectorAll('.property-checkbox:checked').length;
  const selectionCountEl = document.getElementById('propertySelectionCount');
  
  if (selectionCountEl) {
    selectionCountEl.textContent = `${selectedCount} propert${selectedCount !== 1 ? 'ies' : 'y'} selected`;
  }
}

// Handle property checkbox change - auto-save and update display
async function onPropertyCheckboxChange() {
  const selectedProperties = getSelectedProperties();
  
  // Save to storage
  await chrome.storage.local.set({ selectedProperties });
  
  
  // Reload property values display
  await loadAndDisplayPropertyValues();
}

// Get selected properties from checkboxes
function getSelectedProperties() {
  const checkboxes = document.querySelectorAll('.property-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Filter property names based on search term
function filterPropertyNames(searchTerm) {
  const propertyItems = document.querySelectorAll('#propertiesList .event-item');
  const searchLower = searchTerm.toLowerCase().trim();
  
  let visibleCount = 0;
  
  propertyItems.forEach(item => {
    const checkbox = item.querySelector('.property-checkbox');
    const originalName = checkbox.value.toLowerCase();
    const displayName = item.querySelector('span').textContent.toLowerCase();
    
    // Match against both original and formatted names
    const matches = displayName.includes(searchLower) || originalName.includes(searchLower);
    
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });
  
  // Update search count
  const searchCount = document.getElementById('propertySearchCount');
  if (searchTerm.trim()) {
    searchCount.textContent = `${visibleCount} of ${propertyItems.length}`;
  } else {
    searchCount.textContent = '';
  }
}

// Load and display current property values
async function loadAndDisplayPropertyValues() {
  const propertyValuesList = document.getElementById('propertyValuesList');
  
  // Get selected properties from storage
  const result = await chrome.storage.local.get(['selectedProperties']);
  const selectedProperties = result.selectedProperties || [];
  
  if (selectedProperties.length === 0) {
    propertyValuesList.innerHTML = '<p class="empty-state">Check properties below to see their values here.</p>';
    return;
  }
  
  // Check if we're on an activity feed page and content script is available
  const isLoaded = currentTab && await checkContentScript();
  
  if (!isLoaded) {
    propertyValuesList.innerHTML = '<p class="empty-state">Navigate to a Mixpanel profile page to see property values.</p>';
    return;
  }
  
  // Get current properties from the page
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getAllProperties'
    });
    
    if (response && response.properties) {
      displayPropertyValues(response.properties, selectedProperties);
    } else {
      propertyValuesList.innerHTML = '<p class="empty-state">No properties found on this page.</p>';
    }
  } catch (error) {
    console.error('[Popup] Error loading property values:', error);
    propertyValuesList.innerHTML = '<p class="empty-state">Error loading properties. Try refreshing the page.</p>';
  }
}

// Display property values in the UI
function displayPropertyValues(allProperties, selectedProperties) {
  const propertyValuesList = document.getElementById('propertyValuesList');
  
  if (selectedProperties.length === 0) {
    propertyValuesList.innerHTML = '<p class="empty-state">Check properties below to see their values here.</p>';
    return;
  }
  
  propertyValuesList.innerHTML = '';
  
  // Sort by property name
  const sortedNames = selectedProperties.sort((a, b) => a.localeCompare(b));
  
  sortedNames.forEach(propName => {
    const exists = allProperties.hasOwnProperty(propName);
    const propValue = exists ? allProperties[propName] : 'Not found on this profile';
    
    const item = document.createElement('div');
    item.className = 'property-value-item';
    if (!exists) {
      item.classList.add('missing');
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'property-value-name';
    const formattedName = formatPropertyName(propName);
    nameSpan.textContent = formattedName;
    nameSpan.title = formattedName; // Show full formatted name on hover
    
    const separator = document.createElement('span');
    separator.className = 'property-value-separator';
    separator.textContent = ':';
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'property-value-text';
    const displayValue = propValue || '(empty)';
    valueSpan.textContent = displayValue;
    // Add tooltip to show full value when hovering over truncated text
    valueSpan.title = displayValue;
    
    // Action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.className = 'property-action-buttons';
    
    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'property-action-btn copy-btn';
    const copyIcon = document.createElement('img');
    copyIcon.src = '../assets/icons/content_copy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
    copyIcon.alt = 'Copy';
    copyIcon.style.cssText = 'width: 14px; height: 14px;';
    copyBtn.appendChild(copyIcon);
    copyBtn.title = 'Copy value';
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await copyPropertyValue(propName, propValue);
    });
    
    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'property-action-btn remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove from selection';
    removeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await removePropertyFromSelection(propName);
    });
    
    actionButtons.appendChild(copyBtn);
    actionButtons.appendChild(removeBtn);
    
    item.appendChild(nameSpan);
    item.appendChild(separator);
    item.appendChild(valueSpan);
    item.appendChild(actionButtons);
    propertyValuesList.appendChild(item);
  });
}

// Copy property value to clipboard
async function copyPropertyValue(propertyName, propertyValue) {
  try {
    await navigator.clipboard.writeText(propertyValue);
    const formattedName = formatPropertyName(propertyName);
    showNotification(`"${formattedName}" copied!`, 'success');
  } catch (error) {
    console.error('[Popup] Error copying to clipboard:', error);
    showNotification('Failed to copy', 'error');
  }
}

// Remove property from selected properties
async function removePropertyFromSelection(propertyName) {
  // Get current selected properties
  const result = await chrome.storage.local.get(['selectedProperties']);
  const selectedProperties = result.selectedProperties || [];
  
  // Remove the property
  const updatedSelected = selectedProperties.filter(p => p !== propertyName);
  
  // Save back to storage
  await chrome.storage.local.set({ selectedProperties: updatedSelected });
  
  
  // Uncheck the corresponding checkbox in the properties list
  const checkbox = document.querySelector(`.property-checkbox[value="${propertyName}"]`);
  if (checkbox) {
    checkbox.checked = false;
  }
  
  // Update selection count
  updatePropertySelectionCount();
  
  // Reload property values display
  await loadAndDisplayPropertyValues();
  
  showNotification(`"${propertyName}" removed`, 'success');
}

// Setup event listeners
function setupEventListeners() {
  // Open Mixpanel button (in inactive view)
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
      const url = getMixpanelURL('users');
      if (currentTab) {
        chrome.tabs.update(currentTab.id, { url });
      }
    });
  }
  
  // Go to Events button
  const goToEventsBtn = document.getElementById('goToEventsBtn');
  if (goToEventsBtn) {
    goToEventsBtn.addEventListener('click', () => {
      const url = getMixpanelURL('events');
      if (currentTab) {
        chrome.tabs.update(currentTab.id, { url });
      }
    });
  }
  
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
    
    if (currentTab) {
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'applyHiddenEvents',
          events: selectedEvents
        });
        
        
        if (response && response.success) {
          // Clear manual events after applying - they'll be auto-discovered if valid
          await chrome.storage.local.set({ manualEvents: [] });
          
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
    // Only check visible checkboxes (respects search filter)
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(cb => {
      const isVisible = cb.closest('.event-item').style.display !== 'none';
      if (isVisible) {
        cb.checked = true;
      }
    });
    updateSelectionCount();
    showNotification('All visible checkboxes checked', 'success');
  });
  
  // Clear all button (uncheck all checkboxes)
  document.getElementById('clearBtn').addEventListener('click', () => {
    // Only uncheck visible checkboxes (respects search filter)
    const checkboxes = document.querySelectorAll('.event-checkbox');
    checkboxes.forEach(cb => {
      const isVisible = cb.closest('.event-item').style.display !== 'none';
      if (isVisible) {
        cb.checked = false;
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
    if (areaName === 'local' && changes.discoveredProperties) {
      // Reload properties when new ones are discovered
      await loadStoredPropertyNames();
    }
  });
  
  // ============ PROPERTY TAB EVENT LISTENERS ============
  
  // Property search input
  const propertySearchInput = document.getElementById('propertySearchInput');
  const clearPropertySearchBtn = document.getElementById('clearPropertySearchBtn');
  
  propertySearchInput.addEventListener('input', (e) => {
    filterPropertyNames(e.target.value);
    // Show/hide clear button
    clearPropertySearchBtn.style.display = e.target.value ? 'flex' : 'none';
  });
  
  // Clear property search button
  clearPropertySearchBtn.addEventListener('click', () => {
    propertySearchInput.value = '';
    filterPropertyNames('');
    clearPropertySearchBtn.style.display = 'none';
    propertySearchInput.focus();
  });
  
  // ============ TIMELINE TAB EVENT LISTENERS ============
  
  // Timeline search input
  const timelineSearchInput = document.getElementById('timelineSearchInput');
  const clearTimelineSearchBtn = document.getElementById('clearTimelineSearchBtn');
  
  if (timelineSearchInput && clearTimelineSearchBtn) {
    timelineSearchInput.addEventListener('input', (e) => {
      filterTimelineEventNames(e.target.value);
      // Show/hide clear button
      clearTimelineSearchBtn.style.display = e.target.value ? 'flex' : 'none';
    });
    
    // Clear timeline search button
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
      
      // Show loading state
      const originalText = loadMoreEventsBtn.textContent;
      loadMoreEventsBtn.textContent = 'Loading...';
      loadMoreEventsBtn.disabled = true;
      
      try {
        // Send message to content script to click the "Show more" button
        const response = await chrome.tabs.sendMessage(currentTab.id, {
          action: 'clickShowMore'
        });
        
        if (response && response.success) {
          // Wait a moment for events to load, then refresh timeline
          setTimeout(async () => {
            await loadTimelineData();
            loadMoreEventsBtn.disabled = false;
          }, 1500);
        } else {
          // Button not found - no more events to load
          
          // Get the earliest event info to display
          try {
            const earliestResponse = await chrome.tabs.sendMessage(currentTab.id, {
              action: 'getEarliestEvent'
            });
            
            if (earliestResponse && earliestResponse.earliestEvent) {
              const dateText = earliestResponse.earliestEvent.replace(/^Since\s+/i, '');
              loadMoreEventsBtn.textContent = 'All events loaded';
              const dateInfoDiv = document.getElementById('loadMoreDateInfo');
              if (dateInfoDiv) {
                dateInfoDiv.textContent = `since ${dateText}`;
              }
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
  
  // Copy Analytics ID button
  document.getElementById('copyAnalyticsIdBtn').addEventListener('click', async () => {
    await copyAnalyticsId();
  });
  
  // Share User Page button
  document.getElementById('shareUserPageBtn').addEventListener('click', async () => {
    await shareUserPage();
  });
  
  // Export icon button - route based on active tab
  document.getElementById('exportIconBtn').addEventListener('click', async () => {
    if (activeTabName === 'filterProperties') {
      await exportProperties();
    } else if (activeTabName === 'eventTimeline') {
      await exportTimeline();
    } else {
      await exportEvents();
    }
  });
  
  // Import icon button - route based on active tab
  document.getElementById('importIconBtn').addEventListener('click', () => {
    // Trigger file input
    document.getElementById('importFileInput').click();
  });
  
  // Trash icon button - route based on active tab
  document.getElementById('trashIconBtn').addEventListener('click', async () => {
    if (activeTabName === 'filterProperties') {
      await clearProperties();
    } else if (activeTabName === 'eventTimeline') {
      await clearTimelineSelections();
    } else {
      await clearEvents();
    }
  });
  
  // File input change handler - route based on active tab
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
      
      if (activeTabName === 'filterProperties') {
        await importProperties(content);
      } else {
        await importEvents(content);
      }
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
    
    
    if (response && response.events) {
      const currentURLEvents = response.events;
      
      // Only sync if there are actually events in the URL
      // Otherwise keep the default "all checked" state
      if (currentURLEvents.length > 0) {
        // Update checkboxes to match URL
        const checkboxes = document.querySelectorAll('.event-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = currentURLEvents.includes(checkbox.value);
        });
      } else {
      }
    }
  } catch (error) {
    // Silently fail - this is expected when content script isn't loaded
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
function getMixpanelURL(page = 'users') {
  // Check if we're already on a Mixpanel page with project/view IDs
  if (currentTab && currentTab.url && currentTab.url.includes('mixpanel.com/project/')) {
    // Extract project ID and view ID from URL
    // Example: https://mixpanel.com/project/2582735/view/3122095/app/home
    const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
    
    if (match) {
      const projectId = match[1];
      const viewId = match[2];
      return `https://mixpanel.com/project/${projectId}/view/${viewId}/app/${page}`;
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

// Export properties to a .txt file
async function exportProperties() {
  try {
    // Get selected properties from storage
    const result = await chrome.storage.local.get(['selectedProperties']);
    const selectedProperties = result.selectedProperties || [];
    
    if (selectedProperties.length === 0) {
      showNotification('No properties selected to export', 'error');
      return;
    }
    
    // Sort alphabetically
    selectedProperties.sort();
    
    // Format as simple list (one property per line, original format)
    const content = selectedProperties.join('\n');
    
    // Create blob
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mixpanel_properties.txt';
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`${selectedProperties.length} propert${selectedProperties.length !== 1 ? 'ies' : 'y'} exported`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting properties:', error);
    showNotification('Error exporting properties', 'error');
  }
}

// Import properties from a .txt file
async function importProperties(fileContent) {
  try {
    // Parse file: split by newlines, trim, filter empty
    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      showNotification('No properties found in file', 'error');
      return;
    }
    
    // Remove duplicates
    const uniqueProperties = [...new Set(lines)];
    
    // Get current properties from storage
    const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
    const discoveredProperties = result.discoveredProperties || [];
    const selectedProperties = result.selectedProperties || [];
    
    // Add to discovered properties (merge, avoid duplicates)
    const mergedDiscovered = [...new Set([...discoveredProperties, ...uniqueProperties])];
    
    // Add to selected properties (merge, avoid duplicates)
    const mergedSelected = [...new Set([...selectedProperties, ...uniqueProperties])];
    
    // Save to storage
    await chrome.storage.local.set({ 
      discoveredProperties: mergedDiscovered,
      selectedProperties: mergedSelected
    });
    
    
    // Reload properties list
    await loadStoredPropertyNames();
    
    // Reload property values display
    await loadAndDisplayPropertyValues();
    
    showNotification(
      `${uniqueProperties.length} propert${uniqueProperties.length !== 1 ? 'ies' : 'y'} imported and selected`,
      'success'
    );
  } catch (error) {
    console.error('[Popup] Error importing properties:', error);
    showNotification('Error importing properties', 'error');
  }
}

// Clear all properties
async function clearProperties() {
  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const totalProperties = (result.discoveredProperties || []).length;
  
  if (totalProperties === 0) {
    showNotification('No properties to clear', 'error');
    return;
  }
  
  const confirmed = confirm(
    `Are you sure you want to delete ALL ${totalProperties} propert${totalProperties !== 1 ? 'ies' : 'y'}?\n\n` +
    `This will permanently remove all discovered properties from storage.`
  );
  
  if (confirmed) {
    await chrome.storage.local.set({ 
      discoveredProperties: [],
      selectedProperties: []
    });
    
    // Reload UI
    await loadStoredPropertyNames();
    await loadAndDisplayPropertyValues();
    
    showNotification('All properties cleared', 'success');
  }
}

// Clear all events (refactored from trash button handler)
async function clearEvents() {
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
    
    // Reload events list
    await loadStoredEvents();
    
    showNotification('All events cleared', 'success');
  }
}

// Copy Analytics ID (distinct_id) from URL
async function copyAnalyticsId() {
  try {
    if (!currentTab || !currentTab.url) {
      showNotification('No active tab found', 'error');
      return;
    }
    
    // Extract distinct_id from URL hash
    const url = currentTab.url;
    const match = url.match(/distinct_id=([^&]+)/);
    
    if (!match || !match[1]) {
      showNotification('No analytics ID found in URL', 'error');
      return;
    }
    
    const analyticsId = decodeURIComponent(match[1]);
    
    // Copy to clipboard
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
    
    // Copy full URL to clipboard
    await navigator.clipboard.writeText(currentTab.url);
    showNotification('Page URL copied!', 'success');
  } catch (error) {
    console.error('[Popup] Error copying URL:', error);
    showNotification('Failed to copy URL', 'error');
  }
}

// ============ EVENT TIMELINE FUNCTIONS ============

// Store earliest event info
let earliestEventInfo = null;


// Load timeline data from activity feed
async function loadTimelineData() {
  const timelineEventsList = document.getElementById('timelineEventsList');
  const loadMoreBtn = document.getElementById('loadMoreEventsBtn');
  
  // Check if we're on an activity feed page and content script is available
  const isLoaded = currentTab && await checkContentScript();
  
  if (!isLoaded) {
    timelineEventsList.innerHTML = '<p class="empty-state">Not on activity feed page.</p>';
    if (loadMoreBtn) loadMoreBtn.textContent = 'Load more events';
    return;
  }
  
  // Load saved selections (global, shared across all users)
  const cached = await chrome.storage.local.get(['selectedTimelineEvents', 'hiddenTimelineEvents']);
  const cachedSelected = cached['selectedTimelineEvents'] || [];
  const cachedHidden = cached['hiddenTimelineEvents'] || [];
  selectedTimelineEvents = cachedSelected;
  hiddenTimelineEvents = cachedHidden;
  
  // Fetch fresh data from page
  try {
    const eventsResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getEventDatabase'
    });
    
    const earliestResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getEarliestEvent'
    });
    
    if (eventsResponse && eventsResponse.events) {
      eventDatabase = eventsResponse.events;
      
      // Store earliest event info
      if (earliestResponse && earliestResponse.earliestEvent) {
        earliestEventInfo = earliestResponse.earliestEvent;
        
        // Update Load More button text with the start date
        if (loadMoreBtn) {
          loadMoreBtn.textContent = 'Load more';
          const dateText = earliestEventInfo.replace(/^Since\s+/i, '');
          const dateInfoDiv = document.getElementById('loadMoreDateInfo');
          if (dateInfoDiv) {
            dateInfoDiv.textContent = `since ${dateText}`;
          }
        }
      } else {
        if (loadMoreBtn) {
          loadMoreBtn.textContent = 'Load more';
          const dateInfoDiv = document.getElementById('loadMoreDateInfo');
          if (dateInfoDiv) dateInfoDiv.textContent = '';
        }
      }
      
      // Display unique event names for selection (with saved selections restored)
      displayTimelineEventNames();
      
      // Update timeline display
      displayTimeline();
    } else {
      timelineEventsList.innerHTML = '<p class="empty-state">No events on this page.</p>';
      if (loadMoreBtn) loadMoreBtn.textContent = 'Load more events';
    }
  } catch (error) {
    console.error('[Popup] Error loading timeline data:', error);
    timelineEventsList.innerHTML = '<p class="empty-state">Error loading events.</p>';
    if (loadMoreBtn) loadMoreBtn.textContent = 'Load more events';
  }
}

// Display unique event names as checkboxes
function displayTimelineEventNames() {
  const timelineEventsList = document.getElementById('timelineEventsList');
  
  if (eventDatabase.length === 0) {
    timelineEventsList.innerHTML = '<p class="empty-state">No events in database.</p>';
    return;
  }
  
  // Get unique event names
  const eventNames = [...new Set(eventDatabase.map(event => event.name))];
  eventNames.sort();
  
  
  timelineEventsList.innerHTML = '';
  
  eventNames.forEach(eventName => {
    const label = document.createElement('label');
    label.className = 'event-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = eventName;
    checkbox.className = 'timeline-event-checkbox';
    checkbox.checked = selectedTimelineEvents.includes(eventName);
    
    // Add change listener to update timeline
    checkbox.addEventListener('change', async () => {
      await updateSelectedTimelineEvents();
      displayTimeline();
    });
    
    const span = document.createElement('span');
    span.textContent = eventName;
    
    label.appendChild(checkbox);
    label.appendChild(span);
    timelineEventsList.appendChild(label);
  });
}

// Update selected timeline events
async function updateSelectedTimelineEvents() {
  const prevSelectedEvents = [...selectedTimelineEvents];
  const checkboxes = document.querySelectorAll('.timeline-event-checkbox:checked');
  selectedTimelineEvents = Array.from(checkboxes).map(cb => cb.value);
  
  // Find events that were unchecked (in previous but not in current)
  const uncheckedEvents = prevSelectedEvents.filter(eventName => 
    !selectedTimelineEvents.includes(eventName)
  );
  
  // Clear hidden instances for unchecked events
  if (uncheckedEvents.length > 0) {
    hiddenTimelineEvents = hiddenTimelineEvents.filter(eventKey => {
      // Extract event name from key (format: "EventName|||date|||time")
      const eventName = eventKey.split('|||')[0];
      return !uncheckedEvents.includes(eventName);
    });
  }
  
  // Save to storage (global, shared across all users)
  await chrome.storage.local.set({
    selectedTimelineEvents: selectedTimelineEvents,
    hiddenTimelineEvents: hiddenTimelineEvents
  });
}

// Display timeline with day separators
function displayTimeline() {
  const timelineDisplay = document.getElementById('timelineDisplay');
  const timelineEventCount = document.getElementById('timelineEventCount');
  
  if (selectedTimelineEvents.length === 0) {
    timelineDisplay.innerHTML = '<p class="empty-state">Select events below to see their timeline.</p>';
    if (timelineEventCount) timelineEventCount.textContent = '';
    return;
  }
  
  // Filter events based on selection and hidden status
  const filteredEvents = eventDatabase.filter(event => {
    if (!selectedTimelineEvents.includes(event.name)) {
      return false;
    }
    // Create unique key for this event instance
    const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;
    return !hiddenTimelineEvents.includes(eventKey);
  });
  
  if (filteredEvents.length === 0) {
    timelineDisplay.innerHTML = '<p class="empty-state">No matching events in timeline.</p>';
    if (timelineEventCount) timelineEventCount.textContent = '';
    return;
  }
  
  // Update event count
  if (timelineEventCount) {
    const eventText = filteredEvents.length === 1 ? 'event' : 'events';
    timelineEventCount.textContent = `(${filteredEvents.length} ${eventText} tracked)`;
  }
  
  // Build timeline HTML
  timelineDisplay.innerHTML = '';
  
  // Group events by date
  const eventsByDate = {};
  filteredEvents.forEach(event => {
    const date = event.date || 'Unknown Date';
    if (!eventsByDate[date]) {
      eventsByDate[date] = [];
    }
    eventsByDate[date].push(event);
  });
  
  // Sort dates (most recent first)
  const dates = Object.keys(eventsByDate);
  
  dates.forEach(date => {
    // Add day separator
    const separator = document.createElement('div');
    separator.className = 'timeline-day-separator';
    separator.textContent = date;
    timelineDisplay.appendChild(separator);
    
    // Add events for this day
    const eventsForDay = eventsByDate[date];
    eventsForDay.forEach(event => {
      const eventItem = document.createElement('div');
      eventItem.className = 'timeline-event-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'timeline-event-name';
      nameSpan.textContent = event.name;
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'timeline-event-time';
      timeSpan.textContent = event.displayTime || event.time || '';
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'timeline-delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Remove from timeline';
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await hideTimelineEvent(event);
      });
      
      // Add click handler to open event in Mixpanel
      eventItem.addEventListener('click', async () => {
        if (currentTab) {
          try {
            // Convert currently clicked item to visited state
            document.querySelectorAll('.timeline-event-item.clicked').forEach(item => {
              item.classList.remove('clicked');
              item.classList.add('visited');
            });
            
            // Add clicked state to this event (and mark as visited)
            eventItem.classList.add('clicked');
            eventItem.classList.add('visited');
            
            await chrome.tabs.sendMessage(currentTab.id, {
              action: 'openEvent',
              eventName: event.name,
              eventTime: event.displayTime || event.time
            });
          } catch (error) {
            console.error('[Popup] Error opening event:', error);
          }
        }
      });
      
      eventItem.appendChild(nameSpan);
      eventItem.appendChild(timeSpan);
      eventItem.appendChild(deleteBtn);
      timelineDisplay.appendChild(eventItem);
    });
  });
  
}

// Hide a specific timeline event instance
async function hideTimelineEvent(event) {
  // Create unique key for this event instance
  const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;
  
  // Add to hidden list if not already there
  if (!hiddenTimelineEvents.includes(eventKey)) {
    hiddenTimelineEvents.push(eventKey);
    
    // Save to storage
    await chrome.storage.local.set({
      hiddenTimelineEvents: hiddenTimelineEvents
    });
    
    
    // Refresh timeline display
    displayTimeline();
  }
}

// Filter timeline event names based on search
function filterTimelineEventNames(searchTerm) {
  const eventItems = document.querySelectorAll('#timelineEventsList .event-item');
  const searchLower = searchTerm.toLowerCase().trim();
  
  let visibleCount = 0;
  
  eventItems.forEach(item => {
    const eventName = item.querySelector('span').textContent.toLowerCase();
    const matches = eventName.includes(searchLower);
    
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });
  
  // Update search count
  const searchCount = document.getElementById('timelineSearchCount');
  if (searchTerm.trim()) {
    searchCount.textContent = `${visibleCount} of ${eventItems.length}`;
  } else {
    searchCount.textContent = '';
  }
}

// Clear all timeline event selections
async function clearTimelineSelections() {
  const checkboxes = document.querySelectorAll('.timeline-event-checkbox');
  
  if (checkboxes.length === 0 && hiddenTimelineEvents.length === 0) {
    return;
  }
  
  // Uncheck all checkboxes
  checkboxes.forEach(cb => {
    cb.checked = false;
  });
  
  // Clear selected events and hidden events
  selectedTimelineEvents = [];
  hiddenTimelineEvents = [];
  
  // Save to storage (global, shared across all users)
  await chrome.storage.local.set({
    selectedTimelineEvents: [],
    hiddenTimelineEvents: []
  });
  
  
  // Update timeline display (will show empty state)
  displayTimeline();
}

// Export timeline events to a .txt file
async function exportTimeline() {
  try {
    // Get user ID from URL
    if (!currentTab || !currentTab.url) {
      showNotification('No active tab found', 'error');
      return;
    }
    
    const url = currentTab.url;
    const match = url.match(/distinct_id=([^&]+)/);
    
    if (!match || !match[1]) {
      showNotification('No user ID found in URL', 'error');
      return;
    }
    
    const userId = decodeURIComponent(match[1]);
    
    // Check if there are selected events
    if (selectedTimelineEvents.length === 0) {
      showNotification('No events selected to export', 'error');
      return;
    }
    
    // Filter events based on selection and hidden status
    const filteredEvents = eventDatabase.filter(event => {
      if (!selectedTimelineEvents.includes(event.name)) {
        return false;
      }
      // Create unique key for this event instance
      const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;
      return !hiddenTimelineEvents.includes(eventKey);
    });
    
    if (filteredEvents.length === 0) {
      showNotification('No events in timeline to export', 'error');
      return;
    }
    
    // Build the export content
    let content = `user_id: ${userId}\n\n`;
    
    // Group events by date
    const eventsByDate = {};
    filteredEvents.forEach(event => {
      const date = event.date || 'Unknown Date';
      if (!eventsByDate[date]) {
        eventsByDate[date] = [];
      }
      eventsByDate[date].push(event);
    });
    
    // Sort dates (keep the order as displayed)
    const dates = Object.keys(eventsByDate);
    
    // Build content with date separators
    dates.forEach((date, index) => {
      content += `----${date}----\n`;
      
      const eventsForDay = eventsByDate[date];
      
      // Add each event with time and name
      eventsForDay.forEach(event => {
        const time = event.displayTime || event.time || '';
        content += `${time} ${event.name}\n`;
      });
      
      // Add blank line between dates (except after last date)
      if (index < dates.length - 1) {
        content += '\n';
      }
    });
    
    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const downloadUrl = URL.createObjectURL(blob);
    
    // Create temporary download link
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `timeline_${userId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    
    showNotification(`Timeline exported (${filteredEvents.length} events)`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting timeline:', error);
    showNotification('Error exporting timeline', 'error');
  }
}

// Show notification (disabled)
function showNotification(message, type) {
  // Notification disabled by user request
  return;
}

