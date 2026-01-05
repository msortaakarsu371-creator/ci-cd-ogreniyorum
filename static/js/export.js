// ==================== EXPORT FUNCTIONALITY ====================

let currentExportType = 'pdf';
let isSelecting = false;
let isDraggingSelection = false;
let selectionStartX = 0;
let selectionStartY = 0;
let selectionCurrentX = 0;
let selectionCurrentY = 0;
let selectionRectangle = null;
let selectedCharts = [];
let exportLayout = [];
let selectionOffsetX = 0;
let selectionOffsetY = 0;
let originalSelectionLeft = 0;
let originalSelectionTop = 0;

// Make selectedCharts globally accessible for delete functionality
window.selectedCharts = selectedCharts;
window.selectionRectangle = selectionRectangle;
window.isDraggingSelection = isDraggingSelection;

// Open export settings modal
function openExportSettings() {
    console.log('openExportSettings called');
    const modal = document.getElementById('exportSettingsModal');
    const title = document.getElementById('exportModalTitle');
    const exportBtn = document.getElementById('exportBtn');
    
    if (!modal) {
        console.error('Export settings modal not found!');
        alert('Export settings modal not found. Please check if the modal HTML is present.');
        return;
    }
    
    if (!title || !exportBtn) {
        console.error('Modal elements not found!');
        return;
    }
    
    // Default to PDF
    currentExportType = 'pdf';
    title.textContent = 'Export Settings';
    exportBtn.textContent = 'Export';
    exportBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700';
    switchExportTab('pdf');
    
    modal.classList.remove('hidden');
    generateAutoLayout();
    renderLayoutPreview();
}

// Close export settings modal
function closeExportSettings() {
    const modal = document.getElementById('exportSettingsModal');
    modal.classList.add('hidden');
}

// Switch between PDF and PowerPoint tabs
function switchExportTab(type) {
    currentExportType = type;
    
    // Update tab buttons
    document.querySelectorAll('.export-tab-btn').forEach(btn => {
        if (btn.dataset.exportTab === type) {
            btn.classList.add('border-red-600', 'text-red-600');
            btn.classList.remove('border-transparent', 'text-gray-600');
        } else {
            btn.classList.remove('border-red-600', 'text-red-600');
            btn.classList.add('border-transparent', 'text-gray-600');
        }
    });
    
    // Show/hide settings panels
    const pdfSettings = document.getElementById('pdfSettings');
    const pptSettings = document.getElementById('powerpointSettings');
    
    if (type === 'pdf') {
        pdfSettings.classList.remove('hidden');
        pptSettings.classList.add('hidden');
    } else {
        pdfSettings.classList.add('hidden');
        pptSettings.classList.remove('hidden');
    }
    
    renderLayoutPreview();
}

// Initialize canvas selection (always active, no button needed)
function initCanvasSelection() {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    
    // Handle Delete key press to delete all charts in rectangle selection
    // Use both canvas and document listeners for better reliability
    function handleDeleteKey(e) {
        // Check if Delete or Backspace key is pressed
        if ((e.key === 'Delete' || e.key === 'Backspace')) {
            // Check if we have selected charts from rectangle selection
            const currentSelectedCharts = window.selectedCharts || selectedCharts || [];
            
            if (currentSelectedCharts.length > 0) {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Deleting', currentSelectedCharts.length, 'selected charts/widgets');
                
                // Delete all charts/widgets in the rectangle selection (including text-box)
                currentSelectedCharts.forEach(chart => {
                    if (chart.element) {
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
                });
                
                // Clear selection
                selectedCharts = [];
                window.selectedCharts = []; // Update global reference
                clearSelectionHighlight(); // Remove visual highlight
                if (selectionRectangle) {
                    hideSelectionRectangle();
                }
                
                // Update drill through connections if function exists
                if (typeof updateDrillThroughConnections === 'function') {
                    updateDrillThroughConnections();
                }
            }
        }
    }
    
    // Add listener to canvas
    canvas.addEventListener('keydown', handleDeleteKey);
    
    // Also add listener to document for better reliability (when canvas might not be focused)
    document.addEventListener('keydown', (e) => {
        // Only handle if canvas is visible and we have selected charts
        const canvasVisible = canvas && canvas.offsetParent !== null;
        const hasSelectedCharts = window.selectedCharts && window.selectedCharts.length > 0;
        
        if (canvasVisible && hasSelectedCharts) {
            handleDeleteKey(e);
        }
    });
}

// Handle canvas mouse down
function handleCanvasMouseDown(e) {
    const canvas = document.getElementById('designCanvas');
    if (!canvas) return;
    
    // Don't start selection if clicking on a chart widget or its header
    // BUT: If rectangle selection is active and we're dragging, allow it to continue
    if (e.target.closest('.chart-widget') || e.target.closest('.chart-widget-header')) {
        // If rectangle selection is being dragged, don't clear it - allow dragging to continue
        if (isDraggingSelection && selectedCharts.length > 0) {
            // Continue dragging selection - don't interfere
            return;
        }
        // Clear selection highlight when clicking on a chart (but not during drag)
        if (!isDraggingSelection) {
            clearSelectionHighlight();
        }
        return;
    }
    
    // Clear previous selection highlight when starting new selection
    clearSelectionHighlight();
    
    // Check if clicking on selection rectangle (for dragging)
    if (selectionRectangle && (e.target === selectionRectangle || e.target.closest('#selectionRectangle'))) {
        isDraggingSelection = true;
    window.isDraggingSelection = true; // Update global flag
        const rect = selectionRectangle.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        selectionOffsetX = e.clientX - rect.left;
        selectionOffsetY = e.clientY - rect.top;
        
        // Ensure original positions are stored for all selected charts before dragging starts
        if (originalSelectionLeft === 0 && originalSelectionTop === 0) {
            originalSelectionLeft = parseFloat(selectionRectangle.style.left);
            originalSelectionTop = parseFloat(selectionRectangle.style.top);
        }
        
        // Store original positions for all selected charts if not already stored
        selectedCharts.forEach(chart => {
            if (chart.originalLeft === undefined || chart.originalTop === undefined) {
                const currentLeft = parseFloat(chart.element.style.left) || 0;
                const currentTop = parseFloat(chart.element.style.top) || 0;
                chart.originalLeft = currentLeft;
                chart.originalTop = currentTop;
            }
        });
        
        canvas.addEventListener('mousemove', dragSelection);
        canvas.addEventListener('mouseup', stopDragSelection);
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    
    // Start new selection
    e.preventDefault();
    e.stopPropagation();
    
    // Reset original positions for new selection
    originalSelectionLeft = 0;
    originalSelectionTop = 0;
    selectedCharts.forEach(chart => {
        chart.originalLeft = undefined;
        chart.originalTop = undefined;
    });
    window.selectedCharts = selectedCharts; // Update global reference
    
    isSelecting = true;
    const canvasRect = canvas.getBoundingClientRect();
    
    selectionStartX = e.clientX - canvasRect.left + canvas.scrollLeft;
    selectionStartY = e.clientY - canvasRect.top + canvas.scrollTop;
    
    if (!selectionRectangle) {
        selectionRectangle = document.getElementById('selectionRectangle');
    }
    
    selectionRectangle.style.left = selectionStartX + 'px';
    selectionRectangle.style.top = selectionStartY + 'px';
    selectionRectangle.style.width = '0px';
    selectionRectangle.style.height = '0px';
    selectionRectangle.classList.remove('hidden');
    selectionRectangle.style.display = 'block';
    selectionRectangle.style.cursor = 'move';
    selectionRectangle.style.pointerEvents = 'auto';
    
    canvas.addEventListener('mousemove', updateSelection);
    canvas.addEventListener('mouseup', endSelection);
}

// Drag selection rectangle
let rafId = null;
let pendingUpdate = false;
let lastDeltaX = 0;
let lastDeltaY = 0;

function dragSelection(e) {
    if (!isDraggingSelection || !selectionRectangle) return;
    
    const canvas = document.getElementById('designCanvas');
    const canvasRect = canvas.getBoundingClientRect();
    
    const newX = e.clientX - canvasRect.left + canvas.scrollLeft - selectionOffsetX;
    const newY = e.clientY - canvasRect.top + canvas.scrollTop - selectionOffsetY;
    
    // Update rectangle position immediately
    selectionRectangle.style.left = newX + 'px';
    selectionRectangle.style.top = newY + 'px';
    
    // Calculate delta immediately
    const currentLeft = parseFloat(selectionRectangle.style.left);
    const currentTop = parseFloat(selectionRectangle.style.top);
    
    // Ensure original positions are stored (should be set in handleCanvasMouseDown or endSelection)
    if (originalSelectionLeft === 0 && originalSelectionTop === 0) {
        originalSelectionLeft = currentLeft;
        originalSelectionTop = currentTop;
    }
    
    // Ensure chart original positions are stored
    selectedCharts.forEach(chart => {
        if (chart.originalLeft === undefined || chart.originalTop === undefined) {
            const chartLeft = parseFloat(chart.element.style.left) || 0;
            const chartTop = parseFloat(chart.element.style.top) || 0;
            chart.originalLeft = chartLeft;
            chart.originalTop = chartTop;
        }
    });
    
    const deltaX = currentLeft - originalSelectionLeft;
    const deltaY = currentTop - originalSelectionTop;
    
    // Update charts immediately without waiting for animation frame
    updateSelectedChartsPositionImmediate(deltaX, deltaY);
    
    // Use requestAnimationFrame only for smooth rendering, but update positions immediately
    if (!rafId) {
        rafId = requestAnimationFrame(() => {
            rafId = null;
        });
    }
}

// Stop dragging selection
function stopDragSelection(e) {
    if (!isDraggingSelection) return;
    
    isDraggingSelection = false;
    window.isDraggingSelection = false; // Update global flag
    const canvas = document.getElementById('designCanvas');
    if (canvas) {
        canvas.removeEventListener('mousemove', dragSelection);
        canvas.removeEventListener('mouseup', stopDragSelection);
    }
    
    // Cancel any pending animation frame
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    pendingUpdate = false;
    
    // Remove will-change after dragging stops for better performance
    selectedCharts.forEach(chart => {
        if (chart.element) {
            chart.element.style.willChange = 'auto';
        }
    });
    
    // Update original positions for next drag
    if (selectionRectangle) {
        originalSelectionLeft = parseFloat(selectionRectangle.style.left);
        originalSelectionTop = parseFloat(selectionRectangle.style.top);
        
        // Update chart original positions
        selectedCharts.forEach(chart => {
            chart.originalLeft = parseFloat(chart.element.style.left);
            chart.originalTop = parseFloat(chart.element.style.top);
        });
        window.selectedCharts = selectedCharts; // Update global reference
    }
    
    // Recalculate which charts are in selection (in case rectangle moved outside some charts)
    recalculateSelectedCharts();
}

// Make stopDragSelection globally accessible
if (typeof window !== 'undefined') {
    window.stopDragSelection = stopDragSelection;
}

// Immediate update function for chart positions (optimized for performance)
function updateSelectedChartsPositionImmediate(deltaX, deltaY) {
    if (!selectionRectangle || selectedCharts.length === 0) return;
    
    // Update all chart positions relative to selection rectangle movement
    // Use direct style updates for immediate response
    selectedCharts.forEach(chart => {
        // Store original position if not stored
        if (chart.originalLeft === undefined || chart.originalTop === undefined) {
            // Get current position from style (absolute positioning)
            const currentLeft = parseFloat(chart.element.style.left) || 0;
            const currentTop = parseFloat(chart.element.style.top) || 0;
            chart.originalLeft = currentLeft;
            chart.originalTop = currentTop;
        }
        
        const chartElement = chart.element;
        // Update positions immediately - no delay
        const newLeft = chart.originalLeft + deltaX;
        const newTop = chart.originalTop + deltaY;
        chartElement.style.left = newLeft + 'px';
        chartElement.style.top = newTop + 'px';
        
        // Use will-change for better performance
        chartElement.style.willChange = 'left, top';
    });
}

// Update selected charts position based on selection rectangle (legacy function, kept for compatibility)
function updateSelectedChartsPosition() {
    if (!selectionRectangle) return;
    
    const currentLeft = parseFloat(selectionRectangle.style.left);
    const currentTop = parseFloat(selectionRectangle.style.top);
    
    // Store original position on first drag (if not already stored)
    if (originalSelectionLeft === 0 && originalSelectionTop === 0) {
        originalSelectionLeft = currentLeft;
        originalSelectionTop = currentTop;
    }
    
    const deltaX = currentLeft - originalSelectionLeft;
    const deltaY = currentTop - originalSelectionTop;
    
    updateSelectedChartsPositionImmediate(deltaX, deltaY);
}

// Recalculate which charts are in selection after dragging
function recalculateSelectedCharts() {
    if (!selectionRectangle) return;
    
    const canvas = document.getElementById('designCanvas');
    const selectionBounds = {
        left: parseFloat(selectionRectangle.style.left),
        top: parseFloat(selectionRectangle.style.top),
        right: parseFloat(selectionRectangle.style.left) + parseFloat(selectionRectangle.style.width),
        bottom: parseFloat(selectionRectangle.style.top) + parseFloat(selectionRectangle.style.height)
    };
    
    selectedCharts = [];
    window.selectedCharts = selectedCharts; // Update global reference
    // Select all chart-widget elements including text-box widgets
    const charts = canvas.querySelectorAll('.chart-widget');
    charts.forEach(chart => {
        // Use style.left and style.top for absolute positioned elements
        const chartLeft = parseFloat(chart.style.left) || 0;
        const chartTop = parseFloat(chart.style.top) || 0;
        const chartRight = chartLeft + chart.offsetWidth;
        const chartBottom = chartTop + chart.offsetHeight;
        
        // Check if chart is within selection (at least 50% overlap)
        const overlapLeft = Math.max(selectionBounds.left, chartLeft);
        const overlapTop = Math.max(selectionBounds.top, chartTop);
        const overlapRight = Math.min(selectionBounds.right, chartRight);
        const overlapBottom = Math.min(selectionBounds.bottom, chartBottom);
        
        if (overlapRight > overlapLeft && overlapBottom > overlapTop) {
            const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
            const chartArea = chart.offsetWidth * chart.offsetHeight;
            
            // If at least 50% of chart/widget is in selection (including text-box)
            if (overlapArea / chartArea >= 0.5) {
                const chartType = chart.dataset.chartType || 'unknown';
                selectedCharts.push({
                    element: chart,
                    id: chart.dataset.widgetId,
                    type: chartType,
                    left: chartLeft,
                    top: chartTop,
                    width: chart.offsetWidth,
                    height: chart.offsetHeight,
                    originalLeft: chartLeft,
                    originalTop: chartTop
                });
                window.selectedCharts = selectedCharts; // Update global reference
            }
        }
    });
    
    // Ensure window.selectedCharts is properly updated
    window.selectedCharts = selectedCharts;
    console.log('Recalculated selected charts:', selectedCharts.length, selectedCharts);
}

// Update selection rectangle
function updateSelection(e) {
    if (!isSelecting || !selectionRectangle) return;
    
    const canvas = document.getElementById('designCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const currentX = e.clientX - rect.left + canvas.scrollLeft;
    const currentY = e.clientY - rect.top + canvas.scrollTop;
    
    const width = Math.abs(currentX - selectionStartX);
    const height = Math.abs(currentY - selectionStartY);
    const left = Math.min(selectionStartX, currentX);
    const top = Math.min(selectionStartY, currentY);
    
    selectionRectangle.style.left = left + 'px';
    selectionRectangle.style.top = top + 'px';
    selectionRectangle.style.width = width + 'px';
    selectionRectangle.style.height = height + 'px';
    selectionRectangle.style.cursor = 'default';
}

// End selection
function endSelection(e) {
    if (!isSelecting) return;
    
    isSelecting = false;
    const canvas = document.getElementById('designCanvas');
    canvas.removeEventListener('mousemove', updateSelection);
    canvas.removeEventListener('mouseup', endSelection);
    
    // Find charts within selection
    if (selectionRectangle) {
        const selectionBounds = {
            left: parseFloat(selectionRectangle.style.left),
            top: parseFloat(selectionRectangle.style.top),
            right: parseFloat(selectionRectangle.style.left) + parseFloat(selectionRectangle.style.width),
            bottom: parseFloat(selectionRectangle.style.top) + parseFloat(selectionRectangle.style.height)
        };
        
        // Only proceed if selection has meaningful size
        if (selectionBounds.right - selectionBounds.left < 10 || selectionBounds.bottom - selectionBounds.top < 10) {
            hideSelectionRectangle();
            return;
        }
        
        // Store original selection rectangle position for dragging
        originalSelectionLeft = selectionBounds.left;
        originalSelectionTop = selectionBounds.top;
        
        recalculateSelectedCharts();
        
        // Store original positions for all selected charts (use current style positions)
        selectedCharts.forEach(chart => {
            const currentLeft = parseFloat(chart.element.style.left) || 0;
            const currentTop = parseFloat(chart.element.style.top) || 0;
            chart.originalLeft = currentLeft;
            chart.originalTop = currentTop;
            // Also update left/top properties for compatibility
            chart.left = currentLeft;
            chart.top = currentTop;
        });
        window.selectedCharts = selectedCharts; // Update global reference
        
        // Visually highlight selected charts/widgets
        highlightSelectedCharts();
        
        // Make rectangle draggable after selection ends
        if (selectionRectangle) {
            selectionRectangle.style.cursor = 'move';
        }
        
        // Focus canvas to enable keyboard events (Delete key)
        canvas.focus();
        
        // Update layout with selected charts
        generateAutoLayout();
        renderLayoutPreview();
    }
}

// Highlight selected charts/widgets visually
function highlightSelectedCharts() {
    // First, remove selection highlight from all charts
    const allCharts = document.querySelectorAll('.chart-widget');
    allCharts.forEach(chart => {
        chart.classList.remove('rectangle-selected');
    });
    
    // Then, add selection highlight to selected charts
    if (selectedCharts && selectedCharts.length > 0) {
        selectedCharts.forEach(chart => {
            if (chart.element) {
                chart.element.classList.add('rectangle-selected');
            }
        });
    }
}

// Remove selection highlight from all charts
function clearSelectionHighlight() {
    const allCharts = document.querySelectorAll('.chart-widget');
    allCharts.forEach(chart => {
        chart.classList.remove('rectangle-selected');
    });
}

// Hide selection rectangle
function hideSelectionRectangle() {
    if (selectionRectangle) {
        selectionRectangle.classList.add('hidden');
        selectionRectangle.style.display = 'none';
    }
    // Clear selection highlight when rectangle is hidden
    clearSelectionHighlight();
    selectedCharts = [];
    window.selectedCharts = [];
}

// Generate auto layout
function generateAutoLayout() {
    const canvas = document.getElementById('designCanvas');
    const charts = selectedCharts.length > 0 ? selectedCharts.map(c => c.element) : Array.from(canvas.querySelectorAll('.chart-widget'));
    
    if (charts.length === 0) {
        exportLayout = [];
        return;
    }
    
    // Get page settings
    const pageSize = currentExportType === 'pdf' 
        ? document.getElementById('pdfPageSize').value 
        : document.getElementById('pptSlideSize').value;
    
    const orientation = currentExportType === 'pdf' 
        ? document.getElementById('pdfOrientation').value 
        : 'landscape';
    
    // Calculate page dimensions (in pixels, assuming 96 DPI)
    let pageWidth, pageHeight;
    if (currentExportType === 'pdf') {
        if (pageSize === 'A4') {
            pageWidth = orientation === 'portrait' ? 794 : 1123; // A4: 210x297mm
            pageHeight = orientation === 'portrait' ? 1123 : 794;
        } else if (pageSize === 'A3') {
            pageWidth = orientation === 'portrait' ? 1123 : 1587;
            pageHeight = orientation === 'portrait' ? 1587 : 1123;
        } else if (pageSize === 'Letter') {
            pageWidth = orientation === 'portrait' ? 816 : 1056;
            pageHeight = orientation === 'portrait' ? 1056 : 816;
        } else {
            pageWidth = 794;
            pageHeight = 1123;
        }
    } else {
        // PowerPoint
        if (pageSize === '16:9') {
            pageWidth = 960;
            pageHeight = 540;
        } else if (pageSize === '4:3') {
            pageWidth = 720;
            pageHeight = 540;
        } else {
            pageWidth = 794;
            pageHeight = 1123;
        }
    }
    
    const margin = currentExportType === 'pdf' ? parseInt(document.getElementById('pdfMargin').value) * 3.779527559 : 20; // Convert mm to px
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);
    
    // Group charts into pages
    exportLayout = [];
    let currentPage = {
        pageNumber: 1,
        charts: [],
        width: pageWidth,
        height: pageHeight
    };
    
    let currentY = margin;
    let currentRowHeight = 0;
    
    charts.forEach((chart, index) => {
        const chartData = {
            id: chart.dataset.widgetId,
            type: chart.dataset.chartType,
            name: chart.querySelector('.chart-widget-header span')?.textContent || `Chart ${index + 1}`,
            element: chart,
            width: chart.offsetWidth,
            height: chart.offsetHeight,
            x: margin,
            y: currentY,
            page: currentPage.pageNumber
        };
        
        // Check if chart fits in current row
        if (chart.offsetWidth <= contentWidth && currentY + chart.offsetHeight <= contentHeight + margin) {
            chartData.x = margin;
            chartData.y = currentY;
            currentPage.charts.push(chartData);
            currentRowHeight = Math.max(currentRowHeight, chart.offsetHeight);
            currentY += chart.offsetHeight + 20; // 20px spacing
        } else {
            // Start new page
            exportLayout.push(currentPage);
            currentPage = {
                pageNumber: currentPage.pageNumber + 1,
                charts: [],
                width: pageWidth,
                height: pageHeight
            };
            currentY = margin;
            chartData.x = margin;
            chartData.y = currentY;
            currentPage.charts.push(chartData);
            currentRowHeight = chart.offsetHeight;
            currentY += chart.offsetHeight + 20;
        }
    });
    
    if (currentPage.charts.length > 0) {
        exportLayout.push(currentPage);
    }
}

// Render layout preview
function renderLayoutPreview() {
    const preview = document.getElementById('exportPreview');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    if (exportLayout.length === 0) {
        preview.innerHTML = '<p class="text-gray-500 text-center py-8">No charts to export</p>';
        return;
    }
    
    exportLayout.forEach((page, pageIndex) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'mb-4 border border-gray-300 rounded bg-white shadow-sm';
        pageDiv.style.width = '100%';
        pageDiv.style.maxWidth = '600px';
        pageDiv.style.margin = '0 auto';
        pageDiv.style.aspectRatio = `${page.width} / ${page.height}`;
        pageDiv.style.position = 'relative';
        pageDiv.style.overflow = 'hidden';
        
        const pageHeader = document.createElement('div');
        pageHeader.className = 'bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border-b border-gray-300';
        pageHeader.textContent = `Page ${page.pageNumber}`;
        pageDiv.appendChild(pageHeader);
        
        const pageContent = document.createElement('div');
        pageContent.className = 'relative';
        pageContent.style.width = '100%';
        pageContent.style.height = 'calc(100% - 24px)';
        
        page.charts.forEach((chart, chartIndex) => {
            const chartPreview = document.createElement('div');
            chartPreview.className = 'absolute border-2 border-blue-400 bg-blue-50 bg-opacity-50 rounded';
            chartPreview.style.left = `${(chart.x / page.width) * 100}%`;
            chartPreview.style.top = `${(chart.y / page.height) * 100}%`;
            chartPreview.style.width = `${(chart.width / page.width) * 100}%`;
            chartPreview.style.height = `${(chart.height / page.height) * 100}%`;
            
            const chartLabel = document.createElement('div');
            chartLabel.className = 'text-xs font-semibold text-blue-700 p-1';
            chartLabel.textContent = chart.name;
            chartPreview.appendChild(chartLabel);
            
            pageContent.appendChild(chartPreview);
        });
        
        pageDiv.appendChild(pageContent);
        preview.appendChild(pageDiv);
    });
}

// Auto layout button
function autoLayout() {
    generateAutoLayout();
    renderLayoutPreview();
}

// Generate export
async function generateExport() {
    if (exportLayout.length === 0) {
        alert('No charts to export');
        return;
    }
    
    if (currentExportType === 'pdf') {
        await generatePDF();
    } else {
        await generatePowerPoint();
    }
}

// Generate PDF
async function generatePDF() {
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: document.getElementById('pdfOrientation').value,
            unit: 'mm',
            format: document.getElementById('pdfPageSize').value.toLowerCase()
        });
        
        const margin = parseInt(document.getElementById('pdfMargin').value);
        
        for (let pageIndex = 0; pageIndex < exportLayout.length; pageIndex++) {
            const page = exportLayout[pageIndex];
            
            if (pageIndex > 0) {
                pdf.addPage();
            }
            
            for (const chart of page.charts) {
                try {
                    // Convert chart to image
                    const chartElement = chart.element;
                    const chartDiv = chartElement.querySelector('[id^="chart-"]');
                    
                    if (chartDiv) {
                        // Use html2canvas to convert chart to image
                        const canvas = await html2canvas(chartDiv, {
                            backgroundColor: '#ffffff',
                            scale: 2
                        });
                        
                        const imgData = canvas.toDataURL('image/png');
                        
                        // Calculate position in mm
                        const x = chart.x * 0.264583; // Convert px to mm
                        const y = chart.y * 0.264583;
                        const width = chart.width * 0.264583;
                        const height = chart.height * 0.264583;
                        
                        pdf.addImage(imgData, 'PNG', x, y, width, height);
                    }
                } catch (error) {
                    console.error('Error adding chart to PDF:', error);
                }
            }
        }
        
        pdf.save('export.pdf');
        closeExportSettings();
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF: ' + error.message);
    }
}

// Generate PowerPoint
async function generatePowerPoint() {
    try {
        const pptx = new PptxGenJS();
        
        const slideSize = document.getElementById('pptSlideSize').value;
        if (slideSize === '16:9') {
            pptx.layout = 'LAYOUT_WIDE';
        } else if (slideSize === '4:3') {
            pptx.layout = 'LAYOUT_4x3';
        }
        
        for (let pageIndex = 0; pageIndex < exportLayout.length; pageIndex++) {
            const page = exportLayout[pageIndex];
            const slide = pptx.addSlide();
            
            for (const chart of page.charts) {
                try {
                    const chartElement = chart.element;
                    const chartDiv = chartElement.querySelector('[id^="chart-"]');
                    
                    if (chartDiv) {
                        const canvas = await html2canvas(chartDiv, {
                            backgroundColor: '#ffffff',
                            scale: 2
                        });
                        
                        const imgData = canvas.toDataURL('image/png');
                        
                        // Calculate position and size (PowerPoint uses inches)
                        const x = (chart.x / 96) * 0.0393701; // Convert px to inches
                        const y = (chart.y / 96) * 0.0393701;
                        const width = (chart.width / 96) * 0.0393701;
                        const height = (chart.height / 96) * 0.0393701;
                        
                        slide.addImage({
                            data: imgData,
                            x: x,
                            y: y,
                            w: width,
                            h: height
                        });
                    }
                } catch (error) {
                    console.error('Error adding chart to PowerPoint:', error);
                }
            }
        }
        
        pptx.writeFile({ fileName: 'export.pptx' });
        closeExportSettings();
    } catch (error) {
        console.error('Error generating PowerPoint:', error);
        alert('Error generating PowerPoint: ' + error.message);
    }
}

// Make functions globally accessible
window.openExportSettings = openExportSettings;
window.closeExportSettings = closeExportSettings;
window.switchExportTab = switchExportTab;
window.autoLayout = autoLayout;
window.generateExport = generateExport;
window.highlightSelectedCharts = highlightSelectedCharts;
window.clearSelectionHighlight = clearSelectionHighlight;

// Initialize export functionality
document.addEventListener('DOMContentLoaded', function() {
    console.log('Export.js loaded');
    
    // Initialize canvas selection (always active)
    initCanvasSelection();
    
    // Close modal on outside click
    const modal = document.getElementById('exportSettingsModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeExportSettings();
            }
        });
    } else {
        console.warn('Export settings modal not found in DOM');
    }
    
    // Update layout when settings change
    const pdfPageSize = document.getElementById('pdfPageSize');
    const pdfOrientation = document.getElementById('pdfOrientation');
    const pdfMargin = document.getElementById('pdfMargin');
    const pptSlideSize = document.getElementById('pptSlideSize');
    
    if (pdfPageSize) pdfPageSize.addEventListener('change', () => { generateAutoLayout(); renderLayoutPreview(); });
    if (pdfOrientation) pdfOrientation.addEventListener('change', () => { generateAutoLayout(); renderLayoutPreview(); });
    if (pdfMargin) pdfMargin.addEventListener('change', () => { generateAutoLayout(); renderLayoutPreview(); });
    if (pptSlideSize) pptSlideSize.addEventListener('change', () => { generateAutoLayout(); renderLayoutPreview(); });
});

