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
  PLAYER_RADIUS:   20,   // legacy circle radius — used for wall push and spawn padding
  PLAYER_RADIUS_X: 15,   // oval hitbox horizontal semi-axis (wider — screen left/right)
  PLAYER_RADIUS_Y: 30,   // oval hitbox vertical semi-axis   (narrower — foreshortened depth)
  ENEMY_RADIUS:    15,

  // Revive mechanic
  REVIVE_DISTANCE: 80,    // px — how close a reviver must stand
  REVIVE_TIME:     3000,  // ms — how long they must stand there

  // Game rules
  MAX_PLAYERS:    13,

  // Quiz & upgrade system (between levels)
  QUIZ_BETWEEN_LEVELS: true,

  // Debug flags — set to true locally to aid development, never commit as true
  DEBUG_HITBOXES: true,
  DEV_DISABLE_AUDIO: false,
}
