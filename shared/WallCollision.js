/**
 * shared/WallCollision.js
 * Wall collision utilities for multi-room arena layouts.
 *
 * Builds wall segments from room/passage definitions and resolves
 * entity (circle) vs wall (rect) collisions.
 */

/**
 * Build wall segments from an arena definition that has rooms and passages.
 * Wall zones are the gaps between adjacent rooms (sorted by x).
 * Each wall zone is split into solid segments and gate-blocked segments.
 *
 * @param {object} arena – { rooms, passages } from LevelConfig
 * @returns {Array<{ x, y, width, height, gateId: string|null }>}
 */
export function buildWallSegments(arena) {
  const rooms = arena?.rooms
  const passages = arena?.passages
  if (!rooms || rooms.length < 2 || !passages) return []

  const sorted = [...rooms].sort((a, b) => a.x - b.x)
  const segments = []

  for (let i = 0; i < sorted.length - 1; i++) {
    const leftRoom = sorted[i]
    const rightRoom = sorted[i + 1]

    // Wall zone: gap between the right edge of left room and left edge of right room
    const wallX = leftRoom.x + leftRoom.width
    const wallW = rightRoom.x - wallX
    if (wallW <= 0) continue

    const wallTop = Math.min(leftRoom.y, rightRoom.y)
    const wallBottom = Math.max(leftRoom.y + leftRoom.height, rightRoom.y + rightRoom.height)

    // Find passages that cut through this wall zone
    const wallPassages = passages.filter(p => p.x >= wallX && p.x < wallX + wallW)
    wallPassages.sort((a, b) => a.y - b.y)

    // Build solid segments around passages
    let curY = wallTop
    for (const p of wallPassages) {
      // Solid segment above this passage
      if (p.y > curY) {
        segments.push({ x: wallX, y: curY, width: wallW, height: p.y - curY, gateId: null })
      }
      // Passage segment (blocked by gate if configured)
      segments.push({
        x: wallX, y: p.y, width: wallW, height: p.height,
        gateId: p.blockedByGate ?? null,
      })
      curY = p.y + p.height
    }
    // Solid segment below last passage
    if (curY < wallBottom) {
      segments.push({ x: wallX, y: curY, width: wallW, height: wallBottom - curY, gateId: null })
    }
  }

  return segments
}

/**
 * Resolve wall collision for a circular entity. Pushes the circle out of
 * any solid wall segment along the shortest penetration axis.
 *
 * @param {number} x      – entity center x
 * @param {number} y      – entity center y
 * @param {number} radius – entity radius
 * @param {Array}  segments – from buildWallSegments
 * @param {function} isGateDead – (gateId) => boolean
 * @returns {{ x: number, y: number }}
 */
export function resolveWallCollision(x, y, radius, segments, isGateDead) {
  if (!segments || segments.length === 0) return { x, y }

  for (const seg of segments) {
    // Skip passages whose gate has been destroyed (passage is open)
    if (seg.gateId && isGateDead(seg.gateId)) continue

    // Closest point on the rect to the circle center
    const cx = Math.max(seg.x, Math.min(x, seg.x + seg.width))
    const cy = Math.max(seg.y, Math.min(y, seg.y + seg.height))

    const dx = x - cx
    const dy = y - cy
    const distSq = dx * dx + dy * dy

    if (distSq < radius * radius) {
      // Circle overlaps this wall segment — push out
      const dist = Math.sqrt(distSq)
      if (dist === 0) {
        // Center is inside the rect — push out along x axis toward nearest edge
        const pushLeft = x - seg.x
        const pushRight = (seg.x + seg.width) - x
        if (pushLeft < pushRight) {
          x = seg.x - radius
        } else {
          x = seg.x + seg.width + radius
        }
      } else {
        const overlap = radius - dist
        x += (dx / dist) * overlap
        y += (dy / dist) * overlap
      }
    }
  }

  return { x, y }
}

/**
 * Check if a circle overlaps any solid wall segment (for projectile destruction).
 *
 * @param {number} x      – circle center x
 * @param {number} y      – circle center y
 * @param {number} radius – circle radius
 * @param {Array}  segments – from buildWallSegments
 * @param {function} isGateDead – (gateId) => boolean
 * @returns {boolean}
 */
export function hitsWall(x, y, radius, segments, isGateDead) {
  if (!segments || segments.length === 0) return false

  for (const seg of segments) {
    // Gate-blocked passages let projectiles through — the gate's hitbox handles collision
    if (seg.gateId) continue

    const cx = Math.max(seg.x, Math.min(x, seg.x + seg.width))
    const cy = Math.max(seg.y, Math.min(y, seg.y + seg.height))

    const dx = x - cx
    const dy = y - cy
    if (dx * dx + dy * dy < radius * radius) return true
  }

  return false
}
