# ARCHES Implementation Plan for SHOC

This document outlines a comprehensive plan for migrating the Spatial History of Charleston (SHOC) project to the ARCHES platform developed by the Getty Conservation Institute. ARCHES is an open-source, geospatially-enabled software platform designed for cultural heritage inventory and management, built on the CIDOC Conceptual Reference Model (CRM) ontology.

---

## Table of Contents

1. [Introduction to ARCHES](#1-introduction-to-arches)
2. [Why ARCHES for SHOC](#2-why-arches-for-shoc)
3. [System Requirements and Architecture](#3-system-requirements-and-architecture)
4. [Server Infrastructure Setup](#4-server-infrastructure-setup)
5. [ARCHES Installation](#5-arches-installation)
6. [CIDOC-CRM Ontology Overview](#6-cidoc-crm-ontology-overview)
7. [Data Modeling for SHOC](#7-data-modeling-for-shoc)
8. [Data Migration Strategy](#8-data-migration-strategy)
9. [Customization and Theming](#9-customization-and-theming)
10. [Integration with Existing Systems](#10-integration-with-existing-systems)
11. [Timeline and Milestones](#11-timeline-and-milestones)
12. [Risk Assessment](#12-risk-assessment)

---

## 1. Introduction to ARCHES

ARCHES is an open-source, web-based geospatial information system designed for cultural heritage inventory and management. It was jointly developed by the Getty Conservation Institute and World Monuments Fund.

### Key Features

- **Standards-based data modeling**: Uses the CIDOC Conceptual Reference Model (CRM), an ISO standard ontology for cultural heritage documentation (ISO 21127:2014).

- **Geospatial capabilities**: Built-in support for mapping, spatial queries, and geographic data management.

- **Semantic data architecture**: Uses a graph database model that allows flexible, interconnected data relationships.

- **Modern web interface**: Responsive design with map integration, search, and reporting capabilities.

- **Extensible platform**: Supports custom resource models, reports, functions, and workflows.

- **Open source**: Licensed under the GNU Affero General Public License (AGPL).

### Technology Stack

ARCHES is built on:
- Python/Django web framework
- PostgreSQL with PostGIS extension for spatial data
- Elasticsearch for full-text search and indexing
- CouchDB for tile server caching (optional)
- Mapbox GL JS or OpenLayers for web mapping

---

## 2. Why ARCHES for SHOC

### Alignment with Project Goals

The SHOC project documents historical places, structures, and people in Charleston. ARCHES provides several advantages:

1. **Ontology-based modeling**: The CIDOC-CRM provides standardized classes for places (E53 Place), built structures (E18 Physical Thing), people (E21 Person), and temporal entities (E52 Time-Span). This aligns directly with SHOC data types.

2. **Built-in geospatial support**: ARCHES natively handles point, line, and polygon geometries with PostGIS, eliminating the need for a separate ArcGIS infrastructure.

3. **Linked data ready**: ARCHES generates unique identifiers and can export data as RDF, facilitating integration with other cultural heritage databases and the broader linked open data ecosystem.

4. **Flexible relationships**: Unlike the current relational database structure with fixed foreign keys, ARCHES allows any resource to be related to any other resource with semantically meaningful relationship types.

5. **Temporal modeling**: CIDOC-CRM has robust support for modeling time, which is essential for tracking changes to places and structures over the 1670-1950 timeframe.

6. **Active community**: ARCHES has an active user and developer community with regular updates and support channels.

### Current Limitations Addressed

- Replace dependency on proprietary ArcGIS Server with open-source PostGIS.
- Enable semantic queries across related entities (find all buildings where a specific person lived).
- Improve data interoperability with other historic preservation databases.
- Provide a more flexible data model that can accommodate new data types without schema changes.

---

## 3. System Requirements and Architecture

### Minimum Hardware Requirements

For a production deployment serving the SHOC application:

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8 cores |
| RAM | 8 GB | 16 GB |
| Storage | 100 GB SSD | 250 GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Software Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Ubuntu Server | 22.04 LTS | Operating system |
| Python | 3.10+ | Runtime environment |
| PostgreSQL | 14+ | Primary database |
| PostGIS | 3.3+ | Spatial extensions |
| Elasticsearch | 8.x | Search and indexing |
| Nginx | 1.24+ | Web server and reverse proxy |
| Redis | 7.x | Caching and task queue |
| ARCHES | 7.5+ | Application platform |

### Architecture Diagram

```
                    +-------------------+
                    |    Load Balancer  |
                    |   (Optional HA)   |
                    +--------+----------+
                             |
                    +--------v----------+
                    |      Nginx        |
                    | (Reverse Proxy)   |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +---------v-------+
     |    Gunicorn     |          |   Static Files  |
     | (Django/ARCHES) |          |   (CSS/JS/img)  |
     +--------+--------+          +-----------------+
              |
    +---------+---------+---------+
    |         |         |         |
+---v---+ +---v---+ +---v---+ +---v---+
|Postgres| |Elastic| | Redis | |CouchDB|
|PostGIS | |Search | |(cache)| |(tiles)|
+--------+ +-------+ +-------+ +-------+
```

---

## 4. Server Infrastructure Setup

### 4.1 Virtual Machine Provisioning

The recommended approach is to create a dedicated virtual machine for ARCHES. This can be hosted on:

- College of Charleston on-premises VMware or Hyper-V infrastructure
- Cloud providers (AWS, Azure, Google Cloud, DigitalOcean)
- Container orchestration (Docker, Kubernetes) for advanced deployments

#### Option A: On-Premises VMware/Hyper-V Setup

1. **Create a new virtual machine** with the following specifications:
   - Operating System: Ubuntu Server 22.04 LTS (64-bit)
   - vCPUs: 4-8
   - Memory: 16 GB
   - Disk: 250 GB thin-provisioned

2. **Network configuration**:
   - Assign a static IP address on the campus network
   - Configure DNS entry (e.g., shoc-arches.cofc.edu)
   - Open firewall ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

3. **Storage considerations**:
   - Use SSD-backed storage for database performance
   - Consider separate virtual disks for OS, database, and Elasticsearch data

#### Option B: Cloud Deployment (AWS Example)

1. **Launch EC2 instance**:
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: t3.xlarge (4 vCPU, 16 GB RAM) or larger
   - Storage: 250 GB gp3 EBS volume

2. **Network configuration**:
   - Create a VPC with public and private subnets
   - Associate an Elastic IP for stable public addressing
   - Configure security groups to allow HTTP/HTTPS/SSH

3. **Managed services option**:
   - Use Amazon RDS for PostgreSQL with PostGIS extension
   - Use Amazon OpenSearch for Elasticsearch
   - Use Amazon ElastiCache for Redis

### 4.2 Ubuntu Server Initial Setup

After provisioning the VM, perform initial server configuration:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Set timezone
sudo timedatectl set-timezone America/New_York

# Create dedicated user for ARCHES
sudo adduser arches
sudo usermod -aG sudo arches

# Configure SSH key authentication (disable password auth)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh

# Install essential packages
sudo apt install -y build-essential git curl wget unzip software-properties-common

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4.3 PostgreSQL Installation and Configuration

```bash
# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib-14

# Install PostGIS extension
sudo apt install -y postgresql-14-postgis-3 postgresql-14-postgis-3-scripts

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create ARCHES database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER arches WITH ENCRYPTED PASSWORD 'secure_password_here';
CREATE DATABASE arches OWNER arches;
\c arches
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
GRANT ALL PRIVILEGES ON DATABASE arches TO arches;
\q

# Configure PostgreSQL for remote connections (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host arches arches 10.0.0.0/8 md5

sudo systemctl restart postgresql
```

#### PostgreSQL Performance Tuning

Edit `/etc/postgresql/14/main/postgresql.conf`:

```
# Memory settings (adjust based on available RAM)
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB

# Write-ahead log settings
wal_buffers = 64MB
checkpoint_completion_target = 0.9

# Query planner settings
random_page_cost = 1.1
effective_io_concurrency = 200

# Parallel query settings
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

### 4.4 Elasticsearch Installation

```bash
# Import Elasticsearch GPG key
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg

# Add Elasticsearch repository
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
sudo apt update
sudo apt install -y elasticsearch

# Configure Elasticsearch
sudo nano /etc/elasticsearch/elasticsearch.yml

# Set the following:
cluster.name: arches-cluster
node.name: arches-node-1
network.host: localhost
http.port: 9200
xpack.security.enabled: false

# Set JVM heap size (50% of RAM, max 31GB)
sudo nano /etc/elasticsearch/jvm.options.d/heap.options
# Add:
-Xms4g
-Xmx4g

# Start Elasticsearch
sudo systemctl daemon-reload
sudo systemctl enable elasticsearch
sudo systemctl start elasticsearch

# Verify installation
curl -X GET "localhost:9200"
```

### 4.5 Redis Installation

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: supervised systemd

# Start Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Verify installation
redis-cli ping
# Should return: PONG
```

### 4.6 Python Environment Setup

```bash
# Install Python 3.10 and development packages
sudo apt install -y python3.10 python3.10-venv python3.10-dev python3-pip

# Install additional dependencies for ARCHES
sudo apt install -y libpq-dev gdal-bin libgdal-dev libxml2-dev libxslt1-dev
sudo apt install -y libjpeg-dev zlib1g-dev libfreetype6-dev

# Set GDAL environment variables
export CPLUS_INCLUDE_PATH=/usr/include/gdal
export C_INCLUDE_PATH=/usr/include/gdal
```

---

## 5. ARCHES Installation

### 5.1 Create ARCHES Project

```bash
# Switch to arches user
sudo su - arches

# Create project directory
mkdir -p /home/arches/projects
cd /home/arches/projects

# Create Python virtual environment
python3.10 -m venv arches_env
source arches_env/bin/activate

# Upgrade pip
pip install --upgrade pip wheel setuptools

# Install ARCHES
pip install arches

# Create new ARCHES project for SHOC
arches-project create shoc
cd shoc

# Install project dependencies
pip install -r requirements.txt
```

### 5.2 Configure ARCHES Settings

Edit `/home/arches/projects/shoc/shoc/settings.py`:

```python
# Database configuration
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': 'arches',
        'USER': 'arches',
        'PASSWORD': 'secure_password_here',
        'HOST': 'localhost',
        'PORT': '5432',
        'POSTGIS_TEMPLATE': 'template_postgis',
    }
}

# Elasticsearch configuration
ELASTICSEARCH_HOSTS = [
    {'scheme': 'http', 'host': 'localhost', 'port': 9200}
]

# Celery/Redis configuration
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

# Application settings
ALLOWED_HOSTS = ['shoc-arches.cofc.edu', 'localhost', '127.0.0.1']
DEBUG = False
STATIC_ROOT = '/home/arches/projects/shoc/static_collected/'

# Map settings (centered on Charleston)
DEFAULT_MAP_X = -79.939
DEFAULT_MAP_Y = 32.785
DEFAULT_MAP_ZOOM = 13
MAP_MIN_ZOOM = 0
MAP_MAX_ZOOM = 20

# Time zone
TIME_ZONE = 'America/New_York'
```

### 5.3 Initialize ARCHES Database

```bash
# Activate virtual environment
cd /home/arches/projects/shoc
source ../arches_env/bin/activate

# Run database setup
python manage.py setup_db

# Create superuser account
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput

# Build initial search index
python manage.py es index_database
```

### 5.4 Configure Web Server (Nginx + Gunicorn)

Create Gunicorn systemd service file `/etc/systemd/system/arches.service`:

```ini
[Unit]
Description=ARCHES Gunicorn Daemon
After=network.target

[Service]
User=arches
Group=www-data
WorkingDirectory=/home/arches/projects/shoc
ExecStart=/home/arches/projects/arches_env/bin/gunicorn \
    --workers 4 \
    --bind unix:/run/arches/gunicorn.sock \
    --timeout 120 \
    shoc.wsgi:application
Restart=on-failure
RuntimeDirectory=arches

[Install]
WantedBy=multi-user.target
```

Create Nginx configuration `/etc/nginx/sites-available/shoc`:

```nginx
server {
    listen 80;
    server_name shoc-arches.cofc.edu;

    location /static/ {
        alias /home/arches/projects/shoc/static_collected/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /home/arches/projects/shoc/media/;
    }

    location / {
        proxy_pass http://unix:/run/arches/gunicorn.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 300;
        proxy_read_timeout 300;
    }

    client_max_body_size 100M;
}
```

Enable and start services:

```bash
# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/shoc /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Start ARCHES service
sudo systemctl daemon-reload
sudo systemctl enable arches
sudo systemctl start arches
```

---

## 6. CIDOC-CRM Ontology Overview

The CIDOC Conceptual Reference Model is an ISO standard (ISO 21127:2014) ontology for cultural heritage documentation. Understanding its core concepts is essential for modeling SHOC data.

### Core Classes Relevant to SHOC

| CIDOC-CRM Class | Description | SHOC Application |
|-----------------|-------------|------------------|
| E18 Physical Thing | Items that have physical existence | Historic buildings and structures |
| E21 Person | Real persons who have lived or are assumed to have lived | Historical residents and property owners |
| E53 Place | Extents in geographic space | Addresses, parcels, neighborhoods |
| E52 Time-Span | Abstract temporal extents | Dates of construction, residence periods |
| E73 Information Object | Immaterial items that have an objectively recognizable structure | Historic maps, city directories |
| E31 Document | Objects identified as documents | Source documents, maps |
| E55 Type | Concepts that serve as types for other entities | Building types, occupation types |

### Key Properties (Relationships)

| Property | Domain | Range | SHOC Application |
|----------|--------|-------|------------------|
| P53 has former or current location | E18 Physical Thing | E53 Place | Building is located at address |
| P74 has current or former residence | E21 Person | E53 Place | Person lived at address |
| P4 has time-span | E2 Temporal Entity | E52 Time-Span | When building existed, when person lived there |
| P2 has type | E1 CRM Entity | E55 Type | Classification of entities |
| P70 documents | E31 Document | E1 CRM Entity | Map documents a place |

### Extended Classes (CRMsci, CRMba, CRMgeo)

ARCHES can use extensions to CIDOC-CRM for specific domains:

- **CRMgeo**: Extensions for geographic information, linking to GeoSPARQL for spatial queries
- **CRMba**: Extensions for buildings and architecture, providing detailed modeling of structures

---

## 7. Data Modeling for SHOC

### 7.1 Resource Models

ARCHES uses "Resource Models" to define the structure of entities. Each model is based on CIDOC-CRM classes but can be customized with additional attributes.

#### Historic Structure Resource Model

Based on E18 Physical Thing with extensions:

**Nodes (Fields)**:
- Name/Title (E35 Title via P1)
- Original Address Number
- Original Address Street
- Current Address Number
- Current Address Street
- Original Municipality
- Current Municipality
- Primary Material (E57 Material via P45)
- Additional Materials (E57 Material via P45)
- Primary Function (E55 Type via P2)
- Secondary Function (E55 Type via P2)
- Maximum Stories (integer)
- Description (E62 String via P3)
- Location (E53 Place with geometry via P53)
- Time-Span (E52 Time-Span via P4)
  - Source Year
  - Source Document (E31 Document via P70i)

**Branches** (nested structures):
- Related People (reverse of P74 from Person model)
- Source Documents (E31 Document)

#### Historic Person Resource Model

Based on E21 Person:

**Nodes**:
- Salutation
- Given Name (E35 Appellation via P131)
- Surname (E35 Appellation via P131)
- Name as Given (for non-standard names)
- Occupation Title (E55 Type via P2)
- Business Name
- Office/Business Address (E53 Place via P74)
- Residence Address (E53 Place via P74)
- Other Description
- Boards or Owns (E55 Type via P2)
- Person of Color Flag (boolean)
- Location (E53 Place with geometry)

**Branches**:
- Related Structures (E18 Physical Thing via P53i)
- Source Documents

#### Historic Map Resource Model

Based on E31 Document:

**Nodes**:
- Title (E35 Title via P1)
- Map Year (E52 Time-Span via P4)
- Map Day
- Map Month
- Cartographer (E21 Person via P14)
- Map Author (E21 Person via P14)
- Publisher
- Source Caption
- Source Type (E55 Type via P2)
- Original Repository
- Repository URL
- Service URL
- Coverage Area (E53 Place with polygon geometry)

### 7.2 Concept Schemes (Controlled Vocabularies)

ARCHES uses SKOS (Simple Knowledge Organization System) for controlled vocabularies.

**Building Material Types**:
- Brick
- Wood/Frame
- Stone
- Stucco
- Tabby
- Mixed

**Building Function Types (Primary)**:
- Residential - Single Family
- Residential - Multi-Family
- Commercial - Retail
- Commercial - Office
- Industrial
- Religious
- Educational
- Government
- Mixed Use

**Occupation Types**:
- Import from historical occupation classification systems
- Create hierarchical thesaurus based on city directory categories

### 7.3 Graph Definition

The ARCHES graph structure enables flexible querying across resources.

```
Historic Structure
    |
    +-- P53 has location --> Place (Address)
    |                           |
    |                           +-- P89 falls within --> Place (Neighborhood)
    |
    +-- P45 consists of --> Material (Primary)
    +-- P45 consists of --> Material (Additional)
    +-- P2 has type --> Type (Primary Function)
    +-- P2 has type --> Type (Secondary Function)
    +-- P4 has time-span --> Time-Span (Source Year)
    |
    +-- P70i is documented by --> Historic Map

Historic Person
    |
    +-- P74 has residence --> Place (Address)
    |                           |
    |                           +-- P53i is location of --> Historic Structure
    |
    +-- P14i was performed by --> Occupation Activity
    +-- P2 has type --> Type (Occupation Title)
```

---

## 8. Data Migration Strategy

### 8.1 Migration Phases

**Phase 1: Schema Analysis**
- Document current ArcGIS geodatabase schema
- Map each table and field to CIDOC-CRM classes and properties
- Identify data quality issues and normalization needs

**Phase 2: Data Extraction**
- Export data from ArcGIS feature services to GeoJSON or Shapefile
- Export attribute tables to CSV or JSON
- Preserve geometry in WGS84 coordinate system (EPSG:4326)

**Phase 3: Data Transformation**
- Write Python scripts to transform data to ARCHES JSON format
- Normalize controlled vocabulary values
- Create UUID identifiers for all resources
- Establish relationships between resources

**Phase 4: Data Loading**
- Use ARCHES business data import tools
- Load concept schemes first
- Load resource models
- Load resource instances
- Validate imported data

**Phase 5: Verification**
- Compare record counts between source and target
- Spot-check individual records for accuracy
- Verify spatial data displays correctly
- Test search functionality

### 8.2 Data Extraction from ArcGIS

```python
# Example Python script to export ArcGIS feature service to GeoJSON
import requests
import json

def export_feature_service(service_url, output_file, max_records=1000):
    """
    Export all features from an ArcGIS feature service.
    """
    all_features = []
    offset = 0
    
    while True:
        params = {
            'where': '1=1',
            'outFields': '*',
            'returnGeometry': True,
            'outSR': 4326,
            'f': 'geojson',
            'resultOffset': offset,
            'resultRecordCount': max_records
        }
        
        response = requests.get(f"{service_url}/query", params=params)
        data = response.json()
        
        if 'features' not in data or len(data['features']) == 0:
            break
            
        all_features.extend(data['features'])
        offset += max_records
        
        if len(data['features']) < max_records:
            break
    
    geojson = {
        'type': 'FeatureCollection',
        'features': all_features
    }
    
    with open(output_file, 'w') as f:
        json.dump(geojson, f)
    
    return len(all_features)

# Export each layer
export_feature_service(
    'https://lyre.cofc.edu/server/rest/services/shoc/places/FeatureServer/0',
    'places.geojson'
)

export_feature_service(
    'https://lyre.cofc.edu/server/rest/services/shoc/DBO_people_cd1888/FeatureServer/64',
    'people.geojson'
)
```

### 8.3 Data Transformation to ARCHES Format

```python
# Example transformation script for places data
import json
import uuid

def transform_place_to_arches(feature):
    """
    Transform a GeoJSON feature from ArcGIS to ARCHES resource format.
    """
    props = feature['properties']
    geom = feature['geometry']
    
    # Generate deterministic UUID based on source ID
    resource_id = str(uuid.uuid5(uuid.NAMESPACE_URL, 
        f"shoc:place:{props.get('place_ID', props.get('OBJECTID'))}"))
    
    arches_resource = {
        'resourceinstanceid': resource_id,
        'graph': 'Historic Structure',  # Resource model name
        'tiles': []
    }
    
    # Address tile
    address_tile = {
        'nodegroup_id': 'address-nodegroup-uuid',
        'data': {
            'original_address_number': props.get('orig_address_no'),
            'original_address_street': props.get('orig_address_street'),
            'current_address_number': props.get('curr_address_no'),
            'current_address_street': props.get('curr_address_street'),
            'original_municipality': props.get('orig_city'),
            'current_municipality': props.get('curr_city')
        }
    }
    arches_resource['tiles'].append(address_tile)
    
    # Materials tile
    materials_tile = {
        'nodegroup_id': 'materials-nodegroup-uuid',
        'data': {
            'primary_material': props.get('prime_material'),
            'additional_materials': props.get('add_material')
        }
    }
    arches_resource['tiles'].append(materials_tile)
    
    # Function tile
    function_tile = {
        'nodegroup_id': 'function-nodegroup-uuid',
        'data': {
            'primary_function': props.get('function_prime'),
            'secondary_function': props.get('function_second')
        }
    }
    arches_resource['tiles'].append(function_tile)
    
    # Geometry tile
    if geom:
        geometry_tile = {
            'nodegroup_id': 'location-nodegroup-uuid',
            'data': {
                'geometry': geom
            }
        }
        arches_resource['tiles'].append(geometry_tile)
    
    # Time-span tile
    time_tile = {
        'nodegroup_id': 'timespan-nodegroup-uuid',
        'data': {
            'source_year': props.get('source_year'),
            'source_document': props.get('place_source')
        }
    }
    arches_resource['tiles'].append(time_tile)
    
    return arches_resource

# Process all features
with open('places.geojson', 'r') as f:
    geojson = json.load(f)

arches_resources = []
for feature in geojson['features']:
    arches_resource = transform_place_to_arches(feature)
    arches_resources.append(arches_resource)

with open('places_arches.json', 'w') as f:
    json.dump(arches_resources, f, indent=2)
```

### 8.4 Loading Data into ARCHES

```bash
# Activate ARCHES environment
cd /home/arches/projects/shoc
source ../arches_env/bin/activate

# Load concept schemes (controlled vocabularies)
python manage.py packages -o load_concept_scheme -s /path/to/building_materials.skos

# Load resource model graphs
python manage.py packages -o load_graphs -s /path/to/historic_structure_graph.json

# Load business data (resources)
python manage.py packages -o import_business_data -s /path/to/places_arches.json
python manage.py packages -o import_business_data -s /path/to/people_arches.json

# Reindex Elasticsearch
python manage.py es index_database
```

---

## 9. Customization and Theming

### 9.1 Custom Templates

ARCHES uses Django templates. Create custom templates in `/home/arches/projects/shoc/shoc/templates/`:

```html
<!-- shoc/templates/base.htm -->
{% extends "base.htm" %}

{% block title %}Spatial History of Charleston{% endblock %}

{% block css %}
{{ block.super }}
<link rel="stylesheet" href="{% static 'css/shoc-custom.css' %}" />
{% endblock %}
```

### 9.2 Custom CSS

Create `/home/arches/projects/shoc/shoc/media/css/shoc-custom.css`:

```css
:root {
    --primary-color: #792530;
    --secondary-color: #ffffff;
    --tertiary-color: #efbb3c;
}

.arches-header {
    background-color: var(--primary-color);
}

.map-widget .maplibregl-canvas-container {
    cursor: crosshair;
}
```

### 9.3 Custom Map Layers

Configure historic map tile layers in ARCHES map settings:

```python
# In settings.py
MAP_LAYER_TYPES = {
    'historic_maps': {
        'name': 'Historic Maps',
        'icon': 'fa-map',
        'layers': [
            {
                'id': '1872_map',
                'name': '1872 Charleston Map',
                'tiles': ['https://lyre.cofc.edu/server/rest/services/.../MapServer/tile/{z}/{y}/{x}'],
                'type': 'raster'
            }
        ]
    }
}
```

---

## 10. Integration with Existing Systems

### 10.1 ArcGIS Integration

During the transition, both systems can run in parallel:

- ARCHES serves as the primary data management interface
- ArcGIS Server continues to serve tile layers for historic maps
- A synchronization script updates ArcGIS feature services from ARCHES data

### 10.2 Current Web Application

The existing SHOC web application can be gradually transitioned:

1. **Phase 1**: Point the frontend to ARCHES REST API for data queries while keeping the ArcGIS map tiles
2. **Phase 2**: Replace ArcGIS map component with ARCHES built-in map or Mapbox GL JS
3. **Phase 3**: Integrate ARCHES search widgets and resource reports

### 10.3 API Endpoints

ARCHES provides REST API endpoints:

- `/api/resources/` - List and create resources
- `/api/resources/{uuid}/` - Get, update, delete specific resource
- `/api/search/` - Search across all resources
- `/api/concepts/` - Access controlled vocabularies

---

## 11. Timeline and Milestones

### Phase 1: Infrastructure Setup (Weeks 1-2)
- Provision virtual machine
- Install Ubuntu Server and configure security
- Install PostgreSQL/PostGIS and Elasticsearch
- Complete ARCHES installation and basic configuration

### Phase 2: Data Modeling (Weeks 3-4)
- Define resource models for structures, people, and maps
- Create controlled vocabulary (concept schemes)
- Configure graph relationships
- Test with sample data

### Phase 3: Data Migration (Weeks 5-8)
- Extract data from ArcGIS
- Transform to ARCHES format
- Load and validate data
- Resolve data quality issues

### Phase 4: Customization (Weeks 9-10)
- Create SHOC branding and templates
- Configure map layers
- Customize search and reports
- Integrate historic map tiles

### Phase 5: Testing and Launch (Weeks 11-12)
- User acceptance testing
- Performance optimization
- Documentation and training
- Production deployment

---

## 12. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Low | High | Multiple backups, staged migration, validation scripts |
| Performance issues with large dataset | Medium | Medium | Index optimization, query tuning, caching |
| Learning curve for ARCHES administration | High | Medium | Training, documentation, community support |
| Integration challenges with ArcGIS tiles | Low | Medium | Tiles are independent; can use direct tile URLs |
| CIDOC-CRM modeling complexity | Medium | Medium | Start with simpler models, iterate based on needs |
| Server infrastructure costs | Low | Low | Can run on existing virtualization infrastructure |

---

## Appendix A: Useful Resources

- ARCHES Documentation: https://arches.readthedocs.io/
- ARCHES Community Forum: https://community.archesproject.org/
- CIDOC-CRM Specification: https://cidoc-crm.org/
- Getty Vocabulary Program: https://www.getty.edu/research/tools/vocabularies/
- PostGIS Documentation: https://postgis.net/documentation/
- Elasticsearch Guide: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
