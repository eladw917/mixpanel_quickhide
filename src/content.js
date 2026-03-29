// Content script for Mixpanel Activity Navigator
// Location: src/content.js

// Prevent double-execution if injected multiple times
if (window.__mixpanelActivityNavLoaded) {
  // Already loaded — skip
} else {
window.__mixpanelActivityNavLoaded = true;

// Track whether MutationObserver is already running
let observerActive = false;

function isElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== 'hidden' &&
    style.display !== 'none';
}

// Check if we're on an actual user activity feed page (profile page or sidebar feed)
function isOnActivityFeedPage() {
  const feedContainers = Array.from(document.querySelectorAll('profile-activity'));
  const feedEvents = Array.from(document.querySelectorAll('.activity-event-wrapper'));
  return feedContainers.some(isElementVisible) || feedEvents.some(isElementVisible);
}

function isOnPropertiesPanel() {
  const propertyElements = Array.from(document.querySelectorAll('profile-editable-property'));
  return propertyElements.some(isElementVisible);
}

function getSidebarViewMode() {
  if (isOnActivityFeedPage()) return 'activities';
  if (isOnPropertiesPanel()) return 'properties';
  return 'none';
}

// Retry-aware version: waits briefly for sidebar DOM to render before giving up.
async function getSidebarViewModeWithRetry(maxWaitMs = 1500) {
  const immediate = getSidebarViewMode();
  if (immediate !== 'none') return immediate;

  const interval = 200;
  let elapsed = 0;
  while (elapsed < maxWaitMs) {
    await new Promise(r => setTimeout(r, interval));
    elapsed += interval;
    const mode = getSidebarViewMode();
    if (mode !== 'none') return mode;
  }
  return 'none';
}

function findSidebarTabRegion() {
  const candidates = Array.from(document.querySelectorAll('div, nav, section'));
  return candidates.find((el) => {
    if (!isElementVisible(el)) return false;
    const text = (el.textContent || '').trim();
    if (!text || text.length > 1200) return false;
    return text.includes('Activities') && text.includes('User Properties');
  }) || null;
}

function setSidebarViewMode(targetMode) {
  const tabRegion = findSidebarTabRegion();
  if (!tabRegion) {
    return { success: false, error: 'Sidebar tabs not found' };
  }

  const targetLabel = targetMode === 'properties' ? 'User Properties' : 'Activities';
  const clickableNodes = Array.from(tabRegion.querySelectorAll('button, [role="tab"], a, div, span'));

  for (const node of clickableNodes) {
    const text = (node.textContent || '').trim();
    if (text !== targetLabel) continue;
    if (!isElementVisible(node)) continue;

    const clickable = node.closest('button, [role="tab"], a, div, span') || node;
    clickable.click();
    return { success: true };
  }

  return { success: false, error: `Sidebar tab "${targetLabel}" not found` };
}

let badgeUpdateScheduled = false;

function pushBadgeStateToBackground() {
  const active = getSidebarViewMode() !== 'none';
  try {
    chrome.runtime.sendMessage({ action: 'setBadgeActive', active });
  } catch (error) {
    // Ignore if extension context is temporarily unavailable.
  }
}

function scheduleBadgeStateUpdate() {
  if (badgeUpdateScheduled) return;
  badgeUpdateScheduled = true;
  setTimeout(() => {
    badgeUpdateScheduled = false;
    pushBadgeStateToBackground();
  }, 150);
}

// Check if we're on a full profile page (not sidebar) - needed for URL mutation operations
function isOnFullProfilePage() {
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
  const displayNames = {};

  const propertyElements = document.querySelectorAll('profile-editable-property');

  propertyElements.forEach((element) => {
    try {
      const propertyAttr = element.getAttribute('property');
      if (!propertyAttr) return;

      const propertyData = JSON.parse(propertyAttr);

      const propertyName = propertyData?.name?.raw;
      const propertyValue = propertyData?.renderValue?.renderString || '';

      // Extract display name from Mixpanel's data
      const displayName = propertyData?.name?.display
        || propertyData?.name?.formatted
        || propertyData?.displayName
        || null;

      if (propertyName) {
        properties[propertyName] = propertyValue;
        if (displayName) {
          displayNames[propertyName] = displayName;
        }
      }
    } catch (error) {
      console.error('[Mixpanel Activity Navigator] Error parsing property:', error, element);
    }
  });

  return { properties, displayNames };
}

// Function to save discovered property names and display names to storage
async function saveDiscoveredProperties(properties, displayNames) {
  const propertyNames = Object.keys(properties);

  if (propertyNames.length === 0) return;

  const result = await chrome.storage.local.get(['discoveredProperties', 'propertyDisplayNames']);
  const existingProperties = result.discoveredProperties || [];
  const existingDisplayNames = result.propertyDisplayNames || {};

  const mergedProperties = [...new Set([...existingProperties, ...propertyNames])];

  // Merge display names
  const mergedDisplayNames = { ...existingDisplayNames, ...displayNames };

  const hasNewProperties = mergedProperties.length !== existingProperties.length;
  const hasNewDisplayNames = Object.keys(mergedDisplayNames).length !== Object.keys(existingDisplayNames).length
    || JSON.stringify(mergedDisplayNames) !== JSON.stringify(existingDisplayNames);

  if (hasNewProperties || hasNewDisplayNames) {
    await chrome.storage.local.set({
      discoveredProperties: mergedProperties,
      propertyDisplayNames: mergedDisplayNames
    });
  }
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

// Read analytics ID directly from profile input field
function extractAnalyticsIdFromDOM() {
  try {
    const labels = document.querySelectorAll('mp-input-label[label]');

    for (const label of labels) {
      const labelValue = (label.getAttribute('label') || '').trim().toLowerCase();
      if (labelValue !== 'analyticsid') continue;

      const inputContainer = label.closest('mp-input') || label.parentElement;
      if (!inputContainer) continue;

      const input = inputContainer.querySelector('input');
      const inputValue = input?.value?.trim();
      if (inputValue) return inputValue;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Function to check and parse properties
function checkAndParseProperties() {
  if (!isOnActivityFeedPage() && !isOnPropertiesPanel()) return;

  const { properties, displayNames } = parsePropertiesFromDOM();
  if (Object.keys(properties).length > 0) {
    saveDiscoveredProperties(properties, displayNames);
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

// Check if an event wrapper is currently expanded
function isEventExpanded(wrapper) {
  const mpSection = wrapper.querySelector('mp-section');
  const shadowRoot = mpSection?.shadowRoot;
  if (!shadowRoot) return false;

  // Some Mixpanel builds render detail components in light DOM when expanded.
  const lightDomDetails = wrapper.querySelector('profile-activity-properties');
  if (lightDomDetails && lightDomDetails.getBoundingClientRect().height > 0) return true;

  // Use multiple signals because Mixpanel's internal DOM/state can vary.
  const detailPane = shadowRoot.querySelector('.detail-pane');
  if (detailPane) return true;

  const expandedToggle = shadowRoot.querySelector('[aria-expanded="true"]');
  if (expandedToggle) return true;

  const content = shadowRoot.querySelector('.mp-section-content');
  if (content && content.getBoundingClientRect().height > 0) return true;

  return false;
}

// Auto-select "Your Properties" tab within an expanded event
function selectYourPropertiesTab(wrapper) {
  setTimeout(() => {
    try {
      const propsContainer = wrapper.querySelector('profile-activity-properties');
      if (!propsContainer) return;

      // Find the toggle component
      const toggleEl = propsContainer.querySelector('[class*="mp-toggle"]') ||
        propsContainer.querySelector('mp-toggle-dt7b5d');
      if (!toggleEl) {
        // Try broader search
        const allToggles = propsContainer.querySelectorAll('div');
        for (const div of allToggles) {
          if (div.className && div.className.includes('mp-toggle')) {
            const options = div.querySelectorAll('[class*="_mp-toggle-option_"]');
            for (const opt of options) {
              if (opt.textContent.includes('Your Properties') || opt.className.includes('_selected_')) {
                // Find the button inside and click it
                const mpBtn = opt.querySelector('mp-button');
                if (mpBtn && mpBtn.shadowRoot) {
                  const anchor = mpBtn.shadowRoot.querySelector('a');
                  if (anchor) { anchor.click(); return; }
                }
                opt.click();
                return;
              }
            }
            break;
          }
        }
        return;
      }

      // Navigate the toggle options
      const options = toggleEl.querySelectorAll('[class*="_mp-toggle-option_"]');
      for (const opt of options) {
        if (opt.textContent.includes('Your Properties')) {
          const mpBtn = opt.querySelector('mp-button');
          if (mpBtn && mpBtn.shadowRoot) {
            const anchor = mpBtn.shadowRoot.querySelector('a');
            if (anchor) { anchor.click(); return; }
          }
          opt.click();
          return;
        }
      }
    } catch (error) {
      console.error('[Mixpanel Activity Navigator] Error selecting Your Properties tab:', error);
    }
  }, 400);
}

// Function to find and open a specific event (expand only, never collapse)
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
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Expand-only behavior: never click when already expanded.
          if (isEventExpanded(wrapper)) {
            selectYourPropertiesTab(wrapper);
            return { success: true, wasAlreadyExpanded: true };
          }

          const mpSection = wrapper.querySelector('mp-section');
          const titleContainer = mpSection?.shadowRoot?.querySelector('.mp-section-title-container');
          if (!titleContainer) {
            return { success: false, error: 'Unable to find event expander' };
          }

          titleContainer.click();

          // Auto-select "Your Properties" tab after expanding
          selectYourPropertiesTab(wrapper);

          return { success: true, wasAlreadyExpanded: false };
        }
      }
    }

    return { success: false, error: 'Event not found on page' };
  } catch (error) {
    console.error('[Mixpanel Activity Navigator] Error opening event:', error);
    return { success: false, error: error.message };
  }
}

// Collapse a specific event
function collapseEventInFeed(eventName, eventTime) {
  try {
    const eventWrappers = document.querySelectorAll('.activity-event-wrapper');

    for (const wrapper of eventWrappers) {
      const nameEl = wrapper.querySelector('.activity-event-title');
      const timeEl = wrapper.querySelector('.activity-time');

      if (nameEl && timeEl) {
        const name = nameEl.textContent.trim();
        const time = timeEl.textContent.trim();

        if (name === eventName && time === eventTime) {
          if (isEventExpanded(wrapper)) {
            const mpSection = wrapper.querySelector('mp-section');
            if (mpSection) {
              const titleContainer = mpSection.shadowRoot?.querySelector('.mp-section-title-container');
              if (titleContainer) {
                titleContainer.click();
              }
            }
            return { success: true };
          }
          return { success: false, error: 'Event is not expanded' };
        }
      }
    }

    return { success: false, error: 'Event not found on page' };
  } catch (error) {
    console.error('[Mixpanel Activity Navigator] Error collapsing event:', error);
    return { success: false, error: error.message };
  }
}

// Collapse all expanded events
function collapseAllEventsInFeed() {
  try {
    const eventWrappers = document.querySelectorAll('.activity-event-wrapper');
    let collapsedCount = 0;

    for (const wrapper of eventWrappers) {
      if (isEventExpanded(wrapper)) {
        const mpSection = wrapper.querySelector('mp-section');
        if (mpSection) {
          const titleContainer = mpSection.shadowRoot?.querySelector('.mp-section-title-container');
          if (titleContainer) {
            titleContainer.click();
            collapsedCount++;
          }
        }
      }
    }

    return { success: true, collapsedCount };
  } catch (error) {
    console.error('[Mixpanel Activity Navigator] Error collapsing all events:', error);
    return { success: false, error: error.message };
  }
}

// Get currently expanded events
function getExpandedEventsInFeed() {
  try {
    const expanded = [];
    const eventWrappers = document.querySelectorAll('.activity-event-wrapper');

    for (const wrapper of eventWrappers) {
      if (isEventExpanded(wrapper)) {
        const nameEl = wrapper.querySelector('.activity-event-title');
        const timeEl = wrapper.querySelector('.activity-time');
        if (nameEl && timeEl) {
          expanded.push({
            name: nameEl.textContent.trim(),
            time: timeEl.textContent.trim()
          });
        }
      }
    }

    return { success: true, expanded };
  } catch (error) {
    return { success: false, error: error.message, expanded: [] };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSidebarViewMode') {
    getSidebarViewModeWithRetry().then(mode => sendResponse({ mode }));
    return true;
  }
  if (request.action === 'setSidebarViewMode') {
    const result = setSidebarViewMode(request.mode);
    sendResponse(result);
    return true;
  }

  // URL mutation operations require full profile page
  const urlMutationActions = ['applyHiddenEvents', 'getCurrentEvents'];
  const requiresFullProfile = urlMutationActions.includes(request.action);
  
  if (requiresFullProfile && !isOnFullProfilePage()) {
    sendResponse({ success: false, error: 'Not on full profile page' });
    return true;
  }
  
  const activityFeedActions = [
    'getEventDatabase', 'getEarliestEvent', 'clickShowMore', 'openEvent',
    'collapseEvent', 'collapseAllEvents', 'getExpandedEvents'
  ];
  const propertiesActions = ['getAllProperties', 'getAnalyticsId'];

  if (activityFeedActions.includes(request.action) && !isOnActivityFeedPage()) {
    sendResponse({ success: false, error: 'Not on activity feed page' });
    return true;
  }

  if (propertiesActions.includes(request.action) && !isOnPropertiesPanel() && !isOnActivityFeedPage()) {
    sendResponse({ success: false, error: 'Not on properties panel' });
    return true;
  }

  if (request.action === 'applyHiddenEvents') {
    applyHiddenEventsToURL(request.events);
    sendResponse({ success: true });
  } else if (request.action === 'getCurrentEvents') {
    const currentEvents = extractHiddenEvents();
    sendResponse({ events: currentEvents });
  } else if (request.action === 'getAllProperties') {
    const { properties, displayNames } = parsePropertiesFromDOM();
    sendResponse({ properties, displayNames });
  } else if (request.action === 'getEventDatabase') {
    const events = parseEventsFromDOM();
    sendResponse({ events: events });
  } else if (request.action === 'getEarliestEvent') {
    const earliestEvent = extractEarliestEvent();
    sendResponse({ earliestEvent: earliestEvent });
  } else if (request.action === 'getAnalyticsId') {
    const analyticsId = extractAnalyticsIdFromDOM();
    sendResponse({ analyticsId: analyticsId });
  } else if (request.action === 'clickShowMore') {
    const result = clickShowMoreButton();
    sendResponse(result);
  } else if (request.action === 'openEvent') {
    const result = openEventInFeed(request.eventName, request.eventTime);
    sendResponse(result);
  } else if (request.action === 'collapseEvent') {
    const result = collapseEventInFeed(request.eventName, request.eventTime);
    sendResponse(result);
  } else if (request.action === 'collapseAllEvents') {
    const result = collapseAllEventsInFeed();
    sendResponse(result);
  } else if (request.action === 'getExpandedEvents') {
    const result = getExpandedEventsInFeed();
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
  if (!isOnActivityFeedPage() && !isOnPropertiesPanel()) {
    scheduleBadgeStateUpdate();
    return;
  }

  if (isOnActivityFeedPage()) {
    checkAndExtractEvents();
  }
  checkAndParseProperties();
  if (isOnActivityFeedPage()) {
    startObserver();
  }
  scheduleBadgeStateUpdate();

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
  scheduleBadgeStateUpdate();
});

// Monitor SPA navigations via pushState/replaceState
window.addEventListener('popstate', () => {
  initIfOnActivityFeed();
  scheduleBadgeStateUpdate();
});

// Also monitor for URL changes via polling (catches pushState that doesn't fire popstate)
let lastURL = window.location.href;
setInterval(() => {
  if (window.location.href !== lastURL) {
    lastURL = window.location.href;
    initIfOnActivityFeed();
    scheduleBadgeStateUpdate();
  }
}, 2000);

// Watch for sidebar feed appearing dynamically (e.g., when user opens sidebar on report page)
let feedDetectedBefore = false;
const feedObserver = new MutationObserver(() => {
  const feedNow = isOnActivityFeedPage() || isOnPropertiesPanel();
  if (feedNow && !feedDetectedBefore) {
    feedDetectedBefore = true;
    initIfOnActivityFeed();
  } else if (!feedNow && feedDetectedBefore) {
    feedDetectedBefore = false;
  }
  scheduleBadgeStateUpdate();
});

feedObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Ensure badge state is pushed on initial script load.
scheduleBadgeStateUpdate();

} // end of double-injection guard
