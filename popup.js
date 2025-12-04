// Universal Currency Converter - Content Script

class PageConverter {
    constructor() {
        this.convertedElements = new Map();
        this.settings = {};
        this.originalTexts = new Map();
        
        this.init();
    }

    init() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep message channel open for async response
        });
        
        // Auto-convert on page load if enabled
        this.checkAutoConvert();
    }

    async checkAutoConvert() {
        const settings = await chrome.storage.sync.get(['currencySettings']);
        if (settings.currencySettings?.autoConvert) {
            setTimeout(() => {
                this.convertPage(settings.currencySettings);
            }, 1000); // Wait for page to load
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch(request.action) {
            case 'convertPrices':
                this.convertPage(request.settings);
                sendResponse({ success: true });
                break;
                
            case 'restorePrices':
                this.restorePrices();
                sendResponse({ success: true });
                break;
                
            case 'getConversionCount':
                sendResponse({ count: this.convertedElements.size });
                break;
                
            default:
                sendResponse({ error: 'Unknown action' });
        }
    }

    convertPage(settings) {
        this.settings = settings;
        this.convertedElements.clear();
        this.originalTexts.clear();
        
        // Find and convert all price elements
        const priceElements = this.findPriceElements();
        
        priceElements.forEach(element => {
            this.convertElement(element);
        });
        
        console.log(`✅ Converted ${this.convertedElements.size} prices`);
        
        // Update badge if this is from auto-convert
        if (this.convertedElements.size > 0) {
            chrome.runtime.sendMessage({
                action: 'updateCount',
                count: this.convertedElements.size
            });
        }
    }

    findPriceElements() {
        const elements = [];
        
        // Walk through DOM to find text nodes containing prices
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        const priceRegex = this.getPriceRegex();
        
        while ((node = walker.nextNode())) {
            if (node.textContent && priceRegex.test(node.textContent)) {
                elements.push(node);
            }
        }
        
        return elements;
    }

    getPriceRegex() {
        // Comprehensive price detection regex
        return /(?:\$|€|£|¥|₹|₽|₩|₺|zł|Kč|Ft|kr|R\$|S\$|HK\$|NZ\$|A\$|C\$|د\.إ|ر\.س|฿|RM|Rp|₱|Rs|₫|৳|₸|₴|₦|៛|₡|₲|₵|₪|₮|₭|₨|₼|₾|₿)\s*\d[\d,.]*\b|\b\d[\d,.]*\s*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY|INR|BRL|RUB|KRW|MXN|SGD|HKD|NZD|SEK|NOK|DKK|ZAR|AED|SAR|THB|MYR|IDR|PHP|TRY|PLN|CZK|HUF|R$|S$|HK$|NZ$|A$|C$)/gi;
    }

    convertElement(textNode) {
        const originalText = textNode.textContent;
        let newText = originalText;
        
        // Find all prices in text
        const priceRegex = this.getPriceRegex();
        const matches = [...originalText.matchAll(priceRegex)];
        
        if (matches.length === 0) return;
        
        matches.forEach(match => {
            const priceText = match[0];
            const conversion = this.convertPrice(priceText);
            
            if (conversion) {
                newText = newText.replace(priceText, conversion.formatted);
                
                // Store original for restoration
                this.convertedElements.set(textNode, {
                    original: originalText,
                    converted: newText,
                    price: priceText,
                    conversion: conversion
                });
            }
        });
        
        if (newText !== originalText) {
            this.originalTexts.set(textNode, originalText);
            this.updateTextNode(textNode, newText);
        }
    }

    convertPrice(priceText) {
        // Extract numeric value
        const numericValue = this.extractNumericValue(priceText);
        if (!numericValue) return null;
        
        // Detect source currency
        const sourceCurrency = this.detectCurrency(priceText);
        if (!sourceCurrency) return null;
        
        // Get target currency from settings
        const targetCurrency = this.settings.targetCurrency || 'USD';
        
        // Get conversion rate
        const rate = this.getConversionRate(sourceCurrency, targetCurrency);
        if (!rate) return null;
        
        // Calculate converted value
        const convertedValue = numericValue * rate;
        
        // Format the result
        const formatted = this.formatConversion(
            priceText,
            numericValue,
            convertedValue,
            sourceCurrency,
            targetCurrency
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

    extractNumericValue(text) {
        // Remove all non-numeric characters except dots and commas
        const cleaned = text.replace(/[^\d.,]/g, '');
        
        // Handle different decimal separators
        let numericString = cleaned;
        
        // If last comma is followed by exactly 2 digits, it's likely decimal separator
        if (/,(\d{2})$/.test(cleaned)) {
            numericString = cleaned.replace(',', '.');
        }
        
        // Remove any remaining commas
        numericString = numericString.replace(/,/g, '');
        
        const value = parseFloat(numericString);
        return isNaN(value) ? null : value;
    }

    detectCurrency(text) {
        const currencyPatterns = {
            'USD': [/\$/g, /USD/gi, /US\s*Dollar/gi],
            'EUR': [/€/g, /EUR/gi, /Euro/gi],
            'GBP': [/£/g, /GBP/gi, /Pound/gi],
            'JPY': [/¥/g, /JPY/gi, /Yen/gi],
            'CAD': [/C\$/g, /CAD/gi],
            'AUD': [/A\$/g, /AUD/gi],
            'CHF': [/CHF/gi, /Fr\./g],
            'CNY': [/CNY/gi, /¥/g, /Yuan/gi],
            'INR': [/₹/g, /INR/gi, /Rupee/gi],
            'BRL': [/R\$/g, /BRL/gi],
            'RUB': [/₽/g, /RUB/gi],
            'KRW': [/₩/g, /KRW/gi],
            'MXN': [/MXN/gi],
            'SGD': [/S\$/g, /SGD/gi],
            'HKD': [/HK\$/g, /HKD/gi],
            'NZD': [/NZ\$/g, /NZD/gi],
            'SEK': [/SEK/gi, /kr/g],
            'NOK': [/NOK/gi, /kr/g],
            'DKK': [/DKK/gi, /kr/g],
            'ZAR': [/ZAR/gi, /R/g],
            'AED': [/AED/gi, /د\.إ/g],
            'SAR': [/SAR/gi, /ر\.س/g],
            'THB': [/฿/g, /THB/gi],
            'MYR': [/RM/g, /MYR/gi],
            'IDR': [/IDR/gi, /Rp/g],
            'PHP': [/₱/g, /PHP/gi],
            'TRY': [/₺/g, /TRY/gi],
            'PLN': [/zł/g, /PLN/gi],
            'CZK': [/Kč/g, /CZK/gi],
            'HUF': [/Ft/g, /HUF/gi]
        };
        
        for (const [currency, patterns] of Object.entries(currencyPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return currency;
                }
            }
        }
        
        // If auto-detect is enabled, try to guess from context
        if (this.settings.sourceCurrency === 'auto') {
            // Look for common patterns
            if (text.includes('$') && !text.includes('C$') && !text.includes('A$') && !text.includes('NZ$') && !text.includes('HK$') && !text.includes('S$')) {
                return 'USD';
            }
        }
        
        return null;
    }

    getConversionRate(from, to) {
        if (!this.settings.rates || !this.settings.rates[from] || !this.settings.rates[to]) {
            return null;
        }
        
        // Calculate conversion rate
        return this.settings.rates[to] / this.settings.rates[from];
    }

    formatConversion(originalText, originalValue, convertedValue, fromCurrency, toCurrency) {
        const formatValue = (value, currency) => {
            try {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(value);
            } catch {
                // Fallback formatting
                return `${value.toFixed(2)} ${currency}`;
            }
        };
        
        const originalFormatted = formatValue(originalValue, fromCurrency);
        const convertedFormatted = formatValue(convertedValue, toCurrency);
        
        if (this.settings.showOriginal) {
            return `${originalFormatted} <span class="converted-price" style="color: ${this.settings.textColor || '#00B894'}">→ ${convertedFormatted}</span>`;
        } else {
            return `<span class="converted-price" style="color: ${this.settings.textColor || '#00B894'}">${convertedFormatted}</span>`;
        }
    }

    updateTextNode(textNode, newHtml) {
        const parent = textNode.parentNode;
        if (!parent) return;
        
        // Create a span to hold the HTML
        const span = document.createElement('span');
        span.className = 'currency-converter-result';
        span.innerHTML = newHtml;
        
        // Add hover effect
        span.addEventListener('mouseenter', () => {
            span.style.opacity = '0.9';
        });
        
        span.addEventListener('mouseleave', () => {
            span.style.opacity = '1';
        });
        
        // Replace text node with span
        parent.replaceChild(span, textNode);
    }

    restorePrices() {
        // Restore all converted elements
        this.convertedElements.forEach((data, textNode) => {
            const parent = textNode.parentNode;
            if (parent && parent.classList.contains('currency-converter-result')) {
                parent.replaceWith(textNode);
            }
        });
        
        // Also restore any text nodes we modified
        this.originalTexts.forEach((originalText, textNode) => {
            if (textNode.parentNode) {
                textNode.textContent = originalText;
            }
        });
        
        // Clear tracking
        this.convertedElements.clear();
        this.originalTexts.clear();
        
        console.log('✅ Restored original prices');
    }
}

// Initialize converter
new PageConverter();