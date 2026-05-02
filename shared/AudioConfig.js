/**
 * shared/AudioConfig.js
 *
 * Shared audio-facing identifiers and placeholder-friendly routing config.
 * Playback logic lives on clients; this file is the contract for what the
 * game means by a level, skill, or encounter audio key.
 */

import SkillDatabase from './SkillDatabase.js'

export const AUDIO_STORAGE_KEYS = {
  HOST_SETTINGS: 'raid-night:host-audio-settings',
  CONTROLLER_SETTINGS: 'raid-night:controller-audio-settings',
}

export const AUDIO_BUS_DEFAULTS = {
  master: 0.85,
  music: 0.65,
  sfx: 0.85,
  voice: 0.9,
}

export const CONTROLLER_AUDIO_BUS_DEFAULTS = {
  master: 0.7,
  sfx: 0.65,
}

export const AUDIO_DUCKING = {
  voiceMusicMultiplier: 0.45,
  voiceSfxMultiplier: 0.85,
  releaseMs: 220,
}

export const LEVEL_AUDIO = {
  lobby: {
    music: { key: 'music_lobby_gathering', src: '/assets/audio/music/music_lobby_gathering.mp3', loop: true },
  },
  result: {
    music: { key: 'music_result_victory', src: '/assets/audio/music/music_result_victory.mp3', loop: true },
  },
  gameover: {
    music: { key: 'music_result_defeat', src: '/assets/audio/music/music_result_defeat.mp3', loop: true },
  },
  debug_test_level: {
    music: { key: 'music_debug_sandbox', src: '/assets/audio/music/music_debug_sandbox.mp3', loop: true },
  },
  level_1: {
    music: { key: 'music_level_1_courtyard', src: '/assets/audio/music/music_level_1_courtyard.mp3', loop: true },
  },
  level_2: {
    music: { key: 'music_level_2_siege', src: '/assets/audio/music/music_level_2_siege.mp3', loop: true },
  },
  level_3: {
    music: { key: 'music_level_3_gates', src: '/assets/audio/music/music_level_3_gates.mp3', loop: true },
  },
  level_4: {
    music: { key: 'music_level_4_cavern', src: '/assets/audio/music/music_level_4_cavern.mp3', loop: true },
  },
  level_5: {
    music: { key: 'music_level_5_shade', src: '/assets/audio/music/music_level_5_shade.mp3', loop: true },
  },
  level_6: {
    music: { key: 'music_level_6_illidan', src: '/assets/audio/music/music_level_6_illidan.mp3', loop: true },
  },
}

export const AUDIO_STINGERS = {
  sceneTransition: { key: 'stinger_scene_transition', src: '/assets/audio/sfx/stinger_scene_transition.mp3' },
  victory: { key: 'stinger_victory', src: '/assets/audio/sfx/stinger_victory.mp3' },
  defeat: { key: 'stinger_defeat', src: '/assets/audio/sfx/stinger_defeat.mp3' },
  playerJoin: { key: 'ui_player_join', src: '/assets/audio/sfx/ui_player_join.mp3' },
  playerDown: { key: 'ui_player_downed', src: '/assets/audio/sfx/ui_player_downed.mp3' },
  hitDamage: { key: 'combat_hit_damage', src: '/assets/audio/sfx/combat_hit_damage.mp3' },
  hitHeal: { key: 'combat_hit_heal', src: '/assets/audio/sfx/combat_hit_heal.mp3' },
  phaseTransition: { key: 'boss_phase_transition', src: '/assets/audio/sfx/boss_phase_transition.mp3' },
}

export const AUDIO_ONE_SHOTS = {
  combat_targeted_hit: { key: 'combat_targeted_hit', src: '/assets/audio/sfx/combat_targeted_hit.mp3' },
  portal_beam_warning: { key: 'portal_beam_warning', src: '/assets/audio/sfx/portal_beam_warning.mp3' },
  portal_beam_damage: { key: 'portal_beam_damage', src: '/assets/audio/sfx/portal_beam_damage.mp3' },
  portal_beam_end: { key: 'portal_beam_end', src: '/assets/audio/sfx/portal_beam_end.mp3' },
  boss_aura_pulse: { key: 'boss_aura_pulse', src: '/assets/audio/sfx/boss_aura_pulse.mp3' },
  sfx_enemy_felguard_melee: { key: 'sfx_enemy_felguard_melee', src: '/assets/audio/sfx/sfx_enemy_felguard_melee.mp3' },
  sfx_enemy_bonechewer_brute_melee: { key: 'sfx_enemy_bonechewer_brute_melee', src: '/assets/audio/sfx/sfx_enemy_bonechewer_brute_melee.mp3' },
  sfx_enemy_illidari_centurion_charge: { key: 'sfx_enemy_illidari_centurion_charge', src: '/assets/audio/sfx/sfx_enemy_illidari_centurion_charge.mp3' },
  sfx_enemy_bonechewer_blade_fury_spin: { key: 'sfx_enemy_bonechewer_blade_fury_spin', src: '/assets/audio/sfx/sfx_enemy_bonechewer_blade_fury_spin.mp3' },
  sfx_enemy_blood_prophet_channel: { key: 'sfx_enemy_blood_prophet_channel', src: '/assets/audio/sfx/sfx_enemy_blood_prophet_channel.mp3' },
  sfx_enemy_ritual_channeler_channel: { key: 'sfx_enemy_ritual_channeler_channel', src: '/assets/audio/sfx/sfx_enemy_ritual_channeler_channel.mp3' },
  sfx_enemy_gate_repairer_channel: { key: 'sfx_enemy_gate_repairer_channel', src: '/assets/audio/sfx/sfx_enemy_gate_repairer_channel.mp3' },
  sfx_enemy_leviathan_ranged: { key: 'sfx_enemy_leviathan_ranged', src: '/assets/audio/sfx/sfx_enemy_leviathan_ranged.mp3' },
  sfx_enemy_warlock_channel: { key: 'sfx_enemy_warlock_channel', src: '/assets/audio/sfx/sfx_enemy_warlock_channel.mp3' },
  sfx_enemy_coilskar_serpent_guard_cast: { key: 'sfx_enemy_coilskar_serpent_guard_cast', src: '/assets/audio/sfx/sfx_enemy_coilskar_serpent_guard_cast.mp3' },
  sfx_enemy_coilskar_serpent_guard_impact: { key: 'sfx_enemy_coilskar_serpent_guard_impact', src: '/assets/audio/sfx/sfx_enemy_coilskar_serpent_guard_impact.mp3' },
  sfx_enemy_flame_of_azzinoth_aura: { key: 'sfx_enemy_flame_of_azzinoth_aura', src: '/assets/audio/sfx/sfx_enemy_flame_of_azzinoth_aura.mp3' },
  sfx_enemy_shadowfiend_spawn: { key: 'sfx_enemy_shadowfiend_spawn', src: '/assets/audio/sfx/sfx_enemy_shadowfiend_spawn.mp3' },
  sfx_enemy_shadowfiend_impact: { key: 'sfx_enemy_shadowfiend_impact', src: '/assets/audio/sfx/sfx_enemy_shadowfiend_impact.mp3' },
  sfx_boss_illidan_cast: { key: 'sfx_boss_illidan_cast', src: '/assets/audio/sfx/sfx_boss_illidan_cast.mp3' },
  sfx_boss_illidan_impact: { key: 'sfx_boss_illidan_impact', src: '/assets/audio/sfx/sfx_boss_illidan_impact.mp3' },
  sfx_boss_illidan_summon: { key: 'sfx_boss_illidan_summon', src: '/assets/audio/sfx/sfx_boss_illidan_summon.mp3' },
  sfx_boss_shade_of_akama_cast: { key: 'sfx_boss_shade_of_akama_cast', src: '/assets/audio/sfx/sfx_boss_shade_of_akama_cast.mp3' },
  sfx_boss_shade_of_akama_impact: { key: 'sfx_boss_shade_of_akama_impact', src: '/assets/audio/sfx/sfx_boss_shade_of_akama_impact.mp3' },
  sfx_enemy_felguard_cast: { key: 'sfx_enemy_felguard_cast', src: '/assets/audio/sfx/sfx_enemy_felguard_cast.mp3' },
  sfx_enemy_felguard_impact: { key: 'sfx_enemy_felguard_impact', src: '/assets/audio/sfx/sfx_enemy_felguard_impact.mp3' },
  sfx_enemy_coilskar_harpooner_cast: { key: 'sfx_enemy_coilskar_harpooner_cast', src: '/assets/audio/sfx/sfx_enemy_coilskar_harpooner_cast.mp3' },
  sfx_enemy_coilskar_harpooner_impact: { key: 'sfx_enemy_coilskar_harpooner_impact', src: '/assets/audio/sfx/sfx_enemy_coilskar_harpooner_impact.mp3' },
  sfx_enemy_bonechewer_brute_cast: { key: 'sfx_enemy_bonechewer_brute_cast', src: '/assets/audio/sfx/sfx_enemy_bonechewer_brute_cast.mp3' },
  sfx_enemy_bonechewer_brute_impact: { key: 'sfx_enemy_bonechewer_brute_impact', src: '/assets/audio/sfx/sfx_enemy_bonechewer_brute_impact.mp3' },
  sfx_enemy_ashtongue_mystic_cast: { key: 'sfx_enemy_ashtongue_mystic_cast', src: '/assets/audio/sfx/sfx_enemy_ashtongue_mystic_cast.mp3' },
  sfx_enemy_ashtongue_mystic_impact: { key: 'sfx_enemy_ashtongue_mystic_impact', src: '/assets/audio/sfx/sfx_enemy_ashtongue_mystic_impact.mp3' },
  sfx_enemy_shadow_demon_cast: { key: 'sfx_enemy_shadow_demon_cast', src: '/assets/audio/sfx/sfx_enemy_shadow_demon_cast.mp3' },
  sfx_enemy_shadow_demon_impact: { key: 'sfx_enemy_shadow_demon_impact', src: '/assets/audio/sfx/sfx_enemy_shadow_demon_impact.mp3' },
}

export const AUDIO_EVENT_FAMILIES = {
  MELEE: 'sfx_family_melee',
  PROJECTILE: 'sfx_family_projectile',
  CAST: 'sfx_family_cast',
  CHANNEL: 'sfx_family_channel',
  TARGETED: 'sfx_family_targeted',
  AOE: 'sfx_family_aoe',
  DASH: 'sfx_family_dash',
  BUFF: 'sfx_family_buff',
  SHIELD: 'sfx_family_shield',
  SPAWN: 'sfx_family_spawn',
}

export const AUDIO_SUBTYPE_FAMILIES = {
  AOE_SELF: 'sfx_family_aoe_self',
  AOE_LOBBED: 'sfx_family_aoe_lobbed',
  BLADESTORM: 'sfx_family_bladestorm',
  BEAM: 'sfx_family_beam',
  HEAL_ALLY: 'sfx_family_heal',
  DAMAGE_ENEMY: 'sfx_family_targeted_damage',
  TELEPORT: 'sfx_family_teleport',
  TELEPORT_BEHIND: 'sfx_family_teleport',
  TOTEM: 'sfx_family_totem',
  TRAP: 'sfx_family_trap',
  PET: 'sfx_family_pet',
  STEALTH: 'sfx_family_stealth',
  TOGGLE: 'sfx_family_toggle',
  UNTARGETED: 'sfx_family_untargeted',
}

function toAudioKey(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function deriveSkillFamily(skill) {
  if (skill?.audio?.family) return skill.audio.family
  if (skill?.subtype && AUDIO_SUBTYPE_FAMILIES[skill.subtype]) return AUDIO_SUBTYPE_FAMILIES[skill.subtype]
  if (skill?.type && AUDIO_EVENT_FAMILIES[skill.type]) return AUDIO_EVENT_FAMILIES[skill.type]
  return 'sfx_family_generic'
}

function createSkillAudio(className, family, cast, impact, travel = null, precast = null, channel = null) {
  return { className, family, cast, impact, travel, precast, channel }
}

function buildExplicitSkillAudioMap() {
  return {
    Cleave: createSkillAudio('Warrior', 'sfx_family_melee_heavy', 'sfx_skill_cleave_cast', 'sfx_skill_cleave_impact'),
    'Thunder Clap': createSkillAudio('Warrior', 'sfx_family_aoe_shockwave', 'sfx_skill_thunder_clap_cast', 'sfx_skill_thunder_clap_impact'),
    Bladestorm: createSkillAudio('Warrior', 'sfx_family_bladestorm', 'sfx_skill_bladestorm_cast', 'sfx_skill_bladestorm_impact', null, null, 'sfx_skill_bladestorm_channel'),
    'Shield Wall': createSkillAudio('Warrior', 'sfx_family_shield_guard', 'sfx_skill_shield_wall_cast', 'sfx_skill_shield_wall_impact'),

    'Hammer Swing': createSkillAudio('Paladin', 'sfx_family_melee_holy', 'sfx_skill_hammer_swing_cast', 'sfx_skill_hammer_swing_impact'),
    "Avenger's Shield": createSkillAudio('Paladin', 'sfx_family_holy_projectile', 'sfx_skill_avengers_shield_cast', 'sfx_skill_avengers_shield_impact', 'sfx_skill_avengers_shield_travel'),
    'Divine Shield': createSkillAudio('Paladin', 'sfx_family_holy_barrier', 'sfx_skill_divine_shield_cast', 'sfx_skill_divine_shield_impact'),
    Consecration: createSkillAudio('Paladin', 'sfx_family_holy_ground', 'sfx_skill_consecration_cast', 'sfx_skill_consecration_impact'),

    'Lightning Bolt': createSkillAudio('Shaman', 'sfx_family_lightning_cast', 'sfx_skill_lightning_bolt_cast', 'sfx_skill_lightning_bolt_impact', 'sfx_skill_lightning_bolt_travel', 'sfx_skill_lightning_bolt_precast'),
    'Chain Heal': createSkillAudio('Shaman', 'sfx_family_heal_chain', 'sfx_skill_chain_heal_cast', 'sfx_skill_chain_heal_impact', 'sfx_skill_chain_heal_travel', 'sfx_skill_chain_heal_precast'),
    'Searing Totem': createSkillAudio('Shaman', 'sfx_family_totem_fire', 'sfx_skill_searing_totem_cast', 'sfx_skill_searing_totem_impact'),
    Bloodlust: createSkillAudio('Shaman', 'sfx_family_bloodlust', 'sfx_skill_bloodlust_cast', 'sfx_skill_bloodlust_impact'),

    'Shoot Bow': createSkillAudio('Hunter', 'sfx_family_arrow', 'sfx_skill_shoot_bow_cast', 'sfx_skill_shoot_bow_impact', 'sfx_skill_shoot_bow_travel', 'sfx_skill_shoot_bow_precast'),
    'Aimed Shot': createSkillAudio('Hunter', 'sfx_family_arrow_heavy', 'sfx_skill_aimed_shot_cast', 'sfx_skill_aimed_shot_impact', 'sfx_skill_aimed_shot_travel', 'sfx_skill_aimed_shot_precast'),
    'Call of the Wild': createSkillAudio('Hunter', 'sfx_family_beast_summon', 'sfx_skill_call_of_the_wild_cast', 'sfx_skill_call_of_the_wild_impact'),
    'Explosive Trap': createSkillAudio('Hunter', 'sfx_family_trap_explosive', 'sfx_skill_explosive_trap_cast', 'sfx_skill_explosive_trap_impact'),

    Penance: createSkillAudio('Priest', 'sfx_family_holy_burst', 'sfx_skill_penance_cast', 'sfx_skill_penance_impact', 'sfx_skill_penance_travel'),
    'Holy Nova': createSkillAudio('Priest', 'sfx_family_holy_nova', 'sfx_skill_holy_nova_cast', 'sfx_skill_holy_nova_impact'),
    'Power Word: Shield': createSkillAudio('Priest', 'sfx_family_holy_barrier', 'sfx_skill_power_word_shield_cast', 'sfx_skill_power_word_shield_impact'),
    'Mass Resurrection': createSkillAudio('Priest', 'sfx_family_resurrection', 'sfx_skill_mass_resurrection_cast', 'sfx_skill_mass_resurrection_impact', null, 'sfx_skill_mass_resurrection_precast', 'sfx_skill_mass_resurrection_channel'),

    Fireball: createSkillAudio('Mage', 'sfx_family_fire_projectile', 'sfx_skill_fireball_cast', 'sfx_skill_fireball_impact', 'sfx_skill_fireball_travel', 'sfx_skill_fireball_precast'),
    'Frost Nova': createSkillAudio('Mage', 'sfx_family_frost_nova', 'sfx_skill_frost_nova_cast', 'sfx_skill_frost_nova_impact'),
    Blink: createSkillAudio('Mage', 'sfx_family_teleport_arcane', 'sfx_skill_blink_cast', 'sfx_skill_blink_impact'),
    Pyroblast: createSkillAudio('Mage', 'sfx_family_fire_projectile_heavy', 'sfx_skill_pyroblast_cast', 'sfx_skill_pyroblast_impact', 'sfx_skill_pyroblast_travel', 'sfx_skill_pyroblast_precast'),

    Wrath: createSkillAudio('Druid', 'sfx_family_nature_projectile', 'sfx_skill_wrath_cast', 'sfx_skill_wrath_impact', 'sfx_skill_wrath_travel', 'sfx_skill_wrath_precast'),
    Moonfire: createSkillAudio('Druid', 'sfx_family_moonfire', 'sfx_skill_moonfire_cast', 'sfx_skill_moonfire_impact'),
    Regrowth: createSkillAudio('Druid', 'sfx_family_regrowth', 'sfx_skill_regrowth_cast', 'sfx_skill_regrowth_impact', null, 'sfx_skill_regrowth_precast'),
    Tranquility: createSkillAudio('Druid', 'sfx_family_tranquility', 'sfx_skill_tranquility_cast', 'sfx_skill_tranquility_impact', null, null, 'sfx_skill_tranquility_channel'),

    'Sinister Strike': createSkillAudio('Rogue', 'sfx_family_melee_quick', 'sfx_skill_sinister_strike_cast', 'sfx_skill_sinister_strike_impact'),
    Vanish: createSkillAudio('Rogue', 'sfx_family_stealth', 'sfx_skill_vanish_cast', 'sfx_skill_vanish_impact'),
    Sprint: createSkillAudio('Rogue', 'sfx_family_sprint', 'sfx_skill_sprint_cast', 'sfx_skill_sprint_impact'),
    Ambush: createSkillAudio('Rogue', 'sfx_family_teleport_assassinate', 'sfx_skill_ambush_cast', 'sfx_skill_ambush_impact'),

    'Shadow Bolt': createSkillAudio('Warlock', 'sfx_family_shadow_projectile', 'sfx_skill_shadow_bolt_cast', 'sfx_skill_shadow_bolt_impact', 'sfx_skill_shadow_bolt_travel', 'sfx_skill_shadow_bolt_precast'),
    Corruption: createSkillAudio('Warlock', 'sfx_family_shadow_dot', 'sfx_skill_corruption_cast', 'sfx_skill_corruption_impact'),
    'Drain Life': createSkillAudio('Warlock', 'sfx_family_drain_beam', 'sfx_skill_drain_life_cast', 'sfx_skill_drain_life_impact', null, null, 'sfx_skill_drain_life_channel'),
    Fear: createSkillAudio('Warlock', 'sfx_family_fear', 'sfx_skill_fear_cast', 'sfx_skill_fear_impact', null, 'sfx_skill_fear_precast'),

    Obliterate: createSkillAudio('DeathKnight', 'sfx_family_frost_melee', 'sfx_skill_obliterate_cast', 'sfx_skill_obliterate_impact'),
    'Death Grip': createSkillAudio('DeathKnight', 'sfx_family_grip', 'sfx_skill_death_grip_cast', 'sfx_skill_death_grip_impact'),
    'Death and Decay': createSkillAudio('DeathKnight', 'sfx_family_death_decay', 'sfx_skill_death_and_decay_cast', 'sfx_skill_death_and_decay_impact', null, null, 'sfx_skill_death_and_decay_channel'),
    'Anti-Magic Shell': createSkillAudio('DeathKnight', 'sfx_family_anti_magic_shell', 'sfx_skill_anti_magic_shell_cast', 'sfx_skill_anti_magic_shell_impact'),
  }
}

function buildSkillAudioMap() {
  const explicit = buildExplicitSkillAudioMap()
  const map = {}

  for (const [className, skills] of Object.entries(SkillDatabase)) {
    for (const skill of skills) {
      const skillKey = toAudioKey(skill.name)
      map[skill.name] = explicit[skill.name] ?? {
        className,
        family: deriveSkillFamily(skill),
        cast: skill.audio?.cast ?? `sfx_skill_${skillKey}_cast`,
        impact: skill.audio?.impact ?? `sfx_skill_${skillKey}_impact`,
        travel: skill.audio?.travel ?? null,
        precast: skill.audio?.precast ?? null,
        channel: skill.audio?.channel ?? null,
      }
    }
  }

  return map
}

export const SKILL_AUDIO = buildSkillAudioMap()

export const SKILL_AUDIO_ONE_SHOTS = {
  sfx_skill_cleave_cast: { key: 'sfx_skill_cleave_cast', src: '/assets/sounds/sfx_skill_cleave_cast.ogg' },
  sfx_skill_cleave_impact: { key: 'sfx_skill_cleave_impact', src: '/assets/sounds/sfx_skill_cleave_impact.ogg' },
  sfx_skill_thunder_clap_cast: { key: 'sfx_skill_thunder_clap_cast', src: '/assets/sounds/sfx_skill_thunder_clap_cast.ogg' },
  sfx_skill_thunder_clap_impact: { key: 'sfx_skill_thunder_clap_impact', src: '/assets/sounds/sfx_skill_thunder_clap_impact.ogg' },
  sfx_skill_bladestorm_cast: { key: 'sfx_skill_bladestorm_cast', src: '/assets/sounds/sfx_skill_bladestorm_cast.ogg' },
  sfx_skill_bladestorm_impact: { key: 'sfx_skill_bladestorm_impact', src: '/assets/sounds/sfx_skill_bladestorm_impact.ogg' },
  sfx_skill_bladestorm_channel: { key: 'sfx_skill_bladestorm_channel', src: '/assets/sounds/sfx_skill_bladestorm_channel.ogg' },
  sfx_skill_shield_wall_cast: { key: 'sfx_skill_shield_wall_cast', src: '/assets/sounds/sfx_skill_shield_wall_cast.ogg' },
  sfx_skill_hammer_swing_cast: { key: 'sfx_skill_hammer_swing_cast', src: '/assets/sounds/sfx_skill_hammer_swing_cast.ogg' },
  sfx_skill_hammer_swing_impact: { key: 'sfx_skill_hammer_swing_impact', src: '/assets/sounds/sfx_skill_hammer_swing_impact.ogg' },
  sfx_skill_avengers_shield_cast: { key: 'sfx_skill_avengers_shield_cast', src: '/assets/sounds/sfx_skill_avengers_shield_cast.ogg' },
  sfx_skill_avengers_shield_impact: { key: 'sfx_skill_avengers_shield_impact', src: '/assets/sounds/sfx_skill_avengers_shield_impact.ogg' },
  sfx_skill_divine_shield_cast: { key: 'sfx_skill_divine_shield_cast', src: '/assets/sounds/sfx_skill_divine_shield_cast.ogg' },
  sfx_skill_divine_shield_impact: { key: 'sfx_skill_divine_shield_impact', src: '/assets/sounds/sfx_skill_divine_shield_impact.ogg' },
  sfx_skill_consecration_cast: { key: 'sfx_skill_consecration_cast', src: '/assets/sounds/sfx_skill_consecration_cast.ogg' },
  sfx_skill_consecration_impact: { key: 'sfx_skill_consecration_impact', src: '/assets/sounds/sfx_skill_consecration_impact.ogg' },
  sfx_skill_lightning_bolt_precast: { key: 'sfx_skill_lightning_bolt_precast', src: '/assets/sounds/sfx_skill_lightning_bolt_precast.ogg' },
  sfx_skill_lightning_bolt_cast: { key: 'sfx_skill_lightning_bolt_cast', src: '/assets/sounds/sfx_skill_lightning_bolt_cast.ogg' },
  sfx_skill_lightning_bolt_impact: { key: 'sfx_skill_lightning_bolt_impact', src: '/assets/sounds/sfx_skill_lightning_bolt_impact.ogg' },
  sfx_skill_chain_heal_precast: { key: 'sfx_skill_chain_heal_precast', src: '/assets/sounds/sfx_skill_chain_heal_precast.ogg' },
  sfx_skill_chain_heal_cast: { key: 'sfx_skill_chain_heal_cast', src: '/assets/sounds/sfx_skill_chain_heal_cast.ogg' },
  sfx_skill_chain_heal_impact: { key: 'sfx_skill_chain_heal_impact', src: '/assets/sounds/sfx_skill_chain_heal_impact.ogg' },
  sfx_skill_searing_totem_cast: { key: 'sfx_skill_searing_totem_cast', src: '/assets/sounds/sfx_skill_searing_totem_cast.ogg' },
  sfx_skill_bloodlust_cast: { key: 'sfx_skill_bloodlust_cast', src: '/assets/sounds/sfx_skill_bloodlust_cast.ogg' },
  sfx_skill_shoot_bow_precast: { key: 'sfx_skill_shoot_bow_precast', src: '/assets/sounds/sfx_skill_shoot_bow_precast.ogg' },
  sfx_skill_shoot_bow_cast: { key: 'sfx_skill_shoot_bow_cast', src: '/assets/sounds/sfx_skill_shoot_bow_cast.ogg' },
  sfx_skill_shoot_bow_impact: { key: 'sfx_skill_shoot_bow_impact', src: '/assets/sounds/sfx_skill_shoot_bow_impact.ogg' },
  sfx_skill_aimed_shot_precast: { key: 'sfx_skill_aimed_shot_precast', src: '/assets/sounds/sfx_skill_aimed_shot_precast.ogg' },
  sfx_skill_aimed_shot_cast: { key: 'sfx_skill_aimed_shot_cast', src: '/assets/sounds/sfx_skill_aimed_shot_cast.ogg' },
  sfx_skill_aimed_shot_impact: { key: 'sfx_skill_aimed_shot_impact', src: '/assets/sounds/sfx_skill_aimed_shot_impact.ogg' },
  sfx_skill_call_of_the_wild_cast: { key: 'sfx_skill_call_of_the_wild_cast', src: '/assets/sounds/sfx_skill_call_of_the_wild_cast.ogg' },
  sfx_skill_explosive_trap_cast: { key: 'sfx_skill_explosive_trap_cast', src: '/assets/sounds/sfx_skill_explosive_trap_cast.ogg' },
  sfx_skill_explosive_trap_impact: { key: 'sfx_skill_explosive_trap_impact', src: '/assets/sounds/sfx_skill_explosive_trap_impact.ogg' },
  sfx_skill_penance_cast: { key: 'sfx_skill_penance_cast', src: '/assets/sounds/sfx_skill_penance_cast.ogg' },
  sfx_skill_penance_impact: { key: 'sfx_skill_penance_impact', src: '/assets/sounds/sfx_skill_penance_impact.ogg' },
  sfx_skill_holy_nova_cast: { key: 'sfx_skill_holy_nova_cast', src: '/assets/sounds/sfx_skill_holy_nova_cast.ogg' },
  sfx_skill_holy_nova_impact: { key: 'sfx_skill_holy_nova_impact', src: '/assets/sounds/sfx_skill_holy_nova_impact.ogg' },
  sfx_skill_power_word_shield_cast: { key: 'sfx_skill_power_word_shield_cast', src: '/assets/sounds/sfx_skill_power_word_shield_cast.ogg' },
  sfx_skill_power_word_shield_impact: { key: 'sfx_skill_power_word_shield_impact', src: '/assets/sounds/sfx_skill_power_word_shield_impact.ogg' },
  sfx_skill_mass_resurrection_precast: { key: 'sfx_skill_mass_resurrection_precast', src: '/assets/sounds/sfx_skill_mass_resurrection_precast.ogg' },
  sfx_skill_mass_resurrection_cast: { key: 'sfx_skill_mass_resurrection_cast', src: '/assets/sounds/sfx_skill_mass_resurrection_cast.ogg' },
  sfx_skill_mass_resurrection_impact: { key: 'sfx_skill_mass_resurrection_impact', src: '/assets/sounds/sfx_skill_mass_resurrection_impact.ogg' },
  sfx_skill_mass_resurrection_channel: { key: 'sfx_skill_mass_resurrection_channel', src: '/assets/sounds/sfx_skill_mass_resurrection_channel.ogg' },
  sfx_skill_fireball_precast: { key: 'sfx_skill_fireball_precast', src: '/assets/sounds/sfx_skill_fireball_precast.ogg' },
  sfx_skill_fireball_cast: { key: 'sfx_skill_fireball_cast', src: '/assets/sounds/sfx_skill_fireball_cast.ogg' },
  sfx_skill_fireball_impact: { key: 'sfx_skill_fireball_impact', src: '/assets/sounds/sfx_skill_fireball_impact.ogg' },
  sfx_skill_frost_nova_cast: { key: 'sfx_skill_frost_nova_cast', src: '/assets/sounds/sfx_skill_frost_nova_cast.ogg' },
  sfx_skill_frost_nova_impact: { key: 'sfx_skill_frost_nova_impact', src: '/assets/sounds/sfx_skill_frost_nova_impact.ogg' },
  sfx_skill_blink_cast: { key: 'sfx_skill_blink_cast', src: '/assets/sounds/sfx_skill_blink_cast.ogg' },
  sfx_skill_blink_impact: { key: 'sfx_skill_blink_impact', src: '/assets/sounds/sfx_skill_blink_impact.ogg' },
  sfx_skill_pyroblast_precast: { key: 'sfx_skill_pyroblast_precast', src: '/assets/sounds/sfx_skill_pyroblast_precast.ogg' },
  sfx_skill_pyroblast_cast: { key: 'sfx_skill_pyroblast_cast', src: '/assets/sounds/sfx_skill_pyroblast_cast.ogg' },
  sfx_skill_pyroblast_impact: { key: 'sfx_skill_pyroblast_impact', src: '/assets/sounds/sfx_skill_pyroblast_impact.ogg' },
  sfx_skill_wrath_precast: { key: 'sfx_skill_wrath_precast', src: '/assets/sounds/sfx_skill_wrath_precast.ogg' },
  sfx_skill_wrath_cast: { key: 'sfx_skill_wrath_cast', src: '/assets/sounds/sfx_skill_wrath_cast.ogg' },
  sfx_skill_wrath_impact: { key: 'sfx_skill_wrath_impact', src: '/assets/sounds/sfx_skill_wrath_impact.ogg' },
  sfx_skill_moonfire_cast: { key: 'sfx_skill_moonfire_cast', src: '/assets/sounds/sfx_skill_moonfire_cast.ogg' },
  sfx_skill_moonfire_impact: { key: 'sfx_skill_moonfire_impact', src: '/assets/sounds/sfx_skill_moonfire_impact.ogg' },
  sfx_skill_regrowth_precast: { key: 'sfx_skill_regrowth_precast', src: '/assets/sounds/sfx_skill_regrowth_precast.ogg' },
  sfx_skill_regrowth_cast: { key: 'sfx_skill_regrowth_cast', src: '/assets/sounds/sfx_skill_regrowth_cast.ogg' },
  sfx_skill_regrowth_impact: { key: 'sfx_skill_regrowth_impact', src: '/assets/sounds/sfx_skill_regrowth_impact.ogg' },
  sfx_skill_tranquility_cast: { key: 'sfx_skill_tranquility_cast', src: '/assets/sounds/sfx_skill_tranquility_cast.ogg' },
  sfx_skill_tranquility_channel: { key: 'sfx_skill_tranquility_channel', src: '/assets/sounds/sfx_skill_tranquility_channel.ogg' },
  sfx_skill_sinister_strike_cast: { key: 'sfx_skill_sinister_strike_cast', src: '/assets/sounds/sfx_skill_sinister_strike_cast.ogg' },
  sfx_skill_sinister_strike_impact: { key: 'sfx_skill_sinister_strike_impact', src: '/assets/sounds/sfx_skill_sinister_strike_impact.ogg' },
  sfx_skill_vanish_cast: { key: 'sfx_skill_vanish_cast', src: '/assets/sounds/sfx_skill_vanish_cast.ogg' },
  sfx_skill_sprint_cast: { key: 'sfx_skill_sprint_cast', src: '/assets/sounds/sfx_skill_sprint_cast.ogg' },
  sfx_skill_ambush_cast: { key: 'sfx_skill_ambush_cast', src: '/assets/sounds/sfx_skill_ambush_cast.ogg' },
  sfx_skill_ambush_impact: { key: 'sfx_skill_ambush_impact', src: '/assets/sounds/sfx_skill_ambush_impact.ogg' },
  sfx_skill_shadow_bolt_precast: { key: 'sfx_skill_shadow_bolt_precast', src: '/assets/sounds/sfx_skill_shadow_bolt_precast.ogg' },
  sfx_skill_shadow_bolt_cast: { key: 'sfx_skill_shadow_bolt_cast', src: '/assets/sounds/sfx_skill_shadow_bolt_cast.ogg' },
  sfx_skill_shadow_bolt_impact: { key: 'sfx_skill_shadow_bolt_impact', src: '/assets/sounds/sfx_skill_shadow_bolt_impact.ogg' },
  sfx_skill_corruption_cast: { key: 'sfx_skill_corruption_cast', src: '/assets/sounds/sfx_skill_corruption_cast.ogg' },
  sfx_skill_corruption_impact: { key: 'sfx_skill_corruption_impact', src: '/assets/sounds/sfx_skill_corruption_impact.ogg' },
  sfx_skill_drain_life_cast: { key: 'sfx_skill_drain_life_cast', src: '/assets/sounds/sfx_skill_drain_life_cast.ogg' },
  sfx_skill_drain_life_channel: { key: 'sfx_skill_drain_life_channel', src: '/assets/sounds/sfx_skill_drain_life_channel.ogg' },
  sfx_skill_fear_precast: { key: 'sfx_skill_fear_precast', src: '/assets/sounds/sfx_skill_fear_precast.ogg' },
  sfx_skill_fear_cast: { key: 'sfx_skill_fear_cast', src: '/assets/sounds/sfx_skill_fear_cast.ogg' },
  sfx_skill_obliterate_cast: { key: 'sfx_skill_obliterate_cast', src: '/assets/sounds/sfx_skill_obliterate_cast.ogg' },
  sfx_skill_obliterate_impact: { key: 'sfx_skill_obliterate_impact', src: '/assets/sounds/sfx_skill_obliterate_impact.ogg' },
  sfx_skill_death_grip_cast: { key: 'sfx_skill_death_grip_cast', src: '/assets/sounds/sfx_skill_death_grip_cast.ogg' },
  sfx_skill_death_grip_impact: { key: 'sfx_skill_death_grip_impact', src: '/assets/sounds/sfx_skill_death_grip_impact.ogg' },
  sfx_skill_death_and_decay_cast: { key: 'sfx_skill_death_and_decay_cast', src: '/assets/sounds/sfx_skill_death_and_decay_cast.ogg' },
  sfx_skill_death_and_decay_impact: { key: 'sfx_skill_death_and_decay_impact', src: '/assets/sounds/sfx_skill_death_and_decay_impact.ogg' },
  sfx_skill_death_and_decay_channel: { key: 'sfx_skill_death_and_decay_channel', src: '/assets/sounds/sfx_skill_death_and_decay_channel.ogg' },
  sfx_skill_anti_magic_shell_cast: { key: 'sfx_skill_anti_magic_shell_cast', src: '/assets/sounds/sfx_skill_anti_magic_shell_cast.ogg' },
  sfx_skill_anti_magic_shell_impact: { key: 'sfx_skill_anti_magic_shell_impact', src: '/assets/sounds/sfx_skill_anti_magic_shell_impact.ogg' },
}

export const ENCOUNTER_AUDIO = {
  SHADE_OF_AKAMA: {
    family: 'sfx_boss_shade_of_akama',
    dialogPrefix: 'voice_shade',
  },
  ILLIDAN: {
    family: 'sfx_boss_illidan',
    dialogPrefix: 'voice_illidan',
  },
}

export const DIALOG_AUDIO = {
  akama: {
    family: 'voice_akama',
    color: '#00ccaa',
  },
  shade: {
    family: 'voice_shade',
    color: '#8c6bff',
  },
  illidan: {
    family: 'voice_illidan',
    color: '#9933ff',
  },
}

export const SOURCE_SKILL_AUDIO = {
  Melee: { family: 'sfx_family_melee', cast: 'sfx_family_melee_cast', impact: 'sfx_family_melee_impact' },
  Whirlwind: { family: 'sfx_enemy_felguard', cast: 'sfx_enemy_felguard_cast', impact: 'sfx_enemy_felguard_impact' },
  'Fel Guard Melee': { family: 'sfx_enemy_felguard', cast: 'sfx_enemy_felguard_melee', impact: 'sfx_enemy_felguard_impact' },
  'Bonechewer Brute Melee': { family: 'sfx_enemy_bonechewer_brute', cast: 'sfx_enemy_bonechewer_brute_melee', impact: 'sfx_enemy_bonechewer_brute_impact' },
  'Illidari Centurion Charge': { family: 'sfx_enemy_illidari_centurion', cast: 'sfx_enemy_illidari_centurion_charge', impact: 'sfx_enemy_illidari_centurion_charge' },
  'Blade Fury Spin': { family: 'sfx_enemy_bonechewer_blade_fury', cast: 'sfx_enemy_bonechewer_blade_fury_spin', impact: 'sfx_enemy_bonechewer_blade_fury_spin' },
  'Blood Prophet Channel': { family: 'sfx_enemy_blood_prophet', cast: 'sfx_enemy_blood_prophet_channel', impact: 'sfx_enemy_blood_prophet_channel' },
  'Ritual Channel': { family: 'sfx_enemy_ritual_channeler', cast: 'sfx_enemy_ritual_channeler_channel', impact: 'sfx_enemy_ritual_channeler_channel' },
  'Gate Repair': { family: 'sfx_enemy_gate_repairer', cast: 'sfx_enemy_gate_repairer_channel', impact: 'sfx_enemy_gate_repairer_channel' },
  'Leviathan Volley': { family: 'sfx_enemy_leviathan', cast: 'sfx_enemy_leviathan_ranged', impact: 'sfx_enemy_leviathan_ranged' },
  'Burning Aura': { family: 'sfx_boss_shade_of_akama', cast: 'sfx_boss_shade_of_akama_cast', impact: 'sfx_boss_shade_of_akama_impact' },
  'Shadow Demon': { family: 'sfx_enemy_shadow_demon', cast: 'sfx_enemy_shadow_demon_cast', impact: 'sfx_enemy_shadow_demon_impact' },
  'Flame Crash': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Draw Soul': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  Shear: { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Parasitic Shadowfiend': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Dark Barrage': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Agonizing Flames': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Shadow Blast': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Eye Beams': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  Fireball: { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Aura of Dread': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_cast', impact: 'sfx_boss_illidan_impact' },
  'Summon Shadow Demons': { family: 'sfx_boss_illidan', cast: 'sfx_boss_illidan_summon', impact: 'sfx_boss_illidan_summon' },
}

export const ENEMY_AUDIO = {
  felGuard: { family: 'sfx_enemy_felguard', cast: 'sfx_enemy_felguard_melee', impact: 'sfx_enemy_felguard_impact' },
  bonechewerBrute: { family: 'sfx_enemy_bonechewer_brute', cast: 'sfx_enemy_bonechewer_brute_melee', impact: 'sfx_enemy_bonechewer_brute_impact' },
  coilskarHarpooner: { family: 'sfx_enemy_coilskar_harpooner', cast: 'sfx_enemy_coilskar_harpooner_cast', impact: 'sfx_enemy_coilskar_harpooner_impact' },
  illidariCenturion: { family: 'sfx_enemy_illidari_centurion', cast: 'sfx_enemy_illidari_centurion_charge', impact: 'sfx_enemy_illidari_centurion_charge' },
  bonechewerBladeFury: { family: 'sfx_enemy_bonechewer_blade_fury', cast: 'sfx_enemy_bonechewer_blade_fury_spin', impact: 'sfx_enemy_bonechewer_blade_fury_spin' },
  ashtonghueMystic: { family: 'sfx_enemy_ashtongue_mystic', cast: 'sfx_enemy_ashtongue_mystic_cast', impact: 'sfx_enemy_ashtongue_mystic_impact' },
  bloodProphet: { family: 'sfx_enemy_blood_prophet', cast: 'sfx_enemy_blood_prophet_channel', impact: 'sfx_enemy_blood_prophet_channel' },
  coilskarSerpentGuard: { family: 'sfx_enemy_coilskar_serpent_guard', cast: 'sfx_enemy_coilskar_serpent_guard_cast', impact: 'sfx_enemy_coilskar_serpent_guard_impact' },
  ritualChanneler: { family: 'sfx_enemy_ritual_channeler', cast: 'sfx_enemy_ritual_channeler_channel', impact: 'sfx_enemy_ritual_channeler_channel' },
  gateRepairer: { family: 'sfx_enemy_gate_repairer', cast: 'sfx_enemy_gate_repairer_channel', impact: 'sfx_enemy_gate_repairer_channel' },
  leviathan: { family: 'sfx_enemy_leviathan', cast: 'sfx_enemy_leviathan_ranged', impact: 'sfx_enemy_leviathan_ranged' },
  warlock: { family: 'sfx_enemy_warlock', cast: 'sfx_enemy_warlock_channel', impact: 'sfx_enemy_warlock_channel' },
  flameOfAzzinoth: { family: 'sfx_enemy_flame_of_azzinoth', cast: 'sfx_enemy_flame_of_azzinoth_aura', impact: 'sfx_enemy_flame_of_azzinoth_aura' },
  shadowDemon: { family: 'sfx_enemy_shadow_demon', cast: 'sfx_enemy_shadow_demon_cast', impact: 'sfx_enemy_shadow_demon_impact' },
  shadowfiend: { family: 'sfx_enemy_shadowfiend', cast: 'sfx_enemy_shadowfiend_spawn', impact: 'sfx_enemy_shadowfiend_impact' },
}

export function getLevelAudio(levelId, scene) {
  if (scene === 'lobby') return LEVEL_AUDIO.lobby
  if (scene === 'result') return LEVEL_AUDIO.result
  if (scene === 'gameover') return LEVEL_AUDIO.gameover
  return LEVEL_AUDIO[levelId] ?? null
}

export function getSkillAudio(skillName, type, subtype) {
  const exact = SKILL_AUDIO[skillName]
  if (exact) return exact

  const family = (subtype && AUDIO_SUBTYPE_FAMILIES[subtype]) || (type && AUDIO_EVENT_FAMILIES[type]) || 'sfx_family_generic'
  return {
    className: null,
    family,
    cast: `${family}_cast`,
    impact: `${family}_impact`,
    travel: null,
  }
}

export function getDialogAudio(speaker, text, voiceKey = null) {
  const speakerCfg = DIALOG_AUDIO[speaker] ?? { family: 'voice_unknown', color: '#ffffff' }
  const textKey = toAudioKey(text)
  const resolvedVoiceKey = voiceKey ?? `${speakerCfg.family}_${textKey || 'line'}`
  return {
    speaker,
    family: speakerCfg.family,
    voiceKey: resolvedVoiceKey,
    src: `/assets/audio/voice/${resolvedVoiceKey}.mp3`,
  }
}

export function getSourceSkillAudio(sourceSkill) {
  return SOURCE_SKILL_AUDIO[sourceSkill] ?? null
}

export function getEnemyAudio(enemyType) {
  return ENEMY_AUDIO[enemyType] ?? null
}

export function getOneShotAudio(key) {
  return SKILL_AUDIO_ONE_SHOTS[key] ?? AUDIO_ONE_SHOTS[key] ?? null
}

export function withResolvedAudioPaths(definition, kind = 'sfx') {
  if (!definition) return null
  if (definition.src) return definition
  if (!definition.key) return definition

  const base = kind === 'music' ? '/assets/audio/music/' : kind === 'voice' ? '/assets/audio/voice/' : '/assets/audio/sfx/'
  return {
    ...definition,
    src: `${base}${definition.key}.mp3`,
  }
}

export function createDefaultAudioSettings(overrides = {}) {
  return {
    master: AUDIO_BUS_DEFAULTS.master,
    music: AUDIO_BUS_DEFAULTS.music,
    sfx: AUDIO_BUS_DEFAULTS.sfx,
    voice: AUDIO_BUS_DEFAULTS.voice,
    muted: false,
    ...overrides,
  }
}

export function createDefaultControllerAudioSettings(overrides = {}) {
  return {
    master: CONTROLLER_AUDIO_BUS_DEFAULTS.master,
    sfx: CONTROLLER_AUDIO_BUS_DEFAULTS.sfx,
    muted: false,
    ...overrides,
  }
}
