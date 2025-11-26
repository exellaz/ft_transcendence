#!/bin/bash

TOKEN="replace-with-jwt-token"
ROOM=$1

# ===== Function to create a websocat coprocess =====
# Usage: connect_ws <coproc_name> <url>
connect_ws() {
    local name=$1
    local url=$2

    # Create a named coprocess
    coproc "$name" {
        websocat -k -t --protocol "$TOKEN" "$url"
    }

    # Set file descriptors
    eval "FD_WRITE=\${$name[1]}"
    eval "FD_READ=\${$name[0]}"
}

# ===== PART 1: ROOM ======
echo "====== PART 1: ROOM ======"
ROOM_URL="wss://localhost:3000/ws-room?room=$ROOM&side=right"
connect_ws WS_ROOM "$ROOM_URL"

# Wait for server's handshakePing first
echo "--- waiting for server handshake ---"
read -r ROOM_MSG <&$FD_READ
echo "Room server says: $ROOM_MSG"

# Now send handshakePong response
echo '{ "type": "handshakePong", "clientId": 1 }' >&$FD_WRITE
echo "--- sent room handshake ---"

# Send ready
echo '{ "type": "ready", "ready": true }' >&$FD_WRITE
echo "--- sent room ready ---"

# Wait for gameStart
while read -r LINE <&$FD_READ; do
    echo "Room server: $LINE"
    if [[ $LINE == *'"type":"gameStart"'* ]]; then
        echo "Game started! Closing room connection..."
        exec {FD_WRITE}>&-
        exec {FD_READ}<&-
        break
    fi
done

sleep 2

# ===== PART 2: GAME ======
echo "====== PART 2: GAME ======"
GAME_URL="wss://localhost:3000/ws-game?room=$ROOM&side=right&sprite=test"
connect_ws WS_GAME "$GAME_URL"

# Wait for first server message
read -r GAME_MSG <&$FD_READ
echo "Game server says: $GAME_MSG"

# Send handshakePong
echo '{ "type": "handshakePong" }' >&$FD_WRITE
echo "--- sent game handshake ---"

# Send ready
echo '{"type":"ready","payload":{}, "ready": true }' >&$FD_WRITE
echo "--- sent game ready ---"

# ===== PART 3: Read arrow keys from CLI and send input =====
echo "Use ArrowUp / ArrowDown to move. Press Ctrl+C to exit."

# Save original terminal settings
stty_orig=$(stty -g)
stty -echo -icanon time 0 min 0

# Trap to restore terminal on exit
trap "stty $stty_orig; exit" INT TERM

while true; do
    IFS= read -rsn1 key
    if [[ $key == $'\e' ]]; then
        IFS= read -rsn2 -t 0.1 rest
        key+=$rest
        case $key in
            $'\e[A')
                echo '{ "type": "input", "payload": { "key": "ArrowUp", "action": "hold" } }' >&$FD_WRITE
                echo "Sent ArrowUp"
                ;;
            $'\e[B')
                echo '{ "type": "input", "payload": { "key": "ArrowDown", "action": "hold" } }' >&$FD_WRITE
                echo "Sent ArrowDown"
                ;;
        esac
    fi

    # Non-blocking read of server messages
    while read -t 0.01 -r LINE <&$FD_READ; do
        echo "Game server: $LINE"
    done
done