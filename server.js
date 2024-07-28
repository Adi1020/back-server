const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new Server(server, {
  cors: {
    origin: ["https://stellar-spacetacle.onrender.com", "https://skyone.ofektechnology.com", "http://localhost:3000"  ],
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

let players = {};
let projectiles = [];
let explosions = [];
let lastUpdate = {};
const THROTTLE_LIMIT = 50;

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  players[socket.id] = { health: 100, takedowns: 0 }; // Initialize player data

  // Update all clients with the current number of connected users
  io.emit('connectedUsers', Object.keys(players).length);

  socket.on('playerState', (state) => {
    const now = Date.now();
    if (!lastUpdate[socket.id] || (now - lastUpdate[socket.id]) > THROTTLE_LIMIT) {
      players[socket.id] = { ...players[socket.id], ...state };
      lastUpdate[socket.id] = now;

      const filteredPlayers = Object.keys(players)
        .filter(id => id !== socket.id)
        .reduce((acc, id) => {
          acc[id] = players[id];
          return acc;
        }, {});

      socket.emit('updatePlayers', filteredPlayers);
    }
  });

  socket.on('shootProjectile', (projectile) => {
    projectiles.push(projectile);
    console.log(projectiles);
    io.emit('newProjectile', projectile); // Broadcast the new projectile to all clients
  });

  socket.on('explosion', (explosion) => {
    explosions.push(explosion);
    io.emit('newExplosion', explosion); // Broadcast the new explosion to all clients
  });

  socket.on('playerHit', (playerId, damage) => {
    if (players[playerId]) {
      players[playerId].health -= damage;
      if (players[playerId].health <= 0) {
        // Handle player defeat (e.g., respawn, remove from game)
        players[playerId].health = 100; // Example: reset health for respawn
        players[socket.id].takedowns += 1; // Increment takedown count for the shooter
        updateLeaderboard();
      }
      io.emit('updatePlayerHealth', { playerId, health: players[playerId].health });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('updatePlayers', players);
    io.emit('connectedUsers', Object.keys(players).length); // Update connected users count
  });
});

const updateLeaderboard = () => {
  const leaderboard = Object.values(players)
    .sort((a, b) => b.takedowns - a.takedowns)
    .slice(0, 5)
    .map(player => ({ name: player.name, takedowns: player.takedowns }));
  io.emit('leaderboard', leaderboard);
};

server.listen(3001, () => {
  console.log('Server is running on port 3001');
});
