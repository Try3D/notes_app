// API_BASE is loaded from config.js

// DOM Elements
const elements = {
  // Views
  mainView: document.getElementById('mainView'),
  generateView: document.getElementById('generateView'),
  enterView: document.getElementById('enterView'),
  bookmarkView: document.getElementById('bookmarkView'),
  statusView: document.getElementById('statusView'),
  settingsView: document.getElementById('settingsView'),
  loadingOverlay: document.getElementById('loadingOverlay'),

  // Main view
  settingsBtn: document.getElementById('settingsBtn'),
  generateBtn: document.getElementById('generateBtn'),
  haveCodeBtn: document.getElementById('haveCodeBtn'),

  // Generate view
  generatedCode: document.getElementById('generatedCode'),
  copyBtn: document.getElementById('copyBtn'),
  copyIcon: document.getElementById('copyIcon'),
  checkIcon: document.getElementById('checkIcon'),
  savedCheckbox: document.getElementById('savedCheckbox'),
  continueBtn: document.getElementById('continueBtn'),
  backFromGenerate: document.getElementById('backFromGenerate'),

  // Enter view
  codeInput: document.getElementById('codeInput'),
  loginError: document.getElementById('loginError'),
  loginBtn: document.getElementById('loginBtn'),
  backFromEnter: document.getElementById('backFromEnter'),

  // Bookmark view
  pageFavicon: document.getElementById('pageFavicon'),
  pageTitle: document.getElementById('pageTitle'),
  pageUrl: document.getElementById('pageUrl'),
  saveBtn: document.getElementById('saveBtn'),

  // Status view
  statusIcon: document.getElementById('statusIcon'),
  statusText: document.getElementById('statusText'),

  // Settings view
  currentUuid: document.getElementById('currentUuid'),
  toggleUuidBtn: document.getElementById('toggleUuidBtn'),
  eyeIcon: document.getElementById('eyeIcon'),
  eyeOffIcon: document.getElementById('eyeOffIcon'),
  copyUuidBtn: document.getElementById('copyUuidBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  backFromSettings: document.getElementById('backFromSettings'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeToggleText: document.getElementById('themeToggleText'),
  themeBtnSunIcon: document.getElementById('themeBtnSunIcon'),
  themeBtnMoonIcon: document.getElementById('themeBtnMoonIcon'),
};

// State
let state = {
  uuid: null,
  userData: null,
  currentTab: null,
  generatedUuid: null,
  uuidVisible: false,
  darkMode: false,
};

// Utility functions
function generateUUID() {
  return crypto.randomUUID();
}

function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function showView(viewName) {
  // Hide all views
  Object.keys(elements).forEach(key => {
    if (key.endsWith('View') && elements[key]) {
      elements[key].classList.add('hidden');
    }
  });

  // Show requested view
  const view = elements[viewName + 'View'];
  if (view) {
    view.classList.remove('hidden');
  }

  // Hide entire header when in settings view (settings has its own header)
  const header = document.querySelector('.header');
  if (viewName === 'settings') {
    header.classList.add('hidden');
  } else {
    header.classList.remove('hidden');
  }
}

function showLoading() {
  elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay.classList.add('hidden');
}

function showStatus(type, message) {
  showView('status');

  elements.statusIcon.className = 'status-icon ' + type;

  // Set icon based on type
  let iconSvg = '';
  switch (type) {
    case 'success':
      iconSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"></path></svg>';
      break;
    case 'exists':
      iconSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>';
      break;
    case 'error':
      iconSvg = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      break;
    case 'loading':
      iconSvg = '<div class="spinner" style="width:24px;height:24px;border-width:2px;"></div>';
      break;
  }
  elements.statusIcon.innerHTML = iconSvg;
  elements.statusText.textContent = message;
}

// API functions
async function checkUuidExists(uuid) {
  const response = await fetch(`${API_BASE}/api/exists/${uuid}`);
  const result = await response.json();
  return result.data?.exists || false;
}

async function registerUuid(uuid) {
  const response = await fetch(`${API_BASE}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });
  return response.json();
}

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

// Storage functions
async function getStoredUuid() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['uuid'], (result) => {
      resolve(result.uuid || null);
    });
  });
}

async function setStoredUuid(uuid) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ uuid }, resolve);
  });
}

async function clearStoredUuid() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['uuid'], resolve);
  });
}

function maskUuid(uuid) {
  // Fully hide - just show dots
  return '••••••••••••••••••••••••••••••••••••';
}

function updateUuidDisplay() {
  if (state.uuidVisible) {
    elements.currentUuid.textContent = state.uuid;
    elements.currentUuid.classList.remove('uuid-hidden');
    elements.eyeIcon.classList.add('hidden');
    elements.eyeOffIcon.classList.remove('hidden');
  } else {
    elements.currentUuid.textContent = maskUuid(state.uuid);
    elements.currentUuid.classList.add('uuid-hidden');
    elements.eyeIcon.classList.remove('hidden');
    elements.eyeOffIcon.classList.add('hidden');
  }
}

// Theme functions
function applyTheme() {
  if (state.darkMode) {
    document.body.classList.add('dark');
    elements.themeBtnSunIcon.classList.add('hidden');
    elements.themeBtnMoonIcon.classList.remove('hidden');
    elements.themeToggleText.textContent = 'Switch to Light Mode';
  } else {
    document.body.classList.remove('dark');
    elements.themeBtnSunIcon.classList.remove('hidden');
    elements.themeBtnMoonIcon.classList.add('hidden');
    elements.themeToggleText.textContent = 'Switch to Dark Mode';
  }
}

async function saveTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.set({ darkMode: state.darkMode }, resolve);
  });
}

async function loadTheme() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['darkMode'], (result) => {
      state.darkMode = result.darkMode || false;
      applyTheme();
      resolve();
    });
  });
}

// Tab functions
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Bookmark functions
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

async function saveBookmark() {
  if (!state.uuid || !state.currentTab) return;

  showStatus('loading', 'Saving...');

  try {
    // Fetch current data
    const result = await fetchUserData(state.uuid);
    if (!result.success) {
      throw new Error('Failed to fetch data');
    }

    const userData = result.data;
    const url = state.currentTab.url;

    // Check if already bookmarked
    if (linkExists(userData.links, url)) {
      showStatus('exists', 'Already bookmarked');
      setTimeout(() => window.close(), 1000);
      return;
    }

    // Create new link
    const urlObj = new URL(url);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    const title = state.currentTab.title || urlObj.hostname;

    const newLink = createLink(url, title, favicon);
    userData.links.push(newLink);
    userData.updatedAt = Date.now();

    // Save data
    const saveResult = await saveUserData(state.uuid, userData);
    if (!saveResult.success) {
      throw new Error('Failed to save');
    }

    showStatus('success', 'Saved!');
    setTimeout(() => window.close(), 1000);

  } catch (error) {
    console.error('Save error:', error);
    showStatus('error', 'Failed to save');
  }
}

// Event handlers
function setupEventListeners() {
  // Settings button
  elements.settingsBtn.addEventListener('click', () => {
    if (state.uuid) {
      state.uuidVisible = false;
      updateUuidDisplay();
      showView('settings');
    } else {
      // If not logged in, settings redirects to login
      showView('main');
    }
  });

  // Main view
  elements.generateBtn.addEventListener('click', () => {
    state.generatedUuid = generateUUID();
    elements.generatedCode.textContent = state.generatedUuid;
    elements.savedCheckbox.checked = false;
    elements.continueBtn.disabled = true;
    showView('generate');
  });

  elements.haveCodeBtn.addEventListener('click', () => {
    elements.codeInput.value = '';
    elements.loginError.classList.add('hidden');
    showView('enter');
  });

  // Generate view
  elements.copyBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.generatedUuid);
    elements.copyIcon.classList.add('hidden');
    elements.checkIcon.classList.remove('hidden');
    setTimeout(() => {
      elements.copyIcon.classList.remove('hidden');
      elements.checkIcon.classList.add('hidden');
    }, 2000);
  });

  elements.savedCheckbox.addEventListener('change', () => {
    elements.continueBtn.disabled = !elements.savedCheckbox.checked;
  });

  elements.continueBtn.addEventListener('click', async () => {
    if (!elements.savedCheckbox.checked) return;

    showLoading();

    try {
      const result = await registerUuid(state.generatedUuid);
      if (result.success) {
        state.uuid = state.generatedUuid;
        await setStoredUuid(state.uuid);
        hideLoading();
        await initBookmarkView();
      } else {
        hideLoading();
        showStatus('error', 'Registration failed');
        setTimeout(() => showView('generate'), 2000);
      }
    } catch (error) {
      hideLoading();
      showStatus('error', 'Connection failed');
      setTimeout(() => showView('generate'), 2000);
    }
  });

  elements.backFromGenerate.addEventListener('click', () => {
    showView('main');
  });

  // Enter view
  elements.loginBtn.addEventListener('click', handleLogin);

  elements.codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  });

  elements.backFromEnter.addEventListener('click', () => {
    showView('main');
  });

  // Bookmark view
  elements.saveBtn.addEventListener('click', saveBookmark);

  // Enter key to save bookmark
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !elements.bookmarkView.classList.contains('hidden')) {
      saveBookmark();
    }
  });

  // Settings view - back button
  elements.backFromSettings.addEventListener('click', async () => {
    await initBookmarkView();
  });

  // Settings view - UUID visibility toggle
  elements.toggleUuidBtn.addEventListener('click', () => {
    state.uuidVisible = !state.uuidVisible;
    updateUuidDisplay();
  });

  // Settings view - copy UUID
  elements.copyUuidBtn.addEventListener('click', async () => {
    await navigator.clipboard.writeText(state.uuid);
  });

  // Settings view - theme toggle
  elements.themeToggleBtn.addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    applyTheme();
    saveTheme();
  });

  // Settings view - logout
  elements.logoutBtn.addEventListener('click', async () => {
    await clearStoredUuid();
    state.uuid = null;
    state.userData = null;
    showView('main');
  });
}

async function handleLogin() {
  const code = elements.codeInput.value.trim();

  if (!isValidUUID(code)) {
    elements.loginError.textContent = 'Invalid code format';
    elements.loginError.classList.remove('hidden');
    return;
  }

  showLoading();
  elements.loginError.classList.add('hidden');

  try {
    const exists = await checkUuidExists(code);

    if (!exists) {
      // Register new UUID
      await registerUuid(code);
    }

    state.uuid = code;
    await setStoredUuid(code);
    hideLoading();
    await initBookmarkView();

  } catch (error) {
    hideLoading();
    elements.loginError.textContent = 'Connection failed';
    elements.loginError.classList.remove('hidden');
  }
}

async function initBookmarkView() {
  try {
    state.currentTab = await getCurrentTab();

    if (!state.currentTab || !state.currentTab.url) {
      showStatus('error', 'Cannot bookmark this page');
      return;
    }

    // Don't allow bookmarking chrome:// pages, etc.
    if (!state.currentTab.url.startsWith('http://') && !state.currentTab.url.startsWith('https://')) {
      showStatus('error', 'Cannot bookmark this page');
      return;
    }

    const urlObj = new URL(state.currentTab.url);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;

    elements.pageFavicon.src = favicon;
    elements.pageTitle.textContent = state.currentTab.title || urlObj.hostname;
    elements.pageUrl.textContent = state.currentTab.url;

    showView('bookmark');
  } catch (error) {
    console.error('Init bookmark error:', error);
    showStatus('error', 'Something went wrong');
  }
}

// Initialize
async function init() {
  setupEventListeners();

  // Load theme
  await loadTheme();

  // Check if user is already logged in
  state.uuid = await getStoredUuid();

  if (state.uuid) {
    // Already logged in, show bookmark view
    await initBookmarkView();
  } else {
    // Not logged in, show main view
    showView('main');
  }
}

// Start the extension
init();
