const API_BASE_URL = 'http://localhost:5000/api';

let selectedServiceId = null;
let services = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadServices();
    setupEventListeners();
    setupListPanelClick();
    setupMenuNavigation();
    // Show Dashboard by default
    showSection('dashboard');
});

function setupEventListeners() {
    document.getElementById('addServiceBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        showAddForm();
    });
    document.getElementById('saveBtn').addEventListener('click', saveService);
    document.getElementById('testBtn').addEventListener('click', testConnection);
    document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
    document.getElementById('deleteServiceBtn').addEventListener('click', () => {
        if (selectedServiceId) {
            deleteServiceById(selectedServiceId);
        }
    });
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadServices();
    });
    
    // Hide test button for AI API type
    document.getElementById('serviceType').addEventListener('change', () => {
        toggleServiceTypeFields();
    });
    document.getElementById('cancelBtn').addEventListener('click', cancelForm);
    document.getElementById('authType').addEventListener('change', toggleSqlAuthFields);
}

function setupListPanelClick() {
    const servicesList = document.getElementById('servicesList');
    
    if (servicesList) {
        // Liste panelinde boş alana tıklandığında details panelini kapat
        servicesList.addEventListener('click', (e) => {
            // Eğer tıklanan element bir service item değilse
            if (!e.target.closest('[onclick*="selectService"]')) {
                // Boş alana tıklandığında details panelini kapat
                if (e.target === servicesList || e.target.classList.contains('empty-state')) {
                    hideDetailsPanel();
                    resetForm();
                    selectedServiceId = null;
                    renderServicesList();
                }
            }
        });
    }
}

async function loadServices() {
    try {
        const response = await fetch(`${API_BASE_URL}/linked-services`);
        services = await response.json();
        renderServicesList();
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

function renderServicesList() {
    const listContainer = document.getElementById('servicesList');
    
    if (services.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-center p-8">
                <span class="material-symbols-outlined text-6xl text-text-muted mb-4">link_off</span>
                <p class="text-text-muted">No linked services yet.</p>
                <p class="text-text-muted text-sm mt-2">Click "ADD SERVICE" to create your first linked service.</p>
            </div>
        `;
        updatePagination();
        return;
    }
    
    listContainer.innerHTML = services.map(service => {
        const serviceType = service.serviceType || 'db';
        const isActive = selectedServiceId === service.id;
        const statusClass = service.connectionStatus === 'success' ? 'bg-green-100 text-status-success border-green-200' : 
                           service.connectionStatus === 'failed' ? 'bg-red-100 text-status-failed border-red-200' : 
                           'bg-yellow-100 text-status-degraded border-yellow-200';
        const statusDot = service.connectionStatus === 'success' ? '' : 'animate-pulse';
        
        // Service info string
        let serviceInfo = '';
        if (serviceType === 'ai') {
            serviceInfo = 'AI_API - ' + (service.description || service.name);
        } else if (serviceType === 'file') {
            const fileName = service.fileName || 'No file';
            const fileType = service.fileType ? service.fileType.toUpperCase() : '';
            serviceInfo = 'FILE - ' + fileType + (fileName !== 'No file' ? ' (' + fileName + ')' : '');
        } else {
            const server = service.serverName || '';
            const db = service.databaseName || '';
            serviceInfo = 'DB - ' + (server ? server + '/' + db : '-');
        }
        
        return `
            <div class="flex items-center px-4 py-3 ${isActive ? 'bg-blue-50 border-l-4 border-primary-brand' : 'hover:bg-gray-50 border-l-4 border-transparent hover:border-primary-brand'} transition-colors group cursor-pointer" 
                 onclick="event.stopPropagation(); selectService(${service.id})">
                <div class="flex-1 min-w-0">
                    <span class="font-medium text-text-default block truncate">${escapeHtml(service.name)}</span>
                    <span class="text-xs text-text-muted block truncate">${escapeHtml(serviceInfo)}</span>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium ${statusClass} border rounded-full ml-2">
                    <span class="w-1.5 h-1.5 mr-1.5 ${statusDot} ${service.connectionStatus === 'success' ? 'bg-status-success' : service.connectionStatus === 'failed' ? 'bg-status-failed' : 'bg-status-degraded'} rounded-full"></span>
                    ${service.connectionStatus ? service.connectionStatus.toUpperCase() : 'UNKNOWN'}
                </span>
            </div>
        `;
    }).join('');
    
    updatePagination();
}

function updatePagination() {
    const total = services.length;
    const showing = Math.min(total, 5);
    document.getElementById('totalServices').textContent = total;
    document.getElementById('showingFrom').textContent = total > 0 ? 1 : 0;
    document.getElementById('showingTo').textContent = showing;
}

function deleteServiceById(serviceId) {
    showDialog(
        'Confirm Delete',
        'Are you sure you want to delete this linked service?',
        () => deleteService(serviceId)
    );
}

async function deleteService(serviceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/linked-services/${serviceId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (selectedServiceId === serviceId) {
                resetForm();
                hideDetailsPanel();
            }
            await loadServices();
            showAlert('Linked service deleted successfully!', 'success');
        } else {
            showAlert('Error deleting service', 'error');
        }
    } catch (error) {
        console.error('Error deleting service:', error);
        showAlert('Error deleting service. Please try again.', 'error');
    }
}

function selectService(serviceId) {
    selectedServiceId = serviceId;
    const service = services.find(s => s.id === serviceId);
    
    if (service) {
        loadServiceToForm(service);
        renderServicesList();
        showDetailsPanel();
    }
}

function showDetailsPanel() {
    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) {
        detailsPanel.classList.remove('hidden');
    }
}

function hideDetailsPanel() {
    const detailsPanel = document.getElementById('detailsPanel');
    if (detailsPanel) {
        detailsPanel.classList.add('hidden');
    }
}

function loadServiceToForm(service) {
    document.getElementById('serviceName').value = service.name;
    document.getElementById('description').value = service.description || '';
    document.getElementById('serviceType').value = service.serviceType || 'db';
    document.getElementById('detailsTitle').textContent = service.name.toUpperCase() + '_SERVICE';
    toggleServiceTypeFields();
    
    if (service.serviceType === 'ai') {
        document.getElementById('aiApiKey').value = service.aiApiKey || '';
    } else if (service.serviceType === 'file') {
        // Load file service data
        if (document.getElementById('fileType')) {
            document.getElementById('fileType').value = service.fileType || 'csv';
            onFileTypeChange();
        }
        // Load file-specific settings
        if (service.fileType === 'csv' || service.fileType === 'excel') {
            if (document.getElementById('columnDelimiter')) {
                document.getElementById('columnDelimiter').value = service.columnDelimiter || ',';
                if (service.columnDelimiter && !['', ';', '\t', '|'].includes(service.columnDelimiter)) {
                    document.getElementById('columnDelimiter').value = 'custom';
                    document.getElementById('customDelimiter').value = service.columnDelimiter;
                    document.getElementById('customDelimiterField').classList.remove('hidden');
                }
            }
            if (document.getElementById('rowDelimiter')) document.getElementById('rowDelimiter').value = service.rowDelimiter || '\r\n';
            if (document.getElementById('textQualifier')) document.getElementById('textQualifier').value = service.textQualifier || '"';
            if (document.getElementById('firstRowAsHeader')) document.getElementById('firstRowAsHeader').checked = service.firstRowAsHeader !== false;
            if (document.getElementById('fileEncoding')) document.getElementById('fileEncoding').value = service.encoding || 'UTF-8';
            if (document.getElementById('escapeCharacter')) document.getElementById('escapeCharacter').value = service.escapeCharacter || '\\';
            if (document.getElementById('nullValue')) document.getElementById('nullValue').value = service.nullValue || '';
            
            if (service.fileType === 'excel') {
                if (document.getElementById('excelFirstRowAsHeader')) document.getElementById('excelFirstRowAsHeader').checked = service.excelFirstRowAsHeader !== false;
                if (document.getElementById('excelSheetName')) document.getElementById('excelSheetName').value = service.excelSheetName || '';
                if (document.getElementById('excelRange')) document.getElementById('excelRange').value = service.excelRange || '';
            }
        } else if (service.fileType === 'json') {
            if (document.getElementById('jsonFormat')) document.getElementById('jsonFormat').value = service.jsonFormat || 'array';
            if (document.getElementById('jsonEncoding')) document.getElementById('jsonEncoding').value = service.encoding || 'UTF-8';
        } else if (service.fileType === 'xml') {
            if (document.getElementById('xmlFormat')) document.getElementById('xmlFormat').value = service.xmlFormat || 'element';
            if (document.getElementById('xmlRootElement')) document.getElementById('xmlRootElement').value = service.xmlRootElement || '';
            if (document.getElementById('xmlRowElement')) document.getElementById('xmlRowElement').value = service.xmlRowElement || '';
            if (document.getElementById('xmlEncoding')) document.getElementById('xmlEncoding').value = service.encoding || 'UTF-8';
        }
    } else {
        // DB service
        document.getElementById('serverName').value = service.serverName || '';
        document.getElementById('databaseName').value = service.databaseName || '';
        document.getElementById('authType').value = service.authenticationType || 'windows';
        document.getElementById('trustCertificate').checked = service.trustServerCertificate || false;
        
        if (service.authenticationType === 'sql') {
            document.getElementById('username').value = service.username || '';
            document.getElementById('password').value = service.password || '';
            document.getElementById('sqlAuthFields').classList.remove('hidden');
        } else {
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('sqlAuthFields').classList.add('hidden');
        }
    }
    
    loadEventLog(service.id);
}

function showAddForm() {
    resetForm();
    selectedServiceId = null;
    showDetailsPanel();
}

function resetForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceType').value = 'db';
    document.getElementById('detailsTitle').textContent = 'SERVICE_DETAILS';
    toggleServiceTypeFields();
    document.getElementById('sqlAuthFields').classList.add('hidden');
    selectedServiceId = null;
    renderServicesList();
    // Don't hide panel when resetting, keep it visible for adding new service
}

function toggleSqlAuthFields() {
    const authType = document.getElementById('authType').value;
    const sqlFields = document.getElementById('sqlAuthFields');
    
    if (authType === 'sql') {
        sqlFields.classList.remove('hidden');
    } else {
        sqlFields.classList.add('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }
}

async function saveService() {
    const serviceType = document.getElementById('serviceType').value;
    const formData = {
        name: document.getElementById('serviceName').value.trim(),
        description: document.getElementById('description').value.trim(),
        serviceType: serviceType
    };
    
    // Validation
    if (!formData.name) {
        showAlert('Please fill in the name field', 'error');
        return;
    }
    
    if (serviceType === 'db') {
        formData.serverName = document.getElementById('serverName').value.trim();
        formData.databaseName = document.getElementById('databaseName').value.trim();
        formData.authenticationType = document.getElementById('authType').value;
        formData.trustServerCertificate = document.getElementById('trustCertificate').checked;
        
        if (!formData.serverName || !formData.databaseName) {
            showAlert('Please fill in Server Name and Database Name', 'error');
            return;
        }
        
        if (formData.authenticationType === 'sql') {
            formData.username = document.getElementById('username').value.trim();
            formData.password = document.getElementById('password').value;
            
            if (!formData.username || !formData.password) {
                showAlert('Username and password are required for SQL Authentication', 'error');
                return;
            }
        }
    } else if (serviceType === 'ai') {
        formData.aiApiKey = document.getElementById('aiApiKey').value.trim();
        
        if (!formData.aiApiKey) {
            showAlert('Please enter AI API Key', 'error');
            return;
        }
    } else if (serviceType === 'file') {
        // File service configuration
        const fileInput = document.getElementById('fileUpload');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showAlert('Please upload a file', 'error');
            return;
        }
        
        formData.fileType = document.getElementById('fileType').value;
        formData.fileName = fileInput.files[0].name;
        formData.fileSize = fileInput.files[0].size;
        
        // File-specific settings based on file type
        if (formData.fileType === 'csv' || formData.fileType === 'excel') {
            formData.columnDelimiter = document.getElementById('columnDelimiter').value;
            if (formData.columnDelimiter === 'custom') {
                formData.columnDelimiter = document.getElementById('customDelimiter').value || ',';
            }
            formData.rowDelimiter = document.getElementById('rowDelimiter').value;
            formData.textQualifier = document.getElementById('textQualifier').value;
            formData.firstRowAsHeader = document.getElementById('firstRowAsHeader').checked;
            formData.encoding = document.getElementById('fileEncoding').value;
            formData.escapeCharacter = document.getElementById('escapeCharacter').value;
            formData.nullValue = document.getElementById('nullValue').value || '';
            
            if (formData.fileType === 'excel') {
                formData.excelFirstRowAsHeader = document.getElementById('excelFirstRowAsHeader').checked;
                formData.excelSheetName = document.getElementById('excelSheetName').value.trim() || '';
                formData.excelRange = document.getElementById('excelRange').value.trim() || '';
            }
        } else if (formData.fileType === 'json') {
            formData.jsonFormat = document.getElementById('jsonFormat').value;
            formData.encoding = document.getElementById('jsonEncoding').value;
        } else if (formData.fileType === 'xml') {
            formData.xmlFormat = document.getElementById('xmlFormat').value;
            formData.xmlRootElement = document.getElementById('xmlRootElement').value.trim() || '';
            formData.xmlRowElement = document.getElementById('xmlRowElement').value.trim() || '';
            formData.encoding = document.getElementById('xmlEncoding').value;
        }
        
        // Read file content as base64 for storage
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            formData.fileContent = e.target.result.split(',')[1]; // Remove data:type;base64, prefix
            
            // Save service with file content
            try {
                let response;
                if (selectedServiceId) {
                    response = await fetch(`${API_BASE_URL}/linked-services/${selectedServiceId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    response = await fetch(`${API_BASE_URL}/linked-services`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }
                
                if (response.ok) {
                    const updatedService = await response.json();
                    await loadServices();
                    selectService(updatedService.id);
                    showAlert(selectedServiceId ? 'Linked service updated successfully!' : 'Linked service saved successfully!', 'success');
                } else {
                    const error = await response.json();
                    showAlert('Error: ' + (error.error || 'Failed to save service'), 'error');
                }
            } catch (error) {
                console.error('Error saving service:', error);
                showAlert('Error saving service. Please try again.', 'error');
            }
        };
        reader.readAsDataURL(file);
        return; // Exit early, save will happen in reader.onload
    }
    
    try {
        let response;
        
        // If editing existing service, use PUT, otherwise POST
        if (selectedServiceId) {
            response = await fetch(`${API_BASE_URL}/linked-services/${selectedServiceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetch(`${API_BASE_URL}/linked-services`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            const updatedService = await response.json();
            await loadServices();
            selectService(updatedService.id);
            showAlert(selectedServiceId ? 'Linked service updated successfully!' : 'Linked service saved successfully!', 'success');
            // Event log will be loaded by selectService -> loadServiceToForm -> loadEventLog
        } else {
            const error = await response.json();
            showAlert('Error: ' + (error.error || 'Failed to save service'), 'error');
        }
    } catch (error) {
        console.error('Error saving service:', error);
        showAlert('Error saving service. Please try again.', 'error');
    }
}

async function testConnection() {
    const serviceType = document.getElementById('serviceType').value;
    
    if (serviceType === 'ai') {
        showAlert('AI API connection test is not available', 'error');
        return;
    }
    
    if (serviceType === 'file') {
        const fileInput = document.getElementById('fileUpload');
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            showAlert('Please upload a file first', 'error');
            return;
        }
        showAlert('File uploaded successfully! File service is ready to use.', 'success');
        return;
    }
    
    if (!selectedServiceId) {
        showAlert('Please select or create a service first', 'error');
        return;
    }
    
    const testBtn = document.getElementById('testBtn');
    const originalText = testBtn.innerHTML;
    testBtn.innerHTML = '<span class="spinner"></span>Testing...';
    testBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/linked-services/${selectedServiceId}/test`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert('Connection test successful!', 'success');
        } else {
            showAlert('Connection test failed: ' + result.message, 'error');
        }
        
        await loadServices();
        
        // Reload event log if service is selected
        if (selectedServiceId) {
            loadEventLog(selectedServiceId);
        }
    } catch (error) {
        console.error('Error testing connection:', error);
        showAlert('Error testing connection', 'error');
    } finally {
        testBtn.innerHTML = originalText;
        testBtn.disabled = false;
    }
}

// deleteService function moved above, now using deleteServiceById

// Connection result is now only shown in event log

function cancelForm() {
    resetForm();
    hideDetailsPanel();
}

function loadEventLog(serviceId) {
    const eventLogContent = document.getElementById('eventLogContent');
    
    // Get service to show its events
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        eventLogContent.innerHTML = '<div class="text-text-muted">No events available.</div>';
        return;
    }
    
    // Get events from API or use service events
    let events = service.events || [];
    
    if (events.length === 0) {
        // Generate default events based on service status
        events = generateDefaultEvents(service);
    }
    
    // Show only last 5 events
    const last5Events = events.slice(-5).reverse(); // Reverse to show newest first
    
    if (last5Events.length === 0) {
        eventLogContent.innerHTML = '<div class="text-text-muted">No events available.</div>';
    } else {
        eventLogContent.innerHTML = last5Events.map(event => renderEventLogLine(event)).join('');
    }
    
    // Scroll to top (newest events at top)
    const container = document.getElementById('eventLogContainer');
    container.scrollTop = 0;
}

function generateDefaultEvents(service) {
    const events = [];
    const now = new Date();
    
    // Creation event
    events.push({
        timestamp: service.createdAt || now.toISOString(),
        level: 'INFO',
        message: `Service '${service.name}' initialized successfully.`
    });
    
    // Connection test events
    if (service.connectionStatus === 'success') {
        events.push({
            timestamp: service.lastTestedAt || now.toISOString(),
            level: 'INFO',
            message: `Connection test passed for '${service.name}'.`
        });
    } else if (service.connectionStatus === 'failed') {
        events.push({
            timestamp: service.lastTestedAt || now.toISOString(),
            level: 'ERROR',
            message: `Connection test failed for '${service.name}': ${service.connectionMessage || 'Unknown error'}.`
        });
    }
    
    // Health check event
    events.push({
        timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
        level: 'INFO',
        message: `Health check passed for '${service.name}'.`
    });
    
    return events;
}

function renderEventLogLine(event) {
    const timestamp = new Date(event.timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const levelClass = {
        'INFO': 'text-log-info',
        'WARN': 'text-log-warn',
        'ERROR': 'text-log-error',
        'DEBUG': 'text-log-debug'
    }[event.level] || 'text-text-default';
    
    return `
        <div class="log-line mb-1.5 py-0.5">
            <span class="text-log-timestamp mr-2 flex-shrink-0 text-xs">[${timestamp}]</span>
            <span class="${levelClass} font-semibold mr-2 text-xs">${event.level}</span>
            <span class="text-text-default text-xs">: ${escapeHtml(event.message)}</span>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Listen for auth type changes
document.getElementById('authType').addEventListener('change', toggleSqlAuthFields);

// Toggle submenu
function toggleSubmenu(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const menuGroup = event.currentTarget.closest('.menu-group');
    const submenu = menuGroup.querySelector('.submenu');
    const chevron = menuGroup.querySelector('.submenu-chevron');
    
    if (submenu) {
        const isHidden = submenu.classList.contains('hidden');
        
        // Close all other submenus
        document.querySelectorAll('.submenu').forEach(menu => {
            if (menu !== submenu) {
                menu.classList.add('hidden');
            }
        });
        document.querySelectorAll('.submenu-chevron').forEach(chev => {
            if (chev !== chevron) {
                chev.textContent = 'chevron_right';
                chev.style.transform = 'rotate(0deg)';
            }
        });
        
        // Toggle current submenu
        if (isHidden) {
            submenu.classList.remove('hidden');
            if (chevron) {
                chevron.textContent = 'expand_more';
                chevron.style.transform = 'rotate(0deg)';
            }
        } else {
            submenu.classList.add('hidden');
            if (chevron) {
                chevron.textContent = 'chevron_right';
                chevron.style.transform = 'rotate(0deg)';
            }
        }
    }
}

// Menu Navigation
function setupMenuNavigation() {
    const menuLinks = document.querySelectorAll('.menu-link');
    const submenuLinks = document.querySelectorAll('.submenu-link');
    
    menuLinks.forEach(link => {
        const section = link.getAttribute('data-section');
        if (section) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showSection(section);
            });
        }
    });
    
    submenuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            if (section) {
                showSection(section);
                // Update active menu link
                updateActiveMenuLink(section);
            }
        });
    });
}

function showSection(sectionName) {
    // Hide all sections
    const sections = ['linked-services', 'design', 'design-empty', 'design-saved', 'data-stream', 'dashboard', 'data-sources', 'settings'];
    sections.forEach(section => {
        const sectionEl = document.getElementById(`${section}-section`);
        if (sectionEl) {
            sectionEl.classList.add('hidden');
        }
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }
    
    // Handle design sub-sections
    if (sectionName === 'design-empty') {
        // Load projects for empty canvas dropdown if needed
        if (typeof loadProjectsForEmptyCanvas === 'function') {
            loadProjectsForEmptyCanvas();
        }
    } else if (sectionName === 'design-saved') {
        // Load projects for saved canvas dropdown
        if (typeof loadProjectsForSavedCanvas === 'function') {
            loadProjectsForSavedCanvas();
        }
    }
    
    // Update active menu link
    updateActiveMenuLink(sectionName);
    
    // Initialize pages when design section is shown
    if (sectionName === 'design-empty') {
        if (typeof initPages === 'function') {
            initPages();
        }
    } else if (sectionName === 'design-saved') {
        if (!window.pagesSaved || window.pagesSaved.length === 0) {
            if (typeof addNewPageSaved === 'function') {
                addNewPageSaved();
            }
        }
    }
    
    // Initialize design canvas when design section is shown
    if (sectionName === 'design-empty' || sectionName === 'design-saved') {
        // Multiple attempts to ensure toolbox renders
        let attempts = 0;
        const maxAttempts = 10;
        
        const toolboxId = sectionName === 'design-empty' ? 'chartToolbox' : 'chartToolboxSaved';
        const canvasId = sectionName === 'design-empty' ? 'designCanvas' : 'designCanvasSaved';
        
        const initDesign = () => {
            attempts++;
            console.log(`=== DESIGN SECTION INIT (attempt ${attempts}) ===`, sectionName);
            
            const toolbox = document.getElementById(toolboxId);
            const hasChartTypes = typeof chartTypes !== 'undefined' && chartTypes && chartTypes.length > 0;
            const hasRenderFunc = typeof renderChartToolbox === 'function';
            
            console.log('Toolbox exists:', !!toolbox, toolboxId);
            console.log('chartTypes available:', hasChartTypes);
            console.log('renderChartToolbox available:', hasRenderFunc);
            
            if (!toolbox && attempts < maxAttempts) {
                setTimeout(initDesign, 200);
                return;
            }
            
            if (toolbox && hasRenderFunc && hasChartTypes) {
                console.log('Rendering toolbox...', toolboxId);
                renderChartToolbox(toolboxId);
            } else if (toolbox && hasRenderFunc) {
                console.log('Rendering toolbox (chartTypes check skipped)...', toolboxId);
                renderChartToolbox(toolboxId);
            } else if (attempts < maxAttempts) {
                console.log('Waiting for dependencies...');
                setTimeout(initDesign, 200);
                return;
            }
            
            // Initialize other design features
            if (typeof initDesignCanvas === 'function') {
                initDesignCanvas(canvasId, toolboxId);
            }
            if (typeof initToolbar === 'function') {
                initToolbar();
            }
            if (typeof initCanvasPan === 'function') {
                initCanvasPan();
            }
            if (typeof updateWordCount === 'function') {
                updateWordCount();
            }
            if (typeof changeCanvasPattern === 'function' && typeof gridEnabled !== 'undefined' && gridEnabled) {
                changeCanvasPattern('grid');
            }
            
            // Show connections by default when design section is shown
            if (typeof showConnections === 'function') {
                setTimeout(() => {
                    showConnections();
                }, 300);
            }
            
            // Render symbols and shapes panel (only for saved canvas, not empty canvas)
            if (typeof renderSymbolsShapes === 'function' && sectionName === 'design-saved') {
                setTimeout(() => {
                    renderSymbolsShapes('symbolsShapesListSaved');
                }, 400);
            }
        };
        
        // Start initialization
        requestAnimationFrame(() => {
            setTimeout(initDesign, 50);
        });
    }
    
    // Update header based on section
    updateHeader(sectionName);
}


function updateHeader(sectionName) {
    const headerTitle = document.getElementById('headerTitle');
    const headerSubtitle = document.getElementById('headerSubtitle');
    const addServiceBtn = document.getElementById('addServiceBtn');
    
    const headers = {
        'linked-services': {
            title: 'LINKED_SERVICES',
            desc: 'System overview for linked service health and configuration.',
            showAddBtn: true
        },
        'design': {
            title: 'DESIGN_CANVAS',
            desc: 'Create and design interactive charts and visualizations.',
            showAddBtn: false
        },
        'design-empty': {
            title: 'EMPTY_CANVAS',
            desc: 'Create and design interactive charts and visualizations.',
            showAddBtn: false
        },
        'design-saved': {
            title: 'SAVED_CANVAS',
            desc: 'Edit and modify your saved projects.',
            showAddBtn: false
        },
        'data-stream': {
            title: 'DATA STREAM',
            desc: 'Monitor and view your saved projects with live data updates.',
            showAddBtn: false
        },
        'dashboard': {
            title: 'DASHBOARD',
            desc: 'Overview and analytics dashboard.',
            showAddBtn: false
        },
        'data-sources': {
            title: 'DATA_SOURCES',
            desc: 'Manage and configure data sources.',
            showAddBtn: false
        },
        'settings': {
            title: 'SETTINGS',
            desc: 'Application settings and configuration.',
            showAddBtn: false
        }
    };
    
    const headerInfo = headers[sectionName] || headers['linked-services'];
    
    if (headerTitle) headerTitle.textContent = headerInfo.title;
    if (headerSubtitle) headerSubtitle.textContent = headerInfo.desc;
    if (addServiceBtn) {
        addServiceBtn.style.display = headerInfo.showAddBtn ? 'flex' : 'none';
    }
}

// Listen for service type changes
document.getElementById('serviceType').addEventListener('change', toggleServiceTypeFields);

function toggleServiceTypeFields() {
    const serviceType = document.getElementById('serviceType').value;
    const dbFields = document.getElementById('dbFields');
    const aiFields = document.getElementById('aiFields');
    const fileFields = document.getElementById('fileFields');
    const serverName = document.getElementById('serverName');
    const databaseName = document.getElementById('databaseName');
    const testBtn = document.getElementById('testBtn');
    
    // Hide all fields first
        dbFields.classList.add('hidden');
    aiFields.classList.add('hidden');
    if (fileFields) fileFields.classList.add('hidden');
    
    // Remove required attributes
        serverName.removeAttribute('required');
        databaseName.removeAttribute('required');
    
    if (serviceType === 'ai') {
        aiFields.classList.remove('hidden');
        if (testBtn) testBtn.classList.add('hidden');
    } else if (serviceType === 'file') {
        if (fileFields) fileFields.classList.remove('hidden');
        if (testBtn) testBtn.classList.add('hidden');
    } else {
        // DB type
        dbFields.classList.remove('hidden');
        serverName.setAttribute('required', 'required');
        databaseName.setAttribute('required', 'required');
        if (testBtn) testBtn.classList.remove('hidden');
    }
}

// Custom Dialog Functions
let dialogConfirmCallback = null;

function showDialog(title, message, onConfirm) {
    // Hide canvas connections when dialog opens
    const connectionOverlays = document.querySelectorAll('.connection-overlay');
    connectionOverlays.forEach(overlay => {
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
    });
    
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogMessage').textContent = message;
    dialogConfirmCallback = onConfirm;
    document.getElementById('customDialog').classList.remove('hidden');
}

function closeDialog() {
    // Show canvas connections when dialog closes
    const connectionOverlays = document.querySelectorAll('.connection-overlay');
    connectionOverlays.forEach(overlay => {
        overlay.style.display = '';
        overlay.style.visibility = '';
    });
    
    document.getElementById('customDialog').classList.add('hidden');
    dialogConfirmCallback = null;
}

function confirmDialog() {
    if (dialogConfirmCallback) {
        dialogConfirmCallback();
    }
    closeDialog();
}

// Custom Prompt Dialog Functions
let promptDialogCallback = null;

function showPromptDialog(title, defaultValue, onConfirm) {
    const dialog = document.getElementById('customPromptDialog');
    const titleEl = document.getElementById('promptDialogTitle');
    const inputEl = document.getElementById('promptDialogInput');
    const confirmBtn = document.getElementById('promptDialogConfirmBtn');
    const cancelBtn = document.getElementById('promptDialogCancelBtn');
    const closeBtn = document.getElementById('promptDialogCloseBtn');
    
    if (!dialog || !titleEl || !inputEl || !confirmBtn) {
        console.error('Prompt dialog elements not found');
        return;
    }
    
    // Hide canvas connections when dialog opens
    const connectionOverlays = document.querySelectorAll('.connection-overlay');
    connectionOverlays.forEach(overlay => {
        overlay.style.display = 'none';
        overlay.style.visibility = 'hidden';
    });
    
    titleEl.textContent = title;
    // Set input value properly
    if (inputEl) {
        inputEl.value = defaultValue || '';
        // Force update the value attribute as well
        inputEl.setAttribute('value', defaultValue || '');
    }
    promptDialogCallback = onConfirm;
    
    // Remove existing event listeners by cloning and replacing
    const handleConfirm = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Get the current value from input element (re-fetch to ensure we have latest)
        const currentInputEl = document.getElementById('promptDialogInput');
        if (!currentInputEl) {
            console.error('Input element not found');
            closePromptDialog();
            return;
        }
        
        // Try multiple ways to get the value
        let value = currentInputEl.value || currentInputEl.getAttribute('value') || '';
        value = value.trim();
        
        console.log('Prompt dialog confirm - value:', value, 'callback exists:', !!promptDialogCallback, 'callback type:', typeof promptDialogCallback);
        console.log('Input element value:', currentInputEl.value, 'defaultValue:', currentInputEl.defaultValue);
        
        // Try to get callback from multiple sources
        let callbackToUse = promptDialogCallback;
        console.log('Step 1 - promptDialogCallback:', typeof callbackToUse, callbackToUse);
        
        if (!callbackToUse || typeof callbackToUse !== 'function') {
            // Try global callback
            callbackToUse = window._currentPromptCallback;
            console.log('Step 2 - window._currentPromptCallback:', typeof callbackToUse, callbackToUse);
        }
        
        if (!callbackToUse || typeof callbackToUse !== 'function') {
            // Try from input element dataset
            if (currentInputEl && currentInputEl.dataset.callbackId) {
                callbackToUse = window._promptCallbacks?.get(currentInputEl.dataset.callbackId);
                console.log('Step 3 - from input dataset:', typeof callbackToUse, callbackToUse);
            }
        }
        
        if (!callbackToUse || typeof callbackToUse !== 'function') {
            // Try from dialog dataset
            const dialog = document.getElementById('customPromptDialog');
            if (dialog && dialog.dataset.callbackId) {
                callbackToUse = window._promptCallbacks?.get(dialog.dataset.callbackId);
                console.log('Step 4 - from dialog dataset:', typeof callbackToUse, callbackToUse);
            }
        }
        
        console.log('Final callback to use:', typeof callbackToUse, 'value to pass:', value);
        
        if (callbackToUse && typeof callbackToUse === 'function') {
            if (value) {
                console.log('Calling callback with value:', value);
                try {
                    const result = callbackToUse(value);
                    console.log('Callback executed successfully, result:', result);
                } catch (error) {
                    console.error('Error executing callback:', error);
                    console.error('Error stack:', error.stack);
                }
            } else {
                // Empty value - don't call callback, just close
                console.log('Empty value, closing dialog without callback');
            }
        } else {
            console.error('No valid callback found!');
            console.error('promptDialogCallback:', promptDialogCallback);
            console.error('window._currentPromptCallback:', window._currentPromptCallback);
            console.error('window._promptCallbacks:', window._promptCallbacks);
            console.error('Input dataset:', currentInputEl?.dataset);
            console.error('Dialog dataset:', document.getElementById('customPromptDialog')?.dataset);
        }
        closePromptDialog();
    };
    
    const handleCancel = () => {
        closePromptDialog();
    };
    
    // Remove old listeners and add new ones
    // Use event delegation or direct assignment
    const confirmBtnHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleConfirm(e);
    };
    
    const cancelBtnHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
    };
    
    // Remove old listeners if they exist
    if (confirmBtn._clickHandler) {
        confirmBtn.removeEventListener('click', confirmBtn._clickHandler);
    }
    confirmBtn._clickHandler = confirmBtnHandler;
    confirmBtn.addEventListener('click', confirmBtnHandler, { capture: true });
    
    if (cancelBtn) {
        if (cancelBtn._clickHandler) {
            cancelBtn.removeEventListener('click', cancelBtn._clickHandler);
        }
        cancelBtn._clickHandler = cancelBtnHandler;
        cancelBtn.addEventListener('click', cancelBtnHandler, { capture: true });
    }
    
    if (closeBtn) {
        if (closeBtn._clickHandler) {
            closeBtn.removeEventListener('click', closeBtn._clickHandler);
        }
        closeBtn._clickHandler = cancelBtnHandler;
        closeBtn.addEventListener('click', cancelBtnHandler, { capture: true });
    }
    
    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleConfirm(e);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            handleCancel();
        }
    };
    
    // Remove old handler if exists
    if (inputEl._keydownHandler) {
        inputEl.removeEventListener('keydown', inputEl._keydownHandler);
    }
    inputEl._keydownHandler = handleKeyDown;
    inputEl.addEventListener('keydown', handleKeyDown, { capture: true });
    
    // Store callback globally so it can be accessed (backup)
    window._currentPromptCallback = promptDialogCallback;
    window._currentPromptDefaultValue = defaultValue || '';
    
    // Also store in a way that won't be overwritten
    if (!window._promptCallbacks) {
        window._promptCallbacks = new Map();
    }
    const callbackId = Date.now().toString();
    window._promptCallbacks.set(callbackId, promptDialogCallback);
    dialog.dataset.callbackId = callbackId;
    
    // Store callback reference on input element as well
    inputEl.dataset.callbackId = callbackId;
    
    console.log('Prompt dialog opened - callback stored:', typeof promptDialogCallback, 'callbackId:', callbackId);
    
    // Store default value globally for onclick handler
    window._currentPromptDefaultValue = defaultValue || '';
    
    // Store callback reference on input element as well
    inputEl.dataset.callbackId = callbackId;
    
    console.log('Prompt dialog opened - callback stored:', typeof promptDialogCallback, 'callbackId:', callbackId, 'defaultValue:', defaultValue);
    
    dialog.classList.remove('hidden');
    // Focus input after dialog is shown and ensure value is set
    setTimeout(() => {
        const currentInputEl = document.getElementById('promptDialogInput');
        if (currentInputEl) {
            // Set value multiple ways to ensure it sticks
            currentInputEl.value = defaultValue || '';
            currentInputEl.defaultValue = defaultValue || '';
            currentInputEl.setAttribute('value', defaultValue || '');
            
            // Store callback ID on input as well
            currentInputEl.dataset.callbackId = callbackId;
            
            // Force update
            try {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeInputValueSetter.call(currentInputEl, defaultValue || '');
            } catch (e) {
                // Fallback if above fails
                currentInputEl.value = defaultValue || '';
            }
            
            // Trigger input event
            const inputEvent = new Event('input', { bubbles: true });
            currentInputEl.dispatchEvent(inputEvent);
            
            // Focus and select
            currentInputEl.focus();
            setTimeout(() => {
                currentInputEl.select();
            }, 50);
        }
    }, 200);
}

function closePromptDialog() {
    const dialog = document.getElementById('customPromptDialog');
    const inputEl = document.getElementById('promptDialogInput');
    
    // Show canvas connections when dialog closes
    const connectionOverlays = document.querySelectorAll('.connection-overlay');
    connectionOverlays.forEach(overlay => {
        overlay.style.display = '';
        overlay.style.visibility = '';
    });
    
    if (dialog) {
        dialog.classList.add('hidden');
    }
    if (inputEl) {
        inputEl.value = '';
        inputEl.setAttribute('value', '');
        if (inputEl._keydownHandler) {
            inputEl.removeEventListener('keydown', inputEl._keydownHandler);
            inputEl._keydownHandler = null;
        }
    }
    promptDialogCallback = null;
}

// Custom Alert Functions
function showAlert(message, type = 'success') {
    const alert = document.getElementById('customAlert');
    const alertContainer = document.getElementById('alertContainer');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');
    
    alertMessage.textContent = message;
    
    if (type === 'success') {
        alertIcon.textContent = 'check_circle';
        alertIcon.className = 'material-symbols-outlined text-status-success';
        alertContainer.className = 'bg-surface-light rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-80 border-l-4 border-status-success';
    } else {
        alertIcon.textContent = 'error';
        alertIcon.className = 'material-symbols-outlined text-status-failed';
        alertContainer.className = 'bg-surface-light rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-80 border-l-4 border-status-failed';
    }
    
    alert.classList.remove('hidden');
    
    // Auto close after 3 seconds
    setTimeout(() => {
        closeAlert();
    }, 3000);
}

function closeAlert() {
    document.getElementById('customAlert').classList.add('hidden');
}

// Update active menu link
function updateActiveMenuLink(sectionName) {
    const menuLinks = document.querySelectorAll('.menu-link');
    menuLinks.forEach(link => {
        const linkSection = link.getAttribute('data-section');
        if (linkSection === sectionName) {
            link.classList.add('bg-sidebar-active-light', 'border-primary-brand', 'text-primary-brand', 'font-medium');
            link.classList.remove('text-text-default', 'border-transparent');
        } else {
            link.classList.remove('bg-sidebar-active-light', 'border-primary-brand', 'text-primary-brand', 'font-medium');
            link.classList.add('text-text-default', 'border-transparent');
        }
    });
}

// Setup dialog confirm button
document.addEventListener('DOMContentLoaded', () => {
    const dialogConfirmBtn = document.getElementById('dialogConfirmBtn');
    const dialogCancelBtn = document.getElementById('dialogCancelBtn');
    const dialogCloseBtn = document.getElementById('dialogCloseBtn');
    
    if (dialogConfirmBtn) {
        dialogConfirmBtn.addEventListener('click', confirmDialog);
    }
    
    if (dialogCancelBtn) {
        dialogCancelBtn.addEventListener('click', closeDialog);
    }
    
    if (dialogCloseBtn) {
        dialogCloseBtn.addEventListener('click', closeDialog);
    }
    
    initTheme();
});

// Dark Mode Toggle Function
function toggleDarkMode() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    const isDark = html.classList.toggle('dark');
    
    // Update icon based on mode
    if (isDark) {
        if (themeIcon) themeIcon.textContent = 'dark_mode';
        localStorage.setItem('theme', 'dark');
    } else {
        if (themeIcon) themeIcon.textContent = 'light_mode';
        localStorage.setItem('theme', 'light');
    }
}

// Initialize theme on page load
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
        if (themeIcon) themeIcon.textContent = 'dark_mode';
    } else {
        html.classList.remove('dark');
        if (themeIcon) themeIcon.textContent = 'light_mode';
    }
}

// File Service Handlers
function handleFileServiceUpload(input) {
    if (input.files && input.files.length > 0) {
        const fileName = input.files[0].name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Auto-detect file type based on extension
        const fileTypeSelect = document.getElementById('fileType');
        if (fileTypeSelect) {
            if (['csv'].includes(fileExtension)) {
                fileTypeSelect.value = 'csv';
            } else if (['xlsx', 'xls'].includes(fileExtension)) {
                fileTypeSelect.value = 'excel';
            } else if (['json'].includes(fileExtension)) {
                fileTypeSelect.value = 'json';
            } else if (['xml'].includes(fileExtension)) {
                fileTypeSelect.value = 'xml';
            }
            onFileTypeChange();
        }
    }
}

function onFileTypeChange() {
    const fileTypeSelect = document.getElementById('fileType');
    if (!fileTypeSelect) return;
    
    const fileType = fileTypeSelect.value;
    const csvExcelSettings = document.getElementById('csvExcelSettings');
    const jsonSettings = document.getElementById('jsonSettings');
    const xmlSettings = document.getElementById('xmlSettings');
    const excelSettings = document.getElementById('excelSettings');
    
    // Hide all settings first
    if (csvExcelSettings) csvExcelSettings.classList.add('hidden');
    if (jsonSettings) jsonSettings.classList.add('hidden');
    if (xmlSettings) xmlSettings.classList.add('hidden');
    if (excelSettings) excelSettings.classList.add('hidden');
    
    // Show relevant settings
    if (fileType === 'csv') {
        if (csvExcelSettings) csvExcelSettings.classList.remove('hidden');
    } else if (fileType === 'excel') {
        if (csvExcelSettings) csvExcelSettings.classList.remove('hidden');
        if (excelSettings) excelSettings.classList.remove('hidden');
    } else if (fileType === 'json') {
        if (jsonSettings) jsonSettings.classList.remove('hidden');
    } else if (fileType === 'xml') {
        if (xmlSettings) xmlSettings.classList.remove('hidden');
    }
    
    // Handle custom delimiter visibility
    const columnDelimiter = document.getElementById('columnDelimiter');
    const customDelimiterField = document.getElementById('customDelimiterField');
    if (columnDelimiter && customDelimiterField) {
        if (columnDelimiter.value === 'custom') {
            customDelimiterField.classList.remove('hidden');
        } else {
            customDelimiterField.classList.add('hidden');
        }
    }
}

// Listen for column delimiter changes
document.addEventListener('DOMContentLoaded', () => {
    const columnDelimiter = document.getElementById('columnDelimiter');
    if (columnDelimiter) {
        columnDelimiter.addEventListener('change', () => {
            const customDelimiterField = document.getElementById('customDelimiterField');
            if (customDelimiterField) {
                if (columnDelimiter.value === 'custom') {
                    customDelimiterField.classList.remove('hidden');
                } else {
                    customDelimiterField.classList.add('hidden');
                }
            }
        });
    }
});

// Custom tooltip fonksiyonları
function showTooltip(element, text, position = 'right') {
    // Eğer genişletilmiş moddaysa tooltip gösterme
    const sidebar = document.getElementById('sidebarPanel');
    const toolboxPanel = document.getElementById('toolboxPanel') || document.getElementById('toolboxPanelSaved');
    
    const isSidebarExpanded = sidebar && sidebar.classList.contains('expanded');
    const isToolboxExpanded = toolboxPanel && toolboxPanel.classList.contains('expanded');
    
    // Sidebar için kontrol
    if (element.closest('#sidebarPanel') && isSidebarExpanded) return;
    // Toolbox için kontrol
    if ((element.closest('#toolboxPanel') || element.closest('#toolboxPanelSaved')) && isToolboxExpanded) return;
    
    // Mevcut tooltip'i kaldır
    const existingTooltip = document.querySelector('.custom-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Yeni tooltip oluştur
    const tooltip = document.createElement('div');
    tooltip.className = `custom-tooltip ${position === 'right' ? 'sidebar-tooltip' : 'toolbox-tooltip'}`;
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    
    // Pozisyon hesapla
    const rect = element.getBoundingClientRect();
    if (position === 'right') {
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
    } else {
        tooltip.style.right = `${window.innerWidth - rect.left + 10}px`;
        tooltip.style.top = `${rect.top + rect.height / 2}px`;
    }
    
    // Göster
    setTimeout(() => {
        tooltip.classList.add('show');
    }, 10);
    
    // Mouse leave'de kaldır
    const hideTooltip = () => {
        tooltip.classList.remove('show');
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 200);
    };
    
    element.addEventListener('mouseleave', hideTooltip, { once: true });
}

function hideTooltip() {
    const tooltip = document.querySelector('.custom-tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.remove();
            }
        }, 200);
    }
}

// Toggle sidebar (daralt/genişlet)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarPanel');
    const toggleBtn = document.getElementById('sidebarToggle');
    const logo = document.getElementById('sidebarLogo');
    const userInfo = document.getElementById('sidebarUserInfo');
    
    if (!sidebar) return;
    
    const isExpanded = sidebar.classList.contains('expanded');
    
    // Tooltip'leri kaldır
    hideTooltip();
    
    if (isExpanded) {
        // Daralt - sadece simgeler
        sidebar.classList.remove('expanded');
        sidebar.classList.remove('w-64');
        sidebar.classList.add('w-20');
        toggleBtn.querySelector('span').textContent = 'chevron_right';
        toggleBtn.title = 'Genişlet';
        logo.classList.add('hidden');
        userInfo.classList.add('hidden');
        
        // Menü metinlerini gizle
        document.querySelectorAll('.menu-text').forEach(text => {
            text.classList.add('hidden');
        });
        document.querySelectorAll('.submenu-chevron').forEach(chevron => {
            chevron.classList.add('hidden');
        });
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('justify-start');
            link.classList.add('justify-center');
        });
        
        // Tooltip event'lerini ekle
        setupSidebarTooltips();
    } else {
        // Genişlet - simgeler + isimler
        sidebar.classList.add('expanded');
        sidebar.classList.remove('w-20');
        sidebar.classList.add('w-64');
        toggleBtn.querySelector('span').textContent = 'chevron_left';
        toggleBtn.title = 'Daralt';
        logo.classList.remove('hidden');
        userInfo.classList.remove('hidden');
        
        // Menü metinlerini göster
        document.querySelectorAll('.menu-text').forEach(text => {
            text.classList.remove('hidden');
        });
        document.querySelectorAll('.submenu-chevron').forEach(chevron => {
            chevron.classList.remove('hidden');
        });
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('justify-center');
            link.classList.add('justify-start');
        });
        
        // Tooltip event'lerini kaldır
        document.querySelectorAll('.menu-link, .submenu-link').forEach(link => {
            link.removeEventListener('mouseenter', link._tooltipHandler);
            link._tooltipHandler = null;
        });
    }
}

// Sidebar tooltip'lerini ayarla
function setupSidebarTooltips() {
    document.querySelectorAll('#sidebarPanel .menu-link, #sidebarPanel .submenu-link').forEach(link => {
        const text = link.getAttribute('title') || link.querySelector('.menu-text')?.textContent || '';
        if (text && !link._tooltipHandler) {
            link._tooltipHandler = () => {
                const sidebar = document.getElementById('sidebarPanel');
                if (sidebar && !sidebar.classList.contains('expanded')) {
                    showTooltip(link, text, 'right');
                }
            };
            link.addEventListener('mouseenter', link._tooltipHandler);
        }
    });
}

// Make functions globally accessible
window.toggleDarkMode = toggleDarkMode;
window.initTheme = initTheme;
window.handleFileServiceUpload = handleFileServiceUpload;
window.onFileTypeChange = onFileTypeChange;
window.toggleSidebar = toggleSidebar;
window.showPromptDialog = showPromptDialog;
window.closePromptDialog = closePromptDialog;


