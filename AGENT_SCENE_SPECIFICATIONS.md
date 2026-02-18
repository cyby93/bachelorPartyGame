RAID NIGHT - SCENE SPECIFICATIONS

1. OVERVIEW

This document details the logic, layout, and behavior for the 4 game scenes. The Game.js class acts as the Scene Manager, switching between these states.

Common Interface for all Scenes:
Each scene class must implement:

constructor(game): Reference to the main Game instance.

enter(params): Called when switching TO this scene. Initialize entities/timers here. params can contain data from previous scene (e.g., stats).

exit(): Called when switching AWAY. Cleanup listeners/entities.

update(dt, now): Main logic loop.

draw(ctx, width, height): Rendering loop.

2. SCENE 1: LOBBY SCENE (LobbyScene.js)

Objective

Waiting room for players to join, select classes, and test controls.

Layout (Host Display)

Split Screen Mode:

Sidebar (Left 20%): An HTML <div> overlay (z-index: 10).

Content: Game Title, Server IP Address, QR Code (generated via JS), "Waiting for Players..." list (optional), and a "START GAME" Button.

Canvas (Right 80%): The rendering area for the game.

Implementation Note: On enter(), add a CSS class to the container to set grid columns (e.g., 20fr 80fr). On exit(), remove it to go Fullscreen.

Logic

Player Spawning: Listen to host_player_joined. Spawn new Player instances immediately at random positions within the Canvas area.

Combat:

Friendly Fire: OFF.

Skills: Enabled (for testing). Use SkillManager to process inputs.

Damage: Players do NOT take damage in the lobby.

Start Mechanism:

The "START GAME" button should have an onclick listener.

Validation: Require at least 1 player to start.

Action: Call this.game.changeScene('TRASH_MOB').

3. SCENE 2: TRASH MOB SCENE (TrashMobScene.js)

Objective

"Horde Mode". Players must defeat 50 weak enemies (Murlocs) to progress.

Layout

Fullscreen Canvas. (Hide the Lobby Sidebar).

UI Overlay (Canvas Draw):

Top-Center: "WAVE PROGRESS: X / 50".

Entities

Enemies (Enemy.js):

Spawn Logic: Every 2 seconds, spawn 1-3 enemies at a random edge of the screen (outside view).

Stats: Low HP (1-2 hits), Medium Speed.

AI: Simple "Follow". Find nearest Player and move towards them.

Attack: If distance(enemy, player) < attackRange, deal damage to player.

Logic

Kill Counter: Initialize this.killCount = 0.

Combat:

Update all players and enemies.

Use SkillManager to handle player projectiles/skills.

Check collisions: Projectile vs Enemy.

On Enemy Death: Increment this.killCount. Remove Enemy.

Win Condition:

If this.killCount >= 50: Trigger this.game.changeScene('BOSS_FIGHT').

Fail Condition:

If all players are dead (Tombstones), trigger this.game.changeScene('RESULT', { victory: false, ...stats }).

4. SCENE 3: BOSS FIGHT SCENE (BossFightScene.js)

Objective

Defeat the Boss (Illidan).

Layout

Fullscreen Canvas.

Visuals: Darker background or different floor tile pattern to signify "Boss Room".

UI Overlay:

Top: Large Boss HP Bar.

Entities

Boss (Boss.js):

Spawn at center.

Stats: Very High HP, Slow Speed.

Phases (Simple AI):

Move: Pick a random point, move there.

Attack: Stop and shoot a projectile at the nearest player.

Special: (Optional) Every 20 seconds, spawn a "Fire" zone (AoE).

Logic

Initialization: Restore all players to Max HP (or keep HP from previous scene - designer choice, suggest Max HP for fairness).

Combat:

Update Boss AI.

Players deal damage to Boss.

Boss deals damage to Players.

Win Condition:

If Boss.hp <= 0: Trigger this.game.changeScene('RESULT', { victory: true, ...stats }).

Fail Condition:

If all players are dead: Trigger this.game.changeScene('RESULT', { victory: false, ...stats }).

5. SCENE 4: RESULT SCENE (ResultScene.js)

Objective

Display game outcome and statistics.

Layout

Fullscreen Canvas (dimmed / dark overlay).

HTML Overlay: Or pure Canvas text drawing.

Content

Title: "VICTORY" (Gold) or "DEFEAT" (Red).

Statistics (passed via params in enter()):

Total Time Played.

Total Enemies Killed (Global).

MVP (Player with most damage dealt).

"Kenny" Award (Player with most deaths).

Action: "RESTART GAME" button.

Logic

Restart:

On click: Reset Game State (clear players? or keep connection but reset stats?).

Usually: Keep connections, reset HP/Position.

Call this.game.changeScene('LOBBY').

6. DATA FLOW & TRANSITIONS

The Game.js manages the currentScene.

// Example Transition Logic in Game.js
changeScene(sceneKey, params) {
    if (this.currentScene) {
        this.currentScene.exit();
    }
    
    // Initialize new scene
    switch(sceneKey) {
        case 'LOBBY': this.currentScene = new LobbyScene(this); break;
        case 'TRASH_MOB': this.currentScene = new TrashMobScene(this); break;
        case 'BOSS_FIGHT': this.currentScene = new BossFightScene(this); break;
        case 'RESULT': this.currentScene = new ResultScene(this); break;
    }
    
    this.currentScene.enter(params);
}
