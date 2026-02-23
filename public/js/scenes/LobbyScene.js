import Scene from './Scene.js';
import Player from '../entities/Player.js';
import SkillManager from '../managers/SkillManager.js';
import VisualEffectsRenderer from "../systems/VisualEffectsRenderer.js";

export default class LobbyScene extends Scene {
  constructor(game) {
    super(game);
    
    this.projectiles = [];
    this.visualEffectsRenderer = new VisualEffectsRenderer();

    this.isHost = false;
    this.friendlyFireEnabled = false; // Disable friendly fire in lobby
    
    // Initialize ability system components for lobby
    this.skillManager = new SkillManager();
  }

  enter() {
    super.enter();
    
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

  /**
   * Override projectile update to handle lobby-specific collision logic
   */
  updateProjectiles(deltaTime) {
    this.projectiles = this.projectiles.filter(projectile => {
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
  }

  /**
   * Override to render lobby-specific UI
   */
  renderUI(ctx) {
    // Header
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, ctx.canvas.width, 80);
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LOBBY - Practice Your Skills!', ctx.canvas.width / 2, 50);
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`${this.players.size} player(s) connected`, ctx.canvas.width / 2, 75);
    
    // Start prompt
    if (this.isHost && this.players.size > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, ctx.canvas.height - 60, ctx.canvas.width, 60);
      ctx.fillStyle = '#2ecc71';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Press START GAME to begin the raid!', ctx.canvas.width / 2, ctx.canvas.height - 25);
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
        // Handle ability system format
        if (data.inputData) {
          const player = this.players.get(data.playerId);
          if (player) {
            this.skillManager.handleSkill(this, player, data.skillIndex, data.inputData);
          }
        }
        break;
      case 'game_started':
        // Transition to Trash Mob scene (not boss fight)
        this.game.changeScene('trashMob', {
          players: this.players,
          startTime: Date.now()
        });
        break;
      case 'enter_test_scene':
        // Transition to Test scene
        this.game.changeScene('test', {
          players: this.players
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
