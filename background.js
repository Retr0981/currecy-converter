// Fetch and cache exchange rates
const API_KEY = 'YOUR_API_KEY'; // Get free key from exchangerate-api.com
const API_URL = API_KEY 
  ? `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`
  : 'https://api.exchangerate-api.com/v4/latest/USD'; // Free tier

let ratesCache = {};
let lastFetch = 0;

// Fetch rates on install/update
chrome.runtime.onInstalled.addListener(() => {
  fetchRates();
});

// Fetch every hour
setInterval(fetchRates, 60 * 60 * 1000);

async function fetchRates() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    ratesCache = data.rates || data.conversion_rates;
    lastFetch = Date.now();
    await chrome.storage.local.set({ rates: ratesCache, lastFetch });
    console.log('Exchange rates updated');
  } catch (error) {
    console.error('Failed to fetch rates:', error);
    // Load from cache if available
    const cached = await chrome.storage.local.get(['rates']);
    ratesCache = cached.rates || {};
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRates') {
    sendResponse(ratesCache);
  } else if (request.action === 'convert') {
    sendResponse(convertCurrency(request.amount, request.from, request.to));
  }
});

function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  const rate = (ratesCache[to] / ratesCache[from]) || 0;
  return (amount * rate).toFixed(2);
}