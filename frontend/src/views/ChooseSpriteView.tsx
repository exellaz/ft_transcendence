import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTournamentLobby,
  fetchTournaments,
} from "../lib/requestBackend.api";

import Background from "../components/Background";
import Card from "../components/Card";
import ChooseSpriteContents from "../components/ChooseSpriteContents";

async function handleQuickJoinTournament(user: any, navigate: any) {
  if (!user) return;

  // 1. Fetch existing tournaments
  const tournaments = await fetchTournaments();

  // 2. Find one that isn't full (max 8) and hasn't started
  let tournament = tournaments.find(
    (t: any) => !t.started && t.players.length < 8,
  );

  // 3. If no suitable tournament, create one
  if (!tournament) {
    tournament = await createTournamentLobby("Weekend Cup");
    if (!tournament) {
      alert("Failed to create tournament");
      return;
    }
  }

  // 4. "Join" happens by adding current user to the tournament.players array
  //    You can simulate this on frontend until you wire backend
  if (!tournament.players.some((p: any) => p.id === user.id)) {
    tournament.players.push({
      id: user.id,
      name: user.name,
      sprite: user.sprite,
    });
  }

  // 5. Navigate into the tournament lobby
  navigate(`/tournament/${tournament.id || tournament.tournamentId}`, {
    state: { tournament, player: user },
  });
}

const ChooseSpriteView: React.FC = () => {
  const [selectedSprite, setSelectedSprite] = useState<string>("");
  const navigate = useNavigate();
  return (
    <Background>
      <Card size="wide">
        <ChooseSpriteContents
          selected={selectedSprite}
          onSelectSprite={setSelectedSprite}
          onConfirm={async () => {
            navigate("/tournament");
          }}
        />
      </Card>
    </Background>
  );
};

export default ChooseSpriteView;
