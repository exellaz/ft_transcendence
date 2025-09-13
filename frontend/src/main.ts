import { showLobby } from "./frontendLobby";
import { startRoom } from "./frontendRoom";

const baseWeight = 800;
const baseHeight = 400;
const scale = Math.min(window.innerWidth / baseWeight, window.innerHeight / baseHeight, 1);
export const scaledWidth = baseWeight * scale;
export const scaledHeight = baseHeight * scale;

window.addEventListener("DOMContentLoaded", () => {
  const saveRoom = sessionStorage.getItem("pongRoomName");
  const saveRoomId = sessionStorage.getItem("pongRoomId") || "";
  const saveClient =
    sessionStorage.getItem("pongClientId") ||
    "P" + Math.floor(Math.random() * Math.pow(10, 6)).toString().padEnd(6, "0");

  sessionStorage.setItem("pongClientId", saveClient);

  //
  if (saveRoom) {
    startRoom(saveRoomId, saveRoom, saveClient);
  } else {
    showLobby();
  }
});
