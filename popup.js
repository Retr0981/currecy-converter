class WorldCurrencyConverter {
    constructor() {
        this.allCurrencies = [];
        this.uniqueCurrencies = [];
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
        await this.loadAllWorldCurrencies();
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
            sourceSearch: document.getElementById('sourceSearch'),
            targetSearch: document.getElementById('targetSearch'),
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

    async loadAllWorldCurrencies() {
        this.updateStatus('Loading world currencies...', 'loading');
        
        try {
            // Fetch all countries data with currencies
            const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies,flags,cca2');
            const countries = await response.json();
            
            // Process all currencies from all countries
            const allCurrencies = [];
            const seen = new Set();
            
            countries.forEach(country => {
                if (country.currencies) {
                    Object.entries(country.currencies).forEach(([code, currencyData]) => {
                        const currencyKey = `${code}|${currencyData.name}`;
                        
                        if (!seen.has(currencyKey)) {
                            seen.add(currencyKey);
                            
                            allCurrencies.push({
                                code: code,
                                name: currencyData.name,
                                symbol: currencyData.symbol || code,
                                flag: this.getCountryFlag(country.cca2),
                                country: country.name.common,
                                countries: [country.name.common]
                            });
                        } else {
                            // Add country to existing currency
                            const existing = allCurrencies.find(c => `${c.code}|${c.name}` === currencyKey);
                            if (existing) {
                                existing.countries.push(country.name.common);
                            }
                        }
                    });
                }
            });
            
            // Sort alphabetically by code
            allCurrencies.sort((a, b) => a.code.localeCompare(b.code));
            
            this.allCurrencies = allCurrencies;
            this.uniqueCurrencies = this.removeDuplicateCurrencies(allCurrencies);
            
            console.log(`Loaded ${this.uniqueCurrencies.length} unique currencies from ${countries.length} countries`);
            
            this.populateCurrencyDropdowns();
            this.populatePopularCurrencies();
            
            this.elements.currencyCount.textContent = `${this.uniqueCurrencies.length} world currencies`;
            this.updateStatus(`Loaded ${this.uniqueCurrencies.length} currencies`, 'success');
            
        } catch (error) {
            console.error('Failed to load world currencies:', error);
            this.updateStatus('Using fallback currencies', 'warning');
            this.loadFallbackCurrencies();
        }
    }

    removeDuplicateCurrencies(currencies) {
        const uniqueMap = new Map();
        
        currencies.forEach(currency => {
            if (!uniqueMap.has(currency.code)) {
                uniqueMap.set(currency.code, currency);
            } else {
                // Merge countries for same currency code
                const existing = uniqueMap.get(currency.code);
                existing.countries = [...new Set([...existing.countries, ...currency.countries])];
                
                // Use better symbol if available
                if (currency.symbol && currency.symbol !== currency.code && existing.symbol === existing.code) {
                    existing.symbol = currency.symbol;
                }
            }
        });
        
        return Array.from(uniqueMap.values());
    }

    getCountryFlag(countryCode) {
        // Convert country code to flag emoji
        if (!countryCode || countryCode.length !== 2) return '🏳️';
        
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt());
        
        return String.fromCodePoint(...codePoints);
    }

    loadFallbackCurrencies() {
        // Fallback list of major world currencies with flags
        this.uniqueCurrencies = [
            { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', country: 'United States', countries: ['United States'] },
            { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', country: 'European Union', countries: ['European Union'] },
            { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', country: 'United Kingdom', countries: ['United Kingdom'] },
            { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵', country: 'Japan', countries: ['Japan'] },
            { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦', country: 'Canada', countries: ['Canada'] },
            { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺', country: 'Australia', countries: ['Australia'] },
            { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭', country: 'Switzerland', countries: ['Switzerland'] },
            { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳', country: 'China', countries: ['China'] },
            { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳', country: 'India', countries: ['India'] },
            { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷', country: 'Brazil', countries: ['Brazil'] },
            { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺', country: 'Russia', countries: ['Russia'] },
            { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷', country: 'South Korea', countries: ['South Korea'] },
            { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽', country: 'Mexico', countries: ['Mexico'] },
            { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬', country: 'Singapore', countries: ['Singapore'] },
            { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰', country: 'Hong Kong', countries: ['Hong Kong'] },
            { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿', country: 'New Zealand', countries: ['New Zealand'] },
            { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪', country: 'Sweden', countries: ['Sweden'] },
            { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴', country: 'Norway', countries: ['Norway'] },
            { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰', country: 'Denmark', countries: ['Denmark'] },
            { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', country: 'South Africa', countries: ['South Africa'] },
            { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪', country: 'United Arab Emirates', countries: ['United Arab Emirates'] },
            { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦', country: 'Saudi Arabia', countries: ['Saudi Arabia'] },
            { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭', country: 'Thailand', countries: ['Thailand'] },
            { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾', country: 'Malaysia', countries: ['Malaysia'] },
            { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩', country: 'Indonesia', countries: ['Indonesia'] },
            { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭', country: 'Philippines', countries: ['Philippines'] },
            { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷', country: 'Turkey', countries: ['Turkey'] },
            { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱', country: 'Poland', countries: ['Poland'] },
            { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿', country: 'Czech Republic', countries: ['Czech Republic'] },
            { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺', country: 'Hungary', countries: ['Hungary'] }
        ];
        
        this.populateCurrencyDropdowns();
        this.populatePopularCurrencies();
        this.elements.currencyCount.textContent = `${this.uniqueCurrencies.length} currencies`;
    }

    populateCurrencyDropdowns() {
        // Populate source currency dropdown
        this.elements.sourceCurrency.innerHTML = '<option value="auto">🔍 Auto Detect</option>';
        
        // Populate target currency dropdown
        this.elements.targetCurrency.innerHTML = '';
        
        this.uniqueCurrencies.forEach(currency => {
            // Source currency options
            const sourceOption = document.createElement('option');
            sourceOption.value = currency.code;
            sourceOption.textContent = `${currency.flag} ${currency.code} - ${currency.name} (${currency.country})`;
            sourceOption.dataset.search = `${currency.code} ${currency.name} ${currency.country} ${currency.countries.join(' ')}`.toLowerCase();
            this.elements.sourceCurrency.appendChild(sourceOption);
            
            // Target currency options
            const targetOption = document.createElement('option');
            targetOption.value = currency.code;
            targetOption.textContent = `${currency.flag} ${currency.code} - ${currency.name} (${currency.country})`;
            targetOption.dataset.search = `${currency.code} ${currency.name} ${currency.country} ${currency.countries.join(' ')}`.toLowerCase();
            this.elements.targetCurrency.appendChild(targetOption);
            
            // Set EUR as default target
            if (currency.code === 'EUR') {
                targetOption.selected = true;
            }
        });
        
        // Set saved values
        this.elements.sourceCurrency.value = this.settings.sourceCurrency;
        if (this.settings.targetCurrency) {
            this.elements.targetCurrency.value = this.settings.targetCurrency;
        }
    }

    populatePopularCurrencies() {
        const popularCodes = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'SGD', 'HKD', 'NZD'];
        
        this.elements.quickButtons.innerHTML = '';
        
        popularCodes.forEach(code => {
            const currency = this.uniqueCurrencies.find(c => c.code === code);
            if (currency) {
                const button = document.createElement('button');
                button.className = 'quick-btn';
                button.innerHTML = `
                    <span class="flag">${currency.flag}</span>
                    <span class="code">${currency.code}</span>
                `;
                button.title = `${currency.name} (${currency.country})`;
                button.dataset.currency = currency.code;
                
                button.addEventListener('click', () => {
                    this.elements.targetCurrency.value = currency.code;
                    this.settings.targetCurrency = currency.code;
                    this.saveSettings();
                    this.updateRateDisplay();
                    this.updateStatus(`Target: ${currency.name}`, 'success');
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

    setupSearchFiltering() {
        // Source currency search
        this.elements.sourceSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterDropdownOptions(this.elements.sourceCurrency, searchTerm);
        });
        
        // Target currency search
        this.elements.targetSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterDropdownOptions(this.elements.targetCurrency, searchTerm);
        });
        
        // Clear search on select
        [this.elements.sourceCurrency, this.elements.targetCurrency].forEach(select => {
            select.addEventListener('change', () => {
                const searchInput = select === this.elements.sourceCurrency 
                    ? this.elements.sourceSearch 
                    : this.elements.targetSearch;
                searchInput.value = '';
                this.resetDropdownFilter(select);
            });
        });
    }

    filterDropdownOptions(selectElement, searchTerm) {
        const options = Array.from(selectElement.options);
        
        options.forEach(option => {
            if (option.value === 'auto') {
                option.hidden = searchTerm !== '';
                return;
            }
            
            const searchData = option.dataset.search || '';
            option.hidden = searchTerm !== '' && !searchData.includes(searchTerm);
        });
    }

    resetDropdownFilter(selectElement) {
        const options = Array.from(selectElement.options);
        options.forEach(option => {
            option.hidden = false;
        });
    }

    async loadExchangeRates() {
        this.updateStatus('Loading exchange rates...', 'loading');
        
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getRates' });
            
            if (response && Object.keys(response).length > 0) {
                this.rates = response;
                this.updateRateDisplay();
                this.updateStatus('Rates loaded', 'success');
            } else {
                throw new Error('No rates available');
            }
        } catch (error) {
            console.error('Failed to load rates:', error);
            this.updateStatus('Using cached rates', 'warning');
            
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
        
        this.elements.rateTime.textContent = `Updated ${this.formatTime(new Date())}`;
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
        this.elements.convertPage.classList.add('btn-loading');
        
        try {
            const conversionSettings = {
                sourceCurrency: this.settings.autoDetect ? 'auto' : this.settings.sourceCurrency,
                targetCurrency: this.settings.targetCurrency,
                textColor: this.settings.textColor,
                showOriginal: this.settings.showOriginal,
                rates: this.rates
            };
            
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'convertPrices',
                settings: conversionSettings
            });
            
            await this.updateConversionCount();
            
            this.updateStatus('Conversion complete!', 'success');
            
        } catch (error) {
            console.error('Conversion failed:', error);
            
            if (error.message.includes('Receiving end does not exist')) {
                this.updateStatus('Injecting converter...', 'loading');
                
                try {
                    await chrome.scripting.executeScript({
                        target: { tabId: this.currentTab.id },
                        files: ['content.js']
                    });
                    
                    setTimeout(() => this.convertPage(), 500);
                } catch (injectError) {
                    this.updateStatus('Failed to load converter', 'error');
                }
            } else {
                this.updateStatus('Conversion failed', 'error');
            }
        } finally {
            this.elements.convertPage.classList.remove('btn-loading');
        }
    }

    async resetPage() {
        if (!this.currentTab) return;
        
        this.updateStatus('Restoring page...', 'loading');
        this.elements.resetPage.classList.add('btn-loading');
        
        try {
            await chrome.tabs.sendMessage(this.currentTab.id, {
                action: 'restorePrices'
            });
            
            this.elements.convertedCount.textContent = '0';
            this.updateStatus('Page restored', 'success');
            
        } catch (error) {
            console.error('Reset failed:', error);
            this.updateStatus('Reset failed', 'error');
        } finally {
            this.elements.resetPage.classList.remove('btn-loading');
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
            // Tab might not have content script loaded
        }
    }

    toggleAutoConvert() {
        this.settings.autoConvert = !this.settings.autoConvert;
        this.updateAutoConvertButton();
        this.saveSettings();
        
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
    }

    updateColorPresets() {
        this.elements.colorPresets.forEach(btn => {
            const isActive = btn.dataset.color === this.settings.textColor;
            btn.classList.toggle('active', isActive);
        });
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            
            if (this.currentTab) {
                await this.updateConversionCount();
            }
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
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
            const selectedOption = e.target.options[e.target.selectedIndex];
            const currencyName = selectedOption.text.split(' - ')[1]?.split(' (')[0] || e.target.value;
            this.updateStatus(`Target: ${currencyName}`, 'success');
        });
        
        // Search filtering
        this.setupSearchFiltering();
        
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
        });
        
        // Auto-refresh rates
        setInterval(() => {
            this.updateRateDisplay();
        }, 60000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new WorldCurrencyConverter();
});