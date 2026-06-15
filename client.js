const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const ws = new WebSocket('ws://localhost:8080');

let myId = null;
let serverGameState = {};

// 1. Listen for data from the server
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'init') {
        myId = message.id;
        console.log("Connected as:", myId);
    }

    if (message.type === 'state') {
        // Save the latest authoritative data from the server
        serverGameState = message.players;
    }
};

// 2. Capture and send inputs to the server immediately
window.addEventListener('keydown', (e) => {
    const validKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (validKeys.includes(e.key)) {
        // Send the input intention to the server
        ws.send(JSON.stringify({ type: 'move', input: e.key }));
    }
});

// 3. Client Render Loop (Runs as fast as your screen refreshes)
function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all players sent by the server state
    for (let id in serverGameState) {
        const player = serverGameState[id];

        ctx.fillStyle = player.color;
        ctx.fillRect(player.x, player.y, 30, 30); // Draw a 30x30 square

        // Draw a tiny text label above our own player
        if (id === myId) {
            ctx.fillStyle = '#fff';
            ctx.fillText("YOU", player.x + 3, player.y - 5);
        }
    }

    requestAnimationFrame(drawGame);
}

// Start the drawing loop
requestAnimationFrame(drawGame);