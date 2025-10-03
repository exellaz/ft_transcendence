/**
 * @brief Represents a chat message in the game.
 */
export interface liveChatMessage {
	type: "chat";
	uid: number;
	from: string;
	text: string;
	time: number;
}

/**
 * @brief Creates a new chat message
 * @param from - The sender of the message
 * @param text - The content of the message
 * @returns A ChatMessage object (a message with info about sender and timestamp)
*/
export function createLiveChatMessage(uid: number, from: string, text: string): liveChatMessage {
	return {
		type: "chat",
		uid: uid || -1,
		from,
		text,
		time: Date.now(),
	};
}
