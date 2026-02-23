import Ability from './Ability.js';

export default class AOEEffect extends Ability {
  constructor(config) {
    // Call parent constructor with base properties
    super({
      x: config.x,
      y: config.y,
      owner: config.owner,
      lifetime: config.lifetime !== undefined ? config.lifetime : 500,
      radius: config.radius !== undefined ? config.radius : 80,
      color: config.color !== undefined ? config.color : '#f39c12'
    });
    
    // Initialize AOE-specific properties
    this.damage = config.damage !== undefined ? config.damage : 20;
    this.hasDealtDamage = false;
  }

  _update(deltaTime) {
    // AOE effects don't need additional update logic beyond lifetime checking
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

  markDamageDealt() {
    this.hasDealtDamage = true;
  }
}
