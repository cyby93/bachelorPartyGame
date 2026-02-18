PROJECT: RAID NIGHT - THE RESCUE (AI DEVELOPMENT BRIEF)

1. ROLE AND OBJECTIVE

You are a Senior Full-Stack Game Developer. Your task is to develop a Web-based, Local Multiplayer "Twin-Stick MOBA" Party Game from scratch. The game uses a Node.js backend and Vanilla JS (ES6 Modules) frontend with HTML5 Canvas rendering.

Goal: Create a stable system supporting 13 players, where smartphones serve as controllers, and the action takes place on a shared screen (TV/Monitor).

2. TECHNOLOGY STACK (MANDATORY)

Backend: Node.js, Express, Socket.io.

Frontend (Host & Controller): Vanilla JavaScript (ES6 Modules). DO NOT use frameworks (React, Vue) or heavy game engines (Phaser, Three.js). We will write a custom, lightweight Canvas renderer.

Styling: CSS3 (Flexbox/Grid), no Tailwind/Bootstrap.

Controls: nipple.js library for virtual joysticks.

Communication: Real-time WebSocket (Socket.io).

3. FILE STRUCTURE

Follow this structure exactly. Do not create unnecessary folders.

/
├── package.json          # start script: "node server.js"
├── server.js             # Game Server & Socket logic
├── public/
│   ├── assets/           # Placeholder folders
│   │   ├── sprites/      
│   │   └── sounds/       
│   ├── css/
│   │   └── style.css     # Responsive design (Host & Controller)
│   ├── js/
│   │   ├── managers/
│   │   │   ├── AudioManager.js  # Sound handling
│   │   │   ├── InputManager.js  # Controller input logic (nipple.js)
│   │   │   └── SkillManager.js  # <--- SHARED COMBAT LOGIC
│   │   ├── scenes/
│   │   │   ├── Scene.js         # Base Class
│   │   │   ├── LobbyScene.js    # Connection & Class Selection
│   │   │   ├── BossFightScene.js# Main Gameplay
│   │   │   └── GameOverScene.js # Results
│   │   ├── entities/
│   │   │   ├── Player.js        # Character logic, rendering, state
│   │   │   ├── Boss.js          # AI logic
│   │   │   ├── Projectile.js    # Logic for moving bullets/grenades
│   │   │   └── Tombstone.js     # Dead player object
│   │   ├── Constants.js         # Config, Class Definitions, Game Balance
│   │   └── Game.js              # Main Loop, Scene Manager
│   ├── host.html         # The Game Display
│   └── controller.html   # The Phone Controller Interface


4. GAME MECHANICS (DETAILED SPECIFICATION)

A. Controller (Skill Stick System)

The controller.html interface is split into two main parts:

Left Side (Movement): A full half-screen acting as a virtual joystick (Floating Joystick). Controls movement.

Right Side (Skill Grid): A 2x2 grid. Each cell (div) is a separate joystick zone.

Bottom-Left: Skill 1 (Main Attack)

Top-Left: Skill 2 (Special)

Top-Right: Skill 3 (Utility/Def)

Bottom-Right: Skill 4 (Ultimate)

Interaction Types (InputManager.js):

TAP: Short touch (< 150ms) -> Auto-aim at the nearest enemy.

DRAG & RELEASE: Drag -> Aim (Send Vector) -> Release to Fire.

CANCEL: If the player drags back to the center (deadzone), the ability is cancelled.

B. Class System (Constants.js)

Players select one of 8 classes upon joining. Each class has different hp, speed, color, and 4 unique skills.

Class List:

Warrior: Tank, melee, shield mechanics.

Paladin: Hybrid Tank/Heal, hammer, bubble.

Shaman: Hybrid DPS/Heal, lightning, bloodlust.

Hunter: Ranged DPS, pet summoning, traps.

Priest: Healer, shields, mass resurrection.

Mage: Glass Cannon DPS, fireball, teleport (blink).

Druid: Shapeshifter (Bear=Tank, Cat=DPS, Tree=Heal).

Rogue: Stealth mechanics, high backstab damage.

C. Combat System & Ability Archetypes

The Constants.js must define skills with a type property. The game logic must handle these 4 specific archetypes:

PROJECTILE (Linear Shot)

Behavior: Spawns at player location + offset. Moves in a straight line based on Aim Vector.

Logic: x += speed * dirX, y += speed * dirY.

Collision: Checks collision with enemies. Despawns on impact or wall.

Example: Hunter Arrow, Mage Fireball, Shaman Lightning.

MELEE (Directional Cone)

Behavior: Instant (or short animation duration). Does NOT spawn a moving object.

Logic: Checks for enemies within a short range AND within a specific angle (cone) relative to the player's facing direction.

Visual: Draws a "swing" arc in front of the player.

Example: Warrior Sword Slash, Rogue Backstab.

AOE (Area of Effect - Lobbed)

Behavior: A projectile travels to a specific target point, then explodes.

Distance Logic: The distance of the throw depends on how far the user drags the joystick.

dragIntensity (0.0 to 1.0) maps to 0 to maxCastRange.

Target x = player.x + (aimDir.x * dragIntensity * maxRange).

Effect: When the projectile reaches the target x,y, it applies effect (Damage or Heal) to all entities within a radius.

Example: Priest Healing Grenade, Mage Blizzard.

SHIELD (Directional Block)

Behavior: A semi-circle entity attached to the player that rotates with the Aim Vector.

Logic: Does not deal damage. It intercepts enemy projectiles.

Calculation: If an enemy bullet hits the player, check the angle of impact. If Math.abs(bulletAngle - shieldAngle) < shieldArc/2, the damage is blocked/reduced.

Example: Warrior Shield Block, Paladin Aura.

Hitbox: Circle-based collision detection.

Cooldown: Visual feedback on client (gray overlay reducing). Server validates timestamps.

Revive (Tombstone): If HP <= 0, a Tombstone appears. Spectator mode. 3s proximity channel to revive.

D. Audio System (AudioManager.js)

Singleton class. Methods: preload(), play(key), playMusic(key). Initialize on first interaction.

5. DEVELOPMENT STEPS (EXECUTE IN THIS ORDER)

Step 1: Foundation & Server

Create package.json and server.js. Implement Socket.io events.

Step 2: Client Architecture

Create Game.js skeleton and Scene base class. Write Constants.js.

Step 3: Controller Implementation (Critical!)

Write controller.html and InputManager.js. Handle 2x2 Grid, Tap/Drag, and ensure Joystick Intensity (0.0-1.0) is sent to the server (crucial for AoE targeting).

Step 4: Player & Rendering

Write Player.js. Implement "Whiteboxing" rendering.

Step 5: Combat Logic & Skill System (Centralized)

Create SkillManager.js: This is the SHARED combat logic for all scenes.

Requirement: Do NOT implement skill logic (like spawning bullets or checking melee) inside specific scenes.

The SkillManager should export a method like castSkill(scene, player, skillData, aimVector).

It handles the switch case for skill types (PROJECTILE, MELEE, AOE, SHIELD) and executing the logic (e.g., adding a projectile to the scene's bullet list).

Scenes (LobbyScene, BossFightScene) must import this manager to process player actions.

Implement Projectile.js: Create a class to handle both Linear and AoE (Lobbed) movement logic.

Implement Melee & Shield Logic inside SkillManager:

Melee: The hit detection logic (checkMeleeHit) should be a utility used here.

Shield: Toggles the isShielding state on the player.

Implement Boss AI: Simple phases in BossFightScene.js.

Step 6: UI & Audio

Create LobbyScene.js. Implement AudioManager.js.

6. CODING STYLE & REQUIREMENTS

Modularity: Every class in a separate file.

Performance: Ensure the Game Loop does not create unnecessary objects.