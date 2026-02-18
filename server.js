const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ip = require('ip');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const gameState = {
  players: {},
  boss: null,
  gameStarted: false,
  gameOver: false
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Player joins the game
  socket.on('join_game', (data) => {
    const { name, className, isHost } = data;
    
    gameState.players[socket.id] = {
      id: socket.id,
      name: name || 'Player',
      className: className,
      isHost: isHost || false,
      x: 400 + Math.random() * 200,
      y: 300 + Math.random() * 200,
      hp: 100,
      maxHp: 100,
      isDead: false,
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      cooldowns: [0, 0, 0, 0],
      connected: true
    };

    console.log(`${name} joined as ${className}`);
    
    // Send current game state to the new player
    socket.emit('init_state', gameState);
    
    // Broadcast to all clients
    io.emit('player_joined', gameState.players[socket.id]);
  });

  // Handle player input
  socket.on('player_input', (data) => {
    if (gameState.players[socket.id]) {
      const player = gameState.players[socket.id];
      
      if (data.move) {
        player.moveX = data.move.x;
        player.moveY = data.move.y;
      }
      
      if (data.skill !== undefined) {
        // Broadcast skill usage
        io.emit('skill_used', {
          playerId: socket.id,
          skillIndex: data.skill,
          aim: data.aim,
          timestamp: Date.now()
        });
      }
    }
  });

  // Start game (host only)
  socket.on('start_game', () => {
    if (gameState.players[socket.id]?.isHost) {
      gameState.gameStarted = true;
      gameState.gameOver = false;
      
      // Initialize boss
      gameState.boss = {
        x: 512,
        y: 384,
        hp: 5000,
        maxHp: 5000,
        phase: 1
      };
      
      io.emit('game_started', gameState);
      console.log('Game started!');
    }
  });

  // Handle revive attempts
  socket.on('revive_attempt', (data) => {
    io.emit('revive_progress', data);
  });

  socket.on('revive_complete', (data) => {
    if (gameState.players[data.targetId]) {
      gameState.players[data.targetId].isDead = false;
      gameState.players[data.targetId].hp = gameState.players[data.targetId].maxHp * 0.4;
      io.emit('player_revived', data);
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    if (gameState.players[socket.id]) {
      delete gameState.players[socket.id];
      io.emit('player_left', socket.id);
    }
  });
});

// Game loop - broadcast state at 20 FPS (always, even in lobby)
setInterval(() => {
  io.emit('game_state', gameState);
}, 50);

server.listen(PORT, () => {
  console.log(`\n=================================`);
  console.log(`🎮 RAID NIGHT - THE RESCUE`);
  console.log(`=================================`);
  console.log(`Server running on port ${PORT}`);
  console.log(`\nLocal: http://localhost:${PORT}`);
  console.log(`Network: http://${ip.address()}:${PORT}`);
  console.log(`\nHost: Open /host.html`);
  console.log(`Controllers: Open /controller.html on phones`);
  console.log(`=================================\n`);
});
