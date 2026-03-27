// Storage helpers for Mixpanel Activity Navigator
// Location: src/popup/storage.js

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

  if (uniqueManualEvents.length !== manualEvents.length) {
    await chrome.storage.local.set({ manualEvents: uniqueManualEvents });
  }

  const allEvents = [
    ...autoEvents.map(name => ({ name, manual: false })),
    ...uniqueManualEvents.map(name => ({ name, manual: true }))
  ];

  const isLoaded = currentTab && await checkContentScript();
  await displayEvents(allEvents, isLoaded);
}

// Load stored property names from storage
async function loadStoredPropertyNames() {
  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const discoveredProperties = result.discoveredProperties || [];
  const selectedProperties = result.selectedProperties || [];
  await displayPropertyNames(discoveredProperties, selectedProperties);
}

// Get selected events from checkboxes
function getSelectedEvents() {
  const checkboxes = document.querySelectorAll('.event-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Get selected properties from checkboxes
function getSelectedProperties() {
  const checkboxes = document.querySelectorAll('.property-checkbox:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}
