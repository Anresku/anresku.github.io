document.addEventListener('DOMContentLoaded', () => {
    const logFileInput = document.getElementById('logFileInput');
    const loadLogButton = document.getElementById('loadLogButton');
    const logDisplay = document.getElementById('logDisplay');
    const fileLabelText = document.querySelector('.file-label .file-text');
    const dropZone = document.querySelector('.file-loader');
    const appHeader = document.querySelector('.app-header');
    const processingOverlay = document.getElementById('processingOverlay');

    let loadedReports = [];
    let activeReportId = null;

    // --- Event Listeners ---
    logFileInput.setAttribute('multiple', 'multiple'); // Allow multiple file selection
    logFileInput.addEventListener('change', () => {
        if (logFileInput.files.length > 0) {
            fileLabelText.textContent = `${logFileInput.files.length} file(s) selected`;
            loadFiles(logFileInput.files);
        }
    });

    loadLogButton.addEventListener('click', () => {
        if (logFileInput.files.length > 0) {
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
            loadFiles(files);
        }
    });

    // --- Core Logic ---
    function showProcessingOverlay() {
        processingOverlay.classList.remove('hidden');
    }

    function hideProcessingOverlay() {
        processingOverlay.classList.add('hidden');
    }

    async function loadFiles(files) {
        showProcessingOverlay();
        let filesToProcess = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (loadedReports.some(report => report.name === file.name)) {
                console.warn(`File "${file.name}" is already loaded. Skipping.`);
                continue;
            }
            filesToProcess.push(file);
        }

        if (filesToProcess.length === 0) {
            hideProcessingOverlay();
            return; // No new files to load
        }

        let lastLoadedReportId = null;

        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            const reader = new FileReader();
            const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            lastLoadedReportId = reportId;

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    loadedReports.push({ id: reportId, name: file.name, data: data });
                } catch (error) {
                    displayError(`Error parsing JSON for ${file.name}: ${error.message}`);
                }
            };
            reader.readAsText(file);
            await new Promise(resolve => reader.onloadend = resolve);
        }

        renderTabs();
        if (lastLoadedReportId) {
            displayReport(lastLoadedReportId);
        } else if (loadedReports.length > 0) {
            displayReport(loadedReports[0].id);
        }
        hideProcessingOverlay();
    }

    function render(data) {
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

    // --- View Renderers ---
    function renderPerformanceReportView(data) {
        // 1. Render Summary Section
        const summaryContainer = document.createElement('div');
        summaryContainer.innerHTML = `
            <div class="summary-header">
                <h2>Performance Summary</h2>
                <!-- Filter button will be added here if needed -->
            </div>
            <div class="summary-grid"></div>
        `;
        const summaryGrid = summaryContainer.querySelector('.summary-grid');

        // Create and append stat cards
        summaryGrid.appendChild(createTpsCard(data.summary.tps));
        summaryGrid.appendChild(createMsptCard(data.summary.mspt));
        summaryGrid.appendChild(createCpuCard(data.summary.cpu));
        summaryGrid.appendChild(createMemoryCard(data.summary.memory));
        
        logDisplay.appendChild(summaryContainer);

        // 2. Render Hotspots Table
        if (data.hotspots && data.hotspots.length > 0) {
            const hotspotContainer = document.createElement('div');
            hotspotContainer.className = 'hotspot-table-container';
            hotspotContainer.innerHTML = `<h2>Hotspots</h2><div class="hotspot-table"></div>`;
            const hotspotTable = hotspotContainer.querySelector('.hotspot-table');
            data.hotspots.forEach(hotspot => {
                hotspotTable.appendChild(createHotspotRow(hotspot));
            });
            logDisplay.appendChild(hotspotContainer);
        }
    }

    function renderGeneralView(logs) {
        const container = document.createElement('pre');
        container.className = 'hastebin-view';
        
        logs.forEach(log => {
            const line = document.createElement('div');
            line.className = 'log-line';

            const level = document.createElement('span');
            level.className = `level-${log.level || 'UNKNOWN'}`;
            level.textContent = `[${log.level || 'UNKNOWN'}] `;

            const message = document.createTextNode(`${new Date(log.timestamp).toLocaleString()} [${log.module}] ${log.message}`);
            
            line.appendChild(level);
            line.appendChild(message);
            container.appendChild(line);
        });

        logDisplay.appendChild(container);
    }

    // --- Stat Card Creators ---
    function createStatCard(title, value, detailsHTML) {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-card-header">
                <span>${title}</span>
            </div>
            <div class="stat-card-value">${value}</div>
            <div class="stat-details">${detailsHTML}</div>
        `;
        
        const detailsElement = card.querySelector('.stat-details');
        
        card.addEventListener('click', () => {

            card.classList.toggle('expanded');

            if (card.classList.contains('expanded')) {
                detailsElement.style.maxHeight = detailsElement.scrollHeight + 'px';
            } else {
                detailsElement.style.maxHeight = '0';
            }

        });
        return card;
    }

    function createTpsCard(tps) {
        const details = `<div class="detail-item"><span>Average</span><strong>${tps.average}</strong></div>`;
        return createStatCard('TPS', tps.current, details);
    }

    function createMsptCard(mspt) {
        const details = `
            <div class="detail-item"><span>95th Percentile</span><strong>${mspt.p95}ms</strong></div>
            <div class="detail-item"><span>Max</span><strong>${mspt.max}ms</strong></div>
        `;
        return createStatCard('MSPT', `${mspt.average}ms`, details);
    }

    function createCpuCard(cpu) {
        const details = `
            <div class="detail-item"><span>System</span><strong>${cpu.system}%</strong></div>
            <div class="detail-item"><span>Idle</span><strong>${cpu.idle}%</strong></div>
        `;
        return createStatCard('CPU (Process)', `${cpu.process}%`, details);
    }

    function createMemoryCard(memory) {
        const details = `<div class="detail-item"><span>Total</span><strong>${memory.totalMB}MB</strong></div>`;
        return createStatCard('Memory Used', `${memory.usedMB}MB`, details);
    }

    // --- Hotspot Row Creator ---
    function createHotspotRow(hotspot) {
        const row = document.createElement('div');
        row.className = 'hotspot-row';

        const selfTimeColor = getProgressiveColor(hotspot.selfTimePercent, 100);
        const totalTimeColor = getProgressiveColor(hotspot.totalTimePercent, 100);

        row.innerHTML = `
            <div class="hotspot-source">${hotspot.source}</div>
            <div>
                <span>${hotspot.selfTimePercent.toFixed(2)}%</span>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill ${selfTimeColor}" style="width: ${hotspot.selfTimePercent}%;"></div>
                </div>
            </div>
            <div>
                <span>${hotspot.totalTimePercent.toFixed(2)}%</span>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill ${totalTimeColor}" style="width: ${hotspot.totalTimePercent}%;"></div>
                </div>
            </div>
            <div>${hotspot.count}</div>
        `;
        return row;
    }

    // --- Helpers ---
    function displayError(message) {
        logDisplay.innerHTML = `<div class="welcome-message"><h2 style="color: var(--red);">Error</h2><p>${message}</p></div>`;
    }

    function getProgressiveColor(value, max) {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        if (percentage < 25) return 'color-green';
        if (percentage < 50) return 'color-yellow';
        if (percentage < 75) return 'color-orange';
        return 'color-red';
    }

    function getTpsColor(tpsImpact) {
        // This function is not used in the current performance_report view, but kept for completeness if needed.
        if (tpsImpact < 0.2) return 'color-green';
        if (tpsImpact < 0.5) return 'color-yellow';
        if (tpsImpact < 1.0) return 'color-orange';
        return 'color-red';
    }
});
