'use strict';

const { v4: uuidv4 } = require('uuid');
const GameRoom = require('./GameRoom');

class RoomManager {
  constructor(io) {
    this.io    = io;
    this.rooms = new Map();  // roomId → GameRoom
  }

  createRoom(socket, playerName) {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    const room   = new GameRoom(this.io, roomId);
    room.addPlayer(socket, playerName, false);
    this.rooms.set(roomId, room);

    socket.emit('room_created', { roomId });
    this._broadcastRoomList();
    return room;
  }

  joinRoom(socket, roomId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room || room.state === 'ended' || room.state === 'clear') {
      socket.emit('join_error', { message: 'ルームが存在しないか終了しています' });
      return null;
    }
    room.addPlayer(socket, playerName, true);
    socket.emit('room_joined', { roomId });
    this._broadcastRoomList();
    return room;
  }

  removePlayer(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        room.removePlayer(socketId);
        if (room.state === 'ended') {
          room.destroy();
          this.rooms.delete(room.id);
        }
        this._broadcastRoomList();
        return;
      }
    }
  }

  getRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) return room;
    }
    return null;
  }

  getRoomList() {
    return [...this.rooms.values()]
      .filter(r => r.state !== 'ended' && r.state !== 'clear')
      .map(r => r.serialize());
  }

  _broadcastRoomList() {
    this.io.emit('room_list', this.getRoomList());
  }
}

module.exports = RoomManager;
