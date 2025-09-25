import React, { useState, useRef, useEffect } from "react";
import { useTranslation, withSSR } from "react-i18next";
import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";
import { Sprite } from "../../../backend/src/modules/game/objects/Sprite"
import { HitBox } from "../../../backend/src/modules/game/objects/Hitbox";
import { Glow } from "../../../backend/src/modules/game/objects/Glow";
import { Label } from "../../../backend/src/modules/game/objects/Label";
import { ImageObject } from "../../../backend/src/modules/game/objects/ImageObject";
import { Ball } from "../../../backend/src/modules/game/game/ball";
import { OnScreenLabel } from "../../../backend/src/modules/game/objects/Label";
import { GameObject } from "../../../backend/src/modules/game/objects/GameObject";
import { Arrow } from "../../../backend/src/modules/game/game/Padel";
import { Player } from "../../../backend/src/modules/game/game/Player";
import { Point2D, Vector2D } from "../../../backend/src/modules/game/objects/Coordinates";


function isArrowKey(e: KeyboardEvent): boolean {
  return e.key === "ArrowUp" || e.key === "ArrowDown";
}






const componentMap: Record<string, new (params: any) => any> = {
	"Point2D": function (params: any) { return new Point2D(params.x, params.y); } as any,
	"Vector2D": function (params: any) { return new Vector2D(params.x, params.y); } as any,
	"sprite": Sprite,
	"glow": Glow,
	"hitbox": HitBox,
};

const gameObjectMap: Record<string, new (params: any) => any> = {
	"imageObject": ImageObject,
	"label": Label,
	"ball": Ball,
	"OnScreenLabel": OnScreenLabel,
	"gameObject": GameObject,
	"arrow": Arrow,
	"player": Player
}

function revive(obj: any): any {
	// -- handle arrays --
	if (Array.isArray(obj)) 
		return obj.map(revive);

	// -- handle object (nested) --
	if (obj && typeof obj === "object") {
		const { className } = obj;

		// If the object matches a known component, rebuild as an instance
		// -end of recursion
		if (className && componentMap[className]) {
			const revivedParams: Record<string, any> = {};
			for (const key in obj) 
				revivedParams[key] = revive(obj[key]);

			return new componentMap[className](revivedParams);
		}

		// Otherwise, recurse further
		for (const key in obj) {
			if (key === "position") 
				obj.position = new Point2D(obj.position.x, obj.position.y);
			else if (key === "scaleFactor") 
				obj.scaleFactor = new Vector2D(obj.scaleFactor.x, obj.scaleFactor.y);
			else 
				obj[key] = revive(obj[key]);
		}
	}

	return obj;
}

function genericUpdate(
	obj: Record<string, any>,
	params: Record<string, any>
) {
	for (const key in params) {
		if (key === "parent" || key === "children") continue;

		const value = params[key];

		// -- update array types --
		if (Array.isArray(value)) {
			obj[key] = obj[key] || [];
			value.forEach((item, index) => {
				obj[key][index] = obj[key][index] || {};
				genericUpdate(obj[key][index], item);
			});
		}

		else if (key === "cUpdate" && obj.onClientUpdateId !== value) {
			obj.setOnClientUpdate(value);
			continue;
		}

		// -- update nested object types --
		else if (typeof value === "object" && value !== null) {
			obj[key] = obj[key] || {};
			genericUpdate(obj[key], value);
		}

		// -- assign primitive or different value --
		else {
			obj[key] = value;
		}
	}
}

const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { t } = useTranslation();
  const translate = (key: string) => t(`GameView.${key}`);
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals">("quarterfinals");


  const websocketRef = useRef<WebSocket | null>(null);
  let data: Record<string, any> = {};
  

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000/ws");
    websocketRef.current = ws;

    const sendData = (type: string, payload: Record<string, any> = {}) => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type, payload }));
      }
    };




    // -- WEBSOCKET --

    ws.onopen = () => ws.send(JSON.stringify({ type: "ready" }));
    ws.onmessage = (event) => {
      data = JSON.parse(event.data);
      console.log(data);

      if (data["type"] === "ready") sendData("fetch_world");

      if (!data["state"]) return;
      if (data["state"]["type"] === "full") sendData("received_full_state"); 
    };

    ws.onclose = () => console.log("❌ Disconnected");



    // -- KEYBOARD --

    function handleKey(e: KeyboardEvent) {
      if (isArrowKey(e) && websocketRef.current?.readyState === WebSocket.OPEN) 
        sendData("input", { key: e.key, action: e.type });
    }

    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", handleKey);

    return () => {
      ws.close();
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("keyup", handleKey);
    };


    
    // -- WORLD UPDATE --



    
  }, []);
  
  return (
    <Background variant="plain">
      <div className="w-full h-full flex-col-center gap-10 px-25">
        <TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
        </TournamentHeader>
        <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
          <canvas
            ref={canvasRef}   // ✅ fixed
            width={880}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
        </div>
      </div>
    </Background>
  );
};

export default GameView;
