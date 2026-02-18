export default class Enemy {
  constructor(config = {}) {
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.hp = config.hp || 30;
    this.maxHp = config.maxHp || 30;
    this.speed = config.speed || 1.8;
    this.radius = config.radius || 20;
    this.color = config.color || '#8B4513';
    this.attackRange = config.attackRange || 30;
    this.attackDamage = config.attackDamage || 5;
    this.attackCooldown = config.attackCooldown || 1000;
    this.lastAttackTime = 0;
    this.target = null;
    this.isDead = false;
  }

  findNearestPlayer(players) {
    let nearest = null;
    let minDist = Infinity;

    for (const player of players.values()) {
      if (player.isDead) continue;

      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }

    return nearest;
  }

  update(deltaTime, players) {
    if (this.isDead) return;

    // Find nearest living player
    this.target = this.findNearestPlayer(players);

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Move toward target
      if (distance > this.attackRange) {
        const moveAmount = (this.speed * deltaTime) / 16.67; // Normalize to ~60fps
        this.x += (dx / distance) * moveAmount;
        this.y += (dy / distance) * moveAmount;
      }
      // Attack if in range
      else if (this.canAttack()) {
        this.attack(this.target);
      }
    }
  }

  canAttack() {
    const now = Date.now();
    return now - this.lastAttackTime >= this.attackCooldown;
  }

  attack(target) {
    if (!target || target.isDead) return;

    target.takeDamage(this.attackDamage);
    this.lastAttackTime = Date.now();
  }

  takeDamage(amount) {
    if (this.isDead) return false;

    this.hp -= amount;

    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      return true; // Enemy died
    }

    return false; // Enemy still alive
  }

  checkCollision(entity) {
    if (!entity) return false;

    const dx = entity.x - this.x;
    const dy = entity.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const combinedRadius = this.radius + (entity.radius || 0);

    return distance < combinedRadius;
  }

  render(ctx) {
    if (this.isDead) return;

    // Draw enemy body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw enemy outline
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw HP bar
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const barX = this.x - this.radius;
    const barY = this.y - this.radius - 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP fill
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }
}
