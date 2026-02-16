import { CONFIG } from '../Constants.js';

export class Player {
    constructor(id, name, color, x, y) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.x = x;
        this.y = y;
        
        // Fizika és Állapot
        this.vx = 0;
        this.vy = 0;
        this.hp = CONFIG.PLAYER_HP;
        this.hitFlash = 0; // Vizuális effekt számláló
        
        // Célzás
        this.aimX = 0;
        this.aimY = 0;
        this.isAiming = false;
        this.lastShotTime = 0;
    }

    handleInput(data) {
        if (data.type === 'move') {
            this.vx = data.x * CONFIG.PLAYER_SPEED;
            this.vy = data.y * -1 * CONFIG.PLAYER_SPEED;
        } 
        else if (data.type === 'aim') {
            if (Math.abs(data.x) > 0.1 || Math.abs(data.y) > 0.1) {
                this.aimX = data.x;
                this.aimY = data.y * -1;
                this.isAiming = true;
            } else {
                this.isAiming = false;
            }
        }
        else if (data.type === 'action') {
            // Itt lehetne kezelni a gombnyomásokat (pl. Dash, Gránát)
            console.log(`Player ${this.name} pressed button ${data.btn}`);
        }
    }

    update(canvasWidth, canvasHeight) {
        if (this.hp <= 0) return;

        // Pozíció frissítés
        this.x += this.vx;
        this.y += this.vy;

        // Falak kezelése
        const r = CONFIG.PLAYER_RADIUS;
        if (this.x < r) this.x = r;
        if (this.x > canvasWidth - r) this.x = canvasWidth - r;
        if (this.y < r) this.y = r;
        if (this.y > canvasHeight - r) this.y = canvasHeight - r;

        // Hit flash csökkentése
        if (this.hitFlash > 0) this.hitFlash--;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 5; // 5 frame-ig fehéren villog
    }

    canShoot(now) {
        if (this.hp > 0 && this.isAiming && (now - this.lastShotTime > CONFIG.FIRE_RATE)) {
            this.lastShotTime = now;
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.hp <= 0) return; // Vagy rajzolj ide sírkövet

        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. Test kirajzolása
        if (this.hitFlash > 0) {
            ctx.fillStyle = 'white';
        } else {
            ctx.fillStyle = this.color;
        }

        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. Fegyver / Irányjelző
        const angle = Math.atan2(this.aimY, this.aimX);
        ctx.rotate(angle);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(0, -5, 35, 10);
        
        // Visszaforgatás a UI elemekhez (név, HP csík)
        ctx.rotate(-angle);

        // 3. HP Csík
        ctx.fillStyle = 'red';
        ctx.fillRect(-20, -35, 40, 6);
        ctx.fillStyle = '#0f0';
        const hpPercent = Math.max(0, this.hp / CONFIG.PLAYER_HP);
        ctx.fillRect(-20, -35, 40 * hpPercent, 6);

        // 4. Név
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -42);

        ctx.restore();
    }
}