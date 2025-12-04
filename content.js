// Currency Converter - Content Script
let convertedElements = new Map();
let originalTexts = new Map();
let currentSettings = null;

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
    
    // Find all text nodes in the document
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                // Skip script and style tags
                if (node.parentElement.tagName === 'SCRIPT' || 
                    node.parentElement.tagName === 'STYLE') {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        },
        false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
        if (node.textContent && node.textContent.trim().length > 0) {
            textNodes.push(node);
        }
    }
    
    console.log(`Found ${textNodes.length} text nodes to process`);
    
    let conversionCount = 0;
    
    textNodes.forEach(textNode => {
        const result = processTextNode(textNode, settings);
        if (result.converted) {
            conversionCount++;
        }
    });
    
    console.log(`Converted ${conversionCount} prices`);
    
    // Update badge count
    chrome.runtime.sendMessage({
        action: 'updateCount',
        count: conversionCount
    });
}

function processTextNode(textNode, settings) {
    const originalText = textNode.textContent;
    const priceMatches = findPrices(originalText);
    
    if (priceMatches.length === 0) {
        return { converted: false };
    }
    
    let newHtml = originalText;
    let hasChanges = false;
    
    priceMatches.forEach(match => {
        const conversion = convertPrice(match, settings);
        if (conversion) {
            newHtml = newHtml.replace(match, conversion.formatted);
            hasChanges = true;
            
            // Store original for restoration
            convertedElements.set(textNode, {
                originalText,
                match,
                conversion
            });
        }
    });
    
    if (hasChanges) {
        originalTexts.set(textNode, originalText);
        replaceTextNode(textNode, newHtml, settings);
        return { converted: true };
    }
    
    return { converted: false };
}

function findPrices(text) {
    // Comprehensive price patterns
    const patterns = [
        // $1,234.56 or $1.234,56 (European)
        /[\$€£¥₹₽₩₺złKčFtkrR\$S\$HK\$NZ\$A\$C\$]\s*\d[\d\.,]*\b/g,
        // 1,234.56 USD or 1.234,56 EUR
        /\b\d[\d\.,]*\s*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|RUB|KRW|MXN|SGD|HKD|NZD|SEK|NOK|DKK|ZAR|AED|SAR|THB|MYR|IDR|PHP|TRY|PLN|CZK|HUF)/gi,
        // 1,234.56
        /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/g,
        // 1.234,56 (European format)
        /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/g
    ];
    
    const matches = [];
    patterns.forEach(pattern => {
        const found = text.match(pattern) || [];
        matches.push(...found);
    });
    
    return [...new Set(matches)]; // Remove duplicates
}

function convertPrice(priceText, settings) {
    // Extract numeric value
    const numericValue = extractNumericValue(priceText);
    if (!numericValue || numericValue === 0) return null;
    
    // Detect source currency
    let sourceCurrency = detectCurrency(priceText);
    if (!sourceCurrency && settings.sourceCurrency !== 'auto') {
        sourceCurrency = settings.sourceCurrency;
    }
    if (!sourceCurrency) sourceCurrency = 'USD'; // Default fallback
    
    const targetCurrency = settings.targetCurrency || 'EUR';
    
    // Get conversion rate
    const rate = getConversionRate(sourceCurrency, targetCurrency, settings.rates);
    if (!rate) return null;
    
    // Calculate converted value
    const convertedValue = numericValue * rate;
    
    // Format the result
    const formatted = formatConversion(
        priceText,
        numericValue,
        convertedValue,
        sourceCurrency,
        targetCurrency,
        settings
    );
    
    return {
        originalValue: numericValue,
        convertedValue,
        sourceCurrency,
        targetCurrency,
        rate,
        formatted
    };
}

function extractNumericValue(text) {
    // Remove currency symbols and text
    let cleaned = text.replace(/[^\d\.,]/g, '');
    
    // Handle European format (1.234,56)
    if (/,/.test(cleaned) && /\./.test(cleaned)) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Handle thousands separators
    else if (/,/.test(cleaned)) {
        // Check if last comma is decimal separator
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

function detectCurrency(text) {
    const currencyPatterns = {
        'USD': [/\$/g, /USD/gi, /US\s*Dollar/gi],
        'EUR': [/€/g, /EUR/gi, /Euro/gi],
        'GBP': [/£/g, /GBP/gi, /Pound/gi],
        'JPY': [/¥/g, /JPY/gi, /Yen/gi],
        'CAD': [/C\$/g, /CAD/gi],
        'AUD': [/A\$/g, /AUD/gi],
        'CHF': [/CHF/gi],
        'CNY': [/CNY/gi, /Yuan/gi],
        'INR': [/₹/g, /INR/gi, /Rupee/gi],
        'BRL': [/R\$/g, /BRL/gi],
        'RUB': [/₽/g, /RUB/gi],
        'KRW': [/₩/g, /KRW/gi],
        'MXN': [/MXN/gi],
        'SGD': [/S\$/g, /SGD/gi],
        'HKD': [/HK\$/g, /HKD/gi],
        'NZD': [/NZ\$/g, /NZD/gi]
    };
    
    for (const [currency, patterns] of Object.entries(currencyPatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return currency;
            }
        }
    }
    
    return null;
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
            return `${value.toFixed(2)} ${currencyCode}`;
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

function replaceTextNode(textNode, newHtml, settings) {
    const parent = textNode.parentNode;
    if (!parent) return;
    
    const wrapper = document.createElement('span');
    wrapper.className = 'currency-converter-wrapper';
    wrapper.innerHTML = newHtml;
    
    // Add hover effect
    wrapper.addEventListener('mouseenter', (e) => {
        const convertedSpans = wrapper.querySelectorAll('.currency-converter-result');
        convertedSpans.forEach(span => {
            span.style.opacity = '0.8';
            span.style.textDecoration = 'underline';
        });
    });
    
    wrapper.addEventListener('mouseleave', (e) => {
        const convertedSpans = wrapper.querySelectorAll('.currency-converter-result');
        convertedSpans.forEach(span => {
            span.style.opacity = '1';
            span.style.textDecoration = 'none';
        });
    });
    
    // Store reference to original text node
    wrapper.dataset.originalNode = 'converted';
    
    parent.replaceChild(wrapper, textNode);
}

function restorePrices() {
    console.log('Restoring prices...');
    
    // Restore from convertedElements
    convertedElements.forEach((data, textNode) => {
        const wrapper = textNode.parentNode;
        if (wrapper && wrapper.classList.contains('currency-converter-wrapper')) {
            wrapper.replaceWith(textNode);
        }
    });
    
    // Restore from originalTexts
    originalTexts.forEach((originalText, textNode) => {
        if (textNode.parentNode) {
            textNode.textContent = originalText;
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
            }, 1000);
        }
    } catch (error) {
        console.error('Auto-convert error:', error);
    }
})();