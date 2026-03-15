/**
 * client/host/HostGame.js
 *
 * PixiJS application wrapper and scene coordinator for the host display.
 *
 * Responsibilities:
 *   - Owns the PixiJS Application and the permanent layer stack
 *   - Merges incoming server state deltas into `knownState`
 *   - Provides per-player position interpolation (smooth 60 FPS from 20 Hz server)
 *   - Manages scene lifecycle (enter / exit / update)
 */

import { Application, Container, Graphics } from 'pixi.js'
import { GAME_CONFIG }  from '../../shared/GameConfig.js'
import LobbyRenderer    from './scenes/LobbyRenderer.js'
import BattleRenderer   from './scenes/BattleRenderer.js'
import ResultRenderer   from './scenes/ResultRenderer.js'

function lerp(a, b, t) { return a + (b - a) * t }

export default class HostGame {
  constructor() {
    this.app            = null
    this.layers         = {}          // bg | groundFx | entities | fx | ui
    this.knownState     = { players: {} }
    this.activeRenderer = null
    this.renderers      = {}
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  async init(containerEl) {
    this.app = new Application()
    await this.app.init({
      width:       GAME_CONFIG.CANVAS_WIDTH,
      height:      GAME_CONFIG.CANVAS_HEIGHT,
      background:  0x0a1018,
      antialias:   true,
      resolution:  Math.min(window.devicePixelRatio ?? 1, 2),
      autoDensity: true,
    })

    containerEl.appendChild(this.app.canvas)

    // ── Permanent layer stack (back → front) ──────────────────────────────
    for (const name of ['bg', 'groundFx', 'entities', 'fx', 'ui']) {
      this.layers[name] = new Container()
      this.app.stage.addChild(this.layers[name])
    }

    // ── Dungeon tile background (drawn once) ─────────────────────────────
    const { CANVAS_WIDTH: W, CANVAS_HEIGHT: H } = GAME_CONFIG
    const bgGfx = new Graphics()
    const TILE  = 64

    // Pseudo-random tile shading (seeded for consistency)
    let seed = 13
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff }

    const cols = Math.ceil(W / TILE)
    const rows = Math.ceil(H / TILE)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = Math.floor(12 + rand() * 10)
        bgGfx.rect(c * TILE, r * TILE, TILE - 1, TILE - 1)
        bgGfx.fill((v << 16) | (v << 8) | v)
      }
    }
    // Tile border lines
    for (let x = 0; x <= W; x += TILE) bgGfx.moveTo(x, 0).lineTo(x, H)
    for (let y = 0; y <= H; y += TILE) bgGfx.moveTo(0, y).lineTo(W, y)
    bgGfx.stroke({ color: 0x000000, alpha: 0.4, width: 1 })

    this.layers.bg.addChild(bgGfx)

    // ── Scene renderers ───────────────────────────────────────────────────
    this.renderers = {
      lobby:     new LobbyRenderer(this),
      trashMob:  new BattleRenderer(this, 'trashMob'),
      bossFight: new BattleRenderer(this, 'bossFight'),
      result:    new ResultRenderer(this, true),
      gameover:  new ResultRenderer(this, false),
    }

    this.switchScene('lobby')

    // ── Tick — pass delta-time (seconds) to renderers ────────────────────
    this.app.ticker.add(ticker => this.activeRenderer?.update(ticker.deltaMS / 1000))
  }

  // ── Scene management ──────────────────────────────────────────────────────

  switchScene(name) {
    this.activeRenderer?.exit()
    this.activeRenderer = this.renderers[name] ?? this.renderers.lobby
    this.activeRenderer.enter()
  }

  // ── State management ──────────────────────────────────────────────────────

  /** Full snapshot received on initial join. */
  receiveFullState(state) {
    const now = performance.now()
    this.knownState.players = {}
    Object.values(state.players ?? {}).forEach(p => {
      this.knownState.players[p.id] = { ...p, _prevX: p.x, _prevY: p.y, _recvAt: now }
    })
  }

  /** Incremental delta received every server tick. */
  receiveState(delta) {
    const now = performance.now()
    Object.values(delta.players ?? {}).forEach(d => {
      let p = this.knownState.players[d.id]
      if (!p) {
        this.knownState.players[d.id] = {
          ...d,
          _prevX:  d.x ?? 0,
          _prevY:  d.y ?? 0,
          _recvAt: now
        }
        return
      }
      // Save previous position before overwriting with server update
      if (d.x != null) p._prevX = p.x
      if (d.y != null) p._prevY = p.y
      p._recvAt = now
      Object.assign(p, d)
    })

    // Forward boss / kill count / entities updates if present
    if (delta.boss)                this.knownState.boss       = { ...(this.knownState.boss ?? {}), ...delta.boss }
    if (delta.killCount != null)   this.knownState.killCount  = delta.killCount
    if (delta.enemies   != null)   this.knownState.enemies    = delta.enemies
    if (delta.projectiles != null) this.knownState.projectiles = delta.projectiles
    if (delta.tombstones  != null) this.knownState.tombstones  = delta.tombstones
    if (delta.stats       != null) this.knownState.stats       = delta.stats
  }

  addPlayer(dto) {
    if (this.knownState.players[dto.id]) return
    const now = performance.now()
    this.knownState.players[dto.id] = { ...dto, _prevX: dto.x, _prevY: dto.y, _recvAt: now }
    this.activeRenderer?.onPlayerAdded?.(this.knownState.players[dto.id])
  }

  removePlayer(id) {
    delete this.knownState.players[id]
    this.activeRenderer?.onPlayerRemoved?.(id)
  }

  // ── Interpolation ─────────────────────────────────────────────────────────

  /**
   * Returns the smoothed render position for a player.
   * Interpolates between the position before the last delta and the position after it,
   * across one server tick duration (~50 ms).
   */
  getRenderPos(p) {
    const tickMs  = 1000 / GAME_CONFIG.TICK_RATE
    const elapsed = performance.now() - (p._recvAt ?? 0)
    const alpha   = Math.min(elapsed / tickMs, 1)
    return {
      x: lerp(p._prevX ?? p.x, p.x, alpha),
      y: lerp(p._prevY ?? p.y, p.y, alpha),
    }
  }
}
