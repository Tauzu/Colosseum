'use strict';

const SocketClient = (() => {
  let _socket = null;
  const _handlers = {};

  function connect() {
    _socket = io();

    _socket.on('connect',      () => _emit('connect'));
    _socket.on('disconnect',   () => _emit('disconnect'));
    _socket.on('room_created', d => _emit('room_created', d));
    _socket.on('room_list',    d => _emit('room_list', d));
    _socket.on('game_state',   d => _emit('game_state', d));
    _socket.on('player_join',  d => _emit('player_join', d));
    _socket.on('player_die',   d => _emit('player_die', d));
    _socket.on('help_activated', d => _emit('help_activated', d));
    _socket.on('room_end',     d => _emit('room_end', d));
    _socket.on('room_clear',   d => _emit('room_clear', d));
    _socket.on('room_joined',  d => _emit('room_joined', d));
    _socket.on('join_error',   d => _emit('join_error', d));
    _socket.on('boss_warning', d => _emit('boss_warning', d));
    _socket.on('boss_spawn',   d => _emit('boss_spawn', d));
  }

  function on(event, fn) {
    if (!_handlers[event]) _handlers[event] = [];
    _handlers[event].push(fn);
  }

  function _emit(event, data) {
    (_handlers[event] || []).forEach(fn => fn(data));
  }

  function createRoom(playerName) {
    _socket.emit('room_create', { playerName });
  }

  function joinRoom(roomId, playerName) {
    _socket.emit('room_join', { roomId, playerName });
  }

  function sendInput(input) {
    _socket.emit('player_input', input);
  }

  function callHelp() {
    _socket.emit('help_call');
  }

  function id() { return _socket && _socket.id; }

  return { connect, on, createRoom, joinRoom, sendInput, callHelp, id };
})();
