import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "../../context/UserProvider";
import { getUserById } from "../../lib/usersApiClient";
import type { MatchPlayer } from "../../types/apiInterfaces";
import type { User } from "../../types/usersApi";

import Avatar from "../../components/Avatar";
import Background from "../../components/Background";
import Button from "../../components/Button";
import Card from "../../components/Card";
import TournamentHeader from "../../components/TournamentHeader";

import ProfilePopup from "../../popups/ProfilePopup";
import { useMatchWebsocket } from "../../lib/match-websocket";
import { useBlockLeave } from "../../utils/blockRefresh";
import type { playerInfo } from "../../../../backend/src/types/interface";

const MatchView: React.FC = () => {
  useBlockLeave();
  const location = useLocation();
  const navigate = useNavigate();
  const { players: initialPlayers, stage, roomId } = location.state || {};
  const { t } = useTranslation();
  const translate = (key: string) => t(`MatchView.${key}`);
  const { user } = useUser();
  const [userInfo, setUserinfo] = useState<User | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  React.useEffect(() => {
    if (sessionStorage.getItem("reloading") !== null) {
      sessionStorage.removeItem("reloading");
      navigate("/main-menu");
    }
  }, []);

  React.useEffect(() => {
    if (roomId === undefined || initialPlayers === undefined) {
      console.warn("Unauthorized match access - missing required data");
      navigate("/main-menu");
    }
  }, [roomId, initialPlayers, navigate]);

  if (roomId === undefined || initialPlayers === undefined) {
    return null;
  }

  // Fetch user info
  React.useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const response = await getUserById({ id: Number(user.id) });
        if (response.success && response.data) {
          setUserinfo(response.data);
        } else {
          //  console.log("Failed to fetch user info");
        }
      } catch (err) {
        console.error("Error fetching user info:", err);
        console.error("An error occurred while fetching user info");
      }
    })();
  }, [user]);

  const authId = user?.id ?? userInfo?.id;
  const userPlayer = initialPlayers?.find(
    (p: MatchPlayer) => Number(p.id) === Number(authId),
  );
  const playerId = userPlayer
    ? Number(userPlayer.clientId ?? userPlayer.id)
    : -1;
  const playerName = userPlayer
    ? userPlayer.playerName || userPlayer.username || ""
    : "";
  const playerSprite = userPlayer ? userPlayer.spriteUrl || "" : "";
  //  console.log("[MatchView] userPlayer:", userPlayer); //// debug
  //  console.log("[MatchView] playerId:", playerId, " playerName:", playerName, " playerSprite:", playerSprite); ////debug

  // match websocket
  const {
    countdown,
    roomReady,
    handleRoomReady,
    players: wsPlayers,
  } = useMatchWebsocket(roomId ?? -1, {
    id: playerId,
    name: playerName,
    spriteUrl: playerSprite,
  });

  // navigate to /game when match room is ready
  React.useEffect(() => {
    //console.log("[MatchView] roomReady changed:", roomReady);
    if (!roomReady) return;
    sessionStorage.setItem("playerSprite", playerSprite);
    //console.log("[MatchView] navigating to /game");
    navigate("/game", {
      state: {
        roomId: roomId,
        player: {
          id: playerId,
          name: playerName,
          spriteUrl: playerSprite,
        },
      },
    });
  }, [roomReady, navigate]);

  // don't render main UI until required data exists
  if (
    !userInfo ||
    !initialPlayers ||
    initialPlayers.length === 0 ||
    !userPlayer
  ) {
    // show diagnostic output so you can see which value is missing
    return (
      <div className="p-4 text-white">
        Loading...
        <pre
          style={{ whiteSpace: "pre-wrap", maxHeight: 400, overflow: "auto" }}
        >
          {JSON.stringify(
            {
              userId: user?.id,
              userInfo,
              initialPlayers,
              userPlayerFound: !!userPlayer,
            },
            null,
            2,
          )}
        </pre>
      </div>
    );
  }

  // choose websocket players when available, otherwise fall back to initialPlayers
  const players = wsPlayers;
  const userClientId = Number(userPlayer?.clientId ?? userPlayer?.id ?? -1);
  const getClientId = (p: MatchPlayer) =>
    Number(
      (p as unknown as Record<string, unknown>).clientId ??
        (p as unknown as Record<string, unknown>).id ??
        -1,
    );
  const userDetails = players.find(
    (p: MatchPlayer) => getClientId(p) === userClientId,
  );
  const isUserReady = userDetails?.ready || false;
  const leftPlayer = players.find(
    (p: MatchPlayer) => (p as unknown as playerInfo).team === "left",
  );
  const rightPlayer = players.find(
    (p: MatchPlayer) => (p as unknown as playerInfo).team === "right",
  );

  sessionStorage.setItem("RoomId", roomId);
  sessionStorage.setItem("playerSide", userDetails?.team || "unknown");

  const MatchPlayerCard: React.FC<{
    player: MatchPlayer;
    onClick: (id: number) => void;
  }> = ({ player, onClick }) => {
    const displayName = player.username;
    //console.log("[ MatchPlayerCard ] player:", player); ////debug
    return (
      <div key={player.id} className="flex-col-center gap-4">
        {/* player status */}
        <span
          className={`rounded-full px-3 py-2 ${
            player.ready ? "bg-green-400" : "bg-red-400"
          }`}
        >
          {player.ready ? translate("ready") : translate("pending")}
        </span>
        {/* player avatar and username */}
        <div
          className="flex-col-center gap-2 cursor-pointer"
          onClick={() => onClick(player.id)}
        >
          <Avatar src={player.spriteUrl} size={120} />
          {displayName && (
            <span title={displayName}>
              {displayName.length > 10
                ? displayName.slice(0, 10) + "…"
                : displayName}
            </span>
          )}
        </div>
      </div>
    );
  };

  let stageHeader;
  if (stage === "QF") stageHeader = translate("quarterfinals");
  else if (stage === "SF") stageHeader = translate("semifinals");
  else if (stage === "F") stageHeader = translate("finals");

  return (
    <Background>
      <Card size="wide">
        <TournamentHeader>{stageHeader}</TournamentHeader>
        {countdown !== null && countdown > 0 && (
          <div className="match-countdown text-white text-6xl font-bold">
            {countdown}
          </div>
        )}

        <div className="w-full flex-row-between px-2 font-bold text-white text-2xl text-center">
          {leftPlayer && (
            <MatchPlayerCard player={leftPlayer} onClick={setSelectedId} />
          )}
          {/* VS */}
          <span className="text-yellow-400 text-8xl font-extrabold">VS</span>
          {rightPlayer && (
            <MatchPlayerCard player={rightPlayer} onClick={setSelectedId} />
          )}
        </div>

        <Button variant="green" onClick={() => handleRoomReady(!isUserReady)}>
          {isUserReady ? translate("unready") : translate("ready")}
        </Button>
      </Card>
      {selectedId && (
        <ProfilePopup
          open={true}
          onClose={() => setSelectedId(null)}
          selectedId={selectedId}
          variant={selectedId === userPlayer.id ? "self" : "other"}
        />
      )}
    </Background>
  );
};
export default MatchView;
