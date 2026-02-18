import Scene from './Scene.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import SkillManager from '../managers/SkillManager.js';
import EffectSystem from '../systems/EffectSystem.js';
import VisualEffectsRenderer from '../systems/VisualEffectsRenderer.js';
import CastHandler from '../handlers/CastHandler.js';
import ShieldHandler from '../handlers/ShieldHandler.js';
import DashHandler from '../handlers/DashHandler.js';

export default class TrashMobScene extends Scene {
  constructor(game) {
    super(game);
    this.players = new Map();
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.visualEffectsList = [];
    this.killCount = 0;
    this.spawnTimer = 0;
    this.startTime = 0;
    
    // Initialize ability system components
    this.skillManager = new SkillManager();
    this.effectSystem = new EffectSystem();
    this.visualEffects = new VisualEffectsRenderer();
    this.castHandler = new CastHandler();
    this.shieldHandler = new ShieldHandler();
    this.dashHandler = new DashHandler();
  }

  enter(params = {}) {
    super.enter();
    
    // Initialize kill counter
    this.killCount = 0;
    this.spawnTimer = 0;
    this.startTime = params.startTime || Date.now();
    
    // Initialize game stats
    if (this.game.gameStats.startTime === 0) {
      this.game.gameStats.startTime = this.startTime;
    }
    
    // Copy players from lobby or params
    if (params.players) {
      this.players = new Map(params.players);
    }
    
    // Clear enemies
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];
    this.visualEffectsList = [];
    
    console.log('Trash Mob scene started! Defeat 50 enemies to progress.');
  }

  exit() {
    super.exit();
    // Clean up
    this.enemies = [];
    this.projectiles = [];
  }

  update(deltaTime) {
    const now = Date.now();
    
    // Spawn timer
    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= 2000) {  // Every 2 seconds
      this.spawnTimer = 0;
      const count = Math.floor(Math.random() * 3) + 1;  // 1-3 enemies
      for (let i = 0; i < count; i++) {
        this.spawnEnemy();
      }
    }
    
    // Update enemies
    this.enemies.forEach(enemy => {
      enemy.update(deltaTime, this.players);
    });
    
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
      
      // Track deaths
      if (player.isDead) {
        // Check if this is a new death
        const currentDeaths = this.game.gameStats.playerDeaths.get(player.id) || 0;
        if (currentDeaths === 0 || !player.deathTracked) {
          this.game.trackDeath(player.id);
          player.deathTracked = true;
        }
      } else {
        player.deathTracked = false;
      }
    });
    
    // Update projectiles and check collisions with enemies
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      
      if (!projectile.isAlive) return false;
      
      // Check collision with enemies
      let hitEnemy = false;
      this.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        
        if (projectile.checkCollision(enemy)) {
          const isDead = enemy.takeDamage(projectile.damage);
          
          if (isDead) {
            this.killCount++;
            this.game.gameStats.totalKills++;
            
            // Track player damage for MVP
            if (projectile.owner && projectile.owner.id) {
              this.game.trackDamage(projectile.owner.id, projectile.damage);
            }
          }
          
          hitEnemy = true;
          
          // Destroy projectile if not piercing
          if (projectile.onCollision(enemy)) {
            projectile.destroy();
          }
        }
      });
      
      return projectile.isAlive;
    });
    
    // Remove dead enemies
    this.enemies = this.enemies.filter(enemy => !enemy.isDead);
    
    // Update legacy effects
    this.effects = this.effects.filter(effect => {
      effect.update(deltaTime);
      return effect.isAlive;
    });
    
    // Update visual effects
    this.visualEffectsList = this.visualEffectsList.filter(effect => {
      effect.update(deltaTime);
      return effect.isAlive;
    });
    
    // Win condition
    if (this.killCount >= 50) {
      const elapsedTime = now - this.startTime;
      this.game.changeScene('bossFight', {
        elapsedTime: elapsedTime,
        killCount: this.killCount
      });
      return;
    }
    
    // Lose condition
    const allDead = Array.from(this.players.values()).every(p => p.isDead);
    if (allDead && this.players.size > 0) {
      this.transitionToResult(false, now);
    }
  }

  draw(ctx, width, height) {
    // Render fullscreen canvas background
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, width, height);
    this.drawGrid(ctx);
    
    // Render enemies
    this.enemies.forEach(enemy => enemy.render(ctx));
    
    // Render projectiles
    this.projectiles.forEach(projectile => projectile.render(ctx));
        
    // Render visual effects
    this.visualEffectsList.forEach(effect => effect.render(ctx));
    
    // Render players
    this.players.forEach(player => {
      player.render(ctx);
      
      // Render cast bar
      if (player.castState && player.castState.active) {
        const progress = this.castHandler.getCastProgress(player);
        this.visualEffects.renderCastBar(ctx, player, progress);
      }
      
      // Render shield
      if (player.shieldState && player.shieldState.active) {
        this.visualEffects.renderShield(ctx, player);
      }
      
      // Render dash trail
      if (player.isDashing) {
        this.visualEffects.renderDashTrail(ctx, player);
      }
      
      // Render effect indicators
      if (player.activeEffects && player.activeEffects.length > 0) {
        this.visualEffects.renderEffectIndicators(ctx, player);
      }
    });
    
    // Render "WAVE PROGRESS: X / 50" UI at top-center
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(width / 2 - 150, 10, 300, 60);
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WAVE PROGRESS', width / 2, 40);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${this.killCount} / 50`, width / 2, 70);
  }

  render(ctx) {
    this.draw(ctx, ctx.canvas.width, ctx.canvas.height);
  }

  drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  }

  spawnEnemy() {
    // Limit maximum concurrent enemies
    if (this.enemies.length >= 50) {
      console.warn('Max enemy count reached, skipping spawn');
      return;
    }
    
    const edge = Math.floor(Math.random() * 4);  // 0=top, 1=right, 2=bottom, 3=left
    let x, y;
    
    switch (edge) {
      case 0: // Top
        x = Math.random() * this.game.canvas.width;
        y = -30;
        break;
      case 1: // Right
        x = this.game.canvas.width + 30;
        y = Math.random() * this.game.canvas.height;
        break;
      case 2: // Bottom
        x = Math.random() * this.game.canvas.width;
        y = this.game.canvas.height + 30;
        break;
      case 3: // Left
        x = -30;
        y = Math.random() * this.game.canvas.height;
        break;
    }
    
    this.enemies.push(new Enemy({ x, y }));
  }

  transitionToResult(victory, now) {
    const totalTime = now - this.game.gameStats.startTime;
    this.game.changeScene('result', {
      victory: victory,
      totalTime: totalTime,
      totalKills: this.game.gameStats.totalKills
    });
  }

  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'game_state':
        this.updateGameState(data);
        break;
      case 'skill_used':
        // Handle new ability system format
        if (data.inputData) {
          const player = this.players.get(data.playerId);
          if (player) {
            this.skillManager.handleSkill(this, player, data.skillIndex, data.inputData);
          }
        }
        // Handle legacy format for backward compatibility
        else {
          SkillManager.handleSkillUsed(data, this.players, this.effects);
        }
        break;
      case 'player_joined':
        this.addPlayer(data);
        break;
      case 'player_left':
        this.players.delete(data);
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
  }

  addPlayer(playerData) {
    const player = new Player(playerData);
    this.players.set(playerData.id, player);
  }
}
