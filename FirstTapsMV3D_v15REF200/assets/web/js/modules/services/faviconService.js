// modules/services/faviconService.js
// Dependencies: None (pure service class)
// Exports: window.FaviconService

(function() {
    'use strict';
    
    console.log("Loading FaviconService module...");
    
    /**
     * Favicon Service - Handles efficient, non-blocking favicon fetching and caching
     */
    class FaviconService {
        constructor() {
            this.cache = new Map();
            this.pendingRequests = new Map();
            this.requestQueue = [];
            this.isProcessingQueue = false;
            this.maxConcurrentRequests = 3;
            this.currentRequests = 0;
            this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
            
            // Initialize storage for persistent cache
            this.initializePersistentCache();
            
            console.log('FaviconService initialized');
        }

        /**
         * Initialize persistent cache using localStorage
         */
        initializePersistentCache() {
            try {
                const storedCache = localStorage.getItem('faviconCache');
                if (storedCache) {
                    const parsed = JSON.parse(storedCache);
                    const now = Date.now();
                    
                    // Only load non-expired entries
                    Object.entries(parsed).forEach(([domain, data]) => {
                        if (data.timestamp && (now - data.timestamp) < this.cacheExpiry) {
                            this.cache.set(domain, data);
                        }
                    });
                    
                    console.log(`📦 Loaded ${this.cache.size} cached favicons from storage`);
                }
            } catch (error) {
                console.warn('Error loading favicon cache from storage:', error);
            }
        }

        /**
         * Save cache to persistent storage
         */
        saveCacheToPersistentStorage() {
            try {
                const cacheObject = {};
                this.cache.forEach((value, key) => {
                    cacheObject[key] = value;
                });
                
                localStorage.setItem('faviconCache', JSON.stringify(cacheObject));
                console.log(`💾 Saved ${this.cache.size} favicons to persistent cache`);
            } catch (error) {
                console.warn('Error saving favicon cache to storage:', error);
            }
        }

        /**
         * Fetch favicon for a domain
         * @param {string} domain - Domain to fetch favicon for
         * @param {Function} callback - Callback function (domain, imageDataUrl, error)
         * @returns {Promise} - Promise that resolves when favicon is fetched or fails
         */
        async fetchFavicon(domain, callback) {
            const normalizedDomain = domain.toLowerCase().replace('www.', '');
            
            // Check cache first
            if (this.cache.has(normalizedDomain)) {
                const cached = this.cache.get(normalizedDomain);
                const now = Date.now();
                
                // Check if cache entry is still valid
                if (cached.timestamp && (now - cached.timestamp) < this.cacheExpiry) {
                    console.log(`⚡ Using cached favicon for ${normalizedDomain}`);
                    if (callback) callback(normalizedDomain, cached.dataUrl, null);
                    return Promise.resolve(cached.dataUrl);
                } else {
                    // Remove expired entry
                    this.cache.delete(normalizedDomain);
                }
            }

            // Check if request is already pending
            if (this.pendingRequests.has(normalizedDomain)) {
                const pending = this.pendingRequests.get(normalizedDomain);
                pending.callbacks.push(callback);
                return pending.promise;
            }

            // Create new request
            const requestPromise = this.processFaviconRequest(normalizedDomain);
            this.pendingRequests.set(normalizedDomain, {
                promise: requestPromise,
                callbacks: callback ? [callback] : []
            });

            // Add to queue for processing
            this.requestQueue.push(normalizedDomain);
            this.processQueue();

            return requestPromise;
        }

        /**
         * Process the favicon request queue
         */
        async processQueue() {
            if (this.isProcessingQueue || this.currentRequests >= this.maxConcurrentRequests) {
                return;
            }

            this.isProcessingQueue = true;

            while (this.requestQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
                const domain = this.requestQueue.shift();
                this.processFaviconRequest(domain);
            }

            this.isProcessingQueue = false;
        }

        /**
         * Process a single favicon request
         * @param {string} domain - Domain to process
         */
        async processFaviconRequest(domain) {
            this.currentRequests++;
            
            try {
                console.log(`🔍 Fetching favicon for ${domain}`);
                
                const faviconUrls = this.generateFaviconUrls(domain);
                let successfulUrl = null;
                let dataUrl = null;

                // Try each URL in sequence
                for (const url of faviconUrls) {
                    try {
                        dataUrl = await this.fetchSingleFavicon(url);
                        if (dataUrl) {
                            successfulUrl = url;
                            break;
                        }
                    } catch (error) {
                        console.log(`❌ Failed to fetch from ${url}:`, error.message);
                        continue;
                    }
                }

                // Handle result
                const pending = this.pendingRequests.get(domain);
                if (pending) {
                    if (dataUrl) {
                        // Cache successful result
                        this.cache.set(domain, {
                            dataUrl: dataUrl,
                            url: successfulUrl,
                            timestamp: Date.now()
                        });
                        
                        console.log(`✅ Successfully fetched favicon for ${domain}`);
                        
                        // Save to persistent storage periodically
                        if (this.cache.size % 10 === 0) {
                            this.saveCacheToPersistentStorage();
                        }
                    } else {
                        // Cache failure to prevent repeated attempts
                        this.cache.set(domain, {
                            dataUrl: null,
                            error: 'No favicon found',
                            timestamp: Date.now()
                        });
                        
                        console.log(`⚠️ No favicon found for ${domain}`);
                    }

                    // Execute all callbacks
                    pending.callbacks.forEach(callback => {
                        if (callback) {
                            try {
                                callback(domain, dataUrl, dataUrl ? null : new Error('No favicon found'));
                            } catch (error) {
                                console.error('Error in favicon callback:', error);
                            }
                        }
                    });

                    this.pendingRequests.delete(domain);
                }

            } catch (error) {
                console.error(`Error processing favicon request for ${domain}:`, error);
                
                // Handle error for pending request
                const pending = this.pendingRequests.get(domain);
                if (pending) {
                    pending.callbacks.forEach(callback => {
                        if (callback) callback(domain, null, error);
                    });
                    this.pendingRequests.delete(domain);
                }
            } finally {
                this.currentRequests--;
                
                // Continue processing queue
                if (this.requestQueue.length > 0) {
                    setTimeout(() => this.processQueue(), 100);
                }
            }
        }

        /**
         * Generate potential favicon URLs for a domain
         * @param {string} domain - Domain to generate URLs for
         * @returns {Array<string>} - Array of potential favicon URLs
         */
        generateFaviconUrls(domain) {
            return [
                // Google's favicon service (most reliable)
                `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
                
                // Standard favicon locations
                `https://${domain}/favicon.ico`,
                `https://${domain}/favicon.png`,
                `https://${domain}/favicon.svg`,
                
                // Apple touch icons (often higher quality)
                `https://${domain}/apple-touch-icon.png`,
                `https://${domain}/apple-touch-icon-precomposed.png`,
                
                // Alternative locations
                `https://${domain}/images/favicon.ico`,
                `https://${domain}/assets/favicon.ico`,
                `https://${domain}/static/favicon.ico`,
                
                // Try www variant if domain doesn't have it
                ...(domain.startsWith('www.') ? [] : [
                    `https://www.${domain}/favicon.ico`,
                    `https://www.${domain}/favicon.png`
                ])
            ];
        }

        /**
         * Fetch a single favicon from URL
         * @param {string} url - URL to fetch favicon from
         * @returns {Promise<string>} - Promise that resolves to data URL
         */
        fetchSingleFavicon(url) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                // Set timeout to prevent hanging
                const timeout = setTimeout(() => {
                    reject(new Error(`Timeout fetching favicon from ${url}`));
                }, 8000);

                img.onload = () => {
                    clearTimeout(timeout);
                    
                    try {
                        // Convert to data URL using canvas
                        const canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        const ctx = canvas.getContext('2d');
                        
                        // Draw image to canvas
                        ctx.drawImage(img, 0, 0, 64, 64);
                        
                        // Convert to data URL
                        const dataUrl = canvas.toDataURL('image/png');
                        resolve(dataUrl);
                        
                    } catch (error) {
                        reject(new Error(`Error converting favicon to data URL: ${error.message}`));
                    }
                };

                img.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load favicon from ${url}`));
                };

                img.src = url;
            });
        }

        /**
         * Get cached favicon data
         * @param {string} domain - Domain to get cached data for
         * @returns {Object|null} - Cached data or null
         */
        getCachedFavicon(domain) {
            const normalizedDomain = domain.toLowerCase().replace('www.', '');
            return this.cache.get(normalizedDomain) || null;
        }

        /**
         * Check if favicon is in cache and valid
         * @param {string} domain - Domain to check
         * @returns {boolean} - True if valid cached favicon exists
         */
        hasCachedFavicon(domain) {
            const cached = this.getCachedFavicon(domain);
            if (!cached) return false;
            
            const now = Date.now();
            return cached.timestamp && (now - cached.timestamp) < this.cacheExpiry && cached.dataUrl;
        }

        /**
         * Clear expired cache entries
         */
        clearExpiredCache() {
            const now = Date.now();
            let cleared = 0;
            
            this.cache.forEach((value, key) => {
                if (!value.timestamp || (now - value.timestamp) >= this.cacheExpiry) {
                    this.cache.delete(key);
                    cleared++;
                }
            });
            
            if (cleared > 0) {
                console.log(`🧹 Cleared ${cleared} expired favicon cache entries`);
                this.saveCacheToPersistentStorage();
            }
        }

        /**
         * Get cache statistics
         * @returns {Object} - Cache statistics
         */
        getCacheStats() {
            let successful = 0;
            let failed = 0;
            
            this.cache.forEach(value => {
                if (value.dataUrl) {
                    successful++;
                } else {
                    failed++;
                }
            });
            
            return {
                total: this.cache.size,
                successful: successful,
                failed: failed,
                pendingRequests: this.pendingRequests.size,
                queueLength: this.requestQueue.length
            };
        }

        /**
         * Clean up resources
         */
        dispose() {
            // Clear pending requests
            this.pendingRequests.clear();
            this.requestQueue = [];
            
            // Save final cache state
            this.saveCacheToPersistentStorage();
            
            console.log('FaviconService disposed');
        }
    }

    // Export to global scope
    window.FaviconService = FaviconService;
    console.log("FaviconService module loaded and exported to window.FaviconService");

})();
