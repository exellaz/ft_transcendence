// ---- Chat properties ----
//using websocket as a transport protocol and on top of that, a custom JSON message protocol
export interface ChatMessage {
	type: "chat";
	from: string;
	text: string;
	time: number;
}

// ---- Create Chat Message ----
export function createChatMessage(from: string, text: string): ChatMessage {
	return {
	  type: "chat",
	  from,
	  text,
	  time: Date.now(),
	};
  }