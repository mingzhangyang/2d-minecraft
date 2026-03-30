import { useEffect, useMemo } from 'react';
import type { Dispatch, MouseEvent, MutableRefObject, SetStateAction } from 'react';
import { checkCrafting, getMaxStack } from '../crafting';
import type { BlockType, FurnaceData } from '../types';
import type {
  FurnaceSlotType,
  GameState,
  HoveredSlot,
  InventoryStack,
} from '../runtime';
import { isValidFurnaceFuel, isValidFurnaceInput } from '../runtime';

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseInventoryInteractionsParams = {
  gameState: MutableRefObject<GameState>;
  openFurnaceId: string | null;
  isInventoryOpen: boolean;
  inventory: Record<number, number>;
  craftingGrid: (InventoryStack | null)[];
  cursorItem: InventoryStack | null;
  hoveredSlotRef: MutableRefObject<HoveredSlot | null>;
  setInventory: SetState<Record<number, number>>;
  setCraftingGrid: SetState<(InventoryStack | null)[]>;
  setCursorItem: SetState<InventoryStack | null>;
  setFurnaceUI: SetState<FurnaceData | null>;
  setDiscoveredItems: SetState<Record<number, boolean>>;
};

const isRightClick = (event: MouseEvent) => event.button === 2 || event.type === 'contextmenu';

export const useInventoryInteractions = ({
  gameState,
  openFurnaceId,
  isInventoryOpen,
  inventory,
  craftingGrid,
  cursorItem,
  hoveredSlotRef,
  setInventory,
  setCraftingGrid,
  setCursorItem,
  setFurnaceUI,
  setDiscoveredItems,
}: UseInventoryInteractionsParams) => {
  const craftingResult = useMemo(() => checkCrafting(craftingGrid), [craftingGrid]);

  const handleInventoryClick = (event: MouseEvent, type: BlockType) => {
    event.preventDefault();
    const rightClick = isRightClick(event);

    if (cursorItem) {
      if (cursorItem.type === type) {
        const maxStack = getMaxStack(type);
        setInventory(prev => {
          const currentAmount = prev[type] || 0;
          const availableSpace = maxStack - currentAmount;
          if (availableSpace <= 0) return prev;

          const amountToAdd = rightClick ? 1 : cursorItem.count;
          const actualAmount = Math.min(amountToAdd, availableSpace);
          const newInventory = { ...prev, [type]: currentAmount + actualAmount };

          gameState.current.player.inventory = { ...newInventory };
          setCursorItem(prevCursor =>
            prevCursor
              ? prevCursor.count === actualAmount
                ? null
                : { ...prevCursor, count: prevCursor.count - actualAmount }
              : null,
          );

          return newInventory;
        });
      } else {
        setInventory(prev => {
          const newInventory = { ...prev };
          const maxCursorStack = getMaxStack(cursorItem.type);
          const currentCursorCount = newInventory[cursorItem.type] || 0;
          const cursorSpace = maxCursorStack - currentCursorCount;
          const amountToReturn = Math.min(cursorItem.count, cursorSpace);

          newInventory[cursorItem.type] = currentCursorCount + amountToReturn;

          if (amountToReturn === cursorItem.count) {
            const pickupAmount = rightClick ? Math.ceil((newInventory[type] || 0) / 2) : newInventory[type] || 0;
            if (pickupAmount > 0) {
              newInventory[type] -= pickupAmount;
              setCursorItem({ type, count: pickupAmount });
            } else {
              setCursorItem(null);
            }
          } else {
            setCursorItem({ type: cursorItem.type, count: cursorItem.count - amountToReturn });
          }

          gameState.current.player.inventory = { ...newInventory };
          return newInventory;
        });
      }
      return;
    }

    setInventory(prev => {
      const amount = prev[type] || 0;
      if (amount === 0) return prev;

      const pickupAmount = rightClick ? Math.ceil(amount / 2) : amount;
      const newInventory = { ...prev, [type]: amount - pickupAmount };

      setCursorItem({ type, count: pickupAmount });
      gameState.current.player.inventory = { ...newInventory };

      return newInventory;
    });
  };

  const handleCraftingGridClick = (event: MouseEvent, index: number) => {
    event.preventDefault();
    const rightClick = isRightClick(event);

    setCraftingGrid(prev => {
      const newGrid = [...prev];
      const currentSlot = newGrid[index];

      if (cursorItem) {
        if (currentSlot === null) {
          const amount = rightClick ? 1 : cursorItem.count;
          newGrid[index] = { type: cursorItem.type, count: amount };
          setCursorItem(prevCursor =>
            prevCursor
              ? prevCursor.count === amount
                ? null
                : { ...prevCursor, count: prevCursor.count - amount }
              : null,
          );
        } else if (currentSlot.type === cursorItem.type) {
          const maxStack = getMaxStack(cursorItem.type);
          const availableSpace = maxStack - currentSlot.count;
          if (availableSpace <= 0) return prev;

          const amount = Math.min(rightClick ? 1 : cursorItem.count, availableSpace);
          newGrid[index] = { ...currentSlot, count: currentSlot.count + amount };
          setCursorItem(prevCursor =>
            prevCursor
              ? prevCursor.count === amount
                ? null
                : { ...prevCursor, count: prevCursor.count - amount }
              : null,
          );
        } else {
          newGrid[index] = { type: cursorItem.type, count: cursorItem.count };
          setCursorItem({ type: currentSlot.type, count: currentSlot.count });
        }
      } else if (currentSlot !== null) {
        const amount = rightClick ? Math.ceil(currentSlot.count / 2) : currentSlot.count;
        setCursorItem({ type: currentSlot.type, count: amount });

        if (amount === currentSlot.count) {
          newGrid[index] = null;
        } else {
          newGrid[index] = { ...currentSlot, count: currentSlot.count - amount };
        }
      }

      return newGrid;
    });
  };

  const handleFurnaceClick = (event: MouseEvent, slotType: FurnaceSlotType) => {
    event.preventDefault();
    if (!openFurnaceId) return;

    const rightClick = isRightClick(event);
    const furnace = gameState.current.furnaces[openFurnaceId];
    if (!furnace) return;

    if (slotType === 'output') {
      if (furnace.output) {
        if (!cursorItem) {
          setCursorItem({ ...furnace.output });
          furnace.output = null;
        } else if (cursorItem.type === furnace.output.type) {
          const maxStack = getMaxStack(furnace.output.type);
          if (cursorItem.count + furnace.output.count <= maxStack) {
            setCursorItem({ ...cursorItem, count: cursorItem.count + furnace.output.count });
            furnace.output = null;
          } else {
            const availableSpace = maxStack - cursorItem.count;
            if (availableSpace > 0) {
              setCursorItem({ ...cursorItem, count: maxStack });
              furnace.output.count -= availableSpace;
            }
          }
        }
      }
    } else {
      const currentSlot = furnace[slotType];
      if (cursorItem) {
        if (slotType === 'input' && !isValidFurnaceInput(cursorItem.type)) return;
        if (slotType === 'fuel' && !isValidFurnaceFuel(cursorItem.type)) return;

        if (currentSlot === null) {
          const amount = rightClick ? 1 : cursorItem.count;
          furnace[slotType] = { type: cursorItem.type, count: amount };
          setCursorItem(prev =>
            prev ? (prev.count === amount ? null : { ...prev, count: prev.count - amount }) : null,
          );
        } else if (currentSlot.type === cursorItem.type) {
          const maxStack = getMaxStack(cursorItem.type);
          const availableSpace = maxStack - currentSlot.count;
          if (availableSpace <= 0) return;

          const amount = Math.min(rightClick ? 1 : cursorItem.count, availableSpace);
          furnace[slotType] = { ...currentSlot, count: currentSlot.count + amount };
          setCursorItem(prev =>
            prev ? (prev.count === amount ? null : { ...prev, count: prev.count - amount }) : null,
          );
        } else {
          furnace[slotType] = { type: cursorItem.type, count: cursorItem.count };
          setCursorItem({ type: currentSlot.type, count: currentSlot.count });
        }
      } else if (currentSlot) {
        const pickupAmount = rightClick ? Math.ceil(currentSlot.count / 2) : currentSlot.count;
        setCursorItem({ type: currentSlot.type, count: pickupAmount });

        if (pickupAmount === currentSlot.count) {
          furnace[slotType] = null;
        } else {
          furnace[slotType] = { ...currentSlot, count: currentSlot.count - pickupAmount };
        }
      }
    }

    setFurnaceUI({ ...furnace });
  };

  const handleCraftingResultClick = (event: MouseEvent) => {
    event.preventDefault();
    if (!craftingResult) return;

    if (cursorItem) {
      if (cursorItem.type !== craftingResult.type) return;

      const maxStack = getMaxStack(craftingResult.type);
      if (cursorItem.count + craftingResult.count > maxStack) return;

      setCursorItem(prev => (prev ? { ...prev, count: prev.count + craftingResult.count } : null));
    } else {
      setCursorItem({ type: craftingResult.type, count: craftingResult.count });
    }

    setDiscoveredItems(prev => ({ ...prev, [craftingResult.type]: true }));
    gameState.current.discoveredItems[craftingResult.type] = true;

    setCraftingGrid(prev =>
      prev.map(slot => {
        if (slot === null) return null;
        if (slot.count === 1) return null;
        return { ...slot, count: slot.count - 1 };
      }),
    );
  };

  useEffect(() => {
    const handleSplitKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 's' || !isInventoryOpen) return;

      const hovered = hoveredSlotRef.current;
      if (!hovered || hovered.type !== 'inventory') return;

      const blockType = hovered.block;
      const count = inventory[blockType] || 0;
      if (count <= 0) return;

      const moveAmount = count > 1 ? Math.floor(count / 2) : 1;
      let targetIndex = craftingGrid.findIndex(slot => slot && slot.type === blockType);
      if (targetIndex === -1) {
        targetIndex = craftingGrid.findIndex(slot => slot === null);
      }
      if (targetIndex === -1) return;

      setCraftingGrid(prev => {
        const newGrid = [...prev];
        const existing = newGrid[targetIndex];
        newGrid[targetIndex] = {
          type: blockType,
          count: (existing ? existing.count : 0) + moveAmount,
        };
        return newGrid;
      });

      setInventory(prev => {
        const newInventory = { ...prev, [blockType]: prev[blockType] - moveAmount };
        gameState.current.player.inventory = { ...newInventory };
        return newInventory;
      });
    };

    window.addEventListener('keydown', handleSplitKey);
    return () => window.removeEventListener('keydown', handleSplitKey);
  }, [craftingGrid, gameState, hoveredSlotRef, inventory, isInventoryOpen, setCraftingGrid, setInventory]);

  return {
    craftingResult,
    handleInventoryClick,
    handleCraftingGridClick,
    handleFurnaceClick,
    handleCraftingResultClick,
  };
};
