export default class Scene {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.projectiles = [];
    this.meleeAttacks = [];
  }

  enter() {
    this.isActive = true;
  }

  exit() {
    this.isActive = false;
  }

  update(deltaTime) {}

  render(ctx) {}

  /**
   * Renders the background color
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderBackground(ctx) {
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * Renders a grid overlay on the canvas
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderGrid(ctx) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // Vertical lines
    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  }

  /**
   * Renders visual effects for a player (cast bar, shield, dash trail, effect indicators)
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   * @param {Player} player - The player to render visual effects for
   */
  renderPlayerVisualEffects(ctx, player) {
    if (!this.visualEffectsRenderer) return;
        // console.log(player)

    // Render cast bar
    if (player.castState && player.castState.active) {
      this.visualEffectsRenderer.renderCastBar(ctx, player);
    }
    
    // Render shield
    if (player.shieldState && player.shieldState.active) {
      this.visualEffectsRenderer.renderShield(ctx, player);
    }
    
    // Render dash trail
    if (player.isDashing) {
      this.visualEffectsRenderer.renderDashTrail(ctx, player);
    }
    
    // Render effect indicators
    if (player.activeEffects && player.activeEffects.length > 0) {
      this.visualEffectsRenderer.renderEffectIndicators(ctx, player);
    }
  }

  /**
   * Renders all players and their visual effects
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderPlayers(ctx) {
    if (!this.players) return;
    
    this.players.forEach(player => {
      player.render(ctx);
      this.renderPlayerVisualEffects(ctx, player);
    });
  }

  /**
   * Renders all projectiles
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderProjectiles(ctx) {
    if (!this.projectiles) return;
    
    this.projectiles.forEach(projectile => projectile.render(ctx));
  }

  /**
   * Renders all melee effects
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderMeleeEffects(ctx) {
    if (!this.meleeAttacks) return;
    
    this.meleeAttacks.forEach(meleeEffect => meleeEffect.render(ctx));
  }

  handleSocketEvent(eventName, data) {}
}
