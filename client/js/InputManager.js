'use strict';

const InputManager = (() => {
  const _keys = new Set();
  let _sendInterval = null;
  let _helpCallback = null;

  function init(helpCb) {
    _helpCallback = helpCb;
    window.addEventListener('keydown', e => {
      _keys.add(e.code);
      if (e.code === 'KeyH') _helpCallback && _helpCallback();
    });
    window.addEventListener('keyup', e => _keys.delete(e.code));
  }

  function startSending() {
    if (_sendInterval) return;
    _sendInterval = setInterval(() => {
      SocketClient.sendInput(getInput());
    }, 50);  // 20 TPS
  }

  function stopSending() {
    clearInterval(_sendInterval);
    _sendInterval = null;
    _keys.clear();
  }

  function getInput() {
    const right = _keys.has('KeyD') || _keys.has('ArrowRight') ? 1 : 0;
    const left  = _keys.has('KeyA') || _keys.has('ArrowLeft')  ? 1 : 0;
    const down  = _keys.has('KeyS') || _keys.has('ArrowDown')  ? 1 : 0;
    const up    = _keys.has('KeyW') || _keys.has('ArrowUp')    ? 1 : 0;
    return {
      dx: right - left,
      dy: down  - up,
      attacking: _keys.has('Space'),
    };
  }

  return { init, startSending, stopSending, getInput };
})();
