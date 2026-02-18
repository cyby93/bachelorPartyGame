/**
 * Config.js
 * 
 * General game configuration constants
 */

export const GAME_CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,
  TARGET_FPS: 60,
  PLAYER_COLLISION_RADIUS: 20,
  BOSS_COLLISION_RADIUS: 60,
  REVIVE_TIME: 3000,
  REVIVE_DISTANCE: 80
};

export const INPUT_CONFIG = {
  TAP_THRESHOLD: 150,
  DEADZONE: 0.2,
  JOYSTICK_SIZE: 100
};

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GAME_CONFIG, INPUT_CONFIG };
}
