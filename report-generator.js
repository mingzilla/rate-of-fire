/**
 * Rate of Fire - Report Generator
 * Handles generating and downloading MD and SQL reports
 */

class ReportGenerator {
    constructor(app) {
        this.app = app;
        this.sqlMatrixDuration = 120; // Default duration in seconds
    }

    /**
     * Sets the SQL matrix duration
     * @param {number} duration - Duration in seconds
     */
    setSqlMatrixDuration(duration) {
        this.sqlMatrixDuration = duration;
    }

    /**
     * Creates a timestamp string for filenames
     * @returns {string} Formatted timestamp (yyyy-mm-dd-hh-mm)
     */
    getTimestampString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}-${hour}-${minute}`;
    }

    /**
     * Downloads the report as a file
     * @param {string} content - File content
     * @param {string} filename - Name of the file
     * @param {string} mimeType - MIME type
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }

    /**
     * Generates and downloads a Markdown report
     */
    downloadMarkdownReport() {
        const timestamp = this.getTimestampString();
        const filename = `rate-of-fire-report-${timestamp}.md`;
        
        // Get test data
        const testData = this.collectTestData();
        if (!testData) return;
        
        // Generate Markdown content
        let content = `# Rate of Fire Performance Test Report\n\n`;
        content += `Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Test Configuration
        content += `## Test Configuration\n\n`;
        content += `- **API Endpoint:** \`${testData.actionUrl}\`\n`;
        content += `- **Method:** ${testData.method}\n`;
        content += `- **Requests Per Minute:** ${testData.requestsPerMinute}\n`;
        content += `- **Number of Competitors:** ${testData.competitorCount}\n`;
        content += `- **Test Duration:** ${testData.testDuration.toFixed(2)} seconds\n`;
        content += `- **SQL Matrix Duration:** ${testData.sqlMatrixDuration} seconds\n\n`;
        
        // Overall Results
        content += `## Overall Results\n\n`;
        content += `| Metric | Value |\n`;
        content += `| ------ | ----- |\n`;
        content += `| Total Requests | ${testData.totalRequests} |\n`;
        content += `| Successful Requests | ${testData.successfulRequests} |\n`;
        content += `| Failed Requests | ${testData.failedRequests} |\n`;
        content += `| Unfinished Requests | ${testData.unfinishedRequests} |\n`;
        content += `| Success Rate | ${testData.successRate.toFixed(2)}% |\n`;
        content += `| Requests Per Second | ${testData.requestsPerSecond.toFixed(2)} |\n\n`;
        
        // Competitor Results
        content += `## Competitor Results\n\n`;
        content += `| Competitor | Total | Successful | Failed | Unfinished |\n`;
        content += `| ---------- | ----- | ---------- | ------ | ---------- |\n`;
        
        for (const name in testData.competitors) {
            const competitor = testData.competitors[name];
            content += `| ${name} | ${competitor.total} | ${competitor.passed} | ${competitor.failed} | ${competitor.running} |\n`;
        }
        
        // Download the file
        this.downloadFile(content, filename, 'text/markdown');
    }

    /**
     * Generates and downloads a SQL file
     */
    downloadSqlReport() {
        const timestamp = this.getTimestampString();
        const filename = `rate-of-fire-sql-${timestamp}.sql`;
        
        // Get test data
        const testData = this.collectTestData();
        if (!testData) return;
        
        // Generate SQL content
        let content = `-- Rate of Fire Performance Test SQL Report\n`;
        content += `-- Generated: ${new Date().toLocaleString()}\n\n`;
        
        // Table 1: Test Summary
        content += `-- Test Summary Table\n`;
        content += `CREATE TABLE IF NOT EXISTS performance_test_summary (\n`;
        content += `  test_performed_time DATETIME PRIMARY KEY,\n`;
        content += `  action_url VARCHAR(1024) NOT NULL,\n`;
        content += `  number_of_competitors INT NOT NULL,\n`;
        content += `  request_frequency INT NOT NULL,\n`;
        content += `  total_requests INT NOT NULL,\n`;
        content += `  successful_requests INT NOT NULL,\n`;
        content += `  unfinished_requests INT NOT NULL,\n`;
        content += `  failed_requests INT NOT NULL,\n`;
        content += `  sql_matrix_duration INT NOT NULL,\n`;
        content += `  test_duration FLOAT NOT NULL\n`;
        content += `);\n\n`;
        
        // Table 2: Request Details
        content += `-- Request Details Table\n`;
        content += `CREATE TABLE IF NOT EXISTS performance_test_details (\n`;
        content += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
        content += `  test_performed_time DATETIME NOT NULL,\n`;
        content += `  request_item_id VARCHAR(255) NOT NULL,\n`;
        content += `  competitor_name VARCHAR(255) NOT NULL,\n`;
        content += `  execution_duration FLOAT,\n`;
        content += `  status ENUM('passed', 'failed', 'unfinished') NOT NULL,\n`;
        content += `  FOREIGN KEY (test_performed_time) REFERENCES performance_test_summary(test_performed_time)\n`;
        content += `);\n\n`;
        
        // Format datetime for MySQL
        const mysqlTimestamp = testData.startTime.toISOString().slice(0, 19).replace('T', ' ');
        
        // Insert into summary table
        content += `-- Insert test summary data\n`;
        content += `INSERT INTO performance_test_summary VALUES (\n`;
        content += `  '${mysqlTimestamp}',\n`;
        content += `  '${testData.actionUrl.replace(/'/g, "\\'")}',\n`;
        content += `  ${testData.competitorCount},\n`;
        content += `  ${testData.requestsPerMinute},\n`;
        content += `  ${testData.totalRequests},\n`;
        content += `  ${testData.successfulRequests},\n`;
        content += `  ${testData.unfinishedRequests},\n`;
        content += `  ${testData.failedRequests},\n`;
        content += `  ${testData.sqlMatrixDuration},\n`;
        content += `  ${testData.testDuration.toFixed(2)}\n`;
        content += `);\n\n`;
        
        // Insert into details table (limiting to SQL matrix duration)
        content += `-- Insert request details data (limited to first ${this.sqlMatrixDuration} seconds)\n`;
        const detailsInserts = this.generateRequestDetailsSQL(testData, mysqlTimestamp);
        content += detailsInserts;
        
        // Download the file
        this.downloadFile(content, filename, 'text/plain');
    }

    /**
     * Collects test data from the app
     * @returns {Object} Collected test data
     */
    collectTestData() {
        const app = this.app;
        
        if (!app.actualTestStartTime || !app.hasActionRun) {
            alert('No test results available. Please run a test first.');
            return null;
        }
        
        // Calculate test duration using the actual start time (after countdown)
        const endTime = app.testEndTime || new Date();
        const testDuration = (endTime - app.actualTestStartTime) / 1000; // in seconds
        
        // Collect competitor data
        const competitors = {};
        let totalRequests = 0;
        let successfulRequests = 0;
        let failedRequests = 0;
        let unfinishedRequests = 0;
        
        for (const name in app.competitorsData) {
            const data = app.competitorsData[name];
            competitors[name] = {
                total: data.total,
                passed: data.passed,
                failed: data.failed,
                running: data.running
            };
            
            totalRequests += data.total;
            successfulRequests += data.passed;
            failedRequests += data.failed;
            unfinishedRequests += data.running;
        }
        
        // Calculate metrics
        const successRate = (totalRequests > 0) ? (successfulRequests / totalRequests) * 100 : 0;
        const requestsPerSecond = (testDuration > 0) ? totalRequests / testDuration : 0;
        
        return {
            startTime: app.actualTestStartTime,
            endTime: endTime,
            testDuration: testDuration,
            actionUrl: app.action.url,
            method: app.action.method,
            requestsPerMinute: app.action.requestsPerMinute,
            sqlMatrixDuration: app.sqlMatrixDuration,
            competitorCount: Object.keys(app.competitorsData).length,
            competitors: competitors,
            totalRequests: totalRequests,
            successfulRequests: successfulRequests,
            failedRequests: failedRequests,
            unfinishedRequests: unfinishedRequests,
            successRate: successRate,
            requestsPerSecond: requestsPerSecond
        };
    }

    /**
     * Generates SQL insert statements for request details
     * @param {Object} testData - Test data
     * @param {string} mysqlTimestamp - MySQL formatted timestamp
     * @returns {string} SQL insert statements
     */
    generateRequestDetailsSQL(testData, mysqlTimestamp) {
        let sql = '';
        // Use the actual start time (after countdown) for the matrix duration
        const matrixEndTime = new Date(testData.startTime.getTime() + (this.sqlMatrixDuration * 1000));
        
        // First batch of inserts
        sql += 'INSERT INTO performance_test_details\n';
        sql += '  (test_performed_time, request_item_id, competitor_name, execution_duration, status)\n';
        sql += 'VALUES\n';
        
        let insertCount = 0;
        let firstBatch = true;
        
        // Process each competitor's results
        for (const name in testData.competitors) {
            const competitor = this.app.competitorsData[name];
            
            // Process each request box
            for (let rowIndex = 0; rowIndex < competitor.rows.length; rowIndex++) {
                for (let colIndex = 0; colIndex < competitor.rows[rowIndex].length; colIndex++) {
                    const box = competitor.rows[rowIndex][colIndex];
                    
                    // Skip empty boxes
                    if (box.status === 'empty' || !box.id) continue;
                    
                    // Skip requests that started after the matrix duration
                    if (box.requestTime && box.requestTime > matrixEndTime) continue;
                    
                    // Determine status and duration
                    let status = 'unfinished';
                    let duration = 'NULL';
                    
                    if (box.status === 'pass') {
                        status = 'passed';
                        if (box.requestTime && box.responseTime) {
                            duration = (box.responseTime - box.requestTime) / 1000; // in seconds
                        }
                    } else if (box.status === 'fail') {
                        status = 'failed';
                        if (box.requestTime && box.responseTime) {
                            duration = (box.responseTime - box.requestTime) / 1000; // in seconds
                        }
                    }
                    
                    // New batch of inserts every 100 rows
                    if (insertCount > 0 && insertCount % 100 === 0) {
                        sql += ';\n\n';
                        sql += 'INSERT INTO performance_test_details\n';
                        sql += '  (test_performed_time, request_item_id, competitor_name, execution_duration, status)\n';
                        sql += 'VALUES\n';
                        firstBatch = true;
                    }
                    
                    if (!firstBatch) {
                        sql += ',\n';
                    }
                    
                    // Safely handle box.id which might be a number or null
                    const safeId = box.id ? String(box.id).replace(/'/g, "\\'") : 'unknown';
                    sql += `  ('${mysqlTimestamp}', '${safeId}', '${name}', ${duration !== 'NULL' ? duration.toFixed(4) : 'NULL'}, '${status}')`;
                    firstBatch = false;
                    insertCount++;
                }
            }
        }
        
        // Close the final statement if we have inserts
        if (insertCount > 0) {
            sql += ';\n';
        } else {
            sql = '-- No request details data available within the specified duration\n';
        }
        
        return sql;
    }
}

// Export the class
window.ReportGenerator = ReportGenerator;