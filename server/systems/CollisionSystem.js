'use strict';

const { PLAYER } = require('../../shared/constants');

function update(room) {
  const players = room.players;
  const enemies = room.enemies;

  // プレイヤー攻撃 → 敵（先に処理して死亡敵をマーク）
  const deadEnemies = new Set();
  for (const player of players.values()) {
    if (player.isDead || !player.input.attacking) continue;
    if (player.attackCooldown > 0) continue;

    for (const enemy of enemies.values()) {
      if (deadEnemies.has(enemy.id)) continue;
      const dist = Math.hypot(enemy.pos.x - player.pos.x, enemy.pos.y - player.pos.y);
      if (dist <= player.attackRange + enemy.radius) {
        enemy.hp -= player.attackPower;
        player.attackCooldown = PLAYER.ATTACK_COOLDOWN;

        if (enemy.hp <= 0) {
          deadEnemies.add(enemy.id);
          _killEnemy(room, enemy, player);
        }
        break;
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
