import { Window } from './tauri-api/window.js';
const appWindow = Window.getCurrent();
console.log("appWindow object:", appWindow);

// Application State
let state = {
    mode: 'single',
    packageType: 'exe',
    selectedFile: null,
    theme: 'light'
};

// DOM Elements
let elements = {};

// Initialize the application
function initializeApp() {
    try {
        // Cache DOM elements
        cacheElements();
        
        // Initialize theme
        initializeTheme();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize UI
        updateUploadLabel();
        updateInfoMessage();
        
        console.log('Intune Wrapper initialized successfully');
    } catch (error) {
        console.error("Failed to initialize application:", error);
        showError("Application failed to load. Please refresh the page.");
    }
}

// Cache frequently used DOM elements
function cacheElements() {
    elements = {
        themeToggle: document.getElementById('themeToggle'),
        packageOptions: document.querySelectorAll('.package-option'),
        modeInputs: document.querySelectorAll('input[name="mode"]'),
        fileInput: document.getElementById('fileInput'),
        selectedFileName: document.getElementById('selectedFileName'),
        createBtn: document.getElementById('createBtn'),
        uploadTitle: document.querySelector('.upload-title'),
        infoMessage: document.querySelector('.info-message'),
        statusValue: document.getElementById('statusValue'),
        folderSelection: document.querySelector('.folder-selection'),
        singleFileSelection: document.querySelector('.single-file-selection'),
        folderInput: document.getElementById('folderInput'),
        selectedFolderName: document.getElementById('selectedFolderName'),
        selectedFileNameBulk: document.getElementById('selectedFileNameBulk'),
        statusValueBulk: document.getElementById('statusValueBulk')
    };
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('intuneWrapper_theme') || 'light';
    state.theme = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Log theme initialization
    console.log(`Theme initialized: ${savedTheme}`);
}

function toggleTheme() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    state.theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('intuneWrapper_theme', newTheme);
    
    // Add a subtle animation to the toggle button
    elements.themeToggle.style.transform = 'rotate(180deg)';
    setTimeout(() => {
        elements.themeToggle.style.transform = '';
    }, 300);
    
    console.log(`Theme switched to: ${newTheme}`);
}

// Event Listeners Setup
function setupEventListeners() {
    try {
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', toggleTheme);
        }
        
        elements.packageOptions.forEach(option => {
            option.addEventListener('click', () => handlePackageTypeChange(option));
            option.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handlePackageTypeChange(option);
                }
            });
            option.setAttribute('tabindex', '0');
        });
        
        elements.modeInputs.forEach(input => {
            input.addEventListener('change', handleModeChange);
        });
        
        if (elements.fileInput) {
            elements.fileInput.addEventListener('change', handleFileChange);
        }
        if (elements.folderInput) {
            elements.folderInput.addEventListener('change', handleFolderChange);
        }
        
        if (elements.createBtn) {
            elements.createBtn.addEventListener('click', handleCreatePackage);
        }
        
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        setupWindowControls();
    } catch (error) {
        console.error("Failed to setup event listeners:", error);
        showError("Could not setup application controls.");
    }
}

// Package type change handler
function handlePackageTypeChange(selectedOption) {
    elements.packageOptions.forEach(opt => {
        opt.classList.remove('selected');
        opt.setAttribute('aria-selected', 'false');
    });
    
    selectedOption.classList.add('selected');
    selectedOption.setAttribute('aria-selected', 'true');
    
    state.packageType = selectedOption.dataset.type;
    
    updateUploadLabel();
    updateFileInputAccept();
    
    if (state.mode === 'bulk' && elements.folderInput.files.length > 0) {
        const event = { target: { files: elements.folderInput.files } };
        handleFolderChange(event);
    }
    
    console.log(`Package type changed to: ${state.packageType}`);
}

// Mode change handler
function handleModeChange(event) {
    state.mode = event.target.value;
    updateInfoMessage();
    if (state.mode === 'bulk') {
        elements.folderSelection.style.display = 'block';
        elements.singleFileSelection.style.display = 'none';
    } else {
        elements.folderSelection.style.display = 'none';
        elements.singleFileSelection.style.display = 'block';
    }
    console.log(`Mode changed to: ${state.mode}`);
}

// Folder change handler
function handleFolderChange(event) {
    const files = event.target.files;
    if (files.length > 0) {
        elements.selectedFolderName.textContent = files[0].path.substring(0, files[0].path.lastIndexOf('\\'));
        elements.selectedFileNameBulk.textContent = `${files.length} files selected`;
        elements.statusValueBulk.textContent = 'Ready';
        elements.createBtn.disabled = false;
    } else {
        elements.selectedFolderName.textContent = 'C:\\Temp\\IntuneWrapper\\Input';
        elements.selectedFileNameBulk.textContent = 'None selected';
        elements.statusValueBulk.textContent = 'Ready';
        elements.createBtn.disabled = true;
    }
}

// File change handler
function handleFileChange(event) {
    const file = event.target.files[0];
    
    if (file) {
        if (isValidFileType(file)) {
            state.selectedFile = file;
            elements.selectedFileName.textContent = file.name;
            elements.createBtn.disabled = false;
            elements.fileInput.style.borderColor = '#10b981';
            console.log(`File selected: ${file.name} (${file.size} bytes)`);
        } else {
            showError(`Invalid file type. Please select a valid ${state.packageType.toUpperCase()} file.`);
            elements.fileInput.value = '';
            state.selectedFile = null;
            elements.selectedFileName.textContent = 'None selected';
            elements.createBtn.disabled = true;
        }
    }
    else {
        state.selectedFile = null;
        elements.selectedFileName.textContent = 'None selected';
        elements.createBtn.disabled = true;
        elements.fileInput.style.borderColor = '';
    }
}

// Create package handler
function handleCreatePackage() {
    try {
        if (state.selectedFile) {
            elements.createBtn.textContent = state.mode === 'bulk' ? 'Creating Packages...' : 'Creating Package...';
            elements.createBtn.disabled = true;
            
            setTimeout(() => {
                let message;
                if (state.mode === 'bulk') {
                    message = `Successfully created ${state.packageType.toUpperCase()} package for "${state.selectedFile.name}" in ${state.mode} mode! (Bulk processing will handle multiple files when available)`;
                } else {
                    message = `Successfully created ${state.packageType.toUpperCase()} package for "${state.selectedFile.name}" in ${state.mode} mode!`;
                }
                showSuccess(message);
                
                elements.createBtn.textContent = 'Create Package';
                elements.createBtn.disabled = false;
                
                console.log(`Package created: ${state.packageType} - ${state.selectedFile.name} in ${state.mode} mode`);
            }, 1500);
        }
    } catch (error) {
        console.error("Failed to create package:", error);
        showError("An unexpected error occurred during package creation.");
        elements.createBtn.textContent = 'Create Package';
        elements.createBtn.disabled = false;
    }
}

// Keyboard shortcuts handler
function handleKeyboardShortcuts(event) {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        toggleTheme();
    }
    
    if (event.key === 'Escape' && state.selectedFile) {
        elements.fileInput.value = '';
        handleFileChange({ target: { files: [] } });
    }
}

// Window controls setup
function setupWindowControls() {
    try {
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log("Close button clicked");
                appWindow.close();
            });
        }
    } catch (error) {
        console.error("Failed to setup window controls:", error);
        showError("Window controls could not be initialized.");
    }
}

// Utility Functions
function updateUploadLabel() {
    const extensions = {
        'exe': 'EXE',
        'msi': 'MSI',
        'psadt': 'PSADT',
        'vbs': 'VBS',
        'batch': 'BATCH',
        'ps1': 'PS1'
    };
    
    if (elements.uploadTitle) {
        elements.uploadTitle.textContent = `Select ${extensions[state.packageType]} file`;
    }
}

function updateInfoMessage() {
    const messages = {
        'bulk': '<strong>Bulk Mode:</strong> The selected file will be processed with bulk packaging options for deployment.',
        'single': '<strong>Single Mode:</strong> The selected file will be packaged for deployment.'
    };
    
    if (elements.infoMessage) {
        elements.infoMessage.innerHTML = messages[state.mode];
    }
}

function updateFileInputAccept() {
    const acceptMap = {
        'exe': '.exe',
        'msi': '.msi',
        'psadt': '.ps1,.psadt',
        'vbs': '.vbs',
        'batch': '.bat,.cmd',
        'ps1': '.ps1'
    };
    
    if (elements.fileInput) {
        elements.fileInput.setAttribute('accept', acceptMap[state.packageType] || '.exe,.msi,.ps1,.vbs,.bat');
    }
}

function isValidFileType(file) {
    const fileName = file.name.toLowerCase();
    const typeMap = {
        'exe': ['.exe'],
        'msi': ['.msi'],
        'psadt': ['.ps1', '.psadt'],
        'vbs': ['.vbs'],
        'batch': ['.bat', '.cmd'],
        'ps1': ['.ps1']
    };
    
    const validExtensions = typeMap[state.packageType] || ['.exe'];
    return validExtensions.some(ext => fileName.endsWith(ext));
}

// Reset selection state
function resetSelection() {
    state.selectedFile = null;
    
    if (elements.selectedFileName) {
        elements.selectedFileName.textContent = 'None selected';
    }
    if (elements.statusValue) {
        elements.statusValue.textContent = 'Ready';
    }
    if (elements.createBtn) {
        elements.createBtn.disabled = true;
    }
    
    if (elements.fileInput) {
        elements.fileInput.value = '';
        elements.fileInput.style.borderColor = '';
    }
}

// Notification functions
function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        fontSize: '14px',
        zIndex: '9999',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Drag and drop functionality
function setupDragAndDrop() {
    const fileSection = document.querySelector('.file-section');
    if (!fileSection) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        fileSection.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        fileSection.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        fileSection.addEventListener(eventName, unhighlight, false);
    });
    
    fileSection.addEventListener('drop', handleDrop, false);
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        fileSection.style.borderColor = '#7c3aed';
        fileSection.style.backgroundColor = 'rgba(124, 58, 237, 0.05)';
    }
    
    function unhighlight() {
        fileSection.style.borderColor = '';
        fileSection.style.backgroundColor = '';
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            if (elements.fileInput) {
                elements.fileInput.files = files;
                handleFileChange({ target: { files: files } });
            }
        }
    }
}

// Performance monitoring
function logPerformance() {
    if (window.performance && window.performance.timing) {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupDragAndDrop();
    logPerformance();
});

// Export state for debugging (if needed)
window.intuneWrapperState = state;

// Graceful error handling for the entire application
window.addEventListener('error', (event) => {
    console.error("An unhandled error occurred:", event.error);
    showError("An unexpected error occurred. Please try again.");
});

window.addEventListener('unhandledrejection', (event) => {
    console.error("An unhandled promise rejection occurred:", event.reason);
    showError("An unexpected error occurred with an async operation.");
});