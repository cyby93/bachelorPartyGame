import { Scene } from './Scene.js';

export class GameOverScene extends Scene {
    constructor(game) {
        super(game);
        this.victory = false;
        this.timestamp = 0;
    }

    enter(params) {
        console.log("Game Over:", params);
        this.victory = params ? params.victory : false;
        this.timestamp = Date.now();
        
        // Itt nem kell takarítani semmit, csak időzítünk
    }

    update() {
        // 5 másodperc után vissza a Lobbyba
        if (Date.now() - this.timestamp > 5000) {
            this.game.changeScene('LOBBY');
        }
    }

    draw(ctx) {
        const { width, height } = this.game.canvas;
        
        // Sötétítés
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);

        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        
        if (this.victory) {
            ctx.fillStyle = '#f1c40f';
            ctx.fillText("🏆 GYŐZELEM! 🏆", width/2, height/2 - 20);
            ctx.font = '30px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText("A Boss elpusztult!", width/2, height/2 + 40);
        } else {
            ctx.fillStyle = '#e74c3c';
            ctx.fillText("💀 GAME OVER 💀", width/2, height/2 - 20);
            ctx.font = '30px Arial';
            ctx.fillStyle = 'white';
            ctx.fillText("Mindenki elesett...", width/2, height/2 + 40);
        }

        const remaining = Math.ceil((5000 - (Date.now() - this.timestamp)) / 1000);
        ctx.font = '20px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`Lobby betöltése: ${remaining}...`, width/2, height - 50);
    }
}