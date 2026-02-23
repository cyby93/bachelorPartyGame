import { GAME_CONFIG } from '../Constants.js';
import Ability from './Ability.js';

export default class Projectile extends Ability {
  constructor(config) {
    // Call parent constructor with base properties
    super({
      x: config.x,
      y: config.y,
      owner: config.owner,
      lifetime: config.lifetime !== undefined ? config.lifetime : 30000,
      radius: config.radius !== undefined ? config.radius : 8,
      color: config.color !== undefined ? config.color : '#ffff00'
    });
    
    // Initialize projectile-specific properties
    this.vx = config.vx || 0;
    this.vy = config.vy || 0;
    this.speed = config.speed || Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.damage = config.damage || 10;
    this.pierce = config.pierce || false;
    this.range = config.range || 500;
    this.distanceTraveled = 0;
    this.healAmount = config.healAmount || 0;  // For healing projectiles
    this.effectType = config.effectType || 'DAMAGE';  // DAMAGE, HEAL, etc.
    this.onImpact = config.onImpact || null;  // For AOE on impact (e.g., Pyroblast)
  }

  _update(deltaTime) {
    // Calculate distance moved this frame
    const dx = this.vx;
    const dy = this.vy;
    const distanceThisFrame = Math.sqrt(dx * dx + dy * dy);
    
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Update distance traveled
    this.distanceTraveled += distanceThisFrame;
    
    // Check if exceeded range
    if (this.distanceTraveled >= this.range) {
      this.isAlive = false;
      return;
    }
    
    // Check bounds
    if (this.x < 0 || this.x > GAME_CONFIG.CANVAS_WIDTH || this.y < 0 || this.y > GAME_CONFIG.CANVAS_HEIGHT) {
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

  /**
   * Handle collision with a target
   * @param {Object} target - The entity hit
   * @returns {boolean} - True if projectile should be destroyed
   */
  onCollision(target) {
    // If pierce is enabled, don't destroy the projectile
    if (this.pierce) {
      return false;
    }
    // Otherwise, destroy on collision
    return true;
  }
}
