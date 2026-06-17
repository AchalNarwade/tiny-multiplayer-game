const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Connecting to our clean Day 2 port
const ws = new WebSocket('ws://localhost:8089');

let myId = null;
let serverGameState = {};

// Day 2 Advanced Netcode Variables
let localX = 150;
let localY = 200;

// Local memory buffer to keep track of inputs until the server confirms them
let pendingInputs = []; 
let inputSequenceNumber = 0;

const SPEED = 5;

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'init') {
        myId = message.id;
        console.log("Successfully connected! My ID is:", myId);
    }

    if (message.type === 'state') {
        serverGameState = message.players;

        // SERVER RECONCILIATION
        if (myId && serverGameState[myId]) {
            const serverPlayer = serverGameState[myId];

            // 1. Snap our baseline back to the server's authoritative position
            localX = serverPlayer.x;
            localY = serverPlayer.y;

            // 2. Discard all inputs that the server has already processed
            pendingInputs = pendingInputs.filter(inputObj => {
                return inputObj.sequence > serverPlayer.lastProcessedInput;
            });

            // 3. REPLAY: Fast-forward remaining unacknowledged inputs on top of server position
            pendingInputs.forEach(inputObj => {
                if (inputObj.input === 'ArrowLeft')  localX -= SPEED;
                if (inputObj.input === 'ArrowRight') localX += SPEED;
                if (inputObj.input === 'ArrowUp')    localY -= SPEED;
                if (inputObj.input === 'ArrowDown')  localY += SPEED;
            });
        }
    }
};

// Capture Local Inputs
window.addEventListener('keydown', (e) => {
    const validKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (!validKeys.includes(e.key)) return;

    inputSequenceNumber++;

    // 1. CLIENT-SIDE PREDICTION: Move instantly on screen right now
    if (e.key === 'ArrowLeft')  localX -= SPEED;
    if (e.key === 'ArrowRight') localX += SPEED;
    if (e.key === 'ArrowUp')    localY -= SPEED;
    if (e.key === 'ArrowDown')  localY += SPEED;

    // 2. Store this movement in our history buffer
    pendingInputs.push({ sequence: inputSequenceNumber, input: e.key });

    // 3. Emit the network message out to the server with its tracking tag
    ws.send(JSON.stringify({ 
        type: 'move', 
        input: e.key, 
        sequence: inputSequenceNumber 
    }));
});

// Master Render Loop
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw OTHER players using raw data from the server
    for (let id in serverGameState) {
        if (id !== myId) {
            const remotePlayer = serverGameState[id];
            ctx.fillStyle = remotePlayer.color;
            ctx.fillRect(remotePlayer.x, remotePlayer.y, 30, 30);
        }
    }

    // 2. Draw YOUR player using local predicted/reconciled coordinates
    if (myId && serverGameState[myId]) {
        ctx.fillStyle = serverGameState[myId].color; 
        
        // Render local coordinates for instant, smooth response!
        ctx.fillRect(localX, localY, 30, 30);

        // Text tag helper
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.fillText("YOU (Predicted)", localX - 10, localY - 5);
    }

    requestAnimationFrame(drawGame);
}

// Start the loop
requestAnimationFrame(drawGame);