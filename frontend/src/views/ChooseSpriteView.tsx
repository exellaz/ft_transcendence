import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTournamentLobby,
  fetchTournaments,
} from "../lib/requestBackend.api";
import type { User } from "@/types/usersApi";
import { useUser } from "@/context/UserProvider";

import Background from "../components/Background";
import Card from "../components/Card";
import ChooseSpriteContents from "../components/ChooseSpriteContents";
import { updateUserById, updateUserSettingsById } from "@/lib/usersApiClient";

async function handleJoinTournament(user: User | null, navigate: any) {
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
//  if (!tournament.players.some((p: User) => p.id === user.id)) {
//    tournament.players.push({
//      id: user.id,
//      name: user.username,
//      sprite: user.avatarUrl,
//    });
//  }

  // 5. Navigate into the tournament lobby
  navigate(`/tournament/${tournament.id}`, {
    state: { tournament },
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

            //update user avatarUrl
            const player: User = {
              ...user,
              avatarUrl: selectedSprite,
            };

            //update the user avatar in database
            updateUserById(player).catch((err) => {
                console.error("Failed to update user avatar:", err);
            });
            console.log("Chosen sprite:", selectedSprite, "for user:", player);

            //navigate to the tournament lobby
            await handleJoinTournament(player, navigate);
          }}
        />
      </Card>
    </Background>
  );
};

export default ChooseSpriteView;
