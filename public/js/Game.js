import { GAME_CONFIG } from './Constants.js';
import LobbyScene from './scenes/LobbyScene.js';
import TestScene from './scenes/TestScene.js';
import TrashMobScene from './scenes/TrashMobScene.js';
import BossFightScene from './scenes/BossFightScene.js';
import ResultScene from './scenes/ResultScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import AudioManager from './managers/AudioManager.js';

export default class Game {
  constructor(canvas, socket) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.socket = socket;
    this.canvas.width = GAME_CONFIG.CANVAS_WIDTH;
    this.canvas.height = GAME_CONFIG.CANVAS_HEIGHT;
    this.scenes = {
      lobby: new LobbyScene(this),
      test: new TestScene(this),
      trashMob: new TrashMobScene(this),
      bossFight: new BossFightScene(this),
      result: new ResultScene(this),
      gameover: new GameOverScene(this)
    };
    this.currentScene = null;
    this.lastTime = 0;
    this.isRunning = false;
    
    // Game statistics tracking
    this.gameStats = {
      startTime: 0,
      totalKills: 0,
      playerDamage: new Map(),  // playerId -> damage dealt
      playerDeaths: new Map()   // playerId -> death count
    };
    
    AudioManager.init();
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('player_joined', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('player_joined', data);
      }
    });
    this.socket.on('player_left', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('player_left', data);
      }
    });
    this.socket.on('game_state', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('game_state', data);
      }
    });
    this.socket.on('skill_used', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('skill_used', data);
      }
    });
    this.socket.on('game_started', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('game_started', data);
      }
    });
    this.socket.on('init_state', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('init_state', data);
      }
    });
    this.socket.on('enter_test_scene', () => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('enter_test_scene');
      }
    });
    this.socket.on('back_to_lobby', () => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('back_to_lobby');
      }
    });
    this.socket.on('all_classes_changed', (data) => {
      if (this.currentScene) {
        this.currentScene.handleSocketEvent('all_classes_changed', data);
      }
    });
  }

  changeScene(sceneName, data = {}) {
    // Validate scene exists
    if (!this.scenes[sceneName]) {
      console.error(`Invalid scene key: ${sceneName}`);
      return;
    }

    // Exit current scene with error handling
    if (this.currentScene) {
      try {
        this.currentScene.exit();
      } catch (error) {
        console.error('Error exiting scene:', error);
      }
    }

    // Switch to new scene
    this.currentScene = this.scenes[sceneName];

    // Enter new scene with error handling
    if (this.currentScene) {
      try {
        this.currentScene.enter(data);
      } catch (error) {
        console.error('Error entering scene:', error);
      }
    }
  }

  start() {
    this.isRunning = true;
    this.changeScene('lobby');
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    if (this.currentScene) {
      this.currentScene.update(deltaTime);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.currentScene) {
      this.currentScene.render(this.ctx);
    }
    requestAnimationFrame((time) => this.gameLoop(time));
  }

  stop() {
    this.isRunning = false;
  }

  // Statistics tracking methods
  resetStats() {
    this.gameStats.startTime = 0;
    this.gameStats.totalKills = 0;
    this.gameStats.playerDamage.clear();
    this.gameStats.playerDeaths.clear();
  }

  trackDamage(playerId, damage) {
    if (!playerId) return;
    const currentDamage = this.gameStats.playerDamage.get(playerId) || 0;
    this.gameStats.playerDamage.set(playerId, currentDamage + damage);
  }

  trackDeath(playerId) {
    if (!playerId) return;
    const currentDeaths = this.gameStats.playerDeaths.get(playerId) || 0;
    this.gameStats.playerDeaths.set(playerId, currentDeaths + 1);
  }

  calculateMVP() {
    if (this.gameStats.playerDamage.size === 0) {
      return null;
    }

    let maxDamage = 0;
    let mvpId = null;

    this.gameStats.playerDamage.forEach((damage, playerId) => {
      if (damage > maxDamage) {
        maxDamage = damage;
        mvpId = playerId;
      }
    });

    return mvpId ? { playerId: mvpId, damage: maxDamage } : null;
  }

  calculateMostDeaths() {
    if (this.gameStats.playerDeaths.size === 0) {
      return null;
    }

    let maxDeaths = 0;
    let playerId = null;

    this.gameStats.playerDeaths.forEach((deaths, pid) => {
      if (deaths > maxDeaths) {
        maxDeaths = deaths;
        playerId = pid;
      }
    });

    return playerId ? { playerId: playerId, deaths: maxDeaths } : null;
  }
}
