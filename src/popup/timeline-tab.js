// Quick Timeline tab logic for Mixpanel Activity Navigator
// Location: src/popup/timeline-tab.js

let eventDatabase = [];
let selectedTimelineEvents = [];
let hiddenTimelineEvents = [];
let readTimelineEvents = [];
let expandedEventsSet = new Set(); // "name|||time" keys of currently expanded events
let expandPollInterval = null;
let earliestEventInfo = null;

// Load timeline data from activity feed
async function loadTimelineData() {
  const timelineEventsList = document.getElementById('timelineEventsList');
  const loadMoreBtn = document.getElementById('loadMoreEventsBtn');

  const isLoaded = currentTab && await checkContentScript();

  if (!isLoaded) {
    timelineEventsList.innerHTML = '<p class="empty-state">Activity feed not detected. Open a user profile or sidebar feed to use timeline.</p>';
    if (loadMoreBtn) loadMoreBtn.textContent = 'Load more events';
    return;
  }

  // Load saved selections
  const cached = await chrome.storage.local.get(['selectedTimelineEvents', 'hiddenTimelineEvents', 'readTimelineEvents']);
  selectedTimelineEvents = cached['selectedTimelineEvents'] || [];
  hiddenTimelineEvents = cached['hiddenTimelineEvents'] || [];
  readTimelineEvents = cached['readTimelineEvents'] || [];

  // Start polling for expand state
  startExpandStatePoll();

  try {
    const eventsResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getEventDatabase'
    });

    const earliestResponse = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getEarliestEvent'
    });

    if (eventsResponse && eventsResponse.events) {
      eventDatabase = eventsResponse.events;

      if (earliestResponse && earliestResponse.earliestEvent) {
        earliestEventInfo = earliestResponse.earliestEvent;

        if (loadMoreBtn) {
          loadMoreBtn.textContent = 'Load more';
          const dateText = earliestEventInfo.replace(/^Since\s+/i, '');
          const dateInfoDiv = document.getElementById('loadMoreDateInfo');
          if (dateInfoDiv) dateInfoDiv.textContent = `since ${dateText}`;
        }
      } else {
        if (loadMoreBtn) {
          loadMoreBtn.textContent = 'Load more';
          const dateInfoDiv = document.getElementById('loadMoreDateInfo');
          if (dateInfoDiv) dateInfoDiv.textContent = '';
        }
      }

      displayTimelineEventNames();
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

  // Find events that were unchecked
  const uncheckedEvents = prevSelectedEvents.filter(eventName =>
    !selectedTimelineEvents.includes(eventName)
  );

  // Clear hidden instances for unchecked events
  if (uncheckedEvents.length > 0) {
    hiddenTimelineEvents = hiddenTimelineEvents.filter(eventKey => {
      const eventName = eventKey.split('|||')[0];
      return !uncheckedEvents.includes(eventName);
    });
  }

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

  const filteredEvents = eventDatabase.filter(event => {
    if (!selectedTimelineEvents.includes(event.name)) return false;
    const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;
    return !hiddenTimelineEvents.includes(eventKey);
  });

  if (filteredEvents.length === 0) {
    timelineDisplay.innerHTML = '<p class="empty-state">No matching events in timeline.</p>';
    if (timelineEventCount) timelineEventCount.textContent = '';
    return;
  }

  if (timelineEventCount) {
    const eventText = filteredEvents.length === 1 ? 'event' : 'events';
    timelineEventCount.textContent = `(${filteredEvents.length} ${eventText} tracked)`;
  }

  timelineDisplay.innerHTML = '';

  // Group events by date
  const eventsByDate = {};
  filteredEvents.forEach(event => {
    const date = event.date || 'Unknown Date';
    if (!eventsByDate[date]) eventsByDate[date] = [];
    eventsByDate[date].push(event);
  });

  const dates = Object.keys(eventsByDate);

  dates.forEach(date => {
    const separator = document.createElement('div');
    separator.className = 'timeline-day-separator';
    separator.textContent = date;
    timelineDisplay.appendChild(separator);

    eventsByDate[date].forEach(event => {
      const eventKey = `${event.name}|||${event.displayTime || event.time}`;
      const isRead = readTimelineEvents.includes(eventKey);
      const isExpanded = expandedEventsSet.has(eventKey);

      const eventItem = document.createElement('div');
      eventItem.className = 'timeline-event-item';
      eventItem.dataset.eventKey = eventKey;
      if (isRead) eventItem.classList.add('read');
      if (isExpanded) eventItem.classList.add('expanded');

      const nameSpan = document.createElement('span');
      nameSpan.className = 'timeline-event-name';
      nameSpan.textContent = event.name;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'timeline-event-time';
      timeSpan.textContent = event.displayTime || event.time || '';

      // Collapse button (only visible when expanded)
      const collapseBtn = document.createElement('button');
      collapseBtn.className = 'timeline-collapse-btn';
      collapseBtn.title = 'Collapse this event';
      collapseBtn.innerHTML = '<img src="../assets/icons/unfold_less_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg" alt="Collapse" style="width: 12px; height: 12px;">';
      collapseBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentTab) return;
        try {
          await chrome.tabs.sendMessage(currentTab.id, {
            action: 'collapseEvent',
            eventName: event.name,
            eventTime: event.displayTime || event.time
          });
          expandedEventsSet.delete(eventKey);
          eventItem.classList.remove('expanded');
        } catch (error) {
          console.error('[Popup] Error collapsing event:', error);
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'timeline-delete-btn';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Remove from timeline';
      deleteBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await hideTimelineEvent(event);
      });

      // Click to expand (navigate) — never collapses
      eventItem.addEventListener('click', async () => {
        if (!currentTab) return;
        try {
          // Sync once right before click handling so we avoid sending openEvent
          // for items already expanded in the page.
          await refreshExpandState();

          document.querySelectorAll('.timeline-event-item.clicked').forEach(item => {
            item.classList.remove('clicked');
          });

          eventItem.classList.add('clicked');
          eventItem.classList.add('read');

          // Mark as read persistently
          if (!readTimelineEvents.includes(eventKey)) {
            readTimelineEvents.push(eventKey);
            await chrome.storage.local.set({ readTimelineEvents });
          }

          // Hard guard: never request toggle/open when this event is already expanded.
          if (eventItem.classList.contains('expanded') || expandedEventsSet.has(eventKey)) {
            return;
          }

          const response = await chrome.tabs.sendMessage(currentTab.id, {
            action: 'openEvent',
            eventName: event.name,
            eventTime: event.displayTime || event.time
          });

          if (response && response.success) {
            expandedEventsSet.add(eventKey);
            eventItem.classList.add('expanded');
          }
        } catch (error) {
          console.error('[Popup] Error opening event:', error);
        }
      });

      eventItem.appendChild(nameSpan);
      eventItem.appendChild(timeSpan);
      eventItem.appendChild(collapseBtn);
      eventItem.appendChild(deleteBtn);
      timelineDisplay.appendChild(eventItem);
    });
  });
}

// Hide a specific timeline event instance
async function hideTimelineEvent(event) {
  const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;

  if (!hiddenTimelineEvents.includes(eventKey)) {
    hiddenTimelineEvents.push(eventKey);

    await chrome.storage.local.set({
      hiddenTimelineEvents: hiddenTimelineEvents
    });

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

  if (checkboxes.length === 0 && hiddenTimelineEvents.length === 0 && readTimelineEvents.length === 0) return;

  checkboxes.forEach(cb => { cb.checked = false; });

  selectedTimelineEvents = [];
  hiddenTimelineEvents = [];
  readTimelineEvents = [];
  expandedEventsSet.clear();

  await chrome.storage.local.set({
    selectedTimelineEvents: [],
    hiddenTimelineEvents: [],
    readTimelineEvents: []
  });

  displayTimeline();
}

// Start polling for expand state from the page
function startExpandStatePoll() {
  if (expandPollInterval) clearInterval(expandPollInterval);
  expandPollInterval = setInterval(async () => {
    if (activeTabName !== 'eventTimeline') return;
    await refreshExpandState();
  }, 2000);
}

// Refresh expand state from the content script
async function refreshExpandState() {
  if (!currentTab) return;
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getExpandedEvents'
    });
    if (response && response.success && response.expanded) {
      const newSet = new Set(response.expanded.map(e => `${e.name}|||${e.time}`));

      // Update DOM if changed
      if (setsDiffer(expandedEventsSet, newSet)) {
        expandedEventsSet = newSet;
        document.querySelectorAll('.timeline-event-item').forEach(item => {
          const key = item.dataset.eventKey;
          if (key) {
            item.classList.toggle('expanded', expandedEventsSet.has(key));
          }
        });
      }
    }
  } catch (error) {
    // Content script may not be available
  }
}

function setsDiffer(a, b) {
  if (a.size !== b.size) return true;
  for (const val of a) { if (!b.has(val)) return true; }
  return false;
}

// Export timeline events to a .txt file
async function exportTimeline() {
  try {
    if (!currentTab || !currentTab.url) {
      showNotification('No active tab found', 'error');
      return;
    }

    const match = currentTab.url.match(/distinct_id=([^&]+)/);

    if (!match || !match[1]) {
      showNotification('No user ID found in URL', 'error');
      return;
    }

    const userId = decodeURIComponent(match[1]);

    if (selectedTimelineEvents.length === 0) {
      showNotification('No events selected to export', 'error');
      return;
    }

    const filteredEvents = eventDatabase.filter(event => {
      if (!selectedTimelineEvents.includes(event.name)) return false;
      const eventKey = `${event.name}|||${event.date}|||${event.displayTime || event.time}`;
      return !hiddenTimelineEvents.includes(eventKey);
    });

    if (filteredEvents.length === 0) {
      showNotification('No events in timeline to export', 'error');
      return;
    }

    let content = `user_id: ${userId}\n\n`;

    const eventsByDate = {};
    filteredEvents.forEach(event => {
      const date = event.date || 'Unknown Date';
      if (!eventsByDate[date]) eventsByDate[date] = [];
      eventsByDate[date].push(event);
    });

    const dates = Object.keys(eventsByDate);

    dates.forEach((date, index) => {
      content += `----${date}----\n`;

      eventsByDate[date].forEach(event => {
        const time = event.displayTime || event.time || '';
        content += `${time} ${event.name}\n`;
      });

      if (index < dates.length - 1) content += '\n';
    });

    downloadTextFile(content, `timeline_${userId.replace(/[^a-zA-Z0-9]/g, '_')}.txt`);
    showNotification(`Timeline exported (${filteredEvents.length} events)`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting timeline:', error);
    showNotification('Error exporting timeline', 'error');
  }
}
