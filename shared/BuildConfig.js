export const BUILD_MODE = process.env.BUILD_MODE || 'dev';
export const IS_TEST    = BUILD_MODE === 'test';
export const IS_DEV     = BUILD_MODE === 'dev';
export const IS_PROD    = BUILD_MODE === 'prod';

// Tune test-mode Priest overrides here
export const TEST_OVERRIDES = {
  PRIEST_HP_MULT:     10, // 80 → 800
  PRIEST_DAMAGE_MULT: 50, 
  PRIEST_HEAL_MULT:   20,  
};
