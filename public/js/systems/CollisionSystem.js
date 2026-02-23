/**
 * CollisionSystem.js
 * 
 * Handles all collision detection for abilities
 * Provides utility methods for projectile, melee, AOE, and shield collision checks
 */

export default class CollisionSystem {
  /**
   * Check projectile collision with walls and entities
   * @param {Projectile} projectile - The projectile
   * @param {Scene} scene - The game scene
   * @returns {Object|null} The entity hit, or null if wall/none
   */
  checkProjectileCollision(projectile, scene) {
    if (!projectile || !scene) return null;

    // Check bounds (walls)
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    if (projectile.x < 0 || projectile.x > CANVAS_WIDTH ||
        projectile.y < 0 || projectile.y > CANVAS_HEIGHT) {
      return 'wall';
    }

    // Check entities
    const entities = this.getAllEntities(scene);

    for (const entity of entities) {
      // Skip owner
      if (entity === projectile.owner) continue;

      // Check collision
      if (this.checkCircleCollision(projectile, entity)) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Check if point is within melee cone
   * @param {Object} origin - Attack origin {x, y}
   * @param {Object} target - Target position {x, y}
   * @param {Object} direction - Attack direction {x, y}
   * @param {number} range - Attack range
   * @param {number} coneAngle - Cone angle in radians
   * @returns {boolean} True if within cone
   */
  checkMeleeCone(origin, target, direction, range, coneAngle) {
    if (!origin || !target || !direction) return false;

    // Calculate distance
    const distance = this.distance(origin, target);
    if (distance > range) return false;

    // Calculate angle difference
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const angleToTarget = Math.atan2(dy, dx);
    const attackAngle = Math.atan2(direction.y, direction.x);

    const angleDiff = this.angleBetween(
      { x: Math.cos(angleToTarget), y: Math.sin(angleToTarget) },
      { x: Math.cos(attackAngle), y: Math.sin(attackAngle) }
    );

    return angleDiff < coneAngle / 2;
  }

  /**
   * Get all entities within radius
   * @param {Scene} scene - The game scene
   * @param {Object} center - Center position {x, y}
   * @param {number} radius - Search radius
   * @returns {Array} Array of entities within radius
   */
  getEntitiesInRadius(scene, center, radius) {
    if (!scene || !center) return [];

    const entities = this.getAllEntities(scene);
    const result = [];

    for (const entity of entities) {
      if (this.distance(center, entity) < radius) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * Calculate angle between two vectors
   * @param {Object} v1 - First vector {x, y}
   * @param {Object} v2 - Second vector {x, y}
   * @returns {number} Angle difference in radians
   */
  angleBetween(v1, v2) {
    if (!v1 || !v2) return 0;

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = dot / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    return angle;
  }

  /**
   * Calculate distance between two points
   * @param {Object} p1 - First point {x, y}
   * @param {Object} p2 - Second point {x, y}
   * @returns {number} Distance
   */
  distance(p1, p2) {
    if (!p1 || !p2) return Infinity;

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;

    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check circle-to-circle collision
   * @param {Object} obj1 - First object with x, y, radius
   * @param {Object} obj2 - Second object with x, y, radius
   * @returns {boolean} True if colliding
   */
  checkCircleCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;

    const radius1 = obj1.radius || 10;
    const radius2 = obj2.radius || 20;

    const distance = this.distance(obj1, obj2);

    return distance < (radius1 + radius2);
  }

  /**
   * Get all entities from scene
   * @param {Scene} scene - The game scene
   * @returns {Array} Array of all entities
   */
  getAllEntities(scene) {
    const entities = [];

    // Add players
    if (scene.players && Array.isArray(scene.players)) {
      entities.push(...scene.players.filter(p => p.isAlive !== false));
    }

    // Add boss
    if (scene.boss && scene.boss.isAlive) {
      entities.push(scene.boss);
    }

    // Add enemies
    if (scene.enemies && Array.isArray(scene.enemies)) {
      entities.push(...scene.enemies.filter(e => e.isAlive));
    }

    return entities;
  }

  /**
   * Normalize a vector
   * @param {Object} vector - Vector {x, y}
   * @returns {Object} Normalized vector {x, y}
   */
  normalize(vector) {
    if (!vector) return { x: 0, y: 0 };

    const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);

    if (magnitude === 0) return { x: 0, y: 0 };

    return {
      x: vector.x / magnitude,
      y: vector.y / magnitude
    };
  }
}
