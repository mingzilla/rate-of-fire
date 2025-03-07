# Rate of Fire

API Performance Testing Tool

## Project Overview

Rate of Fire is a lightweight API performance testing tool that allows you to test multiple API endpoints concurrently with customizable request rates. The application visualizes test results in real-time and generates comprehensive reports in Markdown and SQL formats.

## File Structure

~~~
rate-of-fire/
├── index.html            # Main HTML file
├── styles.css            # CSS styling
├── app.js                # Main application logic
├── report-generator.js   # Report generation functionality
└── README.md             # This documentation
~~~

## Usage

### Running Locally

You can run the application locally using Python's built-in HTTP server:

~~~bash
python -m http.server 8080
~~~

Then access the application at:
~~~
http://localhost:8080
~~~

### Public Access

The application is also available online at:

~~~
https://mingzilla.github.io/rate-of-fire/
~~~

## Features

- **Multi-competitor testing**: Test APIs with multiple credentials simultaneously
- **Customizable request rates**: Set requests per minute for realistic load testing
- **Real-time visualization**: See test results update in real-time
- **Editable competitor names**: Customize names for better test organization
- **Save/Load configurations**: Export and import test configurations as JSON
- **Comprehensive reports**: Generate Markdown and SQL reports for analysis
- **SQL Matrix Duration**: Configure time window for SQL performance metrics

## Getting Started

1. Set the number of competitors and items per competitor
2. Click "Setup" to initialize the test environment
3. Enter API tokens for each competitor
4. Configure and send preparation requests to fetch test items
5. Set up action requests with the target endpoint URL (using {id} placeholder)
6. Configure request rate and optional request body
7. Click "Start" to begin the test
8. Monitor real-time results in the visualization grid
9. Click "Stop" when finished
10. Download reports in Markdown or SQL format

## Notes

- The application requires no backend and runs entirely in the browser
- All API requests are made directly from the client
- API tokens are never stored outside your browser

## Dependencies

- Vue.js (v2.6.14)
- API Client JS (from cdn.jsdelivr.net)
- Lodash (v4.17.21) 
- Font Awesome (v5.15.4)
