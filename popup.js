class CurrencyConverter {
    constructor() {
        this.currencies = [];
        this.rates = {};
        this.currentTab = null;
        this.settings = {
            sourceCurrency: 'auto',
            targetCurrency: 'EUR',
            autoDetect: true,
            showOriginal: true,
            textColor: '#00B894',
            autoConvert: false
        };
        
        this.init();
    }

    async init() {
        this.bindElements();
        await this.loadCurrencies();
        await this.loadSettings();
        await this.getCurrentTab();
        await this.loadExchangeRates();
        this.setupEventListeners();
        this.updateUI();
        this.updateStatus('Ready to convert', 'ready');
    }

    bindElements() {
        this.elements = {
            sourceCurrency: document.getElementById('sourceCurrency'),
            targetCurrency: document.getElementById('targetCurrency'),
            autoDetect: document.getElementById('autoDetect'),
            showOriginal: document.getElementById('showOriginal'),
            textColor: document.getElementById('textColor'),
            convertPage: document.getElementById('convertPage'),
            resetPage: document.getElementById('resetPage'),
            toggleAutoConvert: document.getElementById('toggleAutoConvert'),
            refreshRates: document.getElementById('refreshRates'),
            rateValue: document.getElementById('rateValue'),
            rateTime: document.getElementById('rateTime'),
            convertedCount: document.getElementById('convertedCount'),
            currencyCount: document.getElementById('currencyCount'),
            status: document.getElementById('status'),
            statusText: document.querySelector('.status-text'),
            statusDot: document.querySelector('.status-dot'),
            quickButtons: document.getElementById('quickButtons'),
            colorPresets: document.querySelectorAll('.color-btn')
        };
    }

    async loadCurrencies() {
        try {
            // Fetch comprehensive currency list
            const response = await fetch('https://open.er-api.com/v6/latest/USD');
            const data = await response.json();
            
            if (data.rates) {
                // Create currencies array from rates
                this.currencies = Object.keys(data.rates).map(code => ({
                    code,
                    name: this.getCurrencyName(code),
                    symbol: this.getCurrencySymbol(code),
                    flag: this.getCurrencyFlag(code)
                }));
                
                // Add USD (base currency)
                this.currencies.unshift({
                    code: 'USD',
                    name: 'US Dollar',
                    symbol: '$',
                    flag: '🇺🇸'
                });
            } else {
                this.loadFallbackCurrencies();
            }
        } catch (error) {
            console.log('Using fallback currencies:', error);
            this.loadFallbackCurrencies();
        }
        
        this.populateCurrencyDropdowns();
        this.populateQuickButtons();
        this.elements.currencyCount.textContent = `${this.currencies.length} currencies`;
    }

    getCurrencyName(code) {
        const names = {
            'USD': 'US Dollar',
            'EUR': 'Euro',
            'GBP': 'British Pound',
            'JPY': 'Japanese Yen',
            'CAD': 'Canadian Dollar',
            'AUD': 'Australian Dollar',
            'CHF': 'Swiss Franc',
            'CNY': 'Chinese Yuan',
            'INR': 'Indian Rupee',
            'BRL': 'Brazilian Real',
            'RUB': 'Russian Ruble',
            'KRW': 'South Korean Won',
            'MXN': 'Mexican Peso',
            'SGD': 'Singapore Dollar',
            'HKD': 'Hong Kong Dollar',
            'NZD': 'New Zealand Dollar'
        };
        return names[code] || code;
    }

    getCurrencySymbol(code) {
        const symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'CAD': 'C$',
            'AUD': 'A$', 'CHF': 'CHF', 'CNY': '¥', 'INR': '₹', 'BRL': 'R$',
            'RUB': '₽', 'KRW': '₩', 'MXN': '$', 'SGD': 'S$', 'HKD': 'HK$',
            'NZD': 'NZ$'
        };
        return symbols[code] || code;
    }

    getCurrencyFlag(code) {
        const flags = {
            'USD': '🇺🇸', 'EUR': '🇪🇺', 'GBP': '🇬🇧', 'JPY': '🇯🇵', 'CAD': '🇨🇦',
            'AUD': '🇦🇺', 'CHF': '🇨🇭', 'CNY': '🇨🇳', 'INR': '🇮🇳', 'BRL': '🇧🇷',
            'RUB': '🇷🇺', 'KRW': '🇰🇷', 'MXN': '🇲🇽', 'SGD': '🇸🇬', 'HKD': '🇭🇰',
            'NZD': '🇳🇿', 'SEK': '🇸🇪', 'NOK': '🇳🇴', 'DKK': '🇩🇰', 'ZAR': '🇿🇦',
            'AED': '🇦🇪', 'SAR': '🇸🇦', 'THB': '🇹🇭', 'MYR': '🇲🇾', 'IDR': '🇮🇩',
            'PHP': '🇵🇭', 'TRY': '🇹🇷', 'PLN': '🇵🇱', 'CZK': '🇨🇿', 'HUF': '🇭🇺'
        };
        return flags[code] || '💰';
    }

    loadFallbackCurrencies() {
        this.currencies = [
            {code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸'},
            {code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺'},
            {code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧'},
            {code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵'},
            {code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦'},
            {code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺'},
            {code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭'},
            {code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳'},
            {code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳'},
            {code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷'},
            {code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺'},
            {code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷'},
            {code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽'},
            {code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬'},
            {code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰'},
            {code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿'},
            {code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪'},
            {code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴'},
            {code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰'},
            {code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦'}
        ];
    }

    populateCurrencyDropdowns() {
        // Clear and populate source currency
        this.elements.sourceCurrency.innerHTML = '<option value="auto">🔍 Auto Detect</option>';
        this.currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.code;
            option.textContent = `${currency.flag} ${currency.code} - ${currency.name}`;
            this.elements.sourceCurrency.appendChild(option);
        });

        // Clear and populate target currency
        this.elements.targetCurrency.innerHTML = '';
        this.currencies.forEach(currency => {
            const option = document.createElement('option');
            option.value = currency.code;
            option.textContent = `${currency.flag} ${currency.code} - ${currency.name}`;
            this.elements.targetCurrency.appendChild(option);
            
            // Set EUR as default
            if (currency.code === 'EUR') {
                option.selected = true;
            }
        });

        // Set saved values
        this.elements.sourceCurrency.value = this.settings.sourceCurrency;
        this.elements.targetCurrency.value = this.settings.targetCurrency;
    }

    populateQuickButtons() {
        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR', 'CNY', 'CHF', 'SGD'];
        
        this.elements.quickButtons.innerHTML = '';
        
        popularCurrencies.forEach(code => {
            const currency = this.currencies.find(c => c.code === code);
            if (currency) {
                const button = document.createElement('button');
                button.className = 'quick-btn';
                button.innerHTML = `${currency.flag} ${currency.code}`;
                button.title = `Convert to ${currency.name}`;
                button.dataset.currency = code;
                
                button.addEventListener('click', () => {
                    this.elements.targetCurrency.value = code;
                    this.settings.targetCurrency = code;
                    this.saveSettings();
                    this.updateRateDisplay();
                    this.updateStatus(`Target set to ${currency.name}`, 'success');
                });
                
                this.elements.quickButtons.appendChild(button);
            }
        });
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['currencySettings']);
            if (result.currencySettings) {
                this.settings = { ...this.settings, ...result.currencySettings };
                
                // Update UI
                this.elements.sourceCurrency.value = this.settings.sourceCurrency;
                this.elements.targetCurrency.value = this.settings.targetCurrency;
                this.elements.autoDetect.checked = this.settings.autoDetect;
                this.elements.showOriginal.checked = this.settings.showOriginal;
                this.elements.textColor.value = this.settings.textColor;
                
                // Update color presets
                this.updateColorPresets();
                this.updateAutoConvertButton();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ currencySettings: this.settings });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            
            // Get conversion count from current tab
            if (this.currentTab) {
                await this.updateConversionCount();
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    async loadExchangeRates() {
        this.updateStatus('Loading exchange rates...', 'loading');
        
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getRates' });
            
            if (response && Object.keys(response).length > 0) {
                this.rates = response;
                this.updateRateDisplay();
                this.updateStatus('Rates loaded successfully', 'success');
            } else {
                throw new Error('No rates available');
            }
        } catch (error) {
            console.error('Failed to load rates:', error);
            this.updateStatus('Using cached rates', 'warning');
            
            // Try to get cached rates
            const cached = await chrome.storage.local.get(['rates']);
            this.rates = cached.rates || {};
        }
    }

    updateRateDisplay() {
        const source = this.settings.sourceCurrency === 'auto' ? 'USD' : this.settings.sourceCurrency;
        const target = this.settings.targetCurrency;
        
        if (source === target) {
            this.elements.rateValue.textContent = `1 ${source} = 1 ${target}`;
            return;
        }
        
        if (this.rates[source] && this.rates[target]) {
            const rate = (this.rates[target] / this.rates[source]).toFixed(4);
            this.elements.rateValue.textContent = `1 ${source} = ${rate} ${target}`;
        } else {
            this.elements.rateValue.textContent = 'Loading rates...';
        }
        
        // Update time
        const now = new Date();
        this.elements.rateTime.textContent = `Updated ${this.formatTime(now)}`;
    }

    formatTime(date) {
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    updateStatus(message, type = 'ready') {
        this.elements.statusText.textContent = message;
        
        // Reset classes
        this.elements.statusDot.className = 'status-dot';
        this.elements.status.style.background = 'rgba(255, 255, 255, 0.1)';
        
        switch(type) {
            case 'loading':
                this.elements.statusDot.style.background = '#FFD700';
                this.elements.status.style.background = 'rgba(255, 215, 0, 0.2)';
                break;
            case 'success':
                this.elements.statusDot.style.background = '#4cd964';
                this.elements.status.style.background = 'rgba(76, 217, 100, 0.2)';
                break;
            case 'warning':
                this.elements.statusDot.style.background = '#FF9500';
                this.elements.status.style.background = 'rgba(255, 149, 0, 0.2)';
                break;
            case 'error':
                this.elements.statusDot.style.background = '#FF3B30';
                this.elements.status.style.background = 'rgba(255, 59, 48, 0.2)';
                break;
            default:
                this.elements.statusDot.style.background = '#4cd964';
        }
        
        // Auto-clear success messages after 2 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (this.elements.statusText.textContent === message) {
                    this.updateStatus('Ready', 'ready');
                }
            }, 2000);
        }
    }

    async convertPage() {
        if (!this.currentTab) {
            this.updateStatus('No active tab found', 'error');
            return;
        }
        
        this.updateStatus('Converting page...', 'loading');
        
        try {
            // Prepare settings for conversion
            const conversionSettings = {
                sourceCurrency: this.settings.autoDetect ? 'auto' : this.settings.sourceCurrency,
                targetCurrency: this.settings.targetCurrency,
                textColor: this.settings.textColor,
                showOriginal: this.settings.showOriginal,
                rates: this.rates
            };
            
            // Send conversion command
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'convertPrices',
                settings: conversionSettings
            });
            
            // Get updated count
            await this.updateConversionCount();
            
            this.updateStatus('Conversion complete!', 'success');
            
        } catch (error) {
            console.error('Conversion failed:', error);
            
            // Try to inject content script if not already loaded
            if (error.message.includes('Receiving end does not exist')) {
                this.updateStatus('Injecting converter...', 'loading');
                
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: this.currentTab.id },
                        files: ['content.js']
                    });
                    
                    // Retry conversion after injection
                    setTimeout(() => this.convertPage(), 500);
                } catch (injectError) {
                    this.updateStatus('Failed to load converter', 'error');
                }
            } else {
                this.updateStatus('Conversion failed', 'error');
            }
        }
    }

    async resetPage() {
        if (!this.currentTab) return;
        
        this.updateStatus('Restoring page...', 'loading');
        
        try {
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'restorePrices'
            });
            
            this.elements.convertedCount.textContent = '0';
            this.updateStatus('Page restored', 'success');
            
        } catch (error) {
            console.error('Reset failed:', error);
            this.updateStatus('Reset failed', 'error');
        }
    }

    async updateConversionCount() {
        if (!this.currentTab) return;
        
        try {
            const response = await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'getConversionCount'
            });
            
            if (response && response.count !== undefined) {
                this.elements.convertedCount.textContent = response.count;
            }
        } catch (error) {
            // Ignore errors - tab might not have content script loaded
        }
    }

    toggleAutoConvert() {
        this.settings.autoConvert = !this.settings.autoConvert;
        this.updateAutoConvertButton();
        this.saveSettings();
        
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'setAutoConvert',
            enabled: this.settings.autoConvert
        });
        
        this.updateStatus(
            this.settings.autoConvert ? 'Auto-convert enabled' : 'Auto-convert disabled',
            this.settings.autoConvert ? 'success' : 'warning'
        );
    }

    updateAutoConvertButton() {
        const icon = this.settings.autoConvert ? 'fa-toggle-on' : 'fa-toggle-off';
        const text = this.settings.autoConvert ? 'Auto-Convert: ON' : 'Auto-Convert: OFF';
        
        this.elements.toggleAutoConvert.innerHTML = `
            <i class="fas ${icon}"></i>
            ${text}
        `;
        
        this.elements.toggleAutoConvert.style.background = this.settings.autoConvert 
            ? 'rgba(0, 184, 148, 0.3)' 
            : 'rgba(255, 255, 255, 0.05)';
        
        this.elements.toggleAutoConvert.style.borderColor = this.settings.autoConvert 
            ? 'var(--accent-green)' 
            : 'rgba(255, 255, 255, 0.1)';
    }

    updateColorPresets() {
        this.elements.colorPresets.forEach(btn => {
            const isActive = btn.dataset.color === this.settings.textColor;
            btn.classList.toggle('active', isActive);
        });
    }

    updateUI() {
        this.updateRateDisplay();
        this.updateColorPresets();
    }

    setupEventListeners() {
        // Currency selection
        this.elements.sourceCurrency.addEventListener('change', (e) => {
            this.settings.sourceCurrency = e.target.value;
            this.saveSettings();
            this.updateRateDisplay();
        });
        
        this.elements.targetCurrency.addEventListener('change', (e) => {
            this.settings.targetCurrency = e.target.value;
            this.saveSettings();
            this.updateRateDisplay();
            this.updateStatus(`Target currency: ${e.target.value}`, 'success');
        });
        
        // Toggle switches
        this.elements.autoDetect.addEventListener('change', (e) => {
            this.settings.autoDetect = e.target.checked;
            this.saveSettings();
            this.updateStatus(e.target.checked ? 'Auto-detect enabled' : 'Auto-detect disabled', 'success');
        });
        
        this.elements.showOriginal.addEventListener('change', (e) => {
            this.settings.showOriginal = e.target.checked;
            this.saveSettings();
        });
        
        // Color picker
        this.elements.textColor.addEventListener('input', (e) => {
            this.settings.textColor = e.target.value;
            this.saveSettings();
            this.updateColorPresets();
        });
        
        this.elements.textColor.addEventListener('change', (e) => {
            this.settings.textColor = e.target.value;
            this.saveSettings();
            this.updateColorPresets();
            this.updateStatus('Color updated', 'success');
        });
        
        // Color presets
        this.elements.colorPresets.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.dataset.color;
                this.settings.textColor = color;
                this.elements.textColor.value = color;
                this.saveSettings();
                this.updateColorPresets();
                this.updateStatus('Color preset applied', 'success');
            });
        });
        
        // Action buttons
        this.elements.convertPage.addEventListener('click', () => this.convertPage());
        this.elements.resetPage.addEventListener('click', () => this.resetPage());
        this.elements.toggleAutoConvert.addEventListener('click', () => this.toggleAutoConvert());
        this.elements.refreshRates.addEventListener('click', () => {
            this.loadExchangeRates();
            this.updateStatus('Refreshing rates...', 'loading');
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault();
                this.convertPage();
            }
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.resetPage();
            }
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.toggleAutoConvert();
            }
        });
        
        // Refresh rates periodically
        setInterval(() => {
            this.updateRateDisplay();
        }, 60000); // Every minute
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});