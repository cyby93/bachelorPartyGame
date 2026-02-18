/**
 * Constants.js
 * 
 * Central export point for all game constants
 * Re-exports from modular config files for backward compatibility
 */

export { GAME_CONFIG, INPUT_CONFIG } from './config/Config.js';
export { CLASS_NAMES, CLASSES, normalizeClassName } from './config/ClassConfig.js';
export { BOSS_CONFIG } from './config/BossConfig.js';
export { default as SkillDatabase } from './config/SkillDatabase.js';

// For CommonJS (Node.js) - server.js compatibility
if (typeof module !== 'undefined' && module.exports) {
  const { GAME_CONFIG, INPUT_CONFIG } = require('./config/Config.js');
  const { CLASS_NAMES, CLASSES, normalizeClassName } = require('./config/ClassConfig.js');
  const { BOSS_CONFIG } = require('./config/BossConfig.js');
  
  module.exports = {
    GAME_CONFIG,
    INPUT_CONFIG,
    CLASS_NAMES,
    CLASSES,
    normalizeClassName,
    BOSS_CONFIG
  };
}
