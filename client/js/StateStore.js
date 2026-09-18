'use strict';

const StateStore = (() => {
  let _myId   = null;
  let _state  = { players: [], enemies: [], bullets: [], elapsedSec: 0 };

  function setMyId(id) { _myId = id; }
  function getMyId()   { return _myId; }

  function update(payload) { _state = payload; }

  function getState()  { return _state; }

  function getMe() {
    return _state.players.find(p => p.id === _myId) || null;
  }

  return { setMyId, getMyId, update, getState, getMe };
})();
