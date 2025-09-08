import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Resolve path to data/app.db relative to project root
const dataDir = path.resolve("./data");
const dbPath = path.join(dataDir, "app.db");

// Ensure the directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created directory: ${dataDir}`);
}

// Open or create database file
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE
  )
`);

export default db;
