import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../components/Button";
import MainLayout from "../layout/MainLayout";
import Card from "../components/Card";
import Logo from "../components/Logo";
import "../style.css";

const LocalTournamentSetup = () => {
  const [rows, setRows] = useState([
    { dropdown: "yellow", input: "" },
    { dropdown: "yellow", input: "" },
    { dropdown: "yellow", input: "" },
    { dropdown: "yellow", input: "" },
  ]);
  const [selectedMap, setSelectedMap] = useState("stadium");
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showMatchupPopup, setShowMatchupPopup] = useState(false);
  const [matchupPairs, setMatchupPairs] = useState<any[][]>([]);
  const [pendingState, setPendingState] = useState<any>(null);

  const { t } = useTranslation();
  const translate = (key: string) => t(`LocalTournamentView.${key}`);

  useEffect(() => {
    if (error) {
      setShowError(true);
      const timer = setTimeout(() => setShowError(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleDropdownChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index].dropdown = value;
    setRows(newRows);
  };

  const handleInputChange = (index: number, value: string) => {
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    const newRows = [...rows];
    newRows[index].input = sanitized;
    setRows(newRows);
  };

  const handleMapChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMap(e.target.value);
  };

  const handleStart = () => {
    const allFilled = rows.every(
      (row) => row.dropdown.trim() !== "" && row.input.trim() !== "",
    );
    const names = rows
      .map((row) => row.input.trim().toLowerCase())
      .filter((name) => name !== "");
    const hasDuplicates = new Set(names).size !== names.length;

    if (!allFilled) {
      setError(
        translate(
          "please_fill_out_all_player_names_and_select_a_skin_for_each",
        ),
      );
    } else if (hasDuplicates) {
      setError(translate("player_names_must_be_unique"));
    } else {
      setError(null);

      const allPlayers = rows.map((row) => ({
        name: row.input,
        spriteUrl: `/assets/${row.dropdown}-ghost.png`,
      }));

      const shuffledPlayers = [...allPlayers];
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [
          shuffledPlayers[j],
          shuffledPlayers[i],
        ];
      }

      const rounds = [
        [shuffledPlayers[0], shuffledPlayers[1]],
        [shuffledPlayers[2], shuffledPlayers[3]],
      ];

      const state = {
        player1: rounds[0][0],
        player2: rounds[0][1],
        gameSettings: {
          map: selectedMap,
          ballSpeed: 1,
          ballSize: 1,
          paddleSpeed: 1,
        },
        type: "tournament",
      };

      sessionStorage.setItem("gameMode", "local-tournament");
      sessionStorage.setItem(
        "tournamentData",
        JSON.stringify({
          round: 1,
          allPlayers: shuffledPlayers,
          rounds: rounds,
          winners: [],
        }),
      );

      setMatchupPairs(rounds);
      setPendingState(state);
      setShowMatchupPopup(true);

      // Do not navigate yet; wait for user to confirm
      // navigate("/local-game", { state: state });
    }
  };

  const handleContinue = () => {
    setShowMatchupPopup(false);
    if (pendingState) {
      navigate("/local-game", { state: pendingState });
    }
  };

  return (
    <MainLayout>
      <Card className="gap-2">
        <Logo />
        <div className="space-y-2 mb-2 w-full">
          <div className="flex gap-4 items-center font-semibold text-white text-lg mb-2"></div>
          <div className="mb-4">
            <label className="block text-white font-semibold mb-2">
              {translate("map")}
            </label>
            <select
              value={selectedMap}
              onChange={handleMapChange}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-400"
            >
              <option value="stadium" className="text-gray-900 bg-gray-200">
                {translate("stadium")}
              </option>
              <option value="mansion" className="text-gray-900 bg-gray-200">
                {translate("mansion")}
              </option>
              <option value="arcade" className="text-gray-900 bg-gray-200">
                {translate("arcade")}
              </option>
            </select>
          </div>
          <div className="flex gap-4 items-center font-semibold text-white text-lg mb-2">
            <div className="flex-1 text-center">{translate("skin")}</div>
            <div className="flex-1 text-center">{translate("name")}</div>
          </div>
          {rows.map((row, index) => (
            <div key={index} className="flex gap-4 items-center">
              <select
                value={row.dropdown}
                onChange={(e) => handleDropdownChange(index, e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-400"
              >
                <option value="yellow" className="text-gray-900 bg-gray-200">
                  {translate("yellow")}
                </option>
                <option value="green" className="text-gray-900 bg-gray-200">
                  {translate("green")}
                </option>
                <option value="blue" className="text-gray-900 bg-gray-200">
                  {translate("blue")}
                </option>
                <option value="red" className="text-gray-900 bg-gray-200">
                  {translate("red")}
                </option>
                <option value="purple" className="text-gray-900 bg-gray-200">
                  {translate("purple")}
                </option>
                <option value="starry" className="text-gray-900 bg-gray-200">
                  {translate("starry")}
                </option>
                <option value="white" className="text-gray-900 bg-gray-200">
                  {translate("white")}
                </option>
                <option value="42" className="text-gray-900 bg-gray-200">
                  {translate("forty_two")}
                </option>
              </select>
              <input
                type="text"
                value={row.input}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder={
                  translate("player") + ` ${index + 1} ` + translate("name")
                }
                maxLength={15}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>
          ))}
        </div>
        <Button
          onClick={handleStart}
          className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {translate("start")}
        </Button>
        {error && (
          <div
            className={`fixed bottom-8 right-8 z-50 transition-opacity duration-300 ${
              showError ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="bg-gray-900 bg-opacity-90 p-4 rounded-lg shadow-lg border border-red-500 text-white flex items-center">
              <span>{error}</span>
            </div>
          </div>
        )}
        {showMatchupPopup && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}
          >
            <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center min-w-[320px] ">
              <h2 className="text-4xl font-bold mb-4 text-gray-900">
                {translate("tournament_matchups")}
              </h2>
              <div className="mb-6 flex flex-col items-center">
                {matchupPairs.map((pair, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="text-2xl text-gray-800 mb-2">
                      <span className="font-semibold">{` `}</span>
                      <span className="font-semibold">{pair[0].name}</span>
                      {" " + translate("vs") + " "}
                      <span className="font-semibold">{pair[1].name}</span>
                    </div>
                    {idx < matchupPairs.length && (
                      <div className="text-4xl text-gray-500 mb-2">↓</div>
                    )}
                  </div>
                ))}
                <div className="text-2xl text-gray-800 mb-2">
                  <span className="font-semibold"></span> ???
                </div>
              </div>
              <Button
                className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 text-lg"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </div>
          </div>
        )}
      </Card>
    </MainLayout>
  );
};

export default LocalTournamentSetup;
