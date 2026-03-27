// Content script for Mixpanel Activity Navigator
// Location: src/content.js

// Prevent double-execution if injected multiple times
if (window.__mixpanelActivityNavLoaded) {
  // Already loaded — skip
} else {
window.__mixpanelActivityNavLoaded = true;

// Track whether MutationObserver is already running
let observerActive = false;

// Check if we're on an actual user activity feed page
function isOnActivityFeedPage() {
  const hash = window.location.hash;
  return hash && hash.includes('distinct_id=');
}

// Function to extract hidden events from URL hash
function extractHiddenEvents() {
  const hash = window.location.hash;

  if (!hash) return [];

  const excludedEventsMatch = hash.match(/excludedEvents~\(([^)]*)\)/);

  if (!excludedEventsMatch) return [];

  const eventsString = excludedEventsMatch[1];

  const events = eventsString
    .split("~'")
    .filter(event => event.length > 0)
    .map(event => event.trim());

  return events;
}

// Function to save discovered events to storage
async function saveDiscoveredEvents(events) {
  if (events.length === 0) return;

  const result = await chrome.storage.local.get(['hiddenEvents']);
  const existingEvents = result.hiddenEvents || [];

  const newEvents = events.filter(event => !existingEvents.includes(event));

  if (newEvents.length === 0) return;

  const mergedEvents = [...new Set([...existingEvents, ...events])];

  await chrome.storage.local.set({ hiddenEvents: mergedEvents });
}

// Function to parse properties from DOM
function parsePropertiesFromDOM() {
  const properties = {};

  const propertyElements = document.querySelectorAll('profile-editable-property');

  propertyElements.forEach((element) => {
    try {
      const propertyAttr = element.getAttribute('property');
      if (!propertyAttr) return;

      const propertyData = JSON.parse(propertyAttr);

      const propertyName = propertyData?.name?.raw;
      const propertyValue = propertyData?.renderValue?.renderString || '';

      if (propertyName) {
        properties[propertyName] = propertyValue;
      }
    } catch (error) {
      console.error('[Mixpanel Activity Navigator] Error parsing property:', error, element);
    }
  });

  return properties;
}

// Function to save discovered property names to storage
async function saveDiscoveredProperties(properties) {
  const propertyNames = Object.keys(properties);

  if (propertyNames.length === 0) return;

  const result = await chrome.storage.local.get(['discoveredProperties']);
  const existingProperties = result.discoveredProperties || [];

  const newProperties = propertyNames.filter(name => !existingProperties.includes(name));

  if (newProperties.length === 0) return;

  const mergedProperties = [...new Set([...existingProperties, ...propertyNames])];

  await chrome.storage.local.set({ discoveredProperties: mergedProperties });
}

// Function to parse events from activity feed
function parseEventsFromDOM() {
  const events = [];

  const profileActivity = document.querySelector('profile-activity');
  if (!profileActivity) return events;

  const activityContainer = profileActivity.querySelector('div');
  if (!activityContainer) return events;

  let currentDate = null;

  const processChildren = (parent) => {
    Array.from(parent.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text && (text.includes('·') || /^[A-Z][a-z]+\s+\d+,\s+\d{4}$/.test(text))) {
          currentDate = text;
        }
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList && node.classList.contains('activity-event-wrapper')) {
          const timeEl = node.querySelector('.activity-time');
          const nameEl = node.querySelector('.activity-event-title');

          if (timeEl && nameEl) {
            events.push({
              name: nameEl.textContent.trim(),
              displayTime: timeEl.textContent.trim(),
              date: currentDate || 'Unknown Date'
            });
          }
        } else {
          processChildren(node);
        }
      }
    });
  };

  processChildren(activityContainer);

  return events;
}

// Function to extract earliest event info
function extractEarliestEvent() {
  try {
    const sinceDateWrapper = document.querySelector('.since-date-wrapper');
    if (sinceDateWrapper) return sinceDateWrapper.textContent;
    return null;
  } catch (error) {
    return null;
  }
}

// Function to check and parse properties
function checkAndParseProperties() {
  if (!isOnActivityFeedPage()) return;

  const properties = parsePropertiesFromDOM();
  if (Object.keys(properties).length > 0) {
    saveDiscoveredProperties(properties);
  }
}

// Click the "Show more" button
function clickShowMoreButton() {
  try {
    const profileActivity = document.querySelector('profile-activity');
    if (!profileActivity) {
      return { success: false, error: 'Activity feed not found' };
    }

    const buttons = profileActivity.querySelectorAll('mp-button');
    for (const button of buttons) {
      if (button.textContent.trim() === 'Show more') {
        button.click();
        return { success: true };
      }
    }

    return { success: false, error: 'Show more button not found' };
  } catch (error) {
    console.error('[Mixpanel Activity Navigator] Error clicking show more:', error);
    return { success: false, error: error.message };
  }
}

// Function to check URL and extract events
function checkAndExtractEvents() {
  if (!isOnActivityFeedPage()) return;

  const events = extractHiddenEvents();
  if (events.length > 0) {
    saveDiscoveredEvents(events);
  }
}

// Function to find and open a specific event
function openEventInFeed(eventName, eventTime) {
  try {
    const eventWrappers = document.querySelectorAll('.activity-event-wrapper');

    for (const wrapper of eventWrappers) {
      const nameEl = wrapper.querySelector('.activity-event-title');
      const timeEl = wrapper.querySelector('.activity-time');

      if (nameEl && timeEl) {
        const name = nameEl.textContent.trim();
        const time = timeEl.textContent.trim();

        if (name === eventName && time === eventTime) {
          const mpSection = wrapper.querySelector('mp-section');
          if (mpSection) {
            const titleContainer = mpSection.shadowRoot?.querySelector('.mp-section-title-container');
            if (titleContainer) {
              titleContainer.click();
            }

            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

            return { success: true };
          }
        }
      }
    }

    return { success: false, error: 'Event not found on page' };
  } catch (error) {
    console.error('[Mixpanel Activity Navigator] Error opening event:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isOnActivityFeedPage()) {
    sendResponse({ success: false, error: 'Not on activity feed page' });
    return true;
  }

  if (request.action === 'applyHiddenEvents') {
    applyHiddenEventsToURL(request.events);
    sendResponse({ success: true });
  } else if (request.action === 'getCurrentEvents') {
    const currentEvents = extractHiddenEvents();
    sendResponse({ events: currentEvents });
  } else if (request.action === 'getAllProperties') {
    const properties = parsePropertiesFromDOM();
    sendResponse({ properties: properties });
  } else if (request.action === 'getEventDatabase') {
    const events = parseEventsFromDOM();
    sendResponse({ events: events });
  } else if (request.action === 'getEarliestEvent') {
    const earliestEvent = extractEarliestEvent();
    sendResponse({ earliestEvent: earliestEvent });
  } else if (request.action === 'clickShowMore') {
    const result = clickShowMoreButton();
    sendResponse(result);
  } else if (request.action === 'openEvent') {
    const result = openEventInFeed(request.eventName, request.eventTime);
    sendResponse(result);
  }
  return true;
});

// Function to apply selected events to the URL
function applyHiddenEventsToURL(eventsToHide) {
  const currentHash = window.location.hash;

  if (!currentHash) {
    console.error('[Mixpanel Activity Navigator] No hash in URL');
    return;
  }

  let hashContent = currentHash.substring(1);

  const excludedEventsString = eventsToHide.length > 0
    ? `excludedEvents~(${eventsToHide.map(e => `~'${e}`).join('')})`
    : '';

  const excludedEventsRegex = /excludedEvents~\([^)]*\)/;

  if (excludedEventsRegex.test(hashContent)) {
    if (excludedEventsString) {
      hashContent = hashContent.replace(excludedEventsRegex, excludedEventsString);
    } else {
      hashContent = hashContent.replace(/excludedEvents~\([^)]*\)~/, '');
      hashContent = hashContent.replace(/&~\(excludedEvents~\([^)]*\)\)/, '');
      hashContent = hashContent.replace(/excludedEvents~\([^)]*\)/, '');
    }
  } else if (excludedEventsString) {
    if (hashContent.includes('&~(')) {
      hashContent = hashContent.replace(/&~\(/, `&~(${excludedEventsString}~`);
    } else {
      hashContent += `&~(${excludedEventsString})`;
    }
  }

  window.location.hash = hashContent;

  setTimeout(() => {
    window.location.reload();
  }, 100);
}

// Set up MutationObserver for dynamically loaded content
function startObserver() {
  if (observerActive) return;
  observerActive = true;

  const observer = new MutationObserver((mutations) => {
    let propertiesAdded = false;

    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'PROFILE-EDITABLE-PROPERTY' ||
                node.querySelector('profile-editable-property')) {
              propertiesAdded = true;
            }
          }
        }
      }
      if (propertiesAdded) break;
    }

    if (propertiesAdded) {
      checkAndParseProperties();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Run initialization when on activity feed page
function initIfOnActivityFeed() {
  if (!isOnActivityFeedPage()) return;

  checkAndExtractEvents();
  checkAndParseProperties();
  startObserver();

  // Also check after a delay since properties might load dynamically
  setTimeout(() => {
    checkAndParseProperties();
  }, 2000);
}

// Initial check when page loads
initIfOnActivityFeed();

// Monitor hash changes
window.addEventListener('hashchange', () => {
  if (isOnActivityFeedPage()) {
    checkAndExtractEvents();
    checkAndParseProperties();
    startObserver();
  }
});

// Monitor SPA navigations via pushState/replaceState
window.addEventListener('popstate', () => {
  initIfOnActivityFeed();
});

// Also monitor for URL changes via polling (catches pushState that doesn't fire popstate)
let lastURL = window.location.href;
setInterval(() => {
  if (window.location.href !== lastURL) {
    lastURL = window.location.href;
    initIfOnActivityFeed();
  }
}, 2000);

} // end of double-injection guard
