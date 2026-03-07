/**
 * UI Controller for Browser-Based FirstTaps MV3D
 * Handles all button interactions, modals, and API integrations
 */

// Global state
let currentWorld = 'green-plane';
let searchDebounceTimer = null;
let selectedPlatforms = new Set(['youtube', 'deezer', 'vimeo', 'soundcloud', 'dailymotion']);

// API Configuration
const API_CONFIG = {
    youtube: {
        apiKey: 'AIzaSyDwb4D3YhbdAYPHWYikUUGYnw8F5V83fqc', // Your existing key from mobile app
        baseUrl: 'https://www.googleapis.com/youtube/v3/search'
    },
    deezer: {
        baseUrl: 'https://api.deezer.com/search'
    },
    vimeo: {
        baseUrl: 'https://api.vimeo.com/videos'
    },
    soundcloud: {
        clientId: 'YOUR_SOUNDCLOUD_CLIENT_ID',
        baseUrl: 'https://api.soundcloud.com/tracks'
    },
    dailymotion: {
        baseUrl: 'https://api.dailymotion.com/videos'
    }
};

// World Templates
const WORLD_TEMPLATES = [
    { id: 'green-plane', name: 'Green Plane', icon: '🌱', free: true },
    { id: 'space', name: 'Space', icon: '🌌', free: true },
    { id: 'ocean', name: 'Ocean', icon: '🌊', free: true },
    { id: 'record-store', name: 'Record Store', icon: '💿', free: true }
];

// Furniture Types
const FURNITURE_TYPES = [
    { id: 'bookshelf', name: 'Bookshelf', icon: '📚', capacity: 10 },
    { id: 'gallery-wall', name: 'Gallery Wall', icon: '🖼️', capacity: 8 },
    { id: 'riser', name: 'Riser', icon: '📐', capacity: 6 },
    { id: 'stage-small', name: 'Stage Small', icon: '🎭', capacity: 4 },
    { id: 'stage-large', name: 'Stage Large', icon: '🎪', capacity: 8 }
];

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎨 Initializing UI Controller...');
    initializeButtons();
    initializePlatformFilters();
    initializeMusicSearch();
    populateWorldList();
    populateFurnitureTypes();
    
    // Load saved world preference
    const savedWorld = localStorage.getItem('currentWorld');
    if (savedWorld) {
        currentWorld = savedWorld;
    }
});

// Button Initialization
function initializeButtons() {
    document.getElementById('scoreBtn').addEventListener('click', showScoreboard);
    document.getElementById('homeBtn').addEventListener('click', resetHomeView);
    document.getElementById('exploreBtn').addEventListener('click', toggleExploreMode);
    document.getElementById('searchBtn').addEventListener('click', activateSearch);
    document.getElementById('optionsBtn').addEventListener('click', () => openModal('optionsModal'));
    document.getElementById('worldSwitchBtn').addEventListener('click', () => openModal('worldSwitchModal'));
    document.getElementById('addContentBtn').addEventListener('click', () => openModal('addContentModal'));
    document.getElementById('listViewBtn').addEventListener('click', openFurnitureManager);
}

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Button Actions
function showScoreboard() {
    console.log('📊 Showing scoreboard');
    if (window.entityUIManager && window.entityUIManager.showFullScoreboard) {
        window.entityUIManager.showFullScoreboard();
    } else {
        console.error('Scoreboard not available');
    }
}

function resetHomeView() {
    console.log('🏠 Resetting home view');
    if (window.resetHomeView) {
        window.resetHomeView();
    } else {
        console.error('resetHomeView function not available');
    }
}

function toggleExploreMode() {
    console.log('🧭 Toggling explore mode');
    if (window.cycleNavigationMode) {
        window.cycleNavigationMode();
    } else {
        console.error('cycleNavigationMode function not available');
    }
}

function activateSearch() {
    console.log('🔍 Activating universal search');
    if (window.app && window.app.searchManager && window.app.searchManager.activateSearch) {
        window.app.searchManager.activateSearch();
    } else {
        console.error('Search manager not available');
    }
}

function resetWorld() {
    if (confirm('Are you sure you want to clear all content and reset the world?')) {
        console.log('🔄 Resetting world');
        
        // Clear localStorage
        localStorage.clear();
        
        // Reset world in JavaScript
        if (window.emergencyReset) {
            window.emergencyReset();
        }
        
        // Reload page
        location.reload();
    }
    closeModal('optionsModal');
}

function showInstructions() {
    alert('Welcome to FirstTaps MV3D Browser!\n\n' +
          '🏠 Home: Toggle between closeup and aerial views\n' +
          '🧭 Explore: Cycle through navigation modes\n' +
          '🔍 Search: Find content in your world\n' +
          '🌍 World Switch: Change your environment\n' +
          '➕ Add Content: Add music, videos, and links\n' +
          '📋 2D List View: Manage your furniture\n\n' +
          'Use your mouse to pan, zoom, and rotate the 3D world!');
    closeModal('optionsModal');
}

// World Switching
function populateWorldList() {
    const worldList = document.getElementById('worldList');
    if (!worldList) return;
    
    worldList.innerHTML = '';
    
    WORLD_TEMPLATES.forEach(world => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.onclick = () => switchWorld(world.id);
        
        const isCurrentWorld = world.id === currentWorld;
        const checkmark = isCurrentWorld ? ' ✓' : '';
        
        item.innerHTML = `
            <div class="menu-item-icon">${world.icon}</div>
            <div class="menu-item-text">
                <div class="menu-item-title">${world.name}${checkmark}</div>
                <div class="menu-item-subtitle">${world.free ? 'Free' : 'Premium'}</div>
            </div>
        `;
        
        worldList.appendChild(item);
    });
}

async function switchWorld(worldId) {
    console.log(`🌍 Switching to world: ${worldId}`);
    
    try {
        // Save to localStorage
        localStorage.setItem('currentWorld', worldId);
        currentWorld = worldId;
        
        // Call JavaScript world switch function
        if (window.switchWorldTemplate) {
            await window.switchWorldTemplate(worldId);
            alert(`✅ Switched to ${worldId} world!`);
        } else {
            console.error('switchWorldTemplate function not available');
            alert('❌ World switching not available');
        }
        
        closeModal('worldSwitchModal');
        populateWorldList(); // Refresh list to show checkmark
    } catch (error) {
        console.error('World switch error:', error);
        alert(`❌ Failed to switch world: ${error.message}`);
    }
}

// Music Search
function initializePlatformFilters() {
    const filters = document.querySelectorAll('.platform-filter');
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            const platform = filter.dataset.platform;
            
            if (filter.classList.contains('active')) {
                // Don't allow deselecting all platforms
                if (selectedPlatforms.size > 1) {
                    filter.classList.remove('active');
                    selectedPlatforms.delete(platform);
                }
            } else {
                filter.classList.add('active');
                selectedPlatforms.add(platform);
            }
            
            // Re-run search if there's a query
            const query = document.getElementById('musicSearchInput').value.trim();
            if (query) {
                performMusicSearch(query);
            }
        });
    });
}

function initializeMusicSearch() {
    const searchInput = document.getElementById('musicSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timer
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
        }
        
        // Wait 500ms after user stops typing
        searchDebounceTimer = setTimeout(() => {
            if (query) {
                performMusicSearch(query);
            } else {
                document.getElementById('musicSearchResults').innerHTML = '';
            }
        }, 500);
    });
}

function openMusicSearch() {
    openModal('musicSearchModal');
    document.getElementById('musicSearchInput').focus();
}

async function performMusicSearch(query) {
    const resultsContainer = document.getElementById('musicSearchResults');
    if (!resultsContainer) return;
    
    // Show loading
    resultsContainer.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        const allResults = [];
        
        // Search each enabled platform
        const searchPromises = [];
        
        if (selectedPlatforms.has('youtube')) {
            searchPromises.push(searchYouTube(query));
        }
        if (selectedPlatforms.has('deezer')) {
            searchPromises.push(searchDeezer(query));
        }
        if (selectedPlatforms.has('vimeo')) {
            searchPromises.push(searchVimeo(query));
        }
        if (selectedPlatforms.has('soundcloud')) {
            searchPromises.push(searchSoundCloud(query));
        }
        if (selectedPlatforms.has('dailymotion')) {
            searchPromises.push(searchDailymotion(query));
        }
        
        const results = await Promise.allSettled(searchPromises);
        
        // Collect successful results
        results.forEach(result => {
            if (result.status === 'fulfilled' && Array.isArray(result.value)) {
                allResults.push(...result.value);
            }
        });
        
        // Display results
        displaySearchResults(allResults);
        
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = `<p style="color: #f44336;">Search failed: ${error.message}</p>`;
    }
}

async function searchYouTube(query) {
    const url = `${API_CONFIG.youtube.baseUrl}?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${API_CONFIG.youtube.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('YouTube search failed');
    
    const data = await response.json();
    
    return data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default.url,
        platform: 'youtube',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));
}

async function searchDeezer(query) {
    const url = `${API_CONFIG.deezer.baseUrl}?q=${encodeURIComponent(query)}&limit=10`;
    
    // Deezer API requires CORS proxy for browser requests
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const response = await fetch(proxyUrl + encodeURIComponent(url));
    
    if (!response.ok) throw new Error('Deezer search failed');
    
    const data = await response.json();
    
    return data.data.map(item => ({
        id: item.id,
        title: `${item.title} - ${item.artist.name}`,
        thumbnail: item.album.cover_small,
        platform: 'deezer',
        url: item.link
    }));
}

async function searchVimeo(query) {
    // Vimeo requires auth token - simplified search
    try {
        const url = `https://api.vimeo.com/videos?query=${encodeURIComponent(query)}&per_page=10`;
        // Note: This will fail without proper authentication
        // For full implementation, need backend proxy with Vimeo OAuth token
        return [];
    } catch (error) {
        console.warn('Vimeo search not available (requires authentication)');
        return [];
    }
}

async function searchSoundCloud(query) {
    try {
        const url = `${API_CONFIG.soundcloud.baseUrl}?q=${encodeURIComponent(query)}&limit=10&client_id=${API_CONFIG.soundcloud.clientId}`;
        // Note: Requires valid SoundCloud client ID        return [];
    } catch (error) {
        console.warn('SoundCloud search not available (requires client ID)');
        return [];
    }
}

async function searchDailymotion(query) {
    try {
        const url = `${API_CONFIG.dailymotion.baseUrl}?search=${encodeURIComponent(query)}&limit=10&fields=id,title,thumbnail_url,url`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Dailymotion search failed');
        
        const data = await response.json();
        
        return data.list.map(item => ({
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail_url,
            platform: 'dailymotion',
            url: item.url
        }));
    } catch (error) {
        console.warn('Dailymotion search failed:', error);
        return [];
    }
}

function displaySearchResults(results) {
    const resultsContainer = document.getElementById('musicSearchResults');
    if (!resultsContainer) return;
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: #B0B0B0;">No results found</p>';
        return;
    }
    
    resultsContainer.innerHTML = '';
    
    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.onclick = () => addSearchResultToWorld(result);
        
        item.innerHTML = `
            <div class="search-result-title">${escapeHtml(result.title)}</div>
            <div class="search-result-platform">${result.platform.toUpperCase()}</div>
        `;
        
        resultsContainer.appendChild(item);
    });
}

async function addSearchResultToWorld(result) {
    console.log('Adding to world:', result);
    
    try {
        // Add link object to 3D world
        if (window.app && window.app.addAppObject) {
            await window.app.addAppObject({
                url: result.url,
                type: 'link',
                title: result.title,
                platform: result.platform
            });
            
            alert(`✅ Added "${result.title}" to your world!`);
            closeModal('musicSearchModal');
        } else {
            console.error('addAppObject not available');
            alert('❌ Failed to add to world');
        }
    } catch (error) {
        console.error('Add to world error:', error);
        alert(`❌ Failed: ${error.message}`);
    }
}

// Add URL
function openAddUrl() {
    openModal('addUrlModal');
    document.getElementById('urlInput').focus();
}

async function addUrlToWorld(urlParam) {
    // If URL is provided as parameter (from Flutter), use it. Otherwise, read from input field.
    let url;
    if (urlParam) {
        url = urlParam.trim();
        console.log('🔗 Using URL from parameter:', url);
    } else {
        const urlInput = document.getElementById('urlInput');
        if (!urlInput) {
            console.error('❌ No URL provided and urlInput element not found');
            return;
        }
        url = urlInput.value.trim();
        console.log('🔗 Using URL from input field:', url);
    }
    
    if (!url) {
        alert('Please enter a URL');
        return;
    }
    
    try {
        // Validate URL
        new URL(url);
        
        // Add link to world
        if (window.app && window.app.addAppObject) {
            await window.app.addAppObject({
                url: url,
                type: 'link'
            });
            
            alert(`✅ Added link to your world!`);
            
            // Only clear input field if it was used
            if (!urlParam) {
                const urlInput = document.getElementById('urlInput');
                if (urlInput) {
                    urlInput.value = '';
                }
                closeModal('addUrlModal');
            }
        } else {
            console.error('addAppObject not available');
            alert('❌ Failed to add link');
        }
    } catch (error) {
        console.error('Add URL error:', error);
        alert(`❌ Invalid URL or failed to add: ${error.message}`);
    }
}

// Furniture Creation
function populateFurnitureTypes() {
    const furnitureList = document.getElementById('furnitureTypeList');
    if (!furnitureList) return;
    
    furnitureList.innerHTML = '';
    
    FURNITURE_TYPES.forEach(type => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.onclick = () => createFurniture(type.id);
        
        item.innerHTML = `
            <div class="menu-item-icon">${type.icon}</div>
            <div class="menu-item-text">
                <div class="menu-item-title">${type.name}</div>
                <div class="menu-item-subtitle">Capacity: ${type.capacity} items</div>
            </div>
        `;
        
        furnitureList.appendChild(item);
    });
}

function openFurnitureCreator() {
    openModal('furnitureCreatorModal');
}

async function createFurniture(furnitureType) {
    console.log(`🪑 Creating furniture: ${furnitureType}`);
    
    try {
        if (window.app && window.app.furnitureManager && window.app.furnitureManager.createFurniture) {
            await window.app.furnitureManager.createFurniture({
                type: furnitureType,
                material: 'metal' // Default material
            });
            
            alert(`✅ Created ${furnitureType} furniture!`);
            closeModal('furnitureCreatorModal');
        } else {
            console.error('Furniture manager not available');
            alert('❌ Furniture creation not available');
        }
    } catch (error) {
        console.error('Furniture creation error:', error);
        alert(`❌ Failed to create furniture: ${error.message}`);
    }
}

// Furniture Manager (2D List View)
async function openFurnitureManager() {
    openModal('furnitureManagerModal');
    await loadFurnitureList();
}

async function loadFurnitureList() {
    const furnitureList = document.getElementById('furnitureList');
    if (!furnitureList) return;
    
    // Show loading
    furnitureList.innerHTML = '<div class="loading-spinner"></div>';
    
    try {
        // Get furniture from JavaScript
        let allFurniture = [];
        
        if (window.app && window.app.furnitureManager && window.app.furnitureManager.getAllFurniture) {
            allFurniture = window.app.furnitureManager.getAllFurniture();
        }
        
        if (allFurniture.length === 0) {
            furnitureList.innerHTML = '<p style="color: #B0B0B0;">No furniture in your world yet</p>';
            return;
        }
        
        furnitureList.innerHTML = '';
        
        allFurniture.forEach(furniture => {
            const item = document.createElement('div');
            item.className = 'furniture-item';
            
            const objectCount = furniture.objectIds ? furniture.objectIds.length : 0;
            const capacity = furniture.capacity || 0;
            
            item.innerHTML = `
                <div class="furniture-item-header">
                    <div>
                        <div class="furniture-item-title">${escapeHtml(furniture.name || furniture.type)}</div>
                        <div class="furniture-item-type">${furniture.type} • ${objectCount}/${capacity} items</div>
                    </div>
                    <div class="furniture-item-actions">
                        <button class="furniture-action-btn" onclick="focusFurniture('${furniture.id}')">Focus</button>
                        <button class="furniture-action-btn delete" onclick="deleteFurniture('${furniture.id}')">Delete</button>
                    </div>
                </div>
            `;
            
            furnitureList.appendChild(item);
        });
        
    } catch (error) {
        console.error('Load furniture error:', error);
        furnitureList.innerHTML = '<p style="color: #f44336;">Failed to load furniture</p>';
    }
}

async function focusFurniture(furnitureId) {
    console.log(`🎯 Focusing furniture: ${furnitureId}`);
    
    try {
        if (window.app && window.app.furnitureManager) {
            const furniture = window.app.furnitureManager.getFurnitureById(furnitureId);
            if (furniture && window.app.cameraManager) {
                window.app.cameraManager.focusOnObject(furniture);
                closeModal('furnitureManagerModal');
            }
        }
    } catch (error) {
        console.error('Focus furniture error:', error);
    }
}

async function deleteFurniture(furnitureId) {
    if (!confirm('Are you sure you want to delete this furniture?')) {
        return;
    }
    
    console.log(`🗑️ Deleting furniture: ${furnitureId}`);
    
    try {
        if (window.app && window.app.furnitureManager && window.app.furnitureManager.removeFurniture) {
            await window.app.furnitureManager.removeFurniture(furnitureId);
            
            // Reload furniture list
            await loadFurnitureList();
        }
    } catch (error) {
        console.error('Delete furniture error:', error);
        alert(`❌ Failed to delete furniture: ${error.message}`);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export functions to global scope for inline onclick handlers
window.closeModal = closeModal;
window.openModal = openModal;
window.resetWorld = resetWorld;
window.showInstructions = showInstructions;
window.switchWorld = switchWorld;
window.openMusicSearch = openMusicSearch;
window.openAddUrl = openAddUrl;
window.addUrlToWorld = addUrlToWorld;
window.openFurnitureCreator = openFurnitureCreator;
window.createFurniture = createFurniture;
window.openFurnitureManager = openFurnitureManager;
window.focusFurniture = focusFurniture;
window.deleteFurniture = deleteFurniture;

console.log('✅ UI Controller initialized');
