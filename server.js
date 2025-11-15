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
- Generate 3-8 relevant edges connecting the topic to related concepts
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

    // Return the generated data
    res.json({
      success: true,
      topic: result.topic || inputText,
      description: result.description || '',
      edges: result.edges || [],
      concepts: result.concepts || []
    });

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

