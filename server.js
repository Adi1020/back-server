// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Use CORS middleware for Express
app.use(cors());

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your front-end URL
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

let players = {};
let lastUpdate = {};

const THROTTLE_LIMIT = 100; // Adjust the throttle limit as needed (e.g., 100ms)

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('playerState', (state) => {
    const now = Date.now();
    if (!lastUpdate[socket.id] || (now - lastUpdate[socket.id]) > THROTTLE_LIMIT) {
      players[socket.id] = state;
      lastUpdate[socket.id] = now;

      // Send the update to all clients except the one that sent the state
      for (const id in players) {
        if (id !== socket.id) {
          socket.to(id).emit('updatePlayers', { [socket.id]: state });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('updatePlayers', players);
  });
});

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
