/**
 * client/host/entities/EnemySprite.js
 * Visual for a single enemy, styled by archetype type.
 *
 * Shape / colour lookup:
 *   grunt   → triangle (red)         — existing default
 *   brute   → large circle (purple)
 *   archer  → diamond (orange)
 *   charger → arrow (bright red)
 *   healer  → cross (green)
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { GAME_CONFIG }    from '../../../shared/GameConfig.js'
import { ENEMY_TYPES }    from '../../../shared/EnemyTypeConfig.js'
import OverheadDisplay     from '../systems/OverheadDisplay.js'

const DEFAULT_R = GAME_CONFIG.ENEMY_RADIUS

// Maps server type string → sprite alias loaded in HostGame._loadSprites()
const ENEMY_SPRITE_KEY = {
  grunt:           'enemy_grunt',
  brute:           'enemy_brute',
  archer:          'enemy_archer',
  charger:         'enemy_charger',
  healer:          'enemy_healer',
  gateRepairer:    'enemy_gaterepairer',
  leviathan:       'enemy_leviathan',
  warlock:         'enemy_warlock',
  flameOfAzzinoth: 'enemy_flameofazzinoth',
  shadowDemon:     'enemy_shadowdemon',
  shadowfiend:     'enemy_shadowfiend',
}

export default class EnemySprite {
  constructor(data) {
    this.id   = data.id
    this.type = data.type ?? 'grunt'

    const typeCfg    = ENEMY_TYPES[this.type] ?? ENEMY_TYPES.grunt
    const R          = typeCfg.radius    ?? DEFAULT_R
    const displaySize = typeCfg.spriteSize ?? R * 2   // visual size, independent of hitbox
    const D          = displaySize / 2                // half display height for positioning
    const color      = typeCfg.color  ?? '#c0392b'

    this.container = new Container()

    // Body — sprite keyed by enemy type
    const spriteKey = ENEMY_SPRITE_KEY[this.type] ?? 'enemy_grunt'
    const body = new Sprite(Assets.get(spriteKey))
    body.anchor.set(0.5)
    body.width  = displaySize
    body.height = displaySize
    this.container.addChild(body)

    // HP pip (single thin bar)
    this._hpBg   = new Graphics()
    this._hpFill = new Graphics()

    this._hpBg.rect(-D, 0, D * 2, 3)
    this._hpBg.fill('#111111')
    this._hpBg.position.set(0, -D - 6)
    this._hpFill.position.set(0, -D - 6)

    this.container.addChild(this._hpBg)
    this.container.addChild(this._hpFill)

    this._R           = R
    this._displaySize = displaySize
    this._color       = color
    this._maxHp       = data.maxHp ?? typeCfg.hp ?? 30
    this._lastHp      = -1
    this._updateHpBar(data.hp ?? this._maxHp)

    // Overhead display (damage numbers only — no cast bar or status icons)
    this.overhead = new OverheadDisplay(this.container, {
      yOffset: -D - 6,
      showCastBar: false,
      showStatusIcons: false,
    })

    // Name label for training dummies (Idle / Ranged / Melee)
    if (data.dummyName) {
      const label = new Text({
        text:  data.dummyName,
        style: {
          fontFamily: 'Arial',
          fontSize:   12,
          fontWeight: 'bold',
          fill:       '#f1c40f',
          align:      'center',
        },
      })
      label.anchor.set(0.5, 1)
      label.position.set(0, -D - 18)
      this.container.addChild(label)
    }
  }

  _updateHpBar(hp) {
    if (hp === this._lastHp) return
    this._lastHp = hp
    const D = this._displaySize / 2

    const pct = Math.max(0, hp / this._maxHp)
    this._hpFill.clear()
    if (pct > 0) {
      this._hpFill.rect(-D, 0, D * 2 * pct, 3)
      this._hpFill.fill(this._color)
    }
  }

  update(state) {
    this.container.position.set(state.x, state.y)
    if (state.hp != null) this._updateHpBar(state.hp)
  }

  destroy() {
    this.overhead.destroy()
    this.container.destroy({ children: true })
  }
}
