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
  INPUT_AIM:       'input:aim',       // { vector: { x, y } }  — updates aim direction and preferred facing, no movement
  INPUT_HIGHLIGHT: 'input:highlight', // {}  — player requests a visual beacon on their character

  // ── Host → Server (host-only commands) ───────────────────────────────────
  START_GAME:    'host:start',
  RESTART_GAME:  'host:restart',
  HOST_ADVANCE:  'host:advance',    // host clicks "Continue" on level-complete screen
  QUIT_CAMPAIGN: 'host:quit',       // host aborts campaign mid-run → back to lobby
  SET_LEVEL:     'host:setLevel',   // { levelIndex } — debug: pick starting level from lobby
  BOT_ADD:       'host:botAdd',     // { className? } — undefined = random class
  BOT_REMOVE:    'host:botRemove',  // remove all bots
  DEBUG_SET_SKILL_TIER: 'host:debugSetSkillTier', // { skillIndex: 0-3, tier: 0-3 } — debug: set all players' upgrade tier
  DEBUG_SET_PLAYER_LEVEL: 'host:debugSetPlayerLevel', // { level: 0-10 } — debug: set all players' hp upgrade count
  DEBUG_SPAWN_ENEMY: 'host:debugSpawnEnemy', // { enemyType } — sandbox-only: spawn one enemy archetype
  DEBUG_CLEAR_ENEMIES: 'host:debugClearEnemies', // {} — sandbox-only: remove all active enemies

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
  SKILL_INTERRUPTED:   'skill:interrupted',    // { playerId } — cast/channel cancelled; client should abort cast animation immediately
  EFFECT_DAMAGE:       'effect:damage',        // { targetId, amount, type: 'damage'|'heal', sourceSkill }
  CHANNEL_INTERRUPTED: 'channel:interrupted',  // { playerId }
  CHANNEL_ENDED:       'channel:ended',        // { playerId } — channel completed its full duration naturally
  TARGETED_HIT:        'targeted:hit',         // { casterX, casterY, targetX, targetY, effectType, color }
  COMBO_POINTS:        'player:comboPoints',   // { playerId, points }
  PLAYER_HIGHLIGHT:    'player:highlight',     // { playerId }  — broadcast player's find-me beacon request
  GRIP_APPLIED:    'grip:applied',    // S→All: { targetId, targetX, targetY, casterX, casterY, casterPlayerId }

  // ── Quiz & Upgrade (between levels) ────────────────────────────────────
  QUIZ_QUESTION:        'quiz:question',        // S→All: { question, options }
  QUIZ_ANSWER:          'quiz:answer',          // C→S:   { chosenIndex }
  QUIZ_PROGRESS:        'quiz:progress',        // S→All: { answered, total }
  QUIZ_RESULTS:         'quiz:results',         // S→All: { correctIndex, playerResults: { [id]: bool } }
  QUIZ_UPGRADE_OPTIONS: 'quiz:upgradeOptions',  // S→C:   { skills: [{ name, icon, currentTier, maxTier, preview }] }
  QUIZ_UPGRADE:         'quiz:upgrade',         // C→S:   { skillIndex }
  QUIZ_UPGRADE_CHOSEN:  'quiz:upgradeChosen',   // S→All: { playerId, skillIndex, skillName }
  QUIZ_DONE:            'quiz:done',            // S→All: quiz resolved, host can continue

  // ── Boss dialog / Illidan encounter ─────────────────────────────────────
  BOSS_DIALOG_LINE:         'boss:dialog_line',         // S→All: { speaker, text, voiceKey?, durationMs? }
  BOSS_VO:                  'boss:boss_vo',             // S→All: { speaker, voiceKey } — reactive VO; no subtitle, no sfx duck
  ILLIDAN_PHASE_TRANSITION: 'illidan:phase_transition', // S→All: { phase, freeze?: bool, freezeDuration?: ms }
  ILLIDAN_AURA_PULSE:       'illidan:aura_pulse',       // S→All: { x, y, radius, color }

  // ── Level 2: Portal Beam Mechanic ───────────────────────────────────────
  PORTAL_BEAM_WARNING: 'portal:beam_warning', // S→All: { beamId, points: [{x,y}] } — 3s warning phase
  PORTAL_BEAM_DAMAGE:  'portal:beam_damage',  // S→All: { beamId, points: [{x,y}] } — active damage phase
  PORTAL_BEAM_END:     'portal:beam_end',     // S→All: { beamId }

  // ── Level transitions ────────────────────────────────────────────────────
  LEVEL_VICTORY:   'level:victory',   // S→All: fired when win condition met, before scene change — client plays closing VFX
  TRANSITION_VFX:  'transition:vfx',  // S→All: { event: string } — named VFX trigger during transitions

  DEBUG_ACTION_RESULT: 'debug:action_result', // S→Host: { message, isError? }

  // ── Connection lifecycle ─────────────────────────────────────────────────────
  HANDSHAKE:     'game:handshake',      // C→S: { token, name } — emitted on every connect
  HANDSHAKE_ACK: 'game:handshake_ack', // S→C: { freshToken } — Tier 3, stub for now
  FORCE_REJOIN:  'game:force_rejoin',   // S→C: { reason: 'kicked_by_host'|'session_reset'|'voluntary' }
  REJOIN:        'game:rejoin',         // C→S: {} — voluntary rejoin request
  PLAYER_READY:  'game:player_ready',   // C→S: {} — player tapped "I GOT IT" in staging briefing

  // ── Host session controls ────────────────────────────────────────────────────
  SESSION_RESET:   'host:session_reset',  // host→S: {} — nuke session, all players rejoin fresh
  KICK:            'host:kick',           // host→S: { playerId } — remove one player

  // ── Campaign entry ────────────────────────────────────────────────────────────
  HOST_ENTER_RAID: 'host:enterRaid',      // host→S: {} — from training grounds into level 1
}
