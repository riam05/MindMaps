# Claude-Powered PDF → Knowledge Graph Builder

## Setup SQLite Database

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npm run setup-db
   ```

This will:
- Create a `data/` directory
- Create `knowledge_graph.db` SQLite database
- Set up the `nodes` and `edges` tables
- Create indexes for better query performance

## Database Schema

### Nodes Table
- `id` (INTEGER, PRIMARY KEY)
- `name` (TEXT, NOT NULL) - The concept/entity name
- `type` (TEXT) - Optional type/category
- `created_at` (DATETIME) - Timestamp

### Edges Table
- `id` (INTEGER, PRIMARY KEY)
- `src_id` (INTEGER, NOT NULL) - Source node ID
- `relation` (TEXT, NOT NULL) - Relationship type
- `dst_id` (INTEGER, NOT NULL) - Destination node ID
- `evidence` (TEXT) - Optional evidence/context from PDF
- `created_at` (DATETIME) - Timestamp

## Usage

The `db.js` file provides a Database class with methods for:
- Creating and querying nodes
- Creating and querying edges
- Getting the full graph for visualization

Example:
```javascript
const Database = require('./db');

const db = new Database();
await db.connect();

// Create a node
const node = await db.createNode('Machine Learning', 'concept');

// Create an edge
const edge = await db.createEdge(1, 'relates_to', 2, 'From page 5');

// Get full graph
const graph = await db.getFullGraph();

await db.close();
```

