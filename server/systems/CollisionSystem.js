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

  /**
   * True if a circle overlaps a player's oval hitbox.
   * The player ellipse uses semi-axes (rx, ry); the circle is expanded by its radius
   * and added to each axis as a simple approximation of the Minkowski sum.
   *
   * @param {{ x, y, rx, ry }} ellipse  – oval centre + semi-axes
   * @param {{ x, y, radius }} circle
   */
  ellipseCircleOverlap(ellipse, circle) {
    const dx = ellipse.x - circle.x
    const dy = ellipse.y - circle.y
    const rx = ellipse.rx + circle.radius
    const ry = ellipse.ry + circle.radius
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
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
  inCone(origin, dirVector, halfAngle, range, target, targetRadius = 0) {
    const dx   = target.x - origin.x
    const dy   = target.y - origin.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist > range + targetRadius) return false
    if (dist < 1) return true

    const targetAngle = Math.atan2(dy, dx)
    const dirAngle    = Math.atan2(dirVector.y, dirVector.x)

    let diff = Math.abs(targetAngle - dirAngle)
    if (diff > Math.PI) diff = Math.PI * 2 - diff   // wrap to [0, π]

    const expansion = targetRadius > 0 ? Math.asin(Math.min(targetRadius / dist, 1)) : 0
    return diff <= halfAngle + expansion
  }

  /**
   * Oriented rectangle check — used for narrow/precise melee attacks (e.g. Rogue).
   * The rectangle extends from the attacker along the aim direction:
   *   forward:  [0, range]
   *   lateral:  [-halfWidth, halfWidth]
   *
   * When targetRadius > 0, uses a closest-point expansion: returns true if the
   * nearest point on the rectangle to the target centre is within targetRadius.
   * This makes the check rect-vs-circle rather than rect-contains-point, so hits
   * register when the target body overlaps the rect edge (not just when the centre
   * is inside).
   *
   * @param {object} origin       – { x, y } attacker position
   * @param {object} dirVector    – { x, y } normalised aim direction
   * @param {number} range        – length of the rectangle in pixels
   * @param {number} halfWidth    – half the width of the rectangle in pixels
   * @param {object} target       – { x, y } target position
   * @param {number} targetRadius – collision radius of the target (default 0 = point check)
   * @returns {boolean}
   */
  inOrientedRect(origin, dirVector, range, halfWidth, target, targetRadius = 0) {
    const dx = target.x - origin.x
    const dy = target.y - origin.y
    const forward = dx * dirVector.x + dy * dirVector.y
    const lateral = dx * (-dirVector.y) + dy * dirVector.x

    if (targetRadius === 0) {
      return forward >= 0 && forward <= range && Math.abs(lateral) <= halfWidth
    }

    // Closest point on the rect to the target centre (in local frame)
    const clampedFwd = Math.max(0, Math.min(forward, range))
    const clampedLat = Math.max(-halfWidth, Math.min(lateral, halfWidth))
    const dFwd = forward - clampedFwd
    const dLat = lateral - clampedLat
    return (dFwd * dFwd + dLat * dLat) <= (targetRadius * targetRadius)
  }

  /**
   * Circle vs ellipse overlap — used for AOE zone vs enemy/boss hit detection.
   * Minkowski sum approximation: (dx/(r+rx))² + (dy/(r+ry))² ≤ 1.
   * Exact at axis-aligned extremes; slight over-estimate at 45°.
   */
  circleOverlapsEllipse(circleCenter, circleRadius, ellipseCenter, rx, ry) {
    const dx  = circleCenter.x - ellipseCenter.x
    const dy  = circleCenter.y - ellipseCenter.y
    const tRX = circleRadius + rx
    const tRY = circleRadius + ry
    return (dx * dx) / (tRX * tRX) + (dy * dy) / (tRY * tRY) <= 1
  }

  /**
   * True if a circle overlaps an axis-aligned rectangle.
   * @param {{ x, y, radius }} circle – circle centre + radius
   * @param {{ x, y, width, height }} rect – rect defined by centre + size
   */
  circleRectOverlap(circle, rect) {
    const halfW = rect.width / 2
    const halfH = rect.height / 2
    const cx = Math.max(rect.x - halfW, Math.min(circle.x, rect.x + halfW))
    const cy = Math.max(rect.y - halfH, Math.min(circle.y, rect.y + halfH))
    const dx = circle.x - cx
    const dy = circle.y - cy
    return (dx * dx + dy * dy) < (circle.radius * circle.radius)
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
