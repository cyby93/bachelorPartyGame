/**
 * EffectSystem.js
 * 
 * Manages buffs, debuffs, healing, and damage application
 * Handles effect duration tracking and stat modifications
 */

export default class EffectSystem {
  /**
   * Apply damage to an entity
   * @param {Object} target - The target entity
   * @param {number} amount - Damage amount
   * @param {Object} source - Source of damage
   */
  applyDamage(target, amount, source) {
    if (!target || typeof amount !== 'number') return;

    // Apply damage reduction if exists
    let finalDamage = amount;

    if (target.activeEffects && Array.isArray(target.activeEffects)) {
      for (const effect of target.activeEffects) {
        if (effect.type === 'BUFF' && effect.params.damageReduction) {
          finalDamage *= (1 - effect.params.damageReduction);
        }
      }
    }

    // Apply damage
    if (target.takeDamage) {
      target.takeDamage(finalDamage);
    } else if (typeof target.hp === 'number') {
      target.hp -= finalDamage;
      if (target.hp <= 0) {
        target.hp = 0;
        if (target.isAlive !== undefined) {
          target.isAlive = false;
        }
      }
    }
  }

  /**
   * Apply healing to an entity
   * @param {Object} target - The target entity
   * @param {number} amount - Heal amount
   * @param {Object} source - Source of healing
   */
  applyHealing(target, amount, source) {
    if (!target || typeof amount !== 'number') return;

    if (target.heal) {
      target.heal(amount);
    } else if (typeof target.hp === 'number' && typeof target.maxHp === 'number') {
      target.hp = Math.min(target.hp + amount, target.maxHp);
    }
  }

  /**
   * Apply a buff to an entity
   * @param {Object} target - The target entity
   * @param {Object} buff - Buff configuration
   */
  applyBuff(target, buff) {
    if (!target || !buff) return;

    // Initialize activeEffects if not exists
    if (!target.activeEffects) {
      target.activeEffects = [];
    }

    // Store original stats if not already stored
    if (!target.originalStats) {
      target.originalStats = {
        speed: target.speed,
        maxHp: target.maxHp,
        armor: target.armor || 0
      };
    }

    // Create effect object
    const effect = {
      type: 'BUFF',
      name: buff.name || 'Buff',
      startTime: Date.now(),
      duration: buff.duration || 3000,
      params: buff
    };

    // Apply stat modifications immediately
    if (buff.speedMultiplier !== undefined) {
      target.speed = target.originalStats.speed * buff.speedMultiplier;
    }

    if (buff.maxHpMultiplier !== undefined) {
      target.maxHp = target.originalStats.maxHp * buff.maxHpMultiplier;
      target.hp = Math.min(target.hp, target.maxHp);
    }

    if (buff.armorBonus !== undefined) {
      target.armor = (target.originalStats.armor || 0) + buff.armorBonus;
    }

    if (buff.shield !== undefined) {
      target.tempShield = (target.tempShield || 0) + buff.shield;
    }

    // Add to active effects
    target.activeEffects.push(effect);
  }

  /**
   * Apply a debuff to an entity
   * @param {Object} target - The target entity
   * @param {Object} debuff - Debuff configuration
   */
  applyDebuff(target, debuff) {
    if (!target || !debuff) return;

    // Initialize activeEffects if not exists
    if (!target.activeEffects) {
      target.activeEffects = [];
    }

    // Store original stats if not already stored
    if (!target.originalStats) {
      target.originalStats = {
        speed: target.speed,
        maxHp: target.maxHp,
        armor: target.armor || 0
      };
    }

    // Create effect object
    const effect = {
      type: 'DEBUFF',
      name: debuff.name || 'Debuff',
      startTime: Date.now(),
      duration: debuff.duration || 2000,
      params: debuff
    };

    // Apply negative effects immediately
    if (debuff.speedMultiplier !== undefined) {
      target.speed = target.originalStats.speed * debuff.speedMultiplier;
    }

    if (debuff.rooted) {
      target.speed = 0;
      target.isRooted = true;
    }

    if (debuff.stunned) {
      target.isStunned = true;
    }

    // Add to active effects
    target.activeEffects.push(effect);
  }

  /**
   * Update all active effects
   * @param {Object} entity - The entity
   * @param {number} deltaTime - Time since last update
   */
  updateEffects(entity, deltaTime) {
    if (!entity || !entity.activeEffects || !Array.isArray(entity.activeEffects)) {
      return;
    }

    const now = Date.now();
    const expiredEffects = [];

    // Check for expired effects
    for (let i = 0; i < entity.activeEffects.length; i++) {
      const effect = entity.activeEffects[i];
      const elapsed = now - effect.startTime;

      if (elapsed >= effect.duration) {
        expiredEffects.push(i);
      }
    }

    // Remove expired effects (in reverse order to maintain indices)
    for (let i = expiredEffects.length - 1; i >= 0; i--) {
      const index = expiredEffects[i];
      const effect = entity.activeEffects[index];
      
      // Restore stats before removing
      this.removeEffect(entity, effect);
      
      entity.activeEffects.splice(index, 1);
    }
  }

  /**
   * Remove an effect and restore stats
   * @param {Object} entity - The entity
   * @param {Object} effect - The effect to remove
   */
  removeEffect(entity, effect) {
    if (!entity || !effect) return;

    const params = effect.params;

    // Restore speed
    if (params.speedMultiplier !== undefined || params.rooted) {
      if (entity.originalStats && entity.originalStats.speed !== undefined) {
        entity.speed = entity.originalStats.speed;
        
        // Reapply other active speed effects
        if (entity.activeEffects) {
          for (const otherEffect of entity.activeEffects) {
            if (otherEffect !== effect && otherEffect.params.speedMultiplier) {
              entity.speed *= otherEffect.params.speedMultiplier;
            }
          }
        }
      }
      entity.isRooted = false;
    }

    // Restore max HP
    if (params.maxHpMultiplier !== undefined) {
      if (entity.originalStats && entity.originalStats.maxHp !== undefined) {
        entity.maxHp = entity.originalStats.maxHp;
      }
    }

    // Restore armor
    if (params.armorBonus !== undefined) {
      if (entity.originalStats && entity.originalStats.armor !== undefined) {
        entity.armor = entity.originalStats.armor;
      }
    }

    // Remove stun
    if (params.stunned) {
      entity.isStunned = false;
    }

    // Remove shield
    if (params.shield !== undefined) {
      entity.tempShield = Math.max(0, (entity.tempShield || 0) - params.shield);
    }
  }

  /**
   * Remove expired effects
   * @param {Object} entity - The entity
   */
  cleanupExpiredEffects(entity) {
    this.updateEffects(entity, 0);
  }

  /**
   * Clear all effects from an entity
   * @param {Object} entity - The entity
   */
  clearAllEffects(entity) {
    if (!entity || !entity.activeEffects) return;

    // Remove all effects
    while (entity.activeEffects.length > 0) {
      const effect = entity.activeEffects[0];
      this.removeEffect(entity, effect);
      entity.activeEffects.shift();
    }

    // Restore original stats
    if (entity.originalStats) {
      entity.speed = entity.originalStats.speed;
      entity.maxHp = entity.originalStats.maxHp;
      entity.armor = entity.originalStats.armor;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EffectSystem;
}
