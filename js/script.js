document.addEventListener('DOMContentLoaded', () => {
    const logFileInput = document.getElementById('logFileInput');
    const loadLogButton = document.getElementById('loadLogButton');
    const logDisplay = document.getElementById('logDisplay');

    loadLogButton.addEventListener('click', () => {
        const file = logFileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const logs = JSON.parse(e.target.result);
                    displayLogs(logs);
                } catch (error) {
                    logDisplay.innerHTML = `<p style="color: red;">Error parsing JSON: ${error.message}</p>`;
                    console.error("Error parsing JSON:", error);
                }
            };
            reader.readAsText(file);
        } else {
            logDisplay.innerHTML = '<p style="color: orange;">Please select a log file.</p>';
        }
    });

    function displayLogs(logs) {
        logDisplay.innerHTML = ''; // Clear previous logs
        if (logs.length === 0) {
            logDisplay.innerHTML = '<p>No log entries found.</p>';
            return;
        }

        logs.forEach(log => {
            const logEntryDiv = document.createElement('div');
            logEntryDiv.classList.add('log-entry');

            // Add class based on log level for styling
            switch (log.level) {
                case 'INFO': logEntryDiv.classList.add('log-info'); break;
                case 'WARN': logEntryDiv.classList.add('log-warn'); break;
                case 'ERROR': logEntryDiv.classList.add('log-error'); break;
                case 'DEBUG': logEntryDiv.classList.add('log-debug'); break;
                case 'TRACE': logEntryDiv.classList.add('log-trace'); break;
                case 'PERFORMANCE': logEntryDiv.classList.add('log-performance'); break;
                case 'EVENT': logEntryDiv.classList.add('log-event'); break;
                default: break;
            }

            const timestamp = new Date(log.timestamp).toLocaleString();
            let details = log.details ? ` - Details: ${log.details}` : '';
            let duration = log.durationMs ? ` - Duration: ${log.durationMs}ms` : '';
            let tpsImpact = log.tpsImpact ? ` - TPS Impact: ${log.tpsImpact.toFixed(2)}` : '';
            let eventType = log.eventType ? ` - Event Type: ${log.eventType}` : '';
            let throwable = log.throwable ? ` - Exception: ${log.throwable}` : '';


            logEntryDiv.innerHTML = `
                <strong>[${timestamp}] [${log.level}] [${log.module}] [${log.source}]</strong> ${log.message}
                ${details}${duration}${tpsImpact}${eventType}${throwable}
            `;
            logDisplay.appendChild(logEntryDiv);
        });
    }
});