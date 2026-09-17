'use strict';

const { PLAYER, HELPER_BONUS, MAP_WIDTH, MAP_HEIGHT } = require('../../shared/constants');

let _nextId = 1;

class Player {
  constructor(socketId, name, isHelper = false, elapsedSecAtJoin = 0) {
    this.id       = socketId;
    this.name     = name;
    this.isBot    = false;
    this.isDead   = false;
    this.killCount = 0;

    this.pos = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
    this.radius = PLAYER.RADIUS;

    const hpMult  = isHelper ? HELPER_BONUS.HP_MULT  : 1.0;
    const atkMult = isHelper ? HELPER_BONUS.ATK_MULT : 1.0;

    this.maxHp       = Math.floor(PLAYER.HP * hpMult);
    this.hp          = this.maxHp;
    this.speed       = PLAYER.SPEED;
    this.attackPower = Math.floor(PLAYER.ATTACK_POWER * atkMult);
    this.attackRange = PLAYER.ATTACK_RANGE;

    this.attackCooldown  = 0;
    this.invincibleTimer = 0;

    this.scoreMultiplier = isHelper
      ? calcScoreMultiplier(elapsedSecAtJoin)
      : 1.0;

    this.input = { dx: 0, dy: 0, attacking: false };
  }

  update(dt) {
    if (this.isDead) return;

    // 移動
    const len = Math.hypot(this.input.dx, this.input.dy) || 1;
    const nx  = this.input.dx / len;
    const ny  = this.input.dy / len;
    const moving = this.input.dx !== 0 || this.input.dy !== 0;

    if (moving) {
      this.pos.x = Math.max(this.radius, Math.min(MAP_WIDTH  - this.radius, this.pos.x + nx * this.speed * dt));
      this.pos.y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius, this.pos.y + ny * this.speed * dt));
    }

    if (this.attackCooldown  > 0) this.attackCooldown  -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
  }

  serialize() {
    return {
      id:             this.id,
      name:           this.name,
      x:              Math.round(this.pos.x),
      y:              Math.round(this.pos.y),
      hp:             this.hp,
      maxHp:          this.maxHp,
      isDead:         this.isDead,
      isBot:          this.isBot,
      scoreMultiplier: this.scoreMultiplier,
    };
  }
}

function calcScoreMultiplier(elapsedSec) {
  const { SCORE_MULT_MIN, SCORE_MULT_MAX, SCORE_MULT_CAP_SEC } = HELPER_BONUS;
  return Math.min(SCORE_MULT_MIN + (elapsedSec / SCORE_MULT_CAP_SEC), SCORE_MULT_MAX);
}

module.exports = Player;
