# Graph Report - D:\Proyectos\DisplayEvent  (2026-08-08)

## Corpus Check
- Corpus is ~8,909 words - fits in a single context window. You may not need a graph.

## Summary
- 137 nodes · 196 edges · 11 communities (10 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Client Core Libraries
- Server API and Routing
- Client Build Config
- React and DnD Dependencies
- Server Tooling
- Event Table Seating
- Server Dependencies
- Product Features
- Database Schema
- Database Initialization

## God Nodes (most connected - your core abstractions)
1. `api` - 8 edges
2. `DisplayEvent App` - 7 edges
3. `Button()` - 6 edges
4. `Modal()` - 5 edges
5. `inputClass` - 5 edges
6. `pool` - 5 edges
7. `guests` - 5 edges
8. `scripts` - 4 edges
9. `Field()` - 4 edges
10. `scripts` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Vite HTML Shell` --references--> `React Frontend`  [INFERRED]
  client/index.html → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **DisplayEvent Features** — readme_events_feature, readme_invitados_groups_feature, readme_mesas_feature, readme_dashboard_feature [INFERRED 0.75]

## Communities (11 total, 1 thin omitted)

### Community 0 - "Client Core Libraries"
Cohesion: 0.14
Nodes (16): api, App(), emptyForm, EventFormModal(), Button(), Field(), inputClass, Modal() (+8 more)

### Community 1 - "Server API and Routing"
Cohesion: 0.17
Nodes (9): getConnectionWithReq(), pool, query(), app, PORT, router, router, router (+1 more)

### Community 2 - "Client Build Config"
Cohesion: 0.11
Nodes (17): devDependencies, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react, name, private, scripts (+9 more)

### Community 3 - "React and DnD Dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, react, react-dom, react-router-dom, @dnd-kit/core (+5 more)

### Community 4 - "Server Tooling"
Cohesion: 0.15
Nodes (12): nodemon, description, devDependencies, nodemon, main, name, scripts, dev (+4 more)

### Community 5 - "Event Table Seating"
Cohesion: 0.20
Nodes (4): PALETTE, shapeClasses(), SHAPES, TableCard()

### Community 6 - "Server Dependencies"
Cohesion: 0.18
Nodes (11): cors, dotenv, express, morgan, mysql2, dependencies, cors, dotenv (+3 more)

### Community 7 - "Product Features"
Cohesion: 0.29
Nodes (10): Vite HTML Shell, Dashboard Estadisticas, DisplayEvent App, Eventos CRUD, Express Backend, Grupos e Invitados, Organizador de Mesas, Monorepo Structure (+2 more)

### Community 8 - "Database Schema"
Cohesion: 0.90
Nodes (4): events, `groups`, guests, `tables`

## Knowledge Gaps
- **41 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `React and DnD Dependencies` to `Client Build Config`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Server Dependencies` to `Server Tooling`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client Core Libraries` be split into smaller, more focused modules?**
  _Cohesion score 0.1350806451612903 - nodes in this community are weakly interconnected._
- **Should `Client Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._