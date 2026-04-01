import { AnimalType } from './types';

export interface AnimalDef {
  width: number;
  height: number;
  health: number;
  /** Damage dealt to the player per hit (0 = does not attack player) */
  attackDamage: number;
  attackPattern: 'normal' | 'lunge' | 'charge';
  maxCount: number;
  /** Biome indices where this animal can spawn (0-9) */
  spawnBiomes: number[];
}

export const ANIMAL_DEFS: Record<AnimalType, AnimalDef> = {
  [AnimalType.PIG]:          { width: 20,  height: 16,  health: 8,   attackDamage: 2,  attackPattern: 'charge',  maxCount: 15, spawnBiomes: [0,2,4,5,9] },
  [AnimalType.COW]:          { width: 24,  height: 20,  health: 10,  attackDamage: 3,  attackPattern: 'charge',  maxCount: 15, spawnBiomes: [0,2,4,5,9] },
  [AnimalType.CHICKEN]:      { width: 12,  height: 12,  health: 4,   attackDamage: 0,  attackPattern: 'normal',  maxCount: 15, spawnBiomes: [0,2,4,5,9] },
  [AnimalType.SNAKE]:        { width: 20,  height: 6,   health: 6,   attackDamage: 1,  attackPattern: 'normal',  maxCount: 10, spawnBiomes: [0,1,4,6,7,8,9] },
  [AnimalType.STRIPED_SNAKE]:{ width: 20,  height: 6,   health: 6,   attackDamage: 6,  attackPattern: 'normal',  maxCount: 10, spawnBiomes: [0,1,4,6,7,8,9] },
  [AnimalType.TIGER_SNAKE]:  { width: 20,  height: 6,   health: 6,   attackDamage: 2,  attackPattern: 'normal',  maxCount: 10, spawnBiomes: [0,1,4,6,7,8,9] },
  [AnimalType.ANT]:          { width: 6,   height: 4,   health: 1,   attackDamage: 0,  attackPattern: 'normal',  maxCount: 15, spawnBiomes: [0,1,4,6,8,9] },
  [AnimalType.BIRD]:         { width: 12,  height: 8,   health: 3,   attackDamage: 0,  attackPattern: 'normal',  maxCount: 15, spawnBiomes: [0,2,4,5,8] },
  [AnimalType.FISH]:         { width: 12,  height: 8,   health: 3,   attackDamage: 0,  attackPattern: 'normal',  maxCount: 15, spawnBiomes: [3,7] },
  [AnimalType.ORCA]:         { width: 48,  height: 24,  health: 30,  attackDamage: 0,  attackPattern: 'normal',  maxCount: 5,  spawnBiomes: [3,7] },
  [AnimalType.DOLPHIN]:      { width: 32,  height: 16,  health: 20,  attackDamage: 0,  attackPattern: 'normal',  maxCount: 8,  spawnBiomes: [3,7] },
  [AnimalType.SHARK]:        { width: 40,  height: 20,  health: 25,  attackDamage: 5,  attackPattern: 'normal',  maxCount: 5,  spawnBiomes: [3,7] },
  [AnimalType.LEOPARD]:      { width: 24,  height: 16,  health: 20,  attackDamage: 8,  attackPattern: 'lunge',   maxCount: 5,  spawnBiomes: [0,4,5,8] },
  [AnimalType.JAGUAR]:       { width: 24,  height: 16,  health: 20,  attackDamage: 8,  attackPattern: 'lunge',   maxCount: 5,  spawnBiomes: [0,6,8] },
  [AnimalType.BLACK_JAGUAR]: { width: 24,  height: 16,  health: 20,  attackDamage: 8,  attackPattern: 'lunge',   maxCount: 5,  spawnBiomes: [0,6,8] },
  [AnimalType.COCOA_CAT]:    { width: 120, height: 120, health: 500, attackDamage: 0,  attackPattern: 'lunge',   maxCount: 1,  spawnBiomes: [] },
};
