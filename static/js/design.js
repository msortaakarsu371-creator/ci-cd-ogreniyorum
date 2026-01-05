// ==================== DESIGN CANVAS FUNCTIONALITY ====================

// Global flag to prevent duplicate chart creation during drag-drop
let isDragDropInProgress = false;

// ==================== SLICER TO MODEL CONNECTION SYSTEM ====================

// Check if a chart type is a slicer
function isSlicerTool(chartType) {
    return chartType === 'button-slicer' || chartType === 'text-slicer' || chartType === 'list-slicer' || chartType === 'dropdown-slicer';
}

// Check if a chart type is a model (non-slicer tool)
function isModelTool(chartType) {
    return chartType && !isSlicerTool(chartType) && chartType !== 'text-box' && chartType !== 'image';
}

// Get model columns from a widget
function getModelColumns(widget) {
    console.log('getModelColumns called for widget:', widget);
    const chartType = widget.dataset.chartType;
    console.log('Chart type:', chartType);
    
    if (!isModelTool(chartType)) {
        console.log('Not a model tool, returning empty array');
        return [];
    }
    
    console.log('Is model tool, proceeding to get columns...');
    
    // For table widget, extract columns from Plotly table data
    if (chartType === 'table' || chartType === 'list' || chartType === 'hierarchy-list') {
        console.log('Getting columns for table widget...');
        const chartDiv = widget.querySelector('[id^="chart-"]');
        console.log('Chart div found:', !!chartDiv, chartDiv ? chartDiv.id : 'none');
        
        if (chartDiv && typeof Plotly !== 'undefined') {
            try {
                // Method 1: Get from Plotly graph div's data property
                const graphDiv = document.getElementById(chartDiv.id);
                console.log('Graph div found:', !!graphDiv);
                
                if (graphDiv) {
                    // Try Plotly's getGraphDiv method
                    let plotlyData = null;
                    try {
                        plotlyData = Plotly.getGraphDiv(chartDiv.id);
                        console.log('Plotly getGraphDiv result:', plotlyData);
                        if (plotlyData && plotlyData.data && plotlyData.data.length > 0) {
                            const tableData = plotlyData.data[0];
                            console.log('Table data from getGraphDiv:', tableData);
                            if (tableData.type === 'table' && tableData.header && tableData.header.values) {
                                const headers = Array.isArray(tableData.header.values[0]) 
                                    ? tableData.header.values[0] 
                                    : tableData.header.values;
                                console.log('Headers from getGraphDiv:', headers);
                                if (headers.length > 0) {
                                    console.log('Plotly table columns found (getGraphDiv):', headers);
                                    return headers;
                                }
                            }
                        }
                    } catch (e) {
                        console.log('getGraphDiv failed:', e);
                    }
                    
                    // Method 2: Direct access to data property
                    console.log('Graph div data:', graphDiv.data);
                    if (graphDiv.data && graphDiv.data.length > 0) {
                        const tableData = graphDiv.data[0];
                        console.log('Table data from direct access:', tableData);
                        if (tableData.type === 'table' && tableData.header && tableData.header.values) {
                            const headers = Array.isArray(tableData.header.values[0]) 
                                ? tableData.header.values[0] 
                                : tableData.header.values;
                            console.log('Headers from direct access:', headers);
                            if (headers.length > 0) {
                                console.log('Plotly table columns found (direct):', headers);
                                return headers;
                            }
                        }
                    }
                }
                
                // Method 3: Try to find table element in DOM
                const table = chartDiv.querySelector('table');
                console.log('Table element found:', !!table);
                if (table) {
                    // Get header row
                    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
                    console.log('Header row found:', !!headerRow);
                    if (headerRow) {
                        const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell => cell.textContent.trim()).filter(h => h);
                        console.log('Headers from DOM:', headers);
                        if (headers.length > 0) {
                            console.log('Table HTML columns found:', headers);
                            return headers;
                        }
                    }
                }
            } catch (e) {
                console.log('Could not get Plotly table data:', e);
            }
        } else {
            console.log('Chart div or Plotly not available');
        }
    }
    
    // Get chart div for widget-specific data lookup
    const chartDiv = widget.querySelector('[id^="chart-"]');
    const widgetId = widget.dataset.widgetId;
    
    // CRITICAL: First check widget-specific data (not global csvData)
    if (window.widgetData) {
        // Check widget-specific data using widgetId
        if (widgetId && window.widgetData[widgetId] !== null && window.widgetData[widgetId] !== undefined) {
            const widgetData = window.widgetData[widgetId];
            if (Array.isArray(widgetData) && widgetData.length > 0) {
                const columns = widgetData[0] || [];
                if (columns.length > 0) {
                    console.log('Widget-specific columns found (by widgetId):', columns);
                    return columns;
                }
            }
        }
        
        // Check widget-specific data using chartDiv.id
        if (chartDiv && window.widgetData[chartDiv.id] !== null && window.widgetData[chartDiv.id] !== undefined) {
            const widgetData = window.widgetData[chartDiv.id];
            if (Array.isArray(widgetData) && widgetData.length > 0) {
                const columns = widgetData[0] || [];
                if (columns.length > 0) {
                    console.log('Widget-specific columns found (by chartDiv.id):', columns);
                    return columns;
                }
            }
        }
    }
    
    // Fallback: Get columns from global csvData (only if widget-specific data doesn't exist)
    // This is for backward compatibility, but should not be used for models without data
    if (window.csvData && window.csvData.length > 0) {
        const columns = window.csvData[0] || [];
        if (columns.length > 0) {
            console.log('CSV columns found (fallback):', columns);
            // Only return if widget doesn't have specific data (null means no data connected)
            if (!widgetId || window.widgetData[widgetId] === undefined) {
                return columns;
            }
        }
    }
    
    // Try to get from chart settings
    if (chartDiv && window.chartSettings && window.chartSettings[chartDiv.id]) {
        const settings = window.chartSettings[chartDiv.id];
        // Try to extract columns from axis settings
        const columns = [];
        if (settings.xAxisColumn) columns.push(settings.xAxisColumn);
        if (settings.yAxisColumn) columns.push(settings.yAxisColumn);
        if (settings.zAxisColumn) columns.push(settings.zAxisColumn);
        if (settings.columns && Array.isArray(settings.columns)) {
            columns.push(...settings.columns);
        }
        if (columns.length > 0) {
            console.log('Chart settings columns found:', columns);
            return columns;
        }
    }
    
    // Try to get from widget data attribute
    const widgetColumns = widget.dataset.columns;
    if (widgetColumns) {
        try {
            const columns = JSON.parse(widgetColumns);
            if (Array.isArray(columns) && columns.length > 0) {
                console.log('Widget data columns found:', columns);
                return columns;
            }
        } catch (e) {
            console.log('Could not parse widget columns:', e);
        }
    }
    
    console.log('No columns found for model widget:', chartType, 'widgetId:', widgetId);
    return [];
}

// Store connections: { slicerWidgetId: { modelWidgetId: true, ... } }
window.slicerModelConnections = window.slicerModelConnections || {};

// Add connection points to widget
function addConnectionPoints(widget, chartType) {
    // Create connection points container
    const connectionPoints = document.createElement('div');
    connectionPoints.className = 'connection-points';
    connectionPoints.style.position = 'absolute';
    connectionPoints.style.top = '0';
    connectionPoints.style.left = '0';
    connectionPoints.style.width = '100%';
    connectionPoints.style.height = '100%';
    connectionPoints.style.pointerEvents = 'none';
    connectionPoints.style.zIndex = '2000';
    
    if (isSlicerTool(chartType)) {
        // Slicer: connection point on right edge (output)
        const outputPoint = document.createElement('div');
        outputPoint.className = 'connection-point connection-output';
        outputPoint.style.position = 'absolute';
        outputPoint.style.right = '-8px';
        outputPoint.style.top = '50%';
        outputPoint.style.transform = 'translateY(-50%)';
        outputPoint.style.width = '16px';
        outputPoint.style.height = '16px';
        outputPoint.style.borderRadius = '50%';
        outputPoint.style.backgroundColor = '#007bff';
        outputPoint.style.border = '2px solid white';
        outputPoint.style.cursor = 'crosshair';
        outputPoint.style.pointerEvents = 'all';
        outputPoint.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        outputPoint.style.zIndex = '2000';
        outputPoint.title = 'Connect to Model';
        outputPoint.dataset.widgetId = widget.dataset.widgetId;
        outputPoint.dataset.connectionType = 'output';
        outputPoint.addEventListener('mousedown', handleConnectionStart);
        connectionPoints.appendChild(outputPoint);
    }
    
    if (isModelTool(chartType)) {
        // Model: connection point on left edge (input) - for STM and MTM
        const inputPoint = document.createElement('div');
        inputPoint.className = 'connection-point connection-input';
        inputPoint.style.position = 'absolute';
        inputPoint.style.left = '-8px';
        inputPoint.style.top = '50%';
        inputPoint.style.transform = 'translateY(-50%)';
        inputPoint.style.width = '16px';
        inputPoint.style.height = '16px';
        inputPoint.style.borderRadius = '50%';
        inputPoint.style.backgroundColor = '#28a745';
        inputPoint.style.border = '2px solid white';
        inputPoint.style.cursor = 'crosshair';
        inputPoint.style.pointerEvents = 'all';
        inputPoint.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        inputPoint.style.zIndex = '2000';
        inputPoint.title = 'Connect from Slicer or Model';
        inputPoint.dataset.widgetId = widget.dataset.widgetId;
        inputPoint.dataset.connectionType = 'input';
        inputPoint.addEventListener('mouseenter', function() {
            if (connectionState.isConnecting) {
                this.style.backgroundColor = '#20c997';
                this.style.transform = 'translateY(-50%) scale(1.2)';
            }
        });
        inputPoint.addEventListener('mouseleave', function() {
            if (connectionState.isConnecting) {
                this.style.backgroundColor = '#28a745';
                this.style.transform = 'translateY(-50%)';
            }
        });
        inputPoint.dataset.isInputPoint = 'true';
        
        inputPoint.addEventListener('mousedown', function(e) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }, { capture: true });
        
        inputPoint.addEventListener('mouseup', function(e) {
            console.log('Input point mouseup:', connectionState.isConnecting);
            e.stopPropagation();
            e.stopImmediatePropagation();
            e.preventDefault();
            
            if (connectionState.isConnecting) {
                console.log('Completing connection from input point');
                connectionState.completingConnection = true;
                connectionState.hoveredInputPoint = this; // Set hovered point explicitly
                // Temporarily remove cancel handler
                const cancelHandler = handleConnectionCancel;
                document.removeEventListener('mouseup', cancelHandler);
                
                // Call handleConnectionEnd with a small delay to ensure it runs after cancel handler
                setTimeout(() => {
                    handleConnectionEnd(e);
                    // Re-add cancel handler if still connecting
                    if (connectionState.isConnecting) {
                        document.addEventListener('mouseup', cancelHandler, { capture: false, passive: false });
                    }
                }, 10);
            }
        }, { capture: true, passive: false });
        connectionPoints.appendChild(inputPoint);
        
        // Model: connection point on right edge (output) - for MTM
        const outputPoint = document.createElement('div');
        outputPoint.className = 'connection-point connection-output-model';
        outputPoint.style.position = 'absolute';
        outputPoint.style.right = '-8px';
        outputPoint.style.top = '50%';
        outputPoint.style.transform = 'translateY(-50%)';
        outputPoint.style.width = '16px';
        outputPoint.style.height = '16px';
        outputPoint.style.borderRadius = '50%';
        outputPoint.style.backgroundColor = '#ff9800';
        outputPoint.style.border = '2px solid white';
        outputPoint.style.cursor = 'crosshair';
        outputPoint.style.pointerEvents = 'all';
        outputPoint.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        outputPoint.style.zIndex = '2000';
        outputPoint.title = 'Connect to Model';
        outputPoint.dataset.widgetId = widget.dataset.widgetId;
        outputPoint.dataset.connectionType = 'output';
        outputPoint.addEventListener('mouseenter', function() {
            if (connectionState.isConnecting) {
                this.style.backgroundColor = '#ff6f00';
                this.style.transform = 'translateY(-50%) scale(1.2)';
            }
        });
        outputPoint.addEventListener('mouseleave', function() {
            if (connectionState.isConnecting) {
                this.style.backgroundColor = '#ff9800';
                this.style.transform = 'translateY(-50%)';
            }
        });
        outputPoint.addEventListener('mousedown', handleConnectionStart);
        connectionPoints.appendChild(outputPoint);
    }
    
    widget.appendChild(connectionPoints);
}

// Connection drawing state
let connectionState = {
    isConnecting: false,
    sourceWidgetId: null,
    sourcePoint: null,
    tempLine: null,
    completingConnection: false,
    hoveredInputPoint: null,
    sourceType: null // 'slicer' or 'model'
};

// Store all connections
window.slicerModelConnections = window.slicerModelConnections || {};
window.modelModelConnections = window.modelModelConnections || {};

// Handle connection start (from slicer output or model output)
function handleConnectionStart(e) {
    e.stopPropagation();
    e.preventDefault();
    
    const widget = e.target.closest('.chart-widget');
    const isSlicer = widget && isSlicerTool(widget.dataset.chartType);
    const isModel = widget && isModelTool(widget.dataset.chartType);
    
    if (!widget || (!isSlicer && !isModel)) return;
    
    connectionState.isConnecting = true;
    connectionState.sourceWidgetId = widget.dataset.widgetId;
    connectionState.sourcePoint = e.target;
    connectionState.sourceType = isSlicer ? 'slicer' : 'model';
    
    // Create temporary line
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Ensure SVG overlay exists
    let svgOverlay = canvas.querySelector('.connection-overlay');
    if (!svgOverlay) {
        svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgOverlay.className = 'connection-overlay';
        svgOverlay.style.position = 'absolute';
        svgOverlay.style.top = '0';
        svgOverlay.style.left = '0';
        svgOverlay.style.width = '100%';
        svgOverlay.style.height = '100%';
        svgOverlay.style.pointerEvents = 'none';
        svgOverlay.style.zIndex = '500';
        canvas.appendChild(svgOverlay);
    }
    
    const rect = canvas.getBoundingClientRect();
    const pointRect = e.target.getBoundingClientRect();
    const startX = pointRect.left - rect.left + pointRect.width / 2;
    const startY = pointRect.top - rect.top + pointRect.height / 2;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', startX);
    line.setAttribute('y2', startY);
    line.setAttribute('stroke', '#007bff');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '5,5');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    svgOverlay.appendChild(line);
    connectionState.tempLine = line;
    
    // Add arrowhead marker if not exists
    if (!svgOverlay.querySelector('#arrowhead')) {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', '#007bff');
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svgOverlay.appendChild(defs);
    }
    
    // Track mouse movement
    document.addEventListener('mousemove', handleConnectionMove, { passive: true });
    // Use capture: false and lower priority for cancel handler
    document.addEventListener('mouseup', handleConnectionCancel, { capture: false, passive: false });
    
    // ESC key to cancel connection
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && connectionState.isConnecting) {
            console.log('ESC pressed, canceling connection');
            if (connectionState.tempLine) {
                connectionState.tempLine.remove();
            }
            resetConnectionState();
            document.removeEventListener('mousemove', handleConnectionMove);
            document.removeEventListener('mouseup', handleConnectionCancel);
        }
    });
}

// Handle connection move
function handleConnectionMove(e) {
    if (!connectionState.isConnecting || !connectionState.tempLine) return;
    
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const startX = parseFloat(connectionState.tempLine.getAttribute('x1'));
    const startY = parseFloat(connectionState.tempLine.getAttribute('y1'));
    
    connectionState.tempLine.setAttribute('x2', x);
    connectionState.tempLine.setAttribute('y2', y);
    
    // Check if mouse is over an input point
    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    let inputPoint = null;
    
    if (elementBelow) {
        if (elementBelow.classList && elementBelow.classList.contains('connection-input')) {
            inputPoint = elementBelow;
        } else {
            const closest = elementBelow.closest('.connection-input');
            if (closest) {
                inputPoint = closest;
            }
        }
    }
    
    connectionState.hoveredInputPoint = inputPoint;
    
    // Visual feedback: highlight input point when hovering
    document.querySelectorAll('.connection-input').forEach(point => {
        if (point === inputPoint) {
            point.style.backgroundColor = '#20c997';
            point.style.transform = 'translateY(-50%) scale(1.2)';
        } else {
            point.style.backgroundColor = '#28a745';
            point.style.transform = 'translateY(-50%)';
        }
    });
}

// Handle connection cancel
function handleConnectionCancel(e) {
    if (!connectionState.isConnecting) return;
    
    // If we're completing connection, don't cancel
    if (connectionState.completingConnection) {
        console.log('Completing connection, not canceling');
        return;
    }
    
    // Use a small delay to let handleConnectionEnd run first if it's on an input point
    setTimeout(() => {
        if (!connectionState.isConnecting) return; // Connection was completed
        
        const target = e.target;
        const isInputPoint = target.classList && target.classList.contains('connection-input');
        const isOverInputPoint = connectionState.hoveredInputPoint !== null;
        
        console.log('handleConnectionCancel called (delayed)', { 
            isInputPoint, 
            isOverInputPoint,
            target: target.className,
            hoveredInputPoint: !!connectionState.hoveredInputPoint
        });
        
        // If clicking on or over input point, don't cancel - let handleConnectionEnd handle it
        if (isInputPoint || isOverInputPoint) {
            console.log('Over input point, not canceling');
            return;
        }
        
        // Cancel connection
        console.log('Canceling connection');
        if (connectionState.tempLine) {
            connectionState.tempLine.remove();
        }
        resetConnectionState();
        
        // Remove event listeners
        document.removeEventListener('mousemove', handleConnectionMove);
        document.removeEventListener('mouseup', handleConnectionCancel);
    }, 50); // Small delay to let handleConnectionEnd run first
}

// Handle connection end (to model input)
function handleConnectionEnd(e) {
    console.log('handleConnectionEnd called', {
        isConnecting: connectionState.isConnecting,
        completingConnection: connectionState.completingConnection,
        target: e.target,
        targetClass: e.target.className,
        hoveredInputPoint: !!connectionState.hoveredInputPoint
    });
    
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();
    
    if (!connectionState.isConnecting) {
        console.log('Not connecting, returning');
        return;
    }
    
    // Check if we're over an input point - use hoveredInputPoint if available
    const target = e.target;
    const isInputPoint = target.classList && target.classList.contains('connection-input');
    // Prefer hoveredInputPoint if set, otherwise use target if it's an input point
    const inputPoint = connectionState.hoveredInputPoint || (isInputPoint ? target : null);
    
    console.log('Is input point:', isInputPoint, 'Hovered input point:', !!connectionState.hoveredInputPoint, 'target:', target.className);
    
    if (!inputPoint) {
        // Not over input point, cancel connection
        console.log('Not over input point, canceling');
        connectionState.completingConnection = false;
        return;
    }
    
    // Use the input point we found
    const actualTarget = inputPoint;
    
    console.log('Using input point:', actualTarget.className);
    
    const widget = actualTarget.closest('.chart-widget');
    console.log('Widget found:', !!widget, widget ? widget.dataset.chartType : 'none');
    
    if (!widget || !isModelTool(widget.dataset.chartType)) {
        console.log('Invalid widget or not a model tool');
        if (connectionState.tempLine) {
            connectionState.tempLine.remove();
        }
        resetConnectionState();
        document.removeEventListener('mousemove', handleConnectionMove);
        document.removeEventListener('mouseup', handleConnectionCancel);
        return;
    }
    
    const targetWidgetId = widget.dataset.widgetId;
    const sourceWidgetId = connectionState.sourceWidgetId;
    const sourceType = connectionState.sourceType;
    
    console.log('Connection IDs:', { sourceWidgetId, targetWidgetId, sourceType });
    console.log('Source type check:', sourceType === 'slicer', 'sourceType value:', sourceType);
    
    // Prevent duplicate connections
    if (sourceType === 'slicer') {
        console.log('Processing slicer connection...');
        if (window.slicerModelConnections[sourceWidgetId] && window.slicerModelConnections[sourceWidgetId][targetWidgetId]) {
            alert('Bu bağlantı zaten mevcut!');
            if (connectionState.tempLine) {
                connectionState.tempLine.remove();
            }
            resetConnectionState();
            document.removeEventListener('mousemove', handleConnectionMove);
            document.removeEventListener('mouseup', handleConnectionCancel);
            return;
        }
    } else if (sourceType === 'model') {
        if (window.modelModelConnections[sourceWidgetId] && window.modelModelConnections[sourceWidgetId][targetWidgetId]) {
            alert('Bu bağlantı zaten mevcut!');
            if (connectionState.tempLine) {
                connectionState.tempLine.remove();
            }
            resetConnectionState();
            document.removeEventListener('mousemove', handleConnectionMove);
            document.removeEventListener('mouseup', handleConnectionCancel);
            return;
        }
    }
    
    // Remove cancel handler temporarily to prevent interference
    document.removeEventListener('mouseup', handleConnectionCancel);
    
    // Create permanent connection line
    const canvas = document.getElementById('designCanvas');
    let svgOverlay = canvas.querySelector('.connection-overlay');
    if (!svgOverlay) {
        svgOverlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgOverlay.className = 'connection-overlay';
        svgOverlay.style.position = 'absolute';
        svgOverlay.style.top = '0';
        svgOverlay.style.left = '0';
        svgOverlay.style.width = '100%';
        svgOverlay.style.height = '100%';
        svgOverlay.style.pointerEvents = 'none';
        svgOverlay.style.zIndex = '500';
        canvas.appendChild(svgOverlay);
    }
    
    // Remove temporary line
    if (connectionState.tempLine) {
        connectionState.tempLine.remove();
    }
    
    // Get positions
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceWidgetId}"]`);
    const targetWidget = document.querySelector(`[data-widget-id="${targetWidgetId}"]`);
    
    console.log('Widgets found:', { sourceWidget: !!sourceWidget, targetWidget: !!targetWidget });
    
    if (!sourceWidget || !targetWidget) {
        console.error('Source or target widget not found');
        resetConnectionState();
        return;
    }
    
    // Find source point (slicer output or model output)
    const sourcePoint = sourceWidget.querySelector('.connection-output') || sourceWidget.querySelector('.connection-output-model');
    const targetPoint = targetWidget.querySelector('.connection-input');
    
    console.log('Connection points:', {
        sourcePoint: !!sourcePoint,
        targetPoint: !!targetPoint
    });
    
    if (!sourcePoint || !targetPoint) {
        console.error('Source or target connection point not found');
        resetConnectionState();
        return;
    }
    
    const canvasRect = canvas.getBoundingClientRect();
    const sourceRect = sourcePoint.getBoundingClientRect();
    const targetRect = targetPoint.getBoundingClientRect();
    
    const x1 = sourceRect.left - canvasRect.left + sourceRect.width / 2;
    const y1 = sourceRect.top - canvasRect.top + sourceRect.height / 2;
    const x2 = targetRect.left - canvasRect.left + targetRect.width / 2;
    const y2 = targetRect.top - canvasRect.top + targetRect.height / 2;
    
    // Create polyline path that goes around widgets
    const path = createConnectionPath(sourcePoint, targetPoint, sourceWidget, targetWidget, canvas);
    
    // Create permanent path element
    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', path);
    pathElement.setAttribute('stroke', sourceType === 'slicer' ? '#007bff' : '#ff9800');
    pathElement.setAttribute('stroke-width', '2');
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('marker-end', 'url(#arrowhead)');
    pathElement.dataset.sourceWidgetId = sourceWidgetId;
    pathElement.dataset.targetWidgetId = targetWidgetId;
    pathElement.dataset.connectionType = sourceType === 'slicer' ? 'stm' : 'mtm';
    pathElement.style.cursor = 'pointer';
    pathElement.style.pointerEvents = 'all';
    
    // Store selected line for delete
    window.selectedConnectionLine = null;
    
    pathElement.addEventListener('click', function(e) {
        e.stopPropagation();
        // Remove previous selection
        if (window.selectedConnectionLine) {
            window.selectedConnectionLine.style.strokeWidth = '2';
            window.selectedConnectionLine.style.opacity = '1';
        }
        // Select this line
        window.selectedConnectionLine = pathElement;
        pathElement.style.strokeWidth = '3';
        pathElement.style.opacity = '0.8';
        showConnectionSettings(sourceWidgetId, targetWidgetId, sourceType);
    });
    
    // Delete key handler (global, only one needed)
    if (!window.connectionDeleteHandler) {
        window.connectionDeleteHandler = function(e) {
            if ((e.key === 'Delete' || e.key === 'Backspace') && window.selectedConnectionLine) {
                e.preventDefault();
                const line = window.selectedConnectionLine;
                deleteConnection(
                    line.dataset.sourceWidgetId,
                    line.dataset.targetWidgetId,
                    line.dataset.connectionType
                );
                window.selectedConnectionLine = null;
            }
        };
        document.addEventListener('keydown', window.connectionDeleteHandler);
    }
    
    svgOverlay.appendChild(pathElement);
    
    // Store path element reference for updates
    if (!window.connectionLines) {
        window.connectionLines = {};
    }
    const connectionKey = `${sourceWidgetId}-${targetWidgetId}`;
    window.connectionLines[connectionKey] = {
        pathElement: pathElement,
        sourceWidgetId: sourceWidgetId,
        targetWidgetId: targetWidgetId,
        connectionType: sourceType === 'slicer' ? 'stm' : 'mtm'
    };
    
    // Store connection based on type
    if (sourceType === 'slicer') {
        // Store with original widget IDs (don't convert to string, keep as is)
        if (!window.slicerModelConnections[sourceWidgetId]) {
            window.slicerModelConnections[sourceWidgetId] = {};
        }
        window.slicerModelConnections[sourceWidgetId][targetWidgetId] = {
            type: 'stm',
            columns: []
        };
        console.log('STM Connection stored:', {
            sourceWidgetId,
            targetWidgetId,
            sourceType: typeof sourceWidgetId,
            targetType: typeof targetWidgetId,
            connections: window.slicerModelConnections,
            connectionKeys: Object.keys(window.slicerModelConnections)
        });
        
        // Update connection line positions when widgets move
        if (typeof updateAllConnectionLinesForWidget === 'function') {
            updateAllConnectionLinesForWidget(sourceWidgetId);
            updateAllConnectionLinesForWidget(targetWidgetId);
        }
        
        // Show slicer settings dialog to select column
        setTimeout(() => {
            showSlicerSettingsDialog(sourceWidgetId, targetWidgetId);
        }, 300);
        
        // Update model filtering
        updateModelFiltering(sourceWidgetId, targetWidgetId);
    } else if (sourceType === 'model') {
        if (!window.modelModelConnections[sourceWidgetId]) {
            window.modelModelConnections[sourceWidgetId] = {};
        }
        window.modelModelConnections[sourceWidgetId][targetWidgetId] = {
            type: 'mtm',
            columns: []
        };
        console.log('MTM Connection stored:', window.modelModelConnections);
        
        // Update target model with source model columns
        updateModelFromModel(sourceWidgetId, targetWidgetId);
    }
    
    resetConnectionState();
    
    // Remove event listeners
    document.removeEventListener('mousemove', handleConnectionMove);
    document.removeEventListener('mouseup', handleConnectionCancel);
}

// Reset connection state
function resetConnectionState() {
    connectionState.isConnecting = false;
    connectionState.sourceWidgetId = null;
    connectionState.sourcePoint = null;
    connectionState.tempLine = null;
    connectionState.completingConnection = false;
    connectionState.hoveredInputPoint = null;
    connectionState.sourceType = null;
    
    // Reset input point styles
    document.querySelectorAll('.connection-input').forEach(point => {
        point.style.backgroundColor = '#28a745';
        point.style.transform = 'translateY(-50%)';
    });
}

// Show connection settings modal
function showConnectionSettings(sourceWidgetId, targetWidgetId, sourceType) {
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceWidgetId}"]`);
    const targetWidget = document.querySelector(`[data-widget-id="${targetWidgetId}"]`);
    
    if (!sourceWidget || !targetWidget) return;
    
    // Get available columns from source
    const sourceColumns = getModelColumns(sourceWidget);
    const connectionType = sourceType === 'slicer' ? 'stm' : 'mtm';
    
    // Get current connection columns
    let currentColumns = [];
    if (connectionType === 'stm' && window.slicerModelConnections[sourceWidgetId] && window.slicerModelConnections[sourceWidgetId][targetWidgetId]) {
        currentColumns = window.slicerModelConnections[sourceWidgetId][targetWidgetId].columns || [];
    } else if (connectionType === 'mtm' && window.modelModelConnections[sourceWidgetId] && window.modelModelConnections[sourceWidgetId][targetWidgetId]) {
        currentColumns = window.modelModelConnections[sourceWidgetId][targetWidgetId].columns || [];
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">Bağlantı Ayarları</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2">Kullanılacak Sütunlar:</label>
                <div class="space-y-2 max-h-60 overflow-y-auto">
                    ${sourceColumns.map(col => `
                        <label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                            <input type="checkbox" value="${col}" ${currentColumns.includes(col) ? 'checked' : ''} class="connection-column-checkbox">
                            <span class="text-sm">${col}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="flex gap-2 justify-end">
                <button onclick="deleteConnection('${sourceWidgetId}', '${targetWidgetId}', '${connectionType}')" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                    Bağlantıyı Sil
                </button>
                <button onclick="saveConnectionSettings('${sourceWidgetId}', '${targetWidgetId}', '${connectionType}')" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Kaydet
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store modal reference
    modal.dataset.sourceWidgetId = sourceWidgetId;
    modal.dataset.targetWidgetId = targetWidgetId;
    modal.dataset.connectionType = connectionType;
}

// Save connection settings
function saveConnectionSettings(sourceWidgetId, targetWidgetId, connectionType) {
    const modal = document.querySelector('.fixed.inset-0');
    if (!modal) return;
    
    const checkboxes = modal.querySelectorAll('.connection-column-checkbox:checked');
    const selectedColumns = Array.from(checkboxes).map(cb => cb.value);
    
    if (connectionType === 'stm') {
        if (window.slicerModelConnections[sourceWidgetId] && window.slicerModelConnections[sourceWidgetId][targetWidgetId]) {
            window.slicerModelConnections[sourceWidgetId][targetWidgetId].columns = selectedColumns;
            updateModelFiltering(sourceWidgetId, targetWidgetId);
        }
    } else if (connectionType === 'mtm') {
        if (window.modelModelConnections[sourceWidgetId] && window.modelModelConnections[sourceWidgetId][targetWidgetId]) {
            window.modelModelConnections[sourceWidgetId][targetWidgetId].columns = selectedColumns;
            updateModelFromModel(sourceWidgetId, targetWidgetId);
        }
    }
    
    modal.remove();
    if (typeof showAlert === 'function') {
        showAlert('Bağlantı ayarları kaydedildi', 'success');
    }
}

// Delete connection
function deleteConnection(sourceWidgetId, targetWidgetId, connectionType) {
    if (!confirm('Bu bağlantıyı silmek istediğinizden emin misiniz?')) return;
    
    // Remove connection line from SVG
    const canvas = document.getElementById('designCanvas');
    if (canvas) {
        const svgOverlay = canvas.querySelector('.connection-overlay');
        if (svgOverlay) {
            // Try to find path element
            const path = svgOverlay.querySelector(`path[data-source-widget-id="${sourceWidgetId}"][data-target-widget-id="${targetWidgetId}"]`);
            if (path) {
                path.remove();
            }
            // Also try line element (for backward compatibility)
            const line = svgOverlay.querySelector(`line[data-source-widget-id="${sourceWidgetId}"][data-target-widget-id="${targetWidgetId}"]`);
            if (line) {
                line.remove();
            }
        }
    }
    
    // Remove from connectionLines object
    if (window.connectionLines) {
        const connectionKey = `${sourceWidgetId}-${targetWidgetId}`;
        delete window.connectionLines[connectionKey];
    }
    
    // Clear selection if this was the selected line
    if (window.selectedConnectionLine && 
        window.selectedConnectionLine.dataset.sourceWidgetId === sourceWidgetId &&
        window.selectedConnectionLine.dataset.targetWidgetId === targetWidgetId) {
        window.selectedConnectionLine = null;
    }
    
    // Remove from connections object
    if (connectionType === 'stm') {
        if (window.slicerModelConnections[sourceWidgetId]) {
            delete window.slicerModelConnections[sourceWidgetId][targetWidgetId];
        }
    } else if (connectionType === 'mtm') {
        if (window.modelModelConnections[sourceWidgetId]) {
            delete window.modelModelConnections[sourceWidgetId][targetWidgetId];
        }
    }
    
    // Close modal
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) modal.remove();
    
    if (typeof showAlert === 'function') {
        showAlert('Bağlantı silindi', 'success');
    }
}

// Update model from model (MTM)
function updateModelFromModel(sourceWidgetId, targetWidgetId) {
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceWidgetId}"]`);
    const targetWidget = document.querySelector(`[data-widget-id="${targetWidgetId}"]`);
    
    if (!sourceWidget || !targetWidget) return;
    
    // Get columns from connection settings
    const connection = window.modelModelConnections[sourceWidgetId] && window.modelModelConnections[sourceWidgetId][targetWidgetId];
    if (!connection) return;
    
    const columns = connection.columns.length > 0 ? connection.columns : getModelColumns(sourceWidget);
    
    // If source is an Excel widget, copy its data to the target model
    const sourceChartType = sourceWidget.dataset.chartType;
    if (sourceChartType === 'excel') {
        // Get data from Excel widget
        if (window.excelWidgetData && window.excelWidgetData[sourceWidgetId]) {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[targetWidgetId] = window.excelWidgetData[sourceWidgetId];
            console.log('Copied Excel widget data to target model:', targetWidgetId);
        }
    }
    
    // Update target model with source columns
    console.log('Updating target model with columns:', columns);
    
    // Re-render target model if needed
    const targetChartType = targetWidget.dataset.chartType;
    const targetChartDiv = targetWidget.querySelector('[id^="chart-"]');
    if (targetChartDiv && typeof renderChart === 'function') {
        renderChart(targetChartType, targetChartDiv.id);
    }
}

// Make functions globally accessible
// Create connection path that goes around widgets
function createConnectionPath(sourcePoint, targetPoint, sourceWidget, targetWidget, canvas) {
    const canvasRect = canvas.getBoundingClientRect();
    const sourceRect = sourcePoint.getBoundingClientRect();
    const targetRect = targetPoint.getBoundingClientRect();
    
    // Get widget bounds
    const sourceWidgetRect = sourceWidget.getBoundingClientRect();
    const targetWidgetRect = targetWidget.getBoundingClientRect();
    
    // Calculate points relative to canvas
    const x1 = sourceRect.left - canvasRect.left + sourceRect.width / 2;
    const y1 = sourceRect.top - canvasRect.top + sourceRect.height / 2;
    const x2 = targetRect.left - canvasRect.left + targetRect.width / 2;
    const y2 = targetRect.top - canvasRect.top + targetRect.height / 2;
    
    // Calculate widget bounds relative to canvas
    const sourceLeft = sourceWidgetRect.left - canvasRect.left;
    const sourceRight = sourceWidgetRect.right - canvasRect.left;
    const sourceTop = sourceWidgetRect.top - canvasRect.top;
    const sourceBottom = sourceWidgetRect.bottom - canvasRect.top;
    
    const targetLeft = targetWidgetRect.left - canvasRect.left;
    const targetRight = targetWidgetRect.right - canvasRect.left;
    const targetTop = targetWidgetRect.top - canvasRect.top;
    const targetBottom = targetWidgetRect.bottom - canvasRect.top;
    
    // Determine if we need to go around widgets
    // Simple routing: go horizontally first, then vertically, avoiding widget bounds
    const margin = 10; // Margin around widgets
    
    let path = `M ${x1} ${y1}`;
    
    // Check if widgets overlap horizontally
    const horizontalOverlap = !(sourceRight < targetLeft - margin || sourceLeft > targetRight + margin);
    const verticalOverlap = !(sourceBottom < targetTop - margin || sourceTop > targetBottom + margin);
    
    if (horizontalOverlap && verticalOverlap) {
        // Widgets overlap, go around
        // Go right/left first, then up/down
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        
        // Determine direction
        if (x1 < x2) {
            // Source is left of target
            const rightX = Math.max(sourceRight, targetRight) + margin;
            path += ` L ${rightX} ${y1}`;
            path += ` L ${rightX} ${y2}`;
        } else {
            // Source is right of target
            const leftX = Math.min(sourceLeft, targetLeft) - margin;
            path += ` L ${leftX} ${y1}`;
            path += ` L ${leftX} ${y2}`;
        }
    } else if (horizontalOverlap) {
        // Overlap horizontally, go around vertically
        const midY = (y1 + y2) / 2;
        if (y1 < y2) {
            // Source is above target
            const topY = Math.min(sourceTop, targetTop) - margin;
            path += ` L ${x1} ${topY}`;
            path += ` L ${x2} ${topY}`;
        } else {
            // Source is below target
            const bottomY = Math.max(sourceBottom, targetBottom) + margin;
            path += ` L ${x1} ${bottomY}`;
            path += ` L ${x2} ${bottomY}`;
        }
    } else {
        // No overlap, use L-shaped path
        const midX = (x1 + x2) / 2;
        path += ` L ${midX} ${y1}`;
        path += ` L ${midX} ${y2}`;
    }
    
    path += ` L ${x2} ${y2}`;
    
    return path;
}

// Update all connection lines for a widget
function updateAllConnectionLinesForWidget(widgetId) {
    if (!window.connectionLines) return;
    
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    Object.keys(window.connectionLines).forEach(key => {
        const connection = window.connectionLines[key];
        if (connection.sourceWidgetId === widgetId || connection.targetWidgetId === widgetId) {
            updateConnectionLine(connection, canvas);
        }
    });
}

// Update a single connection line
function updateConnectionLine(connection, canvas) {
    const sourceWidget = document.querySelector(`[data-widget-id="${connection.sourceWidgetId}"]`);
    const targetWidget = document.querySelector(`[data-widget-id="${connection.targetWidgetId}"]`);
    
    if (!sourceWidget || !targetWidget || !connection.pathElement) return;
    
    // Find connection points
    const sourcePoint = sourceWidget.querySelector('.connection-output') || sourceWidget.querySelector('.connection-output-model');
    const targetPoint = targetWidget.querySelector('.connection-input');
    
    if (!sourcePoint || !targetPoint) return;
    
    // Create new path
    const newPath = createConnectionPath(sourcePoint, targetPoint, sourceWidget, targetWidget, canvas);
    connection.pathElement.setAttribute('d', newPath);
}

window.showConnectionSettings = showConnectionSettings;
window.saveConnectionSettings = saveConnectionSettings;
window.deleteConnection = deleteConnection;
window.updateAllConnectionLinesForWidget = updateAllConnectionLinesForWidget;
window.toggleConnectionsVisibility = toggleConnectionsVisibility;

// Toggle connections visibility
function toggleConnectionsVisibility() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Toggle connection points
    const connectionPoints = canvas.querySelectorAll('.connection-points');
    const svgOverlay = canvas.querySelector('.connection-overlay');
    
    // Check current state
    const isVisible = connectionPoints.length > 0 && connectionPoints[0].style.display !== 'none';
    
    // Toggle connection points
    connectionPoints.forEach(points => {
        points.style.display = isVisible ? 'none' : 'block';
    });
    
    // Toggle connection lines
    if (svgOverlay) {
        svgOverlay.style.display = isVisible ? 'none' : 'block';
    }
    
    // Update button text/icon
    const btn = document.getElementById('toggleConnectionsBtn');
    if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        const text = btn.querySelector('span:last-child');
        if (isVisible) {
            if (icon) icon.textContent = 'link_off';
            if (text) text.textContent = 'Connections (Hidden)';
            btn.classList.add('opacity-60');
        } else {
            if (icon) icon.textContent = 'link';
            if (text) text.textContent = 'Connections';
            btn.classList.remove('opacity-60');
        }
    }
    
    // Store state
    window.connectionsVisible = !isVisible;
}

// Show connections (initialize as visible)
function showConnections() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    const connectionPoints = canvas.querySelectorAll('.connection-points');
    const svgOverlay = canvas.querySelector('.connection-overlay');
    
    // Show connection points
    connectionPoints.forEach(points => {
        points.style.display = 'block';
    });
    
    // Show connection lines
    if (svgOverlay) {
        svgOverlay.style.display = 'block';
    }
    
    // Update button text/icon
    const btn = document.getElementById('toggleConnectionsBtn');
    if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        const text = btn.querySelector('span:last-child');
        if (icon) icon.textContent = 'link';
        if (text) text.textContent = 'Connections';
        btn.classList.remove('opacity-60');
    }
    
    // Store state
    window.connectionsVisible = true;
}

// Initialize connections visibility state
window.connectionsVisible = true;

// Update slicer with model columns
function updateSlicerFromModel(slicerWidgetId, modelWidgetId, selectedColumn = null) {
    const slicerWidget = document.querySelector(`[data-widget-id="${slicerWidgetId}"]`);
    const modelWidget = document.querySelector(`[data-widget-id="${modelWidgetId}"]`);
    
    if (!slicerWidget || !modelWidget) return;
    
    const columns = getModelColumns(modelWidget);
    if (columns.length === 0) return;
    
    const chartType = slicerWidget.dataset.chartType;
    const chartDiv = slicerWidget.querySelector('[id^="chart-"]');
    if (!chartDiv) return;
    
    // Use selected column or stored column or first column as fallback
    let columnToUse = selectedColumn;
    if (!columnToUse && window.slicerModelConnections[slicerWidgetId] && window.slicerModelConnections[slicerWidgetId][modelWidgetId]) {
        columnToUse = window.slicerModelConnections[slicerWidgetId][modelWidgetId].selectedColumn;
    }
    if (!columnToUse) {
        columnToUse = columns[0];
    }
    
    let values = [];
    
    // Try to get values from table widget's Plotly data first
    const modelChartType = modelWidget.dataset.chartType;
    if (modelChartType === 'table') {
        const modelChartDiv = modelWidget.querySelector('[id^="chart-"]');
        if (modelChartDiv && typeof Plotly !== 'undefined') {
            try {
                const graphDiv = document.getElementById(modelChartDiv.id);
                if (graphDiv && graphDiv.data && graphDiv.data.length > 0) {
                    const tableData = graphDiv.data[0];
                    if (tableData.type === 'table' && tableData.cells && tableData.cells.values) {
                        // Find column index
                        const headers = Array.isArray(tableData.header.values[0]) 
                            ? tableData.header.values[0] 
                            : tableData.header.values;
                        const colIndex = headers.indexOf(columnToUse);
                        
                        if (colIndex !== -1 && tableData.cells.values[colIndex]) {
                            const columnValues = tableData.cells.values[colIndex];
                            // Get unique values
                            columnValues.forEach(val => {
                                if (val && val !== '' && !values.includes(val)) {
                                    values.push(val);
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.log('Could not get table data from Plotly:', e);
            }
        }
    }
    
    // Fallback to csvData
    if (values.length === 0 && window.csvData && window.csvData.length > 0) {
        const colIndex = window.csvData[0].indexOf(columnToUse);
        if (colIndex !== -1) {
            for (let i = 1; i < window.csvData.length; i++) {
                const val = window.csvData[i][colIndex];
                if (val && !values.includes(val)) {
                    values.push(val);
                }
            }
        }
    }
    
    console.log('Slicer values for column', columnToUse, ':', values);
    
    if (values.length === 0) {
        console.warn('No values found for column:', columnToUse);
        return;
    }
    
    // Store selected column in connection
    if (window.slicerModelConnections[slicerWidgetId] && window.slicerModelConnections[slicerWidgetId][modelWidgetId]) {
        window.slicerModelConnections[slicerWidgetId][modelWidgetId].selectedColumn = columnToUse;
    }
    
    // Update slicer based on type
    if (chartType === 'button-slicer') {
        updateButtonSlicer(slicerWidget, values, columnToUse);
    } else if (chartType === 'text-slicer') {
        updateTextSlicer(slicerWidget, values, columnToUse);
    } else if (chartType === 'list-slicer') {
        updateListSlicer(slicerWidget, values, columnToUse);
    } else if (chartType === 'dropdown-slicer') {
        updateDropdownSlicer(slicerWidget, values, columnToUse);
    }
}

// Update button slicer
function updateButtonSlicer(slicerWidget, values, columnName) {
    const slicerContainer = slicerWidget.querySelector('.slicer-widget');
    if (!slicerContainer) return;
    
    // Get original column name from data-column attribute if available
    const originalColumnName = slicerContainer.getAttribute('data-column') || columnName;
    
    slicerContainer.innerHTML = `
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">${columnName}</div>
        <div class="flex flex-wrap gap-2">
            ${values.map((val, idx) => `
                <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                        data-value="${val}" 
                        data-column="${originalColumnName}"
                        style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                    ${val}
                </button>
            `).join('')}
        </div>
    `;
    
    // Set data-column attribute for filtering
    slicerContainer.setAttribute('data-column', originalColumnName);
    
    // Re-initialize button slicer
    setTimeout(() => {
        initButtonSlicer(slicerWidget);
    }, 100);
}

// Update text slicer
function updateTextSlicer(slicerWidget, values, columnName) {
    const slicerContainer = slicerWidget.querySelector('.slicer-widget');
    if (!slicerContainer) return;
    
    // Get original column name from data-column attribute if available
    const originalColumnName = slicerContainer.getAttribute('data-column') || columnName;
    
    slicerContainer.innerHTML = `
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
        <input type="text" placeholder="Type to filter..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm slicer-input bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" 
               data-column="${originalColumnName}"
               style="cursor: text;">
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">Filter results will appear here</div>
    `;
    
    // Set data-column attribute for filtering
    slicerContainer.setAttribute('data-column', originalColumnName);
    
    // Re-initialize text slicer
    setTimeout(() => {
        initTextSlicer(slicerWidget);
    }, 100);
}

// Update list slicer
function updateListSlicer(slicerWidget, values, columnName) {
    const slicerContainer = slicerWidget.querySelector('.slicer-widget');
    if (!slicerContainer) return;
    
    // Get original column name from data-column attribute if available
    const originalColumnName = slicerContainer.getAttribute('data-column') || columnName;
    
    slicerContainer.innerHTML = `
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
        <div class="max-h-48 overflow-y-auto space-y-1">
            ${values.map((val, idx) => `
                <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                    <input type="checkbox" class="slicer-checkbox" value="${val}" data-column="${originalColumnName}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                    <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                </label>
            `).join('')}
        </div>
    `;
    
    // Set data-column attribute for filtering
    slicerContainer.setAttribute('data-column', originalColumnName);
    
    // Re-initialize list slicer
    setTimeout(() => {
        initListSlicer(slicerWidget);
    }, 100);
}

// Update dropdown slicer
function updateDropdownSlicer(slicerWidget, values, columnName) {
    const slicerContainer = slicerWidget.querySelector('.slicer-widget');
    if (!slicerContainer) return;
    
    // Get original column name from data-column attribute if available
    const originalColumnName = slicerContainer.getAttribute('data-column') || columnName;
    
    slicerContainer.innerHTML = `
        <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${columnName}</div>
        <select class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm slicer-dropdown bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" data-column="${originalColumnName}" style="cursor: pointer;">
            <option value="">Select...</option>
            ${values.map(val => `<option value="${val}">${val}</option>`).join('')}
        </select>
    `;
    
    // Set data-column attribute for filtering
    slicerContainer.setAttribute('data-column', originalColumnName);
    
    // Re-initialize dropdown slicer
    setTimeout(() => {
        initDropdownSlicer(slicerWidget);
    }, 100);
}

// Show slicer settings dialog
function showSlicerSettingsDialog(slicerWidgetId, modelWidgetId) {
    console.log('showSlicerSettingsDialog called:', { slicerWidgetId, modelWidgetId });
    
    const slicerWidget = document.querySelector(`[data-widget-id="${slicerWidgetId}"]`);
    const modelWidget = document.querySelector(`[data-widget-id="${modelWidgetId}"]`);
    
    console.log('Widgets found:', { slicerWidget: !!slicerWidget, modelWidget: !!modelWidget });
    
    if (!slicerWidget || !modelWidget) {
        console.error('Slicer or model widget not found');
        return;
    }
    
    const chartType = modelWidget.dataset.chartType;
    console.log('Model chart type:', chartType);
    console.log('Is model tool:', isModelTool(chartType));
    
    const columns = getModelColumns(modelWidget);
    console.log('Columns found:', columns);
    
    if (columns.length === 0) {
        console.error('No columns found for model widget');
        showAlert('Model has no columns available.', 'warning');
        return;
    }
    
    // Get current selected column
    let currentColumn = null;
    if (window.slicerModelConnections[slicerWidgetId] && window.slicerModelConnections[slicerWidgetId][modelWidgetId]) {
        currentColumn = window.slicerModelConnections[slicerWidgetId][modelWidgetId].selectedColumn;
    }
    if (!currentColumn) {
        currentColumn = columns[0];
    }
    
    // Hide connection overlays
    document.querySelectorAll('.connection-overlay').forEach(overlay => {
        overlay.style.display = 'none';
    });
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center';
    modal.style.zIndex = '9999';
    modal.id = 'slicer-settings-modal';
    modal.dataset.slicerWidgetId = slicerWidgetId;
    modal.dataset.modelWidgetId = modelWidgetId;
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Slicer Settings</h3>
                <button onclick="closeSlicerSettingsModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="mb-4">
                <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Select Column:</label>
                <div class="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2" id="slicer-column-list">
                    ${columns.map(col => `
                        <label class="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer ${col === currentColumn ? 'bg-blue-50 dark:bg-blue-900' : ''}">
                            <input type="radio" name="slicer-column" value="${col}" ${col === currentColumn ? 'checked' : ''} class="slicer-column-radio">
                            <span class="text-sm text-gray-700 dark:text-gray-300">${col}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="flex gap-2 justify-end">
                <button onclick="closeSlicerSettingsModal()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                    Cancel
                </button>
                <button onclick="saveSlicerSettings('${slicerWidgetId}', '${modelWidgetId}')" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                    Save
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Close slicer settings modal
function closeSlicerSettingsModal() {
    const modal = document.getElementById('slicer-settings-modal');
    if (modal) {
        modal.remove();
    }
    document.querySelectorAll('.connection-overlay').forEach(overlay => {
        overlay.style.display = '';
    });
}

// Save slicer settings
function saveSlicerSettings(slicerWidgetId, modelWidgetId) {
    console.log('saveSlicerSettings called:', { slicerWidgetId, modelWidgetId });
    
    // Try multiple ways to find the modal
    let modal = document.getElementById('slicer-settings-modal');
    if (!modal) {
        // Fallback: try to find by class
        modal = document.querySelector('.fixed.inset-0');
    }
    if (!modal) {
        // Another fallback: find modal with slicer settings content
        const modals = document.querySelectorAll('.fixed.inset-0');
        for (let m of modals) {
            if (m.querySelector('input[name="slicer-column"]')) {
                modal = m;
                break;
            }
        }
    }
    
    if (!modal) {
        console.error('Modal not found');
        showAlert('Settings dialog not found. Please try again.', 'error');
        return;
    }
    
    console.log('Modal found:', modal);
    
    // Find selected radio button
    const selectedRadio = modal.querySelector('input[name="slicer-column"]:checked');
    console.log('Selected radio:', selectedRadio);
    
    if (!selectedRadio) {
        // Check if any radio exists
        const allRadios = modal.querySelectorAll('input[name="slicer-column"]');
        console.log('All radios:', allRadios.length);
        if (allRadios.length === 0) {
            showAlert('No columns available in settings.', 'warning');
        } else {
            showAlert('Please select a column.', 'warning');
        }
        return;
    }
    
    const selectedColumn = selectedRadio.value;
    console.log('Selected column:', selectedColumn);
    
    // Store selected column in connection
    if (window.slicerModelConnections[slicerWidgetId] && window.slicerModelConnections[slicerWidgetId][modelWidgetId]) {
        window.slicerModelConnections[slicerWidgetId][modelWidgetId].selectedColumn = selectedColumn;
    }
    
    // Update slicer with selected column
    updateSlicerFromModel(slicerWidgetId, modelWidgetId, selectedColumn);
    
    // Update model filtering
    updateModelFiltering(slicerWidgetId, modelWidgetId);
    
    // Close modal and restore connection overlays
    closeSlicerSettingsModal();
}

// Show slicer settings from header button
function showSlicerSettings(buttonElement) {
    const slicerWidget = buttonElement.closest('.chart-widget');
    if (!slicerWidget) {
        console.error('Slicer widget not found');
        return;
    }
    
    const slicerWidgetId = slicerWidget.dataset.widgetId;
    if (!slicerWidgetId) {
        console.error('Slicer widget ID not found');
        return;
    }
    
    console.log('Looking for connections for slicer ID:', slicerWidgetId, 'Type:', typeof slicerWidgetId);
    console.log('All stored connections:', window.slicerModelConnections);
    console.log('All connection keys:', Object.keys(window.slicerModelConnections));
    
    // Find connected models - check both stored connections and visual connections
    // Try both original format and string format
    let connections = window.slicerModelConnections[slicerWidgetId] || 
                      window.slicerModelConnections[String(slicerWidgetId)] ||
                      window.slicerModelConnections[Number(slicerWidgetId)];
    
    // If no stored connections, try to find visual connections on canvas
    if (!connections || Object.keys(connections).length === 0) {
        console.log('No stored connections found, checking visual connections...');
        
        // Find all canvases (could be multiple pages)
        const canvases = document.querySelectorAll('#designCanvas, [id^="canvas-"]');
        let connectedModels = [];
        
        canvases.forEach(canvas => {
            const svgOverlay = canvas.querySelector('.connection-overlay');
            if (svgOverlay) {
                // Find all path elements
                const paths = svgOverlay.querySelectorAll('path[data-source-widget-id]');
                console.log(`Found ${paths.length} paths in canvas ${canvas.id}`);
                
                paths.forEach(path => {
                    const sourceId = path.dataset.sourceWidgetId;
                    const targetId = path.dataset.targetWidgetId;
                    const connectionType = path.dataset.connectionType;
                    
                    console.log(`Path: sourceId=${sourceId} (${typeof sourceId}), targetId=${targetId}, type=${connectionType}, slicerId=${slicerWidgetId} (${typeof slicerWidgetId})`);
                    
                    // Check if this connection starts from our slicer and is STM type
                    // Compare both as string and as original type
                    const sourceMatches = sourceId === slicerWidgetId || 
                                        sourceId === String(slicerWidgetId) || 
                                        String(sourceId) === String(slicerWidgetId) ||
                                        Number(sourceId) === Number(slicerWidgetId);
                    
                    if (sourceMatches && connectionType === 'stm') {
                        const targetWidget = document.querySelector(`[data-widget-id="${targetId}"]`);
                        console.log('Target widget found:', targetWidget);
                        
                        if (targetWidget) {
                            const targetChartType = targetWidget.dataset.chartType;
                            console.log('Target chart type:', targetChartType, 'isModel:', isModelTool(targetChartType));
                            
                            if (isModelTool(targetChartType)) {
                                connectedModels.push(targetId);
                                
                                // Also ensure it's stored in connections with original slicer ID
                                if (!window.slicerModelConnections[slicerWidgetId]) {
                                    window.slicerModelConnections[slicerWidgetId] = {};
                                }
                                if (!window.slicerModelConnections[slicerWidgetId][targetId]) {
                                    window.slicerModelConnections[slicerWidgetId][targetId] = {
                                        type: 'stm',
                                        columns: []
                                    };
                                }
                                console.log('Connection restored and stored');
                            }
                        }
                    }
                });
            }
        });
        
        if (connectedModels.length > 0) {
            // Use first connected model
            const modelWidgetId = connectedModels[0];
            console.log('Found connected model:', modelWidgetId);
            showSlicerSettingsDialog(slicerWidgetId, modelWidgetId);
            return;
        }
        
        // Still no connections found
        console.error('No connections found for slicer:', slicerWidgetId);
        console.error('Available slicer IDs in connections:', Object.keys(window.slicerModelConnections));
        showAlert('No model connected. Please connect a model first.', 'info');
        return;
    }
    
    // If multiple models connected, show first one (or could show a selection dialog)
    const modelWidgetId = Object.keys(connections)[0];
    console.log('Using stored connection to model:', modelWidgetId);
    showSlicerSettingsDialog(slicerWidgetId, modelWidgetId);
}

// Update model filtering based on slicer selection
function updateModelFiltering(slicerWidgetId, modelWidgetId) {
    const slicerWidget = document.querySelector(`[data-widget-id="${slicerWidgetId}"]`);
    const modelWidget = document.querySelector(`[data-widget-id="${modelWidgetId}"]`);
    
    if (!slicerWidget || !modelWidget) return;
    
    // Get selected values from slicer
    const selectedValues = getSlicerSelectedValues(slicerWidget);
    const columnName = getSlicerColumnName(slicerWidget);
    
    console.log('updateModelFiltering:', { slicerWidgetId, modelWidgetId, selectedValues, columnName });
    
    if (!columnName) {
        console.warn('No column name found for slicer');
        return;
    }
    
    // Get column index from connection
    let columnIndex = null;
    if (window.slicerToModelConnections && window.slicerToModelConnections[slicerWidgetId] && window.slicerToModelConnections[slicerWidgetId][modelWidgetId]) {
        columnIndex = window.slicerToModelConnections[slicerWidgetId][modelWidgetId].columnIndex;
    }
    
    if (columnIndex === null) {
        console.warn('No column index found for slicer connection');
        return;
    }
    
    // Store filter state (empty array means show all)
    if (!window.modelFilters) {
        window.modelFilters = {};
    }
    if (!window.modelFilters[modelWidgetId]) {
        window.modelFilters[modelWidgetId] = {};
    }
    window.modelFilters[modelWidgetId][columnName] = selectedValues.length > 0 ? selectedValues : null;
    
    // Get model widget's data and filter it
    const modelChartDiv = modelWidget.querySelector('[id^="chart-"]');
    if (!modelChartDiv) return;
    
    let modelData = null;
    if (window.widgetData && window.widgetData[modelChartDiv.id]) {
        modelData = JSON.parse(JSON.stringify(window.widgetData[modelChartDiv.id])); // Deep copy
    } else if (window.csvData && window.csvData.length > 0) {
        modelData = JSON.parse(JSON.stringify(window.csvData)); // Deep copy
    }
    
    if (!modelData || modelData.length === 0) return;
    
    // Store original data if not already stored
    if (!window.modelOriginalData) {
        window.modelOriginalData = {};
    }
    
    // Get original data (unfiltered)
    let originalData = null;
    if (window.widgetData && window.widgetData[modelChartDiv.id]) {
        if (!window.modelOriginalData[modelWidgetId]) {
            window.modelOriginalData[modelWidgetId] = JSON.parse(JSON.stringify(window.widgetData[modelChartDiv.id]));
        }
        originalData = window.modelOriginalData[modelWidgetId];
    } else if (window.csvData && window.csvData.length > 0) {
        if (!window.modelOriginalData[modelWidgetId]) {
            window.modelOriginalData[modelWidgetId] = JSON.parse(JSON.stringify(window.csvData));
        }
        originalData = window.modelOriginalData[modelWidgetId];
    }
    
    // Filter data based on selected values
    let filteredModelData = originalData ? JSON.parse(JSON.stringify(originalData)) : modelData;
    
    if (selectedValues.length > 0 && originalData) {
        const colIndex = parseInt(columnIndex);
        if (colIndex >= 0 && colIndex < originalData[0].length) {
            // Filter rows: keep header and rows that match selected values
            const filteredData = [originalData[0]]; // Keep header
            for (let i = 1; i < originalData.length; i++) {
                const val = originalData[i][colIndex];
                if (val !== undefined && val !== null && selectedValues.includes(val.toString().trim())) {
                    filteredData.push(originalData[i]);
                }
            }
            filteredModelData = filteredData;
        }
    } else if (selectedValues.length === 0 && originalData) {
        // No selection - show all data
        filteredModelData = originalData;
    }
    
    // Set filtered data for rendering
    if (window.widgetData) {
        window.widgetData[modelChartDiv.id] = filteredModelData;
    } else {
        window.csvData = filteredModelData;
    }
    
    // Store filter info for renderChart
    if (!window.modelFilteredData) {
        window.modelFilteredData = {};
    }
    window.modelFilteredData[modelWidgetId] = {
        filterValue: selectedValues.length > 0 ? selectedValues : null,
        filterField: columnName
    };
    
    // Re-render model with filtered data
    const modelChartType = modelWidget.dataset.chartType;
    
    if (typeof renderChart === 'function') {
        // Pass filter value and field to renderChart
        const filterValue = selectedValues.length > 0 ? selectedValues : null;
        console.log('updateModelFiltering: Rendering chart with filter:', { filterValue, columnName, filteredDataLength: filteredModelData.length, originalDataLength: originalData ? originalData.length : 0 });
        renderChart(modelChartType, modelChartDiv.id, filterValue, columnName);
    }
}

// Apply filter to table widget
function applyTableFilter(modelWidget, filterColumn, filterValues) {
    const modelChartDiv = modelWidget.querySelector('[id^="chart-"]');
    if (!modelChartDiv || typeof Plotly === 'undefined') {
        console.error('applyTableFilter: Chart div or Plotly not available');
        return;
    }
    
    try {
        const graphDiv = document.getElementById(modelChartDiv.id);
        if (!graphDiv || !graphDiv.data || graphDiv.data.length === 0) {
            console.error('applyTableFilter: Graph div or data not available');
            return;
        }
        
        const tableData = graphDiv.data[0];
        if (tableData.type !== 'table' || !tableData.header || !tableData.cells) {
            console.error('applyTableFilter: Invalid table data');
            return;
        }
        
        // Get original data from widget's stored data
        const widgetId = modelWidget.dataset.widgetId;
        let originalTableData = null;
        let originalData = null;
        
        if (window.tableOriginalData && window.tableOriginalData[widgetId]) {
            // Use stored original data
            originalData = window.tableOriginalData[widgetId];
            originalTableData = originalData[0];
            graphDiv._originalData = originalData;
        } else if (graphDiv._originalData) {
            // Use cached original data
            originalData = graphDiv._originalData;
            originalTableData = originalData[0];
        } else {
            // Store current data as original (deep copy) - fallback
            originalData = JSON.parse(JSON.stringify(graphDiv.data));
            originalTableData = originalData[0];
            graphDiv._originalData = originalData;
            // Also store in global cache
            if (!window.tableOriginalData) {
                window.tableOriginalData = {};
            }
            window.tableOriginalData[widgetId] = originalData;
            console.warn('Original data not found, storing current data as original');
        }
        
        // If no filter values, show all data (restore original)
        if (!filterValues || filterValues.length === 0) {
            console.log('No filter values, showing all data');
            Plotly.newPlot(modelChartDiv.id, originalData, graphDiv.layout || {}, graphDiv.config || {});
            return;
        }
        if (!originalTableData || originalTableData.type !== 'table') {
            console.error('Original table data not available');
            return;
        }
        
        // Get headers from original data
        const headers = Array.isArray(originalTableData.header.values[0]) 
            ? originalTableData.header.values[0] 
            : originalTableData.header.values;
        
        // Find filter column index
        const filterColIndex = headers.indexOf(filterColumn);
        if (filterColIndex === -1) {
            console.error('Filter column not found:', filterColumn, 'Available:', headers);
            return;
        }
        
        // Get all cell values for filter column from ORIGINAL data
        const filterColumnValues = originalTableData.cells.values[filterColIndex] || [];
        
        // Create filtered indices based on original data
        const filteredIndices = [];
        filterColumnValues.forEach((val, idx) => {
            const valStr = String(val);
            if (filterValues.some(fv => String(fv) === valStr)) {
                filteredIndices.push(idx);
            }
        });
        
        console.log('Applying table filter:', { filterColumn, filterValues, totalRows: filterColumnValues.length, filteredRows: filteredIndices.length });
        
        // If no matches, show empty table
        if (filteredIndices.length === 0) {
            // Create empty table with same headers
            const filteredData = [{
                type: 'table',
                header: originalTableData.header,
                cells: {
                    values: headers.map(() => []),
                    fill: originalTableData.cells.fill,
                    font: originalTableData.cells.font
                }
            }];
            
            Plotly.newPlot(modelChartDiv.id, filteredData, graphDiv.layout || {}, graphDiv.config || {});
            return;
        }
        
        // Filter all columns based on filtered indices from ORIGINAL data
        const filteredCells = {};
        Object.keys(originalTableData.cells.values).forEach(key => {
            const colIndex = parseInt(key);
            if (!isNaN(colIndex)) {
                const originalValues = originalTableData.cells.values[colIndex] || [];
                filteredCells[colIndex] = filteredIndices.map(idx => originalValues[idx]);
            }
        });
        
        // Create filtered table data
        const filteredData = [{
            type: 'table',
            header: originalTableData.header,
            cells: {
                values: filteredCells,
                fill: originalTableData.cells.fill,
                font: originalTableData.cells.font
            }
        }];
        
        Plotly.newPlot(modelChartDiv.id, filteredData, graphDiv.layout || {}, graphDiv.config || {});
    } catch (e) {
        console.error('Error applying table filter:', e);
    }
}

// Trigger model filtering for all connected models
function triggerModelFiltering(slicerWidget) {
    const slicerWidgetId = slicerWidget.dataset.widgetId;
    
    // Check new connection system first
    if (window.slicerToModelConnections && window.slicerToModelConnections[slicerWidgetId]) {
        // Update all connected models
        Object.keys(window.slicerToModelConnections[slicerWidgetId]).forEach(modelWidgetId => {
            updateModelFiltering(slicerWidgetId, modelWidgetId);
        });
        return;
    }
    
    // Fallback to old connection system
    if (window.slicerModelConnections && window.slicerModelConnections[slicerWidgetId]) {
        Object.keys(window.slicerModelConnections[slicerWidgetId]).forEach(modelWidgetId => {
            updateModelFiltering(slicerWidgetId, modelWidgetId);
        });
    }
}

// Get selected values from slicer
function getSlicerSelectedValues(slicerWidget) {
    const chartType = slicerWidget.dataset.chartType;
    const values = [];
    
    if (chartType === 'button-slicer') {
        const selectedBtn = slicerWidget.querySelector('.slicer-btn.bg-blue-500');
        if (selectedBtn) {
            values.push(selectedBtn.dataset.value);
        }
    } else if (chartType === 'text-slicer') {
        const input = slicerWidget.querySelector('.slicer-input');
        if (input && input.value) {
            values.push(input.value);
        }
    } else if (chartType === 'list-slicer') {
        const checkboxes = slicerWidget.querySelectorAll('.slicer-checkbox:checked');
        checkboxes.forEach(cb => {
            values.push(cb.value);
        });
    } else if (chartType === 'dropdown-slicer') {
        const dropdown = slicerWidget.querySelector('.slicer-dropdown');
        if (dropdown && dropdown.value) {
            values.push(dropdown.value);
        }
    }
    
    return values;
}

// Get column name from slicer
function getSlicerColumnName(slicerWidget) {
    const slicerWidgetId = slicerWidget.dataset.widgetId;
    
    // Check new connection system first
    if (window.slicerToModelConnections && window.slicerToModelConnections[slicerWidgetId]) {
        const modelConnections = window.slicerToModelConnections[slicerWidgetId];
        const firstModelId = Object.keys(modelConnections)[0];
        if (firstModelId && modelConnections[firstModelId]) {
            return modelConnections[firstModelId].editableName || modelConnections[firstModelId].columnName;
        }
    }
    
    // Fallback to old connection system or DOM
    const chartType = slicerWidget.dataset.chartType;
    
    if (chartType === 'button-slicer') {
        const btn = slicerWidget.querySelector('.slicer-btn');
        return btn ? btn.dataset.column : null;
    } else if (chartType === 'text-slicer') {
        const input = slicerWidget.querySelector('.slicer-input');
        return input ? input.dataset.column : null;
    } else if (chartType === 'list-slicer') {
        const checkbox = slicerWidget.querySelector('.slicer-checkbox');
        return checkbox ? checkbox.dataset.column : null;
    } else if (chartType === 'dropdown-slicer') {
        const dropdown = slicerWidget.querySelector('.slicer-dropdown');
        return dropdown ? dropdown.dataset.column : null;
    }
    
    return null;
}

// Chart types configuration
const chartTypes = [
    { id: 'ai', name: 'MS', icon: 'smart_toy', category: 'AI' },
    { id: 'text-box', name: 'Text Box', icon: 'text_fields', category: 'Basic' },
    { id: 'bar', name: 'Bar Chart', icon: 'bar_chart', category: 'Basic' },
    { id: 'line', name: 'Line Chart', icon: 'show_chart', category: 'Basic' },
    { id: 'area', name: 'Area Chart', icon: 'area_chart', category: 'Basic' },
    { id: 'pie', name: 'Pie Chart', icon: 'pie_chart', category: 'Basic' },
    { id: 'scatter', name: 'Scatter Chart', icon: 'scatter_plot', category: 'Basic' },
    { id: 'histogram', name: 'Histogram', icon: 'bar_chart', category: 'Statistical' },
    { id: 'box', name: 'Box Plot', icon: 'view_in_ar', category: 'Statistical' },
    { id: 'heatmap', name: 'Heatmap', icon: 'grid_on', category: 'Advanced' },
    { id: 'treemap', name: 'Treemap', icon: 'account_tree', category: 'Advanced' },
    { id: 'waterfall', name: 'Waterfall Chart', icon: 'waterfall_chart', category: 'Advanced' },
    { id: 'gauge', name: 'Gauge / KPI', icon: 'speed', category: 'KPI' },
    { id: 'funnel', name: 'Funnel Chart', icon: 'filter_alt', category: 'Advanced' },
    { id: 'radar', name: 'Radar Chart', icon: 'radar', category: 'Advanced' },
    { id: 'combo', name: 'Combo Chart', icon: 'multiline_chart', category: 'Advanced' },
    { id: 'table', name: 'Table', icon: 'table_chart', category: 'Data' },
    { id: 'list', name: 'List', icon: 'list', category: 'Data' },
    { id: 'card', name: 'Card', icon: 'credit_card', category: 'Basic' },
    // Power BI-like components
    { id: 'button-slicer', name: 'Button Slicer', icon: 'radio_button_checked', category: 'Power BI' },
    { id: 'text-slicer', name: 'Text Slicer', icon: 'text_fields', category: 'Power BI' },
    { id: 'list-slicer', name: 'List Slicer', icon: 'list', category: 'Power BI' },
    { id: 'dropdown-slicer', name: 'Dropdown Slicer', icon: 'arrow_drop_down', category: 'Power BI' },
    { id: 'image', name: 'Image', icon: 'image', category: 'Power BI' },
];

// Make chartTypes globally available immediately
if (typeof window !== 'undefined') {
    window.chartTypes = chartTypes;
    console.log('chartTypes made globally available:', chartTypes.length, 'items');
}

// Sample data for charts
const sampleData = {
    Kategori: ["A", "B", "C", "D"],
    Deger: [40, 70, 30, 90],
    Satis: [100, 150, 80, 200]
};

// Make sampleData globally accessible
if (typeof window !== 'undefined') {
    window.sampleData = sampleData;
}

let chartCounter = 0;

// Initialize design canvas
function initDesignCanvas(canvasId = null, toolboxId = 'chartToolbox') {
    console.log('initDesignCanvas called', { canvasId, toolboxId });
    
    // Set canvas to Custom size by default if it's the main canvas
    if (!canvasId || canvasId === 'designCanvas') {
        const canvas = document.getElementById('designCanvas');
        if (canvas && !canvas.dataset.sizeSet) {
            changeCanvasSize('Custom');
            canvas.dataset.sizeSet = 'true';
        }
    }
    console.log('chartTypes:', typeof chartTypes !== 'undefined' ? chartTypes.length : 'undefined');
    
    // Try multiple times to ensure toolbox is rendered
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryRender = () => {
        attempts++;
        console.log(`Attempt ${attempts} to render toolbox...`);
        const toolbox = document.getElementById(toolboxId);
        if (toolbox) {
            console.log('Toolbox found, rendering...');
            renderChartToolbox(toolboxId);
            
            // Setup drag and drop for the specific canvas
            if (canvasId) {
                setupCanvasDragDropForCanvas(canvasId);
                // Add drag listeners to existing chart widgets
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const widgets = canvas.querySelectorAll('.chart-widget');
                    widgets.forEach(widget => {
                        addDatasetDragListeners(widget);
                    });
                }
            } else {
                setupCanvasDragDrop();
                // Add drag listeners to existing chart widgets
                const canvas = document.getElementById('designCanvas') || document.getElementById('designCanvasSaved');
                if (canvas) {
                    const widgets = canvas.querySelectorAll('.chart-widget');
                    widgets.forEach(widget => {
                        addDatasetDragListeners(widget);
                    });
                }
            }
            
            // Show connections by default on page load
            if (typeof showConnections === 'function') {
                setTimeout(() => {
                    showConnections();
                }, 100);
            }
            
            // Ensure grid is disabled by default on page load
            if (typeof gridEnabled !== 'undefined' && gridEnabled) {
                gridEnabled = false;
                const canvas = document.getElementById('designCanvas') || document.getElementById('designCanvasSaved');
                const btn = document.getElementById('gridToggleBtn');
                if (canvas) {
                    canvas.style.backgroundImage = 'none';
                }
                if (btn) {
                    btn.classList.remove('bg-gray-200');
                }
            }
            
            console.log('Design canvas initialized successfully');
        } else {
            console.warn(`Toolbox not found (attempt ${attempts}/${maxAttempts})`);
            if (attempts < maxAttempts) {
                setTimeout(tryRender, 200);
            } else {
                console.error('Failed to find chartToolbox after', maxAttempts, 'attempts');
                // Show error message in toolbox area
                const designSection = document.getElementById('design-empty-section') || document.getElementById('design-saved-section');
                if (designSection) {
                    const toolboxContainer = designSection.querySelector(`#${toolboxId}`);
                    if (toolboxContainer) {
                        toolboxContainer.innerHTML = '<p class="text-xs text-red-500 p-2">Error: Toolbox container not found. Please refresh the page.</p>';
                    }
                }
            }
        }
    };
    
    tryRender();
}

// Setup drag and drop for a specific canvas
function setupCanvasDragDropForCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas not found for drag drop setup:', canvasId);
        return;
    }
    
    console.log('Setting up drag and drop for canvas:', canvasId);
    
    // Remove existing listeners if any
    const newCanvas = canvas.cloneNode(true);
    canvas.parentNode.replaceChild(newCanvas, canvas);
    
    // Setup drag and drop
    setupCanvasDragDropForElement(newCanvas);
}

function setupCanvasDragDropForElement(canvas) {
    if (!canvas) return;
    
    // Initialize rectangle selection for this canvas
    if (typeof initCanvasSelectionForCanvas === 'function') {
        initCanvasSelectionForCanvas(canvas);
    }
    
    let dragOverTimeout = null;
    
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        
        // Throttle background color change for better performance
        if (!dragOverTimeout) {
            dragOverTimeout = setTimeout(() => {
                canvas.style.backgroundColor = '#f0f0f0';
                dragOverTimeout = null;
            }, 50);
        }
    });
    
    canvas.addEventListener('dragleave', (e) => {
        // Only change background if leaving canvas area
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
        const symbolId = e.dataTransfer.getData('symbolId');
        const datasetId = e.dataTransfer.getData('datasetId');
        const isDragging = isDragDropInProgress || window.isDragDropInProgress;
        
        console.log('Drop event - chartType:', chartType, 'symbolId:', symbolId, 'datasetId:', datasetId, 'isDragDropInProgress:', isDragDropInProgress);
        
        // Handle dataset drop on model widget
        if (datasetId) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            
            // Check if dropped on a model widget
            const modelWidget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.chart-widget');
            if (modelWidget && isModelTool(modelWidget.dataset.chartType)) {
                updateModelWidgetWithDataset(modelWidget, datasetId);
                return;
            }
            
            // If not dropped on model, add as new model widget with dataset
            addChartToCanvas('model', x, y, canvas.id, datasetId);
        }
        // Handle chart drop
        else if (chartType && isDragging) {
            console.log('Adding chart via drag-drop:', chartType, 'to canvas:', canvas.id);
            
            // Clear flags IMMEDIATELY before adding chart to prevent duplicate
            isDragDropInProgress = false;
            window.isDragDropInProgress = false;
            
            const rect = canvas.getBoundingClientRect();
            // Account for scroll position
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            addChartToCanvas(chartType, x, y, canvas.id);
            
            // Keep flags cleared to prevent click event
            setTimeout(() => {
                isDragDropInProgress = false;
                window.isDragDropInProgress = false;
            }, 1000);
        } 
        // Handle symbol/shape drop
        else if (symbolId) {
            console.log('Adding symbol via drag-drop:', symbolId, 'to canvas:', canvas.id);
            
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            addSymbolToCanvas(symbolId, x, y, canvas.id);
        } 
        else if (chartType) {
            console.log('Drop ignored - drag not in progress');
        }
    });
    
    // Prevent default drag behavior on canvas
    canvas.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Hide all headers when clicking on canvas (empty area)
    canvas.addEventListener('click', (e) => {
        // Only hide if clicking directly on canvas or its background, not on a widget
        const clickedWidget = e.target.closest('.chart-widget');
        if (!clickedWidget) {
            // Only hide headers within this canvas
            canvas.querySelectorAll('.chart-widget-header').forEach(header => {
                header.style.display = 'none';
                header.classList.add('hidden');
            });
            // Reset padding for all widgets in this canvas
            canvas.querySelectorAll('.chart-widget').forEach(widget => {
                widget.style.padding = '0';
                // Hide background and border for all widgets
                widget.style.backgroundColor = 'transparent';
                widget.style.border = 'none';
                widget.style.boxShadow = 'none';
            });
            // Hide resize handles when clicking outside
            canvas.querySelectorAll('.chart-widget').forEach(widget => {
                if (typeof hideResizeHandles === 'function') {
                    hideResizeHandles(widget);
                }
            });
        }
    });
    
    // Handle Delete key for rectangle selection
    const handleDeleteKey = (e) => {
        // Check if Delete or Backspace key is pressed
        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            // Check if we have selected charts from rectangle selection
            const currentSelectedCharts = window.selectedCharts || [];
            
            if (currentSelectedCharts.length > 0) {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Deleting', currentSelectedCharts.length, 'selected charts/widgets and symbols from canvas:', canvas.id);
                
                // Delete all charts/widgets and symbols in the rectangle selection
                currentSelectedCharts.forEach(chart => {
                    if (chart.element && canvas.contains(chart.element)) {
                        // Check if it's a symbol widget
                        if (chart.element.classList.contains('symbol-widget')) {
                            chart.element.remove();
                        } else {
                            // It's a chart widget
                            const chartType = chart.element.dataset.chartType;
                            
                            // For text-box, just remove the element (no Plotly cleanup needed)
                            if (chartType === 'text-box') {
                                chart.element.remove();
                            } else {
                                // For charts, purge Plotly chart if exists
                                const chartDiv = chart.element.querySelector('[id^="chart-"]');
                                if (chartDiv && typeof Plotly !== 'undefined') {
                                    Plotly.purge(chartDiv);
                                }
                                
                                // Remove the chart widget
                                chart.element.remove();
                            }
                        }
                    }
                });
                
                // Clear selection
                window.selectedCharts = [];
                clearSelectionHighlightForCanvas(canvas);
                
                // Hide selection rectangle
                const selectionRect = canvas.querySelector('#selectionRectangle');
                if (selectionRect) {
                    selectionRect.classList.add('hidden');
                    selectionRect.style.display = 'none';
                }
                
                // Update drill through connections if function exists
                if (typeof updateDrillThroughConnections === 'function') {
                    updateDrillThroughConnections();
                }
            }
        }
    };
    
    // Add delete key listener to canvas
    canvas.addEventListener('keydown', handleDeleteKey);
    
    // Also add listener to document for better reliability
    const documentDeleteHandler = (e) => {
        // Only handle if this canvas is visible and we have selected charts
        const canvasVisible = canvas && canvas.offsetParent !== null;
        const hasSelectedCharts = window.selectedCharts && window.selectedCharts.length > 0;
        
        if (canvasVisible && hasSelectedCharts) {
            // Check if any selected chart belongs to this canvas
            const hasChartsInThisCanvas = window.selectedCharts.some(chart => 
                chart.element && canvas.contains(chart.element)
            );
            
            if (hasChartsInThisCanvas) {
                handleDeleteKey(e);
            }
        }
    };
    
    document.addEventListener('keydown', documentDeleteHandler);
    
    // Store handler for cleanup
    canvas._documentDeleteHandler = documentDeleteHandler;
}

// Initialize rectangle selection for a specific canvas
function initCanvasSelectionForCanvas(canvas) {
    if (!canvas) return;
    
    // Initialize global variables if not already initialized
    if (typeof window.isSelecting === 'undefined') {
        window.isSelecting = false;
    }
    if (typeof window.selectedCharts === 'undefined') {
        window.selectedCharts = [];
    }
    if (typeof window.selectionStartX === 'undefined') {
        window.selectionStartX = 0;
    }
    if (typeof window.selectionStartY === 'undefined') {
        window.selectionStartY = 0;
    }
    if (typeof window.isDraggingSelection === 'undefined') {
        window.isDraggingSelection = false;
    }
    if (typeof window.selectionOffsetX === 'undefined') {
        window.selectionOffsetX = 0;
    }
    if (typeof window.selectionOffsetY === 'undefined') {
        window.selectionOffsetY = 0;
    }
    if (typeof window.originalSelectionLeft === 'undefined') {
        window.originalSelectionLeft = 0;
    }
    if (typeof window.originalSelectionTop === 'undefined') {
        window.originalSelectionTop = 0;
    }
    
    // Make sure selection rectangle exists in this canvas
    let selectionRect = canvas.querySelector('#selectionRectangle');
    if (!selectionRect) {
        selectionRect = document.createElement('div');
        selectionRect.id = 'selectionRectangle';
        selectionRect.className = 'hidden absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none z-40';
        selectionRect.style.display = 'none';
        canvas.appendChild(selectionRect);
    }
    
    // Remove existing listener if any
    if (canvas._rectangleSelectionHandler) {
        canvas.removeEventListener('mousedown', canvas._rectangleSelectionHandler);
    }
    
    // Create handler for this canvas
    canvas._rectangleSelectionHandler = (e) => {
        handleCanvasMouseDownForCanvas(e, canvas);
    };
    
    canvas.addEventListener('mousedown', canvas._rectangleSelectionHandler);
}

// Handle canvas mouse down for specific canvas (adapted from export.js)
function handleCanvasMouseDownForCanvas(e, targetCanvas) {
    if (!targetCanvas) return;
    
    // Use global variables
    const isDraggingSelection = window.isDraggingSelection || false;
    const selectedCharts = window.selectedCharts || [];
    
    // Don't start selection if clicking on a chart widget, its header, or symbol widget
    if (e.target.closest('.chart-widget') || e.target.closest('.chart-widget-header') || e.target.closest('.symbol-widget')) {
        if (isDraggingSelection && selectedCharts.length > 0) {
            return;
        }
        if (!isDraggingSelection) {
            clearSelectionHighlightForCanvas(targetCanvas);
        }
        return;
    }
    
    // Clear previous selection highlight when starting new selection
    clearSelectionHighlightForCanvas(targetCanvas);
    
    // Get selection rectangle for this canvas
    let selectionRect = targetCanvas.querySelector('#selectionRectangle');
    if (!selectionRect) {
        selectionRect = document.createElement('div');
        selectionRect.id = 'selectionRectangle';
        selectionRect.className = 'hidden absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none z-40';
        selectionRect.style.display = 'none';
        targetCanvas.appendChild(selectionRect);
    }
    
    // Check if clicking on selection rectangle (for dragging)
    if (selectionRect && (e.target === selectionRect || e.target.closest('#selectionRectangle'))) {
        window.isDraggingSelection = true;
        const rect = selectionRect.getBoundingClientRect();
        const canvasRect = targetCanvas.getBoundingClientRect();
        window.selectionOffsetX = e.clientX - rect.left;
        window.selectionOffsetY = e.clientY - rect.top;
        
        if (window.originalSelectionLeft === 0 && window.originalSelectionTop === 0) {
            window.originalSelectionLeft = parseFloat(selectionRect.style.left);
            window.originalSelectionTop = parseFloat(selectionRect.style.top);
        }
        
        selectedCharts.forEach(chart => {
            if (chart.originalLeft === undefined || chart.originalTop === undefined) {
                const currentLeft = parseFloat(chart.element.style.left) || 0;
                const currentTop = parseFloat(chart.element.style.top) || 0;
                chart.originalLeft = currentLeft;
                chart.originalTop = currentTop;
            }
        });
        
        const dragHandler = (e) => dragSelectionForCanvas(e, targetCanvas);
        const stopHandler = (e) => stopDragSelectionForCanvas(e, targetCanvas);
        
        targetCanvas.addEventListener('mousemove', dragHandler);
        targetCanvas.addEventListener('mouseup', stopHandler);
        
        targetCanvas._dragSelectionHandler = dragHandler;
        targetCanvas._stopDragSelectionHandler = stopHandler;
        
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    
    // Start new selection
    e.preventDefault();
    e.stopPropagation();
    
    window.originalSelectionLeft = 0;
    window.originalSelectionTop = 0;
    selectedCharts.forEach(chart => {
        chart.originalLeft = undefined;
        chart.originalTop = undefined;
    });
    window.selectedCharts = selectedCharts;
    
    window.isSelecting = true;
    const canvasRect = targetCanvas.getBoundingClientRect();
    
    window.selectionStartX = e.clientX - canvasRect.left + targetCanvas.scrollLeft;
    window.selectionStartY = e.clientY - canvasRect.top + targetCanvas.scrollTop;
    
    selectionRect.style.left = window.selectionStartX + 'px';
    selectionRect.style.top = window.selectionStartY + 'px';
    selectionRect.style.width = '0px';
    selectionRect.style.height = '0px';
    selectionRect.classList.remove('hidden');
    selectionRect.style.display = 'block';
    selectionRect.style.cursor = 'default';
    selectionRect.style.pointerEvents = 'auto';
    
    const updateSelectionWrapper = (e) => updateSelectionForCanvas(e, targetCanvas);
    const endSelectionWrapper = (e) => endSelectionForCanvas(e, targetCanvas);
    
    targetCanvas.addEventListener('mousemove', updateSelectionWrapper);
    targetCanvas.addEventListener('mouseup', endSelectionWrapper);
    
    // Store handlers for cleanup
    targetCanvas._updateSelectionHandler = updateSelectionWrapper;
    targetCanvas._endSelectionHandler = endSelectionWrapper;
}

// Wrapper functions for rectangle selection on specific canvas
function updateSelectionForCanvas(e, targetCanvas) {
    if (!window.isSelecting || !targetCanvas) return;
    
    const selectionRect = targetCanvas.querySelector('#selectionRectangle');
    if (!selectionRect) return;
    
    const canvasRect = targetCanvas.getBoundingClientRect();
    const currentX = e.clientX - canvasRect.left + targetCanvas.scrollLeft;
    const currentY = e.clientY - canvasRect.top + targetCanvas.scrollTop;
    
    const left = Math.min(window.selectionStartX, currentX);
    const top = Math.min(window.selectionStartY, currentY);
    const width = Math.abs(currentX - window.selectionStartX);
    const height = Math.abs(currentY - window.selectionStartY);
    
    selectionRect.style.left = left + 'px';
    selectionRect.style.top = top + 'px';
    selectionRect.style.width = width + 'px';
    selectionRect.style.height = height + 'px';
    
    // Update selected charts
    updateSelectedChartsForCanvas(targetCanvas, left, top, left + width, top + height);
}

function endSelectionForCanvas(e, targetCanvas) {
    if (!window.isSelecting || !targetCanvas) return;
    
    window.isSelecting = false;
    
    const selectionRect = targetCanvas.querySelector('#selectionRectangle');
    if (!selectionRect) return;
    
    // Remove event listeners
    if (targetCanvas._updateSelectionHandler) {
        targetCanvas.removeEventListener('mousemove', targetCanvas._updateSelectionHandler);
        targetCanvas._updateSelectionHandler = null;
    }
    if (targetCanvas._endSelectionHandler) {
        targetCanvas.removeEventListener('mouseup', targetCanvas._endSelectionHandler);
        targetCanvas._endSelectionHandler = null;
    }
    
    const rect = {
        left: parseFloat(selectionRect.style.left),
        top: parseFloat(selectionRect.style.top),
        right: parseFloat(selectionRect.style.left) + parseFloat(selectionRect.style.width),
        bottom: parseFloat(selectionRect.style.top) + parseFloat(selectionRect.style.height)
    };
    updateSelectedChartsForCanvas(targetCanvas, rect.left, rect.top, rect.right, rect.bottom);
    
    if (selectionRect.style.width === '0px' || selectionRect.style.height === '0px') {
        selectionRect.classList.add('hidden');
        selectionRect.style.display = 'none';
    } else {
        selectionRect.style.cursor = 'move';
    }
}

function updateSelectedChartsForCanvas(canvas, left, top, right, bottom) {
    if (!canvas) return;
    
    const selectedCharts = [];
    
    // Include chart widgets
    const widgets = canvas.querySelectorAll('.chart-widget');
    widgets.forEach(widget => {
        const widgetRect = widget.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const widgetLeft = widgetRect.left - canvasRect.left + canvas.scrollLeft;
        const widgetTop = widgetRect.top - canvasRect.top + canvas.scrollTop;
        const widgetRight = widgetLeft + widgetRect.width;
        const widgetBottom = widgetTop + widgetRect.height;
        
        if (widgetLeft < right && widgetRight > left && widgetTop < bottom && widgetBottom > top) {
            selectedCharts.push({
                element: widget,
                originalLeft: parseFloat(widget.style.left) || widgetLeft,
                originalTop: parseFloat(widget.style.top) || widgetTop,
                type: 'chart'
            });
        }
    });
    
    // Include symbol widgets
    const symbolWidgets = canvas.querySelectorAll('.symbol-widget');
    symbolWidgets.forEach(widget => {
        const widgetRect = widget.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const widgetLeft = widgetRect.left - canvasRect.left + canvas.scrollLeft;
        const widgetTop = widgetRect.top - canvasRect.top + canvas.scrollTop;
        const widgetRight = widgetLeft + widgetRect.width;
        const widgetBottom = widgetTop + widgetRect.height;
        
        if (widgetLeft < right && widgetRight > left && widgetTop < bottom && widgetBottom > top) {
            selectedCharts.push({
                element: widget,
                originalLeft: parseFloat(widget.style.left) || widgetLeft,
                originalTop: parseFloat(widget.style.top) || widgetTop,
                type: 'symbol'
            });
        }
    });
    
    window.selectedCharts = selectedCharts;
    
    // Highlight selected charts and symbols
    clearSelectionHighlightForCanvas(canvas);
    highlightSelectedChartsForCanvas(canvas, selectedCharts);
}

// Clear selection highlight for a specific canvas
function clearSelectionHighlightForCanvas(canvas) {
    if (!canvas) return;
    const widgets = canvas.querySelectorAll('.chart-widget, .symbol-widget');
    widgets.forEach(widget => {
        widget.classList.remove('rectangle-selected');
    });
}

// Highlight selected charts and symbols for a specific canvas
function highlightSelectedChartsForCanvas(canvas, selectedCharts) {
    if (!canvas || !selectedCharts) return;
    selectedCharts.forEach(chart => {
        if (chart.element && canvas.contains(chart.element)) {
            chart.element.classList.add('rectangle-selected');
        }
    });
}

function dragSelectionForCanvas(e, targetCanvas) {
    if (!window.isDraggingSelection || !targetCanvas) return;
    
    const selectionRect = targetCanvas.querySelector('#selectionRectangle');
    if (!selectionRect) return;
    
    const selectedCharts = window.selectedCharts || [];
    
    const canvasRect = targetCanvas.getBoundingClientRect();
    const newX = e.clientX - canvasRect.left + targetCanvas.scrollLeft - window.selectionOffsetX;
    const newY = e.clientY - canvasRect.top + targetCanvas.scrollTop - window.selectionOffsetY;
    
    selectionRect.style.left = newX + 'px';
    selectionRect.style.top = newY + 'px';
    
    const currentLeft = parseFloat(selectionRect.style.left);
    const currentTop = parseFloat(selectionRect.style.top);
    
    if (window.originalSelectionLeft === 0 && window.originalSelectionTop === 0) {
        window.originalSelectionLeft = currentLeft;
        window.originalSelectionTop = currentTop;
    }
    
    selectedCharts.forEach(chart => {
        if (chart.originalLeft === undefined || chart.originalTop === undefined) {
            const chartLeft = parseFloat(chart.element.style.left) || 0;
            const chartTop = parseFloat(chart.element.style.top) || 0;
            chart.originalLeft = chartLeft;
            chart.originalTop = chartTop;
        }
    });
    
    const deltaX = currentLeft - window.originalSelectionLeft;
    const deltaY = currentTop - window.originalSelectionTop;
    
    // Update chart positions
    selectedCharts.forEach(chart => {
        if (chart.element && chart.originalLeft !== undefined && chart.originalTop !== undefined) {
            chart.element.style.left = (chart.originalLeft + deltaX) + 'px';
            chart.element.style.top = (chart.originalTop + deltaY) + 'px';
        }
    });
}

function stopDragSelectionForCanvas(e, targetCanvas) {
    if (!window.isDraggingSelection) return;
    
    window.isDraggingSelection = false;
    
    if (targetCanvas._dragSelectionHandler) {
        targetCanvas.removeEventListener('mousemove', targetCanvas._dragSelectionHandler);
        targetCanvas._dragSelectionHandler = null;
    }
    if (targetCanvas._stopDragSelectionHandler) {
        targetCanvas.removeEventListener('mouseup', targetCanvas._stopDragSelectionHandler);
        targetCanvas._stopDragSelectionHandler = null;
    }
    
    window.originalSelectionLeft = 0;
    window.originalSelectionTop = 0;
}

// Render chart toolbox
function renderChartToolbox(toolboxId = 'chartToolbox') {
    console.log('=== renderChartToolbox CALLED ===', toolboxId);
    const toolbox = document.getElementById(toolboxId);
    if (!toolbox) {
        console.error(`${toolboxId} element not found! Retrying in 200ms...`);
        setTimeout(() => renderChartToolbox(toolboxId), 200);
        return;
    }
    
    console.log('Found chartToolbox element');
    console.log('Current toolbox HTML:', toolbox.innerHTML.substring(0, 200));
    
    // Get chartTypes from multiple sources
    let typesToUse = chartTypes;
    if (!typesToUse && typeof window !== 'undefined' && window.chartTypes) {
        typesToUse = window.chartTypes;
        console.log('Using window.chartTypes');
    }
    
    // Check if chartTypes is available
    if (typeof typesToUse === 'undefined' || !typesToUse || typesToUse.length === 0) {
        console.error('chartTypes is not available!', typeof typesToUse);
        toolbox.innerHTML = '<p class="text-xs text-red-500 p-2">Error: Chart types not loaded. Please refresh the page.</p>';
        return;
    }
    
    console.log('chartTypes available:', typesToUse.length, 'items');
    
    // Remove loading message FIRST - be aggressive
    const loadingMsg = toolbox.querySelector('#toolbox-loading');
    if (loadingMsg) {
        console.log('Removing loading message element...');
        loadingMsg.remove();
    }
    
    // Also check for "Loading tools..." text and remove it
    if (toolbox.innerHTML.includes('Loading tools')) {
        console.log('Found "Loading tools" text, clearing entire toolbox...');
    }
    
    // Clear toolbox completely
    toolbox.innerHTML = '';
    console.log('Toolbox cleared, starting render...');
    
    // Group by category
    const categories = {};
    typesToUse.forEach(chart => {
        if (!categories[chart.category]) {
            categories[chart.category] = [];
        }
        categories[chart.category].push(chart);
    });
    
    console.log('Categories found:', Object.keys(categories));
    console.log('Total categories:', Object.keys(categories).length);
    
    // Render each category
    let totalButtons = 0;
    Object.keys(categories).forEach(category => {
        console.log('Rendering category:', category, 'with', categories[category].length, 'items');
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'mb-4';
        
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'toolbox-category-title text-xs font-semibold text-text-muted uppercase mb-2 px-2 hidden';
        categoryTitle.textContent = category;
        categoryDiv.appendChild(categoryTitle);
        
        categories[category].forEach(chart => {
            const chartBtn = document.createElement('button');
            // Add orange background for slicers
            const isSlicer = isSlicerTool(chart.id);
            const isModel = isModelTool(chart.id);
            let btnClasses = 'toolbox-btn w-full flex items-center justify-center gap-2 px-2 py-2 text-sm text-text-default rounded-md transition-colors mb-1';
            
            if (isSlicer) {
                btnClasses += ' bg-orange-100 hover:bg-orange-200 border border-orange-300';
            } else if (isModel) {
                btnClasses += ' hover:bg-gray-100';
            } else {
                btnClasses += ' hover:bg-gray-100';
            }
            
            chartBtn.className = btnClasses;
            chartBtn.draggable = true;
            chartBtn.dataset.chartType = chart.id;
            chartBtn.title = chart.name; // Tooltip için
            chartBtn.innerHTML = `
                <span class="material-symbols-outlined text-4xl flex-shrink-0 ${isSlicer ? 'text-orange-600' : ''}">${chart.icon}</span>
                <span class="toolbox-btn-text text-xs hidden">${chart.name}</span>
            `;
            
            let wasDragged = false;
            let mouseDownTime = 0;
            let mouseDownX = 0;
            let mouseDownY = 0;
            
            // Track mouse down
            chartBtn.addEventListener('mousedown', (e) => {
                wasDragged = false;
                mouseDownTime = Date.now();
                mouseDownX = e.clientX;
                mouseDownY = e.clientY;
            });
            
            // Track mouse move to detect drag
            chartBtn.addEventListener('mousemove', (e) => {
                if (mouseDownTime > 0) {
                    const distance = Math.sqrt(
                        Math.pow(e.clientX - mouseDownX, 2) + 
                        Math.pow(e.clientY - mouseDownY, 2)
                    );
                    // If mouse moved more than 5px, consider it a drag
                    if (distance > 5) {
                        wasDragged = true;
                    }
                }
            });
            
            // Click to add (only if NOT dragged)
            chartBtn.addEventListener('click', (e) => {
                // If drag-drop is in progress, ignore click completely
                if (isDragDropInProgress || window.isDragDropInProgress) {
                    console.log('Click ignored - drag in progress');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                // Wait a bit to check if drag happened
                setTimeout(() => {
                    // Double check drag status
                    if (isDragDropInProgress || window.isDragDropInProgress) {
                        console.log('Click ignored - drag in progress (delayed check)');
                        return;
                    }
                    
                    if (!wasDragged && mouseDownTime > 0) {
                        const clickDuration = Date.now() - mouseDownTime;
                        // Only add if it was a quick click (less than 300ms)
                        if (clickDuration < 300) {
                            console.log('Adding chart via click:', chart.id);
                            addChartToCanvas(chart.id);
                        }
                    }
                    // Reset
                    wasDragged = false;
                    mouseDownTime = 0;
                }, 100);
            });
            
            // Drag start - mark as dragged and prevent click
            chartBtn.addEventListener('dragstart', (e) => {
                wasDragged = true;
                isDragDropInProgress = true; // Set global flag
                window.isDragDropInProgress = true; // Also set global
                mouseDownTime = 0; // Reset to prevent click
                e.dataTransfer.setData('chartType', chart.id);
                e.dataTransfer.effectAllowed = 'copy';
                chartBtn.style.opacity = '0.5';
                console.log('Drag started for:', chart.id, 'isDragDropInProgress:', isDragDropInProgress);
            });
            
            chartBtn.addEventListener('dragend', (e) => {
                chartBtn.style.opacity = '1';
                console.log('Drag ended for:', chart.id);
                // Reset after a delay to ensure click doesn't fire
                setTimeout(() => {
                    wasDragged = false;
                    mouseDownTime = 0;
                    isDragDropInProgress = false; // Clear global flag
                    window.isDragDropInProgress = false; // Also clear global
                    console.log('Drag flags cleared after dragend');
                }, 500);
            });
            
            // Also prevent click if mouseup happens after drag
            chartBtn.addEventListener('mouseup', () => {
                if (wasDragged) {
                    wasDragged = false;
                    mouseDownTime = 0;
                }
            });
            
            categoryDiv.appendChild(chartBtn);
            totalButtons++;
        });
        
        toolbox.appendChild(categoryDiv);
        console.log('Category', category, 'added to toolbox');
    });
    
    const finalButtonCount = toolbox.querySelectorAll('button').length;
    console.log('=== TOOLBOX RENDERING COMPLETE ===');
    console.log('Categories rendered:', Object.keys(categories).length);
    console.log('Total buttons added:', finalButtonCount);
    console.log('Toolbox innerHTML length:', toolbox.innerHTML.length);
    
    if (finalButtonCount === 0) {
        console.error('ERROR: No buttons were added to toolbox!');
        console.error('chartTypes:', chartTypes);
        console.error('categories:', categories);
        toolbox.innerHTML = '<p class="text-xs text-red-500 p-2">Error: Failed to render tools. Please refresh the page.</p>';
    } else {
        console.log('SUCCESS: Toolbox rendered with', finalButtonCount, 'buttons');
        // Double check - if still showing loading, force clear
        const stillLoading = toolbox.querySelector('#toolbox-loading');
        if (stillLoading) {
            console.log('Still has loading element, removing...');
            stillLoading.remove();
        }
        
        // Panel durumunu kontrol et ve başlangıçta daraltılmış modda ol
        const panelId = toolboxId === 'chartToolbox' ? 'toolboxPanel' : 'toolboxPanelSaved';
        const panel = document.getElementById(panelId);
        if (panel && !panel.classList.contains('expanded')) {
            // Daraltılmış modda - metinleri gizle
            toolbox.querySelectorAll('.toolbox-btn-text').forEach(text => {
                text.classList.add('hidden');
            });
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.classList.remove('justify-start');
                btn.classList.add('justify-center');
            });
            toolbox.querySelectorAll('.toolbox-category-title').forEach(title => {
                title.classList.add('hidden');
            });
        }
    }
}

// Toggle toolbox panel (daralt/genişlet)
function toggleToolbox() {
    const panel = document.getElementById('toolboxPanel');
    const toggleBtn = document.getElementById('toolboxToggle');
    const header = document.getElementById('toolboxHeader');
    const toolbox = document.getElementById('chartToolbox');
    
    if (!panel) return;
    
    const isExpanded = panel.classList.contains('expanded');
    
    // Tooltip'leri kaldır
    if (typeof hideTooltip === 'function') {
        hideTooltip();
    }
    
    if (isExpanded) {
        // Daralt - sadece simgeler
        panel.classList.remove('expanded');
        panel.classList.remove('w-64');
        panel.classList.add('w-16');
        toggleBtn.querySelector('span').textContent = 'chevron_right';
        toggleBtn.title = 'Genişlet';
        header.classList.add('hidden');
        
        // Buton metinlerini gizle
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn-text').forEach(text => {
                text.classList.add('hidden');
            });
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.classList.remove('justify-start');
                btn.classList.add('justify-center');
            });
            // Category başlıklarını gizle
            toolbox.querySelectorAll('.toolbox-category-title').forEach(title => {
                title.classList.add('hidden');
            });
        }
        
        // Tooltip event'lerini ekle
        setupToolboxTooltips('chartToolbox');
    } else {
        // Genişlet - simgeler + isimler
        panel.classList.add('expanded');
        panel.classList.remove('w-16');
        panel.classList.add('w-64');
        toggleBtn.querySelector('span').textContent = 'chevron_left';
        toggleBtn.title = 'Daralt';
        header.classList.remove('hidden');
        
        // Buton metinlerini göster
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn-text').forEach(text => {
                text.classList.remove('hidden');
            });
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.classList.remove('justify-center');
                btn.classList.add('justify-start');
            });
            // Category başlıklarını göster
            toolbox.querySelectorAll('.toolbox-category-title').forEach(title => {
                title.classList.remove('hidden');
            });
        }
        
        // Tooltip event'lerini kaldır
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.removeEventListener('mouseenter', btn._tooltipHandler);
                btn._tooltipHandler = null;
            });
        }
    }
}

// Toggle toolbox panel (saved canvas için)
function toggleToolboxSaved() {
    const panel = document.getElementById('toolboxPanelSaved');
    const toggleBtn = document.getElementById('toolboxToggleSaved');
    const header = document.getElementById('toolboxHeaderSaved');
    const toolbox = document.getElementById('chartToolboxSaved');
    
    if (!panel) return;
    
    const isExpanded = panel.classList.contains('expanded');
    
    // Tooltip'leri kaldır
    if (typeof hideTooltip === 'function') {
        hideTooltip();
    }
    
    if (isExpanded) {
        // Daralt - sadece simgeler
        panel.classList.remove('expanded');
        panel.classList.remove('w-64');
        panel.classList.add('w-16');
        toggleBtn.querySelector('span').textContent = 'chevron_right';
        toggleBtn.title = 'Genişlet';
        header.classList.add('hidden');
        
        // Buton metinlerini gizle
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn-text').forEach(text => {
                text.classList.add('hidden');
            });
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.classList.remove('justify-start');
                btn.classList.add('justify-center');
            });
            // Category başlıklarını gizle
            toolbox.querySelectorAll('.toolbox-category-title').forEach(title => {
                title.classList.add('hidden');
            });
        }
        
        // Tooltip event'lerini ekle
        setupToolboxTooltips('chartToolboxSaved');
    } else {
        // Genişlet - simgeler + isimler
        panel.classList.add('expanded');
        panel.classList.remove('w-16');
        panel.classList.add('w-64');
        toggleBtn.querySelector('span').textContent = 'chevron_left';
        toggleBtn.title = 'Daralt';
        header.classList.remove('hidden');
        
        // Buton metinlerini göster
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn-text').forEach(text => {
                text.classList.remove('hidden');
            });
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.classList.remove('justify-center');
                btn.classList.add('justify-start');
            });
            // Category başlıklarını göster
            toolbox.querySelectorAll('.toolbox-category-title').forEach(title => {
                title.classList.remove('hidden');
            });
        }
        
        // Tooltip event'lerini kaldır
        if (toolbox) {
            toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
                btn.removeEventListener('mouseenter', btn._tooltipHandler);
                btn._tooltipHandler = null;
            });
        }
    }
}

// Toolbox tooltip'lerini ayarla
function setupToolboxTooltips(toolboxId) {
    const toolbox = document.getElementById(toolboxId);
    if (!toolbox) return;
    
    toolbox.querySelectorAll('.toolbox-btn').forEach(btn => {
        const text = btn.getAttribute('title') || btn.querySelector('.toolbox-btn-text')?.textContent || '';
        if (text && !btn._tooltipHandler) {
            btn._tooltipHandler = () => {
                const panelId = toolboxId === 'chartToolbox' ? 'toolboxPanel' : 'toolboxPanelSaved';
                const panel = document.getElementById(panelId);
                if (panel && !panel.classList.contains('expanded')) {
                    if (typeof showTooltip === 'function') {
                        showTooltip(btn, text, 'left');
                    }
                }
            };
            btn.addEventListener('mouseenter', btn._tooltipHandler);
        }
    });
}

// Make renderChartToolbox globally available
if (typeof window !== 'undefined') {
    window.renderChartToolbox = renderChartToolbox;
    window.chartTypes = chartTypes;
    window.toggleToolbox = toggleToolbox;
    window.toggleToolboxSaved = toggleToolboxSaved;
    window.setupToolboxTooltips = setupToolboxTooltips;
    console.log('Made renderChartToolbox and chartTypes globally available');
}

// Auto-render when design section becomes visible
(function() {
    function tryRenderToolbox() {
        const toolbox = document.getElementById('chartToolbox');
        if (!toolbox) {
            console.log('Toolbox not found yet, retrying...');
            setTimeout(tryRenderToolbox, 100);
            return;
        }
        
        // Check if already rendered
        const hasButtons = toolbox.querySelectorAll('button').length > 0;
        const hasLoading = toolbox.querySelector('#toolbox-loading');
        
        if (hasButtons) {
            console.log('Toolbox already rendered');
            return;
        }
        
        if (hasLoading || toolbox.innerHTML.includes('Loading tools')) {
            console.log('Loading message found, rendering toolbox...');
            if (typeof renderChartToolbox === 'function') {
                renderChartToolbox();
            } else {
                console.error('renderChartToolbox function not found!');
                setTimeout(tryRenderToolbox, 200);
            }
        }
    }
    
    // Watch for design section visibility
    function setupDesignSectionWatcher() {
        const designSection = document.getElementById('design-section');
        if (designSection) {
            const observer = new MutationObserver(() => {
                const isVisible = !designSection.classList.contains('hidden');
                if (isVisible) {
                    console.log('Design section became visible, rendering toolbox...');
                    setTimeout(tryRenderToolbox, 100);
                }
            });
            observer.observe(designSection, { attributes: true, attributeFilter: ['class'] });
            
            // Check if already visible
            if (!designSection.classList.contains('hidden')) {
                setTimeout(tryRenderToolbox, 200);
            }
        } else {
            setTimeout(setupDesignSectionWatcher, 100);
        }
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(tryRenderToolbox, 300);
            setupDesignSectionWatcher();
        });
    } else {
        setTimeout(tryRenderToolbox, 300);
        setupDesignSectionWatcher();
    }
    
    // Also try periodically as fallback
    setInterval(() => {
        const toolbox = document.getElementById('chartToolbox');
        if (toolbox) {
            const hasButtons = toolbox.querySelectorAll('button').length > 0;
            const hasLoading = toolbox.querySelector('#toolbox-loading');
            const designSection = document.getElementById('design-section');
            const isDesignVisible = designSection && !designSection.classList.contains('hidden');
            
            if (isDesignVisible && !hasButtons && hasLoading && typeof renderChartToolbox === 'function') {
                console.log('Fallback: Rendering toolbox...');
                renderChartToolbox();
            }
        }
    }, 1000);
})();

// Setup canvas drag and drop
function setupCanvasDragDrop() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    let dragOverTimeout = null;
    
    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        
        // Throttle background color change for better performance
        if (!dragOverTimeout) {
            dragOverTimeout = setTimeout(() => {
                canvas.style.backgroundColor = '#f0f0f0';
                dragOverTimeout = null;
            }, 50);
        }
    });
    
    canvas.addEventListener('dragleave', (e) => {
        // Only change background if leaving canvas area
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
        const symbolId = e.dataTransfer.getData('symbolId');
        const datasetId = e.dataTransfer.getData('datasetId');
        
        // Handle dataset drop on any chart widget
        if (datasetId) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            
            // Check if dropped on any chart widget
            const chartWidget = document.elementFromPoint(e.clientX, e.clientY)?.closest('.chart-widget');
            if (chartWidget) {
                // Update existing chart with dataset
                updateChartWithDataset(chartWidget, datasetId);
                return;
            }
            
            // If not dropped on any chart, add as new model widget with dataset
            addChartToCanvas('model', x, y, canvas.id, datasetId);
        }
        else if (chartType && isDragDropInProgress) {
            console.log('Adding chart via drag-drop:', chartType);
            const rect = canvas.getBoundingClientRect();
            // Account for scroll position
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            addChartToCanvas(chartType, x, y);
            
            // Clear flag after a delay to prevent click event
            setTimeout(() => {
                isDragDropInProgress = false;
            }, 300);
        }
        else if (symbolId) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left + canvas.scrollLeft;
            const y = e.clientY - rect.top + canvas.scrollTop;
            addSymbolToCanvas(symbolId, x, y, canvas.id);
        }
    });
    
    // Prevent default drag behavior on canvas
    canvas.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    
    // Hide all headers when clicking on canvas (empty area)
    canvas.addEventListener('click', (e) => {
        // Only hide if clicking directly on canvas or its background, not on a widget
        const clickedWidget = e.target.closest('.chart-widget');
        if (!clickedWidget) {
            document.querySelectorAll('.chart-widget-header').forEach(header => {
                header.style.display = 'none';
                header.classList.add('hidden');
            });
            // Reset padding for all widgets
            document.querySelectorAll('.chart-widget').forEach(widget => {
                widget.style.padding = '0';
                // Hide background and border for all widgets
                widget.style.backgroundColor = 'transparent';
                widget.style.border = 'none';
                widget.style.boxShadow = 'none';
            });
            // Hide resize handles when clicking outside
            document.querySelectorAll('.chart-widget').forEach(widget => {
                hideResizeHandles(widget);
            });
        }
    });
    
    // Handle Delete key press to delete selected chart or rectangle selection
    canvas.addEventListener('keydown', (e) => {
        // Check if Delete or Backspace key is pressed
        if (e.key === 'Delete' || e.key === 'Backspace') {
            // IMPORTANT: Don't delete widget if user is editing text-box content
            // Check if the active element is a text-box content (user is typing)
            const activeElement = document.activeElement;
            if (activeElement && activeElement.classList.contains('text-box-content')) {
                // User is editing text, let normal text deletion work
                return; // Don't prevent default, allow normal text editing
            }
            
            // Prevent default behavior (like going back in browser)
            e.preventDefault();
            e.stopPropagation();
            
            // First check if there's a rectangle selection with selected charts/widgets
            const rectangleSelectedCharts = window.selectedCharts || (typeof selectedCharts !== 'undefined' ? selectedCharts : []);
            if (rectangleSelectedCharts && rectangleSelectedCharts.length > 0) {
                // Delete all charts/widgets in the rectangle selection (including text-box)
                rectangleSelectedCharts.forEach(chart => {
                    if (chart.element) {
                        // Check if it's a text-box or regular chart
                        const chartType = chart.element.dataset.chartType;
                        if (chartType === 'text-box') {
                            // For text-box, just remove the element
                            chart.element.remove();
                        } else {
                            // For charts, use deleteChartWidget which handles Plotly cleanup
                            deleteChartWidget(chart.element);
                        }
                    }
                });
                
                // Clear selection
                if (window.selectedCharts) {
                    window.selectedCharts = [];
                }
                if (typeof selectedCharts !== 'undefined') {
                    selectedCharts = [];
                }
                // Clear selection highlight
                if (typeof clearSelectionHighlight === 'function') {
                    clearSelectionHighlight();
                }
                if (window.selectionRectangle || (typeof selectionRectangle !== 'undefined' && selectionRectangle)) {
                    const rect = window.selectionRectangle || selectionRectangle;
                    if (rect) {
                        rect.classList.add('hidden');
                        rect.style.display = 'none';
                    }
                }
                return;
            }
            
            // If no rectangle selection, find the currently selected/visible chart widget
            // Check for visible headers first
            const visibleHeaders = Array.from(document.querySelectorAll('.chart-widget-header')).filter(header => {
                return header.style.display !== 'none' && !header.classList.contains('hidden');
            });
            
            if (visibleHeaders.length > 0) {
                // Delete the chart with visible header
                const chartWidget = visibleHeaders[0].closest('.chart-widget');
                if (chartWidget) {
                    const chartType = chartWidget.dataset.chartType;
                    // Don't delete text-box if user is editing it
                    if (chartType === 'text-box') {
                        const textBoxContent = chartWidget.querySelector('.text-box-content');
                        if (textBoxContent === activeElement) {
                            // User is editing text, don't delete widget
                            return;
                        }
                        // For text-box, just remove the element
                        chartWidget.remove();
                    } else {
                        deleteChartWidget(chartWidget);
                    }
                }
            } else {
                // If no visible header, check for text-box widgets that might be selected (have focus or are clicked)
                const textBoxWidgets = Array.from(document.querySelectorAll('.chart-widget[data-chart-type="text-box"]'));
                const selectedTextBox = textBoxWidgets.find(widget => {
                    const content = widget.querySelector('.text-box-content');
                    // Don't delete if user is actively editing
                    if (content === activeElement) {
                        return false; // User is editing, don't select for deletion
                    }
                    return content && widget.style.zIndex === '1000';
                });
                
                if (selectedTextBox) {
                    selectedTextBox.remove();
                }
            }
        }
    });
    
    // Make canvas focusable for keyboard events
    canvas.setAttribute('tabindex', '0');
}

// Add chart to canvas
function addChartToCanvas(chartType, x = null, y = null, canvasId = null, datasetId = null) {
    // Determine which canvas to use based on current page
    if (!canvasId) {
        // Check if we're in saved canvas section
        const savedSection = document.getElementById('design-saved-section');
        const isEmptySection = document.getElementById('design-empty-section');
        
        if (savedSection && !savedSection.classList.contains('hidden')) {
            // We're in saved canvas section
            if (window.currentPageIdSaved && window.pagesSaved && window.pagesSaved.length > 0) {
                const currentPage = window.pagesSaved.find(p => p.id === window.currentPageIdSaved);
                if (currentPage) {
                    canvasId = currentPage.canvasId;
                } else {
                    canvasId = 'designCanvasSaved';
                }
            } else {
                canvasId = 'designCanvasSaved';
            }
        } else if (isEmptySection && !isEmptySection.classList.contains('hidden')) {
            // We're in empty canvas section
            if (currentPageId && pages.length > 0) {
                const currentPage = pages.find(p => p.id === currentPageId);
                if (currentPage) {
                    canvasId = currentPage.canvasId;
                } else {
                    canvasId = 'designCanvas';
                }
            } else {
                canvasId = 'designCanvas';
            }
        } else {
            // Fallback: try to find visible canvas
            const visibleCanvas = document.querySelector('[id^="canvas-"]:not([style*="display: none"]), #designCanvas:not([style*="display: none"]), #designCanvasSaved:not([style*="display: none"])');
            if (visibleCanvas) {
                canvasId = visibleCanvas.id;
            } else {
                canvasId = 'designCanvas';
            }
        }
    }
    
    chartCounter++;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas not found:', canvasId);
        // Try fallback canvas
        const fallbackCanvas = document.getElementById('designCanvas') || document.getElementById('designCanvasSaved');
        if (fallbackCanvas) {
            console.log('Using fallback canvas:', fallbackCanvas.id);
            canvas = fallbackCanvas;
        } else {
            console.error('No canvas found at all!');
            return;
        }
    }
    
    // Create chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-widget mb-4'; // Removed bg-surface-light, border, rounded-lg, shadow-md for transparent background
    chartContainer.style.position = 'absolute';
    // Adjust width and height for text-box
    if (chartType === 'text-box') {
        chartContainer.style.width = '300px';
        chartContainer.style.height = 'auto';
        chartContainer.style.minHeight = 'auto';
    } else {
        chartContainer.style.width = '400px';
        chartContainer.style.height = '300px';
        chartContainer.style.minHeight = '300px';
        chartContainer.style.minWidth = '200px';
    }
    chartContainer.style.cursor = 'pointer';
    chartContainer.style.padding = '0';
    chartContainer.style.overflow = 'visible'; // Allow resize handles to be visible outside container
    chartContainer.draggable = false; // Prevent duplicate on drag
    
    // Initially hide background and border - show only when clicked
    chartContainer.style.backgroundColor = 'transparent';
    chartContainer.style.border = 'none';
    chartContainer.style.boxShadow = 'none';
    
    if (x !== null && y !== null) {
        chartContainer.style.left = `${x}px`;
        chartContainer.style.top = `${y}px`;
    } else {
        // Center or grid position
        const existingCharts = canvas.querySelectorAll('.chart-widget');
        const row = Math.floor(existingCharts.length / 3);
        const col = existingCharts.length % 3;
        chartContainer.style.left = `${col * 420 + 20}px`;
        chartContainer.style.top = `${row * 320 + 20}px`;
    }
    
    // Generate widget ID for drill through
    const widgetId = generateWidgetId();
    chartContainer.dataset.widgetId = widgetId;
    chartContainer.dataset.chartType = chartType;
    if (datasetId) {
        chartContainer.dataset.datasetId = datasetId;
    }
    
    // Count how many widgets of the same type exist in this canvas (for model and slicer only)
    let widgetName = chartTypes.find(c => c.id === chartType)?.name || chartType;
    if (isModelTool(chartType) || isSlicerTool(chartType)) {
        const sameTypeWidgets = canvas.querySelectorAll(`.chart-widget[data-chart-type="${chartType}"]`);
        const count = sameTypeWidgets.length + 1; // +1 for the current widget being added
        
        if (count > 1) {
            widgetName = `${widgetName} ${count}`;
        }
    }
    
    // Connection points removed - will use different approach later
    // if (isSlicerTool(chartType) || isModelTool(chartType)) {
    //     addConnectionPoints(chartContainer, chartType);
    // }
    
    // Chart header - hidden by default
    const header = document.createElement('div');
    header.className = 'chart-widget-header hidden flex items-center justify-between p-4 pb-2 border-b border-border-light';
    header.style.display = 'none'; // Hidden by default
    header.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-lg text-primary-brand">${chartTypes.find(c => c.id === chartType)?.icon || 'bar_chart'}</span>
            <span class="widget-name-display text-sm font-semibold text-text-default" data-widget-id="${widgetId}">${widgetName}</span>
        </div>
        <div class="flex gap-1">
            ${isSlicerTool(chartType) ? `
            <button onclick="showSlicerSettings(this)" class="p-1 text-text-muted hover:text-primary-brand" title="Slicer Settings">
                <span class="material-symbols-outlined text-sm">settings</span>
            </button>
            ` : chartType !== 'button-slicer' && chartType !== 'text-slicer' && chartType !== 'list-slicer' && chartType !== 'dropdown-slicer' ? `
            <button onclick="editChartSettings(this)" class="p-1 text-text-muted hover:text-primary-brand" title="Edit Settings">
                <span class="material-symbols-outlined text-sm">settings</span>
            </button>
            ${isModelTool(chartType) ? `
            <button onclick="showConnectionModal(this)" class="p-1 text-text-muted hover:text-primary-brand" title="Connections">
                <span class="material-symbols-outlined text-sm">link</span>
            </button>
            ` : ''}
            ` : ''}
            <button onclick="deleteChart(this)" class="p-1 text-text-muted hover:text-status-failed" title="Delete">
                <span class="material-symbols-outlined text-sm">delete</span>
            </button>
        </div>
    `;
    
    // Chart content
    const chartDiv = document.createElement('div');
    chartDiv.id = `chart-${chartCounter}`;
    chartDiv.style.position = 'relative';
    chartDiv.style.boxSizing = 'border-box';
    chartDiv.style.overflow = 'hidden';
    chartDiv.style.zIndex = '1'; // Lower z-index so resize handles appear on top
    chartDiv.style.backgroundColor = 'transparent'; // Make chart div background transparent
    // Adjust dimensions for text-box and python
    if (chartType === 'text-box') {
        // Text-box should fill container but leave space for resize handles
        chartDiv.style.width = 'calc(100% - 20px)';
        chartDiv.style.height = 'calc(100% - 24px)';
        chartDiv.style.minWidth = 'calc(100% - 20px)';
        chartDiv.style.minHeight = 'calc(100% - 24px)';
        chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles
    } else if (chartType === 'python') {
        // Python widget should fill container but leave space for resize handles
        chartDiv.style.width = 'calc(100% - 20px)';
        chartDiv.style.height = 'calc(100% - 24px)';
        chartDiv.style.minWidth = 'calc(100% - 20px)';
        chartDiv.style.minHeight = 'calc(100% - 24px)';
        chartDiv.style.margin = '10px 10px 14px 10px';
    } else {
        // Chart div should be smaller than container to leave space for resize handles
        // Resize handles are positioned at -10px (top/sides) and -14px (bottom), so we add margin to keep chart content inside
        chartDiv.style.width = 'calc(100% - 20px)';
        chartDiv.style.height = 'calc(100% - 24px)'; // More space at bottom for lower handles
        chartDiv.style.minWidth = 'calc(100% - 20px)';
        chartDiv.style.minHeight = 'calc(100% - 24px)';
        chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles (top, right, bottom, left)
    }
    
    chartContainer.appendChild(header);
    chartContainer.appendChild(chartDiv);
    canvas.appendChild(chartContainer);
    
    // Add drag and drop event listeners for dataset drops
    chartContainer.addEventListener('dragover', (e) => {
        // Check if dragging a dataset
        if (e.dataTransfer.types.includes('datasetId') || e.dataTransfer.types.includes('text/plain')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            // Scale up chart to indicate drop target
            chartContainer.style.transform = 'scale(1.05)';
            chartContainer.style.transition = 'transform 0.2s ease';
            chartContainer.style.zIndex = '1000';
        }
    });
    
    chartContainer.addEventListener('dragleave', (e) => {
        // Only reset if we're actually leaving the chart container
        const relatedTarget = e.relatedTarget;
        if (!chartContainer.contains(relatedTarget)) {
            chartContainer.style.transform = 'scale(1)';
            chartContainer.style.zIndex = '';
        }
    });
    
    chartContainer.addEventListener('drop', (e) => {
        const datasetId = e.dataTransfer.getData('datasetId');
        if (datasetId) {
            e.preventDefault();
            e.stopPropagation();
            chartContainer.style.transform = 'scale(1)';
            chartContainer.style.zIndex = '';
            
            // Update chart with dataset
            updateChartWithDataset(chartContainer, datasetId);
        }
    });
    
    // Add resize handles (Power BI tarzı küçük çizgiler)
    addResizeHandles(chartContainer, chartDiv);
    
    // Add drag and drop event listeners for dataset drops
    addDatasetDragListeners(chartContainer);
    
    // Update chart div dimensions to match container after appending
    // This ensures the chart div has the correct initial size and fits within resize handles
    setTimeout(() => {
        if (chartType !== 'text-box' && chartType !== 'python') {
            // Chart div should be smaller than container to leave space for resize handles
            // Resize handles are positioned at -10px (top/sides) and -14px (bottom), so we use calc to keep chart content inside
            chartDiv.style.width = 'calc(100% - 20px)';
            chartDiv.style.height = 'calc(100% - 24px)'; // More space at bottom for lower handles
            chartDiv.style.minWidth = 'calc(100% - 20px)';
            chartDiv.style.minHeight = 'calc(100% - 24px)';
            chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles (top, right, bottom, left)
            
            // Ensure container has explicit height (not just minHeight)
            if (!chartContainer.style.height || chartContainer.style.height === 'auto') {
                const containerHeight = parseFloat(chartContainer.style.minHeight) || 300;
                chartContainer.style.height = containerHeight + 'px';
            }
            
            // Resize Plotly chart after initial render
            if (typeof Plotly !== 'undefined') {
                setTimeout(() => {
                    const plotlyChart = chartDiv.querySelector('.js-plotly-plot');
                    if (plotlyChart) {
                        Plotly.Plots.resize(chartDiv);
                    }
                }, 200);
            }
        }
    }, 50);
    
    // Enable pointer events for drill through (but disable Plotly interactions)
    // For text-box, allow pointer events so it can be edited
    if (chartType !== 'text-box') {
        // Allow pointer events for click detection but Plotly config will handle interactions
        chartDiv.style.pointerEvents = 'auto';
    } else {
        // Text-box needs pointer events enabled for editing
        chartDiv.style.pointerEvents = 'auto';
        const textBoxContent = chartDiv.querySelector('.text-box-content');
        if (textBoxContent) {
            textBoxContent.style.pointerEvents = 'auto';
            textBoxContent.style.cursor = 'text';
        }
    }
    // Allow header to be clickable
    header.style.pointerEvents = 'auto';
    
    // Add double-click to edit name for model and slicer widgets
    if (isModelTool(chartType) || isSlicerTool(chartType)) {
        const nameDisplay = header.querySelector('.widget-name-display');
        if (nameDisplay) {
            // Load custom name if exists
            const customName = chartContainer.dataset.customName;
            if (customName) {
                nameDisplay.textContent = customName;
            }
            
            // Helper function to attach edit handler
            const attachEditHandler = (spanElement) => {
                spanElement.addEventListener('dblclick', function(e) {
                    e.stopPropagation();
                    const currentName = this.textContent;
                    const widgetContainer = this.closest('.chart-widget');
                    
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = currentName;
                    input.className = 'widget-name-input text-sm font-semibold text-text-default bg-white border border-primary-brand rounded px-2 py-1';
                    input.style.minWidth = '100px';
                    input.style.width = 'auto';
                    
                    // Replace span with input
                    this.replaceWith(input);
                    input.focus();
                    input.select();
                    
                    // Save on Enter or blur
                    const saveName = () => {
                        const newName = input.value.trim() || currentName;
                        if (widgetContainer) {
                            widgetContainer.dataset.customName = newName;
                        }
                        
                        // Create new span
                        const newSpan = document.createElement('span');
                        newSpan.className = 'widget-name-display text-sm font-semibold text-text-default';
                        newSpan.dataset.widgetId = widgetId;
                        newSpan.textContent = newName;
                        
                        // Replace input with span
                        input.replaceWith(newSpan);
                        
                        // Re-attach event listener
                        attachEditHandler(newSpan);
                    };
                    
                    input.addEventListener('blur', saveName);
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            saveName();
                        } else if (e.key === 'Escape') {
                            input.value = currentName;
                            saveName();
                        }
                    });
                });
            };
            
            attachEditHandler(nameDisplay);
        }
    }
    
    // Add click handler to show/hide header when clicking on container (but not on chart)
    // Use capture: false so it runs AFTER mousedown handlers
    chartContainer.addEventListener('click', (e) => {
        // IMPORTANT: Stop propagation immediately to prevent duplicate chart creation
        // This prevents the click from bubbling up to canvas or other handlers that might add new charts
        e.stopPropagation();
        
        // CRITICAL: Don't show header if widget was just dragged (to prevent header from appearing during drag)
        // Only check dataset flags, not closure variables (which aren't accessible here)
        if (chartContainer.dataset.preventClick === 'true' || chartContainer.dataset.isDragging === 'true') {
            // Widget was dragged, don't show header
            chartContainer.dataset.preventClick = 'false';
            chartContainer.dataset.isDragging = 'false';
            return;
        }
        
        // Normal click - proceed with showing header
        
        // Resize handles kaldırıldı
        // Check if clicking on chart content (Plotly chart) or text-box content
        const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
        const clickedOnHeader = e.target.closest('.chart-widget-header');
        const clickedOnHeaderButton = e.target.closest('.chart-widget-header button');
        const clickedOnTextBoxContent = chartType === 'text-box' && e.target.closest('.text-box-content');
        
        // If clicking on header buttons, don't toggle (let button handlers work)
        if (clickedOnHeaderButton) {
            return; // Let button handlers work (settings, delete, etc.)
        }
        
        // For text-box content, allow editing but also show header
        if (clickedOnTextBoxContent) {
            // Hide all other headers first
            document.querySelectorAll('.chart-widget-header').forEach(h => {
                if (h !== header) {
                    h.style.display = 'none';
                    h.classList.add('hidden');
                    const otherWidget = h.closest('.chart-widget');
                    if (otherWidget) {
                        hideResizeHandles(otherWidget);
                        otherWidget.style.backgroundColor = 'transparent';
                        otherWidget.style.border = 'none';
                        otherWidget.style.boxShadow = 'none';
                    }
                }
            });
            // Show header and handles for this text-box
            header.style.display = 'flex';
            header.classList.remove('hidden');
            showResizeHandles(chartContainer);
            // Allow text editing
            setTimeout(() => {
                clickedOnTextBoxContent.focus();
            }, 10);
            return;
        }
        
        // Hide all other headers
        document.querySelectorAll('.chart-widget-header').forEach(h => {
            if (h !== header) {
                h.style.display = 'none';
                h.classList.add('hidden');
                // Hide resize handles and background for other charts
                const otherWidget = h.closest('.chart-widget');
                if (otherWidget) {
                    hideResizeHandles(otherWidget);
                    // Hide background and border for other widgets
                    otherWidget.style.backgroundColor = 'transparent';
                    otherWidget.style.border = 'none';
                    otherWidget.style.boxShadow = 'none';
                }
            }
        });
        
        // Show header when clicking on chart or container
        // Always show header when clicking on chart or container
        if (clickedOnChart || chartType === 'text-box') {
            // Always show header when clicking on chart or text-box container
            header.style.display = 'flex';
            header.classList.remove('hidden');
            chartContainer.style.padding = '0';
            // Show background and border when clicked
            chartContainer.style.backgroundColor = '';
            chartContainer.style.border = '';
            chartContainer.style.boxShadow = '';
            showResizeHandles(chartContainer);
        } else if (!clickedOnHeader) {
            // Toggle header visibility when clicking on container (not chart)
            if (header.style.display === 'none' || header.classList.contains('hidden')) {
                header.style.display = 'flex';
                header.classList.remove('hidden');
                chartContainer.style.padding = '0';
                // Show background and border when clicked
                chartContainer.style.backgroundColor = '';
                chartContainer.style.border = '';
                chartContainer.style.boxShadow = '';
                // Resize handles kaldırıldı
            } else {
                // Hide header when clicking on container/empty area again
                header.style.display = 'none';
                header.classList.add('hidden');
                chartContainer.style.padding = '0';
                // Hide background and border when not selected
                chartContainer.style.backgroundColor = 'transparent';
                chartContainer.style.border = 'none';
                chartContainer.style.boxShadow = 'none';
                hideResizeHandles(chartContainer);
            }
        }
    });
    
    // Prevent Plotly interactions on chart content (zoom, pan, hover, etc.)
    // But allow dragging - this will be handled by makeChartDraggable
    // For text-box, don't prevent interactions on text-box-content
    if (chartType !== 'text-box' && chartType !== 'python') {
        chartContainer.addEventListener('mousedown', (e) => {
            // Don't prevent if clicking on header buttons
            if (e.target.closest('.chart-widget-header')) {
                return; // Let header buttons work
            }
            // Don't prevent if clicking on resize handles
            if (e.target.closest('.resize-handle')) {
                return; // Let resize handles work
            }
            // If clicking on chart content, prevent Plotly interactions but allow drag
            const clickedOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
            if (clickedOnChart) {
                // Don't prevent default - let drag handler work
                // Just stop propagation to prevent Plotly interactions
                e.stopPropagation();
            }
        }, { passive: true }); // Use passive to not block drag
    } else if (chartType === 'text-box') {
        // For text-box, only prevent interactions on non-content areas
        chartContainer.addEventListener('mousedown', (e) => {
            // Don't prevent if clicking on text-box-content
            if (e.target.closest('.text-box-content')) {
                return; // Allow text editing
            }
            // Don't prevent if clicking on header buttons
            if (e.target.closest('.chart-widget-header')) {
                return; // Let header buttons work
            }
            // Resize handles are handled separately
        }, { passive: true });
    }
    
    // Prevent hover effects and interactions on chart content
    chartContainer.addEventListener('mouseover', (e) => {
        const hoveredOnChart = e.target.closest('.js-plotly-plot') || e.target.closest('[id^="chart-"]');
        if (hoveredOnChart && !e.target.closest('.chart-widget-header')) {
            // Keep cursor as pointer (not move) unless actively dragging
            chartContainer.style.cursor = 'pointer';
        }
    });
    
    // Prevent double-click, context menu, and other interactions on chart
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
    
    // Initialize widget-specific data for new widget (empty, so it doesn't use old data)
    if (isModelTool(chartType)) {
        if (!window.widgetData) {
            window.widgetData = {};
        }
        // CRITICAL: Don't initialize with old data - explicitly set to empty/null
        // This ensures new widgets show placeholder instead of old data
        window.widgetData[widgetId] = null;
        window.widgetData[chartDiv.id] = null;
        console.log('New model widget created:', widgetId, 'with empty data - will show placeholder');
    }
    
    // Render chart
    renderChart(chartType, chartDiv.id);
    
    // Make draggable - works for all chart types including text-box
    makeChartDraggable(chartContainer);
}

// Render chart based on type
function renderChart(chartType, containerId, filterValue = null, filterField = null, barChartType = null, lineChartType = null, areaChartType = null, pieChartType = null, scatterChartType = null, cardChartType = null, treemapChartType = null, tableChartType = null) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn('renderChart: Container not found:', containerId);
        return;
    }
    
    // Get chart settings if available
    const settings = window.chartSettings && window.chartSettings[containerId] ? window.chartSettings[containerId] : null;
    
    // Get bar chart type for bar charts
    const currentBarChartType = (chartType === 'bar' && barChartType) ? barChartType : (settings?.barChartType || 'basic');
    
    // Get scatter chart type for scatter charts
    const currentScatterChartType = (chartType === 'scatter' && scatterChartType) ? scatterChartType : (settings?.scatterChartType || 'simple');
    
    // Get card chart type for card charts
    const currentCardChartType = (chartType === 'card' && cardChartType) ? cardChartType : (settings?.cardChartType || 'basic');
    
    // Get treemap chart type for treemap charts
    const currentTreemapChartType = (chartType === 'treemap' && treemapChartType) ? treemapChartType : (settings?.treemapChartType || 'basic');
    
    // Get table chart type for table charts
    const currentTableChartType = (chartType === 'table' && tableChartType) ? tableChartType : (settings?.tableChartType || 'basic');
    
    // Get axis columns from settings
    const xAxisColumn = settings?.xAxisColumn || null;
    const yAxisColumn = settings?.yAxisColumn || null;
    const zAxisColumn = settings?.zAxisColumn || null;
    
    // For model and slicer widgets, check if data exists
    const isModel = isModelTool(chartType);
    const isSlicer = isSlicerTool(chartType);
    
    // Check if we have data - for models and slicers, require csvData or settings data
    const hasData = window.csvData && window.csvData.length > 0;
    const hasSettingsData = settings && (settings.data || settings.xAxisColumn || settings.yAxisColumn);
    
    // Use window.sampleData if available, otherwise fall back to local sampleData
    const currentData = window.sampleData || sampleData;
    
    console.log('renderChart: Using data:', currentData, 'for container:', containerId);
    console.log('renderChart: X-Axis Column:', xAxisColumn, 'Y-Axis Column:', yAxisColumn);
    
    // Prepare data - use axis columns if specified, otherwise use default structure
    let df = {};
    
    // Get widget-specific data
    let widgetData = null;
    const widget = container.closest('.chart-widget');
    const widgetId = widget ? widget.dataset.widgetId : null;
    const datasetId = widget ? widget.dataset.datasetId : null;
    
    // Load dataset data if datasetId is present
    if (datasetId && window.datasets) {
        const dataset = window.datasets.find(d => d.id == datasetId);
        if (dataset && dataset.preview) {
            // Convert preview data to widgetData format
            const headers = Object.keys(dataset.preview[0] || {});
            widgetData = [headers];
            dataset.preview.forEach(row => {
                widgetData.push(headers.map(key => row[key]));
            });
            
            // Store in widget-specific storage
            if (!window.widgetData) {
                window.widgetData = {};
            }
            if (widgetId) {
                window.widgetData[widgetId] = widgetData;
            } else {
                window.widgetData[containerId] = widgetData;
            }
        }
    }
    
    // Check if this is preview chart
    const isPreview = containerId === window.previewChartId;
    
    // For preview, ALWAYS use previewChartId data first
    if (isPreview) {
        if (window.widgetData && window.widgetData[containerId]) {
            widgetData = window.widgetData[containerId];
            console.log('renderChart: Preview using containerId data:', widgetData);
        } else if (window.csvData && window.csvData.length > 0) {
            widgetData = window.csvData;
            // Store in widget-specific storage for preview
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[containerId] = widgetData;
            console.log('renderChart: Preview using csvData and storing:', widgetData);
        }
    } else {
        // For canvas widgets, use widget-specific data
        // IMPORTANT: Check for null/undefined explicitly - don't use old data for new widgets
        if (widgetId && window.widgetData && window.widgetData[widgetId] !== null && window.widgetData[widgetId] !== undefined) {
            widgetData = window.widgetData[widgetId];
        } else if (window.widgetData && window.widgetData[containerId] !== null && window.widgetData[containerId] !== undefined) {
            widgetData = window.widgetData[containerId];
        } else if (window.csvData && window.csvData.length > 0) {
            // Fallback to global csvData for backward compatibility (only for non-model widgets)
            // For model widgets, don't use global csvData - they should show placeholder
            if (!isModel) {
                widgetData = window.csvData;
                // Store in widget-specific storage
                if (!window.widgetData) {
                    window.widgetData = {};
                }
                if (widgetId) {
                    window.widgetData[widgetId] = widgetData;
                } else {
                    window.widgetData[containerId] = widgetData;
                }
            }
        }
    }
    
    // Check if this model has filter info from slicer
    if (widgetId && window.modelFilteredData && window.modelFilteredData[widgetId]) {
        const filterInfo = window.modelFilteredData[widgetId];
        if (filterInfo.filterValue !== null && filterInfo.filterValue !== undefined) {
            // Override filterValue and filterField from modelFilteredData
            filterValue = filterInfo.filterValue;
            filterField = filterInfo.filterField;
        }
    }
    
    // If axis columns are specified, extract data from widget-specific data
    if (widgetData && widgetData.length > 0) {
        const headers = widgetData[0];
        
        // Build df with ALL columns from widgetData for proper filtering
        df = {};
        headers.forEach((header, colIndex) => {
            df[header] = [];
            for (let i = 1; i < widgetData.length; i++) {
                df[header].push(widgetData[i][colIndex]);
            }
        });
        
        // Don't create default Kategori, Deger, Satis columns - use only data table columns
    } else {
        // For model widgets, don't use default data - keep empty
        if (isModel) {
            df = {};
        } else {
            // Use default structure from sampleData only for non-model widgets
            df = {
                Kategori: [...currentData.Kategori],
                Deger: [...currentData.Deger],
                Satis: [...currentData.Satis]
            };
            
            // Also add all keys from sampleData for filtering
            Object.keys(currentData).forEach(key => {
                if (!df[key]) {
                    df[key] = [...currentData[key]];
                }
            });
        }
    }
    
    // Placeholder check will be done after layout is defined
    
    
    let config = {
        displayModeBar: false,
        responsive: false, // Disable responsive to use explicit dimensions
        autosize: false, // Disable autosize to use explicit dimensions for resize
        staticPlot: false // Enable click events for drill through (but disable zoom/pan via dragmode)
    };
    
    // Apply settings if available (settings already defined above)
    const marginLeft = settings ? settings.marginLeft : 40;
    const marginRight = settings ? settings.marginRight : 20;
    const marginTop = settings ? settings.marginTop : 20;
    const marginBottom = settings ? settings.marginBottom : 40;
    // Use transparent background for canvas charts to show grid
    const bgColor = settings ? settings.bgColor : 'transparent';
    const showLegend = settings ? settings.showLegend : true;
    const showGrid = settings ? settings.showGrid : true;
    const fontSize = settings ? (settings.fontSize || 12) : 12;
    const chartTitle = settings ? (settings.title || '') : '';
    const textColor = settings ? settings.textColor : '#000000';
    
    // Convert hex color to rgba
    function hexToRgba(hex) {
        if (!hex || hex === 'transparent') return 'rgba(0,0,0,0)';
        // Remove # if present
        hex = hex.replace('#', '');
        // Handle 3-digit hex
        if (hex.length === 3) {
            hex = hex.split('').map(char => char + char).join('');
        }
        // Parse hex to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},1)`;
    }
    
    // Get container dimensions for layout - use explicit dimensions instead of autosize
    const chartContainer = document.getElementById(containerId);
    let containerWidth = 400;
    let containerHeight = 300;
    
    if (chartContainer) {
        containerWidth = chartContainer.offsetWidth || parseFloat(chartContainer.style.width) || 400;
        containerHeight = chartContainer.offsetHeight || parseFloat(chartContainer.style.height) || 300;
    }
    
    let layout = {
        width: containerWidth,
        height: containerHeight,
        autosize: false, // Disable autosize and use explicit dimensions for better resize control
        dragmode: false, // Disable pan/zoom drag (but allow clicks)
        hovermode: 'closest', // Enable hover for better UX
        margin: { l: marginLeft, r: marginRight, t: marginTop, b: marginBottom },
        paper_bgcolor: bgColor === 'transparent' ? 'rgba(0,0,0,0)' : hexToRgba(bgColor),
        plot_bgcolor: 'rgba(0,0,0,0)', // Always transparent plot background
        font: { size: fontSize, color: textColor },
        showlegend: showLegend
    };
    
    // Add chart title if provided
    if (chartTitle) {
        layout.title = {
            text: chartTitle,
            font: { size: fontSize + 2, color: textColor }
        };
    }
    
    // Initialize axis with font size
    if (!layout.xaxis) layout.xaxis = {};
    if (!layout.yaxis) layout.yaxis = {};
    
    layout.xaxis.titlefont = { size: fontSize, color: textColor };
    layout.yaxis.titlefont = { size: fontSize, color: textColor };
    layout.xaxis.tickfont = { size: fontSize - 2, color: textColor };
    layout.yaxis.tickfont = { size: fontSize - 2, color: textColor };
    
    if (!showGrid) {
        layout.xaxis.showgrid = false;
        layout.yaxis.showgrid = false;
    }
    
    // Check if model widget has widget-specific data
    // For models, check widget-specific data (not null, not undefined, and has length > 0)
    const hasWidgetData = widgetData !== null && widgetData !== undefined && Array.isArray(widgetData) && widgetData.length > 0;
    const modelHasData = isModel ? hasWidgetData : (hasData || hasSettingsData);
    
    console.log('renderChart: Model data check:', {
        isModel,
        widgetId,
        containerId,
        hasWidgetData,
        widgetData: widgetData ? `${widgetData.length} rows` : 'null/undefined',
        modelHasData
    });
    
    // If it's a model or slicer and no data, show placeholder preview (after layout is defined)
    // For models, check widget-specific data, not global data
    if ((isModel || isSlicer) && !modelHasData) {
        // For models, show placeholder chart
        if (isModel) {
            // Create placeholder data for preview
            const placeholderData = {
                x: ['A', 'B', 'C', 'D'],
                y: [40, 70, 30, 90]
            };
            
            // Create placeholder chart with gray colors
            let placeholderChartData = [];
            let placeholderLayout = JSON.parse(JSON.stringify(layout)); // Deep copy
            placeholderLayout.paper_bgcolor = 'rgba(0,0,0,0)';
            placeholderLayout.plot_bgcolor = 'rgba(0,0,0,0)';
            placeholderLayout.font = { size: fontSize, color: '#9CA3AF' };
            placeholderLayout.xaxis = { 
                ...layout.xaxis,
                tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                titlefont: { size: fontSize, color: '#9CA3AF' }
            };
            placeholderLayout.yaxis = { 
                ...layout.yaxis,
                tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                titlefont: { size: fontSize, color: '#9CA3AF' }
            };
            placeholderLayout.showlegend = false;
            
            // Add annotation to show "No data connected" message only for canvas (not preview)
            if (!isPreview) {
                placeholderLayout.annotations = [{
                    text: 'No Data Connected<br><span style="font-size: 10px; color: #9CA3AF;">Connect a data table</span>',
                    xref: 'paper',
                    yref: 'paper',
                    x: 0.5,
                    y: 0.5,
                    xanchor: 'center',
                    yanchor: 'middle',
                    showarrow: false,
                    font: { size: 14, color: '#9CA3AF' },
                    bgcolor: 'rgba(255, 255, 255, 0.8)',
                    bordercolor: '#D1D5DB',
                    borderwidth: 1,
                    borderpad: 10
                }];
            }
            
            // Create placeholder based on chart type
            switch(chartType) {
                case 'bar':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'bar',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
                    break;
                case 'stacked-bar':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'bar',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }, {
                        x: placeholderData.x,
                        y: [30, 50, 20, 60],
                        type: 'bar',
                        marker: { color: '#D1D5DB' },
                        opacity: 0.7
                    }];
                    placeholderLayout.barmode = 'stack';
                    break;
                case 'line':
                case 'area':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'scatter',
                        mode: chartType === 'line' ? 'lines+markers' : 'lines',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2 },
                        fill: chartType === 'area' ? 'tozeroy' : undefined,
                        fillcolor: chartType === 'area' ? 'rgba(156, 163, 175, 0.3)' : undefined,
                        opacity: 0.7
                    }];
                    break;
                case 'pie':
                case 'donut':
                    placeholderChartData = [{
                        labels: placeholderData.x,
                        values: placeholderData.y,
                        type: 'pie',
                        hole: chartType === 'donut' ? 0.4 : 0,
                        marker: { colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'] },
                        opacity: 0.7
                    }];
                    break;
                case 'scatter':
                    // Create placeholder based on scatter chart type
                    const scatterPlaceholderType = currentScatterChartType || 'simple';
                    switch(scatterPlaceholderType) {
                        case 'simple':
                            placeholderChartData = [{
                                x: placeholderData.x,
                                y: placeholderData.y,
                                mode: 'markers',
                                type: 'scatter',
                                marker: { color: '#9CA3AF', size: 12 },
                                opacity: 0.7
                            }];
                            break;
                        case 'trendline':
                            placeholderChartData = [
                                {
                                    x: placeholderData.x,
                                    y: placeholderData.y,
                                    mode: 'markers',
                                    type: 'scatter',
                                    marker: { color: '#9CA3AF', size: 12 },
                                    opacity: 0.7,
                                    name: 'Data'
                                },
                                {
                                    x: placeholderData.x,
                                    y: [9, 13, 12, 16, 19], // Approximate trendline
                                    mode: 'lines',
                                    type: 'scatter',
                                    line: { color: '#6B7280', width: 2, dash: 'dash' },
                                    name: 'Trendline'
                                }
                            ];
                            placeholderLayout.showlegend = true;
                            break;
                        case 'bubble':
                            // Use z-axis data for bubble sizes if available
                            const bubbleSizes = placeholderData.z || [5, 10, 8, 12, 15];
                            placeholderChartData = [{
                                x: placeholderData.x,
                                y: placeholderData.y,
                                mode: 'markers',
                                type: 'scatter',
                                marker: { 
                                    color: '#9CA3AF', 
                                    size: bubbleSizes.map(s => s * 2),
                                    sizeref: 0.1,
                                    sizemode: 'diameter',
                                    opacity: 0.7
                                }
                            }];
                            break;
                        default:
                            placeholderChartData = [{
                                x: placeholderData.x,
                                y: placeholderData.y,
                                mode: 'markers',
                                type: 'scatter',
                                marker: { color: '#9CA3AF', size: 12 },
                                opacity: 0.7
                            }];
                    }
                    break;
                case 'histogram':
                    placeholderChartData = [{
                        x: placeholderData.y,
                        type: 'histogram',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
                    break;
                case 'box':
                case 'box-plot':
                    placeholderChartData = [{
                        y: placeholderData.y,
                        type: 'box',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
                    break;
                case 'waterfall':
                    placeholderChartData = [{
                        type: 'waterfall',
                        x: placeholderData.x,
                        y: placeholderData.y,
                        connector: { line: { color: '#9CA3AF' } },
                        marker: { 
                            color: '#9CA3AF',
                            line: { color: '#9CA3AF' }
                        },
                        increasing: { marker: { color: '#9CA3AF' } },
                        decreasing: { marker: { color: '#9CA3AF' } },
                        totals: { marker: { color: '#9CA3AF' } },
                        opacity: 0.7
                    }];
                    break;
                case 'funnel':
                    placeholderChartData = [{
                        type: 'funnel',
                        y: placeholderData.x,
                        x: placeholderData.y,
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
                    break;
                case 'radar':
                    placeholderChartData = [{
                        type: 'scatterpolar',
                        r: placeholderData.y,
                        theta: placeholderData.x,
                        fill: 'toself',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
                    placeholderLayout.polar = {
                        radialaxis: { visible: true }
                    };
                    break;
                case 'combo':
                    placeholderChartData = [
                        { x: placeholderData.x, y: placeholderData.y, type: 'bar', name: 'Bar', marker: { color: '#9CA3AF' }, opacity: 0.7 },
                        { x: placeholderData.x, y: [30, 50, 20, 60], type: 'scatter', mode: 'lines+markers', name: 'Line', yaxis: 'y2', marker: { color: '#D1D5DB' }, opacity: 0.7 }
                    ];
                    placeholderLayout.yaxis2 = { overlaying: 'y', side: 'right' };
                    break;
                case 'heatmap':
                    placeholderChartData = [{
                        z: [placeholderData.y, [30, 50, 20, 60]],
                        x: placeholderData.x,
                        y: ['Series 1', 'Series 2'],
                        type: 'heatmap',
                        colorscale: 'Greys',
                        opacity: 0.7
                    }];
                    break;
                case 'treemap':
                    // Create placeholder based on treemap chart type
                    const treemapPlaceholderType = currentTreemapChartType || 'basic';
                    if (treemapPlaceholderType === 'hierarchical') {
                        // Hierarchical treemap placeholder
                        placeholderChartData = [{
                            type: 'treemap',
                            labels: placeholderData.x,
                            values: placeholderData.y,
                            parents: ['Category A', 'Category A', 'Category B', 'Category B'],
                            marker: { 
                                colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6']
                            },
                            opacity: 0.7
                        }];
                    } else {
                        // Basic treemap placeholder
                        placeholderChartData = [{
                            type: 'treemap',
                            labels: placeholderData.x,
                            values: placeholderData.y,
                            parents: Array(placeholderData.x.length).fill(''),
                            marker: { 
                                colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6']
                            },
                            opacity: 0.7
                        }];
                    }
                    break;
                case 'gauge':
                    placeholderChartData = [{
                        type: 'indicator',
                        mode: 'gauge+number',
                        value: 70,
                        title: { text: 'KPI' },
                        gauge: {
                            axis: { range: [null, 100] },
                            bar: { color: '#9CA3AF' },
                            steps: [
                                { range: [0, 50], color: '#E5E7EB' },
                                { range: [50, 80], color: '#D1D5DB' }
                            ],
                            threshold: {
                                line: { color: '#9CA3AF', width: 4 },
                                thickness: 0.75,
                                value: 90
                            }
                        }
                    }];
                    break;
                case 'table':
                case 'excel':
                    // Table placeholder will be handled separately
                    container.innerHTML = `
                        <div class="opacity-70">
                            <table class="w-full text-xs">
                                <thead>
                                    <tr class="bg-gray-300 text-gray-600">
                                        <th class="p-2 border">Column 1</th>
                                        <th class="p-2 border">Column 2</th>
                                        <th class="p-2 border">Column 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td class="p-2 border text-gray-400">Value 1</td><td class="p-2 border text-gray-400">Value 2</td><td class="p-2 border text-gray-400">Value 3</td></tr>
                                    <tr><td class="p-2 border text-gray-400">Value 4</td><td class="p-2 border text-gray-400">Value 5</td><td class="p-2 border text-gray-400">Value 6</td></tr>
                                    <tr><td class="p-2 border text-gray-400">Value 7</td><td class="p-2 border text-gray-400">Value 8</td><td class="p-2 border text-gray-400">Value 9</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                    return;
                case 'list':
                    // List placeholder
                    container.innerHTML = `
                        <div class="opacity-70">
                            <div class="space-y-2">
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 1</div>
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 2</div>
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 3</div>
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 4</div>
                            </div>
                        </div>
                    `;
                    return;
                case 'hierarchy-list':
                    // Hierarchy List placeholder
                    container.innerHTML = `
                        <div class="opacity-70">
                            <div class="space-y-1">
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 cursor-pointer">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                    <span>Category 1</span>
                                </div>
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 ml-4">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                    <span>Category 2</span>
                                </div>
                                <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 ml-4">
                                    <span class="material-symbols-outlined text-sm">chevron_right</span>
                                    <span>Category 3</span>
                                </div>
                            </div>
                        </div>
                    `;
                    return;
                default:
                    // Generic bar chart for other types
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'bar',
                        marker: { color: '#9CA3AF' },
                        opacity: 0.7
                    }];
            }
            
            // Render placeholder chart
            if (typeof Plotly !== 'undefined') {
                Plotly.newPlot(containerId, placeholderChartData, placeholderLayout, config);
            }
            return;
        }
        // For slicers, placeholder will be handled in their specific cases below
    }
    
    // Get column names from widget-specific data for legends
    let columnNames = [];
    let widgetDataForColumns = null;
    if (window.widgetData && window.widgetData[containerId]) {
        widgetDataForColumns = window.widgetData[containerId];
    } else if (window.csvData && window.csvData.length > 0) {
        widgetDataForColumns = window.csvData;
    }
    
    if (widgetDataForColumns && widgetDataForColumns.length > 0) {
        columnNames = widgetDataForColumns[0] || [];
    } else {
        columnNames = Object.keys(df).filter(key => Array.isArray(df[key]) && df[key].length > 0);
    }
    
    // Apply filter if drill through is active (after columnNames is defined)
    if (filterValue !== null && filterValue !== undefined && filterValue !== '') {
        // Use filterField if provided, otherwise use xAxisColumn or first available column
        const filterColumn = filterField || xAxisColumn || (columnNames.length > 0 ? columnNames[0] : (Object.keys(df)[0] || ''));
        const filterValues = df[filterColumn];
        
        console.log('Applying filter:', { filterValue, filterColumn, filterValuesLength: filterValues?.length, availableColumns: Object.keys(df) });
        
        if (!filterValues || !Array.isArray(filterValues)) {
            console.warn('Filter column not found or not an array:', filterColumn, 'Available columns:', Object.keys(df));
            // Try to find the column in df (case-insensitive)
            const foundColumn = Object.keys(df).find(key => 
                key.toLowerCase() === filterColumn.toLowerCase() || 
                key === filterColumn
            );
            if (foundColumn && Array.isArray(df[foundColumn])) {
                applyFilterToDataFrame(df, df[foundColumn], filterValue);
            }
        } else {
            applyFilterToDataFrame(df, filterValues, filterValue);
        }
    }
    
    // Helper function to apply filter to dataframe
    function applyFilterToDataFrame(dataFrame, filterColumnValues, filterVal) {
        if (Array.isArray(filterVal)) {
            // List slicer - filter by multiple selected values
            const indices = [];
            filterColumnValues.forEach((val, idx) => {
                // Check if value matches any of the selected filter values (exact match, case-insensitive)
                const valStr = String(val).trim().toLowerCase();
                if (filterVal.some(fv => valStr === String(fv).trim().toLowerCase())) {
                    indices.push(idx);
                }
            });
            
            // Rebuild df with filtered data
            if (indices.length > 0) {
                const newDf = {};
                Object.keys(dataFrame).forEach(key => {
                    if (Array.isArray(dataFrame[key]) && dataFrame[key].length === filterColumnValues.length) {
                        newDf[key] = indices.map(i => dataFrame[key][i]);
                    } else {
                        newDf[key] = dataFrame[key];
                    }
                });
                Object.keys(newDf).forEach(key => {
                    dataFrame[key] = newDf[key];
                });
            } else {
                // No matches - clear all data except headers
                Object.keys(dataFrame).forEach(key => {
                    if (Array.isArray(dataFrame[key]) && dataFrame[key].length === filterColumnValues.length) {
                        dataFrame[key] = [];
                    }
                });
            }
        } else {
            // Single value filter (button, text, dropdown slicer)
            const valStr = String(filterVal).trim().toLowerCase();
            const indices = [];
            filterColumnValues.forEach((val, idx) => {
                if (String(val).trim().toLowerCase() === valStr) {
                    indices.push(idx);
                }
            });
            
            // Rebuild df with filtered data
            if (indices.length > 0) {
                const newDf = {};
                Object.keys(dataFrame).forEach(key => {
                    if (Array.isArray(dataFrame[key]) && dataFrame[key].length === filterColumnValues.length) {
                        newDf[key] = indices.map(i => dataFrame[key][i]);
                    } else {
                        newDf[key] = dataFrame[key];
                    }
                });
                Object.keys(newDf).forEach(key => {
                    dataFrame[key] = newDf[key];
                });
            } else {
                // No matches - clear all data except headers
                Object.keys(dataFrame).forEach(key => {
                    if (Array.isArray(dataFrame[key]) && dataFrame[key].length === filterColumnValues.length) {
                        dataFrame[key] = [];
                    }
                });
            }
        }
    }
    
    // Get axis data - use only data table columns, no fallback defaults
    const xData = (xAxisColumn && df[xAxisColumn]) ? df[xAxisColumn] : (columnNames[0] && df[columnNames[0]] ? df[columnNames[0]] : []);
    const yData = (yAxisColumn && df[yAxisColumn]) ? df[yAxisColumn] : (columnNames[1] && df[columnNames[1]] ? df[columnNames[1]] : []);
    
    // Get z-axis data if available (for grouped/stacked charts)
    const zData = (zAxisColumn && df[zAxisColumn]) ? df[zAxisColumn] : null;
    
    const xLabel = xAxisColumn || (columnNames[0] || '');
    const yLabel = yAxisColumn || (columnNames[1] || '');
    const zLabel = zAxisColumn || (columnNames[2] || '');
    
    let data = [];
    
    // Get chart-specific colors or fallback to general colors
    const chartColors = settings?.chartColors || settings?.colors || ['#007bff', '#28a745', '#ffc107', '#dc3545'];
    
    switch(chartType) {
        case 'bar':
            // Get bar chart type from settings or parameter
            const barType = currentBarChartType || 'basic';
            const barColor = chartColors[0] || '#007bff';
            
            // Check if we have valid data
            const hasBarData = xData.length > 0 && yData.length > 0;
            
            // If no data, show gray placeholder chart
            if (!hasBarData) {
                const placeholderData = {
                    x: ['Category A', 'Category B', 'Category C', 'Category D'],
                    y: [20, 35, 30, 40]
                };
                
                let placeholderChartData = [];
                let placeholderLayout = JSON.parse(JSON.stringify(layout));
                placeholderLayout.paper_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.plot_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.font = { size: fontSize, color: '#9CA3AF' };
                placeholderLayout.xaxis = { 
                    ...layout.xaxis,
                    tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                    titlefont: { size: fontSize, color: '#9CA3AF' }
                };
                placeholderLayout.yaxis = { 
                    ...layout.yaxis,
                    tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                    titlefont: { size: fontSize, color: '#9CA3AF' }
                };
                placeholderLayout.showlegend = false;
                
                // Create placeholder based on bar chart type
                switch(barType) {
                    case 'basic':
                    case 'column':
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'bar',
                            marker: { color: '#9CA3AF' },
                            opacity: 0.7
                        }];
                        placeholderLayout.barmode = 'group';
                        break;
                        
                    case 'grouped':
                    case 'clustered':
                        placeholderChartData = [
                            {
                                x: placeholderData.x,
                                y: placeholderData.y,
                                type: 'bar',
                                marker: { color: '#9CA3AF' },
                                opacity: 0.7
                            },
                            {
                                x: placeholderData.x,
                                y: [30, 50, 20, 60],
                                type: 'bar',
                                marker: { color: '#D1D5DB' },
                                opacity: 0.7
                            }
                        ];
                        placeholderLayout.barmode = 'group';
                        break;
                        
                    case 'stacked':
                        placeholderChartData = [
                            {
                                x: placeholderData.x,
                                y: placeholderData.y,
                                type: 'bar',
                                marker: { color: '#9CA3AF' },
                                opacity: 0.7
                            },
                            {
                                x: placeholderData.x,
                                y: [30, 50, 20, 60],
                                type: 'bar',
                                marker: { color: '#D1D5DB' },
                                opacity: 0.7
                            }
                        ];
                        placeholderLayout.barmode = 'stack';
                        break;
                        
                    case 'horizontal':
                        placeholderChartData = [{
                            x: placeholderData.y,
                            y: placeholderData.x,
                            type: 'bar',
                            orientation: 'h',
                            marker: { color: '#9CA3AF' },
                            opacity: 0.7
                        }];
                        placeholderLayout.barmode = 'group';
                        break;
                        
                    case 'diverging':
                        const centeredPlaceholderY = placeholderData.y.map(val => val - 30);
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: centeredPlaceholderY,
                            type: 'bar',
                            marker: { 
                                color: centeredPlaceholderY.map(val => val >= 0 ? '#9CA3AF' : '#D1D5DB')
                            },
                            opacity: 0.7
                        }];
                        placeholderLayout.barmode = 'group';
                        placeholderLayout.shapes = [{
                            type: 'line',
                            xref: 'paper',
                            x0: 0,
                            x1: 1,
                            yref: 'y',
                            y0: 0,
                            y1: 0,
                            line: { color: '#6B7280', width: 1, dash: 'dash' }
                        }];
                        break;
                        
                    default:
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'bar',
                            marker: { color: '#9CA3AF' },
                            opacity: 0.7
                        }];
                        placeholderLayout.barmode = 'group';
                }
                
                // Render placeholder chart
                if (typeof Plotly !== 'undefined') {
                    Plotly.newPlot(containerId, placeholderChartData, placeholderLayout, {
                        displayModeBar: false,
                        staticPlot: true
                    });
                }
                return;
            }
            
            switch(barType) {
                case 'basic':
                    // Basic Bar Chart - normal vertical bars
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'bar',
                        name: yLabel,
                        marker: { color: barColor },
                        text: settings && settings.showLabels ? yData : undefined,
                        textposition: 'outside'
                    }];
                    layout.barmode = 'group';
                    break;
                    
                case 'grouped':
                case 'clustered':
                    // Grouped / Clustered Bar Chart - multiple series side by side
                    if (zData && zData.length > 0) {
                        // Use z-axis as second series
                        const color2 = chartColors[1] || '#28a745';
                        data = [
                            { x: xData, y: yData, type: 'bar', name: yLabel, marker: { color: barColor } },
                            { x: xData, y: zData, type: 'bar', name: zLabel, marker: { color: color2 } }
                        ];
                    } else {
                        // Fallback to basic if no z-axis
                        data = [{
                            x: xData,
                            y: yData,
                            type: 'bar',
                            name: yLabel,
                            marker: { color: barColor }
                        }];
                    }
                    layout.barmode = 'group';
                    break;
                    
                case 'stacked':
                    // Stacked Bar Chart - bars stacked on top of each other
                    if (zData && zData.length > 0) {
                        const color2 = chartColors[1] || '#28a745';
                        data = [
                            { x: xData, y: yData, type: 'bar', name: yLabel, marker: { color: barColor } },
                            { x: xData, y: zData, type: 'bar', name: zLabel, marker: { color: color2 } }
                        ];
                    } else {
                        // Fallback to basic if no z-axis
                        data = [{
                            x: xData,
                            y: yData,
                            type: 'bar',
                            name: yLabel,
                            marker: { color: barColor }
                        }];
                    }
                    layout.barmode = 'stack';
                    break;
                    
                case 'horizontal':
                    // Horizontal Bar Chart - bars are horizontal
                    data = [{
                        x: yData,
                        y: xData,
                        type: 'bar',
                        orientation: 'h',
                        name: yLabel,
                        marker: { color: barColor },
                        text: settings && settings.showLabels ? yData : undefined,
                        textposition: 'outside'
                    }];
                    layout.barmode = 'group';
                    // Swap axis labels for horizontal
                    if (settings?.xAxisLabel) layout.yaxis.title = settings.xAxisLabel;
                    if (settings?.yAxisLabel) layout.xaxis.title = settings.yAxisLabel;
                    break;
                    
                case 'column':
                    // Column Bar Chart - same as basic (vertical bars)
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'bar',
                        name: yLabel,
                        marker: { color: barColor },
                        text: settings && settings.showLabels ? yData : undefined,
                        textposition: 'outside'
                    }];
                    layout.barmode = 'group';
                    break;
                    
                case 'diverging':
                    // Diverging Bar Chart - bars extend from center (positive/negative)
                    // Center the bars around zero
                    const yNums = yData.map(v => parseFloat(v) || 0);
                    const maxVal = Math.max(...yNums);
                    const minVal = Math.min(...yNums);
                    const center = (maxVal + minVal) / 2;
                    const centeredYData = yNums.map(val => val - center);
                    data = [{
                        x: xData,
                        y: centeredYData,
                        type: 'bar',
                        name: yLabel,
                        marker: { 
                            color: centeredYData.map(val => val >= 0 ? barColor : (chartColors[1] || '#dc3545'))
                        },
                        text: settings && settings.showLabels ? yData : undefined,
                        textposition: 'outside'
                    }];
                    layout.barmode = 'group';
                    // Add zero line
                    if (!layout.shapes) layout.shapes = [];
                    layout.shapes.push({
                        type: 'line',
                        xref: 'paper',
                        x0: 0,
                        x1: 1,
                        yref: 'y',
                        y0: 0,
                        y1: 0,
                        line: { color: '#666', width: 1, dash: 'dash' }
                    });
                    break;
                    
                default:
                    // Default to basic
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'bar',
                        name: yLabel,
                        marker: { color: barColor },
                        text: settings && settings.showLabels ? yData : undefined,
                        textposition: 'outside'
                    }];
                    layout.barmode = 'group';
            }
            
            if (settings?.xAxisLabel && barType !== 'horizontal') layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel && barType !== 'horizontal') layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'stacked-bar':
            const stackedColor1 = chartColors[0] || '#007bff';
            const stackedColor2 = chartColors[1] || '#28a745';
            // Get second Y column from data table - only if available
            const secondYColumn = columnNames.length > 2 ? columnNames[2] : (columnNames.length > 1 ? columnNames[1] : null);
            const secondYData = (secondYColumn && df[secondYColumn]) ? df[secondYColumn] : yData;
            const secondYLabel = secondYColumn || yLabel;
            data = [
                { x: xData, y: yData, type: 'bar', name: yLabel, marker: { color: stackedColor1 } },
                { x: xData, y: secondYData, type: 'bar', name: secondYLabel, marker: { color: stackedColor2 } }
            ];
            layout.barmode = 'stack';
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'line':
            const lineColor = chartColors[0] || '#007bff';
            data = [{
                x: xData,
                y: yData,
                type: 'scatter',
                mode: 'lines+markers',
                name: yLabel, // Use column name from data table
                marker: { color: lineColor, size: 8 },
                line: { color: lineColor, width: 2 }
            }];
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'area':
            // Get area chart type from settings or parameter
            const currentAreaChartType = areaChartType || settings?.areaChartType || 'simple';
            const areaColor = chartColors[0] || '#007bff';
            // Convert hex to rgba for fillcolor
            function hexToRgbaForFill(hex, alpha = 0.3) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return `rgba(${r},${g},${b},${alpha})`;
            }
            
            // Check if we have valid data
            const hasAreaData = xData.length > 0 && yData.length > 0;
            
            // If no data, show gray placeholder chart
            if (!hasAreaData) {
                const placeholderData = {
                    x: ['A', 'B', 'C', 'D'],
                    y: [40, 70, 30, 90]
                };
                
                let placeholderChartData = [];
                let placeholderLayout = JSON.parse(JSON.stringify(layout));
                placeholderLayout.paper_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.plot_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.font = { size: fontSize, color: '#9CA3AF' };
                placeholderLayout.xaxis = { 
                    ...layout.xaxis,
                    tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                    titlefont: { size: fontSize, color: '#9CA3AF' }
                };
                placeholderLayout.yaxis = { 
                    ...layout.yaxis,
                    tickfont: { size: fontSize - 2, color: '#9CA3AF' },
                    titlefont: { size: fontSize, color: '#9CA3AF' }
                };
                placeholderLayout.showlegend = false;
                
                // Create placeholder based on area chart type
                switch(currentAreaChartType) {
                    case 'simple':
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'scatter',
                            mode: 'lines',
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                            line: { color: '#9CA3AF', width: 2 },
                            opacity: 0.7
                        }];
                        break;
                        
                    case 'stacked':
                    case 'percent':
                        placeholderChartData = [
                            {
                                x: placeholderData.x,
                                y: placeholderData.y,
                                type: 'scatter',
                                mode: 'lines',
                                fill: 'tozeroy',
                                fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                                line: { color: '#9CA3AF', width: 2 },
                                opacity: 0.7
                            },
                            {
                                x: placeholderData.x,
                                y: [30, 50, 20, 60],
                                type: 'scatter',
                                mode: 'lines',
                                fill: 'tonexty',
                                fillcolor: hexToRgbaForFill('#D1D5DB', 0.3),
                                line: { color: '#D1D5DB', width: 2 },
                                opacity: 0.7
                            }
                        ];
                        placeholderLayout.stackgroup = 'one';
                        if (currentAreaChartType === 'percent') {
                            placeholderLayout.groupnorm = 'percent';
                        }
                        break;
                        
                    case 'overlapping':
                        placeholderChartData = [
                            {
                                x: placeholderData.x,
                                y: placeholderData.y,
                                type: 'scatter',
                                mode: 'lines',
                                fill: 'tozeroy',
                                fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                                line: { color: '#9CA3AF', width: 2 },
                                opacity: 0.7
                            },
                            {
                                x: placeholderData.x,
                                y: [30, 50, 20, 60],
                                type: 'scatter',
                                mode: 'lines',
                                fill: 'tozeroy',
                                fillcolor: hexToRgbaForFill('#D1D5DB', 0.3),
                                line: { color: '#D1D5DB', width: 2 },
                                opacity: 0.7
                            }
                        ];
                        break;
                        
                    case 'step':
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'scatter',
                            mode: 'lines',
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                            line: { color: '#9CA3AF', width: 2, shape: 'hv' },
                            opacity: 0.7
                        }];
                        break;
                        
                    case 'range':
                        const minY = placeholderData.y.map(val => val - 10);
                        const maxY = placeholderData.y.map(val => val + 10);
                        placeholderChartData = [{
                            x: placeholderData.x.concat(placeholderData.x.slice().reverse()),
                            y: maxY.concat(minY.slice().reverse()),
                            type: 'scatter',
                            mode: 'lines',
                            fill: 'toself',
                            fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                            line: { color: '#9CA3AF', width: 2 },
                            opacity: 0.7
                        }];
                        break;
                        
                    default:
                        placeholderChartData = [{
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'scatter',
                            mode: 'lines',
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill('#9CA3AF', 0.3),
                            line: { color: '#9CA3AF', width: 2 },
                            opacity: 0.7
                        }];
                }
                
                // Render placeholder chart
                if (typeof Plotly !== 'undefined') {
                    Plotly.newPlot(containerId, placeholderChartData, placeholderLayout, {
                        displayModeBar: false,
                        staticPlot: true
                    });
                }
                return;
            }
            
            // Clear stackgroup and groupnorm for all types first
            delete layout.stackgroup;
            delete layout.groupnorm;
            
            // Render actual area chart based on type
            switch(currentAreaChartType) {
                case 'simple':
                    // Simple Area Chart - single area filled to zero
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'scatter',
                        mode: 'lines',
                        name: yLabel,
                        fill: 'tozeroy',
                        fillcolor: hexToRgbaForFill(areaColor, 0.3),
                        line: { color: areaColor, width: 2 }
                    }];
                    break;
                    
                case 'stacked':
                    // Stacked Area Chart - areas stacked on top of each other
                    if (zData && zData.length > 0) {
                        const color2 = chartColors[1] || '#28a745';
                        data = [
                            { x: xData, y: yData, type: 'scatter', mode: 'lines', name: yLabel, fill: 'tozeroy', fillcolor: hexToRgbaForFill(areaColor, 0.3), line: { color: areaColor, width: 2 } },
                            { x: xData, y: zData, type: 'scatter', mode: 'lines', name: zLabel, fill: 'tonexty', fillcolor: hexToRgbaForFill(color2, 0.3), line: { color: color2, width: 2 } }
                        ];
                        layout.stackgroup = 'one';
                    } else {
                        // Fallback to simple if no z-axis
                        data = [{
                            x: xData,
                            y: yData,
                            type: 'scatter',
                            mode: 'lines',
                            name: yLabel,
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill(areaColor, 0.3),
                            line: { color: areaColor, width: 2 }
                        }];
                    }
                    break;
                    
                case 'percent':
                    // %100 Stacked Area Chart - areas stacked and normalized to 100%
                    if (zData && zData.length > 0) {
                        const color2 = chartColors[1] || '#28a745';
                        data = [
                            { x: xData, y: yData, type: 'scatter', mode: 'lines', name: yLabel, fill: 'tozeroy', fillcolor: hexToRgbaForFill(areaColor, 0.3), line: { color: areaColor, width: 2 } },
                            { x: xData, y: zData, type: 'scatter', mode: 'lines', name: zLabel, fill: 'tonexty', fillcolor: hexToRgbaForFill(color2, 0.3), line: { color: color2, width: 2 } }
                        ];
                        layout.stackgroup = 'one';
                        layout.groupnorm = 'percent';
                    } else {
                        // Fallback to simple if no z-axis
                        data = [{
                            x: xData,
                            y: yData,
                            type: 'scatter',
                            mode: 'lines',
                            name: yLabel,
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill(areaColor, 0.3),
                            line: { color: areaColor, width: 2 }
                        }];
                    }
                    break;
                    
                case 'overlapping':
                    // Overlapping Area Chart - areas overlap each other
                    if (zData && zData.length > 0) {
                        const color2 = chartColors[1] || '#28a745';
                        data = [
                            { x: xData, y: yData, type: 'scatter', mode: 'lines', name: yLabel, fill: 'tozeroy', fillcolor: hexToRgbaForFill(areaColor, 0.3), line: { color: areaColor, width: 2 } },
                            { x: xData, y: zData, type: 'scatter', mode: 'lines', name: zLabel, fill: 'tozeroy', fillcolor: hexToRgbaForFill(color2, 0.3), line: { color: color2, width: 2 } }
                        ];
                    } else {
                        // Fallback to simple if no z-axis
                        data = [{
                            x: xData,
                            y: yData,
                            type: 'scatter',
                            mode: 'lines',
                            name: yLabel,
                            fill: 'tozeroy',
                            fillcolor: hexToRgbaForFill(areaColor, 0.3),
                            line: { color: areaColor, width: 2 }
                        }];
                    }
                    break;
                    
                case 'step':
                    // Step Area Chart - step shape area
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'scatter',
                        mode: 'lines',
                        name: yLabel,
                        fill: 'tozeroy',
                        fillcolor: hexToRgbaForFill(areaColor, 0.3),
                        line: { color: areaColor, width: 2, shape: 'hv' }
                    }];
                    break;
                    
                case 'range':
                    // Range Area Chart - area between min and max values
                    // For range chart, we need two y arrays (min and max)
                    // If zData exists, use it as max, otherwise create range from yData
                    let minYData, maxYData;
                    if (zData && zData.length > 0) {
                        minYData = yData.map((val, idx) => Math.min(parseFloat(val) || 0, parseFloat(zData[idx]) || 0));
                        maxYData = yData.map((val, idx) => Math.max(parseFloat(val) || 0, parseFloat(zData[idx]) || 0));
                    } else {
                        // Create range from yData (subtract/add 10% for demo)
                        const yNums = yData.map(v => parseFloat(v) || 0);
                        minYData = yNums.map(val => val * 0.9);
                        maxYData = yNums.map(val => val * 1.1);
                    }
                    // Create closed polygon for range area
                    data = [{
                        x: xData.concat(xData.slice().reverse()),
                        y: maxYData.concat(minYData.slice().reverse()),
                        type: 'scatter',
                        mode: 'lines',
                        name: yLabel,
                        fill: 'toself',
                        fillcolor: hexToRgbaForFill(areaColor, 0.3),
                        line: { color: areaColor, width: 2 }
                    }];
                    break;
                    
                default:
                    // Default to simple
                    data = [{
                        x: xData,
                        y: yData,
                        type: 'scatter',
                        mode: 'lines',
                        name: yLabel,
                        fill: 'tozeroy',
                        fillcolor: hexToRgbaForFill(areaColor, 0.3),
                        line: { color: areaColor, width: 2 }
                    }];
            }
            
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'pie':
            // Get pie chart type from settings or parameter
            const currentPieChartType = pieChartType || settings?.pieChartType || 'simple';
            
            // Check if we have valid data
            const hasPieData = xData.length > 0 && yData.length > 0;
            
            // If no data, show gray placeholder chart
            if (!hasPieData) {
                const placeholderLabels = ['A', 'B', 'C', 'D'];
                const placeholderValues = [30, 25, 20, 25];
                
                let placeholderChartData = [];
                let placeholderLayout = JSON.parse(JSON.stringify(layout));
                placeholderLayout.paper_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.plot_bgcolor = 'rgba(0,0,0,0)';
                placeholderLayout.font = { size: fontSize, color: '#9CA3AF' };
                placeholderLayout.showlegend = false;
                
                // Create placeholder based on pie chart type
                switch(currentPieChartType) {
                    case 'simple':
                        placeholderChartData = [{
                            labels: placeholderLabels,
                            values: placeholderValues,
                            type: 'pie',
                            marker: { colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'] },
                            opacity: 0.7
                        }];
                        break;
                        
                    case 'doughnut':
                        placeholderChartData = [{
                            labels: placeholderLabels,
                            values: placeholderValues,
                            type: 'pie',
                            hole: 0.4,
                            marker: { colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'] },
                            opacity: 0.7
                        }];
                        break;
                        
                    case 'exploded':
                        placeholderChartData = [{
                            labels: placeholderLabels,
                            values: placeholderValues,
                            type: 'pie',
                            pull: 0.1,
                            marker: { colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'] },
                            opacity: 0.7
                        }];
                        break;
                        
                    default:
                        placeholderChartData = [{
                            labels: placeholderLabels,
                            values: placeholderValues,
                            type: 'pie',
                            marker: { colors: ['#9CA3AF', '#D1D5DB', '#E5E7EB', '#F3F4F6'] },
                            opacity: 0.7
                        }];
                }
                
                // Render placeholder chart
                if (typeof Plotly !== 'undefined') {
                    Plotly.newPlot(containerId, placeholderChartData, placeholderLayout, {
                        displayModeBar: false,
                        staticPlot: true
                    });
                }
                return;
            }
            
            // Render actual pie chart based on type
            // Create base pie chart data object
            const basePieData = {
                labels: xData,
                values: yData,
                type: 'pie',
                marker: { colors: chartColors.slice(0, Math.max(xData.length, 4)) }
            };
            
            switch(currentPieChartType) {
                case 'simple':
                    // Simple Pie Chart - normal pie chart (no hole, no pull)
                    data = [{
                        ...basePieData
                    }];
                    // Explicitly remove hole and pull if they exist
                    if (data[0].hole !== undefined) delete data[0].hole;
                    if (data[0].pull !== undefined) delete data[0].pull;
                    break;
                    
                case 'doughnut':
                    // Doughnut Chart - pie chart with hole in center
                    data = [{
                        ...basePieData,
                        hole: 0.4
                    }];
                    // Explicitly remove pull if it exists
                    if (data[0].pull !== undefined) delete data[0].pull;
                    break;
                    
                case 'exploded':
                    // Exploded Pie Chart - slices pulled apart
                    data = [{
                        ...basePieData,
                        pull: 0.1
                    }];
                    // Explicitly remove hole if it exists
                    if (data[0].hole !== undefined) delete data[0].hole;
                    break;
                    
                default:
                    // Default to simple
                    data = [{
                        ...basePieData
                    }];
                    // Explicitly remove hole and pull if they exist
                    if (data[0].hole !== undefined) delete data[0].hole;
                    if (data[0].pull !== undefined) delete data[0].pull;
            }
            break;
            
        case 'scatter':
            const scatterColor = chartColors[0] || '#007bff';
            const scatterType = currentScatterChartType || 'simple';
            
            switch(scatterType) {
                case 'simple':
                    // Simple scatter chart
                    data = [{
                        x: xData,
                        y: yData,
                        mode: 'markers',
                        type: 'scatter',
                        marker: { color: scatterColor, size: 12 }
                    }];
                    break;
                    
                case 'trendline':
                    // Scatter chart with trendline
                    // Calculate linear regression for trendline
                    const n = xData.length;
                    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
                    for (let i = 0; i < n; i++) {
                        const x = parseFloat(xData[i]) || 0;
                        const y = parseFloat(yData[i]) || 0;
                        sumX += x;
                        sumY += y;
                        sumXY += x * y;
                        sumXX += x * x;
                    }
                    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
                    const intercept = (sumY - slope * sumX) / n;
                    
                    // Generate trendline points
                    const trendlineY = xData.map(x => {
                        const xVal = parseFloat(x) || 0;
                        return slope * xVal + intercept;
                    });
                    
                    data = [
                        {
                            x: xData,
                            y: yData,
                            mode: 'markers',
                            type: 'scatter',
                            marker: { color: scatterColor, size: 12 },
                            name: 'Data'
                        },
                        {
                            x: xData,
                            y: trendlineY,
                            mode: 'lines',
                            type: 'scatter',
                            line: { color: scatterColor, width: 2, dash: 'dash' },
                            name: 'Trendline'
                        }
                    ];
                    layout.showlegend = true;
                    break;
                    
                case 'bubble':
                    // Bubble chart - use z-axis data for bubble sizes
                    let zData = [];
                    if (zAxisColumn && df[zAxisColumn]) {
                        zData = df[zAxisColumn].map(v => parseFloat(v) || 0);
                    } else if (columnNames.length > 2 && df[columnNames[2]]) {
                        zData = df[columnNames[2]].map(v => parseFloat(v) || 0);
                    } else {
                        // Default bubble sizes if no z-axis data
                        zData = yData.map(() => 10);
                    }
                    
                    // Normalize bubble sizes
                    const maxZ = Math.max(...zData, 1);
                    const normalizedSizes = zData.map(z => (z / maxZ) * 30); // Scale to reasonable size
                    
                    data = [{
                        x: xData,
                        y: yData,
                        mode: 'markers',
                        type: 'scatter',
                        marker: {
                            color: scatterColor,
                            size: normalizedSizes,
                            sizeref: 0.1,
                            sizemode: 'diameter',
                            opacity: 0.7
                        }
                    }];
                    break;
                    
                default:
                    data = [{
                        x: xData,
                        y: yData,
                        mode: 'markers',
                        type: 'scatter',
                        marker: { color: scatterColor, size: 12 }
                    }];
            }
            
            layout.xaxis.title = settings?.xAxisLabel || xLabel;
            layout.yaxis.title = settings?.yAxisLabel || yLabel;
            if (scatterType === 'bubble' && zAxisColumn) {
                layout.yaxis.title = settings?.zAxisLabel || (columnNames.length > 2 ? columnNames[2] : 'Size');
            }
            break;
            
        case 'histogram':
            const histColor = chartColors[0] || '#007bff';
            data = [{
                x: yData,
                type: 'histogram',
                marker: { color: histColor }
            }];
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            break;
            
        case 'box':
            const boxColor = chartColors[0] || '#007bff';
            data = [{
                y: yData,
                type: 'box',
                marker: { color: boxColor }
            }];
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'heatmap':
            const heatmapColor = chartColors[0] || '#007bff';
            // Get second Y column from data table for heatmap - only if available
            const heatmapY2Column = columnNames.length > 2 ? columnNames[2] : (columnNames.length > 1 ? columnNames[1] : null);
            const heatmapYData = (heatmapY2Column && df[heatmapY2Column]) ? df[heatmapY2Column] : yData;
            const heatmapY2Label = heatmapY2Column || yLabel;
            
            // Create z matrix for heatmap - convert to numbers
            const z1 = Array.isArray(yData) ? yData.map(v => parseFloat(v) || 0) : [0];
            const z2 = Array.isArray(heatmapYData) ? heatmapYData.map(v => parseFloat(v) || 0) : [0];
            
            data = [{
                z: [z1, z2],
                x: xData,
                y: [yLabel, heatmapY2Label],
                type: 'heatmap',
                colorscale: 'Blues',
                showscale: true
            }];
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'treemap':
            const treemapType = currentTreemapChartType || 'basic';
            const treemapColor = chartColors[0] || '#007bff';
            // Convert values to numbers for treemap
            const treemapValues = Array.isArray(yData) ? yData.map(v => parseFloat(v) || 0) : [0];
            
            if (treemapType === 'hierarchical') {
                // Hierarchical treemap - create parent-child relationships
                // Use z-axis data for parent categories if available
                let parents = [];
                if (zAxisColumn && df[zAxisColumn]) {
                    parents = df[zAxisColumn].map(v => String(v || ''));
                } else if (columnNames.length > 2 && df[columnNames[2]]) {
                    parents = df[columnNames[2]].map(v => String(v || ''));
                } else {
                    // Default: group items by first letter or create categories
                    parents = xData.map((label, idx) => {
                        if (idx < Math.floor(xData.length / 2)) return 'Category A';
                        return 'Category B';
                    });
                }
                
                data = [{
                    type: 'treemap',
                    labels: xData,
                    values: treemapValues,
                    parents: parents,
                    marker: { 
                        colors: chartColors.length >= 4 ? chartColors.slice(0, 4) : [treemapColor, '#28a745', '#ffc107', '#dc3545']
                    }
                }];
            } else {
                // Basic treemap - flat structure
                data = [{
                    type: 'treemap',
                    labels: xData,
                    values: treemapValues,
                    parents: Array(xData.length).fill(''),
                    marker: { 
                        colors: chartColors.length >= 4 ? chartColors.slice(0, 4) : [treemapColor, '#28a745', '#ffc107', '#dc3545']
                    }
                }];
            }
            break;
            
        case 'waterfall':
            const waterfallColor = chartColors[0] || '#007bff';
            // Convert yData to numbers for waterfall
            const waterfallYData = Array.isArray(yData) ? yData.map(v => parseFloat(v) || 0) : [0];
            data = [{
                type: 'waterfall',
                x: xData,
                y: waterfallYData,
                connector: { line: { color: 'rgb(63, 63, 63)' } },
                marker: { color: waterfallColor }
            }];
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'gauge':
            // Get gauge value from data - use first value from yData or default
            const gaugeValue = yData && yData.length > 0 ? parseFloat(yData[0]) || 70 : 70;
            const gaugeMax = yData && yData.length > 0 ? Math.max(...yData.map(v => parseFloat(v) || 0)) : 100;
            data = [{
                type: 'indicator',
                mode: 'gauge+number',
                value: gaugeValue,
                title: { text: yLabel || 'KPI' },
                gauge: {
                    axis: { range: [null, gaugeMax || 100] },
                    bar: { color: chartColors[0] || '#007bff' },
                    steps: [
                        { range: [0, (gaugeMax || 100) * 0.5], color: 'lightgray' },
                        { range: [(gaugeMax || 100) * 0.5, (gaugeMax || 100) * 0.8], color: 'gray' }
                    ],
                    threshold: {
                        line: { color: 'red', width: 4 },
                        thickness: 0.75,
                        value: (gaugeMax || 100) * 0.9
                    }
                }
            }];
            break;
            
        case 'funnel':
            const funnelColor = chartColors[0] || '#007bff';
            // Funnel needs data - check if we have it
            if (!xData || xData.length === 0 || !yData || yData.length === 0) {
                container.innerHTML = `
                    <div class="flex items-center justify-center h-full text-gray-400">
                        <div class="text-center">
                            <span class="material-symbols-outlined text-4xl mb-2">filter_alt</span>
                            <p class="text-sm">No data available</p>
                            <p class="text-xs mt-1">Add data to see funnel chart</p>
                        </div>
                    </div>
                `;
                return;
            }
            data = [{
                type: 'funnel',
                y: xData,
                x: yData,
                marker: { color: funnelColor }
            }];
            if (settings?.xAxisLabel) layout.xaxis.title = settings.xAxisLabel;
            if (settings?.yAxisLabel) layout.yaxis.title = settings.yAxisLabel;
            break;
            
        case 'radar':
            const radarColor = chartColors[0] || '#007bff';
            // Radar needs data - check if we have it
            if (!xData || xData.length === 0 || !yData || yData.length === 0) {
                container.innerHTML = `
                    <div class="flex items-center justify-center h-full text-gray-400">
                        <div class="text-center">
                            <span class="material-symbols-outlined text-4xl mb-2">radar</span>
                            <p class="text-sm">No data available</p>
                            <p class="text-xs mt-1">Add data to see radar chart</p>
                        </div>
                    </div>
                `;
                return;
            }
            data = [{
                type: 'scatterpolar',
                r: yData,
                theta: xData,
                fill: 'toself',
                name: yLabel || 'Series 1',
                marker: { color: radarColor }
            }];
            layout.polar = {
                radialaxis: { visible: true }
            };
            break;
            
        case 'combo':
            // Get columns from data table for combo chart - only if available
            const comboY1Column = columnNames.length > 1 ? columnNames[1] : null;
            const comboY2Column = columnNames.length > 2 ? columnNames[2] : (columnNames.length > 1 ? columnNames[1] : null);
            const comboY1Data = (comboY1Column && df[comboY1Column]) ? df[comboY1Column] : yData;
            const comboY2Data = (comboY2Column && df[comboY2Column]) ? df[comboY2Column] : yData;
            data = [
                { x: xData, y: comboY1Data, type: 'bar', name: comboY1Column, marker: { color: '#007bff' } },
                { x: xData, y: comboY2Data, type: 'scatter', mode: 'lines+markers', name: comboY2Column, yaxis: 'y2', marker: { color: '#28a745' } }
            ];
            layout.yaxis2 = { overlaying: 'y', side: 'right' };
            break;
            
        case 'table':
            // Check if we have data for table
            if (!df || Object.keys(df).length === 0 || columnNames.length === 0) {
                // Show placeholder table with gray colors
                data = [{
                    type: 'table',
                    header: {
                        values: [['Column 1', 'Column 2', 'Column 3']],
                        fill: { color: '#9CA3AF' },
                        font: { color: 'white', size: 12 }
                    },
                    cells: {
                        values: [
                            ['Value 1', 'Value 2', 'Value 3'],
                            ['Value 4', 'Value 5', 'Value 6'],
                            ['Value 7', 'Value 8', 'Value 9']
                        ],
                        fill: { color: ['#F3F4F6', '#E5E7EB'] },
                        font: { size: 12, color: '#6B7280' }
                    },
                    opacity: 0.7
                }];
                layout.paper_bgcolor = 'rgba(0,0,0,0)';
                break;
            }
            
            // Get available columns from df
            const tableHeaders = Object.keys(df).filter(key => Array.isArray(df[key]) && df[key].length > 0);
            const tableValues = tableHeaders.map(key => df[key]);
            
            if (tableHeaders.length === 0) {
                // Show placeholder table with gray colors
                data = [{
                    type: 'table',
                    header: {
                        values: [['Column 1', 'Column 2', 'Column 3']],
                        fill: { color: '#9CA3AF' },
                        font: { color: 'white', size: 12 }
                    },
                    cells: {
                        values: [
                            ['Value 1', 'Value 2', 'Value 3'],
                            ['Value 4', 'Value 5', 'Value 6'],
                            ['Value 7', 'Value 8', 'Value 9']
                        ],
                        fill: { color: ['#F3F4F6', '#E5E7EB'] },
                        font: { size: 12, color: '#6B7280' }
                    },
                    opacity: 0.7
                }];
                layout.paper_bgcolor = 'rgba(0,0,0,0)';
                break;
            }
            
            // Render table based on type
            const tableType = currentTableChartType || 'basic';
            const tableColor = chartColors[0] || '#007bff';
            
            switch(tableType) {
                case 'basic':
                    // Basic table - standard table display
                    data = [{
                        type: 'table',
                        header: {
                            values: tableHeaders,
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: tableValues,
                            fill: { color: ['white', '#f8f9fa'] },
                            font: { size: 12 }
                        }
                    }];
                    break;
                    
                case 'summary':
                    // Summary / KPI Table - add summary row at the end
                    const summaryRow = tableValues.map(col => {
                        const numericValues = col.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).map(v => parseFloat(v));
                        if (numericValues.length > 0) {
                            const sum = numericValues.reduce((a, b) => a + b, 0);
                            return sum.toLocaleString();
                        }
                        return '-';
                    });
                    const extendedValues = tableValues.map((col, idx) => [...col, summaryRow[idx]]);
                    const extendedHeaders = [...tableHeaders, 'Total'];
                    
                    data = [{
                        type: 'table',
                        header: {
                            values: extendedHeaders,
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: extendedValues,
                            fill: { color: ['white', '#f8f9fa'] },
                            font: { size: 12 },
                            line: { color: ['white', '#f8f9fa', '#007bff'], width: [1, 1, 2] }
                        }
                    }];
                    break;
                    
                case 'pivot':
                    // Pivot Table - transpose rows and columns (simplified pivot)
                    const pivotHeaders = Array.from({ length: tableValues[0]?.length || 0 }, (_, i) => `Row ${i + 1}`);
                    const pivotValues = tableHeaders.map((header, idx) => tableValues[idx] || []);
                    
                    data = [{
                        type: 'table',
                        header: {
                            values: ['Category', ...pivotHeaders],
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: [tableHeaders, ...pivotValues],
                            fill: { color: ['white', '#f8f9fa'] },
                            font: { size: 12 }
                        }
                    }];
                    break;
                    
                case 'matrix':
                    // Matrix Table - highlight cells based on values
                    const matrixValues = tableValues.map(col => col.map(val => {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal) && isFinite(numVal)) {
                            return numVal.toLocaleString();
                        }
                        return String(val);
                    }));
                    
                    // Create color matrix based on values
                    const matrixFill = tableValues.map(col => col.map(val => {
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal) && isFinite(numVal)) {
                            // Color intensity based on value
                            const maxVal = Math.max(...tableValues.flat().map(v => parseFloat(v) || 0).filter(v => !isNaN(v)));
                            const intensity = maxVal > 0 ? numVal / maxVal : 0;
                            const r = Math.floor(255 - intensity * 100);
                            const g = Math.floor(255 - intensity * 50);
                            const b = Math.floor(255 - intensity * 50);
                            return `rgb(${r},${g},${b})`;
                        }
                        return 'white';
                    }));
                    
                    data = [{
                        type: 'table',
                        header: {
                            values: tableHeaders,
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: matrixValues,
                            fill: { color: matrixFill },
                            font: { size: 12 }
                        }
                    }];
                    break;
                    
                case 'ranking':
                    // Ranking Table - sort by first numeric column and add rank
                    const rankingHeaders = ['Rank', ...tableHeaders];
                    const firstCol = tableValues[0] || [];
                    const numericIndices = firstCol.map((val, idx) => ({
                        val: parseFloat(val) || 0,
                        idx: idx
                    })).sort((a, b) => b.val - a.val);
                    
                    const rankedValues = [numericIndices.map((_, idx) => idx + 1), ...tableHeaders.map((header, colIdx) => {
                        return numericIndices.map(item => tableValues[colIdx]?.[item.idx] || '-');
                    })];
                    
                    data = [{
                        type: 'table',
                        header: {
                            values: rankingHeaders,
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: rankedValues,
                            fill: { color: ['white', '#f8f9fa'] },
                            font: { size: 12 }
                        }
                    }];
                    break;
                    
                default:
                    // Basic table as default
                    data = [{
                        type: 'table',
                        header: {
                            values: tableHeaders,
                            fill: { color: tableColor },
                            font: { color: 'white', size: 12 }
                        },
                        cells: {
                            values: tableValues,
                            fill: { color: ['white', '#f8f9fa'] },
                            font: { size: 12 }
                        }
                    }];
            }
            break;
            
        case 'list':
            // List widget - simple vertical list display
            // Check if we have data
            if (!df || Object.keys(df).length === 0 || columnNames.length === 0) {
                // Show placeholder list with gray colors
                container.innerHTML = `
                    <div class="opacity-70">
                        <div class="space-y-2">
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 1</div>
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 2</div>
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 3</div>
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">Item 4</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Get first column data for list items
            const listColumn = columnNames[0] || 'Column 1';
            const listData = df[listColumn] || [];
            
            if (listData.length === 0) {
                container.innerHTML = `
                    <div class="opacity-70">
                        <div class="space-y-2">
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm">No items</div>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Get chart colors
            const listColors = settings?.chartColors || settings?.colors || ['#007bff'];
            const listColor = listColors[0] || '#007bff';
            
            // Convert hex to RGB for border color
            function hexToRgbForList(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
            
            const listRgb = hexToRgbForList(listColor);
            const borderColor = `rgb(${listRgb.r},${listRgb.g},${listRgb.b})`;
            const bgColor = `rgba(${listRgb.r},${listRgb.g},${listRgb.b},0.1)`;
            
            // Create list HTML
            const listItems = listData.map((item, idx) => {
                const displayValue = item !== null && item !== undefined ? String(item) : '';
                return `
                    <div class="p-3 border rounded text-sm hover:shadow-md transition-shadow cursor-pointer" 
                         style="border-color: ${borderColor}; background-color: ${idx % 2 === 0 ? bgColor : 'white'};">
                        ${displayValue}
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div class="space-y-2">
                    ${listItems}
                </div>
            `;
            return;
            
        case 'hierarchy-list':
            // Hierarchy List widget - expandable hierarchical list display
            // Check if we have data
            if (!df || Object.keys(df).length === 0 || columnNames.length === 0) {
                // Show placeholder hierarchy list with gray colors
                container.innerHTML = `
                    <div class="opacity-70">
                        <div class="space-y-1">
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                                <span>Category 1</span>
                            </div>
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 ml-4">
                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                                <span>Category 2</span>
                            </div>
                            <div class="p-3 bg-gray-200 border border-gray-300 rounded text-gray-500 text-sm flex items-center gap-2 ml-4">
                                <span class="material-symbols-outlined text-sm">chevron_right</span>
                                <span>Category 3</span>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Get chart colors
            const hierarchyColors = settings?.chartColors || settings?.colors || ['#007bff'];
            const hierarchyColor = hierarchyColors[0] || '#007bff';
            
            // Convert hex to RGB for border color
            function hexToRgbForHierarchy(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
            
            const hierarchyRgb = hexToRgbForHierarchy(hierarchyColor);
            const hierarchyBorderColor = `rgb(${hierarchyRgb.r},${hierarchyRgb.g},${hierarchyRgb.b})`;
            const hierarchyBgColor = `rgba(${hierarchyRgb.r},${hierarchyRgb.g},${hierarchyRgb.b},0.1)`;
            
            // Build hierarchy structure from data
            // First column is parent, subsequent columns are children
            const parentColumn = columnNames[0] || 'Column 1';
            const childColumns = columnNames.slice(1);
            
            const parentData = df[parentColumn] || [];
            
            // Group data by parent values
            const hierarchyMap = {};
            parentData.forEach((parentValue, idx) => {
                const parentKey = parentValue !== null && parentValue !== undefined ? String(parentValue).trim() : '';
                if (!parentKey) return;
                
                if (!hierarchyMap[parentKey]) {
                    hierarchyMap[parentKey] = {
                        parent: parentKey,
                        children: []
                    };
                }
                
                // Add child data for this parent
                const childData = {};
                childColumns.forEach((childCol, colIdx) => {
                    const childValues = df[childCol] || [];
                    if (childValues[idx] !== null && childValues[idx] !== undefined) {
                        childData[childCol] = String(childValues[idx]).trim();
                    }
                });
                
                if (Object.keys(childData).length > 0) {
                    hierarchyMap[parentKey].children.push(childData);
                }
            });
            
            // Generate hierarchy HTML
            const hierarchyItems = Object.values(hierarchyMap).map((item, idx) => {
                const hasChildren = item.children.length > 0;
                const itemId = `hierarchy-item-${containerId.replace(/[^a-zA-Z0-9]/g, '-')}-${idx}`;
                const childrenId = `hierarchy-children-${containerId.replace(/[^a-zA-Z0-9]/g, '-')}-${idx}`;
                
                // Build children HTML
                const childrenHTML = item.children.map((child, childIdx) => {
                    const childValues = Object.values(child).filter(v => v).join(' - ');
                    return `
                        <div class="p-2 pl-8 border-l-2 rounded text-sm hover:bg-gray-50 transition-colors cursor-pointer" 
                             style="border-color: ${hierarchyBorderColor}; background-color: ${childIdx % 2 === 0 ? hierarchyBgColor : 'transparent'};">
                            ${childValues || 'No data'}
                        </div>
                    `;
                }).join('');
                
                return `
                    <div class="hierarchy-parent-item">
                        <div class="p-3 border rounded text-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-2" 
                             style="border-color: ${hierarchyBorderColor}; background-color: ${idx % 2 === 0 ? hierarchyBgColor : 'white'};"
                             onclick="toggleHierarchyChildren('${childrenId}', '${itemId}')">
                            <span class="material-symbols-outlined text-sm hierarchy-chevron transition-transform" id="${itemId}" style="transition: transform 0.2s;">chevron_right</span>
                            <span class="flex-1 font-medium">${item.parent}</span>
                            ${hasChildren ? `<span class="text-xs text-gray-500">(${item.children.length})</span>` : ''}
                        </div>
                        <div class="hierarchy-children hidden ml-4 mt-1 space-y-1" id="${childrenId}">
                            ${childrenHTML}
                        </div>
                    </div>
                `;
            }).join('');
            
            container.innerHTML = `
                <div class="space-y-1">
                    ${hierarchyItems}
                </div>
            `;
            
            // Add toggle function to window if not exists
            if (typeof window.toggleHierarchyChildren === 'undefined') {
                window.toggleHierarchyChildren = function(childrenId, chevronId) {
                    const childrenDiv = document.getElementById(childrenId);
                    const chevron = document.getElementById(chevronId);
                    
                    if (childrenDiv && chevron) {
                        const isHidden = childrenDiv.classList.contains('hidden');
                        if (isHidden) {
                            childrenDiv.classList.remove('hidden');
                            chevron.style.transform = 'rotate(90deg)';
                        } else {
                            childrenDiv.classList.add('hidden');
                            chevron.style.transform = 'rotate(0deg)';
                        }
                    }
                };
            }
            
            return;
            
        case 'card':
            // Power BI Card - KPI Card - Clickable for drill through
            const cardType = currentCardChartType || 'basic';
            const cardChartColors = settings?.chartColors || settings?.colors || ['#007bff'];
            const cardColor = cardChartColors[0] || '#007bff';
            
            // Helper function to convert hex to RGB
            function hexToRgbForCard(hex) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16)
                };
            }
            
            // Check if we have data
            // For canvas, check if we have actual data (not preview)
            const hasCardData = !isPreview ? (hasData || hasSettingsData) : (hasData || hasSettingsData);
            
            if (!hasCardData) {
                // Show placeholder card based on card type - always gray for canvas when no data
                const grayGradient = `from-gray-400 to-gray-600`;
                const grayText = `text-gray-200`;
                let placeholderHTML = '';
                
                switch(cardType) {
                    case 'basic':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                            </div>
                        `;
                        break;
                    case 'comparison':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                                <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                                    <span class="material-symbols-outlined text-sm">compare_arrows</span>
                                    <span>vs $110,000</span>
                                </div>
                            </div>
                        `;
                        break;
                    case 'percent':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                                <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                                    <span class="material-symbols-outlined text-sm">trending_up</span>
                                    <span>+12.5%</span>
                                </div>
                            </div>
                        `;
                        break;
                    case 'target':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                                <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                                    <span class="material-symbols-outlined text-sm">flag</span>
                                    <span>Target: $150,000</span>
                                </div>
                                <div class="mt-2 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                                    <div class="h-full bg-white bg-opacity-60 rounded-full" style="width: 83.6%"></div>
                                </div>
                            </div>
                        `;
                        break;
                    case 'status':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                                <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                                    <span class="material-symbols-outlined text-sm">check_circle</span>
                                    <span>On Track</span>
                                </div>
                            </div>
                        `;
                        break;
                    case 'multi':
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                                <div class="grid grid-cols-2 gap-2 mt-3 text-xs ${grayText}">
                                    <div>
                                        <div class="flex items-center gap-1">
                                            <span class="material-symbols-outlined text-sm">flag</span>
                                            <span>Target: $150K</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-1">
                                            <span class="material-symbols-outlined text-sm">trending_up</span>
                                            <span>Change: +12.5%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        break;
                    default:
                        placeholderHTML = `
                            <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                                <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                                <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                            </div>
                        `;
                }
                container.innerHTML = placeholderHTML;
                return;
            }
            
            // Card with data
            // Check if we actually have valid data (not just default values)
            const hasValidCardData = yData && yData.length > 0 && yData[0] !== null && yData[0] !== undefined && String(yData[0]).trim() !== '';
            const cardValue = hasValidCardData ? (parseFloat(yData[0]) || 125430) : 125430;
            const cardLabel = yLabel || 'Total Sales';
            let comparisonValue = null;
            let percentChange = null;
            let targetValue = null;
            let statusValue = null;
            
            // Get additional values from data
            if (yData && yData.length > 1) {
                comparisonValue = parseFloat(yData[1]) || null;
            }
            if (yData && yData.length > 2) {
                percentChange = parseFloat(yData[2]) || null;
            }
            if (yData && yData.length > 3) {
                targetValue = parseFloat(yData[3]) || null;
            }
            if (yData && yData.length > 4) {
                statusValue = parseFloat(yData[4]) || null;
            }
            
            // For canvas, if no valid data, show gray card
            // For preview, show colored card even with placeholder data
            const shouldShowGray = !isPreview && !hasValidCardData;
            
            // Convert hex to RGB for gradient
            const rgb = hexToRgbForCard(cardColor);
            const gradientFrom = shouldShowGray ? `rgba(156, 163, 175, 1)` : `rgba(${rgb.r},${rgb.g},${rgb.b},1)`;
            const gradientTo = shouldShowGray ? `rgba(107, 114, 128, 0.7)` : `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`;
            const textColor = shouldShowGray ? 'text-gray-200' : 'text-white';
            const formattedValue = typeof cardValue === 'number' ? `$${cardValue.toLocaleString()}` : cardValue;
            
            let cardHTML = '';
            switch(cardType) {
                case 'basic':
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                        </div>
                    `;
                    break;
                case 'comparison':
                    const comparisonText = comparisonValue ? `vs $${comparisonValue.toLocaleString()}` : 'vs Previous';
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                            <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                                <span class="material-symbols-outlined text-sm">compare_arrows</span>
                                <span>${comparisonText}</span>
                            </div>
                        </div>
                    `;
                    break;
                case 'percent':
                    const percentText = percentChange !== null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '+12.5%';
                    const trendIcon = percentChange >= 0 ? 'trending_up' : 'trending_down';
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                            <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                                <span class="material-symbols-outlined text-sm">${trendIcon}</span>
                                <span>${percentText}</span>
                            </div>
                        </div>
                    `;
                    break;
                case 'target':
                    const targetText = targetValue ? `Target: $${targetValue.toLocaleString()}` : 'Target: $150,000';
                    const progress = targetValue ? Math.min((cardValue / targetValue) * 100, 100) : 83.6;
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                            <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                                <span class="material-symbols-outlined text-sm">flag</span>
                                <span>${targetText}</span>
                            </div>
                            <div class="mt-2 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                                <div class="h-full bg-white bg-opacity-60 rounded-full" style="width: ${progress}%"></div>
                            </div>
                        </div>
                    `;
                    break;
                case 'status':
                    const statusText = statusValue !== null ? (statusValue >= 0 ? 'On Track' : 'Below Target') : 'On Track';
                    const statusIcon = statusValue !== null ? (statusValue >= 0 ? 'check_circle' : 'warning') : 'check_circle';
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                            <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                                <span class="material-symbols-outlined text-sm">${statusIcon}</span>
                                <span>${statusText}</span>
                            </div>
                        </div>
                    `;
                    break;
                case 'multi':
                    const multiTarget = targetValue ? `$${targetValue.toLocaleString()}` : '$150K';
                    const multiChange = percentChange !== null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '+12.5%';
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                            <div class="grid grid-cols-2 gap-2 mt-3 text-xs opacity-75">
                                <div>
                                    <div class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-sm">flag</span>
                                        <span>Target: ${multiTarget}</span>
                                    </div>
                                </div>
                                <div>
                                    <div class="flex items-center gap-1">
                                        <span class="material-symbols-outlined text-sm">trending_up</span>
                                        <span>Change: ${multiChange}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    break;
                default:
                    cardHTML = `
                        <div class="card-widget ${textColor} p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                            <div class="text-sm opacity-90 mb-2">${cardLabel}</div>
                            <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                        </div>
                    `;
            }
            
            container.innerHTML = cardHTML;
            // Initialize card click handler after a short delay
            setTimeout(() => {
                initCardWidget(container);
            }, 100);
            return;
            
        case 'button-slicer':
            // Power BI Button Slicer - Interactive for drill through
            // Only get data if connection exists - no automatic connection
            let buttonSlicerData = [];
            const widgetButton = container.closest('.chart-widget');
            const widgetIdButton = widgetButton ? widgetButton.dataset.widgetId : null;
            
            // Check if slicer has a connection
            if (widgetIdButton && window.slicerModelConnections && window.slicerModelConnections[widgetIdButton] && window.slicerModelConnections[widgetIdButton].length > 0) {
                const connection = window.slicerModelConnections[widgetIdButton][0];
                const columnName = connection.editableName || connection.columnName;
                const columnIndex = parseInt(connection.columnIndex);
                
                // Get data from connected model's data
                if (window.csvData && window.csvData.length > 0 && !isNaN(columnIndex)) {
                    if (columnIndex >= 0 && columnIndex < window.csvData[0].length) {
                        for (let i = 1; i < window.csvData.length; i++) {
                            const val = window.csvData[i][columnIndex];
                            if (val && val.toString().trim() !== '' && !buttonSlicerData.includes(val.toString().trim())) {
                                buttonSlicerData.push(val.toString().trim());
                            }
                        }
                    }
                }
            }
            
            // If no data or no connection, show placeholder preview
            if (buttonSlicerData.length === 0) {
                container.innerHTML = `
                    <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-70">
                        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3">Value</div>
                        <div class="flex flex-wrap gap-2">
                            <button class="px-3 py-1.5 rounded text-xs bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400" style="cursor: default; pointer-events: none;">
                                Option 1
                            </button>
                            <button class="px-3 py-1.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500" style="cursor: default; pointer-events: none;">
                                Option 2
                            </button>
                            <button class="px-3 py-1.5 rounded text-xs bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500" style="cursor: default; pointer-events: none;">
                                Option 3
                            </button>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Get column name from connection
            const widgetForNameButton = container.closest('.chart-widget');
            const widgetIdForNameButton = widgetForNameButton ? widgetForNameButton.dataset.widgetId : null;
            let displayColumnName = 'Value';
            if (widgetIdForNameButton && window.slicerModelConnections && window.slicerModelConnections[widgetIdForNameButton] && window.slicerModelConnections[widgetIdForNameButton].length > 0) {
                const connection = window.slicerModelConnections[widgetIdForNameButton][0];
                displayColumnName = connection.editableName || connection.columnName || 'Value';
            }
            
            container.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">${displayColumnName}</div>
                    <div class="flex flex-wrap gap-2">
                        ${buttonSlicerData.map((val, idx) => `
                            <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                                    data-value="${val}" 
                                    style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                                ${val}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
            // Initialize button slicer after a short delay to ensure DOM is ready
            setTimeout(() => {
                initButtonSlicer(container);
            }, 100);
            return;
            
        case 'text-slicer':
            // Power BI Text Slicer - Interactive for drill through
            container.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-70">
                    <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Value</div>
                    <input type="text" placeholder="Type to filter..." class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500" style="cursor: default; pointer-events: none;" disabled>
                    <div class="mt-2 text-xs text-gray-400 dark:text-gray-500">Filter results will appear here</div>
                </div>
            `;
            // Initialize text slicer after a short delay
            setTimeout(() => {
                initTextSlicer(container);
            }, 100);
            return;
            
        case 'list-slicer':
            // Power BI List Slicer - Interactive for drill through
            // Only get data if connection exists - no automatic connection
            let listSlicerData = [];
            const widgetList = container.closest('.chart-widget');
            const widgetIdList = widgetList ? widgetList.dataset.widgetId : null;
            
            // Check if slicer has a connection
            if (widgetIdList && window.slicerModelConnections && window.slicerModelConnections[widgetIdList] && window.slicerModelConnections[widgetIdList].length > 0) {
                const connection = window.slicerModelConnections[widgetIdList][0];
                const columnName = connection.editableName || connection.columnName;
                const columnIndex = parseInt(connection.columnIndex);
                
                // Get data from connected model's data
                if (window.csvData && window.csvData.length > 0 && !isNaN(columnIndex)) {
                    if (columnIndex >= 0 && columnIndex < window.csvData[0].length) {
                        for (let i = 1; i < window.csvData.length; i++) {
                            const val = window.csvData[i][columnIndex];
                            if (val && val.toString().trim() !== '' && !listSlicerData.includes(val.toString().trim())) {
                                listSlicerData.push(val.toString().trim());
                            }
                        }
                    }
                }
            }
            
            // If no data or no connection, show placeholder preview
            if (listSlicerData.length === 0) {
                container.innerHTML = `
                    <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-70">
                        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Value</div>
                        <div class="max-h-48 overflow-y-auto space-y-1">
                            <label class="flex items-center gap-2 p-1 rounded bg-gray-100 dark:bg-gray-700 cursor-default" style="pointer-events: none;">
                                <input type="checkbox" class="bg-gray-300 dark:bg-gray-600" disabled style="pointer-events: none;">
                                <span class="text-xs text-gray-400 dark:text-gray-500">Option 1</span>
                            </label>
                            <label class="flex items-center gap-2 p-1 rounded cursor-default" style="pointer-events: none;">
                                <input type="checkbox" class="bg-gray-300 dark:bg-gray-600" disabled style="pointer-events: none;">
                                <span class="text-xs text-gray-400 dark:text-gray-500">Option 2</span>
                            </label>
                            <label class="flex items-center gap-2 p-1 rounded cursor-default" style="pointer-events: none;">
                                <input type="checkbox" class="bg-gray-300 dark:bg-gray-600" disabled style="pointer-events: none;">
                                <span class="text-xs text-gray-400 dark:text-gray-500">Option 3</span>
                            </label>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Get column name from connection
            const widgetForNameList = container.closest('.chart-widget');
            const widgetIdForNameList = widgetForNameList ? widgetForNameList.dataset.widgetId : null;
            let displayColumnNameList = 'Value';
            if (widgetIdForNameList && window.slicerModelConnections && window.slicerModelConnections[widgetIdForNameList] && window.slicerModelConnections[widgetIdForNameList].length > 0) {
                const connection = window.slicerModelConnections[widgetIdForNameList][0];
                displayColumnNameList = connection.editableName || connection.columnName || 'Value';
            }
            
            container.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${displayColumnNameList}</div>
                    <div class="max-h-48 overflow-y-auto space-y-1">
                        ${listSlicerData.map((val, idx) => `
                            <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                                <input type="checkbox" class="slicer-checkbox" value="${val}" data-column="${displayColumnNameList}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                                <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
            // Initialize list slicer after a short delay
            setTimeout(() => {
                initListSlicer(container);
            }, 100);
            return;
            
        case 'dropdown-slicer':
            // Power BI Dropdown Slicer - Interactive for drill through
            // Only get data if connection exists - no automatic connection
            let dropdownSlicerData = [];
            const widgetDropdown = container.closest('.chart-widget');
            const widgetIdDropdown = widgetDropdown ? widgetDropdown.dataset.widgetId : null;
            
            // Check if slicer has a connection
            if (widgetIdDropdown && window.slicerModelConnections && window.slicerModelConnections[widgetIdDropdown] && window.slicerModelConnections[widgetIdDropdown].length > 0) {
                const connection = window.slicerModelConnections[widgetIdDropdown][0];
                const columnName = connection.editableName || connection.columnName;
                const columnIndex = parseInt(connection.columnIndex);
                
                // Get data from connected model's data
                if (window.csvData && window.csvData.length > 0 && !isNaN(columnIndex)) {
                    if (columnIndex >= 0 && columnIndex < window.csvData[0].length) {
                        for (let i = 1; i < window.csvData.length; i++) {
                            const val = window.csvData[i][columnIndex];
                            if (val && val.toString().trim() !== '' && !dropdownSlicerData.includes(val.toString().trim())) {
                                dropdownSlicerData.push(val.toString().trim());
                            }
                        }
                    }
                }
            }
            
            // If no data or no connection, show placeholder preview
            if (dropdownSlicerData.length === 0) {
                container.innerHTML = `
                    <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg opacity-70">
                        <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Value</div>
                        <select class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500" style="cursor: default; pointer-events: none;" disabled>
                            <option value="">All</option>
                            <option value="">Option 1</option>
                            <option value="">Option 2</option>
                            <option value="">Option 3</option>
                        </select>
                    </div>
                `;
                return;
            }
            
            // Get column name from connection
            const widgetForNameDropdown = container.closest('.chart-widget');
            const widgetIdForNameDropdown = widgetForNameDropdown ? widgetForNameDropdown.dataset.widgetId : null;
            let displayColumnNameDropdown = 'Value';
            if (widgetIdForNameDropdown && window.slicerModelConnections && window.slicerModelConnections[widgetIdForNameDropdown] && window.slicerModelConnections[widgetIdForNameDropdown].length > 0) {
                const connection = window.slicerModelConnections[widgetIdForNameDropdown][0];
                displayColumnNameDropdown = connection.editableName || connection.columnName || 'Value';
            }
            
            container.innerHTML = `
                <div class="slicer-widget p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">${displayColumnNameDropdown}</div>
                    <select class="slicer-dropdown w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" data-column="${displayColumnNameDropdown}" style="cursor: pointer; pointer-events: auto;">
                        <option value="">All</option>
                        ${dropdownSlicerData.map((val, idx) => `
                            <option value="${val}" ${idx === 0 ? 'selected' : ''}>${val}</option>
                        `).join('')}
                    </select>
                </div>
            `;
            // Initialize dropdown slicer after a short delay
            setTimeout(() => {
                initDropdownSlicer(container);
            }, 100);
            return;
            
        case 'image':
            // Power BI Image
            container.innerHTML = `
                <div class="image-widget">
                    <input type="file" accept="image/*" class="hidden" id="image-upload-${chartCounter}">
                    <img src="https://via.placeholder.com/400x300?text=Click+to+Upload+Image" alt="Image" class="w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:border-blue-500 transition-colors" style="max-width: 100%; min-height: 200px; object-fit: cover;">
                    <div class="mt-2 text-xs text-gray-500 text-center flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-sm">upload_file</span>
                        <span>Click to upload image from desktop</span>
                    </div>
                </div>
            `;
            initImageWidget(container, `image-upload-${chartCounter}`);
            return;
            
        case 'excel':
            // Excel Data Widget - check if we have data
            if (!hasData && !hasSettingsData) {
                // Show placeholder table
                container.innerHTML = `
                    <div class="excel-widget p-4 opacity-70">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-2xl text-gray-400">table_chart</span>
                                <span class="text-sm font-semibold text-gray-400">Excel Data</span>
                            </div>
                            <button class="px-3 py-1 bg-gray-300 text-gray-500 rounded text-xs flex items-center gap-1" style="pointer-events: none; cursor: default;" disabled>
                                <span class="material-symbols-outlined text-sm">upload_file</span>
                                Load Excel
                            </button>
                        </div>
                        <div class="overflow-auto max-h-64 border border-gray-300 rounded">
                            <table class="w-full text-xs">
                                <thead class="bg-gray-300">
                                    <tr>
                                        <th class="px-2 py-1 border text-gray-500">Column 1</th>
                                        <th class="px-2 py-1 border text-gray-500">Column 2</th>
                                        <th class="px-2 py-1 border text-gray-500">Column 3</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td class="px-2 py-1 border text-gray-400">Value 1</td><td class="px-2 py-1 border text-gray-400">Value 2</td><td class="px-2 py-1 border text-gray-400">Value 3</td></tr>
                                    <tr><td class="px-2 py-1 border text-gray-400">Value 4</td><td class="px-2 py-1 border text-gray-400">Value 5</td><td class="px-2 py-1 border text-gray-400">Value 6</td></tr>
                                    <tr><td class="px-2 py-1 border text-gray-400">Value 7</td><td class="px-2 py-1 border text-gray-400">Value 8</td><td class="px-2 py-1 border text-gray-400">Value 9</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="mt-2 text-xs text-gray-400 text-center">
                            Add data to see Excel table
                        </div>
                    </div>
                `;
                return;
            }
            
            // Excel Data Widget with data
            container.innerHTML = `
                <div class="excel-widget p-4">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-2xl text-green-600">table_chart</span>
                            <span class="text-sm font-semibold">Excel Data</span>
                        </div>
                        <button onclick="loadExcelForWidget('${containerId}')" class="px-3 py-1 bg-green-500 text-white rounded text-xs flex items-center gap-1" style="pointer-events: none; opacity: 0.6; cursor: default;">
                            <span class="material-symbols-outlined text-sm">upload_file</span>
                            Load Excel
                        </button>
                    </div>
                    <div id="excel-table-${chartCounter}" class="overflow-auto max-h-64 border border-gray-200 rounded">
                        <table class="w-full text-xs">
                            <thead class="bg-gray-100">
                                <tr>
                                    ${columnNames.length > 0 ? columnNames.map(col => `<th class="px-2 py-1 border">${col}</th>`).join('') : '<th class="px-2 py-1 border">Column 1</th><th class="px-2 py-1 border">Column 2</th><th class="px-2 py-1 border">Column 3</th>'}
                                </tr>
                            </thead>
                            <tbody id="excel-tbody-${chartCounter}">
                                ${window.csvData && window.csvData.length > 1 ? window.csvData.slice(1).map((row, i) => `
                                    <tr>
                                        ${row.map(cell => `<td class="px-2 py-1 border" contenteditable="true">${cell || ''}</td>`).join('')}
                                    </tr>
                                `).join('') : '<tr><td colspan="3" class="px-2 py-1 border text-center text-gray-400">No data available</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-2 text-xs text-gray-500 text-center">
                        Click cells to edit. Changes will update connected charts.
                    </div>
                </div>
            `;
            initExcelWidget(container, chartCounter);
            return;
            
        case 'text-box':
            // Text Box Widget - Editable on canvas
            const textContent = settings?.textContent || 'Enter your text here...';
            const backgroundColor = settings?.backgroundColor || '#ffffff';
            container.innerHTML = `
                <div class="text-box-widget" style="padding: 0; width: 100%;">
                    <div class="text-box-content p-3 border border-gray-300 rounded text-sm" 
                         contenteditable="true" 
                         spellcheck="false"
                         style="white-space: pre-wrap; word-wrap: break-word; min-height: auto; height: auto; width: 100%; display: block; outline: none; pointer-events: auto; cursor: text; background-color: ${backgroundColor};"
                         data-placeholder="Enter your text here...">
                        ${textContent || 'Enter your text here...'}
                    </div>
                </div>
            `;
            
            // Add event listener for text changes
            const textBoxContent = container.querySelector('.text-box-content');
            if (textBoxContent) {
                // Handle placeholder
                if (!textContent || textContent === 'Enter your text here...') {
                    textBoxContent.textContent = '';
                }
                
                // Ensure contenteditable is enabled and spellcheck is disabled
                textBoxContent.setAttribute('contenteditable', 'true');
                textBoxContent.setAttribute('spellcheck', 'false'); // Disable spell check to remove red underlines
                textBoxContent.style.pointerEvents = 'auto';
                textBoxContent.style.cursor = 'text';
                textBoxContent.style.backgroundColor = backgroundColor; // Apply background color
                textBoxContent.style.backgroundColor = backgroundColor; // Apply background color
                
                // Click handler to focus immediately
                textBoxContent.addEventListener('click', function(e) {
                    e.stopPropagation(); // Prevent container click handler
                    this.focus();
                    // Update toolbar state when text-box is focused
                    if (typeof updateToolbarState === 'function') {
                        setTimeout(() => updateToolbarState(), 10);
                    }
                });
                
                // Focus handler to update toolbar
                textBoxContent.addEventListener('focus', function(e) {
                    e.stopPropagation();
                    if (this.textContent === 'Enter your text here...') {
                        this.textContent = '';
                    }
                    // Update toolbar state when text-box gets focus
                    if (typeof updateToolbarState === 'function') {
                        setTimeout(() => updateToolbarState(), 10);
                    }
                });
                
                // Selection change handler to update toolbar
                textBoxContent.addEventListener('select', function(e) {
                    e.stopPropagation();
                    if (typeof updateToolbarState === 'function') {
                        setTimeout(() => updateToolbarState(), 10);
                    }
                });
                
                // Mouseup handler for selection
                textBoxContent.addEventListener('mouseup', function(e) {
                    e.stopPropagation();
                    if (typeof updateToolbarState === 'function') {
                        setTimeout(() => updateToolbarState(), 10);
                    }
                });
                
                // Update settings when text changes
                textBoxContent.addEventListener('input', function(e) {
                    e.stopPropagation();
                    const widgetId = container.closest('.chart-widget')?.dataset?.widgetId;
                    if (widgetId) {
                        if (!window.chartSettings) {
                            window.chartSettings = {};
                        }
                        if (!window.chartSettings[widgetId]) {
                            window.chartSettings[widgetId] = {};
                        }
                        window.chartSettings[widgetId].textContent = this.textContent || this.innerText;
                    }
                });
                
                // Handle placeholder on focus/blur
                textBoxContent.addEventListener('focus', function(e) {
                    e.stopPropagation();
                    if (this.textContent === 'Enter your text here...') {
                        this.textContent = '';
                    }
                });
                
                textBoxContent.addEventListener('blur', function(e) {
                    e.stopPropagation();
                    if (!this.textContent || this.textContent.trim() === '') {
                        this.textContent = 'Enter your text here...';
                    }
                });
                
                // Prevent mousedown from interfering with text editing
                textBoxContent.addEventListener('mousedown', function(e) {
                    e.stopPropagation(); // Prevent container mousedown
                });
            }
            return;
            
        case 'python':
            // Python Code Widget - Execute Python code and display results
            const pythonCode = settings?.pythonCode || `# Python kodunuzu buraya yazın
import matplotlib.pyplot as plt
import numpy as np

# Örnek: Basit bir grafik oluştur
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(8, 6))
plt.plot(x, y)
plt.title('Sinüs Grafiği')
plt.xlabel('X')
plt.ylabel('Y')
plt.grid(True)
plt.show()`;
            
            container.innerHTML = `
                <div class="python-widget" style="padding: 0; width: 100%; height: 100%; display: flex; flex-direction: column;">
                    <div class="python-code-editor" style="flex: 1; min-height: 200px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; font-family: 'Courier New', monospace; font-size: 12px; background-color: #f8f9fa; overflow: auto;">
                        <pre id="python-code-display-${containerId}" style="margin: 0; white-space: pre-wrap; word-wrap: break-word;">${pythonCode}</pre>
                    </div>
                    <div class="python-output" id="python-output-${containerId}" style="flex: 1; min-height: 150px; border: 1px solid #ddd; border-radius: 4px; padding: 10px; margin-top: 10px; background-color: #fff; overflow: auto;">
                        <div class="text-xs text-gray-500">Kodu çalıştırmak için Settings'e gidin ve "Run Code" butonuna tıklayın.</div>
                    </div>
                </div>
            `;
            
            // Store Python code in settings
            const widgetId = container.closest('.chart-widget')?.dataset?.widgetId;
            if (widgetId) {
                if (!window.chartSettings) {
                    window.chartSettings = {};
                }
                if (!window.chartSettings[widgetId]) {
                    window.chartSettings[widgetId] = {};
                }
                window.chartSettings[widgetId].pythonCode = pythonCode;
            }
            return;
            
        default:
            container.innerHTML = '<p class="text-text-muted text-center">Chart type not implemented</p>';
            return;
    }
    
    // Render with Plotly
    if (typeof Plotly !== 'undefined') {
        // Check if chart already exists
        const existingChart = container.querySelector('.js-plotly-plot');
        
        if (existingChart && containerId === window.previewChartId) {
            // Use react for preview to update efficiently
            Plotly.react(containerId, data, layout, config).then(() => {
                console.log('renderChart: Chart updated successfully for:', containerId);
                
                // Ensure click event listener is attached (only for canvas charts, not preview)
                if (containerId !== window.previewChartId) {
                    const chartDiv = document.getElementById(containerId);
                    if (chartDiv && !chartDiv._drillThroughListenerAttached) {
                        chartDiv.on('plotly_click', function(data) {
                            handleChartClick(containerId, data);
                        });
                        chartDiv._drillThroughListenerAttached = true;
                    }
                }
                
                // Resize to fit container
                setTimeout(() => {
                    Plotly.Plots.resize(containerId);
                }, 50);
            }).catch(err => {
                console.error('renderChart: Error updating chart:', err);
            });
        } else {
            // Store original data for table widgets (for filtering)
            if (chartType === 'table' && data && data.length > 0 && data[0].type === 'table') {
                const widget = container.closest('.chart-widget');
                if (widget) {
                    const widgetId = widget.dataset.widgetId;
                    if (!window.tableOriginalData) {
                        window.tableOriginalData = {};
                    }
                    // Store deep copy of original data
                    window.tableOriginalData[widgetId] = JSON.parse(JSON.stringify(data));
                    console.log('Stored original table data for widget:', widgetId);
                }
            }
            
            // Store original data for table widgets (for filtering)
            if (chartType === 'table' && data && data.length > 0 && data[0].type === 'table') {
                const widget = container.closest('.chart-widget');
                if (widget) {
                    const widgetId = widget.dataset.widgetId;
                    if (!window.tableOriginalData) {
                        window.tableOriginalData = {};
                    }
                    // Store deep copy of original data
                    window.tableOriginalData[widgetId] = JSON.parse(JSON.stringify(data));
                    console.log('Stored original table data for widget:', widgetId);
                }
            }
            
            // Always clear container first to force re-render
            container.innerHTML = '';
            
            // Use newPlot to create fresh chart
            Plotly.newPlot(containerId, data, layout, config).then(() => {
                console.log('renderChart: Chart rendered successfully for:', containerId, 'with data:', df);
                
                // Add click event listener for drill through (only for canvas charts, not preview)
                if (containerId !== window.previewChartId) {
                    const chartDiv = document.getElementById(containerId);
                    if (chartDiv) {
                        chartDiv.on('plotly_click', function(data) {
                            handleChartClick(containerId, data);
                        });
                    }
                }
                
                // Resize to fit container for preview
                if (containerId === window.previewChartId) {
                    setTimeout(() => {
                        Plotly.Plots.resize(containerId);
                    }, 100);
                }
            }).catch(err => {
                console.error('renderChart: Error rendering chart:', err);
            });
        }
    } else {
        container.innerHTML = '<p class="text-text-muted text-center">Plotly.js not loaded</p>';
    }
}

// Make chart draggable with smooth performance
function makeChartDraggable(chartContainer) {
    // Prevent duplicate initialization
    if (chartContainer.dataset.draggableInitialized === 'true') {
        return;
    }
    chartContainer.dataset.draggableInitialized = 'true';
    
    let isDragging = false;
    let wasDragged = false;
    let mouseDownX = 0;
    let mouseDownY = 0;
    let startX = 0;
    let startY = 0;
    let offsetX = 0;
    let offsetY = 0;
    let canvas = null;
    
    const header = chartContainer.querySelector('.chart-widget-header');
    const chartType = chartContainer.dataset.chartType;
    const isTextBox = chartType === 'text-box';
    
    // Ensure widget has absolute positioning
    if (chartContainer.style.position !== 'absolute') {
        chartContainer.style.position = 'absolute';
    }
    
    if (header) {
        header.style.cursor = 'pointer';
    }
    
    // Set cursor for entire widget to indicate it's draggable (only on hover)
    chartContainer.addEventListener('mouseenter', () => {
        if (!isDragging) {
            chartContainer.style.cursor = 'move';
        }
    });
    chartContainer.addEventListener('mouseleave', () => {
        if (!isDragging) {
            chartContainer.style.cursor = 'pointer';
        }
    });
    
    // Optimize for dragging
    chartContainer.style.willChange = 'left, top';
    chartContainer.style.transition = 'none'; // Disable transitions during drag
    
    // Drag start handler
    const dragStartHandler = (e) => {
        // Skip interactive elements
        if (e.target.closest('button')) return;
        if (e.target.closest('.connection-point')) return;
        if (e.target.closest('#selectionRectangle')) return;
        if (isTextBox && e.target.closest('.text-box-content')) return;
        if (e.ctrlKey || e.metaKey) return;
        
        canvas = document.getElementById('designCanvas') || document.getElementById('designCanvasSaved');
        if (!canvas) return;
        
        // Stop other handlers
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Get current position
        const rect = chartContainer.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const canvasStyles = window.getComputedStyle(canvas);
        const paddingLeft = parseFloat(canvasStyles.paddingLeft) || 0;
        const paddingTop = parseFloat(canvasStyles.paddingTop) || 0;
        
        // Calculate offset from mouse to widget corner
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        // Get starting position
        startX = parseFloat(chartContainer.style.left) || 0;
        startY = parseFloat(chartContainer.style.top) || 0;
        
        // Store mouse position
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
        
        isDragging = true;
        wasDragged = false;
        
        // Visual feedback
        chartContainer.style.opacity = '0.8';
        chartContainer.style.zIndex = '1000';
        chartContainer.style.cursor = 'move';
        chartContainer.classList.add('dragging');
        chartContainer.dataset.isDragging = 'true';
        
        // Ensure absolute positioning
        chartContainer.style.position = 'absolute';
        chartContainer.style.transition = 'none';
        
        // Add global listeners
        document.addEventListener('mousemove', handleMouseMove, { passive: false });
        document.addEventListener('mouseup', handleMouseUp, { passive: false });
    };
    
    // Add mousedown listener to widget (works from anywhere)
    chartContainer.addEventListener('mousedown', (e) => {
        // Skip interactive elements
        if (e.target.closest('button')) return;
        if (e.target.closest('.connection-point')) return;
        if (e.target.closest('#selectionRectangle')) return;
        if (e.target.closest('.resize-handle')) return; // Don't drag when clicking resize handles
        if (isTextBox && e.target.closest('.text-box-content')) return;
        if (e.ctrlKey || e.metaKey) return;
        
        // Check if text box is focused/editing
        if (isTextBox) {
            const textBoxContent = chartContainer.querySelector('.text-box-content');
            if (textBoxContent && document.activeElement === textBoxContent) {
                return; // Don't drag if text box is being edited
            }
        }
        
        // Start drag
        dragStartHandler(e);
    }, { capture: true, passive: false });
    // Mouse move handler
    const handleMouseMove = (e) => {
        if (!isDragging || !canvas) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        // Check if actually dragged
        const deltaX = Math.abs(e.clientX - mouseDownX);
        const deltaY = Math.abs(e.clientY - mouseDownY);
        if (deltaX > 3 || deltaY > 3) {
            wasDragged = true;
        }
        
        // Get canvas info
        const canvasRect = canvas.getBoundingClientRect();
        const canvasStyles = window.getComputedStyle(canvas);
        const paddingLeft = parseFloat(canvasStyles.paddingLeft) || 0;
        const paddingTop = parseFloat(canvasStyles.paddingTop) || 0;
        
        // Calculate new position
        const mouseX = e.clientX - canvasRect.left - paddingLeft + canvas.scrollLeft;
        const mouseY = e.clientY - canvasRect.top - paddingTop + canvas.scrollTop;
        
        let newX = mouseX - offsetX;
        let newY = mouseY - offsetY;
        
        // Check for snap guides (hizalama kontrolü)
        const snapped = checkSnapGuides(chartContainer, newX, newY, canvas);
        if (snapped) {
            newX = snapped.x;
            newY = snapped.y;
        }
        
        // Update position
        chartContainer.style.left = `${newX}px`;
        chartContainer.style.top = `${newY}px`;
    };



    

    
    // Mouse up handler
    const handleMouseUp = (e) => {
        if (!isDragging) return;
        
        // Remove listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Hide snap guides
        if (typeof hideSnapGuides === 'function') {
            hideSnapGuides();
        }
        
        // Update connections if dragged
        if (wasDragged && typeof updateAllConnectionLinesForWidget === 'function') {
            updateAllConnectionLinesForWidget(chartContainer.dataset.widgetId);
        }
        
        // Reset styles
        chartContainer.style.opacity = '1';
        chartContainer.style.zIndex = '1';
        chartContainer.style.cursor = 'pointer';
        chartContainer.style.transition = '';
        chartContainer.classList.remove('dragging');
        chartContainer.dataset.isDragging = 'false';
        
        // Clear flags
        if (wasDragged) {
            chartContainer.dataset.preventClick = 'true';
            setTimeout(() => {
                chartContainer.dataset.preventClick = 'false';
                wasDragged = false;
            }, 100);
        } else {
            chartContainer.dataset.preventClick = 'false';
        }
        
        isDragging = false;
        canvas = null;
    };
    
    // Cleanup on chart removal
    const observer = new MutationObserver(() => {
        if (!document.body.contains(chartContainer)) {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Snap guides functionality for aligning widgets
const SNAP_THRESHOLD = 15; // pixels - distance threshold for snapping (artırıldı)
const SPACING_SNAP_THRESHOLD = 20; // pixels - threshold for spacing alignment (artırıldı)

function checkSnapGuides(draggingWidget, currentX, currentY, canvas) {
    if (!canvas) return null;
    
    const draggingRect = {
        left: currentX,
        top: currentY,
        width: draggingWidget.offsetWidth,
        height: draggingWidget.offsetHeight,
        right: currentX + draggingWidget.offsetWidth,
        bottom: currentY + draggingWidget.offsetHeight,
        centerX: currentX + draggingWidget.offsetWidth / 2,
        centerY: currentY + draggingWidget.offsetHeight / 2
    };
    
    // Get all other chart widgets on the canvas
    const allWidgets = Array.from(canvas.querySelectorAll('.chart-widget')).filter(w => w !== draggingWidget);
    let snapX = null;
    let snapY = null;
    let guideX = null;
    let guideY = null;
    let bestSnapDistance = Infinity;
    
    // First pass: Check standard alignment (top, center, bottom, left, center, right)
    allWidgets.forEach(widget => {
        const widgetLeft = parseFloat(widget.style.left) || 0;
        const widgetTop = parseFloat(widget.style.top) || 0;
        const widgetWidth = widget.offsetWidth;
        const widgetHeight = widget.offsetHeight;
        
        const widgetRect = {
            left: widgetLeft,
            top: widgetTop,
            right: widgetLeft + widgetWidth,
            bottom: widgetTop + widgetHeight,
            centerX: widgetLeft + widgetWidth / 2,
            centerY: widgetTop + widgetHeight / 2
        };
        
        // Check horizontal alignment (top, center, bottom)
        const topDiff = Math.abs(draggingRect.top - widgetRect.top);
        const centerYDiff = Math.abs(draggingRect.centerY - widgetRect.centerY);
        const bottomDiff = Math.abs(draggingRect.bottom - widgetRect.bottom);
        
        if (topDiff < SNAP_THRESHOLD && topDiff < bestSnapDistance) {
            snapY = widgetRect.top;
            guideY = widgetRect.top;
            bestSnapDistance = topDiff;
        } else if (centerYDiff < SNAP_THRESHOLD && centerYDiff < bestSnapDistance) {
            snapY = widgetRect.centerY - draggingWidget.offsetHeight / 2;
            guideY = widgetRect.centerY;
            bestSnapDistance = centerYDiff;
        } else if (bottomDiff < SNAP_THRESHOLD && bottomDiff < bestSnapDistance) {
            snapY = widgetRect.bottom - draggingWidget.offsetHeight;
            guideY = widgetRect.bottom;
            bestSnapDistance = bottomDiff;
        }
        
        // Check vertical alignment (left, center, right)
        const leftDiff = Math.abs(draggingRect.left - widgetRect.left);
        const centerXDiff = Math.abs(draggingRect.centerX - widgetRect.centerX);
        const rightDiff = Math.abs(draggingRect.right - widgetRect.right);
        
        if (leftDiff < SNAP_THRESHOLD && leftDiff < bestSnapDistance) {
            snapX = widgetRect.left;
            guideX = widgetRect.left;
            bestSnapDistance = leftDiff;
        } else if (centerXDiff < SNAP_THRESHOLD && centerXDiff < bestSnapDistance) {
            snapX = widgetRect.centerX - draggingWidget.offsetWidth / 2;
            guideX = widgetRect.centerX;
            bestSnapDistance = centerXDiff;
        } else if (rightDiff < SNAP_THRESHOLD && rightDiff < bestSnapDistance) {
            snapX = widgetRect.right - draggingWidget.offsetWidth;
            guideX = widgetRect.right;
            bestSnapDistance = rightDiff;
        }
    });
    
    // Second pass: Check spacing alignment (equal spacing between widgets)
    // Check horizontal spacing (widgets side by side)
    const horizontalWidgets = allWidgets
        .map(widget => ({
            widget,
            left: parseFloat(widget.style.left) || 0,
            right: (parseFloat(widget.style.left) || 0) + widget.offsetWidth,
            top: parseFloat(widget.style.top) || 0,
            bottom: (parseFloat(widget.style.top) || 0) + widget.offsetHeight
        }))
        .filter(w => {
            // Check if widget is horizontally aligned (overlapping vertically)
            return (w.top < draggingRect.bottom && w.bottom > draggingRect.top);
        })
        .sort((a, b) => a.left - b.left);
    
    // Check if dragging widget is between widgets horizontally (2+ widgets yan yana)
    // 2'den fazla widget yan yana olduğunda eşit boşluk hizalaması
    if (horizontalWidgets.length >= 2) {
        // Tüm widget'ları (dragging dahil) sırala
        const allHorizontalWidgets = [...horizontalWidgets, {
            widget: draggingWidget,
            left: currentX,
            right: currentX + draggingWidget.offsetWidth,
            top: draggingRect.top,
            bottom: draggingRect.bottom
        }].sort((a, b) => a.left - b.left);
        
        // Her widget çifti arasında kontrol et
        for (let i = 0; i < allHorizontalWidgets.length - 1; i++) {
            const leftWidget = allHorizontalWidgets[i];
            const rightWidget = allHorizontalWidgets[i + 1];
            
            // Eğer dragging widget bu iki widget arasındaysa
            if (leftWidget.widget === draggingWidget || rightWidget.widget === draggingWidget) {
                const totalSpacing = rightWidget.left - leftWidget.right;
                const draggingWidth = draggingWidget.offsetWidth;
                
                // Eğer yeterli boşluk varsa eşit boşluk hesapla
                if (totalSpacing > draggingWidth) {
                    const equalGap = (totalSpacing - draggingWidth) / 2;
                    const snappedX = leftWidget.right + equalGap;
                    const snapDistance = Math.abs(currentX - snappedX);
                    
                    // Eğer dragging widget sol taraftaysa
                    if (leftWidget.widget === draggingWidget && snapDistance < SPACING_SNAP_THRESHOLD) {
                        if (snapX === null || snapDistance < Math.abs(currentX - (snapX || 0))) {
                            snapX = snappedX;
                            guideX = leftWidget.right + equalGap;
                        }
                    }
                    // Eğer dragging widget sağ taraftaysa
                    else if (rightWidget.widget === draggingWidget && snapDistance < SPACING_SNAP_THRESHOLD) {
                        if (snapX === null || snapDistance < Math.abs(currentX - (snapX || 0))) {
                            snapX = snappedX;
                            guideX = leftWidget.right + equalGap;
                        }
                    }
                    // Eğer dragging widget ortadaysa (3+ widget durumu)
                    else if (leftWidget.widget !== draggingWidget && rightWidget.widget !== draggingWidget) {
                        const draggingIndex = allHorizontalWidgets.findIndex(w => w.widget === draggingWidget);
                        if (draggingIndex > 0 && draggingIndex < allHorizontalWidgets.length - 1) {
                            const prevWidget = allHorizontalWidgets[draggingIndex - 1];
                            const nextWidget = allHorizontalWidgets[draggingIndex + 1];
                            const prevGap = draggingRect.left - prevWidget.right;
                            const nextGap = nextWidget.left - draggingRect.right;
                            
                            // Eğer boşluklar yakınsa eşit boşluk hesapla
                            if (Math.abs(prevGap - nextGap) < SPACING_SNAP_THRESHOLD) {
                                const totalGap = nextWidget.left - prevWidget.right;
                                const equalGap = (totalGap - draggingWidth) / 2;
                                const snappedX = prevWidget.right + equalGap;
                                const snapDistance = Math.abs(currentX - snappedX);
                                
                                if (snapDistance < SPACING_SNAP_THRESHOLD && (snapX === null || snapDistance < Math.abs(currentX - (snapX || 0)))) {
                                    snapX = snappedX;
                                    guideX = prevWidget.right + equalGap;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Basit 2 widget arası kontrol (geriye dönük uyumluluk)
    for (let i = 0; i < horizontalWidgets.length - 1; i++) {
        const leftWidget = horizontalWidgets[i];
        const rightWidget = horizontalWidgets[i + 1];
        
        if (draggingRect.right > leftWidget.right && draggingRect.left < rightWidget.left) {
            const totalSpacing = rightWidget.left - leftWidget.right;
            const leftSpace = draggingRect.left - leftWidget.right;
            const rightSpace = rightWidget.left - draggingRect.right;
            
            if (totalSpacing > draggingWidget.offsetWidth && Math.abs(leftSpace - rightSpace) < SPACING_SNAP_THRESHOLD) {
                const equalGap = (totalSpacing - draggingWidget.offsetWidth) / 2;
                const snappedX = leftWidget.right + equalGap;
                const snapDistance = Math.abs(currentX - snappedX);
                
                if (snapDistance < SNAP_THRESHOLD && (snapX === null || snapDistance < Math.abs(currentX - (snapX || 0)))) {
                    snapX = snappedX;
                    guideX = leftWidget.right + equalGap;
                }
            }
        }
    }
    
    // Check vertical spacing (widgets stacked vertically)
    const verticalWidgets = allWidgets
        .map(widget => ({
            widget,
            left: parseFloat(widget.style.left) || 0,
            right: (parseFloat(widget.style.left) || 0) + widget.offsetWidth,
            top: parseFloat(widget.style.top) || 0,
            bottom: (parseFloat(widget.style.top) || 0) + widget.offsetHeight
        }))
        .filter(w => {
            // Check if widget is vertically aligned (overlapping horizontally)
            return (w.left < draggingRect.right && w.right > draggingRect.left);
        })
        .sort((a, b) => a.top - b.top);
    
    // Check if dragging widget is between two widgets vertically
    for (let i = 0; i < verticalWidgets.length - 1; i++) {
        const topWidget = verticalWidgets[i];
        const bottomWidget = verticalWidgets[i + 1];
        
        // Check if dragging widget is between these two widgets
        if (draggingRect.bottom > topWidget.bottom && draggingRect.top < bottomWidget.top) {
            const totalSpacing = bottomWidget.top - topWidget.bottom;
            const topSpace = draggingRect.top - topWidget.bottom;
            const bottomSpace = bottomWidget.top - draggingRect.bottom;
            
            // If widget is between two widgets, snap to equal spacing
            // This creates equal gaps: [topWidget] gap [draggingWidget] gap [bottomWidget]
            if (totalSpacing > draggingWidget.offsetHeight && Math.abs(topSpace - bottomSpace) < SPACING_SNAP_THRESHOLD) {
                // Calculate equal spacing: total space - widget height, then divide by 2
                const equalGap = (totalSpacing - draggingWidget.offsetHeight) / 2;
                const snappedY = topWidget.bottom + equalGap;
                const snapDistance = Math.abs(currentY - snappedY);
                
                if (snapDistance < SNAP_THRESHOLD && (snapY === null || snapDistance < Math.abs(currentY - (snapY || 0)))) {
                    snapY = snappedY; // Position widget with equal gaps on both sides
                    guideY = topWidget.bottom + equalGap;
                }
            }
        }
    }
    
    // Show/hide guides
    if (snapX !== null) {
        showSnapGuide('vertical', guideX, canvas);
    } else {
        hideSnapGuide('vertical');
    }
    
    if (snapY !== null) {
        showSnapGuide('horizontal', guideY, canvas);
    } else {
        hideSnapGuide('horizontal');
    }
    
    // Return snapped positions if any
    if (snapX !== null || snapY !== null) {
        return {
            x: snapX !== null ? snapX : currentX,
            y: snapY !== null ? snapY : currentY
        };
    }
    
    return null;
}

function showSnapGuide(direction, position, canvas) {
    const guideId = direction === 'horizontal' ? 'snapGuideHorizontal' : 'snapGuideVertical';
    const guide = document.getElementById(guideId);
    if (!guide || !canvas) return;
    
    const canvasStyles = window.getComputedStyle(canvas);
    const paddingLeft = parseFloat(canvasStyles.paddingLeft) || 0;
    const paddingTop = parseFloat(canvasStyles.paddingTop) || 0;
    
    if (direction === 'horizontal') {
        guide.style.left = `${paddingLeft}px`;
        guide.style.top = `${position + paddingTop}px`;
        guide.style.width = `${canvas.scrollWidth - paddingLeft * 2 || canvas.offsetWidth - paddingLeft * 2}px`;
        guide.style.height = '2px';
        guide.style.backgroundColor = '#3b82f6';
        guide.style.boxShadow = '0 0 3px rgba(59, 130, 246, 0.8)';
    } else {
        guide.style.left = `${position + paddingLeft}px`;
        guide.style.top = `${paddingTop}px`;
        guide.style.width = '2px';
        guide.style.height = `${canvas.scrollHeight - paddingTop * 2 || canvas.offsetHeight - paddingTop * 2}px`;
        guide.style.backgroundColor = '#3b82f6';
        guide.style.boxShadow = '0 0 3px rgba(59, 130, 246, 0.8)';
    }
    
    guide.classList.remove('hidden');
    guide.style.display = 'block';
}

function hideSnapGuide(direction) {
    const guideId = direction === 'horizontal' ? 'snapGuideHorizontal' : 'snapGuideVertical';
    const guide = document.getElementById(guideId);
    if (guide) {
        guide.classList.add('hidden');
        guide.style.display = 'none';
    }
}

function hideSnapGuides() {
    hideSnapGuide('horizontal');
    hideSnapGuide('vertical');
}

// Initialize canvas pan functionality
function initCanvasPan() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    let isPanning = false;
    let startX, startY;
    let scrollLeft, scrollTop;
    
    canvas.addEventListener('mousedown', (e) => {
        // Only pan if Ctrl/Cmd is pressed
        if (e.ctrlKey || e.metaKey) {
            // Don't pan if clicking on a chart widget
            if (e.target.closest('.chart-widget')) return;
            
            isPanning = true;
            canvas.style.cursor = 'grabbing';
            startX = e.pageX - canvas.offsetLeft;
            startY = e.pageY - canvas.offsetTop;
            scrollLeft = canvas.scrollLeft;
            scrollTop = canvas.scrollTop;
            e.preventDefault();
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        e.preventDefault();
        const x = e.pageX - canvas.offsetLeft;
        const y = e.pageY - canvas.offsetTop;
        const walkX = (x - startX) * 2; // Scroll speed multiplier
        const walkY = (y - startY) * 2;
        canvas.scrollLeft = scrollLeft - walkX;
        canvas.scrollTop = scrollTop - walkY;
    });
    
    canvas.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });
    
    canvas.addEventListener('mouseleave', () => {
        if (isPanning) {
            isPanning = false;
            canvas.style.cursor = 'default';
        }
    });
    
    // Show hint when Ctrl is pressed
    canvas.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            canvas.style.cursor = 'grab';
        }
    });
    
    canvas.addEventListener('keyup', (e) => {
        if (!e.ctrlKey && !e.metaKey) {
            canvas.style.cursor = 'default';
        }
    });
}

// Renumber widgets of the same type in a canvas
function renumberWidgetsInCanvas(canvas, chartType) {
    if (!isModelTool(chartType) && !isSlicerTool(chartType)) {
        return; // Only renumber models and slicers
    }
    
    const sameTypeWidgets = Array.from(canvas.querySelectorAll(`.chart-widget[data-chart-type="${chartType}"]`));
    const baseName = chartTypes.find(c => c.id === chartType)?.name || chartType;
    
    sameTypeWidgets.forEach((widget, index) => {
        const nameDisplay = widget.querySelector('.widget-name-display');
        if (nameDisplay) {
            const customName = widget.dataset.customName;
            // Only update if user hasn't customized the name
            if (!customName || customName.startsWith(baseName)) {
                const newName = index === 0 ? baseName : `${baseName} ${index + 1}`;
                nameDisplay.textContent = newName;
                // Update customName if it was auto-numbered
                if (!customName || customName.match(new RegExp(`^${baseName}( \\d+)?$`))) {
                    widget.dataset.customName = newName;
                }
            }
        }
    });
}

// Delete chart widget (can be called with button or widget element)
function deleteChartWidget(chartWidget) {
    if (chartWidget) {
        const chartType = chartWidget.dataset.chartType;
        const canvas = chartWidget.closest('[id^="canvas-"], #designCanvas, #designCanvasSaved');
        
        // Purge Plotly chart if exists
        const chartDiv = chartWidget.querySelector('[id^="chart-"]');
        if (chartDiv && typeof Plotly !== 'undefined') {
            Plotly.purge(chartDiv);
        }
        
        chartWidget.remove();
        
        // Renumber remaining widgets of the same type
        if (canvas && (isModelTool(chartType) || isSlicerTool(chartType))) {
            renumberWidgetsInCanvas(canvas, chartType);
        }
        
        updateDrillThroughConnections();
    }
}

// Delete chart (called from button)
function deleteChart(button) {
    const chartWidget = button.closest('.chart-widget');
    deleteChartWidget(chartWidget);
}

// Add resize handles to chart widget
function addResizeHandles(chartContainer, chartDiv) {
    // Remove existing handles if any
    const existingHandles = chartContainer.querySelectorAll('.resize-handle');
    existingHandles.forEach(handle => handle.remove());
    
    // Create resize handles for all 8 positions
    const handles = [
        { position: 'nw', cursor: 'nw-resize' }, // top-left
        { position: 'n', cursor: 'n-resize' },   // top
        { position: 'ne', cursor: 'ne-resize' }, // top-right
        { position: 'e', cursor: 'e-resize' },   // right
        { position: 'se', cursor: 'se-resize' }, // bottom-right
        { position: 's', cursor: 's-resize' },   // bottom
        { position: 'sw', cursor: 'sw-resize' }, // bottom-left
        { position: 'w', cursor: 'w-resize' }    // left
    ];
    
    handles.forEach(handle => {
        const resizeHandle = document.createElement('div');
        resizeHandle.className = `resize-handle resize-handle-${handle.position}`;
        resizeHandle.style.position = 'absolute';
        resizeHandle.style.cursor = handle.cursor;
        resizeHandle.style.zIndex = '10000';
        resizeHandle.style.display = 'none';
        resizeHandle.style.pointerEvents = 'auto';
        // Gri çizgiler
        if (handle.position === 'n' || handle.position === 's') {
            // Yatay çizgiler (üst ve alt) - gri
            resizeHandle.style.width = '24px';
            resizeHandle.style.height = '2px';
            resizeHandle.style.borderRadius = '1px';
            resizeHandle.style.backgroundColor = '#6b7280';
            resizeHandle.style.boxShadow = 'none';
        } else if (handle.position === 'e' || handle.position === 'w') {
            // Dikey çizgiler (sağ ve sol) - gri
            resizeHandle.style.width = '2px';
            resizeHandle.style.height = '24px';
            resizeHandle.style.borderRadius = '1px';
            resizeHandle.style.backgroundColor = '#6b7280';
            resizeHandle.style.boxShadow = 'none';
        } else {
            // Köşe çizgileri - sadece çizgiler, çerçeve yok
            resizeHandle.style.width = '16px';
            resizeHandle.style.height = '16px';
            resizeHandle.style.border = 'none';
            resizeHandle.style.backgroundColor = 'transparent';
            resizeHandle.style.boxShadow = 'none';
            
            // Köşe çizgileri ekle (L şeklinde)
            const cornerLines = document.createElement('div');
            cornerLines.style.position = 'absolute';
            cornerLines.style.width = '100%';
            cornerLines.style.height = '100%';
            cornerLines.style.pointerEvents = 'none';
            
            // L şeklinde çizgiler - gri renk, uzun ve kalın
            const line1 = document.createElement('div');
            line1.style.position = 'absolute';
            line1.style.backgroundColor = '#6b7280';
            line1.style.width = '3px';
            line1.style.height = '14px';
            
            const line2 = document.createElement('div');
            line2.style.position = 'absolute';
            line2.style.backgroundColor = '#6b7280';
            line2.style.width = '14px';
            line2.style.height = '3px';
            
            // Köşe pozisyonuna göre çizgileri yerleştir
            if (handle.position === 'nw') {
                // Sol üst köşe - L şekli sol üstte
                line1.style.left = '0px';
                line1.style.top = '0px';
                line2.style.left = '0px';
                line2.style.top = '0px';
            } else if (handle.position === 'ne') {
                // Sağ üst köşe - L şekli sağ üstte
                line1.style.right = '0px';
                line1.style.top = '0px';
                line2.style.right = '0px';
                line2.style.top = '0px';
            } else if (handle.position === 'se') {
                // Sağ alt köşe - L şekli sağ altta
                line1.style.right = '0px';
                line1.style.bottom = '0px';
                line2.style.right = '0px';
                line2.style.bottom = '0px';
            } else if (handle.position === 'sw') {
                // Sol alt köşe - L şekli sol altta
                line1.style.left = '0px';
                line1.style.bottom = '0px';
                line2.style.left = '0px';
                line2.style.bottom = '0px';
            }
            
            cornerLines.appendChild(line1);
            cornerLines.appendChild(line2);
            resizeHandle.appendChild(cornerLines);
        }
        
        // Hover efekti - gri tonları
        resizeHandle.addEventListener('mouseenter', () => {
            if (handle.position === 'n' || handle.position === 's') {
                resizeHandle.style.backgroundColor = '#4b5563';
                resizeHandle.style.height = '3px';
            } else if (handle.position === 'e' || handle.position === 'w') {
                resizeHandle.style.backgroundColor = '#4b5563';
                resizeHandle.style.width = '3px';
            } else {
                // Köşe çizgilerini de güncelle
                const cornerLines = resizeHandle.querySelector('div');
                if (cornerLines) {
                    const lines = cornerLines.querySelectorAll('div');
                    lines.forEach(line => {
                        line.style.backgroundColor = '#4b5563';
                    });
                }
            }
        });
        
        resizeHandle.addEventListener('mouseleave', () => {
            if (handle.position === 'n' || handle.position === 's') {
                resizeHandle.style.backgroundColor = '#6b7280';
                resizeHandle.style.height = '2px';
            } else if (handle.position === 'e' || handle.position === 'w') {
                resizeHandle.style.backgroundColor = '#6b7280';
                resizeHandle.style.width = '2px';
            } else {
                // Köşe çizgilerini de güncelle
                const cornerLines = resizeHandle.querySelector('div');
                if (cornerLines) {
                    const lines = cornerLines.querySelectorAll('div');
                    lines.forEach(line => {
                        line.style.backgroundColor = '#6b7280';
                    });
                }
            }
        });
        
        // Position the handle - Power BI tarzı konumlandırma
        switch(handle.position) {
            case 'nw': // top-left
                resizeHandle.style.top = '-6px';
                resizeHandle.style.left = '-6px';
                break;
            case 'n': // top
                resizeHandle.style.top = '-6px';
                resizeHandle.style.left = '50%';
                resizeHandle.style.transform = 'translateX(-50%)';
                break;
            case 'ne': // top-right
                resizeHandle.style.top = '-6px';
                resizeHandle.style.right = '-6px';
                break;
            case 'e': // right
                resizeHandle.style.right = '-6px';
                resizeHandle.style.top = '50%';
                resizeHandle.style.transform = 'translateY(-50%)';
                break;
            case 'se': // bottom-right
                resizeHandle.style.bottom = '-6px';
                resizeHandle.style.right = '-6px';
                break;
            case 's': // bottom
                resizeHandle.style.bottom = '-6px';
                resizeHandle.style.left = '50%';
                resizeHandle.style.transform = 'translateX(-50%)';
                break;
            case 'sw': // bottom-left
                resizeHandle.style.bottom = '-6px';
                resizeHandle.style.left = '-6px';
                break;
            case 'w': // left
                resizeHandle.style.left = '-6px';
                resizeHandle.style.top = '50%';
                resizeHandle.style.transform = 'translateY(-50%)';
                break;
        }
        
        // Add resize functionality
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            startResize(e, chartContainer, chartDiv, handle.position);
        });
        
        chartContainer.appendChild(resizeHandle);
    });
}

// Show resize handles
function showResizeHandles(chartContainer) {
    const handles = chartContainer.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.style.display = 'block';
    });
}

// Hide resize handles
function hideResizeHandles(chartContainer) {
    const handles = chartContainer.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.style.display = 'none';
    });
}

// Start resizing
let isResizing = false;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;
let resizeStartLeft = 0;
let resizeStartTop = 0;
let resizeDirection = '';
let currentResizeContainer = null;
let currentResizeChartDiv = null;

function startResize(e, chartContainer, chartDiv, direction) {
    isResizing = true;
    resizeDirection = direction;
    currentResizeContainer = chartContainer;
    currentResizeChartDiv = chartDiv;
    
    const containerRect = chartContainer.getBoundingClientRect();
    
    // Get initial dimensions from style or computed dimensions
    resizeStartWidth = parseFloat(chartContainer.style.width) || containerRect.width || 400;
    resizeStartHeight = parseFloat(chartContainer.style.height) || containerRect.height || 300;
    
    // Ensure container has explicit dimensions
    if (!chartContainer.style.width) {
        chartContainer.style.width = resizeStartWidth + 'px';
    }
    if (!chartContainer.style.height) {
        chartContainer.style.height = resizeStartHeight + 'px';
    }
    
    resizeStartX = e.clientX;
    resizeStartY = e.clientY;
    resizeStartLeft = parseFloat(chartContainer.style.left) || 0;
    resizeStartTop = parseFloat(chartContainer.style.top) || 0;
    
    chartContainer.style.userSelect = 'none';
    document.body.style.cursor = getResizeCursor(direction);
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    
    e.preventDefault();
    e.stopPropagation();
}

function handleResize(e) {
    if (!isResizing || !currentResizeContainer || !currentResizeChartDiv) return;
    
    const chartContainer = currentResizeContainer;
    const chartDiv = currentResizeChartDiv;
    
    const deltaX = e.clientX - resizeStartX;
    const deltaY = e.clientY - resizeStartY;
    
    let newWidth = resizeStartWidth;
    let newHeight = resizeStartHeight;
    let newLeft = resizeStartLeft;
    let newTop = resizeStartTop;
    
    // Calculate new dimensions based on resize direction
    switch(resizeDirection) {
        case 'nw': // top-left
            newWidth = Math.max(200, resizeStartWidth - deltaX);
            newHeight = Math.max(150, resizeStartHeight - deltaY);
            newLeft = resizeStartLeft + (resizeStartWidth - newWidth);
            newTop = resizeStartTop + (resizeStartHeight - newHeight);
            break;
        case 'n': // top
            newHeight = Math.max(150, resizeStartHeight - deltaY);
            newTop = resizeStartTop + (resizeStartHeight - newHeight);
            break;
        case 'ne': // top-right
            newWidth = Math.max(200, resizeStartWidth + deltaX);
            newHeight = Math.max(150, resizeStartHeight - deltaY);
            newTop = resizeStartTop + (resizeStartHeight - newHeight);
            break;
        case 'e': // right
            newWidth = Math.max(200, resizeStartWidth + deltaX);
            break;
        case 'se': // bottom-right
            newWidth = Math.max(200, resizeStartWidth + deltaX);
            newHeight = Math.max(150, resizeStartHeight + deltaY);
            break;
        case 's': // bottom
            newHeight = Math.max(150, resizeStartHeight + deltaY);
            break;
        case 'sw': // bottom-left
            newWidth = Math.max(200, resizeStartWidth - deltaX);
            newHeight = Math.max(150, resizeStartHeight + deltaY);
            newLeft = resizeStartLeft + (resizeStartWidth - newWidth);
            break;
        case 'w': // left
            newWidth = Math.max(200, resizeStartWidth - deltaX);
            newLeft = resizeStartLeft + (resizeStartWidth - newWidth);
            break;
    }
    
    // Apply new dimensions
    chartContainer.style.width = newWidth + 'px';
    chartContainer.style.height = newHeight + 'px';
    chartContainer.style.minWidth = newWidth + 'px';
    chartContainer.style.minHeight = newHeight + 'px';
    chartContainer.style.maxWidth = newWidth + 'px';
    chartContainer.style.maxHeight = newHeight + 'px';
    chartContainer.style.left = newLeft + 'px';
    chartContainer.style.top = newTop + 'px';
    
    // Force reflow to ensure container dimensions are updated
    void chartContainer.offsetWidth;
    void chartContainer.offsetHeight;
    
    // Calculate available height for chart (container height minus header height if visible)
    const header = chartContainer.querySelector('.chart-widget-header');
    const headerHeight = header && header.style.display !== 'none' && !header.classList.contains('hidden') 
        ? header.offsetHeight 
        : 0;
    
    const availableHeight = Math.max(100, newHeight - headerHeight);
    const availableWidth = newWidth;
    
    // Update chart div size - leave 8px space for resize handles (4px margin on each side)
    // Update chart div size - leave space for resize handles (10px margin on top/sides, 14px at bottom)
    const chartWidth = Math.max(100, availableWidth - 20);
    const chartHeight = Math.max(100, availableHeight - 24); // More space at bottom for lower handles
    
    chartDiv.style.width = chartWidth + 'px';
    chartDiv.style.height = chartHeight + 'px';
    chartDiv.style.minWidth = chartWidth + 'px';
    chartDiv.style.minHeight = chartHeight + 'px';
    chartDiv.style.maxWidth = chartWidth + 'px';
    chartDiv.style.maxHeight = chartHeight + 'px';
    chartDiv.style.margin = '10px 10px 14px 10px'; // More margin to keep chart inside handles (top, right, bottom, left)
    
    // Force reflow to ensure DOM updates
    void chartDiv.offsetWidth;
    void chartDiv.offsetHeight;
    
    // Resize Plotly chart if it exists - IMMEDIATE and DIRECT approach
    if (typeof Plotly !== 'undefined' && chartDiv.id) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            try {
                // Use relayout to update Plotly with new dimensions - this is the key!
                Plotly.relayout(chartDiv.id, {
                    width: availableWidth,
                    height: availableHeight,
                    autosize: false
                }).then(() => {
                    // After relayout, force resize to ensure it's correct
                    Plotly.Plots.resize(chartDiv);
                }).catch(() => {
                    // If relayout fails, try resize directly
                    Plotly.Plots.resize(chartDiv);
                });
            } catch (error) {
                console.warn('Error resizing Plotly chart:', error);
                // Last resort: try resize directly
                try {
                    Plotly.Plots.resize(chartDiv);
                } catch (e) {
                    console.error('Final resize attempt failed:', e);
                }
            }
        });
    }
}

function stopResize(e) {
    if (!isResizing) return;
    
    isResizing = false;
    document.body.style.cursor = '';
    
    if (currentResizeContainer && currentResizeChartDiv) {
        currentResizeContainer.style.userSelect = '';
        
        // Get final dimensions
        const finalWidth = parseFloat(currentResizeContainer.style.width) || 400;
        const finalHeight = parseFloat(currentResizeContainer.style.height) || 300;
        const header = currentResizeContainer.querySelector('.chart-widget-header');
        const headerHeight = header && header.style.display !== 'none' && !header.classList.contains('hidden') 
            ? header.offsetHeight 
            : 0;
        const availableHeight = Math.max(100, finalHeight - headerHeight);
        
        // Ensure chart div has correct final dimensions
        currentResizeChartDiv.style.width = finalWidth + 'px';
        currentResizeChartDiv.style.height = availableHeight + 'px';
        currentResizeChartDiv.style.minWidth = finalWidth + 'px';
        currentResizeChartDiv.style.minHeight = availableHeight + 'px';
        currentResizeChartDiv.style.maxWidth = finalWidth + 'px';
        currentResizeChartDiv.style.maxHeight = availableHeight + 'px';
        
        // Force reflow
        void currentResizeChartDiv.offsetWidth;
        void currentResizeChartDiv.offsetHeight;
        
        // Final resize of Plotly chart after resize ends - DIRECT approach
        if (typeof Plotly !== 'undefined' && currentResizeChartDiv.id) {
            // Use requestAnimationFrame to ensure all DOM updates are complete
            requestAnimationFrame(() => {
                try {
                    // Use relayout to update Plotly with final dimensions
                    Plotly.relayout(currentResizeChartDiv.id, {
                        width: finalWidth,
                        height: availableHeight,
                        autosize: false
                    }).then(() => {
                        // After relayout, force resize to ensure it's correct
                        Plotly.Plots.resize(currentResizeChartDiv);
                    }).catch(() => {
                        // If relayout fails, try resize directly
                        Plotly.Plots.resize(currentResizeChartDiv);
                    });
                } catch (error) {
                    console.warn('Error finalizing Plotly chart resize:', error);
                    // Last resort
                    try {
                        Plotly.Plots.resize(currentResizeChartDiv);
                    } catch (e) {
                        console.error('Final resize failed:', e);
                    }
                }
            });
        }
    }
    
    currentResizeContainer = null;
    currentResizeChartDiv = null;
    
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
}

function getResizeCursor(direction) {
    const cursors = {
        'nw': 'nw-resize',
        'n': 'n-resize',
        'ne': 'ne-resize',
        'e': 'e-resize',
        'se': 'se-resize',
        's': 's-resize',
        'sw': 'sw-resize',
        'w': 'w-resize'
    };
    return cursors[direction] || 'default';
}

// Make functions globally accessible
window.addResizeHandles = addResizeHandles;
window.showResizeHandles = showResizeHandles;
window.hideResizeHandles = hideResizeHandles;
window.connectDrillThrough = connectDrillThrough;
window.saveDrillThrough = saveDrillThrough;
window.closeDrillThroughModal = closeDrillThroughModal;
window.handleChartClick = handleChartClick;
    window.insertSymbols = insertSymbols;
    window.insertShapes = insertShapes;
    // Legacy function - redirects to insertSymbols
    window.insertSpecialChar = insertSymbols;
window.connectExternalDrillThrough = connectExternalDrillThrough;
window.saveExternalDrillThrough = saveExternalDrillThrough;
window.closeExternalDrillThroughModal = closeExternalDrillThroughModal;

// Connect drill through
function connectDrillThrough(button) {
    const chartWidget = button.closest('.chart-widget');
    if (!chartWidget) return;
    
    const chartDivId = chartWidget.querySelector('[id^="chart-"]')?.id;
    const widgetId = chartWidget.dataset.widgetId;
    
    if (chartDivId) {
        showDrillThroughModal(chartDivId, widgetId);
    }
}

// Edit chart
function editChart(button) {
    const chartWidget = button.closest('.chart-widget');
    if (!chartWidget) return;
    
    const chartType = chartWidget.dataset.chartType;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    if (chartDiv) {
        showChartEditModal(chartType, chartDiv.id);
    }
}

// ==================== POWER BI COMPONENTS INITIALIZATION ====================

// Initialize slicer buttons (legacy function name)
function initSlicerButtons(container) {
    initButtonSlicer(container);
}

// Initialize button slicer
function initButtonSlicer(container) {
    const buttons = container.querySelectorAll('.slicer-btn');
    const widget = container.closest('.chart-widget');
    
    // Remove any existing event listeners by cloning buttons
    buttons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // Get fresh button references after cloning
    const freshButtons = container.querySelectorAll('.slicer-btn');
    let selectedValue = null;
    
    freshButtons.forEach(btn => {
        // Ensure pointer events are enabled
        btn.style.pointerEvents = 'auto';
        btn.style.cursor = 'pointer';
        
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            console.log('Button slicer clicked:', this.dataset.value);
            
            // Toggle selection
            const isSelected = this.classList.contains('bg-blue-500');
            const value = this.dataset.value;
            
            freshButtons.forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300');
            });
            
            if (!isSelected) {
                this.classList.remove('bg-gray-200', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300');
                this.classList.add('bg-blue-500', 'text-white');
                selectedValue = value;
            } else {
                selectedValue = null; // Deselect - clear filter
            }
            
            console.log('Triggering drill through with value:', selectedValue);
            // Trigger drill through with selected value (null if deselected)
            triggerDrillThrough(widget, selectedValue);
            // Also trigger model filtering if connected
            triggerModelFiltering(widget);
        });
    });
    
    // Add click handler to container to clear selection when clicking empty area
    container.addEventListener('click', function(e) {
        if (e.target === container || e.target.classList.contains('slicer-widget')) {
            // Clear all selections
            freshButtons.forEach(b => {
                b.classList.remove('bg-blue-500', 'text-white');
                b.classList.add('bg-gray-200', 'text-gray-700', 'dark:bg-gray-700', 'dark:text-gray-300');
            });
            selectedValue = null;
            triggerDrillThrough(widget, null); // Clear filter - show all data
        }
    });
}

// Initialize text slicer
function initTextSlicer(container) {
    const input = container.querySelector('.slicer-input');
    const widget = container.closest('.chart-widget');
    
    if (!widget) {
        console.error('initTextSlicer: Widget not found');
        return;
    }
    
    // Remove any existing event listeners by cloning input
    if (input) {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
    }
    
    // Get fresh input reference after cloning
    const freshInput = container.querySelector('.slicer-input');
    
    if (freshInput) {
        // Ensure pointer events are enabled
        freshInput.style.pointerEvents = 'auto';
        freshInput.style.cursor = 'text';
        freshInput.readOnly = false;
        freshInput.disabled = false;
        
        let timeout;
        freshInput.addEventListener('input', function(e) {
            e.stopPropagation();
            const value = this.value.trim();
            console.log('Text slicer input:', value);
            
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                console.log('Triggering drill through with text value:', value || null);
                triggerDrillThrough(widget, value || null); // null if empty
                // Also trigger model filtering if connected
                triggerModelFiltering(widget);
            }, 300);
        });
        
        // Also trigger on Enter key
        freshInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.stopPropagation();
                e.preventDefault();
                const value = this.value.trim();
                console.log('Text slicer Enter pressed:', value);
                clearTimeout(timeout);
                triggerDrillThrough(widget, value || null);
                // Also trigger model filtering if connected
                triggerModelFiltering(widget);
            }
        });
        
        // Clear filter when input is cleared
        freshInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
                console.log('Text slicer cleared');
                triggerDrillThrough(widget, null); // Clear filter
            }
        });
    } else {
        console.error('initTextSlicer: Input element not found');
    }
    
    // Add click handler to container to clear selection when clicking empty area
    container.addEventListener('click', function(e) {
        if (e.target === container || e.target.classList.contains('slicer-widget')) {
            if (freshInput) {
                freshInput.value = '';
                triggerDrillThrough(widget, null); // Clear filter - show all data
            }
        }
    });
}

// Initialize list slicer
function initListSlicer(container) {
    const checkboxes = container.querySelectorAll('.slicer-checkbox');
    const widget = container.closest('.chart-widget');
    
    // Remove any existing event listeners by cloning checkboxes
    checkboxes.forEach(cb => {
        const label = cb.closest('label');
        if (label) {
            const newLabel = label.cloneNode(true);
            label.parentNode.replaceChild(newLabel, label);
        }
    });
    
    // Get fresh checkbox references after cloning
    const freshCheckboxes = container.querySelectorAll('.slicer-checkbox');
    
    function updateDrillThrough() {
        const selected = Array.from(freshCheckboxes)
            .filter(c => c.checked)
            .map(c => c.value);
        
        // If no items selected, pass null to show all data
        triggerDrillThrough(widget, selected.length > 0 ? selected : null);
        // Also trigger model filtering if connected
        triggerModelFiltering(widget);
    }
    
    freshCheckboxes.forEach(cb => {
        // Ensure pointer events are enabled
        cb.style.pointerEvents = 'auto';
        cb.style.cursor = 'pointer';
        
        const label = cb.closest('label');
        if (label) {
            label.style.pointerEvents = 'auto';
            label.style.cursor = 'pointer';
        }
        
        cb.addEventListener('change', function(e) {
            e.stopPropagation();
            updateDrillThrough();
        });
        
        // Also add click handler to label
        if (label) {
            label.addEventListener('click', function(e) {
                e.stopPropagation();
                cb.checked = !cb.checked;
                updateDrillThrough();
            });
        }
    });
    
    // Add click handler to container to clear selection when clicking empty area
    container.addEventListener('click', function(e) {
        if (e.target === container || e.target.classList.contains('slicer-widget')) {
            // Uncheck all checkboxes
            freshCheckboxes.forEach(cb => {
                cb.checked = false;
            });
            triggerDrillThrough(widget, null); // Clear filter - show all data
        }
    });
}

// Initialize dropdown slicer
function initDropdownSlicer(container) {
    const dropdown = container.querySelector('.slicer-dropdown');
    if (!dropdown) return;
    
    const widget = container.closest('.chart-widget');
    if (!widget) return;
    
    // Remove any existing event listeners by cloning dropdown
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    
    // Get fresh dropdown reference
    const freshDropdown = container.querySelector('.slicer-dropdown');
    
    function updateDrillThrough() {
        const selectedValue = freshDropdown.value;
        // If no value selected, pass null to show all data
        triggerDrillThrough(widget, selectedValue || null);
        // Also trigger model filtering if connected
        triggerModelFiltering(widget);
    }
    
    freshDropdown.addEventListener('change', function(e) {
        e.stopPropagation();
        updateDrillThrough();
    });
}

// Update a specific slicer widget with data from target chart
function updateSlicerWidgetData(slicerWidget, field, targetWidget) {
    if (!slicerWidget || !field || !targetWidget) {
        console.warn('updateSlicerWidgetData: Missing parameters', { slicerWidget: !!slicerWidget, field, targetWidget: !!targetWidget });
        return;
    }
    
    const slicerType = slicerWidget.dataset.chartType;
    const container = slicerWidget.querySelector('.slicer-widget');
    if (!container) {
        console.warn('updateSlicerWidgetData: Container not found');
        return;
    }
    
    // Get data from target chart
    let slicerData = [];
    const targetChartDiv = targetWidget.querySelector('[id^="chart-"]');
    
    if (targetChartDiv) {
        // Get data from csvData or sampleData based on field
        if (window.csvData && window.csvData.length > 0) {
            const headers = window.csvData[0];
            const fieldIndex = headers.indexOf(field);
            if (fieldIndex !== -1) {
                slicerData = [];
                for (let i = 1; i < window.csvData.length; i++) {
                    const val = window.csvData[i][fieldIndex];
                    if (val !== null && val !== undefined && val !== '' && !slicerData.includes(String(val))) {
                        slicerData.push(String(val));
                    }
                }
            } else {
                console.warn('Field not found in CSV headers:', field, 'Available headers:', headers);
            }
        } else if (window.sampleData && window.sampleData[field]) {
            slicerData = [...new Set(window.sampleData[field].map(v => String(v)))]; // Remove duplicates
        } else {
            console.warn('Field not found in sampleData:', field, 'Available keys:', Object.keys(window.sampleData || {}));
        }
    }
    
    if (slicerData.length === 0) {
        console.warn('No slicer data found for field:', field);
        return;
    }
    
    console.log('Updating slicer widget:', { slicerType, field, slicerDataLength: slicerData.length, slicerData });
    
    // Update button slicer
    if (slicerType === 'button-slicer') {
        const buttonsContainer = container.querySelector('.flex.flex-wrap');
        if (buttonsContainer) {
            buttonsContainer.innerHTML = slicerData.map((val, idx) => `
                <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                        data-value="${val}" 
                        style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                    ${val}
                </button>
            `).join('');
            initButtonSlicer(container);
        }
    }
    
    // Update list slicer
    if (slicerType === 'list-slicer') {
        const listContainer = container.querySelector('.max-h-48');
        if (listContainer) {
            listContainer.innerHTML = slicerData.map((val, idx) => `
                <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                    <input type="checkbox" class="slicer-checkbox" value="${val}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                    <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                </label>
            `).join('');
            initListSlicer(container);
        }
    }
}

// Update a specific slicer widget with data from target chart
function updateSlicerWidgetData(slicerWidget, field, targetWidget) {
    if (!slicerWidget || !field || !targetWidget) return;
    
    const slicerType = slicerWidget.dataset.chartType;
    const container = slicerWidget.querySelector('.slicer-widget');
    if (!container) return;
    
    // Get data from target chart
    let slicerData = [];
    const targetChartDiv = targetWidget.querySelector('[id^="chart-"]');
    
    if (targetChartDiv) {
        // Get data from csvData or sampleData based on field
        if (window.csvData && window.csvData.length > 0) {
            const headers = window.csvData[0];
            const fieldIndex = headers.indexOf(field);
            if (fieldIndex !== -1) {
                slicerData = [];
                for (let i = 1; i < window.csvData.length; i++) {
                    const val = window.csvData[i][fieldIndex];
                    if (val !== null && val !== undefined && val !== '' && !slicerData.includes(String(val))) {
                        slicerData.push(String(val));
                    }
                }
            }
        } else if (window.sampleData && window.sampleData[field]) {
            slicerData = [...new Set(window.sampleData[field].map(v => String(v)))]; // Remove duplicates
        }
    }
    
    if (slicerData.length === 0) {
        console.warn('No data found for field:', field);
        return;
    }
    
    console.log('Updating slicer with data:', slicerData, 'for field:', field);
    
    // Update button slicer
    if (slicerType === 'button-slicer') {
        const buttonsContainer = container.querySelector('.flex.flex-wrap');
        if (buttonsContainer) {
            buttonsContainer.innerHTML = slicerData.map((val, idx) => `
                <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                        data-value="${val}" 
                        style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                    ${val}
                </button>
            `).join('');
            initButtonSlicer(container);
        }
    }
    
    // Update list slicer
    if (slicerType === 'list-slicer') {
        const listContainer = container.querySelector('.max-h-48');
        if (listContainer) {
            listContainer.innerHTML = slicerData.map((val, idx) => `
                <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                    <input type="checkbox" class="slicer-checkbox" value="${val}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                    <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                </label>
            `).join('');
            initListSlicer(container);
        }
    }
}

// Update all slicer widgets when data changes
function updateAllSlicerWidgets() {
    // Update button slicers
    document.querySelectorAll('.chart-widget[data-chart-type="button-slicer"]').forEach(widget => {
        const container = widget.querySelector('.slicer-widget');
        if (!container) return;
        
        // Check if slicer has drill through connection
        const drillField = widget.dataset.drillField;
        const targetChartId = widget.dataset.targetChartId;
        
        if (drillField && targetChartId) {
            // Get data from target chart
            const targetWidget = document.querySelector(`[data-widget-id="${targetChartId}"]`);
            if (targetWidget) {
                updateSlicerWidgetData(widget, drillField, targetWidget);
                return;
            }
        }
        
        // Fallback to default data source
        let buttonSlicerData = [];
        if (window.csvData && window.csvData.length > 0) {
            const firstColIndex = 0;
            buttonSlicerData = [];
            for (let i = 1; i < window.csvData.length; i++) {
                const val = window.csvData[i][firstColIndex];
                if (val && !buttonSlicerData.includes(val)) {
                    buttonSlicerData.push(val);
                }
            }
        } else if (window.sampleData && window.sampleData.Kategori) {
            buttonSlicerData = window.sampleData.Kategori;
        }
        
        if (buttonSlicerData.length > 0) {
            const buttonsContainer = container.querySelector('.flex.flex-wrap');
            if (buttonsContainer) {
                buttonsContainer.innerHTML = buttonSlicerData.map((val, idx) => `
                    <button class="px-3 py-1.5 rounded text-xs slicer-btn ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}" 
                            data-value="${val}" 
                            style="cursor: pointer; transition: all 0.2s; pointer-events: auto;">
                        ${val}
                    </button>
                `).join('');
                initButtonSlicer(container);
            }
        }
    });
    
    // Update list slicers
    document.querySelectorAll('.chart-widget[data-chart-type="list-slicer"]').forEach(widget => {
        const container = widget.querySelector('.slicer-widget');
        if (!container) return;
        
        // Check if slicer has drill through connection
        const drillField = widget.dataset.drillField;
        const targetChartId = widget.dataset.targetChartId;
        
        if (drillField && targetChartId) {
            // Get data from target chart
            const targetWidget = document.querySelector(`[data-widget-id="${targetChartId}"]`);
            if (targetWidget) {
                updateSlicerWidgetData(widget, drillField, targetWidget);
                return;
            }
        }
        
        // Fallback to default data source
        let listSlicerData = [];
        if (window.csvData && window.csvData.length > 0) {
            const firstColIndex = 0;
            listSlicerData = [];
            for (let i = 1; i < window.csvData.length; i++) {
                const val = window.csvData[i][firstColIndex];
                if (val && !listSlicerData.includes(val)) {
                    listSlicerData.push(val);
                }
            }
        } else if (window.sampleData && window.sampleData.Kategori) {
            listSlicerData = window.sampleData.Kategori;
        }
        
        if (listSlicerData.length > 0) {
            const listContainer = container.querySelector('.max-h-48');
            if (listContainer) {
                listContainer.innerHTML = listSlicerData.map((val, idx) => `
                    <label class="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer" style="pointer-events: auto;">
                        <input type="checkbox" class="slicer-checkbox" value="${val}" ${idx === 0 ? 'checked' : ''} style="pointer-events: auto; cursor: pointer;">
                        <span class="text-xs text-gray-700 dark:text-gray-300">${val}</span>
                    </label>
                `).join('');
                initListSlicer(container);
            }
        }
    });
    
    // Update card widgets
    document.querySelectorAll('.chart-widget[data-chart-type="card"]').forEach(widget => {
        const container = widget.querySelector('.card-widget');
        if (container) {
            const cardValue = window.sampleData && window.sampleData.Deger ? window.sampleData.Deger[0] : 125430;
            const valueElement = container.querySelector('.text-4xl');
            if (valueElement) {
                valueElement.textContent = `$${cardValue.toLocaleString()}`;
            }
        }
    });
}

// Make function globally accessible
window.updateAllSlicerWidgets = updateAllSlicerWidgets;

// Initialize Excel widget
function initExcelWidget(container, widgetId) {
    const tbody = container.querySelector(`#excel-tbody-${widgetId}`);
    if (!tbody) return;
    
    // Make cells editable
    tbody.querySelectorAll('td').forEach(cell => {
        cell.contentEditable = 'true';
        cell.addEventListener('blur', function() {
            updateChartDataFromExcelTable(widgetId);
        });
    });
}

// Load Excel for widget
function loadExcelForWidget(containerId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (typeof XLSX === 'undefined') {
            showAlert('Excel library not loaded', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                updateExcelWidgetTable(containerId, jsonData);
                showAlert('Excel data loaded successfully', 'success');
            } catch (error) {
                showAlert('Error parsing Excel file: ' + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}

// Update Excel widget table
function updateExcelWidgetTable(containerId, excelData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const widget = container.closest('.chart-widget');
    if (!widget) return;
    
    const widgetId = widget.dataset.widgetId;
    const tbody = container.querySelector(`#excel-tbody-${widgetId}`);
    if (!tbody) return;
    
    if (excelData.length < 2) {
        showAlert('Excel file must have at least 2 rows', 'error');
        return;
    }
    
    const headers = excelData[0];
    const rows = excelData.slice(1);
    
    // Update table headers
    const thead = container.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = headers.map(h => `<th class="px-2 py-1 border">${h}</th>`).join('');
    }
    
    // Update table body
    tbody.innerHTML = rows.map(row => `
        <tr>
            ${row.map(cell => `<td class="px-2 py-1 border" contenteditable="true">${cell || ''}</td>`).join('')}
        </tr>
    `).join('');
    
    // Update sample data
    if (headers.length >= 3) {
        sampleData.Kategori = rows.map(row => row[0] || '');
        sampleData.Deger = rows.map(row => parseFloat(row[1]) || 0);
        sampleData.Satis = rows.map(row => parseFloat(row[2]) || 0);
    }
    
    // Re-initialize editable cells
    tbody.querySelectorAll('td').forEach(cell => {
        cell.addEventListener('blur', function() {
            updateChartDataFromExcelTable(widgetId);
        });
    });
    
    // Update all charts on canvas
    updateAllChartsFromExcelData();
}

// Update chart data from Excel table
function updateChartDataFromExcelTable(widgetId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!widget) return;
    
    const tbody = widget.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = Array.from(widget.querySelectorAll('thead th')).map(th => th.textContent.trim());
    
    const data = rows.map(row => {
        return Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
    });
    
    if (headers.length > 0 && data.length > 0) {
        // Store data for this specific Excel widget
        if (!window.excelWidgetData) {
            window.excelWidgetData = {};
        }
        window.excelWidgetData[widgetId] = [headers, ...data];
        
        // Find all models connected to this Excel widget
        const connectedModelIds = [];
        
        // Check model-model connections where this Excel widget is the source
        if (window.modelModelConnections && window.modelModelConnections[widgetId]) {
            Object.keys(window.modelModelConnections[widgetId]).forEach(targetId => {
                connectedModelIds.push(targetId);
            });
        }
        
        // Also check if any model has this Excel widget as its data source
        // (This handles cases where Excel widget is connected via connection system)
        document.querySelectorAll('.chart-widget').forEach(modelWidget => {
            const modelWidgetId = modelWidget.dataset.widgetId;
            const modelChartType = modelWidget.dataset.chartType;
            
            // Check if this model is connected to the Excel widget
            if (isModelTool(modelChartType) && modelWidgetId !== widgetId) {
                // Check model-model connections
                if (window.modelModelConnections && window.modelModelConnections[widgetId] && 
                    window.modelModelConnections[widgetId][modelWidgetId]) {
                    if (!connectedModelIds.includes(modelWidgetId)) {
                        connectedModelIds.push(modelWidgetId);
                    }
                }
            }
        });
        
        // Update data for connected models only
        connectedModelIds.forEach(modelWidgetId => {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[modelWidgetId] = [headers, ...data];
            
            // Re-render the connected model
            const modelWidget = document.querySelector(`[data-widget-id="${modelWidgetId}"]`);
            if (modelWidget) {
                const modelChartType = modelWidget.dataset.chartType;
                const modelChartDiv = modelWidget.querySelector('[id^="chart-"]');
                if (modelChartDiv && typeof renderChart === 'function') {
                    renderChart(modelChartType, modelChartDiv.id);
                }
            }
        });
        
        // Update preview if it exists and is showing a chart that uses this data
        if (window.previewChartId) {
            // Store data for preview compatibility
            if (!window.csvData) {
                window.csvData = [];
            }
            window.csvData = [headers, ...data];
            
            // Store data for preview using previewChartId
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = [headers, ...data];
            
            // Update preview using updateChartFromData if available (from chart-settings.js)
            if (typeof updateChartFromData === 'function') {
                // Get the original chart div ID from current settings
                const originalChartDivId = window.currentChartSettings?.chartDivId || null;
                if (originalChartDivId) {
                    updateChartFromData(originalChartDivId);
                } else {
                    // Fallback: directly update preview if chart type is known
                    const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                    if (previewChartType && typeof renderChart === 'function') {
                        renderChart(previewChartType, window.previewChartId);
                    }
                }
            } else {
                // Fallback: directly update preview
                const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                if (previewChartType && typeof renderChart === 'function') {
                    renderChart(previewChartType, window.previewChartId);
                }
            }
        }
        
        // If no connections found, don't update any models automatically
        // This prevents the issue where all models get the same data
        if (connectedModelIds.length === 0) {
            console.log('No connected models found for Excel widget:', widgetId);
        }
    }
}

// Update all charts from Excel data
function updateAllChartsFromExcelData() {
    document.querySelectorAll('.chart-widget').forEach(widget => {
        const chartType = widget.dataset.chartType;
        const chartDiv = widget.querySelector('[id^="chart-"]');
        if (chartDiv && chartType && chartType !== 'excel' && chartType !== 'image' && chartType !== 'card') {
            renderChart(chartType, chartDiv.id);
        }
    });
    
    // Update preview if it exists
    if (window.previewChartId) {
        // Store data for preview compatibility
        if (window.csvData && window.csvData.length > 0) {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = window.csvData;
        }
        
        // Update preview using updateChartFromData if available (from chart-settings.js)
        if (typeof updateChartFromData === 'function') {
            const originalChartDivId = window.currentChartSettings?.chartDivId || null;
            if (originalChartDivId) {
                updateChartFromData(originalChartDivId);
            } else {
                // Fallback: directly update preview
                const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                if (previewChartType && typeof renderChart === 'function') {
                    renderChart(previewChartType, window.previewChartId);
                }
            }
        } else {
            // Fallback: directly update preview
            const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
            if (previewChartType && typeof renderChart === 'function') {
                renderChart(previewChartType, window.previewChartId);
            }
        }
    }
}

// Initialize Excel widget
function initExcelWidget(container, widgetId) {
    const tbody = container.querySelector(`#excel-tbody-${widgetId}`);
    if (!tbody) return;
    
    // Make cells editable
    tbody.querySelectorAll('td').forEach(cell => {
        cell.contentEditable = 'true';
        cell.addEventListener('blur', function() {
            const widget = container.closest('.chart-widget');
            if (widget) {
                updateChartDataFromExcelTable(widget.dataset.widgetId);
            }
        });
    });
}

// Load Excel for widget
function loadExcelForWidget(containerId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (typeof XLSX === 'undefined') {
            showAlert('Excel library not loaded', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                updateExcelWidgetTable(containerId, jsonData);
                showAlert('Excel data loaded successfully', 'success');
            } catch (error) {
                showAlert('Error parsing Excel file: ' + error.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
}

// Update Excel widget table
function updateExcelWidgetTable(containerId, excelData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const widget = container.closest('.chart-widget');
    if (!widget) return;
    
    const widgetId = widget.dataset.widgetId;
    const chartCounter = containerId.split('-')[1];
    const tbody = container.querySelector(`#excel-tbody-${chartCounter}`);
    if (!tbody) return;
    
    if (excelData.length < 2) {
        showAlert('Excel file must have at least 2 rows', 'error');
        return;
    }
    
    const headers = excelData[0];
    const rows = excelData.slice(1);
    
    // Update table headers
    const thead = container.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = headers.map(h => `<th class="px-2 py-1 border">${h}</th>`).join('');
    }
    
    // Update table body
    tbody.innerHTML = rows.map(row => `
        <tr>
            ${row.map(cell => `<td class="px-2 py-1 border" contenteditable="true">${cell || ''}</td>`).join('')}
        </tr>
    `).join('');
    
    // Update sample data with all columns dynamically
    headers.forEach((header, colIndex) => {
        if (colIndex === 0) {
            sampleData.Kategori = rows.map(row => String(row[colIndex] || ''));
        } else if (colIndex === 1) {
            sampleData.Deger = rows.map(row => parseFloat(row[colIndex]) || 0);
        } else if (colIndex === 2) {
            sampleData.Satis = rows.map(row => parseFloat(row[colIndex]) || 0);
        }
        // Store all columns dynamically
        sampleData[header] = rows.map(row => {
            const val = row[colIndex];
            // Try to parse as number, otherwise keep as string
            const numVal = parseFloat(val);
            return isNaN(numVal) ? String(val || '') : numVal;
        });
    });
    
    // Update csvData for model widgets
    if (!window.csvData) {
        window.csvData = [];
    }
    window.csvData = [headers, ...rows];
    
    // Re-initialize editable cells
    tbody.querySelectorAll('td').forEach(cell => {
        cell.addEventListener('blur', function() {
            updateChartDataFromExcelTable(widgetId);
        });
    });
    
    // Update all charts on canvas
    updateAllChartsFromExcelData();
}

// Update chart data from Excel table
function updateChartDataFromExcelTable(widgetId) {
    const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
    if (!widget) return;
    
    const tbody = widget.querySelector('tbody');
    if (!tbody) return;
    
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const headers = Array.from(widget.querySelectorAll('thead th')).map(th => th.textContent.trim());
    
    const data = rows.map(row => {
        return Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
    });
    
    if (headers.length > 0 && data.length > 0) {
        // Store data for this specific Excel widget
        if (!window.excelWidgetData) {
            window.excelWidgetData = {};
        }
        window.excelWidgetData[widgetId] = [headers, ...data];
        
        // Find all models connected to this Excel widget
        const connectedModelIds = [];
        
        // Check model-model connections where this Excel widget is the source
        if (window.modelModelConnections && window.modelModelConnections[widgetId]) {
            Object.keys(window.modelModelConnections[widgetId]).forEach(targetId => {
                connectedModelIds.push(targetId);
            });
        }
        
        // Also check if any model has this Excel widget as its data source
        // (This handles cases where Excel widget is connected via connection system)
        document.querySelectorAll('.chart-widget').forEach(modelWidget => {
            const modelWidgetId = modelWidget.dataset.widgetId;
            const modelChartType = modelWidget.dataset.chartType;
            
            // Check if this model is connected to the Excel widget
            if (isModelTool(modelChartType) && modelWidgetId !== widgetId) {
                // Check model-model connections
                if (window.modelModelConnections && window.modelModelConnections[widgetId] && 
                    window.modelModelConnections[widgetId][modelWidgetId]) {
                    if (!connectedModelIds.includes(modelWidgetId)) {
                        connectedModelIds.push(modelWidgetId);
                    }
                }
            }
        });
        
        // Update data for connected models only
        connectedModelIds.forEach(modelWidgetId => {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[modelWidgetId] = [headers, ...data];
            
            // Re-render the connected model
            const modelWidget = document.querySelector(`[data-widget-id="${modelWidgetId}"]`);
            if (modelWidget) {
                const modelChartType = modelWidget.dataset.chartType;
                const modelChartDiv = modelWidget.querySelector('[id^="chart-"]');
                if (modelChartDiv && typeof renderChart === 'function') {
                    renderChart(modelChartType, modelChartDiv.id);
                }
            }
        });
        
        // Update preview if it exists and is showing a chart that uses this data
        if (window.previewChartId) {
            // Store data for preview compatibility
            if (!window.csvData) {
                window.csvData = [];
            }
            window.csvData = [headers, ...data];
            
            // Store data for preview using previewChartId
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = [headers, ...data];
            
            // Update preview using updateChartFromData if available (from chart-settings.js)
            if (typeof updateChartFromData === 'function') {
                // Get the original chart div ID from current settings
                const originalChartDivId = window.currentChartSettings?.chartDivId || null;
                if (originalChartDivId) {
                    updateChartFromData(originalChartDivId);
                } else {
                    // Fallback: directly update preview if chart type is known
                    const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                    if (previewChartType && typeof renderChart === 'function') {
                        renderChart(previewChartType, window.previewChartId);
                    }
                }
            } else {
                // Fallback: directly update preview
                const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                if (previewChartType && typeof renderChart === 'function') {
                    renderChart(previewChartType, window.previewChartId);
                }
            }
        }
        
        // If no connections found, don't update any models automatically
        // This prevents the issue where all models get the same data
        if (connectedModelIds.length === 0) {
            console.log('No connected models found for Excel widget:', widgetId);
        }
    }
}

// Update all charts from Excel data
function updateAllChartsFromExcelData() {
    document.querySelectorAll('.chart-widget').forEach(widget => {
        const chartType = widget.dataset.chartType;
        const chartDiv = widget.querySelector('[id^="chart-"]');
        if (chartDiv && chartType && chartType !== 'excel' && chartType !== 'image' && chartType !== 'card' && chartType !== 'button-slicer' && chartType !== 'text-slicer' && chartType !== 'list-slicer' && chartType !== 'dropdown-slicer') {
            // Update model widgets (including table) with new data
            if (isModelTool(chartType)) {
                // Force re-render to get updated data
                renderChart(chartType, chartDiv.id);
                
                // If it's a table widget, update the original data storage
                if (chartType === 'table') {
                    const widgetId = widget.dataset.widgetId;
                    setTimeout(() => {
                        const graphDiv = document.getElementById(chartDiv.id);
                        if (graphDiv && graphDiv.data && graphDiv.data.length > 0) {
                            if (!window.tableOriginalData) {
                                window.tableOriginalData = {};
                            }
                            // Store updated data as original
                            window.tableOriginalData[widgetId] = JSON.parse(JSON.stringify(graphDiv.data));
                            console.log('Updated original table data for model widget:', widgetId);
                        }
                    }, 100);
                }
            } else {
                // Update non-model charts
                renderChart(chartType, chartDiv.id);
            }
        }
    });
    
    // Update preview if it exists
    if (window.previewChartId) {
        // Store data for preview compatibility
        if (window.csvData && window.csvData.length > 0) {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = window.csvData;
        }
        
        // Update preview using updateChartFromData if available (from chart-settings.js)
        if (typeof updateChartFromData === 'function') {
            const originalChartDivId = window.currentChartSettings?.chartDivId || null;
            if (originalChartDivId) {
                updateChartFromData(originalChartDivId);
            } else {
                // Fallback: directly update preview
                const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
                if (previewChartType && typeof renderChart === 'function') {
                    renderChart(previewChartType, window.previewChartId);
                }
            }
        } else {
            // Fallback: directly update preview
            const previewChartType = window.currentChartSettings?.chartType || window.previewChartType || null;
            if (previewChartType && typeof renderChart === 'function') {
                renderChart(previewChartType, window.previewChartId);
            }
        }
    }
}

// Initialize image widget
function initImageWidget(container, inputId) {
    const img = container.querySelector('img');
    const fileInput = document.getElementById(inputId);
    
    if (!img || !fileInput) return;
    
    // Click on image to trigger file input
    img.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                showAlert('Please select an image file', 'error');
                return;
            }
            
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                showAlert('Image size must be less than 10MB', 'error');
                return;
            }
            
            // Read file as data URL
            const reader = new FileReader();
            reader.onload = function(e) {
                img.src = e.target.result;
                img.classList.remove('border-gray-200');
                img.classList.add('border-green-500');
                
                // Update hint text
                const hint = container.querySelector('.text-xs');
                if (hint) {
                    hint.innerHTML = `
                        <span class="material-symbols-outlined text-sm text-green-600">check_circle</span>
                        <span class="text-green-600">Image uploaded successfully</span>
                    `;
                }
                
                showAlert('Image uploaded successfully', 'success');
            };
            
            reader.onerror = function() {
                showAlert('Error reading image file', 'error');
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    // Also allow URL input via right-click or double-click
    img.addEventListener('dblclick', function(e) {
        e.preventDefault();
        const url = prompt('Or enter image URL:', this.src);
        if (url && url !== this.src) {
            // Validate URL
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
                this.src = url;
                this.classList.remove('border-gray-200');
                this.classList.add('border-blue-500');
                
                const hint = container.querySelector('.text-xs');
                if (hint) {
                    hint.innerHTML = `
                        <span class="material-symbols-outlined text-sm text-blue-600">link</span>
                        <span class="text-blue-600">Image loaded from URL</span>
                    `;
                }
            } else {
                showAlert('Please enter a valid URL', 'error');
            }
        }
    });
}

// ==================== DRILL THROUGH FUNCTIONALITY ====================

let drillThroughConnections = [];
let externalDrillThroughConnections = [];

// Load drill through connections from localStorage on page load
try {
    const savedConnections = localStorage.getItem('drillThroughConnections');
    if (savedConnections) {
        drillThroughConnections = JSON.parse(savedConnections);
        // Restore visual indicators and data when widgets are loaded
        setTimeout(() => {
            drillThroughConnections.forEach(conn => {
                const sourceWidget = document.querySelector(`[data-widget-id="${conn.sourceId}"]`);
                const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
                if (sourceWidget && targetWidget) {
                    showDrillThroughConnection(sourceWidget, targetWidget);
                    
                    // Store drill field in source widget for slicers
                    if (sourceWidget.dataset.chartType === 'button-slicer' || 
                        sourceWidget.dataset.chartType === 'text-slicer' || 
                        sourceWidget.dataset.chartType === 'list-slicer' ||
                        sourceWidget.dataset.chartType === 'card') {
                        sourceWidget.dataset.drillField = conn.field;
                        sourceWidget.dataset.targetChartId = conn.targetId;
                        
                        // Update slicer with data from target chart
                        if (sourceWidget.dataset.chartType === 'button-slicer' || 
                            sourceWidget.dataset.chartType === 'list-slicer') {
                            updateSlicerWidgetData(sourceWidget, conn.field, targetWidget);
                        }
                    }
                }
            });
        }, 1000);
    }
    
    // Load external drill through connections
    const savedExternalConnections = localStorage.getItem('externalDrillThroughConnections');
    if (savedExternalConnections) {
        externalDrillThroughConnections = JSON.parse(savedExternalConnections);
        // Restore visual indicators when widgets are loaded
        setTimeout(() => {
            externalDrillThroughConnections.forEach(conn => {
                const sourceWidget = document.querySelector(`[data-widget-id="${conn.sourceId}"]`);
                const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
                if (sourceWidget && targetWidget) {
                    // Add visual indicators
                    sourceWidget.classList.add('has-external-drill-through');
                    targetWidget.classList.add('external-drill-through-target');
                    
                    // Add badge to source widget
                    let sourceBadge = sourceWidget.querySelector('.external-drill-through-badge');
                    if (!sourceBadge) {
                        sourceBadge = document.createElement('div');
                        sourceBadge.className = 'external-drill-through-badge absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10 shadow-lg';
                        sourceWidget.style.position = 'relative';
                        sourceWidget.appendChild(sourceBadge);
                    }
                    sourceBadge.innerHTML = `<span class="material-symbols-outlined text-xs">open_in_new</span> External`;
                    
                    // Add badge to target widget
                    let targetBadge = targetWidget.querySelector('.external-drill-through-target-badge');
                    if (!targetBadge) {
                        targetBadge = document.createElement('div');
                        targetBadge.className = 'external-drill-through-target-badge absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10 shadow-lg';
                        targetWidget.style.position = 'relative';
                        targetWidget.appendChild(targetBadge);
                    }
                    targetBadge.innerHTML = `<span class="material-symbols-outlined text-xs">input</span> External`;
                }
            });
        }, 1200);
    }
} catch (e) {
    console.warn('Could not load drill through connections from localStorage:', e);
}

// Trigger drill through from slicer to target charts
function triggerDrillThrough(sourceWidget, filterValue) {
    if (!sourceWidget) return;
    
    const sourceId = sourceWidget.dataset.widgetId;
    if (!sourceId) return;
    
    const connections = drillThroughConnections.filter(c => c.sourceId === sourceId);
    
    if (connections.length === 0) {
        console.log('No drill through connections found for this widget');
        return;
    }
    
    connections.forEach(conn => {
        const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
        if (targetWidget) {
            // If filterValue is null, clear the filter (show all data)
            if (filterValue === null || filterValue === undefined || filterValue === '') {
                clearDrillThroughFilter(targetWidget);
            } else {
                applyDrillThroughFilter(targetWidget, filterValue, conn.field);
            }
            
            // Also trigger external drill through for this filtered target chart
            triggerExternalDrillThrough(targetWidget);
        }
    });
}

// Apply drill through filter to target chart
function applyDrillThroughFilter(targetWidget, filterValue, field) {
    // Handle array of values (multiple selections)
    const isArray = Array.isArray(filterValue);
    const displayValue = isArray ? filterValue.join(', ') : filterValue;
    
    // Add visual indicator
    targetWidget.classList.add('filtered');
    targetWidget.setAttribute('data-filter', JSON.stringify({ field, value: filterValue }));
    
    // Add or update filter badge
    let filterBadge = targetWidget.querySelector('.drill-through-filter-badge');
    if (!filterBadge) {
        filterBadge = document.createElement('div');
        filterBadge.className = 'drill-through-filter-badge absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded z-10 shadow-lg';
        targetWidget.style.position = 'relative';
        targetWidget.appendChild(filterBadge);
    }
    filterBadge.innerHTML = `<span class="material-symbols-outlined text-xs">filter_alt</span> ${displayValue}`;
    filterBadge.title = `Filtered by: ${displayValue}`;
    
    // Re-render chart with filtered data if it's a Plotly chart
    const chartDiv = targetWidget.querySelector('[id^="chart-"]');
    if (chartDiv && chartDiv.id.startsWith('chart-')) {
        const chartType = targetWidget.dataset.chartType;
        if (chartType && chartType !== 'card' && chartType !== 'image' && chartType !== 'button-slicer' && chartType !== 'text-slicer' && chartType !== 'list-slicer' && chartType !== 'dropdown-slicer' && chartType !== 'text-box') {
            // Re-render chart with filter applied
            setTimeout(() => {
                renderChart(chartType, chartDiv.id, filterValue, field);
                
                // After chart is filtered, trigger external drill through
                triggerExternalDrillThrough(targetWidget);
            }, 100);
        }
    }
}

// Clear drill through filter (show all data)
function clearDrillThroughFilter(targetWidget) {
    targetWidget.classList.remove('filtered');
    targetWidget.removeAttribute('data-filter');
    
    // Remove filter badge
    const filterBadge = targetWidget.querySelector('.drill-through-filter-badge');
    if (filterBadge) {
        filterBadge.remove();
    }
    
    // Re-render chart with all data
    const chartDiv = targetWidget.querySelector('[id^="chart-"]');
    if (chartDiv && chartDiv.id.startsWith('chart-')) {
        const chartType = targetWidget.dataset.chartType;
        if (chartType && chartType !== 'card' && chartType !== 'image' && chartType !== 'button-slicer' && chartType !== 'text-slicer' && chartType !== 'list-slicer' && chartType !== 'dropdown-slicer' && chartType !== 'text-box') {
            setTimeout(() => {
                renderChart(chartType, chartDiv.id, null, null); // null means no filter
            }, 100);
        }
    }
}

// Create drill through connection
function createDrillThroughConnection(sourceWidget, targetWidget, field) {
    const sourceId = sourceWidget.dataset.widgetId || generateWidgetId();
    const targetId = targetWidget.dataset.widgetId || generateWidgetId();
    
    sourceWidget.dataset.widgetId = sourceId;
    targetWidget.dataset.widgetId = targetId;
    
    // Check if connection already exists
    const existingConnection = drillThroughConnections.find(
        c => c.sourceId === sourceId && c.targetId === targetId && c.field === field
    );
    
    if (existingConnection) {
        alert('This connection already exists');
        return;
    }
    
    // Add connection
    drillThroughConnections.push({
        sourceId,
        targetId,
        field: field || 'default'
    });
    
    // Store the field in source widget for slicer data updates
    if (sourceWidget.dataset.chartType === 'button-slicer' || 
        sourceWidget.dataset.chartType === 'text-slicer' || 
        sourceWidget.dataset.chartType === 'list-slicer' ||
        sourceWidget.dataset.chartType === 'card') {
        sourceWidget.dataset.drillField = field;
        sourceWidget.dataset.targetChartId = targetId;
    }
    
    // Visual connection indicator
    showDrillThroughConnection(sourceWidget, targetWidget);
    
    // Store connections in localStorage for persistence
    try {
        localStorage.setItem('drillThroughConnections', JSON.stringify(drillThroughConnections));
    } catch (e) {
        console.warn('Could not save drill through connections to localStorage:', e);
    }
    
    console.log('Drill through connection created:', { sourceId, targetId, field });
    
    // Update slicer widget with new data from target chart
    if (sourceWidget.dataset.chartType === 'button-slicer' || 
        sourceWidget.dataset.chartType === 'list-slicer') {
        updateSlicerWidgetData(sourceWidget, field, targetWidget);
    }
}

// Show visual connection between widgets (Power BI style)
function showDrillThroughConnection(source, target) {
    // Add visual indicator classes
    source.classList.add('has-drill-through');
    target.classList.add('drill-through-target');
    
    // Add visual indicator badge to source
    let badge = source.querySelector('.drill-through-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'drill-through-badge absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded z-10';
        badge.innerHTML = '<span class="material-symbols-outlined text-xs">link</span>';
        badge.title = 'Drill through connected';
        source.style.position = 'relative';
        source.appendChild(badge);
    }
    
    // Add visual indicator badge to target
    let targetBadge = target.querySelector('.drill-through-target-badge');
    if (!targetBadge) {
        targetBadge = document.createElement('div');
        targetBadge.className = 'drill-through-target-badge absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded z-10';
        targetBadge.innerHTML = '<span class="material-symbols-outlined text-xs">filter_alt</span>';
        targetBadge.title = 'Receives drill through filter';
        target.style.position = 'relative';
        target.appendChild(targetBadge);
    }
}

// Handle chart click for drill through
function handleChartClick(containerId, plotlyData) {
    const chartDiv = document.getElementById(containerId);
    if (!chartDiv) return;
    
    const sourceWidget = chartDiv.closest('.chart-widget');
    if (!sourceWidget) return;
    
    const sourceId = sourceWidget.dataset.widgetId;
    if (!sourceId) return;
    
    // Get clicked value from Plotly data
    if (!plotlyData || !plotlyData.points || plotlyData.points.length === 0) return;
    
    const point = plotlyData.points[0];
    let filterValue = null;
    
    // Extract value based on chart type
    if (point.x !== undefined && point.x !== null) {
        filterValue = point.x;
    } else if (point.label !== undefined && point.label !== null) {
        filterValue = point.label;
    } else if (point.text !== undefined && point.text !== null) {
        filterValue = point.text;
    }
    
    if (filterValue !== null) {
        // Trigger drill through
        triggerDrillThrough(sourceWidget, filterValue);
    }
}

// Update drill through connections (cleanup)
function updateDrillThroughConnections() {
    drillThroughConnections = drillThroughConnections.filter(conn => {
        return document.querySelector(`[data-widget-id="${conn.sourceId}"]`) && 
               document.querySelector(`[data-widget-id="${conn.targetId}"]`);
    });
}

// Generate unique widget ID
function generateWidgetId() {
    return 'widget-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Show drill through modal (Power BI style)
function showDrillThroughModal(chartDivId, sourceWidgetId) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.drill-through-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Get source widget
    const sourceWidget = document.getElementById(chartDivId)?.closest('.chart-widget');
    if (!sourceWidget) {
        alert('Source chart not found');
        return;
    }
    
    // Get all available charts for drill through target (exclude source)
    const allCharts = Array.from(document.querySelectorAll('.chart-widget'))
        .filter(w => w !== sourceWidget && w.dataset.chartType !== 'button-slicer' && w.dataset.chartType !== 'text-slicer' && w.dataset.chartType !== 'list-slicer')
        .map(w => {
            const widgetId = w.dataset.widgetId || generateWidgetId();
            w.dataset.widgetId = widgetId; // Ensure widget has ID
            const header = w.querySelector('.chart-widget-header .text-sm.font-semibold');
            const chartType = w.dataset.chartType || 'chart';
            return {
                id: widgetId,
                name: header?.textContent || `${chartType} Chart`,
                type: chartType,
                element: w
            };
        });
    
    // Columns will be populated dynamically when target chart is selected
    // No need to get columns here initially
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'drill-through-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 class="text-lg font-semibold mb-4 text-text-default dark:text-white">Connect Drill Through</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white">Source Chart:</label>
                    <div class="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-text-muted dark:text-gray-300">
                        ${sourceWidget.querySelector('.text-sm.font-semibold')?.textContent || 'Chart'}
                    </div>
                </div>
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white">Connect to Chart:</label>
                    <select id="drillThroughTarget" class="w-full px-3 py-2 border border-border-light dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-text-default dark:text-white">
                        <option value="">Select target chart...</option>
                        ${allCharts.map(c => `<option value="${c.id}" data-chart-type="${c.type}">${c.name} (${c.type})</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white">Drill Through Field:</label>
                    <select id="drillThroughField" class="w-full px-3 py-2 border border-border-light dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-text-default dark:text-white" disabled>
                        <option value="">First select a target chart...</option>
                    </select>
                </div>
                <div class="text-xs text-text-muted dark:text-gray-400 bg-blue-50 dark:bg-blue-900 p-3 rounded">
                    <p><strong>How it works:</strong> When you click on a value in the source chart, it will filter the target chart based on the selected field.</p>
                </div>
            </div>
            <div class="flex gap-2 mt-6">
                <button onclick="closeDrillThroughModal()" class="px-4 py-2 border border-border-light dark:border-gray-600 rounded text-text-default dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Cancel</button>
                <button onclick="saveDrillThrough('${chartDivId}', '${sourceWidgetId}')" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">Save Connection</button>
            </div>
        </div>
    `;
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeDrillThroughModal();
        }
    });
    
    // Add event listener for target chart selection
    const targetSelect = modal.querySelector('#drillThroughTarget');
    const fieldSelect = modal.querySelector('#drillThroughField');
    
    if (targetSelect && fieldSelect) {
        targetSelect.addEventListener('change', function() {
            const selectedTargetId = this.value;
            const selectedOption = this.options[this.selectedIndex];
            const selectedChartType = selectedOption.dataset.chartType;
            
            if (selectedTargetId) {
                // Find the target widget
                const targetWidget = document.querySelector(`[data-widget-id="${selectedTargetId}"]`);
                if (targetWidget) {
                    // Get columns from target chart
                    let columns = [];
                    const targetChartDiv = targetWidget.querySelector('[id^="chart-"]');
                    
                    if (targetChartDiv) {
                        // Get columns from target chart's settings
                        const chartSettings = window.chartSettings && window.chartSettings[targetChartDiv.id] 
                            ? window.chartSettings[targetChartDiv.id] 
                            : null;
                        
                        if (chartSettings) {
                            // Try to get columns from chart settings
                            if (chartSettings.xAxisColumn) {
                                columns.push(chartSettings.xAxisColumn);
                            }
                            if (chartSettings.yAxisColumn) {
                                columns.push(chartSettings.yAxisColumn);
                            }
                        }
                        
                        // If no columns from settings, try csvData or sampleData
                        if (columns.length === 0) {
                            if (window.csvData && window.csvData.length > 0) {
                                columns = window.csvData[0];
                            } else if (window.sampleData && Object.keys(window.sampleData).length > 0) {
                                columns = Object.keys(window.sampleData);
                            } else {
                                columns = ['Kategori', 'Deger', 'Satis'];
                            }
                        }
                    } else {
                        // Fallback: use csvData or sampleData
                        if (window.csvData && window.csvData.length > 0) {
                            columns = window.csvData[0];
                        } else if (window.sampleData && Object.keys(window.sampleData).length > 0) {
                            columns = Object.keys(window.sampleData);
                        } else {
                            columns = ['Kategori', 'Deger', 'Satis'];
                        }
                    }
                    
                    // Populate field dropdown with target chart's columns
                    fieldSelect.innerHTML = '<option value="">Select field...</option>';
                    columns.forEach(col => {
                        const option = document.createElement('option');
                        option.value = col;
                        option.textContent = col;
                        fieldSelect.appendChild(option);
                    });
                    
                    // Enable field dropdown
                    fieldSelect.disabled = false;
                }
            } else {
                // Reset field dropdown if no target selected
                fieldSelect.innerHTML = '<option value="">First select a target chart...</option>';
                fieldSelect.disabled = true;
            }
        });
    }
    
    document.body.appendChild(modal);
    return modal;
}

// Close drill through modal
function closeDrillThroughModal() {
    const modal = document.querySelector('.drill-through-modal');
    if (modal) {
        modal.remove();
    }
}

// Save drill through connection
function saveDrillThrough(chartDivId, sourceWidgetId) {
    const field = document.getElementById('drillThroughField')?.value;
    const targetId = document.getElementById('drillThroughTarget')?.value;
    
    if (!field || !targetId) {
        alert('Please select both field and target chart');
        return;
    }
    
    const sourceWidget = document.getElementById(chartDivId)?.closest('.chart-widget');
    const targetWidget = document.querySelector(`[data-widget-id="${targetId}"]`);
    
    if (!sourceWidget || !targetWidget) {
        alert('Could not find source or target chart');
        closeDrillThroughModal();
        return;
    }
    
    // Ensure widgets have IDs
    if (!sourceWidget.dataset.widgetId) {
        sourceWidget.dataset.widgetId = sourceWidgetId || generateWidgetId();
    }
    if (!targetWidget.dataset.widgetId) {
        targetWidget.dataset.widgetId = targetId;
    }
    
    // Create connection
    createDrillThroughConnection(sourceWidget, targetWidget, field);
    
    // Close modal
    closeDrillThroughModal();
    
    // Show success message
    alert('Drill through connection saved successfully! Click on values in the source chart to filter the target chart.');
}

// ==================== EXTERNAL DRILL THROUGH FUNCTIONALITY ====================

// Load external drill through connections from localStorage on page load
try {
    const savedExternalConnections = localStorage.getItem('externalDrillThroughConnections');
    if (savedExternalConnections) {
        externalDrillThroughConnections = JSON.parse(savedExternalConnections);
    }
} catch (e) {
    console.warn('Could not load external drill through connections from localStorage:', e);
}

// Connect External Drill Through
function connectExternalDrillThrough(button) {
    const chartWidget = button.closest('.chart-widget');
    if (!chartWidget) return;
    
    const chartDivId = chartWidget.querySelector('[id^="chart-"]')?.id;
    const widgetId = chartWidget.dataset.widgetId;
    const chartType = chartWidget.dataset.chartType;
    
    // Only allow for table chart or charts that can be filtered
    if (chartType !== 'table' && chartType !== 'list' && chartType !== 'bar' && chartType !== 'line' && chartType !== 'pie' && chartType !== 'scatter') {
        alert('External Drill Through is only available for table, list and chart types.');
        return;
    }
    
    if (chartDivId) {
        showExternalDrillThroughModal(chartDivId, widgetId);
    }
}

// Show External Drill Through Modal
function showExternalDrillThroughModal(sourceChartDivId, sourceWidgetId) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.external-drill-through-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceWidgetId}"]`);
    if (!sourceWidget) return;
    
    // Get all charts on canvas (excluding source chart and Power BI slicers)
    // Check both designCanvas and designCanvasSaved
    const canvas1 = document.getElementById('designCanvas');
    const canvas2 = document.getElementById('designCanvasSaved');
    const allWidgets = [];
    
    if (canvas1) {
        allWidgets.push(...Array.from(canvas1.querySelectorAll('.chart-widget')));
    }
    if (canvas2) {
        allWidgets.push(...Array.from(canvas2.querySelectorAll('.chart-widget')));
    }
    
    const allCharts = allWidgets
        .filter(w => {
            const widgetId = w.dataset.widgetId;
            const chartType = w.dataset.chartType;
            // Exclude source chart and Power BI tools
            return widgetId && 
                   widgetId !== sourceWidgetId && 
                   chartType !== 'button-slicer' && 
                   chartType !== 'text-slicer' && 
                   chartType !== 'list-slicer' &&
                   chartType !== 'card';
        })
        .map(w => {
            const widgetId = w.dataset.widgetId;
            const chartDiv = w.querySelector('[id^="chart-"]');
            // Try to get chart name from header (might be hidden)
            let chartName = '';
            const header = w.querySelector('.chart-widget-header');
            if (header) {
                const nameSpan = header.querySelector('.text-sm.font-semibold');
                chartName = nameSpan?.textContent || '';
            }
            // If header is hidden, try to get from chartTypes
            if (!chartName) {
                const chartType = w.dataset.chartType || 'chart';
                const chartTypeObj = chartTypes.find(c => c.id === chartType);
                chartName = chartTypeObj?.name || `${chartType} Chart`;
            }
            const chartType = w.dataset.chartType || 'chart';
            return {
                id: widgetId,
                chartDivId: chartDiv?.id || '',
                name: chartName || `${chartType} Chart`,
                type: chartType
            };
        });
    
    // Get available columns from filtered data
    let availableColumns = [];
    if (window.csvData && window.csvData.length > 0) {
        availableColumns = window.csvData[0] || [];
    } else if (window.sampleData) {
        availableColumns = Object.keys(window.sampleData);
    }
    
    const modal = document.createElement('div');
    modal.className = 'external-drill-through-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4 text-text-default dark:text-white">Connect External Drill Through</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white">Source Chart:</label>
                    <div class="mt-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-text-muted dark:text-gray-300">
                        ${sourceWidget.querySelector('.text-sm.font-semibold')?.textContent || 'Chart'}
                    </div>
                </div>
                
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white mb-1 block">Target Chart:</label>
                    <select id="externalDrillThroughTarget" class="w-full px-3 py-2 border border-border-light dark:border-gray-600 rounded mt-1 bg-white dark:bg-gray-700 text-text-default dark:text-white">
                        <option value="">Select target chart...</option>
                        ${allCharts.length > 0 ? allCharts.map(c => `<option value="${c.id}" data-chart-div-id="${c.chartDivId}">${c.name} (${c.type})</option>`).join('') : '<option value="" disabled>No charts available</option>'}
                    </select>
                    ${allCharts.length === 0 ? '<p class="text-xs text-red-500 mt-1">No target charts found. Please add charts to the canvas first.</p>' : ''}
                </div>
                
                <div>
                    <label class="text-sm font-medium text-text-default dark:text-white mb-1 block">Select Columns to Pass:</label>
                    <div class="mt-2 max-h-60 overflow-y-auto border border-border-light dark:border-gray-600 rounded p-3 bg-gray-50 dark:bg-gray-800">
                        ${availableColumns.length > 0 ? availableColumns.map(col => `
                            <label class="flex items-center gap-2 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer">
                                <input type="checkbox" class="external-column-checkbox" value="${col}" data-column="${col}">
                                <span class="text-sm text-text-default dark:text-white">${col}</span>
                            </label>
                        `).join('') : '<p class="text-sm text-text-muted dark:text-gray-400">No columns available</p>'}
                    </div>
                    <p class="text-xs text-text-muted dark:text-gray-400 mt-1">Select one or more columns to pass filtered data to target chart</p>
                </div>
                
                <div class="flex justify-end gap-2 pt-4 border-t border-border-light">
                    <button onclick="closeExternalDrillThroughModal()" class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-text-default dark:text-white">
                        Cancel
                    </button>
                    <button onclick="saveExternalDrillThrough('${sourceChartDivId}', '${sourceWidgetId}')" class="px-4 py-2 bg-primary-brand text-white rounded text-sm hover:bg-primary-brand-hover">
                        Save Connection
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Save External Drill Through Connection
function saveExternalDrillThrough(sourceChartDivId, sourceWidgetId) {
    const targetSelect = document.getElementById('externalDrillThroughTarget');
    const targetId = targetSelect?.value;
    const targetChartDivId = targetSelect?.selectedOptions[0]?.dataset?.chartDivId;
    
    if (!targetId) {
        alert('Please select a target chart');
        return;
    }
    
    // Get selected columns
    const selectedColumns = Array.from(document.querySelectorAll('.external-column-checkbox:checked'))
        .map(cb => cb.value);
    
    if (selectedColumns.length === 0) {
        alert('Please select at least one column to pass');
        return;
    }
    
    const sourceWidget = document.querySelector(`[data-widget-id="${sourceWidgetId}"]`);
    const targetWidget = document.querySelector(`[data-widget-id="${targetId}"]`);
    
    if (!sourceWidget || !targetWidget) {
        alert('Source or target chart not found');
        return;
    }
    
    // Create external drill through connection
    const connection = {
        sourceId: sourceWidgetId,
        sourceChartDivId: sourceChartDivId,
        targetId: targetId,
        targetChartDivId: targetChartDivId,
        columns: selectedColumns
    };
    
    // Check if connection already exists
    const exists = externalDrillThroughConnections.find(c => 
        c.sourceId === sourceWidgetId && c.targetId === targetId
    );
    
    if (exists) {
        // Update existing connection
        exists.columns = selectedColumns;
    } else {
        // Add new connection
        externalDrillThroughConnections.push(connection);
    }
    
    // Save to localStorage
    try {
        localStorage.setItem('externalDrillThroughConnections', JSON.stringify(externalDrillThroughConnections));
    } catch (e) {
        console.warn('Could not save external drill through connections to localStorage:', e);
    }
    
    // Add visual indicator
    sourceWidget.classList.add('has-external-drill-through');
    targetWidget.classList.add('external-drill-through-target');
    
    // Add badge to source widget
    let sourceBadge = sourceWidget.querySelector('.external-drill-through-badge');
    if (!sourceBadge) {
        sourceBadge = document.createElement('div');
        sourceBadge.className = 'external-drill-through-badge absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10 shadow-lg';
        sourceWidget.style.position = 'relative';
        sourceWidget.appendChild(sourceBadge);
    }
    sourceBadge.innerHTML = `<span class="material-symbols-outlined text-xs">open_in_new</span> External`;
    
    // Add badge to target widget
    let targetBadge = targetWidget.querySelector('.external-drill-through-target-badge');
    if (!targetBadge) {
        targetBadge = document.createElement('div');
        targetBadge.className = 'external-drill-through-target-badge absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded z-10 shadow-lg';
        targetWidget.style.position = 'relative';
        targetWidget.appendChild(targetBadge);
    }
    targetBadge.innerHTML = `<span class="material-symbols-outlined text-xs">input</span> External`;
    
    // Close modal
    closeExternalDrillThroughModal();
    
    // Show success message
    alert('External Drill Through connection saved successfully! Filtered data will be passed to target chart when slicers change.');
}

// Close External Drill Through Modal
function closeExternalDrillThroughModal() {
    const modal = document.querySelector('.external-drill-through-modal');
    if (modal) {
        modal.remove();
    }
}

// Trigger External Drill Through - called when slicer filter changes
function triggerExternalDrillThrough(sourceWidget) {
    if (!sourceWidget) return;
    
    const sourceId = sourceWidget.dataset.widgetId;
    if (!sourceId) return;
    
    // Find all external drill through connections for this source
    const connections = externalDrillThroughConnections.filter(c => c.sourceId === sourceId);
    
    if (connections.length === 0) {
        return;
    }
    
    // Get filtered data from source chart
    let filteredData = null;
    const sourceChartDiv = sourceWidget.querySelector('[id^="chart-"]');
    
    if (sourceChartDiv) {
        // Get current filtered data from window.csvData or window.sampleData
        // This will be filtered by the slicer
        filteredData = window.csvData || window.sampleData;
    }
    
    if (!filteredData) return;
    
    // Process each connection
    connections.forEach(conn => {
        const targetWidget = document.querySelector(`[data-widget-id="${conn.targetId}"]`);
        if (!targetWidget) return;
        
        // Extract selected columns from filtered data
        // First, get the filtered data from the source chart (which is already filtered by slicer)
        let extractedData = {};
        
        // Get filtered data from source chart's current state
        // The source chart is already filtered by the slicer, so we need to get its filtered data
        const sourceChartDiv = sourceWidget.querySelector('[id^="chart-"]');
        if (!sourceChartDiv) return;
        
        // Get current filtered data - use window.csvData or window.sampleData
        // These are already filtered by the slicer through triggerDrillThrough
        if (window.csvData && window.csvData.length > 0) {
            const headers = window.csvData[0];
            conn.columns.forEach(col => {
                const colIndex = headers.indexOf(col);
                if (colIndex !== -1) {
                    extractedData[col] = [];
                    // Get filtered rows (skip header)
                    for (let i = 1; i < window.csvData.length; i++) {
                        extractedData[col].push(window.csvData[i][colIndex]);
                    }
                }
            });
        } else if (window.sampleData) {
            conn.columns.forEach(col => {
                if (window.sampleData[col]) {
                    extractedData[col] = [...window.sampleData[col]];
                }
            });
        }
        
        // Update target chart with extracted data
        if (Object.keys(extractedData).length > 0) {
            updateTargetChartWithExternalData(targetWidget, conn.targetChartDivId, extractedData, sourceId);
        }
    });
}

// Update target chart with external drill through data
function updateTargetChartWithExternalData(targetWidget, targetChartDivId, extractedData, sourceWidgetId) {
    if (!targetWidget || !targetChartDivId) return;
    
    const chartType = targetWidget.dataset.chartType;
    const chartDiv = document.getElementById(targetChartDivId);
    
    if (!chartDiv || !chartType) return;
    
    // Store original data
    const originalCsvData = window.csvData;
    const originalSampleData = window.sampleData;
    
    // Convert extractedData to csvData format if needed
    if (Object.keys(extractedData).length > 0) {
        const columns = Object.keys(extractedData);
        const maxLength = Math.max(...columns.map(col => extractedData[col].length));
        
        // Create csvData format
        window.csvData = [columns]; // Header row
        for (let i = 0; i < maxLength; i++) {
            const row = columns.map(col => extractedData[col][i] || '');
            window.csvData.push(row);
        }
        
        // Also update sampleData for compatibility
        window.sampleData = extractedData;
        
        // Store that this chart uses external data
        targetWidget.dataset.externalData = 'true';
        if (sourceWidgetId) {
            targetWidget.dataset.externalSourceId = sourceWidgetId;
        }
    }
    
    // Get chart settings
    const settings = window.chartSettings && window.chartSettings[targetChartDivId] || {};
    
    // Re-render chart with extracted data
    if (typeof renderChart === 'function') {
        renderChart(chartType, targetChartDivId, settings);
    }
}

// Clear canvas
function clearCanvas() {
    if (confirm('Are you sure you want to clear all charts?')) {
        const canvas = document.getElementById('designCanvas');
        if (canvas) {
            canvas.innerHTML = '';
            chartCounter = 0;
        }
    }
}

// ==================== TOOLBAR FUNCTIONS ====================

// Apply formatting
function applyFormat(command, value = null) {
    // Check if there's an active text-box-content element
    const activeElement = document.activeElement;
    const isTextBoxActive = activeElement && activeElement.classList.contains('text-box-content');
    
    if (isTextBoxActive) {
        // Apply formatting to the active text-box-content
        activeElement.focus();
        document.execCommand(command, false, value);
        updateWordCount();
        updateToolbarState();
    } else {
        // Check if there's a focused text-box-content anywhere
        const focusedTextBox = document.querySelector('.text-box-content:focus');
        if (focusedTextBox) {
            focusedTextBox.focus();
            document.execCommand(command, false, value);
            updateWordCount();
            updateToolbarState();
        } else {
            // Fallback to default behavior
            document.execCommand(command, false, value);
            updateWordCount();
            updateToolbarState();
        }
    }
}

// Apply style
function applyStyle(property, value) {
    // Check if there's an active text-box-content element
    const activeElement = document.activeElement;
    const isTextBoxActive = activeElement && activeElement.classList.contains('text-box-content');
    
    let targetElement = activeElement;
    if (!isTextBoxActive) {
        const focusedTextBox = document.querySelector('.text-box-content:focus');
        if (focusedTextBox) {
            targetElement = focusedTextBox;
            focusedTextBox.focus();
        }
    }
    
    document.execCommand('styleWithCSS', false, true);
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!range.collapsed) {
            const span = document.createElement('span');
            span.style[property] = value;
            try {
                range.surroundContents(span);
            } catch (e) {
                // If surroundContents fails, use execCommand
                document.execCommand('formatBlock', false, 'div');
            }
        }
    }
}

// Update toolbar button states based on current selection
function updateToolbarState() {
    // Check if there's an active text-box-content element
    const activeElement = document.activeElement;
    const isTextBoxActive = activeElement && activeElement.classList.contains('text-box-content');
    
    // If no text-box is active, don't update toolbar
    if (!isTextBoxActive) {
        const focusedTextBox = document.querySelector('.text-box-content:focus');
        if (!focusedTextBox) {
            return; // No text-box is focused, don't update toolbar
        }
    }
    
    try {
        // Update bold button
        const boldBtn = document.querySelector('[onclick*="bold"]');
        if (boldBtn) {
            boldBtn.classList.toggle('bg-gray-200', document.queryCommandState('bold'));
        }
        
        // Update italic button
        const italicBtn = document.querySelector('[onclick*="italic"]');
        if (italicBtn) {
            italicBtn.classList.toggle('bg-gray-200', document.queryCommandState('italic'));
        }
        
        // Update underline button
        const underlineBtn = document.querySelector('[onclick*="underline"]');
        if (underlineBtn) {
            underlineBtn.classList.toggle('bg-gray-200', document.queryCommandState('underline'));
        }
        
        // Update strikethrough button
        const strikethroughBtn = document.querySelector('[onclick*="strikethrough"]');
        if (strikethroughBtn) {
            strikethroughBtn.classList.toggle('bg-gray-200', document.queryCommandState('strikeThrough'));
        }
    } catch (e) {
        // Ignore errors if command state cannot be queried
        console.log('Toolbar state update error:', e);
    }
}

// Insert table
function insertTable() {
    const rows = prompt('Number of rows:', '3');
    const cols = prompt('Number of columns:', '3');
    if (rows && cols) {
        let table = '<table border="1" style="border-collapse: collapse; width: 100%; margin: 10px 0;"><tbody>';
        for (let i = 0; i < parseInt(rows); i++) {
            table += '<tr>';
            for (let j = 0; j < parseInt(cols); j++) {
                table += '<td style="padding: 8px; border: 1px solid #ddd;">&nbsp;</td>';
            }
            table += '</tr>';
        }
        table += '</tbody></table>';
        document.execCommand('insertHTML', false, table);
        updateWordCount();
    }
}

// Merge cells
function mergeCells() {
    document.execCommand('mergeCells', false, null);
    updateWordCount();
}

// Split cells
function splitCells() {
    document.execCommand('splitCells', false, null);
    updateWordCount();
}

// Insert image
function insertImage() {
    const url = prompt('Image URL:', 'https://via.placeholder.com/300x200');
    if (url) {
        document.execCommand('insertImage', false, url);
        updateWordCount();
    }
}

// Insert link
function insertLink() {
    const url = prompt('Link URL:', 'https://');
    if (url) {
        const text = window.getSelection().toString() || prompt('Link text:', url);
        if (text) {
            document.execCommand('createLink', false, url);
            updateWordCount();
        }
    }
}

// Insert horizontal rule
function insertHorizontalRule() {
    document.execCommand('insertHorizontalRule', false, null);
    updateWordCount();
}

// Insert symbols only
function insertSymbols() {
    // Close existing modal if open
    if (window.specialCharModal) {
        window.specialCharModal.remove();
        window.specialCharModal = null;
    }
    
    const chars = {
        '©': 'Copyright',
        '®': 'Registered',
        '™': 'Trademark',
        '€': 'Euro',
        '£': 'Pound',
        '¥': 'Yen',
        '°': 'Degree',
        '±': 'Plus-Minus',
        '×': 'Multiplication',
        '÷': 'Division',
        '∞': 'Infinity',
        '≠': 'Not Equal',
        '≤': 'Less or Equal',
        '≥': 'Greater or Equal',
        '∑': 'Sum',
        '√': 'Square Root',
        'π': 'Pi',
        'α': 'Alpha',
        'β': 'Beta',
        'γ': 'Gamma',
        'Δ': 'Delta',
        'θ': 'Theta',
        'λ': 'Lambda',
        'μ': 'Mu',
        'σ': 'Sigma',
        'φ': 'Phi',
        'Ω': 'Omega',
        '→': 'Right Arrow',
        '←': 'Left Arrow',
        '↑': 'Up Arrow',
        '↓': 'Down Arrow',
        '↔': 'Left-Right Arrow',
        '✓': 'Check Mark',
        '✗': 'Cross Mark',
        '★': 'Star',
        '♥': 'Heart',
        '♦': 'Diamond',
        '♣': 'Club',
        '♠': 'Spade',
        '•': 'Bullet',
        '…': 'Ellipsis',
        '—': 'Em Dash',
        '–': 'En Dash',
        '«': 'Left Double Angle',
        '»': 'Right Double Angle',
        '„': 'Double Low-9 Quotation',
        '‚': 'Single Low-9 Quotation',
        '‰': 'Per Mille',
        '§': 'Section',
        '¶': 'Paragraph',
        '†': 'Dagger',
        '‡': 'Double Dagger'
    };
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-800">Symbols</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-4 overflow-y-auto flex-1">
                <div class="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                    ${Object.entries(chars).map(([char, name]) => `
                        <button 
                            onclick="selectSpecialChar('${char}')" 
                            class="special-char-btn p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors flex flex-col items-center justify-center group"
                            title="${name}"
                        >
                            <span class="text-2xl mb-1">${char}</span>
                            <span class="text-xs text-gray-600 group-hover:text-blue-600 text-center">${name}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            <div class="p-4 border-t border-gray-200 flex justify-end">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.specialCharModal = modal;
}

// Insert shapes only
function insertShapes() {
    // Close existing modal if open
    if (window.specialCharModal) {
        window.specialCharModal.remove();
        window.specialCharModal = null;
    }
    
    // Word-like shapes (SVG)
    const shapes = {
        'rectangle': { name: 'Rectangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="2" y="2" width="36" height="26" fill="none" stroke="currentColor" stroke-width="2" rx="2"/></svg>' },
        'circle': { name: 'Circle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><circle cx="20" cy="15" r="12" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'triangle': { name: 'Triangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 35,27 5,27" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'diamond': { name: 'Diamond', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 37,15 20,27 3,15" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'pentagon': { name: 'Pentagon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 33,10 30,25 10,25 7,10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'hexagon': { name: 'Hexagon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 32,9 32,21 20,27 8,21 8,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'star': { name: 'Star', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,2 24,12 34,14 26,21 28,31 20,26 12,31 14,21 6,14 16,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'arrow-right': { name: 'Right Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,15 L30,15 M25,10 L30,15 L25,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-left': { name: 'Left Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M35,15 L10,15 M15,10 L10,15 L15,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-up': { name: 'Up Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,25 L20,5 M15,10 L20,5 L25,10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-down': { name: 'Down Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,5 L20,25 M15,20 L20,25 L25,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'double-arrow': { name: 'Double Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,15 L30,15 M25,10 L30,15 L25,20 M15,10 L10,15 L15,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'curved-arrow': { name: 'Curved Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,20 Q20,5 30,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M25,15 L30,20 L25,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'line': { name: 'Line', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><line x1="5" y1="15" x2="35" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
        'curve': { name: 'Curve', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,25 Q20,5 35,25" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'heart': { name: 'Heart', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,25 C20,25 5,15 5,10 C5,7 7,5 10,5 C13,5 20,12 20,12 C20,12 27,5 30,5 C33,5 35,7 35,10 C35,15 20,25 20,25 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'cloud': { name: 'Cloud', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M25,10 C27,7 30,5 33,5 C36,5 38,7 38,10 C38,12 37,14 35,15 C36,17 37,19 37,21 C37,24 35,26 32,26 L15,26 C12,26 10,24 10,21 C10,19 11,17 12,15 C10,14 9,12 9,10 C9,7 11,5 14,5 C17,5 20,7 22,10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'sun': { name: 'Sun', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><circle cx="20" cy="15" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="2" x2="20" y2="6" stroke="currentColor" stroke-width="2"/><line x1="20" y1="24" x2="20" y2="28" stroke="currentColor" stroke-width="2"/><line x1="38" y1="15" x2="34" y2="15" stroke="currentColor" stroke-width="2"/><line x1="6" y1="15" x2="2" y2="15" stroke="currentColor" stroke-width="2"/><line x1="32" y1="6" x2="29" y2="9" stroke="currentColor" stroke-width="2"/><line x1="11" y1="21" x2="8" y2="24" stroke="currentColor" stroke-width="2"/><line x1="32" y1="24" x2="29" y2="21" stroke="currentColor" stroke-width="2"/><line x1="11" y1="9" x2="8" y2="6" stroke="currentColor" stroke-width="2"/></svg>' },
        'moon': { name: 'Moon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M25,5 C20,5 16,9 16,14 C16,19 20,23 25,23 C24,22 23,20 23,18 C23,15 25,13 27,12 C26,8 26,6 25,5 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'process': { name: 'Process', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="8" width="30" height="14" fill="none" stroke="currentColor" stroke-width="2" rx="2"/><path d="M15,15 L25,15" stroke="currentColor" stroke-width="2"/></svg>' },
        'decision': { name: 'Decision', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,5 35,15 20,25 5,15" fill="none" stroke="currentColor" stroke-width="2"/><text x="20" y="16" text-anchor="middle" font-size="8" fill="currentColor">?</text></svg>' },
        'document': { name: 'Document', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,5 L10,25 L30,25 L30,10 L25,5 Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="25" y1="5" x2="25" y2="10" x2="30" y2="10" stroke="currentColor" stroke-width="2"/></svg>' },
        'cylinder': { name: 'Cylinder', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="20" cy="8" rx="12" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8,8 L8,22 M32,8 L32,22" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="20" cy="22" rx="12" ry="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'cube': { name: 'Cube', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="10,10 25,5 30,15 15,20" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="10,10 15,20 15,25 10,20" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="25,5 30,15 30,20 25,25" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'callout': { name: 'Callout', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="5" width="25" height="18" fill="none" stroke="currentColor" stroke-width="2" rx="2"/><polygon points="30,15 35,20 30,25" fill="currentColor"/></svg>' },
        'banner': { name: 'Banner', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,10 L35,10 L30,20 L10,20 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'frame': { name: 'Frame', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="5" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="8" width="24" height="14" fill="none" stroke="currentColor" stroke-width="1"/></svg>' },
        'rounded-rect': { name: 'Rounded Rectangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="8" width="30" height="14" fill="none" stroke="currentColor" stroke-width="2" rx="5"/></svg>' },
        'oval': { name: 'Oval', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="20" cy="15" rx="15" ry="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'trapezoid': { name: 'Trapezoid', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="8,8 32,8 28,22 12,22" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'parallelogram': { name: 'Parallelogram', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="10,8 32,8 28,22 6,22" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }
    };
    
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div class="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 class="text-lg font-semibold text-gray-800">Shapes</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="p-4 overflow-y-auto flex-1">
                <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    ${Object.entries(shapes).map(([id, shape]) => {
                        const escapedSvg = shape.svg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '');
                        return `
                        <button 
                            onclick="selectShapeById('${id}')"
                            class="shape-btn p-3 border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors flex flex-col items-center justify-center group"
                            title="${shape.name}"
                            data-shape-id="${id}"
                        >
                            <div class="mb-2 text-gray-700 group-hover:text-blue-600">${shape.svg}</div>
                            <span class="text-xs text-gray-600 group-hover:text-blue-600 text-center">${shape.name}</span>
                        </button>
                    `;
                    }).join('')}
                </div>
            </div>
            <div class="p-4 border-t border-gray-200 flex justify-end">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
                    Close
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Store modal reference
    window.specialCharModal = modal;
}

// Show symbol or shapes tab
function showSymbolTab(tab) {
    const symbolsContent = document.getElementById('symbols-content');
    const shapesContent = document.getElementById('shapes-content');
    const symbolsTab = document.getElementById('tab-symbols');
    const shapesTab = document.getElementById('tab-shapes');
    
    if (tab === 'symbols') {
        symbolsContent.classList.remove('hidden');
        shapesContent.classList.add('hidden');
        symbolsTab.classList.add('border-blue-500', 'text-blue-600');
        symbolsTab.classList.remove('border-transparent', 'text-gray-600');
        shapesTab.classList.remove('border-blue-500', 'text-blue-600');
        shapesTab.classList.add('border-transparent', 'text-gray-600');
    } else {
        shapesContent.classList.remove('hidden');
        symbolsContent.classList.add('hidden');
        shapesTab.classList.add('border-blue-500', 'text-blue-600');
        shapesTab.classList.remove('border-transparent', 'text-gray-600');
        symbolsTab.classList.remove('border-blue-500', 'text-blue-600');
        symbolsTab.classList.add('border-transparent', 'text-gray-600');
    }
}

// Select shape by ID
function selectShapeById(shapeId) {
    // Get shape SVG from shapes object
    const shapes = {
        'rectangle': { name: 'Rectangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="2" y="2" width="36" height="26" fill="none" stroke="currentColor" stroke-width="2" rx="2"/></svg>' },
        'circle': { name: 'Circle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><circle cx="20" cy="15" r="12" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'triangle': { name: 'Triangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 35,27 5,27" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'diamond': { name: 'Diamond', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 37,15 20,27 3,15" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'pentagon': { name: 'Pentagon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 33,10 30,25 10,25 7,10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'hexagon': { name: 'Hexagon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,3 32,9 32,21 20,27 8,21 8,9" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'star': { name: 'Star', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,2 24,12 34,14 26,21 28,31 20,26 12,31 14,21 6,14 16,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'arrow-right': { name: 'Right Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,15 L30,15 M25,10 L30,15 L25,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-left': { name: 'Left Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M35,15 L10,15 M15,10 L10,15 L15,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-up': { name: 'Up Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,25 L20,5 M15,10 L20,5 L25,10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'arrow-down': { name: 'Down Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,5 L20,25 M15,20 L20,25 L25,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'double-arrow': { name: 'Double Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,15 L30,15 M25,10 L30,15 L25,20 M15,10 L10,15 L15,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'curved-arrow': { name: 'Curved Arrow', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,20 Q20,5 30,20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M25,15 L30,20 L25,18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        'line': { name: 'Line', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><line x1="5" y1="15" x2="35" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' },
        'curve': { name: 'Curve', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,25 Q20,5 35,25" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'heart': { name: 'Heart', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M20,25 C20,25 5,15 5,10 C5,7 7,5 10,5 C13,5 20,12 20,12 C20,12 27,5 30,5 C33,5 35,7 35,10 C35,15 20,25 20,25 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'cloud': { name: 'Cloud', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M25,10 C27,7 30,5 33,5 C36,5 38,7 38,10 C38,12 37,14 35,15 C36,17 37,19 37,21 C37,24 35,26 32,26 L15,26 C12,26 10,24 10,21 C10,19 11,17 12,15 C10,14 9,12 9,10 C9,7 11,5 14,5 C17,5 20,7 22,10" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'sun': { name: 'Sun', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><circle cx="20" cy="15" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="20" y1="2" x2="20" y2="6" stroke="currentColor" stroke-width="2"/><line x1="20" y1="24" x2="20" y2="28" stroke="currentColor" stroke-width="2"/><line x1="38" y1="15" x2="34" y2="15" stroke="currentColor" stroke-width="2"/><line x1="6" y1="15" x2="2" y2="15" stroke="currentColor" stroke-width="2"/><line x1="32" y1="6" x2="29" y2="9" stroke="currentColor" stroke-width="2"/><line x1="11" y1="21" x2="8" y2="24" stroke="currentColor" stroke-width="2"/><line x1="32" y1="24" x2="29" y2="21" stroke="currentColor" stroke-width="2"/><line x1="11" y1="9" x2="8" y2="6" stroke="currentColor" stroke-width="2"/></svg>' },
        'moon': { name: 'Moon', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M25,5 C20,5 16,9 16,14 C16,19 20,23 25,23 C24,22 23,20 23,18 C23,15 25,13 27,12 C26,8 26,6 25,5 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'process': { name: 'Process', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="8" width="30" height="14" fill="none" stroke="currentColor" stroke-width="2" rx="2"/><path d="M15,15 L25,15" stroke="currentColor" stroke-width="2"/></svg>' },
        'decision': { name: 'Decision', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="20,5 35,15 20,25 5,15" fill="none" stroke="currentColor" stroke-width="2"/><text x="20" y="16" text-anchor="middle" font-size="8" fill="currentColor">?</text></svg>' },
        'document': { name: 'Document', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M10,5 L10,25 L30,25 L30,10 L25,5 Z" fill="none" stroke="currentColor" stroke-width="2"/><line x1="25" y1="5" x2="25" y2="10" x2="30" y2="10" stroke="currentColor" stroke-width="2"/></svg>' },
        'cylinder': { name: 'Cylinder', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="20" cy="8" rx="12" ry="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8,8 L8,22 M32,8 L32,22" fill="none" stroke="currentColor" stroke-width="2"/><ellipse cx="20" cy="22" rx="12" ry="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'cube': { name: 'Cube', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="10,10 25,5 30,15 15,20" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="10,10 15,20 15,25 10,20" fill="none" stroke="currentColor" stroke-width="2"/><polygon points="25,5 30,15 30,20 25,25" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'callout': { name: 'Callout', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="5" width="25" height="18" fill="none" stroke="currentColor" stroke-width="2" rx="2"/><polygon points="30,15 35,20 30,25" fill="currentColor"/></svg>' },
        'banner': { name: 'Banner', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><path d="M5,10 L35,10 L30,20 L10,20 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'frame': { name: 'Frame', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="5" width="30" height="20" fill="none" stroke="currentColor" stroke-width="2"/><rect x="8" y="8" width="24" height="14" fill="none" stroke="currentColor" stroke-width="1"/></svg>' },
        'rounded-rect': { name: 'Rounded Rectangle', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><rect x="5" y="8" width="30" height="14" fill="none" stroke="currentColor" stroke-width="2" rx="5"/></svg>' },
        'oval': { name: 'Oval', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><ellipse cx="20" cy="15" rx="15" ry="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'trapezoid': { name: 'Trapezoid', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="8,8 32,8 28,22 12,22" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
        'parallelogram': { name: 'Parallelogram', svg: '<svg width="40" height="30" viewBox="0 0 40 30"><polygon points="10,8 32,8 28,22 6,22" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }
    };
    
    const shape = shapes[shapeId];
    if (!shape) {
        console.error('Shape not found:', shapeId);
        return;
    }
    
    selectShape(shapeId, shape.svg);
}

// Select shape
function selectShape(shapeId, svg) {
    // Insert SVG shape into canvas
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Create a container for the shape
    const shapeContainer = document.createElement('div');
    shapeContainer.className = 'shape-container inline-block m-2';
    shapeContainer.style.display = 'inline-block';
    shapeContainer.innerHTML = `
        <div class="shape-wrapper relative group" style="display: inline-block;">
            ${svg}
            <button onclick="this.closest('.shape-container').remove()" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                ×
            </button>
        </div>
    `;
    
    // Insert at cursor position or append
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        if (!selection.isCollapsed) {
            range.deleteContents();
        }
        range.insertNode(shapeContainer);
        // Move cursor after inserted shape
        range.setStartAfter(shapeContainer);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
    } else {
        // Append to canvas if no selection
        canvas.appendChild(shapeContainer);
    }
    
    updateWordCount();
    
    // Close modal
    const modal = window.specialCharModal;
    if (modal) {
        modal.remove();
        window.specialCharModal = null;
    }
}

// Select special character from modal
function selectSpecialChar(char) {
    // Close modal
    if (window.specialCharModal) {
        window.specialCharModal.remove();
        window.specialCharModal = null;
    }
    
    // Get canvas
    const canvas = document.getElementById('designCanvas') || document.getElementById('designCanvasSaved');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    // Get mouse position or center of canvas
    const canvasRect = canvas.getBoundingClientRect();
    const canvasStyles = window.getComputedStyle(canvas);
    const paddingLeft = parseFloat(canvasStyles.paddingLeft) || 0;
    const paddingTop = parseFloat(canvasStyles.paddingTop) || 0;
    
    // Calculate center position
    const centerX = (canvasRect.width - paddingLeft * 2) / 2 + paddingLeft + canvas.scrollLeft;
    const centerY = (canvasRect.height - paddingTop * 2) / 2 + paddingTop + canvas.scrollTop;
    
    // Create a text-box widget with the symbol
    if (typeof addChartToCanvas === 'function') {
        addChartToCanvas('text-box', centerX, centerY, canvas.id);
        
        // Wait for widget to be created and set the symbol
        setTimeout(() => {
            const widgets = canvas.querySelectorAll('.chart-widget[data-chart-type="text-box"]');
            if (widgets.length > 0) {
                const lastWidget = widgets[widgets.length - 1];
                const textBoxContent = lastWidget.querySelector('.text-box-content');
                if (textBoxContent) {
                    textBoxContent.textContent = char;
                    textBoxContent.focus();
                    // Move cursor to end
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(textBoxContent);
                    range.collapse(false);
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
            }
        }, 100);
    } else {
        console.error('addChartToCanvas function not found');
    }
    updateWordCount();
    
    // Close modal
    const modal = window.specialCharModal;
    if (modal) {
        modal.remove();
        window.specialCharModal = null;
    }
}

// Update word count
function updateWordCount() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    const text = canvas.innerText || canvas.textContent || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCountEl = document.getElementById('wordCount');
    if (wordCountEl) {
        wordCountEl.textContent = words.length;
    }
}

// Initialize toolbar event listeners
function initToolbar() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Update toolbar state on selection change
    canvas.addEventListener('mouseup', () => {
        updateToolbarState();
    });
    
    canvas.addEventListener('keyup', () => {
        updateWordCount();
        updateToolbarState();
    });
    
    // Update word count on input
    canvas.addEventListener('input', () => {
        updateWordCount();
    });
    
    // Keyboard shortcuts
    canvas.addEventListener('keydown', (e) => {
        // Ctrl+B for bold
        if (e.ctrlKey && e.key === 'b') {
            e.preventDefault();
            applyFormat('bold');
        }
        // Ctrl+I for italic
        if (e.ctrlKey && e.key === 'i') {
            e.preventDefault();
            applyFormat('italic');
        }
        // Ctrl+U for underline
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            applyFormat('underline');
        }
    });
}

// Clear canvas
function clearCanvas() {
    if (confirm('Are you sure you want to clear all content?')) {
        const canvas = document.getElementById('designCanvas');
        if (canvas) {
            canvas.innerHTML = '';
            chartCounter = 0;
            updateWordCount();
        }
    }
}

// ==================== CANVAS PROPERTIES ====================

let canvasZoom = 100;
let gridEnabled = false; // Grid starts disabled by default
let rulerEnabled = false;

// Change canvas background
function changeCanvasBackground(color) {
    const canvas = document.getElementById('designCanvas');
    if (canvas) {
        canvas.style.backgroundColor = color;
    }
}

// Change canvas size
function changeCanvasSize(size) {
    const canvas = document.getElementById('designCanvas');
    const container = document.getElementById('canvasContainer');
    if (!canvas || !container) return;
    
    // A4: 210mm x 297mm = 794px x 1123px @ 96 DPI
    // A3: 297mm x 420mm = 1123px x 1587px @ 96 DPI
    // A2: 420mm x 594mm = 1587px x 2245px @ 96 DPI
    // Letter: 8.5in x 11in = 816px x 1056px @ 96 DPI
    const sizes = {
        'A4': { width: '794px', height: '1123px' },
        'A3': { width: '1123px', height: '1587px' },
        'A2': { width: '1587px', height: '2245px' },
        'Letter': { width: '816px', height: '1056px' },
        'Custom': { width: '100%', height: '100%' }
    };
    
    if (size === 'Custom') {
        // Custom: Canvas tam ekranı kaplasın, boşluk kalmasın
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.minWidth = '100%';
        canvas.style.minHeight = '100%';
        canvas.style.maxWidth = 'none';
        canvas.style.maxHeight = 'none';
        canvas.style.margin = '0';
        canvas.style.marginLeft = window.rulerVisible ? '30px' : '0';
        canvas.style.marginTop = window.rulerVisible ? '30px' : '0';
        canvas.style.transform = 'none'; // Scale'i kaldır
        
        // Container'ı tam ekran yap, padding kaldır
        container.style.display = 'flex';
        container.style.justifyContent = 'stretch';
        container.style.alignItems = 'stretch';
        container.style.padding = '0';
        container.style.overflow = 'auto'; // Custom'da scroll olabilir
    } else {
        // Fixed sizes: Canvas'ı container'a sığdır, scroll olmasın
        const canvasWidth = parseInt(sizes[size].width);
        const canvasHeight = parseInt(sizes[size].height);
        
        // Container'ın overflow'unu hidden yap (scroll olmasın)
        container.style.overflow = 'hidden';
        
        // Container'ın mevcut boyutlarını al ve canvas'ı sığdır
        const updateCanvasSize = () => {
            const containerRect = container.getBoundingClientRect();
            const rulerOffset = window.rulerVisible ? 30 : 0;
            const availableWidth = containerRect.width - rulerOffset;
            const availableHeight = containerRect.height - rulerOffset;
            
            // Scale hesapla - hem width hem height'a sığmalı, küçültme yapılabilir ama büyütme yapılmasın
            const scaleX = availableWidth / canvasWidth;
            const scaleY = availableHeight / canvasHeight;
            const scale = Math.min(scaleX, scaleY, 1); // 1'den büyük olmasın (büyütme yok)
            
            // Canvas'ın gerçek boyutunu koru ama görsel olarak scale et
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            canvas.style.minWidth = canvasWidth + 'px';
            canvas.style.minHeight = canvasHeight + 'px';
            canvas.style.maxWidth = canvasWidth + 'px';
            canvas.style.maxHeight = canvasHeight + 'px';
            canvas.style.transform = `scale(${scale})`;
            canvas.style.transformOrigin = 'top left';
            
            // Container'ı flex yap ve canvas'ı ortala (az padding ile)
            container.style.display = 'flex';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
            container.style.padding = '5px'; // Çok az boşluk
            
            // Ruler varsa margin ekle
            if (window.rulerVisible) {
                canvas.style.marginLeft = '30px';
                canvas.style.marginTop = '30px';
            } else {
                canvas.style.marginLeft = '0';
                canvas.style.marginTop = '0';
            }
        };
        
        // İlk hesaplama
        setTimeout(() => {
            updateCanvasSize();
        }, 100);
        
        // Window resize'da tekrar hesapla
        if (!container._resizeHandler) {
            container._resizeHandler = updateCanvasSize;
            window.addEventListener('resize', updateCanvasSize);
        }
    }
    
    // Update ruler if visible
    if (window.rulerVisible) {
        updateRuler();
    }
    
    // Show connections by default when canvas size changes
    if (typeof showConnections === 'function') {
        setTimeout(() => {
            showConnections();
        }, 100);
    }
}

// Toggle ruler visibility
function toggleRuler() {
    window.rulerVisible = !window.rulerVisible;
    
    const rulerContainer = document.getElementById('rulerContainer');
    const verticalRuler = document.getElementById('verticalRuler');
    const canvas = document.getElementById('designCanvas');
    const rulerBtn = document.getElementById('rulerToggleBtn');
    const container = document.getElementById('canvasContainer');
    const canvasSize = document.getElementById('canvasSize');
    const currentSize = canvasSize ? canvasSize.value : 'A4';
    
    if (rulerContainer && verticalRuler && canvas) {
        if (window.rulerVisible) {
            rulerContainer.classList.remove('hidden');
            verticalRuler.classList.remove('hidden');
            rulerContainer.style.display = 'block';
            verticalRuler.style.display = 'block';
            
            // Custom'da margin ekleme, diğerlerinde ekle
            if (currentSize !== 'Custom') {
                canvas.style.marginLeft = '30px';
                canvas.style.marginTop = '30px';
            }
            
            if (rulerBtn) {
                rulerBtn.classList.add('active');
            }
            // Show corner
            const corner = document.querySelector('.ruler-corner');
            if (corner) corner.style.display = 'block';
            updateRuler();
            syncRulerWithCanvas();
        } else {
            rulerContainer.classList.add('hidden');
            verticalRuler.classList.add('hidden');
            rulerContainer.style.display = 'none';
            verticalRuler.style.display = 'none';
            canvas.style.marginLeft = '0';
            canvas.style.marginTop = '0';
            if (rulerBtn) {
                rulerBtn.classList.remove('active');
            }
            // Hide corner
            const corner = document.querySelector('.ruler-corner');
            if (corner) corner.style.display = 'none';
        }
    }
}

// Update ruler marks based on canvas size
function updateRuler() {
    const canvas = document.getElementById('designCanvas');
    const horizontalRuler = document.getElementById('horizontalRuler');
    const verticalRuler = document.getElementById('verticalRuler');
    
    if (!canvas || !horizontalRuler || !verticalRuler) return;
    
    const canvasWidth = canvas.offsetWidth || parseInt(canvas.style.width) || 794;
    const canvasHeight = canvas.offsetHeight || parseInt(canvas.style.height) || 1123;
    
    // Clear existing marks
    horizontalRuler.innerHTML = '';
    verticalRuler.innerHTML = '';
    
    // Add corner square
    const container = document.getElementById('canvasContainer');
    if (container) {
        const existingCorner = container.querySelector('.ruler-corner');
        if (existingCorner) existingCorner.remove();
        const corner = document.createElement('div');
        corner.className = 'ruler-corner';
        corner.style.cssText = 'position: fixed; top: 0; left: 0; width: 30px; height: 30px; background: #e9ecef; border-right: 1px solid #ced4da; border-bottom: 1px solid #ced4da; z-index: 31;';
        document.body.appendChild(corner);
    }
    
    // Horizontal ruler marks (every 10px, major marks every 100px)
    const hRulerWidth = container ? container.offsetWidth - 30 : canvasWidth + 100;
    for (let i = 0; i <= canvasWidth; i += 10) {
        const mark = document.createElement('div');
        const isMajor = i % 100 === 0;
        const isMedium = i % 50 === 0;
        mark.style.cssText = `
            position: absolute;
            left: ${i}px;
            top: ${isMajor ? '0' : isMedium ? '5' : '10'}px;
            width: 1px;
            height: ${isMajor ? '30' : isMedium ? '20' : '10'}px;
            background: ${isMajor ? '#495057' : isMedium ? '#6c757d' : '#adb5bd'};
            pointer-events: none;
        `;
        horizontalRuler.appendChild(mark);
        
        // Add numbers for major marks
        if (isMajor && i > 0) {
            const label = document.createElement('div');
            label.textContent = i;
            label.style.cssText = `
                position: absolute;
                left: ${i + 2}px;
                top: 2px;
                font-size: 9px;
                color: #495057;
                pointer-events: none;
                font-family: Arial, sans-serif;
            `;
            horizontalRuler.appendChild(label);
        }
    }
    
    // Vertical ruler marks (every 10px, major marks every 100px)
    const vRulerHeight = container ? container.offsetHeight - 30 : canvasHeight + 100;
    for (let i = 0; i <= canvasHeight; i += 10) {
        const mark = document.createElement('div');
        const isMajor = i % 100 === 0;
        const isMedium = i % 50 === 0;
        mark.style.cssText = `
            position: absolute;
            top: ${i}px;
            left: ${isMajor ? '0' : isMedium ? '5' : '10'}px;
            height: 1px;
            width: ${isMajor ? '30' : isMedium ? '20' : '10'}px;
            background: ${isMajor ? '#495057' : isMedium ? '#6c757d' : '#adb5bd'};
            pointer-events: none;
        `;
        verticalRuler.appendChild(mark);
        
        // Add numbers for major marks
        if (isMajor && i > 0) {
            const label = document.createElement('div');
            label.textContent = i;
            label.style.cssText = `
                position: absolute;
                top: ${i + 2}px;
                left: 2px;
                font-size: 9px;
                color: #495057;
                pointer-events: none;
                font-family: Arial, sans-serif;
                transform: rotate(-90deg);
                transform-origin: left top;
            `;
            verticalRuler.appendChild(label);
        }
    }
    
    // Update vertical ruler height
    verticalRuler.style.height = (canvasHeight + 30) + 'px';
    if (rulerContainer) {
        rulerContainer.style.width = (canvasWidth + 30) + 'px';
    }
}

// Sync ruler with canvas scroll
function syncRulerWithCanvas() {
    const container = document.getElementById('canvasContainer');
    const rulerContainer = document.getElementById('rulerContainer');
    const verticalRuler = document.getElementById('verticalRuler');
    const corner = document.querySelector('.ruler-corner');
    
    if (!container || !rulerContainer || !verticalRuler) return;
    
    // Remove existing scroll listener if any
    if (container._rulerScrollHandler) {
        container.removeEventListener('scroll', container._rulerScrollHandler);
    }
    
    // Sync horizontal and vertical ruler scroll - rulers are fixed, so we need to adjust their content position
    container._rulerScrollHandler = () => {
        // Update horizontal ruler content position
        horizontalRuler.style.transform = `translateX(-${container.scrollLeft}px)`;
        // Update vertical ruler content position
        verticalRuler.style.transform = `translateY(-${container.scrollTop}px)`;
    };
    
    container.addEventListener('scroll', container._rulerScrollHandler);
}

// Shapes and Symbols data (Shapes first, then Symbols)
const symbolsAndShapes = [
    // ========== SHAPES (First) ==========
    { id: 'shape-rectangle', name: 'Rectangle', icon: 'crop_free', type: 'shape', category: 'Basic' },
    { id: 'shape-circle', name: 'Circle', icon: 'radio_button_unchecked', type: 'shape', category: 'Basic' },
    { id: 'shape-square', name: 'Square', icon: 'crop_square', type: 'shape', category: 'Basic' },
    { id: 'shape-triangle', name: 'Triangle', icon: 'change_history', type: 'shape', category: 'Basic' },
    { id: 'shape-line', name: 'Line', icon: 'remove', type: 'shape', category: 'Basic' },
    { id: 'shape-oval', name: 'Oval', icon: 'lens', type: 'shape', category: 'Basic' },
    { id: 'shape-diamond', name: 'Diamond', icon: 'diamond', type: 'shape', category: 'Basic' },
    { id: 'shape-hexagon', name: 'Hexagon', icon: 'hexagon', type: 'shape', category: 'Basic' },
    { id: 'shape-pentagon', name: 'Pentagon', icon: 'pentagon', type: 'shape', category: 'Basic' },
    { id: 'shape-arrow-right', name: 'Arrow Right', icon: 'arrow_forward', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-left', name: 'Arrow Left', icon: 'arrow_back', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-up', name: 'Arrow Up', icon: 'arrow_upward', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-down', name: 'Arrow Down', icon: 'arrow_downward', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-up-right', name: 'Arrow Up Right', icon: 'trending_up', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-down-right', name: 'Arrow Down Right', icon: 'trending_down', type: 'shape', category: 'Arrows' },
    { id: 'shape-double-arrow', name: 'Double Arrow', icon: 'swap_horiz', type: 'shape', category: 'Arrows' },
    { id: 'shape-curved-arrow', name: 'Curved Arrow', icon: 'redo', type: 'shape', category: 'Arrows' },
    { id: 'shape-arrow-circle', name: 'Arrow Circle', icon: 'refresh', type: 'shape', category: 'Arrows' },
    { id: 'shape-star', name: 'Star', icon: 'star', type: 'shape', category: 'Decorative' },
    { id: 'shape-star-outline', name: 'Star Outline', icon: 'star_border', type: 'shape', category: 'Decorative' },
    { id: 'shape-heart', name: 'Heart', icon: 'favorite', type: 'shape', category: 'Decorative' },
    { id: 'shape-heart-outline', name: 'Heart Outline', icon: 'favorite_border', type: 'shape', category: 'Decorative' },
    { id: 'shape-badge', name: 'Badge', icon: 'workspace_premium', type: 'shape', category: 'Decorative' },
    { id: 'shape-medal', name: 'Medal', icon: 'military_tech', type: 'shape', category: 'Decorative' },
    { id: 'shape-crown', name: 'Crown', icon: 'workspace_premium', type: 'shape', category: 'Decorative' },
    { id: 'shape-flower', name: 'Flower', icon: 'local_florist', type: 'shape', category: 'Decorative' },
    { id: 'shape-cloud', name: 'Cloud', icon: 'cloud', type: 'shape', category: 'Nature' },
    { id: 'shape-sun', name: 'Sun', icon: 'wb_sunny', type: 'shape', category: 'Nature' },
    { id: 'shape-moon', name: 'Moon', icon: 'dark_mode', type: 'shape', category: 'Nature' },
    { id: 'shape-tree', name: 'Tree', icon: 'park', type: 'shape', category: 'Nature' },
    { id: 'shape-mountain', name: 'Mountain', icon: 'landscape', type: 'shape', category: 'Nature' },
    { id: 'shape-water', name: 'Water', icon: 'water_drop', type: 'shape', category: 'Nature' },
    { id: 'shape-fire', name: 'Fire', icon: 'whatshot', type: 'shape', category: 'Nature' },
    { id: 'shape-lightning', name: 'Lightning', icon: 'bolt', type: 'shape', category: 'Nature' },
    
    // ========== SYMBOLS (Second) ==========
    { id: 'symbol-check', name: 'Check', icon: 'check', type: 'symbol', category: 'Actions' },
    { id: 'symbol-check-circle', name: 'Check Circle', icon: 'check_circle', type: 'symbol', category: 'Actions' },
    { id: 'symbol-plus', name: 'Plus', icon: 'add', type: 'symbol', category: 'Actions' },
    { id: 'symbol-minus', name: 'Minus', icon: 'remove', type: 'symbol', category: 'Actions' },
    { id: 'symbol-close', name: 'Close', icon: 'close', type: 'symbol', category: 'Actions' },
    { id: 'symbol-edit', name: 'Edit', icon: 'edit', type: 'symbol', category: 'Actions' },
    { id: 'symbol-delete', name: 'Delete', icon: 'delete', type: 'symbol', category: 'Actions' },
    { id: 'symbol-save', name: 'Save', icon: 'save', type: 'symbol', category: 'Actions' },
    { id: 'symbol-download', name: 'Download', icon: 'download', type: 'symbol', category: 'Actions' },
    { id: 'symbol-upload', name: 'Upload', icon: 'upload', type: 'symbol', category: 'Actions' },
    { id: 'symbol-share', name: 'Share', icon: 'share', type: 'symbol', category: 'Actions' },
    { id: 'symbol-print', name: 'Print', icon: 'print', type: 'symbol', category: 'Actions' },
    { id: 'symbol-copy', name: 'Copy', icon: 'content_copy', type: 'symbol', category: 'Actions' },
    { id: 'symbol-cut', name: 'Cut', icon: 'content_cut', type: 'symbol', category: 'Actions' },
    { id: 'symbol-paste', name: 'Paste', icon: 'content_paste', type: 'symbol', category: 'Actions' },
    { id: 'symbol-undo', name: 'Undo', icon: 'undo', type: 'symbol', category: 'Actions' },
    { id: 'symbol-redo', name: 'Redo', icon: 'redo', type: 'symbol', category: 'Actions' },
    { id: 'symbol-refresh', name: 'Refresh', icon: 'refresh', type: 'symbol', category: 'Actions' },
    { id: 'symbol-sync', name: 'Sync', icon: 'sync', type: 'symbol', category: 'Actions' },
    { id: 'symbol-search', name: 'Search', icon: 'search', type: 'symbol', category: 'Actions' },
    { id: 'symbol-filter', name: 'Filter', icon: 'filter_list', type: 'symbol', category: 'Actions' },
    { id: 'symbol-sort', name: 'Sort', icon: 'sort', type: 'symbol', category: 'Actions' },
    { id: 'symbol-menu', name: 'Menu', icon: 'menu', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-home', name: 'Home', icon: 'home', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-back', name: 'Back', icon: 'arrow_back', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-forward', name: 'Forward', icon: 'arrow_forward', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-up', name: 'Up', icon: 'arrow_upward', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-down', name: 'Down', icon: 'arrow_downward', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-expand', name: 'Expand', icon: 'expand_more', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-collapse', name: 'Collapse', icon: 'expand_less', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-chevron-right', name: 'Chevron Right', icon: 'chevron_right', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-chevron-left', name: 'Chevron Left', icon: 'chevron_left', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-chevron-up', name: 'Chevron Up', icon: 'keyboard_arrow_up', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-chevron-down', name: 'Chevron Down', icon: 'keyboard_arrow_down', type: 'symbol', category: 'Navigation' },
    { id: 'symbol-info', name: 'Info', icon: 'info', type: 'symbol', category: 'Status' },
    { id: 'symbol-warning', name: 'Warning', icon: 'warning', type: 'symbol', category: 'Status' },
    { id: 'symbol-error', name: 'Error', icon: 'error', type: 'symbol', category: 'Status' },
    { id: 'symbol-success', name: 'Success', icon: 'check_circle', type: 'symbol', category: 'Status' },
    { id: 'symbol-help', name: 'Help', icon: 'help', type: 'symbol', category: 'Status' },
    { id: 'symbol-question', name: 'Question', icon: 'help_outline', type: 'symbol', category: 'Status' },
    { id: 'symbol-notification', name: 'Notification', icon: 'notifications', type: 'symbol', category: 'Status' },
    { id: 'symbol-alert', name: 'Alert', icon: 'notifications_active', type: 'symbol', category: 'Status' },
    { id: 'symbol-settings', name: 'Settings', icon: 'settings', type: 'symbol', category: 'Settings' },
    { id: 'symbol-preferences', name: 'Preferences', icon: 'tune', type: 'symbol', category: 'Settings' },
    { id: 'symbol-security', name: 'Security', icon: 'security', type: 'symbol', category: 'Settings' },
    { id: 'symbol-lock', name: 'Lock', icon: 'lock', type: 'symbol', category: 'Settings' },
    { id: 'symbol-unlock', name: 'Unlock', icon: 'lock_open', type: 'symbol', category: 'Settings' },
    { id: 'symbol-key', name: 'Key', icon: 'vpn_key', type: 'symbol', category: 'Settings' },
    { id: 'symbol-user', name: 'User', icon: 'person', type: 'symbol', category: 'User' },
    { id: 'symbol-users', name: 'Users', icon: 'people', type: 'symbol', category: 'User' },
    { id: 'symbol-account', name: 'Account', icon: 'account_circle', type: 'symbol', category: 'User' },
    { id: 'symbol-profile', name: 'Profile', icon: 'person_outline', type: 'symbol', category: 'User' },
    { id: 'symbol-login', name: 'Login', icon: 'login', type: 'symbol', category: 'User' },
    { id: 'symbol-logout', name: 'Logout', icon: 'logout', type: 'symbol', category: 'User' },
    { id: 'symbol-email', name: 'Email', icon: 'email', type: 'symbol', category: 'Communication' },
    { id: 'symbol-mail', name: 'Mail', icon: 'mail', type: 'symbol', category: 'Communication' },
    { id: 'symbol-message', name: 'Message', icon: 'message', type: 'symbol', category: 'Communication' },
    { id: 'symbol-chat', name: 'Chat', icon: 'chat', type: 'symbol', category: 'Communication' },
    { id: 'symbol-phone', name: 'Phone', icon: 'phone', type: 'symbol', category: 'Communication' },
    { id: 'symbol-call', name: 'Call', icon: 'call', type: 'symbol', category: 'Communication' },
    { id: 'symbol-video-call', name: 'Video Call', icon: 'videocam', type: 'symbol', category: 'Communication' },
    { id: 'symbol-calendar', name: 'Calendar', icon: 'calendar_today', type: 'symbol', category: 'Time' },
    { id: 'symbol-date', name: 'Date', icon: 'event', type: 'symbol', category: 'Time' },
    { id: 'symbol-time', name: 'Time', icon: 'access_time', type: 'symbol', category: 'Time' },
    { id: 'symbol-clock', name: 'Clock', icon: 'schedule', type: 'symbol', category: 'Time' },
    { id: 'symbol-timer', name: 'Timer', icon: 'timer', type: 'symbol', category: 'Time' },
    { id: 'symbol-stopwatch', name: 'Stopwatch', icon: 'timer_off', type: 'symbol', category: 'Time' },
    { id: 'symbol-folder', name: 'Folder', icon: 'folder', type: 'symbol', category: 'Files' },
    { id: 'symbol-file', name: 'File', icon: 'insert_drive_file', type: 'symbol', category: 'Files' },
    { id: 'symbol-document', name: 'Document', icon: 'description', type: 'symbol', category: 'Files' },
    { id: 'symbol-image', name: 'Image', icon: 'image', type: 'symbol', category: 'Files' },
    { id: 'symbol-video', name: 'Video', icon: 'videocam', type: 'symbol', category: 'Files' },
    { id: 'symbol-audio', name: 'Audio', icon: 'audiotrack', type: 'symbol', category: 'Files' },
    { id: 'symbol-music', name: 'Music', icon: 'music_note', type: 'symbol', category: 'Files' },
    { id: 'symbol-pdf', name: 'PDF', icon: 'picture_as_pdf', type: 'symbol', category: 'Files' },
    { id: 'symbol-archive', name: 'Archive', icon: 'archive', type: 'symbol', category: 'Files' },
    { id: 'symbol-favorite', name: 'Favorite', icon: 'favorite', type: 'symbol', category: 'Social' },
    { id: 'symbol-like', name: 'Like', icon: 'thumb_up', type: 'symbol', category: 'Social' },
    { id: 'symbol-dislike', name: 'Dislike', icon: 'thumb_down', type: 'symbol', category: 'Social' },
    { id: 'symbol-comment', name: 'Comment', icon: 'comment', type: 'symbol', category: 'Social' },
    { id: 'symbol-rating', name: 'Rating', icon: 'star', type: 'symbol', category: 'Social' },
    { id: 'symbol-bookmark', name: 'Bookmark', icon: 'bookmark', type: 'symbol', category: 'Social' },
    { id: 'symbol-tag', name: 'Tag', icon: 'local_offer', type: 'symbol', category: 'Social' },
    { id: 'symbol-location', name: 'Location', icon: 'location_on', type: 'symbol', category: 'Location' },
    { id: 'symbol-map', name: 'Map', icon: 'map', type: 'symbol', category: 'Location' },
    { id: 'symbol-navigation', name: 'Navigation', icon: 'navigation', type: 'symbol', category: 'Location' },
    { id: 'symbol-place', name: 'Place', icon: 'place', type: 'symbol', category: 'Location' },
    { id: 'symbol-pin', name: 'Pin', icon: 'push_pin', type: 'symbol', category: 'Location' },
    { id: 'symbol-store', name: 'Store', icon: 'store', type: 'symbol', category: 'Business' },
    { id: 'symbol-shopping', name: 'Shopping', icon: 'shopping_cart', type: 'symbol', category: 'Business' },
    { id: 'symbol-payment', name: 'Payment', icon: 'payment', type: 'symbol', category: 'Business' },
    { id: 'symbol-card', name: 'Card', icon: 'credit_card', type: 'symbol', category: 'Business' },
    { id: 'symbol-money', name: 'Money', icon: 'attach_money', type: 'symbol', category: 'Business' },
    { id: 'symbol-wallet', name: 'Wallet', icon: 'account_balance_wallet', type: 'symbol', category: 'Business' },
    { id: 'symbol-chart', name: 'Chart', icon: 'bar_chart', type: 'symbol', category: 'Business' },
    { id: 'symbol-graph', name: 'Graph', icon: 'show_chart', type: 'symbol', category: 'Business' },
    { id: 'symbol-trending', name: 'Trending', icon: 'trending_up', type: 'symbol', category: 'Business' },
    { id: 'symbol-analytics', name: 'Analytics', icon: 'analytics', type: 'symbol', category: 'Business' },
    { id: 'symbol-dashboard', name: 'Dashboard', icon: 'dashboard', type: 'symbol', category: 'Business' },
    { id: 'symbol-work', name: 'Work', icon: 'work', type: 'symbol', category: 'Business' },
    { id: 'symbol-business', name: 'Business', icon: 'business', type: 'symbol', category: 'Business' },
    { id: 'symbol-school', name: 'School', icon: 'school', type: 'symbol', category: 'Education' },
    { id: 'symbol-book', name: 'Book', icon: 'book', type: 'symbol', category: 'Education' },
    { id: 'symbol-library', name: 'Library', icon: 'local_library', type: 'symbol', category: 'Education' },
    { id: 'symbol-learning', name: 'Learning', icon: 'menu_book', type: 'symbol', category: 'Education' },
    { id: 'symbol-health', name: 'Health', icon: 'favorite', type: 'symbol', category: 'Health' },
    { id: 'symbol-medical', name: 'Medical', icon: 'medical_services', type: 'symbol', category: 'Health' },
    { id: 'symbol-hospital', name: 'Hospital', icon: 'local_hospital', type: 'symbol', category: 'Health' },
    { id: 'symbol-fitness', name: 'Fitness', icon: 'fitness_center', type: 'symbol', category: 'Health' },
    { id: 'symbol-sports', name: 'Sports', icon: 'sports_soccer', type: 'symbol', category: 'Sports' },
    { id: 'symbol-game', name: 'Game', icon: 'sports_esports', type: 'symbol', category: 'Sports' },
    { id: 'symbol-food', name: 'Food', icon: 'restaurant', type: 'symbol', category: 'Food' },
    { id: 'symbol-coffee', name: 'Coffee', icon: 'local_cafe', type: 'symbol', category: 'Food' },
    { id: 'symbol-car', name: 'Car', icon: 'directions_car', type: 'symbol', category: 'Transport' },
    { id: 'symbol-train', name: 'Train', icon: 'train', type: 'symbol', category: 'Transport' },
    { id: 'symbol-plane', name: 'Plane', icon: 'flight', type: 'symbol', category: 'Transport' },
    { id: 'symbol-bike', name: 'Bike', icon: 'directions_bike', type: 'symbol', category: 'Transport' },
    { id: 'symbol-wifi', name: 'WiFi', icon: 'wifi', type: 'symbol', category: 'Technology' },
    { id: 'symbol-bluetooth', name: 'Bluetooth', icon: 'bluetooth', type: 'symbol', category: 'Technology' },
    { id: 'symbol-battery', name: 'Battery', icon: 'battery_full', type: 'symbol', category: 'Technology' },
    { id: 'symbol-power', name: 'Power', icon: 'power', type: 'symbol', category: 'Technology' },
    { id: 'symbol-computer', name: 'Computer', icon: 'computer', type: 'symbol', category: 'Technology' },
    { id: 'symbol-phone-mobile', name: 'Phone Mobile', icon: 'phone_android', type: 'symbol', category: 'Technology' },
    { id: 'symbol-tablet', name: 'Tablet', icon: 'tablet', type: 'symbol', category: 'Technology' },
    { id: 'symbol-camera', name: 'Camera', icon: 'camera_alt', type: 'symbol', category: 'Technology' },
    { id: 'symbol-mic', name: 'Microphone', icon: 'mic', type: 'symbol', category: 'Technology' },
    { id: 'symbol-headphones', name: 'Headphones', icon: 'headphones', type: 'symbol', category: 'Technology' },
    { id: 'symbol-tv', name: 'TV', icon: 'tv', type: 'symbol', category: 'Technology' },
    { id: 'symbol-lightbulb', name: 'Lightbulb', icon: 'lightbulb', type: 'symbol', category: 'Objects' },
    { id: 'symbol-lamp', name: 'Lamp', icon: 'light_mode', type: 'symbol', category: 'Objects' },
    { id: 'symbol-gift', name: 'Gift', icon: 'card_giftcard', type: 'symbol', category: 'Objects' },
    { id: 'symbol-box', name: 'Box', icon: 'inventory_2', type: 'symbol', category: 'Objects' },
    { id: 'symbol-package', name: 'Package', icon: 'inventory', type: 'symbol', category: 'Objects' },
    { id: 'symbol-flag', name: 'Flag', icon: 'flag', type: 'symbol', category: 'Objects' },
    { id: 'symbol-trophy', name: 'Trophy', icon: 'emoji_events', type: 'symbol', category: 'Objects' },
    { id: 'symbol-award', name: 'Award', icon: 'military_tech', type: 'symbol', category: 'Objects' },
    
    // ========== FINANCE & ANALYSIS SYMBOLS ==========
    { id: 'symbol-dollar', name: 'Dollar', icon: 'attach_money', type: 'symbol', category: 'Finance' },
    { id: 'symbol-euro', name: 'Euro', icon: 'euro', type: 'symbol', category: 'Finance' },
    { id: 'symbol-pound', name: 'Pound', icon: 'currency_pound', type: 'symbol', category: 'Finance' },
    { id: 'symbol-yen', name: 'Yen', icon: 'currency_yen', type: 'symbol', category: 'Finance' },
    { id: 'symbol-rupee', name: 'Rupee', icon: 'currency_rupee', type: 'symbol', category: 'Finance' },
    { id: 'symbol-bitcoin', name: 'Bitcoin', icon: 'currency_bitcoin', type: 'symbol', category: 'Finance' },
    { id: 'symbol-exchange', name: 'Exchange', icon: 'swap_horiz', type: 'symbol', category: 'Finance' },
    { id: 'symbol-transfer', name: 'Transfer', icon: 'swap_vert', type: 'symbol', category: 'Finance' },
    { id: 'symbol-receipt', name: 'Receipt', icon: 'receipt', type: 'symbol', category: 'Finance' },
    { id: 'symbol-invoice', name: 'Invoice', icon: 'receipt_long', type: 'symbol', category: 'Finance' },
    { id: 'symbol-calculator', name: 'Calculator', icon: 'calculate', type: 'symbol', category: 'Finance' },
    { id: 'symbol-percent', name: 'Percent', icon: 'percent', type: 'symbol', category: 'Finance' },
    { id: 'symbol-trending-up', name: 'Trending Up', icon: 'trending_up', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-trending-down', name: 'Trending Down', icon: 'trending_down', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-trending-flat', name: 'Trending Flat', icon: 'trending_flat', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-line-chart', name: 'Line Chart', icon: 'show_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-bar-chart', name: 'Bar Chart', icon: 'bar_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-pie-chart', name: 'Pie Chart', icon: 'pie_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-area-chart', name: 'Area Chart', icon: 'area_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-candlestick', name: 'Candlestick', icon: 'candlestick_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-scatter', name: 'Scatter Plot', icon: 'scatter_plot', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-bubble', name: 'Bubble Chart', icon: 'bubble_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-radar', name: 'Radar Chart', icon: 'radar', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-gauge', name: 'Gauge', icon: 'gauge', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-speed', name: 'Speed', icon: 'speed', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-insights', name: 'Insights', icon: 'insights', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-data', name: 'Data', icon: 'data_object', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-dataset', name: 'Dataset', icon: 'dataset', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-table', name: 'Table', icon: 'table_chart', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-table-view', name: 'Table View', icon: 'table_view', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-grid', name: 'Grid', icon: 'grid_on', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-list', name: 'List', icon: 'list', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-view-list', name: 'View List', icon: 'view_list', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-view-module', name: 'View Module', icon: 'view_module', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-view-quilt', name: 'View Quilt', icon: 'view_quilt', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-compare', name: 'Compare', icon: 'compare_arrows', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-compare-data', name: 'Compare Data', icon: 'compare', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-difference', name: 'Difference', icon: 'difference', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-summarize', name: 'Summarize', icon: 'summarize', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-functions', name: 'Functions', icon: 'functions', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-formula', name: 'Formula', icon: 'formula', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-calculate', name: 'Calculate', icon: 'calculate', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-statistics', name: 'Statistics', icon: 'query_stats', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-stats', name: 'Stats', icon: 'bar_chart_4_bars', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-kpi', name: 'KPI', icon: 'monitoring', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-target', name: 'Target', icon: 'track_changes', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-goal', name: 'Goal', icon: 'flag', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-objective', name: 'Objective', icon: 'gps_fixed', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-growth', name: 'Growth', icon: 'trending_up', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-decline', name: 'Decline', icon: 'trending_down', type: 'symbol', category: 'Analysis' },
    { id: 'symbol-profit', name: 'Profit', icon: 'savings', type: 'symbol', category: 'Finance' },
    { id: 'symbol-loss', name: 'Loss', icon: 'money_off', type: 'symbol', category: 'Finance' },
    { id: 'symbol-revenue', name: 'Revenue', icon: 'payments', type: 'symbol', category: 'Finance' },
    { id: 'symbol-expense', name: 'Expense', icon: 'account_balance', type: 'symbol', category: 'Finance' },
    { id: 'symbol-budget', name: 'Budget', icon: 'account_balance_wallet', type: 'symbol', category: 'Finance' },
    { id: 'symbol-investment', name: 'Investment', icon: 'savings', type: 'symbol', category: 'Finance' },
    { id: 'symbol-stocks', name: 'Stocks', icon: 'show_chart', type: 'symbol', category: 'Finance' },
    { id: 'symbol-bonds', name: 'Bonds', icon: 'account_tree', type: 'symbol', category: 'Finance' },
    { id: 'symbol-assets', name: 'Assets', icon: 'inventory', type: 'symbol', category: 'Finance' },
    { id: 'symbol-liabilities', name: 'Liabilities', icon: 'account_balance', type: 'symbol', category: 'Finance' },
    { id: 'symbol-equity', name: 'Equity', icon: 'balance', type: 'symbol', category: 'Finance' },
    { id: 'symbol-balance', name: 'Balance', icon: 'account_balance', type: 'symbol', category: 'Finance' },
    { id: 'symbol-accounting', name: 'Accounting', icon: 'receipt_long', type: 'symbol', category: 'Finance' },
    { id: 'symbol-tax', name: 'Tax', icon: 'receipt', type: 'symbol', category: 'Finance' },
    { id: 'symbol-bank', name: 'Bank', icon: 'account_balance', type: 'symbol', category: 'Finance' },
    { id: 'symbol-atm', name: 'ATM', icon: 'atm', type: 'symbol', category: 'Finance' },
    { id: 'symbol-cash', name: 'Cash', icon: 'payments', type: 'symbol', category: 'Finance' },
    { id: 'symbol-coins', name: 'Coins', icon: 'monetization_on', type: 'symbol', category: 'Finance' },
    { id: 'symbol-bill', name: 'Bill', icon: 'receipt', type: 'symbol', category: 'Finance' },
    { id: 'symbol-purchase', name: 'Purchase', icon: 'shopping_bag', type: 'symbol', category: 'Finance' },
    { id: 'symbol-sale', name: 'Sale', icon: 'point_of_sale', type: 'symbol', category: 'Finance' },
    { id: 'symbol-discount', name: 'Discount', icon: 'local_offer', type: 'symbol', category: 'Finance' },
    { id: 'symbol-coupon', name: 'Coupon', icon: 'confirmation_number', type: 'symbol', category: 'Finance' },
    { id: 'symbol-gift-card', name: 'Gift Card', icon: 'card_giftcard', type: 'symbol', category: 'Finance' },
    { id: 'symbol-loyalty', name: 'Loyalty', icon: 'loyalty', type: 'symbol', category: 'Finance' },
    { id: 'symbol-rewards', name: 'Rewards', icon: 'card_membership', type: 'symbol', category: 'Finance' },
    { id: 'symbol-subscription', name: 'Subscription', icon: 'subscriptions', type: 'symbol', category: 'Finance' },
    { id: 'symbol-recurring', name: 'Recurring', icon: 'repeat', type: 'symbol', category: 'Finance' },
    { id: 'symbol-auto-renew', name: 'Auto Renew', icon: 'autorenew', type: 'symbol', category: 'Finance' },
    { id: 'symbol-refund', name: 'Refund', icon: 'assignment_return', type: 'symbol', category: 'Finance' },
    { id: 'symbol-return', name: 'Return', icon: 'keyboard_return', type: 'symbol', category: 'Finance' },
    { id: 'symbol-cancel', name: 'Cancel', icon: 'cancel', type: 'symbol', category: 'Finance' },
    { id: 'symbol-approved', name: 'Approved', icon: 'verified', type: 'symbol', category: 'Finance' },
    { id: 'symbol-pending', name: 'Pending', icon: 'pending', type: 'symbol', category: 'Finance' },
    { id: 'symbol-processing', name: 'Processing', icon: 'sync', type: 'symbol', category: 'Finance' },
    { id: 'symbol-completed', name: 'Completed', icon: 'check_circle', type: 'symbol', category: 'Finance' },
    { id: 'symbol-failed', name: 'Failed', icon: 'error', type: 'symbol', category: 'Finance' },
    
    // ========== BUSINESS SYMBOLS ==========
    { id: 'symbol-office', name: 'Office', icon: 'business_center', type: 'symbol', category: 'Business' },
    { id: 'symbol-meeting', name: 'Meeting', icon: 'groups', type: 'symbol', category: 'Business' },
    { id: 'symbol-briefcase', name: 'Briefcase', icon: 'work_outline', type: 'symbol', category: 'Business' },
    { id: 'symbol-handshake', name: 'Handshake', icon: 'handshake', type: 'symbol', category: 'Business' },
    { id: 'symbol-partnership', name: 'Partnership', icon: 'handshake', type: 'symbol', category: 'Business' },
    { id: 'symbol-contract', name: 'Contract', icon: 'description', type: 'symbol', category: 'Business' },
    { id: 'symbol-deal', name: 'Deal', icon: 'gavel', type: 'symbol', category: 'Business' },
    { id: 'symbol-negotiation', name: 'Negotiation', icon: 'forum', type: 'symbol', category: 'Business' },
    { id: 'symbol-client', name: 'Client', icon: 'person', type: 'symbol', category: 'Business' },
    { id: 'symbol-customer', name: 'Customer', icon: 'people', type: 'symbol', category: 'Business' },
    { id: 'symbol-supplier', name: 'Supplier', icon: 'local_shipping', type: 'symbol', category: 'Business' },
    { id: 'symbol-vendor', name: 'Vendor', icon: 'storefront', type: 'symbol', category: 'Business' },
    { id: 'symbol-inventory', name: 'Inventory', icon: 'inventory_2', type: 'symbol', category: 'Business' },
    { id: 'symbol-warehouse', name: 'Warehouse', icon: 'warehouse', type: 'symbol', category: 'Business' },
    { id: 'symbol-logistics', name: 'Logistics', icon: 'local_shipping', type: 'symbol', category: 'Business' },
    { id: 'symbol-shipping', name: 'Shipping', icon: 'flight_takeoff', type: 'symbol', category: 'Business' },
    { id: 'symbol-delivery', name: 'Delivery', icon: 'delivery_dining', type: 'symbol', category: 'Business' },
    { id: 'symbol-order', name: 'Order', icon: 'shopping_cart', type: 'symbol', category: 'Business' },
    { id: 'symbol-fulfillment', name: 'Fulfillment', icon: 'check_circle', type: 'symbol', category: 'Business' },
    { id: 'symbol-quality', name: 'Quality', icon: 'verified', type: 'symbol', category: 'Business' },
    { id: 'symbol-certification', name: 'Certification', icon: 'verified_user', type: 'symbol', category: 'Business' },
    { id: 'symbol-compliance', name: 'Compliance', icon: 'rule', type: 'symbol', category: 'Business' },
    { id: 'symbol-audit', name: 'Audit', icon: 'find_in_page', type: 'symbol', category: 'Business' },
    { id: 'symbol-risk', name: 'Risk', icon: 'warning', type: 'symbol', category: 'Business' },
    { id: 'symbol-security', name: 'Security', icon: 'security', type: 'symbol', category: 'Business' },
    { id: 'symbol-compliance-check', name: 'Compliance Check', icon: 'rule_folder', type: 'symbol', category: 'Business' },
    { id: 'symbol-governance', name: 'Governance', icon: 'admin_panel_settings', type: 'symbol', category: 'Business' },
    { id: 'symbol-strategy', name: 'Strategy', icon: 'track_changes', type: 'symbol', category: 'Business' },
    { id: 'symbol-planning', name: 'Planning', icon: 'event_note', type: 'symbol', category: 'Business' },
    { id: 'symbol-roadmap', name: 'Roadmap', icon: 'map', type: 'symbol', category: 'Business' },
    { id: 'symbol-milestone', name: 'Milestone', icon: 'flag', type: 'symbol', category: 'Business' },
    { id: 'symbol-deadline', name: 'Deadline', icon: 'schedule', type: 'symbol', category: 'Business' },
    { id: 'symbol-project', name: 'Project', icon: 'folder', type: 'symbol', category: 'Business' },
    { id: 'symbol-task', name: 'Task', icon: 'task', type: 'symbol', category: 'Business' },
    { id: 'symbol-team', name: 'Team', icon: 'groups', type: 'symbol', category: 'Business' },
    { id: 'symbol-collaboration', name: 'Collaboration', icon: 'group_work', type: 'symbol', category: 'Business' },
    { id: 'symbol-productivity', name: 'Productivity', icon: 'speed', type: 'symbol', category: 'Business' },
    { id: 'symbol-efficiency', name: 'Efficiency', icon: 'trending_up', type: 'symbol', category: 'Business' },
    { id: 'symbol-performance', name: 'Performance', icon: 'speed', type: 'symbol', category: 'Business' },
    { id: 'symbol-kpi-dashboard', name: 'KPI Dashboard', icon: 'dashboard', type: 'symbol', category: 'Business' },
    { id: 'symbol-reporting', name: 'Reporting', icon: 'assessment', type: 'symbol', category: 'Business' },
    { id: 'symbol-insight', name: 'Insight', icon: 'lightbulb', type: 'symbol', category: 'Business' },
    { id: 'symbol-innovation', name: 'Innovation', icon: 'lightbulb_outline', type: 'symbol', category: 'Business' },
    { id: 'symbol-growth', name: 'Growth', icon: 'trending_up', type: 'symbol', category: 'Business' },
    { id: 'symbol-expansion', name: 'Expansion', icon: 'open_in_full', type: 'symbol', category: 'Business' },
    { id: 'symbol-market', name: 'Market', icon: 'store', type: 'symbol', category: 'Business' },
    { id: 'symbol-competition', name: 'Competition', icon: 'emoji_events', type: 'symbol', category: 'Business' },
    { id: 'symbol-market-share', name: 'Market Share', icon: 'pie_chart', type: 'symbol', category: 'Business' },
    { id: 'symbol-brand', name: 'Brand', icon: 'label', type: 'symbol', category: 'Business' },
    { id: 'symbol-marketing', name: 'Marketing', icon: 'campaign', type: 'symbol', category: 'Business' },
    { id: 'symbol-advertising', name: 'Advertising', icon: 'ads_click', type: 'symbol', category: 'Business' },
    { id: 'symbol-promotion', name: 'Promotion', icon: 'local_offer', type: 'symbol', category: 'Business' },
    { id: 'symbol-sales', name: 'Sales', icon: 'point_of_sale', type: 'symbol', category: 'Business' },
    { id: 'symbol-revenue-growth', name: 'Revenue Growth', icon: 'trending_up', type: 'symbol', category: 'Business' },
    { id: 'symbol-profit-margin', name: 'Profit Margin', icon: 'percent', type: 'symbol', category: 'Business' },
    { id: 'symbol-cost', name: 'Cost', icon: 'account_balance_wallet', type: 'symbol', category: 'Business' },
    { id: 'symbol-budget-planning', name: 'Budget Planning', icon: 'account_balance', type: 'symbol', category: 'Business' },
    { id: 'symbol-investment', name: 'Investment', icon: 'savings', type: 'symbol', category: 'Business' },
    { id: 'symbol-roi', name: 'ROI', icon: 'calculate', type: 'symbol', category: 'Business' },
    { id: 'symbol-merger', name: 'Merger', icon: 'merge', type: 'symbol', category: 'Business' },
    { id: 'symbol-acquisition', name: 'Acquisition', icon: 'corporate_fare', type: 'symbol', category: 'Business' },
    
    // ========== INTERACTIONS SYMBOLS ==========
    { id: 'symbol-click', name: 'Click', icon: 'touch_app', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-tap', name: 'Tap', icon: 'pan_tool', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-drag', name: 'Drag', icon: 'open_with', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-drop', name: 'Drop', icon: 'move_down', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-swipe', name: 'Swipe', icon: 'swipe', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-scroll', name: 'Scroll', icon: 'swap_vert', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-zoom-in', name: 'Zoom In', icon: 'zoom_in', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-zoom-out', name: 'Zoom Out', icon: 'zoom_out', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-pan', name: 'Pan', icon: 'pan_tool', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-select', name: 'Select', icon: 'check_circle', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-multi-select', name: 'Multi Select', icon: 'checklist', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-filter', name: 'Filter', icon: 'filter_list', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-sort', name: 'Sort', icon: 'sort', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-search', name: 'Search', icon: 'search', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-refresh', name: 'Refresh', icon: 'refresh', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-reload', name: 'Reload', icon: 'replay', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-reset', name: 'Reset', icon: 'restart_alt', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-clear', name: 'Clear', icon: 'clear_all', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-undo', name: 'Undo', icon: 'undo', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-redo', name: 'Redo', icon: 'redo', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-copy', name: 'Copy', icon: 'content_copy', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-paste', name: 'Paste', icon: 'content_paste', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-cut', name: 'Cut', icon: 'content_cut', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-duplicate', name: 'Duplicate', icon: 'file_copy', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-move', name: 'Move', icon: 'open_with', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-rotate', name: 'Rotate', icon: 'rotate_right', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-flip', name: 'Flip', icon: 'flip', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-resize', name: 'Resize', icon: 'aspect_ratio', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-expand', name: 'Expand', icon: 'expand_more', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-collapse', name: 'Collapse', icon: 'expand_less', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-toggle', name: 'Toggle', icon: 'toggle_on', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-switch', name: 'Switch', icon: 'swap_horiz', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-play', name: 'Play', icon: 'play_arrow', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-pause', name: 'Pause', icon: 'pause', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-stop', name: 'Stop', icon: 'stop', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-next', name: 'Next', icon: 'skip_next', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-previous', name: 'Previous', icon: 'skip_previous', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-fast-forward', name: 'Fast Forward', icon: 'fast_forward', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-rewind', name: 'Rewind', icon: 'fast_rewind', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-fullscreen', name: 'Fullscreen', icon: 'fullscreen', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-exit-fullscreen', name: 'Exit Fullscreen', icon: 'fullscreen_exit', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-minimize', name: 'Minimize', icon: 'minimize', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-maximize', name: 'Maximize', icon: 'open_in_full', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-close', name: 'Close', icon: 'close', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-back', name: 'Back', icon: 'arrow_back', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-forward', name: 'Forward', icon: 'arrow_forward', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-up', name: 'Up', icon: 'arrow_upward', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-down', name: 'Down', icon: 'arrow_downward', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-left', name: 'Left', icon: 'arrow_back_ios', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-right', name: 'Right', icon: 'arrow_forward_ios', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-menu', name: 'Menu', icon: 'menu', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-more', name: 'More', icon: 'more_vert', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-more-horizontal', name: 'More Horizontal', icon: 'more_horiz', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-settings', name: 'Settings', icon: 'settings', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-options', name: 'Options', icon: 'tune', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-preferences', name: 'Preferences', icon: 'settings_applications', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-edit', name: 'Edit', icon: 'edit', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-delete', name: 'Delete', icon: 'delete', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-add', name: 'Add', icon: 'add', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-remove', name: 'Remove', icon: 'remove', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-check', name: 'Check', icon: 'check', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-cancel', name: 'Cancel', icon: 'cancel', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-confirm', name: 'Confirm', icon: 'check_circle', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-save', name: 'Save', icon: 'save', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-download', name: 'Download', icon: 'download', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-upload', name: 'Upload', icon: 'upload', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-share', name: 'Share', icon: 'share', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-export', name: 'Export', icon: 'file_download', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-import', name: 'Import', icon: 'file_upload', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-print', name: 'Print', icon: 'print', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-email', name: 'Email', icon: 'email', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-send', name: 'Send', icon: 'send', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-reply', name: 'Reply', icon: 'reply', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-forward-email', name: 'Forward Email', icon: 'forward', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-attach', name: 'Attach', icon: 'attach_file', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-link', name: 'Link', icon: 'link', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-unlink', name: 'Unlink', icon: 'link_off', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-bookmark', name: 'Bookmark', icon: 'bookmark', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-favorite', name: 'Favorite', icon: 'favorite', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-like', name: 'Like', icon: 'thumb_up', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-dislike', name: 'Dislike', icon: 'thumb_down', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-comment', name: 'Comment', icon: 'comment', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-rate', name: 'Rate', icon: 'star', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-notification', name: 'Notification', icon: 'notifications', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-alert', name: 'Alert', icon: 'notifications_active', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-bell', name: 'Bell', icon: 'notifications', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-help', name: 'Help', icon: 'help', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-info', name: 'Info', icon: 'info', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-warning', name: 'Warning', icon: 'warning', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-error', name: 'Error', icon: 'error', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-success', name: 'Success', icon: 'check_circle', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-loading', name: 'Loading', icon: 'hourglass_empty', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-waiting', name: 'Waiting', icon: 'schedule', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-processing', name: 'Processing', icon: 'sync', type: 'symbol', category: 'Interactions' },
    { id: 'symbol-complete', name: 'Complete', icon: 'done_all', type: 'symbol', category: 'Interactions' },
];

// Render Symbols & Shapes panel (for sidebar)
function renderSymbolsShapes(panelId = 'symbolsShapesList', filterText = '') {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    panel.innerHTML = '';
    
    // Filter items based on search text
    const filteredItems = filterText 
        ? symbolsAndShapes.filter(item => 
            item.name.toLowerCase().includes(filterText.toLowerCase()) ||
            (item.category && item.category.toLowerCase().includes(filterText.toLowerCase()))
          )
        : symbolsAndShapes;
    
    // Sort: Shapes first, then Symbols
    const sortedItems = filteredItems.sort((a, b) => {
        if (a.type === 'shape' && b.type === 'symbol') return -1;
        if (a.type === 'symbol' && b.type === 'shape') return 1;
        return 0;
    });
    
    sortedItems.forEach(item => {
        const symbolBtn = document.createElement('div');
        // Use same styling as chart tools - same size and appearance
        symbolBtn.className = 'symbol-shape-btn cursor-move border border-border-light rounded hover:bg-gray-100 transition-colors flex items-center justify-center relative group';
        symbolBtn.style.cssText = 'min-height: 60px; width: 100%; overflow: hidden; padding: 8px;';
        symbolBtn.draggable = true;
        symbolBtn.dataset.symbolId = item.id;
        symbolBtn.dataset.symbolName = item.name;
        symbolBtn.dataset.symbolType = item.type;
        // title attribute kaldırıldı - sadece custom tooltip gösterilecek
        
        symbolBtn.innerHTML = `
            <span class="material-symbols-outlined text-4xl flex-shrink-0 text-text-default" style="font-size: 2.25rem; line-height: 1;">${item.icon}</span>
            <div class="symbol-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                ${item.name}
            </div>
        `;
        
        // Drag start
        symbolBtn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('symbolId', item.id);
            e.dataTransfer.setData('symbolName', item.name);
            e.dataTransfer.setData('symbolType', item.type);
            e.dataTransfer.effectAllowed = 'copy';
            symbolBtn.style.opacity = '0.5';
        });
        
        // Drag end
        symbolBtn.addEventListener('dragend', () => {
            symbolBtn.style.opacity = '1';
        });
        
        panel.appendChild(symbolBtn);
    });
}

// Render Symbols & Shapes for toolbar (chart tools style - same size and appearance)
function renderToolbarSymbolsShapes(panelId = 'toolbarSymbolsShapesList') {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    panel.innerHTML = '';
    
    // Render symbols and shapes with same style as chart tools
    symbolsAndShapes.forEach(item => {
        const symbolBtn = document.createElement('button');
        symbolBtn.className = 'toolbar-symbol-shape-btn cursor-move border border-border-light rounded hover:bg-gray-100 transition-colors flex items-center justify-center relative group';
        symbolBtn.style.cssText = 'min-height: 60px; min-width: 40px; padding: 8px;';
        symbolBtn.draggable = true;
        symbolBtn.dataset.symbolId = item.id;
        symbolBtn.dataset.symbolName = item.name;
        symbolBtn.dataset.symbolType = item.type;
        symbolBtn.title = item.name;
        
        symbolBtn.innerHTML = `
            <span class="material-symbols-outlined text-text-default" style="font-size: 2.25rem; line-height: 1;">${item.icon}</span>
            <div class="symbol-tooltip absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                ${item.name}
            </div>
        `;
        
        // Click handler - add to canvas at cursor position
        symbolBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const canvasId = panelId.includes('Saved') ? 'designCanvasSaved' : 'designCanvas';
            const canvas = document.getElementById(canvasId);
            if (canvas) {
                const rect = canvas.getBoundingClientRect();
                const x = rect.width / 2 - 24; // Center horizontally
                const y = rect.height / 2 - 24; // Center vertically
                addSymbolToCanvas(item.id, x, y, canvas.id);
            }
        });
        
        // Drag start
        symbolBtn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('symbolId', item.id);
            e.dataTransfer.setData('symbolName', item.name);
            e.dataTransfer.setData('symbolType', item.type);
            e.dataTransfer.effectAllowed = 'copy';
            symbolBtn.style.opacity = '0.5';
        });
        
        // Drag end
        symbolBtn.addEventListener('dragend', () => {
            symbolBtn.style.opacity = '1';
        });
        
        panel.appendChild(symbolBtn);
    });
}

// Expand Symbols & Shapes Panel
function expandSymbolsShapesPanel(suffix = '') {
    const panelId = suffix ? `toolbarSymbolsShapesList${suffix}` : 'toolbarSymbolsShapesList';
    const panel = document.getElementById(panelId);
    const expandBtn = document.getElementById(suffix ? `expandSymbolsBtn${suffix}` : 'expandSymbolsBtn');
    const collapseBtn = document.getElementById(suffix ? `collapseSymbolsBtn${suffix}` : 'collapseSymbolsBtn');
    
    if (panel) {
        // Expand to 3 rows (60px * 3 = 180px)
        panel.style.maxHeight = '180px';
        if (expandBtn) expandBtn.classList.add('hidden');
        if (collapseBtn) collapseBtn.classList.remove('hidden');
    }
}

// Collapse Symbols & Shapes Panel
function collapseSymbolsShapesPanel(suffix = '') {
    const panelId = suffix ? `toolbarSymbolsShapesList${suffix}` : 'toolbarSymbolsShapesList';
    const panel = document.getElementById(panelId);
    const expandBtn = document.getElementById(suffix ? `expandSymbolsBtn${suffix}` : 'expandSymbolsBtn');
    const collapseBtn = document.getElementById(suffix ? `collapseSymbolsBtn${suffix}` : 'collapseSymbolsBtn');
    
    if (panel) {
        // Collapse to 1 row (60px)
        panel.style.maxHeight = '60px';
        if (expandBtn) expandBtn.classList.remove('hidden');
        if (collapseBtn) collapseBtn.classList.add('hidden');
    }
}

// Add symbol/shape to canvas
function addSymbolToCanvas(symbolId, x, y, canvasId = null) {
    const symbol = symbolsAndShapes.find(s => s.id === symbolId);
    if (!symbol) return;
    
    const canvas = canvasId ? document.getElementById(canvasId) : document.getElementById('designCanvas');
    if (!canvas) return;
    
    const symbolElement = document.createElement('div');
    symbolElement.className = 'symbol-widget absolute cursor-move';
    symbolElement.style.left = x + 'px';
    symbolElement.style.top = y + 'px';
    symbolElement.dataset.symbolId = symbolId;
    symbolElement.dataset.symbolType = symbol.type;
    symbolElement.dataset.size = '48'; // Default size (text-4xl = 48px)
    
    const iconSize = parseInt(symbolElement.dataset.size) || 48;
    
    symbolElement.innerHTML = `
        <span class="symbol-icon material-symbols-outlined text-text-default" style="font-size: ${iconSize}px;">${symbol.icon}</span>
        <div class="symbol-resize-controls absolute bg-white border border-gray-300 rounded-lg shadow-lg hidden flex-col gap-1" style="z-index: 100; width: 32px; padding: 2px; top: 0; right: -36px;">
            <button class="symbol-resize-plus p-1 hover:bg-gray-100 rounded flex items-center justify-center" onclick="event.stopPropagation(); resizeSymbol(this.closest('.symbol-widget'), 4)" title="Increase Size" style="min-height: 14px;">
                <span class="material-symbols-outlined" style="font-size: 16px; line-height: 1;">add</span>
            </button>
            <button class="symbol-resize-minus p-1 hover:bg-gray-100 rounded flex items-center justify-center" onclick="event.stopPropagation(); resizeSymbol(this.closest('.symbol-widget'), -4)" title="Decrease Size" style="min-height: 14px;">
                <span class="material-symbols-outlined" style="font-size: 16px; line-height: 1;">remove</span>
            </button>
        </div>
    `;
    
    // Make draggable
    makeElementDraggable(symbolElement, canvas);
    
    // Show/hide resize controls on click
    symbolElement.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent rectangle selection
        const controls = symbolElement.querySelector('.symbol-resize-controls');
        if (controls) {
            // Hide all other resize controls
            canvas.querySelectorAll('.symbol-resize-controls').forEach(ctrl => {
                if (ctrl !== controls) ctrl.classList.add('hidden');
            });
            controls.classList.toggle('hidden');
        }
    });
    
    canvas.appendChild(symbolElement);
}

// Hide all resize controls when ESC is pressed
function hideAllResizeControls() {
    const canvases = [document.getElementById('designCanvas'), document.getElementById('designCanvasSaved')];
    canvases.forEach(canvas => {
        if (canvas) {
            canvas.querySelectorAll('.symbol-resize-controls').forEach(ctrl => {
                ctrl.classList.add('hidden');
            });
        }
    });
}

// Add ESC key listener to hide resize controls
if (typeof window !== 'undefined') {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            hideAllResizeControls();
        }
    });
}

// Resize symbol/shape
function resizeSymbol(element, delta) {
    if (!element) return;
    
    const currentSize = parseInt(element.dataset.size) || 48;
    const newSize = Math.max(16, Math.min(128, currentSize + delta)); // Min 16px, Max 128px
    element.dataset.size = newSize.toString();
    
    const icon = element.querySelector('.symbol-icon');
    if (icon) {
        icon.style.fontSize = newSize + 'px';
    }
}

// Make element draggable
function makeElementDraggable(element, container) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
    
    element.addEventListener('mousedown', (e) => {
        // Don't start drag if clicking on resize buttons
        if (e.target.closest('.symbol-resize-controls') || e.target.closest('.symbol-resize-plus') || e.target.closest('.symbol-resize-minus')) {
            return;
        }
        
        // Don't start individual drag if symbol is part of rectangle selection
        const selectedCharts = window.selectedCharts || [];
        const isInSelection = selectedCharts.some(chart => chart.element === element);
        
        if (isInSelection) {
            // Let rectangle selection handle the drag
            return;
        }
        
        if (e.target.closest('.symbol-widget')) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            initialX = rect.left - container.getBoundingClientRect().left + container.scrollLeft;
            initialY = rect.top - container.getBoundingClientRect().top + container.scrollTop;
            element.style.cursor = 'move';
            e.preventDefault();
            e.stopPropagation(); // Prevent rectangle selection from starting
        }
    });
    
    const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const containerRect = container.getBoundingClientRect();
        
        const newX = initialX + deltaX;
        const newY = initialY + deltaY;
        
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        
        e.stopPropagation(); // Prevent rectangle selection during drag
    };
    
    const handleMouseUp = () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'move';
        }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Store handlers for cleanup if needed
    element._mouseMoveHandler = handleMouseMove;
    element._mouseUpHandler = handleMouseUp;
}

// Filter symbols and shapes
function filterSymbolsShapes(searchText, panelId) {
    renderSymbolsShapes(panelId, searchText);
}

// Make toggleRuler globally available
if (typeof window !== 'undefined') {
    window.toggleRuler = toggleRuler;
    window.updateRuler = updateRuler;
    window.syncRulerWithCanvas = syncRulerWithCanvas;
    window.showConnections = showConnections;
    window.renderSymbolsShapes = renderSymbolsShapes;
    window.renderToolbarSymbolsShapes = renderToolbarSymbolsShapes;
    window.expandSymbolsShapesPanel = expandSymbolsShapesPanel;
    window.collapseSymbolsShapesPanel = collapseSymbolsShapesPanel;
    window.addSymbolToCanvas = addSymbolToCanvas;
    window.resizeSymbol = resizeSymbol;
    window.filterSymbolsShapes = filterSymbolsShapes;
    
    // Initialize canvas to Custom size by default
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('designCanvas')) {
            changeCanvasSize('Custom');
        }
        // Initialize ruler visibility state
        window.rulerVisible = false;
        // Setup ruler scroll sync
        setTimeout(() => {
            syncRulerWithCanvas();
        }, 500);
        
        // Render symbols and shapes for toolbar (only for saved canvas, not empty canvas)
        setTimeout(() => {
            renderToolbarSymbolsShapes('toolbarSymbolsShapesListSaved');
        }, 500);
    });
}

// Show canvas settings
function showCanvasSettings() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 class="text-lg font-semibold mb-4">Canvas Settings</h3>
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium">Background Pattern:</label>
                    <select id="canvasPattern" class="w-full px-3 py-2 border rounded mt-1" onchange="changeCanvasPattern(this.value)">
                        <option value="none">None</option>
                        <option value="grid" selected>Grid</option>
                        <option value="dots">Dots</option>
                        <option value="lines">Lines</option>
                    </select>
                </div>
                <div>
                    <label class="text-sm font-medium">Grid Size:</label>
                    <input type="range" id="gridSize" min="10" max="50" value="20" class="w-full mt-1" onchange="changeGridSize(this.value)">
                    <span id="gridSizeValue" class="text-xs text-gray-500">20px</span>
                </div>
                <div>
                    <label class="text-sm font-medium">Snap to Grid:</label>
                    <input type="checkbox" id="snapToGrid" class="mt-1" onchange="toggleSnapToGrid(this.checked)">
                </div>
            </div>
            <div class="flex gap-2 mt-6">
                <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 border rounded">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Change canvas pattern
function changeCanvasPattern(pattern) {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    switch(pattern) {
        case 'grid':
            canvas.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)';
            canvas.style.backgroundSize = '20px 20px';
            gridEnabled = true;
            break;
        case 'dots':
            canvas.style.backgroundImage = 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)';
            canvas.style.backgroundSize = '20px 20px';
            gridEnabled = true;
            break;
        case 'lines':
            canvas.style.backgroundImage = 'linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)';
            canvas.style.backgroundSize = '20px 20px';
            gridEnabled = true;
            break;
        default:
            canvas.style.backgroundImage = 'none';
            gridEnabled = false;
    }
}

// Change grid size
function changeGridSize(size) {
    const canvas = document.getElementById('designCanvas');
    if (canvas && gridEnabled) {
        const pattern = document.getElementById('canvasPattern')?.value || 'grid';
        changeCanvasPattern(pattern);
        canvas.style.backgroundSize = `${size}px ${size}px`;
        const gridSizeValue = document.getElementById('gridSizeValue');
        if (gridSizeValue) {
            gridSizeValue.textContent = `${size}px`;
        }
    }
}

// Toggle snap to grid
function toggleSnapToGrid(enabled) {
    window.snapToGridEnabled = enabled;
}

// Toggle grid
function toggleGrid() {
    gridEnabled = !gridEnabled;
    const canvas = document.getElementById('designCanvas');
    const btn = document.getElementById('gridToggleBtn');
    
    if (gridEnabled) {
        const pattern = document.getElementById('canvasPattern')?.value || 'grid';
        changeCanvasPattern(pattern);
        if (btn) btn.classList.add('bg-gray-200');
    } else {
        if (canvas) canvas.style.backgroundImage = 'none';
        if (btn) btn.classList.remove('bg-gray-200');
    }
}

// Toggle ruler
function toggleRuler() {
    rulerEnabled = !rulerEnabled;
    const btn = document.getElementById('rulerToggleBtn');
    
    if (rulerEnabled) {
        if (btn) btn.classList.add('bg-gray-200');
    } else {
        if (btn) btn.classList.remove('bg-gray-200');
    }
}

// Zoom in
function zoomIn() {
    canvasZoom = Math.min(canvasZoom + 10, 200);
    applyZoom();
}

// Zoom out
function zoomOut() {
    canvasZoom = Math.max(canvasZoom - 10, 50);
    applyZoom();
}

// Apply zoom
function applyZoom() {
    const canvas = document.getElementById('designCanvas');
    const zoomLevel = document.getElementById('zoomLevel');
    
    if (canvas) {
        canvas.style.transform = `scale(${canvasZoom / 100})`;
        canvas.style.transformOrigin = 'top left';
    }
    
    if (zoomLevel) {
        zoomLevel.textContent = `${canvasZoom}%`;
    }
}

// Export canvas
function exportCanvas() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    const content = canvas.innerHTML;
    const blob = new Blob([`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Exported Canvas</title></head><body>${content}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas-export.html';
    a.click();
    URL.revokeObjectURL(url);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize design canvas when design section is shown
    const designSection = document.getElementById('design-section');
    if (designSection) {
        // Initialize immediately if already visible
        if (!designSection.classList.contains('hidden')) {
            setTimeout(() => {
                console.log('Design section already visible on load');
                initDesignCanvas();
                if (typeof initToolbar === 'function') initToolbar();
                if (typeof initCanvasPan === 'function') initCanvasPan();
                if (typeof updateWordCount === 'function') updateWordCount();
                if (typeof gridEnabled !== 'undefined' && gridEnabled && typeof changeCanvasPattern === 'function') {
                    changeCanvasPattern('grid');
                }
            }, 200);
        }
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (!designSection.classList.contains('hidden')) {
                    setTimeout(() => {
                        console.log('Design section became visible');
                        initDesignCanvas();
                        if (typeof initToolbar === 'function') initToolbar();
                        if (typeof initCanvasPan === 'function') initCanvasPan();
                        if (typeof updateWordCount === 'function') updateWordCount();
                        if (typeof gridEnabled !== 'undefined' && gridEnabled && typeof changeCanvasPattern === 'function') {
                            changeCanvasPattern('grid');
                        }
                    }, 200);
                }
            });
        });
        observer.observe(designSection, { attributes: true, attributeFilter: ['class'] });
    }
});

// ==================== PAGE MANAGEMENT ====================

// Page management for canvas
let pages = [];
let currentPageId = null;
let pageCounter = 0;

// Initialize pages
function initPages() {
    // Create default page if none exists
    if (pages.length === 0) {
        pageCounter++;
        const pageId = `page-${pageCounter}`;
        const pageName = `Page ${pageCounter}`;
        
        const page = {
            id: pageId,
            name: pageName,
            canvasId: 'designCanvas', // Use default canvas for first page
            widgets: []
        };
        
        pages.push(page);
        currentPageId = pageId;
        
        // Show default canvas
        const canvas = document.getElementById('designCanvas');
        if (canvas) {
            canvas.style.display = 'block';
            // Initialize canvas for drag and drop
            if (typeof setupCanvasDragDropForElement === 'function') {
                setupCanvasDragDropForElement(canvas);
            }
        }
        
        // Render pages list
        renderPagesList();
    }
}

// Add new page
function addNewPage() {
    pageCounter++;
    const pageId = `page-${pageCounter}`;
    const pageName = `Page ${pageCounter}`;
    
    const page = {
        id: pageId,
        name: pageName,
        canvasId: `canvas-${pageId}`,
        widgets: []
    };
    
    pages.push(page);
    
    // Create canvas for this page
    createPageCanvas(page);
    
    // Add page to list
    renderPagesList();
    
    // Switch to new page
    switchToPage(pageId);
}

// Add new page (saved canvas)
function addNewPageSaved() {
    if (!window.pagesSaved) {
        window.pagesSaved = [];
    }
    
    pageCounter++;
    const pageId = `page-saved-${pageCounter}`;
    const pageName = `Page ${pageCounter}`;
    
    const page = {
        id: pageId,
        name: pageName,
        canvasId: `canvas-saved-${pageId}`,
        widgets: []
    };
    
    window.pagesSaved.push(page);
    
    // Create canvas for this page
    createPageCanvasSaved(page);
    
    // Add page to list
    renderPagesListSaved();
    
    // Switch to new page
    switchToPageSaved(pageId);
}

// Create canvas for page
function createPageCanvas(page) {
    const existingCanvas = document.getElementById('designCanvas');
    if (!existingCanvas) return;
    
    const canvasContainer = existingCanvas.parentElement;
    
    // Hide existing canvas if it's not the default
    if (existingCanvas.id !== page.canvasId && existingCanvas.id === 'designCanvas') {
        existingCanvas.style.display = 'none';
    }
    
    // Check if canvas already exists
    let canvas = document.getElementById(page.canvasId);
    if (!canvas) {
        // Create new canvas
        canvas = document.createElement('div');
        canvas.id = page.canvasId;
        canvas.className = 'flex-1 overflow-hidden p-8 bg-white';
        canvas.setAttribute('contenteditable', 'false');
        canvas.setAttribute('tabindex', '0');
        canvas.style.position = 'relative';
        canvas.style.outline = 'none';
        canvas.innerHTML = `
            <div class="absolute top-2 right-2 z-50 flex gap-2">
                <button onclick="toggleConnectionsVisibility()" class="px-3 py-1.5 bg-white border border-border-light rounded-md text-xs text-text-default hover:bg-gray-50 shadow-sm flex items-center gap-2" title="Show/Hide Connections">
                    <span class="material-symbols-outlined text-sm">link</span>
                    <span>Connections</span>
                </button>
            </div>
            <div id="selectionRectangle" class="hidden absolute border-2 border-blue-500 bg-blue-200 bg-opacity-20 pointer-events-none z-40" style="display: none;"></div>
            <div id="snapGuideHorizontal" class="hidden absolute bg-blue-500 pointer-events-none z-50" style="height: 2px; display: none; box-shadow: 0 0 3px rgba(59, 130, 246, 0.8);"></div>
            <div id="snapGuideVertical" class="hidden absolute bg-blue-500 pointer-events-none z-50" style="width: 2px; display: none; box-shadow: 0 0 3px rgba(59, 130, 246, 0.8);"></div>
        `;
        canvas.style.display = 'block';
        canvasContainer.appendChild(canvas);
        
        // Initialize canvas for drag and drop
        if (typeof setupCanvasDragDropForElement === 'function') {
            setTimeout(() => {
                setupCanvasDragDropForElement(canvas);
            }, 50);
        }
        
        // Initialize design canvas features
        if (typeof initDesignCanvas === 'function') {
            setTimeout(() => {
                initDesignCanvas(page.canvasId, 'chartToolbox');
            }, 100);
        }
    } else {
        canvas.style.display = 'block';
        // Make sure existing canvas is initialized
        if (typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    }
}

// Create canvas for page (saved)
function createPageCanvasSaved(page) {
    const existingCanvas = document.getElementById('designCanvasSaved');
    if (!existingCanvas) return;
    
    const canvasContainer = existingCanvas.parentElement;
    
    // Hide existing canvas if it's not the default
    if (existingCanvas.id !== page.canvasId && existingCanvas.id === 'designCanvasSaved') {
        existingCanvas.style.display = 'none';
    }
    
    // Check if canvas already exists
    let canvas = document.getElementById(page.canvasId);
    if (!canvas) {
        // Create new canvas
        canvas = document.createElement('div');
        canvas.id = page.canvasId;
        canvas.className = 'flex-1 overflow-hidden bg-white p-8 relative';
        canvas.setAttribute('contenteditable', 'false');
        canvas.setAttribute('tabindex', '0');
        canvas.innerHTML = '';
        canvas.style.display = 'block';
        canvasContainer.appendChild(canvas);
        
        // Initialize canvas for drag and drop
        if (typeof setupCanvasDragDropForElement === 'function') {
            setTimeout(() => {
                setupCanvasDragDropForElement(canvas);
            }, 50);
        }
        
        // Initialize design canvas features
        if (typeof initDesignCanvas === 'function') {
            setTimeout(() => {
                initDesignCanvas(page.canvasId, 'chartToolboxSaved');
            }, 100);
        }
    } else {
        canvas.style.display = 'block';
        // Make sure existing canvas is initialized
        if (typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    }
}

// Page ordering functions
let draggedPageElement = null;

function movePageUp(pageId) {
    const index = pages.findIndex(p => p.id === pageId);
    if (index <= 0) return;
    
    // Swap pages
    [pages[index - 1], pages[index]] = [pages[index], pages[index - 1]];
    renderPagesList();
}

function movePageDown(pageId) {
    const index = pages.findIndex(p => p.id === pageId);
    if (index < 0 || index >= pages.length - 1) return;
    
    // Swap pages
    [pages[index], pages[index + 1]] = [pages[index + 1], pages[index]];
    renderPagesList();
}

function movePageUpSaved(pageId) {
    if (!window.pagesSaved) return;
    const index = window.pagesSaved.findIndex(p => p.id === pageId);
    if (index <= 0) return;
    
    // Swap pages
    [window.pagesSaved[index - 1], window.pagesSaved[index]] = [window.pagesSaved[index], window.pagesSaved[index - 1]];
    renderPagesListSaved();
}

function movePageDownSaved(pageId) {
    if (!window.pagesSaved) return;
    const index = window.pagesSaved.findIndex(p => p.id === pageId);
    if (index < 0 || index >= window.pagesSaved.length - 1) return;
    
    // Swap pages
    [window.pagesSaved[index], window.pagesSaved[index + 1]] = [window.pagesSaved[index + 1], window.pagesSaved[index]];
    renderPagesListSaved();
}

// Drag and drop handlers for pages
function handlePageDragStart(e) {
    draggedPageElement = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handlePageDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedPageElement !== this) {
        const pagesList = document.getElementById('pagesList');
        const allItems = pagesList.querySelectorAll('.page-item');
        let insertBefore = null;
        
        for (let i = 0; i < allItems.length; i++) {
            const rect = allItems[i].getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                insertBefore = allItems[i];
                break;
            }
        }
        
        if (insertBefore) {
            pagesList.insertBefore(draggedPageElement, insertBefore);
        } else {
            pagesList.appendChild(draggedPageElement);
        }
    }
    return false;
}

function handlePageDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedPageElement !== this) {
        const pagesList = document.getElementById('pagesList');
        const allItems = Array.from(pagesList.querySelectorAll('.page-item'));
        const sourceIndex = allItems.indexOf(draggedPageElement);
        const targetIndex = allItems.indexOf(this);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
            // Reorder pages array
            const [movedPage] = pages.splice(sourceIndex, 1);
            pages.splice(targetIndex, 0, movedPage);
            
            renderPagesList();
        }
    }
    
    return false;
}

function handlePageDragEnd(e) {
    this.style.opacity = '';
    draggedPageElement = null;
}

// Drag and drop handlers for saved pages
function handlePageDragStartSaved(e) {
    draggedPageElement = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handlePageDragOverSaved(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedPageElement !== this) {
        const pagesList = document.getElementById('pagesListSaved');
        const allItems = pagesList.querySelectorAll('.page-item');
        let insertBefore = null;
        
        for (let i = 0; i < allItems.length; i++) {
            const rect = allItems[i].getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            
            if (e.clientY < midpoint) {
                insertBefore = allItems[i];
                break;
            }
        }
        
        if (insertBefore) {
            pagesList.insertBefore(draggedPageElement, insertBefore);
        } else {
            pagesList.appendChild(draggedPageElement);
        }
    }
    return false;
}

function handlePageDropSaved(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedPageElement !== this && window.pagesSaved) {
        const pagesList = document.getElementById('pagesListSaved');
        const allItems = Array.from(pagesList.querySelectorAll('.page-item'));
        const sourceIndex = allItems.indexOf(draggedPageElement);
        const targetIndex = allItems.indexOf(this);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
            // Reorder pages array
            const [movedPage] = window.pagesSaved.splice(sourceIndex, 1);
            window.pagesSaved.splice(targetIndex, 0, movedPage);
            
            renderPagesListSaved();
        }
    }
    
    return false;
}

function handlePageDragEndSaved(e) {
    this.style.opacity = '';
    draggedPageElement = null;
}

// Render pages list
function renderPagesList() {
    const pagesList = document.getElementById('pagesList');
    if (!pagesList) return;
    
    pagesList.innerHTML = '';
    
    pages.forEach((page, index) => {
        const pageItem = document.createElement('div');
        pageItem.className = `page-item group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${currentPageId === page.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`;
        pageItem.dataset.pageId = page.id;
        pageItem.draggable = true;
        pageItem.dataset.index = index;
        
        pageItem.innerHTML = `
            <div class="flex items-center gap-1 flex-shrink-0">
                <span class="material-symbols-outlined text-sm text-text-muted cursor-move drag-handle" title="Drag to reorder">drag_indicator</span>
            </div>
            <div class="flex-1 min-w-0 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-text-muted flex-shrink-0">description</span>
                <span class="page-name text-xs font-medium text-text-default truncate flex-1">${page.name}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="event.stopPropagation(); editPageName('${page.id}')" class="p-1 hover:bg-gray-200 rounded" title="Rename">
                    <span class="material-symbols-outlined text-sm text-text-muted">edit</span>
                </button>
                <button onclick="event.stopPropagation(); deletePage('${page.id}')" class="p-1 hover:bg-red-100 rounded" title="Delete">
                    <span class="material-symbols-outlined text-sm text-red-600">delete</span>
                </button>
            </div>
        `;
        
        // Drag and drop handlers
        pageItem.addEventListener('dragstart', handlePageDragStart);
        pageItem.addEventListener('dragover', handlePageDragOver);
        pageItem.addEventListener('drop', handlePageDrop);
        pageItem.addEventListener('dragend', handlePageDragEnd);
        
        pageItem.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('.drag-handle')) {
                switchToPage(page.id);
            }
        });
        
        pagesList.appendChild(pageItem);
    });
}

// Render pages list (saved)
function renderPagesListSaved() {
    const pagesList = document.getElementById('pagesListSaved');
    if (!pagesList || !window.pagesSaved || window.pagesSaved.length === 0) return;
    
    pagesList.innerHTML = '';
    
    window.pagesSaved.forEach((page, index) => {
        const pageItem = document.createElement('div');
        pageItem.className = `page-item group flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${window.currentPageIdSaved === page.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`;
        pageItem.dataset.pageId = page.id;
        pageItem.draggable = true;
        pageItem.dataset.index = index;
        
        pageItem.innerHTML = `
            <div class="flex items-center gap-1 flex-shrink-0">
                <span class="material-symbols-outlined text-sm text-text-muted cursor-move drag-handle" title="Drag to reorder">drag_indicator</span>
            </div>
            <div class="flex-1 min-w-0 flex items-center gap-2">
                <span class="material-symbols-outlined text-sm text-text-muted flex-shrink-0">description</span>
                <span class="page-name text-xs font-medium text-text-default truncate flex-1">${page.name}</span>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="event.stopPropagation(); editPageNameSaved('${page.id}')" class="p-1 hover:bg-gray-200 rounded" title="Rename">
                    <span class="material-symbols-outlined text-sm text-text-muted">edit</span>
                </button>
                <button onclick="event.stopPropagation(); deletePageSaved('${page.id}')" class="p-1 hover:bg-red-100 rounded" title="Delete">
                    <span class="material-symbols-outlined text-sm text-red-600">delete</span>
                </button>
            </div>
        `;
        
        // Drag and drop handlers
        pageItem.addEventListener('dragstart', handlePageDragStartSaved);
        pageItem.addEventListener('dragover', handlePageDragOverSaved);
        pageItem.addEventListener('drop', handlePageDropSaved);
        pageItem.addEventListener('dragend', handlePageDragEndSaved);
        
        pageItem.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('.drag-handle')) {
                switchToPageSaved(page.id);
            }
        });
        
        pagesList.appendChild(pageItem);
    });
}

// Switch to page
function switchToPage(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    currentPageId = pageId;
    
    // Hide all canvases
    const canvasContainer = document.getElementById('designCanvas')?.parentElement;
    if (canvasContainer) {
        canvasContainer.querySelectorAll('[id^="canvas-page-"], #designCanvas').forEach(canvas => {
            canvas.style.display = 'none';
        });
    }
    
    // Show selected canvas
    let canvas = document.getElementById(page.canvasId);
    if (canvas) {
        canvas.style.display = 'block';
        // Make sure canvas is initialized for drag and drop
        if (typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    } else {
        createPageCanvas(page);
        canvas = document.getElementById(page.canvasId);
        if (canvas && typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    }
    
    // Update pages list
    renderPagesList();
}

// Switch to page (saved)
function switchToPageSaved(pageId) {
    if (!window.pagesSaved) return;
    
    const page = window.pagesSaved.find(p => p.id === pageId);
    if (!page) return;
    
    window.currentPageIdSaved = pageId;
    
    // Hide all canvases
    const canvasContainer = document.getElementById('designCanvasSaved')?.parentElement;
    if (canvasContainer) {
        canvasContainer.querySelectorAll('[id^="canvas-saved-"], #designCanvasSaved').forEach(canvas => {
            canvas.style.display = 'none';
        });
    }
    
    // Show selected canvas
    let canvas = document.getElementById(page.canvasId);
    if (canvas) {
        canvas.style.display = 'block';
        // Make sure canvas is initialized for drag and drop
        if (typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    } else {
        createPageCanvasSaved(page);
        canvas = document.getElementById(page.canvasId);
        if (canvas && typeof setupCanvasDragDropForElement === 'function') {
            setupCanvasDragDropForElement(canvas);
        }
    }
    
    // Update pages list
    renderPagesListSaved();
}

// Edit page name
function editPageName(pageId) {
    const page = pages.find(p => p.id === pageId);
    if (!page) {
        console.error('Page not found:', pageId);
        return;
    }
    
    console.log('Editing page name:', page.name, 'for page:', pageId);
    
    if (typeof showPromptDialog === 'function') {
        showPromptDialog('Rename Page', page.name, (newName) => {
            console.log('Callback called with newName:', newName);
            if (newName && newName.trim()) {
                console.log('Updating page name from', page.name, 'to', newName.trim());
                page.name = newName.trim();
                renderPagesList();
                console.log('Page name updated, list rendered');
            } else {
                console.log('Empty or invalid name, not updating');
            }
        });
    } else {
        // Fallback to browser prompt if custom dialog not available
        const newName = prompt('Enter page name:', page.name);
        if (newName && newName.trim()) {
            page.name = newName.trim();
            renderPagesList();
        }
    }
}

// Edit page name (saved)
function editPageNameSaved(pageId) {
    if (!window.pagesSaved) {
        console.error('pagesSaved not found');
        return;
    }
    
    const page = window.pagesSaved.find(p => p.id === pageId);
    if (!page) {
        console.error('Page not found:', pageId);
        return;
    }
    
    console.log('Editing saved page name:', page.name, 'for page:', pageId);
    
    if (typeof showPromptDialog === 'function') {
        showPromptDialog('Rename Page', page.name, (newName) => {
            console.log('Callback called with newName:', newName);
            if (newName && newName.trim()) {
                console.log('Updating saved page name from', page.name, 'to', newName.trim());
                page.name = newName.trim();
                renderPagesListSaved();
                console.log('Saved page name updated, list rendered');
            } else {
                console.log('Empty or invalid name, not updating');
            }
        });
    } else {
        // Fallback to browser prompt if custom dialog not available
        const newName = prompt('Enter page name:', page.name);
        if (newName && newName.trim()) {
            page.name = newName.trim();
            renderPagesListSaved();
        }
    }
}

// Delete page
function deletePage(pageId) {
    if (pages.length <= 1) {
        if (typeof showAlert === 'function') {
            showAlert('Cannot delete the last page. At least one page is required.', 'error');
        } else {
            alert('Cannot delete the last page. At least one page is required.');
        }
        return;
    }
    
    const page = pages.find(p => p.id === pageId);
    if (!page) return;
    
    if (typeof showDialog === 'function') {
        showDialog(
            'Delete Page',
            `Are you sure you want to delete "${page.name}"? This action cannot be undone.`,
            () => {
                const pageIndex = pages.findIndex(p => p.id === pageId);
                if (pageIndex === -1) return;
                
                // Remove canvas
                const canvas = document.getElementById(pages[pageIndex].canvasId);
                if (canvas && canvas.id !== 'designCanvas') {
                    canvas.remove();
                }
                
                // Remove page
                pages.splice(pageIndex, 1);
                
                // Switch to first page if deleted page was current
                if (currentPageId === pageId) {
                    if (pages.length > 0) {
                        switchToPage(pages[0].id);
                    }
                }
                
                renderPagesList();
            }
        );
    } else {
        // Fallback to browser confirm if custom dialog not available
        if (!confirm('Are you sure you want to delete this page?')) {
            return;
        }
        
        const pageIndex = pages.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;
        
        // Remove canvas
        const canvas = document.getElementById(pages[pageIndex].canvasId);
        if (canvas && canvas.id !== 'designCanvas') {
            canvas.remove();
        }
        
        // Remove page
        pages.splice(pageIndex, 1);
        
        // Switch to first page if deleted page was current
        if (currentPageId === pageId) {
            if (pages.length > 0) {
                switchToPage(pages[0].id);
            }
        }
        
        renderPagesList();
    }
}

// Delete page (saved)
function deletePageSaved(pageId) {
    if (!window.pagesSaved || window.pagesSaved.length <= 1) {
        if (typeof showAlert === 'function') {
            showAlert('Cannot delete the last page. At least one page is required.', 'error');
        } else {
            alert('Cannot delete the last page. At least one page is required.');
        }
        return;
    }
    
    const page = window.pagesSaved.find(p => p.id === pageId);
    if (!page) return;
    
    if (typeof showDialog === 'function') {
        showDialog(
            'Delete Page',
            `Are you sure you want to delete "${page.name}"? This action cannot be undone.`,
            () => {
                const pageIndex = window.pagesSaved.findIndex(p => p.id === pageId);
                if (pageIndex === -1) return;
                
                // Remove canvas
                const canvas = document.getElementById(window.pagesSaved[pageIndex].canvasId);
                if (canvas && canvas.id !== 'designCanvasSaved') {
                    canvas.remove();
                }
                
                // Remove page
                window.pagesSaved.splice(pageIndex, 1);
                
                // Switch to first page if deleted page was current
                if (window.currentPageIdSaved === pageId) {
                    if (window.pagesSaved.length > 0) {
                        switchToPageSaved(window.pagesSaved[0].id);
                    }
                }
                
                renderPagesListSaved();
            }
        );
    } else {
        // Fallback to browser confirm if custom dialog not available
        if (!confirm('Are you sure you want to delete this page?')) {
            return;
        }
        
        const pageIndex = window.pagesSaved.findIndex(p => p.id === pageId);
        if (pageIndex === -1) return;
        
        // Remove canvas
        const canvas = document.getElementById(window.pagesSaved[pageIndex].canvasId);
        if (canvas && canvas.id !== 'designCanvasSaved') {
            canvas.remove();
        }
        
        // Remove page
        window.pagesSaved.splice(pageIndex, 1);
        
        // Switch to first page if deleted page was current
        if (window.currentPageIdSaved === pageId) {
            if (window.pagesSaved.length > 0) {
                switchToPageSaved(window.pagesSaved[0].id);
            }
        }
        
        renderPagesListSaved();
    }
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.addNewPage = addNewPage;
    window.addNewPageSaved = addNewPageSaved;
    window.editPageName = editPageName;
    window.editPageNameSaved = editPageNameSaved;
    window.deletePage = deletePage;
    window.deletePageSaved = deletePageSaved;
    window.switchToPage = switchToPage;
    window.switchToPageSaved = switchToPageSaved;
    window.initPages = initPages;
    window.movePageUp = movePageUp;
    window.movePageDown = movePageDown;
    window.movePageUpSaved = movePageUpSaved;
    window.movePageDownSaved = movePageDownSaved;
    window.pages = pages;
    window.pagesSaved = window.pagesSaved || [];
    window.currentPageIdSaved = null;
    // showConnectionModal is now in connection-modal.js
}

// ========== DATASET MANAGEMENT ==========

// Datasets array with mock data tables
let datasets = [
    { 
        id: 1, 
        name: 'Sales Data', 
        serviceId: 1, 
        serviceType: 'db', 
        query: 'SELECT * FROM sales', 
        preview: [
            { Month: 'January', Sales: 125000, Target: 120000, Growth: '4.2%' },
            { Month: 'February', Sales: 138000, Target: 130000, Growth: '6.2%' },
            { Month: 'March', Sales: 145000, Target: 140000, Growth: '3.6%' },
            { Month: 'April', Sales: 132000, Target: 135000, Growth: '-2.2%' },
            { Month: 'May', Sales: 150000, Target: 145000, Growth: '3.4%' }
        ] 
    },
    { 
        id: 2, 
        name: 'Customer Data', 
        serviceId: 2, 
        serviceType: 'file', 
        query: 'SELECT * FROM customers', 
        preview: [
            { CustomerID: 'C001', Name: 'John Doe', City: 'New York', Country: 'USA', Status: 'Active' },
            { CustomerID: 'C002', Name: 'Jane Smith', City: 'Los Angeles', Country: 'USA', Status: 'Active' },
            { CustomerID: 'C003', Name: 'Bob Johnson', City: 'Chicago', Country: 'USA', Status: 'Inactive' },
            { CustomerID: 'C004', Name: 'Alice Brown', City: 'Houston', Country: 'USA', Status: 'Active' },
            { CustomerID: 'C005', Name: 'Charlie Wilson', City: 'Phoenix', Country: 'USA', Status: 'Active' }
        ] 
    },
    { 
        id: 3, 
        name: 'Product Data', 
        serviceId: 1, 
        serviceType: 'db', 
        query: 'SELECT * FROM products', 
        preview: [
            { ProductID: 'P001', Name: 'Laptop Pro', Category: 'Electronics', Price: 1299, Stock: 45 },
            { ProductID: 'P002', Name: 'Wireless Mouse', Category: 'Accessories', Price: 29, Stock: 120 },
            { ProductID: 'P003', Name: 'Keyboard RGB', Category: 'Accessories', Price: 89, Stock: 78 },
            { ProductID: 'P004', Name: 'Monitor 27"', Category: 'Electronics', Price: 349, Stock: 32 },
            { ProductID: 'P005', Name: 'Webcam HD', Category: 'Accessories', Price: 59, Stock: 95 }
        ] 
    },
    { 
        id: 4, 
        name: 'Order Data', 
        serviceId: 2, 
        serviceType: 'file', 
        query: 'SELECT * FROM orders', 
        preview: [
            { OrderID: 'ORD-001', Customer: 'John Doe', Date: '2024-01-15', Amount: 1250, Status: 'Completed' },
            { OrderID: 'ORD-002', Customer: 'Jane Smith', Date: '2024-01-18', Amount: 890, Status: 'Processing' },
            { OrderID: 'ORD-003', Customer: 'Bob Johnson', Date: '2024-01-20', Amount: 2100, Status: 'Completed' },
            { OrderID: 'ORD-004', Customer: 'Alice Brown', Date: '2024-01-22', Amount: 650, Status: 'Pending' },
            { OrderID: 'ORD-005', Customer: 'Charlie Wilson', Date: '2024-01-25', Amount: 1450, Status: 'Completed' }
        ] 
    },
    { 
        id: 5, 
        name: 'Revenue Data', 
        serviceId: 1, 
        serviceType: 'db', 
        query: 'SELECT * FROM revenue', 
        preview: [
            { Quarter: 'Q1 2024', Revenue: 1250000, Expenses: 850000, Profit: 400000, Margin: '32%' },
            { Quarter: 'Q2 2024', Revenue: 1380000, Expenses: 920000, Profit: 460000, Margin: '33.3%' },
            { Quarter: 'Q3 2024', Revenue: 1450000, Expenses: 950000, Profit: 500000, Margin: '34.5%' },
            { Quarter: 'Q4 2024', Revenue: 1520000, Expenses: 980000, Profit: 540000, Margin: '35.5%' }
        ] 
    },
    { 
        id: 6, 
        name: 'Employee Data', 
        serviceId: 2, 
        serviceType: 'file', 
        query: 'SELECT * FROM employees', 
        preview: [
            { EmployeeID: 'E001', Name: 'Alice Johnson', Department: 'Sales', Position: 'Manager', Salary: 75000 },
            { EmployeeID: 'E002', Name: 'Bob Williams', Department: 'IT', Position: 'Developer', Salary: 65000 },
            { EmployeeID: 'E003', Name: 'Carol Davis', Department: 'HR', Position: 'Specialist', Salary: 55000 },
            { EmployeeID: 'E004', Name: 'David Miller', Department: 'Sales', Position: 'Representative', Salary: 50000 },
            { EmployeeID: 'E005', Name: 'Emma Garcia', Department: 'IT', Position: 'Designer', Salary: 60000 }
        ] 
    }
];

// Open Dataset Modal
function openDatasetModal() {
    const modal = document.getElementById('datasetModal');
    if (!modal) return;
    
    // Load linked services
    loadLinkedServicesForDataset();
    
    modal.classList.remove('hidden');
}

// Close Dataset Modal
function closeDatasetModal() {
    const modal = document.getElementById('datasetModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    // Reset form
    document.getElementById('datasetLinkedService').value = '';
    document.getElementById('datasetQuery').value = '';
    document.getElementById('datasetQuerySection').classList.add('hidden');
}

// Load linked services for dataset modal
async function loadLinkedServicesForDataset() {
    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/linked-services`);
        const services = await response.json();
        
        const select = document.getElementById('datasetLinkedService');
        if (!select) return;
        
        select.innerHTML = '<option value="">-- Select a service --</option>';
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = `${service.name} (${service.serviceType?.toUpperCase() || 'DB'})`;
            option.dataset.serviceType = service.serviceType || 'db';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// On dataset service change
function onDatasetServiceChange() {
    const select = document.getElementById('datasetLinkedService');
    const querySection = document.getElementById('datasetQuerySection');
    
    if (!select || !querySection) return;
    
    const selectedOption = select.options[select.selectedIndex];
    const serviceType = selectedOption?.dataset.serviceType || '';
    
    if (serviceType === 'db') {
        querySection.classList.remove('hidden');
    } else {
        querySection.classList.add('hidden');
    }
}

// Generate SQL with AI
function generateSQLWithAI() {
    const modal = document.getElementById('aiSQLModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// Close AI SQL Modal
function closeAISQLModal() {
    const modal = document.getElementById('aiSQLModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    document.getElementById('aiSQLPrompt').value = '';
}

// Generate SQL using AI (placeholder - will be implemented later)
async function generateSQL() {
    const prompt = document.getElementById('aiSQLPrompt')?.value || '';
    if (!prompt.trim()) {
        alert('Please describe what you want to query');
        return;
    }
    
    // TODO: Implement AI SQL generation
    // For now, show a placeholder
    alert('AI SQL generation will be implemented soon. Please write your SQL query manually.');
    closeAISQLModal();
}

// Add Dataset
function addDataset() {
    const serviceId = document.getElementById('datasetLinkedService')?.value;
    const query = document.getElementById('datasetQuery')?.value || '';
    
    if (!serviceId) {
        alert('Please select a linked service');
        return;
    }
    
    const select = document.getElementById('datasetLinkedService');
    const selectedOption = select.options[select.selectedIndex];
    const serviceType = selectedOption?.dataset.serviceType || '';
    
    if (serviceType === 'db' && !query.trim()) {
        alert('Please write a SQL query');
        return;
    }
    
    // TODO: Actually add dataset (will be implemented later)
    alert('Dataset addition will be implemented soon');
    closeDatasetModal();
}

// Render Datasets
function renderDatasets(containerId = 'datasetList') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    datasets.forEach(dataset => {
        const datasetDiv = document.createElement('div');
        
        const serviceType = dataset.serviceType || 'db';
        const serviceTypeLabel = serviceType === 'db' ? 'DB' : serviceType === 'file' ? 'File' : serviceType.toUpperCase();
        const serviceTypeColor = serviceType === 'db' ? 'bg-blue-500' : serviceType === 'file' ? 'bg-green-500' : 'bg-gray-500';
        
        // Hover color based on service type
        const hoverColor = serviceType === 'db' ? 'hover:bg-blue-50 hover:border-blue-300' : serviceType === 'file' ? 'hover:bg-green-50 hover:border-green-300' : 'hover:bg-gray-50';
        
        datasetDiv.className = `dataset-item cursor-move border border-border-light rounded-md p-2 ${hoverColor} transition-colors relative group`;
        datasetDiv.draggable = true;
        datasetDiv.dataset.datasetId = dataset.id;
        datasetDiv.dataset.datasetName = dataset.name;
        
        const previewRows = dataset.preview.slice(0, 5);
        const headers = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
        
        datasetDiv.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <div class="flex items-center gap-2 flex-1">
                    <div class="w-6 h-6 rounded-full ${serviceTypeColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        ${serviceTypeLabel}
                    </div>
                    <h4 class="text-xs font-semibold text-text-default">${dataset.name}</h4>
                </div>
            </div>
        `;
        
        // Create preview element separately
        const preview = document.createElement('div');
        preview.className = 'dataset-preview';
        preview.style.cssText = 'position: fixed; display: none; background: white; border: 2px solid #d1d5db; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); padding: 12px; z-index: 99999; min-width: 350px; max-width: 500px; pointer-events: none;';
        preview.innerHTML = `
            <div class="text-xs font-semibold text-gray-800 mb-2 pb-2 border-b-2 border-gray-300">${dataset.name} - Preview</div>
            <div style="overflow-x: auto; max-height: 300px; overflow-y: auto;">
                <table class="w-full text-xs" style="border-collapse: collapse;">
                    <thead class="bg-gray-100" style="position: sticky; top: 0;">
                        <tr>
                            ${headers.map(key => `<th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #1f2937; border: 1px solid #d1d5db; background: #f3f4f6; white-space: nowrap;">${key}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${previewRows.map(row => `
                            <tr style="background: ${previewRows.indexOf(row) % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                                ${headers.map(key => `<td style="padding: 8px 12px; border: 1px solid #e5e7eb; color: #374151; white-space: nowrap;">${row[key] || ''}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-300 font-medium">${previewRows.length} rows shown</div>
        `;
        document.body.appendChild(preview);
        
        let isDragging = false;
        let hoverTimeout = null;
        
        // Show preview on hover (but not when dragging)
        datasetDiv.addEventListener('mouseenter', (e) => {
            if (!isDragging) {
                hoverTimeout = setTimeout(() => {
                    if (!isDragging && preview) {
                        const rect = datasetDiv.getBoundingClientRect();
                        preview.style.left = (rect.right + 8) + 'px';
                        preview.style.top = rect.top + 'px';
                        preview.style.display = 'block';
                    }
                }, 100);
            }
        });
        
        datasetDiv.addEventListener('mouseleave', () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            if (preview) {
                preview.style.display = 'none';
            }
        });
        
        // Also hide preview when mouse leaves preview itself
        preview.addEventListener('mouseleave', () => {
            preview.style.display = 'none';
        });
        
        // Drag start
        datasetDiv.addEventListener('dragstart', (e) => {
            isDragging = true;
            // Hide preview when dragging starts
            if (preview) {
                preview.style.display = 'none';
            }
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
            }
            
            e.dataTransfer.setData('datasetId', dataset.id);
            e.dataTransfer.setData('datasetName', dataset.name);
            e.dataTransfer.effectAllowed = 'copy';
            datasetDiv.style.opacity = '0.5';
        });
        
        // Drag end
        datasetDiv.addEventListener('dragend', () => {
            isDragging = false;
            datasetDiv.style.opacity = '1';
        });
        
        container.appendChild(datasetDiv);
    });
}

// Make datasets globally available
if (typeof window !== 'undefined') {
    window.openDatasetModal = openDatasetModal;
    window.closeDatasetModal = closeDatasetModal;
    window.onDatasetServiceChange = onDatasetServiceChange;
    window.generateSQLWithAI = generateSQLWithAI;
    window.closeAISQLModal = closeAISQLModal;
    window.generateSQL = generateSQL;
    window.addDataset = addDataset;
    window.renderDatasets = renderDatasets;
    window.updateModelWidgetWithDataset = updateModelWidgetWithDataset;
    window.datasets = datasets;
    
    // Initialize datasets on load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            renderDatasets('datasetList');
            renderDatasets('datasetListSaved');
        }, 500);
    });
}

// Update Chart with Dataset (for all chart types)
function updateChartWithDataset(widget, datasetId) {
    if (!widget || !datasetId) return;
    
    // Store dataset ID
    widget.dataset.datasetId = datasetId;
    
    // Find dataset
    const dataset = window.datasets ? window.datasets.find(d => d.id == datasetId) : null;
    if (!dataset) {
        console.warn('Dataset not found:', datasetId);
        return;
    }
    
    // Update widget name
    const nameDisplay = widget.querySelector('.widget-name-display');
    if (nameDisplay) {
        nameDisplay.textContent = dataset.name;
    }
    widget.dataset.customName = dataset.name;
    
    // Convert dataset preview to widgetData format
    if (dataset.preview && dataset.preview.length > 0) {
        const headers = Object.keys(dataset.preview[0] || {});
        const widgetData = [headers];
        dataset.preview.forEach(row => {
            widgetData.push(headers.map(key => row[key]));
        });
        
        // Store in widget-specific storage
        const widgetId = widget.dataset.widgetId;
        const chartDiv = widget.querySelector('[id^="chart-"]');
        const chartDivId = chartDiv ? chartDiv.id : null;
        
        if (!window.widgetData) {
            window.widgetData = {};
        }
        if (widgetId) {
            window.widgetData[widgetId] = widgetData;
        }
        if (chartDivId) {
            window.widgetData[chartDivId] = widgetData;
        }
        
        // Update chart settings with data table rows and columns
        if (!window.chartSettings) {
            window.chartSettings = {};
        }
        if (chartDivId && !window.chartSettings[chartDivId]) {
            window.chartSettings[chartDivId] = {};
        }
        if (chartDivId) {
            // Store headers as available columns
            window.chartSettings[chartDivId].availableColumns = headers;
            // Store full widgetData in chart settings for data table
            window.chartSettings[chartDivId].widgetData = widgetData;
            
            // Get chart type
            const chartType = widget.dataset.chartType;
            
            // Smart column assignment based on chart type
            if (!window.chartSettings[chartDivId].xAxisColumn && headers.length > 0) {
                // For pie chart, find a numeric column for Y-axis first, then assign X-axis
                if (chartType === 'pie' || chartType === 'donut') {
                    // Find first numeric column for Y-axis
                    let numericColumn = null;
                    for (let i = 0; i < headers.length; i++) {
                        const sampleValue = dataset.preview[0]?.[headers[i]];
                        if (sampleValue !== undefined && !isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
                            numericColumn = headers[i];
                            break;
                        }
                    }
                    
                    if (numericColumn) {
                        // Assign numeric column to Y-axis
                        window.chartSettings[chartDivId].yAxisColumn = numericColumn;
                        // Assign first non-numeric column to X-axis, or first column if all are numeric
                        const xColumn = headers.find(h => h !== numericColumn) || headers[0];
                        window.chartSettings[chartDivId].xAxisColumn = xColumn;
                    } else {
                        // No numeric column found, use first two columns
                        window.chartSettings[chartDivId].xAxisColumn = headers[0];
                        if (headers.length > 1) {
                            window.chartSettings[chartDivId].yAxisColumn = headers[1];
                        }
                    }
                } else {
                    // For other charts, assign first column to X-axis
                    window.chartSettings[chartDivId].xAxisColumn = headers[0];
                    // For charts that need Y-axis, find numeric column
                    if (chartType !== 'table' && chartType !== 'list' && headers.length > 1) {
                        // Try to find a numeric column for Y-axis
                        let numericColumn = null;
                        for (let i = 1; i < headers.length; i++) {
                            const sampleValue = dataset.preview[0]?.[headers[i]];
                            if (sampleValue !== undefined && !isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
                                numericColumn = headers[i];
                                break;
                            }
                        }
                        window.chartSettings[chartDivId].yAxisColumn = numericColumn || headers[1];
                    }
                }
            }
            
            // Ensure Y-axis is set for pie chart if not already set
            if ((chartType === 'pie' || chartType === 'donut') && !window.chartSettings[chartDivId].yAxisColumn && headers.length > 1) {
                // Find numeric column for Y-axis
                let numericColumn = null;
                for (let i = 0; i < headers.length; i++) {
                    const sampleValue = dataset.preview[0]?.[headers[i]];
                    if (sampleValue !== undefined && !isNaN(parseFloat(sampleValue)) && isFinite(sampleValue)) {
                        numericColumn = headers[i];
                        break;
                    }
                }
                if (numericColumn) {
                    window.chartSettings[chartDivId].yAxisColumn = numericColumn;
                } else {
                    window.chartSettings[chartDivId].yAxisColumn = headers[1];
                }
            }
        }
    }
    
    // Get chart div and re-render
    const chartDiv = widget.querySelector('[id^="chart-"]');
    const chartType = widget.dataset.chartType;
    if (chartDiv && typeof renderChart === 'function') {
        renderChart(chartType, chartDiv.id);
    }
    
    // Update preview if chart settings modal is open
    if (window.previewChartId && chartDivId) {
        // Copy widgetData to preview
        if (window.widgetData && window.widgetData[chartDivId]) {
            window.widgetData[window.previewChartId] = Array.isArray(window.widgetData[chartDivId]) 
                ? [...window.widgetData[chartDivId]] 
                : window.widgetData[chartDivId];
        }
        
        // Copy chartSettings to preview
        if (window.chartSettings && window.chartSettings[chartDivId]) {
            if (!window.chartSettings[window.previewChartId]) {
                window.chartSettings[window.previewChartId] = {};
            }
            // Copy all settings from original chart to preview
            Object.assign(window.chartSettings[window.previewChartId], window.chartSettings[chartDivId]);
        }
        
        // Update data table in modal
        if (typeof renderDataTable === 'function') {
            renderDataTable(chartDivId);
        }
        
        // Re-render preview chart with updated data
        if (typeof renderChart === 'function') {
            // Get current chart type from settings or widget
            const previewChartType = window.chartSettings && window.chartSettings[window.previewChartId] 
                ? (window.chartSettings[window.previewChartId].chartType || chartType)
                : chartType;
            
            // Render preview chart based on its type and subtype
            setTimeout(() => {
                const previewSettings = window.chartSettings[window.previewChartId] || {};
                
                // Use chart-specific render functions if available
                if (previewChartType === 'bar' && typeof renderBarChartWithType === 'function') {
                    const barChartType = previewSettings.barChartType || window.currentBarChartType || 'basic';
                    renderBarChartWithType(window.previewChartId, barChartType);
                } else if (previewChartType === 'line' && typeof renderLineChartWithType === 'function') {
                    const lineChartType = previewSettings.lineChartType || window.currentLineChartType || 'single';
                    renderLineChartWithType(window.previewChartId, lineChartType);
                } else if (previewChartType === 'area' && typeof renderAreaChartWithType === 'function') {
                    const areaChartType = previewSettings.areaChartType || window.currentAreaChartType || 'simple';
                    renderAreaChartWithType(window.previewChartId, areaChartType);
                } else if (previewChartType === 'pie' && typeof renderPieChartWithType === 'function') {
                    const pieChartType = previewSettings.pieChartType || window.currentPieChartType || 'pie';
                    renderPieChartWithType(window.previewChartId, pieChartType);
                } else if (previewChartType === 'card' && typeof renderCardChartWithType === 'function') {
                    const cardChartType = previewSettings.cardChartType || window.currentCardChartType || 'number';
                    renderCardChartWithType(window.previewChartId, cardChartType);
                } else if (previewChartType === 'scatter' && typeof renderScatterChartWithType === 'function') {
                    const scatterChartType = previewSettings.scatterChartType || window.currentScatterChartType || 'simple';
                    renderScatterChartWithType(window.previewChartId, scatterChartType);
                } else if (previewChartType === 'treemap' && typeof renderTreemapChartWithType === 'function') {
                    const treemapChartType = previewSettings.treemapChartType || window.currentTreemapChartType || 'basic';
                    renderTreemapChartWithType(window.previewChartId, treemapChartType);
                } else if (previewChartType === 'table' && typeof renderTableChartWithType === 'function') {
                    const tableChartType = previewSettings.tableChartType || window.currentTableChartType || 'basic';
                    renderTableChartWithType(window.previewChartId, tableChartType);
                } else if (previewChartType === 'list' && typeof renderListChartWithType === 'function') {
                    const listChartType = previewSettings.listChartType || window.currentListChartType || 'basic';
                    renderListChartWithType(window.previewChartId, listChartType);
                } else {
                    // Fallback to generic renderChart
                    renderChart(previewChartType, window.previewChartId);
                }
            }, 100);
        }
    }
    
    // Show success message
    if (typeof showAlert === 'function') {
        showAlert(`Dataset "${dataset.name}" applied to chart`, 'success');
    }
}

// Update Model Widget with Dataset (kept for backward compatibility)
function updateModelWidgetWithDataset(widget, datasetId) {
    updateChartWithDataset(widget, datasetId);
}

// Add drag listeners to chart widget for dataset drops
function addDatasetDragListeners(chartContainer) {
    if (!chartContainer) return;
    
    // Check if listeners already added
    if (chartContainer.dataset.datasetDragListeners === 'true') {
        return;
    }
    
    chartContainer.dataset.datasetDragListeners = 'true';
    
    chartContainer.addEventListener('dragover', (e) => {
        // Check if dragging a dataset
        if (e.dataTransfer.types.includes('datasetId') || e.dataTransfer.types.includes('text/plain')) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
            // Scale up chart to indicate drop target
            chartContainer.style.transform = 'scale(1.05)';
            chartContainer.style.transition = 'transform 0.2s ease';
            chartContainer.style.zIndex = '1000';
        }
    });
    
    chartContainer.addEventListener('dragleave', (e) => {
        // Only reset if we're actually leaving the chart container
        const relatedTarget = e.relatedTarget;
        if (!chartContainer.contains(relatedTarget)) {
            chartContainer.style.transform = 'scale(1)';
            chartContainer.style.zIndex = '';
        }
    });
    
    chartContainer.addEventListener('drop', (e) => {
        const datasetId = e.dataTransfer.getData('datasetId');
        if (datasetId) {
            e.preventDefault();
            e.stopPropagation();
            chartContainer.style.transform = 'scale(1)';
            chartContainer.style.zIndex = '';
            
            // Update chart with dataset
            updateChartWithDataset(chartContainer, datasetId);
        }
    });
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.updateModelWidgetWithDataset = updateModelWidgetWithDataset;
    window.updateChartWithDataset = updateChartWithDataset;
    window.addDatasetDragListeners = addDatasetDragListeners;
}

