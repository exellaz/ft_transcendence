import React, { useState, useRef, useEffect } from "react";
import { useTranslation, withSSR } from "react-i18next";
import Background from "../components/Background";
import TournamentHeader from "../components/TournamentHeader";
import { Sprite } from "@shared/objects/Sprite";
import { HitBox } from "@shared/objects/HitBox";
import { Glow } from "@shared/objects/Glow";
import { Label } from "@shared/objects/Label";
import { ImageObject } from "@shared/objects/ImageObject";
import { Ball } from "@shared/game/ball";
import { OnScreenLabel } from "@shared/objects/Label";
import { GameObject } from "@shared/objects/GameObject";
import { Arrow } from "@shared/game/Padel";
import { Player } from "@shared/game/Player";
import { Point2D, Vector2D } from "@shared/objects/Coordinates";
import { PongGame, Team } from "@shared/game/pong";
import type { Component } from "@shared/objects/Component";
import { Viewport } from "@shared/objects/Viewport";
import type { Camera } from "@shared/objects/Camera";
import { getUserById } from "../lib/usersApiClient";

import { useGameRoomWebSocket, useGameWebSocket } from "../lib/game-websocket";
import { useBlockLeave } from "../utils/blockRefresh";
import { useUser } from "../context/UserProvider";
import { useNavigate } from "react-router-dom";
import Button from "@/components/Button";
import type { User } from "@/types/usersApi";
import { createNextTournament, deleteTournament, getTournamentById, updateTournamentLobby } from "@/lib/requestBackend.api";

function isArrowKey(e: KeyboardEvent): boolean {
  return e.key === "ArrowUp" || e.key === "ArrowDown";
}

// TODO not populating data beyond the initial handshake

const componentMap: Record<string, new (params: any) => any> = {
  Point2D: function (params: any) {
    return new Point2D(params.x, params.y);
  } as any,
  Vector2D: function (params: any) {
    return new Vector2D(params.x, params.y);
  } as any,
  sprite: Sprite,
  glow: Glow,
  hitbox: HitBox,
};

const gameObjectMap: Record<string, new (params: any) => any> = {
  imageObject: ImageObject,
  label: Label,
  ball: Ball,
  OnScreenLabel: OnScreenLabel,
  gameObject: GameObject,
  arrow: Arrow,
  player: Player,
};

function revive(obj: any): any {
  // -- handle arrays --
  if (Array.isArray(obj)) return obj.map(revive);

  // -- handle object (nested) --
  if (obj && typeof obj === "object") {
    const { className } = obj;

    // If the object matches a known component, rebuild as an instance
    // -end of recursion
    if (className && componentMap[className]) {
      const revivedParams: Record<string, any> = {};
      for (const key in obj) revivedParams[key] = revive(obj[key]);

      return new componentMap[className](revivedParams);
    }

    // Otherwise, recurse further
    for (const key in obj) {
      if (key === "position")
        obj.position = new Point2D(obj.position.x, obj.position.y);
      else if (key === "scaleFactor")
        obj.scaleFactor = new Vector2D(obj.scaleFactor.x, obj.scaleFactor.y);
      else obj[key] = revive(obj[key]);
    }
  }

  return obj;
}

function genericUpdate(obj: Record<string, any>, params: Record<string, any>) {
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
    } else if (key === "cUpdate" && obj.onClientUpdateId !== value) {
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
      if (key === "id") {
        continue;
      }
      obj[key] = value;
    }
  }
}

class GameClient {
  private id: number = -1;

  private websocketRef: WebSocket | null = null;
  private data: Record<string, any> = {};
  private gameObjectRegistry = new Map<number, GameObject>();
  private componentRegistry = new Map<number, Component>();
  private game: PongGame = new PongGame(true, {});
  private viewport: Viewport | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  static globalId = 0;
  private isFullStateProcessed: boolean = false;
  private keysPressed: Record<string, boolean> = {};
  private isOnline: boolean = true;

  handleKey(e: KeyboardEvent) {
    if (!isArrowKey(e)) return;

    if (e.type === "keydown") {
      this.keysPressed[e.key] = true;
    } else if (e.type === "keyup") {
      this.keysPressed[e.key] = false;
    }
  }

  sendData(type: string, payload: Record<string, any> = {}) {
    if (this.websocketRef?.readyState === WebSocket.OPEN) {
      this.websocketRef.send(JSON.stringify({ type, payload }));
    }
  }

  constructor(canvasRef: HTMLCanvasElement | null, websocketRef: WebSocket) {
    // console.log("created game client"); ////debug
    this.id = GameClient.globalId;
    GameClient.globalId++;
    this.websocketRef = websocketRef;
    ``;
    // -- WEBSOCKET --

    // send initial handshake
    // console.log("asking for ready"); ////debug
    if (this.websocketRef.readyState === WebSocket.OPEN) {
      this.sendData("ready");
    } else {
      this.websocketRef.addEventListener("open", () => {
        // console.log("socket opened, now sending ready"); ////debug
        this.sendData("ready");
      });
    }

    this.websocketRef.onmessage = (event) => {
      let data = JSON.parse(event.data);

      this.data = data;

      if (data["type"] === "ready") {
        this.sendData("fetch_world");
        // console.log("requested for full world"); ////debug
      }

      if (!data["state"]) {
        // console.log("no state", data.type); ////debug
        return;
      }
      if (data["state"]["type"] === "full") {
        // console.log("Objects in full state:", data.state.gameObjects.map(o => o.className)); ////debug
        // console.log("---- received full state ---- "); ////debug
        // console.log(`received ${event.data.length} bytes`); ////debug
        // console.log(`received`, data); ////debug
        let incomingData = data["state"]["gameObjects"].map((elem) => {
          return elem.id;
        });
        let currentData = Array.from(this.gameObjectRegistry.keys());
        let incomingLen = incomingData.length;

        // console.log(`incoming objects length :${incomingLen} / current objects length ${this.gameObjectRegistry.size}`); ////debug
        // console.log(`incoming ids :${incomingData}`); ////debug
        // console.log(`current ids :${currentData}`); ////debug
        // console.log("object ids", this.gameObjectRegistry.keys()); ////debug

        // for (const id of incomingData) { ////debug
        // console.log(this.getObject(id) === undefined); ////debug
        // }

        this.isFullStateProcessed = true;
        this.sendData("received_full_state");

        this.game.initSettings(data["settings"]);

        this.loop();
      }
    };

    this.websocketRef.onclose = (event) => {
       console.log("❌ Disconnected", event.code, event.reason); ////debug

       if (event.code === 1000 && event.reason === "offline") {
        console.log("player went offline");
        this.isOnline = false;
        return;
       }
    };

    this.handleKey = this.handleKey.bind(this);
    // -- KEYBOARD --

    window.addEventListener("keydown", this.handleKey);
    window.addEventListener("keyup", this.handleKey);

    this.canvas = canvasRef;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) return;

    this.viewport = new Viewport({
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
    });

    this.loop = this.loop.bind(this);
  }

  //? delete
  handleOfflineDisconnect() {
    this.isOnline = false;
    this.destroy();
  }

  start() {
    this.loop();
  }

  loop() {
    if (!this.isOnline || !navigator.onLine) return;
    // console.log("looping client", this.id); ////debug
    if (this.websocketRef?.readyState === WebSocket.OPEN) {
      if (this.keysPressed["ArrowUp"]) {
        this.sendData("input", { key: "ArrowUp", action: "hold" });
      }
      if (this.keysPressed["ArrowDown"]) {
        this.sendData("input", { key: "ArrowDown", action: "hold" });
      }
    }

    if (
      this.data === undefined ||
      this.data["state"] === undefined ||
      !this.isFullStateProcessed
    ) {
      // console.log("not yet received full state"); ////debug
      requestAnimationFrame(this.loop);
      return;
    }

    if (this.data["bgColor"]) this.game.world.bgColor = this.data["bgColor"];

    // -- sync server components with components
    for (const stateComponent of this.data["state"]["components"] ?? []) {
      const component = this.componentRegistry.get(stateComponent.id);

      if (component !== undefined)
        Object.assign(component, revive(stateComponent));
      else if (componentMap[stateComponent.name])
        this.componentRegistry.set(
          stateComponent.id,
          new componentMap[stateComponent.name](stateComponent),
        );
    }

    // -- instantiate objects --
    for (const stateObject of this.data["state"]["gameObjects"] ?? []) {
      const id = stateObject["id"];
      let obj = this.getObject(id);

      if (obj === undefined) {
        // hydrate only once
        // console.log("creating new instance"); ////debug
        const revivedObject = revive(stateObject);
        this.setObject(
          stateObject["id"],
          this.createNewInstance(revivedObject),
        );
      } else {
        // update from raw JSON
        genericUpdate(obj, stateObject);
        if (stateObject.className === "camera")
          this.viewport!.camera = obj as Camera;
      }
    }

    // Replace any numeric IDs with object references
    for (const [id, object] of this.gameObjectRegistry) {
      object.children = object.children.map((child: any) => {
        if (typeof child !== "number") return child;

        const childObj = this.gameObjectRegistry.get(child);

        if (childObj) {
          childObj.parent = object;
          return childObj; // replace number with actual object
        } else return child; // cannot link yet
      });
      object.clientUpdate();
    }

    // link components
    for (const [id, object] of this.gameObjectRegistry) {
      for (const id of object.component_list) {
        if (typeof id !== "number") continue;
        const compObj = this.componentRegistry.get(id);
        if (!compObj) continue;

        compObj.host = object;
        object.addComponent(compObj);
      }
    }
    this.draw();
    requestAnimationFrame(this.loop);
  }

  createNewInstance(object: any) {
    const params = {
      ...object,
      components: [],
      isClient: true,
      component_list: object.components ?? [],
    };
    const objectInstance = gameObjectMap[object.className]
      ? new gameObjectMap[object.className](params)
      : new GameObject(params);
    objectInstance.game = this.game;
    return objectInstance;
  }

  draw() {
    const renderList = Array.from(this.gameObjectRegistry.values()).sort(
      (a, b) => a.zIndex - b.zIndex,
    );

    // -- CLEAR CANVAS --
    this.ctx!.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.ctx!.fillStyle = this.game.world.bgColor;
    this.ctx!.fillRect(0, 0, this.canvas!.width, this.canvas!.height);

    // -- RENDER OBJECTS --
    for (const clientObj of renderList) clientObj.draw(this.viewport!);
  }

  getObject(id: number) {
    return this.gameObjectRegistry.get(id);
  }
  setObject(id: number, object: any) {
    this.gameObjectRegistry.set(id, object);
  }

  public destroy() {
    this.websocketRef?.close();
    window.removeEventListener("keydown", this.handleKey);
    window.removeEventListener("keyup", this.handleKey);
  }
}

const GameView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [delayForGameOver, setDelayForGameOver] = useState(false);
  const [roomError, setRoomError] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [hasNextStage, setHasNextStage] = useState<boolean | null>(null);
  useBlockLeave();
 const { t } = useTranslation();
 const translate = (key: string) => t(`GameView.${key}`);
  const [stage, setStage] = useState<"quarterfinals" | "semifinals" | "finals" | "custom">(
    "quarterfinals",
  );
  const { user } = useUser();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const navigate = useNavigate();

  //check for reload
  React.useEffect (() => {
    if (sessionStorage.getItem("reloading") !== null) {
        sessionStorage.removeItem("reloading");
        navigate("/main-menu");
        }
  }, []);

  React.useEffect(() => {
    if (!user) return; // Ensure `user` is available

    const fetchUserInfo = async () => {
      try {
        const response = await getUserById({ id: Number(user.id) }); // Call the API
        if (response.success && response.data) {
          setUserInfo(response.data); // Store the user info
        } else {
          console.log("Failed to fetch user info"); // Handle API error
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
        console.error("An error occurred while fetching user info"); // Handle fetch error
      }
    };

    fetchUserInfo();
  }, [user]);

  React.useEffect(() => {
    function handleOnline() {
        setDelayForGameOver(false);
        console.log("Player is back online");
    }

    function handleOffline() {
        setDelayForGameOver(true);

        setTimeout(() => {
            if (!navigator.onLine) {
                console.log("player offline, navigate to main menu");
				setDisconnectMessage("offline_error");
				setRoomError(true);
            }
        }, 5000); //wait 5 second to confirm player is still offline
    }

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [navigate]);

  // console.log("user loaded", user); ////debug
  const roomId = Number(sessionStorage.getItem("RoomId") || "1");
  const roomName = sessionStorage.getItem("RoomName") || "Room 1";
  const clientId = userInfo?.id ?? -1; // Ensure clientId is always a number
  const playerName = userInfo?.username ?? "undefined"; // Ensure playerName is always a string
  const playerSprite = userInfo?.avatarUrl || "default.png";
  const initialRole = sessionStorage.getItem("playerSide") || "";
  console.log("room id from session:", roomId); ////debug
  console.log("room name from session:", roomName); ////debug
  console.log("client id from session:", clientId); ////debug
  console.log("player name from session:", playerName); ////debug
  console.log("player sprite from session:", playerSprite); ////debug
  console.log("initial role from session:", initialRole); ////debug

  // -------------------------------- Websockets --------------------------------

  const params = {
    roomId,
    roomName,
    clientId,
    initialRole,
    playerName,
    playerSprite,
    callback: () => {},
	onError: (msg: string) => {
		setDisconnectMessage(msg);
		setRoomError(true);
	},
  };
  // console.log("params", params); ////debug

  const { socket } = useGameWebSocket(params);
  // console.log("socket has been create: ", socket); ////debug

  const { gameOver, isWinner, lastTournamentId, tournamentDb } = useGameRoomWebSocket({
    ...params,
    isOffline: delayForGameOver,
  });

// -------------------------------- Effect --------------------------------
  // determine if there is a next stage (used to change button text/action for final)
  React.useEffect(() => {
    if (!lastTournamentId) {
      setHasNextStage(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const tournament = await getTournamentById(lastTournamentId);
        const next = nextRoundFromTournament(tournament);
        if (mounted) setHasNextStage(!!next);
      } catch (err) {
        if (mounted) setHasNextStage(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lastTournamentId]);

//  React.useEffect(() => {
//    if (gameOver && delayForGameOver) {
//        console.log("received game over while offline, navigate to main menu");
//        setDisconnectMessage("offline_error");
//		setRoomError(true);
//    }
//  }, [gameOver, delayForGameOver, navigate]);

//  // auto-navigate winners to the next-round lobby when server provides the tournament id
//  React.useEffect(() => {
//    if (isWinner && lastTournamentId) {
//        setTimeout(() => {
//            // clear room session storage (same as losers)
//            sessionStorage.removeItem("playerSide");
//            sessionStorage.removeItem("RoomId");
//            sessionStorage.removeItem("RoomLeaderId");
//            sessionStorage.removeItem("RoomName");
//            sessionStorage.removeItem("RoomType");

//            // navigate to tournament lobby (winners should be sent there)
//            //navigate(`/tournament/${lastTournamentId}`);
//              (async () => {
//                  const res = await updateTournamentLobby(lastTournamentId, 4, "SF");
//                  if (res) {
//                      console.log("new tournament lobby updated, navigating to next round:", res);
//                      navigate(`/tournament/${lastTournamentId}`);
//                  } else {
//                      console.error("failed to update tournament lobby before navigating to next round");
//                  }
//              })();
//        }, 5000); //wait 3 seconds before navigating
//    }
//  }, [isWinner, lastTournamentId, navigate]);
  // helper to map current -> next round
  const nextRoundFromTournament = (tournament: any) => {
    if (!tournament) return null;
    // prefer numeric maxPlayer if present (8 -> 4 -> 2)
    const max = typeof tournament.maxPlayer === "number" ? tournament.maxPlayer : undefined;
    if (max === 8) return { code: "SF", size: 4 };
    if (max === 4) return { code: "F", size: 2 };

    // fallback to stage string parsing
    const stage = (tournament.stage || "").toString().toLowerCase();
    if (stage.includes("quarter") || stage === "qf") return { code: "SF", size: 4 };
    if (stage.includes("semi") || stage === "sf") return { code: "F", size: 2 };
    return null;
  };

  // extracted so both the auto-timer and the button use the same logic
  const goToNextRound = async (tournamentDb: { id: number; status: string; createdAt: Date } | null) => {
    if (!isWinner || !lastTournamentId || isAdvancing) return;
    setIsAdvancing(true);

    // clear room session storage (same as losers)
    sessionStorage.removeItem("playerSide");
    sessionStorage.removeItem("RoomId");
    sessionStorage.removeItem("RoomLeaderId");
    sessionStorage.removeItem("RoomName");
    sessionStorage.removeItem("RoomType");

    // try to read current stage from session first, otherwise fetch tournament info
    let parentTournament = null;
    try {
        parentTournament = await getTournamentById(lastTournamentId);
    } catch (err) {
        console.error("error fetching parent tournament info:", err);
        parentTournament = null;
    }
    const next = nextRoundFromTournament(parentTournament);
    if (!next) {
      console.log("no next round to navigate to");
      navigate("/main-menu");
      setIsAdvancing(false);
      return;
    }

    try {
      const res = await createNextTournament(next.code, lastTournamentId, tournamentDb);

      // navigate to the new tournament lobby if created
      if (res && res.id) {
        console.log(" [ move stage ] navigating to next tournament id:", res.id, res.stage);
        navigate(`/tournament/${res.id}`);
        setInterval(() => {
            if (lastTournamentId) {
                deleteTournament(lastTournamentId).catch((err) => console.log("error deleting old tournament:", err));
            }
        }, 10000); //delete old tournament after 10 seconds
        return;
      }

      //fallback: navigate to parent tournament page
      const parent = await getTournamentById(lastTournamentId);
      if (parent && parent.nextTournamentId) {
        const nextId = parent.nextTournamentId;
        console.log(" [ move stage ] navigating to parent tournament id:", nextId);
        navigate(`/tournament/${nextId}`);
        return;
      }
    } catch (err) {
      console.error("error creating next tournament:", err);

      //fallback: navigate to parent tournament page
      try {
        const parent = await getTournamentById(lastTournamentId);
        if (parent && parent.nextTournamentId) {
          const nextId = parent.nextTournamentId;
          console.log(" [ move stage ] navigating to parent tournament id:", nextId);
          navigate(`/tournament/${nextId}`);
          return;
        }
      } catch (err2) {
        console.error("error during fallback navigation:", err2);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  // auto-navigate winners after a timeout (still possible, but user can click the button to jump early)
  React.useEffect(() => {
    if (!isWinner || !lastTournamentId) return;
    const timer = setTimeout(() => {
      goToNextRound(tournamentDb);
    }, 3000);
    return () => clearTimeout(timer);
  }, [isWinner, lastTournamentId, tournamentDb]); // navigate is safe to omit here (stable)

  React.useEffect(() => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // console.log("waiting for socket connection..."); ////debug
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      socket.onopen = () => {
        // console.log("Socket is open, starting game client"); ////debug
        const gameClient = new GameClient(canvasRef.current, socket);
        gameClient.start();
      };
      return;
    }

    // console.log("start game client with open socket"); ////debug
    let gameClient = new GameClient(canvasRef.current, socket);

    gameClient.start();
    return () => {
      gameClient.destroy(); // ✅ cleanup
    };
  }, [socket]);

// -------------------------------- Helper Functions --------------------------------
  function renderRoomErrorText(): string | null {
  if (!disconnectMessage) return null;

  if (disconnectMessage === "offline_error")
    return translate("offline_error");

  return null;
  }

// -------------------------------- Render --------------------------------
  return (
    <Background variant="plain">
      <div className="w-full h-full flex-col-center gap-10 px-25">
        {/*<TournamentHeader>
          {stage.charAt(0).toUpperCase() + stage.slice(1)} Match
        </TournamentHeader>*/}
        <div className="w-full h-[500px] flex-col-center border-4 border-yellow-400 text-white text-9xl text-center">
          <canvas
            ref={canvasRef} // ✅ fixed
            width={880}
            height={500}
            className="rounded-lg shadow-lg border-4 border-cyan-400 bg-gray-800"
          />
        </div>

        {gameOver && !isWinner && (
          <div>
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl"
              onClick={() => {
                navigate("/main-menu");
                sessionStorage.removeItem("playerSide");
                sessionStorage.removeItem("RoomId");
                sessionStorage.removeItem("RoomLeaderId");
                sessionStorage.removeItem("RoomName");
                sessionStorage.removeItem("RoomType");
              }}
            >
              Back to Lobby
            </Button>
          </div>
        )}

        {/* Winner: button adapts for final vs next-stage */}
        {isWinner && lastTournamentId && (
          <div className="flex items-center gap-4">
            <Button
              variant="bigYellow"
              className="px-3 py-4 text-2xl"
              onClick={() => {
                if (hasNextStage === false) {
                  // final finished — go back to tournament page / results (or main-menu)
                  sessionStorage.removeItem("playerSide");
                  sessionStorage.removeItem("RoomId");
                  sessionStorage.removeItem("RoomLeaderId");
                  sessionStorage.removeItem("RoomName");
                  sessionStorage.removeItem("RoomType");
                  navigate(`/tournament/${lastTournamentId}`);
                  return;
                }
                // otherwise attempt to advance to next round
                goToNextRound();
              }}
              disabled={isAdvancing || hasNextStage === null}
            >
              {isAdvancing
                ? "Redirecting..."
                : hasNextStage === false
                ? "Back to Lobby"
                : "Next Stage"}
            </Button>
          </div>
        )}

		{/* error popup */}
		{roomError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              {/* Background image using your Background component */}
              <Background variant="grass">
                {/* Optional dark overlay on top of the background */}
                <div className="absolute inset-0 bg-black opacity-70"></div>
                {/* Popup content */}
                <div className="relative flex flex-col items-center gap-6 bg-card-blue border-yellow-600 border-10 rounded-3xl shadow-2xl p-10 z-10">
                  <p className="text-center text-white text-2xl px-4">
                    {renderRoomErrorText()}
                  </p>
                  <Button
                    variant="red"
                    onClick={() => {
                      navigate("/main-menu");
                    }}
                  >
                    {translate("close")}
                  </Button>
                </div>
              </Background>
            </div>
          )}

      </div>
    </Background>
  );
};

export default GameView;
