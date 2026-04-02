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
  INPUT_AIM:    'input:aim',       // { vector: { x, y } }  — updates aim direction and preferred facing, no movement

  // ── Host → Server (host-only commands) ───────────────────────────────────
  START_GAME:    'host:start',
  RESTART_GAME:  'host:restart',
  HOST_ADVANCE:  'host:advance',    // host clicks "Continue" on level-complete screen

  // ── Server → All Clients ─────────────────────────────────────────────────
  INIT:          'game:init',       // full state snapshot sent on join
  STATE_DELTA:   'state:delta',     // incremental tick update (20 Hz)
  PLAYER_JOINED: 'player:joined',   // { player DTO }
  PLAYER_LEFT:   'player:left',     // socketId string
  SCENE_CHANGE:  'scene:change',    // { scene, levelIndex?, totalLevels?, levelName?, objectives? }
  LEVEL_COMPLETE:    'level:complete',    // { levelIndex, levelName, stats }
  OBJECTIVE_UPDATE:  'objective:update',  // { objectives: [{ type, current, target }] }
  COOLDOWN:            'skill:cooldown',       // { playerId, skillIndex, durationMs }
  SKILL_FIRED:         'skill:fired',          // { playerId, skillName, type, subtype, x, y, angle, radius, range, color }
  EFFECT_DAMAGE:       'effect:damage',        // { targetId, amount, type: 'damage'|'heal', sourceSkill }
  CHANNEL_INTERRUPTED: 'channel:interrupted',  // { playerId }
  TARGETED_HIT:        'targeted:hit',         // { casterX, casterY, targetX, targetY, effectType, color }
  COMBO_POINTS:        'player:comboPoints',   // { playerId, points }
}
