import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../queue.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('✓ Connected to SQLite database');
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async initialize() {
    try {
      // Services table
      await this.run(`
        CREATE TABLE IF NOT EXISTS services (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          booths INTEGER DEFAULT 1,
          avg_service_time INTEGER DEFAULT 300,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Service booths table
      await this.run(`
        CREATE TABLE IF NOT EXISTS service_booths (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          booth_number INTEGER,
          status TEXT DEFAULT 'available',
          current_user_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      // Analytics table - track queue events
await this.run(`
  CREATE TABLE IF NOT EXISTS queue_analytics (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    event_type TEXT,
    queue_length INTEGER,
    avg_wait_time INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  )
`);

// Service statistics - daily summary
await this.run(`
  CREATE TABLE IF NOT EXISTS service_stats (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL,
    date TEXT,
    total_served INTEGER DEFAULT 0,
    avg_wait_time INTEGER DEFAULT 0,
    peak_queue_length INTEGER DEFAULT 0,
    peak_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  )
`);

// Admin users - for authentication
await this.run(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'staff',
    service_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(service_id) REFERENCES services(id)
  )
`);

console.log('✓ Analytics tables created');

      // Queue entries table
      await this.run(`
        CREATE TABLE IF NOT EXISTS queue_entries (
          id TEXT PRIMARY KEY,
          service_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          position INTEGER NOT NULL,
          status TEXT DEFAULT 'waiting',
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          served_at DATETIME,
          FOREIGN KEY(service_id) REFERENCES services(id)
        )
      `);

      console.log('✓ Database tables initialized');
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  }
}

export default new Database();