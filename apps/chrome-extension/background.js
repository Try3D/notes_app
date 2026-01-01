importScripts('config.js');

function generateUUID() {
  return crypto.randomUUID();
}

function makeLinkObject(url, title, favicon) {
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

async function getStoredUuid() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['uuid'], (result) => {
      resolve(result.uuid || null);
    });
  });
}

async function fetchLinks(uuid) {
  const response = await fetch(`${API_BASE}/api/links`, {
    headers: { 'Authorization': `Bearer ${uuid}` },
  });
  return response.json();
}

async function createLink(uuid, link) {
  const response = await fetch(`${API_BASE}/api/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${uuid}`,
    },
    body: JSON.stringify(link),
  });
  return response.json();
}

function showBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

async function saveCurrentTab() {
  try {
    const uuid = await getStoredUuid();

    if (!uuid) {
      showBadge('!', '#dc2626');
      return;
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      showBadge('!', '#dc2626');
      return;
    }

    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      showBadge('!', '#dc2626');
      return;
    }

    // Fetch only links using the new granular endpoint
    const result = await fetchLinks(uuid);
    if (!result.success) {
      showBadge('!', '#dc2626');
      return;
    }

    const links = result.data || [];

    if (linkExists(links, tab.url)) {
      showBadge('=', '#f59e0b');
      return;
    }

    const urlObj = new URL(tab.url);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    const title = tab.title || urlObj.hostname;

    const newLink = makeLinkObject(tab.url, title, favicon);

    // Create single link using the new granular endpoint
    const saveResult = await createLink(uuid, newLink);
    if (saveResult.success) {
      showBadge('OK', '#22c55e');
    } else {
      showBadge('!', '#dc2626');
    }

  } catch (error) {
    console.error('Background save error:', error);
    showBadge('!', '#dc2626');
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-bookmark') {
    saveCurrentTab();
  }
});
