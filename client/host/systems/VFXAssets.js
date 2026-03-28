/**
 * client/host/systems/VFXAssets.js
 * Factory registry mapping effect names → Graphics creation functions.
 * Swap point for later Sprite/pixel-art migration.
 */

import { Graphics, Container, Text } from 'pixi.js'

function parseColor(hex) {
  if (typeof hex === 'string') return parseInt(hex.replace('#', ''), 16)
  return hex ?? 0xffffff
}

const VFXAssets = {
  /**
   * Melee arc sweep — a filled arc wedge.
   * @returns Graphics
   */
  meleeArc(angle, range, color) {
    const g = new Graphics()
    const c = parseColor(color)
    const halfArc = Math.PI / 4 // 45° half-arc visual
    g.moveTo(0, 0)
    g.arc(0, 0, range, angle - halfArc, angle + halfArc)
    g.lineTo(0, 0)
    g.fill({ color: c, alpha: 0.5 })
    g.stroke({ color: c, width: 2, alpha: 0.8 })
    return g
  },

  /**
   * AOE expanding circle.
   * @returns Graphics
   */
  aoeCircle(radius, color) {
    const g = new Graphics()
    const c = parseColor(color)
    g.circle(0, 0, radius)
    g.fill({ color: c, alpha: 0.15 })
    g.stroke({ color: c, width: 2, alpha: 0.6 })
    return g
  },

  /**
   * Buff/aura ring around an entity.
   * @returns Graphics
   */
  buffRing(radius, color) {
    const g = new Graphics()
    const c = parseColor(color)
    g.circle(0, 0, radius)
    g.stroke({ color: c, width: 2, alpha: 0.6 })
    return g
  },

  /**
   * Status icon — small colored circle with a letter.
   * @returns Container
   */
  statusIcon(letter, color) {
    const cont = new Container()
    const bg = new Graphics()
    const c = parseColor(color)
    bg.circle(0, 0, 7)
    bg.fill({ color: c, alpha: 0.85 })
    bg.stroke({ color: 0xffffff, width: 1, alpha: 0.5 })
    cont.addChild(bg)

    const txt = new Text({
      text: letter,
      style: { fontFamily: 'Arial', fontSize: 9, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    txt.anchor.set(0.5, 0.5)
    cont.addChild(txt)
    return cont
  },

  /**
   * Impact flash — bright circle.
   * @returns Graphics
   */
  impactFlash(color) {
    const g = new Graphics()
    const c = parseColor(color)
    g.circle(0, 0, 12)
    g.fill({ color: c, alpha: 0.9 })
    return g
  },

  /**
   * Ground zone — semi-transparent filled circle with pulsing border.
   * @returns Graphics
   */
  groundZone(radius, color) {
    const g = new Graphics()
    const c = parseColor(color)
    g.circle(0, 0, radius)
    g.fill({ color: c, alpha: 0.12 })
    g.circle(0, 0, radius)
    g.stroke({ color: c, width: 2, alpha: 0.4 })
    return g
  },

  /**
   * Dash trail — a streaked line.
   * @returns Graphics
   */
  dashTrail(x1, y1, x2, y2, color) {
    const g = new Graphics()
    const c = parseColor(color)
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke({ color: c, width: 6, alpha: 0.6 })
    // Thinner bright core
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke({ color: 0xffffff, width: 2, alpha: 0.4 })
    return g
  },
}

export default VFXAssets
