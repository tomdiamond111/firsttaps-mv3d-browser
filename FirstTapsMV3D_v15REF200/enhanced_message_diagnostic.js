/**
 * ENHANCED MESSAGE DISPLAY DIAGNOSTIC
 * Specifically targeting the "Got 1132" message display issue
 */

console.clear();
console.log('🎯 ENHANCED MESSAGE DISPLAY DIAGNOSTIC - Targeting "Got 1132" Issue');

// Function to monitor message processing in real-time
function startMessageMonitoring() {
    console.log('\n📡 Starting real-time message monitoring...');
    
    // Hook into the message processing functions
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Track message-related logs
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('Got 1132') || 
            message.includes('Processing 100 messages') ||
            message.includes('renderMessages') ||
            message.includes('updateMessages') ||
            message.includes('contact 357')) {
            originalConsoleLog('🎯 [MONITORED]', ...args);
        } else {
            originalConsoleLog(...args);
        }
    };
    
    console.error = function(...args) {
        const message = args.join(' ');
        if (message.includes('Got 1132') || 
            message.includes('renderMessages') ||
            message.includes('SMS SCREEN')) {
            originalConsoleError('🎯 [MONITORED ERROR]', ...args);
        } else {
            originalConsoleError(...args);
        }
    };
    
    console.warn = function(...args) {
        const message = args.join(' ');
        if (message.includes('Got 1132') || 
            message.includes('Processing') ||
            message.includes('MESSAGE_RECEIVED')) {
            originalConsoleWarn('🎯 [MONITORED WARN]', ...args);
        } else {
            originalConsoleWarn(...args);
        }
    };
    
    // Store original functions for restoration
    window.originalConsole = {
        log: originalConsoleLog,
        error: originalConsoleError,
        warn: originalConsoleWarn
    };
}

// Function to check message array integrity
function checkMessageArrayIntegrity() {
    console.log('\n🔬 CHECKING MESSAGE ARRAY INTEGRITY...');
    
    if (window.app?.contactManager?.contacts) {
        for (const [id, contact] of window.app.contactManager.contacts) {
            if (contact.smsScreen?.messages) {
                const messages = contact.smsScreen.messages;
                console.log(`\n📱 Contact ${id} - ${contact.contactData?.name}:`);
                console.log(`  Total messages: ${messages.length}`);
                
                // Check for duplicates
                const textCounts = {};
                messages.forEach(msg => {
                    textCounts[msg.text] = (textCounts[msg.text] || 0) + 1;
                });
                
                const duplicates = Object.entries(textCounts).filter(([text, count]) => count > 1);
                if (duplicates.length > 0) {
                    console.log(`  ⚠️  Duplicate messages found:`, duplicates);
                }
                
                // Check for "Got 1132" specifically
                const got1132Messages = messages.filter(msg => msg.text && msg.text.includes('Got 1132'));
                console.log(`  🎯 "Got 1132" messages: ${got1132Messages.length}`);
                if (got1132Messages.length > 0) {
                    got1132Messages.forEach((msg, idx) => {
                        console.log(`    ${idx + 1}. Type: ${msg.type}, Text: "${msg.text}", Time: ${new Date(msg.timestamp).toLocaleString()}`);
                    });
                }
                
                // Check message types distribution
                const typeCounts = {};
                messages.forEach(msg => {
                    typeCounts[msg.type] = (typeCounts[msg.type] || 0) + 1;
                });
                console.log(`  📊 Message types:`, typeCounts);
                
                // Check recent messages (last 5)
                const recentMessages = messages.slice(-5);
                console.log(`  📝 Last 5 messages:`);
                recentMessages.forEach((msg, idx) => {
                    const timeStr = new Date(msg.timestamp).toLocaleTimeString();
                    console.log(`    ${recentMessages.length - idx}. [${msg.type}] "${msg.text}" (${timeStr})`);
                });
            }
        }
    }
}

// Function to check rendering pipeline step by step
function checkRenderingPipeline() {
    console.log('\n🎨 CHECKING RENDERING PIPELINE...');
    
    if (window.app?.contactManager?.contacts) {
        for (const [id, contact] of window.app.contactManager.contacts) {
            if (contact.smsScreen?.isVisible) {
                console.log(`\n🖼️  Contact ${id} Rendering Pipeline:`);
                
                // Check if renderInterface exists and is callable
                console.log(`  ✓ renderInterface function: ${typeof contact.smsScreen.renderInterface}`);
                console.log(`  ✓ renderMessages function: ${typeof contact.smsScreen.renderMessages}`);
                console.log(`  ✓ updateMessages function: ${typeof contact.smsScreen.updateMessages}`);
                
                // Check canvas and context
                console.log(`  ✓ canvas: ${!!contact.smsScreen.canvas}`);
                console.log(`  ✓ context: ${!!contact.smsScreen.context}`);
                console.log(`  ✓ texture: ${!!contact.smsScreen.texture}`);
                
                if (contact.smsScreen.canvas) {
                    console.log(`  📐 Canvas size: ${contact.smsScreen.canvas.width}x${contact.smsScreen.canvas.height}`);
                }
                
                // Check throttling state
                console.log(`  ⏱️  Throttling state:`);
                console.log(`    - isRendering: ${contact.smsScreen.isRendering}`);
                console.log(`    - lastRenderTime: ${contact.smsScreen.lastRenderTime}`);
                console.log(`    - renderThrottleMs: ${contact.smsScreen.renderThrottleMs}`);
                console.log(`    - renderThrottleDelay: ${contact.smsScreen.renderThrottleDelay}`);
                
                // Check if we can trigger a render
                try {
                    console.log(`  🎨 Attempting manual render...`);
                    contact.smsScreen.renderInterface(true); // bypass throttling
                    console.log(`  ✅ Manual render completed`);
                } catch (error) {
                    console.log(`  ❌ Manual render failed:`, error.message);
                }
            }
        }
    }
}

// Function to inject a test message and trace its rendering
function injectAndTraceMessage() {
    console.log('\n💉 INJECTING TEST MESSAGE AND TRACING...');
    
    const contactId = '357'; // Based on user's logs
    const contact = window.app?.contactManager?.contacts?.get(contactId);
    
    if (!contact?.smsScreen) {
        console.log(`❌ No contact or SMS screen for ID: ${contactId}`);
        return;
    }
    
    const testMessage = {
        text: 'Got 1132 - DIAGNOSTIC TEST',
        type: 'received',
        timestamp: new Date().toISOString(),
        id: `diagnostic_${Date.now()}`,
        contactId: contactId
    };
    
    console.log(`📝 Injecting test message:`, testMessage);
    
    // Add message to array
    if (!contact.smsScreen.messages) {
        contact.smsScreen.messages = [];
    }
    
    const beforeCount = contact.smsScreen.messages.length;
    contact.smsScreen.messages.push(testMessage);
    const afterCount = contact.smsScreen.messages.length;
    
    console.log(`📊 Message count: ${beforeCount} → ${afterCount}`);
    
    // Force render with tracing
    console.log(`🎨 Forcing render with trace...`);
    
    // Hook renderMessages to see what gets rendered
    const originalRenderMessages = contact.smsScreen.renderMessages;
    contact.smsScreen.renderMessages = function(ctx) {
        console.log(`🎨 renderMessages called with ${this.messages.length} messages`);
        
        // Check if our test message is in the array
        const hasTestMessage = this.messages.some(msg => msg.text && msg.text.includes('DIAGNOSTIC TEST'));
        console.log(`🎯 Test message in array: ${hasTestMessage}`);
        
        if (hasTestMessage) {
            const testMsg = this.messages.find(msg => msg.text && msg.text.includes('DIAGNOSTIC TEST'));
            console.log(`🎯 Test message details:`, testMsg);
        }
        
        // Call original function
        const result = originalRenderMessages.call(this, ctx);
        
        // Restore original function
        contact.smsScreen.renderMessages = originalRenderMessages;
        
        return result;
    };
    
    // Trigger render
    contact.smsScreen.renderInterface(true);
    
    if (contact.smsScreen.texture) {
        contact.smsScreen.texture.needsUpdate = true;
    }
    
    console.log(`✅ Test message injection and tracing completed`);
}

// Function to check Flutter bridge communication
function checkFlutterBridge() {
    console.log('\n🌉 CHECKING FLUTTER BRIDGE COMMUNICATION...');
    
    // Check if smsEventRouter exists
    console.log(`✓ smsEventRouter: ${!!window.smsEventRouter}`);
    
    if (window.smsEventRouter) {
        console.log(`✓ handleSmsDataDirectly: ${typeof window.smsEventRouter.handleSmsDataDirectly}`);
        console.log(`✓ handleSmsDataResponse: ${typeof window.smsEventRouter.handleSmsDataResponse}`);
    }
    
    // Check for flutter channel
    console.log(`✓ Flutter channel available: ${!!window.flutter_inappwebview}`);
    
    // Check event listeners
    console.log(`\n📡 Checking event listeners...`);
    
    // Try to trigger a manual message fetch
    if (window.smsEventRouter && typeof window.smsEventRouter.requestMessagesForContact === 'function') {
        console.log(`📨 Attempting to fetch messages for contact 357...`);
        try {
            window.smsEventRouter.requestMessagesForContact('357');
            console.log(`✅ Message request sent`);
        } catch (error) {
            console.log(`❌ Message request failed:`, error.message);
        }
    }
}

// Function to completely disable all throttling and force render
async function forceRenderWithoutThrottling() {
    console.log('\n🚫 COMPLETELY DISABLING ALL THROTTLING AND FORCING RENDER...');
    
    if (window.app?.contactManager?.contacts) {
        for (const [id, contact] of window.app.contactManager.contacts) {
            if (contact.smsScreen?.isVisible) {
                console.log(`\n⚡ Contact ${id}: FORCING RENDER WITHOUT ANY THROTTLING`);
                
                const smsScreen = contact.smsScreen;
                
                // COMPLETELY DISABLE ALL THROTTLING
                smsScreen.lastRenderTime = 0;
                smsScreen.renderThrottleMs = 0;
                smsScreen.renderThrottleDelay = 0;
                smsScreen.isRendering = false;
                
                // Clear any pending timeouts
                if (smsScreen.renderThrottleTimeout) {
                    clearTimeout(smsScreen.renderThrottleTimeout);
                    smsScreen.renderThrottleTimeout = null;
                }
                
                console.log(`  🔧 All throttling disabled for contact ${id}`);
                console.log(`  📊 Messages to render: ${smsScreen.messages?.length || 0}`);
                
                // Check for "Got 1133" message specifically
                if (smsScreen.messages) {
                    const got1133 = smsScreen.messages.find(msg => 
                        msg.text && (msg.text.includes('Got 1133') || msg.text.includes('Got 1132'))
                    );
                    if (got1133) {
                        console.log(`  🎯 FOUND TARGET MESSAGE: "${got1133.text}" (type: ${got1133.type})`);
                    } else {
                        console.log(`  ❌ Target message not found in ${smsScreen.messages.length} messages`);
                        // Show last few messages for context
                        const lastMessages = smsScreen.messages.slice(-3);
                        console.log(`  📝 Last 3 messages:`, lastMessages.map(m => `[${m.type}] "${m.text}"`));
                    }
                }
                
                // Force scroll to bottom to ensure latest messages are visible
                if (smsScreen.calculateScrollBounds && smsScreen.context) {
                    const headerHeight = 240;
                    const inputHeight = 100;
                    const messageAreaHeight = smsScreen.canvasHeight - headerHeight - inputHeight;
                    
                    smsScreen.calculateScrollBounds(smsScreen.context, messageAreaHeight);
                    smsScreen.scrollOffset = smsScreen.maxScrollOffset || 0;
                    console.log(`  📜 Forced scroll to bottom: ${smsScreen.scrollOffset}`);
                }
                
                // FORCE MULTIPLE RENDERS to ensure it takes
                console.log(`  🎨 Forcing multiple renders...`);
                for (let i = 0; i < 3; i++) {
                    try {
                        smsScreen.renderInterface(true); // bypass throttling
                        if (smsScreen.texture) {
                            smsScreen.texture.needsUpdate = true;
                        }
                        console.log(`    ✅ Render ${i + 1} completed`);
                    } catch (error) {
                        console.log(`    ❌ Render ${i + 1} failed:`, error.message);
                    }
                    
                    // Small delay between renders
                    if (i < 2) {
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                }
                
                console.log(`  ✅ Force render sequence completed for contact ${id}`);
            }
        }
    }
}

// Function to search for specific message patterns
function searchForMessagePatterns() {
    console.log('\n🔍 SEARCHING FOR MESSAGE PATTERNS...');
    
    const patterns = ['Got 1133', 'Got 1132', '1133', '1132'];
    
    if (window.app?.contactManager?.contacts) {
        for (const [id, contact] of window.app.contactManager.contacts) {
            if (contact.smsScreen?.messages) {
                console.log(`\n📱 Contact ${id} - ${contact.contactData?.name}:`);
                console.log(`  Total messages: ${contact.smsScreen.messages.length}`);
                
                patterns.forEach(pattern => {
                    const matches = contact.smsScreen.messages.filter(msg => 
                        msg.text && msg.text.includes(pattern)
                    );
                    if (matches.length > 0) {
                        console.log(`  🎯 Pattern "${pattern}": ${matches.length} matches`);
                        matches.forEach((msg, idx) => {
                            console.log(`    ${idx + 1}. [${msg.type}] "${msg.text}" (${new Date(msg.timestamp).toLocaleString()})`);
                        });
                    } else {
                        console.log(`  ❌ Pattern "${pattern}": No matches`);
                    }
                });
                
                // Show message type distribution
                const typeCounts = {};
                contact.smsScreen.messages.forEach(msg => {
                    typeCounts[msg.type] = (typeCounts[msg.type] || 0) + 1;
                });
                console.log(`  📊 Message types:`, typeCounts);
            }
        }
    }
}

// Master diagnostic function
function runFullDiagnostic() {
    console.log('\n🔍 RUNNING FULL MESSAGE DISPLAY DIAGNOSTIC...');
    
    searchForMessagePatterns();
    checkMessageArrayIntegrity();
    checkRenderingPipeline();
    checkFlutterBridge();
    
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('Use these functions for targeted debugging:');
    console.log('  messageDebug.forceRenderWithoutThrottling() - FORCE RENDER (disable all throttling)');
    console.log('  messageDebug.searchForMessagePatterns() - Search for specific message patterns');
    console.log('  messageDebug.injectAndTraceMessage() - Inject test message and trace rendering');
    console.log('  messageDebug.startMessageMonitoring() - Monitor all message-related logs');
    console.log('  messageDebug.checkMessageArrayIntegrity() - Check message data integrity');
    console.log('  messageDebug.checkRenderingPipeline() - Check rendering system');
}

// Export functions
window.messageDebug = {
    startMessageMonitoring,
    checkMessageArrayIntegrity,
    checkRenderingPipeline,
    injectAndTraceMessage,
    checkFlutterBridge,
    forceRenderWithoutThrottling,
    searchForMessagePatterns,
    runFullDiagnostic
};

// Auto-run diagnostic after delay
setTimeout(() => {
    console.log('\n🚀 AUTO-RUNNING ENHANCED DIAGNOSTIC...');
    runFullDiagnostic();
}, 3000);
