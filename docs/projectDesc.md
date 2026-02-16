# Spatial History of Charleston (SHOC) - Project Description

This document provides an exhaustive breakdown of the SHOC web application codebase. The application is an interactive map viewer that displays historical maps and geographic data points related to Charleston, South Carolina.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [File Structure](#file-structure)
4. [index.html - The HTML Structure](#indexhtml---the-html-structure)
5. [style.css - Styling and Layout](#stylecss---styling-and-layout)
6. [app.js - Application Logic](#appjs---application-logic)

---

## Project Overview

The SHOC application allows users to:

- View historic maps of Charleston overlaid on a modern base map.
- Browse and search for points representing historical places (buildings, structures).
- Browse and search for people associated with historical addresses.
- Filter maps and points by date range (1670 to 1950).
- Adjust the opacity of the historic map overlay to compare past and present geography.
- Take a guided tour of the application features.

The data is served from an ArcGIS Server instance hosted at `lyre.cofc.edu`. The application is a single-page web application that runs entirely in the browser.

---

## Technology Stack

### Core Libraries

- **ArcGIS Maps SDK for JavaScript (v4.33)**: The primary mapping library. It provides the interactive map component, feature layers for querying geographic data, tile layers for displaying historic maps, and various utility functions.

- **ArcGIS Calcite Components (v3.2.1)**: A library of web components from Esri that provides UI elements like switches, loaders, labels, and icons that are styled to match the ArcGIS ecosystem.

- **Bootstrap 4.6.2**: A CSS framework used for responsive layout (grid system, navbars) and UI components (tabs, dropdowns, list groups, buttons).

- **jQuery Slim 3.5.1**: A lightweight version of jQuery, used primarily by Bootstrap for its JavaScript components like tab switching and dropdown menus.

- **Intro.js**: A library used to create the step-by-step guided tour of the application.

### Data Sources

All geographic data comes from ArcGIS feature services hosted on `lyre.cofc.edu/server/rest/services/shoc/`:

- `map_index/FeatureServer/0`: An index of available historic maps. Each feature contains metadata about a map (title, year, author, publisher) and a `service_url` pointing to the map tiles.

- `places_index/FeatureServer/0`: A simplified index of all historical places. Used to display the red points on the map and in the sidebar list. Each feature has an `ORIG_FID` that links to the detailed `places` layer.

- `places/FeatureServer/0`: The detailed layer containing all attributes for historical places, including address, materials, function, and source year. This layer is queried when a user clicks on a point to get the full details.

- `DBO_people_cd1888/FeatureServer/64`: A layer containing records of people from the 1888 Charleston city directory. Attributes include name, occupation, office address, and residence.

---

## File Structure

The project consists of three core files:

- `index.html`: The main HTML document defining the page structure.
- `style.css`: The stylesheet for all custom styling.
- `app.js`: The JavaScript file containing all application logic.
- `shoc_logo.jpg`: The project logo image (not used in current code, an external URL is used instead).

---

## index.html - The HTML Structure

The HTML file is organized into three main sections: the head, the navigation, and the map area.

### The Head Section (Lines 1-26)

The `<head>` section loads all external dependencies:

1. **Meta Tags**: Sets the character encoding to UTF-8 and configures the viewport for mobile responsiveness.

2. **Title**: Sets the page title to "Spatial History of Charleston".

3. **Bootstrap CSS and JS**: Loads Bootstrap 4.6.2 from a CDN for styling and interactive components.

4. **Intro.js**: Loads the CSS and JS for the guided tour functionality.

5. **Custom CSS**: Links to the local `style.css` file.

6. **ArcGIS Configuration Script**: An inline script that sets the `esriConfig.apiKey`. This API key is required to authenticate with ArcGIS services.

7. **Calcite Components**: Loads the Calcite web components from the ArcGIS CDN.

8. **ArcGIS SDK**: Loads the main ArcGIS Maps SDK CSS and JavaScript from the Esri CDN.

9. **Map Components**: Loads additional map-specific web components from ArcGIS.

### Navigation Row 1 (Lines 29-60) - `#navRow1`

This is the primary navigation bar containing:

- **Logo and Title**: An anchor linking to the main SHOC portal. It contains an image (loaded from imgur.com) and the site title. The title text changes based on screen size: "Spatial History of Charleston" on larger screens and "SHOC" on mobile.

- **Navbar Toggler**: A hamburger-style button that toggles the visibility of the collapsible navbar content on smaller screens. It uses a Calcite sliders icon.

- **Collapsible Content**: A div with `class="collapse navbar-collapse"` that contains the opacity slider. This slider has a range from 0 to 100 and controls the transparency of the historic map overlay.

- **Dropdown Menu**: A hamburger button that reveals a dropdown with links to external pages: "About the Project", "About the Maps", "Meet the Team", and "Access the Data".

### Navigation Row 2 (Lines 62-114) - `#navRow2`

This secondary navigation bar contains the search and filtering controls:

- **Search Group (`#searchGroup`)**: An input field with a "Search" button. Users can type keywords to search maps and points.

- **Date Slider Container (`#date-slider-container`)**: A dual-handle range slider. The left handle (`#dateSlider_l`) sets the minimum year and the right handle (`#dateSlider_r`) sets the maximum year. The current min and max values are displayed on either side of the slider. The range is 1670 to 1950.

- **Point Toggle (`#pointToggle`)**: A Calcite switch component that toggles the visibility of all points on the map.

- **Points Filter (`#pointsFilter`)**: A group of three radio buttons styled as toggle buttons: "Places", "People", and "Both". These control which type of data layer is visible on the map.

### The Map Area (Lines 116-205)

This div contains the interactive map and the sidebar.

#### The Sidebar (`#feature-node`, Lines 117-165)

The sidebar is a panel that displays search results and detailed information. It is initially hidden and controlled by JavaScript.

- **Tabs (`#infoTabsMenu`)**: Three tabs for switching between views:
    - **Maps Tab (`#mapsCounter`)**: Shows a list of historic maps and details for the selected map.
    - **Places Tab (`#pointsCounter`)**: Shows a list of matching places and details for the selected place.
    - **People Tab (`#peopleCounter`)**: Shows a list of matching people and details for the selected person.

- **Tab Content (Lines 130-164)**: Each tab has its own content panel:
    - `#selectedDiv`: Contains `#result-list` (a `<ul>` for map results) and `#mapsInfo` (a div for selected map details). The default list item says "Hide Map".
    - `#resultsDiv`: Contains `#point-list` (a `<ul>` for place results) and `#pointsInfo` (a div for selected point details).
    - `#peopleDiv`: Contains `#people-list` (a `<ul>` for people results) and `#personInfo` (a div for selected person details).

#### The Expand/Collapse Button (`#infoPanelButton`, Lines 167-179)

This button contains two SVG icons: a "chevron double right" icon for expanding and a "chevron double left" icon for collapsing. Only one is visible at a time, toggled by JavaScript.

#### The ArcGIS Map Component (`<arcgis-map>`, Lines 181-204)

This is a web component from the ArcGIS SDK. It is configured with:

- `basemap="streets"`: Sets the default base map style.
- `center="-79.939, 32.785"`: Sets the initial map center (longitude, latitude) to Charleston, SC.
- `zoom="13"`: Sets the initial zoom level.

Inside the map component are several child components for map controls:

- `<arcgis-placement position="top-right">`: Contains the "Take a Tour" button that triggers the Intro.js tour.
- `<arcgis-zoom>`: The zoom in/out buttons.
- `<arcgis-home>`: A button to reset the map to its original extent.
- `<arcgis-locate>`: A button to pan the map to the user's current GPS location.
- `<arcgis-scale-bar>`: A scale bar displayed in the bottom left.
- `<arcgis-compass>`: A compass button to reset map rotation.
- `<arcgis-basemap-toggle>`: A button to switch between street and satellite base maps.
- `<arcgis-placement position="bottom-left">`: Contains instructional text telling users how to rotate the map.
- `#loader-container`: A div containing a Calcite loader component, shown while data is loading.

### Script Loading (Line 207)

The main application logic is loaded as a JavaScript module from `app.js`.

---

## style.css - Styling and Layout

The stylesheet is approximately 620 lines and defines all custom styling for the application.

### CSS Custom Properties (Lines 1-34)

CSS variables are defined on the `:root` element to create a consistent color palette:

- `--primary-color: #792530` (a dark maroon/burgundy)
- `--secondary-color: #ffffff` (white)
- `--tertiary-color: #efbb3c` (a warm gold/yellow)
- `--text-light: #ffffff`
- `--text-dark: #1B1E1D`
- `--neutral-light: #f0f0f0`
- `--neutral-dark: #bfa87c`
- `--header-height: 56px`
- `--border-radius: 0`

Several Calcite component variables are also overridden to match the color scheme.

### Global Base Styles (Lines 36-130)

- **`body`**: Sets full viewport height, removes default padding/margin, and defines the font family as Inter or Avenir Next.

- **`.map-area`**: Calculated height using `calc(100vh - (2 * var(--header-height)))` to ensure the map fills the remaining viewport space after the two navigation bars.

- **Headings (`h1`, `h2`, `h3`, `h4`)**: Sets font sizes and colors. The `h1` uses a serif font ("Caslon Pro").

- **Labels and Horizontal Rules**: Basic styling for form labels and `<hr>` elements.

- **Custom Height Classes**: `.h-7` (7% height) and `.h-86` (86% height) for layout purposes.

- **Border Radius Override**: Applies `--border-radius` to form controls, buttons, list items, and other interactive elements.

- **Button Focus State**: Removes the default outline on focused buttons.

- **`.histOptions` Hover**: Applies the tertiary color on hover.

### Navigation Styles (Lines 131-270)

- **`.nav-row`**: Sets a fixed height of 56px and centers content vertically.

- **`#navRow1` and `#navRow2`**: Both have the primary maroon background.

- **`.button1` and `.button2`**: Two button style groups. `.button1` is used for the toggle buttons (Places/People/Both), while `.button2` is used for standard action buttons.

- **Hover States**: Buttons generally change to the tertiary gold color on hover.

- **`.largeScreenText` and `.smallScreenText`**: Used for responsive text. Large screen text is shown by default; small screen text is hidden.

- **Tab Styling (`.nav-tabs`, `.nav-link`)**: Tabs have a white background by default and use the primary maroon color when active.

### Layout and Map Styles (Lines 271-355)

- **`#feature-node`**: The sidebar panel. It floats left, takes 25% of the viewport width, has a neutral light background, and is hidden by default (`display: none`).

- **`arcgis-map`**: Floats right and takes full width when the sidebar is hidden. When the sidebar is visible, CSS selector `.map-area #feature-node[style*="display: block"] ~ arcgis-map` reduces it to 75% width.

- **`.expandButton`**: Absolutely positioned with a high z-index to float over the map.

- **`#loader-container`**: Absolutely centered on the map with a semi-transparent white background. Hidden by default.

### List and Result Box Styles (Lines 356-390)

- **`.list-group-item`**: Sets font size, padding, and background for list items. Active items get the tertiary gold background.

- **`.selectedBox` and `.resultBox`**: Styling for the info panels, with a max-height of 40% of the viewport and overflow scrolling.

### Scrollbar Customization (Lines 391-405)

WebKit scrollbar styles are customized to have a thin, rounded thumb with the neutral-dark color.

### Range Slider Styles (Lines 406-560)

These styles customize the appearance of the HTML range inputs:

- **Single-Handle Slider (`.rangeSlider`)**: A 5px high track with a white background. The thumb is 14px, round, gold, with a maroon outline.

- **Dual-Handle Slider (`.range-slider-wrap`)**: A wrapper for two overlapping range inputs to create a min/max range selection. The inputs are styled identically to the single slider.

- **Slider Value Labels**: `.slider-value-left` and `.slider-value-right` display the current min/max values.

### Responsive Styles (Lines 576-616)

A media query for screens narrower than 768px makes the following adjustments:

- `#feature-node` becomes absolutely positioned at 80% viewport width with a drop shadow, allowing it to overlay the map.
- `arcgis-map` is forced to 100% width.
- `.map-area` height is recalculated to account for only one nav row.
- `.largeScreenText` is hidden and `.smallScreenText` is shown.
- The map floater instruction text is hidden.

---

## app.js - Application Logic

The JavaScript file is approximately 1540 lines and is loaded as an ES module. It handles all interactive functionality.

### Section 1: Variable Declarations (Lines 1-60)

This section declares all variables used throughout the application.

#### DOM Element References

Constants are declared for frequently accessed DOM elements:

- **Sliders and Map Interaction**:
    - `opacityInput`: The opacity range slider.
    - `rangeOutput`: The span displaying the current opacity percentage.
    - `viewElement`: The `<arcgis-map>` web component.
    - `dateSlider_l` and `dateSlider_r`: The left and right handles of the date range slider.
    - `dateMinValue` and `dateMaxValue`: Spans showing the current date range.
    - `searchBar`: The search input field.
    - `searchButton`: The search/clear button.

- **Sidebar/Results**:
    - `featureNode`: The sidebar container div.
    - `expandCollapse`: The button to show/hide the sidebar.
    - `collapseIcon` and `expandIcon`: The SVG icons for the expand/collapse states.
    - `pointsFilterMenu`: The radio button group for layer filtering.
    - `pointsSwitch`: The Calcite switch for toggling point visibility.
    - `resultsList`: The `<ul>` for map results.
    - `pointsList` and `pointListElement`: References to the places list.
    - `personListElement`: Reference to the people list.
    - `mapsInfo`: The div showing selected map info.
    - `mapsCounter`, `pointsCounter`: Tab links with result counts.
    - `pointsInfo`: The div showing selected point info.

#### ArcGIS Imports

Several modules from the ArcGIS SDK are dynamically imported using the `$arcgis.import()` function:

- `FeatureLayer`: Used to create layers from feature services.
- `TileLayer`: Used to display the historic map tiles.
- `webMercatorUtils`: Utilities for converting between geographic and projected coordinates.
- `Extent`: Used on map extents.
- `GraphicsLayer`: For displaying custom graphics.
- `SimpleRenderer`: For defining layer symbology.
- `reactiveUtils`: For watching and reacting to property changes (like map extent).

#### Layer-Related Variables

- `whereClause` and `wherePointClause`: Store SQL-like filter expressions.
- `zoom`: The initial zoom level.
- `highlight`, `currentHighlight`: Variables for managing feature highlighting.
- `clickedGraphic`: Reference to the last clicked graphic.
- `tileLayer`: The currently displayed historic map tile layer.
- `pointsLayer`, `placesLayer`, `peopleLayer`: Feature layers for the data.
- `lastSelectedOrigFid`, `lastSelectedAddress`: Track the currently selected point.
- `relatedGraphicsLayer`: A graphics layer for related points (not fully used).
- `currentLoaderHandle`, `loadingTimer`: For managing the loading indicator.
- `timelineFilter`: The current filter string for the date range.

### Helper Functions (Lines 62-241)

#### `handlePointSelection(objectId)` (Lines 62-117)

This function is called when a user clicks on a point in the sidebar list. It:

1. Clears any previous highlight.
2. Queries `pointsLayer` to get the feature with the matching `OBJECTID`.
3. Centers the map on the point's geometry.
4. Saves the `ORIG_FID` and address globally.
5. Calls `queryAndDisplayPlaces()` to populate the detail panel.
6. Shows/expands the sidebar and switches to the Places tab.
7. Calls `updateSliders()` to refresh map results.

#### `createStringIfNotNull(...variables)` (Lines 120-129)

A utility function that concatenates all arguments into a single string only if the second argument (the data part) is not null, undefined, or empty. Used to conditionally build HTML strings for detail panels.

#### `queryAndDisplayPlaces(origFidValue, originalAddress)` (Lines 132-241)

This function populates the Places detail panel with records related to a selected point.

1. Constructs a `WHERE` clause filtering by `place_ID` and the current date range.
2. Sets `placesLayer.definitionExpression` to show only the related points on the map.
3. Queries `placesLayer` for all matching records.
4. For each record:
    - Converts the point's x/y coordinates to longitude/latitude using `webMercatorUtils.xyToLngLat()`.
    - Builds HTML strings for each attribute (source, address, materials, function, etc.).
    - Checks if there are related people records at the address using `peopleLayer.queryFeatureCount()`.
    - Creates a collapsible accordion item with a "Zoom to Point" link and, if applicable, a "View People at this Address" link.
5. Populates the `#pointsInfo` div with the generated HTML.

#### `queryAndDisplayPeople(streetAddress)` (Lines 243-345)

This function populates the People detail panel with records for a given address.

1. Sanitizes the address for SQL.
2. Queries `pointsLayer` to get the geometry for the address (as a fallback for records without geometry).
3. Queries `peopleLayer` for all people at that address.
4. Updates the `#peopleCounter` tab with the count.
5. For each person:
    - Formats the name from salutation, given name, and surname.
    - Builds HTML for occupation, office, residence, and other attributes.
    - Creates a collapsible accordion item with a "Zoom to Person" link (if geometry exists) and a "View Place Info" link.
6. Populates the `#personInfo` div.

#### `window.highlightPointByCoords(long, lat)` (Lines 347-376)

A globally accessible function that highlights a point on the map near the given coordinates:

1. Clears any existing highlight.
2. Queries `placesLayer` using a small distance buffer (3 meters) around the coordinates.
3. Gets the layer view and calls `layerView.highlight()` on the found feature.
4. Automatically removes the highlight after 5 seconds.

#### `window.zoomToTileLayerExtent()` (Lines 378-402)

A globally accessible function that zooms the map to the full extent of the currently loaded historic map tile layer:

1. Checks if a tile layer is loaded.
2. Waits for the tile layer to be ready using `tileLayer.when()`.
3. Calls `view.goTo(tileLayer.fullExtent)` to zoom to the map's extent.

### Points Layer Renderer (Lines 405-438)

Defines the visual style for the `pointsLayer`:

- **Size Visual Variable (`sizeVV`)**: Defines how point size changes with map scale. Points are larger when zoomed in and smaller when zoomed out.
- **Renderer (`points`)**: A simple renderer with a dark red circle symbol (color `#660000`), size 7px, with a gold outline (`#efbb3c`).

### Section 2: ArcGIS View Ready Handler (Lines 441-760)

This section contains all initialization code that requires the map view to be loaded.

#### View Ready Event Listener (Line 446)

An event listener on `viewElement` for the `arcgisViewReadyChange` event. All code inside this listener executes once the map is ready.

#### Loader Initialization (Lines 448-457)

- Gets a reference to the loader container.
- Makes it visible on initial load.
- Uses `reactiveUtils.whenOnce()` to wait for the view to stop updating, then calls `updateSliders()` and `queryPeople("")`.

#### `trackLoadingStatus(layer)` (Lines 460-486)

A function that shows/hides the loader based on layer and view updating status:

1. Gets a layer view for the given layer.
2. Uses `reactiveUtils.watch()` to observe the `layerView.updating` and `viewElement.view.updating` properties.
3. Shows the loader (with a 300ms delay to avoid flicker) when updating starts.
4. Hides the loader when updating stops.
5. Includes a 5-second safety timeout to force-hide the loader if something hangs.

#### Extent Watcher (Lines 488-505)

Uses `reactiveUtils.watch()` to observe changes to the map's `extent` property. When the extent changes (pan/zoom), it calls `debounceQuery(extent)`.

The `debounceQuery(extent)` function:
1. Clears any pending timeout.
2. Sets a new timeout that, after 500ms of no further changes, calls:
    - `queryCount(extent)` to refresh the map list.
    - `queryPoints(searchBar.value)` to refresh the places list.
    - `queryPeople(searchBar.value)` to refresh the people list.

#### Layer Initialization (Lines 507-568)

Initializes the three main feature layers:

1. **`pointsLayer`**: The places index layer with a simplified set of fields (`orig_no_street_address`, `ORIG_FID`). Uses the `points` renderer.

2. **`placesLayer`**: The detailed places layer with all fields. Uses a similar renderer but with a gold fill and maroon outline. Initially filtered with `definitionExpression: "1=0"` (shows nothing).

3. **`peopleLayer`**: The people layer with a blue symbol. Initially not visible.

The layers are added to the map in order: `pointsLayer` at index 1, `placesLayer` at index 2, `peopleLayer` at index 3.

#### Event Listeners (Lines 569-760)

- **Point List Click Listener (Lines 572-586)**: When a list item in `#point-list` is clicked:
    1. Removes the `active` class from all items.
    2. Adds `active` to the clicked item.
    3. Calls `handlePointSelection()` with the item's `value` (the OBJECTID).

- **Loading Status Tracking (Line 590)**: Calls `trackLoadingStatus(pointsLayer)` to start watching the initial layer.

- **Search Bar Input Listener (Lines 593-610)**: On every input change:
    1. Calls `debounceQuery()` to refresh results.
    2. Calls `queryPoints()` and `queryPeople()` with the search text.
    3. Shows/expands the sidebar.
    4. Changes the search button text to "Clear".

- **Search Button Click Listener (Lines 613-617)**: Clears the search bar and calls `debounceQuery()`.

- **Map Click Listener (Lines 619-705)**: Uses `view.hitTest()` to determine what was clicked:
    - If a **yellow detailed point** (from `placesLayer`) was clicked: Highlight it and expand its accordion.
    - If a **person point** (from `peopleLayer`) was clicked: Call `openPeoplePanel()`.
    - If a **red index point** (from `pointsLayer`) was clicked:
        1. Clear highlights.
        2. Hide the clicked red point (to show the yellow detail layer underneath).
        3. Filter `peopleLayer` to the address.
        4. Call `queryAndDisplayPeople()` and `queryAndDisplayPlaces()`.
        5. Show/expand the sidebar.
    - If **empty space** was clicked: Reset filters to show all points.

- **Points Switch Listener (Lines 708-710)**: Toggles `pointsLayer.visible` based on the switch state.

- **Points Filter Listener (Lines 713-735)**: When the Places/People/Both radio buttons change:
    - Updates button styling.
    - Toggles layer visibility accordingly.

- **Sidebar Expand/Collapse Listener (Lines 738-753)**: Toggles the sidebar visibility and adjusts the map width.

### Section 3: Standalone Functions (Lines 762-1539)

These functions are defined outside the view ready listener but still interact with the map and layers.

#### `parcelLayer` Definition (Lines 768-770)

Creates a feature layer for the historic map index.

#### `queryCount(extent)` (Lines 773-842)

Queries the map index to get a list of historic maps that intersect the current map extent and match the date range:

1. Resets the results list with a default "Hide Map" option.
2. Constructs a `WHERE` clause from the date slider values.
3. Adds text search filters if the search bar has content.
4. Queries `parcelLayer` with `spatialRelationship: "intersects"` to get maps in the current view.
5. Sorts results by year.
6. Deduplicates by year.
7. Creates list items for each unique map and appends them to `resultsList`.
8. Updates the `#mapsCounter` tab with the count.

#### `queryPoints(searchText)` (Lines 844-965)

Searches for places matching the search text and date range:

1. Clears the points list.
2. If no search text, shows a default message and returns.
3. Constructs a `WHERE` clause filtering by date range and text (searches multiple address and function fields).
4. Queries `placesLayer` to get matching `place_ID` values.
5. Queries `pointsLayer` to get the display addresses for those IDs.
6. Sorts results alphabetically.
7. Creates list items and appends them to `#point-list`.
8. Updates `#pointsCounter` with the count.

#### `queryPeople(searchText)` (Lines 967-1030)

Searches for people matching the search text:

1. If no search text, shows a default message.
2. Constructs a `WHERE` clause searching name, occupation, and address fields.
3. Queries `peopleLayer`.
4. Creates list items for each person with a click handler to call `openPeoplePanel()`.
5. Updates `#peopleCounter` with the count.

#### Points Info Click Listener (Lines 1032-1056)

Listens for clicks on links within the `#pointsInfo` panel. If the link has a `value` attribute (the service URL of a map), it:
1. Updates `whereClause` with the map's service URL.
2. Switches to the Maps tab.
3. Calls `queryFeatureLayer()` to load the map.

#### Results List Click Listener (Lines 1058-1079)

When a map in the results list is clicked:
1. Updates the active styling.
2. Sets `whereClause` to the clicked item's value (the service URL filter).
3. Calls `queryFeatureLayer()` to load the map.

#### `queryFeatureLayer(extent)` (Lines 1081-1109)

Queries the map index for a single map matching the `whereClause`:

1. If `whereClause` is "1=0" (Hide Map), removes the tile layer and clears graphics.
2. Otherwise, queries `parcelLayer` with the clause and calls `displayResults()`.

#### `displayResults(results)` (Lines 1111-1220)

Displays a historic map tile layer and populates the map info panel:

1. Gets the `service_url` from the query results.
2. Removes the previous tile layer if one exists.
3. Temporarily removes the points layer for correct Z-ordering.
4. Creates a new `TileLayer` with the service URL and current opacity.
5. Adds the tile layer at index 0 (bottom).
6. Formats the map date and builds HTML for the info panel with title, date, source type, description, publisher, author, cartographer, and repository link.
7. Populates `#mapsInfo`.
8. Re-creates and adds a new points layer at index 1.
9. Creates a transparent polygon graphic for the map's extent (not currently visible).
10. Starts tracking the loading status.

#### Opacity Slider Listener (Lines 1222-1231)

Updates the opacity display and the tile layer's opacity when the slider changes.

#### `updateSliders()` (Lines 1236-1298)

Called when the date sliders change. It:

1. Gets and validates min/max values (swapping if necessary).
2. Updates the display spans.
3. Debounces the actual query logic by 300ms.
4. Calls `queryCount()` to refresh the map list.
5. Calls `syncPointsWithTimeline()` which:
    - Queries `placesLayer` for `place_ID` values within the date range.
    - Updates `timelineFilter` with the valid IDs.
    - Applies the filter to `pointsLayer`.
6. If a search is active, calls `queryPoints()`.
7. If a point was previously selected, re-queries its details.

Date slider event listeners (Lines 1300-1301) call `updateSliders()` on input.

#### `openPeoplePanel(feature)` (Lines 1303-1393)

Opens the sidebar to show details for a person:

1. Expands the sidebar and switches to the People tab.
2. Extracts longitude/latitude from the feature's geometry (if available).
3. Formats the person's name and other attributes into HTML.
4. Adds a "Zoom to Person" link if coordinates exist.
5. Adds a "View Place Info" link.
6. Populates `#personInfo`.
7. Pans the map to the person's location and highlights the feature.

#### `window.linkToPlaceFromAddress(address)` (Lines 1394-1423)

A globally accessible function that switches to the Places tab and shows info for a given address:

1. Queries `pointsLayer` for the address.
2. Switches to the Places tab.
3. Calls `queryAndDisplayPlaces()`.
4. Pans the map to the address.

#### `window.linkToPeopleFromAddress(address)` (Lines 1425-1449)

A globally accessible function that switches to the People tab and shows info for a given address:

1. Switches to the People tab.
2. Expands the sidebar.
3. Calls `queryPeople()` and `queryAndDisplayPeople()`.

#### `window.startTour()` (Lines 1451-1539)

Starts the Intro.js guided tour with 14 steps:

1. Historic Map Opacity slider.
2. Dropdown menu.
3. Search bar.
4. Date range slider.
5. Point visibility toggle.
6. Zoom buttons.
7. Home button.
8. Locate button.
9. Compass.
10. Basemap toggle.
11. Expand/collapse button.
12. Tab menu.
13. Map search results area.
14. Map info panel.

Uses `onBeforeChange` to dynamically show/hide the sidebar when demonstrating certain steps.

---

## Summary

The SHOC application is a well-structured single-page web application that provides an interactive way to explore the historical geography of Charleston. The codebase effectively leverages the ArcGIS Maps SDK for geographic data handling and Bootstrap for UI layout. The modular organization of the JavaScript code into initialization, event handling, and query functions makes it maintainable and extensible.
