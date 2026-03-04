// ============================================================================
// SMS CORE INITIALIZATION - Robust SMS System Startup
// ============================================================================

/**
 * SmsInitializer - Coordinates initialization of the new SMS Core system
 * 
 * This service provides:
 * - Coordinated startup of all SMS Core components
 * - Robust error handling during initialization
 * - Fallback mechanisms for component failures
 * - Integration with existing SMS systems
 */
class SmsInitializer {
    constructor() {
        this.initializationSteps = [];
        this.completedSteps = new Set();
        this.failedSteps = new Set();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.isInitialized = false;
        
        this.defineInitializationSteps();
        console.log('SmsInitializer created - Ready to initialize SMS Core system');
    }

    /**
     * Define the initialization steps in order
     */
    defineInitializationSteps() {
        this.initializationSteps = [
            {
                name: 'sms_core',
                description: 'Initialize SMS Core service',
                required: true,
                timeout: 5000,
                execute: () => this.initializeSmsCore()
            },
            {
                name: 'bridge_manager',
                description: 'Initialize SMS Bridge Manager',
                required: true,
                timeout: 5000,
                execute: () => this.initializeBridgeManager()
            },
            {
                name: 'screen_adapter',
                description: 'Initialize SMS Screen Adapter',
                required: true,
                timeout: 3000,
                execute: () => this.initializeScreenAdapter()
            },
            {
                name: 'flutter_connection',
                description: 'Establish Flutter bridge connection',
                required: false,
                timeout: 10000,
                execute: () => this.establishFlutterConnection()
            },
            {
                name: 'history_sync',
                description: 'Sync SMS history from device',
                required: false,
                timeout: 15000,
                execute: () => this.syncSmsHistory()
            },
            {
                name: 'integration_check',
                description: 'Verify integration with existing systems',
                required: false,
                timeout: 3000,
                execute: () => this.verifyIntegration()
            }
        ];
    }

    /**
     * Start the SMS Core system initialization
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('SMS Core system already initialized');
            return { success: true, message: 'Already initialized' };
        }

        console.log('Starting SMS Core system initialization...');
        
        try {
            const results = await this.executeInitializationSteps();
            
            if (results.success) {
                this.isInitialized = true;
                console.log('SMS Core system initialized successfully');
                
                // Dispatch initialization complete event
                this.dispatchEvent('sms_core_initialized', {
                    timestamp: Date.now(),
                    completedSteps: Array.from(this.completedSteps),
                    failedSteps: Array.from(this.failedSteps)
                });
                
                return results;
            } else {
                console.error('SMS Core system initialization failed');
                return results;
            }

        } catch (error) {
            console.error('Critical error during SMS Core initialization:', error);
            return {
                success: false,
                error: error.message,
                completedSteps: Array.from(this.completedSteps),
                failedSteps: Array.from(this.failedSteps)
            };
        }
    }

    /**
     * Execute all initialization steps
     */
    async executeInitializationSteps() {
        const results = {
            success: true,
            completedSteps: [],
            failedSteps: [],
            warnings: []
        };

        for (const step of this.initializationSteps) {
            try {
                console.log(`Executing step: ${step.description}`);
                
                const success = await this.executeStepWithTimeout(step);
                
                if (success) {
                    this.completedSteps.add(step.name);
                    results.completedSteps.push(step.name);
                    console.log(`✓ Step completed: ${step.description}`);
                } else {
                    this.failedSteps.add(step.name);
                    results.failedSteps.push(step.name);
                    
                    if (step.required) {
                        console.error(`✗ Required step failed: ${step.description}`);
                        results.success = false;
                        break;
                    } else {
                        console.warn(`⚠ Optional step failed: ${step.description}`);
                        results.warnings.push(`Optional step failed: ${step.description}`);
                    }
                }

            } catch (error) {
                console.error(`Error in step ${step.name}:`, error);
                this.failedSteps.add(step.name);
                results.failedSteps.push(step.name);
                
                if (step.required) {
                    results.success = false;
                    results.error = `Required step ${step.name} failed: ${error.message}`;
                    break;
                } else {
                    results.warnings.push(`Optional step ${step.name} failed: ${error.message}`);
                }
            }
        }

        return results;
    }

    /**
     * Execute a step with timeout and retry logic
     */
    async executeStepWithTimeout(step) {
        const retryKey = step.name;
        const currentAttempts = this.retryAttempts.get(retryKey) || 0;

        if (currentAttempts >= this.maxRetries) {
            console.error(`Max retries exceeded for step: ${step.name}`);
            return false;
        }

        try {
            const result = await Promise.race([
                step.execute(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), step.timeout)
                )
            ]);

            // Reset retry counter on success
            this.retryAttempts.delete(retryKey);
            return result;

        } catch (error) {
            console.warn(`Step ${step.name} failed (attempt ${currentAttempts + 1}):`, error.message);
            
            this.retryAttempts.set(retryKey, currentAttempts + 1);
            
            if (currentAttempts < this.maxRetries - 1) {
                console.log(`Retrying step ${step.name} in 1 second...`);
                await this.delay(1000);
                return await this.executeStepWithTimeout(step);
            } else {
                throw error;
            }
        }
    }

    /**
     * Initialize SMS Core service
     */
    async initializeSmsCore() {
        if (!window.smsCore) {
            throw new Error('SMS Core not available');
        }

        await window.smsCore.initialize();
        
        // Verify SMS Core is working
        const status = window.smsCore.getSystemStatus();
        if (!status.isInitialized) {
            throw new Error('SMS Core failed to initialize properly');
        }

        return true;
    }

    /**
     * Initialize SMS Bridge Manager
     */
    async initializeBridgeManager() {
        if (!window.smsBridgeManager) {
            throw new Error('SMS Bridge Manager not available');
        }

        // Bridge manager initializes automatically, just verify it's working
        await this.delay(1000); // Give it time to initialize
        
        const status = window.smsBridgeManager.getBridgeStatus();
        console.log('Bridge Manager status:', status);
        
        return true;
    }

    /**
     * Initialize SMS Screen Adapter
     */
    async initializeScreenAdapter() {
        if (!window.smsScreenAdapter) {
            throw new Error('SMS Screen Adapter not available');
        }

        // Screen adapter initializes automatically, just verify it's working
        const status = window.smsScreenAdapter.getAdapterStatus();
        console.log('Screen Adapter status:', status);
        
        return true;
    }

    /**
     * Establish Flutter bridge connection
     */
    async establishFlutterConnection() {
        if (!window.smsBridgeManager) {
            throw new Error('SMS Bridge Manager not available');
        }

        // Wait for Flutter bridge to become available
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            const status = window.smsBridgeManager.getBridgeStatus();
            
            if (status.isAvailable) {
                console.log('Flutter bridge connection established');
                return true;
            }

            await this.delay(1000);
            attempts++;
        }

        console.warn('Flutter bridge connection could not be established');
        return false; // Non-critical failure
    }

    /**
     * Sync SMS history from device
     */
    async syncSmsHistory() {
        if (!window.smsBridgeManager) {
            console.warn('SMS Bridge Manager not available for history sync');
            return false;
        }

        try {
            const result = await window.smsBridgeManager.requestSmsHistory();
            
            if (result.success) {
                console.log(`SMS history synced: ${result.messageCount} messages`);
                return true;
            } else {
                console.warn('SMS history sync failed:', result.error);
                return false;
            }

        } catch (error) {
            console.warn('Error during SMS history sync:', error);
            return false;
        }
    }

    /**
     * Verify integration with existing systems
     */
    async verifyIntegration() {
        const checks = [];

        // Check if contact manager is available
        if (window.contactManager) {
            checks.push('contact_manager');
        }

        // Check if SMS screen objects exist
        if (window.objectCreators && typeof window.objectCreators.createSMSScreen === 'function') {
            checks.push('sms_screen_creator');
        }

        // Check if SMS interaction manager exists
        if (window.smsInteractionManager) {
            checks.push('sms_interaction_manager');
        }

        console.log('Integration checks passed:', checks);
        return checks.length > 0;
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventType, data) {
        try {
            const event = new CustomEvent(eventType, {
                detail: data,
                bubbles: true
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.error('Error dispatching event:', error);
        }
    }

    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get initialization status
     */
    getInitializationStatus() {
        return {
            isInitialized: this.isInitialized,
            completedSteps: Array.from(this.completedSteps),
            failedSteps: Array.from(this.failedSteps),
            retryAttempts: Object.fromEntries(this.retryAttempts),
            totalSteps: this.initializationSteps.length
        };
    }

    /**
     * Force retry of failed steps
     */
    async retryFailedSteps() {
        console.log('Retrying failed initialization steps...');
        
        // Reset retry counters for failed steps
        for (const stepName of this.failedSteps) {
            this.retryAttempts.delete(stepName);
        }

        // Clear failed steps
        this.failedSteps.clear();

        // Re-run initialization
        return await this.initialize();
    }
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Create global instance
    window.smsInitializer = new SmsInitializer();
    
    // Auto-start initialization after a short delay to allow all modules to load
    setTimeout(() => {
        if (window.smsInitializer) {
            window.smsInitializer.initialize().then(result => {
                if (result.success) {
                    console.log('SMS Core system initialization completed successfully');
                } else {
                    console.error('SMS Core system initialization completed with errors:', result);
                }
            }).catch(error => {
                console.error('SMS Core system initialization failed:', error);
            });
        }
    }, 1000);
    
    console.log('SMS Initializer created and scheduled for auto-start');
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmsInitializer;
}
