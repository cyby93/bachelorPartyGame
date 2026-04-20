---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Advanced enemy AI behaviors for RAID NIGHT: THE RESCUE'
session_goals: 'Design distinct AI logic trees for each enemy type; replace 2 generic behaviors with 11 unique personalities; include Hunter pet AI'
selected_approach: 'progressive-flow'
techniques_used: ['What If Scenarios', 'Mind Mapping', 'Morphological Analysis', 'Decision Tree Mapping']
ideas_generated: [10]
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Cyby
**Date:** 2026-04-20

---

## Session Overview

**Topic:** Advanced enemy AI behaviors for RAID NIGHT: THE RESCUE
**Goals:** Design distinct AI logic trees for each enemy type — replacing 2 generic behaviors with 11 unique personalities. Includes Hunter pet AI.

---

## Technique Selection

**Approach:** Progressive Technique Flow
**Journey Design:** Systematic development from exploration to action

- **Phase 1 - Exploration:** What If Scenarios — maximum idea generation
- **Phase 2 - Pattern Recognition:** Mind Mapping — organizing behavioral archetypes
- **Phase 3 - Development:** Morphological Analysis — complete parameter specs per enemy
- **Phase 4 - Action Planning:** Decision Tree Mapping — concrete if/then logic for implementation

---

## Phase 1 — Expansive Exploration: What If Scenarios

### Ideas Generated

**[Behavior #2]: Chaos Charger**
*Concept:* Illidari Centurion telegraphs charge with a cast bar, impacts target, enters a short Dazed window (interruptible). On recovery, re-rolls target entirely — next charge hits anyone.
*Novelty:* Cast bar rewards attentive players; dazed window rewards skilled positioning; random retarget punishes passive groups.

**[Behavior #3]: Reactive Interceptor**
*Concept:* Coilskar Serpent Guard monitors nearby allies within a set radius. When any ally drops below 50% HP, he rushes to physically interpose himself between that ally and the nearest attacker. Shield blocks all damage from that direction.
*Novelty:* Active protection AI that creates dynamic positioning — players must either burst allies from outside his range or kill the Guard first.

**[Behavior #4]: Phantom Prophet**
*Concept:* Blood Prophet buffs from max range, never melees. When a player enters 50px danger threshold he teleports to farthest safe point — leaving a 6s DoT AoE puddle at the departure spot.
*Novelty:* Chasing him actively hurts you. Players must coordinate to corner him without standing in his exit puddles.

**[Behavior #5]: Wounded Brute**
*Concept:* Brute slowly chases closest target normally, but at sub-25% HP triggers a 5s Enrage buff — gaining speed and damage, fixating on current target with a red visual line.
*Novelty:* Creates a danger spike at end of fight. Enrage expires after 5s and targeting resets. One-time trigger.

**[Behavior #6]: Heal-First Aggressor**
*Concept:* Ashtongue Mystic scans allies continuously — if any are injured, she moves toward the most injured until within 250px heal range and heals. The moment no injured ally exists, she flips fully offensive targeting closest player.
*Novelty:* Her aggression is directly controlled by how well players manage enemy HP. Fights until dead — no self-preservation.

**[Behavior #7]: Hawk — Untouchable Spotter**
*Concept:* Hawk shoots the closest enemy with ranged attacks and cannot be targeted or damaged. Fallback: closest enemy to Hunter.
*Novelty:* Forces players to ignore it while managing everything else — persistent pressure that cannot be removed.

**[Behavior #8]: Panther — Backline Hunter**
*Concept:* Panther has HP, prioritizes ranged enemies over melee. Hunts the squishiest targets first. Fallback: closest enemy to Hunter.
*Novelty:* Punishes ranged players standing safely at the back.

**[Behavior #9]: Bear — Frontline Anchor**
*Concept:* Bear has high HP, prioritizes melee enemies, can be damaged. Acts as tanky diversion absorbing hits. Fallback: closest enemy to Hunter.
*Novelty:* Creates a second frontline tank — pulls melee enemies away from the Hunter.

**[Behavior #10]: Bladefury Cluster Punisher**
*Concept:* Bonechewer Bladefury triggers an AoE spin/cleave when 2+ players are within close range.
*Novelty:* Forces players to spread — positional discipline without complex targeting logic.

---

## Phase 2 — Pattern Recognition: Mind Map

**Movement Archetypes**
- Chase only → Fel Guard, Brute (baseline)
- Reposition on trigger → Harpooner (3s timer), Blood Prophet (proximity)
- Active interception → Serpent Guard (ally HP threshold + range)

**Targeting Logic**
- Closest always → Fel Guard, Brute, all pets (fallback)
- Priority-based → Mystic (injured ally first), Panther (ranged > melee), Bear (melee > ranged)
- Dynamic retarget → Centurion (random after each charge)

**State Machine Complexity**
- Single state → Fel Guard, Bladefury, Hawk
- Dual state → Mystic (heal↔offensive), Brute (normal↔enrage), Blood Prophet (buff↔flee)
- Reactive state → Serpent Guard (patrol↔intercept), Harpooner (attack↔sidestep)

**Player Pressure Type**
- Direct damage → Fel Guard, Centurion, Harpooner, Hawk
- Sustained frontline → Brute, Bear
- Backline threat → Panther
- Space control → Serpent Guard (blocks pathing), Blood Prophet (AoE puddles), Bladefury (spread enforcement)
- Sustain denial → Mystic

**Special Trigger Type**
- Timer-based → Harpooner (3s on same target)
- HP threshold → Brute (25% enrage), Serpent Guard (ally 50% HP)
- Proximity-based → Blood Prophet (50px danger radius)
- Cast telegraph → Centurion (charge cast bar)
- Permanent passive → Hawk (untargetable)
- Cluster-based → Bladefury (2+ players in range)

**Key Patterns**
- Every enemy has at least one reactive layer except Fel Guard and Bladefury (intentionally simple baseline)
- Three natural "support trio": Serpent Guard (physical block), Mystic (healing), Blood Prophet (buffing) — players must dismantle these first
- Trigger diversity is healthy: timers, HP thresholds, proximity, cast bars, cluster detection
- No enemy has more than 2 states — complexity is controlled

---

## Phase 3 — Morphological Analysis: Complete Specs

| Enemy | Primary Target | Movement | Attack | Special Condition | Fallback |
|---|---|---|---|---|---|
| Fel Guard | Closest player | Melee chase | Melee | — | — |
| Bonechewer Bladefury | Closest player | Existing | Melee/AoE | 2+ players in range → spin/cleave | Existing behavior |
| Coilskar Harpooner | Closest player | Stationary | Ranged | Same target 3s → side-roll → retarget | Continue ranged attack |
| Coilskar Serpent Guard | Closest player | Chase / Intercept | Melee | Ally within range at ≤50% HP → interpose, shield blocks damage from facing direction | Chase + melee |
| Illidari Centurion | Closest player | Charge only | Charge impact | Post-charge → 4s daze → retarget → new charge | No fallback — loop is the behavior |
| Brute | Closest player | Slow chase | Strong melee | ≤25% HP → 5s Enrage (fixate + speed/dmg buff + red line) | Returns to closest after enrage |
| Blood Prophet | Ally to buff | Teleport on trigger | Buff only (no damage) | Player within 50px → teleport to farthest safe point + 6s DoT puddle | Keep fleeing forever |
| Ashtongue Mystic | Most injured ally | Move to heal range | Heal / Ranged attack | No injured allies → offensive, target closest player | Fights until dead |
| Hawk | Closest enemy | Stationary/ranged | Ranged | Untargetable | Closest enemy to Hunter |
| Panther | Closest ranged enemy | Chase | Melee | Has HP, damageable | Closest enemy to Hunter |
| Bear | Closest melee enemy | Chase | Melee | High HP, tanky, damageable | Closest enemy to Hunter |

---

## Phase 4 — Decision Tree Mapping: Implementation Logic

### Illidari Centurion
```
LOOP:
  target = closest player
  begin 3s charge cast
  → on cast complete: charge target, deal impact damage
  → enter 4s daze (vulnerable)
  → daze expires: LOOP
```

### Coilskar Serpent Guard
```
EVERY TICK:
  injured_ally = find ally within range with HP ≤ 50%
  IF injured_ally exists:
    attacker = injured_ally's current attacker
    rush to position between attacker and injured_ally
    face attacker → shield blocks all damage from that direction
  ELSE:
    chase closest player
    IF in melee range: attack
```

### Blood Prophet
```
EVERY TICK:
  IF any player within 50px:
    spawn 6s DoT puddle at current position
    teleport to farthest safe point
  ELSE:
    find ally to buff
    cast buff from current position (max range)
```

### Ashtongue Mystic
```
EVERY TICK:
  injured_ally = find most injured ally
  IF injured_ally exists:
    IF distance to injured_ally > 250px: move toward injured_ally
    ELSE: cast heal on injured_ally
  ELSE:
    target = closest player
    cast ranged attack
```

### Coilskar Harpooner
```
EVERY TICK:
  attack current target (ranged)
  increment target_lock_timer
  IF target_lock_timer ≥ 3s:
    perform side-roll
    target = closest player
    reset target_lock_timer
```

### Brute
```
EVERY TICK:
  IF enraged:
    attack fixated_target
    decrement enrage_timer
    IF enrage_timer ≤ 0: clear enrage, clear fixate
  ELSE:
    chase closest player
    IF in melee range: attack
    IF HP ≤ 25% AND NOT previously_enraged:
      fixated_target = current target
      enrage_timer = 5s
      apply enrage buff (damage + speed)
      show red visual line to fixated_target
      previously_enraged = true
```

### Bonechewer Bladefury
```
EVERY TICK:
  nearby_players = players within AoE radius
  IF count(nearby_players) ≥ 2:
    trigger spin/cleave AoE on all nearby_players
  ELSE:
    [existing behavior unchanged]
```

### Hunter Pets
```
HAWK (untargetable):
  target = closest enemy
  IF no enemy: target = closest enemy to Hunter
  cast ranged attack on target

PANTHER:
  ranged_enemy = closest ranged enemy
  IF ranged_enemy exists: target = ranged_enemy
  ELSE: target = closest enemy to Hunter
  chase and attack target

BEAR:
  melee_enemy = closest melee enemy
  IF melee_enemy exists: target = melee_enemy
  ELSE: target = closest enemy to Hunter
  chase and attack target (absorb hits)
```

---

## Session Highlights

**Breakthrough Moments:**
- Illidari Centurion as a pure charge loop — no melee state at all — emerged from a single "what if he just kept charging?" insight
- Blood Prophet's puddle turning his escape into a punishment mechanic
- Serpent Guard's shield as directional damage negation, not cosmetic positioning

**Key Design Principles Established:**
- Every enemy has at least one reactive layer
- No enemy has more than 2 states — complexity is controlled
- Trigger diversity: timers, HP thresholds, proximity, cast bars, cluster detection all represented
- Support trio (Serpent Guard + Mystic + Blood Prophet) creates natural "kill priority" for players

**Total behaviors designed:** 11 distinct AI logic trees (up from 2 generic behaviors)
