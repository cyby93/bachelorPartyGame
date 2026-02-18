export default class AOEEffect {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.damage = config.damage || 20;
    this.radius = config.radius || 80;
    this.color = config.color || '#f39c12';
    this.owner = config.owner;
    this.lifetime = config.lifetime || 500;
    this.createdAt = Date.now();
    this.isAlive = true;
    this.hasDealtDamage = false;
  }

  update(deltaTime) {
    if (!this.isAlive) return;
    if (Date.now() - this.createdAt > this.lifetime) {
      this.isAlive = false;
    }
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    const progress = (Date.now() - this.createdAt) / this.lifetime;
    const currentRadius = this.radius * (0.5 + progress * 0.5);
    const alpha = Math.floor((1 - progress) * 128);
    ctx.fillStyle = this.color + alpha.toString(16).padStart(2, '0');
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fff' + alpha.toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, currentRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  checkCollision(target) {
    if (!this.isAlive || !target || this.hasDealtDamage) return false;
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius + (target.radius || 20));
  }

  destroy() {
    this.isAlive = false;
  }

  markDamageDealt() {
    this.hasDealtDamage = true;
  }
}
