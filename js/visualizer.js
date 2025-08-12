document.addEventListener('DOMContentLoaded', () => {
    const logFileInput = document.getElementById('logFileInput');
    const loadLogButton = document.getElementById('loadLogButton');
    const logDisplay = document.getElementById('logDisplay');
    const fileLabelText = document.querySelector('.file-label .file-text');
    const dropZone = document.querySelector('.file-loader');
    const appHeader = document.querySelector('.app-header');

    let loadedReports = [];
    let activeReportId = null;

    // --- Event Listeners ---
    logFileInput.setAttribute('multiple', 'multiple'); // Allow multiple file selection
    logFileInput.addEventListener('change', () => {
        if (logFileInput.files.length > 0) {
            fileLabelText.textContent = `${logFileInput.files.length} file(s) selected`;
            showProcessingMessage();
            loadFiles(logFileInput.files);
        }
    });

    loadLogButton.addEventListener('click', () => {
        if (logFileInput.files.length > 0) {
            showProcessingMessage();
            loadFiles(logFileInput.files);
        } else {
            displayError('Please select a log file first.');
        }
    });

    // --- Drag and Drop Listeners ---
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            logFileInput.files = files; // Assign dropped file to input
            fileLabelText.textContent = `${files.length} file(s) selected`;
            showProcessingMessage();
            loadFiles(files);
        }
    });

    // --- Core Logic ---
    function showProcessingMessage() {
        const processingDiv = document.createElement('div');
        processingDiv.className = 'processing-message';
        processingDiv.id = 'processingMessage';
        processingDiv.textContent = 'Processing file(s)...';
        logDisplay.innerHTML = ''; // Clear current content
        logDisplay.appendChild(processingDiv);
    }

    function hideProcessingMessage() {
        const processingDiv = document.getElementById('processingMessage');
        if (processingDiv) {
            processingDiv.remove();
        }
    }

    async function loadFiles(files) {
        hideProcessingMessage(); // Hide processing message once files are being loaded
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    loadedReports.push({ id: reportId, name: file.name, data: data });
                    renderTabs();
                    displayReport(reportId);
                } catch (error) {
                    displayError(`Error parsing JSON for ${file.name}: ${error.message}`);
                }
            };
            reader.readAsText(file);
            await new Promise(resolve => reader.onloadend = resolve); // Wait for each file to load
        }
    }

    function render(data) {
        // This function is now primarily called by displayReport(reportId)
        // It renders the content of a single report into logDisplay
        if (!data.logType || !(data.logs || data.summary)) {
            displayError('Invalid log format. Missing required keys.');
            return;
        }

        logDisplay.innerHTML = ''; // Clear previous content

        switch (data.logType.toUpperCase()) {
            case 'GENERAL':
                renderGeneralView(data.logs);
                break;
            case 'PERFORMANCE_REPORT':
                renderPerformanceReportView(data);
                break;
            default:
                displayError(`Unknown logType: "${data.logType}".`);
        }
    }

    function renderTabs() {
        let tabsContainer = document.getElementById('reportTabs');
        if (!tabsContainer) {
            tabsContainer = document.createElement('div');
            tabsContainer.id = 'reportTabs';
            tabsContainer.className = 'report-tabs';
            appHeader.after(tabsContainer); // Insert after app header
        }
        tabsContainer.innerHTML = '';

        loadedReports.forEach(report => {
            const tab = document.createElement('div');
            tab.className = `tab-item ${report.id === activeReportId ? 'active' : ''}`;
            tab.dataset.reportId = report.id;
            tab.innerHTML = `
                <span>${report.name}</span>
                <button class="close-tab">&times;</button>
            `;
            tab.querySelector('span').addEventListener('click', () => displayReport(report.id));
            tab.querySelector('.close-tab').addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent tab click event
                closeReport(report.id);
            });
            tabsContainer.appendChild(tab);
        });

        if (loadedReports.length > 1) {
            const clearAllBtn = document.createElement('button');
            clearAllBtn.className = 'clear-all-tabs';
            clearAllBtn.textContent = 'Clear All';
            clearAllBtn.addEventListener('click', clearAllReports);
            tabsContainer.appendChild(clearAllBtn);
        }
    }

    function displayReport(reportId) {
        activeReportId = reportId;
        const report = loadedReports.find(r => r.id === reportId);
        if (report) {
            render(report.data);
            // Update active tab class
            document.querySelectorAll('.tab-item').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.reportId === reportId);
            });
        }
    }

    function closeReport(reportId) {
        loadedReports = loadedReports.filter(r => r.id !== reportId);
        renderTabs();
        if (loadedReports.length > 0) {
            // If the closed tab was active, activate the first remaining tab
            if (activeReportId === reportId) {
                displayReport(loadedReports[0].id);
            }
        } else {
            // No reports left, show welcome message
            logDisplay.innerHTML = `
                <div class="welcome-message">
                    <h2>Waiting for data...</h2>
                    <p>Select a compatible <code>.json</code> file and click "Load" to begin.</p>
                    <div class="info-tooltip-group">
                        <div class="info-tooltip">
                            <span class="info-icon">?</span>
                            <div class="tooltip-content">
                                The visualizer supports two log types: <strong>GENERAL</strong> for plain text logs (Hastebin style), and <strong>PERFORMANCE</strong> for detailed performance metrics with progress bars and color codes. The <code>logType</code> key in the JSON root determines the view.
                            </div>
                        </div>
                    </div>
                </div>
            `;
            activeReportId = null;
            const tabsContainer = document.getElementById('reportTabs');
            if (tabsContainer) tabsContainer.remove();
        }
    }

    function clearAllReports() {
        loadedReports = [];
        activeReportId = null;
        const tabsContainer = document.getElementById('reportTabs');
        if (tabsContainer) tabsContainer.remove();
        logDisplay.innerHTML = `
            <div class="welcome-message">
                <h2>Waiting for data...</h2>
                <p>Select a compatible <code>.json</code> file and click "Load" to begin.</p>
                <div class="info-tooltip-group">
                    <div class="info-tooltip">
                        <span class="info-icon">?</span>
                        <div class="tooltip-content">
                            The visualizer supports two log types: <strong>GENERAL</strong> for plain text logs (Hastebin style), and <strong>PERFORMANCE</strong> for detailed performance metrics with progress bars and color codes. The <code>logType</code> key in the JSON root determines the view.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- View Renderers (from previous version) ---
    function renderPerformanceReportView(data) { /* ... */ }
    function renderGeneralView(logs) { /* ... */ }

    // --- Stat Card Creators (from previous version) ---
    function createStatCard(title, value, detailsHTML) { /* ... */ }
    function createTpsCard(tps) { /* ... */ }
    function createMsptCard(mspt) { /* ... */ }
    function createCpuCard(cpu) { /* ... */ }
    function createMemoryCard(memory) { /* ... */ }

    // --- Hotspot Row Creator (from previous version) ---
    function createHotspotRow(hotspot) { /* ... */ }

    // --- Helpers (from previous version) ---
    function displayError(message) { /* ... */ }
    function getProgressiveColor(value, max) { /* ... */ }
    function getTpsColor(tpsImpact) { /* ... */ }
});