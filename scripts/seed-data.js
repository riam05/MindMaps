const Database = require('../db');

async function seedData() {
  const db = new Database();
  
  try {
    await db.connect();
    console.log('Connected to database. Seeding fake data...\n');

    // Create nodes (concepts)
    console.log('Creating nodes...');
    const node1 = await db.createNode('Machine Learning', 'concept');
    const node2 = await db.createNode('Neural Networks', 'concept');
    const node3 = await db.createNode('Deep Learning', 'concept');
    const node4 = await db.createNode('Backpropagation', 'algorithm');
    const node5 = await db.createNode('Gradient Descent', 'algorithm');
    const node6 = await db.createNode('Transformer', 'architecture');
    const node7 = await db.createNode('Attention Mechanism', 'concept');
    const node8 = await db.createNode('Natural Language Processing', 'field');
    const node9 = await db.createNode('Computer Vision', 'field');
    const node10 = await db.createNode('Convolutional Neural Network', 'architecture');
    
    console.log(`✓ Created ${10} nodes\n`);

    // Create edges (relationships)
    console.log('Creating edges...');
    
    // Machine Learning relationships
    await db.createEdge(node1.id, 'includes', node2.id, 'Neural networks are a subset of machine learning');
    await db.createEdge(node1.id, 'includes', node3.id, 'Deep learning is a branch of machine learning');
    await db.createEdge(node1.id, 'uses', node5.id, 'Machine learning algorithms use gradient descent');
    
    // Neural Network relationships
    await db.createEdge(node2.id, 'is_type_of', node3.id, 'Neural networks are the foundation of deep learning');
    await db.createEdge(node2.id, 'uses', node4.id, 'Neural networks train using backpropagation');
    await db.createEdge(node2.id, 'uses', node5.id, 'Neural networks optimize with gradient descent');
    
    // Deep Learning relationships
    await db.createEdge(node3.id, 'includes', node6.id, 'Transformers are a deep learning architecture');
    await db.createEdge(node3.id, 'includes', node10.id, 'CNNs are a type of deep learning model');
    await db.createEdge(node3.id, 'applies_to', node8.id, 'Deep learning is used in NLP');
    await db.createEdge(node3.id, 'applies_to', node9.id, 'Deep learning is used in computer vision');
    
    // Transformer relationships
    await db.createEdge(node6.id, 'uses', node7.id, 'Transformers rely on attention mechanisms');
    await db.createEdge(node6.id, 'applies_to', node8.id, 'Transformers revolutionized NLP');
    
    // Attention Mechanism relationships
    await db.createEdge(node7.id, 'enables', node6.id, 'Attention allows transformers to process sequences');
    
    // Backpropagation relationships
    await db.createEdge(node4.id, 'uses', node5.id, 'Backpropagation computes gradients for gradient descent');
    
    // CNN relationships
    await db.createEdge(node10.id, 'applies_to', node9.id, 'CNNs are primarily used in computer vision');
    await db.createEdge(node10.id, 'is_type_of', node2.id, 'CNNs are a type of neural network');
    
    // NLP relationships
    await db.createEdge(node8.id, 'uses', node6.id, 'NLP heavily uses transformer models');
    
    console.log(`✓ Created ${15} edges\n`);

    // Display summary
    const graph = await db.getFullGraph();
    console.log('📊 Database Summary:');
    console.log(`   Nodes: ${graph.nodes.length}`);
    console.log(`   Edges: ${graph.edges.length}`);
    console.log('\n✅ Fake data seeded successfully!');
    
    // Show a few sample relationships
    console.log('\n📝 Sample relationships:');
    const sampleEdges = graph.edges.slice(0, 5);
    sampleEdges.forEach(edge => {
      console.log(`   "${edge.src_name}" --[${edge.relation}]--> "${edge.dst_name}"`);
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run the seed function
seedData();

