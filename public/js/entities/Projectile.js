import { GAME_CONFIG } from '../Constants.js';

export default class Projectile {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.damage = config.damage || 10;
    this.radius = config.radius || 8;
    this.color = config.color || '#ffff00';
    this.owner = config.owner;
    this.lifetime = config.lifetime || 3000;
    this.createdAt = Date.now();
    this.isAlive = true;
  }

  update(deltaTime) {
    if (!this.isAlive) return;
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > GAME_CONFIG.CANVAS_WIDTH || this.y < 0 || this.y > GAME_CONFIG.CANVAS_HEIGHT) {
      this.isAlive = false;
    }
    if (Date.now() - this.createdAt > this.lifetime) {
      this.isAlive = false;
    }
  }

  render(ctx) {
    if (!this.isAlive) return;
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (this.vx !== 0 || this.vy !== 0) {
      const angle = Math.atan2(this.vy, this.vx);
      ctx.fillStyle = this.color + '60';
      ctx.beginPath();
      ctx.arc(this.x - Math.cos(angle) * 10, this.y - Math.sin(angle) * 10, this.radius * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  checkCollision(target) {
    if (!this.isAlive || !target) return false;
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.radius + (target.radius || 20));
  }

  destroy() {
    this.isAlive = false;
  }
}
