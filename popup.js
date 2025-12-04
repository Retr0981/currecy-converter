// Popup logic
const sourceSelect = document.getElementById('source-currency');
const targetSelect = document.getElementById('target-currency');
const autoDetect = document.getElementById('auto-detect');
const showOriginal = document.getElementById('show-original');
const textColor = document.getElementById('text-color');
const convertBtn = document.getElementById('convert-btn');
const resetBtn = document.getElementById('reset-btn');
const rateIndicator = document.getElementById('rate-indicator');
const convertedCount = document.getElementById('converted-count');
const lastUpdated = document.getElementById('last-updated');

let rates = {};
let currentTab = null;

// Load saved settings
chrome.storage.local.get(['source', 'target', 'color', 'autoDetect', 'showOriginal'], (data) => {
  sourceSelect.value = data.source || 'USD';
  targetSelect.value = data.target || 'EUR';
  textColor.value = data.color || '#00ff88';
  autoDetect.checked = data.autoDetect !== false;
  showOriginal.checked = data.showOriginal !== false;
});

// Get current tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentTab = tabs[0];
});

// Fetch rates
chrome.runtime.sendMessage({ action: 'getRates' }, (response) => {
  rates = response || {};
  updateRateIndicator();
});

function updateRateIndicator() {
  const rate = calculateRate(sourceSelect.value, targetSelect.value);
  rateIndicator.innerHTML = `
    <span class="rate-value">1 ${sourceSelect.value} = ${rate} ${targetSelect.value}</span>
    <span class="rate-arrow">➡️</span>
  `;
  rateIndicator.classList.add('pulse');
  setTimeout(() => rateIndicator.classList.remove('pulse'), 1000);
}

function calculateRate(from, to) {
  if (from === to) return '1.00';
  if (!rates[from] || !rates[to]) return '—';
  return (rates[to] / rates[from]).toFixed(4);
}

// Event listeners
[sourceSelect, targetSelect].forEach(select => {
  select.addEventListener('change', () => {
    updateRateIndicator();
    saveSettings();
  });
});

autoDetect.addEventListener('change', saveSettings);
showOriginal.addEventListener('change', saveSettings);
textColor.addEventListener('change', saveSettings);

function saveSettings() {
  chrome.storage.local.set({
    source: sourceSelect.value,
    target: targetSelect.value,
    color: textColor.value,
    autoDetect: autoDetect.checked,
    showOriginal: showOriginal.checked
  });
}

convertBtn.addEventListener('click', () => {
  if (!currentTab) return;
  
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: convertPrices,
    args: [{
      source: autoDetect.checked ? null : sourceSelect.value,
      target: targetSelect.value,
      color: textColor.value,
      showOriginal: showOriginal.checked,
      rates: rates
    }]
  });
  
  // Update count
  chrome.tabs.sendMessage(currentTab.id, { action: 'getCount' }, (response) => {
    convertedCount.textContent = response?.count || 0;
  });
});

resetBtn.addEventListener('click', () => {
  if (!currentTab) return;
  
  chrome.scripting.executeScript({
    target: { tabId: currentTab.id },
    function: resetPrices
  });
  
  convertedCount.textContent = '0';
});

// Update rates every hour
setInterval(() => {
  chrome.runtime.sendMessage({ action: 'getRates' }, (response) => {
    rates = response || {};
    updateRateIndicator();
  });
}, 60 * 60 * 1000);