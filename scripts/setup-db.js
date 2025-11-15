const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'knowledge_graph.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
  // Nodes table
  db.run(`
    CREATE TABLE IF NOT EXISTS nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT,
      description TEXT
    )
  `, (err) => {
    if (err) {
      console.error('Error creating nodes table:', err.message);
    } else {
      console.log('✓ Nodes table created/verified');
    }
  });

  // Add description column to existing tables (migration)
  db.run(`
    ALTER TABLE nodes ADD COLUMN description TEXT
  `, (err) => {
    // Ignore error if column already exists
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding description column:', err.message);
    } else if (!err) {
      console.log('✓ Added description column to nodes table');
    }
  });

  // Edges table
  db.run(`
    CREATE TABLE IF NOT EXISTS edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      src_id INTEGER NOT NULL,
      relation TEXT NOT NULL,
      dst_id INTEGER NOT NULL,
      evidence TEXT,
      FOREIGN KEY (src_id) REFERENCES nodes(id),
      FOREIGN KEY (dst_id) REFERENCES nodes(id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating edges table:', err.message);
    } else {
      console.log('✓ Edges table created/verified');
    }
  });

  // Create indexes for better query performance
  db.run(`CREATE INDEX IF NOT EXISTS idx_nodes_name ON nodes(name)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src_id)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.run(`CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst_id)`, (err) => {
    if (err) console.error('Error creating index:', err.message);
  });

  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('\nDatabase setup complete!');
      console.log(`Database location: ${dbPath}`);
    }
  });
});

