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
