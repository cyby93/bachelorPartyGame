import { BOSS_CONFIG, GAME_CONFIG } from '../Constants.js';

export default class Boss {
  constructor() {
    const config = BOSS_CONFIG.ILLIDAN;
    this.name = config.name;
    this.x = GAME_CONFIG.CANVAS_WIDTH / 2;
    this.y = GAME_CONFIG.CANVAS_HEIGHT / 2;
    this.hp = config.maxHp;
    this.maxHp = config.maxHp;
    this.radius = GAME_CONFIG.BOSS_COLLISION_RADIUS;
    this.speed = config.speed;
    this.abilities = config.abilities;
    this.phases = config.phases;
    this.currentPhase = 0;
    this.target = null;
    this.angle = 0;
    this.abilityCooldowns = this.abilities.map(() => 0);
    this.nextAbilityTime = Date.now() + 2000;
  }

  update(deltaTime, players) {
    const hpPercent = this.hp / this.maxHp;
    for (let i = this.phases.length - 1; i >= 0; i--) {
      if (hpPercent <= this.phases[i].threshold) {
        if (this.currentPhase !== i) {
          this.currentPhase = i;
          this.speed = this.phases[i].speed;
        }
        break;
      }
    }
    this.target = this.findNearestPlayer(players);
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 100) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
      this.angle = Math.atan2(dy, dx);
    }
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y));
  }

  findNearestPlayer(players) {
    let nearest = null;
    let minDist = Infinity;
    for (const player of players) {
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

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#8b0000';
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a0000';
    ctx.beginPath();
    ctx.moveTo(-this.radius * 0.5, -this.radius);
    ctx.lineTo(-this.radius * 0.7, -this.radius * 1.5);
    ctx.lineTo(-this.radius * 0.3, -this.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.radius * 0.5, -this.radius);
    ctx.lineTo(this.radius * 0.7, -this.radius * 1.5);
    ctx.lineTo(this.radius * 0.3, -this.radius * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.3, -this.radius * 0.2, 5, 0, Math.PI * 2);
    ctx.arc(this.radius * 0.3, -this.radius * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.drawHealthBar(ctx);
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.radius - 20);
  }

  drawHealthBar(ctx) {
    const barWidth = 100;
    const barHeight = 8;
    const x = this.x - barWidth / 2;
    const y = this.y - this.radius - 35;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp}`, this.x, y - 3);
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp <= 0;
  }
}
