"use client";

import { useState, useEffect } from "react";

type User = {
  id: number;
  username: string;
};

function randomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetch("http://localhost:3000/users")
      .then((res) => res.json())
      .then((result) => setUsers(result.data))
      .catch((err) => console.error("Error fetching users:", err));
  }, []);

  const addOrUpdateUser = async () => {
    if (!username.trim()) return;
    if (editingId !== null) {
      // * UPDATE

      const res = await fetch(`http://localhost:3000/users/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
        }),
      });

      const { data: updatedUser } = await res.json();
      console.log("editingId:", editingId, typeof editingId);
      console.log("updatedUser:", updatedUser, typeof updatedUser.id);

      if ("error" in updatedUser) {
        alert(updatedUser.error); // or set some error state
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingId ? updatedUser : u)),
        );
      }
      setEditingId(null);
    } else {
      // * CREATE
      const randomEmail = `${randomString(10)}@gmail.com`; // ! TMP

      const res = await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email: randomEmail, // ! HARDCODED
          password: "test", // ! HARDCODED
        }),
      });

      const { data: newUser } = await res.json();
      console.log(newUser);
      if ("error" in newUser) {
        alert(newUser.error); // or set some error state
      } else {
        setUsers((prev) => [...prev, newUser]);
      }
    }
    setUsername("");
  };

  // * DELETE
  const deleteUser = async (id: number) => {
    const res = await fetch(`http://localhost:3000/users/${id}`, {
      method: "DELETE",
    });
    const { data: deletedUser } = await res.json();
    console.log("deletedUser:", deletedUser);
    if ("error" in deletedUser) {
      alert(deletedUser.error); // or set some error state
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== Number(deletedUser.id)));
      console.log("DELETED USER");
    }
  };

  // READ + start UPDATE
  const editUser = (id: number) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      setUsername(user.username);
      setEditingId(user.id);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-center">Username CRUD</h1>

        {/* Input + Button */}
        <div className="mb-4 flex space-x-2">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            className="flex-1 rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addOrUpdateUser}
            className="rounded-lg bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-600"
          >
            {editingId ? "Update" : "Add"}
          </button>
        </div>

        {/* Users List */}
        <ul className="space-y-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span>{user.username}</span>
              <div className="space-x-2">
                <button
                  onClick={() => editUser(user.id)}
                  className="rounded bg-yellow-400 px-2 py-1 text-sm font-medium text-white hover:bg-yellow-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteUser(user.id)}
                  className="rounded bg-red-500 px-2 py-1 text-sm font-medium text-white hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {users.length === 0 && (
          <p className="mt-4 text-center text-gray-500">No usernames yet.</p>
        )}
      </div>
    </div>
  );
}

export default App;
