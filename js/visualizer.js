document.addEventListener('DOMContentLoaded', () => {
    const logFileInput = document.getElementById('logFileInput');
    const loadLogButton = document.getElementById('loadLogButton');
    const logDisplay = document.getElementById('logDisplay');
    const fileLabelText = document.querySelector('.file-label .file-text');

    // --- Event Listeners ---
    logFileInput.addEventListener('change', () => {
        fileLabelText.textContent = logFileInput.files.length > 0 ? logFileInput.files[0].name : 'Select a file';
    });

    loadLogButton.addEventListener('click', () => {
        const file = logFileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    render(data);
                } catch (error) {
                    displayError(`Error parsing JSON: ${error.message}`);
                }
            };
            reader.readAsText(file);
        } else {
            displayError('Please select a log file first.');
        }
    });

    // --- Main Render Function ---
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

    function renderGeneralView(logs) { /* ... (code from previous version) ... */ }

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
        card.addEventListener('click', () => card.classList.toggle('expanded'));
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
    function displayError(message) { /* ... */ }
    function getProgressiveColor(value, max) { /* ... */ }
});