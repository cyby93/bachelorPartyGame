/**
 * MeleeHandler.js
 * 
 * Handles instant melee cone attacks with directional hit detection
 */

import MeleeAttack from '../entities/MeleeAttack.js';

export default class MeleeHandler {
  /**
   * Execute melee attack with instant hit detection
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player attacking
   * @param {Object} config - Skill configuration
   * @param {Object} direction - Attack direction {x, y}
   */
  execute(scene, player, config, direction) {
    if (!scene || !player || !config || !direction) {
      console.error('MeleeHandler.execute: Missing required parameters');
      return;
    }

    // Get all potential targets (enemies or boss)
    const targets = this.getPotentialTargets(scene);
    
    // Check each target for hit
    const hitTargets = [];
    for (const target of targets) {
      if (this.isInCone(player, target, direction, config.range, config.angle)) {
        hitTargets.push(target);
      }
    }
    
    // Apply damage to all hit targets
    for (const target of hitTargets) {
      this.applyDamage(target, config.damage, player);
    }
    
    // Render visual effect
    this.renderEffect(scene, player, direction, config);
    
    return hitTargets;
  }

  /**
   * Check if an entity is within the melee cone
   * @param {Player} player - The attacking player
   * @param {Object} target - The potential target
   * @param {Object} direction - Attack direction {x, y}
   * @param {number} range - Attack range
   * @param {number} coneAngle - Cone angle in radians
   * @returns {boolean} True if target is hit
   */
  isInCone(player, target, direction, range, coneAngle) {
    if (!player || !target || !direction) return false;
    
    // Calculate distance to target
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if within range
    if (distance > range) {
      return false;
    }
    
    // Calculate angle to target
    const angleToTarget = Math.atan2(dy, dx);
    const attackAngle = Math.atan2(direction.y, direction.x);
    
    // Calculate angle difference
    let angleDiff = Math.abs(angleToTarget - attackAngle);
    
    // Normalize angle difference to [-PI, PI]
    while (angleDiff > Math.PI) {
      angleDiff -= 2 * Math.PI;
    }
    while (angleDiff < -Math.PI) {
      angleDiff += 2 * Math.PI;
    }
    angleDiff = Math.abs(angleDiff);
    
    // Check if within cone angle
    return angleDiff < coneAngle / 2;
  }

  /**
   * Get all potential targets in the scene
   * @param {Scene} scene - The game scene
   * @returns {Array} Array of potential targets
   */
  getPotentialTargets(scene) {
    const targets = [];
    
    // Add boss if exists
    if (scene.boss && scene.boss.isAlive) {
      targets.push(scene.boss);
    }
    
    // Add any other enemies if they exist
    if (scene.enemies && Array.isArray(scene.enemies)) {
      for (const enemy of scene.enemies) {
        if (enemy.isAlive) {
          targets.push(enemy);
        }
      }
    }
    
    return targets;
  }

  /**
   * Apply damage to a target
   * @param {Object} target - The target entity
   * @param {number} damage - Damage amount
   * @param {Player} source - Source of damage
   */
  applyDamage(target, damage, source) {
    if (!target || typeof damage !== 'number') return;
    
    if (target.takeDamage) {
      target.takeDamage(damage);
    } else if (typeof target.hp === 'number') {
      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        if (target.isAlive !== undefined) {
          target.isAlive = false;
        }
      }
    }
  }

  /**
   * Render visual effect for melee attack
   * @param {Scene} scene - The game scene
   * @param {Player} player - The attacking player
   * @param {Object} direction - Attack direction {x, y}
   * @param {Object} config - Skill configuration
   */
  renderEffect(scene, player, direction, config) {
    if (!scene || !player || !direction || !config) return;
    
    // Create a melee attack visual effect
    const meleeAttack = new MeleeAttack({
      x: player.x,
      y: player.y,
      direction: direction,
      range: config.range,
      angle: config.angle,
      color: player.color || '#ffffff',
      duration: 400  // Visual effect lasts 200ms
    });
    
    scene.meleeAttacks.push(meleeAttack);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MeleeHandler;
}
