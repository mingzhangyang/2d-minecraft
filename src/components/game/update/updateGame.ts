import type { UpdateGameContext } from './updateContext';
import { updateAnimals, updateDroppedItems, spawnAnimals } from './updateAnimalSystem';
import {
  advanceWorldState,
  clearForcedDirt,
  playDamageSound,
  rewindOrSaveHistory,
  syncDeathState,
  updateDeadPlayer,
  updateFurnaces,
} from './updateWorldSystem';
import {
  updateInventoryOpenPlayer,
  updatePlayerActions,
  updatePlayerState,
} from './updatePlayerSystem';

export const updateGame = (context: UpdateGameContext) => {
  const { canvas, state, setFurnaceUI, checkCollision, isIntersecting, handleInteract } = context;
  const oldHealth = state.player.health;

  if (rewindOrSaveHistory(state)) {
    return;
  }

  syncDeathState(state);
  clearForcedDirt(state);

  if (state.isDead) {
    updateDeadPlayer({ canvas, state, checkCollision });
    return;
  }

  updateFurnaces({ state, setFurnaceUI });

  if (updateInventoryOpenPlayer({ state, checkCollision })) {
    return;
  }

  updatePlayerActions({ state, handleInteract });
  updateDroppedItems({ state, isIntersecting });
  spawnAnimals(state);
  updateAnimals({ state, checkCollision, isIntersecting });
  updatePlayerState({ state, checkCollision });
  advanceWorldState({ canvas, state });
  playDamageSound(state, oldHealth);
};
