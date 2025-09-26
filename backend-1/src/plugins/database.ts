import Database from "better-sqlite3";
import type { Room } from "../modules/room/room.ts";

const db = new Database("room.db");

// Initialize tables if they don't exist
db.exec(`
CREATE TABLE IF NOT EXISTS matches (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	room_id TEXT NOT NULL,
	name TEXT NOT NULL,
	team_size INTEGER NOT NULL,
	winner TEXT NOT NULL,
	score_left INTEGER NOT NULL,
	score_right INTEGER NOT NULL,
	duration INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS match_players (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	match_id INTEGER NOT NULL,
	player_id TEXT NOT NULL,
	role TEXT NOT NULL,
	team TEXT NOT NULL,
	FOREIGN KEY(match_id) REFERENCES matches(id)
);
`);

/**
 * @brief Save the result of a match to the database.
 * @param room The game room object containing match details.
 * @param duration Optional duration of the match in seconds.
*/
export function saveMatchResult(room: Room, duration?: number) {
	if (!duration) return;
	duration = duration ?? room.duration; // Fallback to room's duration if not provided
	try {
		// Insert match record
		const stmt = db.prepare(`
			INSERT INTO matches (room_id, name, team_size, winner, score_left, score_right, duration)
			VALUES (?, ?, ?, ?, ?, ?, ?)
			`);

		// Save match record
		const result = stmt.run(
			room.id,
			room.name,
			room.teamSize,
			room.result?.winner,
			room.result?.scoreLeft,
			room.result?.scoreRight,
			duration
		);

		// Get the inserted match ID
		const matchId = result.lastInsertRowid as number;

		// Insert players for both teams
		const playerStmt = db.prepare(`
			INSERT INTO match_players (match_id, player_id, team, role)
			VALUES (?, ?, ?, ?);
		`);

		// Extract players from room state
		const leftPlayers = room.gameState?.teams?.left ?? [];
		const rightPlayers = room.gameState?.teams?.right ?? [];

		// Save left team players
		for (const p of leftPlayers) {
			playerStmt.run(
				matchId,
				p.clientId ?? "unknown",
				"left",                // team
				p.role ?? "left"       // role (slot: left_player1, etc.)
			);
		}

		// Save right team players
		for (const p of rightPlayers) {
			playerStmt.run(
				matchId,
				p.clientId ?? "unknown",
				"right",               // team
				p.role ?? "right"      // role (slot: right_player1, etc.)
			);
		}


		console.log(`[DB] Match result saved for room: ${room.id}`);
	} catch (e) {
		console.error("Error saving match result:", e);
	}
}

/**
 * @brief Retrieve all matches from the database, including their players.
 * @param limit Maximum number of matches to retrieve (default is 10).
 * @returns Array of match records with associated players.
 */
export function getAllMatches(limit = 10) {
	const matches = db.prepare("SELECT * FROM matches ORDER BY id DESC LIMIT ?")
					.all(limit) as Array<{ [key: string]: any }>;

	for (const match of matches) {
		const players = db
			.prepare("SELECT player_id, role, team FROM match_players WHERE match_id = ?")
			.all(match.id);
		match.players = players;
	}

	return matches;
}
