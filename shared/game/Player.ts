import { Socket } from 'dgram';
import { Skin } from './Skins.ts';

export class Player {
	name: string = "";
	profileImage: string = "";
	skin: number = Skin.ghost_blue;
	id: number = -1;
	team: number = 0;
	socket: Socket;

	private static globalId = 0;

	constructor(params: Partial<Player>) {
		Object.assign(this, {...params, id: Player.globalId});
		Player.globalId ++;
	}

	export() {
		return {
			className: "player",
			name: this.name,
			profileImage: this.profileImage,
			skin: this.skin,
			id: this.id
		}
	}
}
