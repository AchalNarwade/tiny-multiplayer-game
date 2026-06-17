const { WebSocketServer } = require('ws');

// Using port 8089 to completely avoid background process conflicts
const wss = new WebSocketServer({ port: 8089 });

const players = {};
let idCounter = 0;

wss.on('connection', (ws) => {
    idCounter++;
    const playerId = `player_${idCounter}`;
    
    // Assign a starting position, color, and tracking sequence baseline
    players[playerId] = {
        x: 100 + (idCounter * 50),
        y: 200,
        color: idCounter === 1 ? '#ff4757' : '#2ed573', // Red for Player 1, Green for Player 2
        lastProcessedInput: 0 // Tracks the latest sequence number handled for this player
    };

    // Send the player their unique ID immediately
    ws.send(JSON.stringify({ type: 'init', id: playerId }));
    console.log(`👤 ${playerId} connected.`);

    // Handle incoming inputs from clients
    ws.on('message', (data) => {
        const message = JSON.parse(data);
        const player = players[playerId];

        if (!player) return;

        if (message.type === 'move') {
            const speed = 5;
            if (message.input === 'ArrowLeft')  player.x -= speed;
            if (message.input === 'ArrowRight') player.x += speed;
            if (message.input === 'ArrowUp')    player.y -= speed;
            if (message.input === 'ArrowDown')  player.y += speed;

            // CRUCIAL FOR RECONCILIATION: Tag the state with the client's input number
            player.lastProcessedInput = message.sequence;
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        console.log(`❌ ${playerId} disconnected.`);
    });
});

// FIXED TIMESTEP BROADCAST LOOP WITH ARTIFICIAL LAG
setInterval(() => {
    const payload = JSON.stringify({ type: 'state', players });
    
    wss.clients.forEach((client) => {
        if (client.readyState === 1) { 
            // DAY 2 CRITICAL: Force a 150ms delay before sending data back to the client
            setTimeout(() => {
                client.send(payload);
            }, 150);
        }
    });
}, 1000 / 30); // 30 updates per second (30Hz tickrate)

console.log("🚀 Day 2 Game Server running on ws://localhost:8089");