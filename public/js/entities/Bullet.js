import { CONFIG } from '../Constants.js';

export class Bullet {
    /**
     * @param {string} type - 'NORMAL' (lövedék) vagy 'GRENADE' (gránát)
     * @param {number} targetX, targetY - Csak gránátnál használjuk a célpont meghatározására
     */
    constructor(x, y, dx, dy, ownerId, type = 'NORMAL', targetX = 0, targetY = 0) {
        this.x = x;
        this.y = y;
        this.ownerId = ownerId;
        this.type = type;
        this.markedForDeletion = false;

        // Normál lövedék paraméterei
        this.radius = CONFIG.BULLET_RADIUS;
        let speed = CONFIG.BULLET_SPEED;

        if (this.type === 'GRENADE') {
            this.radius = 8;
            speed = CONFIG.GRENADE_SPEED;
            this.targetX = targetX;
            this.targetY = targetY;
            // Kiszámoljuk a távolságot a célig, hogy tudjuk mikor ér oda
            this.startX = x;
            this.startY = y;
            this.totalDist = Math.hypot(targetX - x, targetY - y);
        }

        // Vektor normalizálása
        const len = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / len) * speed;
        this.vy = (dy / len) * speed;
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;

        // Gránát logika: Ha elérte a célt (vagy túlmegy rajta)
        if (this.type === 'GRENADE') {
            const currentDist = Math.hypot(this.x - this.startX, this.y - this.startY);
            if (currentDist >= this.totalDist) {
                this.markedForDeletion = true; 
                this.exploded = true; // Jelezzük a Scene-nek, hogy robbanni kell
            }
        }

        // Törlés, ha kimegy a pályáról
        if (this.x < 0 || this.x > canvasWidth || 
            this.y < 0 || this.y > canvasHeight) {
            this.markedForDeletion = true;
        }
    }

    draw(ctx) {
        ctx.beginPath();
        if (this.type === 'GRENADE') {
            ctx.fillStyle = '#2ecc71'; // Zöld gránát
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        } else {
            ctx.fillStyle = '#ffeb3b'; // Sárga golyó
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }
}