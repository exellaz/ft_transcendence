import { useEffect, useState } from "react";
import Lobby from "./lobby";
import Room from "./room";
import { ensureClientId } from "./utils";


export default function App() {
  const [currentRoom, setCurrentRoom] = useState<{ id:string; name:string; leaderId:string } | null>(()=>{
    const id = sessionStorage.getItem("pongRoomId");
    const name = sessionStorage.getItem("pongRoomName");
    if (id && name) return { id, name, leaderId: sessionStorage.getItem("pongClientId") || "" };
    return null;
  });

  useEffect(()=>{ ensureClientId(); }, []);

  // handle enter room from lobby
  function enterRoom(id:string, name:string, leaderId:string) {
    sessionStorage.setItem("pongRoomId", id);
    sessionStorage.setItem("pongRoomName", name);
    setCurrentRoom({ id, name, leaderId });
  }

  // handle leave room from room
  function leaveRoom() {
    sessionStorage.removeItem("pongRoomId");
    sessionStorage.removeItem("pongRoomName");
    setCurrentRoom(null);
  }

  // if no current room, show lobby
  // otherwise show room for player join
  if (!currentRoom) return <Lobby onEnterRoom={enterRoom} />;

  return <Room roomId={currentRoom.id} roomName={currentRoom.name} leaderId={currentRoom.leaderId} onBack={leaveRoom} />;
}
