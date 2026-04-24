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

import { Application, Container, Graphics, Assets } from 'pixi.js'
import { GAME_CONFIG }  from '../../shared/GameConfig.js'
import LobbyRenderer          from './scenes/LobbyRenderer.js'
import BattleRenderer         from './scenes/BattleRenderer.js'
import ResultRenderer         from './scenes/ResultRenderer.js'
import LevelCompleteRenderer  from './scenes/LevelCompleteRenderer.js'
import QuizRenderer           from './scenes/QuizRenderer.js'

function lerp(a, b, t) { return a + (b - a) * t }

/** Classes that have 8 directional sprites in /public/assets/sprites/{class}/{dir}.png */
export const DIRECTIONAL_CLASSES = new Set(['priest', 'warrior', 'paladin', 'hunter', 'druid', 'mage', 'warlock', 'deathknight', 'shaman', 'rogue'])

const DIRECTIONS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']

/**
 * Enemy types that have 8-directional animated sprites.
 * Sprites live at: /public/assets/sprites/{type}/{dir}.png  (static)
 *                  /public/assets/sprites/{type}/{anim}/{dir}/{frameIndex}.png (animated)
 * Asset keys: enemy_{type}_{dir}  /  enemy_{type}_{anim}_{dir}_{frame}
 */
export const DIRECTIONAL_ENEMIES = new Set([
  'felGuard', 'bonechewerBrute', 'coilskarHarpooner', 'illidariCenturion',
  'bonechewerBladeFury', 'ashtonghueMystic', 'bloodProphet',
  'coilskarSerpentGuard', 'ritualChanneler',
  'flameOfAzzinoth',
])

/** Enemy types with 8 directional static sprites but no frame animation. Asset keys: enemy_{type}_{dir} */
export const DIRECTIONAL_STATIC_ENEMIES = new Set(['leviathan'])

export const DIRECTIONAL_ENEMY_ANIMATIONS = {
  felGuard:             { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  bonechewerBrute:      { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  coilskarHarpooner:    { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  illidariCenturion:    { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  bonechewerBladeFury:  { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  ashtonghueMystic:     { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  bloodProphet:         { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  coilskarSerpentGuard: { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  ritualChanneler:      { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, channel: { frames: 9, fps: 10 } },
  flameOfAzzinoth:      { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
}

/** Boss types with 8-directional animated sprites. Asset keys: {type}_{dir} / {type}_{anim}_{dir}_{frame} */
export const DIRECTIONAL_BOSSES = new Set(['illidan', 'illidan_demon'])

export const DIRECTIONAL_BOSS_ANIMATIONS = {
  // transition: one-shot played during phase freeze window. Add once sprites are generated.
  illidan:       { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  illidan_demon: { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
  // Shade of Akama reuses NPC akama sprites — already loaded by DIRECTIONAL_NPC_ANIMATIONS
  akama:         { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
}

/** NPC types with 8-directional animated sprites. Asset keys: {type}_{dir} / {type}_{anim}_{dir}_{frame} */
export const DIRECTIONAL_NPCS = new Set(['akama'])

export const DIRECTIONAL_NPC_ANIMATIONS = {
  akama: { idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 } },
}

/**
 * Animation config per directional class.
 *
 * Top-level keys (idle, walk, cast, downed) are looping or state-driven animations.
 *   Path: /public/assets/sprites/{class}/{anim}/{dir}/{frameIndex}.png
 *   Asset key: player_{class}_{anim}_{dir}_{frame}
 *
 * skills: map of per-ability fire animations (one-shot, triggered by SKILL_FIRED).
 *   Path: /public/assets/sprites/{class}/{skillName}/{dir}/{frameIndex}.png
 *   Asset key: player_{class}_{skillName}_{dir}_{frame}
 *   'ability' is the generic fallback used when no skill-specific strip exists.
 *
 * cast: class-level looping channel animation (all casting skills share it for now).
 */
export const DIRECTIONAL_ANIMATIONS = {
  priest: {
    idle:   { frames: 4, fps: 7  },
    walk:   { frames: 6, fps: 10 },
    cast:   { frames: 6, fps: 8  },
    downed: { frames: 9, fps: 10 },
    skills: {
      ability: { frames: 4, fps: 12 },  // generic fallback (existing priest strip)
      // Add skill-specific entries as sprites become available, e.g.:
      // penance:  { frames: 4, fps: 12 },
      // holyNova: { frames: 4, fps: 12 },
    },
  },
  warrior: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {
      // cleave:       { frames: 5, fps: 14 },
      // thunderstomp: { frames: 6, fps: 12 },
    },
  },
  paladin: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {},
  },
  hunter: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {
      // shootBow: { frames: 4, fps: 14 },
    },
  },
  druid: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {},
  },
  mage: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {
      // frostNova: { frames: 4, fps: 12 },
      // fireball:  { frames: 4, fps: 12 },
    },
  },
  warlock: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {},
  },
  deathknight: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {},
  },
  shaman: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {
      // totem: { frames: 5, fps: 10 },
    },
  },
  rogue: {
    idle: { frames: 4, fps: 7 }, walk: { frames: 6, fps: 10 }, downed: { frames: 9, fps: 10 },
    skills: {},
  },
}

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

    // ── Sprite assets ─────────────────────────────────────────────────────
    await this._loadSprites()

    // ── Scene renderers ───────────────────────────────────────────────────
    this.renderers = {
      lobby:         new LobbyRenderer(this),
      battle:        new BattleRenderer(this, 'battle'),
      bossFight:     new BattleRenderer(this, 'bossFight'),
      levelComplete: new LevelCompleteRenderer(this, this.socket),
      quiz:          new QuizRenderer(this, this.socket),
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
    if (state.buildings) this.knownState.buildings = state.buildings
    if (state.npcs) this.knownState.npcs = state.npcs
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
    // boss: null means "no boss this level" — must clear stale data
    if ('boss' in delta)           this.knownState.boss       = delta.boss ? { ...(this.knownState.boss ?? {}), ...delta.boss } : null
    if (delta.killCount != null)   this.knownState.killCount  = delta.killCount
    if (delta.enemies   != null)   this.knownState.enemies    = delta.enemies
    if (delta.projectiles != null) this.knownState.projectiles = delta.projectiles
    if (delta.tombstones  != null) this.knownState.tombstones  = delta.tombstones
    if (delta.stats       != null) this.knownState.stats       = delta.stats
    if (delta.aoeZones    != null) this.knownState.aoeZones    = delta.aoeZones
    if (delta.minions          != null) this.knownState.minions          = delta.minions
    if (delta.illidanFireballs != null) this.knownState.illidanFireballs = delta.illidanFireballs
    // gates/buildings/npcs: null means "none this level" — must clear stale data from previous levels
    if ('gates'     in delta)      this.knownState.gates       = delta.gates     ?? []
    if ('buildings' in delta)      this.knownState.buildings   = delta.buildings ?? []
    if ('npcs'      in delta)      this.knownState.npcs        = delta.npcs      ?? []
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

  async _loadSprites() {
    // Convention: all flat sprites under /assets/sprites/{key}.png — alias === filename without extension.
    // Projectile sprites must follow the projectile_* naming convention so ProjectileSprite.js
    // can look them up by spriteKey directly (e.g. 'projectile_fireball' → projectile_fireball.png).
    // To add a new projectile sprite: drop {spriteKey}.png in public/assets/sprites/ and add the
    // key here. No other files need changing (ProjectileSprite.js will fall back to projectile_default
    // if the key has no PROJECTILE_CONFIG entry, which is safe for basic tinted circles).
    const SPRITE_KEYS = [
      'player_shaman',
      'player_deathknight',
      'enemy_gaterepairer', 'enemy_leviathan', 'enemy_warlock',
      'enemy_flameofazzinoth', 'enemy_shadowdemon', 'enemy_shadowfiend',
      'boss_akama',
      'projectile_default',
      'projectile_avengers_shield',
      'projectile_fireball',
      'projectile_penance',
      'aura_pw_shield',
    ]
    const manifest = SPRITE_KEYS.map(k => ({ alias: k, src: `/assets/sprites/${k}.png` }))

    // Load 8 directional static sprites
    for (const cls of DIRECTIONAL_CLASSES) {
      for (const dir of DIRECTIONS) {
        manifest.push({ alias: `player_${cls}_${dir}`, src: `/assets/sprites/${cls}/${dir}.png` })
      }
    }

    // Load animation frames: player_{cls}_{anim}_{dir}_{frameIndex}
    for (const [cls, anims] of Object.entries(DIRECTIONAL_ANIMATIONS)) {
      for (const [animName, cfg] of Object.entries(anims)) {
        if (animName === 'skills') continue   // handled separately below
        for (const dir of DIRECTIONS) {
          for (let i = 0; i < cfg.frames; i++) {
            manifest.push({
              alias: `player_${cls}_${animName}_${dir}_${i}`,
              src:   `/assets/sprites/${cls}/${animName}/${dir}/${i}.png`,
            })
          }
        }
      }
      // Load per-skill fire animations: player_{cls}_{skillName}_{dir}_{frameIndex}
      if (anims.skills) {
        for (const [skillName, cfg] of Object.entries(anims.skills)) {
          for (const dir of DIRECTIONS) {
            for (let i = 0; i < cfg.frames; i++) {
              manifest.push({
                alias: `player_${cls}_${skillName}_${dir}_${i}`,
                src:   `/assets/sprites/${cls}/${skillName}/${dir}/${i}.png`,
              })
            }
          }
        }
      }
    }

    // Load directional static sprites (no animation, direction-only)
    for (const type of DIRECTIONAL_STATIC_ENEMIES) {
      for (const dir of DIRECTIONS) {
        manifest.push({ alias: `enemy_${type}_${dir}`, src: `/assets/sprites/${type}/${dir}.png` })
      }
    }

    // Load 8 directional static sprites for BT enemies
    for (const type of DIRECTIONAL_ENEMIES) {
      for (const dir of DIRECTIONS) {
        manifest.push({ alias: `enemy_${type}_${dir}`, src: `/assets/sprites/${type}/${dir}.png` })
      }
    }

    // Load animation frames: enemy_{type}_{anim}_{dir}_{frameIndex}
    for (const [type, anims] of Object.entries(DIRECTIONAL_ENEMY_ANIMATIONS)) {
      for (const [animName, cfg] of Object.entries(anims)) {
        for (const dir of DIRECTIONS) {
          for (let i = 0; i < cfg.frames; i++) {
            manifest.push({
              alias: `enemy_${type}_${animName}_${dir}_${i}`,
              src:   `/assets/sprites/${type}/${animName}/${dir}/${i}.png`,
            })
          }
        }
      }
    }

    // Boss directional sprites
    for (const type of DIRECTIONAL_BOSSES) {
      for (const dir of DIRECTIONS) {
        manifest.push({ alias: `${type}_${dir}`, src: `/assets/sprites/${type}/${dir}.png` })
      }
    }
    for (const [type, anims] of Object.entries(DIRECTIONAL_BOSS_ANIMATIONS)) {
      for (const [animName, cfg] of Object.entries(anims)) {
        for (const dir of DIRECTIONS) {
          for (let i = 0; i < cfg.frames; i++) {
            manifest.push({ alias: `${type}_${animName}_${dir}_${i}`, src: `/assets/sprites/${type}/${animName}/${dir}/${i}.png` })
          }
        }
      }
    }

    // NPC directional sprites
    for (const type of DIRECTIONAL_NPCS) {
      for (const dir of DIRECTIONS) {
        manifest.push({ alias: `${type}_${dir}`, src: `/assets/sprites/${type}/${dir}.png` })
      }
    }
    for (const [type, anims] of Object.entries(DIRECTIONAL_NPC_ANIMATIONS)) {
      for (const [animName, cfg] of Object.entries(anims)) {
        for (const dir of DIRECTIONS) {
          for (let i = 0; i < cfg.frames; i++) {
            manifest.push({ alias: `${type}_${animName}_${dir}_${i}`, src: `/assets/sprites/${type}/${animName}/${dir}/${i}.png` })
          }
        }
      }
    }

    await Assets.load(manifest)
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
