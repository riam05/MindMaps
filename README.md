# PDF → Knowledge Graph Builder

An interactive web application that transforms documents into visual knowledge graphs. Extract concepts and relationships from text using AI (Ollama), store them in SQLite, and visualize them with an interactive force-directed graph.

## Quick Start

### Prerequisites

- Node.js (v18+)
- Ollama (for AI topic generation - optional)

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   ```bash
   npm run setup-db
   ```

3. **(Optional) Seed with sample data:**
   ```bash
   npm run seed-data
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Open your browser:**
   ```
   http://localhost:3001
   ```

### Using Ollama (Optional)

To enable AI-powered topic generation:

1. **Install Ollama**: [ollama.ai](https://ollama.ai)

2. **Start Ollama server:**
   ```bash
   ollama serve
   ```

3. **Install a model:**
   ```bash
   ollama pull llama2:7b
   ```

4. **Configure model (optional):**
   Create a `.env` file:
   ```
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=llama2:7b
   ```

## Database Schema

### Nodes Table
- `id` (INTEGER, PRIMARY KEY) - Unique identifier
- `name` (TEXT, NOT NULL) - Concept/entity name
- `type` (TEXT) - Node type (concept, algorithm, architecture, field, etc.)
- `description` (TEXT) - Detailed description of the concept

### Edges Table
- `id` (INTEGER, PRIMARY KEY) - Unique identifier
- `src_id` (INTEGER, NOT NULL) - Source node ID (foreign key)
- `relation` (TEXT, NOT NULL) - Relationship type (e.g., "uses", "includes", "depends_on")
- `dst_id` (INTEGER, NOT NULL) - Destination node ID (foreign key)
- `evidence` (TEXT) - Optional evidence/context supporting the relationship

## Usage

### Visualizing the Graph

1. Open `http://localhost:3001` in your browser
2. The graph automatically loads from the database
3. **Interact with nodes:**
   - Click any node to see its description and connections
   - Drag nodes to reposition them
   - Zoom with mouse wheel
   - Pan by dragging the background

### Generating New Topics

1. Type a topic or description in the input box (top-left)
2. Click "Generate Edges & Descriptions" or press `Ctrl+Enter` (Mac: `Cmd+Enter`)
3. Ollama will generate related concepts and relationships
4. Review the generated edges and concepts in the panel

### API Endpoints

#### `GET /api/graph`
Returns the full graph data for visualization.

**Response:**
```json
{
  "nodes": [
    {
      "id": "1",
      "name": "Machine Learning",
      "type": "concept",
      "description": "A method of data analysis..."
    }
  ],
  "links": [
    {
      "source": "1",
      "target": "2",
      "relation": "includes",
      "evidence": "Neural networks are a subset..."
    }
  ]
}
```

#### `GET /api/nodes`
Returns all nodes in the database.

#### `GET /api/edges`
Returns all edges in the database.

#### `POST /api/generate-topic`
Generates nodes and edges for a topic using Ollama.

**Request:**
```json
{
  "description": "Machine Learning"
}
```

**Response:**
```json
{
  "success": true,
  "topic": "Machine Learning",
  "description": "A brief description...",
  "edges": [...],
  "concepts": [...]
}
```

#### `GET /api/health`
Health check endpoint.

## Project Structure

```
CMU-Claude-Builder/
├── data/
│   └── knowledge_graph.db    # SQLite database
├── public/
│   └── index.html            # Frontend visualization
├── scripts/
│   ├── setup-db.js          # Database initialization
│   └── seed-data.js          # Sample data seeding
├── db.js                     # Database helper class
├── server.js                 # Express server & API
├── package.json
└── README.md
```

## Development

### Available Scripts

- `npm start` - Start the server
- `npm run setup-db` - Initialize/create database tables
- `npm run seed-data` - Clear and seed database with sample data

### Database Operations

The `db.js` file provides a `Database` class with methods:

```javascript
const Database = require('./db');

const db = new Database();
await db.connect();

// Create a node with description
const node = await db.createNode('Machine Learning', 'concept', 'Description here');

// Create an edge
const edge = await db.createEdge(1, 'relates_to', 2, 'Evidence text');

// Get full graph
const graph = await db.getFullGraph();

// Clear all data
await db.clearAll();

await db.close();
```

## Features Explained

### Force-Directed Graph
- Nodes are positioned using a physics simulation
- More connected nodes appear larger and more central
- Clusters form naturally based on relationships

### Node Types & Colors
- **concept** - Blue (#60a5fa)
- **algorithm** - Green (#34d399)
- **architecture** - Pink (#f472b6)
- **field** - Yellow (#fbbf24)

### Centrality Visualization
Node size is calculated based on the number of connections:
- More connections = larger node
- Helps identify key concepts in the knowledge graph

## Configuration

### Environment Variables

Create a `.env` file (optional):

```
PORT=3001
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama2:7b
```

## License

MIT
