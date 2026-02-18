import Scene from './Scene.js';
import Player from '../entities/Player.js';
import Boss from '../entities/Boss.js';
import Tombstone from '../entities/Tombstone.js';
import SkillManager from '../managers/SkillManager.js';
import { GAME_CONFIG } from '../Constants.js';

export default class BossFightScene extends Scene {
  constructor(game) {
    super(game);
    this.players = new Map();
    this.boss = null;
    this.effects = [];
    this.tombstones = new Map();
    this.reviveAttempts = new Map();
  }

  enter() {
    super.enter();
    if (!this.boss) {
      this.boss = new Boss();
    }
    this.effects = [];
    this.tombstones.clear();
    this.reviveAttempts.clear();
    console.log('Boss fight started!');
  }

  update(deltaTime) {
    if (!this.boss) return;
    this.players.forEach(player => {
      player.update(deltaTime);
      if (player.isDead && !this.tombstones.has(player.id)) {
        this.tombstones.set(player.id, new Tombstone(player));
      }
    });
    this.boss.update(deltaTime, Array.from(this.players.values()));
    this.effects = this.effects.filter(effect => {
      effect.update(deltaTime);
      if (!effect.isAlive) return false;
      if (effect.checkCollision && effect.damage && effect.checkCollision(this.boss)) {
        const isDead = this.boss.takeDamage(effect.damage);
        effect.destroy();
        if (isDead) {
          this.game.changeScene('gameover', { victory: true });
        }
        return false;
      }
      return effect.isAlive;
    });
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
    const allDead = Array.from(this.players.values()).every(p => p.isDead);
    if (allDead && this.players.size > 0) {
      this.game.changeScene('gameover', { victory: false });
    }
  }

  render(ctx) {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.drawGrid(ctx);
    if (this.boss) {
      this.boss.render(ctx);
    }
    this.effects.forEach(effect => effect.render(ctx));
    this.players.forEach(player => player.render(ctx));
    this.tombstones.forEach(tombstone => tombstone.render(ctx));
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

  handleSocketEvent(eventName, data) {
    switch (eventName) {
      case 'game_state':
        this.updateGameState(data);
        break;
      case 'skill_used':
        SkillManager.handleSkillUsed(data, this.players, this.effects);
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
