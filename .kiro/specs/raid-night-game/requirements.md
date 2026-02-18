# Requirements: RAID NIGHT - THE RESCUE

## 1. Overview

A web-based local multiplayer "Twin-Stick MOBA" party game where up to 13 players use smartphones as controllers to battle a boss on a shared TV/monitor display.

**Technology Stack:**
- Backend: Node.js, Express, Socket.io
- Frontend: Vanilla JavaScript (ES6 Modules), HTML5 Canvas
- Controls: nipple.js virtual joysticks
- Communication: WebSocket (Socket.io)

## 2. User Stories

### 2.1 Player Connection & Setup

**US-2.1.1: As a player, I want to connect my smartphone as a controller**
- Given I open the controller URL on my phone
- When I enter my name and select a class
- Then I should join the game lobby and see my controls

**US-2.1.2: As a host, I want to display the game on a TV/monitor**
- Given I open the host URL on a TV/monitor
- When players connect with their phones
- Then I should see all connected players in the lobby

**US-2.1.3: As a player, I want to practice my skills in the lobby**
- Given I have joined the game
- When I am in the lobby waiting for the game to start
- Then I can move around and test all 4 of my class skills

### 2.2 Class Selection

**US-2.2.1: As a player, I want to choose from 8 different classes**
- Given I am on the connection screen
- When I select a class from the dropdown
- Then I should see the class name and icon
- And each class should have unique stats (HP, speed, color)

**Classes:**
1. Warrior - Tank with melee and shield
2. Paladin - Hybrid tank/healer
3. Shaman - Hybrid DPS/healer
4. Hunter - Ranged DPS with pets
5. Priest - Pure healer with resurrection
6. Mage - Glass cannon DPS
7. Druid - Shapeshifter (Bear/Cat/Tree)
8. Rogue - Stealth assassin

### 2.3 Controller Input

**US-2.3.1: As a player, I want to move my character with a joystick**
- Given I am in the game
- When I drag on the left half of my screen
- Then my character should move in that direction
- And when I release, my character should stop

**US-2.3.2: As a player, I want to use skills with a 2x2 grid**
- Given I am in the game
- When I interact with the right half of my screen (2x2 grid)
- Then I should be able to use 4 differ