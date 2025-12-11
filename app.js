// ====================================================================
// 1. VARIABLE DECLARATIONS (DOM Elements and ArcGIS Imports)
// ====================================================================

// DOM Element References (Sliders & Map Interaction)
const opacityInput = document.getElementById('sliderDiv'); // Opacity range input for historic map
const rangeOutput = document.getElementById('rangeValue'); // Opacity value display
const viewElement = document.querySelector("arcgis-map"); // The main map component
window.SHOC_VIEW = viewElement; 
const dateSlider_l = document.getElementById('dateSlider_l'); // Left handle of the date range slider (min year)
const dateSlider_r = document.getElementById('dateSlider_r'); // Right handle of the date range slider (max year)
const dateMinValue = document.getElementById('dateMinValue'); // Min year display
const dateMaxValue = document.getElementById('dateMaxValue'); // Max year display
const searchBar = document.querySelector("#searchBar"); // Map/points search input field
const searchButton = document.querySelector("#searchButton"); // Map/points search button

// DOM Element References (Sidebar/Results)
const featureNode = document.querySelector("#feature-node"); // The sidebar container
const expandCollapse = document.querySelector("#expandCollapse"); // Button to show/hide the sidebar
const collapseIcon = document.getElementById('collapse-icon'); // Icon for 'collapse' state
const expandIcon = document.getElementById('expand-icon'); // Icon for 'expand' state
const pointsFilterMenu = document.querySelector("#pointsFilter"); // Radio button group for point filtering
const pointsSwitch = document.querySelector("calcite-switch"); // Switch to toggle points layer visibility
const resultsList = document.querySelector("#result-list"); // UL for Map results (maps tab)
const pointsList = document.querySelector("#point-list"); // UL for Point results (places tab)
const pointListElement = document.getElementById("point-list"); // Reference for point list
const mapsInfo = document.getElementById('mapsInfo'); // Div to display selected map information
const mapsCounter = document.getElementById("mapsCounter"); // Tab link for Maps count
const pointsCounter = document.getElementById("pointsCounter"); // Tab link for Places count
const pointsInfo = document.getElementById('pointsInfo'); // Div to display selected point information

// ArcGIS Imports & Layer-related Variables
const FeatureLayer = await $arcgis.import("@arcgis/core/layers/FeatureLayer.js");
const TileLayer = await $arcgis.import("@arcgis/core/layers/TileLayer.js");
const webMercatorUtils = await $arcgis.import("@arcgis/core/geometry/support/webMercatorUtils.js");
const Extent = await $arcgis.import("@arcgis/core/geometry/Extent.js");
const defaultOption = document.querySelector("#defaultOption");
const defaultPointOption = document.querySelector("#defaultPointOption");
let whereClause = defaultOption.value; // Query string for historic map filter
let wherePointClause = defaultPointOption.value; // Query string for points filter (not used consistently)
const zoom = viewElement.zoom; // Initial map zoom level
let highlight; // Placeholder for map feature highlight object
let objectId; // Placeholder for selected feature OBJECTID
let clickedGraphic = null; // Reference to the last clicked graphic on the map
let currentHighlight = null; // Reference to the current highlight graphic
let tileLayer; // Variable to hold the dynamically loaded TileLayer
let pointsLayer;
let placesLayer;
let lastSelectedOrigFid = null;
let lastSelectedAddress = null;
const reactiveUtils = await $arcgis.import("@arcgis/core/core/reactiveUtils.js");

// Helper function to handle map centering, highlighting, and fetching related details
function handlePointSelection(objectId) {
    
    // Clear previous highlight
    if (currentHighlight) {
        currentHighlight.remove();
    }

    // Query the pointsLayer (index layer) by OBJECTID
    pointsLayer.queryFeatures({
        where: `OBJECTID = ${objectId}`,
        outFields: ["orig_no_street_address", "ORIG_FID", "OBJECTID"],
        returnGeometry: true
    }).then(results => {
        if (results.features.length > 0) {
            const graphicToHighlight = results.features[0];
            const attributes = graphicToHighlight.attributes;
            const origFidValue = attributes.ORIG_FID;
            const addressFromIndex = attributes.orig_no_street_address;
            
            //  Save state globally (used by updateSliders for refreshing details)
            lastSelectedOrigFid = origFidValue;
            lastSelectedAddress = addressFromIndex;

            //. Center map and highlight point
            viewElement.view.goTo(graphicToHighlight.geometry);
            viewElement.view.whenLayerView(pointsLayer).then(layerView => {
                currentHighlight = layerView.highlight(graphicToHighlight); 
            });

            //  Query the detailed placesLayer and update the sidebar
            queryAndDisplayPlaces(origFidValue, addressFromIndex);

            //  Update UI state (show sidebar/switch tab)
            featureNode.style.display = "block";
            if (window.innerWidth < 850) {
                featureNode.style.width= "80vw";
                featureNode.style.zindex="1001";
            } else {
                featureNode.style.width="25vw";
                viewElement.style.width="75vw";
            }
            collapseIcon.style.display = "block";
            expandIcon.style.display = "none";
            $('#pointsCounter').tab('show');
            
            //  Refresh related map results (already calls queryPoints if search is active)
            updateSliders(); 
            
        } else {
            document.getElementById('pointsInfo').innerHTML = "Error: Point data not found.";
        }
    }).catch(error => {
        console.error("Error highlighting or populating feature:", error);
        document.getElementById('pointsInfo').innerHTML = "Error: Could not process selection.";
    });
}

//See if any variable is null
function createStringIfNotNull(...variables) {
    const dataPart = variables[1]; 
    if (dataPart === null || dataPart === undefined || dataPart.trim() === '') {
        return null;
    }
    return variables.join('');
}

// Globally define the function to query the placesLayer for related features
function queryAndDisplayPlaces(origFidValue, originalAddress) {
    if (origFidValue === null || origFidValue === undefined) {
        document.getElementById('pointsInfo').innerHTML = `<h3>${originalAddress}</h3><p>Could not retrieve related details (Missing ORIG_FID).</p>`;
        return;
    }

	// Get the current date range values from the sliders
    const minYear = document.getElementById('dateSlider_l').value;
    const maxYear = document.getElementById('dateSlider_r').value;
    
    // Construct the core feature matching query
    const matchQuery = `place_ID = '${origFidValue}'`;
    
    // Construct the date filter query
    // Use CAST to ensure the comparison is numerical, essential for range filtering.
    const dateQuery = `CAST(source_year AS INTEGER) >= ${minYear} AND CAST(source_year AS INTEGER) <= ${maxYear}`;
    
    // Combine both conditions using 'AND'
    const finalWhereClause = `${matchQuery} AND ${dateQuery}`;
    
    // Construct the query to find matching features in placesLayer
    const query = placesLayer.createQuery();
    // The key relationship: ORIG_FID from the index layer matches place_ID in the main places layer
    query.where = finalWhereClause;
    query.outFields = ["*"]; // Get all fields
    query.returnGeometry = true;

    // Display a loading message while querying
    document.getElementById('pointsInfo').innerHTML = `<h3>${originalAddress}</h3><p>Loading related historic records...</p>`;

    placesLayer.queryFeatures(query)
        .then(results => {
            const features = results.features;
            
            // Start the HTML content with the address from the index layer
            let contentHTML = `<h3>${originalAddress}</h3>`;

            if (features.length > 0) {
                // 2. Iterate and format the results
                features.forEach((feature, index) => {
                    const attributes = feature.attributes;
                    
                    // Helper function usage for clean display
                    const concatAddress = [attributes.orig_address_no, attributes.orig_address_street]
    				.filter(part => part) 
   					.join(" ");
   					const currConcatAddress = [attributes.curr_address_no, attributes.curr_address_street]
    				.filter(part => part) 
   					.join(" ");
               		//const contentTitle = createStringIfNotNull(`<h4>`, attributes.orig_address_no, ` `, attributes.orig_address_street,`</h4>`);
               		const contentTitle = createStringIfNotNull(`<h4>`, attributes.place_descript,`</h4>`);
        			const sourceData = [
    					attributes.source_year ?? '', 
    					attributes.place_source ?? ''
					].filter(s => s).join(' ');
					const sourcePlat = sourceData ? `<b>Source:</b> ${sourceData}<br>` : null;
        			const origAdd = createStringIfNotNull(`<b>Original Address:</b> `, concatAddress,`<br>`);
        			const altTitle = `<h3>${attributes.place_descript}</h3>`;
        			const muni = createStringIfNotNull(`<b>Original Municipality:</b> `,attributes.orig_city,`<br>`);
        			const primMat = createStringIfNotNull(`<b>Primary Material:</b> `,attributes.prime_material,`<br>`);
        			const secMat = createStringIfNotNull(`<b>Additional Material(s):</b> `,attributes.add_material,`<br>`);
        			const primFunc = createStringIfNotNull(`<b>Primary Function:</b> `,attributes.function_prime,`<br>`);
        			const secFunc = createStringIfNotNull(`<b>Secondary Function:</b> `,attributes.function_second,`<br>`);
        			const placeDesc = createStringIfNotNull(`<b>Place Description:</b> `,attributes.place_descript,`<br>`);
        			const max_stories = createStringIfNotNull(`<b>Max Number of Stories:</b> `,attributes.max_stories,`<br>`);
        			const currAdd = createStringIfNotNull(`<b>Current Address:</b> `, currConcatAddress,`<br>`);
        			const currMuni = createStringIfNotNull(`<b>Current Municipality:</b> `,attributes.curr_city,`<br>`);
        			const mapURL = attributes.map_url;
        			const y = feature.geometry.y;
                	const x = feature.geometry.x;
                	const [long, lat] = webMercatorUtils.xyToLngLat(x, y);

                    contentHTML += `
                        <div class="pointsResultList" style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px;">
                            ${contentTitle ?? altTitle}
                    		${sourcePlat ?? ``}
                			${origAdd ?? ``}
                    		${muni ?? ``}
                    		${primMat ?? ``}
                    		${secMat ?? ``}
                    		${primFunc ?? ``}
                    		${secFunc ?? ``}
                    		${placeDesc ?? ``}
                    		${max_stories ?? ``}
                    		${currAdd ?? ``}
                    		${currMuni ?? ``}
                    		<a href="javascript:void(0)" onclick="window.SHOC_VIEW.view.goTo({center: [${long}, ${lat}], zoom: 19}); return false;">Zoom to Point</a><br>
                    		<a href="#" value="${mapURL}"">View Source Map</a>
                        </div>
                    `;
                });
            } else {
                contentHTML += "<p>No matching records found.</p>";
            }

            // 3. Populate the pointsInfo div
            document.getElementById('pointsInfo').innerHTML = contentHTML;
        })
        .catch(error => {
            console.error("Error querying placesLayer:", error);
            document.getElementById('pointsInfo').innerHTML = `<h3>${originalAddress}</h3><p>An error occurred while querying related places.</p>`;
        });
}

// Globally define the Zoom to Tile Layer Extent function
window.zoomToTileLayerExtent = function () {
    if (!tileLayer) {
        console.warn("Cannot zoom: No historic map layer is currently loaded.");
        return;
    }

    // Use tileLayer.when() to ensure the layer is loaded before accessing its extent.
    // Use the layer's fullExtent property, NOT the unsupported queryExtent() method.
    tileLayer.when(function() {
        
        // Ensure the fullExtent property exists (it's a Promise that resolves to the Extent object)
        if (tileLayer.fullExtent) {
            
            // Go to the extent using the globally accessible view
            window.SHOC_VIEW.view.goTo(tileLayer.fullExtent).catch((error) => {
                console.error("Error zooming to full extent:", error);
            });
        } else {
            console.error("Error: The tile layer does not report a valid full extent.");
        }
    }).catch(function(error) {
        console.error("Error loading tile layer for zoom:", error);
    });
};


// === Points Layer Renderer Definition ===
    
// Define size visual variable for points (makes them smaller when zoomed out)
const sizeVV = {
    type: "size",
    valueExpression: "$view.scale",
    stops: [
        { size: 12, value: 70 },
        { size: 9, value: 564 },
        { size: 4, value: 4513 },
        { size: 2, value: 36111 },
        { size: 1, value: 144447},
        { size: 1, value: 4622324},
    ],
};
    
// Simple point renderer with visual size variable
const points = {
    type: "simple",
    visualVariables: [sizeVV],
    symbol: {
        type: "simple-marker",
        style: "circle",
        color: "#660000",
        size: 7.0,
        angle: 0.0,
        xoffset: 0,
        yoffset: 0,
        outline: {
            color: "#bfa87c",
            width: 0.5
        }
    }
};
    
// ====================================================================
// 2. ARCGIS VIEW READY HANDLER
// (Initialization and Event Listeners that require a loaded view)
// ====================================================================

viewElement.addEventListener("arcgisViewReadyChange", () => {
    // === Debounce Function and Map Extent Watcher ===
    
// Watch map extent changes (pan/zoom) to update the map list dynamically
reactiveUtils.watch(
  () => viewElement.view.extent, 
  (extent) => {
    debounceQuery(extent);
  }, 
);

    // A simple debounce function to limit how often a query is called during pan/zoom
    let timeout;
    function debounceQuery(extent) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            queryCount(extent); // Queries historic maps in the current extent
            queryPoints(searchBar.value.trim()); // Re-query points based on extent/search
        }, 500); // Wait 500ms after the user stops panning/zooming
    }
    
    // === Points Layer Initialization ===
    
    // Initialize the FeatureLayer for the places_index points
    pointsLayer = new FeatureLayer({
    	url: "https://lyre.cofc.edu/server/rest/services/shoc/places_index/FeatureServer/0",
    	outFields: ["orig_no_street_address", "ORIG_FID"],
        //url: "https://lyre.cofc.edu/server/rest/services/shoc/places/FeatureServer/0",
        //outFields: ["orig_address_no", "orig_address_street", "orig_city", "prime_material", "add_material", "function_prime", "place_descript", "place_source", "source_year", "OBJECTID", "max_stories","function_second", "curr_address_no","curr_address_street","curr_city", "bldg_ID","map_url","place_ID"],
        renderer: points,
    });
    
    // Initialize the FeatureLayer for the places results
    placesLayer = new FeatureLayer({
    	url: "https://lyre.cofc.edu/server/rest/services/shoc/places/FeatureServer/0",
        outFields: ["orig_address_no", "orig_address_street", "orig_city", "prime_material", "add_material", "function_prime", "place_descript", "place_source", "source_year", "OBJECTID", "max_stories","function_second", "curr_address_no","curr_address_street","curr_city", "bldg_ID","map_url","place_ID"],
        });
    
    // Add the points layer to the map (at index 1, above the base map)
    viewElement.map.add(pointsLayer, 1);
    
    // === Event Listeners for Map/Sidebar Interaction ===
    
    // Listener for clicking a point in the sidebar list
    pointListElement.addEventListener("click", (event) => {
        const clickedItem = event.target.closest("li");
        if (!clickedItem || clickedItem.value === undefined) {
            return; // Exit if not a list item or default option
        }
        
        // Toggle 'active' class for styling
        const allListItems = pointListElement.querySelectorAll('li');
        allListItems.forEach(item => item.classList.remove('active'));
        clickedItem.classList.add('active');

        const objectId = clickedItem.value;

        handlePointSelection(objectId);
    });

    // Listener for typing in the search bar
    searchBar.addEventListener('input', () => {
        debounceQuery(viewElement.extent);
        // Show/expand sidebar when search input starts
        featureNode.style.display = "block";
        if (window.innerWidth < 850) {
                featureNode.style.width= "80vw";
                featureNode.style.zindex="1001";
                } else {
				featureNode.style.width= "25vw";
				viewElement.style.width="75vw";
				}
        collapseIcon.style.display = "block";
        expandIcon.style.display = "none";
        searchButton.innerHTML= "Clear";
    });

    // Listener for clicking the search button
    searchButton.addEventListener('click', () => {
		searchBar.value = "";
		searchButton.innerHTML= "Search";
		debounceQuery(viewElement.extent);
    });
    
    // Listener for map click (hitTest for points)
    viewElement.view.on("click", (event) => {
        viewElement.view.hitTest(event).then(function(response) {
        	const pointResult = response.results.find(result => result.graphic.layer === pointsLayer);

            if (pointResult) {
            //if (response.results.length > 0) {
                const graphic = response.results[0].graphic;
                const prefix = graphic.attributes;
                const objectId = prefix.OBJECTID;
				
                // Clear the previous highlight
                if (currentHighlight) {
                    currentHighlight.remove();
                }
                
                // Highlight the clicked graphic
                viewElement.view.whenLayerView(pointsLayer).then((layerView) => {
                    currentHighlight = layerView.highlight(graphic, {
                        color: "red",
                        haloColor: "white",
                        haloOpacity: 0.8,
                        width: 2
                    });
                });
                
                clickedGraphic = graphic;
                
                // Center map, save state, and fetch details (call the reusable function)
        
            	const origFidValue = prefix.ORIG_FID;
            	const addressFromIndex = prefix.orig_no_street_address;
            
            	lastSelectedOrigFid = origFidValue;
            	lastSelectedAddress = addressFromIndex;

            	// Query the related features based on the clicked point
            	queryAndDisplayPlaces(origFidValue, addressFromIndex);
            
            	// Show/expand sidebar
            	featureNode.style.display = "block";
            	if (window.innerWidth < 850) {
                	featureNode.style.width= "80vw";
                	featureNode.style.zindex="1001";
            	} else {
                	featureNode.style.width="25vw";
                	viewElement.style.width="75vw";
            	}
            	collapseIcon.style.display = "block";
            	expandIcon.style.display = "none";
            
            	// Switch to the 'Places' tab
            	$('#pointsCounter').tab('show');
            
        } else {
            // Clear highlight if map is clicked outside a feature
            if (currentHighlight) {
                currentHighlight.remove();
            }
            pointsInfo.innerHTML = "No points selected";
        }
        });
    });

    // Listener for Points Layer visibility switch
    pointsSwitch.addEventListener("calciteSwitchChange", () => {
        pointsLayer.visible = pointsSwitch.checked;
    });

    // Listener for Points Filter (Brick/Wood/Everything)
    pointsFilterMenu.addEventListener("change", (event) => {
        const selectedValue = event.target.id;
        
        // Update active button styling
        const buttons = pointsFilterMenu.querySelectorAll('label');
        buttons.forEach(button => {
            button.classList.remove('active');
        });

        // Add the 'active' class to the parent label of the clicked input
        event.target.closest('label').classList.add('active');
        
        let pointsFilterExpression = "";

        // Determine the new definition expression for the points layer
        switch (selectedValue) {
            case "brick":
                pointsFilterExpression = "prime_material = 'brick'";
                break;
            case "wood":
                pointsFilterExpression = "prime_material = 'wood frame'";
                break;
            case "both":
            default:
                pointsFilterExpression = "1=1"; // Show all points
                break;
        }
        
        // Apply the filter to the layer
        if (pointsLayer) {
            pointsLayer.definitionExpression = pointsFilterExpression;
        }
    });

    // Listener for Sidebar Expand/Collapse button
    expandCollapse.addEventListener('click', () => {
        // Toggle sidebar visibility and map width
        if (featureNode.style.display === "block") {
            // Collapse it
            featureNode.style.display = "none";
            viewElement.style.width = "100vw";
            collapseIcon.style.display = "none";
            expandIcon.style.display = "block";
        } else {
            // Expand it
            featureNode.style.display = "block";
            viewElement.style.width = "75vw";
            collapseIcon.style.display = "block";
            expandIcon.style.display = "none";
        }
    });
});

// ====================================================================
// 3. STANDALONE FUNCTIONS AND LISTENERS
// (Map Query, Opacity, Date Sliders)
// ====================================================================

// Define the FeatureLayer for historic map index (static layer)
const parcelLayer = new FeatureLayer({
    url: "https://lyre.cofc.edu/server/rest/services/shoc/map_index/FeatureServer/0",
});

// Function to query historic map features based on extent, year range, and search text
function queryCount(extent) {
    // Reset the map results list
    resultsList.innerHTML = `<li
    id="defaultOption"
    value="1=0" class="list-group-item"><h3>No Map</h3></li>`;

    const minYear = dateSlider_l.value;
    const maxYear = dateSlider_r.value;
    let mapYearFilter = `CAST(mapyear AS INTEGER) >= ${minYear} AND CAST(mapyear AS INTEGER) <= ${maxYear}`;

    const searchText = searchBar.value.trim();
    let searchStrings = [];

    // Add search text filter if available
    if (searchText) {
        searchStrings.push(`(
            Upper(title) LIKE '%${searchText.toUpperCase()}%' OR
            Upper(source_caption) LIKE '%${searchText.toUpperCase()}%' OR
            mapyear LIKE '%${searchText}%' OR
            Upper(publisher) LIKE '%${searchText.toUpperCase()}%' OR
            Upper(map_author) LIKE '%${searchText.toUpperCase()}%' OR
            Upper(cartographer) LIKE '%${searchText.toUpperCase()}%' OR
            Upper(orig_reposistory) LIKE '%${searchText.toUpperCase()}%' OR
            Upper(source_type) LIKE '%${searchText.toUpperCase()}%'
        )`);
        
        // Combine year filter with text filter
        mapYearFilter = `${mapYearFilter} AND ${searchStrings.join(' ')}`;
    }

    const parcelQuery = {
        where: mapYearFilter,
        spatialRelationship: "intersects",
        geometry: extent,
        outFields: ["title","cartographer", "mapyear", "service_url", "source_caption", "mapday", "mapmonth", "publisher", "map_author", "orig_reposistory","repository_url", "source_caption","source_type"],
        returnGeometry: true,
    };

    parcelLayer
        .queryFeatures(parcelQuery)
        .then((results) => {
            // 1. Extract and sort features by mapyear
            const sortedFeatures = results.features
            .filter((feature) => feature.attributes.mapyear)
            .sort((a, b) => a.attributes.mapyear - b.attributes.mapyear);
            
            mapsCounter.innerHTML = `Maps (${sortedFeatures.length})`; // Update map count in tab

            // 2. Track seen years to avoid duplicate map entries
            const seenYears = new Set();

            // 3. Create and append sorted options to the results list
            sortedFeatures.forEach((feature) => {
                const year = feature.attributes.mapyear;
                const title = feature.attributes.title;
                const service_url = feature.attributes.service_url;

                if (seenYears.has(year)) return;
                seenYears.add(year);

                const option = document.createElement("li");
                option.innerHTML = `${year} ${title}`;
                
                // Value is the SQL condition for the specific service URL
                option.setAttribute("value", `service_url = '${service_url}'`);
                option.setAttribute("class", `list-group-item`);
                resultsList.appendChild(option);
            });
        });
};

// Function to query point features based on search bar text
function queryPoints(searchText) {
    const pointListElement = document.getElementById("point-list");
    pointListElement.innerHTML = '';
    pointsCounter.innerHTML = `Places`;
    
    // Get the current date range values from the sliders
    const minYear = document.getElementById('dateSlider_l').value;
    const maxYear = document.getElementById('dateSlider_r').value;
    
    let whereClause = `CAST(source_year AS INTEGER) >= ${minYear} AND CAST(source_year AS INTEGER) <= ${maxYear}`;
    
    // If search text is empty, reset the list
    if (!searchText) {
        pointListElement.innerHTML = `<li id="defaultPointOption" value="undefined" class="list-group-item">Use the search bar and date range slider to search points on the map.</li>`;
        pointsCounter.innerHTML = `Places`;
        return; 
    }
    
    pointListElement.innerHTML = ''; // Clear the list
    
    //  Add text filter if available
    if (searchText) {
        const searchFilter = `(
            UPPER(orig_address_no) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(orig_address_street) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(prime_material) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(add_material) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(function_prime) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(function_second) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(place_source) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(place_descript) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(curr_address_no) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(curr_address_street) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(orig_city) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(curr_city) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(source_year) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(orig_address_no || ' ' || orig_address_street) LIKE '%${searchText.toUpperCase()}%' OR
            UPPER(curr_address_no || ' ' || curr_address_street) LIKE '%${searchText.toUpperCase()}%'
        )`;
        whereClause = `${whereClause} AND ${searchFilter}`;
    } else {
        // If no text search, do not show all places records, only search when text is entered.
        pointListElement.innerHTML = `<li id="defaultPointOption" value="1=0" class="list-group-item">Use the search bar and date range slider to search points on the map.</li>`;
        return; 
    }
    
    // Query the detailed placesLayer for matching records
    const placesQuery = {
        where: whereClause,
        // Need place_ID to match back to pointsLayer (as ORIG_FID) and OBJECTID for filtering the point layer results
        outFields: ["place_ID", "OBJECTID", "place_descript"], 
        returnGeometry: false,
        returnDistinctValues: true, // Only return unique place_ID values
    };
    
    placesLayer.queryFeatures(placesQuery)
        .then(placesResults => {
            if (!placesResults || placesResults.features.length === 0) {
                // If no features found in detailed layer, update UI and exit promise chain cleanly
                pointListElement.innerHTML = `<li class="list-group-item">No records found matching your search and date range.</li>`;
                pointsCounter.innerHTML = `Places (0)`;
                return null; // Return null to signal subsequent .then blocks to stop
            }

            // Extract unique ORIG_FID values (from placesLayer.place_ID)
            const placeIds = placesResults.features.map(f => f.attributes.place_ID).filter(id => id);
            
            // Build the filter for the pointsLayer (index layer)
            const uniquePlaceIdsFilter = `ORIG_FID IN (${placeIds.join(",")})`;

            // 4. Query the pointsLayer (index layer) to get the point addresses and OBJECTIDs
            return pointsLayer.queryFeatures({
                where: uniquePlaceIdsFilter,
                outFields: ["orig_no_street_address", "OBJECTID", "ORIG_FID"],
                returnGeometry: false
            });
        })
        .then(pointResults => {
        
        	// Check if we received valid results from the previous step
            if (!pointResults) {
                return; // Exit if the previous step returned null
            }
            
            const features = pointResults.features;

            pointsCounter.innerHTML = `Places (${features.length})`;
            
            if (features.length === 0) {
                 pointListElement.innerHTML = `<li class="list-group-item">No points found for the matching records.</li>`;
                 return;
            }

            // Sort features alphabetically by address
            const sortedFeatures = features.sort((a, b) => {
                const addressA = a.attributes.orig_no_street_address || '';
                const addressB = b.attributes.orig_no_street_address || '';
                return addressA.localeCompare(addressB);
            });
            
            // 5. Populate the list
            sortedFeatures.forEach(feature => {
                const attributes = feature.attributes;
                const listItem = document.createElement("li");

                // Use the simplified address from the pointsLayer for the display list
                const fullTitle = attributes.orig_no_street_address ?? "[Address Unknown]";

                listItem.value = attributes.OBJECTID;
                listItem.textContent = fullTitle;
                listItem.className = "list-group-item";
                pointListElement.appendChild(listItem);
            });
            
        })
        .catch(error => {
            console.error("Error querying places/points layers:", error);
            pointListElement.innerHTML = `<li class="list-group-item">Error retrieving search results.</li>`;
            pointsCounter.innerHTML = `Places (0)`;
        });
}
//	Listener for clicking the source map link in the points info tab
pointsInfo.addEventListener("click", (event) => {
    const clickedAnchor = event.target.closest('a');

    if (!clickedAnchor || clickedAnchor.getAttribute('value') === null) {
        return;
    }
    
    // Stop the default action of the link (like trying to navigate away)
    event.preventDefault();

    // Update the whereClause with the selected map's service URL condition
    whereClause = `service_url = '${clickedAnchor.getAttribute('value')}'`;
    
    // Remove the current active map selection
    const allListItems = resultsList.querySelectorAll('li');
    allListItems.forEach(item => {
        item.classList.remove('active');
    });

    // Switch to the Maps tab if not already there
    $('#mapsCounter').tab('show');

    // Load the selected historic map
    queryFeatureLayer(viewElement.extent);
});

// Listener for clicking a map in the results list
resultsList.addEventListener("click", (event) => {
    const clickedLi = event.target.closest('li');

    if (!clickedLi) {
        return;
    }

    // Toggle 'active' class for styling
    const allListItems = resultsList.querySelectorAll('li');
    allListItems.forEach(item => {
        item.classList.remove('active');
    });

    clickedLi.classList.add('active');

    // Update the whereClause with the selected map's service URL condition
    whereClause = clickedLi.getAttribute('value');

    // Load the selected historic map
    queryFeatureLayer(viewElement.extent);
});

// Function to query a *single* historic map feature and display it as a TileLayer
function queryFeatureLayer(extent) {
    
    // Handle the 'No Map' default option
    if (whereClause === '1=0') {
        if (tileLayer) {
            viewElement.map.remove(tileLayer);
            mapsInfo.innerHTML = "No maps selected"
        }
        viewElement.graphics.removeAll(); // Clear the map boundary graphic
        return;
    }
    
    const parcelQuery = {
        where: whereClause, // This is the service_url='...' clause
        spatialRelationship: "intersects",
        geometry: extent,
        outFields:  ["title","cartographer", "mapyear", "service_url", "source_caption", "mapday", "mapmonth", "publisher", "map_author", "orig_reposistory","repository_url", "source_caption","source_type"],
    };

    parcelLayer
        .queryFeatures(parcelQuery)
        .then((results) => {
            displayResults(results); // Pass results to the display function
        })
        .catch((error) => {
            console.log(error.error);
        });
}

// Function to handle map display and attribute presentation
function displayResults(results) {
    const service_url = results.features[0]?.attributes?.service_url;
    const mapPrefix = results.features[0]?.attributes;
    //const extent = results.queryExtent();
    //console.log(extent);
    
    if (!service_url) {
        console.error("No service_url found in feature attributes.");
        return;
    }

    // Remove previous tile layer
    if (tileLayer) {
        viewElement.map.remove(tileLayer);
        mapsInfo.innerHTML = "No maps selected"
    }
    
    // Remove the points layer temporarily for correct Z-ordering
    const existingPointsLayer = viewElement.map.layers.find(layer => layer.url && layer.url.includes("places"));
    if (existingPointsLayer) {
    	const isPointsVisible = existingPointsLayer.visible; 
        viewElement.map.remove(existingPointsLayer);
    }

    // Create the new TileLayer with current opacity setting
    const initialOpacity = parseFloat(opacityInput.value) / 100;
    tileLayer = new TileLayer({
        url: service_url,
        opacity: initialOpacity,
    });

    // Add the tile layer at index 0 (bottom)
    viewElement.map.add(tileLayer, 0);
    
    //Concat date
    const m = Intl.DateTimeFormat('en', { month: 'long' }).format(new Date(mapPrefix.mapmonth));
    let d = mapPrefix.mapday;

	if (mapPrefix.mapday !== null && mapPrefix.mapday !== undefined) {
		d = mapPrefix.mapday + ",";
	}
	
    const date = [m, d, mapPrefix.mapyear]
    	.filter(item => item !== null && item !== undefined)
    	.join(" ");
    
	const platType = createStringIfNotNull(`<b>Source Type:</b> `,mapPrefix.source_type,`<br>`);
    const platDesc = createStringIfNotNull(`<b>Description:</b> `,mapPrefix.source_caption,`<br>`);
    const platPub = createStringIfNotNull(`<b>Publisher:</b> `,mapPrefix.publisher,`<br>`);
    const platAuth = createStringIfNotNull(`<b>Author:</b> `,mapPrefix.map_author,`<br>`);
    const platCart = createStringIfNotNull(`<b>Cartographer/Surveyor:</b> `, mapPrefix.cartographer,`<br>`);
            
    // Show/expand the sidebar and display map info
    featureNode.style.display = "block";
    if (window.innerWidth < 850) {
                featureNode.style.width= "80vw";
                featureNode.style.zindex="1001";
                } else {
				featureNode.style.width= "25vw";
				viewElement.style.width="75vw";
				}
    mapsInfo.innerHTML = `<h3>${mapPrefix.mapyear ?? '[date unknown]'} ${mapPrefix.title ?? '[untitled]'}</h3>
        <b>Title:</b> ${mapPrefix.title ?? '[untitled]'}<br>
        <b>Date:</b> ${date ?? `[unknown]`}<br>
        ${platType ?? ''}
        ${platDesc ?? ''}
        ${platPub ?? ''}
        ${platAuth ?? ''}
        ${platCart ?? ''}
        <b>Original Repository:</b> <a target="_blank" href=${mapPrefix.repository_url}>${mapPrefix.orig_reposistory ?? ''}</a><hr>
        <a target="_blank" href=${mapPrefix.service_url}>View Service URL</a><br>
        <a href="javascript:void(0)" onclick="window.zoomToTileLayerExtent(); return false;">Zoom to Map Extent</a>
        `;

    // Re-add the points layer on top of the tile layer (at index 1)
    const newPointsLayer = new FeatureLayer({
        url: "https://lyre.cofc.edu/server/rest/services/shoc/places_index/FeatureServer/0",
    	outFields: ["orig_no_street_address", "ORIG_FID"],
        //url: "https://lyre.cofc.edu/server/rest/services/shoc/places/FeatureServer/0",
        //outFields: ["orig_address_no", "orig_address_street", "orig_city", "prime_material", "add_material", "function_prime", "place_descript", "place_source", "source_year", "OBJECTID", "max_stories","function_second", "curr_address_no","curr_address_street","curr_city", "bldg_ID","map_url","place_ID"],
        renderer: points, // Reusing the defined renderer
        id: "pointsLayer", // Give the layer an ID for easy referencing
        visible: pointsSwitch.checked, 
    });
    viewElement.map.add(newPointsLayer, 1);
    
    // Define the symbol for the map extent boundary graphic
    const symbol = {
        type: "simple-fill",
        color: [20, 130, 200, 0], // Transparent fill
        outline: {
            color: [20, 130, 200, 0], // Transparent outline
            width: 0.5,
        },
    };

    // Apply the symbol to the feature and add to map graphics
    results.features.map((feature) => {
        feature.symbol = symbol;
        return feature;
    });

    viewElement.closePopup();
    viewElement.graphics.removeAll(); // Clear previous map boundary
    viewElement.graphics.addMany(results.features); // Add the new map boundary graphic
    pointsLayer = newPointsLayer;
}

// Listener for Opacity Slider input
opacityInput.addEventListener('input', function() {
    if (this.value >= 0) {
        rangeOutput.innerHTML = this.value + "%";
        // Update the visible tile layer's opacity if it exists
        if (tileLayer) {
            tileLayer.opacity = parseFloat(this.value) / 100;
        }
    }
});

let sliderTimeout;

// Function to handle dual date range slider updates and debounce map query
function updateSliders() {
    let minVal = parseInt(dateSlider_l.value);
    let maxVal = parseInt(dateSlider_r.value);

    // Logic to prevent min from exceeding max and vice-versa
    if (minVal > maxVal) {
        const temp = minVal;
        minVal = maxVal;
        maxVal = temp;
    }

    // Update the slider positions (useful for the swap logic above)
    dateSlider_l.value = minVal;
    dateSlider_r.value = maxVal;

    // Update the displayed min/max year values
    dateMinValue.textContent = minVal;
    dateMaxValue.textContent = maxVal;

    // Debounce the map query to avoid excessive calls while sliding
    clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(() => {
        queryCount(viewElement.extent); // Re-query maps with new date range
        // REFRESH POINTS LIST if search is active
        const searchText = searchBar.value.trim();
        if (searchText) {
            queryPoints(searchText);
        }

        // REFRESH RELATED DETAILS if a point is currently selected
        if (lastSelectedOrigFid !== null && lastSelectedAddress !== null) {
            queryAndDisplayPlaces(lastSelectedOrigFid, lastSelectedAddress);
        }
    }, 300); // 300ms delay for debouncing
}

// Listeners for both date slider handles
dateSlider_l.addEventListener('input', updateSliders);
dateSlider_r.addEventListener('input', updateSliders);

updateSliders(); // Initial call to set the display values and run the first query
