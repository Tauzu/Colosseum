'use strict';

const InputManager = (() => {
  const _keys       = new Set();
  let _lastAngle    = 0;       // 最後の移動方向（静止時に維持）
  let _touchTarget  = null;    // タッチ移動先（ワールド座標）
  let _sendInterval = null;
  let _helpCallback = null;

  function init(helpCb) {
    _helpCallback = helpCb;

    // キーボード
    window.addEventListener('keydown', e => {
      _keys.add(e.code);
      if (e.code === 'KeyH') _helpCallback && _helpCallback();
    });
    window.addEventListener('keyup', e => _keys.delete(e.code));

    // タッチ（スマホ）
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('touchstart', _onTouch, { passive: false });
    canvas.addEventListener('touchmove',  _onTouch, { passive: false });
    canvas.addEventListener('touchend',   () => { _touchTarget = null; }, { passive: false });
  }

  function _onTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const me    = StateStore.getMe();
    if (!me) return;

    // スクリーン座標 → ワールド座標
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    _touchTarget = {
      x: me.x + (touch.clientX - cx),
      y: me.y + (touch.clientY - cy),
    };
  }

  function startSending() {
    if (_sendInterval) return;
    _sendInterval = setInterval(() => {
      SocketClient.sendInput(getInput());
    }, 50);
  }

  function stopSending() {
    clearInterval(_sendInterval);
    _sendInterval = null;
    _keys.clear();
    _touchTarget  = null;
  }

  function getInput() {
    let dx = 0, dy = 0;

    if (_touchTarget) {
      // タッチ: 目標方向へ
      const me = StateStore.getMe();
      if (me) {
        const tdx  = _touchTarget.x - me.x;
        const tdy  = _touchTarget.y - me.y;
        const dist = Math.hypot(tdx, tdy);
        if (dist > 8) {   // 8px 以内に到達したら停止
          dx = tdx / dist;
          dy = tdy / dist;
        } else {
          _touchTarget = null;
        }
      }
    } else {
      // キーボード
      const right = _keys.has('KeyD') || _keys.has('ArrowRight') ? 1 : 0;
      const left  = _keys.has('KeyA') || _keys.has('ArrowLeft')  ? 1 : 0;
      const down  = _keys.has('KeyS') || _keys.has('ArrowDown')  ? 1 : 0;
      const up    = _keys.has('KeyW') || _keys.has('ArrowUp')    ? 1 : 0;
      dx = right - left;
      dy = down  - up;
    }

    // 移動している場合のみ角度を更新
    if (dx !== 0 || dy !== 0) {
      _lastAngle = Math.atan2(dy, dx);
    }

    return { dx, dy, angle: _lastAngle };
  }

  function getLastAngle()   { return _lastAngle; }
  function getTouchTarget() { return _touchTarget; }

  return { init, startSending, stopSending, getInput, getLastAngle, getTouchTarget };
})();
