import { liveChatMessage } from "../../types/interface";

/**
 * @brief Creates a new chat message
 * @param from - The sender of the message
 * @param text - The content of the message
 * @returns A ChatMessage object (a message with info about sender and timestamp)
 */
export function createLiveChatMessage(
  id: number,
  from: string,
  text: string,
): liveChatMessage {
  return {
    type: "chat",
    id: id || -1,
    from,
    text,
    time: Date.now(),
  };
}
