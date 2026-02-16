import { Scene } from './Scene.js';
import { Bullet } from '../entities/Bullet.js';
import { CONFIG } from '../Constants.js';

export class LobbyScene extends Scene {
    constructor(game) {
        super(game);
        this.bullets = []; // Itt is lehet lőni, de nem sebez
        this.startButton = null;
    }

    enter() {
        console.log("Entering Lobby...");
        
        // UI elemek megjelenítése
        const header = document.getElementById('header');
        if (header) header.style.display = 'flex';

        this.createStartButton();
        
        // Mindenkit feltámasztunk
        for (const id in this.game.players) {
            this.game.players[id].hp = CONFIG.PLAYER_HP;
        }
    }

    exit() {
        // UI eltüntetése
        const header = document.getElementById('header');
        if (header) header.style.display = 'none';

        if (this.startButton) {
            this.startButton.remove();
        }
        this.bullets = [];
    }

    createStartButton() {
        this.startButton = document.createElement('button');
        this.startButton.innerText = "JÁTÉK INDÍTÁSA";
        Object.assign(this.startButton.style, {
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 50px', fontSize: '30px', fontWeight: 'bold',
            cursor: 'pointer', backgroundColor: '#27ae60', color: 'white',
            border: 'none', borderRadius: '10px', zIndex: '1000'
        });

        this.startButton.onclick = () => {
            if (Object.keys(this.game.players).length > 0) {
                // ÁTVÁLTÁS A BOSS HARCRA
                this.game.changeScene('BOSS_FIGHT');
            } else {
                alert("Várj meg valakit!");
            }
        };
        document.body.appendChild(this.startButton);
    }

    update() {
        const now = Date.now();
        const { width, height } = this.game.canvas;

        // Játékosok frissítése
        for (const id in this.game.players) {
            const p = this.game.players[id];
            p.update(width, height);
            
            // Lövés (csak vizuális móka)
            if (p.canShoot(now)) {
                this.spawnBullet(p);
            }
        }

        // Töltények
        this.bullets.forEach(b => b.update(width, height));
        this.bullets = this.bullets.filter(b => !b.markedForDeletion);
    }

    spawnBullet(player) {
        const len = Math.sqrt(player.aimX**2 + player.aimY**2);
        if (len === 0) return;
        
        this.bullets.push(new Bullet(
            player.x + (player.aimX/len) * (CONFIG.PLAYER_RADIUS+5),
            player.y + (player.aimY/len) * (CONFIG.PLAYER_RADIUS+5),
            player.aimX, player.aimY, player.id
        ));
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.game.canvas.width, this.game.canvas.height);

        // Háttér szöveg
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("GYAKORLÓ MÓD", this.game.canvas.width/2, this.game.canvas.height/2 - 80);
        ctx.font = '20px Arial';
        ctx.fillText("Várd meg a többieket...", this.game.canvas.width/2, this.game.canvas.height/2 - 40);

        // Játékosok és golyók
        for (const id in this.game.players) this.game.players[id].draw(ctx);
        this.bullets.forEach(b => b.draw(ctx));
    }
}