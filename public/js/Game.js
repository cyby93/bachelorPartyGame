import { Player } from './entities/Player.js';
import { LobbyScene } from './scenes/LobbyScene.js';
import { BossFightScene } from './scenes/BossFightScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

export class Game {
    constructor(canvas, socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.socket = socket;
        
        this.players = {}; // Globális játékos lista (minden scene látja)

        // Scene regisztráció
        this.scenes = {
            'LOBBY': new LobbyScene(this),
            'BOSS_FIGHT': new BossFightScene(this),
            'GAME_OVER': new GameOverScene(this)
        };
        
        this.currentScene = null;

        // Setup
        this.setupNetwork();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Kezdés a Lobby-ban
        this.changeScene('LOBBY');
        
        // Loop indítása
        this.loop();
    }

    changeScene(sceneName, params = null) {
        if (this.currentScene) {
            this.currentScene.exit();
        }

        this.currentScene = this.scenes[sceneName];
        
        if (this.currentScene) {
            this.currentScene.enter(params);
            this.resize(); // Biztosítjuk, hogy a méretek jók (pl. fejléc eltűnés miatt)
        } else {
            console.error(`Scene not found: ${sceneName}`);
        }
    }

    resize() {
        this.canvas.width = window.innerWidth;
        // Ha van fejléc (csak lobbyban), vonjuk le
        const header = document.getElementById('header');
        const headerH = (header && header.style.display !== 'none') ? header.offsetHeight : 0;
        this.canvas.height = window.innerHeight - headerH;
    }

    setupNetwork() {
        this.socket.on('host_player_joined', (data) => {
            if (!this.players[data.id]) {
                // Játékos létrehozása (pozíciót majd a scene beállítja pontosan)
                this.players[data.id] = new Player(data.id, data.name, data.color, 100, 100);
            }
        });

        this.socket.on('host_player_left', (data) => {
            delete this.players[data.id];
        });

        this.socket.on('host_player_input', (data) => {
            const player = this.players[data.id];
            if (player && this.currentScene) {
                // 1. Frissítjük a játékos belső állapotát (aim, velocity)
                // Ezt a Player osztály intézi
                this.currentScene.handleInput(player, data);
            }
        });
    }

    update() {
        if (this.currentScene) {
            this.currentScene.update();
        }
    }

    draw() {
        if (this.currentScene) {
            this.currentScene.draw(this.ctx);
        }
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}