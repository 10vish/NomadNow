/**
 * NomadNow Travel Planner - Main Application
 * A weather-aware travel planning application
 */

class NomadNowApp {
    constructor() {
        this.currentTrip = null;
        this.geocodeCache = new Map();
        this.weatherCache = new Map();
        this.debounceTimers = new Map();
        this.isSelectingSuggestion = false;
        
        // Configuration
        this.config = {
            cacheTimeout: 60 * 60 * 1000, // 1 hour in milliseconds
            debounceDelay: 300, // milliseconds
            maxForecastDays: 7,
            apis: {
                geocoding: 'https://geocoding-api.open-meteo.com/v1/search',
                weather: 'https://api.open-meteo.com/v1/forecast',
                sunrise: 'https://api.sunrise-sunset.org/json',
                holidays: 'https://date.nager.at/api/v3/PublicHolidays',
                currency: 'https://api.exchangerate.host/latest'
            }
        };

        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.bindEvents();
        this.loadStoredData();
        this.setDateLimits();
        
        // Show toast if user has existing data
        if (this.currentTrip) {
            this.showToast('Welcome back! Your trip data has been restored.', 'info');
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Trip form
        const tripForm = document.getElementById('trip-form');
        if (tripForm) {
            tripForm.addEventListener('submit', (e) => this.handleTripSubmit(e));
        }

        // Destination search
        const destinationInput = document.getElementById('destination');
        if (destinationInput) {
            destinationInput.addEventListener('input', (e) => this.handleDestinationInput(e));
            destinationInput.addEventListener('blur', () => {
                // Only hide suggestions if we're not actively selecting one
                if (!this.isSelectingSuggestion) {
                    setTimeout(() => this.hideSuggestions(), 200);
                }
            });
        }

        // Date validation
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');
        if (startDate && endDate) {
            startDate.addEventListener('change', () => this.validateDates());
            endDate.addEventListener('change', () => this.validateDates());
        }

        // Export and share buttons
        this.bindActionButtons();

        // Modal events
        this.bindModalEvents();

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));
    }

    /**
     * Bind action button events
     */
    bindActionButtons() {
        const buttons = {
            'export-itinerary': () => this.exportItinerary(),
            'share-itinerary': () => this.shareItinerary(),
            'add-packing-item': () => this.showAddItemModal(),
            'export-packing': () => this.exportPackingList(),
            'about-btn': () => this.showAboutModal(),
            'privacy-btn': () => this.showPrivacyModal()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', handler);
            }
        });
    }

    /**
     * Bind modal events
     */
    bindModalEvents() {
        const overlay = document.getElementById('modal-overlay');
        const closeBtn = overlay?.querySelector('.modal-close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideModal());
        }

        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.hideModal();
                }
            });
        }
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyboardNavigation(e) {
        if (e.key === 'Escape') {
            this.hideModal();
            this.hideSuggestions();
        }

        const suggestions = document.querySelector('.suggestions.show');
        if (suggestions) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateSuggestions(e.key === 'ArrowDown' ? 1 : -1);
            } else if (e.key === 'Enter') {
                const focused = suggestions.querySelector('.suggestion-item:focus');
                if (focused) {
                    e.preventDefault();
                    focused.click();
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.navigateSuggestions(e.shiftKey ? -1 : 1);
            }
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.setAttribute('aria-pressed', 'true');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeTab = document.getElementById(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    /**
     * Load data for specific tab
     */
    loadTabData(tabName) {
        switch (tabName) {
            case 'itinerary':
                this.renderItinerary();
                break;
            case 'packing':
                this.renderPackingList();
                break;
        }
    }

    /**
     * Set date input limits
     */
    setDateLimits() {
        const today = new Date().toISOString().split('T')[0];
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + this.config.maxForecastDays);
        
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');

        if (startDate) {
            startDate.min = today;
            startDate.max = maxDate.toISOString().split('T')[0];
        }

        if (endDate) {
            endDate.min = today;
            endDate.max = maxDate.toISOString().split('T')[0];
        }
    }

    /**
     * Validate date inputs
     */
    validateDates() {
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');

        if (startDate?.value && endDate?.value) {
            const start = new Date(startDate.value);
            const end = new Date(endDate.value);

            if (end < start) {
                endDate.value = startDate.value;
            }

            // Update minimum end date
            endDate.min = startDate.value;
        }
    }

    /**
     * Handle destination input with debouncing
     */
    handleDestinationInput(e) {
        const query = e.target.value.trim();
        
        // Clear previous timer
        if (this.debounceTimers.has('destination')) {
            clearTimeout(this.debounceTimers.get('destination'));
        }

        if (query.length < 2) {
            this.hideSuggestions();
            return;
        }

        // Set new timer
        const timer = setTimeout(() => {
            this.searchDestinations(query);
        }, this.config.debounceDelay);

        this.debounceTimers.set('destination', timer);
    }

    /**
     * Search for destinations using geocoding API
     */
    async searchDestinations(query) {
        try {
            const cacheKey = `geocode_${query}`;
            
            // Check cache first
            if (this.geocodeCache.has(cacheKey)) {
                const cached = this.geocodeCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                    this.showSuggestions(cached.data);
                    return;
                }
            }

            const url = `${this.config.apis.geocoding}?name=${encodeURIComponent(query)}&count=5&language=en`;
            const response = await this.fetchWithTimeout(url);
            
            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Cache the result
            this.geocodeCache.set(cacheKey, {
                data: data.results || [],
                timestamp: Date.now()
            });

            this.showSuggestions(data.results || []);

        } catch (error) {
            console.error('Geocoding error:', error);
            this.showToast('Failed to search destinations. Please try again.', 'error');
        }
    }

    /**
     * Show destination suggestions
     */
    showSuggestions(results) {
        const container = document.getElementById('destination-suggestions');
        if (!container) return;

        if (results.length === 0) {
            this.hideSuggestions();
            return;
        }

        container.innerHTML = results.map((result, index) => `
            <div class="suggestion-item" role="option" tabindex="-1" data-index="${index}">
                <div class="suggestion-primary">${result.name}</div>
                <div class="suggestion-secondary">
                    ${[result.admin1, result.country].filter(Boolean).join(', ')}
                </div>
            </div>
        `).join('');

        // Bind click events
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                this.isSelectingSuggestion = true;
            });
            
            item.addEventListener('mouseleave', () => {
                this.isSelectingSuggestion = false;
            });
            
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.isSelectingSuggestion = true;
                const index = parseInt(item.dataset.index);
                this.selectDestination(results[index]);
                this.isSelectingSuggestion = false;
            });
            
            // Also handle mousedown to prevent blur from hiding suggestions
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                this.isSelectingSuggestion = true;
                const index = parseInt(item.dataset.index);
                this.selectDestination(results[index]);
                this.isSelectingSuggestion = false;
            });
        });

        container.classList.add('show');
    }

    /**
     * Hide destination suggestions
     */
    hideSuggestions() {
        const container = document.getElementById('destination-suggestions');
        if (container) {
            container.classList.remove('show');
        }
    }

    /**
     * Navigate through suggestions with keyboard
     */
    navigateSuggestions(direction) {
        const container = document.getElementById('destination-suggestions');
        const items = container?.querySelectorAll('.suggestion-item');
        
        if (!items || items.length === 0) return;

        const current = container.querySelector('.suggestion-item:focus');
        let index = current ? parseInt(current.dataset.index) : -1;
        
        index += direction;
        
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;
        
        items[index].focus();
    }

    /**
     * Select a destination
     */
    selectDestination(destination) {
        const input = document.getElementById('destination');
        if (input) {
            input.value = `${destination.name}, ${destination.country}`;
            input.dataset.lat = destination.latitude;
            input.dataset.lon = destination.longitude;
            input.dataset.timezone = destination.timezone || 'auto';
        }
        
        this.hideSuggestions();
    }

    /**
     * Handle trip form submission
     */
    async handleTripSubmit(e) {
        e.preventDefault();
        
        const submitBtn = document.getElementById('plan-trip-btn');
        const destinationInput = document.getElementById('destination');
        const startDate = document.getElementById('start-date');
        const endDate = document.getElementById('end-date');

        // Validate inputs
        if (!destinationInput?.dataset.lat || !startDate?.value || !endDate?.value) {
            this.showToast('Please fill in all fields and select a valid destination.', 'warning');
            return;
        }

        try {
            // Show loading state
            submitBtn?.classList.add('loading');
            
            const tripData = {
                destination: {
                    name: destinationInput.value,
                    latitude: parseFloat(destinationInput.dataset.lat),
                    longitude: parseFloat(destinationInput.dataset.lon),
                    timezone: destinationInput.dataset.timezone
                },
                startDate: startDate.value,
                endDate: endDate.value,
                createdAt: new Date().toISOString()
            };

            // Fetch weather data
            const weatherData = await this.fetchWeatherData(tripData);
            
            // Create trip object
            this.currentTrip = {
                ...tripData,
                weather: weatherData,
                itinerary: this.generateDefaultItinerary(tripData, weatherData),
                packing: this.generatePackingList(tripData, weatherData)
            };

            // Save to storage
            this.saveToStorage();

            // Show results
            this.displayWeatherResults();
            this.showTripSummary();
            
            this.showToast('Trip planned successfully!', 'success');

        } catch (error) {
            console.error('Trip planning error:', error);
            this.showToast('Failed to plan trip. Please try again.', 'error');
        } finally {
            submitBtn?.classList.remove('loading');
        }
    }

    /**
     * Fetch weather data from API
     */
    async fetchWeatherData(tripData) {
        const { latitude, longitude, timezone } = tripData.destination;
        const cacheKey = `weather_${latitude}_${longitude}_${tripData.startDate}_${tripData.endDate}`;
        
        // Check cache
        if (this.weatherCache.has(cacheKey)) {
            const cached = this.weatherCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
                return cached.data;
            }
        }

        const params = new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            timezone: timezone === 'auto' ? 'auto' : timezone,
            daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset',
            hourly: 'temperature_2m,precipitation_probability',
            forecast_days: this.config.maxForecastDays.toString()
        });

        const url = `${this.config.apis.weather}?${params}`;
        const response = await this.fetchWithTimeout(url);
        
        if (!response.ok) {
            throw new Error(`Weather API failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Cache the result
        this.weatherCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * Fetch with timeout and retry logic
     */
    async fetchWithTimeout(url, options = {}, timeout = 10000, retries = 2) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const fetchOptions = {
            ...options,
            signal: controller.signal
        };

        for (let i = 0; i <= retries; i++) {
            try {
                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                if (i === retries) {
                    clearTimeout(timeoutId);
                    throw error;
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    /**
     * Display weather results
     */
    displayWeatherResults() {
        const container = document.getElementById('weather-results');
        if (!container || !this.currentTrip) return;

        const { destination, weather, startDate, endDate } = this.currentTrip;
        const start = new Date(startDate);
        const end = new Date(endDate);

        container.innerHTML = `
            <div class="weather-header">
                <h3>Weather Forecast</h3>
                <div class="weather-location">${destination.name}</div>
            </div>
            <div class="weather-grid">
                ${this.generateWeatherDays(weather, start, end)}
            </div>
        `;

        container.classList.add('show');
    }

    /**
     * Generate weather day cards
     */
    generateWeatherDays(weather, startDate, endDate) {
        const days = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const dateStr = current.toISOString().split('T')[0];
            const dayIndex = weather.daily.time.indexOf(dateStr);
            
            if (dayIndex !== -1) {
                const dayData = {
                    date: new Date(current),
                    weatherCode: weather.daily.weathercode[dayIndex],
                    maxTemp: weather.daily.temperature_2m_max[dayIndex],
                    minTemp: weather.daily.temperature_2m_min[dayIndex],
                    precipitation: weather.daily.precipitation_sum[dayIndex],
                    sunrise: weather.daily.sunrise[dayIndex],
                    sunset: weather.daily.sunset[dayIndex]
                };

                days.push(this.renderWeatherDay(dayData));
            }

            current.setDate(current.getDate() + 1);
        }

        return days.join('');
    }

    /**
     * Render individual weather day
     */
    renderWeatherDay(dayData) {
        const { date, weatherCode, maxTemp, minTemp, precipitation } = dayData;
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return `
            <div class="weather-day">
                <div class="weather-date">${dayName}, ${dateStr}</div>
                <div class="weather-icon">${this.getWeatherIcon(weatherCode)}</div>
                <div class="weather-temps">
                    <span class="temp-high">${Math.round(maxTemp)}°</span>
                    <span class="temp-low">${Math.round(minTemp)}°</span>
                </div>
                <div class="weather-details">
                    ${precipitation > 0 ? `${precipitation}mm rain` : 'No rain'}
                </div>
            </div>
        `;
    }

    /**
     * Get weather icon based on weather code
     */
    getWeatherIcon(code) {
        const iconMap = {
            0: '☀️', // Clear sky
            1: '🌤️', // Mainly clear
            2: '⛅', // Partly cloudy
            3: '☁️', // Overcast
            45: '🌫️', // Fog
            48: '🌫️', // Depositing rime fog
            51: '🌦️', // Light drizzle
            53: '🌦️', // Moderate drizzle
            55: '🌦️', // Dense drizzle
            61: '🌧️', // Slight rain
            63: '🌧️', // Moderate rain
            65: '🌧️', // Heavy rain
            71: '🌨️', // Slight snow
            73: '🌨️', // Moderate snow
            75: '🌨️', // Heavy snow
            77: '❄️', // Snow grains
            80: '🌦️', // Slight rain showers
            81: '🌦️', // Moderate rain showers
            82: '🌦️', // Violent rain showers
            85: '🌨️', // Slight snow showers
            86: '🌨️', // Heavy snow showers
            95: '⛈️', // Thunderstorm
            96: '⛈️', // Thunderstorm with slight hail
            99: '⛈️' // Thunderstorm with heavy hail
        };

        return iconMap[code] || '🌤️';
    }

    /**
     * Show trip summary
     */
    showTripSummary() {
        const container = document.getElementById('trip-summary');
        if (!container || !this.currentTrip) return;

        const { destination, startDate, endDate, weather } = this.currentTrip;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Calculate weather summary
        const temps = weather.daily.temperature_2m_max.slice(0, days);
        const avgTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
        const totalPrecipitation = weather.daily.precipitation_sum.slice(0, days).reduce((sum, p) => sum + p, 0);

        container.innerHTML = `
            <div class="trip-summary-card">
                <h3>Trip Summary</h3>
                <div class="summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Destination</span>
                        <span class="summary-value">${destination.name}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Duration</span>
                        <span class="summary-value">${days} day${days > 1 ? 's' : ''}</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Average Temperature</span>
                        <span class="summary-value">${Math.round(avgTemp)}°C</span>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Expected Rain</span>
                        <span class="summary-value">${totalPrecipitation.toFixed(1)}mm</span>
                    </div>
                </div>
                <div class="summary-actions">
                    <button class="btn btn-primary" onclick="app.switchTab('itinerary')">
                        View Itinerary
                    </button>
                    <button class="btn btn-secondary" onclick="app.switchTab('packing')">
                        Check Packing List
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Generate default itinerary
     */
    generateDefaultItinerary(tripData, weatherData) {
        const itinerary = [];
        const start = new Date(tripData.startDate);
        const end = new Date(tripData.endDate);
        const current = new Date(start);

        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            const dayIndex = weatherData.daily.time.indexOf(dateStr);
            
            const activities = this.suggestActivities(
                dayIndex !== -1 ? weatherData.daily.weathercode[dayIndex] : 0,
                current.getDay()
            );

            itinerary.push({
                date: dateStr,
                activities: activities
            });

            current.setDate(current.getDate() + 1);
        }

        return itinerary;
    }

    /**
     * Suggest activities based on weather and day
     */
    suggestActivities(weatherCode, dayOfWeek) {
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isRainy = weatherCode >= 51 && weatherCode <= 82;
        const isSnowy = weatherCode >= 71 && weatherCode <= 86;

        const activities = [];

        if (isRainy || isSnowy) {
            activities.push(
                { time: '10:00', title: 'Visit Museum or Gallery', type: 'indoor' },
                { time: '14:00', title: 'Lunch at Local Restaurant', type: 'dining' },
                { time: '16:00', title: 'Shopping or Café Time', type: 'indoor' }
            );
        } else {
            activities.push(
                { time: '09:00', title: 'Explore City Center', type: 'outdoor' },
                { time: '12:00', title: 'Lunch with a View', type: 'dining' },
                { time: '15:00', title: 'Visit Local Attractions', type: 'sightseeing' }
            );

            if (isWeekend) {
                activities.push(
                    { time: '18:00', title: 'Sunset Photography', type: 'outdoor' }
                );
            }
        }

        return activities;
    }

    /**
     * Generate packing list based on weather and trip data
     */
    generatePackingList(tripData, weatherData) {
        const start = new Date(tripData.startDate);
        const end = new Date(tripData.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        // Analyze weather patterns
        const temps = weatherData.daily.temperature_2m_max.slice(0, days);
        const minTemps = weatherData.daily.temperature_2m_min.slice(0, days);
        const precipitation = weatherData.daily.precipitation_sum.slice(0, days);

        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...minTemps);
        const totalRain = precipitation.reduce((sum, p) => sum + p, 0);

        const packingList = {
            essentials: [
                { item: 'Passport/ID', checked: false },
                { item: 'Travel insurance documents', checked: false },
                { item: 'Phone charger', checked: false },
                { item: 'Camera', checked: false }
            ],
            clothing: [],
            weather: [],
            toiletries: [
                { item: 'Toothbrush and toothpaste', checked: false },
                { item: 'Shampoo/soap', checked: false },
                { item: 'Sunscreen', checked: false },
                { item: 'Personal medications', checked: false }
            ]
        };

        // Add clothing based on weather
        packingList.clothing.push(
            { item: `${days} days of underwear`, checked: false },
            { item: `${days} pairs of socks`, checked: false }
        );

        if (maxTemp > 25) {
            packingList.clothing.push(
                { item: 'T-shirts and shorts', checked: false },
                { item: 'Light dress/shirt', checked: false },
                { item: 'Sandals', checked: false }
            );
        }

        if (minTemp < 15) {
            packingList.clothing.push(
                { item: 'Warm jacket', checked: false },
                { item: 'Long pants', checked: false },
                { item: 'Closed shoes', checked: false }
            );
        }

        if (totalRain > 5) {
            packingList.weather.push(
                { item: 'Rain jacket', checked: false },
                { item: 'Umbrella', checked: false },
                { item: 'Waterproof shoes', checked: false }
            );
        }

        if (maxTemp > 20) {
            packingList.weather.push(
                { item: 'Sunglasses', checked: false },
                { item: 'Hat/cap', checked: false }
            );
        }

        return packingList;
    }

    /**
     * Render itinerary
     */
    renderItinerary() {
        const container = document.getElementById('itinerary-content');
        if (!container) return;

        if (!this.currentTrip?.itinerary) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📅</div>
                    <h3>No itinerary yet</h3>
                    <p>Plan a trip to start building your itinerary</p>
                </div>
            `;
            return;
        }

        const { itinerary } = this.currentTrip;
        
        container.innerHTML = `
            <div class="itinerary-days">
                ${itinerary.map((day, index) => this.renderItineraryDay(day, index)).join('')}
            </div>
        `;

        this.bindItineraryEvents();
    }

    /**
     * Render single itinerary day
     */
    renderItineraryDay(day, index) {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        return `
            <div class="itinerary-day">
                <div class="itinerary-day-header">
                    <div class="itinerary-date">${dayName}, ${dateStr}</div>
                    <button class="add-activity-btn" data-day="${index}">Add Activity</button>
                </div>
                <ul class="activities-list">
                    ${day.activities.map((activity, actIndex) => `
                        <li class="activity-item">
                            <span class="activity-time">${activity.time}</span>
                            <span class="activity-title">${activity.title}</span>
                            <div class="activity-actions">
                                <button class="activity-action" data-action="edit" data-day="${index}" data-activity="${actIndex}" title="Edit activity">✏️</button>
                                <button class="activity-action" data-action="delete" data-day="${index}" data-activity="${actIndex}" title="Delete activity">🗑️</button>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    /**
     * Bind itinerary events
     */
    bindItineraryEvents() {
        // Add activity buttons
        document.querySelectorAll('.add-activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const dayIndex = parseInt(e.target.dataset.day);
                this.showAddActivityModal(dayIndex);
            });
        });

        // Activity action buttons
        document.querySelectorAll('.activity-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const dayIndex = parseInt(e.target.dataset.day);
                const activityIndex = parseInt(e.target.dataset.activity);

                if (action === 'edit') {
                    this.editActivity(dayIndex, activityIndex);
                } else if (action === 'delete') {
                    this.deleteActivity(dayIndex, activityIndex);
                }
            });
        });
    }

    /**
     * Show add activity modal
     */
    showAddActivityModal(dayIndex) {
        const day = this.currentTrip?.itinerary[dayIndex];
        if (!day) return;

        const date = new Date(day.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
        });

        this.showModal('Add Activity', `
            <form id="add-activity-form">
                <div class="form-group">
                    <label for="activity-time">Time</label>
                    <input type="time" id="activity-time" name="time" required>
                </div>
                <div class="form-group">
                    <label for="activity-title">Activity</label>
                    <input type="text" id="activity-title" name="title" placeholder="What would you like to do?" required>
                </div>
                <div class="form-group">
                    <label for="activity-type">Type</label>
                    <select id="activity-type" name="type">
                        <option value="outdoor">Outdoor</option>
                        <option value="indoor">Indoor</option>
                        <option value="dining">Dining</option>
                        <option value="sightseeing">Sightseeing</option>
                        <option value="shopping">Shopping</option>
                        <option value="cultural">Cultural</option>
                    </select>
                </div>
                <input type="hidden" name="dayIndex" value="${dayIndex}">
            </form>
        `, `
            <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button class="btn btn-primary" onclick="app.addActivity()">Add Activity</button>
        `);
    }

    /**
     * Add new activity
     */
    addActivity() {
        const form = document.getElementById('add-activity-form');
        const formData = new FormData(form);
        
        const activity = {
            time: formData.get('time'),
            title: formData.get('title'),
            type: formData.get('type')
        };

        const dayIndex = parseInt(formData.get('dayIndex'));
        
        if (this.currentTrip?.itinerary[dayIndex]) {
            this.currentTrip.itinerary[dayIndex].activities.push(activity);
            
            // Sort activities by time
            this.currentTrip.itinerary[dayIndex].activities.sort((a, b) => 
                a.time.localeCompare(b.time)
            );
            
            this.saveToStorage();
            this.renderItinerary();
            this.hideModal();
            this.showToast('Activity added successfully!', 'success');
        }
    }

    /**
     * Edit activity
     */
    editActivity(dayIndex, activityIndex) {
        const activity = this.currentTrip?.itinerary[dayIndex]?.activities[activityIndex];
        if (!activity) return;

        this.showModal('Edit Activity', `
            <form id="edit-activity-form">
                <div class="form-group">
                    <label for="edit-activity-time">Time</label>
                    <input type="time" id="edit-activity-time" name="time" value="${activity.time}" required>
                </div>
                <div class="form-group">
                    <label for="edit-activity-title">Activity</label>
                    <input type="text" id="edit-activity-title" name="title" value="${activity.title}" required>
                </div>
                <div class="form-group">
                    <label for="edit-activity-type">Type</label>
                    <select id="edit-activity-type" name="type">
                        <option value="outdoor" ${activity.type === 'outdoor' ? 'selected' : ''}>Outdoor</option>
                        <option value="indoor" ${activity.type === 'indoor' ? 'selected' : ''}>Indoor</option>
                        <option value="dining" ${activity.type === 'dining' ? 'selected' : ''}>Dining</option>
                        <option value="sightseeing" ${activity.type === 'sightseeing' ? 'selected' : ''}>Sightseeing</option>
                        <option value="shopping" ${activity.type === 'shopping' ? 'selected' : ''}>Shopping</option>
                        <option value="cultural" ${activity.type === 'cultural' ? 'selected' : ''}>Cultural</option>
                    </select>
                </div>
                <input type="hidden" name="dayIndex" value="${dayIndex}">
                <input type="hidden" name="activityIndex" value="${activityIndex}">
            </form>
        `, `
            <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button class="btn btn-primary" onclick="app.updateActivity()">Update Activity</button>
        `);
    }

    /**
     * Update activity
     */
    updateActivity() {
        const form = document.getElementById('edit-activity-form');
        const formData = new FormData(form);
        
        const dayIndex = parseInt(formData.get('dayIndex'));
        const activityIndex = parseInt(formData.get('activityIndex'));
        
        if (this.currentTrip?.itinerary[dayIndex]?.activities[activityIndex]) {
            this.currentTrip.itinerary[dayIndex].activities[activityIndex] = {
                time: formData.get('time'),
                title: formData.get('title'),
                type: formData.get('type')
            };
            
            // Sort activities by time
            this.currentTrip.itinerary[dayIndex].activities.sort((a, b) => 
                a.time.localeCompare(b.time)
            );
            
            this.saveToStorage();
            this.renderItinerary();
            this.hideModal();
            this.showToast('Activity updated successfully!', 'success');
        }
    }

    /**
     * Delete activity
     */
    deleteActivity(dayIndex, activityIndex) {
        if (confirm('Are you sure you want to delete this activity?')) {
            this.currentTrip.itinerary[dayIndex].activities.splice(activityIndex, 1);
            this.saveToStorage();
            this.renderItinerary();
            this.showToast('Activity deleted', 'info');
        }
    }

    /**
     * Render packing list
     */
    renderPackingList() {
        const container = document.getElementById('packing-content');
        if (!container) return;

        if (!this.currentTrip?.packing) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🎒</div>
                    <h3>No packing list yet</h3>
                    <p>Plan a trip to get smart packing recommendations</p>
                </div>
            `;
            return;
        }

        const { packing } = this.currentTrip;
        
        container.innerHTML = `
            <div class="packing-categories">
                ${Object.entries(packing).map(([category, items]) => 
                    this.renderPackingCategory(category, items)
                ).join('')}
            </div>
        `;

        this.bindPackingEvents();
    }

    /**
     * Render packing category
     */
    renderPackingCategory(category, items) {
        const categoryNames = {
            essentials: 'Travel Essentials',
            clothing: 'Clothing',
            weather: 'Weather-Specific Items',
            toiletries: 'Toiletries & Personal Care'
        };

        const categoryDescriptions = {
            essentials: 'Don\'t forget these important items',
            clothing: 'Based on your trip duration and weather',
            weather: 'Recommended based on weather forecast',
            toiletries: 'Personal care essentials'
        };

        return `
            <div class="packing-category">
                <div class="category-header">
                    <div class="category-title">${categoryNames[category] || category}</div>
                    <div class="category-description">${categoryDescriptions[category] || ''}</div>
                </div>
                <div class="packing-items">
                    ${items.map((item, index) => `
                        <div class="packing-item ${item.checked ? 'checked' : ''}">
                            <input 
                                type="checkbox" 
                                class="packing-checkbox" 
                                ${item.checked ? 'checked' : ''}
                                data-category="${category}"
                                data-index="${index}"
                            >
                            <label class="packing-label">${item.item}</label>
                            <button class="remove-item" data-category="${category}" data-index="${index}" title="Remove item">×</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Bind packing list events
     */
    bindPackingEvents() {
        // Checkbox events
        document.querySelectorAll('.packing-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                
                if (this.currentTrip?.packing[category]?.[index]) {
                    this.currentTrip.packing[category][index].checked = e.target.checked;
                    this.saveToStorage();
                    
                    // Update visual state
                    const item = e.target.closest('.packing-item');
                    if (e.target.checked) {
                        item.classList.add('checked');
                    } else {
                        item.classList.remove('checked');
                    }
                }
            });
        });

        // Remove item events
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                const index = parseInt(e.target.dataset.index);
                
                if (confirm('Remove this item from your packing list?')) {
                    this.currentTrip.packing[category].splice(index, 1);
                    this.saveToStorage();
                    this.renderPackingList();
                    this.showToast('Item removed from packing list', 'info');
                }
            });
        });
    }

    /**
     * Show add item modal
     */
    showAddItemModal() {
        this.showModal('Add Packing Item', `
            <form id="add-item-form">
                <div class="form-group">
                    <label for="item-category">Category</label>
                    <select id="item-category" name="category" required>
                        <option value="essentials">Travel Essentials</option>
                        <option value="clothing">Clothing</option>
                        <option value="weather">Weather-Specific</option>
                        <option value="toiletries">Toiletries</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="item-name">Item</label>
                    <input type="text" id="item-name" name="item" placeholder="What do you need to pack?" required>
                </div>
            </form>
        `, `
            <button class="btn btn-secondary" onclick="app.hideModal()">Cancel</button>
            <button class="btn btn-primary" onclick="app.addPackingItem()">Add Item</button>
        `);
    }

    /**
     * Add packing item
     */
    addPackingItem() {
        const form = document.getElementById('add-item-form');
        const formData = new FormData(form);
        
        const category = formData.get('category');
        const item = formData.get('item');
        
        if (this.currentTrip?.packing[category]) {
            this.currentTrip.packing[category].push({
                item: item,
                checked: false
            });
            
            this.saveToStorage();
            this.renderPackingList();
            this.hideModal();
            this.showToast('Item added to packing list!', 'success');
        }
    }

    /**
     * Export itinerary
     */
    exportItinerary() {
        if (!this.currentTrip) {
            this.showToast('No trip to export', 'warning');
            return;
        }

        const content = this.generateItineraryText();
        this.downloadFile(`${this.currentTrip.destination.name}_itinerary.txt`, content);
        this.showToast('Itinerary exported successfully!', 'success');
    }

    /**
     * Generate itinerary text
     */
    generateItineraryText() {
        const { destination, startDate, endDate, itinerary } = this.currentTrip;
        
        let content = `TRAVEL ITINERARY\n`;
        content += `=================\n\n`;
        content += `Destination: ${destination.name}\n`;
        content += `Dates: ${startDate} to ${endDate}\n\n`;
        
        itinerary.forEach(day => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            content += `${dayName}\n`;
            content += `${'='.repeat(dayName.length)}\n`;
            
            day.activities.forEach(activity => {
                content += `${activity.time} - ${activity.title}\n`;
            });
            
            content += `\n`;
        });
        
        content += `Generated by NomadNow Travel Planner\n`;
        
        return content;
    }

    /**
     * Share itinerary
     */
    shareItinerary() {
        if (!this.currentTrip) {
            this.showToast('No trip to share', 'warning');
            return;
        }

        const tripData = encodeURIComponent(JSON.stringify({
            destination: this.currentTrip.destination.name,
            startDate: this.currentTrip.startDate,
            endDate: this.currentTrip.endDate,
            days: this.currentTrip.itinerary.length
        }));

        const shareUrl = `${window.location.origin}${window.location.pathname}?trip=${tripData}`;
        
        if (navigator.share) {
            navigator.share({
                title: `My trip to ${this.currentTrip.destination.name}`,
                text: `Check out my travel itinerary!`,
                url: shareUrl
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                this.showToast('Share link copied to clipboard!', 'success');
            }).catch(() => {
                this.showModal('Share Trip', `
                    <p>Copy this link to share your trip:</p>
                    <input type="text" value="${shareUrl}" readonly style="width: 100%; padding: 8px; margin-top: 8px;">
                `, `
                    <button class="btn btn-primary" onclick="app.hideModal()">Close</button>
                `);
            });
        }
    }

    /**
     * Export packing list
     */
    exportPackingList() {
        if (!this.currentTrip?.packing) {
            this.showToast('No packing list to export', 'warning');
            return;
        }

        const content = this.generatePackingListText();
        this.downloadFile(`${this.currentTrip.destination.name}_packing_list.txt`, content);
        this.showToast('Packing list exported successfully!', 'success');
    }

    /**
     * Generate packing list text
     */
    generatePackingListText() {
        const { destination, packing } = this.currentTrip;
        
        let content = `PACKING LIST\n`;
        content += `=============\n\n`;
        content += `Trip to: ${destination.name}\n\n`;
        
        Object.entries(packing).forEach(([category, items]) => {
            const categoryNames = {
                essentials: 'TRAVEL ESSENTIALS',
                clothing: 'CLOTHING',
                weather: 'WEATHER-SPECIFIC ITEMS',
                toiletries: 'TOILETRIES & PERSONAL CARE'
            };
            
            content += `${categoryNames[category] || category.toUpperCase()}\n`;
            content += `${'-'.repeat(categoryNames[category]?.length || category.length)}\n`;
            
            items.forEach(item => {
                const checkbox = item.checked ? '☑' : '☐';
                content += `${checkbox} ${item.item}\n`;
            });
            
            content += `\n`;
        });
        
        content += `Generated by NomadNow Travel Planner\n`;
        
        return content;
    }

    /**
     * Download file
     */
    downloadFile(filename, content) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Show modal
     */
    showModal(title, body, footer = '') {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const bodyEl = document.getElementById('modal-body');
        const footerEl = document.getElementById('modal-footer');

        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.innerHTML = body;
        if (footerEl) footerEl.innerHTML = footer;

        if (overlay) {
            overlay.classList.add('show');
            overlay.setAttribute('aria-hidden', 'false');
            
            // Focus management
            const firstFocusable = overlay.querySelector('input, button, select, textarea');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }

    /**
     * Hide modal
     */
    hideModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Show about modal
     */
    showAboutModal() {
        this.showModal('About NomadNow', `
            <div style="text-align: center;">
                <h4>NomadNow Travel Planner</h4>
                <p>A weather-aware travel planning application that helps you plan perfect trips with smart recommendations.</p>
                <h5>Features:</h5>
                <ul style="text-align: left; max-width: 300px; margin: 0 auto;">
                    <li>Weather-based planning</li>
                    <li>Smart packing lists</li>
                    <li>Itinerary builder</li>
                    <li>Export functionality</li>
                    <li>Offline storage</li>
                </ul>
                <p style="margin-top: 20px;"><strong>Version:</strong> 1.0.0</p>
            </div>
        `, `
            <button class="btn btn-primary" onclick="app.hideModal()">Close</button>
        `);
    }

    /**
     * Show privacy modal
     */
    showPrivacyModal() {
        this.showModal('Privacy Policy', `
            <div>
                <h4>Your Privacy Matters</h4>
                <p>NomadNow is designed with privacy in mind:</p>
                <ul>
                    <li><strong>Local Storage:</strong> All your data is stored locally on your device</li>
                    <li><strong>No Tracking:</strong> We don't collect or track any personal information</li>
                    <li><strong>No Account Required:</strong> Use the app without signing up</li>
                    <li><strong>API Usage:</strong> We only use public APIs for weather and location data</li>
                    <li><strong>No Data Sharing:</strong> Your trip data never leaves your device</li>
                </ul>
                <p>Your travel plans are private and secure.</p>
            </div>
        `, `
            <button class="btn btn-primary" onclick="app.hideModal()">Close</button>
        `);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toastId = `toast-${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        
        toast.innerHTML = `
            <div class="toast-header">
                <span class="toast-title">${this.getToastTitle(type)}</span>
                <button class="toast-close" onclick="app.removeToast('${toastId}')">&times;</button>
            </div>
            <div class="toast-message">${message}</div>
        `;

        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => this.removeToast(toastId), duration);
    }

    /**
     * Get toast title based on type
     */
    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Remove toast
     */
    removeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }

    /**
     * Save data to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('nomadnow_trip', JSON.stringify(this.currentTrip));
            localStorage.setItem('nomadnow_cache_geocode', JSON.stringify([...this.geocodeCache.entries()]));
            localStorage.setItem('nomadnow_cache_weather', JSON.stringify([...this.weatherCache.entries()]));
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            this.showToast('Failed to save data locally', 'warning');
        }
    }

    /**
     * Load data from localStorage
     */
    loadStoredData() {
        try {
            // Load trip data
            const tripData = localStorage.getItem('nomadnow_trip');
            if (tripData) {
                this.currentTrip = JSON.parse(tripData);
            }

            // Load cache data
            const geocodeCache = localStorage.getItem('nomadnow_cache_geocode');
            if (geocodeCache) {
                this.geocodeCache = new Map(JSON.parse(geocodeCache));
            }

            const weatherCache = localStorage.getItem('nomadnow_cache_weather');
            if (weatherCache) {
                this.weatherCache = new Map(JSON.parse(weatherCache));
            }

            // Clean expired cache entries
            this.cleanExpiredCache();

        } catch (error) {
            console.error('Failed to load from localStorage:', error);
        }
    }

    /**
     * Clean expired cache entries
     */
    cleanExpiredCache() {
        const now = Date.now();
        
        // Clean geocode cache
        for (const [key, value] of this.geocodeCache.entries()) {
            if (now - value.timestamp > this.config.cacheTimeout) {
                this.geocodeCache.delete(key);
            }
        }

        // Clean weather cache
        for (const [key, value] of this.weatherCache.entries()) {
            if (now - value.timestamp > this.config.cacheTimeout) {
                this.weatherCache.delete(key);
            }
        }
    }

    /**
     * Clear all data
     */
    clearAllData() {
        if (confirm('This will clear all your trip data. Are you sure?')) {
            localStorage.removeItem('nomadnow_trip');
            localStorage.removeItem('nomadnow_cache_geocode');
            localStorage.removeItem('nomadnow_cache_weather');
            
            this.currentTrip = null;
            this.geocodeCache.clear();
            this.weatherCache.clear();
            
            // Reset UI
            document.getElementById('weather-results')?.classList.remove('show');
            document.getElementById('trip-summary').innerHTML = '';
            this.renderItinerary();
            this.renderPackingList();
            
            this.showToast('All data cleared', 'info');
        }
    }

    /**
     * Load shared trip from URL
     */
    loadSharedTrip() {
        const urlParams = new URLSearchParams(window.location.search);
        const tripParam = urlParams.get('trip');
        
        if (tripParam) {
            try {
                const sharedTrip = JSON.parse(decodeURIComponent(tripParam));
                
                // Fill form with shared trip data
                const destinationInput = document.getElementById('destination');
                const startDateInput = document.getElementById('start-date');
                const endDateInput = document.getElementById('end-date');
                
                if (destinationInput) destinationInput.value = sharedTrip.destination;
                if (startDateInput) startDateInput.value = sharedTrip.startDate;
                if (endDateInput) endDateInput.value = sharedTrip.endDate;
                
                this.showToast(`Loaded shared trip to ${sharedTrip.destination}`, 'info');
                
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                
            } catch (error) {
                console.error('Failed to load shared trip:', error);
                this.showToast('Invalid share link', 'error');
            }
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new NomadNowApp();
    
    // Load shared trip if present
    window.app.loadSharedTrip();
    
    // Register service worker for offline support (if available)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NomadNowApp;
}