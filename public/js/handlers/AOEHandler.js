/**
 * AOEHandler.js
 * 
 * Handles area of effect abilities (both self-centered and lobbed)
 * Manages AOE targeting, effect application, and radius checking
 */

import AOEEffect from '../entities/AOEEffect.js';
import Projectile from '../entities/Projectile.js';

export default class AOEHandler {
  /**
   * Execute self-centered AOE
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player
   * @param {Object} config - Skill configuration
   */
  executeSelf(scene, player, config) {
    if (!scene || !player || !config) {
      console.error('AOEHandler.executeSelf: Missing required parameters');
      return;
    }

    const center = { x: player.x, y: player.y };
    
    // Apply effects immediately
    this.applyEffects(scene, center, config.radius, config, player);
    
    // Create visual effect
    this.createVisualEffect(scene, center, config);
  }

  /**
   * Execute lobbed AOE
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player
   * @param {Object} config - Skill configuration
   * @param {Object} direction - Throw direction {x, y}
   * @param {number} intensity - Throw distance multiplier (0.0 to 1.0)
   */
  executeLobbed(scene, player, config, direction, intensity) {
    if (!scene || !player || !config || !direction) {
      console.error('AOEHandler.executeLobbed: Missing required parameters');
      return;
    }

    // Clamp intensity
    intensity = Math.max(0, Math.min(1, intensity || 1.0));

    // Calculate target location
    const baseDistance = config.range || 300;
    const distance = baseDistance * intensity;

    const targetX = player.x + direction.x * distance;
    const targetY = player.y + direction.y * distance;

    // Create a projectile that travels to target location
    const speed = config.speed || 500;
    const projectile = new Projectile({
      x: player.x,
      y: player.y,
      vx: direction.x * speed / 60,  // Assuming 60 FPS
      vy: direction.y * speed / 60,
      speed: speed,
      radius: config.radius / 4 || 10,
      damage: 0,  // No damage on travel
      range: distance,
      pierce: true,
      color: config.color || '#ffaa00',
      owner: player,
      isAOEProjectile: true,
      aoeConfig: config,
      targetX: targetX,
      targetY: targetY
    });

    // Add to scene
    if (!scene.projectiles) {
      scene.projectiles = [];
    }
    scene.projectiles.push(projectile);

    return projectile;
  }

  /**
   * Handle AOE projectile reaching target
   * @param {Scene} scene - The game scene
   * @param {Projectile} projectile - The AOE projectile
   */
  onAOEProjectileImpact(scene, projectile) {
    if (!scene || !projectile || !projectile.aoeConfig) return;

    const center = { x: projectile.x, y: projectile.y };
    const config = projectile.aoeConfig;

    // Apply effects at impact location
    this.applyEffects(scene, center, config.radius, config, projectile.owner);

    // Create visual effect
    this.createVisualEffect(scene, center, config);
  }

  /**
   * Apply AOE effects to entities in radius
   * @param {Scene} scene - The game scene
   * @param {Object} center - AOE center position {x, y}
   * @param {number} radius - Effect radius
   * @param {Object} config - Skill configuration
   * @param {Player} owner - Player who triggered the AOE
   */
  applyEffects(scene, center, radius, config, owner) {
    if (!scene || !center || !config) return;

    // Get all entities in radius
    const entities = this.getEntitiesInRadius(scene, center, radius);

    // Apply effects based on type
    for (const entity of entities) {
      if (config.effectType === 'DAMAGE' || config.damage) {
        this.applyDamage(entity, config.damage, owner);
      } else if (config.effectType === 'HEAL' || config.healAmount) {
        this.applyHealing(entity, config.healAmount, owner);
      } else if (config.effectType === 'BUFF' && config.effectParams) {
        this.applyBuff(entity, config.effectParams);
      } else if (config.effectType === 'DEBUFF' && config.effectParams) {
        this.applyDebuff(entity, config.effectParams);
      } else if (config.effectType === 'DUAL') {
        // Dual effect (e.g., Consecration: damage enemies, heal allies)
        if (this.isEnemy(entity, owner)) {
          this.applyDamage(entity, config.damage, owner);
        } else if (this.isAlly(entity, owner)) {
          this.applyHealing(entity, config.healAmount, owner);
        }
      } else if (config.effectType === 'REVIVE') {
        this.applyRevive(scene, entity, config, owner);
      }
    }
  }

  /**
   * Get all entities within radius
   * @param {Scene} scene - The game scene
   * @param {Object} center - Center position {x, y}
   * @param {number} radius - Search radius
   * @returns {Array} Array of entities within radius
   */
  getEntitiesInRadius(scene, center, radius) {
    const entities = [];

    // Check players
    if (scene.players && Array.isArray(scene.players)) {
      for (const player of scene.players) {
        if (this.isInRadius(player, center, radius)) {
          entities.push(player);
        }
      }
    }

    // Check boss
    if (scene.boss && scene.boss.isAlive && this.isInRadius(scene.boss, center, radius)) {
      entities.push(scene.boss);
    }

    // Check enemies
    if (scene.enemies && Array.isArray(scene.enemies)) {
      for (const enemy of scene.enemies) {
        if (enemy.isAlive && this.isInRadius(enemy, center, radius)) {
          entities.push(enemy);
        }
      }
    }

    // Check tombstones (for resurrection)
    if (scene.tombstones && Array.isArray(scene.tombstones)) {
      for (const tombstone of scene.tombstones) {
        if (this.isInRadius(tombstone, center, radius)) {
          entities.push(tombstone);
        }
      }
    }

    return entities;
  }

  /**
   * Check if an entity is within AOE radius
   * @param {Object} entity - The entity to check
   * @param {Object} center - AOE center {x, y}
   * @param {number} radius - Effect radius
   * @returns {boolean} True if within radius
   */
  isInRadius(entity, center, radius) {
    if (!entity || !center) return false;

    const dx = entity.x - center.x;
    const dy = entity.y - center.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < radius;
  }

  /**
   * Check if entity is an enemy relative to owner
   */
  isEnemy(entity, owner) {
    // Boss and enemies are enemies to players
    return entity.type === 'boss' || entity.type === 'enemy';
  }

  /**
   * Check if entity is an ally relative to owner
   */
  isAlly(entity, owner) {
    // Players are allies to each other
    return entity.type === 'player' || entity.isPlayer;
  }

  /**
   * Apply damage to an entity
   */
  applyDamage(entity, damage, source) {
    if (!entity || typeof damage !== 'number') return;

    if (entity.takeDamage) {
      entity.takeDamage(damage);
    } else if (typeof entity.hp === 'number') {
      entity.hp -= damage;
      if (entity.hp <= 0) {
        entity.hp = 0;
        if (entity.isAlive !== undefined) {
          entity.isAlive = false;
        }
      }
    }
  }

  /**
   * Apply healing to an entity
   */
  applyHealing(entity, healAmount, source) {
    if (!entity || typeof healAmount !== 'number') return;

    if (entity.heal) {
      entity.heal(healAmount);
    } else if (typeof entity.hp === 'number' && typeof entity.maxHp === 'number') {
      entity.hp = Math.min(entity.hp + healAmount, entity.maxHp);
    }
  }

  /**
   * Apply buff to an entity
   */
  applyBuff(entity, effectParams) {
    if (!entity || !effectParams) return;

    if (!entity.activeEffects) {
      entity.activeEffects = [];
    }

    entity.activeEffects.push({
      type: 'BUFF',
      params: effectParams,
      startTime: Date.now()
    });
  }

  /**
   * Apply debuff to an entity
   */
  applyDebuff(entity, effectParams) {
    if (!entity || !effectParams) return;

    if (!entity.activeEffects) {
      entity.activeEffects = [];
    }

    entity.activeEffects.push({
      type: 'DEBUFF',
      params: effectParams,
      startTime: Date.now()
    });
  }

  /**
   * Apply revive effect (for Mass Resurrection)
   */
  applyRevive(scene, entity, config, owner) {
    if (!scene || !entity || !config) return;

    // Check if entity is a tombstone
    if (entity.playerId && scene.revivePlayer) {
      const healPercent = config.healPercent || 0.5;
      scene.revivePlayer(entity.playerId, healPercent);
    }
  }

  /**
   * Create visual effect for AOE
   */
  createVisualEffect(scene, center, config) {
    if (!scene || !center || !config) return;

    const aoeEffect = new AOEEffect({
      x: center.x,
      y: center.y,
      radius: config.radius,
      color: config.color || '#ff6600',
      duration: config.duration || 500
    });

    scene.aoeEffects.push(aoeEffect);
  }
}
