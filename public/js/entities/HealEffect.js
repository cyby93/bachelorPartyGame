export default class HealEffect {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.amount = config.amount || 30;
    this.radius = config.radius || 15;
    this.owner = config.owner;
    this.lifetime = config.lifetime || 500;
    this.createdAt = Date.now();
    this.isAlive = true;
  }

  update(deltaTime) {
    if (!this.isAlive) return;
    this.y -= 0.5;
    if (Date.now() - this.createdAt > this.lifetime) {
      this.isAlive = false;
    }
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

  destroy() {
    this.isAlive = false;
  }
}
