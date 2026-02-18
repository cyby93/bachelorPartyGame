import Scene from './Scene.js';

export default class GameOverScene extends Scene {
  constructor(game) {
    super(game);
    this.victory = false;
  }

  enter(data = {}) {
    super.enter();
    this.victory = data.victory || false;
  }

  update(deltaTime) {}

  render(ctx) {
    ctx.fillStyle = this.victory ? '#1e5128' : '#5c0a0a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = this.victory ? '#2ecc71' : '#e74c3c';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.victory ? 'VICTORY!' : 'DEFEAT', ctx.canvas.width / 2, ctx.canvas.height / 2 - 50);
    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    if (this.victory) {
      ctx.fillText('Illidan has been defeated!', ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
    } else {
      ctx.fillText('Your raid has been wiped...', ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
    }
    ctx.font = '24px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Refresh to play again', ctx.canvas.width / 2, ctx.canvas.height / 2 + 100);
  }

  handleSocketEvent(eventName, data) {}
}
