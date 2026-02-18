import Projectile from '../entities/Projectile.js';
import MeleeAttack from '../entities/MeleeAttack.js';
import AOEEffect from '../entities/AOEEffect.js';
import HealEffect from '../entities/HealEffect.js';

class SkillManager {
  static handleSkillUsed(data, players, effects) {
    const player = players.get(data.playerId);
    if (!player || player.isDead) return null;
    const skillIndex = data.skillIndex;
    const skill = player.classData.skills[skillIndex];
    if (!player.useSkill(skillIndex)) return null;
    let aim = data.aim;
    if (!aim && (skill.type === 'heal' || skill.type === 'revive' || skill.type === 'buff')) {
      aim = this.getAutoAimForSupport(player, players, skill);
    } else if (!aim) {
      aim = { x: Math.cos(player.angle), y: Math.sin(player.angle) };
    }
    return this.createSkillEffect(player, skill, aim, effects, players);
  }

  static getAutoAimForSupport(player, players, skill) {
    if (skill.type === 'heal') {
      let nearestAlly = null;
      let minDist = Infinity;
      const maxRange = skill.range || 200;
      players.forEach(p => {
        if (p.id !== player.id && !p.isDead && p.hp < p.maxHp) {
          const dx = p.x - player.x;
          const dy = p.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist && dist < maxRange) {
            minDist = dist;
            nearestAlly = p;
          }
        }
      });
      if (nearestAlly) {
        const dx = nearestAlly.x - player.x;
        const dy = nearestAlly.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return { x: dx / dist, y: dy / dist, target: nearestAlly };
      }
      return { x: 0, y: 0, target: player };
    }
    return { x: 1, y: 0 };
  }

  static createSkillEffect(player, skill, aim, effects, players) {
    const angle = Math.atan2(aim.y, aim.x);
    switch (skill.type) {
      case 'projectile':
        return this.createProjectile(player, skill, angle, effects);
      case 'melee':
        return this.createMeleeAttack(player, skill, angle, effects);
      case 'aoe':
        return this.createAOE(player, skill, angle, effects);
      case 'heal':
        return this.createHeal(player, skill, aim, effects, players);
      case 'dash':
      case 'teleport':
        return this.createMovement(player, skill, angle);
      case 'defense':
      case 'buff':
        return this.createBuff(player, skill);
      default:
        console.warn(`Unknown skill type: ${skill.type}`);
        return null;
    }
  }

  static createProjectile(player, skill, angle, effects) {
    const speed = skill.speed || 5;
    const projectile = new Projectile({
      x: player.x + Math.cos(angle) * 25,
      y: player.y + Math.sin(angle) * 25,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: skill.damage,
      radius: 8,
      color: player.classData.color,
      owner: player.id
    });
    effects.push(projectile);
    return projectile;
  }

  static createMeleeAttack(player, skill, angle, effects) {
    const meleeX = player.x + Math.cos(angle) * (skill.range || 50);
    const meleeY = player.y + Math.sin(angle) * (skill.range || 50);
    const melee = new MeleeAttack({
      x: meleeX,
      y: meleeY,
      damage: skill.damage,
      radius: skill.range || 50,
      color: player.classData.color,
      owner: player.id,
      angle: angle,
      lifetime: 200
    });
    effects.push(melee);
    return melee;
  }

  static createAOE(player, skill, angle, effects) {
    const distance = skill.range || 100;
    const aoe = new AOEEffect({
      x: player.x + Math.cos(angle) * distance,
      y: player.y + Math.sin(angle) * distance,
      damage: skill.damage,
      radius: skill.radius || 80,
      color: player.classData.color,
      owner: player.id,
      lifetime: 500
    });
    effects.push(aoe);
    return aoe;
  }

  static createHeal(player, skill, aim, effects, players) {
    const target = aim.target || player;
    if (!target.isDead) {
      target.heal(skill.amount);
    }
    const healEffect = new HealEffect({
      x: target.x,
      y: target.y,
      amount: skill.amount,
      owner: player.id,
      lifetime: 500
    });
    effects.push(healEffect);
    return healEffect;
  }

  static createMovement(player, skill, angle) {
    const distance = skill.range || 150;
    player.x += Math.cos(angle) * distance;
    player.y += Math.sin(angle) * distance;
    player.x = Math.max(player.radius, Math.min(1024 - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(768 - player.radius, player.y));
    return null;
  }

  static createBuff(player, skill) {
    player.buffs.push({
      type: skill.name,
      endTime: Date.now() + (skill.duration || 5000)
    });
    return null;
  }
}

export default SkillManager;
