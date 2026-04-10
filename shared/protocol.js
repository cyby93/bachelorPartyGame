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
  QUIT_CAMPAIGN: 'host:quit',       // host aborts campaign mid-run → back to lobby
  SET_LEVEL:     'host:setLevel',   // { levelIndex } — debug: pick starting level from lobby

  // ── Server → All Clients ─────────────────────────────────────────────────
  INIT:          'game:init',       // full state snapshot sent on join
  STATE_DELTA:   'state:delta',     // incremental tick update (20 Hz)
  PLAYER_JOINED: 'player:joined',   // { player DTO }
  PLAYER_LEFT:   'player:left',     // socketId string
  SCENE_CHANGE:  'scene:change',    // { scene, arenaWidth?, arenaHeight?, levelIndex?, totalLevels?, levelName?, objectives? }
  LEVEL_COMPLETE:    'level:complete',    // { levelIndex, levelName, stats }
  OBJECTIVE_UPDATE:  'objective:update',  // { objectives: [{ type, current, target }] }
  COOLDOWN:            'skill:cooldown',       // { playerId, skillIndex, durationMs }
  SKILL_FIRED:         'skill:fired',          // { playerId, skillName, type, subtype, x, y, angle, radius, range, color }
  EFFECT_DAMAGE:       'effect:damage',        // { targetId, amount, type: 'damage'|'heal', sourceSkill }
  CHANNEL_INTERRUPTED: 'channel:interrupted',  // { playerId }
  TARGETED_HIT:        'targeted:hit',         // { casterX, casterY, targetX, targetY, effectType, color }
  COMBO_POINTS:        'player:comboPoints',   // { playerId, points }

  // ── Quiz & Upgrade (between levels) ────────────────────────────────────
  QUIZ_QUESTION:        'quiz:question',        // S→All: { question, options }
  QUIZ_ANSWER:          'quiz:answer',          // C→S:   { chosenIndex }
  QUIZ_PROGRESS:        'quiz:progress',        // S→All: { answered, total }
  QUIZ_RESULTS:         'quiz:results',         // S→All: { correctIndex, playerResults: { [id]: bool } }
  QUIZ_UPGRADE_OPTIONS: 'quiz:upgradeOptions',  // S→C:   { skills: [{ name, icon, currentTier, maxTier, preview }] }
  QUIZ_UPGRADE:         'quiz:upgrade',         // C→S:   { skillIndex }
  QUIZ_UPGRADE_CHOSEN:  'quiz:upgradeChosen',   // S→All: { playerId, skillIndex, skillName }
  QUIZ_DONE:            'quiz:done',            // S→All: quiz resolved, host can continue

  // ── Illidan encounter (Level 5) ─────────────────────────────────────────
  ILLIDAN_DIALOG_LINE:      'illidan:dialog_line',      // S→All: { speaker, text }
  ILLIDAN_PHASE_TRANSITION: 'illidan:phase_transition', // S→All: { phase }
}
