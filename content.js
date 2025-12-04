// World Currency Converter - Content Script
let convertedElements = new Map();
let originalTexts = new Map();
let currentSettings = null;

// Enhanced currency symbols mapping with better detection
const CURRENCY_SYMBOLS = {
    // Major currencies with symbols
    '£': 'GBP', '€': 'EUR', '$': 'USD', '¥': 'JPY', '₹': 'INR',
    '₽': 'RUB', '₩': 'KRW', '₺': 'TRY', 'zł': 'PLN', 'Kč': 'CZK',
    'Ft': 'HUF', 'kr': 'SEK', 'R$': 'BRL', 'S$': 'SGD', 'HK$': 'HKD',
    'NZ$': 'NZD', 'A$': 'AUD', 'C$': 'CAD', 'د.إ': 'AED', 'ر.س': 'SAR',
    '฿': 'THB', 'RM': 'MYR', 'Rp': 'IDR', '₱': 'PHP', '₫': 'VND',
    '৳': 'BDT', '₸': 'KZT', '₴': 'UAH', '₦': 'NGN', '៛': 'KHR',
    '₡': 'CRC', '₲': 'PYG', '₵': 'GHS', '₪': 'ILS', '₮': 'MNT',
    '₭': 'LAK', '₨': 'MUR', '₼': 'AZN', '₾': 'GEL', '₿': 'BTC',
    
    // Currency codes
    'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY', 'CAD': 'CAD',
    'AUD': 'AUD', 'CHF': 'CHF', 'CNY': 'CNY', 'INR': 'INR', 'BRL': 'BRL',
    'RUB': 'RUB', 'KRW': 'KRW', 'MXN': 'MXN', 'SGD': 'SGD', 'HKD': 'HKD',
    'NZD': 'NZD', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK', 'ZAR': 'ZAR',
    'AED': 'AED', 'SAR': 'SAR', 'THB': 'THB', 'MYR': 'MYR', 'IDR': 'IDR',
    'PHP': 'PHP', 'TRY': 'TRY', 'PLN': 'PLN', 'CZK': 'CZK', 'HUF': 'HUF'
};

// Initialize
chrome.runtime.onMessage.addListener(handleMessage);

function handleMessage(request, sender, sendResponse) {
    switch(request.action) {
        case 'convertPrices':
            convertPage(request.settings);
            sendResponse({ success: true, count: convertedElements.size });
            break;
            
        case 'restorePrices':
            restorePrices();
            sendResponse({ success: true, count: 0 });
            break;
            
        case 'getConversionCount':
            sendResponse({ count: convertedElements.size });
            break;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
    return true;
}

function convertPage(settings) {
    currentSettings = settings;
    convertedElements.clear();
    originalTexts.clear();
    
    console.log('Starting conversion with settings:', settings);
    
    // 1. FIRST: Look for specific price elements (most reliable)
    const priceElements = findPriceElements();
    let conversionCount = processPriceElements(priceElements, settings);
    
    // 2. SECOND: Look for text nodes containing price patterns
    if (conversionCount === 0) {
        conversionCount = findAndConvertTextNodes(settings);
    }
    
    console.log(`Converted ${conversionCount} price elements`);
    
    // Update badge
    chrome.runtime.sendMessage({
        action: 'updateCount',
        count: conversionCount
    });
}

function findPriceElements() {
    // Common price element selectors from major e-commerce sites
    const priceSelectors = [
        // eBay
        '.x-price-primary', '.x-bin-price', '[data-testid="x-price-primary"]',
        '.ux-textspans', '.item-price', '.s-item__price',
        
        // Amazon
        '.a-price', '.a-offscreen', '.priceToPay', '.a-price-whole',
        '[data-a-size="xl"]', '.a-color-price',
        
        // General e-commerce
        '.price', '.product-price', '.current-price', '.sale-price',
        '.regular-price', '.discount-price', '.final-price',
        '[class*="price"]', '[class*="Price"]', '[id*="price"]',
        '[data-price]', '[data-test*="price"]', '[aria-label*="price"]',
        
        // AliExpress, Shopify, etc.
        '.product-single__price', '.money', '.product__price',
        '.price-item', '.price__regular', '.price__sale'
    ];
    
    const elements = [];
    
    priceSelectors.forEach(selector => {
        try {
            const found = document.querySelectorAll(selector);
            found.forEach(el => {
                if (el.textContent && containsPrice(el.textContent)) {
                    elements.push(el);
                }
            });
        } catch (e) {
            // Ignore invalid selectors
        }
    });
    
    // Also look for elements with common price patterns in their text
    document.querySelectorAll('*').forEach(el => {
        if (el.textContent && containsPrice(el.textContent)) {
            // Check if it's likely a price element
            const text = el.textContent.trim();
            if (isLikelyPrice(text) && !elements.includes(el)) {
                elements.push(el);
            }
        }
    });
    
    console.log(`Found ${elements.length} potential price elements`);
    return elements;
}

function containsPrice(text) {
    // Check if text contains currency symbol followed by number
    const currencySymbols = Object.keys(CURRENCY_SYMBOLS).filter(s => s.length <= 3);
    const symbolPattern = new RegExp(`[${currencySymbols.join('')}]\\s*[\\d\\.,]+`, 'i');
    const reversePattern = new RegExp(`[\\d\\.,]+\\s*[${currencySymbols.join('')}]`, 'i');
    
    return symbolPattern.test(text) || reversePattern.test(text);
}

function isLikelyPrice(text) {
    // More strict check for price-like text
    const pricePatterns = [
        // Currency symbol + number
        /^[£$€¥₹₽₩₺]\s*[\d\.,]+$/,
        /^[\d\.,]+\s*[£$€¥₹₽₩₺]$/,
        
        // Common price formats
        /^[£$€¥₹₽₩₺][\d\.,]+\s*(USD|EUR|GBP|JPY|CAD|AUD|CHF)?$/i,
        /^[\d\.,]+\s*(USD|EUR|GBP|JPY|CAD|AUD|CHF)?\s*[£$€¥₹₽₩₺]?$/i,
        
        // Price with decimal
        /^[£$€¥₹₽₩₺]\d+\.\d{2}$/,
        /^\d+\.\d{2}\s*[£$€¥₹₽₩₺]$/,
        
        // Price range
        /^[£$€¥₹₽₩₺][\d\.,]+\s*[-–—]\s*[£$€¥₹₽₩₺][\d\.,]+$/,
        
        // Common e-commerce patterns
        /RRP\s*[£$€¥₹₽₩₺][\d\.,]+/i,
        /Save\s*[£$€¥₹₽₩₺][\d\.,]+/i,
        /Was\s*[£$€¥₹₽₩₺][\d\.,]+/i,
        /Now\s*[£$€¥₹₽₩₺][\d\.,]+/i
    ];
    
    return pricePatterns.some(pattern => pattern.test(text.trim()));
}

function processPriceElements(elements, settings) {
    let conversionCount = 0;
    
    elements.forEach(element => {
        const result = processElement(element, settings);
        if (result.converted) {
            conversionCount++;
        }
    });
    
    return conversionCount;
}

function processElement(element, settings) {
    const originalText = element.textContent;
    const priceMatches = extractPrices(originalText);
    
    if (priceMatches.length === 0) {
        return { converted: false };
    }
    
    let newHtml = originalText;
    let hasChanges = false;
    
    priceMatches.forEach(match => {
        const conversion = convertPrice(match, settings);
        if (conversion) {
            newHtml = newHtml.replace(match.fullMatch, conversion.formatted);
            hasChanges = true;
            
            convertedElements.set(element, {
                originalText,
                match: match.fullMatch,
                conversion
            });
        }
    });
    
    if (hasChanges) {
        originalTexts.set(element, originalText);
        element.innerHTML = newHtml;
        
        // Add conversion styling
        addConversionStyling(element, settings);
        
        return { converted: true };
    }
    
    return { converted: false };
}

function extractPrices(text) {
    const matches = [];
    
    // Build regex for currency symbols
    const symbolPattern = Object.keys(CURRENCY_SYMBOLS)
        .filter(s => s.length <= 3) // Skip longer currency codes for symbol detection
        .map(escapeRegex)
        .join('|');
    
    // Pattern 1: Currency symbol + number (e.g., £24.99, $100, €50.00)
    const pattern1 = new RegExp(`([${symbolPattern}])\\s*([\\d\\.,]+(?:\\.[\\d]{2})?\\b)`, 'gi');
    
    // Pattern 2: Number + currency symbol (e.g., 24.99£, 100$, 50.00€)
    const pattern2 = new RegExp(`([\\d\\.,]+(?:\\.[\\d]{2})?\\b)\\s*([${symbolPattern}])`, 'gi');
    
    // Pattern 3: Currency code format (e.g., USD 100, 100 EUR)
    const pattern3 = new RegExp(`\\b(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|RUB|KRW|MXN|SGD|HKD|NZD|SEK|NOK|DKK|ZAR|AED|SAR|THB|MYR|IDR|PHP|TRY|PLN|CZK|HUF)\\s*([\\d\\.,]+(?:\\.[\\d]{2})?\\b)`, 'gi');
    const pattern4 = new RegExp(`\\b([\\d\\.,]+(?:\\.[\\d]{2})?\\b)\\s*(USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|RUB|KRW|MXN|SGD|HKD|NZD|SEK|NOK|DKK|ZAR|AED|SAR|THB|MYR|IDR|PHP|TRY|PLN|CZK|HUF)\\b`, 'gi');
    
    [pattern1, pattern2, pattern3, pattern4].forEach(pattern => {
        let match;
        pattern.lastIndex = 0; // Reset regex
        while ((match = pattern.exec(text)) !== null) {
            const fullMatch = match[0];
            
            // Check if this is part of a larger number (like phone number)
            if (!isPartOfLargerNumber(text, match.index, fullMatch.length)) {
                matches.push({
                    fullMatch,
                    symbol: match[1] || match[2],
                    amount: match[2] || match[1]
                });
            }
        }
    });
    
    // Remove duplicates
    const uniqueMatches = [];
    const seen = new Set();
    
    matches.forEach(match => {
        if (!seen.has(match.fullMatch)) {
            seen.add(match.fullMatch);
            uniqueMatches.push(match);
        }
    });
    
    return uniqueMatches;
}

function isPartOfLargerNumber(text, index, length) {
    // Check if this price is part of a phone number or other long number
    const before = text.substring(Math.max(0, index - 10), index);
    const after = text.substring(index + length, Math.min(text.length, index + length + 10));
    
    // If surrounded by many digits, might be part of phone/ID number
    const digitCount = (before.match(/\d/g) || []).length + (after.match(/\d/g) || []).length;
    return digitCount > 8; // Likely phone number if many digits around
}

function convertPrice(match, settings) {
    const { symbol, amount } = match;
    
    // Extract numeric value
    const numericValue = extractNumericValue(amount);
    if (!numericValue || numericValue === 0) {
        console.log('Invalid numeric value:', amount);
        return null;
    }
    
    // Detect source currency
    let sourceCurrency = detectCurrency(symbol);
    if (!sourceCurrency && settings.sourceCurrency !== 'auto') {
        sourceCurrency = settings.sourceCurrency;
    }
    if (!sourceCurrency) {
        console.log('Could not detect currency for symbol:', symbol);
        return null;
    }
    
    const targetCurrency = settings.targetCurrency || 'EUR';
    
    // Get conversion rate
    const rate = getConversionRate(sourceCurrency, targetCurrency, settings.rates);
    if (!rate) {
        console.log(`No rate for ${sourceCurrency} to ${targetCurrency}`);
        return null;
    }
    
    // Calculate converted value
    const convertedValue = numericValue * rate;
    
    // Format the result
    const formatted = formatConversion(
        match.fullMatch,
        numericValue,
        convertedValue,
        sourceCurrency,
        targetCurrency,
        settings
    );
    
    console.log(`Converted: ${match.fullMatch} → ${formatted}`);
    
    return {
        originalValue: numericValue,
        convertedValue,
        sourceCurrency,
        targetCurrency,
        rate,
        formatted
    };
}

function detectCurrency(symbol) {
    // Clean the symbol
    const cleanSymbol = symbol.trim();
    
    // Check if it's a direct mapping
    if (CURRENCY_SYMBOLS[cleanSymbol]) {
        return CURRENCY_SYMBOLS[cleanSymbol];
    }
    
    // Check if it's a currency code
    const upperSymbol = cleanSymbol.toUpperCase();
    if (CURRENCY_SYMBOLS[upperSymbol]) {
        return CURRENCY_SYMBOLS[upperSymbol];
    }
    
    // Default mappings
    const defaultMappings = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₹': 'INR'
    };
    
    return defaultMappings[cleanSymbol] || null;
}

function extractNumericValue(text) {
    let cleaned = text.replace(/[^\d\.,]/g, '');
    
    if (!cleaned) return null;
    
    // Handle European format (1.234,56)
    if (/,/.test(cleaned) && /\./.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Handle thousands separators
    else if (/,/.test(cleaned)) {
        const parts = cleaned.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 2) {
            // Likely decimal separator (1,234.56 -> 1234.56)
            cleaned = cleaned.replace(/,/g, '');
        } else {
            // Likely thousands separator (1,234 -> 1234)
            cleaned = cleaned.replace(/,/g, '');
        }
    }
    
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
}

function getConversionRate(from, to, rates) {
    if (!rates || !rates[from] || !rates[to]) {
        console.warn(`Missing rates for ${from} or ${to}`);
        return null;
    }
    
    return rates[to] / rates[from];
}

function formatConversion(originalText, originalValue, convertedValue, fromCurrency, toCurrency, settings) {
    const formatCurrency = (value, currencyCode) => {
        try {
            const formatter = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            return formatter.format(value);
        } catch (e) {
            // Fallback formatting
            const symbol = getCurrencySymbolForCode(currencyCode) || currencyCode;
            return `${symbol}${value.toFixed(2)}`;
        }
    };
    
    const originalFormatted = formatCurrency(originalValue, fromCurrency);
    const convertedFormatted = formatCurrency(convertedValue, toCurrency);
    
    const color = settings.textColor || '#00B894';
    
    if (settings.showOriginal) {
        return `${originalFormatted} <span class="currency-converter-result" style="color: ${color}; font-weight: bold; margin-left: 4px;">→ ${convertedFormatted}</span>`;
    } else {
        return `<span class="currency-converter-result" style="color: ${color}; font-weight: bold;">${convertedFormatted}</span>`;
    }
}

function getCurrencySymbolForCode(currencyCode) {
    // Reverse lookup
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
        if (code === currencyCode) {
            return symbol;
        }
    }
    
    // Common symbols
    const common = {
        'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥',
        'CAD': 'C$', 'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥',
        'INR': '₹', 'BRL': 'R$', 'RUB': '₽', 'KRW': '₩'
    };
    
    return common[currencyCode] || currencyCode;
}

function addConversionStyling(element, settings) {
    const convertedSpans = element.querySelectorAll('.currency-converter-result');
    
    convertedSpans.forEach(span => {
        span.style.transition = 'all 0.3s ease';
        
        span.addEventListener('mouseenter', () => {
            span.style.opacity = '0.8';
            span.style.transform = 'scale(1.05)';
        });
        
        span.addEventListener('mouseleave', () => {
            span.style.opacity = '1';
            span.style.transform = 'scale(1)';
        });
        
        // Add click to show original
        span.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = span.parentElement;
            if (parent && parent.dataset.original) {
                parent.innerHTML = parent.dataset.original;
            }
        });
    });
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findAndConvertTextNodes(settings) {
    // Fallback: look for text nodes with prices
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (node.parentElement.tagName === 'SCRIPT' || 
                    node.parentElement.tagName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                
                if (node.textContent && containsPrice(node.textContent)) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                
                return NodeFilter.FILTER_REJECT;
            }
        },
        false
    );
    
    let conversionCount = 0;
    let node;
    
    while ((node = walker.nextNode())) {
        const result = processTextNode(node, settings);
        if (result.converted) {
            conversionCount++;
        }
    }
    
    return conversionCount;
}

function processTextNode(textNode, settings) {
    const originalText = textNode.textContent;
    const priceMatches = extractPrices(originalText);
    
    if (priceMatches.length === 0) {
        return { converted: false };
    }
    
    let newHtml = originalText;
    let hasChanges = false;
    
    priceMatches.forEach(match => {
        const conversion = convertPrice(match, settings);
        if (conversion) {
            newHtml = newHtml.replace(match.fullMatch, conversion.formatted);
            hasChanges = true;
            
            convertedElements.set(textNode, {
                originalText,
                match: match.fullMatch,
                conversion
            });
        }
    });
    
    if (hasChanges) {
        originalTexts.set(textNode, originalText);
        
        const wrapper = document.createElement('span');
        wrapper.className = 'currency-converter-wrapper';
        wrapper.innerHTML = newHtml;
        
        addConversionStyling(wrapper, settings);
        
        textNode.parentNode.replaceChild(wrapper, textNode);
        return { converted: true };
    }
    
    return { converted: false };
}

function restorePrices() {
    console.log('Restoring prices...');
    
    // Restore elements
    convertedElements.forEach((data, element) => {
        if (element.innerHTML !== undefined) {
            // It's an element
            element.innerHTML = data.originalText;
        } else if (element.parentNode) {
            // It's a text node wrapper
            const textNode = document.createTextNode(data.originalText);
            element.parentNode.replaceChild(textNode, element);
        }
    });
    
    // Clear all tracking
    convertedElements.clear();
    originalTexts.clear();
    
    console.log('Prices restored');
    
    // Update count
    chrome.runtime.sendMessage({
        action: 'updateCount',
        count: 0
    });
}

// Auto-convert on page load if enabled
(async () => {
    try {
        const settings = await chrome.storage.sync.get(['currencySettings']);
        if (settings.currencySettings?.autoConvert) {
            setTimeout(() => {
                convertPage(settings.currencySettings);
            }, 2000);
        }
    } catch (error) {
        console.error('Auto-convert error:', error);
    }
})();