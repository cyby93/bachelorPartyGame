import { GAME_CONFIG } from './Constants.js';
import LobbyScene from './scenes/LobbyScene.js';
import BossFightScene from './scenes/BossFightScene.js';
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
      bossfight: new BossFightScene(this),
      gameover: new GameOverScene(this)
    };
    this.currentScene = null;
    this.lastTime = 0;
    this.isRunning = false;
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
  }

  changeScene(sceneName, data) {
    if (this.currentScene) {
      this.currentScene.exit();
    }
    this.currentScene = this.scenes[sceneName];
    if (this.currentScene) {
      this.currentScene.enter(data);
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
}
