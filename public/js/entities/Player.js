import { CLASSES, GAME_CONFIG } from '../Constants.js';

export default class Player {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.className = data.className;
    this.classData = CLASSES[data.className];
    this.x = data.x || 400;
    this.y = data.y || 300;
    this.vx = 0;
    this.vy = 0;
    this.hp = this.classData.hp;
    this.maxHp = this.classData.hp;
    this.isDead = false;
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.cooldowns = [0, 0, 0, 0];
    this.buffs = [];
    this.angle = 0;
    this.radius = GAME_CONFIG.PLAYER_COLLISION_RADIUS;
  }

  update(deltaTime) {
    if (this.isDead) return;
    const speed = this.classData.speed;
    this.vx = this.moveX * speed;
    this.vy = this.moveY * speed;
    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y));
    if (this.moveX !== 0 || this.moveY !== 0) {
      this.angle = Math.atan2(this.moveY, this.moveX);
    }
    this.buffs = this.buffs.filter(buff => buff.endTime > Date.now());
  }

  render(ctx) {
    if (this.isDead) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.classData.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    switch (this.className) {
      case 'WARRIOR':
      case 'PALADIN':
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        break;
      case 'MAGE':
      case 'PRIEST':
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'ROGUE':
      case 'HUNTER':
        ctx.beginPath();
        ctx.moveTo(this.radius, 0);
        ctx.lineTo(-this.radius, -this.radius);
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      default:
        this.drawPolygon(ctx, 0, 0, this.radius, 5);
        ctx.fill();
        ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.radius - 5, -3, 10, 6);
    ctx.restore();
    this.drawHealthBar(ctx);
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - this.radius - 15);
  }

  drawPolygon(ctx, x, y, radius, sides) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  drawHealthBar(ctx) {
    const barWidth = 40;
    const barHeight = 5;
    const x = this.x - barWidth / 2;
    const y = this.y - this.radius - 25;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : hpPercent > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(x, y, barWidth * hpPercent, barHeight);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
  }

  takeDamage(amount) {
    if (this.isDead) return;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
    }
  }

  heal(amount) {
    if (this.isDead) return;
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  useSkill(skillIndex) {
    if (this.isDead) return false;
    if (this.cooldowns[skillIndex] > Date.now()) return false;
    const skill = this.classData.skills[skillIndex];
    this.cooldowns[skillIndex] = Date.now() + skill.cooldown;
    return true;
  }

  revive() {
    this.isDead = false;
    this.hp = this.maxHp * 0.4;
  }
}
