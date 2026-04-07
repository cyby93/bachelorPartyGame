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
import LobbyRenderer          from './scenes/LobbyRenderer.js'
import BattleRenderer         from './scenes/BattleRenderer.js'
import ResultRenderer         from './scenes/ResultRenderer.js'
import LevelCompleteRenderer  from './scenes/LevelCompleteRenderer.js'

function lerp(a, b, t) { return a + (b - a) * t }

export default class HostGame {
  constructor() {
    this.app            = null
    this.layers         = {}          // bg | groundFx | entities | fx | worldUi | ui
    this.worldRoot      = null
    this.knownState     = { players: {} }
    this.activeRenderer = null
    this.renderers      = {}
    this.socket         = null        // set via setSocket() from main.js
    this.containerEl    = null
    this.currentArena   = { width: GAME_CONFIG.CANVAS_WIDTH, height: GAME_CONFIG.CANVAS_HEIGHT }
    this._levelMeta     = {}
    this._onResize      = null
  }

  /** Called from main.js to give renderers access to the socket. */
  setSocket(socket) {
    this.socket = socket
  }

  // ── Initialisation ────────────────────────────────────────────────────────

  async init(containerEl) {
    this.containerEl = containerEl
    this.app = new Application()
    await this.app.init({
      width:       containerEl.clientWidth || GAME_CONFIG.CANVAS_WIDTH,
      height:      containerEl.clientHeight || GAME_CONFIG.CANVAS_HEIGHT,
      background:  0x0a1018,
      antialias:   true,
      resolution:  Math.min(window.devicePixelRatio ?? 1, 2),
      autoDensity: true,
    })

    containerEl.replaceChildren(this.app.canvas)

    // ── Permanent layer stack (back → front) ──────────────────────────────
    this.worldRoot = new Container()
    this.app.stage.addChild(this.worldRoot)

    for (const name of ['bg', 'groundFx', 'entities', 'fx', 'worldUi']) {
      this.layers[name] = new Container()
      this.worldRoot.addChild(this.layers[name])
    }
    this.layers.ui = new Container()
    this.app.stage.addChild(this.layers.ui)

    // ── Dungeon tile background (drawn once) ─────────────────────────────
    this._rebuildBackground()

    // ── Scene renderers ───────────────────────────────────────────────────
    this.renderers = {
      lobby:         new LobbyRenderer(this),
      battle:        new BattleRenderer(this, 'battle'),
      bossFight:     new BattleRenderer(this, 'bossFight'),
      levelComplete: new LevelCompleteRenderer(this, this.socket),
      result:        new ResultRenderer(this, true),
      gameover:      new ResultRenderer(this, false),
    }

    this.switchScene('lobby')

    this._onResize = () => this.resizeToContainer()
    window.addEventListener('resize', this._onResize)
    document.addEventListener('fullscreenchange', this._onResize)
    this.resizeToContainer()

    // ── Tick — pass delta-time (seconds) to renderers ────────────────────
    this.app.ticker.add(ticker => this.activeRenderer?.update(ticker.deltaMS / 1000))
  }

  // ── Scene management ──────────────────────────────────────────────────────

  /**
   * @param {string} name  – scene key
   * @param {object} [meta] – level metadata from SCENE_CHANGE payload
   */
  switchScene(name, meta) {
    // Store meta before setArenaSize so _rebuildBackground can draw walls
    this._levelMeta = meta ?? {}
    this.setArenaSize(meta?.arenaWidth, meta?.arenaHeight)
    this.activeRenderer?.exit()
    this.activeRenderer = this.renderers[name] ?? this.renderers.lobby

    // Pass level metadata to renderers that support it
    if (this.activeRenderer.setLevelMeta) {
      this.activeRenderer.setLevelMeta(meta ?? {})
    }

    this.activeRenderer.enter()
    this.resizeToContainer()
  }

  // ── State management ──────────────────────────────────────────────────────

  /** Full snapshot received on initial join. */
  receiveFullState(state) {
    this.setArenaSize(state.arenaWidth, state.arenaHeight)
    const now = performance.now()
    this.knownState.players = {}
    Object.values(state.players ?? {}).forEach(p => {
      this.knownState.players[p.id] = { ...p, _prevX: p.x, _prevY: p.y, _recvAt: now }
    })
    if (state.gates) this.knownState.gates = state.gates
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
      // When a new position arrives, anchor _prev at the current *visual* position
      // (not the stale server integer p.x/p.y) so the lerp continues from wherever
      // the sprite is actually drawn — eliminating snap-back jitter.
      if (d.x != null || d.y != null) {
        const visual = this.getRenderPos(p)
        p._prevX  = visual.x
        p._prevY  = visual.y
        p._recvAt = now
      }
      Object.assign(p, d)
    })

    // Forward boss / kill count / entities updates if present
    if (delta.boss)                this.knownState.boss       = { ...(this.knownState.boss ?? {}), ...delta.boss }
    if (delta.killCount != null)   this.knownState.killCount  = delta.killCount
    if (delta.enemies   != null)   this.knownState.enemies    = delta.enemies
    if (delta.projectiles != null) this.knownState.projectiles = delta.projectiles
    if (delta.tombstones  != null) this.knownState.tombstones  = delta.tombstones
    if (delta.stats       != null) this.knownState.stats       = delta.stats
    if (delta.aoeZones    != null) this.knownState.aoeZones    = delta.aoeZones
    if (delta.minions     != null) this.knownState.minions     = delta.minions
    if (delta.gates       != null) this.knownState.gates       = delta.gates
  }

  addPlayer(dto) {
    const existing = this.knownState.players[dto.id]
    if (existing) {
      // Merge full DTO in case player was first seen only via STATE_DELTA (which lacks name/className/isHost)
      Object.assign(existing, dto)
      return
    }
    const now = performance.now()
    this.knownState.players[dto.id] = { ...dto, _prevX: dto.x, _prevY: dto.y, _recvAt: now }
    this.activeRenderer?.onPlayerAdded?.(this.knownState.players[dto.id])
  }

  removePlayer(id) {
    delete this.knownState.players[id]
    this.activeRenderer?.onPlayerRemoved?.(id)
  }

  /** Forward objective progress to the active renderer. */
  updateObjectives(objectives) {
    this.activeRenderer?.updateObjectives?.(objectives)
  }

  // ── Interpolation ─────────────────────────────────────────────────────────

  /**
   * Returns the smoothed render position for a player.
   * Interpolates between the visual position captured at the last delta (_prevX/_prevY)
   * and the new server position (p.x/p.y), across one server tick duration (~50 ms).
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

  setArenaSize(width, height) {
    this.currentArena = {
      width: width ?? GAME_CONFIG.CANVAS_WIDTH,
      height: height ?? GAME_CONFIG.CANVAS_HEIGHT,
    }
    this._rebuildBackground()
    this.resizeToContainer()
  }

  resizeToContainer() {
    if (!this.app || !this.containerEl) return

    const width = Math.max(1, this.containerEl.clientWidth)
    const height = Math.max(1, this.containerEl.clientHeight)
    this.app.renderer.resize(width, height)

    const { width: arenaWidth, height: arenaHeight } = this.currentArena
    const fitScale = Math.min(width / arenaWidth, height / arenaHeight)
    const worldWidth = arenaWidth * fitScale
    const worldHeight = arenaHeight * fitScale
    const offsetX = (width - worldWidth) / 2
    const offsetY = (height - worldHeight) / 2

    this.worldRoot.scale.set(fitScale)
    this.worldRoot.position.set(offsetX, offsetY)
    this.activeRenderer?.resize?.()
  }

  getScreenSize() {
    return {
      width: this.app?.renderer?.width ?? GAME_CONFIG.CANVAS_WIDTH,
      height: this.app?.renderer?.height ?? GAME_CONFIG.CANVAS_HEIGHT,
    }
  }

  getPlayerRadius() {
    return GAME_CONFIG.PLAYER_RADIUS
  }

  /** Draw a single wall segment with stone-like visual. */
  _drawWallRect(gfx, x, y, w, h) {
    // Dark stone fill
    gfx.rect(x, y, w, h)
    gfx.fill({ color: 0x3d3d3d, alpha: 1 })

    // Inner bricks — horizontal lines every 20px
    const brickH = 20
    for (let by = y + brickH; by < y + h; by += brickH) {
      gfx.moveTo(x, by).lineTo(x + w, by)
    }
    gfx.stroke({ color: 0x2a2a2a, alpha: 0.8, width: 1 })

    // Bright border to stand out from background
    gfx.rect(x, y, w, h)
    gfx.stroke({ color: 0x7f93a3, width: 3 })

    // Inner highlight edge
    gfx.rect(x + 2, y + 2, w - 4, h - 4)
    gfx.stroke({ color: 0x555555, width: 1 })
  }

  _rebuildBackground() {
    if (!this.layers.bg) return

    this.layers.bg.removeChildren().forEach(child => child.destroy())

    const { width: W, height: H } = this.currentArena
    const bgGfx = new Graphics()
    const TILE = 64

    // Add a brighter arena plate and stone-like frame so the map edges read clearly.
    bgGfx.rect(0, 0, W, H)
    bgGfx.fill(0x16222d)

    bgGfx.rect(10, 10, W - 20, H - 20)
    bgGfx.stroke({ color: 0x7f93a3, alpha: 0.9, width: 18 })

    bgGfx.rect(10, 10, W - 20, H - 20)
    bgGfx.stroke({ color: 0x2f4352, alpha: 0.95, width: 6 })

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

    for (let x = 0; x <= W; x += TILE) bgGfx.moveTo(x, 0).lineTo(x, H)
    for (let y = 0; y <= H; y += TILE) bgGfx.moveTo(0, y).lineTo(W, y)
    bgGfx.stroke({ color: 0x000000, alpha: 0.4, width: 1 })

    bgGfx.rect(16, 16, W - 32, H - 32)
    bgGfx.stroke({ color: 0xb7c4cf, alpha: 0.9, width: 3 })

    bgGfx.rect(0, 0, W, H)
    bgGfx.stroke({ color: 0x09121a, alpha: 0.95, width: 10 })

    // Draw wall segments between rooms
    const rooms = this._levelMeta?.rooms
    const passages = this._levelMeta?.passages
    if (rooms && rooms.length >= 2 && passages) {
      const sorted = [...rooms].sort((a, b) => a.x - b.x)
      for (let i = 0; i < sorted.length - 1; i++) {
        const left = sorted[i]
        const right = sorted[i + 1]
        const wallX = left.x + left.width
        const wallW = right.x - wallX
        if (wallW <= 0) continue

        const wallTop = Math.min(left.y, right.y)
        const wallBottom = Math.max(left.y + left.height, right.y + right.height)

        // Find passages that cut through this wall
        const wallPassages = passages.filter(p => p.x >= wallX && p.x < wallX + wallW)
        wallPassages.sort((a, b) => a.y - b.y)

        // Draw solid wall segments (not passage openings)
        let curY = wallTop
        for (const p of wallPassages) {
          if (p.y > curY) {
            this._drawWallRect(bgGfx, wallX, curY, wallW, p.y - curY)
          }
          curY = p.y + p.height
        }
        if (curY < wallBottom) {
          this._drawWallRect(bgGfx, wallX, curY, wallW, wallBottom - curY)
        }
      }
    }

    this.layers.bg.addChild(bgGfx)
  }
}
