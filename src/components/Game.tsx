import React, { useEffect, useRef, useState } from 'react';
import { MAX_DURABILITY } from './game/constants';
import { BlockType, FurnaceData } from './game/types';
import { createEmptyInventory } from './game/state';
import { GameOverlay } from './game/ui/GameOverlay';
import type { GameState, HoveredSlot, InventoryStack } from './game/runtime';
import { createInitialGameState, respawnPlayer } from './game/runtime';
import { useGameLoop } from './game/hooks/useGameLoop';
import { useInventoryInteractions } from './game/hooks/useInventoryInteractions';
import { deleteSave } from './game/persistence';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(BlockType.DIRT);
  const [stats, setStats] = useState({ health: 10, hunger: 10, daysPlayed: 0 });
  const [inventory, setInventory] = useState<Record<number, number>>(createEmptyInventory());
  const [durability, setDurability] = useState<Record<number, number>>({ ...MAX_DURABILITY });
  const [discoveredItems, setDiscoveredItems] = useState<Record<number, boolean>>({});
  const [isDead, setIsDead] = useState(false);
  const [autoRespawn, setAutoRespawn] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHotbar, setShowHotbar] = useState(true);
  const [openFurnaceId, setOpenFurnaceId] = useState<string | null>(null);
  const [furnaceUI, setFurnaceUI] = useState<FurnaceData | null>(null);
  const [craftingGrid, setCraftingGrid] = useState<(InventoryStack | null)[]>(Array(9).fill(null));
  const [cursorItem, setCursorItem] = useState<InventoryStack | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoveredSlotRef = useRef<HoveredSlot | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  if (gameStateRef.current === null) {
    gameStateRef.current = createInitialGameState();
  }

  const gameState = gameStateRef as React.MutableRefObject<GameState>;

  useGameLoop({
    canvasRef,
    gameState,
    setShowControls,
    setShowHotbar,
    setIsInventoryOpen,
    setFurnaceUI,
    setOpenFurnaceId,
    setStats,
    setInventory,
    setDurability,
    setDiscoveredItems,
    setIsDead,
    setAutoRespawn,
  });

  // Sync selected block to game state ref
  useEffect(() => {
    if (cursorItem && MAX_DURABILITY[cursorItem.type] && gameState.current.player.durability[cursorItem.type] === 0) {
      gameState.current.player.durability[cursorItem.type] = MAX_DURABILITY[cursorItem.type];
      gameState.current.invChanged = true;
    }
  }, [cursorItem]);

  useEffect(() => {
    gameState.current.selectedBlock = selectedBlock;
  }, [selectedBlock]);

  useEffect(() => {
    const handleClearDirt = () => {
      if (selectedBlock === BlockType.DIRT) {
        setSelectedBlock(BlockType.AIR);
      }
    };
    window.addEventListener('clearDirt', handleClearDirt);
    return () => window.removeEventListener('clearDirt', handleClearDirt);
  }, [selectedBlock]);

  useEffect(() => {
    const handleClose = () => {
      setOpenFurnaceId(null);
      setFurnaceUI(null);
      setInventory(prev => {
        const newInv = { ...prev };
        setCursorItem(cursor => {
          if (cursor) newInv[cursor.type] = (newInv[cursor.type] || 0) + cursor.count;
          return null;
        });
        setCraftingGrid(grid => {
          grid.forEach(slot => {
            if (slot) newInv[slot.type] = (newInv[slot.type] || 0) + slot.count;
          });
          return Array(9).fill(null);
        });
        gameState.current.player.inventory = { ...newInv };
        return newInv;
      });
    };
    
    const handleForceClose = () => {
      setIsInventoryOpen(false);
      handleClose();
    };

    window.addEventListener('closeInventory', handleClose as EventListener);
    window.addEventListener('forceCloseInventory', handleForceClose as EventListener);
    return () => {
      window.removeEventListener('closeInventory', handleClose as EventListener);
      window.removeEventListener('forceCloseInventory', handleForceClose as EventListener);
    };
  }, []);

  useEffect(() => {
    gameState.current.isInventoryOpen = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    gameState.current.openFurnaceId = openFurnaceId;
  }, [openFurnaceId]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    
    // Focus the canvas so keyboard events work immediately
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const {
    craftingResult,
    handleInventoryClick,
    handleCraftingGridClick,
    handleFurnaceClick,
    handleCraftingResultClick,
  } = useInventoryInteractions({
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
  });

  const handleHoveredSlotChange = (slot: HoveredSlot | null) => {
    hoveredSlotRef.current = slot;
  };

  const handleInventoryMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    setMousePos({ x: event.clientX, y: event.clientY });
  };

  const handleRespawn = () => {
    const state = gameState.current;
    respawnPlayer(state);
    setIsDead(false);
    setStats({
      health: state.player.health,
      hunger: state.player.hunger,
      daysPlayed: Math.floor(state.tick / 7200),
    });
  };

  const handleNewGame = () => {
    deleteSave();
    // Reinitialize game state in place
    const state = gameState.current;
    const fresh = createInitialGameState();
    Object.assign(state, fresh);
    setIsDead(false);
    setInventory({ ...fresh.player.inventory });
    setDurability({ ...fresh.player.durability });
    setDiscoveredItems({ ...fresh.discoveredItems });
    setSelectedBlock(fresh.selectedBlock);
    setStats({
      health: fresh.player.health,
      hunger: fresh.player.hunger,
      daysPlayed: 0,
    });

    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair focus:outline-none"
        style={{ imageRendering: 'pixelated' }}
        tabIndex={0}
      />

      <GameOverlay
        isDead={isDead}
        isInventoryOpen={isInventoryOpen}
        showHotbar={showHotbar}
        showControls={showControls}
        autoRespawn={autoRespawn}
        openFurnaceId={openFurnaceId}
        furnaceUI={furnaceUI}
        craftingGrid={craftingGrid}
        craftingResult={craftingResult}
        cursorItem={cursorItem}
        mousePos={mousePos}
        stats={stats}
        inventory={inventory}
        durability={durability}
        discoveredItems={discoveredItems}
        selectedBlock={selectedBlock}
        onRespawn={handleRespawn}
        onNewGame={handleNewGame}
        onInventoryMouseMove={handleInventoryMouseMove}
        onInventorySlotMouseDown={handleInventoryClick}
        onCraftingGridMouseDown={handleCraftingGridClick}
        onFurnaceMouseDown={handleFurnaceClick}
        onCraftingResultMouseDown={handleCraftingResultClick}
        onSelectBlock={setSelectedBlock}
        onHoveredSlotChange={handleHoveredSlotChange}
      />
    </div>
  );
}
