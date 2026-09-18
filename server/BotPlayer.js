'use strict';

const { PLAYER, MAP_WIDTH, MAP_HEIGHT } = require('../shared/constants');

let _botCounter = 0;

class BotPlayer {
  constructor(roomId) {
    this.id    = `bot_${++_botCounter}`;
    this.name  = `BOT-${_botCounter}`;
    this.isBot = true;
    this.isDead = false;
    this.killCount = 0;

    // マップ端ランダムにスポーン
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0)      this.pos = { x: Math.random() * MAP_WIDTH, y: 40 };
    else if (edge === 1) this.pos = { x: Math.random() * MAP_WIDTH, y: MAP_HEIGHT - 40 };
    else if (edge === 2) this.pos = { x: 40, y: Math.random() * MAP_HEIGHT };
    else                 this.pos = { x: MAP_WIDTH - 40, y: Math.random() * MAP_HEIGHT };

    this.radius      = PLAYER.RADIUS;
    this.maxHp       = PLAYER.HP;
    this.hp          = this.maxHp;
    this.speed       = PLAYER.SPEED * 0.85;   // 人間より少し遅い
    this.attackPower = PLAYER.ATTACK_POWER;
    this.attackRange = PLAYER.ATTACK_RANGE;
    this.attackCooldown  = 0;
    this.invincibleTimer = 0;
    this.scoreMultiplier = 1.0;
    this.angle  = 0;
    this.input  = { dx: 0, dy: 0, angle: 0 };
  }

  // 毎ティック AI 計算 → input を更新
  think(enemies) {
    if (this.isDead) return;

    const target = this._nearestEnemy(enemies);
    if (!target) {
      this.input = { dx: 0, dy: 0, angle: this.angle };
      return;
    }

    const dx   = target.pos.x - this.pos.x;
    const dy   = target.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    this.angle = angle;
    this.input = { dx: dx / dist, dy: dy / dist, angle };
  }

  update(dt) {
    if (this.isDead) return;

    // 移動
    const len = Math.hypot(this.input.dx, this.input.dy) || 1;
    if (this.input.dx !== 0 || this.input.dy !== 0) {
      this.pos.x = Math.max(this.radius, Math.min(MAP_WIDTH  - this.radius,
        this.pos.x + (this.input.dx / len) * this.speed * dt));
      this.pos.y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius,
        this.pos.y + (this.input.dy / len) * this.speed * dt));
    }

    if (this.attackCooldown  > 0) this.attackCooldown  -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
  }

  _nearestEnemy(enemies) {
    let nearest = null, minDist = Infinity;
    for (const e of enemies.values()) {
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.y - this.pos.y);
      if (d < minDist) { minDist = d; nearest = e; }
    }
    return nearest;
  }

  serialize() {
    return {
      id:              this.id,
      name:            this.name,
      x:               Math.round(this.pos.x),
      y:               Math.round(this.pos.y),
      angle:           this.angle,
      hp:              this.hp,
      maxHp:           this.maxHp,
      isDead:          this.isDead,
      isBot:           true,
      scoreMultiplier: this.scoreMultiplier,
    };
  }
}

module.exports = BotPlayer;
