import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import MainLayout from "../layout/MainLayout";
import Card from "../components/Card";
import Logo from "../components/Logo";
import "../style.css";

const LocalTournamentSetup = () => {
  const [rows, setRows] = useState([
    { dropdown: "", input: "" },
    { dropdown: "", input: "" },
    { dropdown: "", input: "" },
    { dropdown: "", input: "" },
  ]);
  const navigate = useNavigate();

  const handleDropdownChange = (index: number, value: string) => {
    const newRows = [...rows];
    newRows[index].dropdown = value;
    setRows(newRows);
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow alphanumeric characters, max length 15
    const sanitized = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    const newRows = [...rows];
    newRows[index].input = sanitized;
    setRows(newRows);
  };

  const handleStart = () => {
    const allFilled = rows.every(
      (row) => row.dropdown.trim() !== "" && row.input.trim() !== "",
    );
    if (allFilled) {
      console.log("success");
      navigate("/local-game");
    } else {
      console.log("failure");
    }
  };

  return (
    <MainLayout>
      <Card className="gap-6">
        <Logo />
        <div className="space-y-4 mb-6 w-full">
          {rows.map((row, index) => (
            <div key={index} className="flex gap-4">
              <select
                value={row.dropdown}
                onChange={(e) => handleDropdownChange(index, e.target.value)}
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-gray-400"
              >
                <option value="" className="text-gray-300 bg-gray-700">
                  Select option
                </option>
                <option value="yellow" className="text-gray-900 bg-gray-200">
                  yellow
                </option>
                <option value="green" className="text-gray-900 bg-gray-200">
                  green
                </option>
                <option value="blue" className="text-gray-900 bg-gray-200">
                  blue
                </option>
                <option value="red" className="text-gray-900 bg-gray-200">
                  red
                </option>
                <option value="purple" className="text-gray-900 bg-gray-200">
                  purple
                </option>
                <option value="starry" className="text-gray-900 bg-gray-200">
                  starry
                </option>
                <option value="white" className="text-gray-900 bg-gray-200">
                  white
                </option>
                <option value="42" className="text-gray-900 bg-gray-200">
                  42
                </option>
              </select>
              <input
                type="text"
                value={row.input}
                onChange={(e) => handleInputChange(index, e.target.value)}
                placeholder="Enter text"
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
          Start
        </Button>
      </Card>
    </MainLayout>
  );
};

export default LocalTournamentSetup;
