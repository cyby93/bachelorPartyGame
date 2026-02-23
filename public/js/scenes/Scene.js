import VisualEffectsRenderer from '../systems/VisualEffectsRenderer.js';

export default class Scene {
  constructor(game) {
    this.game = game;
    this.isActive = false;
    this.projectiles = [];
    this.meleeAttacks = [];
    this.aoeEffects = [];
    this.players = new Map();

    this.visualEffectsRenderer = new VisualEffectsRenderer();
  }

  enter() {
    this.isActive = true;
  }

  exit() {
    this.isActive = false;
  }

  /**
   * Base update method - calls all common update logic
   * Override updateEntities() in child scenes for custom logic
   */
  update(deltaTime) {
    // Update players
    this.updatePlayers(deltaTime);
    
    // Update projectiles
    this.updateProjectiles(deltaTime);
    
    // Update melee attacks
    this.updateMeleeAttacks(deltaTime);
    
    // Update AOE effects
    this.updateAoeEffects(deltaTime);
    
    // Hook for child scene custom logic
    this.updateEntities(deltaTime);
  }

  /**
   * Base render method - calls all common rendering logic
   * Override renderEntities() in child scenes for custom rendering
   */
  render(ctx) {
    // Background
    this.renderBackground(ctx);
    this.renderGrid(ctx);
    
    // Hook for child scene custom background elements
    this.renderBeforeEntities(ctx);
    
    // Projectiles (render before players for proper layering)
    this.renderProjectiles(ctx);
    
    // Melee effects
    this.renderMeleeEffects(ctx);
    
    // AOE effects
    this.renderAoeEffects(ctx);
    
    // Players
    this.renderPlayers(ctx);
    
    // Hook for child scene custom entities
    this.renderEntities(ctx);
    
    // Hook for child scene UI elements
    this.renderUI(ctx);
  }

  /**
   * Update all players - can be overridden for custom player update logic
   */
  updatePlayers(deltaTime) {
    if (!this.players) return;
    this.players.forEach(player => player.update(deltaTime));
  }

  /**
   * Update all projectiles - can be overridden for custom collision logic
   */
  updateProjectiles(deltaTime) {
    this.projectiles = this.projectiles.filter(projectile => {
      projectile.update(deltaTime);
      return projectile.isAlive;
    });
  }

  /**
   * Update all melee attacks
   */
  updateMeleeAttacks(deltaTime) {
    this.meleeAttacks = this.meleeAttacks.filter(meleeAttack => {
      meleeAttack.update(deltaTime);
      return meleeAttack.isAlive;
    });
  }

  /**
   * Update all AOE effects
   */
  updateAoeEffects(deltaTime) {
    this.aoeEffects = this.aoeEffects.filter(effect => {
      effect.update(deltaTime);
      return effect.isAlive;
    });
  }

  /**
   * Hook for child scenes to add custom entity updates (enemies, boss, etc.)
   * Override this in child scenes
   */
  updateEntities(deltaTime) {}

  /**
   * Hook for child scenes to render custom elements before entities
   * Override this in child scenes
   */
  renderBeforeEntities(ctx) {}

  /**
   * Hook for child scenes to render custom entities (enemies, boss, etc.)
   * Override this in child scenes
   */
  renderEntities(ctx) {}

  /**
   * Hook for child scenes to render UI elements
   * Override this in child scenes
   */
  renderUI(ctx) {}

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

    /**
   * Renders all AOE effects
   * @param {CanvasRenderingContext2D} ctx - The canvas rendering context
   */
  renderAoeEffects(ctx) {
    if (!this.aoeEffects) return;
    
    this.aoeEffects.forEach(effect => effect.render(ctx));
  }

  handleSocketEvent(eventName, data) {}
}
