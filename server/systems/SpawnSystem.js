'use strict';

const { TICK_DELTA, SPAWN, BOSS, MAP_WIDTH, MAP_HEIGHT } = require('../../shared/constants');
const Enemy = require('../entities/Enemy');

function update(room) {
  // ボス予告（出現30秒前）
  if (!room.bossWarned && room.elapsedSec >= BOSS.SPAWN_SEC - BOSS.WARNING_SEC) {
    room.bossWarned = true;
    room.io.to(room.id).emit('boss_warning', { remainSec: BOSS.WARNING_SEC });
  }

  // ボス出現
  if (!room.bossSpawned && room.elapsedSec >= BOSS.SPAWN_SEC) {
    room.bossSpawned = true;
    const boss = new Enemy('boss', MAP_WIDTH / 2, MAP_HEIGHT / 2);
    room.bossId = boss.id;
    room.enemies.set(boss.id, boss);
    room.io.to(room.id).emit('boss_spawned', boss.serialize());
  }

  const realCount = [...room.players.values()].filter(p => !p.isBot).length;
  const n  = Math.min(realCount, 4) || 1;
  const sf = _speedFactor(room, n);
  const interval = SPAWN.BASE_INTERVAL / (sf * (1 + SPAWN.GROWTH_RATE * room.elapsedSec));

  room.spawnAccum += TICK_DELTA;
  if (room.spawnAccum >= interval && room.enemies.size < SPAWN.MAX_ENEMIES) {
    room.spawnAccum = 0;
    const type  = _pickType(room.elapsedSec);
    const enemy = Enemy.edgeSpawn(type, MAP_WIDTH, MAP_HEIGHT);
    room.enemies.set(enemy.id, enemy);
    room.io.to(room.id).emit('enemy_spawn', enemy.serialize());
  }
}

function _speedFactor(room, n) {
  const sinceJoin = (Date.now() - room.lastJoinTime) / 1000;
  const effectiveN = sinceJoin < SPAWN.JOIN_DELAY_SEC ? Math.max(n - 1, 1) : n;
  return SPAWN.SPEED_FACTOR[effectiveN] || SPAWN.SPEED_FACTOR[4];
}

function _pickType(elapsed) {
  if (elapsed >= 300 && Math.random() < 0.15) return 'ranged'; // 5分〜
  if (elapsed >= 180 && Math.random() < 0.20) return 'fast';   // 3分〜
  return 'basic';
}

module.exports = { update };
