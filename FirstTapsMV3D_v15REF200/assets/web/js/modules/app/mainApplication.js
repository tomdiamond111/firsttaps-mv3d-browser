// modules/app/mainApplication.js
// Dependencies: THREE (global), window.SharedStateManager, window.ObjectCreator, window.ObjectPositioner, 
//              window.InteractionManager, window.BillboardManager, window.InputManager, world template classes
// Exports: window.WindowWorldApp

(function() {
    'use strict';
    
    console.log("Loading MainApplication module...");
    
    // ============================================================================
    // MAIN WINDOW WORLD APPLICATION CLASS
    // ============================================================================
    class WindowWorldApp {
        constructor() {
            this.THREE = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.clock = null;
            this.cameraControls = null;
            this.groundLevelY = 0;
            
            // Green plane dimensions - single source of truth
            // WORLD BOUNDARY SYSTEM: All world templates now use consistent 300-unit boundaries (±150)
            // This prevents conflicts when switching between worlds and ensures consistent object placement
            // GreenPlaneWorld: Visual green plane AND logical boundaries both use this size
            // SpaceWorld: Logical boundaries use ±150 (no visual plane, just star field)
            // OceanWorld: Logical boundaries use ±150 (no visual plane, just ocean background)
            // Future: Could make this user-configurable through advanced options menu
            this.GREEN_PLANE_SIZE = 300; // 300x300 units green plane (matches logical boundaries)
            
            // World template system
            this.currentWorldTemplate = null;
            
            this.stateManager = new SharedStateManager();
            this.objectCreator = null;
            this.objectPositioner = new ObjectPositioner();
            this.interactionManager = null;
            this.billboardManager = null;
            this.fileObjectManager = null; // File object management
            this.backupRestoreManager = null; // Backup/restore functionality
            this.sortingManager = null; // 3D world sorting system
            this.searchManager = null; // Search functionality
            this.virtualObjectManager = null; // Virtual objects (apps, URLs, etc.)
            this.deletedObjectsBackup = new Map(); // Store complete visual state of deleted objects
            
            // CRITICAL: Loop prevention flags
            this.isProcessingVisuals = false;
            this.processedTextureObjects = new Set();
            this.lastVisualsUpdate = 0;
            this.visualsUpdateInterval = 100;
            
            // Debug manager for development and testing functions
            this.debugManager = null;
            
            // AXIS SELECTION SYSTEM: Movement axis tracking
            this.selectedMoveAxis = null; // 'XY', 'X', 'Y', 'Z' or null
            
            // ORIENTATION TRACKING: For dynamic camera control adjustments
            this.orientationListenerAdded = false;
            this.resizeTimeout = null;
            
            // Initialize world manager EARLY (before setupScene)
            this.worldManager = new AppWorldManager(this);
            
            // Initialize camera manager EARLY (before setupScene)
            this.cameraManager = new AppCameraManager(this);

            // Initialize camera focus manager
            this.cameraFocusManager = null; // Will be initialized in setupObjects
            
            this.isInitialized = false;
        }

        initialize(THREE_CDN) {
            console.log('=== INITIALIZE METHOD STARTING ===');
            this.THREE = THREE_CDN;
            CameraControls.install({ THREE: this.THREE });

            console.log('About to call setupScene()...');
            this.setupScene();
            console.log('setupScene() completed, about to call setupObjects()...');
            this.setupObjects();
            console.log('setupObjects() completed, about to call setupGlobalFunctions()...');
            this.setupGlobalFunctions();
            console.log('setupGlobalFunctions() completed, about to call startAnimationLoop()...');
            this.startAnimationLoop();
            
            this.isInitialized = true;
            console.log('=== INITIALIZE METHOD COMPLETED ===');
        }
        
        setupScene() {
            console.log('=== SETTING UP SCENE - BULLETPROOF INITIALIZATION ===');
            
            // Step 1: Core Three.js Components
            console.log('Step 1: Creating core Three.js components...');
            this.scene = new this.THREE.Scene();
            
            this.camera = new this.THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.1, 
                1000
            );

            this.renderer = new this.THREE.WebGLRenderer({ antialias: true });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.shadowMap.enabled = true;
            document.body.appendChild(this.renderer.domElement);

            // Step 2: Lighting Setup
            console.log('Step 2: Setting up lighting...');
            const ambientLight = new this.THREE.AmbientLight(0xffffff, 0.7);
            this.scene.add(ambientLight);

            const directionalLight = new this.THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 10, 7.5);
            directionalLight.castShadow = true;
            this.scene.add(directionalLight);
            
            // Step 3: Initialize Global Poster System (BEFORE world templates)
            console.log('Step 3: Initializing global poster system...');
            this.initializeGlobalPosterSystem();
            
            // Step 4: Initialize World Template System
            console.log('Step 4: Initializing world template system...');
            
            // Check if we have a saved world preference from Flutter
            let initialWorldType = 'green-plane';
            console.log('🌍 [INIT] Checking for saved world preference...');
            
            // First, check if Flutter set an initial world preference
            if (window.initialWorldPreference && window.initialWorldPreference !== 'green-plane') {
                initialWorldType = window.initialWorldPreference;
                console.log(`🌍 [INIT] Using Flutter world preference: ${initialWorldType}`);
            } else {
                // Try to get saved world preference from localStorage as fallback
                try {
                    const savedWorld = localStorage.getItem('last_world_template');
                    if (savedWorld && ['dazzle', 'christmas', 'space', 'ocean', 'forest', 'cave'].includes(savedWorld)) {
                        initialWorldType = savedWorld;
                        console.log(`🌍 [INIT] Found saved world preference in localStorage: ${savedWorld}`);
                    } else {
                        console.log('🌍 [INIT] No saved world preference found, using green-plane');
                    }
                } catch (e) {
                    console.log('🌍 [INIT] Could not access localStorage for world preference:', e);
                }
            }
            
            console.log(`🌍 [INIT] Initializing with world type: ${initialWorldType}`);
            this.initializeWorldTemplate(initialWorldType);
            
            // Validate world template was created successfully
            if (!this.currentWorldTemplate) {
                console.error('CRITICAL: World template failed to initialize!');
                throw new Error('World template initialization failed');
            }
            console.log('World template initialized successfully:', this.currentWorldTemplate.getType());
            
            // Step 4: Setup Camera System with Bulletproof Initialization
            console.log('Step 4: Setting up bulletproof camera system...');
            this.initializeCameraSystem();
            
            // Step 5: Setup Global References (after everything is ready)
            console.log('Step 5: Setting up global references...');
            this.setupGlobalReferences();
            
            console.log('=== SCENE SETUP COMPLETED SUCCESSFULLY ===');
        }

        /**
         * Initialize Global Poster System
         * This must be called BEFORE any world template initialization to ensure
         * the poster manager is available when worlds create their posters.
         */
        initializeGlobalPosterSystem() {
            console.log('🖼️ Initializing global poster system...');
            
            try {
                // Check if PosterSystemInitializer is available
                if (typeof PosterSystemInitializer !== 'undefined') {
                    const posterManager = PosterSystemInitializer.initialize();
                    
                    if (posterManager) {
                        console.log('✅ Global poster system initialized successfully');
                        
                        // Store reference for app use
                        this.posterManager = posterManager;
                    } else {
                        console.warn('⚠️ Poster manager initialization returned null');
                    }
                } else {
                    console.warn('⚠️ PosterSystemInitializer not available - posters may not work correctly');
                }
            } catch (error) {
                console.error('❌ Failed to initialize global poster system:', error);
            }
        }

        /**
         * Bulletproof camera system initialization with error recovery
         */
        initializeCameraSystem() {
            console.log('--- INITIALIZING CAMERA SYSTEM ---');
            
            try {
                // Step 4.1: Create clock and camera controls
                console.log('Creating clock and camera controls...');
                this.clock = new this.THREE.Clock();
                this.cameraControls = new CameraControls(this.camera, this.renderer.domElement);
                
                // Validate camera controls were created
                if (!this.cameraControls) {
                    throw new Error('Camera controls failed to create');
                }
                
                // Step 4.2: Get world template positions with validation
                console.log('Getting world template positions...');
                const homePosition = this.currentWorldTemplate.getHomeViewPosition();
                const homeTarget = this.currentWorldTemplate.getHomeViewTarget();
                
                // Validate positions are valid
                if (!homePosition || typeof homePosition.x !== 'number' || 
                    typeof homePosition.y !== 'number' || typeof homePosition.z !== 'number') {
                    throw new Error('Invalid home position from world template');
                }
                
                if (!homeTarget || typeof homeTarget.x !== 'number' || 
                    typeof homeTarget.y !== 'number' || typeof homeTarget.z !== 'number') {
                    throw new Error('Invalid home target from world template');
                }
                
                console.log('Home position:', homePosition);
                console.log('Home target:', homeTarget);
                
                // Step 4.3: Set camera position with bulletproof approach
                console.log('Setting camera position and target...');
                this.setCameraPositionBulletproof(homePosition, homeTarget);
                
                // Step 4.4: Apply world-specific camera constraints
                console.log('Applying world-specific camera constraints...');
                this.currentWorldTemplate.applyCameraConstraints(this.cameraControls);
                
                // Step 4.4b: Apply mobile-specific optimizations
                console.log('Applying mobile camera optimizations...');
                this.optimizeCameraForMobile();
                
                // Step 4.4c: Apply landscape-aware camera control settings
                console.log('Applying landscape-aware camera controls...');
                this.applyLandscapeAwareCameraControls();
                
                // Step 4.4d: Setup orientation listeners for dynamic adjustment
                console.log('Setting up orientation listeners...');
                this.setupOrientationListeners();
                
                // Step 4.5: Setup camera monitoring with error handling
                console.log('Setting up camera monitoring...');
                this.cameraControls.addEventListener('control', () => {
                    try {
                        if (this.currentWorldTemplate && this.camera && this.cameraControls) {
                            this.currentWorldTemplate.restrictCameraPosition(this.camera, this.cameraControls);
                        }
                    } catch (error) {
                        console.warn('Camera position restriction error (non-critical):', error);
                    }
                });
                
                // Step 4.6: Final validation
                this.validateCameraSystem();
                console.log('Camera system initialized successfully');
                
            } catch (error) {
                console.error('Camera system initialization failed:', error);
                this.recoverCameraSystem();
            }
        }

        /**
         * Bulletproof camera position setting with multiple validation steps
         */
        setCameraPositionBulletproof(homePosition, homeTarget) {
            console.log('--- SETTING CAMERA POSITION (BULLETPROOF) ---');
            
            try {
                // Method 1: Direct camera position setting
                console.log('Method 1: Setting direct camera position...');
                this.camera.position.set(homePosition.x, homePosition.y, homePosition.z);
                this.camera.lookAt(homeTarget.x, homeTarget.y, homeTarget.z);
                this.camera.updateProjectionMatrix();
                
                // Method 2: Camera controls target setting
                console.log('Method 2: Setting camera controls target...');
                this.cameraControls.setTarget(homeTarget.x, homeTarget.y, homeTarget.z, false);
                
                // Method 3: Verify position was set correctly
                console.log('Method 3: Verifying position was set...');
                const actualPos = this.camera.position;
                const positionDiff = Math.abs(actualPos.x - homePosition.x) + 
                                   Math.abs(actualPos.y - homePosition.y) + 
                                   Math.abs(actualPos.z - homePosition.z);
                
                if (positionDiff > 0.01) {
                    console.warn('Camera position verification failed, attempting correction...');
                    // Force position again
                    this.camera.position.copy(homePosition);
                    this.camera.updateProjectionMatrix();
                }
                
                console.log('Final camera position:', this.camera.position);
                console.log('Camera position set successfully');
                
            } catch (error) {
                console.error('Failed to set camera position:', error);
                throw error;
            }
        }

        /**
         * Validate that the camera system is working correctly
         */
        validateCameraSystem() {
            console.log('--- VALIDATING CAMERA SYSTEM ---');
            
            const validationErrors = [];
            
            // Check camera
            if (!this.camera) validationErrors.push('Camera is null');
            if (!this.camera.position) validationErrors.push('Camera position is null');
            
            // Check camera controls
            if (!this.cameraControls) validationErrors.push('CameraControls is null');
            if (typeof this.cameraControls.enabled !== 'boolean') validationErrors.push('CameraControls.enabled is invalid');
            
            // Check clock
            if (!this.clock) validationErrors.push('Clock is null');
            
            // Check world template integration
            if (!this.currentWorldTemplate) validationErrors.push('World template is null');
            
            if (validationErrors.length > 0) {
                console.error('Camera system validation failed:', validationErrors);
                throw new Error('Camera system validation failed: ' + validationErrors.join(', '));
            }
            
            console.log('Camera system validation passed');
        }

        /**
         * Recovery system for camera initialization failures
         */
        recoverCameraSystem() {
            console.log('--- ATTEMPTING CAMERA SYSTEM RECOVERY ---');
            
            try {
                // Emergency fallback initialization
                console.log('Using emergency fallback settings...');
                
                // Create minimal working camera controls
                if (!this.clock) this.clock = new this.THREE.Clock();
                if (!this.cameraControls) {
                    this.cameraControls = new CameraControls(this.camera, this.renderer.domElement);
                }
                
                // Use safe fallback positions
                const fallbackPosition = { x: 0, y: 8, z: 15 };
                const fallbackTarget = { x: 0, y: 0, z: 0 };
                
                this.camera.position.set(fallbackPosition.x, fallbackPosition.y, fallbackPosition.z);
                this.camera.lookAt(fallbackTarget.x, fallbackTarget.y, fallbackTarget.z);
                this.camera.updateProjectionMatrix();
                this.cameraControls.setTarget(fallbackTarget.x, fallbackTarget.y, fallbackTarget.z, false);
                
                // Apply basic constraints
                this.cameraControls.minDistance = 1.0;
                this.cameraControls.maxDistance = 200.0;
                this.cameraControls.enableRotate = true;
                this.cameraControls.enablePan = true;
                this.cameraControls.enableZoom = true;
                this.cameraControls.enabled = true;
                
                console.log('Camera system recovery completed');
                
            } catch (recoveryError) {
                console.error('Camera system recovery failed:', recoveryError);
                throw new Error('Complete camera system failure - unable to recover');
            }
        }

        optimizeCameraForMobile() {
            return this.cameraManager.optimizeCameraForMobile();
        }

        /**
         * Setup global references after everything is properly initialized
         */
        setupGlobalReferences() {
            console.log('--- SETTING UP GLOBAL REFERENCES ---');
            
            // Set global references for helper functions
            window.scene = this.scene;
            window.camera = this.camera;
            window.controls = this.cameraControls;
            window.stateManager = this.stateManager;
            window.app = this;

            // Initialize Forest World Integration System
            if (window.forestIntegration) {
                window.forestIntegration.initialize(this);
                console.log('🌲 Forest World Integration system initialized');
            } else {
                console.warn('🌲 ForestWorldIntegration not available - forest features disabled');
            }

            // Initialize Furniture Manager System
            console.log('🪑 EXPLICIT: Checking for FurnitureManager class...');
            
            // CRITICAL: Define triggerFurnitureCreation EARLY so Dart can call it immediately
            // It will queue the request and execute when FurnitureManager is ready
            let furnitureManagerReady = false;
            let pendingFurnitureCreation = false;
            
            window.triggerFurnitureCreation = async () => {
                console.log('🪑 Dart called triggerFurnitureCreation()');
                
                if (!furnitureManagerReady) {
                    console.log('🪑 FurnitureManager not ready yet - queuing request');
                    pendingFurnitureCreation = true;
                    return;
                }
                
                console.log('🪑 FurnitureManager ready - creating furniture now!');
                
                if (!this.furnitureManager || !window.DefaultFurnitureSpawner) {
                    console.error('🪑 Cannot create furniture - missing dependencies');
                    return;
                }
                
                const spawner = new window.DefaultFurnitureSpawner(this.furnitureManager, this);
                
                const isFirstInstall = await spawner.isFirstInstall();
                const hasDemoContent = await spawner.hasDemoFiles();
                const furnitureCount = this.furnitureManager?.storageManager?.furniture?.size || 0;
                
                console.log(`🪑 Status check: firstInstall=${isFirstInstall}, hasDemoContent=${hasDemoContent}, furnitureCount=${furnitureCount}`);
                
                // RECOVERY: If furniture count is 0, treat as first install regardless of marker
                if (isFirstInstall || furnitureCount === 0) {
                    // FIRST INSTALL: Create furniture + demo content
                    console.log('🪑 ========== FIRST INSTALL DETECTED ==========');
                    if (furnitureCount === 0 && !isFirstInstall) {
                        console.log('🪑 ⚠️ RECOVERY MODE: Clearing stale marker, furniture count is 0');
                        localStorage.removeItem('mv3d_default_furniture_created');
                    }
                    spawner.runFirstInstallSetup().catch(error => {
                        console.error('🪑 First install setup failed:', error);
                    });
                } else if (!hasDemoContent) {
                    // SUBSEQUENT LOAD BUT NO DEMO CONTENT: Populate furniture with demo content
                    console.log('🪑 ========== SUBSEQUENT LOAD - DEMO CONTENT MISSING ==========');
                    console.log('🪑 Demo content should persist but was not found - recreating...');
                    spawner.populateFurnitureWithDemoContent().catch(error => {
                        console.error('🪑 Demo content recreation failed:', error);
                    });
                } else {
                    // SUBSEQUENT LOAD WITH DEMO CONTENT: Check for modified demo furniture
                    console.log('🪑 ========== SUBSEQUENT LOAD - DEMO CONTENT EXISTS ==========');
                    console.log('🪑 Demo content persisted correctly - checking for modifications...');
                    
                    // Check if user modified any demo furniture and spawn fresh copies if needed
                    spawner.checkAndSpawnFreshDemoFurniture().catch(error => {
                        console.error('🪑 Copy-on-modify check failed:', error);
                    });
                }
            };
            
            // Fallback: Auto-trigger after 15 seconds if Dart never calls triggerFurnitureCreation
            setTimeout(() => {
                if (!pendingFurnitureCreation && !furnitureManagerReady) {
                    console.log('⏱️ Fallback timeout (15s) - Dart never triggered furniture creation');
                }
                if (window.triggerFurnitureCreation && !furnitureManagerReady) {
                    console.log('⏱️ Force triggering furniture creation (timeout)');
                    window.triggerFurnitureCreation();
                }
            }, 15000);
            
            if (window.FurnitureManager && !this.furnitureManager) {
                console.log('🪑 EXPLICIT: Creating FurnitureManager instance...');
                this.furnitureManager = new window.FurnitureManager(this);
                console.log('🪑 EXPLICIT: Initializing furniture manager...');
                this.furnitureManager.initialize().then(() => {
                    console.log('🪑 EXPLICIT: FurnitureManager initialized successfully');
                    furnitureManagerReady = true;
                    
                    // Setup global deletion/move handlers
                    if (window.setupFurnitureDeletionHandlers) {
                        console.log('🪑 EXPLICIT: Setting up furniture deletion handlers...');
                        window.setupFurnitureDeletionHandlers();
                        console.log('🪑 EXPLICIT: Furniture handlers registered');
                    } else {
                        console.error('🪑 EXPLICIT: setupFurnitureDeletionHandlers not available!');
                    }
                    
                    // Check if Dart already called triggerFurnitureCreation (while we were initializing)
                    if (pendingFurnitureCreation) {
                        console.log('🪑 Processing queued furniture creation request from Dart');
                        window.triggerFurnitureCreation();
                    }
                }).catch(error => {
                    console.error('🪑 EXPLICIT: FurnitureManager initialization failed:', error);
                });
            } else if (!window.FurnitureManager) {
                console.warn('🪑 EXPLICIT: FurnitureManager class not available');
            } else {
                console.log('🪑 EXPLICIT: FurnitureManager already exists');
            }

            // Initialize Furniture Share Manager (depends on furniture manager)
            console.log('🔗 EXPLICIT: Checking for FurnitureShareManager...');
            if (window.FurnitureShareManager && this.furnitureManager) {
                console.log('🔗 EXPLICIT: Creating FurnitureShareManager instance...');
                this.shareManager = new window.FurnitureShareManager(this);
                console.log('🔗 EXPLICIT: FurnitureShareManager initialized successfully');
                
                // Create global share function for console testing
                window.shareFurniture = async (furnitureId) => {
                    console.log(`🔗 Sharing furniture: ${furnitureId}`);
                    const result = await this.shareManager.shareFurniture(furnitureId);
                    if (result.error) {
                        console.error('❌ Share failed:', result.error);
                    } else {
                        console.log('✅ Share URL generated:', result.url);
                        console.log('📊 Stats:', result.stats);
                        if (result.warning) {
                            console.warn('⚠️', result.warning);
                        }
                        // Copy to clipboard
                        await this.shareManager.copyToClipboard(result.url);
                    }
                    return result;
                };
                console.log('🔗 Global shareFurniture() function available in console');
            } else {
                console.warn('🔗 EXPLICIT: FurnitureShareManager not available or furniture manager missing');
            }

            // Initialize Unified Media Player (YouTube, MP3, MP4, Spotify)
            console.log('🎵 EXPLICIT: Checking for UnifiedMediaPlayer...');
            if (window.UnifiedMediaPlayer) {
                console.log('🎵 EXPLICIT: Initializing Unified Media Player...');
                window.UnifiedMediaPlayer.initialize().then(() => {
                    console.log('✅ Unified Media Player initialized successfully');
                    
                    // Store reference in app
                    this.mediaPlayer = window.UnifiedMediaPlayer;
                    this.youtubePlayer = window.UnifiedMediaPlayer; // Backward compatibility
                }).catch(error => {
                    console.error('❌ Unified Media Player initialization failed:', error);
                });
            } else if (window.YouTubePlayerManager) {
                // Fallback to old name for backward compatibility
                console.log('🎵 EXPLICIT: Using YouTubePlayerManager (backward compat)...');
                window.YouTubePlayerManager.initialize().then(() => {
                    console.log('✅ YouTube Player Manager initialized successfully');
                    this.mediaPlayer = window.YouTubePlayerManager;
                    this.youtubePlayer = window.YouTubePlayerManager;
                }).catch(error => {
                    console.error('❌ YouTube Player Manager initialization failed:', error);
                });
            } else {
                console.warn('⚠️ Media Player not available');
            }

            // Handle window resize
            window.addEventListener('resize', this.onWindowResize.bind(this));
            
            console.log('Global references set up successfully');
        }

        // Continue with the rest of the methods...
        // Due to the large size, I'll split this into multiple parts
        
        setupObjects() {
            this.objectCreator = new ObjectCreator(this.THREE);
            
            // Create InputManager instance first
            this.inputManager = new InputManager(
                this.THREE, this.scene, this.camera, this.renderer, this.stateManager
            );

            // Initialize CameraFocusManager
            this.cameraFocusManager = new CameraFocusManager(this.camera, this.cameraControls);
            
            this.interactionManager = new InteractionManager(
                this.THREE, this.scene, this.camera, this.renderer, this.stateManager, this.cameraControls, this.currentWorldTemplate, this
            );
            
            // NEW: Initialize Contact Avatar Customization Manager
            if (window.ContactCustomizationManager) {
                try {
                    // Initialize the global ContactCustomizationManager
                    window.ContactCustomizationManager.initialize(this.THREE, this.scene, this.camera);
                    console.log('🎨 Contact Avatar Customization Manager initialized successfully');
                } catch (error) {
                    console.error('🎨 Failed to initialize Contact Customization Manager:', error);
                }
            } else {
                console.warn('🎨 ContactCustomizationManager not available - avatar customization disabled');
            }

            // NEW: Initialize Explore Avatar Customization Manager as a singleton instance
            if (window.ExploreAvatarCustomizationManager && !window.exploreAvatarCustomizationManager) {
                try {
                    window.exploreAvatarCustomizationManager = new window.ExploreAvatarCustomizationManager(this);
                    console.log('🚶 Explore Avatar Customization Manager instance created successfully');
                } catch (error) {
                    console.error('🚶 Failed to create Explore Avatar Customization Manager instance:', error);
                }
            } else {
                if (!window.ExploreAvatarCustomizationManager) {
                    console.warn('🚶 ExploreAvatarCustomizationManager class not available - explore avatar customization disabled');
                }
                if (window.exploreAvatarCustomizationManager) {
                    console.log('🚶 Explore Avatar Customization Manager instance already exists.');
                }
            }

            // Add direct SMS reference for easier access by diagnostics
            if (this.interactionManager.smsInteractionManager) {
                this.smsInteractionManager = this.interactionManager.smsInteractionManager;
                console.log('📱 Direct SMS reference created: window.app.smsInteractionManager');
            } else {
                // SMS manager might not be ready yet, set up delayed check
                const checkSmsManager = () => {
                    if (this.interactionManager && this.interactionManager.smsInteractionManager && !this.smsInteractionManager) {
                        this.smsInteractionManager = this.interactionManager.smsInteractionManager;
                        console.log('📱 Direct SMS reference created (delayed): window.app.smsInteractionManager');
                    }
                };
                // Check multiple times to ensure we catch it when it's ready
                setTimeout(checkSmsManager, 500);
                setTimeout(checkSmsManager, 1000);
                setTimeout(checkSmsManager, 2000);
            }
            
            // Create MoveManager instance
            this.moveManager = new MoveManager(
                this.THREE, this.scene, this.camera, this.renderer, this.stateManager, this.cameraControls, this.currentWorldTemplate, this
            );
            
            // CRITICAL FIX: Set manager references in InputManager after all managers are created
            this.inputManager.setManagerReferences(this.moveManager, this.interactionManager);
            
            // CRITICAL FIX: Set InputManager reference in MoveManager
            this.moveManager.setInputManager(this.inputManager);
            
            // CRITICAL FIX: Set MoveManager reference in InteractionManager
            this.interactionManager.setMoveManager(this.moveManager);
            
            // Initialize elevated marker helper for Y-axis climbing during drag
            if (this.moveManager.initializeElevatedMarkerHelper) {
                this.moveManager.initializeElevatedMarkerHelper();
            }
            
            this.billboardManager = new BillboardManager(
                this.THREE, this.scene, this.camera, this.stateManager
            );
            
            // Initialize focus zone manager for navigation
            this.focusZoneManager = new FocusZoneManager(
                this.THREE, this.scene, this.stateManager
            );
            
            // Set focus zone manager reference in InputManager (after it's created)
            this.inputManager.setFocusZoneManager(this.focusZoneManager);
            
            // Initialize sorting manager (Phase 1: Visual foundation only)
            this.sortingManager = new SortingManager(
                this.THREE, this.scene, this.stateManager, this.currentWorldTemplate
            );
            
            // Initialize the sorting system immediately after creation
            if (this.currentWorldTemplate && this.sortingManager) {
                try {
                    this.sortingManager.initialize();
                    console.log('Sorting manager initialized successfully');
                } catch (sortingError) {
                    console.warn('Sorting manager initialization failed (non-critical):', sortingError);
                }
            }
            
            // Initialize virtual object manager for apps and other virtual objects BEFORE file object manager
            this.virtualObjectManager = new VirtualObjectManager(
                this.THREE, this.scene, this.stateManager
            );
            
            // Initialize branding service for app object branding
            if (typeof BrandingService !== 'undefined') {
                this.brandingService = new BrandingService(this.THREE);
                console.log('BrandingService initialized');
            } else {
                console.warn('BrandingService not available - app branding disabled');
                this.brandingService = null;
            }
            
            // CRITICAL FIX: Initialize ContactManager BEFORE FileObjectManager
            // This ensures contacts are created correctly from the start, eliminating double-creation
            if (typeof window.initializeContactManager === 'function') {
                this.contactManager = window.initializeContactManager(this.scene);
                console.log('📱 ContactManager initialized early to prevent double-creation');
            } else {
                console.warn('📱 ContactManager initialization function not available');
                this.contactManager = null;
            }
            
            // Initialize file object manager
            this.fileObjectManager = new FileObjectManager({
                scene: this.scene,
                stateManager: this.stateManager,
                objectCreator: this.objectCreator,
                objectPositioner: this.objectPositioner,
                billboardManager: this.billboardManager,
                interactionManager: this.interactionManager,
                renderer: this.renderer,
                camera: this.camera,
                cameraControls: this.cameraControls,
                virtualObjectManager: this.virtualObjectManager
            });
            
            // Initialize backup/restore manager
            this.backupRestoreManager = new BackupRestoreManager({
                stateManager: this.stateManager,
                objectCreator: this.objectCreator,
                scene: this.scene,
                cameraControls: this.cameraControls,
                billboardManager: this.billboardManager,
                virtualObjectManager: this.virtualObjectManager // Add for app object restoration
            });
            
            // Set cross-references
            this.backupRestoreManager.setFileObjectManager(this.fileObjectManager);
            
            // Initialize search manager
            this.searchManager = new SearchManager(
                this.THREE, this.scene, this.stateManager
            );
            
            // Initialize debug manager
            this.debugManager = new DebugManager(this);
            
            // DEFERRED: SVG Entity Manager and Treasure Box Manager will initialize after world ready
            // This improves startup performance by loading gaming features in the background
            this.svgEntityManager = null;
            this.treasureBoxManager = null;
            console.log('🎮 Gaming system initialization deferred until after world ready');
            
            // Initialize URL manager for link creation and processing
            if (typeof URLManager !== 'undefined') {
                this.urlManager = new URLManager(this);
                console.log('URLManager initialized');
            } else {
                console.warn('URLManager not available - URL processing disabled');
                this.urlManager = null;
            }
            
            // Initialize link interaction manager for double-tap URL opening
            if (typeof LinkInteractionManager !== 'undefined') {
                this.linkInteractionManager = new LinkInteractionManager(this, this.cameraFocusManager);
                console.log('LinkInteractionManager initialized');
            } else {
                console.warn('LinkInteractionManager not available - link interactions disabled');
                this.linkInteractionManager = null;
            }
            
            // Initialize link visual manager for logos and visual enhancements
            if (typeof LinkVisualManager !== 'undefined') {
                this.linkVisualManager = new LinkVisualManager(
                    this.THREE, this.scene, this.stateManager
                );
                console.log('LinkVisualManager initialized');
            } else {
                console.warn('LinkVisualManager not available - link visual enhancements disabled');
                this.linkVisualManager = null;
            }
            
            // Initialize link name manager for custom name handling
            if (typeof LinkNameManager !== 'undefined') {
                this.linkNameManager = new LinkNameManager();
                console.log('LinkNameManager initialized');
            } else {
                console.warn('LinkNameManager not available - link name customization disabled');
                this.linkNameManager = null;
            }
            
            // Initialize default link creator for first launch
            if (typeof DefaultLinkInitializer !== 'undefined') {
                this.defaultLinkInitializer = new DefaultLinkInitializer(this);
                console.log('DefaultLinkInitializer initialized');
                
                // IMPORTANT: Don't initialize immediately - wait for file restoration to complete
                // The initialization will be triggered after files are restored in the restoration callback
            } else {
                console.warn('DefaultLinkInitializer not available - default links disabled');
                this.defaultLinkInitializer = null;
            }
            
            // Initialize rotation interaction for furniture/path rotation
            if (typeof RotationInteraction !== 'undefined') {
                this.rotationInteraction = new RotationInteraction(this.THREE, this.scene, this.camera);
                console.log('🔄 RotationInteraction initialized');
            } else {
                console.warn('🔄 RotationInteraction not available');
                this.rotationInteraction = null;
            }
            
            // FurnitureViewManager removed - using file zone pattern in LinkInteractionManager instead
            console.log('🪑 Furniture interactions delegated to LinkInteractionManager (file zone pattern)');
            
            // Initialize static focus zones for navigation
            console.log('Initializing static focus zone grid...');
            this.focusZoneManager.initializeFocusZones();
        }

        // ============================================================================
        // WORLD TEMPLATE MANAGEMENT
        // ============================================================================

        initializeWorldTemplate(worldType = 'greenPlane') {
            console.log('=== INITIALIZING WORLD TEMPLATE (BULLETPROOF) ===');
            console.log('Target world type:', worldType);
            console.log('🐛 [DEBUG] initializeWorldTemplate called with:', worldType);
            
            // UNIQUE TEST LOG - should not be filtered
            console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO initializeWorldTemplate START 🔥🔥🔥');
            
            try {
                // Step 1: Validate input parameters
                if (!worldType || typeof worldType !== 'string') {
                    console.warn('Invalid world type provided, defaulting to greenPlane');
                    worldType = 'greenPlane';
                }
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO STEP 1 COMPLETE 🔥🔥🔥');
                
                // Step 2: Validate required dependencies
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE DEPENDENCIES VALIDATION 🔥🔥🔥');
                this.validateWorldTemplateDependencies();
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO DEPENDENCIES VALIDATED 🔥🔥🔥');
                
                // Step 3: Dispose of existing world template if any
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE DISPOSE 🔥🔥🔥');
                if (this.currentWorldTemplate) {
                    console.log('Disposing existing world template:', this.currentWorldTemplate.getType());
                    try {
                        this.currentWorldTemplate.cleanup();
                    } catch (disposeError) {
                        console.warn('Error disposing previous world template (non-critical):', disposeError);
                    }
                    this.currentWorldTemplate = null;
                }
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO DISPOSE COMPLETE 🔥🔥🔥');
                
                // Step 4: Create new world template with error handling
                console.log('Creating new world template...');
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE CREATE TEMPLATE 🔥🔥🔥');
                this.currentWorldTemplate = this.createWorldTemplate(worldType);
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO TEMPLATE CREATED 🔥🔥🔥');
                
                // Step 5: Validate the created world template
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE VALIDATION 🔥🔥🔥');
                this.validateCreatedWorldTemplate();
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO VALIDATION COMPLETE 🔥🔥🔥');
                
                // Step 6: Set up the world environment with error recovery
                console.log('Setting up world environment...');
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE INITIALIZE 🔥🔥🔥');
                try {
                    this.currentWorldTemplate.initialize(this.scene);
                    console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO INITIALIZE SUCCESS 🔥🔥🔥');
                } catch (envError) {
                    console.error('World environment setup failed:', envError);
                    console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO INITIALIZE FAILED 🔥🔥🔥');
                    // Try to recover with a minimal environment
                    this.recoverWorldEnvironment();
                }
                
                console.log('World template initialized successfully:', this.currentWorldTemplate.getType());
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE SORTING MANAGER 🔥🔥🔥');
                
                // Step 7: Initialize sorting manager for the new world
                if (this.sortingManager) {
                    console.log('Updating sorting manager for new world...');
                    try {
                        this.sortingManager.setWorldTemplate(this.currentWorldTemplate);
                        this.sortingManager.initialize();
                    } catch (sortingError) {
                        console.warn('Sorting manager initialization failed (non-critical):', sortingError);
                    }
                }
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO SORTING MANAGER COMPLETE 🔥🔥🔥');
                
                // Step 8: Apply gravity for non-forest worlds to ensure objects are properly positioned
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO BEFORE GRAVITY 🔥🔥🔥');
                if (this.stateManager && this.stateManager.fileObjects && this.stateManager.fileObjects.length > 0) {
                    console.log('Applying gravity after world initialization...');
                    setTimeout(() => {
                        if (typeof window.applyGravityToFloatingObjects === 'function') {
                            window.applyGravityToFloatingObjects();
                            console.log('[WORLD-INIT] Applied gravity to ensure proper object positioning');
                        }
                    }, 100); // Small delay to ensure world is fully initialized
                }
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO GRAVITY SETUP COMPLETE 🔥🔥🔥');
                
                // Step 9: CRITICAL FIX - Initialize posters for worlds that support them
                // This ensures posters appear on initial load, not just after world switches
                console.log(`🖼️ [WORLD-INIT] Checking if ${worldType} world needs poster initialization...`);
                console.log(`🐛 [DEBUG] About to check poster initialization for world: ${worldType}`);
                console.log(`🐛 [DEBUG] currentWorldTemplate exists:`, !!this.currentWorldTemplate);
                console.log(`🐛 [DEBUG] is poster world:`, ['dazzle', 'christmas'].includes(worldType));
                
                if (['dazzle', 'christmas'].includes(worldType)) {
                    console.log(`🖼️ [WORLD-INIT] Starting poster creation for ${worldType} world...`);
                    console.log(`🐛 [DEBUG] Inside poster creation block for ${worldType}`);
                    
                    // UNIQUE TEST LOG - should not be filtered
                    console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO POSTER CREATION BLOCK 🔥🔥🔥');
                    
                    // Small delay to ensure world template is fully initialized
                    setTimeout(() => {
                        console.log(`🐛 [DEBUG] setTimeout callback executing for ${worldType}`);
                        console.log(`🐛 [DEBUG] currentWorldTemplate still exists:`, !!this.currentWorldTemplate);
                        
                        // UNIQUE TEST LOG - should not be filtered
                        console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO INSIDE SETTIMEOUT 🔥🔥🔥');
                        
                        try {
                            if (worldType === 'dazzle' && typeof this.currentWorldTemplate.createBedroomPosters === 'function') {
                                console.log('🖼️ [WORLD-INIT] Calling createBedroomPosters for dazzle world');
                                console.log('🐛 [DEBUG] About to call createBedroomPosters()');
                                this.currentWorldTemplate.createBedroomPosters();
                                console.log('🐛 [DEBUG] createBedroomPosters() call completed');
                            } else if (worldType === 'christmas' && typeof this.currentWorldTemplate.createChristmasPosters === 'function') {
                                console.log('🖼️ [WORLD-INIT] Calling createChristmasPosters for christmas world');
                                console.log('🐛 [DEBUG] About to call createChristmasPosters()');
                                this.currentWorldTemplate.createChristmasPosters();
                                console.log('🐛 [DEBUG] createChristmasPosters() call completed');
                            } else {
                                console.warn(`🖼️ [WORLD-INIT] No poster creation method found for ${worldType} world template`);
                                console.log(`🖼️ [WORLD-INIT] Available methods:`, Object.getOwnPropertyNames(this.currentWorldTemplate));
                                console.log(`🐛 [DEBUG] Method check failed - worldType: ${worldType}, createBedroomPosters exists:`, typeof this.currentWorldTemplate.createBedroomPosters === 'function', ', createChristmasPosters exists:', typeof this.currentWorldTemplate.createChristmasPosters === 'function');
                            }
                        } catch (posterError) {
                            console.error(`❌ [WORLD-INIT] Error creating posters for ${worldType}:`, posterError);
                            console.error(`🐛 [DEBUG] Poster creation error details:`, posterError.stack);
                        }
                    }, 150); // Slightly longer delay for initial load
                } else {
                    console.log(`🖼️ [WORLD-INIT] World ${worldType} does not require poster initialization`);
                    console.log(`🐛 [DEBUG] Skipping poster initialization for non-poster world: ${worldType}`);
                }
                
            } catch (error) {
                console.error('World template initialization failed:', error);
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO CAUGHT EXCEPTION IN INIT 🔥🔥🔥');
                console.log('🔥🔥🔥 UNIQUE_POSTER_DEBUG_TEST_XOXOXO Exception details:', error.message, error.stack);
                this.recoverWorldTemplate();
            }
        }

        /**
         * Validate that all required dependencies are available for world template creation
         */
        validateWorldTemplateDependencies() {
            console.log('--- VALIDATING WORLD TEMPLATE DEPENDENCIES ---');
            
            const errors = [];
            
            if (!this.THREE) errors.push('THREE.js not available');
            if (!this.scene) errors.push('Scene not created');
            if (!this.camera) errors.push('Camera not created');
            if (!this.renderer) errors.push('Renderer not created');
            
            if (errors.length > 0) {
                throw new Error('World template dependencies missing: ' + errors.join(', '));
            }
            
            console.log('World template dependencies validated');
        }

        /**
         * Create world template with bulletproof error handling
         */
        createWorldTemplate(worldType) {
            console.log('--- CREATING WORLD TEMPLATE ---');
            console.log('World type:', worldType);
            
            // SAFETY FIRST: Check if this is a new template that uses our helper system
            if (window.worldTemplateRegistryHelper && 
                window.worldTemplateRegistryHelper.isNewTemplate(worldType)) {
                
                console.log(`🆕 Creating new template type: ${worldType}`);
                const newTemplate = window.worldTemplateRegistryHelper.createNewTemplate(worldType, this.THREE);
                
                if (newTemplate) {
                    console.log(`🆕 New template created successfully: ${newTemplate.getDisplayName()}`);
                    return newTemplate;
                } else {
                    console.error(`🆕 Failed to create new template: ${worldType}`);
                    // Fall through to existing logic for fallback
                }
            }
            
            let worldTemplate = null;
            
            try {
                switch (worldType) {
                    case 'green-plane':
                        worldTemplate = new GreenPlaneWorldTemplate(this.THREE, {
                            planeSize: this.GREEN_PLANE_SIZE
                        });
                        break;
                    case 'space':
                        worldTemplate = new SpaceWorldTemplate(this.THREE);
                        break;
                    case 'ocean':
                        worldTemplate = new OceanWorldTemplate(this.THREE);
                        break;
                    // Premium world themes
                    case 'dazzle':
                        console.log('💎 Creating premium Dazzle Bedroom world...');
                        if (window.DazzleBedroomWorldTemplate) {
                            worldTemplate = new DazzleBedroomWorldTemplate(this.THREE);
                        } else {
                            console.error('💎 DazzleBedroomWorldTemplate not available - loading premium themes...');
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world theme not loaded');
                        }
                        break;
                    case 'forest':
                        console.log('💎 Creating premium Forest Realm world...');
                        if (window.ForestRealmWorldTemplate) {
                            worldTemplate = new ForestRealmWorldTemplate(this.THREE);
                        } else {
                            console.error('💎 ForestRealmWorldTemplate not available - loading premium themes...');
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world theme not loaded');
                        }
                        break;
                    case 'cave':
                        console.log('🕳️ Creating premium Cave Explorer world...');
                        // Cave Explorer is now independent - only needs its own class
                        if (this.arePremiumClassesAvailable(['CaveExplorerWorldTemplate'])) {
                            worldTemplate = new CaveExplorerWorldTemplate(this.THREE);
                        } else {
                            console.error('🕳️ CaveExplorerWorldTemplate not available - ensure premium bundle is loaded');
                            // Load premium themes and retry after a delay
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world classes not available - premium bundle may not be loaded');
                        }
                        break;
                    case 'christmas':
                        console.log('🎄 Creating premium ChristmasLand world...');
                        // ChristmasLand is now independent - only needs its own class
                        if (this.arePremiumClassesAvailable(['ChristmasLandWorldTemplate'])) {
                            worldTemplate = new ChristmasLandWorldTemplate(this.THREE);
                        } else {
                            console.error('🎄 ChristmasLandWorldTemplate not available - ensure premium bundle is loaded');
                            // Load premium themes and retry after a delay
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world classes not available - premium bundle may not be loaded');
                        }
                        break;
                    case 'desert-oasis':
                        console.log('🏜️ Creating premium Desert Oasis world...');
                        // Desert Oasis uses the new template helper system
                        if (window.DesertOasisWorldTemplate) {
                            worldTemplate = new window.DesertOasisWorldTemplate(this.THREE);
                        } else {
                            console.error('🏜️ DesertOasisWorldTemplate not available - ensure premium bundle is loaded');
                            // Load premium themes and retry after a delay
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world classes not available - premium bundle may not be loaded');
                        }
                        break;
                    case 'tropical-paradise':
                        console.log('🌴 Creating premium Tropical Paradise world...');
                        if (window.TropicalParadiseWorldTemplate) {
                            worldTemplate = new window.TropicalParadiseWorldTemplate(this.THREE);
                        } else {
                            console.error('🌴 TropicalParadiseWorldTemplate not available - ensure premium bundle is loaded');
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world classes not available - premium bundle may not be loaded');
                        }
                        break;
                    case 'flower-wonderland':
                        console.log('🌸 Creating premium Flower Wonderland world...');
                        if (window.FlowerWonderlandWorldTemplate) {
                            worldTemplate = new window.FlowerWonderlandWorldTemplate(this.THREE);
                        } else {
                            console.error('🌸 FlowerWonderlandWorldTemplate not available - ensure premium bundle is loaded');
                            this.loadPremiumWorldThemes();
                            throw new Error('Premium world classes not available - premium bundle may not be loaded');
                        }
                        break;
                    default:
                        console.log('🔍 Checking for new world template via helper system:', worldType);
                        
                        // NEW: Check auto-integration system first (enhanced approach)
                        if (window.worldTemplateAutoIntegration && 
                            window.worldTemplateAutoIntegration.isAutoIntegrated(worldType)) {
                            console.log('🔄 Found auto-integrated template:', worldType);
                            
                            worldTemplate = window.worldTemplateAutoIntegration.createTemplate(worldType, this.THREE);
                            
                            if (!worldTemplate) {
                                console.error('🔄 Failed to create auto-integrated template:', worldType);
                            } else {
                                console.log('🔄 Successfully created auto-integrated template:', worldType);
                                break;
                            }
                        }
                        
                        // FALLBACK: Check if this is a new template registered with the helper system
                        if (window.worldTemplateRegistryHelper && 
                            window.worldTemplateRegistryHelper.isNewTemplate(worldType)) {
                            console.log('🆕 Found new template via helper system:', worldType);
                            
                            // Try to create the new template
                            worldTemplate = window.worldTemplateRegistryHelper.createNewTemplate(worldType, this.THREE);
                            
                            if (!worldTemplate) {
                                console.error('🆕 Failed to create new template:', worldType);
                                throw new Error(`Failed to create new world template: ${worldType}`);
                            }
                            
                            console.log('🆕 Successfully created new template:', worldType);
                        } else {
                            console.warn('Unknown world type:', worldType, 'defaulting to green-plane');
                            worldTemplate = new GreenPlaneWorldTemplate(this.THREE, {
                                planeSize: this.GREEN_PLANE_SIZE
                            });
                        }
                        break;
                }
                
                if (!worldTemplate) {
                    throw new Error('World template creation returned null');
                }
                
                console.log('World template created successfully:', worldTemplate.getType());
                return worldTemplate;
                
            } catch (error) {
                console.error('Failed to create world template:', error);
                // Fallback to basic green plane template
                console.log('Attempting fallback to basic green plane template...');
                try {
                    return new GreenPlaneWorldTemplate(this.THREE, {
                        planeSize: this.GREEN_PLANE_SIZE
                    });
                } catch (fallbackError) {
                    console.error('Fallback world template creation failed:', fallbackError);
                    throw new Error('Complete world template creation failure');
                }
            }
        }

        /**
         * Check if required premium classes are available
         */
        arePremiumClassesAvailable(classNames) {
            console.log('--- CHECKING PREMIUM CLASS AVAILABILITY ---');
            
            for (const className of classNames) {
                if (!window[className]) {
                    console.warn(`Premium class ${className} not available on window object`);
                    return false;
                }
                
                if (typeof window[className] !== 'function') {
                    console.warn(`Premium class ${className} is not a constructor function`);
                    return false;
                }
                
                console.log(`✓ Premium class ${className} is available`);
            }
            
            console.log('All required premium classes are available');
            return true;
        }

        /**
         * Load premium world themes dynamically
         */
        loadPremiumWorldThemes() {
            console.log('💎 Loading premium world themes...');
            
            // Check if premium themes are already loaded
            // Now checking for ANY premium classes rather than requiring specific parent classes
            const premiumClasses = [
                'DazzleBedroomWorldTemplate', 
                'ForestRealmWorldTemplate',
                'CaveExplorerWorldTemplate',
                'ChristmasLandWorldTemplate'
            ];
            
            const loadedPremiumClasses = premiumClasses.filter(className => window[className]);
            
            if (loadedPremiumClasses.length > 0) {
                console.log('💎 Premium world themes already loaded:', loadedPremiumClasses.join(', '));
                return;
            }
            
            // Load premium themes script dynamically
            const script = document.createElement('script');
            script.src = 'js/modules/premium/premiumWorldThemes.js';
            script.onload = () => {
                console.log('💎 Premium world themes loaded successfully');
            };
            script.onerror = () => {
                console.error('💎 Failed to load premium world themes');
            };
            document.head.appendChild(script);
        }

        /**
         * Validate that the created world template has all required methods and properties
         */
        validateCreatedWorldTemplate() {
            console.log('--- VALIDATING CREATED WORLD TEMPLATE ---');
            
            if (!this.currentWorldTemplate) {
                throw new Error('World template is null after creation');
            }
            
            const requiredMethods = [
                'initialize',
                'getType', 
                'getHomeViewPosition',
                'getHomeViewTarget'
            ];
            
            const missingMethods = requiredMethods.filter(method => 
                typeof this.currentWorldTemplate[method] !== 'function'
            );
            
            if (missingMethods.length > 0) {
                throw new Error('World template missing required methods: ' + missingMethods.join(', '));
            }
            
            // Validate that essential methods return valid data
            try {
                const homePos = this.currentWorldTemplate.getHomeViewPosition();
                const homeTarget = this.currentWorldTemplate.getHomeViewTarget();
                
                if (!homePos || typeof homePos.x !== 'number') {
                    throw new Error('getHomeViewPosition returns invalid data');
                }
                
                if (!homeTarget || typeof homeTarget.x !== 'number') {
                    throw new Error('getHomeViewTarget returns invalid data');
                }
                
            } catch (validationError) {
                throw new Error('World template method validation failed: ' + validationError.message);
            }
            
            console.log('World template validation passed');
        }

        /**
         * Recover from world environment setup failure
         */
        recoverWorldEnvironment() {
            console.log('--- RECOVERING WORLD ENVIRONMENT ---');
            
            try {
                // Set basic sky background as minimal fallback
                this.scene.background = new this.THREE.Color(0x87CEEB); // Sky blue
                console.log('Basic environment recovery completed');
            } catch (recoveryError) {
                console.error('World environment recovery failed:', recoveryError);
                // Continue without environment - this is not critical for basic functionality
            }
        }

        /**
         * Recover from complete world template failure
         */
        recoverWorldTemplate() {
            console.log('--- RECOVERING FROM WORLD TEMPLATE FAILURE ---');
            
            try {
                // Create minimal working world template
                console.log('Creating minimal fallback world template...');
                
                // Create a basic world template manually if classes fail
                this.currentWorldTemplate = {
                    getType: () => 'emergency-fallback',
                    initialize: (scene) => {
                        scene.background = new this.THREE.Color(0x87CEEB);
                    },
                    applyCameraConstraints: (controls) => {
                        controls.minDistance = 1.0;
                        controls.maxDistance = 200.0;
                        controls.minPolarAngle = Math.PI * 0.05;
                        controls.maxPolarAngle = Math.PI * 0.45;
                    },
                    getHomeViewPosition: () => ({ x: 0, y: 8, z: 15 }),
                    getHomeViewTarget: () => ({ x: 0, y: 0, z: 0 }),
                    restrictCameraPosition: () => {}, // No-op for safety
                    cleanup: () => {} // No-op for safety
                };
                
                // Setup the emergency environment
                this.currentWorldTemplate.initialize(this.scene);
                
                console.log('Emergency world template recovery completed');
                
            } catch (emergencyError) {
                console.error('Emergency world template recovery failed:', emergencyError);
                throw new Error('Complete world template system failure - unable to recover');
            }
        }

        // Add getHomeViewPosition and getHomeViewTarget methods for backward compatibility
        getHomeViewPosition() {
            return this.currentWorldTemplate ? 
                this.currentWorldTemplate.getHomeViewPosition() : 
                { x: 0, y: 8, z: 15 };
        }

        getHomeViewTarget() {
            return this.currentWorldTemplate ? 
                this.currentWorldTemplate.getHomeViewTarget() : 
                { x: 0, y: 0, z: 0 };
        }

        // Continue with essential application methods...
        // [Due to size constraints, I'll need to continue this in parts]
        
        onWindowResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }

        startAnimationLoop() {
            const animate = () => {
                requestAnimationFrame(animate);
                
                if (this.clock && this.cameraControls) {
                    const delta = this.clock.getDelta();
                    
                    // Camera controls are always enabled for interaction (including during search mode)
                    if (this.cameraControls && this.cameraControls.enabled) {
                        this.cameraControls.update(delta);
                    }
                    
                    // Update world-specific animations (e.g., ocean waves)
                    if (this.currentWorldTemplate && typeof this.currentWorldTemplate.animate === 'function') {
                        this.currentWorldTemplate.animate(Date.now());
                    }
                }
                
                // Update explore mode system
                if (window.exploreManager && typeof window.exploreManager.update === 'function') {
                    window.exploreManager.update();
                }
                
                // Update furniture idle animations
                if (this.furnitureManager && 
                    this.furnitureManager.visualManager && 
                    this.furnitureManager.visualManager.idleAnimationManager &&
                    typeof this.furnitureManager.visualManager.idleAnimationManager.updateAllAnimations === 'function') {
                    this.furnitureManager.visualManager.idleAnimationManager.updateAllAnimations(
                        this.furnitureManager.visualManager, 
                        performance.now()
                    );
                }
                
                // Update link title label positions (for moving objects and distance culling)
                if (window.linkTitleManager && typeof window.linkTitleManager.updateLabelPositions === 'function') {
                    window.linkTitleManager.updateLabelPositions();
                }
                
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }

                // Render SMS input area if the manager exists
                if (window.smsIntegrationManager && typeof window.smsIntegrationManager.renderInputArea === 'function') {
                    window.smsIntegrationManager.renderInputArea();
                }
                
                // Track frame count for potential future use
                this.frameCount = (this.frameCount || 0) + 1;
            };
            
            animate();
        }

        setupGlobalFunctions() {
            console.log('=== SETTING UP GLOBAL FUNCTIONS ===');
            
            // Essential Flutter communication functions
            window.createFileObjectsJS = (filesJsonString) => {
                // Send diagnostic via Flutter channel instead of console.log
                if (window.FileObjectDebugChannel) {
                    window.FileObjectDebugChannel.postMessage('🎯 createFileObjectsJS called with data length: ' + (filesJsonString ? filesJsonString.length : 0));
                }
                
                console.log('createFileObjectsJS called - delegating to FileObjectManager');
                console.log('Received JSON string type:', typeof filesJsonString);
                
                // Handle both JSON string and already-parsed array
                let filesJson;
                try {
                    if (typeof filesJsonString === 'string') {
                        filesJson = JSON.parse(filesJsonString);
                    } else if (Array.isArray(filesJsonString)) {
                        // Already an array - use directly
                        filesJson = filesJsonString;
                    } else {
                        // Invalid type
                        throw new Error('Expected string or array, got: ' + typeof filesJsonString);
                    }
                    console.log('Successfully parsed JSON, array length:', filesJson?.length || 0);
                    
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage('✅ JSON parsed successfully, ' + (filesJson?.length || 0) + ' files');
                        // Send furniture metadata info
                        const withFurniture = filesJson.filter(f => f.furnitureId).length;
                        if (withFurniture > 0) {
                            window.FileObjectDebugChannel.postMessage('🪑 Files with furniture metadata: ' + withFurniture);
                        }
                    }
                } catch (error) {
                    console.error('Failed to parse JSON:', error);
                    console.error('Received data:', filesJsonString?.substring(0, 200));
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage('❌ JSON parse failed: ' + error.toString());
                    }
                    return;
                }
                
                if (this.fileObjectManager) {
                    // POSITION PERSISTENCE FIX: Store contact positions before file operations
                    if (this.contactManager) {
                        window.contactPositionsBeforeFileSync = this.contactManager.storeContactPositions();
                        console.log('🔄 POSITION PERSISTENCE: Stored contact positions before file creation');
                    }
                    
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage('📦 Calling fileObjectManager.createFileObjects...');
                    }
                    
                    this.fileObjectManager.createFileObjects(filesJson);
                    
                    if (window.FileObjectDebugChannel) {
                        window.FileObjectDebugChannel.postMessage('✅ fileObjectManager.createFileObjects completed');
                    }
                    
                    // POSITION PERSISTENCE FIX: Restore contact positions after file operations
                    if (this.contactManager && window.contactPositionsBeforeFileSync) {
                        setTimeout(() => {
                            this.contactManager.restoreContactPositions(window.contactPositionsBeforeFileSync);
                            delete window.contactPositionsBeforeFileSync;
                        }, 100); // Small delay to ensure all objects are created
                    }
                    
                    // DEFAULT LINK INITIALIZATION: After files are restored, check if we need to create default links
                    // This ensures we check AFTER persistence has loaded, preventing duplicates
                    // CRITICAL FIX: Don't use single-session flag - let initializer decide if it should run
                    if (this.defaultLinkInitializer) {
                        setTimeout(() => {
                            console.log('🎬 Triggering default link check after file restoration...');
                            this.defaultLinkInitializer.initialize().catch(error => {
                                console.warn('Default link initialization failed:', error);
                            });
                        }, 1500); // Wait for objects to be fully created and positioned
                    }
                    
                    // DEFAULT FURNITURE INITIALIZATION: After files are restored, check if we need to create default furniture
                    // This ensures we check AFTER world is initialized, preventing menu dialogs
                    if (window.app && window.app.furnitureManager && !window.defaultFurnitureChecked) {
                        window.defaultFurnitureChecked = true; // Only check once per session
                        setTimeout(async () => {
                            console.log('🪑 Triggering default furniture check after file restoration...');
                            const spawner = new window.DefaultFurnitureSpawner(window.app.furnitureManager, window.app);
                            if (!(await spawner.hasDefaultFurniture())) {
                                console.log('🪑 First launch detected - creating default furniture');
                                spawner.createDefaultFurniture().catch(error => {
                                    console.warn('Default furniture initialization failed:', error);
                                });
                            } else {
                                console.log('🪑 Default furniture already exists, skipping creation');
                            }
                        }, 2000); // Wait slightly longer than links to ensure everything is ready
                    }
                } else {
                    console.error('FileObjectManager not initialized');
                }
            };
            
            window.clearFileObjectsJS = () => {
                console.log('clearFileObjectsJS called - delegating to FileObjectManager');
                if (this.fileObjectManager) {
                    // POSITION PERSISTENCE FIX: Store contact positions before clearing
                    if (this.contactManager) {
                        window.contactPositionsBeforeClear = this.contactManager.storeContactPositions();
                        console.log('🔄 POSITION PERSISTENCE: Stored contact positions before clearing');
                    }
                    
                    this.fileObjectManager.clearFileObjects();
                } else {
                    console.error('FileObjectManager not initialized');
                }
            };
            
            // NEW: Clear ALL objects including contacts (for "delete all objects" functionality)
            window.clearFileObjectsIncludingContactsJS = () => {
                console.log('clearFileObjectsIncludingContactsJS called - REMOVING ALL OBJECTS INCLUDING CONTACTS');
                if (this.fileObjectManager) {
                    this.fileObjectManager.clearAllObjectsIncludingContacts();
                } else {
                    console.error('FileObjectManager not initialized');
                }
            };
            
            window.removeObjectByIdJS = (objectId) => {
                console.log('removeObjectByIdJS called - delegating to FileObjectManager');
                
                // First, check if this is a contact and handle SMS screen lifecycle
                if (this.stateManager && this.stateManager.fileObjects) {
                    const fileObject = this.stateManager.fileObjects.find(obj => 
                        obj.userData && (
                            obj.userData.id === objectId || 
                            obj.userData.fileId === objectId ||
                            obj.userData.contactId === objectId
                        )
                    );
                    
                    if (fileObject && window.handleObjectDeletion) {
                        console.log('🗑️ Calling global deletion handler for:', objectId);
                        window.handleObjectDeletion(objectId, fileObject);
                    }
                }
                
                if (this.fileObjectManager) {
                    this.fileObjectManager.removeObjectById(objectId);
                } else {
                    console.error('FileObjectManager not initialized');
                }
            };
            
            window.storeObjectVisualStateForUndo = (objectId) => {
                console.log('storeObjectVisualStateForUndo called - delegating to FileObjectManager');
                if (this.fileObjectManager) {
                    return this.fileObjectManager.storeObjectVisualStateForUndo(objectId);
                } else {
                    console.error('FileObjectManager not initialized');
                    return false;
                }
            };
            
            window.restoreObjectsFromBackup = (backupDataJson) => {
                console.log('restoreObjectsFromBackup called - delegating to BackupRestoreManager');
                if (this.backupRestoreManager) {
                    this.backupRestoreManager.restoreObjectsFromBackup(backupDataJson);
                } else {
                    console.error('BackupRestoreManager not initialized');
                }
            };
            
            window.restoreObjectById = (fileData) => {
                console.log('restoreObjectById called - delegating to BackupRestoreManager');
                
                // Call restoration handler for contact SMS screen lifecycle
                if (fileData && window.handleObjectRestoration) {
                    console.log('🔄 Calling global restoration handler for:', fileData.id || fileData.name);
                    window.handleObjectRestoration(fileData.id || fileData.name, fileData);
                }
                
                if (this.backupRestoreManager) {
                    return this.backupRestoreManager.restoreObjectById(fileData);
                } else {
                    console.error('BackupRestoreManager not initialized');
                    return Promise.resolve(false);
                }
            };
            
            // Control refresh function - resets camera controls after operations
            window.refreshControlsState = () => {
                console.log('refreshControlsState called - resetting camera controls');
                
                const cameraControls = this.cameraControls || window.app?.cameraControls;
                if (cameraControls) {
                    // Disable and re-enable with short delay to clear any stuck states
                    cameraControls.enabled = false;
                    
                    setTimeout(() => {
                        cameraControls.enabled = true;
                        cameraControls.enableRotate = true;
                        cameraControls.enablePan = true;
                        cameraControls.enableZoom = true;
                        
                        // Restore mouse and touch controls
                        if (cameraControls.mouseButtons) {
                            cameraControls.mouseButtons.left = 1;
                        }
                        if (cameraControls.touches) {
                            cameraControls.touches.one = 1;
                        }
                        
                        cameraControls.update(0);
                        console.log('Camera controls refreshed and fully enabled');
                    }, 10);
                }
            };
            
            // Move-related functions
            window.selectObjectForMoveCommand = (objectId) => {
                console.log('selectObjectForMoveCommand called - delegating to InteractionManager');
                if (this.interactionManager) {
                    this.interactionManager.selectObjectForMove(objectId);
                } else {
                    console.error('InteractionManager not initialized');
                }
            };
            
            window.selectObjectForVerticalMoveCommand = (objectId) => {
                console.log('selectObjectForVerticalMoveCommand called - delegating to InteractionManager');
                if (this.interactionManager) {
                    this.interactionManager.selectObjectForVerticalMove(objectId);
                } else {
                    console.error('InteractionManager not initialized');
                }
            };
            
            window.highlightObjectForDeleteConfirmation = (objectId) => {
                console.log('highlightObjectForDeleteConfirmation called - delegating to InteractionManager');
                if (this.interactionManager) {
                    this.interactionManager.highlightObjectForDelete(objectId);
                } else {
                    console.error('InteractionManager not initialized');
                }
            };
            
            window.deselectObjectJS = () => {
                console.log('deselectObjectJS called - delegating to InteractionManager');
                if (this.interactionManager) {
                    this.interactionManager.deselectObject();
                } else {
                    console.error('InteractionManager not initialized');
                }
            };
            
            window.updateDisplayOptionsJS = (options) => {
                console.log('updateDisplayOptionsJS called - delegating to StateManager');
                if (this.stateManager) {
                    this.stateManager.updateDisplayOptions(options);
                } else {
                    console.error('StateManager not initialized');
                }
            };
            
            console.log('Binding critical functions: resetHomeView and emergencyReset');
            window.resetHomeView = this.resetHomeView.bind(this);
            window.emergencyReset = this.emergencyReset.bind(this);
            console.log('Critical functions bound successfully');
            
            // NEW: Home button toggle functionality
            window.toggleHomeView = () => {
                console.log('toggleHomeView called - delegating to CameraManager');
                if (this.cameraManager && typeof this.cameraManager.toggleHomeView === 'function') {
                    this.cameraManager.toggleHomeView();
                } else {
                    console.log('Toggle functionality not available, using traditional reset');
                    this.resetHomeView();
                }
            };
            
            window.getHomeToggleState = () => {
                if (this.cameraManager && typeof this.cameraManager.getToggleState === 'function') {
                    return this.cameraManager.getToggleState();
                } else {
                    return { currentView: 'close-up', nextView: 'aerial', available: false };
                }
            };
            
            // Setup debug functions via DebugManager
            if (this.debugManager) {
                this.debugManager.setupGlobalDebugFunctions();
            }
            
            // World template switching
            window.switchWorldTemplate = async (worldType) => {
                console.log('🚨🚨🚨 GLOBAL switchWorldTemplate CALLED 🚨🚨🚨');
                console.log('🚨 World type parameter:', worldType);
                console.log('🚨 typeof worldType:', typeof worldType);
                console.log('🚨 this object:', this);
                console.log('🚨 this.switchWorldTemplate exists:', typeof this.switchWorldTemplate);
                console.log('Switching world template to:', worldType);
                await this.switchWorldTemplate(worldType);
                console.log('🚨🚨🚨 GLOBAL switchWorldTemplate COMPLETED 🚨🚨🚨');
            };
            
            // Search functionality
            window.activateSearchJS = async (query) => {
                console.log('🔍 activateSearchJS called - delegating to SearchManager');
                console.log('🔍 Query received:', query, 'type:', typeof query);
                if (this.searchManager) {
                    try {
                        const result = await this.searchManager.activateSearch(query);
                        console.log(`🔍 activateSearchJS returning: ${result} (type: ${typeof result})`);
                        console.log('🔍 Explicit boolean conversion:', Boolean(result));
                        
                        // CRITICAL: Set window flag to help Flutter detect search state
                        window.searchActivationResult = result;
                        window.isSearchModeActive = result;
                        
                        return result;
                    } catch (error) {
                        console.error('❌ Error in activateSearchJS:', error);
                        console.error('❌ Error type:', typeof error);
                        console.error('❌ Error message:', error?.message);
                        console.error('❌ Error stack:', error?.stack);
                        window.searchActivationResult = false;
                        window.isSearchModeActive = false;
                        return false;
                    }
                } else {
                    console.error('❌ SearchManager not initialized');
                    window.searchActivationResult = false;
                    window.isSearchModeActive = false;
                    return false;
                }
            };
            
            window.deactivateSearchJS = async () => {
                console.log('🔍 deactivateSearchJS called - delegating to SearchManager');
                if (this.searchManager) {
                    await this.searchManager.deactivateSearch();
                    
                    // Clear window flags
                    window.searchActivationResult = false;
                    window.isSearchModeActive = false;
                    
                    return true;
                } else {
                    console.error('❌ SearchManager not initialized');
                    window.searchActivationResult = false;
                    window.isSearchModeActive = false;
                    return false;
                }
            };
            
            window.isSearchActiveJS = () => {
                const searchManagerActive = this.searchManager ? this.searchManager.isSearchActive() : false;
                const windowFlagActive = window.isSearchModeActive || false;
                const isActive = searchManagerActive || windowFlagActive;
                console.log(`🔍 isSearchActiveJS called - searchManager: ${searchManagerActive}, windowFlag: ${windowFlagActive}, returning: ${isActive} (type: ${typeof isActive})`);
                return isActive;
            };
            
            window.getSearchResultsCountJS = () => {
                if (this.searchManager) {
                    const count = this.searchManager.getResultsCount();
                    console.log(`🔍 getSearchResultsCountJS called - returning: ${count} (type: ${typeof count})`);
                    return count;
                } else {
                    console.error('❌ SearchManager not initialized');
                    return 0;
                }
            };
            
            window.moveSearchResultToHomeAreaJS = async (fileObjectId) => {
                console.log('moveSearchResultToHomeAreaJS called - moving object to home area');
                
                // Find the file object by ID - check multiple ID properties
                const fileObject = this.stateManager.fileObjects.find(obj => {
                    return obj.userData.id === fileObjectId ||
                           (obj.userData.fileInfo && obj.userData.fileInfo.path === fileObjectId) ||
                           (obj.userData.fileData && obj.userData.fileData.path === fileObjectId);
                });
                
                if (!fileObject) {
                    console.error('File object not found for ID:', fileObjectId);
                    console.log('Available object IDs:', this.stateManager.fileObjects.map(obj => ({
                        id: obj.userData.id,
                        fileInfoPath: obj.userData.fileInfo?.path,
                        fileDataPath: obj.userData.fileData?.path
                    })));
                    return false;
                }
                
                // If search is active, use SearchManager's method
                if (this.searchManager && this.searchManager.isSearchActive && this.searchManager.isSearchActive()) {
                    await this.searchManager.moveResultToHomeArea(fileObject);
                    return true;
                }
                
                // Otherwise, use general home area movement with collision detection
                if (this.moveManager) {
                    const homePosition = this.findOpenPositionInHomeArea(fileObject);
                    await this.animateObjectToHomeArea(fileObject, homePosition);
                    
                    // Re-enable camera controls after move
                    if (this.cameraManager && this.cameraManager.controls) {
                        this.cameraManager.controls.enabled = true;
                        console.log('Camera controls re-enabled after move to home area');
                    }
                    
                    return true;
                } else {
                    console.error('MoveManager not initialized');
                    return false;
                }
            };
            
            // Helper: Find open position in home area using spiral pattern
            this.findOpenPositionInHomeArea = (objectToMove) => {
                const homeAreaRadius = 15;
                const objectSpacing = 3.0;
                const yPosition = 1;
                
                // Get occupied positions (excluding the object being moved)
                const occupiedPositions = this.stateManager.fileObjects
                    .filter(obj => obj !== objectToMove && obj.position)
                    .map(obj => ({ x: obj.position.x, y: obj.position.y, z: obj.position.z }));
                
                // Try center first
                const centerPos = { x: 0, y: yPosition, z: 0 };
                if (!this.isPositionOccupiedInHomeArea(centerPos, occupiedPositions, objectSpacing)) {
                    return centerPos;
                }
                
                // Spiral pattern outward
                for (let radius = 1; radius <= Math.floor(homeAreaRadius / objectSpacing); radius++) {
                    for (let angle = 0; angle < 360; angle += 45) {
                        const radians = (angle * Math.PI) / 180;
                        const x = radius * objectSpacing * Math.cos(radians);
                        const z = radius * objectSpacing * Math.sin(radians);
                        
                        const distance = Math.sqrt(x * x + z * z);
                        if (distance > homeAreaRadius) continue;
                        
                        const candidate = { x, y: yPosition, z };
                        if (!this.isPositionOccupiedInHomeArea(candidate, occupiedPositions, objectSpacing)) {
                            return candidate;
                        }
                    }
                }
                
                return centerPos; // Fallback
            };
            
            // Helper: Check if position is occupied
            this.isPositionOccupiedInHomeArea = (candidate, occupiedPositions, spacing) => {
                const tolerance = spacing * 0.8;
                return occupiedPositions.some(pos =>
                    Math.abs(pos.x - candidate.x) < tolerance &&
                    Math.abs(pos.z - candidate.z) < tolerance
                );
            };
            
            // Helper: Animate object to home area position
            this.animateObjectToHomeArea = (object, targetPosition) => {
                return new Promise((resolve) => {
                    const startPos = object.position.clone();
                    const targetPos = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z);
                    const startTime = Date.now();
                    const duration = 500; // ms
                    
                    const animate = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3); // Smooth easing
                        
                        object.position.lerpVectors(startPos, targetPos, eased);
                        
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            console.log('Object moved to home area at:', targetPosition);
                            resolve();
                        }
                    };
                    
                    animate();
                });
            };

            // ============================================================================
            // STACKING CONFIGURATION FUNCTIONS - For Advanced Options Dialog
            // ============================================================================

            window.getStackingConfigJS = () => {
                console.log('getStackingConfigJS called - delegating to SortingManager');
                if (this.sortingManager) {
                    return this.sortingManager.getStackingConfig();
                } else {
                    console.error('SortingManager not initialized');
                    return null;
                }
            };

            window.updateStackingConfigJS = (config) => {
                console.log('updateStackingConfigJS called - delegating to SortingManager');
                if (this.sortingManager) {
                    return this.sortingManager.updateStackingConfig(config);
                } else {
                    console.error('SortingManager not initialized');
                    return false;
                }
            };

            window.applyStackingConfigJS = () => {
                console.log('applyStackingConfigJS called - delegating to SortingManager');
                if (this.sortingManager) {
                    return this.sortingManager.applyStackingConfig();
                } else {
                    console.error('SortingManager not initialized');
                    return false;
                }
            };

            // ============================================================================
            // UNIFIED STACKING CONFIGURATION FUNCTIONS - Links Advanced Options to Both Sorting and Searching
            // ============================================================================

            window.getUnifiedStackingConfigJS = () => {
                console.log('getUnifiedStackingConfigJS called - delegating to SearchManager');
                if (this.searchManager) {
                    return this.searchManager.getUnifiedStackingConfig();
                } else {
                    console.error('SearchManager not initialized');
                    return null;
                }
            };

            window.updateUnifiedStackingConfigJS = (config) => {
                console.log('updateUnifiedStackingConfigJS called - delegating to SearchManager');
                if (this.searchManager) {
                    return this.searchManager.updateUnifiedStackingConfig(config);
                } else {
                    console.error('SearchManager not initialized');
                    return false;
                }
            };

            // Flutter-specific stacking config function with forced localStorage refresh
            window.getStackingConfigForFlutter = () => {
                console.log('🔍 Flutter-specific config request');
                
                // Force fresh localStorage read
                try {
                    const stored = localStorage.getItem('stackingConfiguration');
                    if (stored) {
                        const config = JSON.parse(stored);
                        console.log('✅ Returning fresh localStorage config to Flutter:', config);
                        return config;
                    }
                } catch (error) {
                    console.log('❌ Error reading localStorage for Flutter:', error);
                }
                
                // Fallback to JavaScript config
                const jsConfig = window.getUnifiedStackingConfigJS?.();
                console.log('✅ Returning JavaScript fallback config to Flutter:', jsConfig);
                return jsConfig;
            };

            window.applyUnifiedStackingConfigJS = () => {
                console.log('applyUnifiedStackingConfigJS called - delegating to SearchManager');
                if (this.searchManager) {
                    return this.searchManager.applyUnifiedStackingConfig();
                } else {
                    console.error('SearchManager not initialized');
                    return false;
                }
            };
            
            // Setup global app management methods for Dart communication
            this.setupGlobalAppMethods();
            
            console.log('=== GLOBAL FUNCTIONS SETUP COMPLETED ===');
            console.log('Available functions: createFileObjectsJS, resetHomeView, emergencyReset, addAppObjects, etc.');
        }

        async switchWorldTemplate(newWorldType) {
            console.log('🔵🔵🔵 MAINAPP switchWorldTemplate CALLED 🔵🔵🔵');
            console.log('🔵 World type:', newWorldType);
            console.log('🔵 this.worldManager exists:', !!this.worldManager);
            console.log('🔵 this.worldManager.switchWorldTemplate exists:', !!(this.worldManager && this.worldManager.switchWorldTemplate));
            const result = await this.worldManager.switchWorldTemplate(newWorldType);
            console.log('🔵🔵🔵 MAINAPP switchWorldTemplate COMPLETED 🔵🔵🔵');
            return result;
        }

        resetHomeView() {
            console.log('=== HOME VIEW TOGGLE REQUESTED ===');
            
            try {
                // Check if we're in explore mode and handle it specially
                console.log('🏠 Checking explore mode status...');
                
                // Try multiple sources for exploreManager
                let exploreManager = this.exploreManager || window.exploreManager;
                
                console.log('🏠   this.exploreManager exists:', !!this.exploreManager);
                console.log('🏠   window.exploreManager exists:', !!window.exploreManager);
                console.log('🏠   combined exploreManager exists:', !!exploreManager);
                console.log('🏠   exploreMode exists:', !!(exploreManager && exploreManager.exploreMode));
                console.log('🏠   exploreMode isActive:', !!(exploreManager && exploreManager.exploreMode && exploreManager.exploreMode.isActive));
                
                if (exploreManager && exploreManager.exploreMode && exploreManager.exploreMode.isActive) {
                    console.log('🏠 ✅ In explore mode - using explore home view reset');
                    exploreManager.exploreMode.resetToHomeView();
                    return;
                }
                
                console.log('🏠 Not in explore mode - using camera toggle functionality');
                
                // Use new toggle functionality for normal mode
                if (this.cameraManager && typeof this.cameraManager.toggleHomeView === 'function') {
                    console.log('Using new Home button toggle functionality');
                    this.cameraManager.toggleHomeView();
                } else {
                    // Fallback to traditional reset if toggle not available
                    console.log('Toggle functionality not available, using traditional reset');
                    this.fallbackResetHomeView();
                }
                
            } catch (error) {
                console.error('Error in resetHomeView toggle:', error);
                // Emergency fallback
                this.fallbackResetHomeView();
            }
        }

        /**
         * Fallback traditional reset for compatibility
         */
        fallbackResetHomeView() {
            console.log('=== FALLBACK HOME VIEW RESET ===');
            
            try {
                // Get world-specific home view settings
                const homePosition = this.getHomeViewPosition();
                const homeTarget = this.getHomeViewTarget();
                    
                console.log('Using world template home position:', homePosition);
                console.log('Using world template home target:', homeTarget);
                
                // Force immediate camera positioning
                if (this.camera) {
                    console.log('Force setting camera position manually first...');
                    this.camera.position.set(homePosition.x, homePosition.y, homePosition.z);
                    this.camera.lookAt(homeTarget.x, homeTarget.y, homeTarget.z);
                    this.camera.updateProjectionMatrix();
                }
                
                // Reset camera controls
                if (this.cameraControls) {
                    console.log('Resetting camera controls...');
                    this.cameraControls.enabled = false;
                    
                    this.cameraControls.setLookAt(
                        homePosition.x, homePosition.y, homePosition.z,
                        homeTarget.x, homeTarget.y, homeTarget.z,
                        true
                    );
                    
                    // Re-enable camera controls
                    this.cameraControls.enabled = true;
                    this.cameraControls.enableRotate = true;
                    this.cameraControls.enablePan = true;
                    this.cameraControls.enableZoom = true;
                    
                    // Re-apply world-specific camera constraints
                    if (this.currentWorldTemplate) {
                        this.currentWorldTemplate.applyCameraConstraints(this.cameraControls);
                    }
                    
                    // CRITICAL: Use enhanced camera control reset to fix orientation detection issues
                    if (this.cameraManager && typeof this.cameraManager.enhancedCameraControlReset === 'function') {
                        console.log('Applying enhanced camera control reset to fix orientation issues');
                        this.cameraManager.enhancedCameraControlReset();
                    } else {
                        // Fallback to landscape-aware controls if enhanced reset not available
                        console.log('Applying landscape-aware camera controls (enhanced reset not available)');
                        this.applyLandscapeAwareCameraControls();
                    }
                    
                    this.cameraControls.update(0);
                }
                
                console.log('Fallback home view reset completed successfully');
                
            } catch (error) {
                console.error('Error in fallbackResetHomeView:', error);
            }
        }
        
        emergencyReset() {
            console.log('=== EMERGENCY CAMERA RESET ===');
            
            try {
                // Completely recreate camera controls
                if (this.cameraControls) {
                    this.cameraControls.dispose();
                    this.cameraControls = null;
                }
                
                // Reset camera to original position
                this.camera.position.set(0, 8, 15);
                this.camera.lookAt(0, 0, 0);
                this.camera.updateProjectionMatrix();
                
                // Recreate camera controls
                this.cameraControls = new CameraControls(this.camera, this.renderer.domElement);
                this.cameraControls.setTarget(0, 0, 0, false);
                
                // Enable all controls
                this.cameraControls.enabled = true;
                this.cameraControls.enableRotate = true;
                this.cameraControls.enablePan = true;
                this.cameraControls.enableZoom = true;
                
                // Clear interaction states and update all manager references
                if (this.interactionManager) {
                    this.interactionManager.cameraControls = this.cameraControls; // Update reference
                }
                
                // Update MoveManager camera controls reference
                if (this.moveManager) {
                    this.moveManager.cameraControls = this.cameraControls;
                }
                
                // Update InputManager camera controls reference  
                if (this.inputManager) {
                    this.inputManager.cameraControls = this.cameraControls;
                }
                
                // CRITICAL: Use enhanced camera control reset to fix orientation detection issues
                if (this.cameraManager && typeof this.cameraManager.enhancedCameraControlReset === 'function') {
                    console.log('Applying enhanced camera control reset to fix orientation issues (emergency reset)');
                    this.cameraManager.enhancedCameraControlReset();
                } else {
                    // Fallback to landscape-aware controls if enhanced reset not available
                    console.log('Applying landscape-aware camera controls (enhanced reset not available - emergency)');
                    this.applyLandscapeAwareCameraControls();
                }
                
                console.log('Emergency camera reset completed - camera controls recreated');
                
            } catch (error) {
                console.error('Emergency reset failed:', error);
            }
        }

        /**
         * Camera control methods
         */
        zoomIn() {
            return this.cameraManager.zoomIn();
        }

        zoomOut() {
            return this.cameraManager.zoomOut();
        }

        // Utility functions
        getObjectCountJS() {
            console.log('Current fileObjects count:', this.stateManager.fileObjects.length);
            console.log('Scene children count:', this.scene.children.length);
            console.log('Scene children types:', this.scene.children.map(child => child.type));
            return {
                fileObjects: this.stateManager.fileObjects.length,
                sceneChildren: this.scene.children.length,
                sceneChildTypes: this.scene.children.map(child => child.type)
            };
        }

        forceRenderJS() {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
                console.log('Forced render via forceRenderJS');
                return true;
            }
            return false;
        }

        getCurrentWorldType() {
            return this.worldManager.getCurrentWorldType();
        }

        // ============================================================================
        // APP OBJECT MANAGEMENT - Virtual Objects (Apps, URLs, etc.)
        // ============================================================================

        /**
         * Add app objects to the 3D world
         * @param {Array} apps - Array of app data objects
         * @param {Object} position - Optional starting position
         * @returns {Array} Array of created app objects
         */
        addAppObjects(apps, position = { x: 0, y: 0, z: 0 }) {
            console.log('MainApplication: Adding', apps.length, 'app objects to 3D world');
            
            if (!this.virtualObjectManager) {
                console.error('VirtualObjectManager not initialized');
                return [];
            }
            
            try {
                const addedObjects = this.virtualObjectManager.addAppObjects(apps, position);
                
                // Notify other systems about new objects
                if (this.sortingManager && addedObjects.length > 0) {
                    // Update sorting manager with new objects
                    console.log('Updating sorting manager with new app objects');
                }
                
                // Update billboards if needed
                if (this.billboardManager && addedObjects.length > 0) {
                    addedObjects.forEach(obj => {
                        if (obj.userData && obj.userData.fileData) {
                            this.billboardManager.addBillboardToObject(obj, obj.userData.fileData);
                        }
                    });
                }
                
                console.log('Successfully added', addedObjects.length, 'app objects to 3D world');
                return addedObjects;
            } catch (error) {
                console.error('Error adding app objects:', error);
                return [];
            }
        }

        /**
         * Handle app launch requests from 3D world interactions
         * @param {string} packageName - Package name of the app to launch
         * @param {string} appName - Display name of the app
         */
        handleAppLaunchRequest(packageName, appName) {
            console.log('MainApplication: Handling app launch request:', appName, packageName);
            
            if (this.virtualObjectManager) {
                this.virtualObjectManager.launchApp(packageName, appName);
            }
        }

        /**
         * Remove app object from the 3D world
         * @param {string} packageName - Package name of the app to remove
         * @returns {boolean} True if removed successfully
         */
        removeAppObject(packageName) {
            if (!this.virtualObjectManager) {
                return false;
            }
            
            return this.virtualObjectManager.removeAppObject(packageName);
        }

        /**
         * Get all app objects in the 3D world
         * @returns {Array} Array of app objects
         */
        getAllAppObjects() {
            if (!this.virtualObjectManager) {
                return [];
            }
            
            return this.virtualObjectManager.getAllAppObjects();
        }

        /**
         * Handle virtual object interactions (taps, double-taps, etc.)
         * @param {Object} object - The 3D object that was interacted with
         * @param {string} interactionType - Type of interaction (tap, double-tap, etc.)
         * @returns {boolean} True if interaction was handled
         */
        handleVirtualObjectInteraction(object, interactionType = 'tap') {
            if (!this.virtualObjectManager) {
                return false;
            }
            
            // Check if it's an app object
            if (object.userData && object.userData.type === 'app') {
                return this.virtualObjectManager.handleAppObjectInteraction(object, interactionType);
            }
            
            // Could handle other virtual object types here in the future
            return false;
        }

        /**
         * Create global methods for Dart communication
         */
        setupGlobalAppMethods() {
            // Make app methods globally accessible for Dart communication
            window.addAppObjects = (apps, position) => this.addAppObjects(apps, position);
            window.handleAppLaunchRequest = (packageName, appName) => this.handleAppLaunchRequest(packageName, appName);
            window.removeAppObject = (packageName) => this.removeAppObject(packageName);
            window.getAllAppObjects = () => this.getAllAppObjects();
            window.handleVirtualObjectInteraction = (object, type) => this.handleVirtualObjectInteraction(object, type);
            
            console.log('Global app methods set up for Dart communication');
        }

        // ============================================================================
        // MOBILE LANDSCAPE CAMERA CONTROLS - Enhanced control settings for orientation
        // ============================================================================

        /**
         * Apply landscape-aware camera control settings based on screen orientation
         * This provides optimized control sensitivity and damping for mobile devices
         */
        applyLandscapeAwareCameraControls() {
            return this.cameraManager.applyLandscapeAwareCameraControls();
        }

        /**
         * Setup orientation listeners for dynamic camera control adjustment
         */
        setupOrientationListeners() {
            return this.cameraManager.setupOrientationListeners();
        }

        // ============================================================================
        // MOVE HISTORY MANAGEMENT
        // ============================================================================
        
        captureMoveHistoryState(primaryObject) {
            console.log('captureMoveHistoryState called - delegating to WorldManager');
            return this.worldManager.captureMoveHistoryState(primaryObject);
        }

        // ============================================================================
        // STACKING DEPENDENCY MANAGEMENT
        // ============================================================================
        
        /**
         * Move objects that are stacked on top of a moved object
         * This ensures that when a bottom object in a stack is moved, 
         * all objects stacked on top move with it
         * @param {Object3D} movedObject - The object that was moved
         * @param {Object} originalPosition - Original position before move {x, y, z}
         */
        moveStackedDependents(movedObject, originalPosition) {
            // console.log(`[STACKING] App.moveStackedDependents called for: ${movedObject.userData?.fileName || movedObject.userData?.name}`);
            
            // Use the global function we defined in initialization.js
            if (typeof window.moveStackedDependents === 'function') {
                window.moveStackedDependents(movedObject, originalPosition, this.stateManager.fileObjects);
            } else {
                // console.warn('[STACKING] Global moveStackedDependents function not available');
            }
        }
        
        /**
         * Apply gravity to floating objects after moves or deletions
         * This ensures objects don't float in the air when their support is removed
         */
        applyGravityToFloatingObjects() {
            // console.log('[STACKING] Applying gravity to floating objects...');
            
            // Use the global function we defined in initialization.js
            if (typeof window.applyGravityToFloatingObjects === 'function') {
                window.applyGravityToFloatingObjects();
            } else {
                // console.warn('[STACKING] Global applyGravityToFloatingObjects function not available');
            }
        }
    }

    // ============================================================================
    // EXPORTS
    // ============================================================================
    window.WindowWorldApp = WindowWorldApp;
    
    console.log("MainApplication module loaded - WindowWorldApp available globally");
})();
