// Bookmarks tab logic for Mixpanel Activity Navigator
// Location: src/popup/bookmarks-tab.js

let bookmarksList = [];
let analyticsIdOverride = null;
let bookmarksSearchTerm = '';

function getBookmarkAnalyticsId(bookmark) {
  return bookmark.analyticsId || bookmark.distinctId || '';
}

function buildProfileUrlForAnalyticsId(analyticsId) {
  if (!currentTab || !currentTab.url || !analyticsId) return null;
  const match = currentTab.url.match(/mixpanel\.com\/project\/(\d+)\/view\/(\d+)/);
  if (!match) return null;
  return `https://mixpanel.com/project/${match[1]}/view/${match[2]}/app/profile#distinct_id=${encodeURIComponent(analyticsId)}`;
}

function formatBookmarkTitleFromAnalyticsId(analyticsId) {
  if (!analyticsId) return '';

  // Keep full ID in storage, but display a cleaner title for device-based IDs.
  if (analyticsId.startsWith('$device:')) {
    return analyticsId.substring('$device:'.length);
  }

  return analyticsId;
}

// Initialize Bookmarks tab CTA once
function setupBookmarksCta() {
  const ctaBtn = document.getElementById('addBookmarkCtaBtn');
  if (!ctaBtn || ctaBtn.dataset.bound === '1') return;

  ctaBtn.addEventListener('click', async () => {
    await addCurrentUserBookmark();
  });

  ctaBtn.dataset.bound = '1';
}

function setupBookmarksSearch() {
  const searchInput = document.getElementById('bookmarksSearchInput');
  const clearBtn = document.getElementById('clearBookmarksSearchBtn');
  if (!searchInput || !clearBtn || searchInput.dataset.bound === '1') return;

  searchInput.addEventListener('input', (e) => {
    bookmarksSearchTerm = e.target.value || '';
    clearBtn.style.display = bookmarksSearchTerm.trim() ? 'flex' : 'none';
    displayBookmarks();
  });

  clearBtn.addEventListener('click', () => {
    bookmarksSearchTerm = '';
    searchInput.value = '';
    clearBtn.style.display = 'none';
    displayBookmarks();
    searchInput.focus();
  });

  searchInput.dataset.bound = '1';
}

async function refreshCurrentAnalyticsIdFromPage() {
  analyticsIdOverride = null;

  if (!currentTab || !currentTab.url) return;

  try {
    const isLoaded = await checkContentScript();
    if (!isLoaded) return;

    // Use the same data path as Property Finder.
    const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getAllProperties' });
    const properties = response?.properties || {};
    const displayNames = response?.displayNames || {};

    // First pass: match by display name exactly like Mixpanel shows it ("analyticsID")
    for (const [propKey, displayName] of Object.entries(displayNames)) {
      const normalizedDisplay = String(displayName || '')
        .replace(/\s+/g, '')
        .toLowerCase();
      if (normalizedDisplay === 'analyticsid') {
        const value = String(properties[propKey] || '').trim();
        if (value) {
          analyticsIdOverride = value;
          return;
        }
      }
    }

    // Fallback by raw key naming conventions if display name mapping is missing.
    const fallbackKeys = ['analyticsID', 'analytics_id', '$analytics_id', 'distinct_id', '$distinct_id'];
    for (const key of fallbackKeys) {
      const value = String(properties[key] || '').trim();
      if (value) {
        analyticsIdOverride = value;
        return;
      }
    }
  } catch (error) {
    // Fallback to URL-based value in getCurrentUserInfo
  }
}

// Update Bookmarks tab CTA state based on current context
function updateBookmarksCta() {
  const ctaBtn = document.getElementById('addBookmarkCtaBtn');
  if (!ctaBtn) return;

  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    ctaBtn.disabled = true;
    ctaBtn.textContent = 'Open User Profile';
    ctaBtn.title = 'Navigate to a Mixpanel user profile first';
    return;
  }

  if (isCurrentUserBookmarked()) {
    ctaBtn.disabled = true;
    ctaBtn.textContent = 'Already Bookmarked';
    ctaBtn.title = 'Current user is already bookmarked';
    return;
  }

  ctaBtn.disabled = false;
  ctaBtn.textContent = 'Add Current User';
  ctaBtn.title = 'Bookmark current user';
}

// Load bookmarks from storage
async function loadBookmarks() {
  await refreshCurrentAnalyticsIdFromPage();
  const result = await chrome.storage.local.get(['bookmarks']);
  bookmarksList = result.bookmarks || [];
  setupBookmarksCta();
  setupBookmarksSearch();
  displayBookmarks();
  updateBookmarkIcon();
  updateBookmarksCta();
}

// Save bookmarks to storage
async function saveBookmarks() {
  await chrome.storage.local.set({ bookmarks: bookmarksList });
}

// Get current user info from the active tab
function getCurrentUserInfo() {
  if (!currentTab || !currentTab.url) return null;

  const distinctIdMatch = currentTab.url.match(/distinct_id=([^&]+)/);
  const fallbackAnalyticsId = distinctIdMatch ? decodeURIComponent(distinctIdMatch[1]) : '';
  const analyticsId = analyticsIdOverride || fallbackAnalyticsId;
  if (!analyticsId) return null;

  const profileUrl = buildProfileUrlForAnalyticsId(analyticsId) || currentTab.url;

  return {
    analyticsId,
    url: profileUrl
  };
}

// Check if current user is bookmarked
function isCurrentUserBookmarked() {
  const userInfo = getCurrentUserInfo();
  if (!userInfo) return false;
  return bookmarksList.some(b => getBookmarkAnalyticsId(b) === userInfo.analyticsId);
}

// Toggle bookmark for current user
async function toggleBookmark() {
  await refreshCurrentAnalyticsIdFromPage();
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    showNotification('No user profile detected', 'error');
    return;
  }

  const existingIndex = bookmarksList.findIndex(b => getBookmarkAnalyticsId(b) === userInfo.analyticsId);

  if (existingIndex >= 0) {
    bookmarksList.splice(existingIndex, 1);
    showNotification('Bookmark removed', 'success');
  } else {
    bookmarksList.unshift({
      analyticsId: userInfo.analyticsId,
      url: userInfo.url,
      notes: '',
      createdAt: new Date().toISOString()
    });
    showNotification('User bookmarked', 'success');
  }

  await saveBookmarks();
  updateBookmarkIcon();
  updateBookmarksCta();
  if (activeTabName === 'bookmarks') displayBookmarks();
}

// Add current user to bookmarks (add-only CTA action)
async function addCurrentUserBookmark() {
  await refreshCurrentAnalyticsIdFromPage();
  const userInfo = getCurrentUserInfo();
  if (!userInfo) {
    showNotification('No user profile detected', 'error');
    updateBookmarksCta();
    return;
  }

  const alreadyBookmarked = bookmarksList.some(b => getBookmarkAnalyticsId(b) === userInfo.analyticsId);
  if (alreadyBookmarked) {
    showNotification('User already bookmarked', 'success');
    updateBookmarksCta();
    return;
  }

  bookmarksList.unshift({
    analyticsId: userInfo.analyticsId,
    url: userInfo.url,
    notes: '',
    createdAt: new Date().toISOString()
  });

  await saveBookmarks();
  updateBookmarkIcon();
  updateBookmarksCta();
  displayBookmarks();
  showNotification('User bookmarked', 'success');
}

// Update bookmark icon state (filled vs outline)
function updateBookmarkIcon() {
  const bookmarkBtn = document.getElementById('bookmarkIconBtn');
  if (!bookmarkBtn) return;

  const img = bookmarkBtn.querySelector('.icon-svg');
  if (!img) return;

  if (isCurrentUserBookmarked()) {
    img.src = '../assets/icons/bookmark_filled_24dp_1F1F1F_FILL1_wght400_GRAD0_opsz24.svg';
    bookmarkBtn.title = 'Remove Bookmark';
  } else {
    img.src = '../assets/icons/bookmark_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
    bookmarkBtn.title = 'Bookmark User';
  }
}

// Display bookmarks in the tab
function displayBookmarks() {
  const container = document.getElementById('bookmarksList');
  const searchCount = document.getElementById('bookmarksSearchCount');
  if (!container) return;

  if (bookmarksList.length === 0) {
    container.innerHTML = '<p class="empty-state">No bookmarked users yet. Use "Add Current User" or the bookmark icon in the header.</p>';
    if (searchCount) searchCount.textContent = '';
    return;
  }

  const search = bookmarksSearchTerm.trim().toLowerCase();
  const filteredBookmarks = search
    ? bookmarksList.filter((bookmark) => {
      const analyticsId = getBookmarkAnalyticsId(bookmark);
      const displayId = formatBookmarkTitleFromAnalyticsId(analyticsId);
      const notes = bookmark.notes || '';
      const url = bookmark.url || '';
      const searchableText = `${analyticsId} ${displayId} ${notes} ${url}`.toLowerCase();
      return searchableText.includes(search);
    })
    : bookmarksList;

  if (searchCount) {
    searchCount.textContent = search ? `${filteredBookmarks.length} of ${bookmarksList.length}` : '';
  }

  container.innerHTML = '';

  if (filteredBookmarks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = `No bookmarks found for "${bookmarksSearchTerm.trim()}".`;
    container.appendChild(empty);
    return;
  }

  filteredBookmarks.forEach((bookmark) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';

    const bookmarkIndex = bookmarksList.indexOf(bookmark);
    if (bookmarkIndex < 0) return;

    // User ID row
    const idRow = document.createElement('div');
    idRow.className = 'bookmark-id-row';

    const idSpan = document.createElement('span');
    idSpan.className = 'bookmark-id';
    const analyticsId = getBookmarkAnalyticsId(bookmark);
    idSpan.textContent = formatBookmarkTitleFromAnalyticsId(analyticsId);
    idSpan.title = `Analytics ID: ${analyticsId}`;

    const dateSpan = document.createElement('span');
    dateSpan.className = 'bookmark-date';
    const date = new Date(bookmark.createdAt);
    dateSpan.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'bookmark-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'bookmark-action-btn bookmark-delete-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Delete bookmark';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteBookmark(bookmarkIndex);
    });

    actionsDiv.appendChild(deleteBtn);

    idRow.appendChild(idSpan);
    idRow.appendChild(dateSpan);
    idRow.appendChild(actionsDiv);

    // Notes row
    const notesRow = document.createElement('div');
    notesRow.className = 'bookmark-notes-row';

    const notesInput = document.createElement('input');
    notesInput.type = 'text';
    notesInput.className = 'bookmark-notes-input';
    notesInput.placeholder = 'Add notes...';
    notesInput.value = bookmark.notes || '';
    notesInput.addEventListener('blur', async () => {
      bookmarksList[bookmarkIndex].notes = notesInput.value;
      await saveBookmarks();
      if (bookmarksSearchTerm.trim()) displayBookmarks();
    });
    notesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') notesInput.blur();
    });

    notesRow.appendChild(notesInput);

    item.appendChild(idRow);
    item.appendChild(notesRow);

    // Click to navigate
    idRow.addEventListener('click', () => {
      if (currentTab) {
        chrome.tabs.update(currentTab.id, { url: bookmark.url });
      }
    });
    idRow.style.cursor = 'pointer';

    container.appendChild(item);
  });
}

// Delete a bookmark by index
async function deleteBookmark(index) {
  bookmarksList.splice(index, 1);
  await saveBookmarks();
  displayBookmarks();
  updateBookmarkIcon();
  updateBookmarksCta();
  showNotification('Bookmark deleted', 'success');
}

// Clear all bookmarks
async function clearBookmarks() {
  if (bookmarksList.length === 0) {
    showNotification('No bookmarks to clear', 'error');
    return;
  }

  const confirmed = confirm(`Delete all ${bookmarksList.length} bookmark${bookmarksList.length !== 1 ? 's' : ''}?`);
  if (!confirmed) return;

  bookmarksList = [];
  await saveBookmarks();
  displayBookmarks();
  updateBookmarkIcon();
  updateBookmarksCta();
  showNotification('All bookmarks cleared', 'success');
}
