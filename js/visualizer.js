document.addEventListener('DOMContentLoaded', () => {
    const logFileInput = document.getElementById('logFileInput');
    const loadLogButton = document.getElementById('loadLogButton');
    const logDisplay = document.getElementById('logDisplay');
    const fileLabelText = document.querySelector('.file-label .file-text');

    logFileInput.addEventListener('change', () => {
        if (logFileInput.files.length > 0) {
            fileLabelText.textContent = logFileInput.files[0].name;
        } else {
            fileLabelText.textContent = 'Select a file';
        }
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

    function displayError(message) {
        logDisplay.innerHTML = `<div class="welcome-message"><h2 style="color: var(--red);">Error</h2><p>${message}</p></div>`;
    }

    function render(data) {
        if (!data.logType || !data.logs) {
            displayError('Invalid log format. Missing `logType` or `logs` key.');
            return;
        }

        logDisplay.innerHTML = ''; // Clear previous content

        switch (data.logType.toUpperCase()) {
            case 'GENERAL':
                renderGeneralView(data.logs);
                break;
            case 'PERFORMANCE':
                renderPerformanceView(data.logs);
                break;
            default:
                displayError(`Unknown logType: "${data.logType}".`);
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

    function renderPerformanceView(logs) {
        const container = document.createElement('div');
        container.className = 'performance-view';

        const maxDuration = Math.max(...logs.map(log => log.durationMs || 0), 0);

        logs.forEach(log => {
            const card = document.createElement('div');
            card.className = 'perf-card';

            const messageDiv = document.createElement('div');
            messageDiv.className = 'perf-message';
            messageDiv.textContent = `[${log.source}] ${log.message}`;

            const metricsDiv = document.createElement('div');
            metricsDiv.className = 'perf-metrics';

            // Duration Metric
            const duration = log.durationMs || 0;
            const durationWidth = maxDuration > 0 ? (duration / maxDuration) * 100 : 0;
            const durationColor = getProgressiveColor(duration, maxDuration);
            metricsDiv.innerHTML += createMetricHTML('Duration', `${duration}ms`, durationWidth, durationColor);

            // TPS Impact Metric
            const tpsImpact = log.tpsImpact || 0;
            const tpsImpactColor = getTpsColor(tpsImpact);
            metricsDiv.innerHTML += createMetricHTML('TPS Impact', tpsImpact.toFixed(2), tpsImpact * 10, tpsImpactColor, true);

            card.appendChild(messageDiv);
            card.appendChild(metricsDiv);
            container.appendChild(card);
        });

        logDisplay.appendChild(container);
    }

    function createMetricHTML(name, value, width, colorClass, isPoint = false) {
        return `
            <div class="metric">
                <span>${name}: <strong>${value}</strong></span>
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-fill ${colorClass}" style="width: ${width}%;"></div>
            </div>
        `;
    }

    function getProgressiveColor(value, max) {
        const percentage = max > 0 ? (value / max) * 100 : 0;
        if (percentage < 25) return 'color-green';
        if (percentage < 50) return 'color-yellow';
        if (percentage < 75) return 'color-orange';
        return 'color-red';
    }

    function getTpsColor(tpsImpact) {
        if (tpsImpact < 0.2) return 'color-green';
        if (tpsImpact < 0.5) return 'color-yellow';
        if (tpsImpact < 1.0) return 'color-orange';
        return 'color-red';
    }
});
