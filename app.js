new Vue({
    el: '#app',
    data: {
        // Competitor setup
        competitorCount: 3,
        itemsPerCompetitor: 2000, // New setting for items per competitor
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
        countdownInterval: null
    },
    methods: {
        /**
         * Sets up the competitor columns based on the count input
         */
        setupCompetitors() {
            // Reset the competitor data
            this.competitors = [];
            this.COMPETITOR_TOKENS = {};
            this.COMPETITOR_HEADERS = {};
            this.COMPETITOR_OBJECTS = {};
            this.competitorsData = {};
            this.hasActionRun = false;
            
            // Generate names for competitors (auto-assigned)
            const names = ['Andy', 'Bob', 'Chris', 'Diana', 'Eva', 'Frank', 'Grace', 'Helen', 'Ian', 'Jack'];
            
            // Create competitor objects
            for (let i = 0; i < this.competitorCount && i < names.length; i++) {
                this.competitors.push({
                    name: names[i],
                    token: ''
                });
                
                // Initialize empty competitor data structure for display
                Vue.set(this.competitorsData, names[i], {
                    total: 0,
                    passed: 0,
                    running: 0,
                    failed: 0,
                    rows: []
                });
            }
            
            // Create empty boxes for visualization
            this.updateTokensAndHeaders();
            this.initializeCompetitorsData();
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
                    
                    // Apply competitor tokens if provided
                    if (settings.competitors && Array.isArray(settings.competitors)) {
                        for (let i = 0; i < this.competitors.length && i < settings.competitors.length; i++) {
                            if (settings.competitors[i].token) {
                                this.competitors[i].token = settings.competitors[i].token;
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
         * Executes the actual API requests after countdown
         */
        executeActionRequests() {
            this.isActionRunning = true;
            this.hasActionRun = true;
            
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
                        
                        // Immediately increment counters and update box to running state
                        Vue.set(this.competitorsData[name].rows[rowIndex][colIndex], 'status', 'running');
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
                                // Update counters - use Vue.set for reactivity
                                Vue.set(this.competitorsData[currentName], 'running', this.competitorsData[currentName].running - 1);
                                
                                // Update box status based on result
                                if (output.isSuccessful()) {
                                    Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'status', 'pass');
                                    Vue.set(this.competitorsData[currentName], 'passed', this.competitorsData[currentName].passed + 1);
                                } else {
                                    Vue.set(this.competitorsData[currentName].rows[currentRowIndex][currentColIndex], 'status', 'fail');
                                    Vue.set(this.competitorsData[currentName], 'failed', this.competitorsData[currentName].failed + 1);
                                }
                                
                                // Force update to ensure UI reflects the changes
                                this.$forceUpdate();
                            })
                            .catch(() => {
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
         */
        stopActionRequests() {
            clearInterval(this.actionInterval);
            clearInterval(this.countdownInterval);
            this.isActionRunning = false;
            this.isCountingDown = false;
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
