/**
 * ClassConfig.js
 * 
 * Class configuration including skills from SkillDatabase
 */

import SkillDatabase from './SkillDatabase.js';

// Class name normalization - maps any case variant to the canonical form
export const CLASS_NAMES = {
  // Canonical uppercase keys (used in SkillDatabase)
  WARRIOR: 'Warrior',
  PALADIN: 'Paladin',
  SHAMAN: 'Shaman',
  HUNTER: 'Hunter',
  PRIEST: 'Priest',
  MAGE: 'Mage',
  DRUID: 'Druid',
  ROGUE: 'Rogue',
  
  // Sentence case variants (used in HTML)
  Warrior: 'Warrior',
  Paladin: 'Paladin',
  Shaman: 'Shaman',
  Hunter: 'Hunter',
  Priest: 'Priest',
  Mage: 'Mage',
  Druid: 'Druid',
  Rogue: 'Rogue',
  
  // Lowercase variants (for safety)
  warrior: 'Warrior',
  paladin: 'Paladin',
  shaman: 'Shaman',
  hunter: 'Hunter',
  priest: 'Priest',
  mage: 'Mage',
  druid: 'Druid',
  rogue: 'Rogue'
};

/**
 * Normalize class name to canonical form (Sentence case)
 * @param {string} className - Class name in any case
 * @returns {string} Normalized class name
 */
export function normalizeClassName(className) {
  if (!className) return null;
  return CLASS_NAMES[className] || CLASS_NAMES[className.toUpperCase()] || null;
}

export const CLASSES = {
  [CLASS_NAMES.WARRIOR]: {
    name: 'Warrior',
    color: '#3498db',
    hp: 150,
    speed: 2.5,
    skills: SkillDatabase['Warrior']
  },
  [CLASS_NAMES.PALADIN]: {
    name: 'Paladin',
    color: '#f39c12',
    hp: 140,
    speed: 2.3,
    skills: SkillDatabase['Paladin']
  },
  [CLASS_NAMES.SHAMAN]: {
    name: 'Shaman',
    color: '#9b59b6',
    hp: 110,
    speed: 2.6,
    skills: SkillDatabase['Shaman']
  },
  [CLASS_NAMES.HUNTER]: {
    name: 'Hunter',
    color: '#27ae60',
    hp: 100,
    speed: 3.0,
    skills: SkillDatabase['Hunter']
  },
  [CLASS_NAMES.PRIEST]: {
    name: 'Priest',
    color: '#ecf0f1',
    hp: 90,
    speed: 2.4,
    skills: SkillDatabase['Priest']
  },
  [CLASS_NAMES.MAGE]: {
    name: 'Mage',
    color: '#e74c3c',
    hp: 85,
    speed: 2.5,
    skills: SkillDatabase['Mage']
  },
  [CLASS_NAMES.DRUID]: {
    name: 'Druid',
    color: '#16a085',
    hp: 120,
    speed: 2.7,
    skills: SkillDatabase['Druid']
  },
  [CLASS_NAMES.ROGUE]: {
    name: 'Rogue',
    color: '#34495e',
    hp: 95,
    speed: 3.2,
    skills: SkillDatabase['Rogue']
  }
};
