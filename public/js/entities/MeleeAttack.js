export default class MeleeAttack {
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.damage = config.damage || 15;
    this.radius = config.radius || 20;
    this.range = config.range || 80;  // Attack range
    this.coneAngle = config.angle || Math.PI / 3;  // Cone angle in radians
    this.direction = config.direction || { x: 1, y: 0 };  // Attack direction
    this.color = config.color || '#ff6b6b';
    this.owner = config.owner;
    this.lifetime = config.lifetime || 200;
    this.duration = config.duration || 200;
    this.createdAt = Date.now();
    this.isAlive = true;
    this.angle = Math.atan2(this.direction.y, this.direction.x);
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
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    
    const alpha = 1 - (Date.now() - this.createdAt) / this.lifetime;
    const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');
    
    ctx.fillStyle = this.color + hexAlpha;
    ctx.strokeStyle = '#fff' + Math.floor(alpha * 128).toString(16).padStart(2, '0');
    ctx.lineWidth = 2;
    
    // Draw cone/arc shape
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, this.range, -this.coneAngle / 2, this.coneAngle / 2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
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

  destroy() {
    this.isAlive = false;
  }
}
