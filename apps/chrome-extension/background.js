// API_BASE is loaded via importScripts in service worker
importScripts('config.js');

// Utility functions
function generateUUID() {
  return crypto.randomUUID();
}

function createLink(url, title, favicon) {
  return {
    id: generateUUID(),
    url,
    title,
    favicon,
    createdAt: Date.now(),
  };
}

function linkExists(links, url) {
  return links.some(link => link.url === url);
}

// Storage functions
async function getStoredUuid() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['uuid'], (result) => {
      resolve(result.uuid || null);
    });
  });
}

// API functions
async function fetchUserData(uuid) {
  const response = await fetch(`${API_BASE}/api/data`, {
    headers: { 'Authorization': `Bearer ${uuid}` },
  });
  return response.json();
}

async function saveUserData(uuid, data) {
  const response = await fetch(`${API_BASE}/api/data`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${uuid}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Show notification badge on extension icon
function showBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });

  // Clear badge after 2 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Save current tab as bookmark
async function saveCurrentTab() {
  try {
    // Get stored UUID
    const uuid = await getStoredUuid();

    if (!uuid) {
      // Not logged in - show popup for login
      // We can't programmatically open the popup, so just show a badge
      showBadge('!', '#dc2626');
      return;
    }

    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      showBadge('!', '#dc2626');
      return;
    }

    // Don't allow bookmarking chrome:// pages, etc.
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      showBadge('!', '#dc2626');
      return;
    }

    // Fetch current data
    const result = await fetchUserData(uuid);
    if (!result.success) {
      showBadge('!', '#dc2626');
      return;
    }

    const userData = result.data;

    // Check if already bookmarked
    if (linkExists(userData.links, tab.url)) {
      showBadge('=', '#f59e0b'); // Already exists
      return;
    }

    // Create new link
    const urlObj = new URL(tab.url);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    const title = tab.title || urlObj.hostname;

    const newLink = createLink(tab.url, title, favicon);
    userData.links.push(newLink);
    userData.updatedAt = Date.now();

    // Save data
    const saveResult = await saveUserData(uuid, userData);
    if (saveResult.success) {
      showBadge('OK', '#22c55e'); // Success
    } else {
      showBadge('!', '#dc2626'); // Error
    }

  } catch (error) {
    console.error('Background save error:', error);
    showBadge('!', '#dc2626');
  }
}

// Listen for keyboard shortcut command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-bookmark') {
    saveCurrentTab();
  }
});
