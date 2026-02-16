import { Scene } from './Scene.js';
import { Boss } from '../entities/Boss.js';
import { Bullet } from '../entities/Bullet.js';
import { CONFIG } from '../Constants.js';

export class BossFightScene extends Scene {
    constructor(game) {
        super(game);
        this.boss = null;
        this.bullets = [];
    }

    enter() {
        console.log("Entering Boss Fight...");
        const { width, height } = this.game.canvas;
        
        // Boss létrehozása
        this.boss = new Boss(width / 2, height / 2);
        this.bullets = [];

        // Játékosok pozicionálása és gyógyítása
        for (const id in this.game.players) {
            const p = this.game.players[id];
            p.hp = CONFIG.PLAYER_HP;
            
            // Opcionális: Szétszórhatjuk őket, hogy ne egy kupacban kezdjenek
            const safePos = this.getSafeSpawnPosition();
            p.x = safePos.x;
            p.y = safePos.y;
        }
    }

    exit() {
        this.boss = null;
        this.bullets = [];
    }

    update() {
        const now = Date.now();
        const { width, height } = this.game.canvas;

        // 1. BOSS Logic
        const shootTarget = this.boss.update(width, height, this.game.players, now);
        if (shootTarget) {
            this.spawnBullet(this.boss, shootTarget.x, shootTarget.y, 'BOSS');
        }

        // Győzelem?
        if (this.boss.hp <= 0) {
            this.game.changeScene('GAME_OVER', { victory: true });
            return;
        }

        // Vereség? (Mindenki halott)
        const aliveCount = Object.values(this.game.players).filter(p => p.hp > 0).length;
        if (aliveCount === 0 && Object.keys(this.game.players).length > 0) {
            this.game.changeScene('GAME_OVER', { victory: false });
            return;
        }

        // 2. Játékosok
        for (const id in this.game.players) {
            const p = this.game.players[id];
            p.update(width, height);
            if (p.canShoot(now)) {
                this.spawnBullet(p, p.x + p.aimX, p.y + p.aimY, p.id);
            }
        }

        // 3. Lövedékek és Ütközések
        this.bullets.forEach(b => b.update(width, height));
        this.bullets = this.bullets.filter(b => !b.markedForDeletion);
        this.checkCollisions();
    }

    spawnBullet(shooter, targetX, targetY, ownerId) {
        const dx = targetX - shooter.x;
        const dy = targetY - shooter.y;
        this.bullets.push(new Bullet(shooter.x, shooter.y, dx, dy, ownerId));
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            let hit = false;

            if (b.ownerId === 'BOSS') { // Boss lőtte -> Játékost sebez
                for (const pid in this.game.players) {
                    const p = this.game.players[pid];
                    if (p.hp <= 0) continue;
                    if (this.dist(b, p) < CONFIG.PLAYER_RADIUS + CONFIG.BULLET_RADIUS) {
                        p.takeDamage(CONFIG.BOSS_DAMAGE);
                        hit = true; break;
                    }
                }
            } else { // Játékos lőtte -> Bosst sebez
                 if (this.boss.hp > 0 && this.dist(b, this.boss) < CONFIG.BOSS_RADIUS + CONFIG.BULLET_RADIUS) {
                    this.boss.takeDamage(10);
                    hit = true;
                }
            }

            if (hit) this.bullets.splice(i, 1);
        }
    }

    dist(obj1, obj2) {
        return Math.sqrt((obj1.x - obj2.x)**2 + (obj1.y - obj2.y)**2);
    }

    getSafeSpawnPosition() {
        // Egyszerűsített logika a példa kedvéért
        return { 
            x: Math.random() * (this.game.canvas.width - 100) + 50,
            y: Math.random() * (this.game.canvas.height - 100) + 50 
        };
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        this.boss.draw(ctx);
        for (const id in this.game.players) this.game.players[id].draw(ctx);
        this.bullets.forEach(b => b.draw(ctx));
    }
}