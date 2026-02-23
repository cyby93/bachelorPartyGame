/**
 * ErrorHandler.js
 * 
 * Centralized error handling for the ability system
 * Provides validation, logging, and recovery mechanisms
 */

export default class ErrorHandler {
  /**
   * Validate skill execution parameters
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player
   * @param {number} skillIndex - Skill index
   * @param {Object} inputData - Input data
   * @returns {Object} Validation result {valid: boolean, error: string}
   */
  static validateSkillExecution(scene, player, skillIndex, inputData) {
    // Check scene
    if (!scene) {
      return { valid: false, error: 'Scene is null or undefined' };
    }

    // Check player
    if (!player) {
      return { valid: false, error: 'Player is null or undefined' };
    }

    if (player.isDead) {
      return { valid: false, error: 'Player is dead' };
    }

    if (player.isStunned) {
      return { valid: false, error: 'Player is stunned' };
    }

    // Check skill index
    if (skillIndex === undefined || skillIndex === null) {
      return { valid: false, error: 'Skill index is undefined' };
    }

    if (skillIndex < 0 || skillIndex > 3) {
      return { valid: false, error: `Invalid skill index: ${skillIndex}` };
    }

    // Check input data
    if (!inputData) {
      return { valid: false, error: 'Input data is null or undefined' };
    }

    return { valid: true };
  }

  /**
   * Validate and normalize input data
   * @param {Object} inputData - Raw input data
   * @returns {Object} Normalized input data with safe defaults
   */
  static normalizeInputData(inputData) {
    const normalized = {
      action: inputData?.action || 'START',
      vector: inputData?.vector || { x: 1, y: 0 },
      intensity: inputData?.intensity ?? 1.0
    };

    // Normalize vector
    if (normalized.vector) {
      const magnitude = Math.sqrt(
        normalized.vector.x * normalized.vector.x + 
        normalized.vector.y * normalized.vector.y
      );
      
      if (magnitude > 0) {
        normalized.vector.x /= magnitude;
        normalized.vector.y /= magnitude;
      } else {
        normalized.vector = { x: 1, y: 0 };
      }
    }

    // Clamp intensity
    normalized.intensity = Math.max(0, Math.min(1, normalized.intensity));

    return normalized;
  }

  /**
   * Handle collision edge cases
   * @param {Object} obj1 - First object
   * @param {Object} obj2 - Second object
   * @returns {boolean} True if collision should be processed
   */
  static validateCollision(obj1, obj2) {
    if (!obj1 || !obj2) return false;
    
    // Check if objects have required properties
    if (obj1.x === undefined || obj1.y === undefined) return false;
    if (obj2.x === undefined || obj2.y === undefined) return false;

    // Handle zero-distance collision
    const dx = obj1.x - obj2.x;
    const dy = obj1.y - obj2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
      return true;  // Treat as collision
    }

    return true;
  }

  /**
   * Clamp position to valid bounds
   * @param {Object} position - Position {x, y}
   * @param {number} width - Canvas width
   * @param {number} height - Canvas height
   * @returns {Object} Clamped position
   */
  static clampPosition(position, width = 800, height = 600) {
    if (!position) {
      return { x: width / 2, y: height / 2 };
    }

    return {
      x: Math.max(0, Math.min(width, position.x || 0)),
      y: Math.max(0, Math.min(height, position.y || 0))
    };
  }

  /**
   * Handle cast interruption
   * @param {Player} player - The player
   * @param {string} reason - Interruption reason
   */
  static handleCastInterruption(player, reason) {
    if (!player || !player.castState) return;

    console.log(`Cast interrupted for player ${player.id}: ${reason}`);

    // Restore movement speed
    if (player.castState.originalSpeed !== undefined) {
      player.speed = player.castState.originalSpeed;
    }

    // Clear cast state
    player.castState.active = false;
    player.isCasting = false;
  }

  /**
   * Handle effect overflow (max 10 effects)
   * @param {Object} entity - The entity
   */
  static handleEffectOverflow(entity) {
    if (!entity || !entity.activeEffects) return;

    const MAX_EFFECTS = 10;

    if (entity.activeEffects.length > MAX_EFFECTS) {
      // Remove oldest effects (FIFO)
      const toRemove = entity.activeEffects.length - MAX_EFFECTS;
      entity.activeEffects.splice(0, toRemove);
      
      console.warn(`Effect overflow for entity ${entity.id}: removed ${toRemove} oldest effects`);
    }
  }

  /**
   * Clamp stat to valid range
   * @param {number} value - The value
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  static clampStat(value, min = 0, max = Infinity) {
    if (typeof value !== 'number' || isNaN(value)) {
      return min;
    }

    return Math.max(min, Math.min(max, value));
  }

  /**
   * Log error with context
   * @param {string} component - Component name
   * @param {string} method - Method name
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   */
  static logError(component, method, message, context = {}) {
    console.error(`[${component}.${method}] ${message}`, context);
  }

  /**
   * Log warning with context
   * @param {string} component - Component name
   * @param {string} method - Method name
   * @param {string} message - Warning message
   * @param {Object} context - Additional context
   */
  static logWarning(component, method, message, context = {}) {
    console.warn(`[${component}.${method}] ${message}`, context);
  }
}
