/**
 * client/host/scenes/BattleRenderer.js
 *
 * Canvas display for all combat levels.
 *
 * Supports multiple objective types driven by level config:
 *   - killCount  → progress bar
 *   - survive    → countdown timer
 *   - killBoss   → boss HP bar
 *
 * Extends BaseRenderer — only contains battle-specific logic:
 *   boss, minion, tombstone rendering; hit sparks; aura sync; mode UI.
 */

import { Container, Graphics, Text, Sprite, Assets } from 'pixi.js'
import { GAME_CONFIG }  from '../../../shared/GameConfig.js'
import { CLASSES }      from '../../../shared/ClassConfig.js'
import BossSprite       from '../entities/BossSprite.js'
import BaseRenderer     from './BaseRenderer.js'
import { DIRECTIONAL_NPCS, DIRECTIONAL_NPC_ANIMATIONS } from '../HostGame.js'
import { ILLIDAN_CONFIG, ILLIDAN_PHASE } from '../../../shared/IllidanConfig.js'
import { SHADE_OF_AKAMA_CONFIG }         from '../../../shared/ShadeOfAkamaConfig.js'

const BOSS_CONFIG_BY_NAME = {
  [ILLIDAN_CONFIG.name]:        ILLIDAN_CONFIG,
  [SHADE_OF_AKAMA_CONFIG.name]: SHADE_OF_AKAMA_CONFIG,
}

const _NPC_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east']
function _npcAngleToDir(angle) {
  const TAU  = Math.PI * 2
  const norm = ((angle % TAU) + TAU) % TAU
  return _NPC_DIRS[Math.round(norm / (Math.PI / 4)) % 8]
}

export default class BattleRenderer extends BaseRenderer {
  constructor(game, mode) {
    super(game)
    this.mode = mode   // 'battle' | 'bossFight'

    // Sub-containers in Z order: minions behind enemies behind boss; players on top
    this.minionContainer = new Container()
    this.enemyContainer  = new Container()
    this.bossContainer   = new Container()
    this._entityRoot.addChild(this.minionContainer, this.enemyContainer, this.bossContainer)

    this.bossSprite   = null
    this.npcGfx       = new Map()   // npcId → { container, body, hpFill, nameLabel }
    this.tombstoneGfx = new Map()   // playerId → Graphics
    this.gateGfx      = new Map()   // gateId → { container, hpGfx, bodyGfx? }
    this.buildingGfx  = new Map()   // buildingId → Graphics

    // Previous-frame HP tracking for hit sparks and death bursts
    this._prevPlayerHp = {}


    // Per-player cooldown tracking for the self-highlight feature
    this._highlightCooldowns = new Map()   // playerId → last trigger timestamp

    // Level metadata (set from outside via setLevelMeta before enter, or via event)
    this._levelMeta = null

    // Objective progress received from server
    this._objectives = []

    // Eye beam line graphics (Illidan Phase 2)
    this._eyeBeamGfx   = new Graphics()
    this._entityRoot.addChild(this._eyeBeamGfx)

    // Warglaive throw sprites (Illidan Phase 2 transition)
    this._warglaiveSprites = []

    // Warlock channeling beams (Level 5 Phase 1: warlocks → Shade)
    this._warlockBeamGfx = new Graphics()
    this._entityRoot.addChild(this._warlockBeamGfx)
    this._warlockBeamTime = 0

    // Healing pylons (Level 5 Phase 2)
    this.pylonGfx       = new Map()   // pylonId → { container, chargeArc }
    this._pylonBeamGfx  = new Graphics()
    this._entityRoot.addChild(this._pylonBeamGfx)
    this._pylonTime     = 0

    // Level 2: Portal Beam graphics
    this._portalBeamGfx  = new Graphics()
    this._entityRoot.addChild(this._portalBeamGfx)
    this._portalBeams    = new Map()  // beamId → { points, phase: 'warning'|'damage', time }
    this._mirrorGfx      = new Graphics()
    this._entityRoot.addChild(this._mirrorGfx)

    // Phase transition flash
    this._phaseFlashGfx    = new Graphics()
    this._phaseFlashAlpha  = 0
    this._phaseFlashText   = null

    // Level transition overlay (fade-in on open, fade-to-black on close)
    this._transitionOverlay = null
    this._transitionAlpha   = 0    // current applied alpha (persists across resize)
    this._fadeState         = null // { dir: 'in'|'out', speed: number, done: bool, onComplete? }

    // Level 6 closing cinematic graphics
    this._cinematicGfx      = new Graphics()
    this._cinematicOverlay  = new Graphics()   // guidance arrows + item icons
    this._entityRoot.addChild(this._cinematicGfx)
    this._entityRoot.addChild(this._cinematicOverlay)
    this._cinematicCell     = null   // { x, y, width, height, doorOpen }
    this._cinematicPickups  = []     // [{ id, type, x, y, isPickedUp }]
    this._cinematicBride    = null   // { x, y, state, walkStart, walkDuration, startX, startY, targetX, targetY }
    this._dancingPlayerIds  = new Set()
    this._cinematicTime     = 0      // elapsed ms for animation drivers
    this._pickupSpawnTimes  = {}     // itemId → timestamp, for pop-in
    this._itemHolders       = {}     // playerId → itemType
    this._pickupSpriteMap   = new Map() // itemId → Sprite
    this._holderIconSprites = new Map() // playerId → Sprite (item icon above head)
    this._ringFlyAnim       = null   // { spr, startX, startY, targetX, targetY, startMs, durationMs }
    this._cellSprite        = null   // Sprite for cell_structure asset
    this._brideEntry        = null   // { container, body, _animState, _animFrame, _animTimer, _lastAnimFrame }
  }

  // ── Transition lifecycle ──────────────────────────────────────────────────

  enter() {
    this._transitionAlpha = 0
    this._fadeState       = null
    super.enter()

    const fadeInMs = this._levelMeta?.transition?.opening?.fadeInMs
    if (fadeInMs > 0) {
      this._transitionAlpha = 1
      if (this._transitionOverlay) this._transitionOverlay.alpha = 1
      this._fadeState = { dir: 'in', speed: 1 / (fadeInMs / 1000), done: false }
    }
  }

  onLevelVictory(_data) {
    const fadeOutMs = this._levelMeta?.transition?.closing?.fadeOutMs ?? 1500
    this._fadeState = { dir: 'out', speed: 1 / (fadeOutMs / 1000), done: false }
  }

  onTransitionVfx(_data) {
    // stub — named VFX hooks wired here in future passes
  }

  /** Called by HostGame before enter() to pass level-specific data. */
  setLevelMeta(meta) {
    this._levelMeta = meta
    this._objectives = meta?.objectives ?? []
  }

  /** Called each time the server sends OBJECTIVE_UPDATE. */
  updateObjectives(objectives) {
    this._objectives = objectives ?? []
  }

  // ── Container routing ──────────────────────────────────────────────────────

  get _enemyContainer() { return this.enemyContainer }
  get _minionContainer() { return this.minionContainer }

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  _onBeforeExit() {
    if (this.bossSprite) {
      this.bossSprite.destroy()
      this.bossSprite = null
    }
    this.npcGfx.forEach(entry => entry.container.destroy({ children: true }))
    this.npcGfx.clear()
    this.tombstoneGfx.forEach(gfx => gfx.destroy())
    this.tombstoneGfx.clear()
    this.gateGfx.forEach(entry => entry.container.destroy({ children: true }))
    this.gateGfx.clear()
    this.buildingGfx.forEach(entry => entry.container.destroy({ children: true }))
    this.buildingGfx.clear()

    this._prevPlayerHp = {}
    this._levelMeta = null
    this._objectives = []

    // Transition overlay
    this._fadeState       = null
    this._transitionAlpha = 0

    // Warglaive throw sprites
    for (const s of this._warglaiveSprites) {
      if (s.parent) s.parent.removeChild(s)
      s.destroy({ children: true })
    }
    this._warglaiveSprites = []

    // Eye beams
    this._eyeBeamGfx.clear()

    // Warlock beams
    this._warlockBeamGfx.clear()
    this._warlockBeamTime = 0

    // Pylons
    this.pylonGfx.forEach(e => e.container.destroy({ children: true }))
    this.pylonGfx.clear()
    this._pylonBeamGfx.clear()
    this._pylonTime = 0

    // Portal beams
    this._portalBeamGfx.clear()
    this._mirrorGfx.clear()
    this._portalBeams.clear()

    // Closing cinematic
    this._cinematicGfx.clear()
    this._cinematicOverlay.clear()
    this._cinematicCell    = null
    this._cinematicPickups = []
    this._cinematicBride   = null
    this._dancingPlayerIds.clear()
    this._cinematicTime    = 0
    this._pickupSpawnTimes = {}
    this._itemHolders      = {}
    this._pickupSpriteMap.forEach(spr => spr.destroy())
    this._pickupSpriteMap.clear()
    this._holderIconSprites.forEach(spr => spr.destroy())
    this._holderIconSprites.clear()
    if (this._ringFlyAnim) { this._ringFlyAnim.spr.destroy(); this._ringFlyAnim = null }
    if (this._cellSprite) {
      this._cellSprite.destroy()
      this._cellSprite = null
    }
    if (this._brideEntry) {
      this._brideEntry.container.destroy({ children: true })
      this._brideEntry = null
    }
  }

  _resetUIRefs() {
    this._dmgMeterRows  = null
    this._healMeterRows = null
  }

  // ── Per-player hooks ───────────────────────────────────────────────────────

  _onPlayerSync(p, sprite, pos, dt) {
    const prevHp = this._prevPlayerHp[p.id]

    if (prevHp != null && p.hp < prevHp && !p.isDowned) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.particles.hitSpark(pos.x, pos.y, color)
    }
    if (prevHp != null && prevHp > 0 && p.isDowned) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.triggerDeath(pos.x, pos.y, color)
    }
    this._prevPlayerHp[p.id] = p.hp

    if (this.vfx && p.effects) {
      this.vfx.auras.sync(p.id, sprite.container, p.effects, this.game.getPlayerRadius())
    }

    // During closing cinematic dance: activate dance animation (south-locked, looping)
    const isDancing = this._dancingPlayerIds.has(p.id)
    if (sprite.setDancing) sprite.setDancing(isDancing)
  }

  _onPlayerRemoved(id) {
    this.vfx?.auras.removeEntity(id)
  }

  // ── Enemy hooks ────────────────────────────────────────────────────────────

  _onEnemyRemoved(sprite, id) {
    const pos = sprite.container.position
    this.vfx?.triggerDeath(pos.x, pos.y, 0xc0392b)
  }

  // ── Position resolution overrides ─────────────────────────────────────────

  _resolveBeamTarget(targetId) {
    const base = super._resolveBeamTarget(targetId)
    if (base) return base
    if (targetId === 'boss' && this.bossSprite) {
      return { x: this.bossSprite.container.x, y: this.bossSprite.container.y }
    }
    // Gate targets
    const gate = (this.game.knownState.gates ?? []).find(g => g.id === targetId)
    if (gate && !gate.isDead) return { x: gate.x, y: gate.y }
    // Building targets
    const building = (this.game.knownState.buildings ?? []).find(b => b.id === targetId)
    if (building && !building.isDead) return { x: building.x + (building.width ?? 60) / 2, y: building.y + (building.height ?? 60) / 2 }
    return null
  }

  _resolveTargetPosition(targetId) {
    const base = super._resolveTargetPosition(targetId)
    if (base) return base
    if (this.bossSprite) {
      const state = this.game.knownState
      if (state.boss && (state.boss.id === targetId || targetId === 'boss')) {
        return { x: this.bossSprite.container.x, y: this.bossSprite.container.y }
      }
    }
    // Gate targets
    const gate = (this.game.knownState.gates ?? []).find(g => g.id === targetId)
    if (gate && !gate.isDead) return { x: gate.x, y: gate.y }
    // Building targets
    const building = (this.game.knownState.buildings ?? []).find(b => b.id === targetId)
    if (building && !building.isDead) return { x: building.x + (building.width ?? 60) / 2, y: building.y + (building.height ?? 60) / 2 }
    return null
  }

  // ── Extra per-frame sync: boss, minions, tombstones ────────────────────────

  _syncExtras(dt) {
    super._syncExtras(dt)

    // Tick fade transition
    if (this._fadeState && !this._fadeState.done && this._transitionOverlay) {
      if (this._fadeState.dir === 'in') {
        this._transitionAlpha = Math.max(0, this._transitionAlpha - this._fadeState.speed * dt)
        if (this._transitionAlpha <= 0) { this._transitionAlpha = 0; this._fadeState.done = true }
      } else {
        this._transitionAlpha = Math.min(1, this._transitionAlpha + this._fadeState.speed * dt)
        if (this._transitionAlpha >= 1) {
          this._transitionAlpha = 1
          this._fadeState.done = true
          this._fadeState.onComplete?.()
        }
      }
      this._transitionOverlay.alpha = this._transitionAlpha
    }

    const state = this.game.knownState

    // Eye Beams (Illidan Phase 2)
    this._renderEyeBeams(state.eyeBeams)

    // Portal Beams (Level 2)
    this._renderPortalBeams(dt)

    // Warlock channeling beams (Level 5 Phase 1)
    this._warlockBeamTime = (this._warlockBeamTime + dt) % 10
    this._renderWarlockBeams(state)

    // Healing pylons (Level 5 Phase 2)
    this._pylonTime = (this._pylonTime + dt) % 10
    this._renderPylons(state, dt)

    // Boss — kept alive during closing cinematic so Illidan holds his death pose
    const cinematic = state.closingCinematic
    if (state.boss && (!state.boss.isDead || cinematic)) {
      if (!this.bossSprite) {
        this.bossSprite = new BossSprite(BOSS_CONFIG_BY_NAME[state.boss.name] ?? ILLIDAN_CONFIG)
        this.bossContainer.addChild(this.bossSprite.container)
      }
      this.bossSprite.update(state.boss, dt)
    }
    if (state.boss?.isDead && !cinematic && this.bossSprite) {
      this.bossContainer.removeChild(this.bossSprite.container)
      this.bossSprite.destroy()
      this.bossSprite = null
    }

    // Closing cinematic (Level 6 end-sequence)
    this._renderClosingCinematic(dt)

    // NPCs (friendly entities like Akama)
    const npcs = state.npcs ?? []
    const activeNpcIds = new Set()
    for (const npc of npcs) {
      if (npc.isDead) continue
      activeNpcIds.add(npc.id)
      const r = npc.radius ?? 25

      if (!this.npcGfx.has(npc.id)) {
        const container = new Container()

        const nameLabel = new Text({
          text:  npc.name ?? 'NPC',
          style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#27ae60', align: 'center' },
        })
        nameLabel.anchor.set(0.5, 1)
        nameLabel.position.set(0, -r - 18)
        container.addChild(nameLabel)

        const hpBg = new Graphics()
        hpBg.rect(-30, -r - 14, 60, 6)
        hpBg.fill({ color: 0x111111, alpha: 0.8 })
        hpBg.rect(-30, -r - 14, 60, 6)
        hpBg.stroke({ color: 0x333333, width: 0.5 })
        container.addChild(hpBg)

        const hpFill = new Graphics()
        container.addChild(hpFill)

        if (DIRECTIONAL_NPCS.has(npc.id)) {
          const body = new Sprite(Assets.get(`${npc.id}_south`) ?? Assets.get('enemy_grunt'))
          body.anchor.set(0.5)
          body.width  = r * 2
          body.height = r * 2
          container.addChild(body)
          this.npcGfx.set(npc.id, {
            container, body, hpFill, radius: r,
            _isDirectional: true,
            _animState: 'idle', _animFrame: 0, _lastAnimFrame: -1,
            _animTimer: 0, _currentDir: null,
            _lastRenderX: null, _lastRenderY: null,
          })
        } else {
          const body = new Graphics()
          container.addChild(body)
          this.npcGfx.set(npc.id, { container, body, hpFill, radius: r })
        }

        this._entityRoot.addChild(container)
      }

      const entry = this.npcGfx.get(npc.id)
      entry.container.position.set(npc.x, npc.y)

      if (entry._isDirectional) {
        const animCfg = DIRECTIONAL_NPC_ANIMATIONS[npc.id]
        if (animCfg) {
          const dir = _npcAngleToDir(npc.angle ?? Math.PI / 2)
          const moved = entry._lastRenderX !== null &&
            (Math.abs(npc.x - entry._lastRenderX) > 0.3 || Math.abs(npc.y - entry._lastRenderY) > 0.3)
          const newState = moved ? 'walk' : 'idle'
          if (newState !== entry._animState) {
            entry._animState = newState
            entry._animFrame = 0
            entry._animTimer = 0
          }
          entry._lastRenderX = npc.x
          entry._lastRenderY = npc.y
          const cfg = animCfg[entry._animState] ?? animCfg.idle
          entry._animTimer += dt
          if (entry._animTimer >= 1 / cfg.fps) {
            entry._animTimer -= 1 / cfg.fps
            entry._animFrame  = (entry._animFrame + 1) % cfg.frames
          }
          if (dir !== entry._currentDir || entry._animFrame !== entry._lastAnimFrame) {
            const key = `${npc.id}_${entry._animState}_${dir}_${entry._animFrame}`
            const tex = Assets.get(key)
            if (tex) {
              entry.body.texture = tex
            } else {
              const fallback = Assets.get(`${npc.id}_${dir}`)
              if (fallback) entry.body.texture = fallback
            }
            entry._currentDir    = dir
            entry._lastAnimFrame = entry._animFrame
          }
        }
      } else {
        entry.body.clear()
        entry.body.circle(0, 0, r)
        entry.body.fill({ color: 0x27ae60, alpha: 0.9 })
        entry.body.circle(0, 0, r)
        entry.body.stroke({ color: 0x2ecc71, width: 2 })
      }

      // HP bar fill
      const hpPct = npc.maxHp > 0 ? Math.max(0, npc.hp / npc.maxHp) : 0
      entry.hpFill.clear()
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0x27ae60 : hpPct > 0.25 ? 0xe67e22 : 0xe74c3c
        entry.hpFill.rect(-30, -r - 14, 60 * hpPct, 6)
        entry.hpFill.fill(hpColor)
      }
    }

    // Remove dead/stale NPC graphics
    this.npcGfx.forEach((entry, id) => {
      if (!activeNpcIds.has(id)) {
        this._entityRoot.removeChild(entry.container)
        entry.container.destroy({ children: true })
        this.npcGfx.delete(id)
      }
    })

    // Tombstones
    const activeTombIds = new Set((state.tombstones ?? []).map(t => t.id))

    for (const tomb of (state.tombstones ?? [])) {
      if (!this.tombstoneGfx.has(tomb.id)) {
        const gfx = new Graphics()
        this.tombstoneGfx.set(tomb.id, gfx)
        this._entityRoot.addChild(gfx)
      }
      const gfx = this.tombstoneGfx.get(tomb.id)
      gfx.clear()
      gfx.rect(tomb.x - 3, tomb.y - 20, 6, 24)
      gfx.rect(tomb.x - 10, tomb.y - 14, 20, 6)
      gfx.fill({ color: 0x888888, alpha: 0.8 })
      if (tomb.progress > 0) {
        gfx.moveTo(tomb.x, tomb.y)
        gfx.arc(tomb.x, tomb.y + 14, 14, -Math.PI / 2, -Math.PI / 2 + tomb.progress * Math.PI * 2)
        gfx.stroke({ color: 0x00ff88, width: 5 })
      }
    }

    this.tombstoneGfx.forEach((gfx, id) => {
      if (!activeTombIds.has(id)) {
        this._entityRoot.removeChild(gfx)
        gfx.destroy()
        this.tombstoneGfx.delete(id)
      }
    })

    // Gates
    const gates = state.gates ?? []
    const activeGateIds = new Set(gates.map(g => g.id))

    for (const gate of gates) {
      if (gate.isDead) {
        if (this.gateGfx.has(gate.id)) {
          const entry = this.gateGfx.get(gate.id)
          this._entityRoot.removeChild(entry.container)
          entry.container.destroy({ children: true })
          this.gateGfx.delete(gate.id)
        }
        continue
      }

      if (!this.gateGfx.has(gate.id)) {
        const container = new Container()
        const hpGfx    = new Graphics()
        let bodyGfx = null

        const tex = gate.spriteKey ? Assets.get(gate.spriteKey) : null
        if (tex) {
          const body = new Sprite(tex)
          body.anchor.set(0.5)
          body.width  = gate.width  ?? 40
          body.height = gate.height ?? 100
          container.addChild(body)
        } else {
          bodyGfx = new Graphics()
          container.addChild(bodyGfx)
        }
        container.addChild(hpGfx)

        this.gateGfx.set(gate.id, { container, hpGfx, bodyGfx })
        this._entityRoot.addChild(container)
        container.position.set(gate.x, gate.y)
      }

      const { container, hpGfx, bodyGfx } = this.gateGfx.get(gate.id)
      container.position.set(gate.x, gate.y)

      const gateW = gate.width  ?? 40
      const gateH = gate.height ?? 100
      const hpPct = gate.hp / (gate.maxHp || 1)

      // Procedural body — only for gates without a sprite
      if (bodyGfx) {
        bodyGfx.clear()
        const bodyColor = gate.isActive ? 0xff4444 : 0x666666
        bodyGfx.rect(-gateW / 2, -gateH / 2, gateW, gateH)
        bodyGfx.fill({ color: bodyColor, alpha: 0.7 })
        bodyGfx.rect(-gateW / 2, -gateH / 2, gateW, gateH)
        bodyGfx.stroke({ color: gate.isActive ? 0xff8888 : 0x999999, width: 3 })
      }

      // HP bar (always rendered above gate center)
      const barW = Math.max(gateW, 60)
      const barH = 5
      hpGfx.clear()
      hpGfx.rect(-barW / 2, -gateH / 2 - 12, barW, barH)
      hpGfx.fill({ color: 0x111111, alpha: 0.8 })
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0xe74c3c : hpPct > 0.25 ? 0xe67e22 : 0xc0392b
        hpGfx.rect(-barW / 2, -gateH / 2 - 12, barW * hpPct, barH)
        hpGfx.fill(hpColor)
      }
      hpGfx.rect(-barW / 2, -gateH / 2 - 12, barW, barH)
      hpGfx.stroke({ color: 0x333333, width: 1 })
    }

    // Remove stale gate graphics
    this.gateGfx.forEach((entry, id) => {
      if (!activeGateIds.has(id)) {
        this._entityRoot.removeChild(entry.container)
        entry.container.destroy({ children: true })
        this.gateGfx.delete(id)
      }
    })

    // Buildings
    const buildings = state.buildings ?? []
    const activeBuildingIds = new Set(buildings.map(b => b.id))

    for (const building of buildings) {
      if (building.isDead) {
        if (this.buildingGfx.has(building.id)) {
          const entry = this.buildingGfx.get(building.id)
          this._entityRoot.removeChild(entry.container)
          entry.container.destroy({ children: true })
          this.buildingGfx.delete(building.id)
        }
        continue
      }

      if (!this.buildingGfx.has(building.id)) {
        const bW = building.width  ?? 60
        const bH = building.height ?? 60
        const container = new Container()
        const hpGfx = new Graphics()
        let body

        const tex = building.spriteKey ? Assets.get(building.spriteKey) : null
        if (tex) {
          body = new Sprite(tex)
          body.anchor.set(0.5)
          body.width  = bW
          body.height = bH
        } else {
          body = new Graphics()
          body.rect(-bW / 2, -bH / 2, bW, bH)
          body.fill({ color: 0x8B6914, alpha: 0.85 })
          body.rect(-bW / 2, -bH / 2, bW, bH)
          body.stroke({ color: 0xA0822A, width: 3 })
          const inset = 8
          body.rect(-bW / 2 + inset, -bH / 2 + inset, bW - inset * 2, bH - inset * 2)
          body.stroke({ color: 0x6B4F10, width: 1 })
        }

        container.addChild(body, hpGfx)
        this._entityRoot.addChild(container)
        this.buildingGfx.set(building.id, { container, hpGfx, bW, bH })
      }

      const { container, hpGfx, bW, bH } = this.buildingGfx.get(building.id)
      container.position.set(building.x + bW / 2, building.y + bH / 2)

      const hpPct = building.hp / (building.maxHp || 1)
      const barW = Math.max(bW, 60)
      const barH = 5
      const barX = -barW / 2
      const barY = -bH / 2 - 12
      hpGfx.clear()
      hpGfx.rect(barX, barY, barW, barH)
      hpGfx.fill({ color: 0x111111, alpha: 0.8 })
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0xe74c3c : hpPct > 0.25 ? 0xe67e22 : 0xc0392b
        hpGfx.rect(barX, barY, barW * hpPct, barH)
        hpGfx.fill(hpColor)
      }
      hpGfx.rect(barX, barY, barW, barH)
      hpGfx.stroke({ color: 0x333333, width: 1 })
    }

    // Remove stale building graphics
    this.buildingGfx.forEach((entry, id) => {
      if (!activeBuildingIds.has(id)) {
        this._entityRoot.removeChild(entry.container)
        entry.container.destroy({ children: true })
        this.buildingGfx.delete(id)
      }
    })
  }

  // ── UI update ──────────────────────────────────────────────────────────────

  _updateUI() {}

  // ── Event handler override ─────────────────────────────────────────────────

  onChannelInterrupted(data) {
    const sprite = this.playerSprites.get(data.playerId)
    if (sprite && this.vfx) {
      const { x, y } = sprite.container
      this.vfx.triggerImpact(x, y, '#ff4444')
    }
  }

  onPlayerHighlight(playerId) {
    const now    = Date.now()
    const lastAt = this._highlightCooldowns.get(playerId) ?? 0
    if (now - lastAt < 5000) return

    const sprite = this.playerSprites.get(playerId)
    if (!sprite) return

    this._highlightCooldowns.set(playerId, now)

    const { x, y } = sprite.container.position
    this.vfx?.oneShot.aoeFlash(x, y, 60, '#ffd700')
    setTimeout(() => {
      if (!this.vfx) return
      const pos = sprite.container.position
      this.vfx.oneShot.aoeFlash(pos.x, pos.y, 60, '#ffd700')
    }, 400)
  }

  // ── UI construction ────────────────────────────────────────────────────────

  _buildUI() {
    this._uiRoot.removeChildren()

    const w = this.game.app.renderer.width
    const h = this.game.app.renderer.height

    // Phase transition flash overlay
    this._phaseFlashGfx.rect(0, 0, w, h)
    this._phaseFlashGfx.fill({ color: 0xffffff, alpha: 0 })
    this._phaseFlashAlpha = 0
    this._uiRoot.addChild(this._phaseFlashGfx)

    // Phase transition label
    this._phaseFlashText = new Text({
      text: '',
      style: { fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold', fill: '#ff3300', align: 'center' },
    })
    this._phaseFlashText.anchor.set(0.5, 0.5)
    this._phaseFlashText.position.set(w / 2, h / 2)
    this._phaseFlashText.visible = false
    this._uiRoot.addChild(this._phaseFlashText)

    // Fullscreen black overlay for level transitions — added last so it sits above all UI
    this._transitionOverlay = new Graphics()
    this._transitionOverlay.rect(0, 0, w, h)
    this._transitionOverlay.fill({ color: 0x000000, alpha: 1 })
    this._transitionOverlay.alpha = this._transitionAlpha
    this._uiRoot.addChild(this._transitionOverlay)
  }

  // ── Leviathan split events ─────────────────────────────────────────────────

  onLeviathanDeath({ entityId }) {
    const sprite = this.enemySprites.get(entityId)
    if (!sprite) return
    const c = sprite.container
    const startScale = c.scale.x
    const startTime = performance.now()
    const duration = 1000

    const shrink = () => {
      if (!c.parent) return
      const t = Math.min((performance.now() - startTime) / duration, 1)
      const eased = 1 - t * t * t  // Cubic.In
      const s = Math.max(startScale * eased, 0.05)
      c.scale.set(s)
      if (t < 1) requestAnimationFrame(shrink)
    }
    requestAnimationFrame(shrink)
  }

  onLeviathanSpawn({ entityId }) {
    const sprite = this.enemySprites.get(entityId)
    if (!sprite) return
    const c = sprite.container
    const targetScale = c.scale.x
    c.scale.set(0)
    c.alpha = 0
    const startTime = performance.now()
    const duration = 1000
    const fadeDuration = 200

    const grow = () => {
      if (!c.parent) return
      const t = Math.min((performance.now() - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)  // Cubic.Out
      c.scale.set(targetScale * eased)
      c.alpha = Math.min(t / (fadeDuration / duration), 1)
      if (t < 1) requestAnimationFrame(grow)
      else c.alpha = 1
    }
    requestAnimationFrame(grow)
  }

  // ── Illidan encounter events ───────────────────────────────────────────────

  /** Flash overlay, phase label, and boss transition animation on Illidan phase transitions. */
  onIllidanPhaseTransition({ phase, freeze, freezeDuration }) {
    // Trigger boss sprite transition animation if freeze window is provided
    if (freeze && freezeDuration && this.bossSprite) {
      this.bossSprite.triggerPhaseTransition(freezeDuration)
    }

    if (!this._phaseFlashGfx || !this._phaseFlashText) return

    const labels = {
      [ILLIDAN_PHASE.AZZINOTH]:   'ILLIDAN TRANSFORMS',
      [ILLIDAN_PHASE.DEMON_FORM]: 'DEMON FORM',
    }
    const label = labels[phase]
    if (!label) return

    this._phaseFlashText.text    = label
    this._phaseFlashText.visible = true
    this._phaseFlashAlpha        = 0.45
    this._phaseFlashGfx.clear()
    const w = this.game.app.renderer.width
    const h = this.game.app.renderer.height
    this._phaseFlashGfx.rect(0, 0, w, h)
    this._phaseFlashGfx.fill({ color: phase === 2 ? 0xff6600 : 0x440088, alpha: this._phaseFlashAlpha })

    // Fade out over 1.5 s
    const startTime = Date.now()
    const fade = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / 1500)
      this._phaseFlashAlpha = 0.45 * (1 - progress)
      if (this._phaseFlashGfx) {
        this._phaseFlashGfx.clear()
        if (this._phaseFlashAlpha > 0) {
          this._phaseFlashGfx.rect(0, 0, w, h)
          this._phaseFlashGfx.fill({ color: phase === 2 ? 0xff6600 : 0x440088, alpha: this._phaseFlashAlpha })
        }
      }
      if (progress < 1) requestAnimationFrame(fade)
      else if (this._phaseFlashText) this._phaseFlashText.visible = false
    }
    requestAnimationFrame(fade)

  }

  /** Animate both warglaives flying from Illidan's airborne position to the Flame of Azzinoth spawn points. */
  onWarglaiveThrow({ fromX, fromY, blades, flightMs }) {
    if (!this._entityRoot) return

    const durationMs = flightMs ?? 2000

    blades.forEach((blade, i) => {
      const container = new Container()

      const tex = Assets.get('warglaives_of_azzinoth')
      let bladeGfx
      if (tex) {
        bladeGfx = new Sprite(tex)
        bladeGfx.anchor.set(0.5)
        bladeGfx.width  = 80
        bladeGfx.height = 32
      } else {
        bladeGfx = new Graphics()
        bladeGfx.poly([-40, 0, -8, -14, 40, 0, -8, 14])
        bladeGfx.fill({ color: 0xff6600, alpha: 0.95 })
        bladeGfx.poly([-40, 0, -8, -14, 40, 0, -8, 14])
        bladeGfx.stroke({ color: 0xffcc44, width: 1.5, alpha: 0.9 })
      }
      container.addChild(bladeGfx)

      container.position.set(fromX, fromY)
      this._entityRoot.addChild(container)
      this._warglaiveSprites.push(container)

      const staggerMs = i * 120
      const startTime = performance.now() + staggerMs
      const dx        = blade.targetX - fromX
      const dy        = blade.targetY - fromY
      const spinDir   = i === 0 ? 1 : -1
      const spinRate  = (Math.PI * 2 * 3) / (durationMs / 1000)

      const tick = () => {
        if (!container.parent) return

        const elapsed = performance.now() - startTime
        if (elapsed < 0) { requestAnimationFrame(tick); return }

        const t     = Math.min(elapsed / durationMs, 1)
        const eased = 1 - Math.pow(1 - t, 3)

        container.position.set(fromX + dx * eased, fromY + dy * eased)
        container.rotation += spinDir * spinRate * (1 / 60)
        container.alpha = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1

        if (t < 1) {
          requestAnimationFrame(tick)
        } else {
          if (container.parent) this._entityRoot.removeChild(container)
          const idx = this._warglaiveSprites.indexOf(container)
          if (idx !== -1) this._warglaiveSprites.splice(idx, 1)
          container.destroy({ children: true })
        }
      }

      requestAnimationFrame(tick)
    })
  }

  // ── Portal Beam rendering (Level 2) ──────────────────────────────────────

  /** Incoming event: beam is entering 3s warning phase. */
  onPortalBeamWarning({ beamId, points }) {
    this._portalBeams.set(beamId, { points, phase: 'warning', time: 0 })
    this._renderMirrors()
  }

  /** Incoming event: beam transitions to active damage phase. */
  onPortalBeamDamage({ beamId, points }) {
    const beam = this._portalBeams.get(beamId)
    if (beam) {
      beam.points = points
      beam.phase  = 'damage'
      beam.time   = 0
    } else {
      this._portalBeams.set(beamId, { points, phase: 'damage', time: 0 })
    }
  }

  /** Incoming event: beam is over — remove it. */
  onPortalBeamEnd({ beamId }) {
    this._portalBeams.delete(beamId)
    if (this._portalBeams.size === 0) {
      this._portalBeamGfx.clear()
    }
  }

  /** Draw mirror objects from levelMeta (static, drawn once on warning). */
  _renderMirrors() {
    const mirrors = this._levelMeta?.mirrors ?? []
    this._mirrorGfx.clear()
    for (const mirror of mirrors) {
      const { x, y } = mirror.position
      const R = 12
      // Octagon-ish gem shape for the mirror
      this._mirrorGfx.poly([
        x,     y - R,
        x + R * 0.7, y - R * 0.7,
        x + R, y,
        x + R * 0.7, y + R * 0.7,
        x,     y + R,
        x - R * 0.7, y + R * 0.7,
        x - R, y,
        x - R * 0.7, y - R * 0.7,
      ])
      this._mirrorGfx.fill({ color: 0x7a5cff, alpha: 0.9 })
      this._mirrorGfx.poly([
        x,     y - R,
        x + R * 0.7, y - R * 0.7,
        x + R, y,
        x + R * 0.7, y + R * 0.7,
        x,     y + R,
        x - R * 0.7, y + R * 0.7,
        x - R, y,
        x - R * 0.7, y - R * 0.7,
      ])
      this._mirrorGfx.stroke({ color: 0xffffff, width: 2, alpha: 0.9 })
    }
  }

  /** Per-frame: advance beam timers and redraw. */
  _renderPortalBeams(dt) {
    if (this._portalBeams.size === 0) return

    this._portalBeamGfx.clear()

    for (const [, beam] of this._portalBeams) {
      beam.time += dt
      const pts = beam.points
      if (!pts || pts.length < 2) continue

      if (beam.phase === 'warning') {
        // Pulsing semi-transparent line — 3s warning
        const pulse = 0.3 + 0.25 * Math.sin(beam.time * Math.PI * 2 / 0.6)

         // Outer glow
         for (let i = 0; i < pts.length - 1; i++) {
           this._portalBeamGfx.moveTo(pts[i].x, pts[i].y)
           this._portalBeamGfx.lineTo(pts[i + 1].x, pts[i + 1].y)
           this._portalBeamGfx.stroke({ color: 0x5f4bff, width: 14, alpha: pulse * 0.28 })
         }
         // Core warning line
         for (let i = 0; i < pts.length - 1; i++) {
           this._portalBeamGfx.moveTo(pts[i].x, pts[i].y)
           this._portalBeamGfx.lineTo(pts[i + 1].x, pts[i + 1].y)
           this._portalBeamGfx.stroke({ color: 0xb494ff, width: 3, alpha: pulse })
         }
         // Warning dots at each waypoint
         for (const pt of pts) {
           this._portalBeamGfx.circle(pt.x, pt.y, 5)
           this._portalBeamGfx.fill({ color: 0xc9b6ff, alpha: pulse + 0.2 })
         }

       } else {
        // Solid bright beam — active damage phase
        const flicker = 0.8 + 0.2 * Math.sin(beam.time * Math.PI * 2 / 0.1)

        // Wide outer glow
         for (let i = 0; i < pts.length - 1; i++) {
           this._portalBeamGfx.moveTo(pts[i].x, pts[i].y)
           this._portalBeamGfx.lineTo(pts[i + 1].x, pts[i + 1].y)
           this._portalBeamGfx.stroke({ color: 0x5139ff, width: 20, alpha: 0.28 })
         }
         // Mid glow
         for (let i = 0; i < pts.length - 1; i++) {
           this._portalBeamGfx.moveTo(pts[i].x, pts[i].y)
           this._portalBeamGfx.lineTo(pts[i + 1].x, pts[i + 1].y)
           this._portalBeamGfx.stroke({ color: 0x8e6dff, width: 8, alpha: 0.6 * flicker })
         }
         // Bright core
         for (let i = 0; i < pts.length - 1; i++) {
           this._portalBeamGfx.moveTo(pts[i].x, pts[i].y)
           this._portalBeamGfx.lineTo(pts[i + 1].x, pts[i + 1].y)
           this._portalBeamGfx.stroke({ color: 0xe8e0ff, width: 2, alpha: flicker })
         }
         // Impact circles at endpoints
         this._portalBeamGfx.circle(pts[0].x, pts[0].y, 8)
         this._portalBeamGfx.fill({ color: 0x8e6dff, alpha: 0.85 })
         this._portalBeamGfx.circle(pts[pts.length - 1].x, pts[pts.length - 1].y, 8)
         this._portalBeamGfx.fill({ color: 0x8e6dff, alpha: 0.85 })

         for (let i = 1; i < pts.length - 1; i++) {
           this._portalBeamGfx.circle(pts[i].x, pts[i].y, 9)
           this._portalBeamGfx.fill({ color: 0xc9b6ff, alpha: 0.55 * flicker })
         }
       }
     }
   }

  // ── Eye Beam rendering (Illidan Phase 2) ──────────────────────────────────

  _renderEyeBeams(eyeBeams) {
    this._eyeBeamGfx.clear()
    if (!eyeBeams?.length) return
    for (const beam of eyeBeams) {
      const cx = beam.x1 + (beam.x2 - beam.x1) * beam.progress
      const cy = beam.y1 + (beam.y2 - beam.y1) * beam.progress
      // Outer glow
      this._eyeBeamGfx.moveTo(beam.x1, beam.y1)
      this._eyeBeamGfx.lineTo(cx, cy)
      this._eyeBeamGfx.stroke({ width: 18, color: 0x440088, alpha: 0.2 })
      // Mid glow
      this._eyeBeamGfx.moveTo(beam.x1, beam.y1)
      this._eyeBeamGfx.lineTo(cx, cy)
      this._eyeBeamGfx.stroke({ width: 9, color: 0x9933ff, alpha: 0.5 })
      // Core
      this._eyeBeamGfx.moveTo(beam.x1, beam.y1)
      this._eyeBeamGfx.lineTo(cx, cy)
      this._eyeBeamGfx.stroke({ width: 3, color: 0xcc66ff, alpha: 0.95 })
    }
  }

  // ── Warlock channeling beams (Level 4 Phase 1) ────────────────────────────

  _renderPylons(state, dt) {
    const pylons = state.pylons ?? []
    const t      = this._pylonTime
    const activeIds = new Set()

    for (const pylon of pylons) {
      activeIds.add(pylon.id)

      if (!this.pylonGfx.has(pylon.id)) {
        const container  = new Container()
        const sprite     = new Sprite(Assets.get(pylon.state === 'active' ? 'pylon_active' : 'pylon_inactive'))
        sprite.anchor.set(0.5)
        sprite.scale.set(1.5)
        container.addChild(sprite)
        const chargeArc  = new Graphics()
        container.addChild(chargeArc)
        container.position.set(pylon.x, pylon.y)
        this._entityRoot.addChild(container)
        this.pylonGfx.set(pylon.id, { container, sprite, chargeArc })
      }

      const entry = this.pylonGfx.get(pylon.id)
      entry.container.position.set(pylon.x, pylon.y)

      // Swap sprite when state changes to active
      const wantKey = pylon.state === 'active' ? 'pylon_active' : 'pylon_inactive'
      if (entry._lastState !== pylon.state) {
        entry.sprite.texture = Assets.get(wantKey)
        entry._lastState     = pylon.state
      }

      // Pulsing glow scale on active pylon
      if (pylon.state === 'active') {
        const pulse = 1.5 + 0.06 * Math.sin(t * 5)
        entry.sprite.scale.set(pulse)
      } else {
        entry.sprite.scale.set(1.5)
      }

      // Charge arc around inactive pylon
      entry.chargeArc.clear()
      if (pylon.state === 'inactive' && pylon.charges > 0) {
        const pct   = pylon.charges / 20
        const alpha = 0.5 + 0.3 * Math.sin(t * 3)
        entry.chargeArc.arc(0, 0, 54, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct)
        entry.chargeArc.stroke({ color: 0x44ddff, width: 3, alpha })
      }
    }

    // Remove stale pylon graphics
    this.pylonGfx.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        entry.container.destroy({ children: true })
        this.pylonGfx.delete(id)
      }
    })

    // Healing beam from active pylon to Akama
    this._pylonBeamGfx.clear()
    const activePylon = pylons.find(p => p.state === 'active')
    if (activePylon) {
      const akama = (state.npcs ?? []).find(n => n.id === 'akama' && !n.isDead)
      if (akama) {
        const sx   = activePylon.x
        const sy   = activePylon.y
        const tx   = akama.x
        const ty   = akama.y
        const beam = 0.55 + 0.25 * Math.sin(t * 6)

        // Outer glow
        this._pylonBeamGfx.moveTo(sx, sy)
        this._pylonBeamGfx.lineTo(tx, ty)
        this._pylonBeamGfx.stroke({ color: 0xffdd88, width: 8, alpha: 0.12 })

        // Core beam
        this._pylonBeamGfx.moveTo(sx, sy)
        this._pylonBeamGfx.lineTo(tx, ty)
        this._pylonBeamGfx.stroke({ color: 0xffcc44, width: 3, alpha: beam })

        // Flowing dots pylon → Akama (healing flows toward Akama)
        const dx = tx - sx
        const dy = ty - sy
        for (let i = 0; i < 5; i++) {
          const frac = ((i / 5) + t * 0.35) % 1
          const px   = sx + dx * frac
          const py   = sy + dy * frac
          const a    = Math.sin(frac * Math.PI) * 0.9
          this._pylonBeamGfx.circle(px, py, 3)
          this._pylonBeamGfx.fill({ color: 0xffffff, alpha: a })
        }
      }
    }
  }

  _renderWarlockBeams(state) {
    this._warlockBeamGfx.clear()
    if (!state.boss?.isImmune) return

    const tx = state.boss.x
    const ty = state.boss.y
    const t  = this._warlockBeamTime
    const pulse = 0.5 + 0.25 * Math.sin(t * 4)

    const enemies = state.enemies ?? []
    for (const e of enemies) {
      if (e.type !== 'warlock' || e.isDead) continue

      const sx = e.x
      const sy = e.y

      // Outer glow
      this._warlockBeamGfx.moveTo(sx, sy)
      this._warlockBeamGfx.lineTo(tx, ty)
      this._warlockBeamGfx.stroke({ color: 0x9933ff, width: 6, alpha: 0.15 })

      // Core beam
      this._warlockBeamGfx.moveTo(sx, sy)
      this._warlockBeamGfx.lineTo(tx, ty)
      this._warlockBeamGfx.stroke({ color: 0xcc44ff, width: 2, alpha: pulse })

      // Flowing dots traveling from warlock toward boss (power flowing in)
      const dx = tx - sx
      const dy = ty - sy
      for (let i = 0; i < 4; i++) {
        const frac = ((i / 4) + t * 0.3) % 1
        const px   = sx + dx * frac
        const py   = sy + dy * frac
        const a    = Math.sin(frac * Math.PI) * 0.8
        this._warlockBeamGfx.circle(px, py, 2.5)
        this._warlockBeamGfx.fill({ color: 0x6600cc, alpha: a })
      }
    }
  }

  // ── Closing cinematic event handlers ──────────────────────────────────────

  onClosingCinematicStart(_data) {
    // Boss holds its death pose — no visual change needed here.
    // Cell / items arrive via subsequent events.
  }

  onClosingCellSpawn({ x, y, width, height }) {
    this._cinematicCell = { x, y, width, height, doorOpen: false }
    const tex = Assets.get('cell_structure')
    if (tex && !this._cellSprite) {
      this._cellSprite        = new Sprite(tex)
      this._cellSprite.anchor.set(0.5)
      this._cellSprite.width  = width
      this._cellSprite.height = height
      this._cellSprite.position.set(x, y)
      this._entityRoot.addChild(this._cellSprite)
    }
  }

  onClosingItemsSpawned({ items }) {
    this._cinematicPickups = items.map(i => ({ ...i, isPickedUp: false, pickedUpBy: null }))
    const now = performance.now()
    for (const item of items) {
      this._pickupSpawnTimes[item.id] = now
      this._createPickupSprite(item)
    }
  }

  _createPickupSprite(item) {
    if (this._pickupSpriteMap.has(item.id)) return
    const key = item.type === 'ring' ? 'pickup_ring' : 'pickup_key'
    const tex = Assets.get(key)
    if (!tex) return
    const spr = new Sprite(tex)
    spr.anchor.set(0.5)
    spr.position.set(item.x, item.y)
    spr.width  = 0
    spr.height = 0
    this._entityRoot.addChild(spr)
    this._pickupSpriteMap.set(item.id, spr)
  }

  onClosingItemPickup({ itemId, playerId, itemType }) {
    const pickup = this._cinematicPickups.find(p => p.id === itemId)
    if (pickup) { pickup.isPickedUp = true; pickup.pickedUpBy = playerId }
    this._itemHolders[playerId] = itemType
    const spr = this._pickupSpriteMap.get(itemId)
    if (spr) spr.visible = false
    const iconTex = Assets.get(itemType === 'ring' ? 'pickup_ring' : 'pickup_key')
    if (iconTex && !this._holderIconSprites.has(playerId)) {
      const icon = new Sprite(iconTex)
      icon.anchor.set(0.5)
      icon.width  = 44
      icon.height = 44
      this._entityRoot.addChild(icon)
      this._holderIconSprites.set(playerId, icon)
    }
  }

  onClosingCellOpen(_data) {
    if (this._cinematicCell) this._cinematicCell.doorOpen = true
    for (const [playerId, itemType] of Object.entries(this._itemHolders)) {
      if (itemType === 'key') {
        delete this._itemHolders[playerId]
        const icon = this._holderIconSprites.get(playerId)
        if (icon) { icon.destroy(); this._holderIconSprites.delete(playerId) }
      }
    }
  }

  onClosingBrideWalkOut({ startX, startY, targetX, targetY, durationMs }) {
    this._cinematicBride = {
      x: startX, y: startY,
      startX, startY, targetX, targetY,
      walkStartMs:   performance.now(),
      walkDurationMs: durationMs,
      state:         'walking',
    }
    this._ensureBrideSprite()
  }

  _ensureBrideSprite() {
    if (this._brideEntry) return
    const tex = Assets.get('bride_south')
    if (!tex) return
    const body = new Sprite(tex)
    body.anchor.set(0.5)
    body.width  = 124
    body.height = 124
    const nameLabel = new Text({
      text:  'Ági',
      style: { fontFamily: 'Arial', fontSize: 12, fontWeight: 'bold', fill: '#ffffff', align: 'center' },
    })
    nameLabel.anchor.set(0.5, 1)
    nameLabel.position.set(0, -65)
    const container = new Container()
    container.addChild(body)
    container.addChild(nameLabel)
    this._entityRoot.addChild(container)
    this._brideEntry = { container, body, _animState: null, _animFrame: 0, _animTimer: 0, _lastAnimFrame: -1 }
  }

  onClosingRingMoment({ ringHolderId, brideX, brideY }) {
    if (this._cinematicBride) {
      this._cinematicBride.x     = brideX
      this._cinematicBride.y     = brideY
      this._cinematicBride.state = 'ceremony'
    }
    // Use ringHolderId from the event directly — _itemHolders can be unreliable if the same
    // player picked up both items (second pickup overwrites the first in the map).
    const holderSprite = this.playerSprites?.get(ringHolderId)
    const startX = holderSprite ? holderSprite.container.position.x : brideX - 150
    const startY = holderSprite ? holderSprite.container.position.y - 56 : brideY
    const tex = Assets.get('pickup_ring')
    if (tex) {
      const spr = new Sprite(tex)
      spr.anchor.set(0.5)
      spr.width  = 44
      spr.height = 44
      spr.position.set(startX, startY)
      this._entityRoot.addChild(spr)
      this._ringFlyAnim = { spr, startX, startY, targetX: brideX, targetY: brideY - 40, startMs: performance.now(), durationMs: 900 }
    }
    // Destroy head icon
    const icon = this._holderIconSprites.get(ringHolderId)
    if (icon) { icon.destroy(); this._holderIconSprites.delete(ringHolderId) }
    delete this._itemHolders[ringHolderId]
  }

  onClosingDanceStart({ playerIds }) {
    for (const id of playerIds) this._dancingPlayerIds.add(id)
    if (this._cinematicBride) this._cinematicBride.state = 'dancing'
  }

  onClosingAllDance({ playerIds }) {
    for (const id of playerIds) this._dancingPlayerIds.add(id)
  }

  // ── Closing cinematic renderer (called each frame from _renderFrame) ────────

  _renderClosingCinematic(dt) {
    this._cinematicTime += dt * 1000
    const t = this._cinematicTime

    this._cinematicGfx.clear()
    this._cinematicOverlay.clear()

    const cinematic = this.game.knownState.closingCinematic
    if (!cinematic) return

    // Sync state from delta (handles reconnects and catches up to server truth)
    if (cinematic.pickups?.length) {
      for (const sp of cinematic.pickups) {
        const local = this._cinematicPickups.find(p => p.id === sp.id)
        if (local) {
          local.isPickedUp = sp.isPickedUp
          local.pickedUpBy = sp.pickedUpBy
        } else {
          this._cinematicPickups.push({ ...sp })
          if (!this._pickupSpawnTimes[sp.id]) this._pickupSpawnTimes[sp.id] = performance.now()
          this._createPickupSprite(sp)
        }
        if (sp.pickedUpBy) this._itemHolders[sp.pickedUpBy] = sp.type
        if (sp.isPickedUp) {
          const spr = this._pickupSpriteMap.get(sp.id)
          if (spr) spr.visible = false
        }
      }
    }
    if (cinematic.bride && !this._cinematicBride) {
      this._cinematicBride = { ...cinematic.bride, walkStartMs: performance.now(), walkDurationMs: 1 }
      this._ensureBrideSprite()
    }
    if (cinematic.bride && this._cinematicBride) {
      this._cinematicBride.state = cinematic.bride.state
      if (cinematic.bride.state !== 'walking') {
        this._cinematicBride.x = cinematic.bride.x
        this._cinematicBride.y = cinematic.bride.y
      }
    }
    for (const id of (cinematic.dancingPlayerIds ?? [])) this._dancingPlayerIds.add(id)

    // ── Cell structure ──────────────────────────────────────────────────────
    if (this._cinematicCell) {
      const { x, y, width, height, doorOpen } = this._cinematicCell
      const cx = x - width / 2
      const cy = y - height / 2

      // Sprite handles the walls; fallback rect if texture didn't load
      if (!this._cellSprite) {
        this._cinematicGfx.rect(cx, cy, width, height)
        this._cinematicGfx.fill({ color: 0x4a3728, alpha: 0.9 })
        this._cinematicGfx.rect(cx, cy, width, height)
        this._cinematicGfx.stroke({ color: 0x8b6f47, width: 3, alpha: 1 })
      }

      // Door opening (left side of cell)
      if (!doorOpen) {
        const doorW = 32
        const doorH = 80
        const dx2   = cx
        const dy2   = cy + (height - doorH) / 2
        this._cinematicGfx.rect(dx2, dy2, doorW, doorH)
        this._cinematicGfx.fill({ color: 0x2a1a0e, alpha: 1 })
        this._cinematicGfx.rect(dx2, dy2, doorW, doorH)
        this._cinematicGfx.stroke({ color: 0x6b4c2a, width: 2, alpha: 1 })
      }
    }

    // ── Pickup sprites ───────────────────────────────────────────────────────
    for (const pickup of this._cinematicPickups) {
      if (pickup.isPickedUp) continue
      const spawnAge  = performance.now() - (this._pickupSpawnTimes[pickup.id] ?? performance.now())
      const popIn     = Math.min(1, spawnAge / 300)
      const pulse     = 0.6 + 0.4 * Math.sin((t / 1500) * Math.PI * 2)
      const glowR     = 36 * popIn
      const dispSize  = 60

      const spr = this._pickupSpriteMap.get(pickup.id)
      if (spr) {
        spr.position.set(pickup.x, pickup.y)
        spr.width  = dispSize * popIn
        spr.height = dispSize * popIn
        spr.alpha  = pulse * 0.95
        spr.visible = true
      } else {
        // Fallback circle if texture not loaded
        const color = pickup.type === 'ring' ? 0xffd700 : 0xa8d4e6
        this._cinematicGfx.circle(pickup.x, pickup.y, glowR - 4)
        this._cinematicGfx.fill({ color, alpha: pulse * 0.9 })
        this._cinematicGfx.circle(pickup.x, pickup.y, glowR - 4)
        this._cinematicGfx.stroke({ color: 0xffffff, width: 1.5, alpha: pulse * 0.6 })
      }
    }

    // ── Bride NPC ────────────────────────────────────────────────────────────
    if (this._cinematicBride) {
      const bride = this._cinematicBride
      let bx = bride.x
      let by = bride.y

      if (bride.state === 'walking' && bride.walkDurationMs > 1) {
        const rawT   = (performance.now() - bride.walkStartMs) / bride.walkDurationMs
        const clampT = Math.min(1, rawT)
        const ease   = clampT < 0.5 ? 4 * clampT ** 3 : 1 - (-2 * clampT + 2) ** 3 / 2
        bx = bride.startX + (bride.targetX - bride.startX) * ease
        by = bride.startY + (bride.targetY - bride.startY) * ease
      }

      // Lazy-create sprite on reconnect path
      this._ensureBrideSprite()

      if (this._brideEntry) {
        this._brideEntry.container.position.set(bx, by)

        const targetAnim = bride.state === 'walking' ? 'walk'
          : bride.state === 'dancing' ? 'dance'
          : 'idle'

        const animCfg = DIRECTIONAL_NPC_ANIMATIONS.bride
        if (animCfg) {
          if (targetAnim !== this._brideEntry._animState) {
            this._brideEntry._animState  = targetAnim
            this._brideEntry._animFrame  = 0
            this._brideEntry._animTimer  = 0
            this._brideEntry._lastAnimFrame = -1
          }
          const cfg = animCfg[targetAnim] ?? animCfg.idle
          this._brideEntry._animTimer += dt
          if (this._brideEntry._animTimer >= 1 / cfg.fps) {
            this._brideEntry._animTimer -= 1 / cfg.fps
            this._brideEntry._animFrame  = (this._brideEntry._animFrame + 1) % cfg.frames
          }
          if (this._brideEntry._animFrame !== this._brideEntry._lastAnimFrame) {
            const key = `bride_${targetAnim}_south_${this._brideEntry._animFrame}`
            const tex = Assets.get(key)
            if (tex) this._brideEntry.body.texture = tex
            this._brideEntry._lastAnimFrame = this._brideEntry._animFrame
          }
        }
      } else {
        // Fallback circle if textures not loaded
        this._cinematicGfx.circle(bx, by, 62)
        this._cinematicGfx.fill({ color: 0xfff5fa, alpha: 0.95 })
        this._cinematicGfx.circle(bx, by, 62)
        this._cinematicGfx.stroke({ color: 0xffc8d8, width: 2, alpha: 1 })
      }
    }

    // ── Item icons above holders' heads ─────────────────────────────────────
    for (const [playerId, icon] of this._holderIconSprites) {
      const holderSprite = this.playerSprites?.get(playerId)
      if (!holderSprite) continue
      const pos = holderSprite.container.position
      icon.position.set(pos.x, pos.y - 56)
    }

    // ── Ring fly animation ───────────────────────────────────────────────────
    if (this._ringFlyAnim) {
      const fly    = this._ringFlyAnim
      const rawT   = Math.min(1, (performance.now() - fly.startMs) / fly.durationMs)
      const ease   = 1 - (1 - rawT) ** 3
      const arcY   = -100 * Math.sin(Math.PI * rawT)
      fly.spr.position.set(
        fly.startX + (fly.targetX - fly.startX) * ease,
        fly.startY + (fly.targetY - fly.startY) * ease + arcY,
      )
      const scale      = 1 - 0.35 * ease
      fly.spr.width    = 44 * scale
      fly.spr.height   = 44 * scale
      fly.spr.alpha    = rawT > 0.75 ? (1 - rawT) / 0.25 : 1
      if (rawT >= 1) { fly.spr.destroy(); this._ringFlyAnim = null }
    }

    // ── Guidance arrow ───────────────────────────────────────────────────────
    const { guidanceHolderId, guidanceTarget } = cinematic
    if (guidanceHolderId && guidanceTarget) {
      const holderSprite = this.playerSprites?.get(guidanceHolderId)
      if (holderSprite) {
        const from = holderSprite.container.position
        const to   = guidanceTarget

        const dx2     = to.x - from.x
        const dy2     = to.y - from.y
        const dist    = Math.hypot(dx2, dy2) || 1
        const nx      = dx2 / dist
        const ny      = dy2 / dist

        // Bob along pointing axis
        const bob   = Math.sin((t / 800) * Math.PI * 2) * 4
        const alpha = 0.65 + 0.35 * Math.sin(((t - 200) / 800) * Math.PI * 2)

        const ax = from.x + nx * 28 + nx * bob
        const ay = from.y + ny * 28 + ny * bob

        const perp   = { x: -ny, y: nx }
        const tipX   = ax + nx * 22
        const tipY   = ay + ny * 22
        const left   = { x: ax - perp.x * 10, y: ay - perp.y * 10 }
        const right  = { x: ax + perp.x * 10, y: ay + perp.y * 10 }

        // Arcane outer glow
        this._cinematicOverlay.poly([left.x, left.y, right.x, right.y, tipX, tipY])
        this._cinematicOverlay.fill({ color: 0xb478ff, alpha: alpha * 0.35 })

        // Gold chevron fill
        this._cinematicOverlay.poly([left.x, left.y, right.x, right.y, tipX, tipY])
        this._cinematicOverlay.fill({ color: 0xffd700, alpha })
        this._cinematicOverlay.poly([left.x, left.y, right.x, right.y, tipX, tipY])
        this._cinematicOverlay.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.6 })
      }
    }
  }
}
