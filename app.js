new Vue({
    el: '#app',
    data: {
        // Competitor setup
        competitorCount: 3,
        itemsPerCompetitor: 2000, // Setting for items per competitor
        competitors: [],
        
        // Global variables as per requirements
        COMPETITOR_TOKENS: {}, // {"Andy": "XXX", "Bob": "YYY"}
        COMPETITOR_HEADERS: {}, // {"Andy": {"Accept": "application/json", ...}}
        COMPETITOR_OBJECTS: {}, // {"Andy": [obj1,obj2,...], "Bob": []}
        
        // Preparation form
        preparation: {
            method: 'GET',
            url: '',
            body: ''
        },
        isPreparationLoading: false,
        
        // Action form
        action: {
            method: 'GET',
            url: '',
            body: '',
            requestsPerMinute: 60
        },
        
        // State tracking
        isActionRunning: false,
        hasActionRun: false,
        isCountingDown: false,
        countdownValue: 3,
        
        // Results data
        competitorsData: {}, // Tracks state of each competitor's requests
        
        // Intervals for timing
        actionInterval: null,
        countdownInterval: null,
        
        // Test timing tracking
        testStartTime: null,
        testEndTime: null,
        actualTestStartTime: null, // After countdown
        elapsedTime: 0, // Timer display
        timerInterval: null, // Timer update interval
        
        // Report settings
        sqlMatrixDuration: 120, // Default 120 seconds
        reportGenerator: null
    },
    created() {
        // Initialize the report generator
        this.reportGenerator = new ReportGenerator(this);
    },
    data: function() {
        return {
            // Competitor setup
            competitorCount: 3,
            itemsPerCompetitor: 2000, // Setting for items per competitor
            competitors: [],
            
            // Global variables as per requirements
            COMPETITOR_TOKENS: {}, // {"Andy": "XXX", "Bob": "YYY"}
            COMPETITOR_HEADERS: {}, // {"Andy": {"Accept": "application/json", ...}}
            COMPETITOR_OBJECTS: {}, // {"Andy": [obj1,obj2,...], "Bob": []}
            
            // Preparation form
            preparation: {
                method: 'GET',
                url: '',
                body: ''
            },
            isPreparationLoading: false,
            
            // Action form
            action: {
                method: 'GET',
                url: '',
                body: '',
                requestsPerMinute: 60
            },
            
            // State tracking
            isActionRunning: false,
            hasActionRun: false,
            isCountingDown: false,
            countdownValue: 3,
            
            // Results data
            competitorsData: {}, // Tracks state of each competitor's requests
            
            // Rankings data - stored as data instead of computed to persist between runs
            competitorRankings: {},
            
            // Intervals for timing
            actionInterval: null,
            countdownInterval: null,
            
            // Test timing tracking
            testStartTime: null,
            testEndTime: null,
            actualTestStartTime: null, // After countdown
            elapsedTime: 0, // Timer display
            timerInterval: null, // Timer update interval
            
            // Report settings
            sqlMatrixDuration: 120, // Default 120 seconds
            reportGenerator: null
        };
    },
    created() {
        // Initialize the report generator
        this.reportGenerator = new ReportGenerator(this);
    },
    methods: {
        /**
         * Sets up the competitor columns based on the count input
         * Preserves existing competitor names and tokens when possible
         */
        setupCompetitors() {
            const previousCompetitors = [...this.competitors];
            const existingCompetitorNames = previousCompetitors.map(comp => comp.name);
            const existingCompetitorTokens = previousCompetitors.map(comp => comp.token);
            
            // Generate default names for new competitors (auto-assigned)
            const defaultNames = ['Andy', 'Bob', 'Chris', 'Diana', 'Eva', 'Frank', 'Grace', 'Helen', 'Ian', 'Jack'];
            
            // Reset but preserve existing competitors where possible
            const newCompetitors = [];
            const newCompetitorsData = {};
            
            // Create competitor objects
            for (let i = 0; i < this.competitorCount; i++) {
                let name, token;
                
                if (i < previousCompetitors.length) {
                    // Preserve existing competitor's name and token
                    name = existingCompetitorNames[i];
                    token = existingCompetitorTokens[i];
                } else {
                    // For new competitors, find an unused default name
                    name = defaultNames.find(name => !existingCompetitorNames.includes(name)) || `Competitor ${i + 1}`;
                    token = '';
                    // Update our tracking of used names
                    existingCompetitorNames.push(name);
                }
                
                newCompetitors.push({
                    name,
                    token
                });
                
                // Initialize empty competitor data structure
                newCompetitorsData[name] = {
                    total: 0,
                    passed: 0,
                    running: 0,
                    failed: 0,
                    rows: []
                };
            }
            
            // Update the data structures
            this.competitors = newCompetitors;
            this.competitorsData = newCompetitorsData;
            this.COMPETITOR_OBJECTS = {};
            this.hasActionRun = false;
            this.competitorRankings = {}; // Reset rankings
            
            // Update headers and create empty boxes for visualization
            this.updateTokensAndHeaders();
            this.initializeCompetitorsData();
        },
        
        /**
         * Updates a competitor's name in all data structures
         * @param {number} index - Index of the competitor
         * @param {string} newName - New name for the competitor
         */
        updateCompetitorName(index, newName) {
            if (!newName || newName.trim() === '') {
                alert('Competitor name cannot be empty');
                // Reset to the previous name
                this.competitors[index].name = Object.keys(this.competitorsData)[index] || `Competitor ${index + 1}`;
                return;
            }
            
            // Trim whitespace
            newName = newName.trim();
            
            // Check if the name already exists
            const isDuplicate = this.competitors.some((comp, idx) => idx !== index && comp.name === newName);
            if (isDuplicate) {
                alert(`A competitor named "${newName}" already exists. Please choose a unique name.`);
                // Reset to the previous name
                this.competitors[index].name = Object.keys(this.competitorsData)[index] || `Competitor ${index + 1}`;
                return;
            }
            
            // Get the old name
            const oldName = Object.keys(this.competitorsData)[index];
            if (!oldName) return;
            
            // Update competitorsData
            if (this.competitorsData[oldName]) {
                // Create a new entry with the new name and copy the data
                Vue.set(this.competitorsData, newName, this.competitorsData[oldName]);
                // Delete the old entry
                Vue.delete(this.competitorsData, oldName);
            }
            
            // Update COMPETITOR_TOKENS
            if (this.COMPETITOR_TOKENS[oldName]) {
                this.COMPETITOR_TOKENS[newName] = this.COMPETITOR_TOKENS[oldName];
                Vue.delete(this.COMPETITOR_TOKENS, oldName);
            }
            
            // Update COMPETITOR_HEADERS
            if (this.COMPETITOR_HEADERS[oldName]) {
                this.COMPETITOR_HEADERS[newName] = this.COMPETITOR_HEADERS[oldName];
                Vue.delete(this.COMPETITOR_HEADERS, oldName);
            }
            
            // Update COMPETITOR_OBJECTS
            if (this.COMPETITOR_OBJECTS[oldName]) {
                this.COMPETITOR_OBJECTS[newName] = this.COMPETITOR_OBJECTS[oldName];
                Vue.delete(this.COMPETITOR_OBJECTS, oldName);
            }
            
            // Force update to ensure UI reflects changes
            this.$forceUpdate();
        },
        
        /**
         * Updates the global token and header objects based on competitor inputs
         */
        updateTokensAndHeaders() {
            this.COMPETITOR_TOKENS = {};
            this.COMPETITOR_HEADERS = {};
            
            for (const competitor of this.competitors) {
                if (competitor.token && competitor.token.trim() !== '') {
                    this.COMPETITOR_TOKENS[competitor.name] = competitor.token.trim();
                    this.COMPETITOR_HEADERS[competitor.name] = {
                        "Accept": "application/json", 
                        "Content-Type": "application/json", 
                        "Authorization": `bearer ${competitor.token.trim()}`
                    };
                }
            }
        },
        
        /**
         * Sends preparation requests to get items for each competitor
         */
        sendPreparationRequests() {
            // Validate form
            if (!this.preparation.url) {
                alert('Please enter a URL for the preparation request');
                return;
            }
            
            if (this.competitors.length === 0) {
                alert('Please set up competitors first');
                return;
            }
            
            // Update tokens and headers
            this.updateTokensAndHeaders();
            
            if (Object.keys(this.COMPETITOR_TOKENS).length === 0) {
                alert('Please enter at least one API token');
                return;
            }
            
            this.isPreparationLoading = true;
            this.COMPETITOR_OBJECTS = {};
            
            // Create requests for each competitor
            const promises = [];
            
            for (const [name, headers] of Object.entries(this.COMPETITOR_HEADERS)) {
                let apiInput;
                
                try {
                    // Try to parse as JSON if there's a body
                    if (this.preparation.body && this.preparation.body.trim()) {
                        const jsonBody = JSON.parse(this.preparation.body);
                        apiInput = ApiClientInput.createJson(
                            this.preparation.method,
                            this.preparation.url,
                            jsonBody,
                            headers
                        );
                    } else {
                        apiInput = ApiClientInput.create(
                            this.preparation.method,
                            this.preparation.url,
                            null,
                            headers
                        );
                    }
                } catch (error) {
                    // If JSON parsing fails, use raw body
                    apiInput = ApiClientInput.create(
                        this.preparation.method,
                        this.preparation.url,
                        this.preparation.body,
                        headers
                    );
                }
                
                // Send the request
                const promise = ApiClient.send(apiInput)
                    .then(output => {
                        if (output.isSuccessful()) {
                            const jsonData = output.parseJsonBody();
                            if (jsonData && Array.isArray(jsonData)) {
                                this.COMPETITOR_OBJECTS[name] = jsonData;
                            } else {
                                console.error(`Response for ${name} is not an array:`, output.body);
                                this.COMPETITOR_OBJECTS[name] = [];
                            }
                        } else {
                            console.error(`Request failed for ${name}:`, output.getFailureReason());
                            this.COMPETITOR_OBJECTS[name] = [];
                        }
                    })
                    .catch(error => {
                        console.error(`Error for ${name}:`, error);
                        this.COMPETITOR_OBJECTS[name] = [];
                    });
                
                promises.push(promise);
            }
            
            // Wait for all requests to complete
            Promise.all(promises)
                .finally(() => {
                    this.isPreparationLoading = false;
                    this.initializeCompetitorsData();
                });
        },
        
        /**
         * Initializes the visual data structure for each competitor
         */
        initializeCompetitorsData() {
            this.competitorsData = {};
            
            // Process all competitors
            for (const name in this.COMPETITOR_HEADERS) {
                const objects = this.COMPETITOR_OBJECTS[name] || [];
                const rows = [];
                const boxesPerRow = 50; // 50 boxes per row as per requirements
                
                // Calculate how many rows we need (based on itemsPerCompetitor)
                const maxRows = Math.ceil(this.itemsPerCompetitor / boxesPerRow);
                
                for (let i = 0; i < maxRows; i++) {
                    const row = [];
                    
                    for (let j = 0; j < boxesPerRow; j++) {
                        const index = i * boxesPerRow + j;
                        if (index < objects.length) {
                            row.push({
                                status: 'empty',
                                id: objects[index].id || `item-${index}`
                            });
                        } else if (index < this.itemsPerCompetitor) {
                            // Add empty placeholder boxes up to the specified limit
                            row.push({
                                status: 'empty',
                                id: null
                            });
                        }
                    }
                    
                    if (row.length > 0) {
                        rows.push(row);
                    }
                }
                
                // Use Vue.set to ensure reactivity
                Vue.set(this.competitorsData, name, {
                    total: 0,
                    passed: 0,
                    running: 0,
                    failed: 0,
                    rows: rows
                });
            }
            
            // Force update to ensure the UI reflects changes
            this.$forceUpdate();
        },
        
        /**
         * Downloads the current settings as a JSON file
         */
        downloadSettings() {
            const settings = {
                competitorCount: this.competitorCount,
                itemsPerCompetitor: this.itemsPerCompetitor,
                competitors: this.competitors,
                preparation: this.preparation,
                action: this.action
            };
            
            const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'rate-of-fire-settings.json';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);
        },
        
        /**
         * Uploads and applies settings from a JSON file
         */
        uploadSettings(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const settings = JSON.parse(e.target.result);
                    
                    // Apply settings
                    if (settings.competitorCount) {
                        this.competitorCount = settings.competitorCount;
                    }
                    
                    if (settings.itemsPerCompetitor) {
                        this.itemsPerCompetitor = settings.itemsPerCompetitor;
                    }
                    
                    if (settings.preparation) {
                        this.preparation = settings.preparation;
                    }
                    
                    if (settings.action) {
                        this.action = settings.action;
                    }
                    
                    // Setup competitors
                    this.setupCompetitors();
                    
                    // Apply competitor tokens and names if provided
                    if (settings.competitors && Array.isArray(settings.competitors)) {
                        for (let i = 0; i < this.competitors.length && i < settings.competitors.length; i++) {
                            if (settings.competitors[i].token) {
                                this.competitors[i].token = settings.competitors[i].token;
                            }
                            if (settings.competitors[i].name) {
                                const oldName = this.competitors[i].name;
                                this.competitors[i].name = settings.competitors[i].name;
                                this.updateCompetitorName(i, settings.competitors[i].name);
                            }
                        }
                    }
                    
                    // Update tokens and headers
                    this.updateTokensAndHeaders();
                    
                } catch (error) {
                    console.error('Error parsing settings file:', error);
                    alert('Error loading settings. Please check that the file format is correct.');
                }
            };
            
            reader.readAsText(file);
            
            // Reset the file input so the same file can be selected again
            event.target.value = '';
        },
        
        /**
         * Starts the action requests with a countdown
         */
        startActionRequests() {
            // Validate form
            if (!this.action.url) {
                alert('Please enter a URL for the action requests');
                return;
            }
            
            if (!this.action.url.includes('{id}')) {
                alert('URL must include {id} placeholder which will be replaced with item IDs');
                return;
            }
            
            if (Object.keys(this.COMPETITOR_OBJECTS).length === 0) {
                alert('Please run the preparation step first to get items');
                return;
            }
            
            // Reset data for a new run if needed
            if (Object.keys(this.competitorsData).length === 0) {
                this.initializeCompetitorsData();
            } else {
                // Reset counters but keep the structure
                for (const name in this.competitorsData) {
                    this.competitorsData[name].total = 0;
                    this.competitorsData[name].passed = 0;
                    this.competitorsData[name].running = 0;
                    this.competitorsData[name].failed = 0;
                    
                    // Reset box statuses
                    for (const row of this.competitorsData[name].rows) {
                        for (const box of row) {
                            this.$set(box, 'status', 'empty');
                        }
                    }
                }
            }
            
            // Record test start time
            this.testStartTime = new Date();
            this.testEndTime = null;
            
            // Start countdown
            this.isCountingDown = true;
            this.countdownValue = 3;
            this.countdownInterval = setInterval(() => {
                this.countdownValue--;
                
                if (this.countdownValue <= 0) {
                    clearInterval(this.countdownInterval);
                    this.isCountingDown = false;
                    this.executeActionRequests();
                }
            }, 1000);
        },
        
        /**
         * Calculate rankings based on current pass counts
         * Handles ties correctly and applies winner/loser badges appropriately
         */
        calculateRankings() {
            const competitors = Object.entries(this.competitorsData);
            if (competitors.length <= 1) {
                this.competitorRankings = {}; // Don't show rankings if only one competitor
                return;
            }
            
            // Sort competitors by pass count (descending)
            const sortedCompetitors = [...competitors].sort((a, b) => b[1].passed - a[1].passed);
            
            // Group competitors by pass count to handle ties
            const passCounts = {};
            sortedCompetitors.forEach(([name, data]) => {
                const passCount = data.passed;
                if (!passCounts[passCount]) {
                    passCounts[passCount] = [];
                }
                passCounts[passCount].push(name);
            });
            
            // Sort unique pass counts in descending order
            const uniquePassCounts = Object.keys(passCounts).map(Number).sort((a, b) => b - a);
            
            // Find if there are multiple competitors in first or last position
            const isFirstPlaceTied = passCounts[uniquePassCounts[0]].length > 1;
            const isLastPlaceTied = passCounts[uniquePassCounts[uniquePassCounts.length - 1]].length > 1;
            
            // Create rankings object
            const rankings = {};
            let currentRank = 1;
            
            // Assign rankings, handling ties
            uniquePassCounts.forEach(passCount => {
                const names = passCounts[passCount];
                names.forEach(name => {
                    const isFirst = currentRank === 1;
                    const isLast = currentRank + names.length - 1 === competitors.length;
                    
                    let label, cssClass;
                    
                    if (isFirst && !isFirstPlaceTied) {
                        label = `No. ${currentRank} (winner)`;
                        cssClass = 'rank-winner';
                    } else if (isLast && !isLastPlaceTied) {
                        label = `No. ${currentRank} (loser)`;
                        cssClass = 'rank-loser';
                    } else {
                        label = `No. ${currentRank}`;
                        cssClass = 'rank-normal';
                    }
                    
                    rankings[name] = {
                        position: currentRank,
                        label: label,
                        class: cssClass
                    };
                });
                
                // Move rank counter forward by the number of tied competitors
                currentRank += passCounts[passCount].length;
            });
            
            this.competitorRankings = rankings;
        },
        
        /**
         * Executes the actual API requests after countdown
         */
        executeActionRequests() {
            this.isActionRunning = true;
            this.hasActionRun = true;
            
            // Reset and calculate initial rankings at test start
            this.calculateRankings();
            
            // Record actual test start time (after countdown)
            this.actualTestStartTime = new Date();
            this.elapsedTime = 0;
            
            // Start the timer
            this.startTimer();
            
            // Calculate interval based on requests per minute
            const intervalMs = 60000 / this.action.requestsPerMinute;
            
            // Track current index for each competitor
            const indices = {};
            for (const name in this.COMPETITOR_OBJECTS) {
                indices[name] = 0;
            }
            
            // Start the main request interval
            this.actionInterval = setInterval(() => {
                // Process each competitor
                for (const [name, objects] of Object.entries(this.COMPETITOR_OBJECTS)) {
                    if (objects.length === 0) continue;
                    
                    // Get the current object to process (cycle through the list)
                    const index = indices[name] % objects.length;
                    const obj = objects[index];
                    
                    // Find box position (wrapping after itemsPerCompetitor)
                    const boxIndex = this.competitorsData[name].total % this.itemsPerCompetitor;
                    const rowIndex = Math.floor(boxIndex / 50);
                    const colIndex = boxIndex % 50;
                    
                    if (rowIndex < this.competitorsData[name].rows.length && 
                        colIndex < this.competitorsData[name].rows[rowIndex].length) {
                        
                        // Record request time
                        const requestTime = new Date();
                        
                        // Immediately increment counters and update box to running state
                        Vue.set(this.competitorsData[name].rows[rowIndex][colIndex], 'status', 'running');
                        Vue.set(this.competitorsData[name].rows[rowIndex][colIndex], 'requestTime', requestTime);
                        Vue.set(this.competitorsData[name].rows[rowIndex][colIndex], 'id', obj.id); // Ensure ID is set for this box
                        Vue.set(this.competitorsData[name], 'total', this.competitorsData[name].total + 1);
                        Vue.set(this.competitorsData[name], 'running', this.competitorsData[name].running + 1);
                        
                        // Force update to ensure UI reflects the changes
                        this.$forceUpdate();
                        
                        // Prepare API request
                        const url = this.action.url.replace('{id}', obj.id);
                        let apiInput;
                        
                        try {
                            if (this.action.body && this.action.body.trim()) {
                                const jsonBody = JSON.parse(this.action.body);
                                apiInput = ApiClientInput.createJson(
                                    this.action.method,
                                    url,
                                    jsonBody,
                                    this.COMPETITOR_HEADERS[name]
                                );
                            } else {
                                apiInput = ApiClientInput.create(
                                    this.action.method,
                                    url,
                                    null,
                                    this.COMPETITOR_HEADERS[name]
                                );
                            }
                        } catch (error) {
                            apiInput = ApiClientInput.create(
                                this.action.method,
                                url,
                                this.action.body,
                                this.COMPETITOR_HEADERS[name]
                            );
                        }
                        
                        // Store current position and name for callback closure
                        const currentName = name;
                        const currentRowIndex = rowIndex;
                        const currentColIndex = colIndex;
                        
                        // Send request
                        ApiClient.send(apiInput)
                            .then(output => {
                                // Record response time
                                const responseTime = new Date();
                                Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'responseTime', responseTime);
                                
                                // Update counters - use Vue.set for reactivity
                                Vue.set(this.competitorsData[currentName], 'running', this.competitorsData[currentName].running - 1);
                                
                                // Update box status based on result
                                if (output.isSuccessful()) {
                                    Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'status', 'pass');
                                    Vue.set(this.competitorsData[currentName], 'passed', this.competitorsData[currentName].passed + 1);
                                    
                                    // Update rankings when pass count changes
                                    this.calculateRankings();
                                } else {
                                    Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'status', 'fail');
                                    Vue.set(this.competitorsData[currentName], 'failed', this.competitorsData[currentName].failed + 1);
                                }
                                
                                // Force update to ensure UI reflects the changes
                                this.$forceUpdate();
                            })
                            .catch(() => {
                                // Record response time
                                const responseTime = new Date();
                                Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'responseTime', responseTime);
                                
                                // Update counters - use Vue.set for reactivity
                                Vue.set(this.competitorsData[currentName], 'running', this.competitorsData[currentName].running - 1);
                                Vue.set(this.competitorsData[currentName], 'failed', this.competitorsData[currentName].failed + 1);
                                Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'status', 'fail');
                                
                                // Force update to ensure UI reflects the changes
                                this.$forceUpdate();
                            });
                    }
                    
                    // Move to next item
                    indices[name]++;
                }
            }, intervalMs);
        },
        
        /**
         * Stops the action requests
         * Preserves the competitor rankings
         */
        stopActionRequests() {
            clearInterval(this.actionInterval);
            clearInterval(this.countdownInterval);
            clearInterval(this.timerInterval);
            this.isActionRunning = false;
            this.isCountingDown = false;
            
            // Record test end time
            this.testEndTime = new Date();
            
            // Note: We intentionally don't reset rankings when stopping
        },
        
        /**
         * Starts the timer for tracking test duration
         */
        startTimer() {
            // Clear any existing timer
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
            }
            
            const startTime = new Date().getTime();
            
            this.timerInterval = setInterval(() => {
                const currentTime = new Date().getTime();
                this.elapsedTime = Math.floor((currentTime - startTime) / 1000);
            }, 1000);
        },
        
        /**
         * Formats seconds into MM:SS display
         */
        formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
        },
        
        /**
         * Updates the SQL matrix duration setting
         */
        updateSqlMatrixDuration() {
            this.reportGenerator.setSqlMatrixDuration(this.sqlMatrixDuration);
        },
        
        /**
         * Downloads a Markdown report of the test results
         */
        downloadMarkdownReport() {
            if (this.reportGenerator) {
                this.reportGenerator.downloadMarkdownReport();
            }
        },
        
        /**
         * Downloads a SQL report of the test results
         */
        downloadSqlReport() {
            if (this.reportGenerator) {
                this.reportGenerator.setSqlMatrixDuration(this.sqlMatrixDuration);
                this.reportGenerator.downloadSqlReport();
            }
        }
    }
});

// Random page texture
window.onload = function() {
    const classes = ['texture-dots', 'texture-stripes', 'texture-grid', 'texture-paper'];
    const div = document.getElementById('texture-settings');
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    div.className = randomClass;
};