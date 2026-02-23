import Scene from './Scene.js';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import SkillManager from '../managers/SkillManager.js';
import { GAME_CONFIG } from '../Constants.js';

/**
 * TestScene - A dedicated scene for testing class abilities
 * Provides a clean environment with a stationary test enemy and rapid class switching
 */
export default class TestScene extends Scene {
  constructor(game) {
    super(game);
    this.testEnemy = null;
    this.isHost = false;
    this.enemyRespawnTimer = null;
    
    // Initialize ability system components
    this.skillManager = new SkillManager();
  }

  /**
   * Enter the test scene - spawn test enemy and initialize
   */
  enter(data = {}) {
    super.enter();
    
    // Preserve players from previous scene if provided
    if (data.players) {
      this.players = data.players;
    }
    
    this.spawnTestEnemy();
    
    // Show test controls for host
    if (this.isHost) {
      const controls = document.getElementById('test-scene-controls');
      if (controls) {
        controls.style.display = 'block';
      }
    }
  }

  /**
   * Exit the test scene - cleanup resources
   */
  exit() {
    super.exit();
    
    // Clear respawn timer
    if (this.enemyRespawnTimer) {
      clearTimeout(this.enemyRespawnTimer);
      this.enemyRespawnTimer = null;
    }
    
    // Hide test controls
    const controls = document.getElementById('test-scene-controls');
    if (controls) {
      controls.style.display = 'none';
    }
  }

  /**
   * Override to add test enemy collision detection
   */
  updateProjectiles(deltaTime) {
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      
      if (!projectile.isAlive) return false;
      
      // Check collision with test enemy
      if (this.testEnemy && !this.testEnemy.isDead && projectile.checkCollision(this.testEnemy)) {
        const died = this.testEnemy.takeDamage(projectile.damage);
        
        if (died) {
          // Schedule respawn after 3 seconds
          this.enemyRespawnTimer = setTimeout(() => {
            this.spawnTestEnemy();
          }, 3000);
        }
        
        if (!projectile.pierce) {
          projectile.destroy();
        }
      }
      
      return projectile.isAlive;
    });
  }

  /**
   * Override to add test enemy melee collision detection
   */
  updateEntities(deltaTime) {
    // Check melee effect collisions with test enemy
    this.meleeAttacks.forEach(melee => {
      if (this.testEnemy && !this.testEnemy.isDead && melee.checkCollision(this.testEnemy)) {
        const died = this.testEnemy.takeDamage(melee.damage);
        
        if (died) {
          // Schedule respawn after 3 seconds
          this.enemyRespawnTimer = setTimeout(() => {
            this.spawnTestEnemy();
          }, 3000);
        }
      }
    });
  }

  /**
   * Override to render test enemy
   */
  renderEntities(ctx) {
    if (this.testEnemy) {
      this.testEnemy.render(ctx);
    }
  }

  /**
   * Handle socket events
   * @param {string} eventName - Name of the event
   * @param {*} data - Event data
   */
  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'player_joined':
        this.addPlayer(data);
        console.log(`${data.name} joined test scene!`);
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
        if (data.inputData) {
          const player = this.players.get(data.playerId);
          if (player) {
            this.skillManager.handleSkill(this, player, data.skillIndex, data.inputData);
          }
        }
        break;
        
      case 'back_to_lobby':
        this.game.changeScene('lobby', {
          players: this.players
        });
        break;
        
      case 'all_classes_changed':
        this.changeAllClasses(data.className);
        break;
    }
  }

  /**
   * Update game state from server
   * @param {Object} state - Game state from server
   */
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

  /**
   * Set whether this is the host view
   * @param {boolean} isHost - True if this is the host
   */
  setHost(isHost) {
    this.isHost = isHost;
  }

  /**
   * Add a player to the scene
   * @param {Object} playerData - Player data from server
   */
  addPlayer(playerData) {
    if (playerData.isHost) return;
    const player = new Player(playerData);
    this.players.set(playerData.id, player);
  }

  /**
   * Spawn the test enemy at the center of the canvas
   */
  spawnTestEnemy() {
    // Clear any existing respawn timer
    if (this.enemyRespawnTimer) {
      clearTimeout(this.enemyRespawnTimer);
      this.enemyRespawnTimer = null;
    }
    
    this.testEnemy = new Enemy({
      x: GAME_CONFIG.CANVAS_WIDTH / 2,
      y: GAME_CONFIG.CANVAS_HEIGHT / 2,
      hp: 1000,
      maxHp: 1000,
      speed: 0,              // Stationary
      radius: 30,            // Larger target
      color: '#FF6B6B',      // Distinct red color
      attackRange: 0,        // No attacks
      attackDamage: 0,
      attackCooldown: Infinity
    });
    
    // Override update to prevent any AI behavior
    this.testEnemy.update = function() {
      // Do nothing - completely stationary
    };
  }

  /**
   * Change all players to a specific class
   * @param {string} className - The class name to change to
   */
  changeAllClasses(className) {
    this.players.forEach(player => {
      player.changeClass(className);
    });
  }
}
