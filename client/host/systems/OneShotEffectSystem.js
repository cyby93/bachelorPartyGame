/**
 * client/host/systems/OneShotEffectSystem.js
 * Short-lived visual effects on the fx layer: melee arcs, AOE flashes, dash trails, impact bursts.
 * Uses a simple pool of Graphics objects.
 */

import { Graphics } from 'pixi.js'
import { GAME_CONFIG } from '../../../shared/GameConfig.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

export default class OneShotEffectSystem {
  constructor(layer) {
    this._layer = layer
    this._active = []    // { gfx, elapsed, duration, update(progress) }
    this._pool = []
  }

  /**
   * Melee arc sweep — 0.15s animated arc that fades.
   */
  meleeArc(x, y, facing, range, color) {
    const c = parseColor(color)
    const duration = 0.15
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        // Sweep expands from narrow to full arc
        const halfArc = (Math.PI / 4) * Math.min(1, progress * 2)
        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range * (0.6 + 0.4 * progress), facing - halfArc, facing + halfArc)
        gfx.lineTo(0, 0)
        gfx.fill({ color: c, alpha: 0.4 * (1 - progress) })
        gfx.stroke({ color: 0xffffff, width: 2, alpha: 0.6 * (1 - progress) })
      }
    })
  }

  /**
   * Melee rect thrust — 0.15s oriented rectangle that lunges forward and fades.
   * Used for precise narrow attacks (Rogue Sinister Strike) where the hitbox is
   * a rectangle aligned to the aim direction rather than a cone.
   */
  meleeRect(x, y, facing, range, width, color) {
    const c = parseColor(color)
    const duration = 0.15
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    const fx = Math.cos(facing)    // forward axis
    const fy = Math.sin(facing)
    const lx = -Math.sin(facing)   // lateral axis (left perpendicular)
    const ly = Math.cos(facing)
    const hw = width / 2

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const front = range * (0.6 + 0.4 * progress)
        const fade  = 1 - progress

        // Oriented rectangle in local space
        const x0 =  lx * hw,              y0 =  ly * hw              // back-left
        const x1 = -lx * hw,              y1 = -ly * hw              // back-right
        const x2 = fx * front - lx * hw,  y2 = fy * front - ly * hw  // front-right
        const x3 = fx * front + lx * hw,  y3 = fy * front + ly * hw  // front-left

        // Filled body
        gfx.moveTo(x0, y0)
        gfx.lineTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.lineTo(x3, y3)
        gfx.closePath()
        gfx.fill({ color: c, alpha: 0.30 * fade })

        // Outer edge
        gfx.moveTo(x0, y0)
        gfx.lineTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.lineTo(x3, y3)
        gfx.closePath()
        gfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 * fade })

        // Bright leading edge — accentuates forward reach
        gfx.moveTo(x3, y3)
        gfx.lineTo(x2, y2)
        gfx.stroke({ color: 0xffffff, width: 3, alpha: 0.80 * fade })
      }
    })
  }

  /**
   * AOE flash — 0.5s expanding ring that fades.
   */
  aoeFlash(x, y, radius, color) {
    const c = parseColor(color)
    const duration = 0.5
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r = radius * (0.3 + 0.7 * progress)
        // Inner burst — fades in first 40% of animation
        if (progress < 0.4) {
          const bp = progress / 0.4
          gfx.circle(0, 0, r * 0.5)
          gfx.fill({ color: c, alpha: 0.5 * (1 - bp) })
        }
        // Expanding ring
        gfx.circle(0, 0, r)
        gfx.fill({ color: c, alpha: 0.35 * (1 - progress) })
        gfx.circle(0, 0, r)
        gfx.stroke({ color: c, width: 4, alpha: 0.9 * (1 - progress) })
      }
    })
  }

  /**
   * Dash trail — 0.2s streaked line.
   */
  dashTrail(x1, y1, x2, y2, color) {
    const c = parseColor(color)
    const duration = 0.2
    const gfx = this._getGfx()
    gfx.position.set(0, 0)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const alpha = 0.6 * (1 - progress)
        gfx.moveTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.stroke({ color: c, width: 6 * (1 - progress * 0.5), alpha })
        // Bright core
        gfx.moveTo(x1, y1)
        gfx.lineTo(x2, y2)
        gfx.stroke({ color: 0xffffff, width: 2, alpha: alpha * 0.7 })
      }
    })
  }

  /**
   * Frost Nova stamp — full-size icy blue circle that appears instantly and fades over 0.5s.
   */
  frostNovaRing(x, y, radius) {
    const duration = 0.5
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress

      // Ice spike radials — first 20% only
      if (progress < 0.2) {
        const spikeAlpha = 0.6 * (1 - progress / 0.2)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          gfx.moveTo(Math.cos(a) * radius * 0.6, Math.sin(a) * radius * 0.6)
          gfx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
        }
        gfx.stroke({ color: 0xffffff, width: 1, alpha: spikeAlpha })
      }

      // Filled icy circle — full size, fades out
      gfx.circle(0, 0, radius)
      gfx.fill({ color: 0x44aaff, alpha: 0.22 * fade })

      // Cyan inner ring
      gfx.circle(0, 0, radius - 5)
      gfx.stroke({ color: 0x88ffff, width: 2, alpha: 0.6 * fade })

      // White outer ring — crisp edge
      gfx.circle(0, 0, radius)
      gfx.stroke({ color: 0xffffff, width: 3, alpha: 0.95 * fade })
    }})
  }

  /**
   * Fear ring — 0.45s dark void pulse.
   * Violet outer ring with brief dark fill at center.
   */
  fearRing(x, y, radius) {
    const duration = 0.45
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r = radius * progress
      const fade = 1 - progress
      const strokeW = Math.max(1, 4 * (1 - progress * 0.5))

      if (progress < 0.3) {
        const bp = progress / 0.3
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0x220033, alpha: 0.25 * (1 - bp) })
      }

      if (r > 8) {
        gfx.circle(0, 0, r - 8)
        gfx.stroke({ color: 0x660099, width: strokeW, alpha: 0.5 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xaa44ff, width: strokeW + 2, alpha: 0.85 * fade })
    }})
  }

  /**
   * Consecration cast burst — 0.4s golden holy ring.
   * Persistent ground zone is handled separately by GroundEffectSystem.
   */
  consecrationBurst(x, y, radius) {
    const duration = 0.4
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r = radius * progress
      const fade = 1 - progress
      const strokeW = Math.max(1, 5 * (1 - progress * 0.6))

      if (progress < 0.4) {
        const bp = progress / 0.4
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0xffcc00, alpha: 0.2 * (1 - bp) })
      }

      if (r > 8) {
        gfx.circle(0, 0, r - 8)
        gfx.stroke({ color: 0xff9900, width: strokeW, alpha: 0.6 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xffcc00, width: strokeW + 2, alpha: 0.9 * fade })
      gfx.circle(0, 0, r + 3)
      gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.35 * fade })
    }})
  }

  /**
   * Bloodlust wave — 0.55s cascading triple-ring storm burst.
   * Three staggered rings (gold → orange → red) expand at increasing radii.
   */
  bloodlustWave(x, y) {
    const duration = 0.55
    const RINGS = [
      { delay: 0,    maxR: 80,  color: 0xffcc00, w: 4 },
      { delay: 0.12, maxR: 160, color: 0xff6600, w: 5 },
      { delay: 0.25, maxR: 280, color: 0xff2200, w: 6 },
    ]
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      for (const ring of RINGS) {
        const rp = Math.max(0, (progress - ring.delay) / (1 - ring.delay))
        if (rp <= 0) continue
        const r = ring.maxR * rp
        gfx.circle(0, 0, r)
        gfx.stroke({ color: ring.color, width: ring.w, alpha: 0.9 * (1 - rp) })
      }
    }})
  }

  /**
   * Mass Resurrection burst — 0.8s divine flash when the ability fires.
   * Holy cross beams + expanding white ring + central bloom.
   */
  massResurrectionRing(x, y) {
    const duration = 0.8
    const maxR = 200
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r    = maxR * progress
      const fade = 1 - progress

      // Central bloom — first 50%
      if (progress < 0.5) {
        const bp = progress / 0.5
        gfx.circle(0, 0, 15 + 40 * progress)
        gfx.fill({ color: 0xffffff, alpha: 0.55 * (1 - bp) })
        gfx.circle(0, 0, 8 + 20 * progress)
        gfx.fill({ color: 0xffffaa, alpha: 0.7 * (1 - bp) })
      }

      // Holy cross beams — first 40%, full arena reach
      if (progress < 0.4) {
        const beamAlpha = 0.65 * (1 - progress / 0.4)
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          gfx.moveTo(0, 0)
          gfx.lineTo(Math.cos(a) * 200, Math.sin(a) * 200)
        }
        gfx.stroke({ color: 0xffffff, width: 3, alpha: beamAlpha })
      }

      if (r > 10) {
        gfx.circle(0, 0, r - 8)
        gfx.stroke({ color: 0xffffaa, width: 2, alpha: 0.5 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xffffff, width: 3, alpha: 0.9 * fade })
    }})
  }

  /**
   * Fire Nova ring — 0.38s expanding fire ring for Agonizing Flames / Pyroblast AOE splash.
   * Orange inner ring + dark-red outer edge that expands to full splash radius.
   */
  fireNovaRing(x, y, radius) {
    const duration = 0.38
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r    = radius * progress
        const fade = 1 - progress
        const strokeW = Math.max(1, 4 * (1 - progress * 0.6))

        // Subtle inner heat fill — first 35% only
        if (progress < 0.35) {
          const bp = progress / 0.35
          gfx.circle(0, 0, r)
          gfx.fill({ color: 0xff6600, alpha: 0.08 * (1 - bp) })
        }

        // Ember inner ring — slightly tighter, deep orange
        if (r > 6) {
          gfx.circle(0, 0, r - 6)
          gfx.stroke({ color: 0xff4400, width: strokeW, alpha: 0.70 * fade })
        }

        // Bright orange-white outer ring — crisp leading edge
        gfx.circle(0, 0, r)
        gfx.stroke({ color: 0xff8800, width: strokeW + 2, alpha: 0.90 * fade })

        // Static boundary at full radius — shows exact splash edge throughout
        gfx.circle(0, 0, radius)
        gfx.stroke({ color: 0xff8800, width: 3, alpha: 0.75 * fade })
      }
    })
  }

  /**
   * Shadow Nova ring — 0.38s expanding void ring for Shadow Blast AOE splash.
   * Deep purple inner ring + violet outer edge that expands to full splash radius.
   */
  shadowNovaRing(x, y, radius) {
    const duration = 0.38
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r    = radius * progress
        const fade = 1 - progress
        const strokeW = Math.max(1, 4 * (1 - progress * 0.6))

        // Subtle void fill — first 35% only
        if (progress < 0.35) {
          const bp = progress / 0.35
          gfx.circle(0, 0, r)
          gfx.fill({ color: 0x330044, alpha: 0.10 * (1 - bp) })
        }

        // Deep purple inner ring
        if (r > 6) {
          gfx.circle(0, 0, r - 6)
          gfx.stroke({ color: 0x6600aa, width: strokeW, alpha: 0.65 * fade })
        }

        // Violet outer ring — sharp leading edge
        gfx.circle(0, 0, r)
        gfx.stroke({ color: 0xaa44ff, width: strokeW + 2, alpha: 0.85 * fade })

        // Static boundary at full radius — shows exact splash edge throughout
        gfx.circle(0, 0, radius)
        gfx.stroke({ color: 0xaa44ff, width: 3, alpha: 0.70 * fade })
      }
    })
  }

  /**
   * Explosion burst — 0.3s sharp fire ring for trap detonations.
   */
  explosionBurst(x, y, radius) {
    const duration = 0.3
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r = radius * (0.2 + 0.8 * progress)
      const fade = 1 - progress

      if (progress < 0.4) {
        const bp = progress / 0.4
        gfx.circle(0, 0, r * 0.6)
        gfx.fill({ color: 0xffffff, alpha: 0.7 * (1 - bp) })
        gfx.circle(0, 0, r * 0.9)
        gfx.fill({ color: 0xff6600, alpha: 0.4 * (1 - bp) })
      }

      if (r > 10) {
        gfx.circle(0, 0, r - 8)
        gfx.stroke({ color: 0xff2200, width: 3, alpha: 0.7 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xffcc00, width: Math.max(1, 5 * fade), alpha: 0.9 * fade })
    }})
  }

  /**
   * Freezing trap burst — 0.45s slow-expanding ice ring for Freezing Trap detonations.
   * Communicates the slow zone area; cold spread feeling rather than violent pop.
   */
  freezingTrapBurst(x, y, radius) {
    const duration = 0.45
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r = radius * (0.15 + 0.85 * progress)
      const fade = 1 - progress

      // Inner frost fill — fades quickly, conveys the freeze origin
      if (progress < 0.5) {
        const bp = progress / 0.5
        gfx.circle(0, 0, r * 0.55)
        gfx.fill({ color: 0xffffff, alpha: 0.55 * (1 - bp) })
        gfx.circle(0, 0, r * 0.85)
        gfx.fill({ color: 0x00ccff, alpha: 0.25 * (1 - bp) })
      }

      // Secondary inner ring — shows exact slow edge faintly
      if (r > 10) {
        gfx.circle(0, 0, r - 6)
        gfx.stroke({ color: 0x88ddff, width: 2, alpha: 0.55 * fade })
      }

      // Main expanding ice ring — dominant visual
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0x00ccff, width: Math.max(1, 4 * fade), alpha: 0.9 * fade })

      // Outer soft glow halo — reinforces the cold aura feel
      gfx.circle(0, 0, r + 5)
      gfx.stroke({ color: 0x88ddff, width: 2, alpha: 0.3 * fade })
    }})
  }

  /**
   * Moonfire beam — 0.25s column that shrinks its full width to zero over its lifetime.
   * Both top and bottom edges narrow symmetrically toward the centre line.
   */
  moonfireBeam(x, y) {
    const duration = 0.5
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade  = 1 - progress
      const w     = 9 * fade   // half-width: starts at 9px, collapses to 0
      const beamH = 140
      if (w < 0.4) return
      // Outer glow column
      gfx.moveTo(-w * 1.5, -beamH); gfx.lineTo(w * 1.5, -beamH)
      gfx.lineTo(w * 1.5, 0);       gfx.lineTo(-w * 1.5, 0)
      gfx.closePath()
      gfx.fill({ color: 0x4488ff, alpha: 0.28 * fade })
      // Main beam
      gfx.moveTo(-w, -beamH); gfx.lineTo(w, -beamH)
      gfx.lineTo(w, 0);       gfx.lineTo(-w, 0)
      gfx.closePath()
      gfx.fill({ color: 0x88ccff, alpha: 0.80 * fade })
      // Bright core
      gfx.moveTo(-w * 0.35, -beamH); gfx.lineTo(w * 0.35, -beamH)
      gfx.lineTo(w * 0.35, 0);       gfx.lineTo(-w * 0.35, 0)
      gfx.closePath()
      gfx.fill({ color: 0xddeeff, alpha: 0.92 * fade })
    }})
  }

  /**
   * Tranquility field — 4.0s persistent pulsing green healing zone (matches castTime).
   * Fades in quickly, pulses gently throughout the channel, fades out at end.
   * Optional emitFn called each frame for continuous particle emission.
   */
  tranquilityField(x, y, radius, emitFn) {
    const duration = 4.0
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    const entry = { gfx, elapsed: 0, duration, update: null }
    entry.update = (progress) => {
      gfx.clear()
      const fadeIn  = Math.min(1, progress / 0.08)
      const fadeOut = progress > 0.85 ? (1 - progress) / 0.15 : 1
      const env     = fadeIn * fadeOut
      const pulse   = 0.5 + 0.3 * Math.sin(entry.elapsed * Math.PI * 1.5)

      gfx.circle(0, 0, radius)
      gfx.fill({ color: 0x22ff88, alpha: 0.04 * env })
      gfx.circle(0, 0, radius)
      gfx.stroke({ color: 0x44ff88, width: 3, alpha: 0.45 * pulse * env })
      gfx.circle(0, 0, radius - 10)
      gfx.stroke({ color: 0x22ddaa, width: 1, alpha: 0.25 * pulse * env })

      emitFn?.()
    }
    this._active.push(entry)
  }

  /**
   * Holy Nova ring — 0.35s expanding shockwave for Priest Holy Nova.
   * Two-layer ring (white outer + gold inner) that expands to full AOE radius.
   */
  holyNovaRing(x, y, radius) {
    const duration = 0.35
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r    = radius * progress
        const fade = 1 - progress
        const strokeW = Math.max(1, 4 * (1 - progress * 0.6))

        // Subtle inner glow fill — first 35% only
        if (progress < 0.35) {
          const bp = progress / 0.35
          gfx.circle(0, 0, r)
          gfx.fill({ color: 0xffffcc, alpha: 0.07 * (1 - bp) })
        }

        // Gold inner ring — slightly tighter
        if (r > 6) {
          gfx.circle(0, 0, r - 6)
          gfx.stroke({ color: 0xffdd44, width: strokeW, alpha: 0.65 * fade })
        }

        // White outer ring — sharp leading edge
        gfx.circle(0, 0, r)
        gfx.stroke({ color: 0xffffff, width: strokeW + 2, alpha: 0.85 * fade })

        if (GAME_CONFIG.DEBUG_HITBOXES) {
          // Hitbox boundary — cyan circle at full radius, constant so it's always readable
          gfx.circle(0, 0, radius)
          gfx.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.7 })
        }
      }
    })
  }

  /**
   * Blood Prophet buff pulse — 0.6s dark crimson expanding ring, radius = buff radius.
   */
  bloodProphetBuff(x, y, radius) {
    const duration = 0.6
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress
      const r = radius * progress

      // Central inner bloom — first 30%
      if (progress < 0.3) {
        const bp = progress / 0.3
        gfx.circle(0, 0, 35 * bp)
        gfx.fill({ color: 0x8B0000, alpha: 0.25 * (1 - bp) })
      }

      if (r > 10) {
        gfx.circle(0, 0, r - 10)
        gfx.stroke({ color: 0x660000, width: 2, alpha: 0.45 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xcc2200, width: 3, alpha: 0.80 * fade })
      gfx.circle(0, 0, r + 4)
      gfx.stroke({ color: 0xff4444, width: 1, alpha: 0.35 * fade })
    }})
  }

  /**
   * Blood Prophet teleport blink — 0.25s ring implosion at origin.
   */
  bloodProphetTeleport(x, y) {
    const duration = 0.25
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const r = 50 * (1 - progress)
      if (r > 2) {
        gfx.circle(0, 0, r)
        gfx.stroke({ color: 0x8B0000, width: 3, alpha: 0.9 * (1 - progress) })
        gfx.circle(0, 0, r * 0.55)
        gfx.stroke({ color: 0xff2200, width: 2, alpha: 0.55 * (1 - progress) })
      }
      // Small flash at the very end
      if (progress > 0.7) {
        const fp = (progress - 0.7) / 0.3
        gfx.circle(0, 0, 14 * fp)
        gfx.fill({ color: 0x8B0000, alpha: 0.5 * (1 - fp) })
      }
    }})
  }

  /**
   * Enemy healer pulse — 0.5s soft purple expanding ring, radius = heal radius.
   */
  enemyHealPulse(x, y, radius) {
    const duration = 0.5
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress
      const r = radius * progress

      // Soft fill at start
      if (progress < 0.25) {
        const bp = progress / 0.25
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0x7b4f9e, alpha: 0.06 * (1 - bp) })
      }

      if (r > 8) {
        gfx.circle(0, 0, r - 8)
        gfx.stroke({ color: 0x5a3080, width: 2, alpha: 0.45 * fade })
      }
      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0x9b6fbe, width: 3, alpha: 0.75 * fade })
      gfx.circle(0, 0, r + 4)
      gfx.stroke({ color: 0xccaaff, width: 1, alpha: 0.35 * fade })
    }})
  }

  /**
   * Impact flash — 0.1s bright circle burst.
   */
  impactFlash(x, y, color) {
    const c = parseColor(color)
    const duration = 0.1
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1
    gfx.scale.set(1)

    this._active.push({
      gfx,
      elapsed: 0,
      duration,
      update: (progress) => {
        gfx.clear()
        const r = 8 + 12 * progress
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0xffffff, alpha: 0.8 * (1 - progress) })
        gfx.circle(0, 0, r * 0.6)
        gfx.fill({ color: c, alpha: 0.6 * (1 - progress) })
      }
    })
  }

  /**
   * Thunder Clap stamp — full-size golden circle that appears instantly and fades over 0.4s.
   * Models Frost Nova pattern: instant stamp at radius, no expansion.
   */
  thunderClapRing(x, y, radius) {
    const duration = 0.4
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress

      // Ground crack radials — first 25% only
      if (progress < 0.25) {
        const crackAlpha = 0.7 * (1 - progress / 0.25)
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          gfx.moveTo(Math.cos(a) * radius * 0.55, Math.sin(a) * radius * 0.55)
          gfx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
        }
        gfx.stroke({ color: 0xffee00, width: 1.5, alpha: crackAlpha })
      }

      // Filled golden circle — full size, fades out
      gfx.circle(0, 0, radius)
      gfx.fill({ color: 0xffcc00, alpha: 0.18 * fade })

      // Inner ring
      gfx.circle(0, 0, radius - 5)
      gfx.stroke({ color: 0xffaa00, width: 2, alpha: 0.55 * fade })

      // White-gold outer ring — crisp edge
      gfx.circle(0, 0, radius)
      gfx.stroke({ color: 0xffee00, width: 3, alpha: 0.95 * fade })

      if (GAME_CONFIG.DEBUG_HITBOXES) {
        // Hitbox boundary — cyan circle matches server distance check exactly
        gfx.circle(0, 0, radius)
        gfx.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.7 })
      }
    }})
  }

  /**
   * Bloodlust periodic pulse — 0.6s red ring that expands from player body, signals active buff.
   */
  bloodlustPulseRing(x, y) {
    const duration = 0.7
    const minR = 30, maxR = 140
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const ease = 1 - Math.pow(1 - progress, 2)  // ease-out
      const r    = minR + (maxR - minR) * ease
      const fade = 1 - progress

      // Warm fill at the start
      if (progress < 0.3) {
        const fp = progress / 0.3
        gfx.circle(0, 0, r)
        gfx.fill({ color: 0xff2200, alpha: 0.12 * (1 - fp) })
      }

      gfx.circle(0, 0, r)
      gfx.stroke({ color: 0xff2200, width: 4, alpha: 0.85 * fade })
      gfx.circle(0, 0, r + 5)
      gfx.stroke({ color: 0xff6600, width: 1.5, alpha: 0.45 * fade })
    }})
  }

  /**
   * Icebound Fortitude — 0.55s DK ice crystal burst.
   * 8 ice spikes radiate outward, crystal ring forms, then fades.
   */
  iceboundFortitude(x, y) {
    const duration = 0.55
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)
    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress

      // Crystal blue center bloom — first 30%
      if (progress < 0.3) {
        const bp = progress / 0.3
        gfx.circle(0, 0, 18 + 22 * progress)
        gfx.fill({ color: 0xaaeeff, alpha: 0.45 * (1 - bp) })
        gfx.circle(0, 0, 10 + 10 * progress)
        gfx.fill({ color: 0xffffff, alpha: 0.65 * (1 - bp) })
      }

      // 8 ice spike radials
      const spikeReach = 55 * Math.min(1, progress * 2.5)
      const spikeAlpha = progress < 0.4
        ? progress / 0.4
        : 0.85 * (1 - (progress - 0.4) / 0.6)
      for (let i = 0; i < 8; i++) {
        const a    = (i / 8) * Math.PI * 2
        const base = 18
        const tip  = base + spikeReach
        gfx.moveTo(Math.cos(a) * base, Math.sin(a) * base)
        gfx.lineTo(Math.cos(a) * tip,  Math.sin(a) * tip)
        gfx.stroke({ color: 0xaaeeff, width: 3, alpha: spikeAlpha })
        // Crystal tip facet
        if (tip > 25) {
          const pa = a + 0.3, pb = a - 0.3
          gfx.moveTo(Math.cos(pa) * (tip - 8), Math.sin(pa) * (tip - 8))
          gfx.lineTo(Math.cos(a)  * tip,       Math.sin(a)  * tip)
          gfx.lineTo(Math.cos(pb) * (tip - 8), Math.sin(pb) * (tip - 8))
          gfx.stroke({ color: 0xffffff, width: 1.5, alpha: spikeAlpha * 0.7 })
        }
      }

      // Outer crystal ring
      const ringR = 18 + spikeReach * 0.55
      if (ringR > 20) {
        gfx.circle(0, 0, ringR)
        gfx.stroke({ color: 0x55ddff, width: 2.5, alpha: 0.7 * fade })
        gfx.circle(0, 0, ringR + 5)
        gfx.stroke({ color: 0xffffff, width: 1, alpha: 0.25 * fade })
      }
    }})
  }

  /**
   * Warrior Cleave sweep — blade rotates from the left edge of the cone to the
   * right edge, leaving a fading red-orange trail. The swept region exactly
   * matches the server hitbox cone.
   * @param {number} halfAngle  half the cone width in radians (e.g. Math.PI/2 for 180°)
   */
  cleaveWipe(x, y, facing, halfAngle, range) {
    const duration   = 0.22
    const SWEEP_END  = 0.80   // sweep completes at 80%; remainder is fade-out
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)

    const startAngle = facing - halfAngle
    const endAngle   = facing + halfAngle

    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()

      if (progress < SWEEP_END) {
        const sweepP    = progress / SWEEP_END
        const sweepEdge = startAngle + (endAngle - startAngle) * sweepP
        const fade      = 1 - sweepP * 0.35

        // Swept fill behind blade
        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range, startAngle, sweepEdge)
        gfx.lineTo(0, 0)
        gfx.fill({ color: 0xff3300, alpha: 0.28 * fade })

        // Swept arc outline
        gfx.moveTo(Math.cos(startAngle) * range, Math.sin(startAngle) * range)
        gfx.arc(0, 0, range, startAngle, sweepEdge)
        gfx.stroke({ color: 0xff7744, width: 1.5, alpha: 0.45 * fade })

        // Blade radial line — bright white leading edge
        gfx.moveTo(0, 0)
        gfx.lineTo(Math.cos(sweepEdge) * range, Math.sin(sweepEdge) * range)
        gfx.stroke({ color: 0xffffff, width: 2.5, alpha: 0.90 * fade })

        // Blade tip highlight — short bright arc at leading edge
        const tipW     = 0.18
        const tipStart = Math.max(startAngle, sweepEdge - tipW)
        gfx.moveTo(Math.cos(tipStart) * range, Math.sin(tipStart) * range)
        gfx.arc(0, 0, range, tipStart, sweepEdge)
        gfx.stroke({ color: 0xffffff, width: 3, alpha: 0.90 * fade })

      } else {
        // Fade-out: full cone dissolves
        const fadeP = (progress - SWEEP_END) / (1 - SWEEP_END)
        const fade  = 1 - fadeP

        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range, startAngle, endAngle)
        gfx.lineTo(0, 0)
        gfx.fill({ color: 0xff3300, alpha: 0.22 * fade })

        gfx.moveTo(Math.cos(startAngle) * range, Math.sin(startAngle) * range)
        gfx.arc(0, 0, range, startAngle, endAngle)
        gfx.stroke({ color: 0xff7744, width: 1.5, alpha: 0.38 * fade })
      }

      if (GAME_CONFIG.DEBUG_HITBOXES) {
        // Hitbox boundary — cyan cone outline matches server inCone geometry exactly
        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range, startAngle, endAngle)
        gfx.lineTo(0, 0)
        gfx.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.7 })
      }
    }})
  }

  /**
   * Paladin Hammer Swing stamp — golden cone appears at full size instantly,
   * crack lines radiate along the arc, then fades. Communicates a focused slam.
   * @param {number} halfAngle  half the cone width in radians (e.g. Math.PI/4 for 90°)
   */
  hammerStamp(x, y, facing, halfAngle, range) {
    const duration = 0.22
    const gfx = this._getGfx()
    gfx.position.set(x, y)
    gfx.alpha = 1; gfx.scale.set(1)

    const startAngle = facing - halfAngle
    const endAngle   = facing + halfAngle

    this._active.push({ gfx, elapsed: 0, duration, update: (progress) => {
      gfx.clear()
      const fade = 1 - progress

      // Cone fill — full size instantly
      gfx.moveTo(0, 0)
      gfx.arc(0, 0, range, startAngle, endAngle)
      gfx.lineTo(0, 0)
      gfx.fill({ color: 0xffd700, alpha: 0.38 * fade })

      // Arc outer edge — bright gold
      gfx.moveTo(Math.cos(startAngle) * range, Math.sin(startAngle) * range)
      gfx.arc(0, 0, range, startAngle, endAngle)
      gfx.stroke({ color: 0xffe966, width: 2.5, alpha: 0.95 * fade })

      // Radial side edges
      gfx.moveTo(0, 0)
      gfx.lineTo(Math.cos(startAngle) * range, Math.sin(startAngle) * range)
      gfx.moveTo(0, 0)
      gfx.lineTo(Math.cos(endAngle) * range, Math.sin(endAngle) * range)
      gfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.60 * fade })

      // Crack lines radiating along the cone — first 35% only
      if (progress < 0.35) {
        const crackFade = 1 - progress / 0.35
        for (let i = 0; i < 4; i++) {
          const t = (i + 0.5) / 4
          const a = startAngle + (endAngle - startAngle) * t
          gfx.moveTo(Math.cos(a) * range * 0.45, Math.sin(a) * range * 0.45)
          gfx.lineTo(Math.cos(a) * range * 1.10, Math.sin(a) * range * 1.10)
        }
        gfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.75 * crackFade })
      }

      // Bright inner highlight at cone tip — slam impact feel, first 25% only
      if (progress < 0.25) {
        const fp = 1 - progress / 0.25
        gfx.moveTo(0, 0)
        gfx.arc(0, 0, range * 0.3, startAngle, endAngle)
        gfx.lineTo(0, 0)
        gfx.fill({ color: 0xffffff, alpha: 0.32 * fp })
      }

      // Hitbox boundary — cyan cone outline matches server inCone geometry exactly
      gfx.moveTo(0, 0)
      gfx.arc(0, 0, range, startAngle, endAngle)
      gfx.lineTo(0, 0)
      gfx.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.7 })
    }})
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const fx = this._active[i]
      fx.elapsed += dt
      const progress = Math.min(1, fx.elapsed / fx.duration)

      if (progress >= 1) {
        fx.gfx.clear()
        fx.gfx.visible = false
        this._pool.push(fx.gfx)
        this._active.splice(i, 1)
        continue
      }

      fx.update(progress)
    }
  }

  destroy() {
    this._active.forEach(fx => { fx.gfx.destroy() })
    this._pool.forEach(gfx => gfx.destroy())
    this._active = []
    this._pool = []
  }

  _getGfx() {
    let gfx = this._pool.pop()
    if (!gfx) {
      gfx = new Graphics()
      this._layer.addChild(gfx)
    }
    gfx.clear()
    gfx.visible = true
    return gfx
  }
}
