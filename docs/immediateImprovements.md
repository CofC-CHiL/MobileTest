# Immediate Performance Improvements for SHOC

This document outlines actionable improvements that can be implemented immediately to enhance the performance of the SHOC application. These improvements target both the frontend client-side code and the backend ArcGIS Server database query patterns.

---

## Table of Contents

1. [Frontend Query Optimization](#1-frontend-query-optimization)
2. [Reduce Redundant Database Calls](#2-reduce-redundant-database-calls)
3. [Implement Client-Side Caching](#3-implement-client-side-caching)
4. [Optimize Layer Management](#4-optimize-layer-management)
5. [Improve Event Handler Efficiency](#5-improve-event-handler-efficiency)
6. [Backend and ArcGIS Server Optimizations](#6-backend-and-arcgis-server-optimizations)
7. [Network Request Optimization](#7-network-request-optimization)
8. [DOM Performance Improvements](#8-dom-performance-improvements)

---

## 1. Frontend Query Optimization

### 1.1 Request Only Required Fields

**Current Issue**: Nearly every query in the application now uses `outFields: ["*"]` which retrieves all fields from the feature service, even when only a few are needed. A recent refactoring commit made this problem significantly worse by removing previously specific field lists and replacing them with wildcards. This increases response payload size and database processing time.

**Locations in Code** (as of the latest codebase):
- `handlePointSelection()`: `outFields: ["*"]` on pointsLayer query
- `queryAndDisplayPlaces()`: `query.outFields = ["*"]` on placesLayer
- `queryAndDisplayPeople()`: `outFields: ["*"]` on pointsLayer address lookup
- `pointsLayer` initialization: `outFields: ["*"]` (was previously `["orig_no_street_address", "ORIG_FID"]`)
- `queryPoints()` inner pointsLayer query: `outFields: ["*"]` (was previously `["orig_no_street_address", "OBJECTID", "ORIG_FID"]`)
- `displayResults()` layer recreation: `outFields: ["*"]` (was previously `["orig_no_street_address", "ORIG_FID"]`)
- `linkToPlaceFromAddress()`: `outFields: ["*"]` (was previously `["ORIG_FID", "orig_no_street_address", "OBJECTID"]`)
- `queryPeople()`: `outFields: ["*"]`
- `placesLayer` initialization: `outFields: ["*"]`

**Improvement**: Replace wildcard field requests with explicit field lists containing only the attributes actually used in the code.

**Example Fix for pointsLayer initialization** (only needs `place_ID` and address display):
```javascript
outFields: ["orig_no_street_address", "place_ID", "OBJECTID"]
```

**Example Fix for queryAndDisplayPlaces()**:
```javascript
query.outFields = [
    "place_ID", "OBJECTID", "orig_address_no", "orig_address_street", 
    "orig_city", "prime_material", "add_material", "function_prime", 
    "function_second", "place_descript", "source_year", "place_source",
    "max_stories", "curr_address_no", "curr_address_street", "curr_city", "map_url"
];
```

**Example Fix for queryAndDisplayPeople()** (people layer fields changed in recent refactor):
```javascript
query.outFields = [
    "USER_Salutation", "USER_Given_Name", "USER_Surname", "USER_Name_as_given",
    "USER_cccupation_title", "USER_business_name_employer", "USER_Office_Business_Address",
    "USER_Residence_cityDirect", "USER_Other_desription", "resident_boards",
    "USER_POC", "USER_Business_Name", "USER_street_number_name", "OBJECTID"
];
```

**Expected Impact**: Reduces response payload size by 30-50% and decreases database CPU usage for field extraction. This is now the single highest-priority improvement given how pervasive the wildcard usage has become.

### 1.2 Limit Query Results

**Current Issue**: Queries do not specify a result limit (`num` parameter), meaning the full result set is returned regardless of how many records the user can reasonably view.

**Improvement**: Add pagination or result limits to all queries.

**Example**:
```javascript
const query = placesLayer.createQuery();
query.num = 100; // Limit to first 100 results
query.start = 0; // For pagination, increment this
```

**Implementation Strategy**:
- Set an initial limit of 50-100 records for sidebar lists.
- Add "Load More" functionality or infinite scroll if more results are needed.
- Display a message indicating additional results are available.

### 1.3 Use returnGeometry Wisely

**Current Issue**: Some queries request geometry when it is not needed, such as when only populating text lists.

**Locations**:
- `queryPoints()`: `returnGeometry: false` is correctly set.
- `queryAndDisplayPlaces()`: `returnGeometry: true` but geometry is only needed for the coordinates display.

**Improvement**: Only request geometry when it will be used for map operations or coordinate display. For list population queries, always set `returnGeometry: false`.

---

## 2. Reduce Redundant Database Calls

### 2.1 Consolidate Point and Place Queries

**Current Issue**: When a point is selected, the code makes multiple sequential queries:
1. Query `pointsLayer` to get the point data and `place_ID`.
2. Query `placesLayer` to get detailed place records.
3. For each place record, query `peopleLayer` to check if people exist at that address.

This results in N+2 queries where N is the number of place records.

**Improvement**: Batch the people count queries into a single request.

**Implementation**:
```javascript
// Instead of querying peopleLayer for each place individually:
// Get all unique addresses first
const uniqueAddresses = [...new Set(features.map(f => 
    [f.attributes.orig_address_no, f.attributes.orig_address_street]
    .filter(p => p).join(" ")
))];

// Create a single query with OR conditions
const addressFilter = uniqueAddresses
    .map(addr => `USER_street_number_name = '${addr.replace(/'/g, "''")}'`)
    .join(" OR ");

const countQuery = peopleLayer.createQuery();
countQuery.where = addressFilter;
countQuery.outFields = ["USER_street_number_name"];
countQuery.returnGeometry = false;

// Query once and build a lookup map
const peopleResults = await peopleLayer.queryFeatures(countQuery);
const addressesWithPeople = new Set(
    peopleResults.features.map(f => f.attributes.USER_street_number_name)
);

// Then use the Set for O(1) lookups in the loop
const checkCount = addressesWithPeople.has(concatAddress) ? 1 : 0;
```

**Expected Impact**: Reduces N+1 queries to 2 queries total.

### 2.2 Eliminate Duplicate Queries on Extent Change

**Current Issue**: The `debounceQuery()` function calls three separate query functions:
- `queryCount(extent)` for maps
- `queryPoints(searchBar.value)` for places
- `queryPeople(searchBar.value)` for people

Each of these triggers independent network requests.

**Improvement**: Combine these into a single coordinated batch request using Promise.all().

**Implementation**:
```javascript
function debounceQuery(extent) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
        const searchText = searchBar.value.trim();
        
        // Execute all queries in parallel
        Promise.all([
            queryCountAsync(extent),
            queryPointsAsync(searchText),
            queryPeopleAsync(searchText)
        ]).then(([mapResults, pointResults, peopleResults]) => {
            // Update UI with all results
            updateMapsList(mapResults);
            updatePointsList(pointResults);
            updatePeopleList(peopleResults);
        });
    }, 500);
}
```

### 2.3 Cache The Date Range Filter

**Current Issue**: The `updateSliders()` function recomputes the timeline filter by querying `placesLayer` every time the slider moves, even if the date range has not actually changed.

**Improvement**: Track the previous date range and skip the query if unchanged.

**Implementation**:
```javascript
let cachedMinYear = null;
let cachedMaxYear = null;
let cachedTimelineFilter = null;

function updateSliders() {
    let minVal = parseInt(dateSlider_l.value);
    let maxVal = parseInt(dateSlider_r.value);
    
    // Skip query if range has not changed
    if (minVal === cachedMinYear && maxVal === cachedMaxYear) {
        return;
    }
    
    cachedMinYear = minVal;
    cachedMaxYear = maxVal;
    
    // Continue with query logic...
}
```

---

## 3. Implement Client-Side Caching

### 3.1 Cache Feature Query Results

**Current Issue**: Every search, filter change, or extent change triggers fresh database queries, even for data that was recently retrieved.

**Improvement**: Implement a simple in-memory cache with time-based expiration.

**Implementation**:
```javascript
const queryCache = new Map();
const CACHE_TTL_MS = 60000; // 1 minute

function getCacheKey(layerUrl, whereClause, extent) {
    return `${layerUrl}|${whereClause}|${JSON.stringify(extent)}`;
}

async function cachedQuery(layer, query) {
    const key = getCacheKey(layer.url, query.where, query.geometry);
    const cached = queryCache.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.results;
    }
    
    const results = await layer.queryFeatures(query);
    queryCache.set(key, { results, timestamp: Date.now() });
    return results;
}

// Periodically clean expired entries
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of queryCache) {
        if (now - value.timestamp > CACHE_TTL_MS) {
            queryCache.delete(key);
        }
    }
}, CACHE_TTL_MS);
```

### 3.2 Cache Selected Feature Details

**Current Issue**: When a user clicks a point, views the details, then clicks away and clicks the same point again, the full query cycle repeats.

**Improvement**: Cache the results of `queryAndDisplayPlaces()` and `queryAndDisplayPeople()` keyed by the `place_ID` or address.

**Implementation**:
```javascript
const placeDetailsCache = new Map();

async function queryAndDisplayPlaces(targetPlaceId, originalAddress) {
    const cacheKey = `${targetPlaceId}|${dateSlider_l.value}|${dateSlider_r.value}`;
    
    if (placeDetailsCache.has(cacheKey)) {
        const cachedHTML = placeDetailsCache.get(cacheKey);
        document.getElementById('pointsInfo').innerHTML = cachedHTML;
        return;
    }
    
    // ... existing query logic ...
    
    // After building contentHTML, cache it
    placeDetailsCache.set(cacheKey, contentHTML);
    document.getElementById('pointsInfo').innerHTML = contentHTML;
}

// Clear cache when date range changes
function clearPlaceDetailsCache() {
    placeDetailsCache.clear();
}
```

---

## 4. Optimize Layer Management

### 4.1 Avoid Recreating Layers

**Current Issue**: In `displayResults()`, the points layer is removed and recreated every time a new historic map is selected. This is expensive and causes unnecessary reloads.

**Improvement**: Keep a single persistent points layer and only update its visibility or definition expression.

**Implementation**:
```javascript
// Create pointsLayer once during initialization
let pointsLayer = new FeatureLayer({
    url: "https://lyre.cofc.edu/server/rest/services/shoc/places_index/FeatureServer/0",
    outFields: ["orig_no_street_address", "place_ID", "OBJECTID"],
    renderer: points,
    id: "pointsLayer"
});
viewElement.map.add(pointsLayer, 1);

// In displayResults(), just adjust Z-order if needed:
function displayResults(results) {
    // Remove and re-add for z-order (without recreating)
    viewElement.map.reorder(pointsLayer, 1); // Move to index 1
    pointsLayer.visible = pointsSwitch.checked;
    
    // ... rest of tile layer logic ...
}
```

### 4.2 Use Definition Expressions Instead of Multiple Queries

**Current Issue**: The code queries layers to get matching IDs, then uses those IDs to filter another layer. This two-step process can often be combined.

**Improvement**: Use definition expressions on layers to let the server handle the filtering.

**Example**: Instead of querying placesLayer for place_IDs and then querying pointsLayer:
```javascript
// Set the filter directly on the layer
pointsLayer.definitionExpression = `
    place_ID IN (
        SELECT place_ID FROM places 
        WHERE CAST(source_year AS INTEGER) >= ${minVal} 
        AND CAST(source_year AS INTEGER) <= ${maxVal}
    )
`;
```

Note: This requires that the ArcGIS Server supports subqueries. If not, the server-side view or relationship class approach in section 6 is the alternative.

---

## 5. Improve Event Handler Efficiency

### 5.1 Increase Debounce Delay

**Current Issue**: The debounce delay is 500ms for extent changes and 300ms for slider changes. On fast panning or repeated slider movements, this still triggers many queries.

**Improvement**: Increase debounce to 750ms or 1000ms for non-critical updates.

**Implementation**:
```javascript
// For extent changes
const EXTENT_DEBOUNCE_MS = 750;

// For search input (users typically pause while typing)
const SEARCH_DEBOUNCE_MS = 500;

// For slider movement (users typically slide then release)
const SLIDER_DEBOUNCE_MS = 400;
```

### 5.2 Consolidate Event Listeners

**Current Issue**: The search bar has an `input` event listener that calls `debounceQuery()`, `queryPoints()`, and `queryPeople()` separately. This can result in overlapping queries.

**Improvement**: Let `debounceQuery()` handle all three query types internally.

**Implementation**:
```javascript
searchBar.addEventListener('input', () => {
    debounceQuery(viewElement.extent);
    // Remove direct queryPoints and queryPeople calls here
    // They are already called inside debounceQuery
    
    // UI updates only
    featureNode.style.display = "block";
    searchButton.innerHTML = "Clear";
});
```

### 5.3 Use Passive Event Listeners

**Current Issue**: Range slider input events are not marked as passive, which can block scrolling on touch devices.

**Improvement**: Add `{ passive: true }` to event listeners that do not call preventDefault().

**Implementation**:
```javascript
opacityInput.addEventListener('input', handleOpacityChange, { passive: true });
dateSlider_l.addEventListener('input', updateSliders, { passive: true });
dateSlider_r.addEventListener('input', updateSliders, { passive: true });
```

---

## 6. Backend and ArcGIS Server Optimizations

These improvements require changes on the ArcGIS Server or database level.

### 6.1 Create Database Indexes

**Recommendation**: Ensure the following indexes exist on the underlying database tables:

For the `places` table:
- Index on `place_ID`
- Index on `source_year`
- Composite index on `(place_ID, source_year)`
- Full-text index on text fields used in search (orig_address_street, function_prime, place_descript, etc.)

For the `places_index` table:
- Index on `place_ID`
- Index on `orig_no_street_address`

For the `people` table:
- Index on `USER_street_number_name`
- Index on `USER_Surname`
- Index on `USER_cccupation_title`
- Index on `resident_boards`
- Full-text index on name, occupation, and business fields

**SQL Example** (PostgreSQL syntax):
```sql
CREATE INDEX idx_places_place_id ON places(place_ID);
CREATE INDEX idx_places_source_year ON places(CAST(source_year AS INTEGER));
CREATE INDEX idx_places_index_place_id ON places_index(place_ID);
CREATE INDEX idx_people_street ON people(USER_street_number_name);
CREATE INDEX idx_people_occupation ON people(USER_cccupation_title);

-- Full-text search index
CREATE INDEX idx_places_fts ON places 
    USING GIN(to_tsvector('english', 
        COALESCE(orig_address_street, '') || ' ' || 
        COALESCE(function_prime, '') || ' ' ||
        COALESCE(place_descript, '')
    ));
```

### 6.2 Create a Materialized View for Common Queries

**Recommendation**: Create a server-side view that pre-joins the `places_index` and `places` tables for common query patterns.

**SQL Example**:
```sql
CREATE MATERIALIZED VIEW places_summary AS
SELECT 
    pi.OBJECTID,
    pi.place_ID,
    pi.orig_no_street_address,
    pi.Shape,
    COUNT(p.OBJECTID) as record_count,
    MIN(CAST(p.source_year AS INTEGER)) as min_year,
    MAX(CAST(p.source_year AS INTEGER)) as max_year
FROM places_index pi
LEFT JOIN places p ON pi.place_ID = p.place_ID
GROUP BY pi.OBJECTID, pi.place_ID, pi.orig_no_street_address, pi.Shape;

CREATE INDEX idx_places_summary_years ON places_summary(min_year, max_year);

-- Refresh periodically
REFRESH MATERIALIZED VIEW places_summary;
```

This allows the timeline filter to query a single pre-aggregated table instead of joining and counting on every request.

### 6.3 Enable ArcGIS Server Query Result Caching

**Recommendation**: Configure the ArcGIS Server feature service to cache query results.

**Steps**:
1. Open ArcGIS Server Manager.
2. Navigate to the SHOC feature service.
3. Enable caching for the feature layer.
4. Set an appropriate cache expiration time (5-15 minutes for relatively static data).

### 6.4 Use Query Table API for Complex Queries

**Recommendation**: For complex queries involving multiple tables (places + people counts), create a registered query table or database view on the server that encapsulates the join logic.

This moves the computational burden from multiple client requests to a single optimized server-side operation.

---

## 7. Network Request Optimization

### 7.1 Enable HTTP/2 or HTTP/3

**Recommendation**: Ensure the ArcGIS Server and web server support HTTP/2 for multiplexed connections. This reduces connection overhead when making multiple parallel requests.

### 7.2 Compress Responses

**Recommendation**: Verify that gzip or brotli compression is enabled on the ArcGIS Server for JSON responses. Feature query responses can compress by 70-80%.

**Check**: Look for `Content-Encoding: gzip` in response headers.

### 7.3 Reduce Request Payload Size

**Current Issue**: The SQL WHERE clauses generated by search include many `UPPER()` function calls and string concatenations, which can be verbose.

**Improvement**: If case-insensitive search is needed, configure the database collation to be case-insensitive, eliminating the need for `UPPER()` in every query.

---

## 8. DOM Performance Improvements

### 8.1 Use DocumentFragment for List Building

**Current Issue**: List items are appended to the DOM one at a time in a loop, causing multiple reflows.

**Improvement**: Build all items in a DocumentFragment, then append once.

**Implementation**:
```javascript
const fragment = document.createDocumentFragment();

sortedFeatures.forEach(feature => {
    const listItem = document.createElement("li");
    listItem.value = feature.attributes.OBJECTID;
    listItem.textContent = feature.attributes.orig_no_street_address;
    listItem.className = "list-group-item";
    fragment.appendChild(listItem);
});

pointListElement.innerHTML = '';
pointListElement.appendChild(fragment);
```

### 8.2 Use innerHTML Sparingly

**Current Issue**: Several functions build large HTML strings and assign them to `innerHTML`. While convenient, this is slower than DOM methods for simple structures.

**Recommendation**: For simple lists, use DOM creation methods. Reserve `innerHTML` for complex nested structures where the convenience outweighs the performance cost.

### 8.3 Virtualize Long Lists

**Recommendation**: If search results regularly exceed 100 items, implement virtual scrolling that only renders visible items.

**Libraries**: Consider using a library like `virtual-scroller` or implementing a simple version that renders 20 items above and below the visible window and recycles DOM nodes as the user scrolls.

---

## Summary Priority List

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| High | Request only required fields | Low | Medium |
| High | Consolidate people count queries | Medium | High |
| High | Implement client-side caching | Medium | High |
| High | Create database indexes | Low | High |
| Medium | Increase debounce delays | Low | Medium |
| Medium | Avoid recreating layers | Medium | Medium |
| Medium | Use DocumentFragment for lists | Low | Low |
| Low | Enable server query caching | Low | Medium |
| Low | Create materialized views | Medium | High |
| Low | Implement virtual scrolling | High | Low |

---

## Implementation Roadmap

### Phase 1 (Immediate, 1-2 days)
- Replace all `outFields: ["*"]` with specific field lists.
- Increase debounce delays.
- Implement basic in-memory caching for feature details.

### Phase 2 (Short-term, 1 week)
- Consolidate people count queries into batch request.
- Refactor layer management to avoid recreation.
- Add DocumentFragment usage for list building.

### Phase 3 (Medium-term, 2-3 weeks)
- Work with database administrator to add indexes.
- Create materialized views for common query patterns.
- Configure ArcGIS Server caching.

### Phase 4 (Long-term, 1 month)
- Implement virtual scrolling for long lists.
- Add progressive loading and "Load More" functionality.
- Consider WebSocket connections for real-time updates if needed.
