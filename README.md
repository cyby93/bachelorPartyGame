# 🎮 RAID NIGHT - THE RESCUE

A local multiplayer twin-stick MOBA party game where smartphones become controllers and players team up to defeat Illidan Stormrage!

## 🚀 Quick Start

1. **Start the server:**
   ```bash
   npm start
   ```

2. **Open the host display** (on your TV/Monitor):
   - Navigate to `http://localhost:3000/host.html`

3. **Connect controllers** (on smartphones):
   - Each player opens `http://[YOUR_IP]:3000/controller.html`
   - Enter name and select class
   - Click "JOIN GAME"

4. **Practice in lobby:**
   - Move around and test all 4 skills
   - Get comfortable with controls

5. **Start the raid:**
   - Once all players are ready, click "START GAME" on the host screen

## 🎯 How to Play

### Controller Layout
- **Left Half**: Movement joystick (drag to move your character)
- **Right Half**: 2x2 skill grid
  - **TAP**: Auto-aim for support skills (heal), manual aim for attacks
  - **DRAG & RELEASE**: Manual aim and fire
  - **DRAG TO CENTER**: Cancel ability

### Classes (8 Available)

1. **⚔️ Warrior** - Tank with melee attacks and shield
2. **🔨 Paladin** - Hybrid tank/healer with holy powers
3. **⚡ Shaman** - Hybrid DPS/healer with lightning and totems
4. **🏹 Hunter** - Ranged DPS with pets and traps
5. **✝️ Priest** - Pure healer with shields and mass resurrect
6. **🔥 Mage** - Glass cannon with powerful spells
7. **🌿 Druid** - Shapeshifter (Bear/Cat/Tree forms)
8. **🗡️ Rogue** - Stealth assassin with high burst damage

### Combat Mechanics
- Each class has 4 unique skills with cooldowns
- **Offensive skills** (projectile, melee, AOE) require manual aiming
- **Support skills** (heal, buff) auto-target nearest ally
- When HP reaches 0, you become a tombstone
- Allies can revive you by standing near your tombstone for 3 seconds
- Revived players return with 40% HP
- Defeat Illidan before your entire raid wipes!

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla JavaScript (ES6 Modules), HTML5 Canvas
- **Controls**: nipple.js for virtual joysticks
- **Communication**: Real-time WebSocket

## 📁 Project Structure

```
/
├── server.js              # Game server & socket logic
├── public/
│   ├── index.html         # Landing page
│   ├── host.html          # Main game display
│   ├── controller.html    # Phone controller interface
│   ├── css/
│   │   └── style.css      # Responsive styling
│   ├── js/
│   │   ├── Game.js        # Main game loop & scene manager
│   │   ├── Constants.js   # Game configuration & class definitions
│   │   ├── managers/
│   │   │   ├── AudioManager.js
│   │   │   ├── InputManager.js
│   │   │   └── SkillManager.js
│   │   ├── scenes/
│   │   │   ├── Scene.js
│   │   │   ├── LobbyScene.js
│   │   │   ├── BossFightScene.js
│   │   │   └── GameOverScene.js
│   │   └── entities/
│   │       ├── Player.js
│   │       ├── Boss.js
│   │       ├── Projectile.js
│   │       ├── MeleeAttack.js
│   │       ├── AOEEffect.js
│   │       ├── HealEffect.js
│   │       └── Tombstone.js
│   └── assets/
│       ├── sprites/       # (Placeholder for future sprites)
│       └── sounds/        # (Placeholder for future sounds)
```

## 🎨 Current Implementation

The game uses "whiteboxing" rendering - geometric shapes represent characters:
- **Tanks** (Warrior, Paladin): Squares
- **Casters** (Mage, Priest): Circles
- **Agile** (Rogue, Hunter): Triangles
- **Hybrids** (Druid, Shaman): Pentagons

Each class has a unique color and 4 skills with different mechanics.

## 🔧 Configuration

Edit `public/js/Constants.js` to adjust:
- Game balance (HP, damage, cooldowns)
- Canvas size
- Boss difficulty
- Skill properties

## 🎮 Skill System

### Skill Types:
- **Projectile**: Ranged attacks that travel
- **Melee**: Close-range attacks
- **AOE**: Area-of-effect damage
- **Heal**: Restore HP (auto-targets injured allies)
- **Dash/Teleport**: Movement abilities
- **Buff/Defense**: Temporary stat boosts

### Auto-Aim:
- **Offensive skills**: Manual aim required (drag to aim)
- **Support skills**: Auto-target nearest valid ally

## 📝 Features

✅ Real-time multiplayer (up to 13 players)
✅ Interactive lobby with skill practice
✅ 8 unique classes with 4 skills each
✅ Boss with 3 difficulty phases
✅ Death/revive mechanics
✅ Cooldown system with visual feedback
✅ Responsive controller UI
✅ Modular skill system

## 🐛 Troubleshooting

**Controllers can't connect:**
- Make sure all devices are on the same network
- Use the Network IP shown in the console (not localhost)

**Game feels laggy:**
- Check network connection
- Reduce number of simultaneous projectiles

**Skills not working:**
- Check browser console for errors
- Ensure cooldowns have expired (visual overlay)

## 🎉 Have Fun!

Gather your friends, pick your classes, and take down Illidan! Good luck, raiders!
