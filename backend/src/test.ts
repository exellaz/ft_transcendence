// test-direct.ts
import Database from "better-sqlite3";

const db = new Database("game.db");

try {
  const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("Tables:", rows);
} catch (err) {
  console.error("Direct DB error:", err);
}
