// ==================== DATA STREAM FUNCTIONALITY ====================

let savedProjects = [];
let currentProjectId = null;
let streamInterval = null;
let isStreaming = false;

// Custom dialog functions
function showAlertDialog(message, title = 'Information') {
    const dialog = document.createElement('div');
    dialog.id = 'customAlertDialog';
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <h3 class="text-lg font-semibold text-text-default mb-4">${escapeHtml(title)}</h3>
                <p class="text-sm text-text-muted mb-6">${escapeHtml(message)}</p>
                <div class="flex justify-end">
                    <button onclick="closeAlertDialog()" class="px-4 py-2 bg-primary-brand text-white rounded-md text-sm hover:bg-primary-brand-hover">OK</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
}

function closeAlertDialog() {
    const dialog = document.getElementById('customAlertDialog');
    if (dialog) {
        dialog.remove();
    }
}

function showConfirmDialog(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.id = 'customConfirmDialog';
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <h3 class="text-lg font-semibold text-text-default mb-4">Confirm</h3>
                <p class="text-sm text-text-muted mb-6">${escapeHtml(message)}</p>
                <div class="flex justify-end gap-2">
                    <button onclick="closeCustomConfirmDialog(false)" class="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-100">Cancel</button>
                    <button onclick="closeCustomConfirmDialog(true)" class="px-4 py-2 bg-primary-brand text-white rounded-md text-sm hover:bg-primary-brand-hover">Confirm</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    window._confirmCallback = onConfirm;
    window._cancelCallback = onCancel;
}

function closeCustomConfirmDialog(confirmed) {
    const dialog = document.getElementById('customConfirmDialog');
    if (dialog) {
        dialog.remove();
        if (confirmed && window._confirmCallback) {
            window._confirmCallback();
        } else if (!confirmed && window._cancelCallback) {
            window._cancelCallback();
        }
        window._confirmCallback = null;
        window._cancelCallback = null;
    }
}

// Load saved projects from localStorage
function loadSavedProjects() {
    try {
        const stored = localStorage.getItem('savedProjects');
        if (stored) {
            savedProjects = JSON.parse(stored);
        } else {
            savedProjects = [];
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        savedProjects = [];
    }
    renderProjectsList();
}

// Save projects to localStorage
function saveProjectsToStorage() {
    try {
        localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
    } catch (error) {
        console.error('Error saving projects:', error);
    }
}

// Show save project modal
function saveProject() {
    console.log('saveProject called');
    try {
        const canvas = document.getElementById('designCanvas');
        if (!canvas) {
            console.error('Canvas not found');
            showAlertDialog('Canvas not found. Please make sure you are in the Design section.', 'Error');
            return;
        }
        
        // Check if there are any charts
        const chartWidgets = canvas.querySelectorAll('.chart-widget');
        if (chartWidgets.length === 0) {
            showAlertDialog('No charts to save. Please add charts to the canvas first.', 'No Charts');
            return;
        }
        
        // Show save project modal
        showSaveProjectModal();
    } catch (error) {
        console.error('Error in saveProject:', error);
        showAlertDialog('Error: ' + error.message, 'Error');
    }
}

// Show save project modal
function showSaveProjectModal() {
    console.log('showSaveProjectModal called');
    let modal = document.getElementById('saveProjectModal');
    if (!modal) {
        // Create modal if it doesn't exist
        console.log('Creating save project modal');
        createSaveProjectModal();
        modal = document.getElementById('saveProjectModal');
    }
    
    if (modal) {
        // Reset form
        const nameInput = document.getElementById('projectNameInput');
        const designerInput = document.getElementById('projectDesignerInput');
        if (nameInput) nameInput.value = '';
        if (designerInput) designerInput.value = '';
        modal.classList.remove('hidden');
        console.log('Modal shown');
    } else {
        console.error('Modal not found after creation');
        showAlertDialog('Error: Could not create save project modal', 'Error');
    }
}

// Create save project modal
function createSaveProjectModal() {
    // Check if modal already exists
    if (document.getElementById('saveProjectModal')) {
        console.log('Modal already exists');
        return;
    }
    
    const modalHTML = `
        <div id="saveProjectModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div class="bg-white rounded-lg shadow-xl w-96 max-w-full mx-4">
                <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-800">Save Project</h3>
                    <button onclick="closeSaveProjectModal()" class="text-gray-500 hover:text-gray-700">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div>
                            <label class="text-sm text-gray-600 mb-1 block">Project Name *</label>
                            <input type="text" id="projectNameInput" placeholder="Enter project name" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand">
                        </div>
                        <div>
                            <label class="text-sm text-gray-600 mb-1 block">Designed By *</label>
                            <input type="text" id="projectDesignerInput" placeholder="Enter designer name" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand">
                        </div>
                    </div>
                </div>
                <div class="p-6 border-t border-gray-200 flex justify-end gap-2">
                    <button onclick="closeSaveProjectModal()" class="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">Cancel</button>
                    <button onclick="confirmSaveProject()" class="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">Save</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('Save project modal created');
}

// Close save project modal
function closeSaveProjectModal() {
    const modal = document.getElementById('saveProjectModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Confirm and save project
function confirmSaveProject() {
    const projectName = document.getElementById('projectNameInput')?.value.trim();
    const projectDesigner = document.getElementById('projectDesignerInput')?.value.trim();
    
    if (!projectName || projectName === '') {
        showAlertDialog('Please enter a project name', 'Validation Error');
        return;
    }
    
    if (!projectDesigner || projectDesigner === '') {
        showAlertDialog('Please enter designer name', 'Validation Error');
        return;
    }
    
    const canvas = document.getElementById('designCanvas');
    if (!canvas) {
        showAlertDialog('Canvas not found', 'Error');
        return;
    }
    
    // Get all chart widgets from canvas
    const chartWidgets = canvas.querySelectorAll('.chart-widget');
    const projectData = {
        id: Date.now().toString(),
        name: projectName,
        designer: projectDesigner,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        charts: []
    };
    
    chartWidgets.forEach((widget, index) => {
        const chartDiv = widget.querySelector('[id^="chart-"]');
        const chartId = chartDiv ? chartDiv.id : `chart-${index}`;
        
        const chartData = {
            id: widget.dataset.widgetId || `chart-${index}`,
            chartDivId: chartId,
            type: widget.dataset.chartType || 'bar',
            left: widget.offsetLeft,
            top: widget.offsetTop,
            width: widget.offsetWidth,
            height: widget.offsetHeight,
            settings: window.chartSettings && window.chartSettings[chartId] || {},
            drillField: widget.dataset.drillField || null,
            targetChartId: widget.dataset.targetChartId || null
        };
        
        projectData.charts.push(chartData);
    });
    
    // Save drill-through connections for this project
    if (typeof drillThroughConnections !== 'undefined' && drillThroughConnections) {
        // Filter connections that belong to charts in this project
        const projectWidgetIds = Array.from(chartWidgets).map(w => w.dataset.widgetId).filter(id => id);
        projectData.drillThroughConnections = drillThroughConnections.filter(conn => 
            projectWidgetIds.includes(conn.sourceId) || projectWidgetIds.includes(conn.targetId)
        );
    }
    
    // Save pages with their order
    if (typeof window.pages !== 'undefined' && window.pages && window.pages.length > 0) {
        projectData.pages = window.pages.map(page => ({
            id: page.id,
            name: page.name,
            canvasId: page.canvasId,
            order: window.pages.indexOf(page) // Store order index
        }));
    }
    
    // Add or update project
    const existingIndex = savedProjects.findIndex(p => p.name === projectName);
    if (existingIndex >= 0) {
        showConfirmDialog(
            `Project "${projectName}" already exists. Do you want to overwrite it?`,
            () => {
                savedProjects[existingIndex] = {
                    ...savedProjects[existingIndex],
                    ...projectData,
                    updatedAt: new Date().toISOString()
                };
                saveProjectsToStorage();
                renderProjectsList();
                closeSaveProjectModal();
                showAlertDialog('Project saved successfully!', 'Success');
            },
            () => {
                // User cancelled, do nothing
            }
        );
        return;
    }
    
    savedProjects.push(projectData);
    saveProjectsToStorage();
    renderProjectsList();
    closeSaveProjectModal();
    
    showAlertDialog('Project saved successfully!', 'Success');
}

// Render projects list
function renderProjectsList() {
    const projectsList = document.getElementById('projectsList');
    if (!projectsList) return;
    
    const searchTerm = document.getElementById('projectSearch')?.value.toLowerCase() || '';
    const filteredProjects = savedProjects.filter(p => 
        p.name.toLowerCase().includes(searchTerm)
    );
    
    if (filteredProjects.length === 0) {
        projectsList.innerHTML = `
            <div class="p-4 text-center text-text-muted text-sm">
                <span class="material-symbols-outlined text-4xl mb-2 block">folder_off</span>
                <p>No projects saved yet</p>
                <p class="text-xs mt-1">Save a project from the Design canvas</p>
            </div>
        `;
        return;
    }
    
    projectsList.innerHTML = filteredProjects.map(project => {
        const isActive = currentProjectId === project.id;
        const date = new Date(project.updatedAt || project.createdAt);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const designer = project.designer || 'Unknown';
        return `
            <div onclick="selectProject('${project.id}')" 
                 class="p-3 mb-2 rounded-md cursor-pointer transition-colors ${isActive ? 'bg-primary-brand text-white' : 'bg-background-light hover:bg-gray-100 text-text-default'}">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-semibold text-sm truncate">${escapeHtml(project.name)}</h4>
                        <p class="text-xs mt-1 ${isActive ? 'text-white opacity-80' : 'text-text-muted'}">Designed by: ${escapeHtml(designer)}</p>
                        <p class="text-xs mt-1 ${isActive ? 'text-white opacity-80' : 'text-text-muted'}">${dateStr}</p>
                        <p class="text-xs mt-1 ${isActive ? 'text-white opacity-80' : 'text-text-muted'}">${project.charts.length} chart(s)</p>
                    </div>
                    <button onclick="event.stopPropagation(); deleteProject('${project.id}')" 
                            class="ml-2 p-1 hover:bg-red-500 rounded text-sm ${isActive ? 'text-white hover:text-white' : 'text-text-muted hover:text-red-600'}">
                        <span class="material-symbols-outlined text-sm">delete</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Select a project to view
function selectProject(projectId) {
    currentProjectId = projectId;
    const project = savedProjects.find(p => p.id === projectId);
    if (!project) return;
    
    renderProjectsList();
    renderProjectView(project);
}

// Render project view (read-only)
function renderProjectView(project) {
    const container = document.getElementById('projectViewContainer');
    const noProjectSelected = document.getElementById('noProjectSelected');
    
    if (!container) return;
    
    if (noProjectSelected) {
        noProjectSelected.style.display = 'none';
    }
    
    // Create a read-only canvas
    const designer = project.designer || 'Unknown';
    container.innerHTML = `
        <div class="mb-4 flex items-center justify-between">
            <div>
                <h3 class="text-xl font-bold text-text-default">${escapeHtml(project.name)}</h3>
                <p class="text-sm text-text-muted mt-1">Designed by: ${escapeHtml(designer)}</p>
                <p class="text-sm text-text-muted mt-1">Last updated: ${new Date(project.updatedAt || project.createdAt).toLocaleString()}</p>
            </div>
        </div>
        <div id="projectCanvas" class="relative bg-white border border-border-light rounded-lg p-8" style="height: calc(100vh - 150px); width: 100%; overflow: hidden;">
            <!-- Charts will be rendered here -->
        </div>
    `;
    
    const projectCanvas = document.getElementById('projectCanvas');
    
    // Render each chart
    project.charts.forEach(chartData => {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-widget mb-4'; // Removed bg-surface-light, border, rounded-lg, shadow-md for transparent background
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = chartData.left + 'px';
        chartContainer.style.top = chartData.top + 'px';
        chartContainer.style.width = chartData.width + 'px';
        chartContainer.style.minHeight = chartData.height + 'px';
        chartContainer.style.overflow = 'visible'; // Allow resize handles to be visible outside container
        // Enable pointer events for drill-through interactions (buttons, inputs, etc.)
        chartContainer.style.pointerEvents = 'auto';
        
        const chartDiv = document.createElement('div');
        chartDiv.id = `project-chart-${chartData.id}`;
        chartDiv.style.width = 'calc(100% - 20px)';
        chartDiv.style.height = 'calc(100% - 24px)'; // More space at bottom for lower handles
        chartDiv.style.minWidth = 'calc(100% - 20px)';
        chartDiv.style.minHeight = 'calc(100% - 24px)';
        chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles (top, right, bottom, left)
        chartDiv.style.position = 'relative';
        chartDiv.style.zIndex = '1'; // Lower z-index so resize handles appear on top
        chartDiv.style.backgroundColor = 'transparent'; // Make chart div background transparent
        // Enable pointer events for chart interactions (drill-through clicks, etc.)
        chartDiv.style.pointerEvents = 'auto';
        
        // Ensure container has explicit height (not just minHeight)
        if (!chartContainer.style.height || chartContainer.style.height === 'auto') {
            chartContainer.style.height = chartData.height + 'px';
        }
        
        chartContainer.appendChild(chartDiv);
        projectCanvas.appendChild(chartContainer);
        
        // Store drill-through data if available
        if (chartData.drillField) {
            chartContainer.dataset.drillField = chartData.drillField;
        }
        if (chartData.targetChartId) {
            chartContainer.dataset.targetChartId = chartData.targetChartId;
        }
        
        // Render chart with saved settings
        if (typeof renderChart === 'function') {
            const settings = chartData.settings || {};
            renderChart(chartData.type, chartDiv.id, settings);
        }
        
        // Initialize slicers for drill-through functionality - ensure they work in Data Stream
        if (chartData.type === 'button-slicer' || chartData.type === 'text-slicer' || chartData.type === 'list-slicer') {
            setTimeout(() => {
                const slicerContainer = chartContainer.querySelector('.slicer-widget');
                if (slicerContainer) {
                    if (chartData.type === 'button-slicer' && typeof initButtonSlicer === 'function') {
                        initButtonSlicer(slicerContainer);
                    } else if (chartData.type === 'text-slicer' && typeof initTextSlicer === 'function') {
                        initTextSlicer(slicerContainer);
                    } else if (chartData.type === 'list-slicer' && typeof initListSlicer === 'function') {
                        initListSlicer(slicerContainer);
                    }
                }
            }, 300);
        }
        
        // Initialize card widget for drill-through
        if (chartData.type === 'card') {
            setTimeout(() => {
                const cardContainer = chartContainer.querySelector('.card-widget');
                if (cardContainer && typeof initCardWidget === 'function') {
                    initCardWidget(cardContainer);
                }
            }, 300);
        }
        
        // Enable Plotly chart click events for drill-through (for regular charts)
        if (chartData.type !== 'button-slicer' && chartData.type !== 'text-slicer' && 
            chartData.type !== 'list-slicer' && chartData.type !== 'card' && 
            chartData.type !== 'text-box' && chartData.type !== 'image' && chartData.type !== 'excel') {
            setTimeout(() => {
                const plotlyChart = chartDiv.querySelector('.js-plotly-plot');
                if (plotlyChart && typeof handleChartClick === 'function') {
                    // Re-attach click handler for drill-through
                    plotlyChart.on('plotly_click', function(data) {
                        handleChartClick(chartDiv.id, data);
                    });
                }
            }, 500);
        }
    });
    
    // Restore drill-through connections for read-only view
    if (project.drillThroughConnections && project.drillThroughConnections.length > 0) {
        setTimeout(() => {
            // Add connections to global drillThroughConnections array if it exists
            if (typeof drillThroughConnections !== 'undefined') {
                project.drillThroughConnections.forEach(conn => {
                    // Check if connection already exists
                    const exists = drillThroughConnections.find(c => 
                        c.sourceId === conn.sourceId && 
                        c.targetId === conn.targetId && 
                        c.field === conn.field
                    );
                    if (!exists) {
                        drillThroughConnections.push(conn);
                    }
                });
            }
            
            project.drillThroughConnections.forEach(conn => {
                const sourceWidget = document.querySelector(`[data-widget-id="${conn.sourceId}"]`);
                const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
                if (sourceWidget && targetWidget) {
                    if (typeof showDrillThroughConnection === 'function') {
                        showDrillThroughConnection(sourceWidget, targetWidget);
                    }
                    
                    // Store drill field in source widget for slicers
                    if (sourceWidget.dataset.chartType === 'button-slicer' || 
                        sourceWidget.dataset.chartType === 'text-slicer' || 
                        sourceWidget.dataset.chartType === 'list-slicer' ||
                        sourceWidget.dataset.chartType === 'card') {
                        sourceWidget.dataset.drillField = conn.field;
                        sourceWidget.dataset.targetChartId = conn.targetId;
                        
                        // Update slicer with data from target chart
                        if (typeof updateSlicerWidgetData === 'function') {
                            if (sourceWidget.dataset.chartType === 'button-slicer' || 
                                sourceWidget.dataset.chartType === 'list-slicer') {
                                updateSlicerWidgetData(sourceWidget, conn.field, targetWidget);
                            }
                        }
                        
                        // Re-initialize slicer event listeners (even for read-only, to show correct data)
                        const slicerContainer = sourceWidget.querySelector('.slicer-widget');
                        if (slicerContainer) {
                            if (sourceWidget.dataset.chartType === 'button-slicer' && typeof initButtonSlicer === 'function') {
                                initButtonSlicer(slicerContainer);
                            } else if (sourceWidget.dataset.chartType === 'text-slicer' && typeof initTextSlicer === 'function') {
                                initTextSlicer(slicerContainer);
                            } else if (sourceWidget.dataset.chartType === 'list-slicer' && typeof initListSlicer === 'function') {
                                initListSlicer(slicerContainer);
                            }
                        }
                    }
                }
            });
        }, 800);
    }
    
    // Update charts with current data if streaming
    if (isStreaming) {
        updateProjectCharts(project);
    }
}

// Update project charts with fresh data
function updateProjectCharts(project) {
    if (!project || !currentProjectId) return;
    
    project.charts.forEach(chartData => {
        const chartDiv = document.getElementById(`project-chart-${chartData.id}`);
        if (chartDiv && typeof renderChart === 'function') {
            const settings = chartData.settings || {};
            renderChart(chartData.type, chartDiv.id, settings);
            
            // Re-initialize drill-through event listeners after chart update
            const chartContainer = chartDiv.closest('.chart-widget');
            if (chartContainer) {
                const chartType = chartContainer.dataset.chartType;
                
                // Re-initialize slicers
                if (chartType === 'button-slicer' || chartType === 'text-slicer' || chartType === 'list-slicer') {
                    setTimeout(() => {
                        const slicerContainer = chartContainer.querySelector('.slicer-widget');
                        if (slicerContainer) {
                            if (chartType === 'button-slicer' && typeof initButtonSlicer === 'function') {
                                initButtonSlicer(slicerContainer);
                            } else if (chartType === 'text-slicer' && typeof initTextSlicer === 'function') {
                                initTextSlicer(slicerContainer);
                            } else if (chartType === 'list-slicer' && typeof initListSlicer === 'function') {
                                initListSlicer(slicerContainer);
                            }
                        }
                    }, 300);
                }
                
                // Re-attach Plotly click events for drill-through
                if (chartType !== 'button-slicer' && chartType !== 'text-slicer' && 
                    chartType !== 'list-slicer' && chartType !== 'card' && 
                    chartType !== 'text-box' && chartType !== 'image' && chartType !== 'excel') {
                    setTimeout(() => {
                        const plotlyChart = chartDiv.querySelector('.js-plotly-plot');
                        if (plotlyChart && typeof handleChartClick === 'function') {
                            plotlyChart.on('plotly_click', function(data) {
                                handleChartClick(chartDiv.id, data);
                            });
                        }
                    }, 500);
                }
            }
        }
    });
}

// Start data stream
function startDataStream() {
    if (isStreaming) return;
    
    if (!currentProjectId) {
        showAlertDialog('Please select a project first', 'No Project Selected');
        return;
    }
    
    const intervalSelect = document.getElementById('refreshInterval');
    const intervalMinutes = parseInt(intervalSelect.value) || 60;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    isStreaming = true;
    const startBtn = document.getElementById('startStreamBtn');
    const stopBtn = document.getElementById('stopStreamBtn');
    
    if (startBtn) startBtn.classList.add('hidden');
    if (stopBtn) stopBtn.classList.remove('hidden');
    
    // Update immediately
    const project = savedProjects.find(p => p.id === currentProjectId);
    if (project) {
        updateProjectCharts(project);
    }
    
    // Set interval for updates
    streamInterval = setInterval(() => {
        const project = savedProjects.find(p => p.id === currentProjectId);
        if (project) {
            updateProjectCharts(project);
        }
    }, intervalMs);
}

// Stop data stream
function stopDataStream() {
    if (!isStreaming) return;
    
    isStreaming = false;
    const startBtn = document.getElementById('startStreamBtn');
    const stopBtn = document.getElementById('stopStreamBtn');
    
    if (startBtn) startBtn.classList.remove('hidden');
    if (stopBtn) stopBtn.classList.add('hidden');
    
    if (streamInterval) {
        clearInterval(streamInterval);
        streamInterval = null;
    }
}

// Delete project
function deleteProject(projectId) {
    const project = savedProjects.find(p => p.id === projectId);
    const projectName = project ? project.name : 'this project';
    
    showConfirmDialog(
        `Are you sure you want to delete "${projectName}"? This action cannot be undone.`,
        () => {
            savedProjects = savedProjects.filter(p => p.id !== projectId);
            saveProjectsToStorage();
            
            if (currentProjectId === projectId) {
                currentProjectId = null;
                const container = document.getElementById('projectViewContainer');
                const noProjectSelected = document.getElementById('noProjectSelected');
                if (container) {
                    container.innerHTML = '';
                }
                if (noProjectSelected) {
                    noProjectSelected.style.display = 'flex';
                }
                stopDataStream();
            }
            
            renderProjectsList();
            showAlertDialog(`Project "${projectName}" has been deleted.`, 'Project Deleted');
        },
        () => {
            // User cancelled, do nothing
        }
    );
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load projects for Empty Canvas dropdown
function loadProjectsForEmptyCanvas() {
    loadSavedProjects();
    const select = document.getElementById('emptyCanvasProjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a project --</option>';
    savedProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

// Load projects for Saved Canvas dropdown
function loadProjectsForSavedCanvas() {
    loadSavedProjects();
    const select = document.getElementById('savedCanvasProjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Select a project --</option>';
    savedProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        select.appendChild(option);
    });
}

// Load project to canvas for editing
function loadProjectToCanvas(projectId) {
    if (!projectId) {
        const canvas = document.getElementById('designCanvasSaved');
        if (canvas) {
            canvas.innerHTML = '';
        }
        return;
    }
    
    const project = savedProjects.find(p => p.id === projectId);
    if (!project) {
        showAlertDialog('Project not found', 'Error');
        return;
    }
    
    const canvas = document.getElementById('designCanvasSaved');
    if (!canvas) {
        showAlertDialog('Canvas not found', 'Error');
        return;
    }
    
    // Load pages with their order if available
    if (project.pages && project.pages.length > 0) {
        // Initialize pagesSaved if not exists
        if (!window.pagesSaved) {
            window.pagesSaved = [];
        }
        
        // Clear existing pages
        window.pagesSaved = [];
        
        // Restore pages in their saved order
        project.pages.sort((a, b) => (a.order || 0) - (b.order || 0)).forEach((pageData, index) => {
            const page = {
                id: pageData.id || `page-saved-${index + 1}`,
                name: pageData.name || `Page ${index + 1}`,
                canvasId: pageData.canvasId || `canvas-saved-${pageData.id || index + 1}`,
                widgets: []
            };
            window.pagesSaved.push(page);
        });
        
        // Render pages list
        if (typeof renderPagesListSaved === 'function') {
            renderPagesListSaved();
        }
        
        // Switch to first page
        if (window.pagesSaved.length > 0 && typeof switchToPageSaved === 'function') {
            window.currentPageIdSaved = window.pagesSaved[0].id;
            switchToPageSaved(window.pagesSaved[0].id);
        }
    }
    
    // Clear canvas
    canvas.innerHTML = '';
    
    // Load each chart from the project
    project.charts.forEach((chartData, index) => {
        // Create chart container (same structure as addChartToCanvas)
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-widget mb-4'; // Removed bg-surface-light, border, rounded-lg, shadow-md for transparent background
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = (chartData.left || 0) + 'px';
        chartContainer.style.top = (chartData.top || 0) + 'px';
        chartContainer.style.width = (chartData.width || 400) + 'px';
        chartContainer.style.minHeight = (chartData.height || 300) + 'px';
        chartContainer.style.cursor = 'move';
        chartContainer.style.padding = '0';
        chartContainer.style.overflow = 'visible'; // Allow resize handles to be visible outside container
        chartContainer.draggable = false;
        
        // Initially hide background and border - show only when clicked
        chartContainer.style.backgroundColor = 'transparent';
        chartContainer.style.border = 'none';
        chartContainer.style.boxShadow = 'none';
        
        chartContainer.dataset.widgetId = chartData.id || `widget-${index}`;
        chartContainer.dataset.chartType = chartData.type;
        
        // Store drill-through data if available
        if (chartData.drillField) {
            chartContainer.dataset.drillField = chartData.drillField;
        }
        if (chartData.targetChartId) {
            chartContainer.dataset.targetChartId = chartData.targetChartId;
        }
        
        // Chart header - hidden by default (same as addChartToCanvas)
        const header = document.createElement('div');
        header.className = 'chart-widget-header hidden flex items-center justify-between p-4 pb-2 border-b border-border-light';
        header.style.display = 'none';
        
        // Get chart icon and name
        const chartTypeInfo = window.chartTypes && window.chartTypes.find(c => c.id === chartData.type);
        const chartIcon = chartTypeInfo?.icon || 'bar_chart';
        const chartName = chartTypeInfo?.name || chartData.type;
        
        header.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-lg text-primary-brand">${chartIcon}</span>
                <span class="text-sm font-semibold text-text-default">${chartName}</span>
            </div>
            <div class="flex gap-1">
                <button onclick="connectDrillThrough(this)" class="p-1 text-text-muted hover:text-primary-brand" title="Connect Drill Through">
                    <span class="material-symbols-outlined text-sm">link</span>
                </button>
                <button onclick="editChartSettings(this)" class="p-1 text-text-muted hover:text-primary-brand" title="Edit Settings">
                    <span class="material-symbols-outlined text-sm">settings</span>
                </button>
                <button onclick="deleteChart(this)" class="p-1 text-text-muted hover:text-status-failed" title="Delete">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            </div>
        `;
        
        // Chart content div
        const chartDiv = document.createElement('div');
        chartDiv.id = chartData.chartDivId || `chart-${Date.now()}-${index}`;
        chartDiv.style.width = '100%';
        chartDiv.style.position = 'relative';
        chartDiv.style.zIndex = '1'; // Lower z-index so resize handles appear on top
        chartDiv.style.backgroundColor = 'transparent'; // Make chart div background transparent
        if (chartData.type === 'text-box') {
            chartDiv.style.height = 'auto';
            chartDiv.style.minHeight = 'auto';
        } else {
            // Chart div should be smaller than container to leave space for resize handles
            // Resize handles are positioned at -10px (top/sides) and -14px (bottom), so we use calc to keep chart content inside
            chartDiv.style.width = 'calc(100% - 20px)';
            chartDiv.style.height = 'calc(100% - 24px)'; // More space at bottom for lower handles
            chartDiv.style.minWidth = 'calc(100% - 20px)';
            chartDiv.style.minHeight = 'calc(100% - 24px)';
            chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles (top, right, bottom, left)
        }
        chartDiv.style.pointerEvents = 'none';
        
        // Ensure container has explicit height (not just minHeight)
        if (!chartContainer.style.height || chartContainer.style.height === 'auto') {
            const containerHeight = parseFloat(chartContainer.style.minHeight) || 300;
            chartContainer.style.height = containerHeight + 'px';
        }
        
        chartContainer.appendChild(header);
        chartContainer.appendChild(chartDiv);
        canvas.appendChild(chartContainer);
        
        // Add resize handles
        if (typeof addResizeHandles === 'function') {
            addResizeHandles(chartContainer, chartDiv);
        }
        
        // Allow header to be clickable
        header.style.pointerEvents = 'auto';
        
        // Add click handler to show/hide header (same as addChartToCanvas)
        chartContainer.addEventListener('click', (e) => {
            // IMPORTANT: Stop propagation immediately to prevent duplicate chart creation
            // This prevents the click from bubbling up to canvas or other handlers that might add new charts
            e.stopPropagation();
            
            // Don't toggle if clicking on resize handle
            if (e.target.closest('.resize-handle')) {
                return;
            }
            const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
            if (!clickedOnChart || e.target.closest('.chart-widget-header')) {
                document.querySelectorAll('.chart-widget-header').forEach(h => {
                    if (h !== header) {
                        h.style.display = 'none';
                        h.classList.add('hidden');
                        // Hide resize handles and background for other charts
                        const otherWidget = h.closest('.chart-widget');
                        if (otherWidget) {
                            if (typeof hideResizeHandles === 'function') {
                                hideResizeHandles(otherWidget);
                            }
                            // Hide background and border for other widgets
                            otherWidget.style.backgroundColor = 'transparent';
                            otherWidget.style.border = 'none';
                            otherWidget.style.boxShadow = 'none';
                        }
                    }
                });
                if (header.style.display === 'none' || header.classList.contains('hidden')) {
                    header.style.display = 'flex';
                    header.classList.remove('hidden');
                    chartContainer.style.padding = '0';
                    // Show background and border when clicked
                    chartContainer.style.backgroundColor = '';
                    chartContainer.style.border = '';
                    chartContainer.style.boxShadow = '';
                    // Show resize handles
                    if (typeof showResizeHandles === 'function') {
                        showResizeHandles(chartContainer);
                    }
                } else {
                    header.style.display = 'none';
                    header.classList.add('hidden');
                    chartContainer.style.padding = '0';
                    // Hide background and border when not selected
                    chartContainer.style.backgroundColor = 'transparent';
                    chartContainer.style.border = 'none';
                    chartContainer.style.boxShadow = 'none';
                    // Hide resize handles
                    if (typeof hideResizeHandles === 'function') {
                        hideResizeHandles(chartContainer);
                    }
                }
            }
        });
        
        // Prevent interactions on chart content (same as addChartToCanvas)
        chartContainer.addEventListener('mousedown', (e) => {
            if (!e.target.closest('.chart-widget-header')) {
                const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
                if (clickedOnChart) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        });
        
        chartContainer.addEventListener('mouseover', (e) => {
            const hoveredOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
            if (hoveredOnChart && !e.target.closest('.chart-widget-header')) {
                chartContainer.style.cursor = 'move';
            }
        });
        
        chartContainer.addEventListener('dblclick', (e) => {
            const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
            if (clickedOnChart && !e.target.closest('.chart-widget-header')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        chartContainer.addEventListener('contextmenu', (e) => {
            const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
            if (clickedOnChart && !e.target.closest('.chart-widget-header')) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        // Render chart with saved settings
        if (typeof renderChart === 'function') {
            const settings = chartData.settings || {};
            // Store settings in window.chartSettings for the chart
            if (!window.chartSettings) {
                window.chartSettings = {};
            }
            window.chartSettings[chartDiv.id] = settings;
            
            setTimeout(() => {
                renderChart(chartData.type, chartDiv.id, settings);
            }, 100);
        }
        
        // Make chart draggable
        if (typeof makeChartDraggable === 'function') {
            setTimeout(() => {
                makeChartDraggable(chartContainer);
            }, 200);
        }
    });
    
    // Initialize canvas interactions
    if (typeof setupCanvasDragDrop === 'function') {
        setTimeout(() => {
            // Setup drag and drop for saved canvas
            const savedCanvas = document.getElementById('designCanvasSaved');
            if (savedCanvas) {
                setupCanvasDragDropForSavedCanvas();
            }
        }, 300);
    }
    
    // Render toolbox for saved canvas
    if (typeof renderChartToolbox === 'function') {
        setTimeout(() => {
            const toolbox = document.getElementById('chartToolboxSaved');
            if (toolbox) {
                renderChartToolbox('chartToolboxSaved');
            }
        }, 100);
    }
    
    // Restore drill-through connections after charts are loaded
    if (project.drillThroughConnections && project.drillThroughConnections.length > 0) {
        setTimeout(() => {
            // Add connections to global drillThroughConnections array
            if (typeof drillThroughConnections !== 'undefined') {
                project.drillThroughConnections.forEach(conn => {
                    // Check if connection already exists
                    const exists = drillThroughConnections.find(c => 
                        c.sourceId === conn.sourceId && 
                        c.targetId === conn.targetId && 
                        c.field === conn.field
                    );
                    if (!exists) {
                        drillThroughConnections.push(conn);
                    }
                });
                
                // Restore visual indicators and initialize slicers
                project.drillThroughConnections.forEach(conn => {
                    const sourceWidget = document.querySelector(`[data-widget-id="${conn.sourceId}"]`);
                    const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
                    if (sourceWidget && targetWidget) {
                        if (typeof showDrillThroughConnection === 'function') {
                            showDrillThroughConnection(sourceWidget, targetWidget);
                        }
                        
                        // Store drill field in source widget for slicers
                        if (sourceWidget.dataset.chartType === 'button-slicer' || 
                            sourceWidget.dataset.chartType === 'text-slicer' || 
                            sourceWidget.dataset.chartType === 'list-slicer' ||
                            sourceWidget.dataset.chartType === 'card') {
                            sourceWidget.dataset.drillField = conn.field;
                            sourceWidget.dataset.targetChartId = conn.targetId;
                            
                            // Update slicer with data from target chart
                            if (typeof updateSlicerWidgetData === 'function') {
                                if (sourceWidget.dataset.chartType === 'button-slicer' || 
                                    sourceWidget.dataset.chartType === 'list-slicer') {
                                    updateSlicerWidgetData(sourceWidget, conn.field, targetWidget);
                                }
                            }
                            
                            // Re-initialize slicer event listeners
                            const slicerContainer = sourceWidget.querySelector('.slicer-widget');
                            if (slicerContainer) {
                                if (sourceWidget.dataset.chartType === 'button-slicer' && typeof initButtonSlicer === 'function') {
                                    initButtonSlicer(slicerContainer);
                                } else if (sourceWidget.dataset.chartType === 'text-slicer' && typeof initTextSlicer === 'function') {
                                    initTextSlicer(slicerContainer);
                                } else if (sourceWidget.dataset.chartType === 'list-slicer' && typeof initListSlicer === 'function') {
                                    initListSlicer(slicerContainer);
                                }
                            }
                        }
                    }
                });
            }
        }, 500);
    }
}

// Setup canvas drag and drop for saved canvas (similar to design.js)
function setupCanvasDragDropForSavedCanvas() {
    const canvas = document.getElementById('designCanvasSaved');
    if (!canvas) return;
    
    let dragOverTimeout = null;
    
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        
        if (!dragOverTimeout) {
            dragOverTimeout = setTimeout(() => {
                canvas.style.backgroundColor = '#f0f0f0';
                dragOverTimeout = null;
            }, 50);
        }
    });
    
    canvas.addEventListener('dragleave', (e) => {
        if (!canvas.contains(e.relatedTarget)) {
            if (dragOverTimeout) {
                clearTimeout(dragOverTimeout);
                dragOverTimeout = null;
            }
            canvas.style.backgroundColor = '';
        }
    });
    
    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        canvas.style.backgroundColor = '';
        
        if (dragOverTimeout) {
            clearTimeout(dragOverTimeout);
            dragOverTimeout = null;
        }
        
        const chartType = e.dataTransfer.getData('chartType');
        if (chartType) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            
            if (typeof addChartToCanvas === 'function') {
                // Temporarily change canvas ID for addChartToCanvas
                const originalCanvas = document.getElementById('designCanvas');
                const savedCanvas = document.getElementById('designCanvasSaved');
                if (savedCanvas && !originalCanvas) {
                    savedCanvas.id = 'designCanvas';
                    addChartToCanvas(chartType, x, y);
                    savedCanvas.id = 'designCanvasSaved';
                }
            }
        }
    });
    
    canvas.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Hide all headers when clicking on canvas (empty area)
    canvas.addEventListener('click', (e) => {
        const clickedWidget = e.target.closest('.chart-widget');
        if (!clickedWidget) {
            document.querySelectorAll('.chart-widget-header').forEach(header => {
                header.style.display = 'none';
                header.classList.add('hidden');
            });
            document.querySelectorAll('.chart-widget').forEach(widget => {
                widget.style.padding = '0';
                // Hide background and border for all widgets
                widget.style.backgroundColor = 'transparent';
                widget.style.border = 'none';
                widget.style.boxShadow = 'none';
            });
            // Hide resize handles for all widgets
            document.querySelectorAll('.chart-widget').forEach(widget => {
                if (typeof hideResizeHandles === 'function') {
                    hideResizeHandles(widget);
                }
            });
        }
    });
    
    // Handle Delete key press to delete selected chart
    canvas.addEventListener('keydown', (e) => {
        // Check if Delete or Backspace key is pressed
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // Prevent default behavior (like going back in browser)
            e.preventDefault();
            e.stopPropagation();
            
            // Find the currently selected/visible chart widget
            const visibleHeaders = Array.from(document.querySelectorAll('.chart-widget-header')).filter(header => {
                return header.style.display !== 'none' && !header.classList.contains('hidden');
            });
            
            if (visibleHeaders.length > 0) {
                // Delete the chart with visible header
                const chartWidget = visibleHeaders[0].closest('.chart-widget');
                if (chartWidget) {
                    deleteChartWidgetForSavedCanvas(chartWidget);
                }
            }
        }
    });
    
    // Make canvas focusable for keyboard events
    canvas.setAttribute('tabindex', '0');
}

// Delete chart widget for saved canvas
function deleteChartWidgetForSavedCanvas(chartWidget) {
    if (chartWidget) {
        // Purge Plotly chart if exists
        const chartDiv = chartWidget.querySelector('[id^="chart-"]');
        if (chartDiv && typeof Plotly !== 'undefined') {
            Plotly.purge(chartDiv);
        }
        
        chartWidget.remove();
        
        // Update drill through connections if function exists
        if (typeof updateDrillThroughConnections === 'function') {
            updateDrillThroughConnections();
        }
    }
}

// Make functions globally accessible
window.saveProject = saveProject;
window.selectProject = selectProject;
window.deleteProject = deleteProject;
window.startDataStream = startDataStream;
window.stopDataStream = stopDataStream;
window.showSaveProjectModal = showSaveProjectModal;
window.closeSaveProjectModal = closeSaveProjectModal;
window.confirmSaveProject = confirmSaveProject;
window.loadProjectsForEmptyCanvas = loadProjectsForEmptyCanvas;
window.loadProjectsForSavedCanvas = loadProjectsForSavedCanvas;
window.loadProjectToCanvas = loadProjectToCanvas;
window.setupCanvasDragDropForSavedCanvas = setupCanvasDragDropForSavedCanvas;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Data stream.js DOMContentLoaded');
    loadSavedProjects();
    
    // Create modal immediately
    createSaveProjectModal();
    
    // Search functionality
    const projectSearch = document.getElementById('projectSearch');
    if (projectSearch) {
        projectSearch.addEventListener('input', () => {
            renderProjectsList();
        });
    }
    
    // Stop stream when switching sections
    const originalShowSection = window.showSection;
    if (originalShowSection) {
        window.showSection = function(sectionName) {
            if (sectionName !== 'data-stream') {
                stopDataStream();
            }
            originalShowSection(sectionName);
        };
    }
    
    // Also make sure functions are available immediately
    if (typeof window.saveProject === 'undefined') {
        console.warn('saveProject not available, setting it now');
        window.saveProject = saveProject;
    }
});

