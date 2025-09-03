export function startGlobalChat() {
  const socket = new WebSocket(`ws://${window.location.hostname}:4242/ws?scope=global`);

  const chatBox = document.createElement("div");
  chatBox.id = "globalChatBox";
  chatBox.style.width = "600px";
  chatBox.style.height = "150px";
  chatBox.style.overflowY = "auto";
  chatBox.style.border = "2px solid gray";
  chatBox.style.marginTop = "10px";
  chatBox.style.padding = "5px";
  document.body.appendChild(chatBox);

  const chatInput = document.createElement("input");
  chatInput.id = "globalChatInput";
  chatInput.type = "text";
  chatInput.placeholder = "Global chat...";
  chatInput.style.width = "600px";
  chatInput.style.marginTop = "5px";
  document.body.appendChild(chatInput);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "chat" && data.scope === "global") {
      const msgDiv = document.createElement("div");
      const time = new Date(data.time).toLocaleTimeString();
      msgDiv.textContent = `[GLOBAL ${time}] ${data.from}: ${data.text}`;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  };

  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && chatInput.value.trim() !== "") {
      socket.send(JSON.stringify({
        type: "chat",
        text: chatInput.value.trim()
      }));
      chatInput.value = "";
    }
  });
}
