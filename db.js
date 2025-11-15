const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'knowledge_graph.db');

// Promisify database operations for easier async/await usage
class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Node operations
  async createNode(name, type = null) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO nodes (name, type) VALUES (?, ?)`;
      this.db.run(sql, [name, type], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, name, type });
      });
    });
  }

  async getNodeById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM nodes WHERE id = ?`;
      this.db.get(sql, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getNodeByName(name) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM nodes WHERE name = ?`;
      this.db.get(sql, [name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getAllNodes() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM nodes`;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Edge operations
  async createEdge(srcId, relation, dstId, evidence = null) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO edges (src_id, relation, dst_id, evidence) VALUES (?, ?, ?, ?)`;
      this.db.run(sql, [srcId, relation, dstId, evidence], function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, src_id: srcId, relation, dst_id: dstId, evidence });
      });
    });
  }

  async getEdgesByNodeId(nodeId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, 
               src.name as src_name, 
               dst.name as dst_name 
        FROM edges e
        JOIN nodes src ON e.src_id = src.id
        JOIN nodes dst ON e.dst_id = dst.id
        WHERE e.src_id = ? OR e.dst_id = ?
      `;
      this.db.all(sql, [nodeId, nodeId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getAllEdges() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT e.*, 
               src.name as src_name, 
               dst.name as dst_name 
        FROM edges e
        JOIN nodes src ON e.src_id = src.id
        JOIN nodes dst ON e.dst_id = dst.id
      `;
      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Get full graph for visualization
  async getFullGraph() {
    return new Promise(async (resolve, reject) => {
      try {
        const nodes = await this.getAllNodes();
        const edges = await this.getAllEdges();
        resolve({ nodes, edges });
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = Database;

