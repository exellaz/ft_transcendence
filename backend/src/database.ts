import Database from "better-sqlite3";

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
	team TEXT NOT NULL,
	FOREIGN KEY(match_id) REFERENCES matches(id)
);
`);

/**
 * @brief Save the result of a match to the database.
 * @param room The game room object containing match details.
 * @param duration Optional duration of the match in seconds.
*/
export function saveMatchResult(room: any, duration?: string) {
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
			INSERT INTO match_players (match_id, player_id, team)
			VALUES (?, ?, ?)
		`);

		// Extract players from room state
		const leftPlayers = room.gameState?.teams?.left ?? [];
		const rightPlayers = room.gameState?.teams?.right ?? [];

		//get player id
		function resolvePlayerId(p: any, room: any) {
			if (p == null) return "unknown";
			// If p is a role string like 'left_player1' or 'right_player1', map it to clientId via room.clientRoles
			if (typeof p === 'string') {
				if (p.startsWith("left_") || p.startsWith("right_")) {
					for (const [cid, r] of room.clientRoles.entries()) {
						if (r === p) return cid;
					}
					return "unknown";
				}
				// Already a clientId string
				return p;
			}
			// If player is an object, prefer its clientId; if missing, return "unknown"
			if (typeof p === 'object') return String(p.clientId ?? "unknown");
			if (typeof p === 'number') return String(p);
			return "unknown";
		}

		// Save players for left and right teams
		for (const p of leftPlayers) {
			const pid = resolvePlayerId(p, room);
			playerStmt.run(matchId, pid, "left");
		}

		for (const p of rightPlayers) {
			const pid = resolvePlayerId(p, room);
			playerStmt.run(matchId, pid, "right");
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
			.prepare("SELECT player_id, team FROM match_players WHERE match_id = ?")
			.all(match.id);
		match.players = players;
	}

	return matches;
}