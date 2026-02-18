import Scene from './Scene.js';
import Player from '../entities/Player.js';
import SkillManager from '../managers/SkillManager.js';
import VisualEffectsRenderer from '../systems/VisualEffectsRenderer.js';

export default class LobbyScene extends Scene {
  constructor(game) {
    super(game);
    this.players = new Map();
    this.effects = [];
    this.visualEffectsRenderer = new VisualEffectsRenderer();
    
    this.projectiles = [];
    this.isHost = false;
    this.friendlyFireEnabled = false; // Disable friendly fire in lobby
    
    // Initialize ability system components for lobby
    this.skillManager = new SkillManager();
  }

  enter() {
    super.enter();
    this.effects = [];
    
    // Enable split-screen layout
    const container = document.getElementById('host-container');
    if (container) {
      container.classList.add('split-screen-layout');
    }
    
    // Show sidebar
    const sidebar = document.getElementById('lobby-sidebar');
    if (sidebar) {
      sidebar.style.display = 'block';
    }
  }

  exit() {
    super.exit();
    
    // Disable split-screen layout
    const container = document.getElementById('host-container');
    if (container) {
      container.classList.remove('split-screen-layout');
    }
    
    // Hide sidebar
    const sidebar = document.getElementById('lobby-sidebar');
    if (sidebar) {
      sidebar.style.display = 'none';
    }
  }

  update(deltaTime) {
    this.players.forEach(player => player.update(deltaTime));
    
    // Update projectiles
    this.projectiles = this.projectiles.filter(projectile => {
      // return true;
      projectile.update(deltaTime);
      
      if (!projectile.isAlive) return false;
      
      // Check collisions with players (but don't apply damage - friendly fire disabled)
      this.players.forEach(player => {
        if (projectile.checkCollision(player)) {
          // In lobby, projectiles pass through players (no damage)
          // Just destroy the projectile visually
          if (!projectile.pierce && projectile.owner.id !== player.id) {
            projectile.destroy();
          }
        }
      });
      
      return projectile.isAlive;
    });
    
    this.effects = this.effects.filter(effect => {
      effect.update(deltaTime);
      return effect.isAlive;
    });
  }

  render(ctx) {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawGrid(ctx);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, 80);
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LOBBY - Practice Your Skills!', ctx.canvas.width / 2, 50);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`${this.players.size} player(s) connected`, ctx.canvas.width / 2, 75);
    
    // Render projectiles
    this.projectiles.forEach(projectile => projectile.render(ctx));
    
    // Render visualEffects
    this.effects.forEach(effect => effect.render(ctx));

    this.effects.forEach(effect => effect.render(ctx));
    this.players.forEach(player => {
      player.render(ctx)
       // Render shield
      if (player.shieldState && player.shieldState.active) {
        this.visualEffectsRenderer.renderShield(ctx, player);
      }
   
    });
    if (this.isHost && this.players.size > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, ctx.canvas.height - 60, ctx.canvas.width, 60);
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Press START GAME to begin the raid!', ctx.canvas.width / 2, ctx.canvas.height - 25);
    }
  }

  drawGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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

  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'player_joined':
        this.addPlayer(data);
        console.log(`${data.name} joined!`);
        break;
      case 'player_left':
        this.players.delete(data);
        break;
      case 'init_state':
        Object.values(data.players).forEach(playerData => {
          if (!playerData.isHost) {
            this.addPlayer(playerData);
          }
        });
        break;
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
      case 'game_started':
        // Transition to Trash Mob scene (not boss fight)
        this.game.changeScene('trashMob', {
          players: this.players,
          startTime: Date.now()
        });
        break;
    }
  }

  updateGameState(state) {
    Object.values(state.players).forEach(playerData => {
      if (playerData.isHost) return;
      let player = this.players.get(playerData.id);
      if (!player) {
        player = new Player(playerData);
        this.players.set(playerData.id, player);
      }
      player.moveX = playerData.moveX || 0;
      player.moveY = playerData.moveY || 0;
    });
  }

  setHost(isHost) {
    this.isHost = isHost;
  }

  addPlayer(playerData) {
    if (playerData.isHost) return;
    const player = new Player(playerData);
    this.players.set(playerData.id, player);
  }
}
