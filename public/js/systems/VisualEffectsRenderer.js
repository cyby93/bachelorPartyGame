/**
 * VisualEffectsRenderer.js
 * 
 * Handles rendering of visual feedback for abilities
 * Includes cast bars, shield visuals, dash trails, etc.
 */

export default class VisualEffectsRenderer {
  constructor() {
    this.dashTrails = [];
  }

  /**
   * Render cast progress bar above player
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Player} player - The player casting
   * @param {number} progress - Progress from 0.0 to 1.0
   */
  renderCastBar(ctx, player) {
    const progress = player.castState.progress;
    // console.log(player)
    if (!player || player.castState.progress === undefined) return;

    const barWidth = 60;
    const barHeight = 6;
    const x = player.x - barWidth / 2;
    const y = player.y - 40;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Progress fill
    const color = progress < 1.0 ? '#4CAF50' : '#FFD700';
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Percentage text
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(progress * 100)}%`, player.x, y - 2);
  }

  renderAoeEffect(ctx, player) {
    // AGENT_IMPLEMENTATION_HERE
  }

  /**
   * Render shield visual
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Player} player - The player with shield
   */
  renderShield(ctx, player) {
    if (!player || !player.shieldState || !player.shieldState.active) return;

    const shieldState = player.shieldState;
    const radius = 35;

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(shieldState.angle);

    // Shield arc
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(0, 0, radius, -shieldState.arc / 2, shieldState.arc / 2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shield glow effect
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, -shieldState.arc / 2, shieldState.arc / 2);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Render dash trail effect
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Player} player - The player dashing
   */
  renderDashTrail(ctx, player) {
    if (!player || !player.isDashing) return;

    // Add current position to trail
    this.dashTrails.push({
      x: player.x,
      y: player.y,
      timestamp: Date.now(),
      color: player.color || '#ffffff'
    });

    // Render trail
    for (let i = 0; i < this.dashTrails.length; i++) {
      const trail = this.dashTrails[i];
      const age = Date.now() - trail.timestamp;
      const maxAge = 300;

      if (age > maxAge) {
        this.dashTrails.splice(i, 1);
        i--;
        continue;
      }

      const alpha = 1 - (age / maxAge);
      const size = 10 * alpha;

      ctx.save();
      ctx.fillStyle = trail.color + Math.floor(alpha * 128).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Render buff/debuff indicators above player
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Player} player - The player
   */
  renderEffectIndicators(ctx, player) {
    if (!player || !player.activeEffects || player.activeEffects.length === 0) return;

    const iconSize = 12;
    const spacing = 2;
    const startX = player.x - ((player.activeEffects.length * (iconSize + spacing)) / 2);
    const y = player.y - 50;

    for (let i = 0; i < player.activeEffects.length; i++) {
      const effect = player.activeEffects[i];
      const x = startX + i * (iconSize + spacing);

      // Background
      ctx.fillStyle = effect.type === 'BUFF' ? '#4CAF50' : '#F44336';
      ctx.fillRect(x, y, iconSize, iconSize);

      // Border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, iconSize, iconSize);

      // Duration indicator
      if (effect.duration) {
        const elapsed = Date.now() - effect.startTime;
        const remaining = Math.max(0, effect.duration - elapsed);
        const progress = remaining / effect.duration;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y + iconSize * (1 - progress), iconSize, iconSize * progress);
      }
    }
  }

  /**
   * Render projectile trail
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Projectile} projectile - The projectile
   */
  renderProjectileTrail(ctx, projectile) {
    if (!projectile || !projectile.isAlive) return;

    const angle = Math.atan2(projectile.vy, projectile.vx);

    ctx.save();
    ctx.fillStyle = projectile.color + '60';
    ctx.beginPath();
    ctx.arc(
      projectile.x - Math.cos(angle) * 10,
      projectile.y - Math.sin(angle) * 10,
      projectile.radius * 0.7,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render AOE targeting indicator (for lobbed AOE)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - Target X position
   * @param {number} y - Target Y position
   * @param {number} radius - AOE radius
   */
  renderAOETargeting(ctx, x, y, radius) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  /**
   * Render cooldown overlay on skill buttons
   * @param {HTMLElement} skillButton - The skill button element
   * @param {number} remaining - Remaining cooldown in ms
   * @param {number} total - Total cooldown in ms
   */
  renderCooldownOverlay(skillButton, remaining, total) {
    if (!skillButton) return;

    const overlay = skillButton.querySelector('.cooldown-overlay');
    if (!overlay) return;

    const percentage = (remaining / total) * 100;

    if (remaining > 0) {
      skillButton.classList.add('on-cooldown');
      overlay.style.height = `${percentage}%`;
    } else {
      skillButton.classList.remove('on-cooldown');
      overlay.style.height = '0%';
    }
  }

  /**
   * Clear all temporary visual effects
   */
  clear() {
    this.dashTrails = [];
  }
}
