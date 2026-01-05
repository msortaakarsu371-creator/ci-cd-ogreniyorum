// ==================== CONNECTION MODAL ====================

// Show connection modal for model widgets
function showConnectionModal(buttonElement) {
    const modelWidget = buttonElement.closest('.chart-widget');
    if (!modelWidget) {
        console.error('Model widget not found');
        return;
    }
    
    const modelWidgetId = modelWidget.dataset.widgetId;
    const modelChartType = modelWidget.dataset.chartType;
    const modelName = modelWidget.querySelector('.widget-name-display')?.textContent || 
                     chartTypes.find(c => c.id === modelChartType)?.name || modelChartType;
    
    if (!modelWidgetId) {
        console.error('Model widget ID not found');
        return;
    }
    
    // Store reference to model widget for preview
    window.currentModelWidget = modelWidget;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('connectionModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'connectionModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-11/12 max-w-7xl h-5/6 flex flex-col">
            <div class="flex items-center justify-between p-4 border-b">
                <h2 class="text-xl font-semibold">Connections - ${modelName}</h2>
                <button onclick="closeConnectionModal()" class="text-gray-500 hover:text-gray-700">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="flex-1 flex flex-col overflow-hidden">
                <!-- Unified STM and MTM View -->
                <div class="flex-1 flex overflow-hidden relative">
                    <!-- Left: Slicers -->
                    <div class="w-1/3 border-r p-4 overflow-y-auto relative">
                        <h3 class="font-semibold mb-3">Slicers</h3>
                        <div id="stmSlicersList" class="space-y-2">
                            <!-- Slicers will be listed here -->
                        </div>
                    </div>
                    
                    <!-- Middle: Selected Model -->
                    <div class="w-1/3 border-r p-4 overflow-y-auto relative">
                        <h3 class="font-semibold mb-3 text-center">Selected Model</h3>
                        <div id="selectedModelContainer" class="p-4">
                            <div id="selectedModelPreview" class="mb-3" style="width: 100%; min-height: 300px; max-height: 400px; overflow: hidden; position: relative; background: transparent; display: flex; align-items: center; justify-content: center; padding: 10px;">
                                <!-- Model preview will be inserted here -->
                            </div>
                            <div class="text-center font-semibold text-gray-900 mb-3">${modelName}</div>
                            <div class="border rounded p-3 bg-gray-50">
                                <h4 class="text-sm font-semibold mb-2">Available Columns</h4>
                                <div id="modelColumns" class="space-y-2">
                                    <!-- Columns will be listed here -->
                                </div>
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- Right: Source Models -->
                    <div class="w-1/3 p-4 overflow-y-auto relative">
                        <h3 class="font-semibold mb-3">Source Models</h3>
                        <div id="mtmSourceModelsList" class="space-y-2">
                            <!-- Source models will be listed here -->
                        </div>
                    </div>
                    
                    <!-- Connection Lines SVG Overlay -->
                    <svg class="absolute inset-0 pointer-events-none" style="z-index: 1;">
                        <defs>
                            <marker id="arrowhead-stm" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
                            </marker>
                            <marker id="arrowhead-mtm" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                                <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
                            </marker>
                        </defs>
                        <g id="connectionLines"></g>
                    </svg>
                </div>
                
                <!-- Save Button -->
                <div class="p-4 border-t bg-gray-50 flex justify-end">
                    <button onclick="saveConnections()" class="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-2">
                        <span class="material-symbols-outlined text-sm">save</span>
                        Save Connections
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load selected model preview - use the widget directly
    const loadSelectedModelPreview = () => {
        // Use the widget reference we already have
        if (!modelWidget) {
            console.error('Model widget not available for preview');
            return;
        }
        
        // Get original widget dimensions
        const originalWidth = modelWidget.offsetWidth || 400;
        const originalHeight = modelWidget.offsetHeight || 300;
        
        // Function to create preview
        const createPreview = (previewContainer, widget) => {
            if (!previewContainer) {
                console.error('Preview container not found');
                return;
            }
            
            if (!widget) {
                console.error('Widget not found for preview');
                return;
            }
            
            // Clear any existing content
            previewContainer.innerHTML = '';
            
            // Get container dimensions
            const previewWidth = previewContainer.offsetWidth || 300;
            const previewHeight = 350;
            
            // Calculate scale to fit in preview container
            const scaleX = (previewWidth - 20) / originalWidth;
            const scaleY = previewHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY, 0.85);
            
            // Get the original chart div from widget
            const originalChartDiv = widget.querySelector('[id^="chart-"]');
            if (!originalChartDiv) {
                console.error('Chart div not found in widget');
                return;
            }
            
            // Clone the entire widget
            const widgetClone = widget.cloneNode(true);
            
            // Set widget clone styles - make it visible
            widgetClone.style.position = 'relative';
            widgetClone.style.width = `${originalWidth}px`;
            widgetClone.style.height = `${originalHeight}px`;
            widgetClone.style.pointerEvents = 'none';
            widgetClone.style.margin = '0';
            widgetClone.style.padding = '0';
            widgetClone.style.backgroundColor = 'transparent';
            widgetClone.style.border = 'none';
            widgetClone.style.boxShadow = 'none';
            widgetClone.style.display = 'block';
            widgetClone.style.visibility = 'visible';
            widgetClone.style.opacity = '1';
            
            // Remove resize handles and header from clone
            const resizeHandles = widgetClone.querySelectorAll('.resize-handle');
            resizeHandles.forEach(handle => handle.remove());
            const header = widgetClone.querySelector('.chart-widget-header');
            if (header) {
                header.style.display = 'none';
                header.classList.add('hidden');
            }
            
            // Get chart div from clone and ensure it's visible
            const chartDiv = widgetClone.querySelector('[id^="chart-"]');
            if (chartDiv) {
                // Copy all styles and content from original chart div
                chartDiv.style.display = 'block';
                chartDiv.style.visibility = 'visible';
                chartDiv.style.opacity = '1';
                chartDiv.style.width = '100%';
                chartDiv.style.height = '100%';
                chartDiv.style.position = 'relative';
                
                // Copy innerHTML from original chart div to ensure Plotly charts are included
                chartDiv.innerHTML = originalChartDiv.innerHTML;
                
                // Ensure all child elements are visible
                const allChildren = chartDiv.querySelectorAll('*');
                allChildren.forEach(child => {
                    if (child.style) {
                        child.style.display = child.style.display || 'block';
                        child.style.visibility = child.style.visibility || 'visible';
                        child.style.opacity = child.style.opacity || '1';
                    }
                });
            }
            
            // Create a wrapper div for scaling - ensure it fits within container without scrolling
            const wrapper = document.createElement('div');
            const scaledWidth = originalWidth * scale;
            const scaledHeight = originalHeight * scale;
            
            wrapper.style.width = `${scaledWidth}px`;
            wrapper.style.height = `${scaledHeight}px`;
            wrapper.style.maxWidth = '100%';
            wrapper.style.maxHeight = '100%';
            wrapper.style.position = 'relative';
            wrapper.style.margin = '0 auto';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
            wrapper.style.overflow = 'hidden';
            
            // Set widget clone styles - position it absolutely within wrapper
            widgetClone.style.width = `${originalWidth}px`;
            widgetClone.style.height = `${originalHeight}px`;
            widgetClone.style.transform = `scale(${scale})`;
            widgetClone.style.transformOrigin = 'center center';
            widgetClone.style.position = 'absolute';
            widgetClone.style.top = '50%';
            widgetClone.style.left = '50%';
            widgetClone.style.marginTop = `-${originalHeight * scale / 2}px`;
            widgetClone.style.marginLeft = `-${originalWidth * scale / 2}px`;
            
            // Add widget clone to wrapper
            wrapper.appendChild(widgetClone);
            
            // Append wrapper to preview container
            previewContainer.appendChild(wrapper);
            
            console.log('Preview created for widget:', modelWidgetId, 'Scale:', scale, 'Widget:', !!widget, 'Chart div:', !!chartDiv, 'Original chart div:', !!originalChartDiv);
        };
        
        // Load preview after modal is rendered - try multiple times
        const tryLoadPreview = (attempt = 1) => {
            const preview = document.getElementById('selectedModelPreview');
            
            if (preview && preview.offsetWidth > 0) {
                createPreview(preview, modelWidget);
            } else if (attempt < 5) {
                setTimeout(() => tryLoadPreview(attempt + 1), 100);
            }
        };
        
        // Start loading preview
        setTimeout(() => tryLoadPreview(), 100);
        setTimeout(() => tryLoadPreview(), 300);
        setTimeout(() => tryLoadPreview(), 600);
    };
    
    // Load preview after modal is added to DOM
    loadSelectedModelPreview();
    
    // Load model columns
    loadModelColumns(modelWidgetId, modelWidget);
    
    // Load slicers for STM tab
    loadSlicersForSTM(modelWidgetId);
    
    // Load models for MTM
    loadModelsForMTM(modelWidgetId);
    
    // Draw connection lines after a delay to ensure layout is ready
    setTimeout(() => {
        drawConnectionLines();
    }, 500);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeConnectionModal();
        }
    });
}

// Draw connection lines between slicers, selected model, and source models
function drawConnectionLines() {
    const connectionLinesGroup = document.getElementById('connectionLines');
    if (!connectionLinesGroup) return;
    
    // Clear existing lines
    connectionLinesGroup.innerHTML = '';
    
    const modal = document.getElementById('connectionModal');
    if (!modal) return;
    
    // Get the main content container
    const contentContainer = modal.querySelector('.flex-1.flex.overflow-hidden.relative');
    if (!contentContainer) return;
    
    // Get container bounds
    const leftContainer = contentContainer.querySelector('.w-1\\/3.border-r');
    const middleContainer = contentContainer.querySelectorAll('.w-1\\/3.border-r')[1] || contentContainer.querySelector('.w-1\\/3:nth-child(2)');
    const rightContainer = contentContainer.querySelector('.w-1\\/3:last-child');
    
    if (!leftContainer || !middleContainer || !rightContainer) return;
    
    const leftRect = leftContainer.getBoundingClientRect();
    const middleRect = middleContainer.getBoundingClientRect();
    const rightRect = rightContainer.getBoundingClientRect();
    const contentRect = contentContainer.getBoundingClientRect();
    
    // Calculate connection points relative to content container
    const leftRight = leftRect.right - contentRect.left;
    const middleLeft = middleRect.left - contentRect.left;
    const middleRight = middleRect.right - contentRect.left;
    const rightLeft = rightRect.left - contentRect.left;
    
    // Vertical center of containers
    const verticalCenter = (middleRect.top + middleRect.bottom) / 2 - contentRect.top;
    
    // Draw STM line (from left to middle)
    const stmLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    stmLine.setAttribute('x1', leftRight.toString());
    stmLine.setAttribute('y1', verticalCenter.toString());
    stmLine.setAttribute('x2', middleLeft.toString());
    stmLine.setAttribute('y2', verticalCenter.toString());
    stmLine.setAttribute('stroke', '#3b82f6');
    stmLine.setAttribute('stroke-width', '2');
    stmLine.setAttribute('marker-end', 'url(#arrowhead-stm)');
    connectionLinesGroup.appendChild(stmLine);
    
    // Add STM label above the line with white background
    const stmLabelX = (leftRight + middleLeft) / 2;
    const stmLabelY = verticalCenter - 10;
    
    // Create background rect for STM label
    const stmLabelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    stmLabelBg.setAttribute('x', (stmLabelX - 20).toString());
    stmLabelBg.setAttribute('y', (stmLabelY - 8).toString());
    stmLabelBg.setAttribute('width', '40');
    stmLabelBg.setAttribute('height', '16');
    stmLabelBg.setAttribute('fill', 'white');
    connectionLinesGroup.appendChild(stmLabelBg);
    
    // Create STM text label
    const stmLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stmLabel.setAttribute('x', stmLabelX.toString());
    stmLabel.setAttribute('y', stmLabelY.toString());
    stmLabel.setAttribute('text-anchor', 'middle');
    stmLabel.setAttribute('fill', '#3b82f6');
    stmLabel.setAttribute('font-size', '12');
    stmLabel.setAttribute('font-weight', 'bold');
    stmLabel.textContent = 'STM';
    connectionLinesGroup.appendChild(stmLabel);
    
    // Draw MTM line (from middle to right)
    const mtmLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    mtmLine.setAttribute('x1', middleRight.toString());
    mtmLine.setAttribute('y1', verticalCenter.toString());
    mtmLine.setAttribute('x2', rightLeft.toString());
    mtmLine.setAttribute('y2', verticalCenter.toString());
    mtmLine.setAttribute('stroke', '#10b981');
    mtmLine.setAttribute('stroke-width', '2');
    mtmLine.setAttribute('marker-end', 'url(#arrowhead-mtm)');
    connectionLinesGroup.appendChild(mtmLine);
    
    // Add MTM label above the line with white background
    const mtmLabelX = (middleRight + rightLeft) / 2;
    const mtmLabelY = verticalCenter - 10;
    
    // Create background rect for MTM label
    const mtmLabelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    mtmLabelBg.setAttribute('x', (mtmLabelX - 20).toString());
    mtmLabelBg.setAttribute('y', (mtmLabelY - 8).toString());
    mtmLabelBg.setAttribute('width', '40');
    mtmLabelBg.setAttribute('height', '16');
    mtmLabelBg.setAttribute('fill', 'white');
    connectionLinesGroup.appendChild(mtmLabelBg);
    
    // Create MTM text label
    const mtmLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    mtmLabel.setAttribute('x', mtmLabelX.toString());
    mtmLabel.setAttribute('y', mtmLabelY.toString());
    mtmLabel.setAttribute('text-anchor', 'middle');
    mtmLabel.setAttribute('fill', '#10b981');
    mtmLabel.setAttribute('font-size', '12');
    mtmLabel.setAttribute('font-weight', 'bold');
    mtmLabel.textContent = 'MTM';
    connectionLinesGroup.appendChild(mtmLabel);
}

// Close connection modal
function closeConnectionModal() {
    const modal = document.getElementById('connectionModal');
    if (modal) {
        modal.remove();
    }
}

// Switch between STM and MTM tabs (deprecated - kept for compatibility)
function switchConnectionTab(tab) {
    // No longer needed - unified view shows both STM and MTM
    console.log('switchConnectionTab called but tabs are no longer used');
}

// Load model columns for STM and MTM tabs
function loadModelColumns(modelWidgetId, modelWidget) {
    if (!modelWidget) {
        console.error('Model widget not found');
        return;
    }
    
    // Helper function to check if columns are empty or just default "Column 1"
    function isEmptyOrDefault(columns) {
        if (!columns || columns.length === 0) return true;
        // Filter out empty column names
        const validColumns = columns.filter(col => col && col.trim() !== '');
        if (validColumns.length === 0) return true;
        // Check if it's just the default "Column 1" with no real data
        if (validColumns.length === 1 && (validColumns[0] === 'Column 1' || validColumns[0] === '')) {
            // Check if there's actual data rows (not just headers)
            const chartDiv = modelWidget.querySelector('[id^="chart-"]');
            if (chartDiv) {
                const widgetId = modelWidget.dataset.widgetId;
                let hasData = false;
                // Check widget-specific data
                if (window.widgetData) {
                    const widgetData = window.widgetData[widgetId] || window.widgetData[chartDiv.id];
                    if (widgetData && Array.isArray(widgetData) && widgetData.length > 1) {
                        hasData = true; // Has data rows
                    }
                }
                // Check global csvData
                if (!hasData && window.csvData && window.csvData.length > 1) {
                    hasData = true;
                }
                // If no data rows, it's empty/default
                if (!hasData) return true;
            }
        }
        return false;
    }
    
    // Get columns from the model widget
    let columns = getModelColumns(modelWidget);
    
    // Filter out empty column names
    columns = columns.filter(col => col && col.trim() !== '');
    
    // Check if columns are empty or default
    const isEmpty = isEmptyOrDefault(columns);
    
    // Load columns for unified view
    const columnsDiv = document.getElementById('modelColumns');
    if (columnsDiv) {
        columnsDiv.innerHTML = '';
        
        if (isEmpty || columns.length === 0) {
            columnsDiv.innerHTML = '<p class="text-gray-500 text-sm">No columns available</p>';
        } else {
            columns.forEach((columnName, index) => {
                const columnItem = document.createElement('div');
                columnItem.className = 'flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2 cursor-move hover:bg-blue-100 transition-colors';
                columnItem.draggable = true;
                columnItem.dataset.columnName = columnName;
                columnItem.dataset.columnIndex = index;
                columnItem.style.userSelect = 'none'; // Prevent text selection during drag
                columnItem.style.webkitUserSelect = 'none'; // For Safari
                columnItem.style.cursor = 'move';
                columnItem.innerHTML = `
                    <span class="material-symbols-outlined text-blue-600 text-sm mr-2">drag_indicator</span>
                    <span class="text-sm text-gray-700 flex-1">${columnName}</span>
                `;
                
                // Drag start
                columnItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', columnName); // Fallback format
                    e.dataTransfer.setData('columnName', columnName);
                    e.dataTransfer.setData('columnIndex', index.toString());
                    e.dataTransfer.effectAllowed = 'move';
                    columnItem.style.opacity = '0.5';
                    console.log('Drag started:', { columnName, columnIndex: index });
                });
                
                columnItem.addEventListener('dragend', () => {
                    columnItem.style.opacity = '1';
                });
                
                columnsDiv.appendChild(columnItem);
            });
        }
    }
}

// Load slicers for STM tab
function loadSlicersForSTM(modelWidgetId) {
    const slicersList = document.getElementById('stmSlicersList');
    if (!slicersList) return;
    
    slicersList.innerHTML = '';
    
    // Find all canvases
    const canvases = document.querySelectorAll('#designCanvas, #designCanvasSaved, [id^="canvas-"]');
    const allSlicers = [];
    
    canvases.forEach(canvas => {
        const slicers = canvas.querySelectorAll('.chart-widget');
        slicers.forEach(widget => {
            const chartType = widget.dataset.chartType;
            if (isSlicerTool(chartType)) {
                const slicerId = widget.dataset.widgetId;
                const slicerName = widget.querySelector('.widget-name-display')?.textContent || 
                                 chartTypes.find(c => c.id === chartType)?.name || chartType;
                allSlicers.push({
                    id: slicerId,
                    name: slicerName,
                    chartType: chartType,
                    widget: widget
                });
            }
        });
    });
    
    if (allSlicers.length === 0) {
        slicersList.innerHTML = '<p class="text-gray-500 text-sm">No slicers found in canvas</p>';
        return;
    }
    
    allSlicers.forEach(slicer => {
        const slicerItem = document.createElement('div');
        slicerItem.className = 'cursor-pointer hover:bg-orange-50 transition-colors p-2';
        slicerItem.dataset.slicerId = slicer.id;
        
        // Add slicer name at the top
        const nameDiv = document.createElement('div');
        nameDiv.className = 'text-center font-medium text-gray-900 text-sm mb-2';
        nameDiv.textContent = slicer.name;
        slicerItem.appendChild(nameDiv);
        
        // Create preview container - shows widget as it appears on canvas (no border)
        const previewContainer = document.createElement('div');
        previewContainer.style.width = '100%';
        previewContainer.style.minHeight = '120px';
        previewContainer.style.maxHeight = '150px';
        previewContainer.style.overflow = 'hidden';
        previewContainer.style.position = 'relative';
        previewContainer.style.backgroundColor = 'transparent';
        previewContainer.style.display = 'flex';
        previewContainer.style.alignItems = 'center';
        previewContainer.style.justifyContent = 'center';
        previewContainer.style.padding = '10px';
        
        // Get the slicer widget content (chart div contains the slicer HTML)
        const chartDiv = slicer.widget.querySelector('[id^="chart-"]');
        if (chartDiv) {
            // Clone the chart div content (which contains the slicer-widget div)
            const contentClone = chartDiv.cloneNode(true);
            contentClone.style.width = '100%';
            contentClone.style.height = 'auto';
            contentClone.style.minHeight = 'auto';
            contentClone.style.pointerEvents = 'auto'; // Enable pointer events for drop zone
            contentClone.style.transform = 'scale(0.9)';
            contentClone.style.transformOrigin = 'center center';
            contentClone.style.margin = '0';
            contentClone.style.padding = '0';
            
            // Ensure all child elements allow pointer events for drag-drop
            const allChildren = contentClone.querySelectorAll('*');
            allChildren.forEach(child => {
                if (child.style) {
                    child.style.pointerEvents = 'auto';
                }
            });
            
            // Make sure slicer-widget is visible
            const slicerWidget = contentClone.querySelector('.slicer-widget');
            if (slicerWidget) {
                slicerWidget.style.opacity = '1';
                slicerWidget.style.pointerEvents = 'auto';
                
                // Check if slicer has existing connection (check both systems)
                let existingConnection = null;
                const modelWidgetId = window.currentModelWidget ? window.currentModelWidget.dataset.widgetId : null;
                
                console.log('Loading slicer:', slicer.id, 'Model widget ID:', modelWidgetId);
                console.log('slicerToModelConnections:', window.slicerToModelConnections);
                console.log('slicerModelConnections:', window.slicerModelConnections);
                
                // Check new connection system first
                if (window.slicerToModelConnections && window.slicerToModelConnections[slicer.id] && modelWidgetId && window.slicerToModelConnections[slicer.id][modelWidgetId]) {
                    const conn = window.slicerToModelConnections[slicer.id][modelWidgetId];
                    existingConnection = {
                        columnName: conn.columnName,
                        columnIndex: conn.columnIndex,
                        editableName: conn.editableName || conn.columnName
                    };
                    console.log('Found connection in slicerToModelConnections:', existingConnection);
                    // Also update slicerModelConnections for compatibility
                    if (!window.slicerModelConnections) {
                        window.slicerModelConnections = {};
                    }
                    if (!window.slicerModelConnections[slicer.id]) {
                        window.slicerModelConnections[slicer.id] = [];
                    }
                    window.slicerModelConnections[slicer.id] = [existingConnection];
                } else if (window.slicerModelConnections && window.slicerModelConnections[slicer.id] && window.slicerModelConnections[slicer.id].length > 0) {
                    existingConnection = window.slicerModelConnections[slicer.id][0];
                    console.log('Found connection in slicerModelConnections:', existingConnection);
                } else {
                    console.log('No existing connection found for slicer:', slicer.id);
                }
                
                // Find the "Value" label div and make it a drop zone
                // Try multiple selectors to find the value label
                let valueLabel = slicerWidget.querySelector('.text-xs.font-semibold');
                if (!valueLabel) {
                    // Try finding the first text element with font-semibold
                    valueLabel = slicerWidget.querySelector('.font-semibold');
                }
                if (!valueLabel) {
                    // Create a value label if it doesn't exist
                    valueLabel = document.createElement('div');
                    valueLabel.className = 'text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2';
                    valueLabel.textContent = 'Value';
                    // Insert at the beginning of slicer-widget
                    slicerWidget.insertBefore(valueLabel, slicerWidget.firstChild);
                }
                
                if (valueLabel) {
                    // Create wrapper div for editable input + drop zone
                    const valueWrapper = document.createElement('div');
                    valueWrapper.className = 'slicer-value-wrapper';
                    valueWrapper.style.position = 'relative';
                    valueWrapper.style.width = '100%';
                    valueWrapper.dataset.slicerId = slicer.id;
                    
                    // If connection exists, create editable input
                    if (existingConnection) {
                        const columnName = existingConnection.editableName || existingConnection.columnName;
                        const columnIndex = existingConnection.columnIndex;
                        
                        // Create editable input
                        const valueInput = document.createElement('input');
                        valueInput.type = 'text';
                        valueInput.value = columnName;
                        valueInput.className = 'slicer-value-input bg-transparent border-none outline-none font-semibold text-xs text-gray-700 dark:text-gray-300';
                        valueInput.style.width = '100%';
                        valueInput.style.minWidth = '60px';
                        valueInput.style.cursor = 'text';
                        valueInput.dataset.slicerId = slicer.id;
                        valueInput.dataset.originalColumnName = existingConnection.columnName;
                        
                        // Update on blur
                        valueInput.addEventListener('blur', () => {
                            const newName = valueInput.value.trim() || columnName;
                            // Update connection data in both systems
                            if (window.slicerModelConnections && window.slicerModelConnections[slicer.id]) {
                                const connection = window.slicerModelConnections[slicer.id].find(c => c.columnName === existingConnection.columnName);
                                if (connection) {
                                    connection.editableName = newName;
                                }
                            }
                            if (window.slicerToModelConnections && window.slicerToModelConnections[slicer.id] && modelWidgetId && window.slicerToModelConnections[slicer.id][modelWidgetId]) {
                                window.slicerToModelConnections[slicer.id][modelWidgetId].editableName = newName;
                            }
                            // Update slicer preview content with new name
                            const previewSlicerWidget = contentClone.querySelector('.slicer-widget');
                            if (previewSlicerWidget && modelData && modelData.length > 0) {
                                const colIndex = parseInt(columnIndex);
                                let values = [];
                                if (colIndex >= 0 && colIndex < modelData[0].length) {
                                    for (let i = 1; i < modelData.length; i++) {
                                        const val = modelData[i][colIndex];
                                        if (val && val.toString().trim() !== '' && !values.includes(val.toString().trim())) {
                                            values.push(val.toString().trim());
                                        }
                                    }
                                }
                                updateSlicerPreviewContent(previewSlicerWidget, slicer.chartType, newName, values);
                            }
                            // Update model preview
                            updateModelPreviewInModal(slicer.id, existingConnection.columnName, columnIndex, slicer.chartType);
                        });
                        
                        valueWrapper.appendChild(valueInput);
                        
                        // Also update slicer preview content with connection data
                        // Only load data if connection exists (not automatic)
                        if (window.currentModelWidget && existingConnection) {
                            console.log('Loading slicer preview with connection:', existingConnection);
                            const modelChartDiv = window.currentModelWidget.querySelector('[id^="chart-"]');
                            let modelData = null;
                            if (modelChartDiv && window.widgetData && window.widgetData[modelChartDiv.id]) {
                                modelData = window.widgetData[modelChartDiv.id];
                                console.log('Found model data in widgetData:', modelData.length, 'rows');
                            } else if (window.csvData && window.csvData.length > 0) {
                                modelData = window.csvData;
                                console.log('Using csvData fallback:', modelData.length, 'rows');
                            }
                            
                            if (modelData && modelData.length > 0) {
                                const colIndex = parseInt(columnIndex);
                                console.log('Extracting values from column index:', colIndex);
                                let values = [];
                                if (colIndex >= 0 && colIndex < modelData[0].length) {
                                    for (let i = 1; i < modelData.length; i++) {
                                        const val = modelData[i][colIndex];
                                        if (val !== undefined && val !== null && val !== '' && !values.includes(val.toString().trim())) {
                                            values.push(val.toString().trim());
                                        }
                                    }
                                }
                                console.log('Extracted values:', values.length, 'unique values');
                                // Use contentClone's slicer widget, not the original
                                const previewSlicerWidget = contentClone.querySelector('.slicer-widget');
                                if (previewSlicerWidget) {
                                    console.log('Updating slicer preview with:', { chartType: slicer.chartType, columnName, valuesCount: values.length });
                                    updateSlicerPreviewContent(previewSlicerWidget, slicer.chartType, columnName, values);
                                } else {
                                    console.warn('Preview slicer widget not found in contentClone');
                                }
                                // Update model preview when connection is loaded
                                setTimeout(() => {
                                    updateModelPreviewInModal(slicer.id, existingConnection.columnName, columnIndex, slicer.chartType);
                                }, 200);
                            } else {
                                console.warn('No model data available for slicer preview');
                                // Show slicer with column name but no values
                                const previewSlicerWidget = contentClone.querySelector('.slicer-widget');
                                if (previewSlicerWidget) {
                                    updateSlicerPreviewContent(previewSlicerWidget, slicer.chartType, columnName, []);
                                }
                            }
                        } else {
                            // No connection - show empty slicer
                            console.log('No connection found, showing empty slicer');
                            const previewSlicerWidget = contentClone.querySelector('.slicer-widget');
                            if (previewSlicerWidget) {
                                updateSlicerPreviewContent(previewSlicerWidget, slicer.chartType, 'Value', []);
                            }
                        }
                        
                        // Add connected column to list
                        const connectedColumnsDiv = document.querySelector(`.connected-columns[data-slicer-id="${slicer.id}"]`);
                        if (connectedColumnsDiv) {
                            connectedColumnsDiv.innerHTML = '';
                            const columnChip = document.createElement('div');
                            columnChip.className = 'flex items-center justify-between bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm';
                            columnChip.dataset.column = existingConnection.columnName;
                            columnChip.dataset.columnIndex = columnIndex;
                            columnChip.innerHTML = `
                                <span class="text-sm text-gray-700">${existingConnection.columnName}</span>
                                <button onclick="removeColumnFromSlicerPreview('${slicer.id}', '${existingConnection.columnName}')" class="ml-2 text-red-500 hover:text-red-700">
                                    <span class="material-symbols-outlined text-sm">close</span>
                                </button>
                            `;
                            connectedColumnsDiv.appendChild(columnChip);
                        }
                    } else {
                        // No connection - show "Value" text and empty slicer (no automatic data)
                        const valueText = document.createElement('span');
                        valueText.textContent = 'Value';
                        valueText.className = 'text-xs font-semibold text-gray-400 dark:text-gray-500';
                        valueWrapper.appendChild(valueText);
                        
                        // Show empty slicer (no data until column is dragged)
                        // Use contentClone's slicer widget, not the original
                        const previewSlicerWidget = contentClone.querySelector('.slicer-widget');
                        if (previewSlicerWidget) {
                            updateSlicerPreviewContent(previewSlicerWidget, slicer.chartType, 'Value', []);
                        }
                    }
                    
                    // Make wrapper a drop zone (works for both cases)
                    valueWrapper.style.cursor = 'grab';
                    valueWrapper.style.border = '2px dashed transparent';
                    valueWrapper.style.borderRadius = '4px';
                    valueWrapper.style.padding = '2px 4px';
                    valueWrapper.style.transition = 'all 0.2s';
                    valueWrapper.style.pointerEvents = 'auto'; // Ensure pointer events are enabled
                    valueWrapper.style.userSelect = 'none'; // Prevent text selection during drag
                    valueWrapper.classList.add('slicer-value-drop-zone');
                    
                    // Ensure wrapper is not blocked by parent elements
                    if (valueLabel) {
                        valueLabel.style.pointerEvents = 'auto';
                    }
                    if (slicerWidget) {
                        slicerWidget.style.pointerEvents = 'auto';
                    }
                    
                    // Add drop event listeners to wrapper
                    valueWrapper.addEventListener('dragover', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        valueWrapper.style.borderColor = '#3b82f6';
                        valueWrapper.style.backgroundColor = '#dbeafe';
                        console.log('Drag over slicer value wrapper');
                    });
                    
                    valueWrapper.addEventListener('dragenter', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        valueWrapper.style.borderColor = '#3b82f6';
                        valueWrapper.style.backgroundColor = '#dbeafe';
                        console.log('Drag enter slicer value wrapper');
                    });
                    
                    valueWrapper.addEventListener('dragleave', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only reset if we're actually leaving the wrapper (not entering a child)
                        if (!valueWrapper.contains(e.relatedTarget)) {
                            valueWrapper.style.borderColor = 'transparent';
                            valueWrapper.style.backgroundColor = 'transparent';
                            console.log('Drag leave slicer value wrapper');
                        }
                    });
                    
                    valueWrapper.addEventListener('drop', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        valueWrapper.style.borderColor = 'transparent';
                        valueWrapper.style.backgroundColor = 'transparent';
                        
                        console.log('Drop event triggered on slicer value wrapper', slicer.id);
                        console.log('DataTransfer types:', Array.from(e.dataTransfer.types));
                        
                        // Try multiple ways to get the data
                        let columnName = e.dataTransfer.getData('columnName');
                        let columnIndex = e.dataTransfer.getData('columnIndex');
                        
                        // Fallback: try text/plain format
                        if (!columnName) {
                            columnName = e.dataTransfer.getData('text/plain');
                        }
                        
                        // Fallback: try to get from dataset if available
                        if (!columnName && e.dataTransfer.getData('text')) {
                            const text = e.dataTransfer.getData('text');
                            // Try to parse if it's JSON
                            try {
                                const data = JSON.parse(text);
                                columnName = data.columnName;
                                columnIndex = data.columnIndex;
                            } catch (e) {
                                // Not JSON, ignore
                            }
                        }
                        
                        console.log('Dropped column:', { columnName, columnIndex, types: Array.from(e.dataTransfer.types) });
                        
                        if (columnName) {
                            // Remove existing input if any
                            const existingInput = valueWrapper.querySelector('input.slicer-value-input');
                            if (existingInput) {
                                existingInput.remove();
                            }
                            // Remove existing text if any
                            const existingText = valueWrapper.querySelector('span');
                            if (existingText) {
                                existingText.remove();
                            }
                            console.log('Calling updateSlicerWithColumn with:', { slicerId: slicer.id, chartType: slicer.chartType, columnName, columnIndex });
                            updateSlicerWithColumn(slicer.id, slicer.chartType, columnName, columnIndex, valueWrapper, contentClone);
                        } else {
                            console.warn('No columnName found in dataTransfer. Available types:', Array.from(e.dataTransfer.types));
                            alert('Failed to get column data. Please try dragging again.');
                        }
                    });
                    
                    // Replace valueLabel content with wrapper
                    valueLabel.innerHTML = '';
                    valueLabel.appendChild(valueWrapper);
                }
            }
            
            previewContainer.appendChild(contentClone);
        } else {
            // Fallback: show icon if no content found
            const slicerIcon = chartTypes.find(c => c.id === slicer.chartType)?.icon || 'filter_alt';
            previewContainer.innerHTML = `
                <div class="w-full h-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-orange-600 text-4xl">${slicerIcon}</span>
                </div>
            `;
        }
        
        slicerItem.appendChild(previewContainer);
        
        // Show connected columns below slicer preview
        const connectedColumnsDiv = document.createElement('div');
        connectedColumnsDiv.className = 'connected-columns mt-2 space-y-1';
        connectedColumnsDiv.dataset.slicerId = slicer.id;
        slicerItem.appendChild(connectedColumnsDiv);
        
        slicersList.appendChild(slicerItem);
    });
}

// Load models for MTM tab
function loadModelsForMTM(modelWidgetId) {
    const modelsList = document.getElementById('mtmSourceModelsList');
    if (!modelsList) return;
    
    modelsList.innerHTML = '';
    
    // Find all canvases
    const canvases = document.querySelectorAll('#designCanvas, #designCanvasSaved, [id^="canvas-"]');
    const allModels = [];
    
    canvases.forEach(canvas => {
        const models = canvas.querySelectorAll('.chart-widget');
        models.forEach(widget => {
            const chartType = widget.dataset.chartType;
            if (isModelTool(chartType)) {
                const modelId = widget.dataset.widgetId;
                // Don't include the current model itself
                if (modelId !== modelWidgetId) {
                    const modelName = widget.querySelector('.widget-name-display')?.textContent || 
                                     chartTypes.find(c => c.id === chartType)?.name || chartType;
                    allModels.push({
                        id: modelId,
                        name: modelName,
                        chartType: chartType,
                        widget: widget
                    });
                }
            }
        });
    });
    
    if (allModels.length === 0) {
        modelsList.innerHTML = '<p class="text-gray-500 text-sm">No other models found in canvas</p>';
        return;
    }
    
    allModels.forEach(model => {
        const modelItem = document.createElement('div');
        modelItem.className = 'cursor-pointer hover:bg-blue-50 transition-colors p-2';
        modelItem.dataset.modelId = model.id;
        
        // Create preview container - shows widget as it appears on canvas (same as Selected Model)
        const previewContainer = document.createElement('div');
        previewContainer.style.width = '100%';
        previewContainer.style.minHeight = '200px';
        previewContainer.style.maxHeight = '250px';
        previewContainer.style.overflow = 'hidden';
        previewContainer.style.position = 'relative';
        previewContainer.style.backgroundColor = 'transparent';
        previewContainer.style.display = 'flex';
        previewContainer.style.alignItems = 'center';
        previewContainer.style.justifyContent = 'center';
        previewContainer.style.padding = '10px';
        previewContainer.id = `sourceModelPreview-${model.id}`;
        
        // Get the original chart div from widget
        const originalChartDiv = model.widget.querySelector('[id^="chart-"]');
        if (!originalChartDiv) {
            // Fallback: show icon if no chart div found
            const modelIcon = chartTypes.find(c => c.id === model.chartType)?.icon || 'bar_chart';
            previewContainer.innerHTML = `
                <div class="w-full h-full flex items-center justify-center">
                    <span class="material-symbols-outlined text-blue-600 text-4xl">${modelIcon}</span>
                </div>
            `;
            modelItem.appendChild(previewContainer);
            const nameDiv = document.createElement('div');
            nameDiv.className = 'text-center font-medium text-gray-900 text-sm mt-2';
            nameDiv.textContent = model.name;
            modelItem.appendChild(nameDiv);
            modelsList.appendChild(modelItem);
            return;
        }
        
        // Use the same preview creation logic as Selected Model
        const createSourceModelPreview = (container, widget) => {
            if (!container || !widget) {
                console.error('Source model preview container or widget not found');
                return;
            }
            
            // Clear any existing content
            container.innerHTML = '';
            
            // Get original widget dimensions
            const originalWidth = widget.offsetWidth || 400;
            const originalHeight = widget.offsetHeight || 300;
            
            // Get container dimensions
            const previewWidth = container.offsetWidth || 300;
            const previewHeight = 250;
            
            // Calculate scale to fit in preview container
            const scaleX = (previewWidth - 20) / originalWidth;
            const scaleY = previewHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY, 0.75);
            
            // Get the original chart div from widget
            const originalChartDiv = widget.querySelector('[id^="chart-"]');
            if (!originalChartDiv) {
                console.error('Chart div not found in source model widget');
                return;
            }
            
            // Clone the entire widget
            const widgetClone = widget.cloneNode(true);
            
            // Set widget clone styles - make it visible
            widgetClone.style.position = 'relative';
            widgetClone.style.width = `${originalWidth}px`;
            widgetClone.style.height = `${originalHeight}px`;
            widgetClone.style.pointerEvents = 'none';
            widgetClone.style.margin = '0';
            widgetClone.style.padding = '0';
            widgetClone.style.backgroundColor = 'transparent';
            widgetClone.style.border = 'none';
            widgetClone.style.boxShadow = 'none';
            widgetClone.style.display = 'block';
            widgetClone.style.visibility = 'visible';
            widgetClone.style.opacity = '1';
            
            // Remove resize handles and header from clone
            const resizeHandles = widgetClone.querySelectorAll('.resize-handle');
            resizeHandles.forEach(handle => handle.remove());
            const header = widgetClone.querySelector('.chart-widget-header');
            if (header) {
                header.style.display = 'none';
                header.classList.add('hidden');
            }
            
            // Get chart div from clone and ensure it's visible
            const chartDiv = widgetClone.querySelector('[id^="chart-"]');
            if (chartDiv) {
                // Copy all styles and content from original chart div
                chartDiv.style.display = 'block';
                chartDiv.style.visibility = 'visible';
                chartDiv.style.opacity = '1';
                chartDiv.style.width = '100%';
                chartDiv.style.height = '100%';
                chartDiv.style.position = 'relative';
                
                // Copy innerHTML from original chart div to ensure Plotly charts are included
                chartDiv.innerHTML = originalChartDiv.innerHTML;
                
                // Re-render chart if renderChart function is available
                // This ensures Plotly charts and other dynamic content are properly displayed
                if (typeof renderChart === 'function') {
                    const chartType = widget.dataset.chartType;
                    const tempChartId = `temp-source-preview-${chartDiv.id}`;
                    chartDiv.id = tempChartId;
                    
                    // Temporarily store original ID
                    const originalId = originalChartDiv.id;
                    
                    // Re-render chart after a short delay to ensure DOM is ready
                    setTimeout(() => {
                        renderChart(chartType, tempChartId);
                        
                        // Restore original ID after rendering
                        setTimeout(() => {
                            chartDiv.id = originalId;
                        }, 100);
                    }, 100);
                }
                
                // Ensure all child elements are visible
                const allChildren = chartDiv.querySelectorAll('*');
                allChildren.forEach(child => {
                    if (child.style) {
                        child.style.display = child.style.display || 'block';
                        child.style.visibility = child.style.visibility || 'visible';
                        child.style.opacity = child.style.opacity || '1';
                    }
                });
            }
            
            // Create a wrapper div for scaling - ensure it fits within container without scrolling
            const wrapper = document.createElement('div');
            const scaledWidth = originalWidth * scale;
            const scaledHeight = originalHeight * scale;
            
            wrapper.style.width = `${scaledWidth}px`;
            wrapper.style.height = `${scaledHeight}px`;
            wrapper.style.maxWidth = '100%';
            wrapper.style.maxHeight = '100%';
            wrapper.style.position = 'relative';
            wrapper.style.margin = '0 auto';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.justifyContent = 'center';
            wrapper.style.overflow = 'hidden';
            
            // Set widget clone styles - position it absolutely within wrapper
            widgetClone.style.width = `${originalWidth}px`;
            widgetClone.style.height = `${originalHeight}px`;
            widgetClone.style.transform = `scale(${scale})`;
            widgetClone.style.transformOrigin = 'center center';
            widgetClone.style.position = 'absolute';
            widgetClone.style.top = '50%';
            widgetClone.style.left = '50%';
            widgetClone.style.marginTop = `-${originalHeight * scale / 2}px`;
            widgetClone.style.marginLeft = `-${originalWidth * scale / 2}px`;
            
            // Add widget clone to wrapper
            wrapper.appendChild(widgetClone);
            
            // Append wrapper to preview container
            container.appendChild(wrapper);
            
            console.log('Source model preview created for widget:', model.id, 'Scale:', scale);
        };
        
        // Append preview container first
        modelItem.appendChild(previewContainer);
        
        // Create preview after container is in DOM - try multiple times to ensure it renders
        const tryCreatePreview = (attempt = 1) => {
            if (previewContainer.offsetWidth > 0) {
                createSourceModelPreview(previewContainer, model.widget);
            } else if (attempt < 5) {
                setTimeout(() => tryCreatePreview(attempt + 1), 100);
            }
        };
        
        setTimeout(() => tryCreatePreview(), 100);
        setTimeout(() => tryCreatePreview(), 300);
        setTimeout(() => tryCreatePreview(), 600);
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'text-center font-medium text-gray-900 text-sm mt-2';
        nameDiv.textContent = model.name;
        modelItem.appendChild(nameDiv);
        
        // Get chart settings to determine which axes are available
        let chartData = null;
        if (typeof getChartData === 'function') {
            chartData = getChartData(model.widget);
        }
        
        // Get chart settings from window.chartSettings
        const chartDivId = originalChartDiv.id;
        const settings = window.chartSettings && window.chartSettings[chartDivId] ? window.chartSettings[chartDivId] : null;
        
        // Determine which axes are needed based on chart type
        const needsXAxis = true; // Most charts need X axis
        const needsYAxis = true; // Most charts need Y axis
        const needsZAxis = settings && (
            (model.chartType === 'bar' && (settings.barChartType === 'grouped' || settings.barChartType === 'clustered' || settings.barChartType === 'stacked')) ||
            (model.chartType === 'line' && settings.lineChartType === 'multi') ||
            (model.chartType === 'area' && (settings.areaChartType === 'stacked' || settings.areaChartType === 'percent' || settings.areaChartType === 'overlapping')) ||
            (model.chartType === 'scatter' && settings.scatterChartType === 'bubble') ||
            (model.chartType === 'treemap' && settings.treemapChartType === 'hierarchical')
        );
        
        // Create axis drop zones container
        const axisContainer = document.createElement('div');
        axisContainer.className = 'mt-3 space-y-2';
        
        // X Axis drop zone
        const xAxisContainer = document.createElement('div');
        xAxisContainer.className = 'border rounded p-2 bg-gray-50';
        const xAxisLabel = document.createElement('div');
        xAxisLabel.className = 'text-xs font-semibold mb-1 text-gray-700';
        xAxisLabel.textContent = 'X Axis';
        xAxisContainer.appendChild(xAxisLabel);
        
        const xAxisDropZone = document.createElement('div');
        xAxisDropZone.className = 'axis-drop-zone border-2 border-dashed border-gray-300 rounded p-2 min-h-[40px] flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors';
        xAxisDropZone.dataset.modelId = model.id;
        xAxisDropZone.dataset.axisType = 'x';
        xAxisDropZone.dataset.chartDivId = chartDivId;
        
        // Check if X axis already has a column from selected model
        const xAxisColumn = settings && settings.xAxisColumn ? settings.xAxisColumn : null;
        if (xAxisColumn) {
            xAxisDropZone.innerHTML = `<span class="text-xs text-blue-600 font-medium">${xAxisColumn}</span>`;
            xAxisDropZone.classList.remove('border-dashed', 'border-gray-300');
            xAxisDropZone.classList.add('border-blue-400', 'bg-blue-50');
        } else {
            xAxisDropZone.innerHTML = '<span class="text-xs text-gray-400">Drop column here</span>';
        }
        
        // Add drag and drop handlers for X axis
        setupAxisDropZone(xAxisDropZone, model.id, 'x', chartDivId);
        xAxisContainer.appendChild(xAxisDropZone);
        axisContainer.appendChild(xAxisContainer);
        
        // Y Axis drop zone
        const yAxisContainer = document.createElement('div');
        yAxisContainer.className = 'border rounded p-2 bg-gray-50';
        const yAxisLabel = document.createElement('div');
        yAxisLabel.className = 'text-xs font-semibold mb-1 text-gray-700';
        yAxisLabel.textContent = 'Y Axis';
        yAxisContainer.appendChild(yAxisLabel);
        
        const yAxisDropZone = document.createElement('div');
        yAxisDropZone.className = 'axis-drop-zone border-2 border-dashed border-gray-300 rounded p-2 min-h-[40px] flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors';
        yAxisDropZone.dataset.modelId = model.id;
        yAxisDropZone.dataset.axisType = 'y';
        yAxisDropZone.dataset.chartDivId = chartDivId;
        
        const yAxisColumn = settings && settings.yAxisColumn ? settings.yAxisColumn : null;
        if (yAxisColumn) {
            yAxisDropZone.innerHTML = `<span class="text-xs text-blue-600 font-medium">${yAxisColumn}</span>`;
            yAxisDropZone.classList.remove('border-dashed', 'border-gray-300');
            yAxisDropZone.classList.add('border-blue-400', 'bg-blue-50');
        } else {
            yAxisDropZone.innerHTML = '<span class="text-xs text-gray-400">Drop column here</span>';
        }
        
        setupAxisDropZone(yAxisDropZone, model.id, 'y', chartDivId);
        yAxisContainer.appendChild(yAxisDropZone);
        axisContainer.appendChild(yAxisContainer);
        
        // Z Axis drop zone (if needed)
        if (needsZAxis) {
            const zAxisContainer = document.createElement('div');
            zAxisContainer.className = 'border rounded p-2 bg-gray-50';
            const zAxisLabel = document.createElement('div');
            zAxisLabel.className = 'text-xs font-semibold mb-1 text-gray-700';
            zAxisLabel.textContent = 'Z Axis';
            zAxisContainer.appendChild(zAxisLabel);
            
            const zAxisDropZone = document.createElement('div');
            zAxisDropZone.className = 'axis-drop-zone border-2 border-dashed border-gray-300 rounded p-2 min-h-[40px] flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors';
            zAxisDropZone.dataset.modelId = model.id;
            zAxisDropZone.dataset.axisType = 'z';
            zAxisDropZone.dataset.chartDivId = chartDivId;
            
            const zAxisColumn = settings && settings.zAxisColumn ? settings.zAxisColumn : null;
            if (zAxisColumn) {
                zAxisDropZone.innerHTML = `<span class="text-xs text-blue-600 font-medium">${zAxisColumn}</span>`;
                zAxisDropZone.classList.remove('border-dashed', 'border-gray-300');
                zAxisDropZone.classList.add('border-blue-400', 'bg-blue-50');
            } else {
                zAxisDropZone.innerHTML = '<span class="text-xs text-gray-400">Drop column here</span>';
            }
            
            setupAxisDropZone(zAxisDropZone, model.id, 'z', chartDivId);
            zAxisContainer.appendChild(zAxisDropZone);
            axisContainer.appendChild(zAxisContainer);
        }
        
        modelItem.appendChild(axisContainer);
        
        modelsList.appendChild(modelItem);
    });
}

// Setup axis drop zone for drag and drop from selected model columns
function setupAxisDropZone(dropZone, sourceModelId, axisType, chartDivId) {
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#3b82f6';
        dropZone.style.backgroundColor = '#dbeafe';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const hasColumn = dropZone.querySelector('.text-blue-600');
        if (!hasColumn) {
            dropZone.style.borderColor = '#d1d5db';
            dropZone.style.backgroundColor = 'transparent';
        }
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const columnName = e.dataTransfer.getData('columnName');
        const columnIndex = e.dataTransfer.getData('columnIndex');
        
        if (columnName && columnIndex !== undefined) {
            // Update drop zone display
            dropZone.innerHTML = `<span class="text-xs text-blue-600 font-medium">${columnName}</span>`;
            dropZone.classList.remove('border-dashed', 'border-gray-300');
            dropZone.classList.add('border-blue-400', 'bg-blue-50');
            
            // Store connection: Selected Model column -> Source Model axis
            if (!window.selectedToSourceConnections) {
                window.selectedToSourceConnections = {};
            }
            const selectedModelId = window.currentModelWidget ? window.currentModelWidget.dataset.widgetId : null;
            if (selectedModelId) {
                if (!window.selectedToSourceConnections[selectedModelId]) {
                    window.selectedToSourceConnections[selectedModelId] = {};
                }
                if (!window.selectedToSourceConnections[selectedModelId][sourceModelId]) {
                    window.selectedToSourceConnections[selectedModelId][sourceModelId] = {};
                }
                window.selectedToSourceConnections[selectedModelId][sourceModelId][axisType] = {
                    columnName: columnName,
                    columnIndex: parseInt(columnIndex)
                };
                
                // Update chart settings for source model
                if (!window.chartSettings) {
                    window.chartSettings = {};
                }
                if (!window.chartSettings[chartDivId]) {
                    window.chartSettings[chartDivId] = {};
                }
                window.chartSettings[chartDivId][`${axisType}AxisColumn`] = columnName;
                
                // Filter source model data based on selected model column
                updateSourceModelFromSelectedModel(sourceModelId, selectedModelId, axisType, columnName, columnIndex);
            }
        }
        
        dropZone.style.borderColor = '#d1d5db';
        dropZone.style.backgroundColor = 'transparent';
    });
}

// Update source model data based on selected model column
function updateSourceModelFromSelectedModel(sourceModelId, selectedModelId, axisType, columnName, columnIndex) {
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceModelId}"]`);
    const selectedWidget = document.querySelector(`[data-widget-id="${selectedModelId}"]`);
    
    if (!sourceWidget || !selectedWidget) return;
    
    // Get selected model data
    const selectedChartDiv = selectedWidget.querySelector('[id^="chart-"]');
    if (!selectedChartDiv) return;
    
    let selectedData = null;
    if (window.widgetData && window.widgetData[selectedChartDiv.id]) {
        selectedData = window.widgetData[selectedChartDiv.id];
    } else if (window.csvData && window.csvData.length > 0) {
        selectedData = window.csvData;
    }
    
    if (!selectedData || selectedData.length === 0) return;
    
    // Get source model data
    const sourceChartDiv = sourceWidget.querySelector('[id^="chart-"]');
    if (!sourceChartDiv) return;
    
    let sourceData = null;
    if (window.widgetData && window.widgetData[sourceChartDiv.id]) {
        sourceData = JSON.parse(JSON.stringify(window.widgetData[sourceChartDiv.id]));
    }
    
    if (!sourceData || sourceData.length === 0) return;
    
    // Get unique values from selected model column
    const selectedColumnValues = [];
    const colIndex = parseInt(columnIndex);
    if (colIndex >= 0 && colIndex < selectedData[0].length) {
        for (let i = 1; i < selectedData.length; i++) {
            const val = selectedData[i][colIndex];
            if (val !== undefined && val !== null && val !== '' && !selectedColumnValues.includes(val.toString().trim())) {
                selectedColumnValues.push(val.toString().trim());
            }
        }
    }
    
    // Find matching column in source model (by name or index)
    let sourceColumnIndex = -1;
    const sourceColumns = sourceData[0] || [];
    
    // Try to find column by name first
    for (let i = 0; i < sourceColumns.length; i++) {
        if (sourceColumns[i] === columnName) {
            sourceColumnIndex = i;
            break;
        }
    }
    
    // If not found by name, use the same index
    if (sourceColumnIndex === -1 && colIndex < sourceColumns.length) {
        sourceColumnIndex = colIndex;
    }
    
    // Filter source model data based on matching values
    if (sourceColumnIndex >= 0 && selectedColumnValues.length > 0) {
        const filteredSourceData = [sourceData[0]]; // Keep header
        
        for (let i = 1; i < sourceData.length; i++) {
            const sourceVal = sourceData[i][sourceColumnIndex];
            if (sourceVal !== undefined && sourceVal !== null && selectedColumnValues.includes(sourceVal.toString().trim())) {
                filteredSourceData.push(sourceData[i]);
            }
        }
        
        // Update source model data
        if (!window.widgetData) {
            window.widgetData = {};
        }
        window.widgetData[sourceChartDiv.id] = filteredSourceData;
        
        // Re-render source model chart
        const sourceChartType = sourceWidget.dataset.chartType;
        if (typeof renderChart === 'function') {
            setTimeout(() => {
                renderChart(sourceChartType, sourceChartDiv.id);
            }, 100);
        }
    }
}

// Update slicer with column data (temporary, until save)
function updateSlicerWithColumn(slicerId, chartType, columnName, columnIndex, valueLabel, previewClone) {
    console.log('updateSlicerWithColumn called:', { slicerId, chartType, columnName, columnIndex });
    
    // Get column values from model widget's specific data
    let values = [];
    
    // Get model widget's data
    let modelData = null;
    if (window.currentModelWidget) {
        const modelChartDiv = window.currentModelWidget.querySelector('[id^="chart-"]');
        if (modelChartDiv && window.widgetData && window.widgetData[modelChartDiv.id]) {
            modelData = window.widgetData[modelChartDiv.id];
            console.log('Found model data in widgetData:', modelData ? modelData.length : 0, 'rows');
        } else if (window.csvData && window.csvData.length > 0) {
            // Fallback to global csvData for backward compatibility
            modelData = window.csvData;
            console.log('Using csvData fallback:', modelData.length, 'rows');
        }
    } else if (window.csvData && window.csvData.length > 0) {
        // Fallback to global csvData
        modelData = window.csvData;
        console.log('Using csvData:', modelData.length, 'rows');
    }
    
    // If still no data, try to get from any available source
    if (!modelData && window.csvData && window.csvData.length > 0) {
        modelData = window.csvData;
        console.log('Final fallback to csvData:', modelData.length, 'rows');
    }
    
    console.log('Model data available:', !!modelData, 'Column index:', columnIndex);
    
    if (modelData && modelData.length > 0 && columnIndex !== undefined && columnIndex !== null) {
        const colIndex = parseInt(columnIndex);
        console.log('Parsed column index:', colIndex, 'Data columns:', modelData[0] ? modelData[0].length : 0);
        
        if (colIndex >= 0 && colIndex < modelData[0].length) {
            for (let i = 1; i < modelData.length; i++) {
                const val = modelData[i][colIndex];
                if (val !== undefined && val !== null && val !== '' && !values.includes(val.toString().trim())) {
                    values.push(val.toString().trim());
                }
            }
            console.log('Extracted values:', values.length, 'unique values');
        } else {
            console.warn('Column index out of range:', colIndex, 'Max:', modelData[0] ? modelData[0].length - 1 : -1);
        }
    } else {
        console.warn('Cannot extract values - missing data or columnIndex:', { 
            hasModelData: !!modelData, 
            dataLength: modelData ? modelData.length : 0,
            columnIndex 
        });
    }
    
    // Update Value wrapper to be editable input (valueLabel can be wrapper div or label div)
    if (valueLabel) {
        // Check if it's a wrapper or label
        const wrapper = valueLabel.classList.contains('slicer-value-wrapper') ? valueLabel : valueLabel.querySelector('.slicer-value-wrapper');
        const targetContainer = wrapper || valueLabel;
        
        // Remove existing input if any
        const existingInput = targetContainer.querySelector('input.slicer-value-input');
        if (existingInput) {
            existingInput.remove();
        }
        
        // Remove existing text if any
        const existingText = targetContainer.querySelector('span');
        if (existingText) {
            existingText.remove();
        }
        
        // Create editable input
        const valueInput = document.createElement('input');
        valueInput.type = 'text';
        valueInput.value = columnName;
        valueInput.className = 'slicer-value-input bg-transparent border-none outline-none font-semibold text-xs text-gray-700 dark:text-gray-300';
        valueInput.style.width = '100%';
        valueInput.style.minWidth = '60px';
        valueInput.style.cursor = 'text';
        valueInput.dataset.slicerId = slicerId;
        valueInput.dataset.originalColumnName = columnName;
        
        // Update on blur
        valueInput.addEventListener('blur', () => {
            const newName = valueInput.value.trim() || columnName;
            // Update connection data in both systems
            if (window.slicerModelConnections && window.slicerModelConnections[slicerId]) {
                const connection = window.slicerModelConnections[slicerId].find(c => c.columnName === columnName);
                if (connection) {
                    connection.editableName = newName;
                }
            }
            const modelWidgetId = window.currentModelWidget ? window.currentModelWidget.dataset.widgetId : null;
            if (window.slicerToModelConnections && window.slicerToModelConnections[slicerId] && modelWidgetId && window.slicerToModelConnections[slicerId][modelWidgetId]) {
                window.slicerToModelConnections[slicerId][modelWidgetId].editableName = newName;
            }
            // Update slicer preview content with new name
            const slicerWidget = previewClone.querySelector('.slicer-widget');
            if (slicerWidget) {
                updateSlicerPreviewContent(slicerWidget, chartType, newName, values);
            }
            // Update model preview
            updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
        });
        
        // If wrapper doesn't exist, create it
        if (!wrapper && valueLabel.classList.contains('slicer-value-drop-zone')) {
            // valueLabel is the drop zone, create wrapper inside
            const newWrapper = document.createElement('div');
            newWrapper.className = 'slicer-value-wrapper';
            newWrapper.style.position = 'relative';
            newWrapper.style.width = '100%';
            newWrapper.dataset.slicerId = slicerId;
            newWrapper.style.cursor = 'grab';
            newWrapper.style.border = '2px dashed transparent';
            newWrapper.style.borderRadius = '4px';
            newWrapper.style.padding = '2px 4px';
            newWrapper.style.transition = 'all 0.2s';
            newWrapper.classList.add('slicer-value-drop-zone');
            
            // Copy drop event listeners
            ['dragover', 'dragleave', 'drop'].forEach(eventType => {
                newWrapper.addEventListener(eventType, (e) => {
                    const handlers = valueLabel.getEventListeners ? valueLabel.getEventListeners(eventType) : [];
                    handlers.forEach(handler => handler(e));
                });
            });
            
            newWrapper.appendChild(valueInput);
            valueLabel.innerHTML = '';
            valueLabel.appendChild(newWrapper);
        } else {
            // Add input to existing wrapper or label
            targetContainer.appendChild(valueInput);
        }
    }
    
    // Update slicer preview content ONLY (do not update canvas slicer until save)
    const slicerWidget = previewClone.querySelector('.slicer-widget');
    if (slicerWidget) {
        console.log('Updating slicer preview with:', { chartType, columnName, valuesCount: values.length, values: values.slice(0, 5) });
        updateSlicerPreviewContent(slicerWidget, chartType, columnName, values);
    } else {
        console.warn('Slicer widget not found in previewClone for slicer:', slicerId);
    }
    
    // DO NOT update canvas slicer here - it will be updated only when save button is clicked
    
    // Add to connected columns list - ONLY ONE COLUMN ALLOWED
    const connectedColumnsDiv = document.querySelector(`.connected-columns[data-slicer-id="${slicerId}"]`);
    if (connectedColumnsDiv) {
        // Remove existing column if any (only one column allowed)
        connectedColumnsDiv.innerHTML = '';
        
        // Create column chip
        const columnChip = document.createElement('div');
        columnChip.className = 'flex items-center justify-between bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm';
        columnChip.dataset.column = columnName;
        columnChip.dataset.columnIndex = columnIndex;
        columnChip.innerHTML = `
            <span class="text-sm text-gray-700">${columnName}</span>
            <button onclick="removeColumnFromSlicerPreview('${slicerId}', '${columnName}')" class="ml-2 text-red-500 hover:text-red-700">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;
        connectedColumnsDiv.appendChild(columnChip);
    }
    
    // Store connection temporarily (will be saved on save button click)
    // ONLY ONE COLUMN ALLOWED - replace existing
    if (!window.slicerModelConnections) {
        window.slicerModelConnections = {};
    }
    // Replace existing connection with new one (only one column allowed)
    window.slicerModelConnections[slicerId] = [{
        columnName: columnName,
        columnIndex: columnIndex,
        editableName: columnName
    }];
    
    // Update model preview in STM tab to show filtered data (preview only, not canvas)
    updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
}

// Update slicer preview content based on type
function updateSlicerPreviewContent(slicerWidget, chartType, columnName, values) {
    if (!slicerWidget) return;
    
    // Get slicer ID and column index from parent
    const slicerItem = slicerWidget.closest('[data-slicer-id]');
    const slicerId = slicerItem ? slicerItem.dataset.slicerId : null;
    const columnChip = slicerItem ? slicerItem.querySelector(`[data-column="${columnName}"]`) : null;
    const columnIndex = columnChip ? columnChip.dataset.columnIndex : null;
    
    // Store chartType in slicerWidget for later use
    if (slicerWidget) {
        slicerWidget.dataset.chartType = chartType;
    }
    
    switch (chartType) {
        case 'button-slicer':
            slicerWidget.innerHTML = `
                <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">${columnName}</div>
                <div class="flex flex-wrap gap-2">
                    ${values.length > 0 ? values.map((val, idx) => `
                        <button class="px-3 py-1.5 rounded text-xs slicer-btn-preview ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                                data-value="${val}" 
                                data-column="${columnName}"
                                style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                            ${val}
                        </button>
                    `).join('') : '<span class="text-xs text-gray-500">No data</span>'}
                </div>
            `;
            
            // Add click listeners to buttons
            if (slicerId && columnIndex) {
                const buttons = slicerWidget.querySelectorAll('.slicer-btn-preview');
                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        // Update button states
                        buttons.forEach(b => {
                            b.classList.remove('bg-blue-500', 'text-white');
                            b.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
                        });
                        btn.classList.add('bg-blue-500', 'text-white');
                        btn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
                        
                        // Update model preview
                        updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
                    });
                });
            }
            break;
            
        case 'text-slicer':
            slicerWidget.innerHTML = `
                <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
                <input type="text" placeholder="Type to filter..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm slicer-input-preview bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
                       data-column="${columnName}"
                       style="cursor: text;">
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">${values.length} values available</div>
            `;
            
            // Add input listener
            if (slicerId && columnIndex) {
                const input = slicerWidget.querySelector('.slicer-input-preview');
                if (input) {
                    let timeout;
                    input.addEventListener('input', () => {
                        clearTimeout(timeout);
                        timeout = setTimeout(() => {
                            updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
                        }, 300);
                    });
                }
            }
            break;
            
        case 'list-slicer':
            slicerWidget.innerHTML = `
                <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
                <div class="max-h-48 overflow-y-auto space-y-1">
                    ${values.length > 0 ? values.map((val, idx) => `
                        <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                            <input type="checkbox" class="slicer-checkbox-preview" value="${val}" data-column="${columnName}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                            <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                        </label>
                    `).join('') : '<span class="text-xs text-gray-500">No data</span>'}
                </div>
            `;
            
            // Add change listeners to checkboxes
            if (slicerId && columnIndex) {
                const checkboxes = slicerWidget.querySelectorAll('.slicer-checkbox-preview');
                checkboxes.forEach(cb => {
                    cb.addEventListener('change', () => {
                        updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
                    });
                });
            }
            break;
            
        case 'dropdown-slicer':
            slicerWidget.innerHTML = `
                <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
                <select class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm slicer-dropdown-preview bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" data-column="${columnName}" style="cursor: pointer;">
                    <option value="">Select...</option>
                    ${values.length > 0 ? values.map(val => `<option value="${val}">${val}</option>`).join('') : '<option value="">No data</option>'}
                </select>
            `;
            
            // Add change listener to dropdown
            if (slicerId && columnIndex) {
                const select = slicerWidget.querySelector('.slicer-dropdown-preview');
                if (select) {
                    select.addEventListener('change', () => {
                        updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType);
                    });
                }
            }
            break;
    }
}

// Update model preview in modal to show filtered data (preview only)
function updateModelPreviewInModal(slicerId, columnName, columnIndex, chartType = null) {
    if (!window.currentModelWidget) return;
    
    const modelWidgetId = window.currentModelWidget.dataset.widgetId;
    const modelChartType = window.currentModelWidget.dataset.chartType;
    
    // Get model data
    const modelChartDiv = window.currentModelWidget.querySelector('[id^="chart-"]');
    if (!modelChartDiv) return;
    
    let modelData = null;
    if (window.widgetData && window.widgetData[modelChartDiv.id]) {
        modelData = JSON.parse(JSON.stringify(window.widgetData[modelChartDiv.id])); // Deep copy
    } else if (window.csvData && window.csvData.length > 0) {
        modelData = JSON.parse(JSON.stringify(window.csvData)); // Deep copy
    }
    
    if (!modelData || modelData.length === 0) return;
    
    // Get slicer selected values from preview (if any)
    const slicerItem = document.querySelector(`[data-slicer-id="${slicerId}"]`);
    let selectedValues = [];
    
    if (slicerItem) {
        const slicerPreview = slicerItem.querySelector('.slicer-widget');
        if (slicerPreview) {
            // Get chartType from parameter or from slicerPreview dataset or fallback
            const slicerChartType = chartType || slicerPreview.dataset.chartType || 
                                   slicerItem.closest('.chart-widget')?.dataset.chartType || 
                                   document.querySelector(`[data-widget-id="${slicerId}"]`)?.dataset.chartType;
            
            console.log('updateModelPreviewInModal - slicerChartType:', slicerChartType, 'slicerId:', slicerId);
            
            if (slicerChartType === 'button-slicer') {
                const selectedBtn = slicerPreview.querySelector('.slicer-btn-preview.bg-blue-500');
                if (selectedBtn) {
                    selectedValues = [selectedBtn.dataset.value];
                    console.log('Button slicer selected value:', selectedValues);
                }
            } else if (slicerChartType === 'text-slicer') {
                const input = slicerPreview.querySelector('.slicer-input-preview');
                if (input && input.value.trim()) {
                    selectedValues = [input.value.trim()];
                    console.log('Text slicer selected value:', selectedValues);
                }
            } else if (slicerChartType === 'list-slicer') {
                const checkedBoxes = slicerPreview.querySelectorAll('.slicer-checkbox-preview:checked');
                selectedValues = Array.from(checkedBoxes).map(cb => cb.value);
                console.log('List slicer selected values:', selectedValues);
            } else if (slicerChartType === 'dropdown-slicer') {
                const select = slicerPreview.querySelector('.slicer-dropdown-preview');
                if (select && select.value) {
                    selectedValues = [select.value];
                    console.log('Dropdown slicer selected value:', selectedValues);
                }
            }
        }
    }
    
    console.log('updateModelPreviewInModal - selectedValues:', selectedValues, 'columnIndex:', columnIndex);
    
    // Filter model data based on selected values (if any)
    let filteredModelData = modelData;
    if (selectedValues.length > 0) {
        const colIndex = parseInt(columnIndex);
        if (colIndex >= 0 && colIndex < modelData[0].length) {
            const filteredData = [modelData[0]]; // Keep header
            for (let i = 1; i < modelData.length; i++) {
                const val = modelData[i][colIndex];
                if (val !== undefined && val !== null && selectedValues.includes(val.toString().trim())) {
                    filteredData.push(modelData[i]);
                }
            }
            filteredModelData = filteredData;
        }
    }
    
    // Temporarily set filtered data for preview rendering
    const originalData = window.widgetData ? (window.widgetData[modelChartDiv.id] ? JSON.parse(JSON.stringify(window.widgetData[modelChartDiv.id])) : null) : (window.csvData ? JSON.parse(JSON.stringify(window.csvData)) : null);
    
    if (window.widgetData) {
        window.widgetData[modelChartDiv.id] = filteredModelData;
    } else {
        window.csvData = filteredModelData;
    }
    
    // Update model preview
    const preview = document.getElementById('selectedModelPreview');
    if (preview && typeof renderChart === 'function') {
        // Clear existing preview
        preview.innerHTML = '';
        
        // Create a temporary chart div for preview
        const tempChartId = `temp-preview-${modelChartDiv.id}`;
        const tempChartDiv = document.createElement('div');
        tempChartDiv.id = tempChartId;
        tempChartDiv.style.width = '100%';
        tempChartDiv.style.height = '100%';
        tempChartDiv.style.minHeight = '300px';
        preview.appendChild(tempChartDiv);
        
        console.log('Rendering model preview with filtered data:', { 
            filteredDataLength: filteredModelData.length, 
            selectedValues, 
            tempChartId 
        });
        
        // Render chart with filtered data
        setTimeout(() => {
            if (typeof renderChart === 'function') {
                // Pass filter values to renderChart
                const filterValue = selectedValues.length > 0 ? selectedValues : null;
                renderChart(modelChartType, tempChartId, filterValue, columnName);
            }
        }, 100);
    }
    
    // Restore original data after a delay (longer delay to ensure chart is rendered)
    setTimeout(() => {
        if (originalData) {
            if (window.widgetData) {
                window.widgetData[modelChartDiv.id] = originalData;
            } else {
                window.csvData = originalData;
            }
        }
    }, 1000);
}

// Remove column from slicer preview
function removeColumnFromSlicerPreview(slicerId, columnName) {
    // Remove from connected columns list
    const connectedColumnsDiv = document.querySelector(`.connected-columns[data-slicer-id="${slicerId}"]`);
    if (connectedColumnsDiv) {
        const columnChip = connectedColumnsDiv.querySelector(`[data-column="${columnName}"]`);
        if (columnChip) {
            columnChip.remove();
        }
    }
    
    // Remove from connections
    if (window.slicerModelConnections && window.slicerModelConnections[slicerId]) {
        window.slicerModelConnections[slicerId] = window.slicerModelConnections[slicerId].filter(
            conn => conn.columnName !== columnName
        );
    }
    
    // DO NOT update canvas slicer here - it will be updated only when save button is clicked
    // Just reload slicers in modal to reset preview
    const modelWidgetId = window.currentModelWidget?.dataset?.widgetId;
    if (modelWidgetId) {
        loadSlicersForSTM(modelWidgetId);
    }
}

// Add column to slicer drop zone
function addColumnToSlicer(slicerId, columnName, columnIndex, dropZone) {
    const connectedColumns = dropZone.querySelector('.connected-columns');
    if (!connectedColumns) return;
    
    // Check if column already exists
    const existingColumn = connectedColumns.querySelector(`[data-column="${columnName}"]`);
    if (existingColumn) {
        return; // Already connected
    }
    
    // Create column chip
    const columnChip = document.createElement('div');
    columnChip.className = 'flex items-center justify-between bg-blue-100 border border-blue-300 rounded px-2 py-1 text-sm';
    columnChip.dataset.column = columnName;
    columnChip.dataset.columnIndex = columnIndex;
    columnChip.innerHTML = `
        <input type="text" value="${columnName}" class="bg-transparent border-none outline-none flex-1 text-sm column-name-input" style="min-width: 80px;">
        <button onclick="removeColumnFromSlicer(this, '${slicerId}')" class="ml-2 text-red-500 hover:text-red-700">
            <span class="material-symbols-outlined text-sm">close</span>
        </button>
    `;
    
    // Make column name editable
    const nameInput = columnChip.querySelector('.column-name-input');
    nameInput.addEventListener('blur', () => {
        const newName = nameInput.value.trim() || columnName;
        columnChip.dataset.column = newName;
        // Update connection data
        if (window.slicerModelConnections && window.slicerModelConnections[slicerId]) {
            const connection = window.slicerModelConnections[slicerId].find(c => c.columnName === columnName);
            if (connection) {
                connection.editableName = newName;
            }
        }
    });
    
    connectedColumns.appendChild(columnChip);
    
    // Update drop zone text
    const dropText = dropZone.querySelector('.text-xs');
    if (dropText) {
        dropText.style.display = 'none';
    }
    
    // Store connection
    if (!window.slicerModelConnections) {
        window.slicerModelConnections = {};
    }
    if (!window.slicerModelConnections[slicerId]) {
        window.slicerModelConnections[slicerId] = [];
    }
    window.slicerModelConnections[slicerId].push({
        columnName: columnName,
        columnIndex: columnIndex,
        editableName: columnName
    });
}

// Remove column from slicer
function removeColumnFromSlicer(button, slicerId) {
    const columnChip = button.closest('[data-column]');
    if (!columnChip) return;
    
    const columnName = columnChip.dataset.column;
    
    // Remove from DOM
    columnChip.remove();
    
    // Remove from connections
    if (window.slicerModelConnections && window.slicerModelConnections[slicerId]) {
        window.slicerModelConnections[slicerId] = window.slicerModelConnections[slicerId].filter(
            conn => conn.columnName !== columnName
        );
    }
    
    // Show drop text if no columns left
    const dropZone = button.closest('.slicer-drop-zone');
    if (dropZone) {
        const connectedColumns = dropZone.querySelector('.connected-columns');
        if (connectedColumns && connectedColumns.children.length === 0) {
            const dropText = dropZone.querySelector('.text-xs');
            if (dropText) {
                dropText.style.display = 'block';
            }
        }
    }
}

// Save connections and apply to canvas
function saveConnections() {
    const modelWidgetId = window.currentModelWidget ? window.currentModelWidget.dataset.widgetId : null;
    if (!modelWidgetId) {
        alert('Model widget not found');
        return;
    }
    
    // Initialize slicer to model connections mapping
    if (!window.slicerToModelConnections) {
        window.slicerToModelConnections = {};
    }
    
    // Save STM connections (Slicer -> Selected Model)
    if (window.slicerModelConnections && Object.keys(window.slicerModelConnections).length > 0) {
        Object.keys(window.slicerModelConnections).forEach(slicerId => {
            const connections = window.slicerModelConnections[slicerId];
            if (connections.length > 0) {
                // Get the first connected column (primary connection)
                const primaryColumn = connections[0];
                const originalColumnName = primaryColumn.columnName;
                const editableColumnName = primaryColumn.editableName || originalColumnName;
                const columnIndex = parseInt(primaryColumn.columnIndex);
                
                // Store slicer to model connection mapping (for Selected Model)
                if (!window.slicerToModelConnections[slicerId]) {
                    window.slicerToModelConnections[slicerId] = {};
                }
                window.slicerToModelConnections[slicerId][modelWidgetId] = {
                    columnName: originalColumnName,
                    columnIndex: columnIndex,
                    editableName: editableColumnName
                };
                
                // Also store in slicerModelConnections for backward compatibility
                if (!window.slicerModelConnections) {
                    window.slicerModelConnections = {};
                }
                if (!window.slicerModelConnections[slicerId]) {
                    window.slicerModelConnections[slicerId] = {};
                }
                window.slicerModelConnections[slicerId][modelWidgetId] = {
                    columns: [originalColumnName],
                    columnIndex: columnIndex,
                    editableName: editableColumnName,
                    selectedColumn: originalColumnName // Store selected column for slicer
                };
                
                // Find slicer widget on canvas
                const slicerWidget = document.querySelector(`[data-widget-id="${slicerId}"]`);
                if (slicerWidget) {
                    const chartType = slicerWidget.dataset.chartType;
                    const chartDiv = slicerWidget.querySelector('[id^="chart-"]');
                    
                    // Get selected model widget's data
                    let modelData = null;
                    if (window.currentModelWidget) {
                        const modelChartDiv = window.currentModelWidget.querySelector('[id^="chart-"]');
                        if (modelChartDiv && window.widgetData && window.widgetData[modelChartDiv.id]) {
                            modelData = window.widgetData[modelChartDiv.id];
                        } else if (window.csvData && window.csvData.length > 0) {
                            modelData = window.csvData;
                        }
                    } else if (window.csvData && window.csvData.length > 0) {
                        modelData = window.csvData;
                    }
                    
                    if (chartDiv && modelData && modelData.length > 0 && !isNaN(columnIndex)) {
                        // Get unique values from the column
                        const slicerData = [];
                        for (let i = 1; i < modelData.length; i++) {
                            const val = modelData[i][columnIndex];
                            if (val !== undefined && val !== null && val !== '' && !slicerData.includes(val.toString().trim())) {
                                slicerData.push(val.toString().trim());
                            }
                        }
                        
                        // Use editableName if available, otherwise use original columnName
                        const displayColumnName = editableColumnName;
                        
                        // Update slicer widget's data-column attribute
                        const slicerContainer = chartDiv.querySelector('.slicer-widget');
                        if (slicerContainer) {
                            slicerContainer.setAttribute('data-column', originalColumnName);
                        }
                        
                        // Update slicer widget using the update functions from design.js
                        // Pass slicerWidget (not chartDiv) to update functions
                        if (chartType === 'button-slicer' && typeof updateButtonSlicer === 'function') {
                            updateButtonSlicer(slicerWidget, slicerData, displayColumnName);
                        } else if (chartType === 'text-slicer' && typeof updateTextSlicer === 'function') {
                            updateTextSlicer(slicerWidget, slicerData, displayColumnName);
                        } else if (chartType === 'list-slicer' && typeof updateListSlicer === 'function') {
                            updateListSlicer(slicerWidget, slicerData, displayColumnName);
                        } else if (chartType === 'dropdown-slicer' && typeof updateDropdownSlicer === 'function') {
                            updateDropdownSlicer(slicerWidget, slicerData, displayColumnName);
                        } else {
                            // Fallback to updateSlicerOnCanvas
                            updateSlicerOnCanvas(chartType, chartDiv, displayColumnName, slicerData, slicerId);
                        }
                        
                        // Re-initialize slicer event listeners after update to ensure filtering works
                        setTimeout(() => {
                            const slicerContainer = chartDiv.querySelector('.slicer-widget');
                            if (slicerContainer) {
                                if (chartType === 'button-slicer' && typeof initButtonSlicer === 'function') {
                                    initButtonSlicer(slicerContainer);
                                } else if (chartType === 'text-slicer' && typeof initTextSlicer === 'function') {
                                    initTextSlicer(slicerContainer);
                                } else if (chartType === 'list-slicer' && typeof initListSlicer === 'function') {
                                    initListSlicer(slicerContainer);
                                } else if (chartType === 'dropdown-slicer' && typeof initDropdownSlicer === 'function') {
                                    initDropdownSlicer(slicerContainer);
                                }
                            }
                        }, 150);
                        
                        // Apply slicer filter to Selected Model
                        applySlicerFilterToModel(slicerId, modelWidgetId, originalColumnName, columnIndex, chartType);
                        
                        // Apply slicer filter to all connected Source Models
                        // Only if Source Model has column assigned to an axis
                        if (window.selectedToSourceConnections && window.selectedToSourceConnections[modelWidgetId]) {
                            Object.keys(window.selectedToSourceConnections[modelWidgetId]).forEach(sourceModelId => {
                                const sourceConnections = window.selectedToSourceConnections[modelWidgetId][sourceModelId];
                                // Check if Source Model has any axis with column assigned
                                const hasAxisColumn = Object.keys(sourceConnections).length > 0;
                                if (hasAxisColumn) {
                                    // Apply filter based on which axis uses the selected column
                                    Object.keys(sourceConnections).forEach(axisType => {
                                        const axisConnection = sourceConnections[axisType];
                                        if (axisConnection && axisConnection.columnName === originalColumnName) {
                                            applySlicerFilterToSourceModel(slicerId, sourceModelId, originalColumnName, columnIndex, chartType, axisType);
                                        }
                                    });
                                }
                            });
                        }
                    }
                }
            }
        });
    }
    
    // Save Selected Model -> Source Model connections (already saved in updateSourceModelFromSelectedModel)
    // These are stored in window.selectedToSourceConnections and window.chartSettings
    
    // Close modal
    closeConnectionModal();
    
    alert('Connections saved successfully!');
}

// Apply slicer filter to a model
function applySlicerFilterToModel(slicerId, modelId, columnName, columnIndex, slicerChartType) {
    const modelWidget = document.querySelector(`[data-widget-id="${modelId}"]`);
    if (!modelWidget) return;
    
    const chartDiv = modelWidget.querySelector('[id^="chart-"]');
    if (!chartDiv) return;
    
    // Get slicer selected values
    const slicerWidget = document.querySelector(`[data-widget-id="${slicerId}"]`);
    if (!slicerWidget) return;
    
    let selectedValues = [];
    const slicerChartDiv = slicerWidget.querySelector('[id^="chart-"]');
    if (slicerChartDiv) {
        if (slicerChartType === 'button-slicer') {
            const selectedBtn = slicerChartDiv.querySelector('.slicer-btn.bg-blue-500');
            if (selectedBtn) {
                selectedValues = [selectedBtn.dataset.value];
            }
        } else if (slicerChartType === 'text-slicer') {
            const input = slicerChartDiv.querySelector('.slicer-input');
            if (input && input.value.trim()) {
                selectedValues = [input.value.trim()];
            }
        } else if (slicerChartType === 'list-slicer') {
            const checkedBoxes = slicerChartDiv.querySelectorAll('.slicer-checkbox:checked');
            selectedValues = Array.from(checkedBoxes).map(cb => cb.value);
        } else if (slicerChartType === 'dropdown-slicer') {
            const select = slicerChartDiv.querySelector('.slicer-dropdown');
            if (select && select.value) {
                selectedValues = [select.value];
            }
        }
    }
    
    // Filter model data
    if (selectedValues.length > 0) {
        let modelData = null;
        if (window.widgetData && window.widgetData[chartDiv.id]) {
            modelData = JSON.parse(JSON.stringify(window.widgetData[chartDiv.id]));
        }
        
        if (modelData && modelData.length > 0) {
            const filteredData = [modelData[0]]; // Keep header
            const colIndex = parseInt(columnIndex);
            
            for (let i = 1; i < modelData.length; i++) {
                const val = modelData[i][colIndex];
                if (val !== undefined && val !== null && selectedValues.includes(val.toString().trim())) {
                    filteredData.push(modelData[i]);
                }
            }
            
            // Update model data
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[chartDiv.id] = filteredData;
            
            // Re-render chart
            const chartType = modelWidget.dataset.chartType;
            if (typeof renderChart === 'function') {
                setTimeout(() => {
                    renderChart(chartType, chartDiv.id);
                }, 100);
            }
        }
    }
}

// Apply slicer filter to source model
// Only works if Source Model has column assigned to an axis
function applySlicerFilterToSourceModel(slicerId, sourceModelId, columnName, columnIndex, slicerChartType, axisType) {
    // Check if Source Model has column assigned to the specified axis
    const selectedModelId = window.currentModelWidget ? window.currentModelWidget.dataset.widgetId : null;
    if (!selectedModelId) return;
    
    if (window.selectedToSourceConnections && 
        window.selectedToSourceConnections[selectedModelId] && 
        window.selectedToSourceConnections[selectedModelId][sourceModelId] &&
        window.selectedToSourceConnections[selectedModelId][sourceModelId][axisType]) {
        
        const axisConnection = window.selectedToSourceConnections[selectedModelId][sourceModelId][axisType];
        // Only apply filter if the axis column matches the slicer column
        if (axisConnection && axisConnection.columnName === columnName) {
            applySlicerFilterToModel(slicerId, sourceModelId, columnName, columnIndex, slicerChartType);
        }
    }
}

// Update slicer on canvas with column data
function updateSlicerOnCanvas(chartType, chartDiv, columnName, slicerData, slicerId) {
    if (!chartDiv) return;
    
    switch(chartType) {
        case 'button-slicer':
            chartDiv.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        <input type="text" value="${columnName}" class="bg-transparent border-none outline-none font-semibold slicer-column-name" style="width: auto; min-width: 60px;" data-slicer-id="${slicerId}">
                    </div>
                    <div class="flex flex-wrap gap-2">
                        ${slicerData.length > 0 ? slicerData.map((val, idx) => `
                            <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                                    data-value="${val}" 
                                    style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                                ${val}
                            </button>
                        `).join('') : '<p class="text-xs text-gray-500">No data available</p>'}
                    </div>
                </div>
            `;
            setTimeout(() => {
                if (typeof initButtonSlicer === 'function') {
                    initButtonSlicer(chartDiv);
                }
            }, 100);
            break;
            
        case 'list-slicer':
            chartDiv.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <input type="text" value="${columnName}" class="bg-transparent border-none outline-none font-semibold slicer-column-name" style="width: auto; min-width: 60px;" data-slicer-id="${slicerId}">
                    </div>
                    <div class="max-h-48 overflow-y-auto space-y-1">
                        ${slicerData.length > 0 ? slicerData.map((val, idx) => `
                            <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                                <input type="checkbox" class="slicer-checkbox" value="${val}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                                <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                            </label>
                        `).join('') : '<p class="text-xs text-gray-500">No data available</p>'}
                    </div>
                </div>
            `;
            setTimeout(() => {
                if (typeof initListSlicer === 'function') {
                    initListSlicer(chartDiv);
                }
            }, 100);
            break;
            
        case 'dropdown-slicer':
            chartDiv.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        <input type="text" value="${columnName}" class="bg-transparent border-none outline-none font-semibold slicer-column-name" style="width: auto; min-width: 60px;" data-slicer-id="${slicerId}">
                    </div>
                    <select class="slicer-dropdown w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" style="cursor: pointer; pointer-events: auto;">
                        <option value="">All</option>
                        ${slicerData.length > 0 ? slicerData.map((val, idx) => `
                            <option value="${val}" ${idx === 0 ? 'selected' : ''}>${val}</option>
                        `).join('') : ''}
                    </select>
                </div>
            `;
            setTimeout(() => {
                if (typeof initDropdownSlicer === 'function') {
                    initDropdownSlicer(chartDiv);
                }
            }, 100);
            break;
            
        case 'text-slicer':
            chartDiv.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
                        <input type="text" value="${columnName}" class="bg-transparent border-none outline-none font-semibold slicer-column-name" style="width: auto; min-width: 60px;" data-slicer-id="${slicerId}">
                    </div>
                    <input type="text" placeholder="Type to filter..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm slicer-input bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" style="cursor: text;">
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Filter results will appear here</div>
                </div>
            `;
            setTimeout(() => {
                if (typeof initTextSlicer === 'function') {
                    initTextSlicer(chartDiv);
                }
            }, 100);
            break;
    }
}

// Connect slicer to model (STM) - legacy function, now handled by drag-drop
function connectSlicerToModel(slicerId, modelId) {
    console.log('Connecting slicer', slicerId, 'to model', modelId);
    // Connection is now handled by drag-drop of columns
}

// Connect model to model (MTM)
function connectModelToModel(sourceModelId, targetModelId) {
    console.log('Connecting model', sourceModelId, 'to model', targetModelId);
    // TODO: Implement connection logic
    // This will store the connection and update the UI
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.showConnectionModal = showConnectionModal;
    window.closeConnectionModal = closeConnectionModal;
    window.switchConnectionTab = switchConnectionTab;
    window.saveConnections = saveConnections;
    window.removeColumnFromSlicer = removeColumnFromSlicer;
}

