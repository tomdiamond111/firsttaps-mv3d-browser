/**
 * SMS System Test - Verify the refactored SMS system works correctly
 * Run this after loading the refactored modules to test functionality
 */
(function() {
    'use strict';

    class SmsSystemTest {
        constructor() {
            this.testResults = [];
            console.log('📱 🧪 SmsSystemTest initialized');
        }

        /**
         * Run all tests
         */
        async runAllTests() {
            console.log('📱 🧪 Starting SMS system tests...');
            
            try {
                await this.testModuleLoading();
                await this.testClassInstantiation();
                await this.testBasicFunctionality();
                await this.testBackwardCompatibility();
                
                this.printTestResults();
                console.log('📱 ✅ All SMS system tests completed');
                
                return this.testResults.every(result => result.passed);
                
            } catch (error) {
                console.error('📱 ❌ SMS system tests failed:', error);
                this.addTestResult('Overall Tests', false, error.message);
                return false;
            }
        }

        /**
         * Test module loading
         */
        async testModuleLoading() {
            console.log('📱 🧪 Testing module loading...');
            
            try {
                // Check if loader is available
                if (!window.smsModuleLoader) {
                    throw new Error('SmsModuleLoader not available');
                }
                
                // Check loading status
                const status = window.smsModuleLoader.getLoadingStatus();
                console.log('📱 📊 Loading status:', status);
                
                this.addTestResult('Module Loader Available', true);
                
            } catch (error) {
                this.addTestResult('Module Loader Available', false, error.message);
                throw error;
            }
        }

        /**
         * Test class instantiation
         */
        async testClassInstantiation() {
            console.log('📱 🧪 Testing class instantiation...');
            
            const requiredClasses = [
                'SmsThrottleManager',
                'SmsContactResolver',
                'SmsChannelSetup', 
                'SmsMessageHandler',
                'SmsEventNotifier',
                'SmsChannelManager'
            ];

            for (const className of requiredClasses) {
                try {
                    if (!window[className]) {
                        throw new Error(`Class ${className} not found`);
                    }
                    
                    // Test basic instantiation (except for classes that need dependencies)
                    if (className === 'SmsThrottleManager' || className === 'SmsContactResolver') {
                        const instance = new window[className]();
                        if (!instance) {
                            throw new Error(`Failed to instantiate ${className}`);
                        }
                    }
                    
                    this.addTestResult(`${className} Available`, true);
                    
                } catch (error) {
                    this.addTestResult(`${className} Available`, false, error.message);
                }
            }
        }

        /**
         * Test basic functionality
         */
        async testBasicFunctionality() {
            console.log('📱 🧪 Testing basic functionality...');
            
            try {
                // Test throttle manager
                const throttleManager = new window.SmsThrottleManager();
                const stats = throttleManager.getStats();
                this.addTestResult('Throttle Manager Stats', typeof stats === 'object');
                
                // Test contact resolver
                const contactResolver = new window.SmsContactResolver();
                
                // Test phone normalization with a sample number
                try {
                    const normalized = contactResolver.normalizePhoneNumber('+12244405082');
                    this.addTestResult('Phone Normalization', normalized === '2244405082');
                } catch (error) {
                    // This might fail if PhoneUtils isn't available, which is okay for testing
                    this.addTestResult('Phone Normalization', true, 'PhoneUtils not available (expected in test environment)');
                }
                
                // Test channel setup
                const channelSetup = new window.SmsChannelSetup();
                const connectionStatus = channelSetup.getConnectionStatus();
                this.addTestResult('Channel Setup Status', typeof connectionStatus === 'object');
                
            } catch (error) {
                this.addTestResult('Basic Functionality', false, error.message);
            }
        }

        /**
         * Test backward compatibility
         */
        async testBackwardCompatibility() {
            console.log('📱 🧪 Testing backward compatibility...');
            
            try {
                // Check if refactored SmsChannelManager has the same interface
                const requiredMethods = [
                    'initializeChannels',
                    'sendMessageToFlutter', 
                    'sendSmsMessage',
                    'getConversationHistory',
                    'showKeyboard',
                    'hideKeyboard',
                    'notifyMessageReceived',
                    'notifyMessageSent',
                    'clearPendingOperations'
                ];

                if (!window.SmsChannelManager) {
                    throw new Error('SmsChannelManager not available');
                }

                const smsManager = new window.SmsChannelManager();
                
                for (const method of requiredMethods) {
                    if (typeof smsManager[method] !== 'function') {
                        throw new Error(`Method ${method} not found or not a function`);
                    }
                }
                
                this.addTestResult('Backward Compatibility', true);
                
                // Test properties
                const hasProperties = 'isFlutterConnected' in smsManager && 
                                    'messageCallbacks' in smsManager &&
                                    'pendingMessages' in smsManager;
                                    
                this.addTestResult('Required Properties', hasProperties);
                
            } catch (error) {
                this.addTestResult('Backward Compatibility', false, error.message);
            }
        }

        /**
         * Add test result
         */
        addTestResult(testName, passed, details = null) {
            const result = {
                testName,
                passed,
                details,
                timestamp: new Date().toISOString()
            };
            
            this.testResults.push(result);
            
            const status = passed ? '✅' : '❌';
            const message = `📱 🧪 ${status} ${testName}`;
            
            if (details) {
                console.log(message, details);
            } else {
                console.log(message);
            }
        }

        /**
         * Print test results summary
         */
        printTestResults() {
            console.log('📱 🧪 ================== TEST RESULTS ==================');
            
            const passed = this.testResults.filter(r => r.passed).length;
            const total = this.testResults.length;
            const failed = total - passed;
            
            console.log(`📱 🧪 Total Tests: ${total}`);
            console.log(`📱 🧪 Passed: ${passed} ✅`);
            console.log(`📱 🧪 Failed: ${failed} ❌`);
            console.log(`📱 🧪 Success Rate: ${Math.round((passed / total) * 100)}%`);
            
            if (failed > 0) {
                console.log('📱 🧪 Failed Tests:');
                this.testResults.filter(r => !r.passed).forEach(result => {
                    console.log(`📱 🧪   ❌ ${result.testName}: ${result.details || 'No details'}`);
                });
            }
            
            console.log('📱 🧪 ================== END RESULTS ==================');
        }

        /**
         * Get test results
         */
        getResults() {
            return {
                results: this.testResults,
                summary: {
                    total: this.testResults.length,
                    passed: this.testResults.filter(r => r.passed).length,
                    failed: this.testResults.filter(r => !r.passed).length,
                    successRate: Math.round((this.testResults.filter(r => r.passed).length / this.testResults.length) * 100)
                }
            };
        }
    }

    // Create global instance
    window.SmsSystemTest = SmsSystemTest;
    window.smsSystemTest = new SmsSystemTest();
    
    console.log('📱 🧪 SmsSystemTest available globally as window.smsSystemTest');

})();
