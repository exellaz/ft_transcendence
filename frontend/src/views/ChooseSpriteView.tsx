import React, { useState } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import {
  createTournamentLobby,
  fetchTournaments,
} from "../lib/requestBackend.api";
import type { User } from "@/types/usersApi";
import { useUser } from "@/context/UserProvider";

import Background from "../components/Background";
import Card from "../components/Card";
import ChooseSpriteContents from "../components/ChooseSpriteContents";
import type { TournamentLobby } from "../../../backend/src/types/interface";

async function handleJoinTournament(
  user: User | null,
  navigate: NavigateFunction,
  selectedSprite?: string,
) {
  if (!user) return;

  // 1. Fetch existing tournaments
  const tournaments = await fetchTournaments();

  // 2. Find one that isn't full (max 8) and hasn't started
  let tournament = tournaments.find(
    (t: TournamentLobby) =>
      !t.lock && t.players.length < 8 && t.maxPlayer === 8,
  );
  //  console.log("Found tournament:", tournament);

  // 3. If no suitable tournament, create one
  if (!tournament) {
    tournament = await createTournamentLobby("Tournament " + Date.now());
    //console.log("Created new tournament:", tournament);
    if (!tournament) {
      alert("Failed to create tournament");
      return;
    }
  }

  // 4. Navigate into the tournament lobby
  navigate(`/tournament/${tournament.id}`, {
    state: { tournament, selectedSprite },
  });
}

const ChooseSpriteView: React.FC = () => {
  const [selectedSprite, setSelectedSprite] = useState<string>("");
  const navigate = useNavigate();
  const { user } = useUser();

  return (
    <Background>
      <Card size="wide">
        <ChooseSpriteContents
          selected={selectedSprite}
          onSelectSprite={setSelectedSprite}
          onConfirm={async () => {
            if (!selectedSprite) {
              alert("Please choose a sprite before continuing");
              return;
            }

            // attach the chosen sprite to the user
            if (!user || typeof user.id !== "number") {
              alert("User information is incomplete");
              return;
            }

            //navigate to the tournament lobby
            await handleJoinTournament(user, navigate, selectedSprite);
          }}
          onClose={() => {
            navigate("/main-menu");
          }}
        />
      </Card>
    </Background>
  );
};

export default ChooseSpriteView;
