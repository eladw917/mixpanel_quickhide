// Feed Cleaner tab logic for Mixpanel Activity Navigator
// Location: src/popup/events-tab.js

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

  events.sort((a, b) => a.name.localeCompare(b.name));

  eventsList.innerHTML = '';

  events.forEach(eventObj => {
    const label = document.createElement('label');
    label.className = 'event-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = eventObj.name;
    checkbox.className = 'event-checkbox';
    checkbox.checked = currentStates.hasOwnProperty(eventObj.name) ? currentStates[eventObj.name] : true;
    checkbox.dataset.manual = eventObj.manual;
    checkbox.addEventListener('change', updateSelectionCount);

    const span = document.createElement('span');
    span.textContent = eventObj.manual ? `${eventObj.name} [m]` : eventObj.name;
    span.className = eventObj.manual ? 'manual-event-text' : '';

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

  if (shouldSync && Object.keys(currentStates).length === 0) {
    await syncCheckboxesWithURL();
  }

  updateSelectionCount();
}

// Sync checkboxes with URL's current hidden events
async function syncCheckboxesWithURL() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (!tab || !tab.url ||
      !tab.url.includes('mixpanel.com/project/') ||
      !tab.url.includes('/app/profile') ||
      !tab.url.includes('distinct_id=')) {
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getCurrentEvents'
    });

    if (response && response.events) {
      const currentURLEvents = response.events;

      if (currentURLEvents.length > 0) {
        const checkboxes = document.querySelectorAll('.event-checkbox');
        checkboxes.forEach(checkbox => {
          checkbox.checked = currentURLEvents.includes(checkbox.value);
        });
      }
    }
  } catch (error) {
    // Expected when content script isn't loaded
  }
}

// Filter events based on search term
function filterEvents(searchTerm) {
  const eventItems = document.querySelectorAll('#filterEventsTab .event-item');
  const searchLower = searchTerm.toLowerCase().trim();

  let visibleCount = 0;

  eventItems.forEach(item => {
    const eventName = item.querySelector('span').textContent.toLowerCase();
    const matches = eventName.includes(searchLower);
    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });

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

  const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
  const autoEvents = result.hiddenEvents || [];
  const manualEvents = result.manualEvents || [];

  if (autoEvents.includes(trimmedName) || manualEvents.includes(trimmedName)) {
    showNotification('Event already exists', 'error');
    return;
  }

  manualEvents.push(trimmedName);
  await chrome.storage.local.set({ manualEvents });

  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearchBtn').style.display = 'none';
  await loadStoredEvents();

  showNotification(`"${trimmedName}" added [m]`, 'success');
}

// Delete an event from storage
async function deleteEvent(eventName, isManual) {
  if (!confirm(`Delete "${eventName}"?\n\n${isManual ? 'This manual event will be removed.' : 'It will be removed until you hide it again in Mixpanel.'}`)) {
    return;
  }

  const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
  const autoEvents = result.hiddenEvents || [];
  const manualEvents = result.manualEvents || [];

  if (isManual) {
    const updatedManual = manualEvents.filter(e => e !== eventName);
    await chrome.storage.local.set({ manualEvents: updatedManual });
  } else {
    const updatedAuto = autoEvents.filter(e => e !== eventName);
    await chrome.storage.local.set({ hiddenEvents: updatedAuto });
  }

  await loadStoredEvents();
  showNotification(`"${eventName}" deleted`, 'success');
}

// Export events to a .txt file
async function exportEvents() {
  try {
    const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
    const autoEvents = result.hiddenEvents || [];
    const manualEvents = result.manualEvents || [];

    const allEvents = [...new Set([...autoEvents, ...manualEvents])];

    if (allEvents.length === 0) {
      showNotification('No events to export', 'error');
      return;
    }

    allEvents.sort();
    downloadTextFile(allEvents.join('\n'), 'mixpanel_events.txt');
    showNotification(`${allEvents.length} event${allEvents.length !== 1 ? 's' : ''} exported`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting events:', error);
    showNotification('Error exporting events', 'error');
  }
}

// Import events from a .txt file
async function importEvents(fileContent) {
  try {
    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      showNotification('No events found in file', 'error');
      return;
    }

    const uniqueEvents = [...new Set(lines)];

    const replace = confirm(
      `Found ${uniqueEvents.length} event${uniqueEvents.length !== 1 ? 's' : ''} in file.\n\n` +
      `Click OK to REPLACE existing events.\n` +
      `Click Cancel to MERGE with existing events.`
    );

    if (replace) {
      await chrome.storage.local.set({
        hiddenEvents: uniqueEvents,
        manualEvents: []
      });
    } else {
      const result = await chrome.storage.local.get(['hiddenEvents', 'manualEvents']);
      const existingAuto = result.hiddenEvents || [];
      const existingManual = result.manualEvents || [];

      const mergedEvents = [...new Set([...existingAuto, ...existingManual, ...uniqueEvents])];

      await chrome.storage.local.set({
        hiddenEvents: mergedEvents,
        manualEvents: []
      });
    }

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

// Clear all events
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

    await loadStoredEvents();
    showNotification('All events cleared', 'success');
  }
}
