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
      type: node.type || 'concept',
      description: node.description || null
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

// Delete a node
app.delete('/api/nodes/:id', async (req, res) => {
  try {
    const nodeId = parseInt(req.params.id);
    
    if (isNaN(nodeId)) {
      return res.status(400).json({ error: 'Invalid node ID' });
    }

    await db.connect();
    await db.deleteNode(nodeId);
    await db.close();

    res.json({ 
      success: true, 
      message: `Node ${nodeId} and its edges deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: 'Failed to delete node', details: error.message });
  }
});

// Generate edges and descriptions using Ollama
app.post('/api/generate-topic', async (req, res) => {
  try {
    const { topic, description } = req.body;

    if (!topic && !description) {
      return res.status(400).json({ error: 'Topic or description is required' });
    }

    const inputText = description || topic;
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2:7b';

    // Call Ollama API to generate edges and descriptions
    const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'user',
            content: `Given the topic/description: "${inputText}"

Generate a knowledge graph structure with:
1. Related concepts (nodes) that connect to this topic
2. Relationships (edges) between the topic and these concepts
3. Brief descriptions for each concept

Return ONLY a valid JSON object with this exact structure:
{
  "topic": "the main topic name",
  "description": "a brief description of the topic",
  "edges": [
    {
      "source": "Topic Name",
      "relation": "relationship type (e.g., uses, includes, relates_to, part_of, depends_on)",
      "target": "Related Concept Name",
      "description": "brief description of how they relate"
    }
  ],
  "concepts": [
    {
      "name": "Concept Name",
      "description": "brief description of this concept",
      "type": "concept|algorithm|method|technology|field"
    }
  ]
}

Rules:
- Generate relevant edges connecting the topic to related concepts
- Include clear relationship types
- Provide concise descriptions
- Return ONLY the JSON, no markdown or code blocks`
          }
        ],
        stream: false
      })
    });

    if (!ollamaResponse.ok) {
      const errorText = await ollamaResponse.text();
      console.error('Ollama API error:', errorText);
      
      // Parse error to provide better messages
      let errorMessage = 'Failed to connect to Ollama';
      let errorDetails = errorText;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.includes('not found')) {
          errorMessage = `Model "${OLLAMA_MODEL}" not found`;
          errorDetails = `Please install the model with: ollama pull ${OLLAMA_MODEL}`;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch (e) {
        // Not JSON, use as-is
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details: errorDetails 
      });
    }

    const ollamaData = await ollamaResponse.json();
    const content = ollamaData.message?.content || ollamaData.response || ollamaData.text || '';

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content.trim();
      result = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse Ollama response:', content);
      return res.status(500).json({ 
        error: 'Failed to parse response from Ollama',
        raw_response: content.substring(0, 500)
      });
    }

    // Save to database
    await db.connect();
    
    try {
      const savedNodes = [];
      const savedEdges = [];
      
      // Create or get the main topic node
      const topicName = result.topic || inputText;
      let topicNode = await db.getNodeByName(topicName);
      if (!topicNode) {
        topicNode = await db.createNode(topicName, 'concept', result.description || '');
        savedNodes.push(topicNode);
      } else {
        // Update description if it exists and node doesn't have one
        if (result.description && !topicNode.description) {
          // Note: We'd need an updateNode method for this, but for now we'll just use existing node
        }
      }
      
      // Only create edges from the topic node to existing nodes
      const conceptMap = new Map(); // name -> node
      conceptMap.set(topicName, topicNode);
      
      // Create edges - only connect to existing nodes in database
      if (result.edges && result.edges.length > 0) {
        // Collect all unique node names from edges (targets only)
        const targetNodeNames = new Set();
        for (const edge of result.edges) {
          // Only process edges where source is the topic
          if (edge.source === topicName || edge.source === result.topic) {
            targetNodeNames.add(edge.target);
          }
        }
        
        // Check database for target nodes - only use existing nodes
        for (const nodeName of targetNodeNames) {
          let existingNode = await db.getNodeByName(nodeName);
          if (existingNode) {
            conceptMap.set(nodeName, existingNode);
          }
          // Skip if node doesn't exist - we only connect to existing nodes
        }
        
        // Now create edges - only from topic to existing nodes
        for (const edge of result.edges) {
          // Only create edges where source is the topic and target exists
          const isTopicSource = edge.source === topicName || edge.source === result.topic;
          const srcNode = isTopicSource ? topicNode : conceptMap.get(edge.source);
          const dstNode = conceptMap.get(edge.target);
          
          // Only create edge if source is topic and target exists in database
          if (isTopicSource && srcNode && dstNode) {
            // Check if edge already exists (check both directions since graph is undirected)
            const existingEdges = await db.getEdgesByNodeId(srcNode.id);
            const edgeExists = existingEdges.some(e => 
              (e.src_id === srcNode.id && e.dst_id === dstNode.id) ||
              (e.src_id === dstNode.id && e.dst_id === srcNode.id)
            );
            
            if (!edgeExists) {
              const newEdge = await db.createEdge(
                srcNode.id,
                edge.relation,
                dstNode.id,
                edge.description || null
              );
              savedEdges.push(newEdge);
            }
          }
        }
      }
      
      await db.close();
      
      // Return the generated and saved data
      res.json({
        success: true,
        topic: topicName,
        description: result.description || '',
        edges: result.edges || [],
        concepts: result.concepts || [],
        saved: {
          nodes: savedNodes.length,
          edges: savedEdges.length
        },
        message: `Added ${savedNodes.length} new nodes and ${savedEdges.length} new edges to the graph`
      });
      
    } catch (dbError) {
      await db.close();
      console.error('Error saving to database:', dbError);
      // Still return the generated data even if saving fails
      res.json({
        success: true,
        topic: result.topic || inputText,
        description: result.description || '',
        edges: result.edges || [],
        concepts: result.concepts || [],
        warning: 'Generated successfully but failed to save to database'
      });
    }

  } catch (error) {
    console.error('Error generating topic:', error);
    
    // Handle connection errors specifically
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED') || error.cause?.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        error: 'Cannot connect to Ollama. Make sure Ollama is running.',
        details: `Ollama is not running on ${OLLAMA_URL}. Start it with: ollama serve`
      });
    }
    
    res.status(500).json({ error: 'Failed to generate topic', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Graph API: http://localhost:${PORT}/api/graph`);
  console.log(`🧠 Topic Generation: http://localhost:${PORT}/api/generate-topic`);
  console.log(`\n💡 Make sure Ollama is running: ollama serve`);
});

