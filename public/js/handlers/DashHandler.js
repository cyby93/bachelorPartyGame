/**
 * DashHandler.js
 * 
 * Handles rapid movement and teleportation abilities
 * Manages dash execution, teleportation, and path validation
 */

export default class DashHandler {
  /**
   * Execute dash movement
   * @param {Player} player - The player
   * @param {Object} config - Skill configuration
   * @param {Object} direction - Dash direction {x, y}
   */
  executeDash(player, config, direction) {
    if (!player || !config || !direction) {
      console.error('DashHandler.executeDash: Missing required parameters');
      return false;
    }

    // Check if backwards dash (e.g., Hunter Disengage)
    if (config.subtype === 'BACKWARDS') {
      direction = { x: -direction.x, y: -direction.y };
    }

    // Calculate target position
    const distance = config.distance || 200;
    const targetX = player.x + direction.x * distance;
    const targetY = player.y + direction.y * distance;

    // Check if path is clear (optional, can be disabled for certain abilities)
    const targetPos = { x: targetX, y: targetY };
    if (!this.isPathClear(player, targetPos)) {
      // Clamp to nearest valid position
      const validPos = this.findNearestValidPosition(player, targetPos);
      targetPos.x = validPos.x;
      targetPos.y = validPos.y;
    }

    // Apply dash velocity (smooth movement over short time)
    const dashDuration = 200;  // 200ms dash
    const speed = config.speed || 800;
    
    player.isDashing = true;
    player.dashStartTime = Date.now();
    player.dashDuration = dashDuration;
    player.dashVelocity = {
      x: direction.x * speed / 60,  // Assuming 60 FPS
      y: direction.y * speed / 60
    };

    return true;
  }

  /**
   * Execute instant teleport
   * @param {Player} player - The player
   * @param {Object} config - Skill configuration
   * @param {Object} direction - Teleport direction {x, y}
   */
  executeTeleport(player, config, direction) {
    if (!player || !config || !direction) {
      console.error('DashHandler.executeTeleport: Missing required parameters');
      return false;
    }

    // Calculate target position
    const distance = config.distance || 150;
    const targetX = player.x + direction.x * distance;
    const targetY = player.y + direction.y * distance;

    // For teleport, we can optionally allow passing through walls
    // (e.g., Mage Blink can pass through walls)
    const canPassThroughWalls = config.canPassThroughWalls !== false;

    if (!canPassThroughWalls) {
      const targetPos = { x: targetX, y: targetY };
      if (!this.isPathClear(player, targetPos)) {
        const validPos = this.findNearestValidPosition(player, targetPos);
        player.x = validPos.x;
        player.y = validPos.y;
        return true;
      }
    }

    // Instantly move player
    player.x = targetX;
    player.y = targetY;

    return true;
  }

  /**
   * Update dash state (called in game loop)
   * @param {Player} player - The player
   * @param {number} deltaTime - Time since last update
   */
  updateDash(player, deltaTime) {
    if (!player || !player.isDashing) return;

    const elapsed = Date.now() - player.dashStartTime;

    if (elapsed >= player.dashDuration) {
      // Dash complete
      player.isDashing = false;
      player.dashVelocity = null;
    } else {
      // Apply dash velocity
      if (player.dashVelocity) {
        player.x += player.dashVelocity.x;
        player.y += player.dashVelocity.y;
      }
    }
  }

  /**
   * Check if dash path is valid (no walls)
   * @param {Player} player - The player
   * @param {Object} targetPosition - Intended destination {x, y}
   * @returns {boolean} True if path is clear
   */
  isPathClear(player, targetPosition) {
    if (!player || !targetPosition) return false;

    // Check bounds
    const CANVAS_WIDTH = 800;  // Default, should be from GAME_CONFIG
    const CANVAS_HEIGHT = 600;

    if (targetPosition.x < 0 || targetPosition.x > CANVAS_WIDTH ||
        targetPosition.y < 0 || targetPosition.y > CANVAS_HEIGHT) {
      return false;
    }

    // TODO: Add wall collision checking if walls exist in scene
    // For now, just check bounds

    return true;
  }

  /**
   * Find nearest valid position if target is invalid
   * @param {Player} player - The player
   * @param {Object} targetPosition - Intended destination {x, y}
   * @returns {Object} Valid position {x, y}
   */
  findNearestValidPosition(player, targetPosition) {
    if (!player || !targetPosition) {
      return { x: player.x, y: player.y };
    }

    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Clamp to bounds
    const validX = Math.max(0, Math.min(CANVAS_WIDTH, targetPosition.x));
    const validY = Math.max(0, Math.min(CANVAS_HEIGHT, targetPosition.y));

    return { x: validX, y: validY };
  }
}
