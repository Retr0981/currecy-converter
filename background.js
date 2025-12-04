// Universal Currency Converter Background
console.log('Background worker started');

// Free API endpoints (no key required)
const API_ENDPOINTS = [
  'https://api.exchangerate-api.com/v4/latest/USD',
  'https://open.er-api.com/v6/latest/USD',
  'https://api.ratesapi.io/api/latest?base=USD'
];

let rates = {};
let lastFetch = 0;
let activeEndpoint = 0;

// Fetch on install/startup
chrome.runtime.onInstalled.addListener(() => {
  fetchRates();
});

chrome.runtime.onStartup.addListener(() => {
  fetchRates();
});

// Fetch rates every 30 minutes (more frequent for shopping sites)
setInterval(fetchRates, 30 * 60 * 1000);

async function fetchRates() {
  try {
    const endpoint = API_ENDPOINTS[activeEndpoint];
    const response = await fetch(endpoint);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    // Handle different API formats
    if (data.rates) {
      rates = data.rates;
    } else if (data.conversion_rates) {
      rates = data.conversion_rates;
    }
    
    lastFetch = Date.now();
    await chrome.storage.local.set({ rates, lastFetch });
    
    console.log(`✅ Exchange rates updated from ${endpoint}`);
    activeEndpoint = (activeEndpoint + 1) % API_ENDPOINTS.length; // Rotate endpoints
    
  } catch (error) {
    console.error('❌ Rate fetch failed:', error);
    
    // Try next endpoint
    activeEndpoint = (activeEndpoint + 1) % API_ENDPOINTS.length;
    
    // Load cached rates if available
    const cached = await chrome.storage.local.get(['rates']);
    rates = cached.rates || {};
  }
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getRates') {
    sendResponse(rates);
  } else if (request.action === 'convert') {
    const result = convertCurrency(request.amount, request.from, request.to);
    sendResponse(result);
  }
});

function convertCurrency(amount, from, to) {
  if (!rates[from] || !rates[to]) return null;
  const rate = rates[to] / rates[from];
  return {
    converted: (amount * rate).toFixed(2),
    rate: rate.toFixed(4)
  };
}