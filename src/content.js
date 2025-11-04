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
  console.log('[Mixpanel Quickhide] Content script active on activity feed page');
} else {
  console.log('[Mixpanel Quickhide] Not on activity feed page, waiting...');
}

// Monitor hash changes - this will capture real-time event hiding
window.addEventListener('hashchange', () => {
  if (isOnActivityFeedPage()) {
    console.log('[Mixpanel Quickhide] URL changed, checking for new events...');
    checkAndExtractEvents();
  }
});

// Also monitor for manual URL changes via browser navigation
let lastHash = window.location.hash;
setInterval(() => {
  if (isOnActivityFeedPage() && window.location.hash !== lastHash) {
    lastHash = window.location.hash;
    console.log('[Mixpanel Quickhide] Hash change detected via polling');
    checkAndExtractEvents();
  }
}, 500);

