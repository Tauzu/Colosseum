'use strict';

const Renderer = (() => {
  let _canvas, _ctx;
  const MAP_W = 2048, MAP_H = 2048;

  function init(canvas) {
    _canvas = canvas;
    _ctx    = canvas.getContext('2d');
    _resize();
    window.addEventListener('resize', _resize);
  }

  function _resize() {
    _canvas.width  = window.innerWidth;
    _canvas.height = window.innerHeight;
  }

  function draw() {
    const state = StateStore.getState();
    const me    = StateStore.getMe();
    const ctx   = _ctx;
    const W = _canvas.width, H = _canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);

    // カメラ: 自分中心
    const camX = me ? me.x : MAP_W / 2;
    const camY = me ? me.y : MAP_H / 2;
    const offX = W / 2 - camX;
    const offY = H / 2 - camY;

    ctx.save();
    ctx.translate(offX, offY);

    _drawGrid(ctx, camX, camY, W, H);
    _drawBullets(ctx, state.bullets);
    _drawEnemies(ctx, state.enemies);
    _drawPlayers(ctx, state.players);

    ctx.restore();
  }

  function _drawGrid(ctx, camX, camY, W, H) {
    const size = 64;
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 1;
    const startX = Math.floor((camX - W / 2) / size) * size;
    const startY = Math.floor((camY - H / 2) / size) * size;

    for (let x = startX; x < camX + W / 2; x += size) {
      ctx.beginPath(); ctx.moveTo(x, camY - H / 2); ctx.lineTo(x, camY + H / 2); ctx.stroke();
    }
    for (let y = startY; y < camY + H / 2; y += size) {
      ctx.beginPath(); ctx.moveTo(camX - W / 2, y); ctx.lineTo(camX + W / 2, y); ctx.stroke();
    }

    // マップ境界
    ctx.strokeStyle = '#444';
    ctx.lineWidth   = 2;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);
  }

  function _drawPlayers(ctx, players) {
    const myId  = StateStore.getMyId();
    const input = InputManager.getInput();

    for (const p of players) {
      if (p.isDead) continue;
      const isMe  = p.id === myId;
      const color = p.isBot ? '#4af' : (isMe ? '#44f' : '#4a4');

      // 攻撃範囲（自分のみ、常時表示）
      if (isMe) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 60 + 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100,150,255,0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(100,150,255,0.08)';
        ctx.fill();
      }

      // 本体
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (p.isBot) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // HP バー
      const bw = 36, bh = 5;
      const hpRatio = p.hp / p.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(p.x - bw / 2, p.y - 26, bw, bh);
      ctx.fillStyle = hpRatio > 0.5 ? '#4a4' : hpRatio > 0.25 ? '#fa0' : '#f33';
      ctx.fillRect(p.x - bw / 2, p.y - 26, bw * hpRatio, bh);

      // 名前
      ctx.fillStyle = '#ccc';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(p.name, p.x, p.y - 30);
    }
  }

  const ENEMY_COLOR  = { basic: '#f33', fast: '#f80', ranged: '#a3f', boss: '#000' };
  const ENEMY_RADIUS = { basic: 12, fast: 8, ranged: 14, boss: 40 };

  function _drawEnemies(ctx, enemies) {
    for (const e of enemies) {
      const r = ENEMY_RADIUS[e.type] || 12;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
      ctx.fillStyle = ENEMY_COLOR[e.type] || '#f33';
      ctx.fill();
      if (e.type === 'boss') {
        ctx.strokeStyle = '#f33';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  }

  function _drawBullets(ctx, bullets) {
    for (const b of bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c4f';
      ctx.fill();
    }
  }

  return { init, draw };
})();
