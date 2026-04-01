/**
 * shared/SkillValidator.js
 *
 * Dev-time validator for SkillDatabase entries.
 * Run with: node shared/SkillValidator.js
 *
 * Checks every skill against the conventions documented in docs/SKILLS.md.
 */

import SkillDatabase from './SkillDatabase.js'

const VALID_TYPES     = ['PROJECTILE', 'MELEE', 'AOE', 'DASH', 'BUFF', 'SHIELD', 'CAST', 'CHANNEL', 'TARGETED', 'SPAWN']
const VALID_SUBTYPES  = ['MULTI', 'BURST', 'TARGETED', 'GRIP', 'AOE_SELF', 'AOE_LOBBED', 'BACKWARDS', 'TELEPORT', 'TOGGLE', 'STEALTH', 'BEAM', 'CHANNELED',
                         'UNTARGETED', 'HEAL_ALLY', 'DAMAGE_ENEMY', 'TELEPORT_BEHIND', 'TOTEM', 'TRAP', 'PET']
const VALID_INPUT     = ['INSTANT', 'DIRECTIONAL', 'AIMED', 'TARGETED', 'SUSTAINED']
const VALID_EFFECTS   = ['DAMAGE', 'HEAL', 'DUAL', 'BUFF', 'DEBUFF', 'FEAR', 'REVIVE', 'GRIP']

// Fields that are always required
const REQUIRED = ['name', 'type', 'inputType', 'cooldown', 'icon']

// Per-type required fields
const TYPE_REQUIRED = {
  PROJECTILE: ['damage', 'speed', 'radius', 'range', 'pierce'],
  MELEE:      ['damage', 'range', 'angle'],
  AOE:        ['radius', 'effectType'],
  DASH:       ['distance', 'speed'],
  BUFF:       ['duration', 'effectParams'],
  SHIELD:     ['arc'],
  CAST:       ['castTime', 'payload'],
  CHANNEL:    ['castTime', 'tickRate'],
  TARGETED:   ['range'],
  SPAWN:      ['duration'],
}

// Subtype-specific additional requirements
const SUBTYPE_REQUIRED = {
  MULTI:         ['projectileCount', 'spreadAngle'],
  AOE_LOBBED:    ['speed', 'range'],
  BEAM:          ['range', 'tickRate', 'damagePerTick', 'healPerTick'],
  HEAL_ALLY:     ['healAmount'],
  DAMAGE_ENEMY:  ['damage'],
  TELEPORT_BEHIND: ['damage'],
  TOTEM:         ['totemAbility'],
  TRAP:          ['triggerRadius', 'trapEffect'],
  PET:           ['petStats'],
}

const SUBTYPE_COMPATIBILITY = {
  PROJECTILE: ['MULTI', 'BURST', 'TARGETED', 'GRIP'],
  AOE: ['AOE_SELF', 'AOE_LOBBED'],
  DASH: ['BACKWARDS', 'TELEPORT'],
  BUFF: ['TOGGLE', 'STEALTH', 'TARGETED'],
  CHANNEL: ['BEAM', 'UNTARGETED'],
  TARGETED: ['HEAL_ALLY', 'DAMAGE_ENEMY', 'TELEPORT_BEHIND'],
  SPAWN: ['TOTEM', 'TRAP', 'PET'],
}

let warnings = 0
let errors   = 0

function warn(cls, name, msg) {
  console.warn(`  ⚠️  [${cls}] ${name}: ${msg}`)
  warnings++
}

function error(cls, name, msg) {
  console.error(`  ❌ [${cls}] ${name}: ${msg}`)
  errors++
}

function validateSkill(cls, skill, index) {
  const label = skill.name || `skill[${index}]`

  // Required base fields
  for (const field of REQUIRED) {
    if (skill[field] === undefined) error(cls, label, `missing required field '${field}'`)
  }

  // Valid type
  if (!VALID_TYPES.includes(skill.type)) {
    error(cls, label, `unknown type '${skill.type}' — valid: ${VALID_TYPES.join(', ')}`)
    return // Can't validate further without valid type
  }

  // Valid subtype (if provided)
  if (skill.subtype !== undefined && !VALID_SUBTYPES.includes(skill.subtype)) {
    error(cls, label, `unknown subtype '${skill.subtype}' — valid: ${VALID_SUBTYPES.join(', ')}`)
  }

  const allowedSubtypes = SUBTYPE_COMPATIBILITY[skill.type]
  if (skill.subtype !== undefined && allowedSubtypes && !allowedSubtypes.includes(skill.subtype)) {
    warn(cls, label, `subtype '${skill.subtype}' is unusual for type ${skill.type} — check docs and runtime alignment`)
  }

  // Valid inputType
  if (!VALID_INPUT.includes(skill.inputType)) {
    error(cls, label, `unknown inputType '${skill.inputType}' — valid: ${VALID_INPUT.join(', ')}`)
  }

  if (skill.inputType === 'AIMED' && skill.type !== 'PROJECTILE' && skill.type !== 'MELEE') {
    warn(cls, label, `AIMED is currently intended for single-fire aim interactions; confirm controller semantics are documented for ${skill.type}`)
  }

  // Per-type required fields (with exceptions for known valid variations)
  const typeRequired = TYPE_REQUIRED[skill.type] || []
  for (const field of typeRequired) {
    if (skill[field] === undefined) {
      // Known exceptions:
      //   PROJECTILE/TARGETED = heal-only, no damage field needed
      if (field === 'damage' && skill.subtype === 'TARGETED') continue
      //   DASH/TELEPORT = instant warp, no speed needed
      if (field === 'speed' && skill.subtype === 'TELEPORT') continue
      //   CAST/BEAM = uses own tick fields instead of payload
      if (field === 'payload' && skill.subtype === 'BEAM') continue
      //   CHANNEL/BEAM = uses own tick fields instead of payload
      if (field === 'payload' && skill.type === 'CHANNEL' && skill.subtype === 'BEAM') continue
      //   TARGETED/HEAL_ALLY = no damage field
      if (field === 'damage' && skill.type === 'TARGETED' && skill.subtype === 'HEAL_ALLY') continue

      warn(cls, label, `type ${skill.type} usually requires '${field}'`)
    }
  }

  // Per-subtype required fields
  const subtypeRequired = SUBTYPE_REQUIRED[skill.subtype] || []
  for (const field of subtypeRequired) {
    if (skill[field] === undefined) {
      warn(cls, label, `subtype ${skill.subtype} usually requires '${field}'`)
    }
  }

  // effectType validation (if present)
  if (skill.effectType !== undefined && !VALID_EFFECTS.includes(skill.effectType)) {
    error(cls, label, `unknown effectType '${skill.effectType}' — valid: ${VALID_EFFECTS.join(', ')}`)
  }

  // AOE needs effectType
  if (skill.type === 'AOE' && !skill.effectType) {
    error(cls, label, `AOE skills must have 'effectType'`)
  }

  // BUFF needs effectParams
  if (skill.type === 'BUFF' && !skill.effectParams) {
    error(cls, label, `BUFF skills must have 'effectParams'`)
  }

  // TOGGLE should have duration: -1
  if (skill.subtype === 'TOGGLE' && skill.duration !== -1) {
    warn(cls, label, `TOGGLE buffs should have duration: -1 (permanent while toggled on)`)
  }

  // CAST / CHANNEL payload validation
  if ((skill.type === 'CAST' || skill.type === 'CHANNEL') && skill.payload) {
    if (!VALID_TYPES.includes(skill.payload.type)) {
      error(cls, label, `payload.type '${skill.payload.type}' is not a valid skill type`)
    }
  }

  if (skill.type === 'CAST' && skill.inputType === 'DIRECTIONAL' && skill.castBar !== true) {
    warn(cls, label, `DIRECTIONAL CAST skills should set castBar: true so controller and host cast UI stay aligned`)
  }

  if (skill.type === 'TARGETED' && skill.castBar === true && skill.castTime == null) {
    warn(cls, label, `TARGETED skills with castBar should define castTime`)
  }

  if (skill.type === 'CHANNEL' && skill.subtype === 'UNTARGETED' && !skill.payload) {
    warn(cls, label, `CHANNEL/UNTARGETED usually requires a payload to define each tick's effect`)
  }

  // Cooldown sanity
  if (typeof skill.cooldown === 'number' && skill.cooldown < 100) {
    warn(cls, label, `cooldown ${skill.cooldown}ms seems very short — intentional?`)
  }
}

// Run validation
console.log('Validating SkillDatabase...\n')

for (const [cls, skills] of Object.entries(SkillDatabase)) {
  if (!Array.isArray(skills)) {
    error(cls, '(class)', 'skill list must be an array')
    continue
  }
  if (skills.length !== 4) {
    warn(cls, '(class)', `has ${skills.length} skills — expected 4`)
  }
  skills.forEach((skill, i) => validateSkill(cls, skill, i))
}

console.log('')
if (errors === 0 && warnings === 0) {
  console.log('✅ All skills valid — no issues found.')
} else {
  if (errors > 0)   console.error(`❌ ${errors} error(s) found`)
  if (warnings > 0) console.warn(`⚠️  ${warnings} warning(s) found`)
  process.exit(errors > 0 ? 1 : 0)
}
