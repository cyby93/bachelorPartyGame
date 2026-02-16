import { CONFIG } from '../Constants.js';

export class Boss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = CONFIG.BOSS_SPEED;
        this.vy = CONFIG.BOSS_SPEED;
        
        this.hp = CONFIG.BOSS_HP;
        this.maxHp = CONFIG.BOSS_HP;
        this.radius = CONFIG.BOSS_RADIUS;
        
        this.lastShotTime = 0;
        this.lastMoveChange = 0;
        this.hitFlash = 0;
    }

    update(canvasWidth, canvasHeight, players, now) {
        if (this.hp <= 0) return null; // Halott boss nem csinál semmit

        // --- 1. MOZGÁS ---
        // Időnként irányt vált (pl. 2 másodpercenként)
        if (now - this.lastMoveChange > 2000) {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * CONFIG.BOSS_SPEED;
            this.vy = Math.sin(angle) * CONFIG.BOSS_SPEED;
            this.lastMoveChange = now;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Képernyőn belül tartás (visszapattan a falról)
        if (this.x < this.radius || this.x > canvasWidth - this.radius) this.vx *= -1;
        if (this.y < this.radius || this.y > canvasHeight - this.radius) this.vy *= -1;

        // --- 2. TÁMADÁS ---
        if (now - this.lastShotTime > CONFIG.BOSS_FIRE_RATE) {
            const target = this.findNearestPlayer(players);
            
            if (target) {
                this.lastShotTime = now;
                // Visszaadjuk a célt a Game motornak, hogy lőjön oda
                return { 
                    x: target.x, 
                    y: target.y 
                }; 
            }
        }
        
        if (this.hitFlash > 0) this.hitFlash--;
        return null;
    }

    findNearestPlayer(players) {
        let nearest = null;
        let minDist = Infinity;

        for (const id in players) {
            const p = players[id];
            if (p.hp <= 0) continue; // Halottra nem lövünk

            const dx = this.x - p.x;
            const dy = this.y - p.y;
            const dist = dx*dx + dy*dy; // Gyökvonás nélkül is jó összehasonlításra

            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        }
        return nearest;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 5;
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Test
        ctx.fillStyle = (this.hitFlash > 0) ? 'white' : CONFIG.BOSS_COLOR;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Körvonal
        ctx.strokeStyle = '#5b2c6f'; // Sötétebb lila
        ctx.lineWidth = 4;
        ctx.stroke();

        // Szem (hogy látszódjon merre néz/mozog épp)
        // Egyszerűsítve: csak egy "gonosz" jel a közepén
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(-15, -10, 5, 0, Math.PI*2); // Bal szem
        ctx.arc(15, -10, 5, 0, Math.PI*2);  // Jobb szem
        ctx.fill();

        // HP Csík (Boss felett nagyban)
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(-40, -this.radius - 20, 80, 10);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(-40, -this.radius - 20, 80 * hpPercent, 10);
        
        // Keret a HP csíknak
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.strokeRect(-40, -this.radius - 20, 80, 10);

        ctx.restore();
    }
}