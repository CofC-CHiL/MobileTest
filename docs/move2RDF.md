# Migration to RDF Graph-Based Structure for SHOC

This document provides a detailed plan for transitioning the Spatial History of Charleston (SHOC) project from its current relational database (RDB) structure to a Resource Description Framework (RDF) graph-based architecture. It also outlines the integration of AI capabilities for natural language querying of the data.

---

## Table of Contents

1. [Introduction to RDF and Graph Databases](#1-introduction-to-rdf-and-graph-databases)
2. [Why Move to RDF for SHOC](#2-why-move-to-rdf-for-shoc)
3. [RDF Fundamentals](#3-rdf-fundamentals)
4. [Ontology Selection and Design](#4-ontology-selection-and-design)
5. [Technical Architecture](#5-technical-architecture)
6. [Data Transformation Strategy](#6-data-transformation-strategy)
7. [Triple Store Selection](#7-triple-store-selection)
8. [SPARQL Endpoint Implementation](#8-sparql-endpoint-implementation)
9. [AI Integration for Natural Language Querying](#9-ai-integration-for-natural-language-querying)
10. [Frontend Integration](#10-frontend-integration)
11. [Linked Open Data Publication](#11-linked-open-data-publication)
12. [Migration Timeline](#12-migration-timeline)
13. [Testing and Validation](#13-testing-and-validation)

---

## 1. Introduction to RDF and Graph Databases

### What is RDF

The Resource Description Framework (RDF) is a W3C standard for representing information about resources on the web. Unlike relational databases that store data in tables with fixed schemas, RDF represents data as a graph of interconnected nodes and edges.

The fundamental unit of RDF is the triple, consisting of:
- **Subject**: The resource being described (a URI or blank node)
- **Predicate**: The property or relationship (always a URI)
- **Object**: The value or related resource (a URI, blank node, or literal value)

### Graph Databases vs Relational Databases

| Aspect | Relational Database | RDF Graph Database |
|--------|---------------------|-------------------|
| Schema | Fixed, predefined tables and columns | Flexible, schema-on-read |
| Relationships | Foreign keys, explicit JOINs | First-class edges in the graph |
| Query language | SQL | SPARQL |
| Data model | Tables, rows, columns | Nodes, edges, properties |
| Extensibility | Schema changes require migrations | New predicates can be added freely |
| Standards | Vendor-specific with SQL standard | W3C open standards |
| Reasoning | Limited | Built-in inference capabilities |

### Why Graphs for Cultural Heritage

Cultural heritage data is inherently relational and interconnected:
- A person lived at an address
- A building was constructed by a builder who also built other buildings
- A map documents multiple places from a specific time period
- An occupation category contains multiple specific job titles

Graph databases excel at representing and querying these complex, interconnected relationships.

---

## 2. Why Move to RDF for SHOC

### Current Limitations

The current SHOC implementation uses ArcGIS feature services backed by a relational database. This creates several limitations:

1. **Rigid Schema**: Adding new attributes or entity types requires schema modifications and code changes.

2. **Limited Relationship Modeling**: Relationships between entities (places, people, maps) are modeled through foreign keys with fixed semantics. Complex queries like "find all people who lived in buildings made of brick before 1850" require multiple JOINs.

3. **No Semantic Context**: Field names like `function_prime` have no machine-readable meaning. There is no way for external systems to understand what this field represents.

4. **Data Silos**: The data cannot easily integrate with other cultural heritage databases or linked open data initiatives.

5. **Query Inflexibility**: Users cannot pose arbitrary questions; they are limited to pre-built query patterns in the application.

### Benefits of RDF Migration

1. **Semantic Richness**: Every piece of data is explicitly typed and connected to well-defined ontologies like CIDOC-CRM.

2. **Flexible Queries**: SPARQL enables complex queries across arbitrary relationship paths without predefined JOINs.

3. **Interoperability**: RDF data can link to and federate with external datasets (DBpedia, Library of Congress, Getty vocabularies).

4. **Inference**: Reasoners can derive implicit facts from explicit data (if X is a subtype of Y, instances of X are also instances of Y).

5. **AI Integration**: The semantic structure of RDF provides rich context for large language models to understand and query the data.

6. **Future-Proofing**: New data types and relationships can be added without breaking existing queries or applications.

---

## 3. RDF Fundamentals

### Triple Structure

Every fact in RDF is expressed as a subject-predicate-object triple:

```
<http://shoc.cofc.edu/place/123> <http://www.cidoc-crm.org/P53_has_former_or_current_location> <http://shoc.cofc.edu/address/456> .
```

This triple states: "Place 123 has location Address 456"

### URIs and Namespaces

RDF uses Uniform Resource Identifiers (URIs) to uniquely identify resources. Namespaces provide prefixes for brevity:

```
PREFIX shoc: <http://shoc.cofc.edu/>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>

shoc:place/123 crm:P53_has_former_or_current_location shoc:address/456 .
```

### Serialization Formats

RDF can be serialized in multiple formats:

| Format | Extension | Use Case |
|--------|-----------|----------|
| Turtle | .ttl | Human-readable, good for editing |
| N-Triples | .nt | Simple, good for streaming/loading |
| JSON-LD | .jsonld | Web APIs, JavaScript applications |
| RDF/XML | .rdf | Legacy systems, XML tools |

SHOC will primarily use Turtle for development and JSON-LD for API responses.

### Named Graphs

Named graphs allow grouping triples by source or context:

```
GRAPH <http://shoc.cofc.edu/sources/1888_directory> {
    shoc:person/john_smith shoc:occupation "Merchant" .
}
```

This enables provenance tracking the source from which each fact originated.

---

## 4. Ontology Selection and Design

### Core Ontologies

The SHOC RDF implementation will use a layered ontology approach:

#### Layer 1: Foundation Ontologies

- **RDF/RDFS**: Basic resource description
- **OWL**: Web Ontology Language for class definitions and reasoning
- **SKOS**: Simple Knowledge Organization System for controlled vocabularies

#### Layer 2: Domain Ontologies

- **CIDOC-CRM** (ISO 21127): Cultural heritage modeling
  - E18 Physical Thing (buildings)
  - E21 Person
  - E53 Place
  - E52 Time-Span
  - E31 Document (maps)

- **GeoSPARQL** (OGC): Spatial data and queries
  - geo:Feature
  - geo:Geometry
  - geo:hasGeometry
  - geo:asWKT

- **Time Ontology** (W3C): Temporal modeling
  - time:TemporalEntity
  - time:Instant
  - time:Interval

#### Layer 3: Local Ontology (SHOC-specific)

A custom SHOC ontology extends the core ontologies with project-specific classes and properties:

```turtle
@prefix shoc: <http://shoc.cofc.edu/ontology/> .
@prefix crm: <http://www.cidoc-crm.org/cidoc-crm/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

# SHOC Historic Structure extends CRM Physical Thing
shoc:HistoricStructure a rdfs:Class ;
    rdfs:subClassOf crm:E18_Physical_Thing ;
    rdfs:label "Historic Structure" ;
    rdfs:comment "A building or structure of historical significance in Charleston." .

# SHOC-specific properties
shoc:originalAddressNumber a rdf:Property ;
    rdfs:domain shoc:HistoricStructure ;
    rdfs:range xsd:string ;
    rdfs:label "Original Address Number" .

shoc:primaryMaterial a rdf:Property ;
    rdfs:domain shoc:HistoricStructure ;
    rdfs:range shoc:BuildingMaterial ;
    rdfs:subPropertyOf crm:P45_consists_of ;
    rdfs:label "Primary Construction Material" .

shoc:primaryFunction a rdf:Property ;
    rdfs:domain shoc:HistoricStructure ;
    rdfs:range shoc:BuildingFunction ;
    rdfs:subPropertyOf crm:P2_has_type ;
    rdfs:label "Primary Building Function" .

# SHOC Historic Person extends CRM Person
shoc:HistoricPerson a rdfs:Class ;
    rdfs:subClassOf crm:E21_Person ;
    rdfs:label "Historic Person" ;
    rdfs:comment "A person documented in Charleston historical records." .

shoc:occupation a rdf:Property ;
    rdfs:domain shoc:HistoricPerson ;
    rdfs:range shoc:Occupation ;
    rdfs:subPropertyOf crm:P2_has_type ;
    rdfs:label "Occupation" .

shoc:residedAt a rdf:Property ;
    rdfs:domain shoc:HistoricPerson ;
    rdfs:range shoc:HistoricStructure ;
    rdfs:subPropertyOf crm:P74_has_current_or_former_residence ;
    rdfs:label "Resided At" .
```

### Controlled Vocabularies

Controlled vocabularies will be modeled using SKOS:

```turtle
@prefix skos: <http://www.w3.org/2004/02/skos/core#> .
@prefix shoc-mat: <http://shoc.cofc.edu/vocabulary/materials/> .

# Building Materials Concept Scheme
shoc-mat:materials a skos:ConceptScheme ;
    skos:prefLabel "SHOC Building Materials" .

shoc-mat:brick a skos:Concept ;
    skos:inScheme shoc-mat:materials ;
    skos:prefLabel "Brick" ;
    skos:altLabel "Masonry" ;
    skos:definition "Construction using fired clay bricks." ;
    skos:broader shoc-mat:masonry .

shoc-mat:wood a skos:Concept ;
    skos:inScheme shoc-mat:materials ;
    skos:prefLabel "Wood" ;
    skos:altLabel "Frame" , "Timber" ;
    skos:definition "Construction using wooden structural elements." .
```

### Linking to External Vocabularies

SHOC concepts will be linked to external authority files:

```turtle
shoc:occupation/merchant owl:sameAs <http://id.loc.gov/authorities/subjects/sh85083791> .
shoc:place/charleston owl:sameAs <http://dbpedia.org/resource/Charleston,_South_Carolina> .
```

---

## 5. Technical Architecture

### System Components

```
+-------------------+     +-------------------+
|   Web Frontend    |     |   AI Query API    |
|  (JavaScript)     |     |  (Python/FastAPI) |
+--------+----------+     +--------+----------+
         |                         |
         |   JSON-LD / GeoJSON     |
         |                         |
+--------v-------------------------v----------+
|              API Gateway (nginx)            |
+---------------------+------------------------+
                      |
       +--------------+---------------+
       |                              |
+------v------+              +--------v--------+
| SPARQL      |              | Geometry        |
| Endpoint    |              | Service         |
| (GraphDB/   |              | (PostGIS or     |
| Apache Jena)|              | GeoSPARQL)      |
+------+------+              +-----------------+
       |
+------v------+
| Triple Store|
| (GraphDB/   |
| Blazegraph/ |
| Apache Jena)|
+-------------+
```

### Data Flow

1. **Ingest**: Source data from ArcGIS is transformed to RDF triples
2. **Store**: Triples are loaded into the triple store
3. **Index**: Full-text and spatial indexes are built
4. **Query**: SPARQL queries retrieve data as JSON-LD
5. **Display**: Frontend renders results on map and sidebar
6. **AI**: Natural language queries are translated to SPARQL

---

## 6. Data Transformation Strategy

### Mapping Current Schema to RDF

#### Places Table Mapping

| Source Field | RDF Predicate | Object Type |
|--------------|---------------|-------------|
| OBJECTID | shoc:sourceId | xsd:integer |
| place_ID | dcterms:identifier | xsd:string |
| orig_address_no | shoc:originalAddressNumber | xsd:string |
| orig_address_street | shoc:originalAddressStreet | xsd:string |
| orig_city | shoc:originalMunicipality | xsd:string |
| curr_address_no | shoc:currentAddressNumber | xsd:string |
| curr_address_street | shoc:currentAddressStreet | xsd:string |
| curr_city | shoc:currentMunicipality | xsd:string |
| prime_material | shoc:primaryMaterial | shoc:BuildingMaterial (URI) |
| add_material | shoc:additionalMaterial | shoc:BuildingMaterial (URI) |
| function_prime | shoc:primaryFunction | shoc:BuildingFunction (URI) |
| function_second | shoc:secondaryFunction | shoc:BuildingFunction (URI) |
| max_stories | shoc:maxStories | xsd:integer |
| place_descript | rdfs:comment | xsd:string |
| source_year | shoc:sourceYear | xsd:gYear |
| place_source | dcterms:source | xsd:string |
| Shape (geometry) | geo:hasGeometry / geo:asWKT | geo:wktLiteral |

#### People Table Mapping

| Source Field | RDF Predicate | Object Type |
|--------------|---------------|-------------|
| OBJECTID | shoc:sourceId | xsd:integer |
| USER_Salutation | shoc:salutation | xsd:string |
| USER_Given_Name | foaf:givenName | xsd:string |
| USER_Surname | foaf:familyName | xsd:string |
| USER_Name_as_given | rdfs:label | xsd:string |
| USER_Occupation_Title | shoc:occupation | shoc:Occupation (URI) |
| USER_Business_Name | shoc:businessName | xsd:string |
| USER_Office_Business_Address | shoc:businessAddress | xsd:string |
| USER_Street_number_name | shoc:residenceAddress | xsd:string |
| USER_r_bds | shoc:tenureType | shoc:TenureType (URI) |
| USER_POC | shoc:personOfColor | xsd:boolean |
| Shape (geometry) | geo:hasGeometry / geo:asWKT | geo:wktLiteral |

### Transformation Script

```python
# rdf_transform.py
from rdflib import Graph, Namespace, Literal, URIRef
from rdflib.namespace import RDF, RDFS, XSD, FOAF, DCTERMS
import json

# Define namespaces
SHOC = Namespace("http://shoc.cofc.edu/resource/")
SHOC_ONT = Namespace("http://shoc.cofc.edu/ontology/")
SHOC_MAT = Namespace("http://shoc.cofc.edu/vocabulary/materials/")
SHOC_FUNC = Namespace("http://shoc.cofc.edu/vocabulary/functions/")
CRM = Namespace("http://www.cidoc-crm.org/cidoc-crm/")
GEO = Namespace("http://www.opengis.net/ont/geosparql#")
TIME = Namespace("http://www.w3.org/2006/time#")

def geometry_to_wkt(geom):
    """Convert GeoJSON geometry to WKT string."""
    if geom is None:
        return None
    geom_type = geom['type']
    coords = geom['coordinates']
    if geom_type == 'Point':
        return f"POINT({coords[0]} {coords[1]})"
    elif geom_type == 'Polygon':
        ring = ' '.join([f"{c[0]} {c[1]}" for c in coords[0]])
        return f"POLYGON(({ring}))"
    return None

def normalize_material(material_str):
    """Map material string to controlled vocabulary URI."""
    material_map = {
        'brick': SHOC_MAT.brick,
        'wood': SHOC_MAT.wood,
        'frame': SHOC_MAT.wood,
        'stone': SHOC_MAT.stone,
        'stucco': SHOC_MAT.stucco,
    }
    if material_str:
        return material_map.get(material_str.lower().strip(), None)
    return None

def transform_place(feature, graph):
    """Transform a place GeoJSON feature to RDF triples."""
    props = feature['properties']
    geom = feature.get('geometry')
    
    # Create URI for this place
    place_id = props.get('place_ID') or props.get('OBJECTID')
    place_uri = SHOC[f"place/{place_id}"]
    
    # Type assertion
    graph.add((place_uri, RDF.type, SHOC_ONT.HistoricStructure))
    graph.add((place_uri, RDF.type, CRM.E18_Physical_Thing))
    
    # Source identifier
    if props.get('OBJECTID'):
        graph.add((place_uri, SHOC_ONT.sourceId, Literal(props['OBJECTID'], datatype=XSD.integer)))
    
    # Address information
    if props.get('orig_address_no'):
        graph.add((place_uri, SHOC_ONT.originalAddressNumber, Literal(props['orig_address_no'])))
    if props.get('orig_address_street'):
        graph.add((place_uri, SHOC_ONT.originalAddressStreet, Literal(props['orig_address_street'])))
    if props.get('orig_city'):
        graph.add((place_uri, SHOC_ONT.originalMunicipality, Literal(props['orig_city'])))
    if props.get('curr_address_no'):
        graph.add((place_uri, SHOC_ONT.currentAddressNumber, Literal(props['curr_address_no'])))
    if props.get('curr_address_street'):
        graph.add((place_uri, SHOC_ONT.currentAddressStreet, Literal(props['curr_address_street'])))
    
    # Materials
    material_uri = normalize_material(props.get('prime_material'))
    if material_uri:
        graph.add((place_uri, SHOC_ONT.primaryMaterial, material_uri))
    
    # Function
    if props.get('function_prime'):
        func_uri = SHOC_FUNC[props['function_prime'].lower().replace(' ', '_')]
        graph.add((place_uri, SHOC_ONT.primaryFunction, func_uri))
    
    # Description
    if props.get('place_descript'):
        graph.add((place_uri, RDFS.comment, Literal(props['place_descript'])))
    
    # Time-span
    if props.get('source_year'):
        time_span_uri = SHOC[f"timespan/{place_id}"]
        graph.add((place_uri, CRM.P4_has_time_span, time_span_uri))
        graph.add((time_span_uri, RDF.type, CRM.E52_Time_Span))
        graph.add((time_span_uri, TIME.year, Literal(props['source_year'], datatype=XSD.gYear)))
    
    # Geometry
    if geom:
        wkt = geometry_to_wkt(geom)
        if wkt:
            geom_uri = SHOC[f"geometry/{place_id}"]
            graph.add((place_uri, GEO.hasGeometry, geom_uri))
            graph.add((geom_uri, RDF.type, GEO.Geometry))
            graph.add((geom_uri, GEO.asWKT, Literal(wkt, datatype=GEO.wktLiteral)))
    
    return place_uri

def transform_person(feature, graph, place_lookup):
    """Transform a person GeoJSON feature to RDF triples."""
    props = feature['properties']
    geom = feature.get('geometry')
    
    # Create URI for this person
    person_id = props.get('OBJECTID')
    person_uri = SHOC[f"person/{person_id}"]
    
    # Type assertion
    graph.add((person_uri, RDF.type, SHOC_ONT.HistoricPerson))
    graph.add((person_uri, RDF.type, CRM.E21_Person))
    
    # Name components
    if props.get('USER_Given_Name'):
        graph.add((person_uri, FOAF.givenName, Literal(props['USER_Given_Name'])))
    if props.get('USER_Surname'):
        graph.add((person_uri, FOAF.familyName, Literal(props['USER_Surname'])))
    
    # Full name label
    name_parts = [
        props.get('USER_Salutation', ''),
        props.get('USER_Given_Name', ''),
        props.get('USER_Surname', '')
    ]
    full_name = ' '.join([p for p in name_parts if p]).strip()
    if full_name:
        graph.add((person_uri, RDFS.label, Literal(full_name)))
    
    # Occupation
    if props.get('USER_Occupation_Title'):
        occ_uri = SHOC[f"occupation/{props['USER_Occupation_Title'].lower().replace(' ', '_')}"]
        graph.add((person_uri, SHOC_ONT.occupation, occ_uri))
        graph.add((occ_uri, RDF.type, SHOC_ONT.Occupation))
        graph.add((occ_uri, RDFS.label, Literal(props['USER_Occupation_Title'])))
    
    # Residence relationship (link to place if address matches)
    address = props.get('USER_Street_number_name')
    if address and address in place_lookup:
        place_uri = place_lookup[address]
        graph.add((person_uri, SHOC_ONT.residedAt, place_uri))
        graph.add((person_uri, CRM.P74_has_current_or_former_residence, place_uri))
    
    # Tenure type
    tenure = props.get('USER_r_bds')
    if tenure == 'r':
        graph.add((person_uri, SHOC_ONT.tenureType, SHOC['tenure/owner']))
    elif tenure == 'bds':
        graph.add((person_uri, SHOC_ONT.tenureType, SHOC['tenure/boarder']))
    
    # Person of color flag
    if props.get('USER_POC'):
        graph.add((person_uri, SHOC_ONT.personOfColor, Literal(True, datatype=XSD.boolean)))
    
    return person_uri

def main():
    # Create RDF graph
    g = Graph()
    g.bind('shoc', SHOC)
    g.bind('shoc-ont', SHOC_ONT)
    g.bind('shoc-mat', SHOC_MAT)
    g.bind('shoc-func', SHOC_FUNC)
    g.bind('crm', CRM)
    g.bind('geo', GEO)
    g.bind('time', TIME)
    g.bind('foaf', FOAF)
    g.bind('dcterms', DCTERMS)
    
    # Load and transform places
    place_lookup = {}
    with open('places.geojson', 'r') as f:
        places = json.load(f)
    
    for feature in places['features']:
        place_uri = transform_place(feature, g)
        props = feature['properties']
        addr_parts = [props.get('orig_address_no', ''), props.get('orig_address_street', '')]
        address = ' '.join([p for p in addr_parts if p]).strip()
        if address:
            place_lookup[address] = place_uri
    
    # Load and transform people
    with open('people.geojson', 'r') as f:
        people = json.load(f)
    
    for feature in people['features']:
        transform_person(feature, g, place_lookup)
    
    # Serialize to Turtle format
    g.serialize('shoc.ttl', format='turtle')
    
    # Also serialize to N-Triples for bulk loading
    g.serialize('shoc.nt', format='nt')
    
    print(f"Generated {len(g)} triples")

if __name__ == '__main__':
    main()
```

---

## 7. Triple Store Selection

### Option Comparison

| Feature | Apache Jena Fuseki | GraphDB | Blazegraph | Oxigraph |
|---------|-------------------|---------|------------|----------|
| License | Apache 2.0 | Free tier available | BSD | MIT/Apache 2.0 |
| GeoSPARQL | Via extension | Built-in | Limited | Limited |
| Full-text search | Via Lucene | Built-in | Built-in | Limited |
| Reasoning | RDFS/OWL | RDFS/OWL | RDFS | None |
| Clustering | Yes | Enterprise only | Yes | No |
| REST API | Yes | Yes | Yes | Yes |
| Memory footprint | Medium | Medium | High | Low |
| Active development | Yes | Yes | Archived | Yes |

### Recommendation: GraphDB Free or Apache Jena Fuseki

For SHOC, I recommend starting with **Apache Jena Fuseki** or **GraphDB Free** based on the following considerations:

**Apache Jena Fuseki**:
- Completely open source
- Excellent SPARQL 1.1 compliance
- GeoSPARQL support via extensions
- Strong community and documentation
- Good integration with Java ecosystem

**GraphDB Free**:
- Built-in GeoSPARQL support
- Excellent full-text search
- Visual graph exploration tools
- Better out-of-box performance
- Limited to 10 million triples in free edition

For a dataset the size of SHOC (estimated at 500K-1M triples), either option will work well.

### Jena Fuseki Installation

```bash
# Download Apache Jena Fuseki
wget https://archive.apache.org/dist/jena/binaries/apache-jena-fuseki-4.10.0.tar.gz
tar -xzf apache-jena-fuseki-4.10.0.tar.gz
cd apache-jena-fuseki-4.10.0

# Create data directory
mkdir -p /data/fuseki

# Start Fuseki server
./fuseki-server --loc=/data/fuseki/shoc /shoc

# Access UI at http://localhost:3030/
```

### GraphDB Installation

```bash
# Download GraphDB Free
wget https://graphdb.ontotext.com/graphdb-free/10.x/graphdb-free-10.4.0-dist.zip
unzip graphdb-free-10.4.0-dist.zip
cd graphdb-free-10.4.0

# Start GraphDB
./bin/graphdb

# Access Workbench at http://localhost:7200/
```

---

## 8. SPARQL Endpoint Implementation

### Basic SPARQL Queries

#### Query All Historic Structures

```sparql
PREFIX shoc: <http://shoc.cofc.edu/resource/>
PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>

SELECT ?structure ?address ?material ?function ?wkt
WHERE {
    ?structure a shoc-ont:HistoricStructure .
    
    OPTIONAL {
        ?structure shoc-ont:originalAddressNumber ?num .
        ?structure shoc-ont:originalAddressStreet ?street .
        BIND(CONCAT(?num, " ", ?street) AS ?address)
    }
    
    OPTIONAL { ?structure shoc-ont:primaryMaterial/rdfs:label ?material }
    OPTIONAL { ?structure shoc-ont:primaryFunction/rdfs:label ?function }
    OPTIONAL { ?structure geo:hasGeometry/geo:asWKT ?wkt }
}
LIMIT 100
```

#### Query People at a Specific Address

```sparql
PREFIX shoc: <http://shoc.cofc.edu/resource/>
PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?person ?name ?occupation
WHERE {
    ?structure shoc-ont:originalAddressStreet "King Street" .
    ?person shoc-ont:residedAt ?structure .
    ?person rdfs:label ?name .
    OPTIONAL { ?person shoc-ont:occupation/rdfs:label ?occupation }
}
```

#### Spatial Query (GeoSPARQL)

```sparql
PREFIX shoc: <http://shoc.cofc.edu/resource/>
PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX geof: <http://www.opengis.net/def/function/geosparql/>

SELECT ?structure ?wkt
WHERE {
    ?structure a shoc-ont:HistoricStructure .
    ?structure geo:hasGeometry/geo:asWKT ?wkt .
    
    FILTER(geof:distance(?wkt, "POINT(-79.939 32.785)"^^geo:wktLiteral, <http://www.opengis.net/def/uom/OGC/1.0/metre>) < 500)
}
```

#### Time-Filtered Query

```sparql
PREFIX shoc: <http://shoc.cofc.edu/resource/>
PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?structure ?year
WHERE {
    ?structure a shoc-ont:HistoricStructure .
    ?structure crm:P4_has_time_span ?ts .
    ?ts time:year ?year .
    
    FILTER(?year >= "1850"^^xsd:gYear AND ?year <= "1900"^^xsd:gYear)
}
```

### REST API Wrapper

Create a Python FastAPI wrapper around the SPARQL endpoint:

```python
# api/main.py
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from SPARQLWrapper import SPARQLWrapper, JSON
from typing import Optional
import json

app = FastAPI(title="SHOC RDF API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

SPARQL_ENDPOINT = "http://localhost:3030/shoc/query"
sparql = SPARQLWrapper(SPARQL_ENDPOINT)
sparql.setReturnFormat(JSON)

@app.get("/api/structures")
async def get_structures(
    min_year: Optional[int] = Query(None),
    max_year: Optional[int] = Query(None),
    material: Optional[str] = Query(None),
    function: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """Query historic structures with optional filters."""
    
    filters = []
    if min_year:
        filters.append(f'FILTER(?year >= "{min_year}"^^xsd:gYear)')
    if max_year:
        filters.append(f'FILTER(?year <= "{max_year}"^^xsd:gYear)')
    if material:
        filters.append(f'FILTER(CONTAINS(LCASE(?material), "{material.lower()}"))')
    if function:
        filters.append(f'FILTER(CONTAINS(LCASE(?function), "{function.lower()}"))')
    
    filter_clause = "\n".join(filters)
    
    query = f"""
    PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX geo: <http://www.opengis.net/ont/geosparql#>
    PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
    PREFIX time: <http://www.w3.org/2006/time#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    
    SELECT ?structure ?address ?material ?function ?year ?wkt
    WHERE {{
        ?structure a shoc-ont:HistoricStructure .
        
        OPTIONAL {{
            ?structure shoc-ont:originalAddressNumber ?num .
            ?structure shoc-ont:originalAddressStreet ?street .
            BIND(CONCAT(?num, " ", ?street) AS ?address)
        }}
        
        OPTIONAL {{ ?structure shoc-ont:primaryMaterial/rdfs:label ?material }}
        OPTIONAL {{ ?structure shoc-ont:primaryFunction/rdfs:label ?function }}
        OPTIONAL {{ ?structure crm:P4_has_time_span/time:year ?year }}
        OPTIONAL {{ ?structure geo:hasGeometry/geo:asWKT ?wkt }}
        
        {filter_clause}
    }}
    LIMIT {limit}
    """
    
    sparql.setQuery(query)
    results = sparql.queryAndConvert()
    
    # Convert to GeoJSON for map compatibility
    features = []
    for result in results["results"]["bindings"]:
        feature = {
            "type": "Feature",
            "properties": {
                "uri": result.get("structure", {}).get("value"),
                "address": result.get("address", {}).get("value"),
                "material": result.get("material", {}).get("value"),
                "function": result.get("function", {}).get("value"),
                "year": result.get("year", {}).get("value")
            }
        }
        
        wkt = result.get("wkt", {}).get("value")
        if wkt:
            feature["geometry"] = wkt_to_geojson(wkt)
        else:
            feature["geometry"] = None
        
        features.append(feature)
    
    return {"type": "FeatureCollection", "features": features}

def wkt_to_geojson(wkt):
    """Convert WKT to GeoJSON geometry."""
    if wkt.startswith("POINT"):
        coords = wkt.replace("POINT(", "").replace(")", "").split()
        return {"type": "Point", "coordinates": [float(coords[0]), float(coords[1])]}
    return None
```

---

## 9. AI Integration for Natural Language Querying

### Architecture Overview

The AI integration enables users to ask natural language questions like:
- "Show me all brick buildings on King Street"
- "Who lived at 123 Meeting Street in 1888?"
- "Find merchants who owned property near the waterfront"

The system translates these queries into SPARQL using a large language model (LLM).

```
+-------------------+     +-------------------+     +-------------------+
|   User Question   | --> |   LLM Translator  | --> |   SPARQL Query    |
|   (Natural Lang)  |     |   (GPT/Claude/    |     |   (Generated)     |
|                   |     |    Local LLM)     |     |                   |
+-------------------+     +-------------------+     +-------------------+
                                                            |
                                                            v
+-------------------+     +-------------------+     +-------------------+
|   Formatted       | <-- |   Result          | <-- |   Triple Store    |
|   Answer          |     |   Processor       |     |   (SPARQL)        |
+-------------------+     +-------------------+     +-------------------+
```

### Implementation Components

#### 1. Ontology Context Provider

The LLM needs to understand the SHOC ontology to generate valid SPARQL:

```python
# ai/ontology_context.py

SHOC_ONTOLOGY_CONTEXT = """
The SHOC knowledge graph uses the following classes and properties:

## Classes
- shoc-ont:HistoricStructure - A building or structure (has address, material, function)
- shoc-ont:HistoricPerson - A person from historical records (has name, occupation)
- shoc-ont:Occupation - An occupation category
- shoc-mat:BuildingMaterial - A type of building material (brick, wood, stone, etc.)
- shoc-func:BuildingFunction - A building function (residential, commercial, etc.)

## Properties for Structures
- shoc-ont:originalAddressNumber - Street number as text
- shoc-ont:originalAddressStreet - Street name as text
- shoc-ont:primaryMaterial - Links to a BuildingMaterial concept
- shoc-ont:primaryFunction - Links to a BuildingFunction concept
- crm:P4_has_time_span/time:year - The source year
- geo:hasGeometry/geo:asWKT - Location as WKT geometry

## Properties for People
- rdfs:label - Full name
- foaf:givenName - First name
- foaf:familyName - Last name
- shoc-ont:occupation - Links to an Occupation
- shoc-ont:residedAt - Links to a HistoricStructure
- shoc-ont:businessAddress - Business address as text

## Namespaces
PREFIX shoc: <http://shoc.cofc.edu/resource/>
PREFIX shoc-ont: <http://shoc.cofc.edu/ontology/>
PREFIX shoc-mat: <http://shoc.cofc.edu/vocabulary/materials/>
PREFIX shoc-func: <http://shoc.cofc.edu/vocabulary/functions/>
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>
PREFIX time: <http://www.w3.org/2006/time#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
"""
```

#### 2. Query Translation Service

```python
# ai/query_translator.py

import openai
from ai.ontology_context import SHOC_ONTOLOGY_CONTEXT

class SHOCQueryTranslator:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
        
    def translate_to_sparql(self, natural_language_query: str) -> str:
        """Translate natural language to SPARQL query."""
        
        system_prompt = f"""You are a SPARQL query generator for the SHOC knowledge graph.

{SHOC_ONTOLOGY_CONTEXT}

Your task is to convert natural language questions into valid SPARQL queries.

Rules:
1. Always include necessary PREFIX declarations
2. Use OPTIONAL for fields that may not exist
3. Include geo:asWKT if the question involves locations or maps
4. Use FILTER with CONTAINS for partial text matching
5. Use FILTER with comparison operators for year ranges
6. Return only the SPARQL query, no explanations
7. Limit results to 100 unless the user specifies otherwise
"""
        
        user_prompt = f"Convert this question to SPARQL: {natural_language_query}"
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2
        )
        
        sparql_query = response.choices[0].message.content
        
        if "```sparql" in sparql_query:
            sparql_query = sparql_query.split("```sparql")[1].split("```")[0]
        elif "```" in sparql_query:
            sparql_query = sparql_query.split("```")[1].split("```")[0]
        
        return sparql_query.strip()
    
    def validate_sparql(self, sparql_query: str) -> bool:
        """Basic validation of generated SPARQL."""
        required_elements = ["SELECT", "WHERE", "{", "}"]
        return all(elem in sparql_query.upper() for elem in required_elements)
```

#### 3. Answer Generation Service

```python
# ai/answer_generator.py

class SHOCAnswerGenerator:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model
    
    def generate_answer(
        self, 
        original_question: str, 
        sparql_query: str, 
        query_results: list
    ) -> str:
        """Generate a natural language answer from SPARQL results."""
        
        result_summary = self._summarize_results(query_results)
        
        system_prompt = """You are a helpful assistant answering questions about the historical 
geography of Charleston, South Carolina. You have just queried a knowledge graph and received results.

Provide a clear, informative answer based on the query results. If no results were found, 
say so politely and suggest alternative queries. Use specific details from the results.
Do not invent information not present in the results."""
        
        user_prompt = f"""Question: {original_question}

SPARQL Query Used:
{sparql_query}

Results ({len(query_results)} records):
{result_summary}

Please provide a natural language answer to the original question based on these results."""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content
    
    def _summarize_results(self, results: list, max_items: int = 10) -> str:
        """Create a text summary of query results."""
        if not results:
            return "No results found."
        
        summary_lines = []
        for i, result in enumerate(results[:max_items]):
            line_parts = []
            for key, value in result.items():
                if value and isinstance(value, dict) and 'value' in value:
                    line_parts.append(f"{key}: {value['value']}")
            summary_lines.append(f"{i+1}. " + ", ".join(line_parts))
        
        if len(results) > max_items:
            summary_lines.append(f"... and {len(results) - max_items} more results")
        
        return "\n".join(summary_lines)
```

#### 4. Integrated API Endpoint

```python
# ai/api.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ai.query_translator import SHOCQueryTranslator
from ai.answer_generator import SHOCAnswerGenerator
from SPARQLWrapper import SPARQLWrapper, JSON
import os

router = APIRouter(prefix="/api/ai", tags=["AI Query"])

translator = SHOCQueryTranslator(api_key=os.getenv("OPENAI_API_KEY"))
answer_gen = SHOCAnswerGenerator(api_key=os.getenv("OPENAI_API_KEY"))

sparql = SPARQLWrapper("http://localhost:3030/shoc/query")
sparql.setReturnFormat(JSON)

class NaturalLanguageQuery(BaseModel):
    question: str

class QueryResponse(BaseModel):
    question: str
    sparql_query: str
    answer: str
    result_count: int
    features: list

@router.post("/query", response_model=QueryResponse)
async def natural_language_query(query: NaturalLanguageQuery):
    """Process a natural language question about Charleston history."""
    
    try:
        # Step 1: Translate to SPARQL
        sparql_query = translator.translate_to_sparql(query.question)
        
        if not translator.validate_sparql(sparql_query):
            raise HTTPException(400, "Failed to generate valid SPARQL query")
        
        # Step 2: Execute SPARQL
        sparql.setQuery(sparql_query)
        results = sparql.queryAndConvert()
        bindings = results.get("results", {}).get("bindings", [])
        
        # Step 3: Generate natural language answer
        answer = answer_gen.generate_answer(
            original_question=query.question,
            sparql_query=sparql_query,
            query_results=bindings
        )
        
        # Step 4: Convert to GeoJSON for map display
        features = convert_to_geojson(bindings)
        
        return QueryResponse(
            question=query.question,
            sparql_query=sparql_query,
            answer=answer,
            result_count=len(bindings),
            features=features
        )
        
    except Exception as e:
        raise HTTPException(500, f"Query processing failed: {str(e)}")
```

### Local LLM Alternative

For privacy and cost considerations, a local LLM can be used instead of cloud APIs:

```python
# ai/local_llm.py

from llama_cpp import Llama

class LocalLLMTranslator:
    def __init__(self, model_path: str):
        self.llm = Llama(
            model_path=model_path,
            n_ctx=4096,
            n_gpu_layers=-1
        )
    
    def translate_to_sparql(self, question: str, ontology_context: str) -> str:
        prompt = f"""You are a SPARQL query generator.

{ontology_context}

Question: {question}

Generate a valid SPARQL query:"""
        
        output = self.llm(prompt, max_tokens=512, temperature=0.2)
        return output['choices'][0]['text'].strip()
```

### Recommended Local Models

| Model | Size | Quality | Speed |
|-------|------|---------|-------|
| CodeLlama 13B | 13GB | Good | Medium |
| Mistral 7B | 7GB | Good | Fast |
| Phi-2 | 2.7GB | Moderate | Very Fast |
| DeepSeek Coder 6.7B | 6.7GB | Very Good | Medium |

---

## 10. Frontend Integration

### Replacing ArcGIS with RDF-backed Map

The frontend JavaScript will be modified to query the new RDF API:

```javascript
// Updated app.js sections

const RDF_API_BASE = "http://localhost:8000/api";

// Replace queryPoints with RDF version
async function queryPointsRDF(searchText) {
    const params = new URLSearchParams();
    if (searchText) params.append("search", searchText);
    params.append("min_year", dateSlider_l.value);
    params.append("max_year", dateSlider_r.value);
    params.append("limit", "100");
    
    const response = await fetch(`${RDF_API_BASE}/structures?${params}`);
    const geojson = await response.json();
    
    // Update the points layer with GeoJSON
    updatePointsFromGeoJSON(geojson);
    
    // Update sidebar list
    updatePointsList(geojson.features);
}

// AI Query Interface
async function askQuestion(question) {
    const response = await fetch(`${RDF_API_BASE}/ai/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
    });
    
    const result = await response.json();
    
    // Display answer in sidebar
    displayAIAnswer(result.answer);
    
    // Show results on map
    updatePointsFromGeoJSON({
        type: "FeatureCollection",
        features: result.features
    });
}
```

### New AI Query UI Component

Add a natural language search interface:

```html
<!-- Add to index.html -->
<div id="ai-query-panel" class="ai-panel">
    <h3>Ask a Question</h3>
    <textarea id="ai-question" placeholder="e.g., Who were the merchants on King Street?"></textarea>
    <button id="ai-submit" class="button2">Ask</button>
    <div id="ai-answer"></div>
    <details id="ai-sparql-details">
        <summary>View SPARQL Query</summary>
        <pre id="ai-sparql-code"></pre>
    </details>
</div>
```

---

## 11. Linked Open Data Publication

### Publishing SHOC as Linked Data

#### SPARQL Endpoint

Make the SPARQL endpoint publicly accessible with CORS enabled:

```nginx
# nginx configuration for public SPARQL endpoint
location /sparql {
    proxy_pass http://localhost:3030/shoc/query;
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
}
```

#### Content Negotiation

Implement content negotiation for resource URIs:

```python
@app.get("/resource/{resource_type}/{resource_id}")
async def get_resource(
    resource_type: str,
    resource_id: str,
    accept: str = Header("application/json")
):
    uri = f"http://shoc.cofc.edu/resource/{resource_type}/{resource_id}"
    
    if "text/html" in accept:
        # Return HTML page
        return RedirectResponse(f"/view/{resource_type}/{resource_id}")
    elif "application/ld+json" in accept:
        # Return JSON-LD
        return get_resource_jsonld(uri)
    elif "text/turtle" in accept:
        # Return Turtle
        return get_resource_turtle(uri)
    else:
        # Default to JSON-LD
        return get_resource_jsonld(uri)
```

#### VoID Dataset Description

Create a VoID (Vocabulary of Interlinked Datasets) description:

```turtle
@prefix void: <http://rdfs.org/ns/void#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .

<http://shoc.cofc.edu/.well-known/void> a void:DatasetDescription ;
    dcterms:title "SHOC Dataset Description" ;
    foaf:primaryTopic <http://shoc.cofc.edu/dataset> .

<http://shoc.cofc.edu/dataset> a void:Dataset ;
    dcterms:title "Spatial History of Charleston" ;
    dcterms:description "Historical places, people, and maps of Charleston, SC" ;
    dcterms:publisher <http://cofc.edu> ;
    void:sparqlEndpoint <http://shoc.cofc.edu/sparql> ;
    void:triples 1000000 ;
    void:vocabulary <http://www.cidoc-crm.org/cidoc-crm/> ,
                    <http://www.opengis.net/ont/geosparql#> ,
                    <http://shoc.cofc.edu/ontology/> .
```

---

## 12. Migration Timeline

### Phase 1: Foundation (Weeks 1-4)

| Week | Tasks |
|------|-------|
| 1 | Set up development environment, install triple store |
| 2 | Design and implement SHOC ontology in Turtle |
| 3 | Create controlled vocabularies (materials, functions, occupations) |
| 4 | Write data extraction scripts for ArcGIS export |

### Phase 2: Data Migration (Weeks 5-8)

| Week | Tasks |
|------|-------|
| 5 | Transform places data to RDF |
| 6 | Transform people data to RDF, establish links |
| 7 | Transform maps data to RDF |
| 8 | Load all data, validate, create indexes |

### Phase 3: API Development (Weeks 9-12)

| Week | Tasks |
|------|-------|
| 9 | Implement REST API wrapper around SPARQL |
| 10 | Add GeoJSON conversion and spatial filtering |
| 11 | Develop AI query translation service |
| 12 | Implement answer generation and testing |

### Phase 4: Frontend Integration (Weeks 13-16)

| Week | Tasks |
|------|-------|
| 13 | Modify frontend to use new API endpoints |
| 14 | Add AI query interface |
| 15 | Testing and performance optimization |
| 16 | Documentation and deployment |

---

## 13. Testing and Validation

### Data Integrity Tests

```python
# tests/test_data_integrity.py

def test_triple_count():
    """Verify expected number of triples."""
    query = "SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }"
    result = execute_sparql(query)
    assert result > 500000

def test_all_places_have_geometry():
    """Verify places have spatial data."""
    query = """
    SELECT (COUNT(?place) AS ?total) (COUNT(?geom) AS ?with_geom)
    WHERE {
        ?place a shoc-ont:HistoricStructure .
        OPTIONAL { ?place geo:hasGeometry ?geom }
    }
    """
    result = execute_sparql(query)
    assert result['with_geom'] / result['total'] > 0.95

def test_person_place_links():
    """Verify person-to-place relationships."""
    query = """
    SELECT (COUNT(?link) AS ?count)
    WHERE {
        ?person shoc-ont:residedAt ?place .
    }
    """
    result = execute_sparql(query)
    assert result > 1000
```

### Query Performance Tests

```python
# tests/test_performance.py

import time

def test_simple_query_performance():
    """Simple queries should complete in under 1 second."""
    query = "SELECT ?s WHERE { ?s a shoc-ont:HistoricStructure } LIMIT 100"
    start = time.time()
    execute_sparql(query)
    elapsed = time.time() - start
    assert elapsed < 1.0

def test_spatial_query_performance():
    """Spatial queries should complete in under 3 seconds."""
    query = """
    SELECT ?s WHERE {
        ?s geo:hasGeometry/geo:asWKT ?wkt .
        FILTER(geof:distance(?wkt, "POINT(-79.939 32.785)"^^geo:wktLiteral, uom:metre) < 1000)
    }
    """
    start = time.time()
    execute_sparql(query)
    elapsed = time.time() - start
    assert elapsed < 3.0
```

### AI Integration Tests

```python
# tests/test_ai.py

def test_query_translation():
    """Test natural language to SPARQL translation."""
    translator = SHOCQueryTranslator(api_key=TEST_API_KEY)
    
    question = "Show me all brick buildings"
    sparql = translator.translate_to_sparql(question)
    
    assert "SELECT" in sparql
    assert "brick" in sparql.lower() or "primaryMaterial" in sparql

def test_answer_generation():
    """Test answer quality from results."""
    generator = SHOCAnswerGenerator(api_key=TEST_API_KEY)
    
    mock_results = [{"address": {"value": "123 King Street"}}]
    answer = generator.generate_answer("Where are the buildings?", "...", mock_results)
    
    assert "King Street" in answer
```

---

## Appendix A: Useful Resources

### RDF and SPARQL
- W3C RDF Primer: https://www.w3.org/TR/rdf11-primer/
- SPARQL 1.1 Query Language: https://www.w3.org/TR/sparql11-query/
- GeoSPARQL Standard: https://www.ogc.org/standards/geosparql

### Ontologies
- CIDOC-CRM: https://cidoc-crm.org/
- GeoSPARQL Ontology: http://www.opengis.net/ont/geosparql
- SKOS Reference: https://www.w3.org/TR/skos-reference/

### Tools
- RDFLib (Python): https://rdflib.readthedocs.io/
- Apache Jena: https://jena.apache.org/
- GraphDB: https://graphdb.ontotext.com/

### AI Integration
- OpenAI API: https://platform.openai.com/docs/
- LangChain: https://python.langchain.com/
- llama-cpp-python: https://github.com/abetlen/llama-cpp-python
