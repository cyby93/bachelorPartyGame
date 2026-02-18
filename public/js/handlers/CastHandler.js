/**
 * CastHandler.js
 * 
 * Handles charge-up abilities with payload execution
 * Manages cast state, progress tracking, and interruption logic
 */

export default class CastHandler {
  /**
   * Start a cast
   * @param {Player} player - The player casting
   * @param {Object} config - Skill configuration
   * @param {Object} inputData - Input data from cast start
   */
  startCast(player, config, inputData) {
    if (!player || !config) {
      console.error('CastHandler.startCast: Missing required parameters');
      return false;
    }

    // Initialize cast state if not exists
    if (!player.castState) {
      player.castState = {};
    }

    // Store original movement speed
    if (player.originalSpeed === undefined) {
      player.originalSpeed = player.speed || 200;
    }

    // Set cast state
    player.castState = {
      active: true,
      startTime: Date.now(),
      castTime: config.castTime,
      config: config,
      inputData: inputData,
      originalSpeed: player.originalSpeed,
      originalX: player.x,
      originalY: player.y,
      isChanneled: config.subtype === 'CHANNELED'
    };

    // Freeze or slow player movement
    player.speed = 0;  // Freeze during cast
    player.isCasting = true;

    return true;
  }

  /**
   * Update cast progress
   * @param {Player} player - The player casting
   * @param {number} deltaTime - Time since last update
   * @returns {boolean} True if cast completed
   */
  updateCast(player, deltaTime) {
    if (!player || !player.castState || !player.castState.active) {
      return false;
    }

    const castState = player.castState;
    const elapsed = Date.now() - castState.startTime;
    const progress = Math.min(elapsed / castState.castTime, 1.0);

    // Check for movement (interrupts cast)
    if (castState.originalX !== undefined && castState.originalY !== undefined) {
      const moved = Math.abs(player.x - castState.originalX) > 1 || 
                    Math.abs(player.y - castState.originalY) > 1;
      if (moved) {
        this.cancelCast(player);
        return false;
      }
    }

    // Check if cast completed
    if (elapsed >= castState.castTime) {
      return true;  // Cast complete
    }

    return false;  // Still casting
  }

  /**
   * Cancel an in-progress cast
   * @param {Player} player - The player casting
   */
  cancelCast(player) {
    if (!player || !player.castState) return;

    // Restore movement speed
    if (player.castState.originalSpeed !== undefined) {
      player.speed = player.castState.originalSpeed;
    }

    // Clear cast state
    player.castState.active = false;
    player.isCasting = false;

    // Clean up progress bar if exists
    if (player.castState.progressBar) {
      player.castState.progressBar = null;
    }
  }

  /**
   * Complete cast and execute payload
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player
   * @param {Object} skillManager - Reference to SkillManager for payload execution
   * @returns {boolean} True if payload executed successfully
   */
  completeCast(scene, player, skillManager) {
    if (!player || !player.castState || !player.castState.active) {
      return false;
    }

    const castState = player.castState;
    const payload = castState.config.payload;

    // Restore movement speed
    if (castState.originalSpeed !== undefined) {
      player.speed = castState.originalSpeed;
    }

    // Mark cast as complete
    player.castState.active = false;
    player.isCasting = false;

    // Execute payload if exists
    if (payload && skillManager) {
      return this.executePayload(scene, player, payload, castState.inputData, skillManager);
    }

    return true;
  }

  /**
   * Execute the payload ability on cast completion
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player
   * @param {Object} payloadConfig - Payload skill configuration
   * @param {Object} inputData - Input data from cast start
   * @param {Object} skillManager - Reference to SkillManager
   * @returns {boolean} True if executed successfully
   */
  executePayload(scene, player, payloadConfig, inputData, skillManager) {
    if (!scene || !player || !payloadConfig || !skillManager) {
      console.error('CastHandler.executePayload: Missing required parameters');
      return false;
    }

    // Route payload to appropriate handler based on type
    switch (payloadConfig.type) {
      case 'PROJECTILE':
        if (skillManager.projectileHandler) {
          return skillManager.projectileHandler.spawn(scene, player, payloadConfig, inputData.vector);
        }
        break;
      
      case 'AOE':
        if (skillManager.aoeHandler) {
          if (payloadConfig.subtype === 'AOE_SELF') {
            return skillManager.aoeHandler.executeSelf(scene, player, payloadConfig);
          } else if (payloadConfig.subtype === 'AOE_LOBBED') {
            return skillManager.aoeHandler.executeLobbed(scene, player, payloadConfig, inputData.vector, inputData.intensity);
          }
        }
        break;
      
      default:
        console.warn('CastHandler.executePayload: Unknown payload type:', payloadConfig.type);
        return false;
    }

    return true;
  }

  /**
   * Get cast progress percentage
   * @param {Player} player - The player casting
   * @returns {number} Progress from 0.0 to 1.0
   */
  getCastProgress(player) {
    if (!player || !player.castState || !player.castState.active) {
      return 0;
    }

    const elapsed = Date.now() - player.castState.startTime;
    return Math.min(elapsed / player.castState.castTime, 1.0);
  }

  /**
   * Render cast progress bar
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Player} player - The player casting
   */
  renderProgress(ctx, player) {
    if (!player || !player.castState || !player.castState.active) return;

    const progress = this.getCastProgress(player);
    const barWidth = 60;
    const barHeight = 6;
    const x = player.x - barWidth / 2;
    const y = player.y - 40;  // Above player

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Progress fill
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Percentage text
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, player.x, y - 2);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CastHandler;
}
