# Spatial History of Charleston (SHOC) - Student Project Opportunity

## What is SHOC?

The Spatial History of Charleston is an interactive web application that brings Charleston's history to life through maps. Users can explore historic maps dating back to 1670, browse historical buildings and structures, and search for people listed in 19th-century city directories, all overlaid on a modern map of Charleston.

This is a real project used by researchers, historians, and the public to explore how Charleston has changed over nearly 300 years. It is developed at the College of Charleston in collaboration with the CHiL (Computing and Humanities in Life) research group.

---

## The Big Picture

SHOC currently works as a single-page web application powered by ArcGIS mapping services and a relational database. The long-term vision for this project involves three major phases:

### Phase 1: Optimize the Current Application

The existing app is functional but has performance bottlenecks. There are immediate improvements to be made in how the frontend queries the database, how data is cached, and how map layers are managed. This phase is ideal for students who want to sharpen their JavaScript skills and learn about working with geospatial APIs.

**Skills you will use and develop:**
- JavaScript (ES modules, async/await, Promises)
- Web APIs and REST services
- ArcGIS Maps SDK for JavaScript
- HTML/CSS and responsive design
- Performance profiling and optimization
- Git version control in a team environment

### Phase 2: Migrate to ARCHES (Getty Conservation Institute Platform)

The project plans to move to ARCHES, an open-source platform built specifically for cultural heritage data management. ARCHES is built on Python/Django and uses PostgreSQL with PostGIS for spatial data. It follows the CIDOC Conceptual Reference Model (CRM), an international standard for describing cultural heritage information.

This phase involves setting up a Linux server environment, configuring databases, designing data models based on an established ontology, and writing data migration scripts.

**Skills you will use and develop:**
- Python and Django web framework
- PostgreSQL and PostGIS (spatial databases)
- Ubuntu Server administration
- Elasticsearch for search and indexing
- Data modeling with ontologies (CIDOC-CRM)
- ETL (Extract, Transform, Load) scripting
- Server deployment (Nginx, Gunicorn)

### Phase 3: Move to RDF Graph Database with AI Integration

The most ambitious phase involves transitioning the data layer from a relational database to a graph-based RDF (Resource Description Framework) structure. RDF represents data as a network of interconnected facts rather than rows in tables, which is a natural fit for historical data where everything is related to everything else.

On top of this graph structure, the project plans to integrate AI capabilities so that users can ask natural language questions like "Show me all brick buildings on King Street before 1850" and get back actual map results. The system would use a large language model to translate English questions into SPARQL (the graph query language) and then render the results on the map.

**Skills you will use and develop:**
- RDF, SPARQL, and semantic web technologies
- Knowledge graph design and ontology engineering
- Triple store databases (Apache Jena, GraphDB)
- Large language model (LLM) integration
- Natural language processing for query translation
- Python (FastAPI, rdflib)
- Linked Open Data standards

---

## What Makes This Project Different

### Real-World Impact

This is not a classroom exercise. Your work will be used by researchers, historians, and the Charleston community. The data represents real places and real people from Charleston's history.

### Full-Stack Experience

Depending on which phase you join, you could work on frontend JavaScript, backend Python, database design, server administration, or AI integration. Very few student projects offer this range.

### Emerging Technologies

RDF, knowledge graphs, and AI-powered querying are at the forefront of how data will be structured and accessed in the future. Experience with these technologies is highly valuable in industry and graduate school.

### Published Research Potential

Work on SHOC can lead to co-authored papers or conference presentations, particularly around the AI querying integration and the cultural heritage data modeling.

### Collaborative Development

You will work with a team using Git, pull requests, and code reviews, mirroring how professional software teams operate.

---

## Roles Available

### Frontend Developer

Work on the web interface that users interact with. Improve the map experience, add new search features, optimize performance, and build new UI components.

**Prerequisites:** Comfort with JavaScript. Experience with HTML/CSS. Willingness to learn the ArcGIS SDK.

### Backend Developer

Build the server-side infrastructure. Set up the ARCHES platform, write data migration scripts, design database schemas, and build REST APIs.

**Prerequisites:** Some Python experience. Interest in databases and server-side development.

### Data Engineer

Design the RDF ontology, transform relational data into graph structures, and set up the triple store. This role bridges computer science and information science.

**Prerequisites:** Interest in data modeling. Some programming experience in any language. Willingness to learn RDF and SPARQL.

### AI/ML Developer

Build the natural language querying system. Train or fine-tune language models to translate English questions into SPARQL queries. Design the prompt engineering pipeline and evaluate query accuracy.

**Prerequisites:** Familiarity with Python. Interest in AI/ML. Some exposure to APIs or language models is helpful but not required.

---

## What You Will Learn

No matter which role you take, you will gain experience with:

- Working on a real codebase with real users
- Version control with Git and GitHub in a collaborative setting
- Reading and writing technical documentation
- Debugging and troubleshooting in a production environment
- Communicating technical decisions to a team
- Geospatial data concepts and mapping technologies

---

## How to Get Involved

If you are interested in contributing to SHOC, reach out to the project team. We welcome students at all levels, from sophomores looking for their first project experience to seniors looking for capstone material. Graduate students interested in digital humanities or GIS research are also encouraged to apply.

**Contact:** [Project Lead Contact Information]

**Repository:** [GitHub Repository URL]

**Time Commitment:** Flexible. We work in sprints and can accommodate varying schedules. Minimum recommended commitment is 5-8 hours per week.

---

## Technology Summary

| Layer | Current | Planned |
|-------|---------|---------|
| Frontend | HTML, CSS, JavaScript, ArcGIS SDK, Bootstrap | Same, with potential React migration |
| Backend | ArcGIS Server (Feature Services) | ARCHES (Python/Django) |
| Database | Relational (via ArcGIS) | PostgreSQL/PostGIS, then RDF Triple Store |
| Search | SQL queries through ArcGIS REST API | Elasticsearch, then SPARQL |
| AI | None | LLM-powered natural language to SPARQL |
| Mapping | ArcGIS Maps SDK for JavaScript | ArcGIS or Mapbox GL JS via ARCHES |
| Hosting | College of Charleston server | Ubuntu VM (on-premises or cloud) |
