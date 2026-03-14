/**
 * server/systems/CollisionSystem.js
 * Pure geometry helpers used by the server for all collision checks.
 * No state — all methods are stateless utilities.
 */
export default class CollisionSystem {

  /** Euclidean distance between two points. */
  distance(a, b) {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /** True if two circles overlap. Both objects must have .x, .y, .radius */
  circlesOverlap(a, b) {
    return this.distance(a, b) < (a.radius + b.radius)
  }

  /** True if a point is inside a circle. */
  pointInCircle(point, circle) {
    return this.distance(point, circle) < circle.radius
  }

  /**
   * Cone (sector) check — used for melee attacks.
   *
   * @param {object} origin    – { x, y } attacker position
   * @param {object} dirVector – { x, y } normalised aim direction
   * @param {number} halfAngle – half the cone angle in radians  (e.g. π/6 for a 60° cone)
   * @param {number} range     – maximum distance in pixels
   * @param {object} target    – { x, y } target position
   * @returns {boolean}
   */
  inCone(origin, dirVector, halfAngle, range, target) {
    const dx   = target.x - origin.x
    const dy   = target.y - origin.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > range) return false

    const targetAngle = Math.atan2(dy, dx)
    const dirAngle    = Math.atan2(dirVector.y, dirVector.x)

    let diff = Math.abs(targetAngle - dirAngle)
    if (diff > Math.PI) diff = Math.PI * 2 - diff   // wrap to [0, π]

    return diff <= halfAngle
  }

  /**
   * Returns all targets within a circular radius.
   * @param {object}   center  – { x, y }
   * @param {number}   radius
   * @param {Iterable} targets – iterable of objects with { x, y, radius? }
   */
  inRadius(center, radius, targets) {
    const hits = []
    for (const t of targets) {
      if (this.distance(center, t) <= radius + (t.radius ?? 0)) hits.push(t)
    }
    return hits
  }
}
