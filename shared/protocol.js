/**
 * shared/protocol.js
 * All Socket.io event name constants — single source of truth.
 * Import this in both server and client code; never hardcode event strings.
 */

export const EVENTS = {
  // ── Client → Server ──────────────────────────────────────────────────────
  JOIN:         'game:join',       // { name, className, isHost }
  INPUT_MOVE:   'input:move',      // { x, y }  (normalised -1..1)
  INPUT_SKILL:  'input:skill',     // { index, vector: { x, y } }

  // ── Host → Server (host-only commands) ───────────────────────────────────
  START_GAME:   'host:start',
  RESTART_GAME: 'host:restart',

  // ── Server → All Clients ─────────────────────────────────────────────────
  INIT:          'game:init',       // full state snapshot sent on join
  STATE_DELTA:   'state:delta',     // incremental tick update (20 Hz)
  PLAYER_JOINED: 'player:joined',   // { player DTO }
  PLAYER_LEFT:   'player:left',     // socketId string
  SCENE_CHANGE:  'scene:change',    // { scene: 'lobby' | 'trashMob' | 'bossFight' | 'result' | 'gameover' }
  COOLDOWN:      'skill:cooldown',  // { playerId, skillIndex, expiresAt }
}
