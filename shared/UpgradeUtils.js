/**
 * shared/UpgradeUtils.js
 * Utilities for applying skill upgrade deltas.
 */

import { UPGRADE_CONFIG } from './UpgradeConfig.js'

/**
 * Deep-clone a plain object (no functions, no circular refs).
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepClone)
  const out = {}
  for (const k of Object.keys(obj)) out[k] = deepClone(obj[k])
  return out
}

/**
 * Read a dot-separated path from an object.
 * e.g. getPath(obj, 'payload.damage') → obj.payload.damage
 */
function getPath(obj, path) {
  const keys = path.split('.')
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[k]
  }
  return cur
}

/**
 * Set a value at a dot-separated path, creating intermediate objects as needed.
 */
function setPath(obj, path, value) {
  const keys = path.split('.')
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {}
    cur = cur[k]
  }
  cur[keys[keys.length - 1]] = value
}

/**
 * Apply a deltas object onto a (cloned) skill config.
 * Each key is a dot-separated path, each value is added to the existing value.
 */
export function applyDeltas(obj, deltas) {
  for (const [path, delta] of Object.entries(deltas)) {
    const current = getPath(obj, path)
    if (current == null) {
      setPath(obj, path, delta)
    } else {
      setPath(obj, path, current + delta)
    }
  }
  return obj
}

/**
 * Return an upgraded copy of a base skill config with all tiers up to `tier` applied.
 * tier=0 means no upgrades, tier=1 means first upgrade applied, etc.
 */
export function applyUpgrades(baseSkill, className, skillIndex, tier) {
  const tiers = UPGRADE_CONFIG[className]?.[skillIndex]
  if (!tiers || tier <= 0) return baseSkill

  const upgraded = deepClone(baseSkill)
  const appliedTiers = Math.min(tier, tiers.length)
  for (let i = 0; i < appliedTiers; i++) {
    applyDeltas(upgraded, tiers[i].deltas)
  }
  return upgraded
}

/**
 * Get a preview of what the next upgrade tier would change.
 * Returns { label, changes: [{ path, from, to }] } or null if maxed out.
 */
export function getUpgradePreview(baseSkill, className, skillIndex, currentTier) {
  const tiers = UPGRADE_CONFIG[className]?.[skillIndex]
  if (!tiers || currentTier >= tiers.length) return null

  const nextTier = tiers[currentTier]

  // Build the skill as it currently is (with all previous tiers applied)
  const currentSkill = currentTier > 0
    ? applyUpgrades(baseSkill, className, skillIndex, currentTier)
    : baseSkill

  const changes = []
  for (const [path, delta] of Object.entries(nextTier.deltas)) {
    const from = getPath(currentSkill, path) ?? 0
    changes.push({ path, from, to: from + delta })
  }

  return { label: nextTier.label, changes }
}

/**
 * Get the max upgrade tier count for a skill.
 */
export function getMaxTier(className, skillIndex) {
  return UPGRADE_CONFIG[className]?.[skillIndex]?.length ?? 0
}
