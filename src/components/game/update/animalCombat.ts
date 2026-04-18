import { ANIMAL_DEFS } from '../animalDefinitions';
import type { GameState } from '../runtime';
import { AnimalType } from '../types';
import type { Animal } from '../types';
import type { Intersector } from './updateContext';
import type { AnimalIntent } from './animalBehavior';
import type { SpatialHash } from '../spatialHash';

type SfxPlayer = (animal: Animal, priority?: 'ambient' | 'normal') => void;

/**
 * Resolves melee attacks, launches, bites, and knockback for one animal per frame.
 * Cooldown ticking for attackCooldown and launchCooldown happens here since they are
 * consumed and set exclusively by combat logic.
 *
 * Must be called after applyAnimalPhysics so animal.vy reflects whether the animal
 * is grounded (launch conditions check vy === 0).
 */
export const applyAnimalCombat = (
  animal: Animal,
  state: GameState,
  animalGrid: SpatialHash<Animal>,
  isIntersecting: Intersector,
  playAnimalSfx: SfxPlayer,
  intent: AnimalIntent,
): void => {
  const { player } = state;
  const { targetX } = intent;

  if (animal.attackCooldown > 0) animal.attackCooldown--;
  if (animal.launchCooldown > 0) animal.launchCooldown--;

  // --- Snakes: launch at player + bite player + bite nearby animals ---
  if (
    animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE
  ) {
    const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);

    // Falling player landing on snake provokes it
    if (isIntersecting(animal, player) && player.vy > 0 && !player.grounded) {
      animal.aggro = true;
    }

    if (animal.aggro) {
      if (distToPlayer < 120 && animal.launchCooldown <= 0 && animal.vy === 0) {
        animal.state = 'launching';
        animal.vy = -6;
        animal.vx = (player.x > animal.x ? 1 : -1) * 5;
        animal.facing = player.x > animal.x ? 1 : -1;
        animal.launchCooldown = 120;
      }
      if (animal.attackCooldown <= 0 && isIntersecting(animal, player)) {
        player.health -= ANIMAL_DEFS[animal.type].attackDamage;
        player.hurtTime = 10;
        player.vy = -3;
        player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
        if (animal.type !== AnimalType.TIGER_SNAKE) {
          player.poisonTimer = 300;
          player.poisonTick = 60;
        }
      }
    }

    if (animal.attackCooldown <= 0) {
      for (const other of animalGrid.queryRadius(animal.x, animal.y, 64)) {
        if (other === animal) continue;
        if (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) continue;
        if (!isIntersecting(animal, other)) continue;

        if (animal.type === AnimalType.TIGER_SNAKE) {
          other.health -= 2;
          other.hurtTime = 10;
          other.vy = -3;
          other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        } else {
          const isCat =
            other.type === AnimalType.LEOPARD || other.type === AnimalType.JAGUAR || other.type === AnimalType.BLACK_JAGUAR;
          other.health -= animal.type === AnimalType.STRIPED_SNAKE ? 6 : 1;
          other.hurtTime = 10;
          other.poisonTimer = isCat ? 120 : 300;
          other.poisonTick = isCat ? 120 : 60;
          other.vy = -3;
          other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        }
        playAnimalSfx(other, 'normal');
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
        break; // Bite one animal per frame
      }
    }
  }

  // --- Pig / Cow charge ---
  if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) {
    if (animal.attackCooldown <= 0 && isIntersecting(animal, player) && !player.isFlying) {
      player.health -= ANIMAL_DEFS[animal.type].attackDamage;
      player.hurtTime = 10;
      player.vy = -3;
      player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 5;
      animal.attackCooldown = 60;
      animal.attackTimer = 15;
    }
  }

  // --- Shark bite ---
  if (animal.type === AnimalType.SHARK) {
    if (animal.attackCooldown <= 0 && isIntersecting(animal, player) && !player.isFlying) {
      player.health -= ANIMAL_DEFS[animal.type].attackDamage;
      player.hurtTime = 10;
      player.vy = -2;
      player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 3;
      animal.attackCooldown = 60;
      animal.attackTimer = 15;
    }
  }

  // --- Big cats: pounce leap + bite player + bite nearby animals ---
  if (
    animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR
  ) {
    if (targetX !== null && animal.launchCooldown <= 0 && animal.vy === 0) {
      const hDist = Math.abs(targetX - animal.x);
      if (hDist < 150 && hDist > 40) {
        animal.state = 'launching';
        animal.vy = -6;
        animal.vx = (targetX > animal.x ? 1 : -1) * 6;
        animal.facing = targetX > animal.x ? 1 : -1;
        animal.launchCooldown = 120;
      }
    }

    if (animal.attackCooldown <= 0) {
      let attacked = false;
      if (!animal.tamed && isIntersecting(animal, player) && !player.isFlying) {
        player.health -= ANIMAL_DEFS[animal.type].attackDamage;
        player.hurtTime = 10;
        player.vy = -3;
        player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
        attacked = true;
      }
      if (!attacked) {
        for (const other of animalGrid.queryRadius(animal.x, animal.y, 64)) {
          if (other.id === animal.id) continue;
          if (other.type === AnimalType.LEOPARD || other.type === AnimalType.JAGUAR || other.type === AnimalType.BLACK_JAGUAR) continue;
          if (!isIntersecting(animal, other)) continue;
          other.health -= 8;
          playAnimalSfx(other, 'normal');
          other.hurtTime = 10;
          other.vy = -3;
          other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
          animal.attackCooldown = 60;
          animal.attackTimer = 15;
          break;
        }
      }
    }
  }
};
