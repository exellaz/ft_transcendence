import { Socket } from "dgram";
import { Skin } from "./Skins.ts";
import type { Padel } from "./Padel.ts";

export class Player {
  name: string = "";
  profileImage: string = "";
  skin: number = Skin.ghost_blue;
  id: number = -1;
  team: number = 0;
  socket: Socket;
  handshakeComplete: boolean = false;
  padel: Padel;

  private static globalId = 0;

  send(data: any) {
    this.socket.send(JSON.stringify(data));
  }

  constructor(params: Partial<Player>) {
    Object.assign(this, { ...params });

    Player.globalId++;
  }

  export() {
    return {
      className: "player",
      name: this.name,
      profileImage: this.profileImage,
      skin: this.skin,
      id: this.id,
    };
  }
}
