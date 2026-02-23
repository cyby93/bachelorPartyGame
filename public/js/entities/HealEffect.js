import Ability from './Ability.js';

export default class HealEffect extends Ability {
  constructor(config) {
    super({
      x: config.x,
      y: config.y,
      owner: config.owner,
      lifetime: config.lifetime !== undefined ? config.lifetime : 500,
      radius: config.radius !== undefined ? config.radius : 15,
      color: config.color !== undefined ? config.color : '#2ecc71'
    });
    this.amount = config.amount !== undefined ? config.amount : 30;
  }

  _update(deltaTime) {
    this.y -= 0.5;
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    const progress = (Date.now() - this.createdAt) / this.lifetime;
    const alpha = Math.floor((1 - progress) * 255);
    const currentRadius = this.radius * (1 + progress * 0.5);
    ctx.fillStyle = '#2ecc71' + alpha.toString(16).padStart(2, '0');
    ctx.strokeStyle = '#fff' + alpha.toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    const size = currentRadius * 0.6;
    ctx.beginPath();
    ctx.moveTo(this.x - size, this.y);
    ctx.lineTo(this.x + size, this.y);
    ctx.moveTo(this.x, this.y - size);
    ctx.lineTo(this.x, this.y + size);
    ctx.stroke();
    ctx.restore();
  }

  checkCollision(target) {
    if (!this.isAlive || !target) return false;
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius + (target.radius || 20));
  }
}
