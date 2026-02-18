import Scene from './Scene.js';
import Player from '../entities/Player.js';
import SkillManager from '../managers/SkillManager.js';

export default class LobbyScene extends Scene {
  constructor(game) {
    super(game);
    this.players = new Map();
    this.effects = [];
    this.isHost = false;
  }

  enter() {
    super.enter();
    this.effects = [];
  }

  update(deltaTime) {
    this.players.forEach(player => player.update(deltaTime));
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
    this.effects.forEach(effect => effect.render(ctx));
    this.players.forEach(player => player.render(ctx));
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
        SkillManager.handleSkillUsed(data, this.players, this.effects);
        break;
      case 'game_started':
        this.game.changeScene('bossfight');
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
