'use strict';

const TICK_RATE       = 20;       // TPS
const TICK_DELTA      = 1 / TICK_RATE;
const MAP_WIDTH       = 2048;
const MAP_HEIGHT      = 2048;

const PLAYER = {
  RADIUS:          16,
  SPEED:           200,
  HP:              100,
  ATTACK_POWER:      20,
  ATTACK_RANGE:      150,           // コーン射程
  ATTACK_HALF_ANGLE: Math.PI / 4,   // 45度（左右90度の扇形）
  ATTACK_COOLDOWN:   0.5,
  INVINCIBLE_TIME: 0.5,
};

const HELPER_BONUS = {
  HP_MULT:          1.5,
  ATK_MULT:         1.5,
  SCORE_MULT_MIN:   1.5,
  SCORE_MULT_MAX:   2.0,
  SCORE_MULT_CAP_SEC: 300,  // 5分で上限
};

const SPAWN = {
  BASE_INTERVAL:  8.0,
  GROWTH_RATE:    0.03,
  SPEED_FACTOR:   { 1: 1.0, 2: 1.5, 3: 2.2, 4: 3.0 },
  JOIN_DELAY_SEC: 15,
  MAX_ENEMIES:    500,
};

const BOT = {
  JOIN_DELAY_SEC: 30,
};

const BOSS = {
  SPAWN_SEC:    480,  // 8分
  WARNING_SEC:  30,
};

const HELP_COOLDOWN_SEC = 60;

const SCORE = {
  SURVIVAL_PER_SEC: 10,
  KILL:             50,
  CLEAR_BONUS:      10000,
};

module.exports = {
  TICK_RATE, TICK_DELTA, MAP_WIDTH, MAP_HEIGHT,
  PLAYER, HELPER_BONUS, SPAWN, BOT, BOSS, HELP_COOLDOWN_SEC, SCORE,
};
