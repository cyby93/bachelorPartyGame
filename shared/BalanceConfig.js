/**
 * shared/BalanceConfig.js
 * Central balance constants. Tune RANGED_BASE_DPS first — everything cascades.
 *
 * ── How the cascade works ─────────────────────────────────────────────────
 *
 *  R  = RANGED_BASE_DPS   (the single tuning knob)
 *  X  = ENEMY_HP_MULT     (L5 reference unit: hp     = X × R)
 *  Y  = ENEMY_DAMAGE_MULT (L5 reference unit: damage = Y × R)
 *
 *  Changing R scales enemy HP, enemy damage, and Illidan HP proportionally.
 *  Fight duration at Normal difficulty stays constant at any R value — only
 *  the "weight" of numbers changes. Tune R until the fight FEELS right.
 *
 * ── Illidan HP derivation (13 players, Tier 3, Normal) ───────────────────
 *
 *  GroupDPS (theoretical) = 9.7 × R
 *    6 ranged × 1.0R  =  6.0R
 *    4 melee  × 0.7R  =  2.8R
 *    3 healers× 0.3R  =  0.9R
 *
 *  Illidan HP (13p) = GroupDPS × RLEF × 480s × 2.2  (perPlayer scaling)
 *                   = R × RLEF × 10,214.4
 *  Illidan BaseHP   = R × RLEF × 1,058  (÷ 2.2 player-count multiplier)
 *
 * ── RLEF (Real-Life Efficiency Factor) ───────────────────────────────────
 *
 *  Gap between theoretical optimal DPS and actual party-game performance.
 *  Acts as a difficulty dial: higher RLEF = assumes more competent players
 *  = more Illidan HP needed to fill 8 minutes = harder fight.
 *
 *    Easy   (0.3) — tuned for casual / distracted play
 *    Normal (0.5) — design baseline
 *    Hard   (0.7) — assumes near-optimal play
 */

export const BALANCE = {

  // ── DPS anchor ────────────────────────────────────────────────────────────
  RANGED_BASE_DPS: 10,           // R — start here, tune until 8-min fight feels right

  // ── Enemy stat multipliers ─────────────────────────────────────────────────
  ENEMY_HP_MULT:     5,          // X — L5 reference enemy hp     = X × R  (= 50 at defaults)
  ENEMY_DAMAGE_MULT: 4,          // Y — L5 reference enemy damage = Y × R  (= 40 at defaults)

  // ── Difficulty ─────────────────────────────────────────────────────────────
  RLEF: 0.5,                     // 0.3 = Easy | 0.5 = Normal | 0.7 = Hard

  // ── Illidan enrage ─────────────────────────────────────────────────────────
  // Triggers if fight exceeds ILLIDAN_ENRAGE_MS. Attack and cast cooldowns
  // are halved, forcing the encounter to resolve one way or another.
  ILLIDAN_ENRAGE_MS:           12 * 60 * 1000,   // 12 minutes
  ILLIDAN_ENRAGE_ATTACK_MULT:  2.0,              // ×2 attack speed (cooldowns halved)
  ILLIDAN_ENRAGE_CAST_MULT:    2.0,              // ×2 cast speed  (Phase 3 casts halved)
}
