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

import { Container, Graphics, Text } from 'pixi.js'
import { GAME_CONFIG }  from '../../../shared/GameConfig.js'
import { CLASSES }      from '../../../shared/ClassConfig.js'
import BossSprite       from '../entities/BossSprite.js'
import BaseRenderer     from './BaseRenderer.js'

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
    this.gateGfx      = new Map()   // gateId → Graphics
    this.buildingGfx  = new Map()   // buildingId → Graphics

    // Previous-frame HP tracking for hit sparks and death bursts
    this._prevPlayerHp = {}

    // Level metadata (set from outside via setLevelMeta before enter, or via event)
    this._levelMeta = null

    // Objective progress received from server
    this._objectives = []

    // Eye beam line graphics (Illidan Phase 2)
    this._eyeBeamGfx   = new Graphics()
    this._entityRoot.addChild(this._eyeBeamGfx)

    // Warlock channeling beams (Level 4 Phase 1: warlocks → Shade)
    this._warlockBeamGfx = new Graphics()
    this._entityRoot.addChild(this._warlockBeamGfx)
    this._warlockBeamTime = 0

    // Illidan dialog overlay (cinematic intro + phase transitions)
    this._dialogContainer  = new Container()
    this._dialogBg         = null
    this._dialogSpeaker    = null
    this._dialogText       = null
    this._dialogTimer      = null

    // Phase transition flash
    this._phaseFlashGfx    = new Graphics()
    this._phaseFlashAlpha  = 0
    this._phaseFlashText   = null
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
    this.gateGfx.forEach(gfx => gfx.destroy())
    this.gateGfx.clear()
    this.buildingGfx.forEach(gfx => gfx.destroy())
    this.buildingGfx.clear()

    this._prevPlayerHp = {}
    this._levelMeta = null
    this._objectives = []

    // Dialog
    if (this._dialogTimer) clearTimeout(this._dialogTimer)
    this._dialogTimer = null
    this._dialogContainer.removeChildren()

    // Eye beams
    this._eyeBeamGfx.clear()

    // Warlock beams
    this._warlockBeamGfx.clear()
    this._warlockBeamTime = 0
  }

  _resetUIRefs() {
    this._dmgMeterRows  = null
    this._healMeterRows = null
  }

  // ── Per-player hooks ───────────────────────────────────────────────────────

  _onPlayerSync(p, sprite, pos, dt) {
    const prevHp = this._prevPlayerHp[p.id]

    if (prevHp != null && p.hp < prevHp && !p.isDead) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.particles.hitSpark(pos.x, pos.y, color)
    }
    if (prevHp != null && prevHp > 0 && p.isDead) {
      const color = CLASSES[p.className]?.color ?? '#ffffff'
      this.vfx?.triggerDeath(pos.x, pos.y, color)
    }
    this._prevPlayerHp[p.id] = p.hp

    if (this.vfx && p.effects) {
      this.vfx.auras.sync(p.id, sprite.container, p.effects, this.game.getPlayerRadius())
    }
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
    if (building && !building.isDead) return { x: building.x, y: building.y }
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
    if (building && !building.isDead) return { x: building.x, y: building.y }
    return null
  }

  // ── Extra per-frame sync: boss, minions, tombstones ────────────────────────

  _syncExtras(dt) {
    super._syncExtras(dt)

    const state = this.game.knownState

    // Eye Beams (Illidan Phase 2)
    this._renderEyeBeams(state.eyeBeams)

    // Warlock channeling beams (Level 4 Phase 1)
    this._warlockBeamTime = (this._warlockBeamTime + dt) % 10
    this._renderWarlockBeams(state)

    // Boss
    if (state.boss && !state.boss.isDead) {
      if (!this.bossSprite) {
        this.bossSprite = new BossSprite(state.boss.name)
        this.bossContainer.addChild(this.bossSprite.container)
      }
      this.bossSprite.update(state.boss)
    }
    if (state.boss?.isDead && this.bossSprite) {
      this.bossContainer.removeChild(this.bossSprite.container)
      this.bossSprite.destroy()
      this.bossSprite = null
    }

    // NPCs (friendly entities like Akama)
    const npcs = state.npcs ?? []
    const activeNpcIds = new Set()
    for (const npc of npcs) {
      if (npc.isDead) continue
      activeNpcIds.add(npc.id)
      const r = npc.radius ?? 25

      if (!this.npcGfx.has(npc.id)) {
        const container = new Container()

        const body = new Graphics()
        container.addChild(body)

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

        this.npcGfx.set(npc.id, { container, body, hpFill, radius: r })
        this._entityRoot.addChild(container)
      }

      const entry = this.npcGfx.get(npc.id)
      entry.container.position.set(npc.x, npc.y)

      // Redraw body
      entry.body.clear()
      entry.body.circle(0, 0, r)
      entry.body.fill({ color: 0x27ae60, alpha: 0.9 })
      entry.body.circle(0, 0, r)
      entry.body.stroke({ color: 0x2ecc71, width: 2 })

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
        gfx.arc(tomb.x, tomb.y + 14, 14, -Math.PI / 2, -Math.PI / 2 + tomb.progress * Math.PI * 2)
        gfx.stroke({ color: 0x00ff88, width: 3 })
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
        // Remove destroyed gates
        if (this.gateGfx.has(gate.id)) {
          this._entityRoot.removeChild(this.gateGfx.get(gate.id))
          this.gateGfx.get(gate.id).destroy()
          this.gateGfx.delete(gate.id)
        }
        continue
      }

      if (!this.gateGfx.has(gate.id)) {
        const gfx = new Graphics()
        this.gateGfx.set(gate.id, gfx)
        this._entityRoot.addChild(gfx)
      }

      const gfx = this.gateGfx.get(gate.id)
      const gateW = gate.width  ?? 40
      const gateH = gate.height ?? 100
      const hpPct = gate.hp / (gate.maxHp || 1)

      gfx.clear()

      // Gate body — rectangular
      const bodyColor = gate.isActive ? 0xff4444 : 0x666666
      const gateX = gate.x - gateW / 2
      const gateY = gate.y - gateH / 2
      gfx.rect(gateX, gateY, gateW, gateH)
      gfx.fill({ color: bodyColor, alpha: 0.7 })
      gfx.rect(gateX, gateY, gateW, gateH)
      gfx.stroke({ color: gate.isActive ? 0xff8888 : 0x999999, width: 3 })

      // HP bar above gate
      const barW = Math.max(gateW, 60)
      const barH = 5
      const barX = gate.x - barW / 2
      const barY = gateY - 12
      gfx.rect(barX, barY, barW, barH)
      gfx.fill({ color: 0x111111, alpha: 0.8 })
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0xe74c3c : hpPct > 0.25 ? 0xe67e22 : 0xc0392b
        gfx.rect(barX, barY, barW * hpPct, barH)
        gfx.fill(hpColor)
      }
      gfx.rect(barX, barY, barW, barH)
      gfx.stroke({ color: 0x333333, width: 1 })
    }

    // Remove stale gate graphics
    this.gateGfx.forEach((gfx, id) => {
      if (!activeGateIds.has(id)) {
        this._entityRoot.removeChild(gfx)
        gfx.destroy()
        this.gateGfx.delete(id)
      }
    })

    // Buildings
    const buildings = state.buildings ?? []
    const activeBuildingIds = new Set(buildings.map(b => b.id))

    for (const building of buildings) {
      if (building.isDead) {
        if (this.buildingGfx.has(building.id)) {
          const gfx = this.buildingGfx.get(building.id)
          this._entityRoot.removeChild(gfx)
          gfx.destroy()
          this.buildingGfx.delete(building.id)
        }
        continue
      }

      if (!this.buildingGfx.has(building.id)) {
        const gfx = new Graphics()
        this.buildingGfx.set(building.id, gfx)
        this._entityRoot.addChild(gfx)
      }

      const gfx = this.buildingGfx.get(building.id)
      const bW = building.width  ?? 60
      const bH = building.height ?? 60
      const hpPct = building.hp / (building.maxHp || 1)

      gfx.clear()

      // Building body — stone/brown rectangle
      const bX = building.x - bW / 2
      const bY = building.y - bH / 2
      gfx.rect(bX, bY, bW, bH)
      gfx.fill({ color: 0x8B6914, alpha: 0.85 })
      gfx.rect(bX, bY, bW, bH)
      gfx.stroke({ color: 0xA0822A, width: 3 })

      // Inner detail — smaller rect
      const inset = 8
      gfx.rect(bX + inset, bY + inset, bW - inset * 2, bH - inset * 2)
      gfx.stroke({ color: 0x6B4F10, width: 1 })

      // HP bar above building
      const barW = Math.max(bW, 60)
      const barH = 5
      const barX = building.x - barW / 2
      const barY = bY - 12
      gfx.rect(barX, barY, barW, barH)
      gfx.fill({ color: 0x111111, alpha: 0.8 })
      if (hpPct > 0) {
        const hpColor = hpPct > 0.5 ? 0xe74c3c : hpPct > 0.25 ? 0xe67e22 : 0xc0392b
        gfx.rect(barX, barY, barW * hpPct, barH)
        gfx.fill(hpColor)
      }
      gfx.rect(barX, barY, barW, barH)
      gfx.stroke({ color: 0x333333, width: 1 })
    }

    // Remove stale building graphics
    this.buildingGfx.forEach((gfx, id) => {
      if (!activeBuildingIds.has(id)) {
        this._entityRoot.removeChild(gfx)
        gfx.destroy()
        this.buildingGfx.delete(id)
      }
    })
  }

  // ── UI update ──────────────────────────────────────────────────────────────

  _updateUI(dt, activePlayerIds) {
    const stats = this.game.knownState.stats
    if (!stats || !this._dmgMeterRows) return

    const elapsed = Math.max(1, (Date.now() - (stats.startTime ?? Date.now())) / 1000)
    const players = [...activePlayerIds]
      .map(id => this.game.knownState.players[id])
      .filter(p => p && !p.isHost)

    if (players.length !== this._meterPlayerCount) {
      this._buildMeterRows(players)
      return
    }

    const byDmg  = [...players].sort((a, b) => (stats.damage?.[b.id] ?? 0) - (stats.damage?.[a.id] ?? 0))
    const byHeal = [...players].sort((a, b) => (stats.heal?.[b.id] ?? 0) - (stats.heal?.[a.id] ?? 0))

    byDmg.forEach((p, i) => {
      const row = this._dmgMeterRows[i]
      if (!row) return
      const total = stats.damage?.[p.id] ?? 0
      const dps   = (total / elapsed).toFixed(0)
      row.text = `${p.name}  ${total.toLocaleString()}  (${dps}/s)`
    })

    byHeal.forEach((p, i) => {
      const row = this._healMeterRows[i]
      if (!row) return
      const total = stats.heal?.[p.id] ?? 0
      const hps   = (total / elapsed).toFixed(0)
      row.text = `${p.name}  ${total.toLocaleString()}  (${hps}/s)`
    })
  }

  _buildMeterRows(players) {
    // Remove old meter container if it exists
    if (this._meterContainer) {
      this._uiRoot.removeChild(this._meterContainer)
    }

    const { width: W } = this.game.getScreenSize()
    const PANEL_W = 280
    const ROW_H   = 18
    const PAD     = 8
    const HEADER_H = 20
    const panelH  = HEADER_H + players.length * ROW_H + PAD * 2

    this._meterContainer = new Container()
    this._dmgMeterRows   = []
    this._healMeterRows  = []
    this._meterPlayerCount = players.length

    const makePanel = (xOff, title, color) => {
      const bg = new Graphics()
      bg.rect(0, 0, PANEL_W, panelH)
      bg.fill({ color: 0x000000, alpha: 0.65 })
      bg.stroke({ color: 0x222233, width: 1 })
      bg.position.set(xOff, 0)
      this._meterContainer.addChild(bg)

      const hdr = new Text({
        text: title,
        style: { fontFamily: 'Arial', fontSize: 11, fontWeight: 'bold', fill: color },
      })
      hdr.anchor.set(0.5, 0)
      hdr.position.set(xOff + PANEL_W / 2, PAD)
      this._meterContainer.addChild(hdr)
    }

    makePanel(0,          'DAMAGE',  '#ff6655')
    makePanel(PANEL_W + 6, 'HEALING', '#44dd88')

    players.forEach((p, i) => {
      const classColor = CLASSES[p.className]?.color ?? '#ffffff'
      const y = PAD + HEADER_H + i * ROW_H

      const dmgRow = new Text({
        text: `${p.name}  0  (0/s)`,
        style: { fontFamily: 'Arial', fontSize: 12, fill: classColor },
      })
      dmgRow.position.set(PAD, y)
      this._meterContainer.addChild(dmgRow)
      this._dmgMeterRows.push(dmgRow)

      const healRow = new Text({
        text: `${p.name}  0  (0/s)`,
        style: { fontFamily: 'Arial', fontSize: 12, fill: classColor },
      })
      healRow.position.set(PANEL_W + 6 + PAD, y)
      this._meterContainer.addChild(healRow)
      this._healMeterRows.push(healRow)
    })

    this._meterContainer.position.set(W - (PANEL_W * 2 + 6) - 10, 10)
    this._uiRoot.addChild(this._meterContainer)
  }

  // ── Event handler override ─────────────────────────────────────────────────

  onChannelInterrupted(data) {
    const sprite = this.playerSprites.get(data.playerId)
    if (sprite && this.vfx) {
      const { x, y } = sprite.container
      this.vfx.triggerImpact(x, y, '#ff4444')
    }
  }

  // ── UI construction ────────────────────────────────────────────────────────

  _buildUI() {
    this._uiRoot.removeChildren()
    this._meterContainer   = null
    this._dmgMeterRows     = []
    this._healMeterRows    = []
    this._meterPlayerCount = 0

    // Dialog box (shown during cinematic and phase transitions)
    const w = this.game.app.renderer.width
    const h = this.game.app.renderer.height

    this._dialogBg = new Graphics()
    this._dialogBg.rect(0, 0, w, 80)
    this._dialogBg.fill({ color: 0x000000, alpha: 0.75 })
    this._dialogBg.rect(0, 0, w, 80)
    this._dialogBg.stroke({ color: 0x444444, width: 1 })
    this._dialogContainer.addChild(this._dialogBg)

    this._dialogSpeaker = new Text({
      text: '',
      style: { fontFamily: 'Arial', fontSize: 13, fontWeight: 'bold', fill: '#ffffff' },
    })
    this._dialogSpeaker.position.set(20, 12)
    this._dialogContainer.addChild(this._dialogSpeaker)

    this._dialogText = new Text({
      text: '',
      style: { fontFamily: 'Arial', fontSize: 16, fill: '#eeeeee', wordWrap: true, wordWrapWidth: w - 40 },
    })
    this._dialogText.position.set(20, 34)
    this._dialogContainer.addChild(this._dialogText)

    this._dialogContainer.position.set(0, h - 90)
    this._dialogContainer.visible = false
    this._uiRoot.addChild(this._dialogContainer)

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
  }

  // ── Illidan encounter events ───────────────────────────────────────────────

  /** Show an Illidan dialog line in the cinematic box at the bottom. */
  onIllidanDialogLine({ speaker, text }) {
    if (!this._dialogContainer) return

    const speakerLabel = speaker === 'illidan' ? 'ILLIDAN STORMRAGE' : 'AKAMA'
    const speakerColor = speaker === 'illidan' ? '#9933ff' : '#00ccaa'

    this._dialogSpeaker.text  = speakerLabel
    this._dialogSpeaker.style = { ...this._dialogSpeaker.style, fill: speakerColor }
    this._dialogText.text     = text
    this._dialogContainer.visible = true

    // Auto-hide after a generous timeout (server controls the actual timing)
    if (this._dialogTimer) clearTimeout(this._dialogTimer)
    this._dialogTimer = setTimeout(() => {
      if (this._dialogContainer) this._dialogContainer.visible = false
    }, 8000)
  }

  /** Flash overlay and show phase label on Illidan phase transitions. */
  onIllidanPhaseTransition({ phase }) {
    if (!this._phaseFlashGfx || !this._phaseFlashText) return

    const labels = {
      2: 'ILLIDAN TRANSFORMS',
      3: 'DEMON FORM',
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

    // Hide dialog box on phase transition
    if (this._dialogContainer) this._dialogContainer.visible = false
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
}
