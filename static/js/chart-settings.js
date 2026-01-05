// ==================== CHART SETTINGS MODAL ====================

// Edit chart settings (called from design.js)
function editChartSettings(button) {
    try {
        const chartWidget = button.closest('.chart-widget');
        if (!chartWidget) {
            if (typeof showAlert === 'function') {
                showAlert('Chart widget not found', 'error');
            } else {
                console.error('Chart widget not found');
            }
            return;
        }
        
        const chartType = chartWidget.dataset.chartType;
        
        // Power BI slicers (button-slicer, text-slicer, list-slicer) don't have settings
        // They only use drill through
        if (chartType === 'button-slicer' || 
            chartType === 'text-slicer' || chartType === 'list-slicer') {
            if (typeof showAlert === 'function') {
                showAlert('Power BI slicers do not have settings. Use "Connect Drill Through" to configure.', 'info');
            }
            return;
        }
        
        const chartDiv = chartWidget.querySelector('[id^="chart-"]');
        
        if (!chartDiv) {
            if (typeof showAlert === 'function') {
                showAlert('Chart container not found', 'error');
            } else {
                console.error('Chart container not found');
            }
            return;
        }
        
        if (typeof showChartSettingsModal === 'function') {
            showChartSettingsModal(chartType, chartDiv.id, chartWidget);
        } else {
            console.error('showChartSettingsModal function not found');
            if (typeof showAlert === 'function') {
                showAlert('Settings modal function not loaded', 'error');
            }
        }
    } catch (error) {
        console.error('Error in editChartSettings:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error opening settings: ' + error.message, 'error');
        }
    }
}

// Determine which axes are required for a chart type
function getRequiredAxes(chartType) {
    // Chart types that require Z axis (3D charts)
    const zAxisCharts = ['scatter3d', 'surface', 'bubble', '3d-scatter', '3d-surface', '3d-bar'];
    
    if (zAxisCharts.includes(chartType)) {
        return { x: true, y: true, z: true };
    }
    
    // Chart types that only need X axis (pie, donut, etc.)
    const xOnlyCharts = ['pie', 'donut', 'gauge'];
    if (xOnlyCharts.includes(chartType)) {
        return { x: true, y: false, z: false };
    }
    
    // Default: X and Y axis required
    return { x: true, y: true, z: false };
}

// Show chart settings modal with preview and chat
function showChartSettingsModal(chartType, chartDivId, chartWidget) {
    const chartData = getChartData(chartWidget);
    // Get chartTypes from global scope
    const types = window.chartTypes || (typeof chartTypes !== 'undefined' ? chartTypes : []);
    const chartName = types.find(c => c.id === chartType)?.name || chartType;
    const chartIcon = types.find(c => c.id === chartType)?.icon || 'bar_chart';
    
    // Get required axes for this chart type
    let requiredAxes = getRequiredAxes(chartType);
    
    // For bar charts, z-axis is optional (for grouped/stacked charts)
    // Initially check if bar chart type is set, otherwise default to basic
    if (chartType === 'bar') {
        // Check if there's a saved bar chart type in settings
        const savedBarChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].barChartType;
        const initialBarType = savedBarChartType || window.currentBarChartType || 'basic';
        // Show z-axis only for grouped and stacked bar charts
        if (initialBarType === 'grouped' || initialBarType === 'clustered' || initialBarType === 'stacked') {
            requiredAxes.z = true;
        } else {
            requiredAxes.z = false;
        }
    }
    
    // For line charts, z-axis is optional (for multi-line charts)
    if (chartType === 'line') {
        // Check if there's a saved line chart type in settings
        const savedLineChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].lineChartType;
        const initialLineType = savedLineChartType || window.currentLineChartType || 'single';
        // Show z-axis only for multi-line charts
        if (initialLineType === 'multi') {
            requiredAxes.z = true;
        } else {
            requiredAxes.z = false;
        }
    }
    
    // For area charts, z-axis is optional (for stacked, percent, overlapping charts)
    if (chartType === 'area') {
        // Check if there's a saved area chart type in settings
        const savedAreaChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].areaChartType;
        const initialAreaType = savedAreaChartType || window.currentAreaChartType || 'simple';
        // Show z-axis only for stacked, percent, and overlapping area charts
        if (initialAreaType === 'stacked' || initialAreaType === 'percent' || initialAreaType === 'overlapping') {
            requiredAxes.z = true;
        } else {
            requiredAxes.z = false;
        }
    }
    
    // For scatter charts, z-axis is optional (for bubble charts)
    if (chartType === 'scatter') {
        // Check if there's a saved scatter chart type in settings
        const savedScatterChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].scatterChartType;
        const initialScatterType = savedScatterChartType || window.currentScatterChartType || 'simple';
        // Show z-axis only for bubble charts
        if (initialScatterType === 'bubble') {
            requiredAxes.z = true;
        } else {
            requiredAxes.z = false;
        }
    }
    
    // Hide widget header and resize handles when settings modal opens
    const header = chartWidget.querySelector('.chart-widget-header');
    if (header) {
        header.style.display = 'none';
        header.classList.add('hidden');
    }
    
    // Hide resize handles
    if (typeof hideResizeHandles === 'function') {
        hideResizeHandles(chartWidget);
    }
    
    // Reset widget background/border to transparent
    chartWidget.style.backgroundColor = 'transparent';
    chartWidget.style.border = 'none';
    chartWidget.style.boxShadow = 'none';
    
    // Remove existing modal if any
    const existingModal = document.querySelector('.chart-settings-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'chart-settings-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-surface-light rounded-lg shadow-xl w-[98vw] h-[92vh] max-w-[1800px] flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="p-4 border-b border-border-light flex justify-between items-center bg-surface-light">
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-primary-brand text-xl">${chartIcon}</span>
                    <h3 class="text-lg font-semibold text-text-default">${chartName} - Settings</h3>
                </div>
                <button onclick="closeChartSettingsModal()" class="p-2 text-text-muted hover:text-text-default hover:bg-gray-100 rounded-md transition-colors">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            
            <!-- Main Content: Preview + Tabs + Chat -->
            <div class="flex-1 flex overflow-hidden w-full">
                <!-- Left: Preview Panel -->
                <div class="w-[22%] flex-shrink-0 border-r border-border-light bg-background-light flex flex-col overflow-hidden">
                    <div class="p-2 border-b border-border-light bg-surface-light flex-shrink-0">
                        <h4 class="text-xs font-semibold text-text-default">Preview</h4>
                    </div>
                    <div class="flex-shrink-0 p-2 pb-2 flex flex-col items-start justify-start" style="width: 100%;">
                        <div id="chartPreviewContainer" class="bg-white rounded-lg shadow-md p-2 w-full" style="width: 100%; max-width: 100%; max-height: 280px; overflow: hidden; display: inline-block; height: auto; min-height: auto;">
                            <!-- Preview chart will be rendered here -->
                        </div>
                        ${chartType === 'bar' ? `
                        <!-- Bar Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchBarChartType('basic', '${chartDivId}')" class="bar-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-bar-type="basic" title="Basic Bar Chart"></button>
                                <button onclick="switchBarChartType('grouped', '${chartDivId}')" class="bar-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-bar-type="grouped" title="Grouped / Clustered Bar Chart"></button>
                                <button onclick="switchBarChartType('stacked', '${chartDivId}')" class="bar-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-bar-type="stacked" title="Stacked Bar Chart"></button>
                                <button onclick="switchBarChartType('horizontal', '${chartDivId}')" class="bar-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-bar-type="horizontal" title="Horizontal Bar Chart"></button>
                                <button onclick="switchBarChartType('column', '${chartDivId}')" class="bar-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-bar-type="column" title="Column Bar Chart"></button>
                                <button onclick="switchBarChartType('diverging', '${chartDivId}')" class="bar-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-bar-type="diverging" title="Diverging Bar Chart"></button>
                            </div>
                            <span id="barChartTypeLabel" class="text-xs text-text-muted">Basic Bar Chart</span>
                        </div>
                        ` : ''}
                        ${chartType === 'line' ? `
                        <!-- Line Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchLineChartType('single', '${chartDivId}')" class="line-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-line-type="single" title="Single Line Chart"></button>
                                <button onclick="switchLineChartType('multi', '${chartDivId}')" class="line-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-line-type="multi" title="Multi-line Chart"></button>
                                <button onclick="switchLineChartType('cumulative', '${chartDivId}')" class="line-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-line-type="cumulative" title="Cumulative Line Chart"></button>
                                <button onclick="switchLineChartType('step', '${chartDivId}')" class="line-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-line-type="step" title="Step Line Chart"></button>
                                <button onclick="switchLineChartType('dashed', '${chartDivId}')" class="line-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-line-type="dashed" title="Dashed / Forecast Line Chart"></button>
                                <button onclick="switchLineChartType('indexed', '${chartDivId}')" class="line-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-line-type="indexed" title="Indexed (Normalized) Line Chart"></button>
                            </div>
                            <span id="lineChartTypeLabel" class="text-xs text-text-muted">Single Line Chart</span>
                        </div>
                        ` : ''}
                        ${chartType === 'area' ? `
                        <!-- Area Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchAreaChartType('simple', '${chartDivId}')" class="area-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-area-type="simple" title="Simple Area Chart"></button>
                                <button onclick="switchAreaChartType('stacked', '${chartDivId}')" class="area-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-area-type="stacked" title="Stacked Area Chart"></button>
                                <button onclick="switchAreaChartType('percent', '${chartDivId}')" class="area-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-area-type="percent" title="%100 Stacked Area Chart"></button>
                                <button onclick="switchAreaChartType('overlapping', '${chartDivId}')" class="area-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-area-type="overlapping" title="Overlapping Area Chart"></button>
                                <button onclick="switchAreaChartType('step', '${chartDivId}')" class="area-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-area-type="step" title="Step Area Chart"></button>
                                <button onclick="switchAreaChartType('range', '${chartDivId}')" class="area-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-area-type="range" title="Range Area Chart"></button>
                            </div>
                            <span id="areaChartTypeLabel" class="text-xs text-text-muted">Simple Area Chart</span>
                        </div>
                        ` : ''}
                        ${chartType === 'pie' ? `
                        <!-- Pie Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchPieChartType('simple', '${chartDivId}')" class="pie-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-pie-type="simple" title="Simple Pie Chart"></button>
                                <button onclick="switchPieChartType('doughnut', '${chartDivId}')" class="pie-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-pie-type="doughnut" title="Doughnut Chart"></button>
                                <button onclick="switchPieChartType('exploded', '${chartDivId}')" class="pie-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-pie-type="exploded" title="Exploded Pie Chart"></button>
                            </div>
                            <span id="pieChartTypeLabel" class="text-xs text-text-muted">Simple Pie Chart</span>
                        </div>
                        ` : ''}
                        ${chartType === 'scatter' ? `
                        <!-- Scatter Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchScatterChartType('simple', '${chartDivId}')" class="scatter-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-scatter-type="simple" title="Simple Scatter Chart"></button>
                                <button onclick="switchScatterChartType('trendline', '${chartDivId}')" class="scatter-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-scatter-type="trendline" title="Scatter + Trendline"></button>
                                <button onclick="switchScatterChartType('bubble', '${chartDivId}')" class="scatter-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-scatter-type="bubble" title="Bubble Chart"></button>
                            </div>
                            <span id="scatterChartTypeLabel" class="text-xs text-text-muted">Simple Scatter Chart</span>
                        </div>
                        ` : ''}
                        ${chartType === 'card' ? `
                        <!-- Card Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchCardChartType('basic', '${chartDivId}')" class="card-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-card-type="basic" title="Basic KPI Card"></button>
                                <button onclick="switchCardChartType('comparison', '${chartDivId}')" class="card-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-card-type="comparison" title="KPI + Comparison Card"></button>
                                <button onclick="switchCardChartType('percent', '${chartDivId}')" class="card-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-card-type="percent" title="KPI + % Change Card"></button>
                                <button onclick="switchCardChartType('target', '${chartDivId}')" class="card-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-card-type="target" title="Target / Goal Card"></button>
                                <button onclick="switchCardChartType('status', '${chartDivId}')" class="card-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-card-type="status" title="Status / Threshold Card"></button>
                                <button onclick="switchCardChartType('multi', '${chartDivId}')" class="card-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-card-type="multi" title="Multi-metric Card"></button>
                            </div>
                            <span id="cardChartTypeLabel" class="text-xs text-text-muted">Basic KPI Card</span>
                        </div>
                        ` : ''}
                        ${chartType === 'treemap' ? `
                        <!-- Treemap Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchTreemapChartType('basic', '${chartDivId}')" class="treemap-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-treemap-type="basic" title="Basic Treemap"></button>
                                <button onclick="switchTreemapChartType('hierarchical', '${chartDivId}')" class="treemap-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-treemap-type="hierarchical" title="Hierarchical Treemap"></button>
                            </div>
                            <span id="treemapChartTypeLabel" class="text-xs text-text-muted">Basic Treemap</span>
                        </div>
                        ` : ''}
                        ${chartType === 'table' ? `
                        <!-- Table Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchTableChartType('basic', '${chartDivId}')" class="table-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-table-type="basic" title="Basic Table"></button>
                                <button onclick="switchTableChartType('summary', '${chartDivId}')" class="table-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-table-type="summary" title="Summary / KPI Table"></button>
                                <button onclick="switchTableChartType('pivot', '${chartDivId}')" class="table-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-table-type="pivot" title="Pivot Table"></button>
                                <button onclick="switchTableChartType('matrix', '${chartDivId}')" class="table-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-table-type="matrix" title="Matrix Table"></button>
                                <button onclick="switchTableChartType('ranking', '${chartDivId}')" class="table-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-table-type="ranking" title="Ranking Table"></button>
                            </div>
                            <span id="tableChartTypeLabel" class="text-xs text-text-muted">Basic Table</span>
                        </div>
                        ` : ''}
                        ${chartType === 'list' ? `
                        <!-- List Chart Type Navigation Dots - Below chart -->
                        <div class="w-full mt-2 flex flex-col items-center gap-1">
                            <div class="flex items-center justify-center gap-1.5 flex-wrap">
                                <button onclick="switchListChartType('basic', '${chartDivId}')" class="list-chart-type-dot active w-2 h-2 rounded-full bg-primary-brand hover:bg-primary-brand-hover transition-all" data-list-type="basic" title="Basic List"></button>
                                <button onclick="switchListChartType('hierarchy', '${chartDivId}')" class="list-chart-type-dot w-2 h-2 rounded-full bg-gray-300 hover:bg-gray-400 transition-all" data-list-type="hierarchy" title="Hierarchy List"></button>
                            </div>
                            <span id="listChartTypeLabel" class="text-xs text-text-muted">Basic List</span>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Available Columns - Below preview model -->
                    <div class="border-t border-border-light bg-surface-light p-2 flex-shrink-0">
                        <label class="text-xs text-text-muted mb-1 block font-semibold">Available Columns</label>
                        <div id="availableColumnsListPreview" class="flex flex-wrap gap-1.5">
                            <!-- Columns will be dynamically added here -->
                        </div>
                    </div>
                    
                    <!-- Advanced Options/Design Section - Right below preview with minimal spacing -->
                    <div class="border-t border-border-light bg-surface-light flex flex-col flex-shrink-0 flex-1" style="min-height: 500px;">
                        <!-- Tab Navigation -->
                        <div class="flex border-b border-border-light bg-surface-light flex-shrink-0">
                            <button onclick="switchCommentTab('advanced-options', '${chartDivId}')" class="comment-tab-btn active px-4 py-2 text-sm font-medium text-text-default border-b-2 border-primary-brand transition-colors flex-1" data-comment-tab="advanced-options">
                                <span class="material-symbols-outlined text-sm mr-1">settings</span>
                                Advanced Options
                            </button>
                            <button onclick="switchCommentTab('design', '${chartDivId}')" class="comment-tab-btn px-4 py-2 text-sm font-medium text-text-muted hover:text-text-default transition-colors flex-1" data-comment-tab="design">
                                <span class="material-symbols-outlined text-sm mr-1">palette</span>
                                Design
                            </button>
                        </div>
                        
                        <!-- Advanced Options Tab Content -->
                        <div id="tab-advanced-options" class="comment-tab-content flex flex-col flex-1 min-h-0 overflow-y-auto" style="overflow-y: auto; max-height: 100%;">
                            <div class="p-3 space-y-3">
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">Chart Title</label>
                                    <input type="text" id="chartTitlePreview" value="${chartData.title || ''}" placeholder="Enter chart title" class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand">
                        </div>
                        
                                ${requiredAxes.x ? `
                                <!-- X-Axis Column Selection -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">X-Axis Column</label>
                                    <div 
                                        id="xAxisColumnDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisColumnDrop(event, 'x')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                    <input 
                                        type="text" 
                                            id="xAxisColumnPreview" 
                                            value="${chartData.xAxisColumn || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisColumnChange('x', this.value)"
                                            oninput="onAxisColumnChange('x', this.value)"
                                        >
                                </div>
                            </div>
                                
                                <!-- X-Axis Label -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">X-Axis Label</label>
                                    <div 
                                        id="xAxisLabelDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisLabelDrop(event, 'x')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                        <input 
                                            type="text" 
                                            id="xAxisLabelPreview" 
                                            value="${chartData.xAxisLabel || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisLabelChange('x', this.value)"
                                            oninput="onAxisLabelChange('x', this.value)"
                                        >
                        </div>
                                </div>
                                ` : ''}
                                
                                ${requiredAxes.y ? `
                                <!-- Y-Axis Column Selection -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">Y-Axis Column</label>
                                    <div 
                                        id="yAxisColumnDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisColumnDrop(event, 'y')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                        <input 
                                            type="text" 
                                            id="yAxisColumnPreview" 
                                            value="${chartData.yAxisColumn || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisColumnChange('y', this.value)"
                                            oninput="onAxisColumnChange('y', this.value)"
                                        >
                    </div>
                </div>
                
                                <!-- Y-Axis Label -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">Y-Axis Label</label>
                                    <div 
                                        id="yAxisLabelDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisLabelDrop(event, 'y')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                        <input 
                                            type="text" 
                                            id="yAxisLabelPreview" 
                                            value="${chartData.yAxisLabel || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisLabelChange('y', this.value)"
                                            oninput="onAxisLabelChange('y', this.value)"
                                        >
                    </div>
                                </div>
                                ` : ''}
                                
                                ${requiredAxes.z ? `
                                <!-- Z-Axis Column Selection -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">Z-Axis Column</label>
                                    <div 
                                        id="zAxisColumnDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisColumnDrop(event, 'z')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                        <input 
                                            type="text" 
                                            id="zAxisColumnPreview" 
                                            value="${chartData.zAxisColumn || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisColumnChange('z', this.value)"
                                            oninput="onAxisColumnChange('z', this.value)"
                                        >
                                    </div>
                                </div>
                                
                                <!-- Z-Axis Label -->
                                <div>
                                    <label class="text-xs text-text-muted mb-1 block">Z-Axis Label</label>
                                    <div 
                                        id="zAxisLabelDropZonePreview" 
                                        class="min-h-[50px] px-3 py-2 border-2 border-dashed border-border-light rounded-md bg-white flex items-center gap-2"
                                        ondrop="handleAxisLabelDrop(event, 'z')"
                                        ondragover="allowDrop(event)"
                                        ondragleave="handleDragLeave(event)"
                                    >
                                        <input 
                                            type="text" 
                                            id="zAxisLabelPreview" 
                                            value="${chartData.zAxisLabel || ''}" 
                                            placeholder="Drag column here or type manually"
                                            class="flex-1 px-2 py-1 border-none focus:outline-none text-sm"
                                            onchange="onAxisLabelChange('z', this.value)"
                                            oninput="onAxisLabelChange('z', this.value)"
                                        >
                                </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <!-- Design Tab Content -->
                        <div id="tab-design" class="comment-tab-content hidden flex flex-col flex-1 min-h-0 overflow-y-auto" style="overflow-y: auto; max-height: 100%;">
                            <div class="p-3 space-y-4">
                                <!-- Colors Section -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Colors</h4>
                                    <!-- Color Tabs Navigation -->
                                    <div class="flex border-b border-border-light mb-3">
                                        <button onclick="switchColorTab('general', '${chartDivId}')" class="color-tab-btn active px-3 py-2 text-xs font-medium text-text-default border-b-2 border-primary-brand transition-colors" data-color-tab="general">
                                            General
                                        </button>
                                        <button onclick="switchColorTab('chart-specific', '${chartDivId}')" class="color-tab-btn px-3 py-2 text-xs font-medium text-text-muted border-b-2 border-transparent hover:text-text-default transition-colors" data-color-tab="chart-specific">
                                            Chart
                                        </button>
                                    </div>
                                    
                                    <!-- General Colors Tab -->
                                    <div id="color-tab-general" class="color-tab-content">
                                        <div class="grid grid-cols-4 gap-3 mb-3">
                                            <div>
                                                <label class="text-xs text-text-muted mb-1 block">Primary Color</label>
                                                <input type="color" id="chartColor1Preview" value="${chartData.colors[0] || '#007bff'}" class="w-full h-10 border border-border-light rounded-md cursor-pointer">
                                            </div>
                                            <div>
                                                <label class="text-xs text-text-muted mb-1 block">Secondary Color</label>
                                                <input type="color" id="chartColor2Preview" value="${chartData.colors[1] || '#28a745'}" class="w-full h-10 border border-border-light rounded-md cursor-pointer">
                                            </div>
                                            <div>
                                                <label class="text-xs text-text-muted mb-1 block">Background</label>
                                                <input type="color" id="chartBgColorPreview" value="${chartData.bgColor || '#ffffff'}" class="w-full h-10 border border-border-light rounded-md cursor-pointer">
                                            </div>
                                            <div>
                                                <label class="text-xs text-text-muted mb-1 block">Text Color</label>
                                                <input type="color" id="chartTextColorPreview" value="${chartData.textColor || '#000000'}" class="w-full h-10 border border-border-light rounded-md cursor-pointer">
                                            </div>
                                        </div>
                                        <button onclick="autoAssignGeneralColors('${chartDivId}')" class="px-3 py-1.5 bg-primary-brand text-white rounded text-xs hover:bg-primary-brand-hover flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">auto_awesome</span>
                                            Auto
                                        </button>
                                    </div>
                                    
                                    <!-- Chart-Specific Colors Tab -->
                                    <div id="color-tab-chart-specific" class="color-tab-content hidden">
                                        <div id="chartSpecificColorsPreview" class="mb-3">
                                            <!-- Chart-specific colors will be dynamically generated here -->
                                        </div>
                                        <button onclick="autoAssignChartColors('${chartType}', '${chartDivId}')" class="px-3 py-1.5 bg-primary-brand text-white rounded text-xs hover:bg-primary-brand-hover flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">auto_awesome</span>
                                            Auto
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Chart Dimensions -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Dimensions</h4>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Width (px)</label>
                                            <input type="number" id="chartWidthPreview" value="${chartData.width || 280}" class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Height (px)</label>
                                            <input type="number" id="chartHeightPreview" value="${chartData.height || 220}" class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- Chart Margins -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Margins</h4>
                                    <div class="grid grid-cols-4 gap-2">
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Top</label>
                                            <input type="number" id="marginTopPreview" value="${chartData.marginTop || 20}" class="w-full px-2 py-1 border border-border-light rounded-md text-xs focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Right</label>
                                            <input type="number" id="marginRightPreview" value="${chartData.marginRight || 20}" class="w-full px-2 py-1 border border-border-light rounded-md text-xs focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Bottom</label>
                                            <input type="number" id="marginBottomPreview" value="${chartData.marginBottom || 40}" class="w-full px-2 py-1 border border-border-light rounded-md text-xs focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                        <div>
                                            <label class="text-xs text-text-muted mb-1 block">Left</label>
                                            <input type="number" id="marginLeftPreview" value="${chartData.marginLeft || 40}" class="w-full px-2 py-1 border border-border-light rounded-md text-xs focus:ring-primary-brand focus:border-primary-brand">
                                        </div>
                                    </div>
                                </div>
                                
                                ${chartType === 'text-box' ? `
                                <!-- Text Box Content -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Text Content</h4>
                                    <textarea 
                                        id="textBoxContentPreview" 
                                        placeholder="Enter your text here..."
                                        class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand min-h-[150px]"
                                        onchange="onTextBoxContentChange('${chartDivId}')"
                                        oninput="onTextBoxContentChange('${chartDivId}')"
                                    >${chartData.textContent || ''}</textarea>
                                </div>
                                ` : chartType === 'python' ? `
                                <!-- Python Code Editor -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Python Code</h4>
                                    <textarea 
                                        id="pythonCodePreview" 
                                        placeholder="# Python kodunuzu buraya yazın..."
                                        class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand min-h-[300px] font-mono"
                                        spellcheck="false"
                                    >${chartData.pythonCode || `# Python kodunuzu buraya yazın
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
plt.show()`}</textarea>
                                    <div class="mt-3 flex gap-2">
                                        <button onclick="runPythonCode('${chartDivId}')" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm flex items-center gap-2">
                                            <span class="material-symbols-outlined text-sm">play_arrow</span>
                                            Run Code
                                        </button>
                                        <button onclick="clearPythonOutput('${chartDivId}')" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md text-sm">
                                            Clear Output
                                        </button>
                                    </div>
                                    <div id="python-output-${chartDivId}" class="mt-3 p-3 border border-border-light rounded-md bg-gray-50 min-h-[100px] max-h-[300px] overflow-auto">
                                        <div class="text-xs text-gray-500">Kodu çalıştırmak için "Run Code" butonuna tıklayın.</div>
                                    </div>
                                </div>
                                ` : `
                                <!-- Display Options -->
                                <div>
                                    <h4 class="text-sm font-semibold mb-3 text-text-default">Display Options</h4>
                                    <div class="space-y-2">
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" id="showLegendPreview" ${chartData.showLegend ? 'checked' : ''} class="rounded border-border-light">
                                            <span class="text-sm text-text-default">Show Legend</span>
                                        </label>
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" id="showGridPreview" ${chartData.showGrid ? 'checked' : ''} class="rounded border-border-light">
                                            <span class="text-sm text-text-default">Show Grid</span>
                                        </label>
                                        <label class="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" id="showLabelsPreview" ${chartData.showLabels ? 'checked' : ''} class="rounded border-border-light">
                                            <span class="text-sm text-text-default">Show Labels</span>
                                        </label>
                                    </div>
                                </div>
                                `}
                                            </div>
                                        </div>
                                                </div>
                                            </div>
                                            
                <!-- Middle: Data Table Panel (Extended) -->
                <div class="flex-1 min-w-0 bg-surface-light flex flex-col overflow-hidden">
                    <!-- Data Table - Only table, no tabs -->
                    <div class="flex-1 flex flex-col min-h-0 overflow-hidden pl-2 pt-2 pb-2 pr-0 w-full">
                        <div class="flex items-center justify-between mb-2 flex-shrink-0 px-2">
                            <h4 class="text-xs font-semibold text-text-default">Data Table</h4>
                            <div class="flex gap-2">
                                <button onclick="addDataColumn('${chartDivId}')" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-1">
                                    <span class="material-symbols-outlined text-xs">add</span>
                                    Add Column
                                </button>
                                <button onclick="addDataRow('${chartDivId}')" class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 flex items-center gap-1">
                                    <span class="material-symbols-outlined text-xs">add</span>
                                    Add Row
                                </button>
                            </div>
                        </div>
                        <div id="dataTableContainer" class="flex-1 overflow-auto bg-white min-h-0" style="overflow-x: auto; overflow-y: auto; width: 100%; max-width: 100%;">
                            <!-- Data table will be rendered here -->
                        </div>
                    </div>
                    
                    <!-- Footer Actions -->
                    <div class="p-4 border-t border-border-light bg-surface-light flex justify-end gap-2 w-full">
                        <button onclick="closeChartSettingsModal()" class="px-4 py-2 border border-border-light rounded-md text-sm text-text-default hover:bg-gray-100 transition-colors">
                            Cancel
                        </button>
                        <button onclick="applyChartSettings('${chartType}', '${chartDivId}', '${chartWidget.dataset.widgetId || ''}')" class="px-4 py-2 bg-primary-brand text-white rounded-md text-sm hover:bg-primary-brand-hover transition-colors">
                            Apply Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentChartSettings = { chartType, chartDivId, chartWidget };
    
    // Store current bar chart type for bar charts
    if (chartType === 'bar') {
        // Check if there's a saved bar chart type, otherwise default to basic
        const savedBarChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].barChartType;
        window.currentBarChartType = savedBarChartType || 'basic';
        
        // Update z-axis visibility based on bar chart type
        setTimeout(() => {
            const showZAxis = window.currentBarChartType === 'grouped' || window.currentBarChartType === 'clustered' || window.currentBarChartType === 'stacked';
            const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
            const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
            
            if (zAxisColumnDropZone) {
                const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
                if (zAxisColumnContainer) {
                    zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
            
            if (zAxisLabelDropZone) {
                const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
                if (zAxisLabelContainer) {
                    zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
        }, 150);
    }
    
    // Store current line chart type for line charts
    if (chartType === 'line') {
        // Check if there's a saved line chart type, otherwise default to single
        const savedLineChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].lineChartType;
        window.currentLineChartType = savedLineChartType || 'single';
        
        // Update z-axis visibility based on line chart type
        setTimeout(() => {
            const showZAxis = window.currentLineChartType === 'multi';
            const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
            const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
            
            if (zAxisColumnDropZone) {
                const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
                if (zAxisColumnContainer) {
                    zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
            
            if (zAxisLabelDropZone) {
                const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
                if (zAxisLabelContainer) {
                    zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
        }, 150);
    }
    
    // Store current area chart type for area charts
    if (chartType === 'area') {
        // Check if there's a saved area chart type, otherwise default to simple
        const savedAreaChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].areaChartType;
        window.currentAreaChartType = savedAreaChartType || 'simple';
        
        // Update z-axis visibility based on area chart type
        setTimeout(() => {
            const showZAxis = window.currentAreaChartType === 'stacked' || window.currentAreaChartType === 'percent' || window.currentAreaChartType === 'overlapping';
            const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
            const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
            
            if (zAxisColumnDropZone) {
                const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
                if (zAxisColumnContainer) {
                    zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
            
            if (zAxisLabelDropZone) {
                const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
                if (zAxisLabelContainer) {
                    zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
        }, 150);
    }
    
    // Store current scatter chart type for scatter charts
    if (chartType === 'scatter') {
        // Check if there's a saved scatter chart type, otherwise default to simple
        const savedScatterChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].scatterChartType;
        window.currentScatterChartType = savedScatterChartType || 'simple';
        
        // Update z-axis visibility based on scatter chart type
        setTimeout(() => {
            const showZAxis = window.currentScatterChartType === 'bubble';
            const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
            const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
            
            if (zAxisColumnDropZone) {
                const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
                if (zAxisColumnContainer) {
                    zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
            
            if (zAxisLabelDropZone) {
                const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
                if (zAxisLabelContainer) {
                    zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
                }
            }
        }, 150);
    }
    
    // Store current card chart type for card charts
    if (chartType === 'card') {
        // Check if there's a saved card chart type, otherwise default to basic
        const savedCardChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].cardChartType;
        window.currentCardChartType = savedCardChartType || 'basic';
    }
    
    // Store current treemap chart type for treemap charts
    if (chartType === 'treemap') {
        // Check if there's a saved treemap chart type, otherwise default to basic
        const savedTreemapChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].treemapChartType;
        window.currentTreemapChartType = savedTreemapChartType || 'basic';
    }
    
    // Store current table chart type for table charts
    if (chartType === 'table') {
        // Check if there's a saved table chart type, otherwise default to basic
        const savedTableChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].tableChartType;
        window.currentTableChartType = savedTableChartType || 'basic';
    }
    
    // Store current list chart type for list charts
    if (chartType === 'list') {
        // Check if there's a saved list chart type, otherwise default to basic
        const savedListChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].listChartType;
        window.currentListChartType = savedListChartType || 'basic';
    }
    
    // Store current pie chart type for pie charts
    if (chartType === 'pie') {
        // Check if there's a saved pie chart type, otherwise default to simple
        const savedPieChartType = window.chartSettings && window.chartSettings[chartDivId] && window.chartSettings[chartDivId].pieChartType;
        window.currentPieChartType = savedPieChartType || 'simple';
    }
    
    // Render preview chart and data table
    setTimeout(() => {
        // Copy widgetData from original chart to preview before rendering
        if (window.widgetData && window.widgetData[chartDivId]) {
            // Preview chart ID will be set in renderPreviewChart, so we'll copy after
            const originalWidgetData = window.widgetData[chartDivId];
            renderPreviewChart(chartType, chartDivId, chartData);
            // Copy data to preview after previewChartId is set
            if (window.previewChartId && originalWidgetData) {
                if (!window.widgetData) {
                    window.widgetData = {};
                }
                window.widgetData[window.previewChartId] = Array.isArray(originalWidgetData) ? [...originalWidgetData] : originalWidgetData;
                // Also copy chart settings
                if (window.chartSettings && window.chartSettings[chartDivId]) {
                    if (!window.chartSettings[window.previewChartId]) {
                        window.chartSettings[window.previewChartId] = {};
                    }
                    Object.assign(window.chartSettings[window.previewChartId], window.chartSettings[chartDivId]);
                }
            }
        } else {
            renderPreviewChart(chartType, chartDivId, chartData);
        }
        
        renderDataTable(chartDivId);
        renderAvailableColumns(); // Render columns in Advanced Options
        loadLinkedServicesForSQL();
        loadAIServices(); // This will also call loadAIDataSources
        setupRealtimeUpdates(chartType, chartDivId);
        
        // Set default data source to File Upload
        window.currentDataSourceType = 'file';
        selectDataSource('file', chartDivId);
        
        // Render chart-specific colors
        renderChartSpecificColors(chartType, chartDivId);
        
        // Load saved settings into input fields
        loadSavedSettingsIntoInputs(chartDivId, chartData);
        
        // Force preview update after a short delay to ensure all data is copied
        setTimeout(() => {
            if (window.previewChartId && typeof updatePreviewRealtime === 'function') {
                updatePreviewRealtime(chartType);
            }
        }, 200);
    }, 100);
}

// Switch settings tab
function switchSettingsTab(tabName, chartDivId) {
    // Hide all tab contents
    document.querySelectorAll('.settings-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-primary-brand', 'border-primary-brand');
        btn.classList.add('text-text-muted', 'border-transparent');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'text-primary-brand', 'border-primary-brand');
        selectedBtn.classList.remove('text-text-muted', 'border-transparent');
    }
    
    // Refresh data table if data-table tab is selected
    if (tabName === 'data-table') {
        renderDataTable(chartDivId);
    }
    
    // Refresh data table if data-source tab is selected (for consistency)
    if (tabName === 'data-source') {
        // Data source tab doesn't show table, but we can keep data in sync
    }
    
    // Setup realtime updates if design tab is selected
    if (tabName === 'design') {
        const chartType = window.currentChartSettings?.chartType;
        if (chartType) {
            setupRealtimeUpdates(chartType, chartDivId);
        }
    }
}

// Switch data source tab (File Upload or SQL Query)
function switchDataSourceTab(tabType, chartDivId) {
    // Hide all tab contents
    document.querySelectorAll('.data-source-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.data-source-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-primary-brand', 'border-primary-brand');
        btn.classList.add('text-text-muted', 'border-transparent');
    });
    
    // Show selected tab content
    if (tabType === 'file') {
        const fileUploadArea = document.getElementById('fileUploadArea');
        if (fileUploadArea) fileUploadArea.classList.remove('hidden');
    } else if (tabType === 'sql') {
        const sqlQueryControls = document.getElementById('sqlQueryControls');
        if (sqlQueryControls) sqlQueryControls.classList.remove('hidden');
    }
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[data-source-tab="${tabType}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'text-primary-brand', 'border-primary-brand');
        selectedBtn.classList.remove('text-text-muted', 'border-transparent');
    }
    
    // Store current data source type
    window.currentDataSourceType = tabType;
}

// Select data source type (kept for compatibility)
function selectDataSource(sourceType, chartDivId) {
    switchDataSourceTab(sourceType, chartDivId);
}

// Load linked services for SQL dropdown
async function loadLinkedServicesForSQL() {
    try {
        const response = await fetch('http://localhost:5000/api/linked-services');
        if (!response.ok) return;
        
        const services = await response.json();
        const select = document.getElementById('linkedServiceSelect');
        if (!select) return;
        
        // Clear existing options except first one
        select.innerHTML = '<option value="">Select a linked service...</option>';
        
        // Add only DB type services
        services.forEach(service => {
            if (service.serviceType === 'db') {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading linked services:', error);
    }
}

// Load AI services for AI Assistant dropdown
async function loadAIServices() {
    try {
        const response = await fetch('http://localhost:5000/api/linked-services');
        if (!response.ok) return;
        
        const services = await response.json();
        const select = document.getElementById('aiServiceSelect');
        if (!select) return;
        
        // Clear existing options but keep "Select All Services"
        select.innerHTML = '<option value="">Select an AI service...</option><option value="all">Select All Services</option>';
        
        // Add only AI type services
        services.forEach(service => {
            if (service.serviceType === 'ai') {
                const option = document.createElement('option');
                option.value = service.id;
                option.textContent = service.name;
                select.appendChild(option);
            }
        });
        
        // Also load DB services for data source dropdown
        loadAIDataSources();
    } catch (error) {
        console.error('Error loading AI services:', error);
    }
}

// Load data sources for AI Assistant (DB services, file upload, SQL query)
async function loadAIDataSources() {
    try {
        const response = await fetch('http://localhost:5000/api/linked-services');
        if (!response.ok) return;
        
        const services = await response.json();
        const select = document.getElementById('aiDataSourceSelect');
        if (!select) return;
        
        // Clear existing options
        select.innerHTML = '<option value="">Select data source...</option>';
        
        // Add file upload and SQL query options
        const fileOption = document.createElement('option');
        fileOption.value = 'file-upload';
        fileOption.textContent = 'File Upload Data';
        select.appendChild(fileOption);
        
        const sqlOption = document.createElement('option');
        sqlOption.value = 'sql-query';
        sqlOption.textContent = 'SQL Query Data';
        select.appendChild(sqlOption);
        
        // Add DB services
        services.forEach(service => {
            if (service.serviceType === 'db') {
                const option = document.createElement('option');
                option.value = `db-${service.id}`;
                option.textContent = `DB: ${service.name}`;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Error loading AI data sources:', error);
    }
}

// Handle AI data source change
function onAIDataSourceChange(chartDivId) {
    const select = document.getElementById('aiDataSourceSelect');
    if (!select || !select.value) {
        window.selectedAIDataSource = null;
        updateAIWelcomeMessage();
        return;
    }
    
    window.selectedAIDataSource = select.value;
    
    // Update welcome message
    updateAIWelcomeMessage();
}

// On AI service change
function onAIServiceChange(chartDivId) {
    const select = document.getElementById('aiServiceSelect');
    if (select && select.value) {
        if (select.value === 'all') {
            window.selectedAIServiceId = 'all';
            window.selectedAIServiceName = 'All Services';
        } else {
            window.selectedAIServiceId = select.value;
            window.selectedAIServiceName = select.options[select.selectedIndex].text;
        }
        
        // Update welcome message
        updateAIWelcomeMessage();
    } else {
        window.selectedAIServiceId = null;
        window.selectedAIServiceName = null;
        updateAIWelcomeMessage();
    }
}

// Update AI welcome message with service and data source info
function updateAIWelcomeMessage() {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;
    
    const welcomeMsg = messagesContainer.querySelector('.bg-white\\/70, .bg-white\\/80, .bg-surface-light');
    if (!welcomeMsg) {
        // Try to find by class name variations
        const allMessages = messagesContainer.querySelectorAll('div > div');
        for (let msg of allMessages) {
            if (msg.textContent.includes('AI Assistant') && msg.textContent.includes('Select an AI service')) {
                welcomeMsg = msg.parentElement;
                break;
            }
        }
    }
    if (!welcomeMsg) return;
    
    const aiServiceText = window.selectedAIServiceName ? ` (${window.selectedAIServiceName})` : '';
    const dataSourceSelect = document.getElementById('aiDataSourceSelect');
    let dataSourceText = 'Not selected';
    
    if (dataSourceSelect && dataSourceSelect.value) {
        if (dataSourceSelect.value === 'file-upload') {
            dataSourceText = 'File Upload Data';
        } else if (dataSourceSelect.value === 'sql-query') {
            dataSourceText = 'SQL Query Data';
        } else if (dataSourceSelect.value.startsWith('db-')) {
            dataSourceText = dataSourceSelect.options[dataSourceSelect.selectedIndex].text;
        }
    }
    
    welcomeMsg.className = 'bg-white/70 backdrop-blur-sm rounded-lg p-3 text-xs text-purple-800 border border-purple-200';
    welcomeMsg.innerHTML = `
        <p class="font-semibold mb-1 text-purple-900">AI Assistant${aiServiceText}</p>
        <p class="text-xs mb-1 text-purple-700">Data Source: ${dataSourceText}</p>
        <p class="text-purple-800">Ask me anything about your chart settings or get suggestions for improvements!</p>
    `;
}

// Handle data file upload
function handleDataFileUpload(chartDivId, input) {
    const file = input.files[0];
    if (!file) return;
    
    const fileName = file.name;
    const fileExt = fileName.split('.').pop().toLowerCase();
    const sourceType = window.currentDataSourceType || 'csv';
    
    // Update UI
    const fileNameEl = document.getElementById('currentFileName');
    const removeBtn = document.getElementById('removeFileBtn');
    if (fileNameEl) fileNameEl.textContent = fileName;
    if (removeBtn) removeBtn.classList.remove('hidden');
    
    // Store original data before file upload
    if (!window.originalChartData) {
        window.originalChartData = getCurrentChartData(chartDivId);
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            let data = null;
            
            switch(fileExt) {
                case 'csv':
                    data = parseCSV(e.target.result);
                    break;
                case 'xlsx':
                case 'xls':
                    // Excel parsing will be handled separately
                    parseExcelFile(file, chartDivId, true);
                    return;
                case 'xml':
                    data = parseXML(e.target.result);
                    break;
                case 'json':
                    data = parseJSON(e.target.result);
                    break;
                default:
                    alert('Unsupported file type');
                    return;
            }
            
            if (data && data.length > 0) {
                window.csvData = data;
                window.currentDataFile = fileName;
    renderDataTable(chartDivId);
    updateChartFromData(chartDivId);
    // Also update canvas charts immediately
    updateCanvasCharts(chartDivId);
}
        } catch (error) {
            console.error('Error parsing file:', error);
            alert('Error parsing file: ' + error.message);
        }
    };
    
    if (fileExt === 'csv' || fileExt === 'xml' || fileExt === 'json') {
        reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Check if XLSX library is available
        if (typeof XLSX === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = function() {
                parseExcelFile(file, chartDivId, true);
            };
            document.head.appendChild(script);
        } else {
            parseExcelFile(file, chartDivId, true);
        }
        return;
    }
}

// Remove data file and restore original
function removeDataFile(chartDivId) {
    // Restore original data
    if (window.originalChartData) {
        window.csvData = window.originalChartData;
        window.originalChartData = null;
    } else {
        // Use default sample data
        const headers = ['Kategori', 'Deger', 'Satis'];
        const rows = (typeof sampleData !== 'undefined' && sampleData.Kategori) 
            ? sampleData.Kategori.map((k, i) => [k, sampleData.Deger[i], sampleData.Satis[i]])
            : [['A', 40, 100], ['B', 70, 150], ['C', 30, 80], ['D', 90, 200]];
        window.csvData = [headers, ...rows];
    }
    
    // Clear file input
    const fileInput = document.getElementById('dataFileInput');
    if (fileInput) fileInput.value = '';
    
    // Update UI
    const fileNameEl = document.getElementById('currentFileName');
    const removeBtn = document.getElementById('removeFileBtn');
    if (fileNameEl) fileNameEl.textContent = 'No file selected';
    if (removeBtn) removeBtn.classList.add('hidden');
    
    window.currentDataFile = null;
    
    // Update data table
    renderDataTable(chartDivId);
    
    // Immediately update preview chart
    updateChartFromData(chartDivId);
}

// Parse CSV
function parseCSV(text) {
    const lines = text.split('\\n').filter(line => line.trim());
    return lines.map(line => {
        // Handle quoted values
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
}

// Parse XML
function parseXML(text) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    const rows = xmlDoc.querySelectorAll('row');
    
    if (rows.length === 0) {
        // Try alternative structure
        const items = xmlDoc.querySelectorAll('item');
        if (items.length > 0) {
            const headers = Array.from(items[0].children).map(child => child.tagName);
            const data = [headers];
            items.forEach(item => {
                const row = headers.map(header => {
                    const elem = item.querySelector(header);
                    return elem ? elem.textContent : '';
                });
                data.push(row);
            });
            return data;
        }
        return [['No data found']];
    }
    
    const headers = Array.from(rows[0].children).map(child => child.tagName);
    const data = [headers];
    rows.forEach(row => {
        const rowData = headers.map(header => {
            const elem = row.querySelector(header);
            return elem ? elem.textContent : '';
        });
        data.push(rowData);
    });
    
    return data;
}

// Parse JSON
function parseJSON(text) {
    const json = JSON.parse(text);
    
    // Handle array of objects
    if (Array.isArray(json) && json.length > 0) {
        const headers = Object.keys(json[0]);
        const data = [headers];
        json.forEach(obj => {
            const row = headers.map(header => obj[header] || '');
            data.push(row);
        });
        return data;
    }
    
    // Handle object with data property
    if (json.data && Array.isArray(json.data)) {
        const headers = Object.keys(json.data[0]);
        const data = [headers];
        json.data.forEach(obj => {
            const row = headers.map(header => obj[header] || '');
            data.push(row);
        });
        return data;
    }
    
    return [['Invalid JSON structure']];
}

// On linked service change
function onLinkedServiceChange(chartDivId) {
    const select = document.getElementById('linkedServiceSelect');
    if (select && select.value) {
        window.selectedLinkedServiceId = select.value;
    }
}

// On SQL query change
function onSQLQueryChange(chartDivId) {
    const query = document.getElementById('sqlQuery')?.value || '';
    const serviceId = document.getElementById('linkedServiceSelect')?.value;
    
    if (query.trim() && serviceId) {
        // Store query
        window.currentSQLQuery = query;
        window.selectedLinkedServiceId = serviceId;
        
        // Optional: Auto-execute on change (can be disabled if not desired)
        // Uncomment the line below if you want auto-execution on query change
        // testSQLQuery(chartDivId);
    }
}

// Clear SQL query
function clearSQLQuery(chartDivId) {
    const queryEl = document.getElementById('sqlQuery');
    const selectEl = document.getElementById('linkedServiceSelect');
    if (queryEl) queryEl.value = '';
    if (selectEl) selectEl.value = '';
    window.currentSQLQuery = null;
    window.selectedLinkedServiceId = null;
}

// Test SQL query (placeholder)
async function testSQLQuery(chartDivId) {
    const query = document.getElementById('sqlQuery')?.value || '';
    const serviceId = document.getElementById('linkedServiceSelect')?.value;
    
    if (!query.trim()) {
        alert('Please enter a SQL query');
        return;
    }
    
    if (!serviceId) {
        alert('Please select a linked service');
        return;
    }
    
    // Store original data before SQL query
    if (!window.originalChartData) {
        window.originalChartData = getCurrentChartData(chartDivId);
    }
    
    try {
        // TODO: Execute SQL query via API
        // For now, show placeholder message
        console.log('Executing SQL query:', query, 'on service:', serviceId);
        
        // Simulate API call - replace this with actual API call later
        // const response = await fetch(`http://localhost:5000/api/linked-services/${serviceId}/execute-query`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ query })
        // });
        // const result = await response.json();
        
        // For now, show alert and return
        alert('SQL query execution will be implemented later. Query: ' + query);
        
        // When API is ready, uncomment and use this:
        // if (result.data && result.data.length > 0) {
        //     // Convert result to array format
        //     const headers = Object.keys(result.data[0]);
        //     const data = [headers];
        //     result.data.forEach(row => {
        //         const rowData = headers.map(header => row[header] || '');
        //         data.push(rowData);
        //     });
        //     
        //     window.csvData = data;
        //     window.currentSQLQuery = query;
        //     renderDataTable(chartDivId);
        //     updateChartFromData(chartDivId);
        // }
        
    } catch (error) {
        console.error('Error executing SQL query:', error);
        alert('Error executing SQL query: ' + error.message);
    }
}

// Execute SQL query and update data (called when API is ready)
function executeSQLQueryAndUpdate(chartDivId, queryResult) {
    if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
        alert('No data returned from query');
        return;
    }
    
    // Store original data before SQL query
    if (!window.originalChartData) {
        window.originalChartData = getCurrentChartData(chartDivId);
    }
    
    // Convert result to array format
    const headers = Object.keys(queryResult.data[0]);
    const data = [headers];
    queryResult.data.forEach(row => {
        const rowData = headers.map(header => row[header] || '');
        data.push(rowData);
    });
    
    // Update data
    window.csvData = data;
    window.currentSQLQuery = document.getElementById('sqlQuery')?.value || '';
    
    // Update data table
    renderDataTable(chartDivId);
    
    // Immediately update preview chart
    updateChartFromData(chartDivId);
}

// Render data table (renamed from renderCSVTable)
function renderDataTable(chartDivId) {
    const container = document.getElementById('dataTableContainer');
    if (!container) return;
    
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    let data = window.widgetData[chartDivId];
    if (!data || data.length === 0) {
        // Start with empty table - just headers row
        data = [['Column 1']];
        window.widgetData[chartDivId] = data;
    }
    
    // Update global csvData for this widget only (for backward compatibility)
    window.csvData = data;
    
    const headers = data[0] || ['Column 1'];
    const rows = data.slice(1) || [];
    
    // Column width settings
    const columnWidth = 150;
    const deleteColumnWidth = 50;
    
    // Remove max width restriction to allow full width
    container.style.maxWidth = 'none';
    container.style.width = '100%';
    
    // Create editable table with all columns (scrollable) - use 100% width to fill container
    let tableHTML = `<table class="text-xs border-collapse w-full" style="table-layout: auto; width: 100%;">`;
    
    // Header row - show all columns + delete column
    tableHTML += '<thead><tr class="bg-gray-100">';
    headers.forEach((header, idx) => {
        tableHTML += `<th class="px-3 py-2 border border-border-light font-semibold text-text-default" style="width: ${columnWidth}px; min-width: ${columnWidth}px;">
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-1">
                    <input type="text" value="${header || ''}" 
                           onchange="updateDataHeader('${chartDivId}', ${idx}, this.value)"
                           class="flex-1 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-brand px-1 text-left"
                           placeholder="Header ${idx + 1}" style="text-align: left;">
                    <span 
                        class="draggable-column cursor-move text-primary-brand hover:text-primary-brand-hover material-symbols-outlined text-sm"
                        draggable="true"
                        ondragstart="handleColumnDragStart(event, '${header || ''}')"
                        title="Drag to X-Axis, Y-Axis, or Z-Axis"
                    >drag_indicator</span>
                </div>
                ${headers.length > 1 ? `
                <button onclick="deleteDataColumn('${chartDivId}', ${idx})" 
                        class="text-status-failed hover:text-red-700 p-1 flex-shrink-0" 
                        title="Delete column">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
                ` : ''}
            </div>
        </th>`;
    });
    // Delete column header (empty, no text)
    tableHTML += `<th class="px-2 py-2 border border-border-light font-semibold text-text-default text-center" style="min-width: ${deleteColumnWidth}px; width: ${deleteColumnWidth}px;"></th>`;
    tableHTML += '</tr></thead>';
    
    // Data rows - show all columns + delete column
    tableHTML += '<tbody>';
    rows.forEach((row, rowIdx) => {
        tableHTML += `<tr data-row="${rowIdx}">`;
        headers.forEach((_, colIdx) => {
            const value = row[colIdx] !== undefined ? row[colIdx] : '';
            tableHTML += `<td class="px-3 py-2 border border-border-light" style="width: ${columnWidth}px; min-width: ${columnWidth}px;">
                <input type="text" value="${value}" 
                       onchange="updateDataCell('${chartDivId}', ${rowIdx}, ${colIdx}, this.value)"
                       class="w-full bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-primary-brand px-1"
                       placeholder="Value">
            </td>`;
        });
        // Delete column
        tableHTML += `<td class="px-2 py-2 border border-border-light text-center" style="min-width: ${deleteColumnWidth}px; width: ${deleteColumnWidth}px;">
            <button onclick="deleteDataRow('${chartDivId}', ${rowIdx})" 
                    class="text-status-failed hover:text-red-700 p-1" 
                    title="Delete row">
                <span class="material-symbols-outlined text-sm">delete</span>
            </button>
        </td>`;
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';
    tableHTML += '</table>';
    
    container.innerHTML = tableHTML;
    
    // Update available columns in Advanced Options
    renderAvailableColumns();
}

// Update data header (renamed from updateCSVHeader)
function updateDataHeader(chartDivId, colIndex, newValue) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = getCurrentChartData(chartDivId);
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (widgetData && widgetData[0]) {
        widgetData[0][colIndex] = newValue;
        // Update global csvData for this widget only (for backward compatibility)
        window.csvData = widgetData;
        
        // CRITICAL: Update preview data immediately
        if (window.previewChartId) {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = [...widgetData];
            console.log('updateDataHeader: Updated preview data:', window.widgetData[window.previewChartId]);
        }
        
        updateChartFromData(chartDivId);
        // Also update canvas charts immediately
        updateCanvasCharts(chartDivId);
    }
}

// Update data cell (renamed from updateCSVCell)
function updateDataCell(chartDivId, rowIndex, colIndex, newValue) {
    console.log('updateDataCell called:', { chartDivId, rowIndex, colIndex, newValue });
    
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = getCurrentChartData(chartDivId);
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (widgetData && widgetData[rowIndex + 1]) {
        widgetData[rowIndex + 1][colIndex] = newValue;
        // Update global csvData for this widget only (for backward compatibility)
        window.csvData = widgetData;
        console.log('updateDataCell: Updated widgetData:', widgetData);
        
        // CRITICAL: Update preview data immediately
        if (window.previewChartId) {
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[window.previewChartId] = [...widgetData];
            console.log('updateDataCell: Updated preview data:', window.widgetData[window.previewChartId]);
        }
        
        // Immediately update preview
        updateChartFromData(chartDivId);
        // Also update canvas charts immediately
        updateCanvasCharts(chartDivId);
    } else {
        console.warn('updateDataCell: Invalid row index or csvData:', { rowIndex, csvDataLength: window.csvData?.length });
    }
}

// Add data column
function addDataColumn(chartDivId) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = [['Column 1']];
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (widgetData.length === 0) {
        widgetData.push(['Column 1']);
    }
    
    const headers = widgetData[0];
    const columnNumber = headers.length + 1;
    const newColumnName = `Column ${columnNumber}`;
    
    // Add new column header
    widgetData[0].push(newColumnName);
    
    // Add empty cells for all existing rows
    for (let i = 1; i < widgetData.length; i++) {
        widgetData[i].push('');
    }
    
    // Update global csvData for this widget only (for backward compatibility)
    window.csvData = widgetData;
    
    // CRITICAL: Update preview data immediately
    if (window.previewChartId) {
        if (!window.widgetData) {
            window.widgetData = {};
        }
        window.widgetData[window.previewChartId] = [...widgetData];
        console.log('addDataColumn: Updated preview data:', window.widgetData[window.previewChartId]);
    }
    
    renderDataTable(chartDivId);
    updateChartFromData(chartDivId);
    // Also update canvas charts immediately
    updateCanvasCharts(chartDivId);
}

// Add data row (renamed from addCSVRow)
function addDataRow(chartDivId) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = [['Column 1']];
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (widgetData.length === 0) {
        widgetData.push(['Column 1']);
    }
    
    const headers = widgetData[0];
    const newRow = headers.map(() => '');
    widgetData.push(newRow);
    
    // Update global csvData for this widget only (for backward compatibility)
    window.csvData = widgetData;
    
    // CRITICAL: Update preview data immediately
    if (window.previewChartId) {
        if (!window.widgetData) {
            window.widgetData = {};
        }
        window.widgetData[window.previewChartId] = [...widgetData];
        console.log('addDataRow: Updated preview data:', window.widgetData[window.previewChartId]);
    }
    
    renderDataTable(chartDivId);
    updateChartFromData(chartDivId);
    // Also update canvas charts immediately
    updateCanvasCharts(chartDivId);
}

// Delete data column
function deleteDataColumn(chartDivId, colIndex) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = getCurrentChartData(chartDivId);
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (!widgetData || widgetData.length === 0) {
        return;
    }
    
    // Don't allow deleting if only one column remains
    if (widgetData[0].length <= 1) {
        if (typeof showAlert === 'function') {
            showAlert('Cannot delete the last column. Table must have at least one column.', 'warning');
        }
        return;
    }
    
    // Remove column from all rows
    widgetData.forEach((row, rowIdx) => {
        if (row.length > colIndex) {
            row.splice(colIndex, 1);
        }
    });
    
    // Update global csvData for this widget only (for backward compatibility)
    window.csvData = widgetData;
    
    renderDataTable(chartDivId);
    updateChartFromData(chartDivId);
    // Also update canvas charts immediately
    updateCanvasCharts(chartDivId);
}

// Delete data row (renamed from deleteCSVRow)
function deleteDataRow(chartDivId, rowIndex) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data or initialize
    if (!window.widgetData[chartDivId]) {
        window.widgetData[chartDivId] = getCurrentChartData(chartDivId);
    }
    
    const widgetData = window.widgetData[chartDivId];
    
    if (widgetData && widgetData.length > rowIndex + 1) {
        widgetData.splice(rowIndex + 1, 1);
        // Update global csvData for this widget only (for backward compatibility)
        window.csvData = widgetData;
    renderDataTable(chartDivId);
    updateChartFromData(chartDivId);
    // Also update canvas charts immediately
    updateCanvasCharts(chartDivId);
}
}

// Update chart from data (renamed from updateChartFromCSV)
function updateChartFromData(chartDivId) {
    // Initialize widget-specific data storage
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget-specific data
    let widgetData = window.widgetData[chartDivId];
    if (!widgetData) {
        // Fallback to global csvData for backward compatibility
        widgetData = window.csvData;
        if (widgetData) {
            window.widgetData[chartDivId] = widgetData;
        }
    }
    
    // Update global csvData for this widget only (for backward compatibility)
    window.csvData = widgetData;
    
    // Store data for preview using previewChartId - ALWAYS update preview data
    if (window.previewChartId) {
        if (!window.widgetData) {
            window.widgetData = {};
        }
        window.widgetData[window.previewChartId] = widgetData ? [...widgetData] : widgetData;
        console.log('updateChartFromData: Updated preview data:', window.widgetData[window.previewChartId]);
    }
    
    // If no data or insufficient data, still update preview but don't render chart
    if (!widgetData || widgetData.length < 2) {
        console.log('updateChartFromData: No data or insufficient data, but preview data updated');
        // Still try to update preview with empty/partial data
        if (window.previewChartId && typeof renderChart === 'function') {
            const chartType = window.currentChartSettings?.chartType || null;
            if (chartType) {
                setTimeout(() => {
                    renderChart(chartType, window.previewChartId);
                }, 50);
            }
        }
        return;
    }
    
    const headers = widgetData[0];
    const rows = widgetData.slice(1);
    
    console.log('updateChartFromData: Updating with data:', { headers, rows });
    
    // Update sample data - ensure it's accessible globally
    // Update all columns dynamically, not just first 3
    if (headers.length > 0) {
        // Ensure window.sampleData exists
        if (typeof window.sampleData === 'undefined') {
            window.sampleData = {
                Kategori: [],
                Deger: [],
                Satis: []
            };
        }
        
        // Update all columns dynamically
        headers.forEach((header, colIndex) => {
            if (colIndex === 0) {
                window.sampleData.Kategori = rows.map(row => String(row[colIndex] || ''));
            } else if (colIndex === 1) {
                window.sampleData.Deger = rows.map(row => parseFloat(row[colIndex]) || 0);
            } else if (colIndex === 2) {
                window.sampleData.Satis = rows.map(row => parseFloat(row[colIndex]) || 0);
            }
            // Store all columns dynamically
            window.sampleData[header] = rows.map(row => {
                const val = row[colIndex];
                const numVal = parseFloat(val);
                return isNaN(numVal) ? String(val || '') : numVal;
            });
        });
        
        console.log('Updated window.sampleData:', window.sampleData);
        
        // Also update design.js sampleData directly if accessible (for backward compatibility)
        if (typeof sampleData !== 'undefined' && sampleData !== window.sampleData) {
            headers.forEach((header, colIndex) => {
                if (colIndex === 0) {
                    sampleData.Kategori = rows.map(row => String(row[colIndex] || ''));
                } else if (colIndex === 1) {
                    sampleData.Deger = rows.map(row => parseFloat(row[colIndex]) || 0);
                } else if (colIndex === 2) {
                    sampleData.Satis = rows.map(row => parseFloat(row[colIndex]) || 0);
                }
                sampleData[header] = rows.map(row => {
                    const val = row[colIndex];
                    const numVal = parseFloat(val);
                    return isNaN(numVal) ? String(val || '') : numVal;
                });
            });
            console.log('Updated design.js sampleData:', sampleData);
        }
    }
    
    // Update preview chart immediately
    if (window.previewChartId && typeof renderChart === 'function') {
        // Get chart type from current chart settings or from original chart widget
        let chartType = null;
        
        if (window.currentChartSettings && window.currentChartSettings.chartType) {
            chartType = window.currentChartSettings.chartType;
        } else {
            const chartWidget = document.getElementById(chartDivId)?.closest('.chart-widget');
            if (chartWidget) {
                chartType = chartWidget.dataset.chartType;
            }
        }
        
        // Also try to get from originalChartDivId
        if (!chartType && window.originalChartDivId) {
            const chartWidget = document.getElementById(window.originalChartDivId)?.closest('.chart-widget');
            if (chartWidget) {
                chartType = chartWidget.dataset.chartType;
            }
        }
        
        console.log('updateChartFromData: Rendering chart type:', chartType, 'in preview:', window.previewChartId);
        
        if (chartType) {
            // Get preview container
            const previewContainer = document.getElementById(window.previewChartId);
            if (previewContainer) {
                // Destroy existing Plotly chart if exists
                if (typeof Plotly !== 'undefined') {
                    try {
                        Plotly.purge(window.previewChartId);
                    } catch (e) {
                        console.log('No existing Plotly chart to purge');
                    }
                }
                
                // Clear container
                previewContainer.innerHTML = '';
                
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    // Re-render preview chart with updated data
                    if (typeof renderChart === 'function') {
                        // CRITICAL: Ensure preview has the latest data BEFORE rendering
                        if (window.widgetData && window.widgetData[window.previewChartId]) {
                            window.csvData = window.widgetData[window.previewChartId];
                            console.log('updateChartFromData: Setting csvData for preview from previewChartId:', window.csvData);
                        } else if (window.widgetData && window.widgetData[chartDivId]) {
                            // Fallback: use chartDivId data for preview
                            window.csvData = window.widgetData[chartDivId];
                            if (!window.widgetData[window.previewChartId]) {
                                window.widgetData[window.previewChartId] = [...window.widgetData[chartDivId]];
                            }
                            console.log('updateChartFromData: Using chartDivId data for preview:', window.csvData);
                        }
                        renderChart(chartType, window.previewChartId);
                        console.log('updateChartFromData: Chart rendered successfully with data:', window.sampleData, 'csvData:', window.csvData, 'previewWidgetData:', window.widgetData[window.previewChartId]);
                        
                        // Adjust preview container size after chart renders
                        setTimeout(() => {
                            const previewContainer = document.getElementById('chartPreviewContainer');
                            const previewDiv = document.getElementById(window.previewChartId);
                            if (previewContainer && previewDiv) {
                                // Force a reflow to get accurate measurements
                                previewDiv.offsetHeight;
                                
                                const chartHeight = previewDiv.offsetHeight || previewDiv.scrollHeight || previewDiv.clientHeight;
                                if (chartHeight > 0) {
                                    // Set chart div height to match actual content
                                    previewDiv.style.height = chartHeight + 'px';
                                    previewDiv.style.minHeight = chartHeight + 'px';
                                    
                                    // Set container height to match chart height + padding
                                    const containerPadding = 32; // 16px top + 16px bottom
                                    previewContainer.style.height = (chartHeight + containerPadding) + 'px';
                                    previewContainer.style.minHeight = (chartHeight + containerPadding) + 'px';
                                    previewContainer.style.maxHeight = (chartHeight + containerPadding) + 'px';
                                }
                            }
                        }, 800);
                    } else {
                        console.error('updateChartFromData: renderChart function not available');
                    }
                }, 50);
            } else {
                console.error('updateChartFromData: Preview container not found:', window.previewChartId);
            }
        } else {
            console.warn('updateChartFromData: Chart type not found');
        }
    } else {
        console.warn('updateChartFromData: Preview chart ID or renderChart function not available', {
            previewChartId: window.previewChartId,
            renderChartExists: typeof renderChart === 'function'
        });
    }
    
    // Update all slicer widgets with new data
    if (typeof window.updateAllSlicerWidgets === 'function') {
        setTimeout(() => {
            window.updateAllSlicerWidgets();
        }, 100);
    }
    
    // Also update all charts on canvas if they exist
    updateCanvasCharts(chartDivId);
}

// Update canvas charts with current data and settings
function updateCanvasCharts(chartDivId) {
    if (typeof renderChart !== 'function') return;
    
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Get current chart settings for the chart being edited
    const currentChartDiv = document.getElementById(chartDivId);
    const currentWidget = currentChartDiv?.closest('.chart-widget');
    const currentWidgetId = currentWidget?.dataset.widgetId;
    
    // Copy preview settings to canvas widget if it's the same widget
    if (window.previewChartId && window.chartSettings && window.chartSettings[window.previewChartId]) {
        const previewSettings = window.chartSettings[window.previewChartId];
        
        // Find the canvas widget that matches the current chart
        const chartWidgets = canvas.querySelectorAll('.chart-widget');
        chartWidgets.forEach(widget => {
            const widgetChartType = widget.dataset.chartType;
            const widgetChartDiv = widget.querySelector('[id^="chart-"]');
            const widgetId = widget.dataset.widgetId;
            
            if (widgetChartDiv && widgetChartType) {
                // If this is the widget being edited, update it with current settings
                if (currentWidgetId && widgetId === currentWidgetId) {
                    // Copy preview settings to canvas widget
                    if (!window.chartSettings) {
                        window.chartSettings = {};
                    }
                    window.chartSettings[widgetChartDiv.id] = { ...previewSettings };
                    
                    // Update preview data for this widget
                    if (window.widgetData && window.widgetData[chartDivId]) {
                        if (!window.widgetData[widgetChartDiv.id]) {
                            window.widgetData[widgetChartDiv.id] = [];
                        }
                        window.widgetData[widgetChartDiv.id] = window.widgetData[chartDivId];
                    }
                    
                    // Update canvas chart with current settings
                    setTimeout(() => {
                        if (typeof Plotly !== 'undefined') {
                            try {
                                Plotly.purge(widgetChartDiv.id);
                            } catch (e) {
                                // Ignore purge errors
                            }
                        }
                        widgetChartDiv.innerHTML = '';
                        renderChart(widgetChartType, widgetChartDiv.id);
                    }, 50);
                }
            }
        });
    }
}

// Export data table
function exportDataTable(chartDivId) {
    if (!window.csvData) {
        window.csvData = getCurrentChartData(chartDivId);
    }
    
    const csv = window.csvData.map(row => row.join(',')).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-data-${chartDivId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Parse Excel file (updated to work with new data source system)
function parseExcelFile(file, chartDivId, isFromUpload = false) {
    if (isFromUpload) {
        // Store original data before file upload
        if (!window.originalChartData) {
            window.originalChartData = getCurrentChartData(chartDivId);
        }
        
        // Update UI
        const fileNameEl = document.getElementById('currentFileName');
        const removeBtn = document.getElementById('removeFileBtn');
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (removeBtn) removeBtn.classList.remove('hidden');
        window.currentDataFile = file.name;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            
            // Convert to array format
            if (jsonData && jsonData.length > 0) {
                window.csvData = jsonData;
                
                // Update data table
                renderDataTable(chartDivId);
                
                // Immediately update preview chart
                updateChartFromData(chartDivId);
            }
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            alert('Error parsing Excel file: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// Test SQL query (placeholder)
// This function is replaced by the one above - keeping for backward compatibility
// The main testSQLQuery function is now async and handles data updates

// Apply SQL query (placeholder)
function applySQLQuery(chartDivId) {
    const query = document.getElementById('sqlQuery')?.value || '';
    if (!query.trim()) {
        alert('Please enter a SQL query');
        return;
    }
    
    // Store SQL query
    if (!window.chartSQLQueries) {
        window.chartSQLQueries = {};
    }
    window.chartSQLQueries[chartDivId] = query;
    
    alert('SQL query saved. Query execution will be implemented later.');
}

// Close chart settings modal
function closeChartSettingsModal() {
    const modal = document.querySelector('.chart-settings-modal');
    if (modal) {
        modal.remove();
    }
    window.currentChartSettings = null;
    
    // Note: Widget header and resize handles remain hidden
    // They will be shown again when user clicks on the widget
}

// Render preview chart
function renderPreviewChart(chartType, originalChartDivId, chartData) {
    const previewContainer = document.getElementById('chartPreviewContainer');
    if (!previewContainer) return;
    
    // Create a temporary chart div for preview
    const previewChartId = 'preview-chart-' + Date.now();
    const previewDiv = document.createElement('div');
    previewDiv.id = previewChartId;
    previewDiv.style.width = '100%';
    previewDiv.style.height = 'auto';
    previewDiv.style.minHeight = 'auto';
    previewDiv.style.maxHeight = '260px';
    previewDiv.style.overflow = 'hidden';
    previewContainer.innerHTML = '';
    previewContainer.style.height = 'auto';
    previewContainer.style.minHeight = 'auto';
    previewContainer.style.maxHeight = '280px';
    previewContainer.appendChild(previewDiv);
    
    // Store preview settings
    if (!window.chartSettings) {
        window.chartSettings = {};
    }
    
    // Get current bar chart type for bar charts
    const barChartType = (chartType === 'bar' && window.currentBarChartType) ? window.currentBarChartType : 'basic';
    // Get current line chart type for line charts
    const lineChartType = (chartType === 'line' && window.currentLineChartType) ? window.currentLineChartType : 'single';
    // Get current area chart type for area charts
    const areaChartType = (chartType === 'area' && window.currentAreaChartType) ? window.currentAreaChartType : 'simple';
    
    // Copy widgetData from original chart to preview BEFORE creating settings
    if (!window.widgetData) {
        window.widgetData = {};
    }
    
    // Get widget data from original chart
    const widget = document.getElementById(originalChartDivId)?.closest('.chart-widget');
    const widgetId = widget?.dataset?.widgetId;
    let originalWidgetData = null;
    
    if (window.widgetData[originalChartDivId]) {
        originalWidgetData = window.widgetData[originalChartDivId];
    } else if (widgetId && window.widgetData[widgetId]) {
        originalWidgetData = window.widgetData[widgetId];
    }
    
    // Copy data to preview
    if (originalWidgetData) {
        window.widgetData[previewChartId] = Array.isArray(originalWidgetData) ? [...originalWidgetData] : originalWidgetData;
        window.csvData = Array.isArray(originalWidgetData) ? [...originalWidgetData] : originalWidgetData;
    }
    
    // Copy chart settings from original chart
    let originalSettings = {};
    if (window.chartSettings && window.chartSettings[originalChartDivId]) {
        originalSettings = window.chartSettings[originalChartDivId];
    } else if (widgetId && window.chartSettings && window.chartSettings[widgetId]) {
        originalSettings = window.chartSettings[widgetId];
    }
    
    window.chartSettings[previewChartId] = {
        colors: chartData.colors || originalSettings.colors,
        bgColor: chartData.bgColor || originalSettings.bgColor,
        textColor: chartData.textColor || originalSettings.textColor,
        marginTop: chartData.marginTop || originalSettings.marginTop,
        marginRight: chartData.marginRight || originalSettings.marginRight,
        marginBottom: chartData.marginBottom || originalSettings.marginBottom,
        marginLeft: chartData.marginLeft || originalSettings.marginLeft,
        showLegend: chartData.showLegend !== undefined ? chartData.showLegend : originalSettings.showLegend,
        showGrid: chartData.showGrid !== undefined ? chartData.showGrid : originalSettings.showGrid,
        showLabels: chartData.showLabels !== undefined ? chartData.showLabels : originalSettings.showLabels,
        xAxisColumn: originalSettings.xAxisColumn,
        yAxisColumn: originalSettings.yAxisColumn,
        zAxisColumn: originalSettings.zAxisColumn,
        availableColumns: originalSettings.availableColumns,
        widgetData: originalSettings.widgetData,
        barChartType: barChartType || originalSettings.barChartType, // Store bar chart type
        scatterChartType: (chartType === 'scatter' && window.currentScatterChartType) ? window.currentScatterChartType : (originalSettings.scatterChartType || 'simple'), // Store scatter chart type
        pieChartType: (chartType === 'pie' && window.currentPieChartType) ? window.currentPieChartType : (originalSettings.pieChartType || 'simple'),
        lineChartType: lineChartType || originalSettings.lineChartType,
        areaChartType: areaChartType || originalSettings.areaChartType
    };
    
    // Render chart with chart type if applicable
    if (typeof renderChart === 'function') {
        if (chartType === 'bar' && typeof renderBarChartWithType === 'function') {
            // Use special bar chart renderer
            renderBarChartWithType(previewChartId, barChartType);
        } else if (chartType === 'scatter' && typeof renderScatterChartWithType === 'function' && window.currentScatterChartType) {
            // Use special scatter chart renderer
            renderScatterChartWithType(previewChartId, window.currentScatterChartType);
        } else if (chartType === 'list' && typeof renderListChartWithType === 'function' && window.currentListChartType) {
            // Use special list chart renderer
            renderListChartWithType(previewChartId, window.currentListChartType);
        } else if (chartType === 'pie' && typeof renderPieChartWithType === 'function' && window.currentPieChartType) {
            // Use special pie chart renderer
            renderPieChartWithType(previewChartId, window.currentPieChartType);
        } else {
        renderChart(chartType, previewChartId);
        }
        
        // After chart renders, adjust container size to fit chart content
        setTimeout(() => {
            const chartDiv = document.getElementById(previewChartId);
            if (chartDiv && previewContainer) {
                // Force a reflow to get accurate measurements
                chartDiv.offsetHeight;
                
                // Get the actual rendered chart height
                const chartHeight = chartDiv.offsetHeight || chartDiv.scrollHeight || chartDiv.clientHeight;
                
                if (chartHeight > 0) {
                    // Set chart div height to match actual content
                    previewDiv.style.height = chartHeight + 'px';
                    previewDiv.style.minHeight = chartHeight + 'px';
                    
                    // Set container height to match chart height + padding (p-4 = 16px top + 16px bottom = 32px)
                    const containerPadding = 32; // 16px top + 16px bottom
                    previewContainer.style.height = (chartHeight + containerPadding) + 'px';
                    previewContainer.style.minHeight = (chartHeight + containerPadding) + 'px';
                    previewContainer.style.maxHeight = (chartHeight + containerPadding) + 'px';
                }
            }
        }, 800);
    }
    
    // Store preview chart ID for updates
    window.previewChartId = previewChartId;
    window.originalChartDivId = originalChartDivId;
}

// Setup realtime updates
function setupRealtimeUpdates(chartType, chartDivId) {
    // Color inputs - update on both input and change
    ['chartColor1', 'chartColor2', 'chartBgColor', 'chartTextColor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => updatePreviewRealtime(chartType));
            el.addEventListener('change', () => updatePreviewRealtime(chartType));
        }
    });
    
    // Number inputs - update on input
    ['chartWidth', 'chartHeight', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'fontSize'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => updatePreviewRealtime(chartType));
            el.addEventListener('change', () => updatePreviewRealtime(chartType));
        }
    });
    
    // Text inputs - update on input (for real-time typing)
    ['chartTitle', 'xAxisLabel', 'yAxisLabel', 'zAxisLabel', 'xAxisColumn', 'yAxisColumn', 'zAxisColumn', 'textBoxContent'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => updatePreviewRealtime(chartType));
            el.addEventListener('change', () => updatePreviewRealtime(chartType));
        }
    });
    
    // Checkboxes - update on change
    ['showLegend', 'showGrid', 'showLabels'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => updatePreviewRealtime(chartType));
        }
    });
    
    // Chart-specific color inputs - update on change (for all chart types)
    for (let i = 0; i < 10; i++) {
        const colorInput = document.getElementById(`chartSpecificColor${i}`);
        if (colorInput) {
            colorInput.addEventListener('input', () => updatePreviewRealtime(chartType));
            colorInput.addEventListener('change', () => updatePreviewRealtime(chartType));
        }
    }
}

// Update preview in realtime
function updatePreviewRealtime(chartType) {
    if (!window.previewChartId) return;
    
    const previewChartId = window.previewChartId;
    
    // Get current settings from form - try preview IDs first, fallback to old IDs
    const color1El = document.getElementById('chartColor1Preview') || document.getElementById('chartColor1');
    const color2El = document.getElementById('chartColor2Preview') || document.getElementById('chartColor2');
    const bgColorEl = document.getElementById('chartBgColorPreview') || document.getElementById('chartBgColor');
    const textColorEl = document.getElementById('chartTextColorPreview') || document.getElementById('chartTextColor');
    const widthEl = document.getElementById('chartWidthPreview') || document.getElementById('chartWidth');
    const heightEl = document.getElementById('chartHeightPreview') || document.getElementById('chartHeight');
    const marginTopEl = document.getElementById('marginTopPreview') || document.getElementById('marginTop');
    const marginRightEl = document.getElementById('marginRightPreview') || document.getElementById('marginRight');
    const marginBottomEl = document.getElementById('marginBottomPreview') || document.getElementById('marginBottom');
    const marginLeftEl = document.getElementById('marginLeftPreview') || document.getElementById('marginLeft');
    const showLegendEl = document.getElementById('showLegendPreview') || document.getElementById('showLegend');
    const showGridEl = document.getElementById('showGridPreview') || document.getElementById('showGrid');
    const showLabelsEl = document.getElementById('showLabelsPreview') || document.getElementById('showLabels');
    const chartTitleEl = document.getElementById('chartTitlePreview') || document.getElementById('chartTitle');
    const xAxisLabelEl = document.getElementById('xAxisLabelPreview') || document.getElementById('xAxisLabel');
    const yAxisLabelEl = document.getElementById('yAxisLabelPreview') || document.getElementById('yAxisLabel');
    const zAxisLabelEl = document.getElementById('zAxisLabelPreview') || document.getElementById('zAxisLabel');
    const xAxisColumnEl = document.getElementById('xAxisColumnPreview') || document.getElementById('xAxisColumn');
    const yAxisColumnEl = document.getElementById('yAxisColumnPreview') || document.getElementById('yAxisColumn');
    const zAxisColumnEl = document.getElementById('zAxisColumnPreview') || document.getElementById('zAxisColumn');
    const fontSizeEl = document.getElementById('fontSizePreview') || document.getElementById('fontSize');
    
    // Update preview container size dynamically based on chart content
    const previewContainer = document.getElementById('chartPreviewContainer');
    const previewDiv = document.getElementById(previewChartId);
    if (previewContainer && previewDiv) {
        if (widthEl && widthEl.value) {
            previewContainer.style.width = widthEl.value + 'px';
        }
        
        // After chart updates, adjust container height to match chart content (but limit max height)
        setTimeout(() => {
            const chartHeight = previewDiv.offsetHeight || previewDiv.scrollHeight || previewDiv.clientHeight;
            const maxChartHeight = 260;
            const maxContainerHeight = 280;
            const actualChartHeight = Math.min(chartHeight, maxChartHeight);
            if (actualChartHeight > 0) {
                previewDiv.style.height = actualChartHeight + 'px';
                previewDiv.style.minHeight = actualChartHeight + 'px';
                previewDiv.style.maxHeight = maxChartHeight + 'px';
                previewDiv.style.overflow = 'hidden';
                const containerPadding = 16; // 8px top + 8px bottom (p-2)
                const containerHeight = Math.min(actualChartHeight + containerPadding, maxContainerHeight);
                previewContainer.style.height = containerHeight + 'px';
                previewContainer.style.minHeight = containerHeight + 'px';
                previewContainer.style.maxHeight = maxContainerHeight + 'px';
            }
        }, 300);
    }
    
    // Update settings
    if (!window.chartSettings) {
        window.chartSettings = {};
    }
    
    // Collect chart-specific colors - try preview IDs first
    const chartSpecificColors = [];
    for (let i = 0; i < 10; i++) {
        const colorInput = document.getElementById(`chartSpecificColor${i}Preview`) || document.getElementById(`chartSpecificColor${i}`);
        if (colorInput) {
            chartSpecificColors.push(colorInput.value);
        }
    }
    
    // Get current bar chart type for bar charts
    const currentBarChartType = (chartType === 'bar' && window.currentBarChartType) ? window.currentBarChartType : 'basic';
    
    window.chartSettings[previewChartId] = {
        colors: [
            color1El ? color1El.value : '#007bff',
            color2El ? color2El.value : '#28a745'
        ],
        chartColors: chartSpecificColors.length > 0 ? chartSpecificColors : [
            color1El ? color1El.value : '#007bff',
            color2El ? color2El.value : '#28a745',
            '#ffc107',
            '#dc3545'
        ],
        bgColor: bgColorEl ? bgColorEl.value : '#ffffff',
        textColor: textColorEl ? textColorEl.value : '#000000',
        marginTop: marginTopEl ? parseInt(marginTopEl.value) || 20 : 20,
        marginRight: marginRightEl ? parseInt(marginRightEl.value) || 20 : 20,
        marginBottom: marginBottomEl ? parseInt(marginBottomEl.value) || 40 : 40,
        marginLeft: marginLeftEl ? parseInt(marginLeftEl.value) || 40 : 40,
        showLegend: showLegendEl ? showLegendEl.checked : true,
        showGrid: showGridEl ? showGridEl.checked : true,
        showLabels: showLabelsEl ? showLabelsEl.checked : false,
        title: chartTitleEl ? chartTitleEl.value : '',
        xAxisLabel: xAxisLabelEl ? xAxisLabelEl.value : '',
        yAxisLabel: yAxisLabelEl ? yAxisLabelEl.value : '',
        zAxisLabel: zAxisLabelEl ? zAxisLabelEl.value : '',
        fontSize: fontSizeEl ? parseInt(fontSizeEl.value) || 12 : 12,
        // Axis columns - prioritize direct column selection
        xAxisColumn: xAxisColumnEl ? xAxisColumnEl.value : null,
        yAxisColumn: yAxisColumnEl ? yAxisColumnEl.value : null,
        zAxisColumn: zAxisColumnEl ? zAxisColumnEl.value : null,
        barChartType: currentBarChartType, // Store bar chart type
        lineChartType: (chartType === 'line' && window.currentLineChartType) ? window.currentLineChartType : 'single', // Store line chart type
        areaChartType: (chartType === 'area' && window.currentAreaChartType) ? window.currentAreaChartType : 'simple', // Store area chart type
        scatterChartType: (chartType === 'scatter' && window.currentScatterChartType) ? window.currentScatterChartType : 'simple', // Store scatter chart type
        cardChartType: (chartType === 'card' && window.currentCardChartType) ? window.currentCardChartType : 'basic', // Store card chart type
        treemapChartType: (chartType === 'treemap' && window.currentTreemapChartType) ? window.currentTreemapChartType : 'basic', // Store treemap chart type
        tableChartType: (chartType === 'table' && window.currentTableChartType) ? window.currentTableChartType : 'basic', // Store table chart type
        listChartType: (chartType === 'list' && window.currentListChartType) ? window.currentListChartType : 'basic', // Store list chart type
        pieChartType: (chartType === 'pie' && window.currentPieChartType) ? window.currentPieChartType : 'simple' // Store pie chart type
    };
    
    // If axis columns are not set but labels match column names, use labels as columns
    if (window.csvData && window.csvData.length > 0) {
        const columns = window.csvData[0] || [];
        const xLabel = xAxisLabelEl ? xAxisLabelEl.value : '';
        const yLabel = yAxisLabelEl ? yAxisLabelEl.value : '';
        const zLabel = zAxisLabelEl ? zAxisLabelEl.value : '';
        
        if (!window.chartSettings[previewChartId].xAxisColumn && columns.includes(xLabel)) {
            window.chartSettings[previewChartId].xAxisColumn = xLabel;
        }
        if (!window.chartSettings[previewChartId].yAxisColumn && columns.includes(yLabel)) {
            window.chartSettings[previewChartId].yAxisColumn = yLabel;
        }
        if (!window.chartSettings[previewChartId].zAxisColumn && columns.includes(zLabel)) {
            window.chartSettings[previewChartId].zAxisColumn = zLabel;
        }
    }
    
    // Re-render preview chart immediately
    if (typeof renderChart === 'function') {
        // Ensure preview has the latest data from current chartDivId
        if (window.currentChartSettings && window.currentChartSettings.chartDivId) {
            const currentChartDivId = window.currentChartSettings.chartDivId;
            if (window.widgetData && window.widgetData[currentChartDivId]) {
                // Copy data to preview
                if (!window.widgetData) {
                    window.widgetData = {};
                }
                window.widgetData[previewChartId] = window.widgetData[currentChartDivId];
                window.csvData = window.widgetData[currentChartDivId];
            }
        }
        
        // For bar charts, use bar chart type
        if (chartType === 'bar' && typeof renderBarChartWithType === 'function' && window.currentBarChartType) {
            renderBarChartWithType(previewChartId, window.currentBarChartType);
        } else if (chartType === 'line' && typeof renderLineChartWithType === 'function' && window.currentLineChartType) {
            // For line charts, use line chart type
            renderLineChartWithType(previewChartId, window.currentLineChartType);
        } else if (chartType === 'area' && typeof renderAreaChartWithType === 'function' && window.currentAreaChartType) {
            // For area charts, use area chart type
            renderAreaChartWithType(previewChartId, window.currentAreaChartType);
        } else if (chartType === 'scatter' && typeof renderScatterChartWithType === 'function' && window.currentScatterChartType) {
            // For scatter charts, use scatter chart type
            renderScatterChartWithType(previewChartId, window.currentScatterChartType);
        } else if (chartType === 'card' && typeof renderCardChartWithType === 'function' && window.currentCardChartType) {
            // For card charts, use card chart type
            renderCardChartWithType(previewChartId, window.currentCardChartType);
        } else if (chartType === 'treemap' && typeof renderTreemapChartWithType === 'function' && window.currentTreemapChartType) {
            // For treemap charts, use treemap chart type
            renderTreemapChartWithType(previewChartId, window.currentTreemapChartType);
        } else if (chartType === 'table' && typeof renderTableChartWithType === 'function' && window.currentTableChartType) {
            // For table charts, use table chart type
            renderTableChartWithType(previewChartId, window.currentTableChartType);
        } else if (chartType === 'list' && typeof renderListChartWithType === 'function' && window.currentListChartType) {
            // For list charts, use list chart type
            renderListChartWithType(previewChartId, window.currentListChartType);
        } else if (chartType === 'pie' && typeof renderPieChartWithType === 'function' && window.currentPieChartType) {
            // For pie charts, use pie chart type
            renderPieChartWithType(previewChartId, window.currentPieChartType);
        } else {
        renderChart(chartType, previewChartId);
        }
    }
    
    // Also update canvas charts
    if (window.currentChartSettings && window.currentChartSettings.chartDivId) {
        updateCanvasCharts(window.currentChartSettings.chartDivId);
    }
}

// Send chat message (with AI integration)
async function sendChatMessage(chartType, chartDivId) {
    const input = document.getElementById('chatInput');
    const messagesContainer = document.getElementById('chatMessages');
    
    if (!input || !input.value.trim() || !messagesContainer) return;
    
    // Check if AI service is selected
    if (!window.selectedAIServiceId) {
        alert('Please select an AI service first');
        return;
    }
    
    const message = input.value.trim();
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'flex justify-end';
    userMsg.innerHTML = `
        <div class="bg-purple-600 text-white rounded-lg p-3 max-w-[80%] text-xs shadow-sm">
            ${message}
        </div>
    `;
    messagesContainer.appendChild(userMsg);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Show loading indicator
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'flex justify-start';
    loadingMsg.id = 'aiLoadingMessage';
    loadingMsg.innerHTML = `
        <div class="bg-white/80 backdrop-blur-sm border border-purple-200 text-purple-900 rounded-lg p-3 max-w-[80%] text-xs shadow-sm">
            <p class="font-semibold mb-1 text-purple-900">${window.selectedAIServiceName || 'AI Assistant'}</p>
            <p>Thinking...</p>
        </div>
    `;
    messagesContainer.appendChild(loadingMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    try {
        // Get current chart settings and data
        const chartSettings = window.chartSettings?.[window.previewChartId] || {};
        
        // Get data based on selected data source
        let chartData = null;
        const dataSource = window.selectedAIDataSource;
        
        if (dataSource === 'file-upload') {
            chartData = window.csvData || getCurrentChartData(chartDivId);
        } else if (dataSource === 'sql-query') {
            chartData = window.csvData || getCurrentChartData(chartDivId);
        } else if (dataSource && dataSource.startsWith('db-')) {
            const dbServiceId = dataSource.replace('db-', '');
            // Use data from specific DB service
            chartData = window.csvData || getCurrentChartData(chartDivId);
        } else {
            // Default: use current data
            chartData = window.csvData || getCurrentChartData(chartDivId);
        }
        
        // Prepare data source info
        const dataSourceInfo = {
            type: dataSource || 'current',
            serviceId: dataSource && dataSource.startsWith('db-') ? dataSource.replace('db-', '') : null
        };
        
        // Call AI API (handle "all" services case)
        const serviceId = window.selectedAIServiceId === 'all' ? null : window.selectedAIServiceId;
        const apiUrl = serviceId 
            ? `http://localhost:5000/api/linked-services/${serviceId}/chat`
            : 'http://localhost:5000/api/ai/chat-all'; // Placeholder for all services endpoint
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                chartType: chartType,
                chartSettings: chartSettings,
                chartData: chartData,
                dataSource: dataSourceInfo
            })
        });
        
        if (!response.ok) {
            throw new Error('AI service request failed');
        }
        
        const result = await response.json();
        
        // Remove loading message
        loadingMsg.remove();
        
        // Add AI response
        const aiMsg = document.createElement('div');
        aiMsg.className = 'flex justify-start';
        aiMsg.innerHTML = `
            <div class="bg-white/80 backdrop-blur-sm border border-purple-200 text-purple-900 rounded-lg p-3 max-w-[80%] text-xs shadow-sm">
                <p class="font-semibold mb-1 text-purple-900">${window.selectedAIServiceName || 'AI Assistant'}</p>
                <p class="text-purple-800">${result.response || result.message || 'No response received'}</p>
            </div>
        `;
        messagesContainer.appendChild(aiMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error calling AI service:', error);
        
        // Remove loading message
        loadingMsg.remove();
        
        // Show error message
        const errorMsg = document.createElement('div');
        errorMsg.className = 'flex justify-start';
        errorMsg.innerHTML = `
            <div class="bg-red-100 text-red-700 rounded-lg p-2 max-w-[80%] text-xs">
                <p class="font-semibold mb-1">Error</p>
                <p>Failed to get AI response. Please check your AI service configuration or try again later.</p>
            </div>
        `;
        messagesContainer.appendChild(errorMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Get chart data from widget
function getChartData(chartWidget) {
    if (!chartWidget) {
        return {
            colors: ['#007bff', '#28a745'],
            bgColor: '#ffffff',
            textColor: '#000000',
            width: 400,
            height: 250,
            marginTop: 20,
            marginRight: 20,
            marginBottom: 40,
            marginLeft: 40,
            showLegend: true,
            showGrid: true,
            showLabels: false
        };
    }
    
    // Try to get existing settings
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    if (chartDiv && window.chartSettings && window.chartSettings[chartDiv.id]) {
        const settings = window.chartSettings[chartDiv.id];
        return {
            colors: settings.colors || ['#007bff', '#28a745'],
            chartColors: settings.chartColors || settings.colors || ['#007bff', '#28a745', '#ffc107', '#dc3545'],
            bgColor: settings.bgColor || '#ffffff',
            textColor: settings.textColor || '#000000',
            width: parseInt(chartWidget.style.width) || 400,
            height: parseInt(chartDiv.style.height) || 250,
            marginTop: settings.marginTop || 20,
            marginRight: settings.marginRight || 20,
            marginBottom: settings.marginBottom || 40,
            marginLeft: settings.marginLeft || 40,
            showLegend: settings.showLegend !== undefined ? settings.showLegend : true,
            showGrid: settings.showGrid !== undefined ? settings.showGrid : true,
            showLabels: settings.showLabels !== undefined ? settings.showLabels : false,
            title: settings.title || '',
            xAxisLabel: settings.xAxisLabel || '',
            yAxisLabel: settings.yAxisLabel || '',
            zAxisLabel: settings.zAxisLabel || '',
            fontSize: settings.fontSize || 12,
            xAxisColumn: settings.xAxisColumn || null,
            yAxisColumn: settings.yAxisColumn || null,
            zAxisColumn: settings.zAxisColumn || null,
            barChartType: settings.barChartType || null,
            lineChartType: settings.lineChartType || null,
            areaChartType: settings.areaChartType || null,
            scatterChartType: settings.scatterChartType || null,
            cardChartType: settings.cardChartType || null,
            treemapChartType: settings.treemapChartType || null,
            tableChartType: settings.tableChartType || null,
            pieChartType: settings.pieChartType || null,
            textContent: settings.textContent || ''
        };
    }
    
    // Default values
    return {
        colors: ['#007bff', '#28a745'],
        bgColor: '#ffffff',
        textColor: '#000000',
        width: 400,
        height: 250,
        marginTop: 20,
        marginRight: 20,
        marginBottom: 40,
        marginLeft: 40,
        showLegend: true,
        showGrid: true,
        showLabels: false
    };
}

// Apply chart settings
function applyChartSettings(chartType, chartDivId, widgetId) {
    try {
        // Try preview IDs first, fallback to old IDs for backward compatibility
        const color1El = document.getElementById('chartColor1Preview') || document.getElementById('chartColor1');
        const color2El = document.getElementById('chartColor2Preview') || document.getElementById('chartColor2');
        const bgColorEl = document.getElementById('chartBgColorPreview') || document.getElementById('chartBgColor');
        const textColorEl = document.getElementById('chartTextColorPreview') || document.getElementById('chartTextColor');
        const widthEl = document.getElementById('chartWidthPreview') || document.getElementById('chartWidth');
        const heightEl = document.getElementById('chartHeightPreview') || document.getElementById('chartHeight');
        const marginTopEl = document.getElementById('marginTopPreview') || document.getElementById('marginTop');
        const marginRightEl = document.getElementById('marginRightPreview') || document.getElementById('marginRight');
        const marginBottomEl = document.getElementById('marginBottomPreview') || document.getElementById('marginBottom');
        const marginLeftEl = document.getElementById('marginLeftPreview') || document.getElementById('marginLeft');
        const showLegendEl = document.getElementById('showLegendPreview') || document.getElementById('showLegend');
        const showGridEl = document.getElementById('showGridPreview') || document.getElementById('showGrid');
        const showLabelsEl = document.getElementById('showLabelsPreview') || document.getElementById('showLabels');
        
        if (!color1El || !color2El) {
            if (typeof showAlert === 'function') {
                showAlert('Settings form not found', 'error');
            } else {
                alert('Settings form not found');
            }
            return;
        }
        
        // Collect chart-specific colors (try preview first)
        const chartSpecificColors = [];
        for (let i = 0; i < 10; i++) {
            const colorInput = document.getElementById(`chartSpecificColor${i}Preview`) || document.getElementById(`chartSpecificColor${i}`);
            if (colorInput) {
                chartSpecificColors.push(colorInput.value);
            }
        }
        
        const colors = [
            color1El.value,
            color2El.value
        ];
        const bgColor = bgColorEl ? bgColorEl.value : '#ffffff';
        const textColor = textColorEl ? textColorEl.value : '#000000';
        const width = widthEl ? parseInt(widthEl.value) : 400;
        const height = heightEl ? parseInt(heightEl.value) : 250;
        const marginTop = marginTopEl ? parseInt(marginTopEl.value) : 20;
        const marginRight = marginRightEl ? parseInt(marginRightEl.value) : 20;
        const marginBottom = marginBottomEl ? parseInt(marginBottomEl.value) : 40;
        const marginLeft = marginLeftEl ? parseInt(marginLeftEl.value) : 40;
        const showLegend = showLegendEl ? showLegendEl.checked : true;
        const showGrid = showGridEl ? showGridEl.checked : true;
        const showLabels = showLabelsEl ? showLabelsEl.checked : false;
        
        // Get advanced options (try preview IDs first)
        const chartTitleEl = document.getElementById('chartTitlePreview') || document.getElementById('chartTitle');
        const xAxisLabelEl = document.getElementById('xAxisLabelPreview') || document.getElementById('xAxisLabel');
        const yAxisLabelEl = document.getElementById('yAxisLabelPreview') || document.getElementById('yAxisLabel');
        const zAxisLabelEl = document.getElementById('zAxisLabelPreview') || document.getElementById('zAxisLabel');
        const xAxisColumnEl = document.getElementById('xAxisColumnPreview') || document.getElementById('xAxisColumn');
        const yAxisColumnEl = document.getElementById('yAxisColumnPreview') || document.getElementById('yAxisColumn');
        const zAxisColumnEl = document.getElementById('zAxisColumnPreview') || document.getElementById('zAxisColumn');
        const fontSizeEl = document.getElementById('fontSizePreview') || document.getElementById('fontSize');
        
        const title = chartTitleEl ? chartTitleEl.value : '';
        const xAxisLabel = xAxisLabelEl ? xAxisLabelEl.value : '';
        const yAxisLabel = yAxisLabelEl ? yAxisLabelEl.value : '';
        const zAxisLabel = zAxisLabelEl ? zAxisLabelEl.value : '';
        const xAxisColumn = xAxisColumnEl ? xAxisColumnEl.value : null;
        const yAxisColumn = yAxisColumnEl ? yAxisColumnEl.value : null;
        const zAxisColumn = zAxisColumnEl ? zAxisColumnEl.value : null;
        const fontSize = fontSizeEl ? parseInt(fontSizeEl.value) || 12 : 12;
        
        // Update chart widget size
        const chartWidget = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (chartWidget) {
            chartWidget.style.width = `${width}px`;
            const chartDiv = chartWidget.querySelector(`#${chartDivId}`);
            if (chartDiv) {
                chartDiv.style.height = `${height}px`;
            }
        }
        
        // Store settings for re-rendering
        if (!window.chartSettings) {
            window.chartSettings = {};
        }
        // Get bar chart type if it's a bar chart
        const barChartType = (chartType === 'bar' && window.currentBarChartType) ? window.currentBarChartType : 'basic';
        // Get line chart type if it's a line chart
        const lineChartType = (chartType === 'line' && window.currentLineChartType) ? window.currentLineChartType : 'single';
        // Get area chart type if it's an area chart
        const areaChartType = (chartType === 'area' && window.currentAreaChartType) ? window.currentAreaChartType : 'simple';
        // Get scatter chart type if it's a scatter chart
        const scatterChartType = (chartType === 'scatter' && window.currentScatterChartType) ? window.currentScatterChartType : 'simple';
        // Get card chart type if it's a card chart
        const cardChartType = (chartType === 'card' && window.currentCardChartType) ? window.currentCardChartType : 'basic';
        // Get treemap chart type if it's a treemap chart
        const treemapChartType = (chartType === 'treemap' && window.currentTreemapChartType) ? window.currentTreemapChartType : 'basic';
        // Get table chart type if it's a table chart
        const tableChartType = (chartType === 'table' && window.currentTableChartType) ? window.currentTableChartType : 'basic';
        // Get list chart type if it's a list chart
        const listChartType = (chartType === 'list' && window.currentListChartType) ? window.currentListChartType : 'basic';
        // Get pie chart type if it's a pie chart
        const pieChartType = (chartType === 'pie' && window.currentPieChartType) ? window.currentPieChartType : 'simple';
        
        window.chartSettings[chartDivId] = {
            colors,
            chartColors: chartSpecificColors.length > 0 ? chartSpecificColors : colors,
            bgColor,
            backgroundColor: chartType === 'text-box' ? bgColor : undefined, // For text-box, use bgColor as backgroundColor
            textColor,
            marginTop,
            marginRight,
            marginBottom,
            marginLeft,
            showLegend,
            showGrid,
            showLabels,
            title,
            xAxisLabel,
            yAxisLabel,
            zAxisLabel,
            xAxisColumn,
            yAxisColumn,
            zAxisColumn,
            fontSize,
            barChartType: chartType === 'bar' ? barChartType : undefined, // Store bar chart type for bar charts
            lineChartType: chartType === 'line' ? lineChartType : undefined, // Store line chart type for line charts
            areaChartType: chartType === 'area' ? areaChartType : undefined, // Store area chart type for area charts
            scatterChartType: chartType === 'scatter' ? scatterChartType : undefined, // Store scatter chart type for scatter charts
            cardChartType: chartType === 'card' ? cardChartType : undefined, // Store card chart type for card charts
            treemapChartType: chartType === 'treemap' ? treemapChartType : undefined, // Store treemap chart type for treemap charts
            tableChartType: chartType === 'table' ? tableChartType : undefined, // Store table chart type for table charts
            listChartType: chartType === 'list' ? listChartType : undefined, // Store list chart type for list charts
            pieChartType: chartType === 'pie' ? pieChartType : undefined, // Store pie chart type for pie charts
            textContent: chartType === 'text-box' ? ((document.getElementById('textBoxContentPreview') || document.getElementById('textBoxContent'))?.value || '') : undefined,
            pythonCode: chartType === 'python' ? ((document.getElementById('pythonCodePreview') || document.getElementById('pythonCode'))?.value || '') : undefined
        };
        
        // Re-render chart with new settings
        if (typeof renderChart === 'function') {
            // Pass bar chart type to renderChart if it's a bar chart
            if (chartType === 'bar') {
                renderChart(chartType, chartDivId, null, null, barChartType);
            } else if (chartType === 'line') {
                // Pass line chart type to renderChart if it's a line chart
                renderChart(chartType, chartDivId, null, null, null, lineChartType);
            } else if (chartType === 'area') {
                // Pass area chart type to renderChart if it's an area chart
                renderChart(chartType, chartDivId, null, null, null, null, areaChartType);
            } else if (chartType === 'scatter') {
                // Pass scatter chart type to renderChart if it's a scatter chart
                renderChart(chartType, chartDivId, null, null, null, null, null, null, scatterChartType);
            } else if (chartType === 'card') {
                // Pass card chart type to renderChart if it's a card chart
                renderChart(chartType, chartDivId, null, null, null, null, null, null, null, cardChartType);
            } else if (chartType === 'list') {
                // Pass list chart type to renderChart if it's a list chart
                // If hierarchy, use 'hierarchy-list' chart type, otherwise 'list'
                const actualChartType = listChartType === 'hierarchy' ? 'hierarchy-list' : 'list';
                renderChart(actualChartType, chartDivId);
            } else if (chartType === 'pie') {
                // Pass pie chart type to renderChart if it's a pie chart
                renderChart(chartType, chartDivId, null, null, null, null, null, pieChartType);
            } else {
            renderChart(chartType, chartDivId);
            }
        }
        
        // Close modal
        closeChartSettingsModal();
        
        if (typeof showAlert === 'function') {
            showAlert('Chart settings applied', 'success');
        } else {
            alert('Chart settings applied');
        }
    } catch (error) {
        console.error('Error applying chart settings:', error);
        if (typeof showAlert === 'function') {
            showAlert('Error applying settings: ' + error.message, 'error');
        } else {
            alert('Error applying settings: ' + error.message);
        }
    }
}

// Render chart with custom settings
function renderChartWithSettings(chartType, containerId, settings) {
    // This will be called from design.js to re-render with new settings
    if (window.renderChartWithCustomSettings) {
        window.renderChartWithCustomSettings(chartType, containerId, settings);
    }
}


// Update chart data from Excel
function updateChartDataFromExcel(chartDivId, excelData) {
    // First row is headers, rest are data
    if (excelData.length < 2) {
        showAlert('Excel file must have at least 2 rows (header + data)', 'error');
        return;
    }
    
    const headers = excelData[0];
    const rows = excelData.slice(1);
    
    // Store Excel data globally
    window.excelChartData = {
        chartDivId,
        headers,
        rows
    };
    
    // Update sample data
    if (headers.length >= 3) {
        sampleData.Kategori = rows.map(row => row[0] || '');
        sampleData.Deger = rows.map(row => parseFloat(row[1]) || 0);
        sampleData.Satis = rows.map(row => parseFloat(row[2]) || 0);
    }
    
    // Re-render chart
    const chartWidget = document.getElementById(chartDivId)?.closest('.chart-widget');
    if (chartWidget) {
        const chartType = chartWidget.dataset.chartType;
        renderChart(chartType, chartDivId);
    }
}

// Export chart data
function exportChartData(chartDivId) {
    const chartWidget = document.getElementById(chartDivId)?.closest('.chart-widget');
    if (!chartWidget) return;
    
    const chartType = chartWidget.dataset.chartType;
    const data = getCurrentChartData(chartDivId);
    
    // Create Excel file
    if (typeof XLSX === 'undefined') {
        showAlert('Please wait for Excel library to load', 'error');
        return;
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
    XLSX.writeFile(wb, `chart-data-${chartType}.xlsx`);
    showAlert('Chart data exported', 'success');
}

// Get current chart data
function getCurrentChartData(chartDivId) {
    if (window.excelChartData && window.excelChartData.chartDivId === chartDivId) {
        return [
            window.excelChartData.headers,
            ...window.excelChartData.rows
        ];
    }
    
    // Default data
    return [
        ['Kategori', 'Deger', 'Satis'],
        ...sampleData.Kategori.map((k, i) => [k, sampleData.Deger[i], sampleData.Satis[i]])
    ];
}

// ==================== DRAG & DROP FOR AXIS COLUMNS ====================

// Handle column drag start
function handleColumnDragStart(event, columnName) {
    event.dataTransfer.setData('text/plain', columnName);
    event.dataTransfer.effectAllowed = 'copy';
    // Set opacity on the dragged element
    if (event.target.classList.contains('draggable-column')) {
        event.target.style.opacity = '0.5';
    } else if (event.target.classList.contains('draggable-column-badge')) {
        event.target.style.opacity = '0.5';
    } else {
        // If it's a child element (like icon), set opacity on parent
        const badge = event.target.closest('.draggable-column-badge');
        if (badge) badge.style.opacity = '0.5';
    }
}

// Allow drop on axis zones
function allowDrop(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('border-primary-brand', 'bg-primary-brand-light');
}

// Handle drag leave
function handleDragLeave(event) {
    event.currentTarget.classList.remove('border-primary-brand', 'bg-primary-brand-light');
}

// Handle axis drop
function handleAxisDrop(event, axisType) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-primary-brand', 'bg-primary-brand-light');
    
    const columnName = event.dataTransfer.getData('text/plain');
    if (columnName) {
        const inputId = axisType === 'x' ? 'xAxisColumn' : axisType === 'y' ? 'yAxisColumn' : 'zAxisColumn';
        const input = document.getElementById(inputId);
        if (input) {
            input.value = columnName;
            onAxisColumnChange(axisType, columnName);
        }
    }
    
    // Reset drag opacity
    document.querySelectorAll('.draggable-column').forEach(el => {
        el.style.opacity = '1';
    });
}

// Handle axis column drop
function handleAxisColumnDrop(event, axisType) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-primary-brand', 'bg-primary-brand-light');
    
    const columnName = event.dataTransfer.getData('text/plain');
    if (columnName) {
        // Try preview IDs first, fallback to old IDs
        const inputId = axisType === 'x' ? 'xAxisColumnPreview' : axisType === 'y' ? 'yAxisColumnPreview' : 'zAxisColumnPreview';
        const input = document.getElementById(inputId) || document.getElementById(axisType === 'x' ? 'xAxisColumn' : axisType === 'y' ? 'yAxisColumn' : 'zAxisColumn');
        if (input) {
            input.value = columnName;
            onAxisColumnChange(axisType, columnName);
        }
    }
    
    // Reset drag opacity
    document.querySelectorAll('.draggable-column').forEach(el => {
        el.style.opacity = '1';
    });
    document.querySelectorAll('.draggable-column-badge').forEach(el => {
        el.style.opacity = '1';
    });
}

// Handle axis column change (manual input or drag & drop)
function onAxisColumnChange(axisType, columnName) {
    if (!window.currentChartSettings) return;
    
    const chartDivId = window.currentChartSettings.chartDivId;
    const chartType = window.currentChartSettings.chartType;
    
    // Update chart settings
    if (!window.chartSettings) window.chartSettings = {};
    if (!window.chartSettings[chartDivId]) window.chartSettings[chartDivId] = {};
    
    if (axisType === 'x') {
        window.chartSettings[chartDivId].xAxisColumn = columnName;
    } else if (axisType === 'y') {
        window.chartSettings[chartDivId].yAxisColumn = columnName;
    } else if (axisType === 'z') {
        window.chartSettings[chartDivId].zAxisColumn = columnName;
    }
    
    // Update preview chart immediately
    if (window.previewChartId) {
        updatePreviewRealtime(chartType);
    }
}

// Render available columns in Advanced Options
function renderAvailableColumns() {
    // Helper function to check if columns are empty or just default "Column 1"
    function isEmptyOrDefault(columns) {
        if (!columns || columns.length === 0) return true;
        // Check if it's just the default "Column 1" with no real data
        if (columns.length === 1 && (columns[0] === 'Column 1' || columns[0] === '' || !columns[0])) {
            // Also check if there's actual data rows (not just headers)
            if (window.csvData && window.csvData.length <= 1) {
                return true; // Only headers, no data rows
            }
        }
        // Filter out empty column names
        const validColumns = columns.filter(col => col && col.trim() !== '');
        return validColumns.length === 0;
    }
    
    // Render in preview section
    const previewContainer = document.getElementById('availableColumnsListPreview');
    if (previewContainer) {
    // Get columns from csvData
    let columns = [];
    if (window.csvData && window.csvData.length > 0) {
        columns = window.csvData[0] || [];
    }
    
        // Filter out empty column names
        columns = columns.filter(col => col && col.trim() !== '');
        
        if (isEmptyOrDefault(columns)) {
            previewContainer.innerHTML = '<span class="text-xs text-text-muted">No columns available</span>';
        } else {
    // Render draggable column badges
            previewContainer.innerHTML = columns.map(column => `
        <span 
            class="draggable-column-badge inline-flex items-center gap-1 px-3 py-1.5 bg-surface-light border border-border-light rounded-md text-xs text-text-default cursor-move hover:bg-gray-100 transition-colors"
            draggable="true"
            ondragstart="handleColumnDragStart(event, '${column}')"
            title="Drag to X-Axis Column, Y-Axis Column, Z-Axis Column, X-Axis Label, Y-Axis Label, or Z-Axis Label"
        >
            <span class="material-symbols-outlined text-sm">drag_indicator</span>
            ${column}
        </span>
    `).join('');
        }
    }
    
    // Also render in old location for backward compatibility (if exists)
    const oldContainer = document.getElementById('availableColumnsList');
    if (oldContainer) {
        let columns = [];
        if (window.csvData && window.csvData.length > 0) {
            columns = window.csvData[0] || [];
        }
        
        // Filter out empty column names
        columns = columns.filter(col => col && col.trim() !== '');
        
        if (isEmptyOrDefault(columns)) {
            oldContainer.innerHTML = '<span class="text-xs text-text-muted">No columns available</span>';
        } else {
            oldContainer.innerHTML = columns.map(column => `
                <span 
                    class="draggable-column-badge inline-flex items-center gap-1 px-3 py-1.5 bg-surface-light border border-border-light rounded-md text-xs text-text-default cursor-move hover:bg-gray-100 transition-colors"
                    draggable="true"
                    ondragstart="handleColumnDragStart(event, '${column}')"
                    title="Drag to X-Axis Column, Y-Axis Column, Z-Axis Column, X-Axis Label, Y-Axis Label, or Z-Axis Label"
                >
                    <span class="material-symbols-outlined text-sm">drag_indicator</span>
                    ${column}
                </span>
            `).join('');
        }
    }
}

// Handle axis label drop
function handleAxisLabelDrop(event, axisType) {
    event.preventDefault();
    event.currentTarget.classList.remove('border-primary-brand', 'bg-primary-brand-light');
    
    const columnName = event.dataTransfer.getData('text/plain');
    if (columnName) {
        // Try preview IDs first, fallback to old IDs
        const inputId = axisType === 'x' ? 'xAxisLabelPreview' : axisType === 'y' ? 'yAxisLabelPreview' : 'zAxisLabelPreview';
        const input = document.getElementById(inputId) || document.getElementById(axisType === 'x' ? 'xAxisLabel' : axisType === 'y' ? 'yAxisLabel' : 'zAxisLabel');
        if (input) {
            input.value = columnName;
            onAxisLabelChange(axisType, columnName);
        }
    }
    
    // Reset drag opacity
    document.querySelectorAll('.draggable-column').forEach(el => {
        el.style.opacity = '1';
    });
    document.querySelectorAll('.draggable-column-badge').forEach(el => {
        el.style.opacity = '1';
    });
}

// Handle axis label change (manual input or drag & drop)
function onAxisLabelChange(axisType, labelValue) {
    if (!window.currentChartSettings) return;
    
    const chartDivId = window.currentChartSettings.chartDivId;
    const chartType = window.currentChartSettings.chartType;
    
    // Update chart settings
    if (!window.chartSettings) window.chartSettings = {};
    if (!window.chartSettings[chartDivId]) window.chartSettings[chartDivId] = {};
    
    if (axisType === 'x') {
        window.chartSettings[chartDivId].xAxisLabel = labelValue;
        // Also update xAxisColumn if it matches a column name
        if (window.csvData && window.csvData.length > 0) {
            const columns = window.csvData[0] || [];
            if (columns.includes(labelValue)) {
                window.chartSettings[chartDivId].xAxisColumn = labelValue;
            }
        }
    } else if (axisType === 'y') {
        window.chartSettings[chartDivId].yAxisLabel = labelValue;
        // Also update yAxisColumn if it matches a column name
        if (window.csvData && window.csvData.length > 0) {
            const columns = window.csvData[0] || [];
            if (columns.includes(labelValue)) {
                window.chartSettings[chartDivId].yAxisColumn = labelValue;
            }
        }
    } else if (axisType === 'z') {
        window.chartSettings[chartDivId].zAxisLabel = labelValue;
        // Also update zAxisColumn if it matches a column name
        if (window.csvData && window.csvData.length > 0) {
            const columns = window.csvData[0] || [];
            if (columns.includes(labelValue)) {
                window.chartSettings[chartDivId].zAxisColumn = labelValue;
            }
        }
    }
    
    // Update preview chart immediately
    if (window.previewChartId) {
        updatePreviewRealtime(chartType);
    }
}

// ==================== COLOR TABS FUNCTIONALITY ====================

// Switch color tab
function switchColorTab(tabType, chartDivId) {
    // Hide all color tab contents
    document.querySelectorAll('.color-tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remove active class from all color tab buttons
    document.querySelectorAll('.color-tab-btn').forEach(btn => {
        btn.classList.remove('active', 'text-primary-brand', 'border-primary-brand');
        btn.classList.add('text-text-muted', 'border-transparent');
    });
    
    // Show selected tab content
    const selectedTab = document.getElementById(`color-tab-${tabType}`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[data-color-tab="${tabType}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active', 'text-primary-brand', 'border-primary-brand');
        selectedBtn.classList.remove('text-text-muted', 'border-transparent');
    }
}

// Render chart-specific colors based on chart type
function renderChartSpecificColors(chartType, chartDivId) {
    const container = document.getElementById('chartSpecificColors');
    if (!container) return;
    
    // Get settings from current chart settings or preview
    let settings = {};
    if (window.currentChartSettings && window.chartSettings) {
        const previewId = window.previewChartId;
        if (previewId && window.chartSettings[previewId]) {
            settings = window.chartSettings[previewId];
        } else if (window.chartSettings[chartDivId]) {
            settings = window.chartSettings[chartDivId];
        }
    }
    
    const chartColors = settings.chartColors || settings.colors || ['#007bff', '#28a745', '#ffc107', '#dc3545'];
    
    let colorsHTML = '';
    
    // Define color requirements for each chart type - ALL chart types included
    const colorConfigs = {
        'bar': [{ name: 'Bar Color', index: 0 }],
        'stacked-bar': [{ name: 'Series 1', index: 0 }, { name: 'Series 2', index: 1 }, { name: 'Series 3', index: 2 }, { name: 'Series 4', index: 3 }],
        'line': [{ name: 'Line Color', index: 0 }],
        'area': [{ name: 'Area Color', index: 0 }],
        'pie': [{ name: 'Color 1', index: 0 }, { name: 'Color 2', index: 1 }, { name: 'Color 3', index: 2 }, { name: 'Color 4', index: 3 }],
        'donut': [{ name: 'Color 1', index: 0 }, { name: 'Color 2', index: 1 }, { name: 'Color 3', index: 2 }, { name: 'Color 4', index: 3 }],
        'scatter': [{ name: 'Marker Color', index: 0 }],
        'histogram': [{ name: 'Bar Color', index: 0 }],
        'box': [{ name: 'Box Color', index: 0 }],
        'heatmap': [{ name: 'Color Scale', index: 0 }],
        'treemap': [{ name: 'Color 1', index: 0 }, { name: 'Color 2', index: 1 }, { name: 'Color 3', index: 2 }, { name: 'Color 4', index: 3 }],
        'waterfall': [{ name: 'Bar Color', index: 0 }],
        'gauge': [{ name: 'Gauge Color', index: 0 }],
        'funnel': [{ name: 'Funnel Color', index: 0 }],
        'bullet': [{ name: 'Bullet Color', index: 0 }],
        'radar': [{ name: 'Radar Color', index: 0 }],
        'sunburst': [{ name: 'Color 1', index: 0 }, { name: 'Color 2', index: 1 }, { name: 'Color 3', index: 2 }, { name: 'Color 4', index: 3 }],
        'sankey': [{ name: 'Link Color', index: 0 }],
        'chord': [{ name: 'Chord Color', index: 0 }],
        'parallel-coordinates': [{ name: 'Line Color', index: 0 }],
        'parallel-categories': [{ name: 'Line Color', index: 0 }],
        'density-heatmap': [{ name: 'Color Scale', index: 0 }],
        'calendar': [{ name: 'Color Scale', index: 0 }],
        'candlestick': [{ name: 'Candle Color', index: 0 }],
        'ohlc': [{ name: 'OHLC Color', index: 0 }],
        'table': [{ name: 'Header Color', index: 0 }, { name: 'Cell Color', index: 1 }],
        'image': [{ name: 'Border Color', index: 0 }],
        'text-box': [{ name: 'Text Color', index: 0 }, { name: 'Background Color', index: 1 }]
    };
    
    const config = colorConfigs[chartType] || [{ name: 'Color 1', index: 0 }];
    
    colorsHTML = '<div class="grid grid-cols-4 gap-3">';
    config.forEach(({ name, index }) => {
        const colorValue = chartColors[index] || '#007bff';
        colorsHTML += `
            <div>
                <label class="text-xs text-text-muted mb-1 block">${name}</label>
                <input 
                    type="color" 
                    id="chartSpecificColor${index}" 
                    value="${colorValue}" 
                    class="w-full h-10 border border-border-light rounded-md cursor-pointer"
                    onchange="onChartSpecificColorChange(${index}, this.value, '${chartDivId}')"
                    oninput="onChartSpecificColorChange(${index}, this.value, '${chartDivId}')"
                >
            </div>
        `;
    });
    colorsHTML += '</div>';
    
    container.innerHTML = colorsHTML;
}

// Handle chart-specific color change
function onChartSpecificColorChange(index, colorValue, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    
    // Update chart settings
    if (!window.chartSettings) window.chartSettings = {};
    if (!window.chartSettings[chartDivId]) window.chartSettings[chartDivId] = {};
    if (!window.chartSettings[chartDivId].chartColors) {
        window.chartSettings[chartDivId].chartColors = [...(window.chartSettings[chartDivId].colors || ['#007bff', '#28a745', '#ffc107', '#dc3545'])];
    }
    
    window.chartSettings[chartDivId].chartColors[index] = colorValue;
    
    // Update preview chart immediately
    if (window.previewChartId) {
        updatePreviewRealtime(chartType);
    }
    
    // Also update canvas charts immediately
    if (window.currentChartSettings && window.currentChartSettings.chartDivId) {
        updateCanvasCharts(window.currentChartSettings.chartDivId);
    }
}

// Auto assign general colors
function autoAssignGeneralColors(chartDivId) {
    const colors = ['#007bff', '#28a745', '#ffffff', '#000000'];
    
    document.getElementById('chartColor1').value = colors[0];
    document.getElementById('chartColor2').value = colors[1];
    document.getElementById('chartBgColor').value = colors[2];
    document.getElementById('chartTextColor').value = colors[3];
    
    // Trigger change events
    ['chartColor1', 'chartColor2', 'chartBgColor', 'chartTextColor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.dispatchEvent(new Event('input'));
            el.dispatchEvent(new Event('change'));
        }
    });
}

// Auto assign chart-specific colors
function autoAssignChartColors(chartType, chartDivId) {
    // Define auto color palettes for different chart types
    const colorPalettes = {
        'bar': ['#007bff'],
        'stacked-bar': ['#007bff', '#28a745'],
        'line': ['#007bff'],
        'area': ['#007bff'],
        'pie': ['#007bff', '#28a745', '#ffc107', '#dc3545'],
        'donut': ['#007bff', '#28a745', '#ffc107', '#dc3545'],
        'scatter': ['#007bff'],
        'histogram': ['#007bff'],
        'box': ['#007bff'],
        'heatmap': ['#007bff'],
        'treemap': ['#007bff', '#28a745', '#ffc107', '#dc3545'],
        'waterfall': ['#007bff']
    };
    
    const palette = colorPalettes[chartType] || ['#007bff'];
    
    palette.forEach((color, index) => {
        const input = document.getElementById(`chartSpecificColor${index}`);
        if (input) {
            input.value = color;
            onChartSpecificColorChange(index, color, chartDivId);
        }
    });
}

// ==================== PREVIEW COMMENTS & ANALYSIS ====================

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add preview comment
function addPreviewComment(chartDivId) {
    const input = document.getElementById('previewCommentInput');
    const commentsContainer = document.getElementById('previewComments');
    
    if (!input || !input.value.trim() || !commentsContainer) return;
    
    const comment = escapeHtml(input.value.trim());
    const timestamp = new Date().toLocaleTimeString();
    
    // Add user comment with unique ID
    const commentId = 'comment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const commentDiv = document.createElement('div');
    commentDiv.className = 'flex justify-end';
    commentDiv.id = commentId;
    commentDiv.dataset.commentText = comment;
    commentDiv.innerHTML = `
        <div class="bg-primary-brand text-white rounded-lg p-3 max-w-[85%] text-sm relative group">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <p class="font-semibold mb-1 text-sm">You</p>
                    <p class="comment-text text-sm">${comment}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs opacity-70">${timestamp}</span>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onclick="editComment('${commentId}')" class="p-1 hover:bg-white/20 rounded" title="Edit">
                            <span class="material-symbols-outlined text-xs">edit</span>
                        </button>
                        <button onclick="deleteComment('${commentId}')" class="p-1 hover:bg-white/20 rounded" title="Delete">
                            <span class="material-symbols-outlined text-xs">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    commentsContainer.appendChild(commentDiv);
    
    // Clear input
    input.value = '';
    
    // Scroll to bottom
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
}

// Show custom confirm dialog
function showConfirmDialog(message, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.id = 'customConfirmDialog';
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <h3 class="text-lg font-semibold text-text-default mb-4">Confirm</h3>
                <p class="text-text-default mb-6">${escapeHtml(message)}</p>
                <div class="flex justify-end gap-3">
                    <button onclick="closeCustomConfirmDialog(false)" class="px-4 py-2 border border-border-light rounded-md text-sm text-text-default hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onclick="closeCustomConfirmDialog(true)" class="px-4 py-2 bg-primary-brand text-white rounded-md text-sm hover:bg-primary-brand-hover">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    
    // Store callbacks
    window._confirmCallback = onConfirm;
    window._cancelCallback = onCancel;
}

// Close custom confirm dialog
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

// Show custom prompt dialog
function showPromptDialog(title, message, defaultValue, onConfirm, onCancel) {
    const dialog = document.createElement('div');
    dialog.id = 'customPromptDialog';
    dialog.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    dialog.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div class="p-6">
                <h3 class="text-lg font-semibold text-text-default mb-2">${escapeHtml(title)}</h3>
                <p class="text-sm text-text-muted mb-4">${escapeHtml(message)}</p>
                <input 
                    type="text" 
                    id="customPromptInput" 
                    value="${escapeHtml(defaultValue || '')}" 
                    class="w-full px-3 py-2 border border-border-light rounded-md text-sm focus:ring-primary-brand focus:border-primary-brand mb-4"
                    placeholder="Enter text..."
                >
                <div class="flex justify-end gap-3">
                    <button onclick="closeCustomPromptDialog(false)" class="px-4 py-2 border border-border-light rounded-md text-sm text-text-default hover:bg-gray-50">
                        Cancel
                    </button>
                    <button onclick="closeCustomPromptDialog(true)" class="px-4 py-2 bg-primary-brand text-white rounded-md text-sm hover:bg-primary-brand-hover">
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(dialog);
    
    // Focus input and select text
    setTimeout(() => {
        const input = document.getElementById('customPromptInput');
        if (input) {
            input.focus();
            input.select();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    closeCustomPromptDialog(true);
                } else if (e.key === 'Escape') {
                    closeCustomPromptDialog(false);
                }
            });
        }
    }, 100);
    
    // Store callbacks
    window._promptConfirmCallback = onConfirm;
    window._promptCancelCallback = onCancel;
}

// Close custom prompt dialog
function closeCustomPromptDialog(confirmed) {
    const dialog = document.getElementById('customPromptDialog');
    if (dialog) {
        const input = document.getElementById('customPromptInput');
        const value = input ? input.value : null;
        dialog.remove();
        if (confirmed && window._promptConfirmCallback) {
            window._promptConfirmCallback(value);
        } else if (!confirmed && window._promptCancelCallback) {
            window._promptCancelCallback();
        }
        window._promptConfirmCallback = null;
        window._promptCancelCallback = null;
    }
}

// Edit comment
function editComment(commentId) {
    const commentDiv = document.getElementById(commentId);
    if (!commentDiv) return;
    
    const commentTextEl = commentDiv.querySelector('.comment-text');
    if (!commentTextEl) return;
    
    const currentText = commentDiv.dataset.commentText || commentTextEl.textContent;
    
    showPromptDialog(
        'Edit Comment',
        'Edit your comment:',
        currentText,
        (newText) => {
            if (newText !== null && newText.trim() !== '') {
                const escapedText = escapeHtml(newText.trim());
                commentTextEl.innerHTML = escapedText;
                commentDiv.dataset.commentText = escapedText;
            }
        },
        () => {}
    );
}

// Delete comment
function deleteComment(commentId) {
    const commentDiv = document.getElementById(commentId);
    if (!commentDiv) return;
    
    showConfirmDialog(
        'Are you sure you want to delete this comment?',
        () => {
            commentDiv.remove();
        },
        () => {}
    );
}

// Switch between Comments and Analysis tabs
function switchCommentTab(tabType, chartDivId) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.comment-tab-btn');
    tabButtons.forEach(btn => {
        const tab = btn.dataset.commentTab;
        if (tab === tabType) {
            btn.classList.add('active', 'border-b-2', 'border-primary-brand', 'text-text-default');
            btn.classList.remove('text-text-muted');
        } else {
            btn.classList.remove('active', 'border-b-2', 'border-primary-brand', 'text-text-default');
            btn.classList.add('text-text-muted');
        }
    });
    
    // Show/hide tab content
    const designTab = document.getElementById('tab-design');
    const advancedOptionsTab = document.getElementById('tab-advanced-options');
    
    if (tabType === 'design') {
        if (designTab) designTab.classList.remove('hidden');
        if (advancedOptionsTab) advancedOptionsTab.classList.add('hidden');
    } else if (tabType === 'advanced-options') {
        if (designTab) designTab.classList.add('hidden');
        if (advancedOptionsTab) advancedOptionsTab.classList.remove('hidden');
    }
}

// Ask AI to analyze chart
async function askAIAnalysis(chartDivId) {
    const analysisContainer = document.getElementById('previewAnalysis');
    if (!analysisContainer) return;
    
    // Check if AI service is selected
    if (!window.selectedAIServiceId) {
        alert('Please select an AI service first');
        return;
    }
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'flex justify-start';
    loadingDiv.id = 'aiAnalysisLoading';
    loadingDiv.innerHTML = `
        <div class="bg-surface-light text-text-default rounded-lg p-3 max-w-[85%] text-sm">
            <p class="font-semibold mb-1 text-sm">AI Analysis</p>
            <p class="text-sm">Analyzing chart...</p>
        </div>
    `;
    analysisContainer.appendChild(loadingDiv);
    analysisContainer.scrollTop = analysisContainer.scrollHeight;
    
    try {
        // Get current chart settings and data
        const chartSettings = window.chartSettings?.[window.previewChartId] || {};
        const chartData = window.csvData || getCurrentChartData(chartDivId);
        const chartType = window.currentChartSettings?.chartType || 'bar';
        
        // Get data source info
        const dataSource = window.selectedAIDataSource || 'current';
        const dataSourceInfo = {
            type: dataSource,
            serviceId: dataSource && dataSource.startsWith('db-') ? dataSource.replace('db-', '') : null
        };
        
        // Prepare analysis request
        const analysisMessage = `Please analyze this chart and provide insights about the data, trends, and any recommendations. Chart type: ${chartType}`;
        
        // Call AI API
        const serviceId = window.selectedAIServiceId === 'all' ? null : window.selectedAIServiceId;
        const apiUrl = serviceId 
            ? `http://localhost:5000/api/linked-services/${serviceId}/chat`
            : 'http://localhost:5000/api/ai/chat-all';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: analysisMessage,
                chartType: chartType,
                chartSettings: chartSettings,
                chartData: chartData,
                dataSource: dataSourceInfo,
                analysisType: 'chart_analysis'
            })
        });
        
        if (!response.ok) {
            throw new Error('AI analysis failed');
        }
        
        const result = await response.json();
        const analysis = escapeHtml(result.analysis || result.message || 'Analysis completed');
        const timestamp = new Date().toLocaleTimeString();
        
        // Remove loading indicator
        const loadingEl = document.getElementById('aiAnalysisLoading');
        if (loadingEl) loadingEl.remove();
        
        // Add AI analysis comment with delete button
        const analysisId = 'analysis-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const analysisDiv = document.createElement('div');
        analysisDiv.className = 'flex justify-start';
        analysisDiv.id = analysisId;
        analysisDiv.innerHTML = `
            <div class="bg-green-50 border border-green-200 text-text-default rounded-lg p-3 max-w-[85%] text-sm relative group">
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                        <p class="font-semibold mb-1 text-green-700 flex items-center gap-1 text-sm">
                            <span class="material-symbols-outlined text-sm">auto_awesome</span>
                            AI Analysis
                        </p>
                        <p class="text-text-default text-sm">${analysis}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs opacity-70">${timestamp}</span>
                        <button onclick="deleteComment('${analysisId}')" class="p-1 hover:bg-green-100 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Delete">
                            <span class="material-symbols-outlined text-xs text-green-700">delete</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        analysisContainer.appendChild(analysisDiv);
        analysisContainer.scrollTop = analysisContainer.scrollHeight;
        
    } catch (error) {
        console.error('Error getting AI analysis:', error);
        
        // Remove loading indicator
        const loadingEl = document.getElementById('aiAnalysisLoading');
        if (loadingEl) loadingEl.remove();
        
        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'flex justify-start';
        errorDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 max-w-[85%] text-sm">
                <p class="font-semibold mb-1 text-sm">Error</p>
                <p class="text-sm">Failed to get AI analysis. Please try again.</p>
            </div>
        `;
        analysisContainer.appendChild(errorDiv);
        analysisContainer.scrollTop = analysisContainer.scrollHeight;
    }
}

// Run Python code
async function runPythonCode(chartDivId) {
    const codeTextarea = document.getElementById('pythonCode');
    if (!codeTextarea) {
        console.error('Python code textarea not found');
        return;
    }
    
    const code = codeTextarea.value.trim();
    if (!code) {
        alert('Lütfen Python kodu girin.');
        return;
    }
    
    const outputDiv = document.getElementById(`python-output-${chartDivId}`);
    if (!outputDiv) {
        console.error('Python output div not found');
        return;
    }
    
    // Show loading state
    outputDiv.innerHTML = '<div class="text-xs text-gray-500">Kod çalıştırılıyor...</div>';
    
    try {
        const response = await fetch('http://localhost:5000/api/python/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show output
            let outputHtml = '<div class="text-xs font-semibold text-green-700 mb-2">✓ Kod başarıyla çalıştırıldı</div>';
            if (result.output) {
                outputHtml += `<pre class="text-xs bg-white p-2 border rounded overflow-auto">${escapeHtml(result.output)}</pre>`;
            }
            outputDiv.innerHTML = outputHtml;
            
            // Update code display in chart widget
            const chartWidget = document.querySelector(`[data-widget-id="${window.currentChartSettings?.chartWidget?.dataset?.widgetId}"]`);
            if (chartWidget) {
                const codeDisplay = chartWidget.querySelector(`#python-code-display-${chartDivId}`);
                if (codeDisplay) {
                    codeDisplay.textContent = code;
                }
            }
        } else {
            // Show error
            let errorHtml = '<div class="text-xs font-semibold text-red-700 mb-2">✗ Kod çalıştırılırken hata oluştu</div>';
            if (result.error) {
                errorHtml += `<pre class="text-xs bg-red-50 p-2 border border-red-200 rounded overflow-auto text-red-700">${escapeHtml(result.error)}</pre>`;
            }
            outputDiv.innerHTML = errorHtml;
        }
    } catch (error) {
        console.error('Error running Python code:', error);
        outputDiv.innerHTML = `<div class="text-xs text-red-700">Hata: ${escapeHtml(error.message)}</div>`;
    }
}

// Clear Python output
function clearPythonOutput(chartDivId) {
    const outputDiv = document.getElementById(`python-output-${chartDivId}`);
    if (outputDiv) {
        outputDiv.innerHTML = '<div class="text-xs text-gray-500">Kodu çalıştırmak için "Run Code" butonuna tıklayın.</div>';
    }
}

// Load saved settings into input fields
function loadSavedSettingsIntoInputs(chartDivId, chartData) {
    // Load basic settings
    const color1El = document.getElementById('chartColor1Preview') || document.getElementById('chartColor1');
    const color2El = document.getElementById('chartColor2Preview') || document.getElementById('chartColor2');
    const bgColorEl = document.getElementById('chartBgColorPreview') || document.getElementById('chartBgColor');
    const textColorEl = document.getElementById('chartTextColorPreview') || document.getElementById('chartTextColor');
    const widthEl = document.getElementById('chartWidthPreview') || document.getElementById('chartWidth');
    const heightEl = document.getElementById('chartHeightPreview') || document.getElementById('chartHeight');
    const marginTopEl = document.getElementById('marginTopPreview') || document.getElementById('marginTop');
    const marginRightEl = document.getElementById('marginRightPreview') || document.getElementById('marginRight');
    const marginBottomEl = document.getElementById('marginBottomPreview') || document.getElementById('marginBottom');
    const marginLeftEl = document.getElementById('marginLeftPreview') || document.getElementById('marginLeft');
    const showLegendEl = document.getElementById('showLegendPreview') || document.getElementById('showLegend');
    const showGridEl = document.getElementById('showGridPreview') || document.getElementById('showGrid');
    const showLabelsEl = document.getElementById('showLabelsPreview') || document.getElementById('showLabels');
    
    // Load advanced options
    const chartTitleEl = document.getElementById('chartTitlePreview') || document.getElementById('chartTitle');
    const xAxisLabelEl = document.getElementById('xAxisLabelPreview') || document.getElementById('xAxisLabel');
    const yAxisLabelEl = document.getElementById('yAxisLabelPreview') || document.getElementById('yAxisLabel');
    const zAxisLabelEl = document.getElementById('zAxisLabelPreview') || document.getElementById('zAxisLabel');
    const xAxisColumnEl = document.getElementById('xAxisColumnPreview') || document.getElementById('xAxisColumn');
    const yAxisColumnEl = document.getElementById('yAxisColumnPreview') || document.getElementById('yAxisColumn');
    const zAxisColumnEl = document.getElementById('zAxisColumnPreview') || document.getElementById('zAxisColumn');
    const fontSizeEl = document.getElementById('fontSizePreview') || document.getElementById('fontSize');
    
    // Set values from chartData
    if (color1El && chartData.colors && chartData.colors[0]) color1El.value = chartData.colors[0];
    if (color2El && chartData.colors && chartData.colors[1]) color2El.value = chartData.colors[1];
    if (bgColorEl && chartData.bgColor) bgColorEl.value = chartData.bgColor;
    if (textColorEl && chartData.textColor) textColorEl.value = chartData.textColor;
    if (widthEl && chartData.width) widthEl.value = chartData.width;
    if (heightEl && chartData.height) heightEl.value = chartData.height;
    if (marginTopEl && chartData.marginTop !== undefined) marginTopEl.value = chartData.marginTop;
    if (marginRightEl && chartData.marginRight !== undefined) marginRightEl.value = chartData.marginRight;
    if (marginBottomEl && chartData.marginBottom !== undefined) marginBottomEl.value = chartData.marginBottom;
    if (marginLeftEl && chartData.marginLeft !== undefined) marginLeftEl.value = chartData.marginLeft;
    if (showLegendEl && chartData.showLegend !== undefined) showLegendEl.checked = chartData.showLegend;
    if (showGridEl && chartData.showGrid !== undefined) showGridEl.checked = chartData.showGrid;
    if (showLabelsEl && chartData.showLabels !== undefined) showLabelsEl.checked = chartData.showLabels;
    
    // Set advanced options
    if (chartTitleEl && chartData.title !== undefined) chartTitleEl.value = chartData.title;
    if (xAxisLabelEl && chartData.xAxisLabel !== undefined) xAxisLabelEl.value = chartData.xAxisLabel;
    if (yAxisLabelEl && chartData.yAxisLabel !== undefined) yAxisLabelEl.value = chartData.yAxisLabel;
    if (zAxisLabelEl && chartData.zAxisLabel !== undefined) zAxisLabelEl.value = chartData.zAxisLabel;
    if (xAxisColumnEl && chartData.xAxisColumn) xAxisColumnEl.value = chartData.xAxisColumn;
    if (yAxisColumnEl && chartData.yAxisColumn) yAxisColumnEl.value = chartData.yAxisColumn;
    if (zAxisColumnEl && chartData.zAxisColumn) zAxisColumnEl.value = chartData.zAxisColumn;
    if (fontSizeEl && chartData.fontSize) fontSizeEl.value = chartData.fontSize;
    
    // Load chart-specific colors
    if (chartData.chartColors && Array.isArray(chartData.chartColors)) {
        for (let i = 0; i < chartData.chartColors.length && i < 10; i++) {
            const colorInput = document.getElementById(`chartSpecificColor${i}Preview`) || document.getElementById(`chartSpecificColor${i}`);
            if (colorInput && chartData.chartColors[i]) {
                colorInput.value = chartData.chartColors[i];
            }
        }
    }
    
    // For bar charts, update bar chart type dots
    const chartType = window.currentChartSettings?.chartType;
    if (chartType === 'bar' && chartData.barChartType) {
        window.currentBarChartType = chartData.barChartType;
        
        // Update dot buttons
        document.querySelectorAll('.bar-chart-type-dot').forEach(dot => {
            if (dot.dataset.barType === chartData.barChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'basic': 'Basic Bar Chart',
            'grouped': 'Grouped / Clustered Bar Chart',
            'stacked': 'Stacked Bar Chart',
            'horizontal': 'Horizontal Bar Chart',
            'column': 'Column Bar Chart',
            'diverging': 'Diverging Bar Chart'
        };
        const labelEl = document.getElementById('barChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.barChartType] || 'Basic Bar Chart';
        }
        
        // Update z-axis visibility
        const showZAxis = chartData.barChartType === 'grouped' || chartData.barChartType === 'clustered' || chartData.barChartType === 'stacked';
        const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
        const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
        
        if (zAxisColumnDropZone) {
            const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
            if (zAxisColumnContainer) {
                zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
        
        if (zAxisLabelDropZone) {
            const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
            if (zAxisLabelContainer) {
                zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
    }
    
    // For line charts, update line chart type dots
    if (chartType === 'line' && chartData.lineChartType) {
        window.currentLineChartType = chartData.lineChartType;
        
        // Update dot buttons
        document.querySelectorAll('.line-chart-type-dot').forEach(dot => {
            if (dot.dataset.lineType === chartData.lineChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'single': 'Single Line Chart',
            'multi': 'Multi-line Chart',
            'cumulative': 'Cumulative Line Chart',
            'step': 'Step Line Chart',
            'dashed': 'Dashed / Forecast Line Chart',
            'indexed': 'Indexed (Normalized) Line Chart'
        };
        const labelEl = document.getElementById('lineChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.lineChartType] || 'Single Line Chart';
        }
        
        // Update z-axis visibility
        const showZAxis = chartData.lineChartType === 'multi';
        const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
        const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
        
        if (zAxisColumnDropZone) {
            const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
            if (zAxisColumnContainer) {
                zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
        
        if (zAxisLabelDropZone) {
            const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
            if (zAxisLabelContainer) {
                zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
    }
    
    // For area charts, update area chart type dots
    if (chartType === 'area' && chartData.areaChartType) {
        window.currentAreaChartType = chartData.areaChartType;
        
        // Update dot buttons
        document.querySelectorAll('.area-chart-type-dot').forEach(dot => {
            if (dot.dataset.areaType === chartData.areaChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'simple': 'Simple Area Chart',
            'stacked': 'Stacked Area Chart',
            'percent': '%100 Stacked Area Chart',
            'overlapping': 'Overlapping Area Chart',
            'step': 'Step Area Chart',
            'range': 'Range Area Chart'
        };
        const labelEl = document.getElementById('areaChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.areaChartType] || 'Simple Area Chart';
        }
        
        // Update z-axis visibility
        const showZAxis = chartData.areaChartType === 'stacked' || chartData.areaChartType === 'percent' || chartData.areaChartType === 'overlapping';
        const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
        const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
        
        if (zAxisColumnDropZone) {
            const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
            if (zAxisColumnContainer) {
                zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
        
        if (zAxisLabelDropZone) {
            const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
            if (zAxisLabelContainer) {
                zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
    }
    
    // For scatter charts, update scatter chart type dots
    if (chartType === 'scatter' && chartData.scatterChartType) {
        window.currentScatterChartType = chartData.scatterChartType;
        
        // Update dot buttons
        document.querySelectorAll('.scatter-chart-type-dot').forEach(dot => {
            if (dot.dataset.scatterType === chartData.scatterChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'simple': 'Simple Scatter Chart',
            'trendline': 'Scatter + Trendline',
            'bubble': 'Bubble Chart'
        };
        const labelEl = document.getElementById('scatterChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.scatterChartType] || 'Simple Scatter Chart';
        }
        
        // Update z-axis visibility
        const showZAxis = chartData.scatterChartType === 'bubble';
        const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
        const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
        
        if (zAxisColumnDropZone) {
            const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
            if (zAxisColumnContainer) {
                zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
        
        if (zAxisLabelDropZone) {
            const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
            if (zAxisLabelContainer) {
                zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
            }
        }
    }
    
    // For card charts, update card chart type dots
    if (chartType === 'card' && chartData.cardChartType) {
        window.currentCardChartType = chartData.cardChartType;
        
        // Update dot buttons
        document.querySelectorAll('.card-chart-type-dot').forEach(dot => {
            if (dot.dataset.cardType === chartData.cardChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'basic': 'Basic KPI Card',
            'comparison': 'KPI + Comparison Card',
            'percent': 'KPI + % Change Card',
            'target': 'Target / Goal Card',
            'status': 'Status / Threshold Card',
            'multi': 'Multi-metric Card'
        };
        const labelEl = document.getElementById('cardChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.cardChartType] || 'Basic KPI Card';
        }
    }
    
    // For list charts, update list chart type dots
    if (chartType === 'list' && chartData.listChartType) {
        window.currentListChartType = chartData.listChartType;
        
        // Update dot buttons
        document.querySelectorAll('.list-chart-type-dot').forEach(dot => {
            if (dot.dataset.listType === chartData.listChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'basic': 'Basic List',
            'hierarchy': 'Hierarchy List'
        };
        const labelEl = document.getElementById('listChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.listChartType] || 'Basic List';
        }
    }
    
    // For pie charts, update pie chart type dots
    if (chartType === 'pie' && chartData.pieChartType) {
        window.currentPieChartType = chartData.pieChartType;
        
        // Update dot buttons
        document.querySelectorAll('.pie-chart-type-dot').forEach(dot => {
            if (dot.dataset.pieType === chartData.pieChartType) {
                dot.classList.add('active', 'bg-primary-brand');
                dot.classList.remove('bg-gray-300');
            } else {
                dot.classList.remove('active', 'bg-primary-brand');
                dot.classList.add('bg-gray-300');
            }
        });
        
        // Update label
        const typeLabels = {
            'simple': 'Simple Pie Chart',
            'doughnut': 'Doughnut Chart',
            'exploded': 'Exploded Pie Chart'
        };
        const labelEl = document.getElementById('pieChartTypeLabel');
        if (labelEl) {
            labelEl.textContent = typeLabels[chartData.pieChartType] || 'Simple Pie Chart';
        }
    }
}

// Switch treemap chart type
function switchTreemapChartType(treemapType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'treemap') return;
    
    // Update current treemap chart type
    window.currentTreemapChartType = treemapType;
    
    // Update dot buttons
    document.querySelectorAll('.treemap-chart-type-dot').forEach(dot => {
        if (dot.dataset.treemapType === treemapType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'basic': 'Basic Treemap',
        'hierarchical': 'Hierarchical Treemap'
    };
    const labelEl = document.getElementById('treemapChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[treemapType] || 'Basic Treemap';
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderTreemapChartWithType === 'function') {
        renderTreemapChartWithType(window.previewChartId, treemapType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch table chart type
function switchTableChartType(tableType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'table') return;
    
    // Update current table chart type
    window.currentTableChartType = tableType;
    
    // Update dot buttons
    document.querySelectorAll('.table-chart-type-dot').forEach(dot => {
        if (dot.dataset.tableType === tableType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'basic': 'Basic Table',
        'summary': 'Summary / KPI Table',
        'pivot': 'Pivot Table',
        'matrix': 'Matrix Table',
        'ranking': 'Ranking Table'
    };
    const labelEl = document.getElementById('tableChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[tableType] || 'Basic Table';
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderTableChartWithType === 'function') {
        renderTableChartWithType(window.previewChartId, tableType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch pie chart type
function switchPieChartType(pieType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'pie') return;
    
    // Update current pie chart type
    window.currentPieChartType = pieType;
    
    // Update chart settings
    if (window.chartSettings && window.chartSettings[chartDivId]) {
        window.chartSettings[chartDivId].pieChartType = pieType;
    }
    if (window.previewChartId && window.chartSettings && window.chartSettings[window.previewChartId]) {
        window.chartSettings[window.previewChartId].pieChartType = pieType;
    }
    
    // Update dot buttons
    document.querySelectorAll('.pie-chart-type-dot').forEach(dot => {
        if (dot.dataset.pieType === pieType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'simple': 'Simple Pie Chart',
        'doughnut': 'Doughnut Chart',
        'exploded': 'Exploded Pie Chart'
    };
    const labelEl = document.getElementById('pieChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[pieType] || 'Simple Pie Chart';
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderPieChartWithType === 'function') {
        renderPieChartWithType(window.previewChartId, pieType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch list chart type
function switchListChartType(listType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'list') return;
    
    // Update current list chart type
    window.currentListChartType = listType;
    
    // Update dot buttons
    document.querySelectorAll('.list-chart-type-dot').forEach(dot => {
        if (dot.dataset.listType === listType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'basic': 'Basic List',
        'hierarchy': 'Hierarchy List'
    };
    const labelEl = document.getElementById('listChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[listType] || 'Basic List';
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderListChartWithType === 'function') {
        renderListChartWithType(window.previewChartId, listType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch area chart type
function switchAreaChartType(areaType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'area') return;
    
    // Update current area chart type
    window.currentAreaChartType = areaType;
    
    // Update chart settings
    if (window.chartSettings && window.chartSettings[chartDivId]) {
        window.chartSettings[chartDivId].areaChartType = areaType;
    }
    if (window.previewChartId && window.chartSettings && window.chartSettings[window.previewChartId]) {
        window.chartSettings[window.previewChartId].areaChartType = areaType;
    }
    
    // Update dot buttons
    document.querySelectorAll('.area-chart-type-dot').forEach(dot => {
        if (dot.dataset.areaType === areaType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'simple': 'Simple Area Chart',
        'stacked': 'Stacked Area Chart',
        'percent': '%100 Stacked Area Chart',
        'overlapping': 'Overlapping Area Chart',
        'step': 'Step Area Chart',
        'range': 'Range Area Chart'
    };
    const labelEl = document.getElementById('areaChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[areaType] || 'Simple Area Chart';
    }
    
    // Show/hide z-axis based on area chart type
    const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
    const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
    
    // Show z-axis for stacked, percent, and overlapping area charts
    const showZAxis = areaType === 'stacked' || areaType === 'percent' || areaType === 'overlapping';
    
    if (zAxisColumnDropZone) {
        const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
        if (zAxisColumnContainer) {
            zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    if (zAxisLabelDropZone) {
        const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
        if (zAxisLabelContainer) {
            zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderAreaChartWithType === 'function') {
        renderAreaChartWithType(window.previewChartId, areaType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch scatter chart type
function switchScatterChartType(scatterType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'scatter') return;
    
    // Update current scatter chart type
    window.currentScatterChartType = scatterType;
    
    // Update dot buttons
    document.querySelectorAll('.scatter-chart-type-dot').forEach(dot => {
        if (dot.dataset.scatterType === scatterType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'simple': 'Simple Scatter Chart',
        'trendline': 'Scatter + Trendline',
        'bubble': 'Bubble Chart'
    };
    const labelEl = document.getElementById('scatterChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[scatterType] || 'Simple Scatter Chart';
    }
    
    // Show/hide z-axis based on scatter chart type
    const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
    const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
    
    // Show z-axis only for bubble charts
    const showZAxis = scatterType === 'bubble';
    
    if (zAxisColumnDropZone) {
        const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
        if (zAxisColumnContainer) {
            zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    if (zAxisLabelDropZone) {
        const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
        if (zAxisLabelContainer) {
            zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderScatterChartWithType === 'function') {
        renderScatterChartWithType(window.previewChartId, scatterType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch card chart type
function switchCardChartType(cardType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'card') return;
    
    // Update current card chart type
    window.currentCardChartType = cardType;
    
    // Update dot buttons
    document.querySelectorAll('.card-chart-type-dot').forEach(dot => {
        if (dot.dataset.cardType === cardType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'basic': 'Basic KPI Card',
        'comparison': 'KPI + Comparison Card',
        'percent': 'KPI + % Change Card',
        'target': 'Target / Goal Card',
        'status': 'Status / Threshold Card',
        'multi': 'Multi-metric Card'
    };
    const labelEl = document.getElementById('cardChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[cardType] || 'Basic KPI Card';
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderCardChartWithType === 'function') {
        renderCardChartWithType(window.previewChartId, cardType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch line chart type
function switchLineChartType(lineType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'line') return;
    
    // Update current line chart type
    window.currentLineChartType = lineType;
    
    // Update dot buttons
    document.querySelectorAll('.line-chart-type-dot').forEach(dot => {
        if (dot.dataset.lineType === lineType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'single': 'Single Line Chart',
        'multi': 'Multi-line Chart',
        'cumulative': 'Cumulative Line Chart',
        'step': 'Step Line Chart',
        'dashed': 'Dashed / Forecast Line Chart',
        'indexed': 'Indexed (Normalized) Line Chart'
    };
    const labelEl = document.getElementById('lineChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[lineType] || 'Single Line Chart';
    }
    
    // Show/hide z-axis based on line chart type
    const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
    const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
    
    // Show z-axis for multi-line charts
    const showZAxis = lineType === 'multi';
    
    if (zAxisColumnDropZone) {
        const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
        if (zAxisColumnContainer) {
            zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    if (zAxisLabelDropZone) {
        const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
        if (zAxisLabelContainer) {
            zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderLineChartWithType === 'function') {
        renderLineChartWithType(window.previewChartId, lineType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Switch bar chart type
function switchBarChartType(barType, chartDivId) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'bar') return;
    
    // Update current bar chart type
    window.currentBarChartType = barType;
    
    // Update chart settings
    if (window.chartSettings && window.chartSettings[chartDivId]) {
        window.chartSettings[chartDivId].barChartType = barType;
    }
    if (window.previewChartId && window.chartSettings && window.chartSettings[window.previewChartId]) {
        window.chartSettings[window.previewChartId].barChartType = barType;
    }
    
    // Update dot buttons
    document.querySelectorAll('.bar-chart-type-dot').forEach(dot => {
        if (dot.dataset.barType === barType) {
            dot.classList.add('active', 'bg-primary-brand');
            dot.classList.remove('bg-gray-300');
        } else {
            dot.classList.remove('active', 'bg-primary-brand');
            dot.classList.add('bg-gray-300');
        }
    });
    
    // Update label
    const typeLabels = {
        'basic': 'Basic Bar Chart',
        'grouped': 'Grouped / Clustered Bar Chart',
        'stacked': 'Stacked Bar Chart',
        'horizontal': 'Horizontal Bar Chart',
        'column': 'Column Bar Chart',
        'diverging': 'Diverging Bar Chart'
    };
    const labelEl = document.getElementById('barChartTypeLabel');
    if (labelEl) {
        labelEl.textContent = typeLabels[barType] || 'Basic Bar Chart';
    }
    
    // Show/hide z-axis based on bar chart type
    // Find z-axis containers by finding the parent divs of the drop zones
    const zAxisColumnDropZone = document.getElementById('zAxisColumnDropZonePreview');
    const zAxisLabelDropZone = document.getElementById('zAxisLabelDropZonePreview');
    
    // Show z-axis for grouped/clustered and stacked bar charts
    const showZAxis = barType === 'grouped' || barType === 'clustered' || barType === 'stacked';
    
    if (zAxisColumnDropZone) {
        const zAxisColumnContainer = zAxisColumnDropZone.closest('div');
        if (zAxisColumnContainer) {
            zAxisColumnContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    if (zAxisLabelDropZone) {
        const zAxisLabelContainer = zAxisLabelDropZone.closest('div');
        if (zAxisLabelContainer) {
            zAxisLabelContainer.style.display = showZAxis ? 'block' : 'none';
        }
    }
    
    // Update preview chart
    if (window.previewChartId && typeof renderBarChartWithType === 'function') {
        renderBarChartWithType(window.previewChartId, barType);
    } else if (window.previewChartId && typeof renderChart === 'function') {
        // Fallback: re-render with updated settings
        const chartData = getChartData(window.currentChartSettings.chartWidget);
        renderPreviewChart(chartType, chartDivId, chartData);
    }
}

// Render bar chart with specific type
function renderBarChartWithType(previewChartId, barType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'bar') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    // If no valid data, show gray placeholder chart
    if (!hasValidData) {
        // Render gray placeholder chart based on bar type
        const previewDiv = document.getElementById(previewChartId);
        if (previewDiv && typeof Plotly !== 'undefined') {
            // Use placeholder data (same as canvas)
            const placeholderData = {
                x: ['Category A', 'Category B', 'Category C', 'Category D'],
                y: [20, 35, 30, 40]
            };
            
            let placeholderChartData = [];
            let placeholderLayout = {
                margin: { l: 40, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6B7280', size: 12 },
                xaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                yaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                showlegend: false
            };
            
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
                    // Center the bars around zero
                    const centeredY = placeholderData.y.map(val => val - 30);
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: centeredY,
                        type: 'bar',
                        marker: { 
                            color: centeredY.map(val => val >= 0 ? '#9CA3AF' : '#D1D5DB')
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
            Plotly.newPlot(previewChartId, placeholderChartData, placeholderLayout, {
                displayModeBar: false,
                staticPlot: true
            });
        }
        return;
    }
    
    // Use renderChart function from design.js with bar chart type
    if (typeof renderChart === 'function') {
        // Temporarily store bar chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].barChartType = barType;
        
        // Call renderChart - it should handle bar chart types
        // Store bar chart type in settings BEFORE calling renderChart
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].barChartType = barType;
        
        // Also update current bar chart type
        window.currentBarChartType = barType;
        
        renderChart('bar', previewChartId, null, null, barType);
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Render line chart with specific type
function renderLineChartWithType(previewChartId, lineType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'line') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    // If no valid data, show gray placeholder chart
    if (!hasValidData) {
        // Render gray placeholder chart based on line type
        const previewDiv = document.getElementById(previewChartId);
        if (previewDiv && typeof Plotly !== 'undefined') {
            // Use placeholder data (same as canvas)
            const placeholderData = {
                x: ['A', 'B', 'C', 'D'],
                y: [40, 70, 30, 90]
            };
            
            let placeholderChartData = [];
            let placeholderLayout = {
                margin: { l: 40, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6B7280', size: 12 },
                xaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                yaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                showlegend: false
            };
            
            // Create placeholder based on line chart type
            switch(lineType) {
                case 'single':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2 },
                        opacity: 0.7
                    }];
                    break;
                    
                case 'multi':
                    placeholderChartData = [
                        {
                            x: placeholderData.x,
                            y: placeholderData.y,
                            type: 'scatter',
                            mode: 'lines+markers',
                            marker: { color: '#9CA3AF', size: 8 },
                            line: { color: '#9CA3AF', width: 2 },
                            opacity: 0.7
                        },
                        {
                            x: placeholderData.x,
                            y: [30, 50, 20, 60],
                            type: 'scatter',
                            mode: 'lines+markers',
                            marker: { color: '#D1D5DB', size: 8 },
                            line: { color: '#D1D5DB', width: 2 },
                            opacity: 0.7
                        }
                    ];
                    break;
                    
                case 'cumulative':
                    const cumulativeY = [];
                    let sum = 0;
                    placeholderData.y.forEach(val => {
                        sum += val;
                        cumulativeY.push(sum);
                    });
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: cumulativeY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2 },
                        opacity: 0.7
                    }];
                    break;
                    
                case 'step':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2, shape: 'hv' },
                        opacity: 0.7
                    }];
                    break;
                    
                case 'dashed':
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2, dash: 'dash' },
                        opacity: 0.7
                    }];
                    break;
                    
                case 'indexed':
                    // Normalize data to 0-100 scale
                    const maxVal = Math.max(...placeholderData.y);
                    const normalizedY = placeholderData.y.map(val => (val / maxVal) * 100);
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: normalizedY,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2 },
                        opacity: 0.7
                    }];
                    placeholderLayout.yaxis.range = [0, 100];
                    break;
                    
                default:
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        type: 'scatter',
                        mode: 'lines+markers',
                        marker: { color: '#9CA3AF', size: 8 },
                        line: { color: '#9CA3AF', width: 2 },
                        opacity: 0.7
                    }];
            }
            
            // Render placeholder chart
            Plotly.newPlot(previewChartId, placeholderChartData, placeholderLayout, {
                displayModeBar: false,
                staticPlot: true
            });
        }
        return;
    }
    
    // Use renderChart function from design.js with line chart type
    if (typeof renderChart === 'function') {
        // Temporarily store line chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].lineChartType = lineType;
        
        // Call renderChart - it should handle line chart types
        renderChart('line', previewChartId, null, null, null, lineType);
    }
}

// Render area chart with specific type
function renderAreaChartWithType(previewChartId, areaType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'area') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    // If no valid data, show gray placeholder chart
    if (!hasValidData) {
        // Render gray placeholder chart based on area type
        const previewDiv = document.getElementById(previewChartId);
        if (previewDiv && typeof Plotly !== 'undefined') {
            // Use placeholder data
            const placeholderData = {
                x: ['A', 'B', 'C', 'D'],
                y: [40, 70, 30, 90]
            };
            
            let placeholderChartData = [];
            let placeholderLayout = {
                margin: { l: 40, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6B7280', size: 12 },
                xaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                yaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                showlegend: false
            };
            
            // Helper function to convert hex to rgba
            function hexToRgbaForFill(hex, alpha = 0.3) {
                hex = hex.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                return `rgba(${r},${g},${b},${alpha})`;
            }
            
            // Create placeholder based on area chart type
            switch(areaType) {
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
                    if (areaType === 'percent') {
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
            Plotly.newPlot(previewChartId, placeholderChartData, placeholderLayout, {
                displayModeBar: false,
                staticPlot: true
            });
        }
        return;
    }
    
    // Use renderChart function from design.js with area chart type
    if (typeof renderChart === 'function') {
        // Temporarily store area chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].areaChartType = areaType;
        
        // Call renderChart - it should handle area chart types
        renderChart('area', previewChartId, null, null, null, null, areaType);
    }
}

// Render scatter chart with specific type
function renderScatterChartWithType(previewChartId, scatterType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'scatter') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    // If no valid data, show gray placeholder chart
    if (!hasValidData) {
        // Render gray placeholder chart based on scatter type
        const previewDiv = document.getElementById(previewChartId);
        if (previewDiv && typeof Plotly !== 'undefined') {
            // Use placeholder data
            const placeholderData = {
                x: [1, 2, 3, 4, 5],
                y: [10, 15, 13, 17, 20],
                z: [5, 10, 8, 12, 15] // For bubble chart
            };
            
            let placeholderChartData = [];
            let placeholderLayout = {
                margin: { l: 40, r: 20, t: 20, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6B7280', size: 12 },
                xaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                yaxis: { showgrid: true, gridcolor: '#E5E7EB' },
                showlegend: false
            };
            
            // Create placeholder based on scatter chart type
            switch(scatterType) {
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
                    // Simple scatter with trendline
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
                    // Bubble chart uses z-axis for bubble size
                    placeholderChartData = [{
                        x: placeholderData.x,
                        y: placeholderData.y,
                        mode: 'markers',
                        type: 'scatter',
                        marker: { 
                            color: '#9CA3AF', 
                            size: placeholderData.z.map(z => z * 2), // Scale bubble sizes
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
            
            // Render placeholder chart
            Plotly.newPlot(previewChartId, placeholderChartData, placeholderLayout, {
                displayModeBar: false,
                staticPlot: true
            });
        }
        return;
    }
    
    // Use renderChart function from design.js with scatter chart type
    if (typeof renderChart === 'function') {
        // Temporarily store scatter chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].scatterChartType = scatterType;
        
        // Call renderChart - it should handle scatter chart types
        renderChart('scatter', previewChartId, null, null, null, null, null, null, scatterType);
    }
}

// Render pie chart with specific type
function renderPieChartWithType(previewChartId, pieType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'pie') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    // If no valid data, show gray placeholder chart
    if (!hasValidData) {
        // Render gray placeholder chart based on pie type
        const previewDiv = document.getElementById(previewChartId);
        if (previewDiv && typeof Plotly !== 'undefined') {
            // Use placeholder data
            const placeholderLabels = ['A', 'B', 'C', 'D'];
            const placeholderValues = [30, 25, 20, 25];
            
            let placeholderChartData = [];
            let placeholderLayout = {
                margin: { l: 20, r: 20, t: 20, b: 20 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6B7280', size: 12 },
                showlegend: false
            };
            
            // Create placeholder based on pie chart type
            switch(pieType) {
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
            Plotly.newPlot(previewChartId, placeholderChartData, placeholderLayout, {
                displayModeBar: false,
                staticPlot: true
            });
        }
        return;
    }
    
    // Use renderChart function from design.js with pie chart type
    if (typeof renderChart === 'function') {
        // Store pie chart type in settings BEFORE calling renderChart
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].pieChartType = pieType;
        
        // Also update current pie chart type
        window.currentPieChartType = pieType;
        
        // Call renderChart - it should handle pie chart types
        renderChart('pie', previewChartId, null, null, null, null, null, pieType);
    }
}

// Render card chart with specific type
function renderCardChartWithType(previewChartId, cardType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'card') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Get data from widget
    let data = null;
    if (chartDiv && window.widgetData && window.widgetData[chartDiv.id]) {
        data = window.widgetData[chartDiv.id];
    } else if (window.previewChartId && window.widgetData && window.widgetData[window.previewChartId]) {
        data = window.widgetData[window.previewChartId];
    } else if (window.csvData && window.csvData.length > 0) {
        data = window.csvData;
    }
    
    // Get settings
    const settings = window.chartSettings && window.chartSettings[previewChartId] ? 
                     window.chartSettings[previewChartId] : 
                     (window.chartSettings && window.chartSettings[chartDiv.id] ? 
                      window.chartSettings[chartDiv.id] : {});
    
    // Check if we have valid data (more than just headers)
    const hasValidData = data && data.length > 1 && data[0] && data[0].length > 0;
    
    const previewDiv = document.getElementById(previewChartId);
    if (!previewDiv) return;
    
    // Get chart colors
    const chartColors = settings?.chartColors || settings?.colors || ['#007bff'];
    const cardColor = chartColors[0] || '#007bff';
    
    // Helper function to convert hex to gradient
    function hexToGradient(hex, opacity = 1) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${opacity})`;
    }
    
    // If no valid data, show gray placeholder card
    if (!hasValidData) {
        const placeholderHTML = generateCardPlaceholder(cardType, '#9CA3AF');
        previewDiv.innerHTML = placeholderHTML;
        return;
    }
    
    // Get actual data values
    let cardValue = 125430;
    let cardLabel = 'Total Sales';
    let comparisonValue = null;
    let percentChange = null;
    let targetValue = null;
    let statusValue = null;
    
    // Parse data
    if (data && data.length > 1) {
        const yData = data[1] || [];
        if (yData.length > 0) {
            cardValue = parseFloat(yData[0]) || 125430;
        }
        if (yData.length > 1) {
            comparisonValue = parseFloat(yData[1]) || null;
        }
        if (yData.length > 2) {
            percentChange = parseFloat(yData[2]) || null;
        }
        if (yData.length > 3) {
            targetValue = parseFloat(yData[3]) || null;
        }
        if (yData.length > 4) {
            statusValue = parseFloat(yData[4]) || null;
        }
        
        const columnNames = data[0] || [];
        if (columnNames.length > 0) {
            cardLabel = columnNames[0] || 'Total Sales';
        }
    }
    
    // Generate card HTML based on type
    const cardHTML = generateCardHTML(cardType, cardValue, cardLabel, comparisonValue, percentChange, targetValue, statusValue, cardColor);
    previewDiv.innerHTML = cardHTML;
}

// Helper function to generate card placeholder
function generateCardPlaceholder(cardType, color) {
    const grayGradient = `from-gray-400 to-gray-600`;
    const grayText = `text-gray-200`;
    
    switch(cardType) {
        case 'basic':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                </div>
            `;
        case 'comparison':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                        <span class="material-symbols-outlined text-sm">compare_arrows</span>
                        <span>vs $110,000</span>
                    </div>
                </div>
            `;
        case 'percent':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                        <span class="material-symbols-outlined text-sm">trending_up</span>
                        <span>+12.5%</span>
                    </div>
                </div>
            `;
        case 'target':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                        <span class="material-symbols-outlined text-sm">flag</span>
                        <span>Target: $150,000</span>
                    </div>
                </div>
            `;
        case 'status':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 ${grayText} mt-2">
                        <span class="material-symbols-outlined text-sm">check_circle</span>
                        <span>On Track</span>
                    </div>
                </div>
            `;
        case 'multi':
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <div class="text-xs ${grayText}">
                            <div>Target: $150K</div>
                        </div>
                        <div class="text-xs ${grayText}">
                            <div>Change: +12.5%</div>
                        </div>
                    </div>
                </div>
            `;
        default:
            return `
                <div class="card-widget bg-gradient-to-br ${grayGradient} text-white p-6 rounded-lg shadow-lg opacity-70 cursor-default" style="user-select: none; pointer-events: none;">
                    <div class="text-sm opacity-90 mb-2 ${grayText}">Total Sales</div>
                    <div class="text-4xl font-bold mb-1 text-gray-100">$125,430</div>
                </div>
            `;
    }
}

// Helper function to convert hex to RGB
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

// Helper function to generate card HTML with data
function generateCardHTML(cardType, value, label, comparisonValue, percentChange, targetValue, statusValue, color) {
    // Convert hex to RGB for gradient
    const rgb = hexToRgb(color);
    const gradientFrom = `rgba(${rgb.r},${rgb.g},${rgb.b},1)`;
    const gradientTo = `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`;
    
    const formattedValue = typeof value === 'number' ? `$${value.toLocaleString()}` : value;
    
    switch(cardType) {
        case 'basic':
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
                    <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                </div>
            `;
        case 'comparison':
            const comparisonText = comparisonValue ? `vs $${comparisonValue.toLocaleString()}` : 'vs Previous';
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
                    <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                        <span class="material-symbols-outlined text-sm">compare_arrows</span>
                        <span>${comparisonText}</span>
                    </div>
                </div>
            `;
        case 'percent':
            const percentText = percentChange !== null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '+12.5%';
            const trendIcon = percentChange >= 0 ? 'trending_up' : 'trending_down';
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
                    <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                        <span class="material-symbols-outlined text-sm">${trendIcon}</span>
                        <span>${percentText}</span>
                    </div>
                </div>
            `;
        case 'target':
            const targetText = targetValue ? `Target: $${targetValue.toLocaleString()}` : 'Target: $150,000';
            const progress = targetValue ? Math.min((value / targetValue) * 100, 100) : 83.6;
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
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
        case 'status':
            const statusText = statusValue !== null ? (statusValue >= 0 ? 'On Track' : 'Below Target') : 'On Track';
            const statusIcon = statusValue !== null ? (statusValue >= 0 ? 'check_circle' : 'warning') : 'check_circle';
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
                    <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                    <div class="text-sm opacity-75 flex items-center gap-1 mt-2">
                        <span class="material-symbols-outlined text-sm">${statusIcon}</span>
                        <span>${statusText}</span>
                    </div>
                </div>
            `;
        case 'multi':
            const multiTarget = targetValue ? `$${targetValue.toLocaleString()}` : '$150K';
            const multiChange = percentChange !== null ? `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%` : '+12.5%';
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
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
        default:
            return `
                <div class="card-widget text-white p-6 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow" style="background: linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%); user-select: none;">
                    <div class="text-sm opacity-90 mb-2">${label}</div>
                    <div class="text-4xl font-bold mb-1">${formattedValue}</div>
                </div>
            `;
    }
}

// Render treemap chart with specific type
function renderTreemapChartWithType(previewChartId, treemapType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'treemap') return;
    
    // Use renderChart function from design.js with treemap chart type
    if (typeof renderChart === 'function') {
        // Temporarily store treemap chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].treemapChartType = treemapType;
        
        // Call renderChart - it should handle treemap chart types
        renderChart('treemap', previewChartId, null, null, null, null, null, null, null, null, treemapType);
    }
}

// Render table chart with specific type
function renderTableChartWithType(previewChartId, tableType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'table') return;
    
    // Use renderChart function from design.js with table chart type
    if (typeof renderChart === 'function') {
        // Temporarily store table chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].tableChartType = tableType;
        
        // Call renderChart - it should handle table chart types
        renderChart('table', previewChartId, null, null, null, null, null, null, null, null, null, tableType);
    }
}

function renderListChartWithType(previewChartId, listType) {
    if (!window.currentChartSettings) return;
    
    const chartType = window.currentChartSettings.chartType;
    if (chartType !== 'list') return;
    
    const chartWidget = window.currentChartSettings.chartWidget;
    const chartDiv = chartWidget.querySelector('[id^="chart-"]');
    
    // Ensure preview has the latest data from current chartDivId
    if (window.currentChartSettings && window.currentChartSettings.chartDivId) {
        const currentChartDivId = window.currentChartSettings.chartDivId;
        if (window.widgetData && window.widgetData[currentChartDivId]) {
            // Copy data to preview
            if (!window.widgetData) {
                window.widgetData = {};
            }
            window.widgetData[previewChartId] = window.widgetData[currentChartDivId];
            window.csvData = window.widgetData[currentChartDivId];
        }
    }
    
    // Use renderChart function from design.js with list chart type
    if (typeof renderChart === 'function') {
        // Temporarily store list chart type in settings
        if (!window.chartSettings) window.chartSettings = {};
        if (!window.chartSettings[previewChartId]) window.chartSettings[previewChartId] = {};
        window.chartSettings[previewChartId].listChartType = listType;
        
        // Call renderChart - it should handle list chart types
        // If hierarchy, use 'hierarchy-list' chart type, otherwise 'list'
        const actualChartType = listType === 'hierarchy' ? 'hierarchy-list' : 'list';
        renderChart(actualChartType, previewChartId);
    }
}

// Make functions globally available
if (typeof window !== 'undefined') {
    window.runPythonCode = runPythonCode;
    window.clearPythonOutput = clearPythonOutput;
    window.switchBarChartType = switchBarChartType;
    window.renderBarChartWithType = renderBarChartWithType;
    window.switchLineChartType = switchLineChartType;
    window.renderLineChartWithType = renderLineChartWithType;
    window.switchAreaChartType = switchAreaChartType;
    window.renderAreaChartWithType = renderAreaChartWithType;
    window.switchScatterChartType = switchScatterChartType;
    window.renderScatterChartWithType = renderScatterChartWithType;
    window.switchCardChartType = switchCardChartType;
    window.renderCardChartWithType = renderCardChartWithType;
    window.switchTreemapChartType = switchTreemapChartType;
    window.renderTreemapChartWithType = renderTreemapChartWithType;
    window.switchTableChartType = switchTableChartType;
    window.renderTableChartWithType = renderTableChartWithType;
    window.switchListChartType = switchListChartType;
    window.renderListChartWithType = renderListChartWithType;
    window.switchPieChartType = switchPieChartType;
    window.renderPieChartWithType = renderPieChartWithType;
}

