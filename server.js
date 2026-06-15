const { WebSocketServer } = require('ws');

//web socket on port 8080
const wss = new WebSocketServer({port : 8080});

//store connected players and their positions
const players = {};
let idCounter = 0;

console.log("Game server running on ws://localhost:8080");

wss.on('connection',(ws) => {
    // FIXED: Changed single quotes to backticks
    const playerId = `player_${++idCounter}`;

    //assign starting position for new player
    players[playerId] = {x:100 + (idCounter *50),y:200,color : idCounter === 1 ? 'red' : 'blue'};

    //tell client their unique id
    ws.send(JSON.stringify({ type : 'init',id: playerId}));

    // FIXED: Changed single quotes to backticks
    console.log(`👤 ${playerId} joined the game.`);

    // Listen for messages (inputs) from this specific client
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);

            if (message.type === 'move') {
                const player = players[playerId];
                if (!player) return;

                // AUTHORITATIVE SERVER LOGIC: 
                // The server modifies the position based on client intent.
                const speed = 5;
                if (message.input === 'ArrowLeft')  player.x -= speed;
                if (message.input === 'ArrowRight') player.x += speed;
                if (message.input === 'ArrowUp')    player.y -= speed;
                if (message.input === 'ArrowDown')  player.y += speed;
            }
        } catch (err) {
            console.error("Invalid packet received:", err);
        }
    });

    // Handle disconnection
    ws.on('close', () => {
        console.log(`❌ ${playerId} left.`);
        delete players[playerId];
    });
});

// Broadcast the game state to all players 30 times a second (~33ms)
setInterval(() => {
    const payload = JSON.stringify({ type: 'state', players });
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { // 1 means OPEN
            client.send(payload);
        }
    });
}, 1000 / 30);