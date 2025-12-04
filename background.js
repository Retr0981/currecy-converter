// Background Service Worker
console.log('Currency Converter Pro background service started');

let exchangeRates = {};
let lastUpdated = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Fetch exchange rates
async function fetchExchangeRates() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.rates) {
            exchangeRates = data.rates;
            exchangeRates.USD = 1; // Ensure USD rate exists
            lastUpdated = Date.now();
            
            // Cache rates
            await chrome.storage.local.set({
                rates: exchangeRates,
                lastUpdated: lastUpdated
            });
            
            console.log('Exchange rates updated successfully');
            return true;
        }
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        
        // Try backup API
        try {
            const backupResponse = await fetch('https://open.er-api.com/v6/latest/USD');
            if (backupResponse.ok) {
                const backupData = await backupResponse.json();
                if (backupData.rates) {
                    exchangeRates = backupData.rates;
                    exchangeRates.USD = 1;
                    lastUpdated = Date.now();
                    
                    await chrome.storage.local.set({
                        rates: exchangeRates,
                        lastUpdated: lastUpdated
                    });
                    
                    console.log('Backup exchange rates loaded');
                    return true;
                }
            }
        } catch (backupError) {
            console.error('Backup API also failed:', backupError);
        }
    }
    
    return false;
}

// Load cached rates
async function loadCachedRates() {
    try {
        const cached = await chrome.storage.local.get(['rates', 'lastUpdated']);
        
        if (cached.rates && cached.lastUpdated) {
            exchangeRates = cached.rates;
            lastUpdated = cached.lastUpdated;
            
            // Check if cache is still valid
            const cacheAge = Date.now() - lastUpdated;
            if (cacheAge < CACHE_DURATION) {
                console.log('Using cached exchange rates');
                return true;
            }
        }
    } catch (error) {
        console.error('Error loading cached rates:', error);
    }
    
    return false;
}

// Initialize rates
async function initializeRates() {
    const hasCache = await loadCachedRates();
    
    if (!hasCache || (Date.now() - lastUpdated > CACHE_DURATION)) {
        await fetchExchangeRates();
    }
    
    // Schedule periodic updates
    setInterval(fetchExchangeRates, CACHE_DURATION);
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.action) {
        case 'getRates':
            sendResponse(exchangeRates);
            break;
            
        case 'convert':
            const { amount, from, to } = request;
            if (exchangeRates[from] && exchangeRates[to]) {
                const rate = exchangeRates[to] / exchangeRates[from];
                sendResponse({
                    converted: (amount * rate).toFixed(2),
                    rate: rate.toFixed(4)
                });
            } else {
                sendResponse(null);
            }
            break;
            
        case 'setAutoConvert':
            chrome.storage.sync.get(['currencySettings'], (result) => {
                const settings = result.currencySettings || {};
                settings.autoConvert = request.enabled;
                chrome.storage.sync.set({ currencySettings: settings });
            });
            sendResponse({ success: true });
            break;
            
        case 'updateCount':
            // Update badge
            if (request.count > 0) {
                chrome.action.setBadgeText({ text: request.count.toString() });
                chrome.action.setBadgeBackgroundColor({ color: '#00B894' });
            } else {
                chrome.action.setBadgeText({ text: '' });
            }
            sendResponse({ success: true });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
    
    return true;
});

// Auto-convert on page load
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.storage.sync.get(['currencySettings'], (result) => {
            if (result.currencySettings?.autoConvert) {
                setTimeout(() => {
                    chrome.tabs.sendMessage(tabId, {
                        action: 'convertPrices',
                        settings: {
                            ...result.currencySettings,
                            rates: exchangeRates
                        }
                    }).catch(error => {
                        // Content script might not be loaded yet
                        console.log('Content script not ready for auto-convert');
                    });
                }, 2000);
            }
        });
    }
});

// Initialize on install/startup
chrome.runtime.onInstalled.addListener(() => {
    console.log('Currency Converter Pro installed');
    initializeRates();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Currency Converter Pro started');
    initializeRates();
});

// Initialize now
initializeRates();