/**
 * client/host/systems/GroundEffectSystem.js
 * Persistent AOE zones on the groundFx layer.
 * Synced to server-broadcast aoeZones array.
 */

import { Graphics, BlurFilter } from 'pixi.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

// Visual themes keyed by skillName.
// layers: drawn largest-first (outer → inner) so inner circles paint on top.
const ZONE_THEMES = {
  'Flame Crash': {
    layers: [
      { r: 1.00, color: 0x4a1800, alpha: 0.16 },
      { r: 0.75, color: 0x7a2800, alpha: 0.16 },
      { r: 0.50, color: 0xa84400, alpha: 0.20 },
      { r: 0.28, color: 0xcc6600, alpha: 0.26 },
    ],
    glowBlur: 7, glowColor: 0xcc6600, glowR: 0.22, glowAlpha: 0.45,
    flicker: 'fire',
    borderColor: 0xff6600, borderWidth: 3, borderPulseSpeed: 7,
    particles: 'flameCrash',
  },
  'Blaze': {
    layers: [
      { r: 1.00, color: 0x3d1400, alpha: 0.15 },
      { r: 0.80, color: 0x7a2800, alpha: 0.16 },
      { r: 0.55, color: 0xa03800, alpha: 0.18 },
      { r: 0.32, color: 0xbb5500, alpha: 0.24 },
      { r: 0.15, color: 0xcc7700, alpha: 0.18 },
    ],
    glowBlur: 5, glowColor: 0xcc7700, glowR: 0.14, glowAlpha: 0.45,
    flicker: 'blaze',
    borderColor: 0xff8800, borderWidth: 2, borderPulseSpeed: 7,
    particles: 'blaze',
  },
  'Eye Beams': {
    layers: [
      { r: 1.00, color: 0x1a0a44, alpha: 0.25 },
      { r: 0.72, color: 0x2d1577, alpha: 0.24 },
      { r: 0.45, color: 0x4422aa, alpha: 0.28 },
      { r: 0.22, color: 0x5533bb, alpha: 0.35 },
    ],
    glowBlur: 7, glowColor: 0x5533bb, glowR: 0.25, glowAlpha: 0.50,
    flicker: 'felfire',
    borderColor: 0x7755ff, borderWidth: 2, borderPulseSpeed: 5,
    particles: 'eyeBeams',
  },
  'Consecration': {
    layers: [
      { r: 1.00, color: 0x956600, alpha: 0.25 },
    ],
    glowBlur: 6, glowColor: 0xddaa44, glowR: 0.25, glowAlpha: 0.72,
    flicker: 'holy',
    borderColor: 0xffcc00, borderWidth: 3, borderPulseSpeed: 3,
    particles: 'consecration',
  },
  'Death and Decay': {
    layers: [
      { r: 1.00, color: 0x1e2208, alpha: 0.28 },
      { r: 0.65, color: 0x344408, alpha: 0.25 },
      { r: 0.35, color: 0x485a0e, alpha: 0.22 },
    ],
    glowBlur: 0,
    flicker: 'deathrune',
    borderColor: 0x667711, borderWidth: 4, borderPulseSpeed: 2.5,
    particles: 'deathDecay',
  },
  'Freezing Trap': {
    layers: [
      { r: 1.00, color: 0x001133, alpha: 0.28 },
      { r: 0.65, color: 0x0066cc, alpha: 0.25 },
      { r: 0.35, color: 0x88ddff, alpha: 0.32 },
    ],
    glowBlur: 5, glowColor: 0xaaeeff, glowR: 0.22, glowAlpha: 0.72,
    flicker: 'ice',
    borderColor: 0x44ccff, borderWidth: 3, borderPulseSpeed: 2,
    particles: 'freezingTrap',
  },
}

// Pre-compute per-zone random values for flicker styles that need them.
function _buildFlickerState(skillName) {
  if (skillName === 'Flame Crash') {
    return {
      flames: Array.from({ length: 5 }, () => ({
        angle:     Math.random() * Math.PI * 2,
        distFrac:  0.25 + Math.random() * 0.45,
        phase:     Math.random() * Math.PI * 2,
        speedMult: 0.7 + Math.random() * 0.8,
        rFrac:     0.09 + Math.random() * 0.10,
      })),
    }
  }
  if (skillName === 'Eye Beams') {
    return {
      flames: Array.from({ length: 4 }, () => ({
        angle:     Math.random() * Math.PI * 2,
        distFrac:  0.15 + Math.random() * 0.50,
        phase:     Math.random() * Math.PI * 2,
        speedMult: 0.6 + Math.random() * 0.7,
        rFrac:     0.12 + Math.random() * 0.14,
      })),
    }
  }
  if (skillName === 'Blaze') {
    return {
      flames: Array.from({ length: 8 }, () => ({
        angle:     Math.random() * Math.PI * 2,
        distFrac:  0.15 + Math.random() * 0.60,
        phase:     Math.random() * Math.PI * 2,
        speedMult: 1.0 + Math.random() * 1.0,
        rFrac:     0.10 + Math.random() * 0.10,
        colorIdx:  Math.floor(Math.random() * 3),
      })),
    }
  }
  if (skillName === 'Consecration') {
    return {
      embers: Array.from({ length: 28 }, () => ({
        bearing:   Math.random() * Math.PI * 2,
        distFrac:  Math.random() * 0.85,
        phase:     Math.random() * Math.PI * 2,
        speedMult: 0.8 + Math.random() * 1.5,
        rFrac:     0.008 + Math.random() * 0.008,
      })),
    }
  }
  if (skillName === 'Death and Decay') {
    return {
      runes: Array.from({ length: 10 }, () => ({
        bearing:   Math.random() * Math.PI * 2,
        distFrac:  0.35 + Math.random() * 0.48,
        angle:     Math.random() * Math.PI * 2,
        phase:     Math.random() * Math.PI * 2,
        speedMult: 0.5 + Math.random() * 0.9,
        blood:     Math.random() < 0.35,
      })),
    }
  }
  return {}
}

const AMBIENT_INTERVAL = 0.18  // seconds between particle emits per zone

export default class GroundEffectSystem {
  constructor(layer, particles = null) {
    this._layer    = layer
    this._particles = particles
    this._zones    = new Map()  // id → zone object
    this._time     = 0
  }

  /**
   * Sync to server zone list. Creates, updates, and removes zones every frame.
   * @param {Array} serverZones - [{ id, x, y, radius, color, skillName, remaining, duration }]
   */
  sync(serverZones) {
    if (!serverZones) return

    const activeIds = new Set()

    for (const z of serverZones) {
      activeIds.add(z.id)
      let zone = this._zones.get(z.id)

      if (!zone) {
        zone = this._createZone(z)
        this._zones.set(z.id, zone)
      }

      // Reposition every frame for followOwner zones (e.g. Bladestorm)
      if (zone.x !== z.x || zone.y !== z.y) {
        zone.x = z.x
        zone.y = z.y
        zone.gfx.position.set(z.x, z.y)
        zone.flickerGfx.position.set(z.x, z.y)
        zone.borderGfx.position.set(z.x, z.y)
        if (zone.glowGfx) zone.glowGfx.position.set(z.x, z.y)
      }

      // Fade out in last 500ms
      const fadePct = z.remaining < 500 ? z.remaining / 500 : 1
      zone.gfx.alpha       = fadePct
      zone.flickerGfx.alpha = fadePct
      zone.borderGfx.alpha  = fadePct
      if (zone.glowGfx) zone.glowGfx.alpha = fadePct

      // Animate flicker + border
      if (zone.theme) {
        this._drawFlicker(zone)
        this._drawThemedBorder(zone)
      } else {
        this._drawDefaultBorder(zone)
      }
    }

    // Remove expired zones
    this._zones.forEach((zone, id) => {
      if (!activeIds.has(id)) {
        this._destroyZone(zone)
        this._zones.delete(id)
      }
    })
  }

  update(dt) {
    this._time += dt

    if (!this._particles) return
    this._zones.forEach(zone => {
      zone.emitAccum += dt
      if (zone.emitAccum < AMBIENT_INTERVAL) return
      zone.emitAccum -= AMBIENT_INTERVAL
      this._emitParticles(zone)
    })
  }

  // ─── Zone lifecycle ───────────────────────────────────────────────────────

  _createZone(z) {
    const theme        = ZONE_THEMES[z.skillName] ?? null
    const fallbackColor = parseColor(z.color)

    // Glow layer (bottom): blurred bright core — themed zones only
    let glowGfx = null
    if (theme?.glowBlur > 0) {
      glowGfx = new Graphics()
      glowGfx.circle(0, 0, z.radius * theme.glowR)
      glowGfx.fill({ color: theme.glowColor, alpha: theme.glowAlpha })
      glowGfx.filters = [new BlurFilter(theme.glowBlur)]
      glowGfx.position.set(z.x, z.y)
      this._layer.addChild(glowGfx)
    }

    // Fill layer: multi-layer concentric circles or plain fallback
    const gfx = new Graphics()
    if (theme) {
      // Draw outer layers first so inner ones paint on top
      for (const layer of theme.layers) {
        gfx.circle(0, 0, z.radius * layer.r)
        gfx.fill({ color: layer.color, alpha: layer.alpha })
      }
    } else {
      gfx.circle(0, 0, z.radius)
      gfx.fill({ color: fallbackColor, alpha: 0.20 })
    }
    gfx.position.set(z.x, z.y)
    this._layer.addChild(gfx)

    // Flicker layer: animated shapes cleared and redrawn every frame
    const flickerGfx = new Graphics()
    flickerGfx.position.set(z.x, z.y)
    this._layer.addChild(flickerGfx)

    // Border layer (top): pulsing ring
    const borderGfx = new Graphics()
    borderGfx.position.set(z.x, z.y)
    this._layer.addChild(borderGfx)

    return {
      gfx, glowGfx, flickerGfx, borderGfx,
      theme,
      flickerState: _buildFlickerState(z.skillName),
      color:        theme ? theme.borderColor : fallbackColor,
      hostile:      z.hostile ?? false,
      followOwner:  z.followOwner ?? false,
      radius:       z.radius,
      skillName:    z.skillName,
      x: z.x, y: z.y,
      emitAccum: 0,
    }
  }

  _destroyZone(zone) {
    this._layer.removeChild(zone.gfx)
    this._layer.removeChild(zone.flickerGfx)
    this._layer.removeChild(zone.borderGfx)
    zone.gfx.destroy()
    zone.flickerGfx.destroy()
    zone.borderGfx.destroy()
    if (zone.glowGfx) {
      zone.glowGfx.filters?.forEach(f => f.destroy?.())
      this._layer.removeChild(zone.glowGfx)
      zone.glowGfx.destroy()
    }
  }

  // ─── Border ───────────────────────────────────────────────────────────────

  _drawThemedBorder(zone) {
    const { theme, borderGfx, radius } = zone
    const pulse = 0.4 + 0.5 * Math.sin(this._time * theme.borderPulseSpeed)
    borderGfx.clear()
    borderGfx.circle(0, 0, radius)
    borderGfx.stroke({ color: theme.borderColor, width: theme.borderWidth, alpha: pulse })
    if (!zone.followOwner) this._drawTeamRing(zone)
  }

  _drawDefaultBorder(zone) {
    const pulse = 0.5 + 0.4 * Math.sin(this._time * 4)
    zone.borderGfx.clear()
    zone.borderGfx.circle(0, 0, zone.radius)
    zone.borderGfx.stroke({ color: zone.color, width: 3, alpha: pulse })
    if (!zone.followOwner) this._drawTeamRing(zone)
  }

  _drawTeamRing(zone) {
    const teamColor = zone.hostile ? 0xff3333 : 0x44ff88
    zone.borderGfx.circle(0, 0, zone.radius + 3)
    zone.borderGfx.stroke({ color: teamColor, width: 1.5, alpha: 0.55 })
  }

  // ─── Flicker ──────────────────────────────────────────────────────────────

  _drawFlicker(zone) {
    zone.flickerGfx.clear()
    const t = this._time
    switch (zone.theme?.flicker) {
      case 'fire':    this._drawFireFlicker(zone, t);    break
      case 'blaze':   this._drawBlazeFlicker(zone, t);   break
      case 'felfire': this._drawFelfireFlicker(zone, t); break
      case 'holy':   this._drawHolyFlicker(zone, t);   break
      case 'void':   this._drawVoidFlicker(zone, t);   break
      case 'ice':    this._drawIceFlicker(zone, t);    break
      case 'deathrune': this._drawDeathruneFlicker(zone, t); break
    }
  }

  // Fire: 5 glowing blobs that pulse inward/outward at independent speeds
  _drawFireFlicker(zone, t) {
    const { flickerGfx, flickerState, radius } = zone
    for (const fl of flickerState.flames) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 6 * fl.speedMult + fl.phase)
      const dist  = radius * fl.distFrac * pulse
      const cx    = Math.cos(fl.angle) * dist
      const cy    = Math.sin(fl.angle) * dist
      const fr    = radius * fl.rFrac * (0.7 + 0.5 * Math.abs(Math.sin(t * 9 * fl.speedMult + fl.phase + 1.2)))
      const color = Math.sin(t * 5 + fl.phase) > 0 ? 0xa84400 : 0xcc6600
      flickerGfx.circle(cx, cy, fr)
      flickerGfx.fill({ color, alpha: 0.35 })
    }
  }

  // Felfire: blue-purple fire blobs — Illidan Eye Beams ground fire
  _drawFelfireFlicker(zone, t) {
    const { flickerGfx, flickerState, radius } = zone
    for (const fl of flickerState.flames) {
      const pulse = 0.55 + 0.45 * Math.sin(t * 6 * fl.speedMult + fl.phase)
      const dist  = radius * fl.distFrac * pulse
      const cx    = Math.cos(fl.angle) * dist
      const cy    = Math.sin(fl.angle) * dist
      const fr    = radius * fl.rFrac * (0.7 + 0.5 * Math.abs(Math.sin(t * 9 * fl.speedMult + fl.phase + 1.2)))
      const color = Math.sin(t * 5 + fl.phase) > 0 ? 0x4422aa : 0x5533bb
      flickerGfx.circle(cx, cy, fr)
      flickerGfx.fill({ color, alpha: 0.32 })
    }
  }

  // Blaze: 8 chaotic blobs — faster, hotter, 3-color cycle (Flame of Azzinoth)
  _drawBlazeFlicker(zone, t) {
    const { flickerGfx, flickerState, radius } = zone
    const colors = [0x7a2800, 0xa03800, 0xbb5500]
    for (const fl of flickerState.flames) {
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * 7 * fl.speedMult + fl.phase))
      const dist  = radius * fl.distFrac * (0.6 + 0.4 * Math.sin(t * 5 * fl.speedMult + fl.phase + 0.8))
      const cx    = Math.cos(fl.angle + t * 0.4 * fl.speedMult) * dist
      const cy    = Math.sin(fl.angle + t * 0.4 * fl.speedMult) * dist
      const fr    = radius * fl.rFrac * (0.65 + 0.55 * Math.abs(Math.sin(t * 11 * fl.speedMult + fl.phase + 2.1)))
      const colorPhase = (Math.sin(t * 6 + fl.phase) + 1) * 1.5  // 0–3
      const color = colors[Math.min(2, Math.floor(colorPhase))]
      flickerGfx.circle(cx, cy, fr)
      flickerGfx.fill({ color, alpha: 0.40 })
    }
  }

  // Holy: tiny fixed embers scattered across the zone, each flickering independently
  _drawHolyFlicker(zone, t) {
    const { flickerGfx, flickerState, radius } = zone
    if (!flickerState.embers) return
    for (const em of flickerState.embers) {
      const alpha = 0.15 + 0.70 * Math.abs(Math.sin(t * 3 * em.speedMult + em.phase))
      const px = Math.cos(em.bearing) * radius * em.distFrac
      const py = Math.sin(em.bearing) * radius * em.distFrac
      flickerGfx.circle(px, py, radius * em.rFrac)
      flickerGfx.fill({ color: 0xffeeaa, alpha })
    }
  }

  // Void: concentric rings that collapse inward — energy sucked to center
  _drawVoidFlicker(zone, t) {
    const { flickerGfx, radius } = zone
    const fracs = [0.88, 0.68, 0.48]
    for (let i = 0; i < fracs.length; i++) {
      const progress = ((t * 0.5 + i * 0.33) % 1.0)
      const ringR    = radius * fracs[i] * (1 - progress)
      if (ringR < 2) continue
      const alpha = 0.12 + 0.15 * (1 - progress)
      flickerGfx.circle(0, 0, ringR)
      flickerGfx.stroke({ color: 0x9933ff, width: 1.5, alpha })
    }
  }

  // Ice: two hexagons rotating in opposite directions
  _drawIceFlicker(zone, t) {
    const { flickerGfx, radius } = zone
    const hexDefs = [
      { r: radius * 0.56, speed:  0.08 },
      { r: radius * 0.36, speed: -0.12 },
    ]
    for (const hex of hexDefs) {
      const rot    = t * hex.speed
      const points = []
      for (let i = 0; i < 6; i++) {
        const a = rot + i * Math.PI / 3
        points.push(Math.cos(a) * hex.r, Math.sin(a) * hex.r)
      }
      flickerGfx.poly(points)
      flickerGfx.stroke({ color: 0x88ddff, width: 1.5, alpha: 0.30 })
    }
  }

  // Death and Decay: pulsing skull in center + scattered runic etch marks
  _drawDeathruneFlicker(zone, t) {
    const { flickerGfx, flickerState, radius } = zone
    const rotCol   = 0x89a572  // putrid yellow-green
    const bloodCol = 0xaa1100  // dark blood red
    const skullAlpha = 0.30 + 0.20 * Math.sin(t * 1.2)

    // Skull cranium
    const headR = radius * 0.20
    flickerGfx.circle(0, -headR * 0.05, headR)
    flickerGfx.stroke({ color: rotCol, width: 1.5, alpha: skullAlpha })

    // Eye sockets — blood red
    const eyeR = headR * 0.20
    flickerGfx.circle(-headR * 0.33, -headR * 0.05, eyeR)
    flickerGfx.fill({ color: bloodCol, alpha: skullAlpha + 0.20 })
    flickerGfx.circle( headR * 0.33, -headR * 0.05, eyeR)
    flickerGfx.fill({ color: bloodCol, alpha: skullAlpha + 0.20 })

    // Jaw arc
    flickerGfx.arc(0, headR * 0.18, headR * 0.58, Math.PI * 0.12, Math.PI * 0.88)
    flickerGfx.stroke({ color: rotCol, width: 1.5, alpha: skullAlpha })

    // Runic etch marks — green or blood red
    if (!flickerState.runes) return
    for (const rn of flickerState.runes) {
      const col   = rn.blood ? bloodCol : rotCol
      const alpha = 0.18 + 0.42 * Math.abs(Math.sin(t * 1.8 * rn.speedMult + rn.phase))
      const px  = Math.cos(rn.bearing) * radius * rn.distFrac
      const py  = Math.sin(rn.bearing) * radius * rn.distFrac
      const len = radius * 0.055
      const ca  = Math.cos(rn.angle), sa = Math.sin(rn.angle)
      flickerGfx.moveTo(px - ca * len, py - sa * len)
      flickerGfx.lineTo(px + ca * len, py + sa * len)
      const ca2 = Math.cos(rn.angle + 0.6), sa2 = Math.sin(rn.angle + 0.6)
      flickerGfx.moveTo(px, py)
      flickerGfx.lineTo(px + ca2 * len * 0.65, py + sa2 * len * 0.65)
      flickerGfx.stroke({ color: col, width: 1, alpha })
    }
  }

  // ─── Particles ────────────────────────────────────────────────────────────

  _emitParticles(zone) {
    if (!this._particles || !zone.theme) return
    const p = this._particles
    const { x, y, radius } = zone
    switch (zone.theme.particles) {
      case 'flameCrash':   p.flameCrashAmbient(x, y, radius);   break
      case 'blaze':        p.blazeAmbient(x, y, radius);        break
      case 'eyeBeams':     p.eyeBeamsAmbient(x, y, radius);     break
      case 'consecration': p.consecrationAmbient(x, y, radius); break
      case 'deathDecay':   p.deathDecayAmbient(x, y, radius);   break
      case 'freezingTrap': p.freezingTrapAmbient(x, y, radius); break
    }
  }

  destroy() {
    this._zones.forEach(zone => this._destroyZone(zone))
    this._zones.clear()
  }
}
