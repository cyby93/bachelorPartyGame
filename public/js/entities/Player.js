import { CONFIG } from '../Constants.js';

export class Player {
    constructor(id, name, color, x, y) {
        this.id = id;
        this.name = name;
        this.color = color;
        this.x = x;
        this.y = y;
        
        this.vx = 0;
        this.vy = 0;
        this.hp = CONFIG.PLAYER_HP;
        this.maxHp = CONFIG.PLAYER_HP;
        this.hitFlash = 0;
        
        // Célzás
        this.aimX = 0;
        this.aimY = 0;
        this.isAiming = false;
        
        // FEGYVER RENDSZER
        this.currentWeapon = CONFIG.WEAPONS.GUN; // Alapértelmezett: Fegyver
        this.lastActionTime = 0; // Cooldown kezeléshez

        // Gránát specifikus
        this.chargeStartTime = 0;
        this.isCharging = false;
        
        // Pajzs specifikus
        this.isShielding = false;
    }

    handleInput(data) {
        if (data.type === 'move') {
            this.vx = data.x * CONFIG.PLAYER_SPEED;
            this.vy = data.y * -1 * CONFIG.PLAYER_SPEED;
        } 
        else if (data.type === 'aim') {
            // Ha van input (joystick elhúzva)
            if (Math.abs(data.x) > 0.1 || Math.abs(data.y) > 0.1) {
                this.aimX = data.x;
                this.aimY = data.y * -1;
                
                // Ha most kezdtünk célozni, és gránát van nálunk -> Töltés indítása
                if (!this.isAiming && this.currentWeapon === CONFIG.WEAPONS.GRENADE) {
                    this.isCharging = true;
                    this.chargeStartTime = Date.now();
                }
                
                this.isAiming = true;
                
                // Pajzs aktiválása célzáskor
                if (this.currentWeapon === CONFIG.WEAPONS.SHIELD) {
                    this.isShielding = true;
                }
            } else {
                // Joystick elengedve -> Lövés / Dobás
                if (this.isAiming) {
                    this.isAiming = false;
                    this.isShielding = false;
                    
                    // Gránát eldobása elengedéskor
                    if (this.currentWeapon === CONFIG.WEAPONS.GRENADE && this.isCharging) {
                        this.shouldThrowGrenade = true; // Jelezzük a Game-nek
                        this.isCharging = false;
                    }
                }
            }
        }
        else if (data.type === 'action') {
            // Fegyverváltás gombokkal (1, 2, 3, 4)
            if (data.btn >= 1 && data.btn <= 4) {
                this.currentWeapon = data.btn;
                this.isCharging = false;
                this.isShielding = false;
                // Kis vizuális visszajelzés (flash)
                this.hitFlash = 5;
            }
        }
    }

    update(canvasWidth, canvasHeight) {
        if (this.hp <= 0) return;

        this.x += this.vx;
        this.y += this.vy;

        const r = CONFIG.PLAYER_RADIUS;
        if (this.x < r) this.x = r;
        if (this.x > canvasWidth - r) this.x = canvasWidth - r;
        if (this.y < r) this.y = r;
        if (this.y > canvasHeight - r) this.y = canvasHeight - r;

        if (this.hitFlash > 0) this.hitFlash--;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitFlash = 5;
    }
    
    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
        this.hitFlash = 10; // Gyógyulás vizuális jele
    }

    // Visszatér azzal az objektummal, amit "lőni" kell (vagy null)
    getAction(now) {
        if (this.hp <= 0) return null;

        // 1. FEGYVER (GUN) - Folyamatos tűz
        if (this.currentWeapon === CONFIG.WEAPONS.GUN) {
            if (this.isAiming && now - this.lastActionTime > CONFIG.FIRE_RATE) {
                this.lastActionTime = now;
                return { type: 'SHOOT_GUN' };
            }
        }
        
        // 2. KARD (SWORD) - Folyamatos suhintás
        if (this.currentWeapon === CONFIG.WEAPONS.SWORD) {
            if (this.isAiming && now - this.lastActionTime > CONFIG.SWORD_COOLDOWN) {
                this.lastActionTime = now;
                return { type: 'SWING_SWORD' };
            }
        }

        // 3. GRÁNÁT (GRENADE) - Elengedéskor
        if (this.shouldThrowGrenade) {
            this.shouldThrowGrenade = false;
            // Töltési idő kiszámítása
            const chargeDuration = Math.min(now - this.chargeStartTime, CONFIG.GRENADE_MAX_CHARGE);
            const power = chargeDuration / CONFIG.GRENADE_MAX_CHARGE; // 0.0 - 1.0
            const distance = 50 + (power * CONFIG.GRENADE_MAX_DIST); // Min 50px, Max 400px
            
            return { type: 'THROW_GRENADE', distance: distance };
        }

        return null;
    }

    draw(ctx) {
        if (this.hp <= 0) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Szín beállítása (ha sérült/gyógyult: fehér, amúgy weapon szín vagy alap)
        if (this.hitFlash > 0) {
            ctx.fillStyle = 'white';
        } else {
            // Fegyver szerinti színkód (opcionális, de segít látni mi van nála)
            switch(this.currentWeapon) {
                case CONFIG.WEAPONS.GUN: ctx.fillStyle = this.color; break;
                case CONFIG.WEAPONS.SWORD: ctx.fillStyle = '#c0392b'; break; // Pirosas
                case CONFIG.WEAPONS.SHIELD: ctx.fillStyle = '#2980b9'; break; // Kékes
                case CONFIG.WEAPONS.GRENADE: ctx.fillStyle = '#2ecc71'; break; // Zöldes
                default: ctx.fillStyle = this.color;
            }
        }

        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.PLAYER_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Irány és Fegyver kirajzolása
        const angle = Math.atan2(this.aimY, this.aimX);
        ctx.rotate(angle);

        // --- PAJZS MEGJELENÍTÉS ---
        if (this.isShielding) {
            ctx.beginPath();
            ctx.arc(0, 0, 35, -CONFIG.SHIELD_ANGLE/2, CONFIG.SHIELD_ANGLE/2);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        // --- KARD SUHINTÁS (Vizuális) ---
        // (Ezt a Scene kezeli majd jobban, de itt jelezhetjük a fegyvert)
        if (this.currentWeapon === CONFIG.WEAPONS.SWORD) {
             ctx.fillStyle = '#fff';
             ctx.fillRect(15, -2, 30, 4); // Penge
        } else if (this.currentWeapon === CONFIG.WEAPONS.GUN) {
             ctx.fillStyle = 'rgba(255,255,255,0.5)';
             ctx.fillRect(0, -5, 35, 10); // Cső
        }

        // --- GRÁNÁT TÖLTÉS SÁV ---
        if (this.isCharging) {
            const charge = Math.min(Date.now() - this.chargeStartTime, CONFIG.GRENADE_MAX_CHARGE);
            const ratio = charge / CONFIG.GRENADE_MAX_CHARGE;
            
            // Töltés csík a karakter alatt
            ctx.rotate(-angle); // Visszaforgatjuk
            ctx.fillStyle = '#444';
            ctx.fillRect(-20, 25, 40, 5);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(-20, 25, 40 * ratio, 5);
            ctx.rotate(angle); // Vissza az irányba
        }

        // --- HP BAR (Visszaforgatva) ---
        ctx.rotate(-angle);
        ctx.fillStyle = 'red';
        ctx.fillRect(-20, -35, 40, 6);
        ctx.fillStyle = '#0f0';
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillRect(-20, -35, 40 * hpPercent, 6);

        // Név
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 0, -42);

        ctx.restore();
    }
}