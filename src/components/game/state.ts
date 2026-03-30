import { INVENTORY_BLOCKS } from './constants';

export const createEmptyInventory = (): Record<number, number> => {
  const inventory: Record<number, number> = {};
  for (const block of INVENTORY_BLOCKS) {
    inventory[block] = 0;
  }
  return inventory;
};
