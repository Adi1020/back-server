const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: ["https://stellar-spacetacle.onrender.com", "http://localhost:3000"],
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

let players = {};
let lastUpdate = {};

const THROTTLE_LIMIT = 50; // Adjust the throttle limit as needed

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('playerState', (state) => {
    const now = Date.now();
    if (!lastUpdate[socket.id] || (now - lastUpdate[socket.id]) > THROTTLE_LIMIT) {
      players[socket.id] = state;
      lastUpdate[socket.id] = now;

      // Create a new object excluding the requesting player's state
      const filteredPlayers = Object.keys(players)
        .filter(id => id !== socket.id)
        .reduce((acc, id) => {
          acc[id] = players[id];
          return acc;
        }, {});

      // Send the update to all clients except the one that sent the state
      socket.emit('updatePlayers', filteredPlayers);
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
