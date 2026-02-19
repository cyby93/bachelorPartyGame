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
    this.color = this.classData.color;
    this.speed = this.classData.speed;
    
    // New ability system properties
    this.castState = null;
    this.shieldState = null;
    this.isDashing = false;
    this.dashStartTime = 0;
    this.dashDuration = 0;
    this.dashVelocity = null;
    this.activeEffects = [];
    this.originalSpeed = this.speed;
    this.originalStats = {
      speed: this.speed,
      maxHp: this.maxHp,
      armor: 0
    };
    this.isShielding = false;
    this.isCasting = false;
    this.isStunned = false;
    this.isRooted = false;
    this.tempShield = 0;
  }

  update(deltaTime) {
    if (this.isDead) return;
    
    // Get current speed (may be modified by effects)
    let currentSpeed = this.speed;
    
    // Apply rooted/stunned effects
    if (this.isRooted || this.isStunned) {
      currentSpeed = 0;
    }
    
    this.vx = this.moveX * currentSpeed;
    this.vy = this.moveY * currentSpeed;
    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_CONFIG.CANVAS_HEIGHT - this.radius, this.y));
    
    if (this.moveX !== 0 || this.moveY !== 0) {
      this.angle = Math.atan2(this.moveY, this.moveX);
    }
    
    // Update legacy buffs
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

  changeClass(className) {
    this.className = className;
    this.classData = CLASSES[className];
    this.color = this.classData.color;
    this.speed = this.classData.speed;
    this.originalSpeed = this.speed;

    // Reset cooldowns
    this.cooldowns = [0, 0, 0, 0];

    // Update max HP but keep current HP percentage
    const hpPercent = this.hp / this.maxHp;
    this.maxHp = this.classData.hp;
    this.hp = Math.min(this.hp, this.maxHp * hpPercent);

    // Update original stats
    this.originalStats.speed = this.speed;
    this.originalStats.maxHp = this.maxHp;
  }
}