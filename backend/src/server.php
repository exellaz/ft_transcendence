<?php
error_reporting(E_ALL); //show all php erro
set_time_limit(0); //disable time limit to run
ob_implicit_flush(); //send output without buffering

// Server config
$host = '0.0.0.0';
$port = 4242;

// ---- GAME STATS ----
$gameState = [
	'ball' => ['x'=>300,'y'=>200,'dx'=>2,'dy'=>2],	//position of ball
	'paddles' => ['left'=>150,'right'=>150],		//position of paddles
	'score' => ['left' => 0, 'right' => 0]			//score
];

$clients = [];			// client socket
$roles = [];			// role: 'left', 'right'
$clientRoles = [];		// clientID => role
$socketToClientID = []; // socket resource id => clientID
$recvBuffer = [];		// socket resource id => buffer
$gameHeight = NULL;		// game height
$gameWidth = NULL;		// game width

// ---- CREATE SERVER SOCKET ----
$server = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);		//create TCP socket
socket_set_option($server, SOL_SOCKET, SO_REUSEADDR, 1);	//reuseable port
socket_bind($server, $host, $port);							//bind socket to host and port
socket_listen($server);										//listen the incoming connection

echo "Pong WebSocket Server started on $host:$port\n";

// ---- LOOP ----
while (true) {
	$read = array_merge([$server], $clients);			//create an array if server socket and all connected client socket
	$write = $except = null;							//set both write and except to null (reduce check)
	socket_select($read, $write, $except, 0, 10000);	//wait for socket to be ready for 10ms

	//loop through all the sockets that are ready
	foreach ($read as $sock) {
		//if socket is the server socket
		if ($sock === $server) {
			// ---- NEW CONNECTION ----
			$client = socket_accept($server);	//accept new connection
			$clients[] = $client;				//add new connection to client array
			$clientSockets = [];

			// ---- HANDSHAKE ----
			$request = socket_read($client, 5000);				//read the handshake request from client for 5 seconds
			perform_handshake($request, $client, $host, $port); //respond the handshake

			// ---- ASSIGN CLIENT ID ----
			$clientID = spl_object_id($client); //get a unique ID for client (spl_object_id: generates a unique ID for the object)

			// ---- ASSIGN ROLE ----
			if (isset($clientRoles[$clientID])) {		//check if client has connect before
				$role = $clientRoles[$clientID];		//reuse the role
			} else {
				$role = 'spectator';					//set a default role
				if (!in_array('player1',$roles)) {			//check if player1 role is available
					$role='player1';						//assign player1 role
					$roles[]='player1';					//store the role
				} elseif (!in_array('player2',$roles)) {	//check if player2 role is available
					$role='player2';						//assign player2 role
					$roles[]='player2';					//store the role
				}
				$clientRoles[$clientID] = $role; 		//store each role to specific clientID
			}

			//link socket to clientID
			$socketToClientID[spl_object_id($client)] = $clientID;

			//send assign role to the client
			socket_write($client, encode(json_encode(['type'=>'role','role'=>$role])));
			echo "Client ({$role}) connected\n";
		} else { //if its a client socket
			// ---- RECEIVE MESSAGE ----
			$data = @socket_read($sock, 2048, PHP_BINARY_READ); //read client data

			$clientID = spl_object_id($sock);					//get client ID
			$role = $clientRoles[$clientID] ?? 'spectator';		//get client role

			// ---- DISCONNECT ----
			if ($data === false || strlen($data) == 0) {	//if no data is received
			    removeClient($sock);						//remove the client and continue
			    continue;
			}

			// ---- DECODE MESSAGE ----
			$messages = decode($data);						//decode the websocket message

			foreach ($messages as $msg) {					//loop through all messages
			    // echo "RAW message: $msg\n";
			    $decoded = json_decode($msg, true);			//decode the json message
			    // var_dump($decoded);

				if (!$decoded) continue;					// if not a valid json, skip

				if ($decoded && $decoded['type']==='move') {				//handle paddle movement
					$r = $decoded['role'];									//which paddle to move
					$dy = $decoded['dy'];									//amount to move
					$paddleHeight = 80;										//paddle height
					if ($r==='player1')										//if is player1 paddle, then move player1 paddle
						$gameState['paddles']['left'] = max(0, min($gameHeight - $paddleHeight, $gameState['paddles']['left'] + $dy));
					if ($r==='player2')										//if is player2 paddle, then move player2 paddle
						$gameState['paddles']['right'] = max(0, min($gameHeight - $paddleHeight, $gameState['paddles']['right'] + $dy));
				} elseif ($decoded && $decoded['type'] === 'setHeight') {	//handle the game height change
					$gameHeight = intval($decoded['height']);				//set the game height
				} elseif ($decoded && $decoded['type'] === 'setWidth') {	//handle the game width change
					$gameWidth = intval($decoded['width']);					//set the game width
				}
			}

		}
	}

	// ---- UPDATE BALL ----
	updateTheBall($gameState);
	// echo "width: $gameWidth, height: $gameHeight\n";

	// ---- BROADCAST STATE ----
	foreach ($clients as $c) {				//send the game state to each client
		@socket_write($c, encode(json_encode(['type'=>'state','gameState'=>$gameState]))); //encode the message before sending
	}
	usleep(1000);
}

// --------- Functions ---------

// remove client from all arrays and close the socket
function removeClient($sock) {
	global $clients, $roles, $clientRoles, $socketToClientID;		//get the global variable value
	$key = array_search($sock, $clients);							//Find the client in the array
	if ($key !== false) unset($clients[$key]);						//if found, unset the client

	$clientID = $socketToClientID[spl_object_id($sock)] ?? null;	//get the clientID
	if ($clientID) {												//if found
		$role = $clientRoles[$clientID] ?? 'spectator';				//get the role
		if (($idx = array_search($role, $roles)) !== false) {		//if found, unset the role
			unset($roles[$idx]);
			$roles = array_values($roles);							//reindex the array
		}
		unset($clientRoles[$clientID]);								//unset the clientID to role mapping
		unset($socketToClientID[spl_object_id($sock)]);				//unset the socket to clientID mapping
	} else {														//if not found
		$role = 'spectator';										//set role to spectator
	}

	socket_close($sock);											//close the socket
	echo "Client ({$role}) disconnected\n";
}


// allow client and server communicate
function perform_handshake($request, $client, $host, $port) {
	if (preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $request, $matches)) {							//get the websocket key
		$key = trim($matches[1]);																	//trim any whitespace
		$acceptKey = base64_encode(pack('H*', sha1($key.'258EAFA5-E914-47DA-95CA-C5AB0DC85B11')));	//generate the accept key
		$headers = "HTTP/1.1 101 Switching Protocols\r\n" .											//create the response headers
				   "Upgrade: websocket\r\n" .
				   "Connection: Upgrade\r\n" .
				   "Sec-WebSocket-Accept: $acceptKey\r\n\r\n";
		socket_write($client, $headers);															//send the headers to client
	}
}

// wrap message into websocket frame format so client will understand
//without encode, browser receives raw tcp data, so it doesn't know its a websocket message
function encode($payload) {
	$frame = [];
	$frame[0] = 0x81;					// first byte: FIN + opcode
	$len = strlen($payload);			// payload length
	if ($len <= 125)					//if length is less than 126
		$frame[1] = $len;				// second byte: MASK + payload length
	elseif ($len <= 65535) {			//if length is less than 65536
		$frame[1] = 126;				// second byte: MASK + 126
		$frame[2] = ($len >> 8) & 0xFF;	// third byte: payload length (most significant byte)
		$frame[3] = $len & 0xFF;		// fourth byte: payload length (least significant byte)
	}
	$frame = array_map("chr",$frame);	//convert each frame byte into character
	return implode('',$frame).$payload;	//append the payload to the frame and return
}

// convert incoming websocket frame back to plain JSON/text so server can understand
function decode($data) {
    $messages = [];

    while (strlen($data) > 0) { 			//while there is still data in the buffer
        $len = ord($data[1]) & 127;			//second byte & 127 to get the payload length
        $masks = '';						//masking key
        $dataStart = 2;						//start of the payload data

        if ($len === 126) {									//if length is 126, then next 2 bytes are the payload length
            $masks = substr($data, 4, 4);					//masking key
            $length = unpack('n', substr($data, 2, 2))[1];	//payload length
            $dataStart = 8;									//start of the payload data
        } elseif ($len === 127) {							//if length is 127, then next 8 bytes are the payload length
            $masks = substr($data, 10, 4);					//masking key
            $length = unpack('J', substr($data, 2, 8))[1];	//payload length
            $dataStart = 14;								//start of the payload data
        } else {											//if length is <=125, then that is the payload length
            $masks = substr($data, 2, 4);					//masking key
            $length = $len;									//payload length
            $dataStart = 6;									//start of the payload data
        }

        $frame = substr($data, $dataStart, $length);	//get the payload data
        $decoded = '';
        for ($i = 0; $i < $length; ++$i) {				//decode the payload data
            $decoded .= $frame[$i] ^ $masks[$i % 4];
        }

        $messages[] = $decoded;							//store the decoded message

        $data = substr($data, $dataStart + $length);	//remove the processed frame from the buffer
    }

    return $messages;	//return all decoded messages
}

//reset the ball to the middle position
function resetBall(&$ball, $scoredSide) {
	global $gameWidth, $gameHeight;
    $ball['x'] = $gameWidth ? $gameWidth / 2 : 300;
    $ball['y'] = $gameHeight ? $gameHeight / 2 : 200;

	$ball['dx'] = ($scoredSide === 'left') ? -2 : 2; // Ball moves towards the side that conceded the point
	$ball['dy'] = (rand(0,1) ? -1 : 1) * (2 + rand(0,1)); // Randomize vertical direction and speed
}

// update the ball position
function updateTheBall(&$gameState) {
	global $gameHeight, $gameWidth;
	$ball = &$gameState['ball'];	//reference to the ball array
	$ball['x'] += $ball['dx'];		//update ball's x position
	$ball['y'] += $ball['dy'];		//update ball's y position

	$paddleHeight = 80;				//paddle height
	$paddleWidth = 20;				//paddle width
	$ballRadius = 10;				//ball radius

	// Bounce top/bottom
	if ($gameHeight !== null) {
		if ($ball['y'] <= 0) {					//if the ball touch top
			$ball['y'] = 0;						//reset the ball position to top
			$ball['dy'] *= -1;					//move the ball downwards
		} elseif ($ball['y'] >= $gameHeight) {	//if the ball touch down
			$ball['y'] = $gameHeight;			//reset the ball position to down
			$ball['dy'] *= -1;					//move the ball upwards
		}
	}

	// Left paddle collision
	if ($ball['x'] <= $paddleWidth) {										//if the ball touch the left paddle
		if ($ball['y'] >= $gameState['paddles']['left'] &&					//if the ball y position is within the paddle height
			$ball['y'] <= $gameState['paddles']['left'] + $paddleHeight) {
			$ball['dx'] *= -1;												//reverse the ball horizontal direction. make it bounce back
			$ball['x'] = $paddleWidth;										//set ball position to the edge of the paddle to prevent sticking or pass trhough
		}
	}

	// Right paddle collision
	if ($gameWidth !== null && $ball['x'] + $ballRadius >= $gameWidth - $paddleWidth) {
		if ($ball['y'] >= $gameState['paddles']['right'] &&
			$ball['y'] <= $gameState['paddles']['right'] + $paddleHeight) {
			$ball['dx'] *= -1;
			$ball['x'] = $gameWidth - $paddleWidth - $ballRadius;
		}
	}

	// Reset if out of bounds
	if ($ball['x'] + $ballRadius < 0) {											//if the ball go out of left bound
		$gameState['score']['right']++;		//increment player2 score
		resetBall($ball, 'right');
	} elseif ($gameWidth !== null && $ball['x'] - $ballRadius > $gameWidth) {	//if the ball go out of right bound
		$gameState['score']['left']++;		//increment player1 score
		resetBall($ball, 'left');
	}
}
