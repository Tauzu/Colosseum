'use strict';

const $ = id => document.getElementById(id);

let _currentRoomId = null;
let _score         = 0;
let _kills         = 0;
let _helpCooldown  = 0;
let _isDead        = false;   // 自分が死亡したか

// --- 画面切替 ---
function showScreen(name) {
  ['home', 'game', 'result'].forEach(s =>
    $(`screen-${s}`).classList.toggle('hidden', s !== name)
  );
}

// --- ホーム画面 ---
$('btn-create').addEventListener('click', () => {
  const name = $('player-name').value.trim() || 'Player';
  SocketClient.createRoom(name);
});

$('btn-join-direct').addEventListener('click', () => {
  const roomId = $('join-room-id').value.trim().toUpperCase();
  if (!roomId) return;
  const name = $('player-name').value.trim() || 'Player';
  SocketClient.joinRoom(roomId, name);
});

$('room-list').addEventListener('click', e => {
  const item = e.target.closest('.room-item');
  if (!item) return;
  const roomId = item.dataset.roomId;
  const name   = $('player-name').value.trim() || 'Player';
  SocketClient.joinRoom(roomId, name);
});

// --- ゲーム画面 ---
$('btn-help').addEventListener('click', () => {
  if (_helpCooldown > 0) return;
  SocketClient.callHelp();
  startHelpCooldown();
});

$('btn-retry').addEventListener('click', () => showScreen('home'));
$('btn-home').addEventListener('click',  () => showScreen('home'));

function startHelpCooldown() {
  _helpCooldown = 60;
  $('btn-help').disabled = true;
  const t = setInterval(() => {
    _helpCooldown--;
    $('btn-help').textContent = `[H] ヘルプ叫ぶ (${_helpCooldown}s)`;
    if (_helpCooldown <= 0) {
      clearInterval(t);
      $('btn-help').disabled = false;
      $('btn-help').textContent = '[H] ヘルプ叫ぶ';
    }
  }, 1000);
}

// --- 被弾フラッシュ ---
let _flashTimer = 0;
function _triggerDamageFlash() {
  _flashTimer = 10;  // フレーム数
}
function _drawDamageFlash(ctx, W, H) {
  if (_flashTimer <= 0) return;
  _flashTimer--;
  const alpha = _flashTimer / 10 * 0.35;
  ctx.fillStyle = `rgba(255,0,0,${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

// --- ボス警告通知 ---
let _bossNotice = null;
function _showBossNotice(text, color) {
  _bossNotice = { text, color: color || '#f33', timer: 300 };
}
function _drawBossNotice(ctx, W, H) {
  if (!_bossNotice || _bossNotice.timer <= 0) { _bossNotice = null; return; }
  _bossNotice.timer--;
  const alpha = Math.min(_bossNotice.timer / 30, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font        = 'bold 32px monospace';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = _bossNotice.color;
  ctx.shadowColor = _bossNotice.color;
  ctx.shadowBlur  = 20;
  ctx.fillText(_bossNotice.text, W / 2, H / 2 - 40);
  ctx.restore();
}

// --- 助っ人参加通知 ---
let _joinNotice = null;
function _showJoinNotice(name) {
  _joinNotice = { text: `${name} が救援に来た！`, timer: 180 };
}
function _drawJoinNotice(ctx, W, H) {
  if (!_joinNotice || _joinNotice.timer <= 0) { _joinNotice = null; return; }
  _joinNotice.timer--;
  const alpha = Math.min(_joinNotice.timer / 30, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font        = 'bold 22px monospace';
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#ff0';
  ctx.fillText(_joinNotice.text, W / 2, H / 2 - 60);
  ctx.restore();
}

// Renderer に後付けでオーバーレイを描画
const _origDraw = Renderer.draw.bind(Renderer);
Renderer.draw = function() {
  _origDraw();
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  _drawDamageFlash(ctx, W, H);
  _drawBossNotice(ctx, W, H);
  _drawJoinNotice(ctx, W, H);
  if (_isDead) _drawDeadOverlay(ctx, W, H);
};

function _drawDeadOverlay(ctx, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, H);
  ctx.font      = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f55';
  ctx.fillText('YOU DIED — 観戦中', W / 2, 60);
}

// --- SocketClient イベント ---
SocketClient.on('connect', () => StateStore.setMyId(SocketClient.id()));
SocketClient.on('disconnect', () => InputManager.stopSending());

function _enterGame(roomId) {
  _currentRoomId = roomId;
  _score = _kills = 0;
  _isDead = false;
  _bossNotice = null;
  $('room-id-display').textContent = `Room: ${roomId}`;
  $('boss-hp-bar-container').classList.add('hidden');
  $('btn-help').style.display = '';
  showScreen('game');
  InputManager.startSending();
  requestAnimationFrame(_loop);
}

SocketClient.on('room_created', ({ roomId }) => _enterGame(roomId));
SocketClient.on('room_joined',  ({ roomId }) => _enterGame(roomId));

SocketClient.on('room_list', (list) => {
  const el = $('room-list');
  if (!list || list.length === 0) {
    el.innerHTML = '<div style="color:#555;font-size:0.8rem;padding:0.5rem">アクティブなルームなし</div>';
    return;
  }
  el.innerHTML = list.map(r => `
    <div class="room-item ${r.isHelp ? 'help' : ''}" data-room-id="${r.id}">
      <div>
        ${r.isHelp ? '<span class="room-help-tag">🔴 ヘルプ中！</span> ' : ''}
        Room #${r.id}
      </div>
      <div class="room-info">${r.playerCount}人 / 敵${r.enemyCount}体 / ${formatTime(r.elapsedSec)}</div>
    </div>
  `).join('');
});

SocketClient.on('game_state', (state) => {
  StateStore.update(state);
  _updateHUD(state);
});

SocketClient.on('damage_event', ({ targetId, remainHp }) => {
  if (targetId === SocketClient.id()) _triggerDamageFlash();
});

SocketClient.on('enemy_die', ({ killerId }) => {
  if (killerId === SocketClient.id()) _kills++;
});

SocketClient.on('player_die', ({ playerId }) => {
  if (playerId === SocketClient.id()) {
    _isDead = true;
    InputManager.stopSending();
    $('btn-help').style.display = 'none';
  }
});

SocketClient.on('player_join', ({ name }) => {
  _showJoinNotice(name);
  // 画面フラッシュ（白）
  _flashTimer = 0;
  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

SocketClient.on('room_end', ({ reason }) => {
  InputManager.stopSending();
  $('boss-hp-bar-container').classList.add('hidden');
  const state = StateStore.getState();
  $('result-title').textContent = 'GAME OVER';
  $('result-title').style.color = '#f33';
  $('result-time').textContent  = formatTime(state.elapsedSec);
  $('result-kills').textContent = _kills;
  $('result-score').textContent = _score.toLocaleString();
  $('result-title-badge').textContent = '';
  showScreen('result');
});

SocketClient.on('room_clear', ({ elapsedSec, kills, score, title }) => {
  InputManager.stopSending();
  $('boss-hp-bar-container').classList.add('hidden');
  $('result-title').textContent = 'CLEAR!!';
  $('result-title').style.color = '#4f4';
  $('result-time').textContent  = formatTime(elapsedSec);
  $('result-kills').textContent = kills;
  $('result-score').textContent = score.toLocaleString();
  $('result-title-badge').textContent = title ? `称号: ${title}` : '';
  showScreen('result');
});

SocketClient.on('boss_warning', () => {
  _showBossNotice('⚠  ボス出現まで 10 秒！', '#f80');
});

SocketClient.on('boss_spawned', () => {
  _showBossNotice('!! BOSS 出現 !!', '#f33');
  $('boss-hp-bar-container').classList.remove('hidden');
});

SocketClient.on('join_error', ({ message }) => alert(message));

// --- HUD 更新 ---
function _updateHUD(state) {
  const me = StateStore.getMe();
  if (me && !_isDead) {
    const pct = me.hp / me.maxHp * 100;
    $('hp-fill').style.width = `${Math.max(0, pct)}%`;
    $('hp-fill').style.background = pct > 50 ? '#4a4' : pct > 25 ? '#fa0' : '#f33';
    $('hp-text').textContent = `${Math.max(0, me.hp)}/${me.maxHp}`;
  }
  _score = Math.floor(state.elapsedSec * 10) + _kills * 50;
  $('score-val').textContent   = _score.toLocaleString();
  $('hud-time').textContent    = formatTime(state.elapsedSec);
  $('hud-enemies').textContent = state.enemies.length;
  $('hud-players').textContent = state.players.filter(p => !p.isDead).length;

  // ボスHP バー更新
  const boss = state.enemies.find(e => e.type === 'boss');
  if (boss) {
    $('boss-hp-bar-container').classList.remove('hidden');
    const pct = Math.max(0, boss.hp / boss.maxHp * 100);
    $('boss-hp-fill').style.width = `${pct}%`;
    $('boss-hp-text').textContent = `${boss.hp}/${boss.maxHp}`;
  }
}

// --- ゲームループ ---
function _loop() {
  Renderer.draw();
  if ($('screen-game').classList.contains('hidden')) return;
  requestAnimationFrame(_loop);
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- 初期化 ---
Renderer.init($('game-canvas'));
InputManager.init(() => {
  if (_helpCooldown <= 0 && !_isDead) {
    SocketClient.callHelp();
    startHelpCooldown();
  }
});
SocketClient.connect();
