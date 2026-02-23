/**
 * ShieldHandler.js
 * 
 * Handles directional blocking mechanics
 * Manages shield activation, blocking calculations, and duration tracking
 */

export default class ShieldHandler {
  /**
   * Activate shield
   * @param {Player} player - The player shielding
   * @param {Object} config - Skill configuration
   * @param {number} angle - Shield facing angle in radians
   */
  activate(player, config, angle) {
    if (!player || !config) {
      console.error('ShieldHandler.activate: Missing required parameters');
      return false;
    }

    // Store original speed if not already stored
    if (player.originalSpeed === undefined) {
      player.originalSpeed = player.speed || 200;
    }

    // Initialize shield state
    player.shieldState = {
      active: true,
      angle: angle,
      arc: config.arc || Math.PI / 2,  // Default 90 degrees
      startTime: Date.now(),
      duration: config.duration || 3000,
      config: config
    };

    // Set shielding flag
    player.isShielding = true;

    // Reduce movement speed by 50%
    player.speed = player.originalSpeed * 0.5;

    return true;
  }

  /**
   * Deactivate shield
   * @param {Player} player - The player
   */
  deactivate(player) {
    if (!player) return;

    // Restore movement speed
    if (player.originalSpeed !== undefined) {
      player.speed = player.originalSpeed;
    }

    // Clear shield state
    if (player.shieldState) {
      player.shieldState.active = false;
    }
    player.isShielding = false;
  }

  /**
   * Check if an incoming projectile is blocked
   * @param {Player} player - The shielding player
   * @param {Projectile} projectile - The incoming projectile
   * @returns {boolean} True if blocked
   */
  isBlocked(player, projectile) {
    if (!player || !projectile || !player.shieldState || !player.shieldState.active) {
      return false;
    }

    const shieldState = player.shieldState;

    // Calculate impact angle
    const dx = projectile.x - player.x;
    const dy = projectile.y - player.y;
    const impactAngle = Math.atan2(dy, dx);

    // Calculate angle difference
    let angleDiff = Math.abs(impactAngle - shieldState.angle);

    // Normalize to [0, PI]
    while (angleDiff > Math.PI) {
      angleDiff -= 2 * Math.PI;
    }
    while (angleDiff < -Math.PI) {
      angleDiff += 2 * Math.PI;
    }
    angleDiff = Math.abs(angleDiff);

    // Check if within shield arc
    return angleDiff < shieldState.arc / 2;
  }

  /**
   * Update shield state and duration
   * @param {Player} player - The player
   * @param {number} deltaTime - Time since last update
   * @returns {boolean} True if shield is still active
   */
  update(player, deltaTime) {
    if (!player || !player.shieldState || !player.shieldState.active) {
      return false;
    }

    const shieldState = player.shieldState;
    const elapsed = Date.now() - shieldState.startTime;

    // Check if duration expired
    if (elapsed >= shieldState.duration) {
      this.deactivate(player);
      return false;
    }

    return true;
  }

  /**
   * Update shield angle (for directional shields)
   * @param {Player} player - The player
   * @param {number} angle - New shield angle in radians
   */
  updateAngle(player, angle) {
    if (player && player.shieldState && player.shieldState.active) {
      player.shieldState.angle = angle;
    }
  }
}
