/**
 * shared/ClassConfig.js
 * Class definitions — stats and skill list references.
 * Imported by both server (for HP/speed) and client (for rendering + UI).
 */

import SkillDatabase from './SkillDatabase.js'

export const CLASS_NAMES = [
  'Warrior', 'Paladin', 'Shaman', 'Hunter',  'Priest',
  'Mage',    'Druid',   'Rogue',  'Warlock', 'DeathKnight'
]

export const CLASSES = {
  Warrior:     { name: 'Warrior',       color: '#3498db', hp: 120, speed: 2.0, skills: SkillDatabase.Warrior     },
  Paladin:     { name: 'Paladin',       color: '#f39c12', hp: 120, speed: 2.0, skills: SkillDatabase.Paladin     },
  Shaman:      { name: 'Shaman',        color: '#9b59b6', hp: 100, speed: 2.0, skills: SkillDatabase.Shaman      },
  Hunter:      { name: 'Hunter',        color: '#27ae60', hp: 80, speed: 2.0, skills: SkillDatabase.Hunter      },
  Priest:      { name: 'Priest',        color: '#ecf0f1', hp:  8000, speed: 1.8, skills: SkillDatabase.Priest      },
  Mage:        { name: 'Mage',          color: '#e74c3c', hp:  80, speed: 1.8, skills: SkillDatabase.Mage        },
  Druid:       { name: 'Druid',         color: '#16a085', hp: 100, speed: 2.0, skills: SkillDatabase.Druid       },
  Rogue:       { name: 'Rogue',         color: '#34495e', hp:  100, speed: 2.2, skills: SkillDatabase.Rogue       },
  Warlock:     { name: 'Warlock',       color: '#8b5cf6', hp:  80, speed: 1.8, skills: SkillDatabase.Warlock     },
  DeathKnight: { name: 'Death Knight',  color: '#60a5fa', hp: 120, speed: 2.0, skills: SkillDatabase.DeathKnight },
}

/**
 * Safely resolve a class name to the canonical key.
 * Accepts any case ('warrior', 'WARRIOR', 'Warrior') → 'Warrior'
 * Also handles multi-word keys ('deathknight', 'DeathKnight', 'death knight') → 'DeathKnight'
 */
export function resolveClassName(raw) {
  if (!raw) return null
  // Direct match (already canonical)
  if (CLASSES[raw]) return raw
  // Case-insensitive match against keys
  const lower = raw.toLowerCase().replace(/\s+/g, '')
  for (const key of CLASS_NAMES) {
    if (key.toLowerCase() === lower) return key
  }
  // Simple title-case fallback for single-word classes
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
  return CLASSES[title] ? title : null
}
