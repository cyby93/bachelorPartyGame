/**
 * Base class for all abilities in the game.
 * Provides common properties and methods shared across all ability types.
 */
export default class Ability {
  /**
   * Creates a new Ability instance.
   * @param {Object} config - Configuration object
   * @param {number} config.x - X coordinate position
   * @param {number} config.y - Y coordinate position
   * @param {Object} config.owner - Entity that created this ability
   * @param {number} [config.lifetime=5000] - Duration in milliseconds before auto-destruction
   * @param {number} [config.radius=10] - Size for collision detection and rendering
   * @param {string} [config.color='#ffffff'] - Visual color in hex format
   */
  constructor(config) {
    this.x = config.x;
    this.y = config.y;
    this.owner = config.owner;
    this.lifetime = config.lifetime !== undefined ? config.lifetime : 5000;
    this.radius = config.radius !== undefined ? config.radius : 10;
    this.color = config.color !== undefined ? config.color : '#ffffff';
    this.createdAt = Date.now();
    this.isAlive = true;
  }

  /**
   * Updates the ability state each frame.
   * Handles lifetime checking automatically, then calls _update for subclass logic.
   * @param {number} deltaTime - Time elapsed since last frame in milliseconds
   */
  update(deltaTime) {
    if (!this.isAlive) return;
    
    // Check lifetime expiration
    if (Date.now() - this.createdAt > this.lifetime) {
      this.isAlive = false;
      return;
    }
    
    // Call subclass-specific update logic
    this._update(deltaTime);
  }

  /**
   * Subclass-specific update logic.
   * Override this method in subclasses instead of update().
   * @param {number} deltaTime - Time elapsed since last frame in milliseconds
   * @protected
   */
  _update(deltaTime) {
    // Default implementation does nothing
    // Subclasses can override this for their specific behavior
  }

  /**
   * Renders the ability on the canvas.
   * Abstract method to be overridden by subclasses.
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D rendering context
   */
  render(ctx) {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Checks if this ability collides with a target entity.
   * Abstract method to be overridden by subclasses.
   * @param {Object} target - Entity to check collision against
   * @returns {boolean} True if collision detected
   */
  checkCollision(target) {
    throw new Error('checkCollision() must be implemented by subclass');
  }

  /**
   * Marks the ability as no longer alive.
   * Concrete method that sets isAlive to false.
   */
  destroy() {
    this.isAlive = false;
  }
}
