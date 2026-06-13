import { Character, Command } from './Character';
import {
  spawnHitFragments,
  spawnShieldFragments,
  spawnAfterimage,
  spawnSwordTrace,
  spawnChargeAura,
  spawnDeathFragments,
  spawnGlowRing,
} from './effects';

export interface CombatResult {
  attacker: Character;
  defender: Character;
  damage: number;
  hit: boolean;
  dodged: boolean;
  blocked: boolean;
  charged: boolean;
  attackerCommand: Command;
  defenderCommand: Command;
  swordTraceDuration: number;
}

export function resolveCombat(attacker: Character, defender: Character): CombatResult {
  const result: CombatResult = {
    attacker,
    defender,
    damage: 0,
    hit: false,
    dodged: false,
    blocked: false,
    charged: false,
    attackerCommand: attacker.command,
    defenderCommand: defender.command,
    swordTraceDuration: 0,
  };

  switch (attacker.command) {
    case Command.ATTACK: {
      const baseDamage = 20 + Math.floor(Math.random() * 11);
      const isCharged = attacker.chargeCount >= 2;
      const finalDamage = isCharged ? baseDamage * 2 : baseDamage;
      result.charged = isCharged;
      result.damage = finalDamage;

      result.swordTraceDuration = spawnSwordTrace(
        attacker.x, attacker.y,
        defender.x, defender.y,
        attacker.color
      );

      if (defender.command === Command.DODGE) {
        result.dodged = true;
        result.hit = false;
        const angle = Math.random() * Math.PI * 2;
        const oldX = defender.x;
        const oldY = defender.y;
        defender.dodgeFromX = oldX;
        defender.dodgeFromY = oldY;
        defender.x += Math.cos(angle) * 80;
        defender.y += Math.sin(angle) * 80;
        defender.dodgeTimer = 0.6;

        const bodyLines = defender.getBodySegments();
        spawnAfterimage(oldX, oldY, defender.color, bodyLines);
      } else if (defender.command === Command.DEFEND) {
        result.blocked = true;
        result.hit = false;
        result.damage = 0;
        defender.hp -= 0;
        const shieldDir = defender.facingRight ? 1 : -1;
        spawnShieldFragments(defender.x + 16 * shieldDir, defender.y - 10, '#48dbfb');
      } else {
        result.hit = true;
        defender.hp = Math.max(0, defender.hp - finalDamage);
        defender.hitFlashTimer = 0.3;
        const fragmentCount = 10 + Math.floor(Math.random() * 6);
        spawnHitFragments(defender.x, defender.y - 10, defender.color, fragmentCount);
        spawnGlowRing(defender.x, defender.y - 10, defender.color, 10, 0.5);
      }

      if (isCharged) {
        attacker.chargeCount = 0;
      }
      break;
    }

    case Command.DEFEND: {
      attacker.isDefending = true;
      attacker.shieldTimer = 2;
      break;
    }

    case Command.CHARGE: {
      attacker.chargeCount++;
      spawnChargeAura(attacker.x, attacker.y, attacker.color);
      break;
    }

    case Command.DODGE: {
      const angle = Math.random() * Math.PI * 2;
      const oldX = attacker.x;
      const oldY = attacker.y;
      attacker.dodgeFromX = oldX;
      attacker.dodgeFromY = oldY;
      attacker.x += Math.cos(angle) * 80;
      attacker.y += Math.sin(angle) * 80;
      attacker.dodgeTimer = 0.6;

      const bodyLines = attacker.getBodySegments();
      spawnAfterimage(oldX, oldY, attacker.color, bodyLines);
      break;
    }

    default:
      break;
  }

  if (defender.command === Command.DEFEND && attacker.command !== Command.ATTACK) {
    defender.isDefending = true;
    defender.shieldTimer = 2;
  }

  if (defender.command === Command.CHARGE && attacker.command !== Command.ATTACK) {
    defender.chargeCount++;
    spawnChargeAura(defender.x, defender.y, defender.color);
  }

  if (defender.hp <= 0 && !defender.isDead) {
    defender.isDead = true;
    spawnDeathFragments(defender.x, defender.y - 10, defender.color);
  }

  return result;
}

export function getAICommand(): Command {
  const rand = Math.random();
  if (rand < 0.25) return Command.ATTACK;
  if (rand < 0.50) return Command.DEFEND;
  if (rand < 0.75) return Command.CHARGE;
  return Command.DODGE;
}
