# Spatial History of Charleston (SHOC)

A web-based interactive map application for exploring the historical geography of Charleston, South Carolina.

## Overview

SHOC allows users to view historic maps overlaid on modern base maps, browse historical places and structures, and search for people listed in historical city directories. The application features:

- Interactive map with historic map overlays from 1670 to 1950
- Adjustable opacity for comparing historic and modern geography
- Date range filtering for maps and points
- Searchable database of places, structures, and historical residents
- Detailed information panels for selected features
- Guided tour of the application

## Getting Started

### Prerequisites

This application runs entirely in the browser and does not require a build step. You will need:

- A modern web browser (Chrome, Firefox, Edge, or Safari)
- A web server to serve the files (due to ES module usage)

### Running Locally

1. Clone or download this repository.

2. Serve the files using any static web server. For example, using Python:

   ```bash
   # Python 3
   python -m http.server 8000
   ```

   Or using Node.js with http-server:

   ```bash
   npx http-server
   ```

3. Open your browser and navigate to `http://localhost:8000` (or the appropriate port).

## Project Structure

```
MobileTest/
    index.html      Main HTML file
    style.css       Application styles
    app.js          Application logic (JavaScript module)
    shoc_logo.jpg   Project logo image
    docs/
        projectDesc.md   Detailed codebase documentation
```

## Technology Stack

- ArcGIS Maps SDK for JavaScript (v4.33)
- ArcGIS Calcite Components (v3.2.1)
- Bootstrap 4.6.2
- jQuery Slim 3.5.1
- Intro.js (for guided tours)

## Data Sources

All geographic data is served from ArcGIS feature services hosted on the College of Charleston server:

- Historic map index with tile layer URLs
- Places index with simplified point data
- Detailed places layer with full attributes
- People layer from the 1888 Charleston city directory

## Usage

### Viewing Historic Maps

1. Click on a map year in the sidebar to load it.
2. Use the opacity slider in the top navigation to adjust transparency.
3. Click "Zoom to Map Extent" to see the full map coverage.

### Searching

Type keywords in the search bar to find:

- Maps (by title, year, author, or repository)
- Places (by address, material, or function)
- People (by name, occupation, or address)

### Filtering by Date

Move the date range slider handles to filter maps and points by year.

### Exploring Points

Click on any red point on the map to see:

- Building details (address, materials, function)
- Related historical records
- Links to associated people

### Taking a Tour

Click the "Take a Tour" button in the top right corner of the map for a guided walkthrough of all features.

## Documentation

For a detailed explanation of the codebase, see `docs/projectDesc.md`.

## Contributing

This project is part of the Spatial History of Charleston initiative at the College of Charleston.

## License

Contact the project maintainers for licensing information.
