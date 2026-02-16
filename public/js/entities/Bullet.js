import { CONFIG } from '../Constants.js';

export class Bullet {
    constructor(x, y, aimX, aimY, ownerId) {
        this.x = x;
        this.y = y;
        this.ownerId = ownerId;
        this.radius = CONFIG.BULLET_RADIUS;
        this.markedForDeletion = false;

        // Vektor normalizálása (hogy mindig fix sebességgel menjen)
        const len = Math.sqrt(aimX * aimX + aimY * aimY);
        this.vx = (aimX / len) * CONFIG.BULLET_SPEED;
        this.vy = (aimY / len) * CONFIG.BULLET_SPEED;
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;

        // Törlés, ha kimegy a pályáról
        if (this.x < 0 || this.x > canvasWidth || 
            this.y < 0 || this.y > canvasHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.fillStyle = '#ffeb3b';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}