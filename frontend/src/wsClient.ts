export interface WSClientOptions {
    clientId: string;
    roomId: string;
    chooseSide?: "left" | "right";
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (err: any) => void;
    onMessage?: (data: any) => void;
}

export function createWSClient(options: WSClientOptions) {
    const { clientId, roomId, chooseSide, onOpen, onClose, onError, onMessage } = options;

    const wsUrl = `ws://${window.location.hostname}:4242/ws?id=${clientId}&room=${roomId}${chooseSide ? `&side=${chooseSide}` : ""}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log("Server connected");
        onOpen && onOpen();
    };

    socket.onclose = () => {
        console.log("Server disconnected");
        if (onClose) onClose();
    };

    socket.onerror = (err) => {
        console.error("Socket encountered error: ", err, "Closing socket");
        if (onError) onError(err);
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
        } catch (error) {
            console.error("Error parsing WebSocket message: ", error);
        }
    };

    function sendMessage(message: any) {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not open. Ready state: ", socket.readyState);
        }
    }

    return { socket, sendMessage };
}
