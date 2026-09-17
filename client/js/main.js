'use strict';

const $ = id => document.getElementById(id);

let _currentRoomId = null;
let _score         = 0;
let _kills         = 0;
let _helpCooldown  = 0;

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

$('btn-join-prompt').addEventListener('click', () => {
  const roomId = prompt('ルームIDを入力してください:');
  if (!roomId) return;
  const name = $('player-name').value.trim() || 'Player';
  SocketClient.joinRoom(roomId.trim().toUpperCase(), name);
});

// ルーム一覧クリックで参加
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

$('btn-retry').addEventListener('click', () => {
  showScreen('home');
});
$('btn-home').addEventListener('click', () => {
  showScreen('home');
});

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

// --- SocketClient イベント ---
SocketClient.on('connect', () => {
  StateStore.setMyId(SocketClient.id());
});

SocketClient.on('room_created', ({ roomId }) => {
  _currentRoomId = roomId;
  _score = _kills = 0;
  $('room-id-display').textContent = `Room: ${roomId}`;
  showScreen('game');
  InputManager.startSending();
  requestAnimationFrame(_loop);
});

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

SocketClient.on('room_end', ({ reason }) => {
  InputManager.stopSending();
  $('result-title').textContent    = 'GAME OVER';
  $('result-title').style.color    = '#f33';
  const state = StateStore.getState();
  $('result-time').textContent  = formatTime(state.elapsedSec);
  $('result-kills').textContent = _kills;
  $('result-score').textContent = _score.toLocaleString();
  $('result-title-badge').textContent = '';
  showScreen('result');
});

SocketClient.on('room_clear', ({ elapsedSec, kills, score, title }) => {
  InputManager.stopSending();
  $('result-title').textContent = 'CLEAR!!';
  $('result-title').style.color = '#4f4';
  $('result-time').textContent  = formatTime(elapsedSec);
  $('result-kills').textContent = kills;
  $('result-score').textContent = score.toLocaleString();
  $('result-title-badge').textContent = title ? `称号: ${title}` : '';
  showScreen('result');
});

SocketClient.on('join_error', ({ message }) => {
  alert(message);
});

// --- HUD 更新 ---
function _updateHUD(state) {
  const me = StateStore.getMe();
  if (me) {
    $('hp-bar-text').textContent = `${me.hp}/${me.maxHp}`;
  }
  $('hud-time').textContent    = formatTime(state.elapsedSec);
  $('hud-enemies').textContent = state.enemies.length;
  $('hud-players').textContent = state.players.filter(p => !p.isDead).length;
}

// --- ゲームループ ---
function _loop() {
  Renderer.draw();
  if (document.getElementById('screen-game').classList.contains('hidden')) return;
  requestAnimationFrame(_loop);
}

// --- ユーティリティ ---
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- 初期化 ---
Renderer.init($('game-canvas'));
InputManager.init(() => {
  if (_helpCooldown <= 0) {
    SocketClient.callHelp();
    startHelpCooldown();
  }
});
SocketClient.connect();
