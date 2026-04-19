import {
  ANIMAL_AGGRO_LOSS_DISTANCE,
  ANT_FLEE_DETECTION_RADIUS,
  ANT_FOOD_SEEK_RANGE,
  CAT_TAMED_FOLLOW_DISTANCE,
  CAT_VISION_RANGE,
  COCOA_CAT_ATTACK_RANGE,
  COCOA_CAT_HEIGHT_THRESHOLD_TILES,
  HERBIVORE_FOOD_SEEK_RANGE,
  ORCA_HUNT_RADIUS,
  ORCA_MELEE_RANGE,
  PREY_FLEE_DETECTION_RADIUS,
  SHARK_ATTACK_RANGE,
  SNAKE_HUNT_RANGE,
  TILE_SIZE,
} from '../constants';
import type { GameState } from '../runtime';
import { hasFullCocoaArmor } from '../runtime';
import { isDecorationBlock } from '../constants';
import { AnimalType, BlockType } from '../types';
import type { Animal, DroppedItem } from '../types';
import type { Intersector } from './updateContext';
import type { SpatialHash } from '../spatialHash';

export type AnimalIntent = {
  targetX: number | null;
  fleeX: number | null;
  isTargetingPlayer: boolean;
};

type SfxPlayer = (animal: Animal, priority?: 'ambient' | 'normal') => void;

/**
 * Determines what the animal wants to do this frame: chase a target, flee, or wander.
 * Returns an intent consumed by applyMovementState, applyMovementSpeed, applyAnimalPhysics,
 * and applyAnimalCombat.
 *
 * The orca's melee contact attack is applied here as a side-effect because it is
 * tightly coupled to target selection — the attack fires exactly when a target is found
 * within melee range.
 */
export const computeAnimalTarget = (
  animal: Animal,
  state: GameState,
  animalGrid: SpatialHash<Animal>,
  foodItems: DroppedItem[],
  playAnimalSfx: SfxPlayer,
): AnimalIntent => {
  const { player } = state;
  let targetX: number | null = null;
  let isTargetingPlayer = false;
  let fleeX: number | null = null;

  // --- Flee logic ---
  if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
    if (animal.hurtTime > 0) {
      if (animal.attackPattern === 'charge') {
        animal.aggro = true;
      } else {
        fleeX = player.x;
      }
    }
    if (animal.aggro) {
      const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
      if (distToPlayer > ANIMAL_AGGRO_LOSS_DISTANCE) {
        animal.aggro = false;
      } else {
        targetX = player.x;
        isTargetingPlayer = true;
      }
    } else if (fleeX === null) {
      for (const other of animalGrid.queryRadius(animal.x, animal.y, PREY_FLEE_DETECTION_RADIUS)) {
        if (
          (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) &&
          Math.hypot(animal.x - other.x, animal.y - other.y) < PREY_FLEE_DETECTION_RADIUS
        ) {
          fleeX = other.x;
          break;
        }
      }
    }
  } else if (animal.type === AnimalType.ANT) {
    for (const other of animalGrid.queryRadius(animal.x, animal.y, ANT_FLEE_DETECTION_RADIUS)) {
      if (
        (other.type === AnimalType.CHICKEN || other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) &&
        Math.hypot(animal.x - other.x, animal.y - other.y) < ANT_FLEE_DETECTION_RADIUS
      ) {
        fleeX = other.x;
        break;
      }
    }
  } else if (animal.type === AnimalType.BIRD) {
    if (animal.hurtTime > 0) fleeX = player.x;
  } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
    if (animal.hurtTime > 0) fleeX = player.x;
  }

  // --- Shark hunts player in water ---
  if (animal.type === AnimalType.SHARK && fleeX === null) {
    const px = Math.floor(player.x / TILE_SIZE);
    const playerInWater =
      state.world[px]?.[Math.floor(player.y / TILE_SIZE)] === BlockType.WATER ||
      state.world[px]?.[Math.floor((player.y + player.height) / TILE_SIZE)] === BlockType.WATER;
    if (playerInWater && Math.hypot(animal.x - player.x, animal.y - player.y) < SHARK_ATTACK_RANGE) {
      targetX = player.x;
      isTargetingPlayer = true;
    }
  }

  // --- Orca hunts other sea animals (melee applied here as side-effect of targeting) ---
  if (animal.type === AnimalType.ORCA && fleeX === null) {
    let closestDist = ORCA_HUNT_RADIUS;
    let targetAnimal: Animal | null = null;
    for (const other of animalGrid.queryRadius(animal.x, animal.y, ORCA_HUNT_RADIUS)) {
      if (
        other.id !== animal.id &&
        (other.type === AnimalType.FISH || other.type === AnimalType.DOLPHIN || other.type === AnimalType.SHARK)
      ) {
        const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
        if (dist < closestDist) { closestDist = dist; targetAnimal = other; }
      }
    }
    if (targetAnimal) {
      targetX = targetAnimal.x;
      if (closestDist < ORCA_MELEE_RANGE && animal.attackCooldown <= 0) {
        targetAnimal.health -= 5;
        playAnimalSfx(targetAnimal, 'normal');
        targetAnimal.hurtTime = 20;
        animal.attackCooldown = 60;
        animal.attackTimer = 15;
      }
    }
  }

  // --- Seek food / prey when not fleeing ---
  if (fleeX === null && targetX === null) {
    if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
      let closestDist = HERBIVORE_FOOD_SEEK_RANGE;
      for (const item of foodItems) {
        const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
        if (dist < closestDist) { closestDist = dist; targetX = item.x; }
      }
      if (targetX === null) {
        const tileX = Math.floor(animal.x / TILE_SIZE);
        const tileY = Math.floor(animal.y / TILE_SIZE);
        let closestGrassSq = HERBIVORE_FOOD_SEEK_RANGE * HERBIVORE_FOOD_SEEK_RANGE;
        for (let dx = -5; dx <= 5; dx++) {
          for (let dy = -5; dy <= 5; dy++) {
            const x = tileX + dx;
            const y = tileY + dy;
            if (state.world[x] && isDecorationBlock(state.world[x][y])) {
              const distSq = (dx * TILE_SIZE) ** 2 + (dy * TILE_SIZE) ** 2;
              if (distSq < closestGrassSq) { closestGrassSq = distSq; targetX = x * TILE_SIZE; }
            }
          }
        }
      }
    } else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
      // At night (timeOfDay outside the day window 1800–5400) snakes are more
      // aggressive: they automatically aggro the player if in vision range.
      const isNight = state.timeOfDay < 1800 || state.timeOfDay > 5400;
      if (isNight && !animal.aggro) {
        const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
        if (distToPlayer < CAT_VISION_RANGE) {
          animal.aggro = true;
        }
      }

      if (animal.aggro) {
        const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
        if (distToPlayer > ANIMAL_AGGRO_LOSS_DISTANCE) {
          animal.aggro = false;
        } else {
          targetX = player.x;
          isTargetingPlayer = true;
        }
      }
      if (!animal.aggro) {
        let closestDist = SNAKE_HUNT_RANGE;
        for (const other of animalGrid.queryRadius(animal.x, animal.y, SNAKE_HUNT_RANGE)) {
          if (other.type === AnimalType.PIG || other.type === AnimalType.CHICKEN || other.type === AnimalType.ANT) {
            const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
            if (dist < closestDist) { closestDist = dist; targetX = other.x; }
          }
        }
      }
    } else if (animal.type === AnimalType.ANT) {
      let closestDist = ANT_FOOD_SEEK_RANGE;
      for (const item of foodItems) {
        const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
        if (dist < closestDist) { closestDist = dist; targetX = item.x; }
      }
    } else if (animal.type === AnimalType.BIRD) {
      if (Math.random() < 0.02) animal.facing = Math.random() > 0.5 ? 1 : -1;
      targetX = animal.x + animal.facing * 100;
    } else if (
      animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA ||
      animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK
    ) {
      if (Math.random() < 0.02) animal.facing = Math.random() > 0.5 ? 1 : -1;
      targetX = animal.x + animal.facing * 100;
    } else if (
      animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR
    ) {
      let closestDist = CAT_VISION_RANGE;
      let targetEntity: { x: number; y: number } | null = null;
      const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
      if (!animal.tamed && distToPlayer < closestDist) {
        closestDist = distToPlayer;
        targetEntity = player;
      }
      for (const other of animalGrid.queryRadius(animal.x, animal.y, closestDist)) {
        if (
          other.id !== animal.id &&
          other.type !== AnimalType.LEOPARD && other.type !== AnimalType.JAGUAR && other.type !== AnimalType.BLACK_JAGUAR
        ) {
          const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
          if (dist < closestDist) { closestDist = dist; targetEntity = other; }
        }
      }
      if (targetEntity) {
        targetX = targetEntity.x;
        if (targetEntity === player) isTargetingPlayer = true;
      } else if (animal.tamed && distToPlayer > CAT_TAMED_FOLLOW_DISTANCE) {
        targetX = player.x;
        isTargetingPlayer = true;
      } else {
        if (Math.random() < 0.01) animal.facing = Math.random() > 0.5 ? 1 : -1;
        targetX = animal.x + animal.facing * 100;
      }
    }
  }

  return { targetX, fleeX, isTargetingPlayer };
};

/** Updates the animal's movement state (idle ↔ walking) based on intent. */
export const applyMovementState = (animal: Animal, intent: AnimalIntent): void => {
  const { fleeX, targetX } = intent;
  if (fleeX !== null) {
    animal.state = 'walking';
    animal.facing = animal.x > fleeX ? 1 : -1;
    animal.stateTime = 10;
  } else if (targetX !== null) {
    animal.state = 'walking';
    animal.facing = targetX > animal.x ? 1 : -1;
    animal.stateTime = 10;
  } else if (animal.stateTime <= 0) {
    if (animal.state === 'idle') {
      animal.state = 'walking';
      animal.facing = Math.random() > 0.5 ? 1 : -1;
      animal.stateTime = 30 + Math.random() * 60;
    } else {
      animal.state = 'idle';
      animal.stateTime = 60 + Math.random() * 120;
    }
  }
};

/**
 * Handles the Cocoa Cat's instant-kill touch mechanic and overrides intent.targetX
 * to chase the player when the player is above the boss threshold.
 * Must be called after applyMovementState and before applyMovementSpeed.
 */
export const applyCocoaCatBehavior = (
  animal: Animal,
  state: GameState,
  intent: AnimalIntent,
  isIntersecting: Intersector,
): void => {
  if (animal.type !== AnimalType.COCOA_CAT) return;
  const { player } = state;
  const fullCocoaArmor = hasFullCocoaArmor(player);

  if (isIntersecting(animal, player) && (!fullCocoaArmor || player.isFlying)) {
    player.health = 0;
  }
  if (player.y < COCOA_CAT_HEIGHT_THRESHOLD_TILES * TILE_SIZE && !fullCocoaArmor) {
    intent.targetX = player.x;
    intent.isTargetingPlayer = true;
    if (Math.abs(player.x - animal.x) < COCOA_CAT_ATTACK_RANGE && animal.attackCooldown <= 0) {
      animal.state = 'attacking';
      animal.stateTime = 30;
      animal.attackCooldown = 60;
      animal.attackTimer = 15;
    }
  }
};

/** Sets horizontal velocity based on movement state, animal type, and intent. */
export const applyMovementSpeed = (animal: Animal, intent: AnimalIntent): void => {
  const { fleeX, targetX, isTargetingPlayer } = intent;
  if (animal.state === 'walking') {
    let speed = 1;
    if (fleeX !== null) speed = 2.5;
    else if (targetX !== null) speed = 1.5;

    if (animal.type === AnimalType.CHICKEN) speed *= 1.5;
    else if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) speed *= 2.5;
    else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) speed *= 1.5;
    else if (animal.type === AnimalType.ANT) speed *= 0.5;
    else if (animal.type === AnimalType.SHARK && isTargetingPlayer) speed *= 2.0;
    else if (animal.type === AnimalType.ORCA && targetX !== null) speed *= 2.0;
    else if (animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN) speed *= 1.5;
    else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
      speed *= isTargetingPlayer ? 2.5 : 1.0;
    } else if (animal.type === AnimalType.COCOA_CAT) {
      speed *= isTargetingPlayer ? 3.0 : 1.0;
    }

    animal.vx = speed * animal.facing;
  } else if (animal.state === 'launching') {
    // Keep current vx during launch arc
  } else {
    animal.vx = 0;
  }
};
