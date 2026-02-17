import { Scene } from './Scene.js';
import { Boss } from '../entities/Boss.js';
import { Bullet } from '../entities/Bullet.js';
import { CONFIG } from '../Constants.js';

export class BossFightScene extends Scene {
    constructor(game) {
        super(game);
        this.boss = null;
        this.bullets = [];
        this.explosions = []; // Robbanás effektek
    }

    enter() {
        console.log("Entering Boss Fight...");
        const { width, height } = this.game.canvas;
        this.boss = new Boss(width / 2, height / 2);
        this.bullets = [];
        
        // Játékosok inicializálása
        for (const id in this.game.players) {
            const p = this.game.players[id];
            p.hp = CONFIG.PLAYER_HP;
            p.currentWeapon = CONFIG.WEAPONS.GUN; // Mindenki puskával kezd
        }
    }

    exit() {
        this.boss = null;
        this.bullets = [];
    }

    update() {
        const now = Date.now();
        const { width, height } = this.game.canvas;

        // 1. BOSS Update
        const shootTarget = this.boss.update(width, height, this.game.players, now);
        if (shootTarget) {
            // Boss lövedék (mindig NORMAL)
            const dx = shootTarget.x - this.boss.x;
            const dy = shootTarget.y - this.boss.y;
            this.bullets.push(new Bullet(this.boss.x, this.boss.y, dx, dy, 'BOSS', 'NORMAL'));
        }

        // Győzelem/Vereség ellenőrzés
        if (this.boss.hp <= 0) {
            this.game.changeScene('GAME_OVER', { victory: true });
            return;
        }
        const aliveCount = Object.values(this.game.players).filter(p => p.hp > 0).length;
        if (aliveCount === 0 && Object.keys(this.game.players).length > 0) {
            this.game.changeScene('GAME_OVER', { victory: false });
            return;
        }

        // 2. JÁTÉKOSOK Update & Akciók
        for (const id in this.game.players) {
            const p = this.game.players[id];
            p.update(width, height);
            
            const action = p.getAction(now);
            if (action) {
                // A) PUSKA LÖVÉS
                if (action.type === 'SHOOT_GUN') {
                    this.bullets.push(new Bullet(
                        p.x + p.aimX * (CONFIG.PLAYER_RADIUS+5),
                        p.y + p.aimY * (CONFIG.PLAYER_RADIUS+5),
                        p.aimX, p.aimY, p.id, 'NORMAL'
                    ));
                }
                // B) KARD VÁGÁS
                else if (action.type === 'SWING_SWORD') {
                    this.handleSwordAttack(p);
                }
                // C) GRÁNÁT DOBÁS
                else if (action.type === 'THROW_GRENADE') {
                    // Célpont kiszámítása az irány és a távolság alapján
                    // Mivel aimX/Y normalizált vektorok (kb), meg kell szorozni a távolsággal
                    const len = Math.hypot(p.aimX, p.aimY) || 1;
                    const targetX = p.x + (p.aimX / len) * action.distance;
                    const targetY = p.y + (p.aimY / len) * action.distance;
                    
                    this.bullets.push(new Bullet(
                        p.x, p.y, p.aimX, p.aimY, p.id, 
                        'GRENADE', targetX, targetY
                    ));
                }
            }
        }

        // 3. Lövedékek
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(width, height);
            
            // Gránát robbanás detektálása
            if (b.type === 'GRENADE' && b.exploded) {
                this.createExplosion(b.x, b.y);
            }
        }
        this.bullets = this.bullets.filter(b => !b.markedForDeletion);

        // 4. Robbanások effektek frissítése
        this.explosions = this.explosions.filter(e => {
            e.life--;
            return e.life > 0;
        });

        // 5. Ütközések
        this.checkCollisions();
    }

    handleSwordAttack(player) {
        // Kard effekt (vizuális)
        this.explosions.push({x: player.x + player.aimX*30, y: player.y + player.aimY*30, life: 10, radius: 30, color: 'white', type: 'SWISH'});

        // Találat ellenőrzése a Boss-on
        const dx = this.boss.x - player.x;
        const dy = this.boss.y - player.y;
        const dist = Math.hypot(dx, dy);

        // Ha elég közel van
        if (dist < CONFIG.PLAYER_RADIUS + CONFIG.BOSS_RADIUS + CONFIG.SWORD_RANGE) {
            // Szög ellenőrzése (hogy felé néz-e)
            const angleToBoss = Math.atan2(dy, dx);
            const playerAngle = Math.atan2(player.aimY, player.aimX);
            
            // Szögkülönbség normalizálása -PI és PI közé
            let angleDiff = angleToBoss - playerAngle;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            if (Math.abs(angleDiff) < CONFIG.SWORD_ANGLE / 2) {
                this.boss.takeDamage(CONFIG.SWORD_DAMAGE);
                // Vizuális visszajelzés
                this.explosions.push({x: this.boss.x, y: this.boss.y, life: 10, radius: 50, color: 'red', type: 'HIT'});
            }
        }
    }

    createExplosion(x, y) {
        // Vizuális kör
        this.explosions.push({x, y, life: 30, radius: CONFIG.GRENADE_RADIUS, color: 'rgba(46, 204, 113, 0.5)', type: 'HEAL'});
        
        // Gyógyítás logika
        for (const id in this.game.players) {
            const p = this.game.players[id];
            if (p.hp <= 0) continue;
            
            const dist = Math.hypot(p.x - x, p.y - y);
            if (dist < CONFIG.GRENADE_RADIUS) {
                p.heal(CONFIG.GRENADE_HEAL);
            }
        }
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            let hit = false;

            // A) Boss lőtte -> Játékost találhat
            if (b.ownerId === 'BOSS') {
                for (const pid in this.game.players) {
                    const p = this.game.players[pid];
                    if (p.hp <= 0) continue;

                    const dist = Math.hypot(b.x - p.x, b.y - p.y);
                    
                    // Találat gyanús
                    if (dist < CONFIG.PLAYER_RADIUS + CONFIG.BULLET_RADIUS) {
                        
                        // PAJZS ELLENŐRZÉS
                        let blocked = false;
                        if (p.isShielding) {
                            // Lövedék iránya a játékoshoz képest
                            const angleToBullet = Math.atan2(b.y - p.y, b.x - p.x);
                            const shieldAngle = Math.atan2(p.aimY, p.aimX);
                            
                            let angleDiff = angleToBullet - shieldAngle;
                            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                            
                            // A pajzs szöge (pl. 120 fok = ~2.1 rad)
                            // De vigyázat: atan2 a vektor irányát adja. 
                            // Ha a játékos jobbra néz (0 rad), és a golyó jobbról jön (0 rad), akkor blocked.
                            if (Math.abs(angleDiff) < CONFIG.SHIELD_ANGLE / 2) {
                                blocked = true;
                                // Vizuális blokk effekt
                                this.explosions.push({x: b.x, y: b.y, life: 10, radius: 10, color: 'cyan', type: 'BLOCK'});
                            }
                        }

                        if (!blocked) {
                            p.takeDamage(CONFIG.BOSS_DAMAGE);
                            hit = true;
                        } else {
                            // Ha blokkoltuk, akkor is eltűnik a golyó
                            hit = true;
                        }
                        break;
                    }
                }
            } 
            // B) Játékos lőtte (CSAK NORMÁL GOLYÓ) -> Bosst találhat
            else if (b.type === 'NORMAL') {
                const dist = Math.hypot(b.x - this.boss.x, b.y - this.boss.y);
                if (dist < CONFIG.BOSS_RADIUS + CONFIG.BULLET_RADIUS) {
                    this.boss.takeDamage(10);
                    hit = true;
                }
            }

            if (hit) this.bullets.splice(i, 1);
        }
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);
        
        // 1. Boss
        this.boss.draw(ctx);
        
        // 2. Játékosok
        for (const id in this.game.players) this.game.players[id].draw(ctx);
        
        // 3. Lövedékek
        this.bullets.forEach(b => b.draw(ctx));

        // 4. Effektek (Robbanás, Kard vágás, Blokk)
        this.explosions.forEach(e => {
            ctx.save();
            ctx.globalAlpha = e.life / 30; // Elhalványulás
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        });
    }
}