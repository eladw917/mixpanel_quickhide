// Content script for Mixpanel Quickhide
// Location: src/content.js

// Check if we're on an actual user activity feed page
function isOnActivityFeedPage() {
  const hash = window.location.hash;
  // Only activate if there's a distinct_id in the URL hash
  return hash && hash.includes('distinct_id=');
}

// Function to extract hidden events from URL hash
function extractHiddenEvents() {
  const hash = window.location.hash;
  
  if (!hash) return [];
  
  // Look for excludedEvents~(~'event1~'event2~'event3)
  const excludedEventsMatch = hash.match(/excludedEvents~\(([^)]*)\)/);
  
  if (!excludedEventsMatch) return [];
  
  const eventsString = excludedEventsMatch[1];
  
  // Split by ~' to get individual events
  const events = eventsString
    .split("~'")
    .filter(event => event.length > 0)
    .map(event => event.trim());
  
  return events;
}

// Function to save discovered events to storage
async function saveDiscoveredEvents(events) {
  if (events.length === 0) return;
  
  // Get existing events from storage
  const result = await chrome.storage.local.get(['hiddenEvents']);
  const existingEvents = result.hiddenEvents || [];
  
  // Check if there are any new events
  const newEvents = events.filter(event => !existingEvents.includes(event));
  
  if (newEvents.length === 0) {
    // No new events to save
    return;
  }
  
  // Merge with new events (avoid duplicates)
  const mergedEvents = [...new Set([...existingEvents, ...events])];
  
  // Save back to storage
  await chrome.storage.local.set({ hiddenEvents: mergedEvents });
  
    console.log('[Mixpanel Quickhide] Discovered new events:', newEvents);
  console.log('[Mixpanel Quickhide] Total saved events:', mergedEvents);
}

// Function to parse properties from DOM
function parsePropertiesFromDOM() {
  const properties = {};
  
  // Find all profile-editable-property elements
  const propertyElements = document.querySelectorAll('profile-editable-property');
  
  console.log('[Mixpanel Quickhide] Found property elements:', propertyElements.length);
  
  propertyElements.forEach((element, index) => {
    try {
      // Get the property attribute
      const propertyAttr = element.getAttribute('property');
      if (!propertyAttr) {
        console.log('[Mixpanel Quickhide] Property element has no property attribute:', index);
        return;
      }
      
      // Parse the JSON
      const propertyData = JSON.parse(propertyAttr);
      
      // Extract name and value
      const propertyName = propertyData?.name?.raw;
      const propertyValue = propertyData?.renderValue?.renderString || '';
      
      if (propertyName) {
        properties[propertyName] = propertyValue;
        if (index < 3) {
          console.log('[Mixpanel Quickhide] Parsed property:', propertyName, '=', propertyValue);
        }
      }
    } catch (error) {
      console.error('[Mixpanel Quickhide] Error parsing property:', error, element);
    }
  });
  
  console.log('[Mixpanel Quickhide] Total properties parsed:', Object.keys(properties).length);
  
  return properties;
}

// Function to save discovered property names to storage
async function saveDiscoveredProperties(properties) {
  const propertyNames = Object.keys(properties);
  
  if (propertyNames.length === 0) return;
  
  // Get existing properties from storage
  const result = await chrome.storage.local.get(['discoveredProperties']);
  const existingProperties = result.discoveredProperties || [];
  
  // Check if there are any new properties
  const newProperties = propertyNames.filter(name => !existingProperties.includes(name));
  
  if (newProperties.length === 0) {
    // No new properties to save
    return;
  }
  
  // Merge with new properties (avoid duplicates)
  const mergedProperties = [...new Set([...existingProperties, ...propertyNames])];
  
  // Save back to storage
  await chrome.storage.local.set({ discoveredProperties: mergedProperties });
  
  console.log('[Mixpanel Quickhide] Discovered new properties:', newProperties);
  console.log('[Mixpanel Quickhide] Total saved properties:', mergedProperties);
}

// Function to parse events from activity feed
function parseEventsFromDOM() {
  const events = [];
  
  // Find the profile-activity container
  const profileActivity = document.querySelector('profile-activity');
  if (!profileActivity) {
    console.log('[Mixpanel Quickhide] profile-activity element not found');
    return events;
  }
  
  // Get the main container with all events
  const activityContainer = profileActivity.querySelector('div');
  if (!activityContainer) {
    console.log('[Mixpanel Quickhide] Activity container not found');
    return events;
  }
  
  // Track current date as we parse
  let currentDate = null;
  
  // Walk through all child nodes to find dates and events in order
  const processChildren = (parent) => {
    Array.from(parent.childNodes).forEach(node => {
      // Check if it's a text node with date information
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        // Match patterns like "Today · November 6, 2025" or "November 6, 2025"
        if (text && (text.includes('·') || /^[A-Z][a-z]+\s+\d+,\s+\d{4}$/.test(text))) {
          currentDate = text;
          console.log('[Mixpanel Quickhide] Found date header:', currentDate);
        }
      }
      
      // Check if it's an event wrapper element
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.classList && node.classList.contains('activity-event-wrapper')) {
          const timeEl = node.querySelector('.activity-time');
          const nameEl = node.querySelector('.activity-event-title');
          
          if (timeEl && nameEl) {
            const displayTime = timeEl.textContent.trim();
            const eventName = nameEl.textContent.trim();
            
            events.push({
              name: eventName,
              displayTime: displayTime,
              date: currentDate || 'Unknown Date'
            });
          }
        } else {
          // Recursively process child elements
          processChildren(node);
        }
      }
    });
  };
  
  processChildren(activityContainer);
  
  console.log('[Mixpanel Quickhide] Total events parsed:', events.length);
  if (events.length > 0) {
    console.log('[Mixpanel Quickhide] Sample events:', events.slice(0, 3));
  }
  
  return events;
}

// Function to extract earliest event info
function extractEarliestEvent() {
  try {
    // Target the since-date-wrapper div directly
    const sinceDateWrapper = document.querySelector('.since-date-wrapper');
    if (sinceDateWrapper) {
      return sinceDateWrapper.textContent;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Function to check and parse properties
function checkAndParseProperties() {
  // Only run if we're on an activity feed page
  if (!isOnActivityFeedPage()) {
    console.log('[Mixpanel Quickhide] Not on activity feed page, skipping property parsing');
    return;
  }
  
  console.log('[Mixpanel Quickhide] Checking and parsing properties...');
  const properties = parsePropertiesFromDOM();
  if (Object.keys(properties).length > 0) {
    saveDiscoveredProperties(properties);
  } else {
    console.log('[Mixpanel Quickhide] No properties found to save');
  }
}

// Click the "Show more" button
function clickShowMoreButton() {
  try {
    const profileActivity = document.querySelector('profile-activity');
    if (!profileActivity) {
      return { success: false, error: 'Activity feed not found' };
    }
    
    // Find the "Show more" button
    const buttons = profileActivity.querySelectorAll('mp-button');
    for (const button of buttons) {
      if (button.textContent.trim() === 'Show more') {
        button.click();
        console.log('[Mixpanel Quickhide] Clicked "Show more" button');
        return { success: true };
      }
    }
    
    return { success: false, error: 'Show more button not found' };
  } catch (error) {
    console.error('[Mixpanel Quickhide] Error clicking show more:', error);
    return { success: false, error: error.message };
  }
}

// Function to check URL and extract events
function checkAndExtractEvents() {
  // Only run if we're on an activity feed page
  if (!isOnActivityFeedPage()) {
    return;
  }
  
  const events = extractHiddenEvents();
  if (events.length > 0) {
    saveDiscoveredEvents(events);
  }
}

// Function to find and open a specific event
function openEventInFeed(eventName, eventTime) {
  try {
    // Find all event wrappers
    const eventWrappers = document.querySelectorAll('.activity-event-wrapper');
    
    for (const wrapper of eventWrappers) {
      const nameEl = wrapper.querySelector('.activity-event-title');
      const timeEl = wrapper.querySelector('.activity-time');
      
      if (nameEl && timeEl) {
        const name = nameEl.textContent.trim();
        const time = timeEl.textContent.trim();
        
        // Match by name and time
        if (name === eventName && time === eventTime) {
          // Find the mp-section inside this wrapper
          const mpSection = wrapper.querySelector('mp-section');
          if (mpSection) {
            // Click the section to expand it
            const titleContainer = mpSection.shadowRoot?.querySelector('.mp-section-title-container');
            if (titleContainer) {
              titleContainer.click();
            }
            
            // Scroll into view
            wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            console.log('[Mixpanel Quickhide] Opened event:', eventName, eventTime);
            return { success: true };
          }
        }
      }
    }
    
    return { success: false, error: 'Event not found on page' };
  } catch (error) {
    console.error('[Mixpanel Quickhide] Error opening event:', error);
    return { success: false, error: error.message };
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Only respond if we're on an activity feed page
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
    // Get all events from the activity feed
    const events = parseEventsFromDOM();
    sendResponse({ events: events });
  } else if (request.action === 'getEarliestEvent') {
    // Get the earliest event info
    const earliestEvent = extractEarliestEvent();
    sendResponse({ earliestEvent: earliestEvent });
  } else if (request.action === 'clickShowMore') {
    // Click the "Show more" button
    const result = clickShowMoreButton();
    sendResponse(result);
  } else if (request.action === 'openEvent') {
    // Open a specific event in the feed
    const result = openEventInFeed(request.eventName, request.eventTime);
    sendResponse(result);
  }
  return true;
});

// Function to apply selected events to the URL
function applyHiddenEventsToURL(eventsToHide) {
  console.log('[Mixpanel Quickhide] Applying events:', eventsToHide);
  
  const currentHash = window.location.hash;
  
  if (!currentHash) {
    console.error('[Mixpanel Quickhide] No hash in URL');
    return;
  }
  
  // Remove the leading #
  let hashContent = currentHash.substring(1);
  console.log('[Mixpanel Quickhide] Original hash:', hashContent);
  
  // Build the excludedEvents string
  const excludedEventsString = eventsToHide.length > 0
    ? `excludedEvents~(${eventsToHide.map(e => `~'${e}`).join('')})`
    : '';
  
  console.log('[Mixpanel Quickhide] excludedEvents string:', excludedEventsString || '(empty - removing)');
  
  // Check if there's already an excludedEvents section
  const excludedEventsRegex = /excludedEvents~\([^)]*\)/;
  
  if (excludedEventsRegex.test(hashContent)) {
    console.log('[Mixpanel Quickhide] Found existing excludedEvents, replacing...');
    // Replace existing excludedEvents
    if (excludedEventsString) {
      // Simply replace the excludedEvents section
      hashContent = hashContent.replace(excludedEventsRegex, excludedEventsString);
    } else {
      // Remove excludedEvents entirely - need to be careful about the ~ separator
      // Pattern 1: excludedEvents is first in the &~(...) group, followed by other params
      // Example: &~(excludedEvents~(~'event1)~dateRange~(...)) -> &~(dateRange~(...))
      hashContent = hashContent.replace(/excludedEvents~\([^)]*\)~/, '');
      
      // Pattern 2: excludedEvents is alone in the &~(...) group
      // Example: &~(excludedEvents~(~'event1)) -> (remove entire group)
      hashContent = hashContent.replace(/&~\(excludedEvents~\([^)]*\)\)/, '');
      
      // Pattern 3: Any remaining excludedEvents sections (cleanup)
      hashContent = hashContent.replace(/excludedEvents~\([^)]*\)/, '');
    }
  } else if (excludedEventsString) {
    console.log('[Mixpanel Quickhide] No existing excludedEvents, adding...');
    // Add excludedEvents section
    // Check if there's already a &~(...) parameter group
    if (hashContent.includes('&~(')) {
      // Insert excludedEvents at the start of the existing &~(...) group
      // Example: distinct_id=xxx&~(dateRange~(...)) -> distinct_id=xxx&~(excludedEvents~(...)~dateRange~(...))
      hashContent = hashContent.replace(/&~\(/, `&~(${excludedEventsString}~`);
    } else {
      // Add as new parameter group
      hashContent += `&~(${excludedEventsString})`;
    }
  }
  
  console.log('[Mixpanel Quickhide] New hash:', hashContent);
  
  // Save current scroll position
  const scrollY = window.scrollY;
  
  // Method 1: Update hash directly
  window.location.hash = hashContent;
  
  // Method 2: Force page reload to ensure Mixpanel processes the change
  // Small delay to ensure hash is updated first
  setTimeout(() => {
    console.log('[Mixpanel Quickhide] Reloading page to apply changes...');
    window.location.reload();
  }, 100);
}

// Initial check when page loads
if (isOnActivityFeedPage()) {
  checkAndExtractEvents();
  checkAndParseProperties();
  console.log('[Mixpanel Quickhide] Content script active on activity feed page');
  
  // Also check after a delay since properties might load dynamically
  setTimeout(() => {
    console.log('[Mixpanel Quickhide] Running delayed property check...');
    checkAndParseProperties();
  }, 2000);
} else {
  console.log('[Mixpanel Quickhide] Not on activity feed page, waiting...');
}

// Monitor hash changes - this will capture real-time event hiding
window.addEventListener('hashchange', () => {
  if (isOnActivityFeedPage()) {
    console.log('[Mixpanel Quickhide] URL changed, checking for new events...');
    checkAndExtractEvents();
    checkAndParseProperties();
  }
});

// Also monitor for manual URL changes via browser navigation
let lastHash = window.location.hash;
setInterval(() => {
  if (isOnActivityFeedPage() && window.location.hash !== lastHash) {
    lastHash = window.location.hash;
    console.log('[Mixpanel Quickhide] Hash change detected via polling');
    checkAndExtractEvents();
    checkAndParseProperties();
  }
}, 500);

// Set up MutationObserver to detect dynamically loaded properties
if (isOnActivityFeedPage()) {
  const observer = new MutationObserver((mutations) => {
    // Check if any profile-editable-property elements were added
    let propertiesAdded = false;
    let eventsAdded = false;
    
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // Check added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the node itself or any of its children are profile-editable-property
            if (node.tagName === 'PROFILE-EDITABLE-PROPERTY' || 
                node.querySelector('profile-editable-property')) {
              propertiesAdded = true;
            }
            
            // Check if activity events were added
            if (node.classList?.contains('activity-event-wrapper') ||
                node.querySelector('.activity-event-wrapper')) {
              eventsAdded = true;
            }
          }
        }
      }
      if (propertiesAdded && eventsAdded) break;
    }
    
    // If properties were added, parse and save them
    if (propertiesAdded) {
      console.log('[Mixpanel Quickhide] New properties detected in DOM');
      checkAndParseProperties();
    }
    
    // If events were added, notify popup (it will re-fetch the event database)
    if (eventsAdded) {
      console.log('[Mixpanel Quickhide] New events detected in DOM');
      // The popup will need to refresh its event list
      // We don't need to do anything here as the popup will call getEventDatabase again
    }
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('[Mixpanel Quickhide] MutationObserver active for properties and events');
}

