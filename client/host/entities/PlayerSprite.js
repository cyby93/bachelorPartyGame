/**
 * client/host/entities/PlayerSprite.js
 *
 * Visual representation of one player on the host canvas.
 *
 * Structure:
 *   container  (positioned at player world coords, NOT rotated)
 *   ├── body           (child Container — rotated for non-directional classes only)
 *   │   ├── shapeSprite  (class sprite; texture swapped per direction for directional classes)
 *   │   └── flashGfx
 *   ├── shieldGfx
 *   ├── aimArrow       (child Graphics — rotated to player.aimAngle, hidden when self-casting)
 *   ├── selfCastRing   (child Graphics — pulsing halo shown instead of arrow when self-casting)
 *   └── statusEffects  (child Container — move this to reposition all overhead UI together)
 *       ├── nameText   (above shape, always upright)
 *       ├── hpBarBg    (background bar, drawn once)
 *       ├── hpBarFill  (filled portion, redrawn on HP change)
 *       └── [OverheadDisplay._container]  (cast bar, status icons, combo pips)
 */

import { Assets, Container, Graphics, Sprite, Text } from 'pixi.js'
import { CLASSES } from '../../../shared/ClassConfig.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'
import { DIRECTIONAL_ANIMATIONS, DIRECTIONAL_CLASSES } from '../HostGame.js'
import OverheadDisplay from '../systems/OverheadDisplay.js'

// Direction names ordered by angle sector (0=East, clockwise)
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']

function angleToDir(angle) {
  // angle: radians, 0=East, π/2=South (Pixi Y-down coordinate system)
  // Normalise to [0, 2π), then bin into 8 equal sectors
  const TAU  = Math.PI * 2
  const norm = ((angle % TAU) + TAU) % TAU
  const idx  = Math.round(norm / (Math.PI / 4)) % 8
  return DIRS[idx]
}

const R        = GAME_CONFIG.PLAYER_RADIUS    // still used for non-directional sprite size
const RX       = GAME_CONFIG.PLAYER_RADIUS_X  // oval hitbox horizontal semi-axis
const RY       = GAME_CONFIG.PLAYER_RADIUS_Y  // oval hitbox vertical semi-axis
const SPRITE_SIZE = 124                        // display size for all player sprites
const SPRITE_H    = SPRITE_SIZE / 2           // half-height for UI element positioning
const BAR_W = 44
const BAR_H = 5
const OVERHEAD_ZERO = -SPRITE_H + 21

export default class PlayerSprite {
  constructor(data) {
    this.id       = data.id
    this._data    = data
    this._classData = CLASSES[data.className] ?? CLASSES.Warrior

    // ── Containers ──────────────────────────────────────────────────────
    this.container = new Container()

    // ── Agonizing Flame aura (drawn under everything) ─────────────────────
    this._agonizingFlameGfx    = new Graphics()
    this._agonizingFlameTimer  = 0
    this._agonizingFlameRadius = 0
    this.container.addChild(this._agonizingFlameGfx)

    this._body     = new Container()   // rotated child
    this.container.addChild(this._body)

    this._statusEffects = new Container()
    this.container.addChild(this._statusEffects)

    // ── Shape sprite ─────────────────────────────────────────────────────────
    const className = (data.className ?? 'Warrior').toLowerCase()
    this._isDirectional = DIRECTIONAL_CLASSES.has(className)
    this._className     = className
    this._currentDir    = null   // track last direction to skip redundant texture swaps

    if (this._isDirectional) {
      // 8-directional art: start facing East, swap texture on direction change
      const tex = Assets.get(`player_${className}_east`)
      this._shapeSprite = new Sprite(tex)
    } else {
      // Legacy single sprite: continuously rotated to match player angle
      const tex = Assets.get(`player_${className}`)
      this._shapeSprite = new Sprite(tex)
    }
    this._shapeSprite.width  = SPRITE_SIZE
    this._shapeSprite.height = SPRITE_SIZE
    this._shapeSprite.anchor.set(0.5)
    this._body.addChild(this._shapeSprite)

    // ── Animation state (directional classes only) ────────────────────────────
    this._animCfg            = DIRECTIONAL_ANIMATIONS[className] ?? null
    this._animState          = 'idle'   // 'idle' | 'walk' | 'ability' | 'cast' | 'downed'
    this._animFrame          = 0
    this._lastAnimFrame      = -1       // force first-frame texture load
    this._animTimer          = 0
    this._lastRenderPos      = null     // set on first update; used for movement detection
    this._abilityTimer       = 0        // seconds remaining in one-shot ability animation
    this._currentAbilitySkill = null    // skillName being played in 'ability' state
    this._castSkill          = null     // skillName of the active cast (from STATE_DELTA.castSkill)
    this._wasDowned     = false    // previous isDowned — detects downed/resurrection transitions
    this._isDancing     = false    // set by BattleRenderer during closing cinematic dance phase

    // ── Name label ───────────────────────────────────────────────────────
    this._nameText = new Text({
      text:  data.name ?? '?',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    this._nameText.anchor.set(0.5, 1)
    this._nameText.position.set(0, OVERHEAD_ZERO - BAR_H - 3 )
    this._statusEffects.addChild(this._nameText)

    // ── HP bar ────────────────────────────────────────────────────────────
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()

    // Background (drawn once — never changes)
    this._hpBg.rect(-BAR_W / 2, 0, BAR_W, BAR_H)
    this._hpBg.fill('#1a1a1a')
    this._hpBg.stroke({ color: '#ffffff', width: 0.5, alpha: 0.25 })
    this._hpBg.position.set(0, OVERHEAD_ZERO)

    this._hpFill.position.set(0, OVERHEAD_ZERO)

    this._statusEffects.addChild(this._hpBg)
    this._statusEffects.addChild(this._hpFill)

    this._maxHp        = data.maxHp ?? this._classData.hp
    this._lastHp       = -1   // force first draw
    this._lastShield   = 0
    this._updateHpBar(data.hp ?? this._maxHp, 0)

    // ── Hit flash ────────────────────────────────────────────────────────────
    this._flashGfx = new Graphics()
    this._flashGfx.ellipse(0, 0, RX + 2, RY + 2)
    this._flashGfx.fill({ color: 0xffffff, alpha: 1 })
    this._flashGfx.alpha = 0
    this._body.addChild(this._flashGfx)
    this._flashTimer = 0   // seconds remaining

    // ── Shield arc ────────────────────────────────────────────────────────
    this._shieldGfx = new Graphics()
    this._shieldGfx.alpha = 0   // hidden by default
    this.container.addChild(this._shieldGfx)
    this._shieldVisible   = false
    this._shieldFadeTimer = 0   // seconds remaining in fade-out

    // ── HoT visual (Regrowth — animated HP bar frame glow) ───────────────
    this._hotGfx = new Graphics()
    this._statusEffects.addChild(this._hotGfx)
    this._hotActive = false

    // ── DoT body indicator (Illidan debuffs / damage-over-time) ──────────
    this._dotGfx = new Graphics()
    this.container.addChild(this._dotGfx)

    // ── Aim arrow ─────────────────────────────────────────────────────────
    this._classColor   = this._classData.color ?? '#ffffff'
    this._aimArrow = new Graphics()
    this._aimArrow.alpha = 0
    this._drawAimArrow()
    this.container.addChild(this._aimArrow)

    // ── Self-cast arc (half-circle at feet, replaces arrow when aimSelf=true) ──
    this._selfCastRing = new Graphics()
    this._selfCastRing.arc(0, 24, 20, Math.PI * 15 / 8, Math.PI * 9 / 8)
    this._selfCastRing.stroke({ color: this._classColor, width: 1.5, alpha: 0.7 })
    this._selfCastRing.alpha = 0
    this.container.addChild(this._selfCastRing)

    this._aimPulse = 0

    // ── Cooldown tracking (populated via onCooldown events) ──────────────────
    this._cooldownEnds = {}   // skillIndex → { endTime, totalMs }

    // ── Overhead display (cast bar + status icons + combo pips + CD dots) ────
    this.overhead = new OverheadDisplay(this._statusEffects, {
      yOffset: OVERHEAD_ZERO + BAR_H - 3,
      showCastBar: true,
      showComboPips: className === 'rogue' || className === 'paladin',
      pipColor: className === 'paladin' ? 0xffe680 : 0xffdd00,
      skills: this._classData.skills ?? [],
    })
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  _updateHpBar(hp, shield = 0) {
    if (hp === this._lastHp && shield === this._lastShield) return
    this._lastHp     = hp
    this._lastShield = shield

    // Bar denominator is maxHp + shield so the shield extends the bar proportionally
    const total     = this._maxHp + shield
    const hpPct     = total > 0 ? Math.max(0, hp / total) : 0
    const shieldPct = total > 0 ? Math.max(0, shield / total) : 0
    // Color thresholds use actual hp vs maxHp, not the combined ratio
    const hpRatio   = this._maxHp > 0 ? hp / this._maxHp : 0
    const hpColor   = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c'

    this._hpFill.clear()
    if (hpPct > 0) {
      this._hpFill.rect(-BAR_W / 2, 0, BAR_W * hpPct, BAR_H)
      this._hpFill.fill(hpColor)
    }
    if (shieldPct > 0) {
      this._hpFill.rect(-BAR_W / 2 + BAR_W * hpPct, 0, BAR_W * shieldPct, BAR_H)
      this._hpFill.fill('#888888')
    }
  }

  // ── Shield arc drawing ─────────────────────────────────────────────────────

  // chargeProgress: 0.0–1.0 while holding (null = auto-active or legacy)
  // shieldExpiresAt: timestamp (ms) for auto-active duration (null = manual hold)
  _drawShieldArc(angle, arc, chargeProgress = null, shieldExpiresAt = null) {
    const g = this._shieldGfx
    const shieldRadius = SPRITE_H - 20
    const halfArc   = arc / 2
    const startAngle = angle - halfArc
    const endAngle   = angle + halfArc
    const isCharging = chargeProgress !== null
    const isCharged  = isCharging && chargeProgress >= 1
    const nowMs      = Date.now()

    g.clear()

    const isWarrior = this._className === 'warrior'
    const isPaladin = this._className === 'paladin'

    if (isWarrior) {
      // Steel shield — bold metallic arc with inner bevel
      g.moveTo(0, 0)
      g.arc(0, 0, shieldRadius + 4, startAngle, endAngle)
      g.lineTo(0, 0)
      g.fill({ color: 0x888888, alpha: 0.25 })

      g.arc(0, 0, shieldRadius + 4, startAngle, endAngle)
      g.stroke({ color: 0xdddddd, width: 5, alpha: 0.9 })

      g.arc(0, 0, shieldRadius - 2, startAngle, endAngle)
      g.stroke({ color: 0x555555, width: 2, alpha: 0.5 })

      // Amber charge ring sweeps the arc border as progress fills
      if (isCharging) {
        const sweepEnd  = startAngle + arc * chargeProgress
        const ringAlpha = isCharged
          ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(nowMs / 150)) // pulse when fully charged
          : 0.85
        g.arc(0, 0, shieldRadius + 4, startAngle, sweepEnd)
        g.stroke({ color: 0xff9900, width: 7, alpha: ringAlpha })
      }
    } else if (isPaladin) {
      // Divine golden shield — holy glow with inner fill
      // Outer glow intensifies as charge builds
      const glowAlpha = isCharging ? 0.30 + 0.40 * chargeProgress : 0.30
      const glowWidth = isCharging ? 1.5 + 2 * chargeProgress : 1.5

      g.moveTo(0, 0)
      g.arc(0, 0, shieldRadius + 6, startAngle, endAngle)
      g.lineTo(0, 0)
      g.fill({ color: 0xffd700, alpha: 0.18 })

      g.arc(0, 0, shieldRadius + 6, startAngle, endAngle)
      g.stroke({ color: 0xffd700, width: 4, alpha: 0.85 })

      g.arc(0, 0, shieldRadius + 10, startAngle, endAngle)
      g.stroke({ color: 0xffffff, width: glowWidth, alpha: glowAlpha })

      g.arc(0, 0, shieldRadius, startAngle, endAngle)
      g.stroke({ color: 0xffeeaa, width: 2, alpha: 0.55 })

      // Bright gold/white ring sweeps the outer glow layer as progress fills
      if (isCharging) {
        const sweepEnd  = startAngle + arc * chargeProgress
        const ringAlpha = isCharged
          ? 0.65 + 0.35 * (0.5 + 0.5 * Math.sin(nowMs / 200)) // heartbeat pulse when fully charged
          : 0.90
        g.arc(0, 0, shieldRadius + 10, startAngle, sweepEnd)
        g.stroke({ color: 0xffffff, width: 3.5, alpha: ringAlpha })
      }
    } else {
      // Default blue shield
      g.moveTo(0, 0)
      g.arc(0, 0, shieldRadius, startAngle, endAngle)
      g.lineTo(0, 0)
      g.fill({ color: 0x00d2ff, alpha: 0.2 })

      g.arc(0, 0, shieldRadius, startAngle, endAngle)
      g.stroke({ color: 0x00d2ff, width: 3, alpha: 0.8 })

      if (isCharging) {
        const sweepEnd = startAngle + arc * chargeProgress
        g.arc(0, 0, shieldRadius, startAngle, sweepEnd)
        g.stroke({ color: 0xffffff, width: 5, alpha: 0.85 })
      }
    }
  }

  // ── Aim arrow drawing ─────────────────────────────────────────────────────

  _drawAimArrow() {
    const g = this._aimArrow
    g.clear()

    const GAP        = 6
    const STEM_START = SPRITE_H + GAP
    const STEM_END   = SPRITE_H + 22
    const STEM_H     = 3
    const HEAD_W     = 10
    const HEAD_H     = 9

    const color = this._classColor ?? '#ffffff'

    // Stem
    g.rect(STEM_START, -STEM_H / 2, STEM_END - STEM_START, STEM_H)
    g.fill({ color, alpha: 0.9 })

    // Arrowhead triangle — tip points right (= player forward in local space)
    g.poly([
      STEM_END + HEAD_W, 0,
      STEM_END,          -HEAD_H,
      STEM_END,           HEAD_H,
    ])
    g.fill({ color, alpha: 0.9 })
  }

  // ── Ability animation trigger ─────────────────────────────────────────────

  /**
   * Play the one-shot fire animation for the given skill, then return to idle/walk.
   * Resolves: skills[skillName] → skills.ability → no-op.
   * @param {string} [skillName]
   */
  triggerAbilityAnim(skillName) {
    const skills = this._animCfg?.skills
    const cfg = skills?.[skillName] ?? skills?.ability
    if (!cfg) return
    this._currentAbilitySkill = skillName ?? 'ability'
    this._animState    = 'ability'
    this._animFrame    = 0
    this._animTimer    = 0
    this._abilityTimer = cfg.frames / cfg.fps
  }

  /**
   * Called by BattleRenderer when the closing cinematic starts/stops the dance phase.
   * Dance locks the sprite to south-facing and loops the dance animation strip.
   */
  setDancing(dancing) {
    if (dancing === this._isDancing) return
    this._isDancing = dancing
    if (dancing && this._animCfg?.dance) {
      this._animState = 'dance'
      this._animFrame = 0
      this._animTimer = 0
    } else if (!dancing && this._animState === 'dance') {
      this._animState = 'idle'
      this._animFrame = 0
      this._animTimer = 0
    }
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  /**
   * @param {object} state     - latest known server state for this player
   * @param {object} renderPos - interpolated { x, y }
   */
  update(state, renderPos, dt = 0) {
    this.container.position.set(renderPos.x, renderPos.y)

    if (this._isDirectional) {
      const dir = angleToDir(state.angle ?? 0)

      if (this._animCfg) {
        // ── Animated directional sprite ──────────────────────────────────────
        // 1. Resolve animation state (downed > cast > ability > walk > idle)
        const isDowned = state.isDowned ?? false

        if (isDowned && !this._wasDowned && this._animCfg?.downed) {
          this._animState = 'downed'
          this._animFrame = 0
          this._animTimer = 0
        } else if (!isDowned && this._wasDowned) {
          this._animState = this._isDancing ? 'dance' : 'idle'
          this._animFrame = 0
          this._animTimer = 0
        }
        this._wasDowned = isDowned

        const moved = this._lastRenderPos !== null &&
          (Math.abs(renderPos.x - this._lastRenderPos.x) > 0.3 ||
           Math.abs(renderPos.y - this._lastRenderPos.y) > 0.3)

        const isCasting = state.castProgress != null
        if (isCasting) this._castSkill = state.castSkill ?? null
        if (this._animState === 'downed') {
          // locked — no other state may interrupt a downed animation
        } else if (this._isDancing && this._animCfg?.dance) {
          // Dance locks south-facing and loops — only downed may override it
          if (this._animState !== 'dance') {
            this._animState = 'dance'
            this._animFrame = 0
            this._animTimer = 0
          }
        } else if (isCasting && this._animCfg?.cast) {
          if (this._animState !== 'cast') {
            this._animState = 'cast'
            this._animFrame = 0
            this._animTimer = 0
          }
          this._abilityTimer = 0
        } else if (this._abilityTimer > 0) {
          this._abilityTimer -= dt
          if (this._abilityTimer <= 0) {
            this._abilityTimer = 0
            this._animState = moved ? 'walk' : 'idle'
            this._animFrame = 0
            this._animTimer = 0
          }
        } else {
          const newState = moved ? 'walk' : 'idle'
          if (newState !== this._animState) {
            this._animState = newState
            this._animFrame = 0
            this._animTimer = 0
          }
        }

        // 2. Advance frame timer
        // For 'ability' state, cfg lives in the skills sub-map rather than at the top level.
        const cfg = this._animState === 'ability'
          ? (this._animCfg.skills?.[this._currentAbilitySkill] ?? this._animCfg.skills?.ability ?? this._animCfg.idle)
          : (this._animCfg[this._animState] ?? this._animCfg.idle)
        this._animTimer += dt
        const frameDuration = 1 / cfg.fps
        if (this._animTimer >= frameDuration) {
          this._animTimer -= frameDuration
          if (this._animState === 'downed') {
            this._animFrame = Math.min(this._animFrame + 1, cfg.frames - 1)
          } else {
            this._animFrame = (this._animFrame + 1) % cfg.frames
          }
        }

        // 3. Swap texture when direction or frame changes
        // South-only animations (e.g. dance) always use 'south' regardless of player angle.
        const cfg2 = this._animCfg[this._animState]
        const effectiveDir = cfg2?.southOnly ? 'south' : dir
        if (effectiveDir !== this._currentDir || this._animFrame !== this._lastAnimFrame) {
          // For 'ability', use the skill name as the animation folder; fall back to 'ability'.
          const animNameForKey = this._animState === 'ability'
            ? (this._currentAbilitySkill ?? 'ability')
            : this._animState
          const key = `player_${this._className}_${animNameForKey}_${effectiveDir}_${this._animFrame}`
          const tex = Assets.get(key)
          if (tex) {
            this._shapeSprite.texture = tex
          } else if (this._animState === 'ability' && animNameForKey !== 'ability') {
            // Skill-specific strip missing — try generic 'ability' fallback before static
            const genericKey = `player_${this._className}_ability_${effectiveDir}_${this._animFrame}`
            const genericTex = Assets.get(genericKey)
            if (genericTex) {
              this._shapeSprite.texture = genericTex
            } else {
              const staticTex = Assets.get(`player_${this._className}_${effectiveDir}`)
              if (staticTex) this._shapeSprite.texture = staticTex
            }
          } else {
            const fallback = Assets.get(`player_${this._className}_${effectiveDir}`)
            if (fallback) this._shapeSprite.texture = fallback
          }
          this._currentDir    = effectiveDir
          this._lastAnimFrame = this._animFrame
        }

        this._lastRenderPos = { x: renderPos.x, y: renderPos.y }

      } else {
        // ── Static directional sprite (no animation config yet) ───────────────
        if (dir !== this._currentDir) {
          this._currentDir = dir
          this._shapeSprite.texture = Assets.get(`player_${this._className}_${dir}`)
        }
      }

      // Do NOT rotate the body — direction is encoded in the art
    } else {
      this._body.rotation = state.angle ?? 0
    }

    if (state.hp != null || state.shieldAbsorb != null) {
      const hp     = state.hp           ?? this._lastHp
      const shield = state.shieldAbsorb ?? this._lastShield
      // Trigger flash when HP drops
      if (state.hp != null && state.hp < this._lastHp && this._lastHp !== -1) {
        this._flashTimer = 0.1
      }
      this._updateHpBar(hp, shield)
    }

    // Tick flash
    if (this._flashTimer > 0) {
      this._flashTimer = Math.max(0, this._flashTimer - dt)
      this._flashGfx.alpha = this._flashTimer / 0.1
    } else {
      this._flashGfx.alpha = 0
    }

    // Downed: fade out — unless the downed animation is active (warlock has art for this)
    this.container.alpha = (state.isDowned && this._animState !== 'downed') ? 0.2 : 1.0

    // Shield arc
    const shieldOn    = !!state.shieldActive
    const wasVisible  = this._shieldVisible
    const nowMs       = Date.now()

    if (shieldOn) {
      const angle = state.shieldAngle ?? 0
      const arc   = state.shieldArc   ?? Math.PI / 2

      let chargeProgress  = null
      const shieldExpiresAt = state.shieldExpiresAt ?? null

      if (state.shieldChargeStart != null && (state.shieldChargeDuration ?? 0) > 0) {
        chargeProgress = Math.min(1, (nowMs - state.shieldChargeStart) / state.shieldChargeDuration)
      }

      this._drawShieldArc(angle, arc, chargeProgress, shieldExpiresAt)

      // Expiry flicker — last 800ms of auto-active shield
      if (shieldExpiresAt != null && shieldExpiresAt - nowMs < 800) {
        const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(nowMs / 80))
        this._shieldGfx.alpha = Math.max(0.1, flicker)
      } else {
        this._shieldGfx.alpha = 1
      }
      this._shieldFadeTimer = 0.3  // prime fade for when shield drops
    } else {
      if (wasVisible) this._shieldFadeTimer = 0.3
      if (this._shieldFadeTimer > 0) {
        this._shieldFadeTimer = Math.max(0, this._shieldFadeTimer - dt)
        this._shieldGfx.alpha = this._shieldFadeTimer / 0.3
      } else {
        this._shieldGfx.alpha = 0
      }
    }
    this._shieldVisible = shieldOn

    // Aim indicator
    if (state.isAiming) {
      this._aimPulse += dt
      const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(this._aimPulse * Math.PI * 2 / 0.6))
      if (state.aimSelf) {
        this._aimArrow.alpha = 0
        this._selfCastRing.alpha = pulse
      } else {
        this._selfCastRing.alpha = 0
        this._aimArrow.rotation = state.aimAngle ?? state.angle ?? 0
        this._aimArrow.alpha = pulse
      }
    } else {
      this._aimPulse = 0
      this._aimArrow.alpha = 0
      this._selfCastRing.alpha = 0
    }

    // Agonizing Flame aura circle
    if (state.effects) {
      const af = state.effects.find(e => e.src === 'illidan:agonizingFlames')
      if (af) {
        this._agonizingFlameRadius = af.params?.dotRadius ?? 100
      } else {
        this._agonizingFlameRadius = 0
      }
    }
    if (this._agonizingFlameRadius > 0) {
      this._agonizingFlameTimer += dt
      const pulse = 0.5 + 0.5 * Math.sin(this._agonizingFlameTimer * Math.PI * 2 / 1.2)
      const borderAlpha = 0.6 + 0.4 * pulse
      const fillAlpha   = 0.10 + 0.08 * pulse
      const r           = this._agonizingFlameRadius
      this._agonizingFlameGfx.clear()
      this._agonizingFlameGfx.circle(0, 0, r)
      this._agonizingFlameGfx.fill({ color: 0x6600cc, alpha: fillAlpha })
      this._agonizingFlameGfx.stroke({ color: 0x9933ff, width: 2, alpha: borderAlpha })
    } else {
      this._agonizingFlameTimer = 0
      this._agonizingFlameGfx.clear()
    }

    // Update overhead display
    this.overhead.updateCastBar(state.castProgress ?? 0, state.isChanneling ?? false)
    if (this._className === 'rogue') {
      this.overhead.setComboPoints(state.comboPoints ?? 0)
    } else if (this._className === 'paladin') {
      this.overhead.setComboPoints(state.hammerSwingCount ?? 0, 3)
    }
    const now = Date.now()
    if (Object.keys(this._cooldownEnds).length > 0) {
      const snapshot = {}
      for (const [idx, cd] of Object.entries(this._cooldownEnds)) {
        snapshot[idx] = { remaining: Math.max(0, cd.endTime - now), total: cd.totalMs }
      }
      this.overhead.setCooldowns(snapshot)
    }
    this.overhead.update(dt)

    this._syncHotVisuals(state.effects, now)
    this._syncDotVisuals(state.effects, now)
  }

  _syncHotVisuals(effects, now) {
    const hasHot = effects?.some(e => e.src?.startsWith('hot:'))
    if (!hasHot) {
      if (this._hotActive) {
        this._hotGfx.clear()
        this._hotActive = false
      }
      return
    }
    this._hotActive = true
    // Animate a glowing border around the HP bar frame
    const pulse = 0.5 + 0.5 * Math.sin(now / 400)
    const PAD = 2
    this._hotGfx.clear()
    this._hotGfx.rect(-BAR_W / 2 - PAD, OVERHEAD_ZERO - PAD, BAR_W + PAD * 2, BAR_H + PAD * 2)
    this._hotGfx.stroke({ color: 0x00ff44, width: 1.5, alpha: 0.4 + 0.5 * pulse })
  }

  _syncDotVisuals(effects, now) {
    if (!effects?.length) {
      this._dotGfx.clear()
      return
    }
    const hasDot = effects.some(e => {
      const src = e.src ?? ''
      if (src === 'illidan:agonizingFlames') return false  // has its own dedicated visual
      const p = e.params ?? {}
      return src.startsWith('dot:') || p.shear || p.parasitic || p.darkBarrage
    })
    if (!hasDot) {
      this._dotGfx.clear()
      return
    }
    // Pulsing fel-purple ring around character body — clearly visible presence indicator
    const pulse = 0.5 + 0.5 * Math.sin(now / 350)
    const R = RX + 6
    this._dotGfx.clear()
    this._dotGfx.ellipse(0, 0, R + pulse * 3, (R + pulse * 3) * (RY / RX))
    this._dotGfx.fill({ color: 0x6600cc, alpha: 0.12 + 0.08 * pulse })
    this._dotGfx.ellipse(0, 0, R + pulse * 3, (R + pulse * 3) * (RY / RX))
    this._dotGfx.stroke({ color: 0xaa44ff, width: 2, alpha: 0.7 + 0.3 * pulse })
  }

  /** Called when the server fires a skill:cooldown event for this player. */
  onCooldown({ skillIndex, durationMs }) {
    if (durationMs <= 0) return
    this._cooldownEnds[skillIndex] = { endTime: Date.now() + durationMs, totalMs: durationMs }
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
