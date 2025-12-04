// Content script for price conversion
let convertedElements = new Map();
let conversionSettings = {};

// Currency symbols and patterns
const CURRENCY_PATTERNS = {
  'USD': { symbol: '$', patterns: [/\$/g, /USD/g] },
  'EUR': { symbol: '€', patterns: [/€/g, /EUR/g] },
  'GBP': { symbol: '£', patterns: [/£/g, /GBP/g] },
  'JPY': { symbol: '¥', patterns: [/¥/g, /JPY/g] },
  'INR': { symbol: '₹', patterns: [/₹/g, /INR/g] },
  'CAD': { symbol: 'C$', patterns: [/C\$/g, /CAD/g] },
  'AUD': { symbol: 'A$', patterns: [/A\$/g, /AUD/g] },
  'CNY': { symbol: '¥', patterns: [/CNY/g, /元/g] },
  'CHF': { symbol: 'Fr', patterns: [/CHF/g, /Fr\./g] },
  // Add more as needed
};

// Price detection regex
const PRICE_REGEX = /(?:[\$€£¥₹]|USD|EUR|GBP|JPY|INR|CAD|AUD|CNY|CHF)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)|(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:[\$€£¥₹]|USD|EUR|GBP|JPY|INR|CAD|AUD|CNY|CHF)/g;

function detectCurrency(text) {
  for (const [code, { patterns }] of Object.entries(CURRENCY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) return code;
    }
  }
  return null;
}

function convertPrices(settings) {
  conversionSettings = settings;
  
  if (Object.keys(settings.rates).length === 0) {
    alert('Exchange rates not loaded yet. Please wait a moment and try again.');
    return;
  }
  
  // Walk through all text nodes
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue && PRICE_REGEX.test(node.nodeValue)) {
      textNodes.push(node);
    }
  }
  
  let count = 0;
  
  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    PRICE_REGEX.lastIndex = 0;
    
    let newText = text;
    let match;
    
    while ((match = PRICE_REGEX.exec(text)) !== null) {
      const fullMatch = match[0];
      const amount = parseFloat((match[1] || match[2]).replace(/,/g, ''));
      const currency = settings.autoDetect ? 
        detectCurrency(fullMatch) : 
        settings.source;
      
      if (!currency) continue;
      
      const rate = (settings.rates[settings.target] / settings.rates[currency]);
      const converted = (amount * rate).toFixed(2);
      
      const symbol = CURRENCY_PATTERNS[settings.target]?.symbol || settings.target;
      const convertedText = settings.showOriginal ? 
        `${fullMatch} → ${symbol}${converted}` : 
        `${symbol}${converted}`;
      
      newText = newText.replace(fullMatch, convertedText);
      
      // Color the converted part
      const span = document.createElement('span');
      span.className = 'converted-price';
      span.style.color = settings.color;
      span.style.fontWeight = 'bold';
      span.textContent = settings.showOriginal ? 
        ` → ${symbol}${converted}` : 
        `${symbol}${converted}`;
      
      // Store original
      convertedElements.set(span, {
        original: textNode,
        fullMatch: fullMatch
      });
      
      count++;
    }
    
    if (newText !== text) {
      const wrapper = document.createElement('span');
      wrapper.innerHTML = newText.replace(/→/g, '<span style="color: ' + settings.color + '; font-weight: bold;">→</span>');
      textNode.parentNode.replaceChild(wrapper, textNode);
    }
  });
  
  // Send count back
  chrome.runtime.sendMessage({ action: 'updateCount', count: count });
}

function resetPrices() {
  // Remove all converted elements
  convertedElements.forEach((data, element) => {
    if (element.parentNode) {
      element.parentNode.replaceChild(data.original, element);
    }
  });
  convertedElements.clear();
  
  // Remove any remaining converted spans
  document.querySelectorAll('.converted-price').forEach(el => {
    el.outerHTML = el.textContent;
  });
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getCount') {
    sendResponse({ count: convertedElements.size });
  }
});