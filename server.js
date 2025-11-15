const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database connection
const db = new Database();

// API Routes

// Get full graph data
app.get('/api/graph', async (req, res) => {
  try {
    await db.connect();
    const graph = await db.getFullGraph();
    
    // Transform data for react-force-graph format
    const nodes = graph.nodes.map(node => ({
      id: node.id.toString(),
      name: node.name,
      type: node.type || 'concept'
    }));
    
    const links = graph.edges.map(edge => ({
      source: edge.src_id.toString(),
      target: edge.dst_id.toString(),
      relation: edge.relation,
      evidence: edge.evidence || ''
    }));
    
    await db.close();
    
    res.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching graph:', error);
    res.status(500).json({ error: 'Failed to fetch graph data' });
  }
});

// Get all nodes
app.get('/api/nodes', async (req, res) => {
  try {
    await db.connect();
    const nodes = await db.getAllNodes();
    await db.close();
    res.json(nodes);
  } catch (error) {
    console.error('Error fetching nodes:', error);
    res.status(500).json({ error: 'Failed to fetch nodes' });
  }
});

// Get all edges
app.get('/api/edges', async (req, res) => {
  try {
    await db.connect();
    const edges = await db.getAllEdges();
    await db.close();
    res.json(edges);
  } catch (error) {
    console.error('Error fetching edges:', error);
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Graph API: http://localhost:${PORT}/api/graph`);
});

