import Database from "better-sqlite3";

const db = new Database("app.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

export default db;
