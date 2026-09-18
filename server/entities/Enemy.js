'use strict';

const { MAP_WIDTH, MAP_HEIGHT } = require('../../shared/constants');

const CONFIGS = {
  basic:  { hp: 30,   speed: 80,  attackPower: 10, attackRange: 30,  attackRate: 1.0, radius: 12 },
  fast:   { hp: 15,   speed: 160, attackPower:  8, attackRange: 25,  attackRate: 0.8, radius:  8 },
  ranged: { hp: 40,   speed: 50,  attackPower: 15, attackRange: 350, attackRate: 2.0, radius: 14 },
  boss:   { hp: 2000, speed: 40,  attackPower: 40, attackRange: 60,  attackRate: 2.5, radius: 40 },
};

let _idCounter = 0;

class Enemy {
  constructor(type, x, y) {
    this.id       = `e${++_idCounter}`;
    this.type     = type;
    this.pos      = { x, y };
    this.targetId = null;

    const cfg = CONFIGS[type];
    this.hp          = cfg.hp;
    this.maxHp       = cfg.hp;
    this.speed       = cfg.speed;
    this.attackPower = cfg.attackPower;
    this.attackRange = cfg.attackRange;
    this.attackRate  = cfg.attackRate;
    this.attackCooldown = 0;
    this.radius      = cfg.radius;
  }

  update(dt, players) {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    // 最近接プレイヤーを追尾
    const target = this._findTarget(players);
    if (!target) return;
    this.targetId = target.id;

    const dx   = target.pos.x - this.pos.x;
    const dy   = target.pos.y - this.pos.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.attackRange) {
      this.pos.x += (dx / dist) * this.speed * dt;
      this.pos.y += (dy / dist) * this.speed * dt;
      this.pos.x = Math.max(this.radius, Math.min(MAP_WIDTH  - this.radius, this.pos.x));
      this.pos.y = Math.max(this.radius, Math.min(MAP_HEIGHT - this.radius, this.pos.y));
    }
  }

  _findTarget(players) {
    let nearest = null, minDist = Infinity;
    for (const p of players.values()) {
      if (p.isDead) continue;
      const d = Math.hypot(p.pos.x - this.pos.x, p.pos.y - this.pos.y);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    return nearest;
  }

  serialize() {
    return {
      id:    this.id,
      type:  this.type,
      x:     Math.round(this.pos.x),
      y:     Math.round(this.pos.y),
      hp:    this.hp,
      maxHp: this.maxHp,
    };
  }
}

Enemy.edgeSpawn = function(type, mapW, mapH) {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * mapW; y = 20; }
  else if (edge === 1) { x = Math.random() * mapW; y = mapH - 20; }
  else if (edge === 2) { x = 20; y = Math.random() * mapH; }
  else                 { x = mapW - 20; y = Math.random() * mapH; }
  return new Enemy(type, x, y);
};

module.exports = Enemy;
