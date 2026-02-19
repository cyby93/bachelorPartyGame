import Projectile from '../entities/Projectile.js';
import MeleeAttack from '../entities/MeleeAttack.js';
import AOEEffect from '../entities/AOEEffect.js';
import HealEffect from '../entities/HealEffect.js';
import MeleeHandler from '../handlers/MeleeHandler.js';
import CastHandler from '../handlers/CastHandler.js';
import ShieldHandler from '../handlers/ShieldHandler.js';
import AOEHandler from '../handlers/AOEHandler.js';
import DashHandler from '../handlers/DashHandler.js';
import CollisionSystem from '../systems/CollisionSystem.js';
import EffectSystem from '../systems/EffectSystem.js';
import { normalizeClassName } from '../config/ClassConfig.js';
import SkillDatabase from '../config/SkillDatabase.js';

class SkillManager {
  constructor() {
    // Initialize handlers
    this.meleeHandler = new MeleeHandler();
    this.castHandler = new CastHandler();
    this.shieldHandler = new ShieldHandler();
    this.aoeHandler = new AOEHandler();
    this.dashHandler = new DashHandler();
    this.collisionSystem = new CollisionSystem();
    this.effectSystem = new EffectSystem();
    
    // Cooldown tracking
    this.cooldowns = new Map();  // Map<playerId, Map<skillIndex, timestamp>>
  }
  /**
   * Main entry point for skill execution
   * @param {Scene} scene - The game scene
   * @param {Player} player - The player executing the skill
   * @param {number} skillIndex - Index of the skill (0-3 for S1-S4)
   * @param {Object} inputData - User input information
   * @returns {boolean} True if skill executed successfully
   */
  handleSkill(scene, player, skillIndex, inputData) {
    if (!scene || !player || skillIndex === undefined || !inputData) {
      console.error('SkillManager.handleSkill: Missing required parameters');
      return false;
    }

    // Validate skill index
    if (skillIndex < 0 || skillIndex > 3) {
      console.error('SkillManager.handleSkill: Invalid skill index:', skillIndex);
      return false;
    }

    // Get skill configuration
    const config = this.getSkillConfig(player.className, skillIndex);
    if (!config) {
      console.error('SkillManager.handleSkill: No config found for', player.className, skillIndex);
      return false;
    }

    // Check cooldown
    if (this.isOnCooldown(player, skillIndex)) {
      return false;
    }

    // Normalize input data
    const normalizedInput = this.normalizeInputData(inputData);

    // Route to appropriate handler based on skill type
    let success = false;
      // console.log(config);
    switch (config.type) {
      case 'PROJECTILE':
        success = this.handleProjectile(scene, player, config, normalizedInput);
        break;
      
      case 'MELEE':
        success = this.handleMelee(scene, player, config, normalizedInput);
        break;
      
      case 'CAST':
        success = this.handleCast(scene, player, config, normalizedInput);
        break;
      
      case 'SHIELD':
        success = this.handleShield(scene, player, config, normalizedInput);
        break;
      
      case 'AOE':
        success = this.handleAOE(scene, player, config, normalizedInput);
        break;
      
      case 'DASH':
        success = this.handleDash(scene, player, config, normalizedInput);
        break;
      
      case 'BUFF':
        success = this.handleBuff(scene, player, config, normalizedInput);
        break;
      
      default:
        console.warn('SkillManager.handleSkill: Unknown skill type:', config.type);
        return false;
    }

    // Start cooldown if successful and notify controller
    if (success) {
      this.startCooldown(player, skillIndex, config.cooldown);
      
      // Emit cooldown notification to the player's controller via socket
      if (scene.game && scene.game.socket) {
        scene.game.socket.emit('skill_cooldown', {
          playerId: player.id,
          skillIndex: skillIndex,
          cooldownDuration: config.cooldown,
          cooldownEnd: Date.now() + config.cooldown
        });
      }
    }

    return success;
  }

  /**
   * Get skill configuration for a player's class and skill index
   * @param {string} className - The player's class name
   * @param {number} skillIndex - The skill index (0-3)
   * @returns {Object|null} The skill configuration
   */
  getSkillConfig(className, skillIndex) {
    if (!className || skillIndex === undefined) return null;

    // Normalize class name to handle case variations
    const normalizedClassName = normalizeClassName(className);
    if (!normalizedClassName) {
      console.warn('SkillManager.getSkillConfig: Invalid class name:', className);
      return null;
    }

    const classSkills = SkillDatabase[normalizedClassName];
    if (!classSkills || !Array.isArray(classSkills)) {
      console.warn('SkillManager.getSkillConfig: No skills found for class:', normalizedClassName);
      return null;
    }

    if (skillIndex < 0 || skillIndex >= classSkills.length) {
      console.warn('SkillManager.getSkillConfig: Invalid skill index:', skillIndex);
      return null;
    }

    return classSkills[skillIndex];
  }

  /**
   * Check if a skill is on cooldown
   * @param {Player} player - The player
   * @param {number} skillIndex - The skill index
   * @returns {boolean} True if on cooldown
   */
  isOnCooldown(player, skillIndex) {
    if (!player || skillIndex === undefined) return false;

    const playerCooldowns = this.cooldowns.get(player.id);
    if (!playerCooldowns) return false;

    const cooldownEnd = playerCooldowns.get(skillIndex);
    if (!cooldownEnd) return false;

    return Date.now() < cooldownEnd;
  }

  /**
   * Start cooldown for a skill
   * @param {Player} player - The player
   * @param {number} skillIndex - The skill index
   * @param {number} duration - Cooldown duration in milliseconds
   */
  startCooldown(player, skillIndex, duration) {
    if (!player || skillIndex === undefined || !duration) return;

    if (!this.cooldowns.has(player.id)) {
      this.cooldowns.set(player.id, new Map());
    }

    const playerCooldowns = this.cooldowns.get(player.id);
    playerCooldowns.set(skillIndex, Date.now() + duration);
  }

  /**
   * Normalize input data
   * @param {Object} inputData - Raw input data
   * @returns {Object} Normalized input data
   */
  normalizeInputData(inputData) {
    const normalized = {
      action: inputData.action || 'START',
      vector: inputData.vector || { x: 1, y: 0 },
      intensity: inputData.intensity || 1.0
    };

    // Normalize vector
    const magnitude = Math.sqrt(normalized.vector.x * normalized.vector.x + 
                                normalized.vector.y * normalized.vector.y);
    if (magnitude > 0) {
      normalized.vector.x /= magnitude;
      normalized.vector.y /= magnitude;
    }

    // Clamp intensity
    normalized.intensity = Math.max(0, Math.min(1, normalized.intensity));

    return normalized;
  }

  /**
   * Handle projectile abilities
   */
  handleProjectile(scene, player, config, inputData) {
    // if(['START', 'RELEASE'].includes(inputData.action)) return false;
    const speed = config.speed || 500;
    const projectile = new Projectile({
      x: player.x,
      y: player.y,
      vx: inputData.vector.x * speed / 60,
      vy: inputData.vector.y * speed / 60,
      speed: speed,
      damage: config.damage,
      radius: config.radius || 10,
      range: config.range || 500,
      pierce: config.pierce || false,
      color: player.color || '#ffff00',
      owner: player,
      healAmount: config.healAmount || 0,
      effectType: config.effectType || 'DAMAGE',
      onImpact: config.onImpact || null
    });
            console.log(projectile)


    if (!scene.projectiles) {
      scene.projectiles = [];
    }
    scene.projectiles.push(projectile);

    // Handle multi-projectile (e.g., Hunter Multi-Shot)
    if (config.subtype === 'MULTI' && config.projectileCount) {
      const spreadAngle = config.spreadAngle || Math.PI / 6;
      const baseAngle = Math.atan2(inputData.vector.y, inputData.vector.x);

      for (let i = 1; i < config.projectileCount; i++) {
        const offset = (i - (config.projectileCount - 1) / 2) * (spreadAngle / (config.projectileCount - 1));
        const angle = baseAngle + offset;
        const proj = new Projectile({
          x: player.x,
          y: player.y,
          vx: Math.cos(angle) * speed / 60,
          vy: Math.sin(angle) * speed / 60,
          speed: speed,
          damage: config.damage,
          radius: config.radius || 10,
          range: config.range || 500,
          pierce: config.pierce || false,
          color: player.color || '#ffff00',
          owner: player
        });
        scene.projectiles.push(proj);
      }
    }

    return true;
  }

  /**
   * Handle melee abilities
   */
  handleMelee(scene, player, config, inputData) {
      if(['START', 'RELEASE'].includes(inputData.action)) return false;
      console.log('handlemelee')
      return this.meleeHandler.execute(scene, player, config, inputData.vector);
  }

  /**
   * Handle cast abilities
   */
  handleCast(scene, player, config, inputData) {
    // console.log('handleCast', player, config)
    if (inputData.action === 'START' || inputData.action === 'HOLD') {
      if (!player.castState || !player.castState.active) {
        // Start cast
        this.castHandler.startCast(player, config, inputData);
        // console.log('startcast')
      } else {
        // Update cast
        const completed = this.castHandler.updateCast(player, inputData, 16);  // Assuming ~60 FPS
                // console.log('updateCast')
        if (completed) {
          return this.castHandler.completeCast(scene, player, this);
        }
      }
    } else if (inputData.action === 'RELEASE') {
      if (player.castState && player.castState.active) {
        const completed = this.castHandler.updateCast(player, inputData, 0);
        if (completed) {
          return this.castHandler.completeCast(scene, player, this);
        } else {
          this.castHandler.cancelCast(player);
        }
      }
              // console.log('stopCast')
    }
    return false;
  }

  /**
   * Handle shield abilities
   */
  handleShield(scene, player, config, inputData) {
    const angle = Math.atan2(inputData.vector.y, inputData.vector.x);

    if (inputData.action === 'START' || inputData.action === 'HOLD') {
      if (!player.shieldState || !player.shieldState.active) {
        this.shieldHandler.activate(player, config, angle);
      } else {
        this.shieldHandler.updateAngle(player, angle);
      }
      // console.log(player.shieldState)
      return true;
    } else if (inputData.action === 'RELEASE') {
      this.shieldHandler.deactivate(player);
      return true;
    }
    return false;
  }

  /**
   * Handle AOE abilities
   */
  handleAOE(scene, player, config, inputData) {
    console.log(config)
    if (config.subtype === 'AOE_SELF') {
      this.aoeHandler.executeSelf(scene, player, config);
    } else if (config.subtype === 'AOE_LOBBED') {
      this.aoeHandler.executeLobbed(scene, player, config, inputData.vector, inputData.intensity);
    }
    return true;
  }

  /**
   * Handle dash abilities
   */
  handleDash(scene, player, config, inputData) {
    if (config.subtype === 'TELEPORT') {
      return this.dashHandler.executeTeleport(player, config, inputData.vector);
    } else {
      return this.dashHandler.executeDash(player, config, inputData.vector);
    }
  }

  /**
   * Handle buff abilities
   */
  handleBuff(scene, player, config, inputData) {
    if (config.effectParams) {
      this.effectSystem.applyBuff(player, config.effectParams);
    }
    return true;
  }

  // Legacy method for backwards compatibility
  static handleSkillUsed(data, players, effects) {
    const player = players.get(data.playerId);
    if (!player || player.isDead) return null;
    const skillIndex = data.skillIndex;
    const skill = player.classData.skills[skillIndex];
    if (!player.useSkill(skillIndex)) return null;
    let aim = data.aim;
    if (!aim && (skill.type === 'heal' || skill.type === 'revive' || skill.type === 'buff')) {
      aim = this.getAutoAimForSupport(player, players, skill);
    } else if (!aim) {
      aim = { x: Math.cos(player.angle), y: Math.sin(player.angle) };
    }
    return this.createSkillEffect(player, skill, aim, effects, players);
  }

  static getAutoAimForSupport(player, players, skill) {
    if (skill.type === 'heal') {
      let nearestAlly = null;
      let minDist = Infinity;
      const maxRange = skill.range || 200;
      players.forEach(p => {
        if (p.id !== player.id && !p.isDead && p.hp < p.maxHp) {
          const dx = p.x - player.x;
          const dy = p.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist && dist < maxRange) {
            minDist = dist;
            nearestAlly = p;
          }
        }
      });
      if (nearestAlly) {
        const dx = nearestAlly.x - player.x;
        const dy = nearestAlly.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / dist, y: dy / dist, target: nearestAlly };
      }
      return { x: 0, y: 0, target: player };
    }
    return { x: 1, y: 0 };
  }

  static createSkillEffect(player, skill, aim, effects, players) {
    const angle = Math.atan2(aim.y, aim.x);
    switch (skill.type) {
      case 'projectile':
        return this.createProjectile(player, skill, angle, effects);
      case 'melee':
        return this.createMeleeAttack(player, skill, angle, effects);
      case 'aoe':
        return this.createAOE(player, skill, angle, effects);
      case 'heal':
        return this.createHeal(player, skill, aim, effects, players);
      case 'dash':
      case 'teleport':
        return this.createMovement(player, skill, angle);
      case 'defense':
      case 'buff':
        return this.createBuff(player, skill);
      default:
        console.warn(`Unknown skill type: ${skill.type}`);
        return null;
    }
  }

  static createProjectile(player, skill, angle, effects) {
    const speed = skill.speed || 5;
    const projectile = new Projectile({
      x: player.x + Math.cos(angle) * 25,
      y: player.y + Math.sin(angle) * 25,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: skill.damage,
      radius: 8,
      color: player.classData.color,
      owner: player.id
    });
    effects.push(projectile);
    return projectile;
  }

  static createMeleeAttack(player, skill, angle, effects) {
    const meleeX = player.x + Math.cos(angle) * (skill.range || 50);
    const meleeY = player.y + Math.sin(angle) * (skill.range || 50);
    const melee = new MeleeAttack({
      x: meleeX,
      y: meleeY,
      damage: skill.damage,
      radius: skill.range || 50,
      color: player.classData.color,
      owner: player.id,
      angle: angle,
      lifetime: 200
    });
    effects.push(melee);
    return melee;
  }

  static createAOE(player, skill, angle, effects) {
    console.log(skill)
    const distance = skill.range || 100;
    const aoe = new AOEEffect({
      x: player.x + Math.cos(angle) * distance,
      y: player.y + Math.sin(angle) * distance,
      damage: skill.damage,
      radius: skill.radius || 80,
      color: player.classData.color,
      owner: player.id,
      lifetime: 500
    });
    effects.push(aoe);
    return aoe;
  }

  static createHeal(player, skill, aim, effects, players) {
    const target = aim.target || player;
    if (!target.isDead) {
      target.heal(skill.amount);
    }
    const healEffect = new HealEffect({
      x: target.x,
      y: target.y,
      amount: skill.amount,
      owner: player.id,
      lifetime: 500
    });
    effects.push(healEffect);
    return healEffect;
  }

  static createMovement(player, skill, angle) {
    const distance = skill.range || 150;
    player.x += Math.cos(angle) * distance;
    player.y += Math.sin(angle) * distance;
    player.x = Math.max(player.radius, Math.min(1024 - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(768 - player.radius, player.y));
    return null;
  }

  static createBuff(player, skill) {
    player.buffs.push({
      type: skill.name,
      endTime: Date.now() + (skill.duration || 5000)
    });
    return null;
  }
}

export default SkillManager;
