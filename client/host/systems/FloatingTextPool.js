/**
 * client/host/systems/FloatingTextPool.js
 * Pre-allocated pool of Text objects for damage/heal floating numbers.
 * Numbers float upward and fade out over their lifetime.
 */

import { Text } from 'pixi.js'

const POOL_SIZE = 30
const FLOAT_DIST = 40    // px to float upward
const LIFETIME = 0.8     // seconds

export default class FloatingTextPool {
  constructor(layer) {
    this._layer = layer
    this._pool = []
    this._active = []

    // Pre-allocate text objects
    for (let i = 0; i < POOL_SIZE; i++) {
      const t = new Text({
        text: '',
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fontWeight: 'bold',
          fill: '#ffffff',
          stroke: { color: '#000000', width: 3 },
          align: 'center',
        },
      })
      t.anchor.set(0.5, 0.5)
      t.visible = false
      layer.addChild(t)
      this._pool.push(t)
    }
  }

  /**
   * Spawn a floating number at world position.
   * @param {number} x
   * @param {number} y
   * @param {number} amount
   * @param {'damage'|'heal'} type
   */
  spawn(x, y, amount, type = 'damage') {
    let t = this._pool.pop()
    if (!t) {
      // Recycle oldest active
      const oldest = this._active.shift()
      if (oldest) {
        oldest.text.visible = false
        t = oldest.text
      } else return
    }

    const displayAmount = Math.round(amount)
    if (type === 'blocked') {
      t.text = 'Blocked'
      t.style.fill = '#aaaaaa'
      t.scale.set(0.85)
    } else if (type === 'heal') {
      t.text = `+${displayAmount}`
      t.style.fill = '#2ecc71'
      t.scale.set(0.9)
    } else {
      t.text = `${displayAmount}`
      t.style.fill = '#ff4444'
      t.scale.set(1.0)
    }
    t.position.set(x + (Math.random() - 0.5) * 16, y)
    t.alpha = 1
    t.visible = true

    this._active.push({
      text: t,
      startX: t.x,
      startY: t.y,
      elapsed: 0,
    })
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      const entry = this._active[i]
      entry.elapsed += dt
      const progress = entry.elapsed / LIFETIME

      if (progress >= 1) {
        entry.text.visible = false
        this._pool.push(entry.text)
        this._active.splice(i, 1)
        continue
      }

      // Float upward
      entry.text.y = entry.startY - FLOAT_DIST * progress
      // Fade out in last 40%
      entry.text.alpha = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1
      // Scale pop at start
      if (progress < 0.1) {
        entry.text.scale.set(1 + (1 - progress / 0.1) * 0.3)
      }
    }
  }

  destroy() {
    this._active.forEach(e => e.text.destroy())
    this._pool.forEach(t => t.destroy())
    this._active = []
    this._pool = []
  }
}
