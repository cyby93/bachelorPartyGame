/**
 * shared/ClassConfig.js
 * Class definitions — stats and skill list references.
 * Imported by both server (for HP/speed) and client (for rendering + UI).
 */

import SkillDatabase from './SkillDatabase.js'

export const CLASS_NAMES = [
  'Warrior', 'Paladin', 'Shaman', 'Hunter',
  'Priest',  'Mage',    'Druid',  'Rogue'
]

export const CLASSES = {
  Warrior: { name: 'Warrior', color: '#3498db', hp: 150, speed: 2.5, skills: SkillDatabase.Warrior },
  Paladin: { name: 'Paladin', color: '#f39c12', hp: 140, speed: 2.3, skills: SkillDatabase.Paladin },
  Shaman:  { name: 'Shaman',  color: '#9b59b6', hp: 110, speed: 2.6, skills: SkillDatabase.Shaman  },
  Hunter:  { name: 'Hunter',  color: '#27ae60', hp: 100, speed: 3.0, skills: SkillDatabase.Hunter  },
  Priest:  { name: 'Priest',  color: '#ecf0f1', hp:  90, speed: 2.4, skills: SkillDatabase.Priest  },
  Mage:    { name: 'Mage',    color: '#e74c3c', hp:  85, speed: 2.5, skills: SkillDatabase.Mage    },
  Druid:   { name: 'Druid',   color: '#16a085', hp: 120, speed: 2.7, skills: SkillDatabase.Druid   },
  Rogue:   { name: 'Rogue',   color: '#34495e', hp:  95, speed: 3.2, skills: SkillDatabase.Rogue   }
}

/**
 * Safely resolve a class name to the canonical key.
 * Accepts any case ('warrior', 'WARRIOR', 'Warrior') → 'Warrior'
 */
export function resolveClassName(raw) {
  if (!raw) return null
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  return CLASSES[title] ? title : null
}
