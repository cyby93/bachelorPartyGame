/**
 * shared/GameConfig.js
 * Single source of truth for game constants — used by both server and client.
 */

export const GAME_CONFIG = {
  // Arena
  CANVAS_WIDTH:  1024,
  CANVAS_HEIGHT: 768,

  // Server loop
  TICK_RATE: 20,          // server game ticks per second

  // Entity collision radii
  PLAYER_RADIUS: 20,
  BOSS_RADIUS:   60,
  ENEMY_RADIUS:  15,

  // Revive mechanic
  REVIVE_DISTANCE: 80,    // px — how close a reviver must stand
  REVIVE_TIME:     3000,  // ms — how long they must stand there

  // Game rules
  MAX_PLAYERS:    13,
  ENEMY_KILL_GOAL: 50,    // kills needed to end the trash-mob phase
}
