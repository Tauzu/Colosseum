'use strict';

const { TICK_RATE, TICK_DELTA, SPAWN, BOT, BOSS, HELP_COOLDOWN_SEC } = require('../shared/constants');
const Player          = require('./entities/Player');
const BotPlayer       = require('./BotPlayer');
const SpawnSystem     = require('./systems/SpawnSystem');
const CollisionSystem = require('./systems/CollisionSystem');

let _roomCounter = 0;

class GameRoom {
  constructor(io, roomId) {
    this.io       = io;
    this.id       = roomId;
    this.players  = new Map();  // socketId → Player
    this.enemies  = new Map();
    this.bullets  = new Map();

    this.state       = 'active'; // active | help | clear | ended
    this.startTime   = Date.now();
    this.elapsedSec  = 0;

    this.spawnAccum  = 0;
    this.lastJoinTime = Date.now();
    this.bossSpawned = false;
    this.bossWarned  = false;

    this.helpCooldown    = 0;
    this.botJoinCountdown = null;

    this._tickInterval = setInterval(() => this._tick(), 1000 / TICK_RATE);
  }

  addPlayer(socket, name, isHelper = false) {
    const player = new Player(socket.id, name, isHelper, this.elapsedSec);
    // スポーン位置: ヘルプ参加者はマップ端ランダム
    if (isHelper) {
      player.pos = this._edgeSpawnPos();
      this.lastJoinTime = Date.now();
    }
    this.players.set(socket.id, player);
    socket.join(this.id);

    if (isHelper) {
      this.io.to(this.id).emit('player_join', {
        playerId: socket.id,
        name,
        isBot: false,
        bonus: {
          hp:             player.maxHp,
          atk:            player.attackPower,
          scoreMultiplier: player.scoreMultiplier,
        },
      });
    }

    // BOT参加待機をキャンセル
    if (this.botJoinCountdown) {
      clearTimeout(this.botJoinCountdown);
      this.botJoinCountdown = null;
    }
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;
    player.isDead = true;
    this.players.delete(socketId);
    this.io.to(this.id).emit('player_die', { playerId: socketId });

    if (this.players.size === 0) this._endRoom('all_dead');
  }

  applyInput(socketId, input) {
    const player = this.players.get(socketId);
    if (player && !player.isDead) player.input = input;
  }

  callHelp() {
    if (this.helpCooldown > 0) return false;
    this.state        = 'help';
    this.helpCooldown = HELP_COOLDOWN_SEC;
    this.io.to(this.id).emit('help_activated', { roomId: this.id });

    // BOT参加タイマー
    this.botJoinCountdown = setTimeout(() => {
      if (this.players.size > 0 && this.state !== 'clear' && this.state !== 'ended') {
        this._addBot();
      }
    }, BOT.JOIN_DELAY_SEC * 1000);

    return true;
  }

  _tick() {
    if (this.state === 'ended' || this.state === 'clear') return;

    this.elapsedSec += TICK_DELTA;
    if (this.helpCooldown > 0) this.helpCooldown -= TICK_DELTA;

    // プレイヤー更新
    for (const player of this.players.values()) {
      if (player.isBot) player.think(this.enemies);
      player.update(TICK_DELTA);
    }

    // 敵スポーン
    SpawnSystem.update(this);

    // 敵移動
    for (const enemy of this.enemies.values()) {
      enemy.update(TICK_DELTA, this.players);
    }

    // 当たり判定
    CollisionSystem.update(this);

    // 状態送信
    this.io.to(this.id).emit('game_state', this._serialize());
  }

  _serialize() {
    return {
      t:          Date.now(),
      elapsedSec: Math.floor(this.elapsedSec),
      players:    [...this.players.values()].map(p => p.serialize()),
      enemies:    [...this.enemies.values()].map(e => e.serialize()),
      bullets:    [],
    };
  }

  _edgeSpawnPos() {
    const edge = Math.floor(Math.random() * 4);
    const { MAP_WIDTH, MAP_HEIGHT } = require('../shared/constants');
    if (edge === 0) return { x: Math.random() * MAP_WIDTH, y: 32 };
    if (edge === 1) return { x: Math.random() * MAP_WIDTH, y: MAP_HEIGHT - 32 };
    if (edge === 2) return { x: 32, y: Math.random() * MAP_HEIGHT };
    return { x: MAP_WIDTH - 32, y: Math.random() * MAP_HEIGHT };
  }

  _addBot() {
    const bot = new BotPlayer(this.id);
    this.players.set(bot.id, bot);
    this.lastJoinTime = Date.now();
    this.io.to(this.id).emit('player_join', {
      playerId: bot.id,
      name:     bot.name,
      isBot:    true,
      bonus:    null,
    });
    console.log(`[${this.id}] BOT参加: ${bot.name}`);
  }

  _endRoom(reason) {
    this.state = 'ended';
    clearInterval(this._tickInterval);
    this.io.to(this.id).emit('room_end', { reason });
  }

  destroy() {
    clearInterval(this._tickInterval);
    if (this.botJoinCountdown) clearTimeout(this.botJoinCountdown);
  }

  serialize() {
    return {
      id:          this.id,
      playerCount: this.players.size,
      enemyCount:  this.enemies.size,
      elapsedSec:  Math.floor(this.elapsedSec),
      isHelp:      this.state === 'help',
    };
  }
}

module.exports = GameRoom;
