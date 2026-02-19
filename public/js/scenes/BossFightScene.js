import Scene from './Scene.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';
import Tombstone from '../entities/Tombstone.js';
import SkillManager from '../managers/SkillManager.js';
import CastHandler from '../handlers/CastHandler.js';
import ShieldHandler from '../handlers/ShieldHandler.js';
import DashHandler from '../handlers/DashHandler.js';
import EffectSystem from '../systems/EffectSystem.js';
import VisualEffectsRenderer from '../systems/VisualEffectsRenderer.js';
import { GAME_CONFIG } from '../Constants.js';

export default class BossFightScene extends Scene {
  constructor(game) {
    super(game);
    this.players = new Map();
    this.boss = null;
    this.tombstones = new Map();
    this.reviveAttempts = new Map();
    
    // Initialize ability system components
    this.skillManager = new SkillManager();
    this.castHandler = new CastHandler();
    this.shieldHandler = new ShieldHandler();
    this.dashHandler = new DashHandler();
    this.effectSystem = new EffectSystem();
    this.visualEffects = new VisualEffectsRenderer();
    this.projectiles = [];
    this.visualEffectsList = [];
  }

  enter(params = {}) {
    super.enter();
    
    // Store elapsed time from previous scene
    this.previousElapsedTime = params.elapsedTime || 0;
    
    // Restore all living players to max HP
    this.players.forEach(player => {
      if (!player.isDead) {
        player.hp = player.maxHp;
      }
    });
    
    if (!this.boss) {
      this.boss = new Boss();
    }
    this.tombstones.clear();
    this.reviveAttempts.clear();
    console.log('Boss fight started!');
  }

  update(deltaTime) {
    if (!this.boss) return;
    
    // Update players
    this.players.forEach(player => {
      player.update(deltaTime);
      
      // Update cast state
      if (player.castState && player.castState.active) {
        const completed = this.castHandler.updateCast(player, deltaTime);
        if (completed) {
          this.castHandler.completeCast(this, player, this.skillManager);
        }
      }
      
      // Update shield state
      if (player.shieldState && player.shieldState.active) {
        this.shieldHandler.update(player, deltaTime);
      }
      
      // Update dash state
      if (player.isDashing) {
        this.dashHandler.updateDash(player, deltaTime);
      }
      
      // Update effects (buffs/debuffs)
      if (player.activeEffects) {
        this.effectSystem.updateEffects(player, deltaTime);
      }
      
      // Handle death
      if (player.isDead && !this.tombstones.has(player.id)) {
        this.tombstones.set(player.id, new Tombstone(player));
        
        // Track death
        this.game.trackDeath(player.id);
      }
    });
    
    // Update boss
    this.boss.update(deltaTime, Array.from(this.players.values()));
    
    // Update boss effects
    if (this.boss.activeEffects) {
      this.effectSystem.updateEffects(this.boss, deltaTime);
    }
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      
      if (!projectile.isAlive) return false;
      
      // Check collision with boss
      if (projectile.checkCollision(this.boss)) {
        if (projectile.effectType === 'DAMAGE' || projectile.damage) {
          const isDead = this.boss.takeDamage(projectile.damage);
          
          // Track damage for MVP
          if (projectile.owner && projectile.owner.id) {
            this.game.trackDamage(projectile.owner.id, projectile.damage);
          }
          
          if (isDead) {
            // Win condition - transition to result scene
            const totalTime = Date.now() - this.game.gameStats.startTime;
            this.game.changeScene('result', {
              victory: true,
              totalTime: totalTime,
              totalKills: this.game.gameStats.totalKills
            });
          }
        }
        
        // Handle AOE on impact (e.g., Pyroblast)
        if (projectile.onImpact) {
          this.skillManager.aoeHandler.onAOEProjectileImpact(this, projectile);
        }
        
        // Destroy if not piercing
        if (projectile.onCollision(this.boss)) {
          return false;
        }
      }
      
      // Check if AOE projectile reached target
      if (projectile.isAOEProjectile && projectile.distanceTraveled >= projectile.range) {
        this.skillManager.aoeHandler.onAOEProjectileImpact(this, projectile);
        return false;
      }
      
      return projectile.isAlive;
    });
    
    // Update visual effects
    this.visualEffectsList = this.visualEffectsList.filter(effect => {
      effect.update(deltaTime);
      return effect.isAlive;
    });
    
    // Update revive attempts
    this.reviveAttempts.forEach((attempt, reviverId) => {
      const reviver = this.players.get(reviverId);
      const tombstone = this.tombstones.get(attempt.targetId);
      if (!reviver || reviver.isDead || !tombstone) {
        this.reviveAttempts.delete(reviverId);
        return;
      }
      const dx = reviver.x - tombstone.x;
      const dy = reviver.y - tombstone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > GAME_CONFIG.REVIVE_DISTANCE) {
        this.reviveAttempts.delete(reviverId);
        tombstone.updateReviveProgress(0, null);
      } else {
        const progress = (Date.now() - attempt.startTime) / GAME_CONFIG.REVIVE_TIME;
        tombstone.updateReviveProgress(progress, reviver.name);
        if (progress >= 1) {
          const revivedPlayer = this.players.get(attempt.targetId);
          if (revivedPlayer) {
            revivedPlayer.revive();
            this.tombstones.delete(attempt.targetId);
          }
          this.reviveAttempts.delete(reviverId);
        }
      }
    });
    
    // Check game over
    const allDead = Array.from(this.players.values()).every(p => p.isDead);
    if (allDead && this.players.size > 0) {
      // Lose condition - transition to result scene
      const totalTime = Date.now() - this.game.gameStats.startTime;
      this.game.changeScene('result', {
        victory: false,
        totalTime: totalTime,
        totalKills: this.game.gameStats.totalKills
      });
    }
  }

  render(ctx) {
    // === Background ===
    this.renderBackground(ctx);
    this.renderGrid(ctx);
    
    // === Enemies (Boss) ===
    if (this.boss) {
      this.boss.render(ctx);
    }
    
    // === Projectiles ===
    this.renderProjectiles(ctx);
    
    // === Visual Effects ===
    this.visualEffectsList.forEach(effect => effect.render(ctx));
    
    // === Players ===
    this.renderPlayers(ctx);
    
    // === UI Elements ===
    // Render tombstones
    this.tombstones.forEach(tombstone => tombstone.render(ctx));
  }

  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'game_state':
        this.updateGameState(data);
        break;
      case 'skill_used':
        // Handle ability system format
        if (data.inputData) {
          const player = this.players.get(data.playerId);
          if (player) {
            this.skillManager.handleSkill(this, player, data.skillIndex, data.inputData);
          }
        }
        break;
      case 'player_joined':
        this.addPlayer(data);
        break;
      case 'player_left':
        this.players.delete(data);
        this.tombstones.delete(data);
        break;
      case 'game_started':
        const lobbyScene = this.game.scenes.lobby;
        if (lobbyScene && lobbyScene.players) {
          lobbyScene.players.forEach((player, id) => {
            this.players.set(id, player);
          });
        }
        break;
    }
  }

  updateGameState(state) {
    Object.values(state.players).forEach(playerData => {
      let player = this.players.get(playerData.id);
      if (!player) {
        player = new Player(playerData);
        this.players.set(playerData.id, player);
      }
      player.moveX = playerData.moveX || 0;
      player.moveY = playerData.moveY || 0;
      player.hp = playerData.hp;
      player.isDead = playerData.isDead;
    });
    if (state.boss && this.boss) {
      this.boss.hp = state.boss.hp;
    }
  }

  addPlayer(playerData) {
    const player = new Player(playerData);
    this.players.set(playerData.id, player);
  }

  startRevive(reviverId, targetId) {
    this.reviveAttempts.set(reviverId, {
      targetId: targetId,
      startTime: Date.now()
    });
  }
}
