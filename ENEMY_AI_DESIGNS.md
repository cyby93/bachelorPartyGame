# Enemy AI Design Specifications

Source: Brainstorming session 2026-04-20
Status: Pending implementation — to be planned with Saurfang & Thrall

---

## Illidari Centurion — Chaos Charger

Telegraphs charge with a cast bar, impacts target, enters a short Dazed window. On recovery, re-rolls target entirely — next charge hits anyone.

- Cast bar → charge → 4s daze (vulnerable) → random retarget → repeat
- No melee state at all — pure charge loop
- Cast bar rewards attentive players; dazed window rewards skilled positioning; random retarget punishes passive groups

```
LOOP:
  target = closest player
  begin 3s charge cast
  → on cast complete: charge target, deal impact damage
  → enter 4s daze (vulnerable)
  → daze expires: LOOP
```

---

## Coilskar Serpent Guard — Reactive Interceptor

Monitors nearby allies within a set radius. When any ally drops below 50% HP, rushes to physically interpose between that ally and the nearest attacker. Shield blocks all damage from the facing direction.

- Active protection AI that creates dynamic positioning
- Players must either burst allies from outside his range or kill the Guard first

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

---

## Blood Prophet — Phantom Prophet

Buffs from max range, never melees. When a player enters 50px danger threshold he teleports to farthest safe point — leaving a 6s DoT AoE puddle at the departure spot.

- Chasing him actively hurts you
- Players must coordinate to corner him without standing in his exit puddles

```
EVERY TICK:
  IF any player within 50px:
    spawn 6s DoT puddle at current position
    teleport to farthest safe point
  ELSE:
    find ally to buff
    cast buff from current position (max range)
```

---

## Brute — Wounded Brute

Slowly chases closest target normally, but at sub-25% HP triggers a 5s Enrage buff — gaining speed and damage, fixating on current target with a red visual line.

- Creates a danger spike at end of fight
- Enrage expires after 5s and targeting resets
- One-time trigger (previously_enraged flag)

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

---

## Ashtongue Mystic — Heal-First Aggressor

Scans allies continuously — if any are injured, moves toward the most injured until within 250px heal range and heals. The moment no injured ally exists, flips fully offensive targeting closest player.

- Her aggression is directly controlled by how well players manage enemy HP
- Fights until dead — no self-preservation

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

---

## Bonechewer Bladefury — Cluster Punisher

Triggers an AoE spin/cleave when 2+ players are within close range. Forces players to spread — positional discipline without complex targeting logic.

```
EVERY TICK:
  nearby_players = players within AoE radius
  IF count(nearby_players) ≥ 2:
    trigger spin/cleave AoE on all nearby_players
  ELSE:
    [existing behavior unchanged]
```

---

## Hunter Pets

### Hawk — Untouchable Spotter
- Shoots the closest enemy with ranged attacks
- Cannot be targeted or damaged — persistent pressure that cannot be removed
- Fallback: closest enemy to Hunter

### Panther — Backline Hunter
- Has HP, damageable
- Prioritizes ranged enemies over melee — hunts the squishiest targets first
- Punishes ranged players standing safely at the back
- Fallback: closest enemy to Hunter

### Bear — Frontline Anchor
- High HP, tanky
- Prioritizes melee enemies — acts as a second frontline tank, pulls melee away from Hunter
- Fallback: closest enemy to Hunter

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

## Support Trio Note

Serpent Guard + Mystic + Blood Prophet form a natural kill-priority trio:
- Guard physically blocks
- Mystic heals
- Prophet buffs

Players should dismantle these three first before the remaining enemies become manageable.
