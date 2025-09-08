
// chat.ts
let chatSocket: WebSocket | null = null;
export let chatHistory: { time: string; from: string; text: string }[] = [];

export function initChatConnection() {
    if (chatSocket) return; // already connected

    chatSocket = new WebSocket(`ws://${window.location.hostname}:4242/chat`);

    chatSocket.onopen = () => {
        console.log("Chat connected");
    };

    chatSocket.onclose = () => {
        console.log("Chat disconnected");
    };

    chatSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
		const time = new Date(data.time).toLocaleTimeString();
        if (data.type === "chat") {
			if (data.from === "system") {
				// chatHistory.push({ time, from: "System", text: data.text });
				renderSystemMessage(time, data.text);
			} else {
				// chatHistory.push({ time, from: data.from, text: data.text });
				renderChatMessage(time, data.from, data.text);
			}
		}
	};
}

function renderSystemMessage(time: string, text: string) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    const msgDiv = document.createElement("div");
    msgDiv.textContent = `[${time}] 🔔 System: ${text}`;
    msgDiv.style.color = "gray";
    msgDiv.style.fontWeight = "bold";
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function renderChatMessage(time: string, from: string, text: string) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    const msgDiv = document.createElement("div");
    msgDiv.textContent = `[${time}] ${from}: ${text}`;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

export function initChatUI() {
    // prevent duplicate UI
    if (document.getElementById("chatBox")) return;

    const container = document.createElement("div");
    container.id = "chatContainer";
    container.style.position = "fixed";
    container.style.right = "20px";
    container.style.bottom = "20px";
    container.style.width = "400px";
    container.style.height = "200px";
    container.style.border = "1px solid black";
    container.style.background = "white";
    container.style.display = "flex";
    container.style.flexDirection = "column";

    const chatBox = document.createElement("div");
    chatBox.id = "chatBox";
    chatBox.style.flex = "1";
    chatBox.style.overflowY = "auto";
    container.appendChild(chatBox);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a message...";
    input.onkeydown = (e) => {
        if (e.key === "Enter" && input.value.trim()) {
            sendChatMessage(input.value.trim());
            input.value = "";
        }
    };
    container.appendChild(input);

    document.body.appendChild(container);

    // re-render history when UI rebuilds
    chatHistory.forEach((m) => renderChatMessage(m.time, m.from, m.text));
}

export function sendChatMessage(text: string) {
    if (chatSocket && chatSocket.readyState === WebSocket.OPEN) {
        chatSocket.send(
            JSON.stringify({
                type: "chat",
                from: sessionStorage.getItem("pongClientId") || "Guest",
                text,
            })
        );
    }
}
