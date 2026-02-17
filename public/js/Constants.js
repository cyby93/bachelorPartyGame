export const CONFIG = {
    // Játékos
    PLAYER_RADIUS: 20,
    PLAYER_SPEED: 4,
    PLAYER_HP: 100,
    
    // Alap Lövedék (Fegyver)
    BULLET_RADIUS: 5,
    BULLET_SPEED: 8,
    FIRE_RATE: 200, 
    
    // --- ÚJ FEGYVEREK ---
    WEAPONS: {
        GUN: 1,
        SWORD: 2,
        SHIELD: 3,
        GRENADE: 4
    },

    // Kard
    SWORD_RANGE: 60,       // Milyen messzire ér el
    SWORD_ANGLE: 1.5,      // Milyen széles a vágás (radián)
    SWORD_DAMAGE: 30,      // Nagyobb sebzés, mint a golyó
    SWORD_COOLDOWN: 500,

    // Pajzs
    SHIELD_ANGLE: 2.0,     // Védekezési szög (kb 120 fok)
    
    // Gránát
    GRENADE_MAX_CHARGE: 2000, // 2 másodperc alatt éri el a max távot
    GRENADE_MAX_DIST: 400,    // Max dobási táv
    GRENADE_RADIUS: 100,      // Robbanás/Gyógyítás hatósugara
    GRENADE_HEAL: 30,         // Gyógyítás mértéke
    GRENADE_SPEED: 6,         // Repülési sebesség

    // BOSS
    BOSS_RADIUS: 50,
    BOSS_HP: 1000,
    BOSS_SPEED: 1.5,
    BOSS_FIRE_RATE: 1500,
    BOSS_COLOR: '#8e44ad',
    BOSS_DAMAGE: 20,

    CANVAS_BG: '#111'
};