export class Scene {
    constructor(game) {
        this.game = game; // Hozzáférés a fő motorhoz (canvas, játékosok, socket)
    }

    /** Akkor fut le, amikor belépünk ebbe a jelenetbe */
    enter() {}

    /** Akkor fut le, amikor kilépünk a jelenetből (takarítás) */
    exit() {}

    /** Játéklogika frissítése (mozgás, ütközés) */
    update() {}

    /** Kirajzolás a vászonra */
    draw(ctx) {}

    /** Input kezelés (ha a scene-nek speciális input kell) */
    handleInput(player, data) {
        // Alapértelmezetten a játékos kezeli a saját mozgását, 
        // de itt felülírhatjuk (pl. menüben navigálás)
        player.handleInput(data);
    }
}