'use strict';

const { PLAYER } = require('../../shared/constants');

function _normalizeAngle(a) {
  while (a >  Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function _inCone(player, enemy) {
  const dx   = enemy.pos.x - player.pos.x;
  const dy   = enemy.pos.y - player.pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist > PLAYER.ATTACK_RANGE + enemy.radius) return false;
  const angleToEnemy = Math.atan2(dy, dx);
  return Math.abs(_normalizeAngle(angleToEnemy - player.angle)) <= PLAYER.ATTACK_HALF_ANGLE;
}

function update(room) {
  const players = room.players;
  const enemies = room.enemies;

  // プレイヤー攻撃 → 敵（クールダウンが切れたら範囲内の最近接敵を自動攻撃）
  const deadEnemies = new Set();
  for (const player of players.values()) {
    if (player.isDead) continue;
    if (player.attackCooldown > 0) continue;

    let nearest = null, minDist = Infinity;
    for (const enemy of enemies.values()) {
      if (deadEnemies.has(enemy.id)) continue;
      if (!_inCone(player, enemy)) continue;
      const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y);
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }

    if (nearest) {
      nearest.hp -= player.attackPower;
      player.attackCooldown = PLAYER.ATTACK_COOLDOWN;
      if (nearest.hp <= 0) {
        deadEnemies.add(nearest.id);
        _killEnemy(room, nearest, player);
      }
    }
  }

  // 敵 → プレイヤー（死亡済み敵はスキップ）
  for (const enemy of enemies.values()) {
    if (deadEnemies.has(enemy.id)) continue;
    if (enemy.attackCooldown > 0) continue;
    const target = players.get(enemy.targetId);
    if (!target || target.isDead || target.invincibleTimer > 0) continue;

    const dist = Math.hypot(target.pos.x - enemy.pos.x, target.pos.y - enemy.pos.y);
    if (dist <= enemy.attackRange + target.radius) {
      target.hp -= enemy.attackPower;
      target.invincibleTimer = PLAYER.INVINCIBLE_TIME;
      enemy.attackCooldown   = enemy.attackRate;

      room.io.to(room.id).emit('damage_event', {
        targetId: target.id,
        damage:   enemy.attackPower,
        remainHp: Math.max(0, target.hp),
      });

      if (target.hp <= 0) _killPlayer(room, target);
    }
  }
}

function _killPlayer(room, player) {
  player.isDead = true;
  player.hp     = 0;
  room.io.to(room.id).emit('player_die', { playerId: player.id });
  room.players.delete(player.id);

  if (room.players.size === 0) room._endRoom('all_dead');
}

function _killEnemy(room, enemy, killer) {
  room.enemies.delete(enemy.id);
  killer.killCount++;
  room.io.to(room.id).emit('enemy_die', { enemyId: enemy.id, killerId: killer.id });
}

module.exports = { update };
