'use strict';

const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');
const RoomManager = require('./RoomManager');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager(io);

// ルーム一覧を2秒ごとに全クライアントへ配信
setInterval(() => {
  io.emit('room_list', roomManager.getRoomList());
}, 2000);

io.on('connection', (socket) => {
  console.log(`connected: ${socket.id}`);

  socket.on('room_create', ({ playerName }) => {
    roomManager.createRoom(socket, playerName || 'Player');
  });

  socket.on('room_join', ({ roomId, playerName }) => {
    roomManager.joinRoom(socket, roomId, playerName || 'Player');
  });

  socket.on('player_input', (input) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (room) room.applyInput(socket.id, input);
  });

  socket.on('help_call', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (room) room.callHelp();
  });

  socket.on('disconnect', () => {
    console.log(`disconnected: ${socket.id}`);
    roomManager.removePlayer(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Colosseum server: http://localhost:${PORT}`));
