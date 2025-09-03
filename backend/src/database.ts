import Database from 'better-sqlite3';
const db = new Database('rooms.db');

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT,
    teamSize INTEGER,
    leftPlayers INTEGER,
    rightPlayers INTEGER,
    gameStarted INTEGER
  )
`).run();

export default db;