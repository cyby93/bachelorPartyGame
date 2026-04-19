/**
 * client/host/systems/OneShotEffectSystem.js
 * Short-lived visual effects on the fx layer: melee arcs, AOE flashes, dash trails, impact bursts.
 * Uses a simple pool of Graphics objects.
 */

import { Graphics } from 'pixi.js'

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
   * Tranquility field — 4.0s persistent pulsing green healing zone (matches castTime).
   * Fades in quickly, pulses gently throughout the channel, fades out at end.
   */
  tranquilityField(x, y, radius) {
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
      }
    })
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
