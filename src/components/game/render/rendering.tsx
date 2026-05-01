import { BLOCK_COLORS, TILE_SIZE } from '../constants';
import { BlockType } from '../types';

// Pre-rendered texture cache: block type → offscreen canvas at TILE_SIZE
const textureCache = new Map<BlockType, OffscreenCanvas>();

const renderToCache = (type: BlockType): OffscreenCanvas => {
  const canvas = new OffscreenCanvas(TILE_SIZE, TILE_SIZE);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  drawBlock(ctx as unknown as CanvasRenderingContext2D, 0, 0, type, TILE_SIZE);
  textureCache.set(type, canvas);
  return canvas;
};

// Blocks that benefit most from caching (terrain + structural, excluding animated/transparent)
const CACHEABLE_BLOCKS = new Set<BlockType>([
  BlockType.DIRT, BlockType.GRASS, BlockType.STONE, BlockType.SAND,
  BlockType.SNOW_DIRT, BlockType.SNOW_GRASS, BlockType.WOOD, BlockType.PINE_WOOD,
  BlockType.PALM_WOOD, BlockType.JUNGLE_WOOD, BlockType.PLANKS, BlockType.BRICKS,
  BlockType.COAL_ORE, BlockType.IRON_ORE, BlockType.GOLD_ORE, BlockType.DIAMOND_ORE,
  BlockType.OBSIDIAN, BlockType.MAGMA, BlockType.MUD, BlockType.RED_SAND,
  BlockType.TERRACOTTA, BlockType.LEAVES, BlockType.PINE_LEAVES, BlockType.PALM_LEAVES,
  BlockType.JUNGLE_LEAVES, BlockType.GOLD_BLOCK, BlockType.DIAMOND_BLOCK,
  BlockType.FURNACE, BlockType.COCOA_PORTAL,
]);

/**
 * Draw a block using a cached texture when possible (terrain rendering path).
 * Falls back to drawBlock for non-cacheable types.
 */
export const drawBlockCached = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: BlockType,
  size: number = TILE_SIZE,
) => {
  if (size === TILE_SIZE && CACHEABLE_BLOCKS.has(type)) {
    let cached = textureCache.get(type);
    if (!cached) cached = renderToCache(type);
    ctx.drawImage(cached, x, y);
    return;
  }
  drawBlock(ctx, x, y, type, size);
};

export const drawBlock = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: BlockType,
  size: number = TILE_SIZE,
) => {
  if (type === BlockType.AIR) return;

  ctx.fillStyle = BLOCK_COLORS[type];

  if (
    type === BlockType.DIRT ||
    type === BlockType.GRASS ||
    type === BlockType.STONE ||
    type === BlockType.SAND ||
    type === BlockType.SNOW_DIRT ||
    type === BlockType.SNOW_GRASS ||
    type === BlockType.WOOD ||
    type === BlockType.PINE_WOOD ||
    type === BlockType.PALM_WOOD ||
    type === BlockType.PLANKS ||
    type === BlockType.COAL_ORE ||
    type === BlockType.IRON_ORE ||
    type === BlockType.GOLD_ORE ||
    type === BlockType.DIAMOND_ORE ||
    type === BlockType.OBSIDIAN ||
    type === BlockType.MAGMA ||
    type === BlockType.GOLD_BLOCK ||
    type === BlockType.DIAMOND_BLOCK
  ) {
    ctx.fillRect(x, y, size, size);

    // Better pixelated texture
    const s = size / 8; // 8x8 grid

    // Add border for depth
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x, y + size - s, size, s); // bottom
    ctx.fillRect(x + size - s, y, s, size); // right
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x, y, size, s); // top
    ctx.fillRect(x, y, s, size); // left

    // Add noise
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(x + s * 2, y + s * 2, s, s);
    ctx.fillRect(x + s * 5, y + s * 3, s * 2, s);
    ctx.fillRect(x + s * 1, y + s * 6, s, s);
    ctx.fillRect(x + s * 6, y + s * 6, s, s);

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + s * 4, y + s * 1, s, s);
    ctx.fillRect(x + s * 1, y + s * 4, s * 2, s);
    ctx.fillRect(x + s * 5, y + s * 5, s, s);

    if (type === BlockType.GRASS) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y, size, s * 2);
      ctx.fillRect(x + s * 1, y + s * 2, s, s);
      ctx.fillRect(x + s * 3, y + s * 2, s, s);
      ctx.fillRect(x + s * 6, y + s * 2, s, s);
    } else if (type === BlockType.SNOW_GRASS) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, size, s * 2);
      ctx.fillRect(x + s * 1, y + s * 2, s, s);
      ctx.fillRect(x + s * 3, y + s * 2, s, s);
      ctx.fillRect(x + s * 6, y + s * 2, s, s);
    } else if (
      type === BlockType.COAL_ORE ||
      type === BlockType.IRON_ORE ||
      type === BlockType.GOLD_ORE ||
      type === BlockType.DIAMOND_ORE
    ) {
      ctx.fillStyle =
        type === BlockType.COAL_ORE
          ? '#000000'
          : type === BlockType.IRON_ORE
            ? '#E6C280'
            : type === BlockType.GOLD_ORE
              ? '#FFD700'
              : '#00E5FF';
      ctx.fillRect(x + s * 2, y + s * 2, s * 2, s * 2);
      ctx.fillRect(x + s * 5, y + s * 5, s * 2, s * 2);
      ctx.fillRect(x + s * 1, y + s * 5, s, s);
      ctx.fillRect(x + s * 6, y + s * 2, s, s);
    }
    return;
  }

  if (type === BlockType.APPLE) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2 + size * 0.1, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4CAF50'; // Leaf
    ctx.fillRect(x + size / 2 - size * 0.1, y + size * 0.1, size * 0.2, size * 0.2);
    return;
  }

  if (
    type === BlockType.MEAT ||
    type === BlockType.COOKED_MEAT ||
    type === BlockType.BEEF ||
    type === BlockType.COOKED_BEEF ||
    type === BlockType.PORK ||
    type === BlockType.COOKED_PORK ||
    type === BlockType.CHICKEN_MEAT ||
    type === BlockType.COOKED_CHICKEN_MEAT ||
    type === BlockType.FISH_MEAT ||
    type === BlockType.COOKED_FISH_MEAT
  ) {
    const isCooked = [
      BlockType.COOKED_MEAT,
      BlockType.COOKED_BEEF,
      BlockType.COOKED_PORK,
      BlockType.COOKED_CHICKEN_MEAT,
      BlockType.COOKED_FISH_MEAT,
    ].includes(type);
    ctx.fillStyle = BLOCK_COLORS[type];
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size / 2, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isCooked ? '#5D4037' : '#FFCDD2'; // Bone/fat
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y + size / 2, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (type === BlockType.COAL) {
    ctx.fillStyle = BLOCK_COLORS[BlockType.COAL];
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + size * 0.2);
    ctx.lineTo(x + size * 0.7, y + size * 0.2);
    ctx.lineTo(x + size * 0.8, y + size * 0.5);
    ctx.lineTo(x + size * 0.6, y + size * 0.8);
    ctx.lineTo(x + size * 0.2, y + size * 0.7);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.35, y + size * 0.25);
    ctx.lineTo(x + size * 0.65, y + size * 0.25);
    ctx.lineTo(x + size * 0.7, y + size * 0.4);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (type === BlockType.FURNACE) {
    ctx.fillStyle = BLOCK_COLORS[BlockType.STONE];
    ctx.fillRect(x, y, size, size);
    // Furnace top/bottom border
    ctx.fillStyle = '#424242';
    ctx.fillRect(x, y, size, size * 0.1);
    ctx.fillRect(x, y + size * 0.9, size, size * 0.1);
    ctx.fillRect(x, y, size * 0.1, size);
    ctx.fillRect(x + size * 0.9, y, size * 0.1, size);
    // Furnace opening
    ctx.fillStyle = '#212121';
    ctx.fillRect(x + size * 0.2, y + size * 0.4, size * 0.6, size * 0.4);
    return;
  }

  if (type === BlockType.WORM) {
    ctx.beginPath();
    ctx.strokeStyle = '#FF8DA1';
    ctx.lineWidth = size * 0.15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x + size * 0.2, y + size * 0.5);
    ctx.quadraticCurveTo(x + size * 0.4, y + size * 0.2, x + size * 0.5, y + size * 0.5);
    ctx.quadraticCurveTo(x + size * 0.6, y + size * 0.8, x + size * 0.8, y + size * 0.5);
    ctx.stroke();
    // little eye
    ctx.fillStyle = 'black';
    ctx.fillRect(x + size * 0.7, y + size * 0.45, size * 0.05, size * 0.05);
    return;
  }

  if (
    type === BlockType.TALL_GRASS ||
    type === BlockType.FLOWER_BUD ||
    type === BlockType.FLOWER_BLOOM
  ) {
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Draw a few blades of grass
    ctx.moveTo(x + size * 0.2, y + size);
    ctx.quadraticCurveTo(x + size * 0.1, y + size * 0.5, x + size * 0.3, y + size * 0.1);
    ctx.moveTo(x + size * 0.5, y + size);
    ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.6, x + size * 0.4, y + size * 0.2);
    ctx.moveTo(x + size * 0.8, y + size);
    ctx.quadraticCurveTo(x + size * 0.9, y + size * 0.5, x + size * 0.7, y + size * 0.15);
    ctx.stroke();

    if (type === BlockType.FLOWER_BUD) {
      ctx.fillStyle = '#8BC34A'; // Light green bud
      ctx.beginPath();
      ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === BlockType.FLOWER_BLOOM) {
      // Draw petals
      ctx.fillStyle = '#E91E63'; // Pink flower
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const px = x + size * 0.4 + Math.cos(angle) * size * 0.15;
        const py = y + size * 0.2 + Math.sin(angle) * size * 0.15;
        ctx.beginPath();
        ctx.arc(px, py, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center
      ctx.fillStyle = '#FFEB3B'; // Yellow center
      ctx.beginPath();
      ctx.arc(x + size * 0.4, y + size * 0.2, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    return;
  }

  if (type === BlockType.STICK) {
    ctx.strokeStyle = BLOCK_COLORS[BlockType.STICK];
    ctx.lineWidth = size * 0.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y + size * 0.8);
    ctx.lineTo(x + size * 0.8, y + size * 0.2);
    ctx.stroke();
    return;
  }

  if (type === BlockType.FANG) {
    ctx.fillStyle = BLOCK_COLORS[BlockType.FANG];
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + size * 0.2);
    ctx.lineTo(x + size * 0.7, y + size * 0.2);
    ctx.lineTo(x + size * 0.5, y + size * 0.8);
    ctx.closePath();
    ctx.fill();
    // Poison tip
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.45, y + size * 0.65);
    ctx.lineTo(x + size * 0.55, y + size * 0.65);
    ctx.lineTo(x + size * 0.5, y + size * 0.8);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (type === BlockType.WOODEN_SWORD) {
    ctx.fillStyle = '#8B5A2B';
    // Blade
    ctx.fillRect(x + size * 0.4, y + size * 0.1, size * 0.2, size * 0.6);
    // Crossguard
    ctx.fillRect(x + size * 0.2, y + size * 0.6, size * 0.6, size * 0.15);
    // Handle
    ctx.fillRect(x + size * 0.4, y + size * 0.75, size * 0.2, size * 0.25);
    return;
  }

  if (type === BlockType.COCOA_SWORD) {
    ctx.fillStyle = '#4a3118';
    ctx.fillRect(x + size * 0.37, y + size * 0.07, size * 0.26, size * 0.6);
    ctx.fillStyle = '#7a5530';
    ctx.fillRect(x + size * 0.41, y + size * 0.09, size * 0.18, size * 0.56);
    ctx.fillStyle = '#a67c52';
    ctx.fillRect(x + size * 0.45, y + size * 0.13, size * 0.1, size * 0.46);
    ctx.fillStyle = '#3f2814';
    ctx.fillRect(x + size * 0.2, y + size * 0.62, size * 0.6, size * 0.14);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + size * 0.24, y + size * 0.65, size * 0.52, size * 0.08);
    ctx.fillStyle = '#5d3c1f';
    ctx.fillRect(x + size * 0.43, y + size * 0.76, size * 0.14, size * 0.2);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + size * 0.46, y + size * 0.79, size * 0.08, size * 0.14);
    ctx.fillStyle = '#2d1b0e';
    ctx.fillRect(x + size * 0.45, y + size * 0.93, size * 0.1, size * 0.05);
    return;
  }

  if (type === BlockType.COCOA_AXE) {
    ctx.fillStyle = '#4a3118';
    ctx.fillRect(x + size * 0.45, y + size * 0.18, size * 0.1, size * 0.77);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + size * 0.47, y + size * 0.2, size * 0.06, size * 0.73);
    ctx.fillStyle = '#2d1b0e';
    ctx.fillRect(x + size * 0.46, y + size * 0.34, size * 0.08, size * 0.03);
    ctx.fillRect(x + size * 0.46, y + size * 0.56, size * 0.08, size * 0.03);
    ctx.fillStyle = '#5a3920';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.54, y + size * 0.17);
    ctx.lineTo(x + size * 0.14, y + size * 0.25);
    ctx.lineTo(x + size * 0.14, y + size * 0.47);
    ctx.lineTo(x + size * 0.54, y + size * 0.39);
    ctx.fill();
    ctx.fillStyle = '#8f6840';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.21);
    ctx.lineTo(x + size * 0.21, y + size * 0.28);
    ctx.lineTo(x + size * 0.21, y + size * 0.42);
    ctx.lineTo(x + size * 0.5, y + size * 0.36);
    ctx.fill();
    return;
  }

  if (type === BlockType.COCOA_HAMMER) {
    ctx.fillStyle = '#4a3118';
    ctx.fillRect(x + size * 0.45, y + size * 0.22, size * 0.1, size * 0.74);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x + size * 0.47, y + size * 0.24, size * 0.06, size * 0.7);
    ctx.fillStyle = '#2d1b0e';
    ctx.fillRect(x + size * 0.46, y + size * 0.37, size * 0.08, size * 0.03);
    ctx.fillRect(x + size * 0.46, y + size * 0.63, size * 0.08, size * 0.03);
    ctx.fillStyle = '#5a3920';
    ctx.fillRect(x + size * 0.18, y + size * 0.08, size * 0.64, size * 0.24);
    ctx.fillStyle = '#8f6840';
    ctx.fillRect(x + size * 0.22, y + size * 0.12, size * 0.56, size * 0.16);
    ctx.fillStyle = '#3b2412';
    ctx.fillRect(x + size * 0.18, y + size * 0.14, size * 0.06, size * 0.12);
    ctx.fillRect(x + size * 0.76, y + size * 0.14, size * 0.06, size * 0.12);
    return;
  }

  if (type === BlockType.FANG_LANCE) {
    // Stick
    ctx.strokeStyle = '#8B5A2B';
    ctx.lineWidth = size * 0.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.9);
    ctx.lineTo(x + size * 0.5, y + size * 0.3);
    ctx.stroke();
    // Fang tip
    ctx.fillStyle = '#F5F5DC';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.3, y + size * 0.3);
    ctx.lineTo(x + size * 0.5, y + size * 0.0);
    ctx.lineTo(x + size * 0.7, y + size * 0.3);
    ctx.fill();
    return;
  }

  if (type === BlockType.CACTUS) {
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(x + size * 0.1, y, size * 0.8, size);
    ctx.fillStyle = '#1B5E20';
    ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.1, size * 0.1);
    ctx.fillRect(x + size * 0.7, y + size * 0.5, size * 0.1, size * 0.1);
    ctx.fillRect(x + size * 0.4, y + size * 0.8, size * 0.1, size * 0.1);
    return;
  }

  if (type === BlockType.WATER) {
    ctx.fillStyle = BLOCK_COLORS[BlockType.WATER];
    ctx.fillRect(x, y, size, size);
    // Flat water surface (no waves on top)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x, y, size, size * 0.1);
    return;
  }

  if (type === BlockType.CORAL) {
    ctx.fillStyle = BLOCK_COLORS[BlockType.CORAL];
    ctx.beginPath();
    ctx.moveTo(x + size * 0.2, y + size);
    ctx.lineTo(x + size * 0.4, y + size * 0.4);
    ctx.lineTo(x + size * 0.6, y + size * 0.6);
    ctx.lineTo(x + size * 0.8, y + size * 0.3);
    ctx.lineTo(x + size * 0.9, y + size);
    ctx.fill();
    return;
  }

  if (type === BlockType.IRON_INGOT || type === BlockType.GOLD_INGOT) {
    ctx.fillStyle = type === BlockType.IRON_INGOT ? '#E6C280' : '#FFD700';
    ctx.fillRect(x + size * 0.2, y + size * 0.35, size * 0.6, size * 0.3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(x + size * 0.2, y + size * 0.35, size * 0.6, size * 0.1);
    return;
  }
  if (type === BlockType.DIAMOND) {
    ctx.fillStyle = '#00E5FF';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.25);
    ctx.lineTo(x + size * 0.75, y + size * 0.5);
    ctx.lineTo(x + size * 0.5, y + size * 0.75);
    ctx.lineTo(x + size * 0.25, y + size * 0.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.25);
    ctx.lineTo(x + size * 0.75, y + size * 0.5);
    ctx.lineTo(x + size * 0.25, y + size * 0.5);
    ctx.fill();
    return;
  }
  if (type === BlockType.COCOA_PICKAXE) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(Math.PI / 4);

    ctx.fillStyle = '#4a3118';
    ctx.fillRect(-size * 0.05, -size * 0.1, size * 0.1, size * 0.5);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-size * 0.03, -size * 0.08, size * 0.06, size * 0.46);

    ctx.fillStyle = '#5a3920';
    ctx.beginPath();
    ctx.moveTo(-size * 0.43, -size * 0.08);
    ctx.lineTo(0, -size * 0.33);
    ctx.lineTo(size * 0.43, -size * 0.08);
    ctx.lineTo(size * 0.3, 0.02 * size);
    ctx.lineTo(0, -size * 0.08);
    ctx.lineTo(-size * 0.3, 0.02 * size);
    ctx.fill();

    ctx.fillStyle = '#906a40';
    ctx.beginPath();
    ctx.moveTo(-size * 0.33, -size * 0.08);
    ctx.lineTo(0, -size * 0.27);
    ctx.lineTo(size * 0.33, -size * 0.08);
    ctx.lineTo(size * 0.24, -size * 0.02);
    ctx.lineTo(0, -size * 0.11);
    ctx.lineTo(-size * 0.24, -size * 0.02);
    ctx.fill();

    ctx.restore();
    return;
  }

  if (
    type === BlockType.WOODEN_PICKAXE ||
    type === BlockType.STONE_PICKAXE ||
    type === BlockType.IRON_PICKAXE ||
    type === BlockType.GOLD_PICKAXE ||
    type === BlockType.DIAMOND_PICKAXE
  ) {
    const color =
      type === BlockType.WOODEN_PICKAXE
        ? '#8B5A2B'
        : type === BlockType.STONE_PICKAXE
          ? '#9E9E9E'
          : type === BlockType.IRON_PICKAXE
            ? '#E6C280'
            : type === BlockType.GOLD_PICKAXE
              ? '#FFD700'
              : type === BlockType.DIAMOND_PICKAXE
                ? '#00E5FF'
                : '#8b5a2b';
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);
    ctx.rotate(Math.PI / 4);

    // Stick
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(-size * 0.05, -size * 0.1, size * 0.1, size * 0.5);

    // Head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.1);
    ctx.lineTo(0, -size * 0.3);
    ctx.lineTo(size * 0.4, -size * 0.1);
    ctx.lineTo(size * 0.3, 0);
    ctx.lineTo(0, -size * 0.1);
    ctx.lineTo(-size * 0.3, 0);
    ctx.fill();

    ctx.restore();
    return;
  }

  if (type === BlockType.COCOA_SPEAR) {
    ctx.strokeStyle = '#4a3118';
    ctx.lineWidth = size * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.95);
    ctx.lineTo(x + size * 0.5, y + size * 0.25);
    ctx.stroke();
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = size * 0.06;
    ctx.beginPath();
    ctx.moveTo(x + size * 0.5, y + size * 0.9);
    ctx.lineTo(x + size * 0.5, y + size * 0.27);
    ctx.stroke();
    ctx.fillStyle = '#5a3920';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.28, y + size * 0.26);
    ctx.lineTo(x + size * 0.5, y + size * 0.02);
    ctx.lineTo(x + size * 0.72, y + size * 0.26);
    ctx.fill();
    ctx.fillStyle = '#a67c52';
    ctx.beginPath();
    ctx.moveTo(x + size * 0.38, y + size * 0.24);
    ctx.lineTo(x + size * 0.5, y + size * 0.08);
    ctx.lineTo(x + size * 0.62, y + size * 0.24);
    ctx.fill();
    return;
  }

  const textureType = type as BlockType;
  ctx.fillRect(x, y, size, size);

  // Textures
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  if (textureType === BlockType.WOOD || textureType === BlockType.PINE_WOOD || textureType === BlockType.PALM_WOOD) {
    ctx.fillStyle =
      textureType === BlockType.PINE_WOOD ? '#3E2723' : textureType === BlockType.PALM_WOOD ? '#795548' : '#4E342E';
    ctx.fillRect(x + size * 0.1, y, size * 0.1, size);
    ctx.fillRect(x + size * 0.4, y, size * 0.1, size);
    ctx.fillRect(x + size * 0.7, y, size * 0.1, size);
  } else if (
    textureType === BlockType.LEAVES ||
    textureType === BlockType.PINE_LEAVES ||
    textureType === BlockType.PALM_LEAVES
  ) {
    ctx.fillStyle =
      textureType === BlockType.PINE_LEAVES ? '#003300' : textureType === BlockType.PALM_LEAVES ? '#558B2F' : '#1B5E20';
    ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.25, size * 0.25);
    ctx.fillRect(x + size * 0.6, y + size * 0.2, size * 0.25, size * 0.25);
    ctx.fillRect(x + size * 0.3, y + size * 0.6, size * 0.25, size * 0.25);
  } else if (textureType === BlockType.PLANKS) {
    ctx.fillStyle = '#BCAAA4';
    ctx.fillRect(x, y + size * 0.25, size, size * 0.05);
    ctx.fillRect(x, y + size * 0.55, size, size * 0.05);
    ctx.fillRect(x, y + size * 0.85, size, size * 0.05);
    ctx.fillRect(x + size * 0.2, y, size * 0.05, size * 0.25);
    ctx.fillRect(x + size * 0.7, y + size * 0.3, size * 0.05, size * 0.25);
    ctx.fillRect(x + size * 0.4, y + size * 0.6, size * 0.05, size * 0.25);
  } else if (textureType === BlockType.BRICKS) {
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(x, y + size * 0.45, size, size * 0.05);
    ctx.fillRect(x + size * 0.45, y, size * 0.05, size * 0.45);
    ctx.fillRect(x + size * 0.2, y + size * 0.5, size * 0.05, size * 0.5);
    ctx.fillRect(x + size * 0.7, y + size * 0.5, size * 0.05, size * 0.5);
  } else if (
    textureType === BlockType.COAL_ORE ||
    textureType === BlockType.IRON_ORE ||
    textureType === BlockType.GOLD_ORE ||
    textureType === BlockType.DIAMOND_ORE
  ) {
    // Draw stone base
    ctx.fillStyle = BLOCK_COLORS[BlockType.STONE];
    ctx.fillRect(x, y, size, size);

    // Draw stone texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.3);
    ctx.fillRect(x + size * 0.6, y + size * 0.6, size * 0.3, size * 0.3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + size * 0.5, y + size * 0.1, size * 0.2, size * 0.2);

    // Draw ore specs
    ctx.fillStyle = BLOCK_COLORS[textureType];
    const specSize = size * 0.15;
    ctx.fillRect(x + size * 0.2, y + size * 0.2, specSize, specSize);
    ctx.fillRect(x + size * 0.65, y + size * 0.3, specSize, specSize);
    ctx.fillRect(x + size * 0.3, y + size * 0.65, specSize, specSize);
    ctx.fillRect(x + size * 0.7, y + size * 0.7, specSize, specSize);
    ctx.fillRect(x + size * 0.45, y + size * 0.45, specSize * 1.2, specSize * 1.2);
  } else if (textureType === BlockType.MAGMA) {
    ctx.fillStyle = '#FF8C00'; // Orange highlights
    ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.3, size * 0.2);
    ctx.fillRect(x + size * 0.6, y + size * 0.5, size * 0.2, size * 0.3);
    ctx.fillStyle = '#FFFF00'; // Yellow bright spots
    ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.1, size * 0.1);
    ctx.fillRect(x + size * 0.7, y + size * 0.6, size * 0.1, size * 0.1);
  } else if (textureType === BlockType.OBSIDIAN) {
    ctx.fillStyle = '#2A0845'; // Purple highlights
    ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.1);
    ctx.fillRect(x + size * 0.1, y + size * 0.3, size * 0.8, size * 0.1);
    ctx.fillRect(x + size * 0.1, y + size * 0.5, size * 0.8, size * 0.1);
    ctx.fillRect(x + size * 0.1, y + size * 0.7, size * 0.8, size * 0.1);
  }

  // Subtle border
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.strokeRect(x, y, size, size);
};

export const BlockIcon = ({
  type,
  className = 'absolute inset-2',
}: {
  type: BlockType;
  className?: string;
}) => {
  if (type === BlockType.WOOD || type === BlockType.PINE_WOOD || type === BlockType.PALM_WOOD) {
    const stripeColor = type === BlockType.PINE_WOOD ? '#3E2723' : type === BlockType.PALM_WOOD ? '#795548' : '#4E342E';
    return (
      <div className={className} style={{ backgroundColor: BLOCK_COLORS[type] }}>
        <div className="absolute top-0 bottom-0 left-[10%] w-[10%]" style={{ backgroundColor: stripeColor }} />
        <div className="absolute top-0 bottom-0 left-[40%] w-[10%]" style={{ backgroundColor: stripeColor }} />
        <div className="absolute top-0 bottom-0 left-[70%] w-[10%]" style={{ backgroundColor: stripeColor }} />
      </div>
    );
  }
  if (type === BlockType.LEAVES || type === BlockType.PINE_LEAVES || type === BlockType.PALM_LEAVES) {
    const spotColor = type === BlockType.PINE_LEAVES ? '#003300' : type === BlockType.PALM_LEAVES ? '#558B2F' : '#1B5E20';
    return (
      <div className={className} style={{ backgroundColor: BLOCK_COLORS[type] }}>
        <div className="absolute top-[10%] left-[10%] w-[25%] h-[25%]" style={{ backgroundColor: spotColor }} />
        <div className="absolute top-[20%] left-[60%] w-[25%] h-[25%]" style={{ backgroundColor: spotColor }} />
        <div className="absolute top-[60%] left-[30%] w-[25%] h-[25%]" style={{ backgroundColor: spotColor }} />
      </div>
    );
  }
  if (
    type === BlockType.MEAT ||
    type === BlockType.COOKED_MEAT ||
    type === BlockType.BEEF ||
    type === BlockType.COOKED_BEEF ||
    type === BlockType.PORK ||
    type === BlockType.COOKED_PORK ||
    type === BlockType.CHICKEN_MEAT ||
    type === BlockType.COOKED_CHICKEN_MEAT ||
    type === BlockType.FISH_MEAT ||
    type === BlockType.COOKED_FISH_MEAT
  ) {
    const isCooked = [
      BlockType.COOKED_MEAT,
      BlockType.COOKED_BEEF,
      BlockType.COOKED_PORK,
      BlockType.COOKED_CHICKEN_MEAT,
      BlockType.COOKED_FISH_MEAT,
    ].includes(type);
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-[80%] h-[50%] rounded-full relative" style={{ backgroundColor: BLOCK_COLORS[type] }}>
          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 ${isCooked ? 'bg-[#5D4037]' : 'bg-[#FFCDD2]'} rounded-full`}
          />
        </div>
      </div>
    );
  }
  if (type === BlockType.COAL) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-[60%] h-[60%] bg-[#212121] rounded-sm" style={{ clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)' }} />
      </div>
    );
  }
  if (type === BlockType.FURNACE) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-full h-full bg-[#9E9E9E] border-4 border-[#424242] flex items-center justify-center">
          <div className="w-[60%] h-[40%] bg-[#212121] mt-2" />
        </div>
      </div>
    );
  }
  if (type === BlockType.WORM) {
    return (
      <div className={`${className} flex items-center justify-center overflow-hidden`}>
        <div className="w-[80%] h-[20%] bg-[#FF8DA1] rounded-full animate-worm-wiggle" />
      </div>
    );
  }
  if (type === BlockType.TALL_GRASS || type === BlockType.FLOWER_BUD || type === BlockType.FLOWER_BLOOM) {
    return (
      <div className={`${className} flex items-end justify-center overflow-hidden bg-transparent relative`}>
        <div className="w-1 h-[80%] bg-[#4CAF50] mx-[1px] transform -skew-x-12" />
        <div className="w-1 h-[90%] bg-[#4CAF50] mx-[1px]" />
        <div className="w-1 h-[70%] bg-[#4CAF50] mx-[1px] transform skew-x-12" />
        {type === BlockType.FLOWER_BUD && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#8BC34A] rounded-full" />
        )}
        {type === BlockType.FLOWER_BLOOM && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 flex items-center justify-center">
            <div className="absolute w-3 h-3 bg-[#E91E63] rounded-full opacity-80" />
            <div className="absolute w-1.5 h-1.5 bg-[#FFEB3B] rounded-full z-10" />
          </div>
        )}
      </div>
    );
  }
  if (type === BlockType.STICK) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[80%] h-1.5 bg-[#8B5A2B] transform -rotate-45 rounded-full" />
      </div>
    );
  }
  if (type === BlockType.FANG) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[40%] h-[60%] bg-[#F5F5DC] relative" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}>
          <div className="absolute bottom-0 left-0 w-full h-[30%] bg-[#4CAF50]" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }} />
        </div>
      </div>
    );
  }
  if (type === BlockType.WOODEN_SWORD) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[60%] h-1 bg-[#8B5A2B] transform -rotate-45 relative">
          <div className="absolute w-4 h-1 bg-[#8B5A2B] left-1 top-0 transform rotate-90" />
        </div>
      </div>
    );
  }
  if (type === BlockType.COCOA_SWORD) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[68%] h-[3px] bg-[#4a3118] transform -rotate-45 relative">
          <div className="absolute inset-y-0 left-[20%] w-[58%] bg-[#8f6840]" />
          <div className="absolute w-4 h-[3px] bg-[#5d3c1f] left-[14%] top-0 transform rotate-90" />
          <div className="absolute w-3 h-[2px] bg-[#2d1b0e] right-0 top-[0.5px] rounded-sm" />
        </div>
      </div>
    );
  }
  if (type === BlockType.COCOA_AXE) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[70%] h-[70%] relative rotate-45">
          <div className="absolute left-1/2 top-1/4 bottom-0 w-[14%] -translate-x-1/2 bg-[#4a3118] rounded-sm" />
          <div className="absolute left-1/2 top-[26%] bottom-[4%] w-[8%] -translate-x-1/2 bg-[#8b5a2b] rounded-sm" />
          <div className="absolute left-[8%] top-[12%] w-[52%] h-[36%] bg-[#5a3920] rounded-sm" />
          <div className="absolute left-[14%] top-[18%] w-[40%] h-[22%] bg-[#8f6840] rounded-sm" />
        </div>
      </div>
    );
  }
  if (type === BlockType.COCOA_HAMMER) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[70%] h-[70%] relative rotate-45">
          <div className="absolute left-1/2 top-[28%] bottom-0 w-[14%] -translate-x-1/2 bg-[#4a3118] rounded-sm" />
          <div className="absolute left-1/2 top-[30%] bottom-[3%] w-[8%] -translate-x-1/2 bg-[#8b5a2b] rounded-sm" />
          <div className="absolute left-[16%] top-[8%] w-[68%] h-[26%] bg-[#5a3920] rounded-sm" />
          <div className="absolute left-[22%] top-[13%] w-[56%] h-[14%] bg-[#8f6840] rounded-sm" />
        </div>
      </div>
    );
  }
  if (type === BlockType.FANG_LANCE) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[80%] h-1 bg-[#8B5A2B] transform -rotate-45 relative">
          <div className="absolute w-4 h-4 bg-[#F5F5DC] right-[-4px] top-[-8px] transform rotate-45" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
        </div>
      </div>
    );
  }
  if (type === BlockType.CACTUS) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ backgroundColor: '#2E7D32' }}>
        <div className="w-1 h-1 bg-[#1B5E20] absolute top-1 left-1" />
        <div className="w-1 h-1 bg-[#1B5E20] absolute bottom-1 right-1" />
      </div>
    );
  }
  if (type === BlockType.WATER) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ backgroundColor: BLOCK_COLORS[BlockType.WATER] }}>
        <div className="w-2 h-px bg-white/30 absolute top-1 left-1" />
        <div className="w-2 h-px bg-white/30 absolute bottom-1 right-1" />
      </div>
    );
  }
  if (type === BlockType.MAGMA) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ backgroundColor: BLOCK_COLORS[BlockType.MAGMA] }}>
        <div className="w-2 h-2 bg-[#FFFF00] absolute top-1 left-1" />
        <div className="w-3 h-2 bg-[#FF8C00] absolute bottom-1 right-1" />
      </div>
    );
  }
  if (type === BlockType.OBSIDIAN) {
    return (
      <div className={`${className} flex items-center justify-center`} style={{ backgroundColor: BLOCK_COLORS[BlockType.OBSIDIAN] }}>
        <div className="w-[80%] h-[10%] bg-[#2A0845] absolute top-[20%] left-[10%]" />
        <div className="w-[80%] h-[10%] bg-[#2A0845] absolute top-[60%] left-[10%]" />
      </div>
    );
  }

  if (type === BlockType.IRON_INGOT || type === BlockType.GOLD_INGOT) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`w-[60%] h-[30%] ${type === BlockType.IRON_INGOT ? 'bg-[#E6C280]' : 'bg-[#FFD700]'} rounded-sm relative`}>
          <div className="absolute inset-x-0 top-0 h-1/3 bg-white/30" />
        </div>
      </div>
    );
  }
  if (type === BlockType.DIAMOND) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-[50%] h-[50%] bg-[#00E5FF] rotate-45 relative">
          <div className="absolute inset-x-0 top-0 h-1/2 bg-white/40" />
        </div>
      </div>
    );
  }
  if (type === BlockType.COCOA_PICKAXE) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-[80%] h-[80%] relative rotate-45">
          <div className="absolute left-1/2 top-1/4 bottom-0 w-[15%] -translate-x-1/2 bg-[#4a3118] rounded-sm" />
          <div className="absolute left-1/2 top-[28%] bottom-[4%] w-[9%] -translate-x-1/2 bg-[#8b5a2b] rounded-sm" />
          <div className="absolute top-0 left-0 right-0 h-[30%] rounded-sm bg-[#5a3920]" style={{ clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%, 80% 100%, 50% 40%, 20% 100%)' }} />
          <div className="absolute top-[4%] left-[12%] right-[12%] h-[18%] rounded-sm bg-[#8f6840]" style={{ clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%, 78% 100%, 50% 46%, 22% 100%)' }} />
        </div>
      </div>
    );
  }

  if (
    type === BlockType.WOODEN_PICKAXE ||
    type === BlockType.STONE_PICKAXE ||
    type === BlockType.IRON_PICKAXE ||
    type === BlockType.GOLD_PICKAXE ||
    type === BlockType.DIAMOND_PICKAXE
  ) {
    const color =
      type === BlockType.WOODEN_PICKAXE
        ? '#8B5A2B'
        : type === BlockType.STONE_PICKAXE
          ? '#9E9E9E'
          : type === BlockType.IRON_PICKAXE
            ? '#E6C280'
            : type === BlockType.GOLD_PICKAXE
              ? '#FFD700'
              : type === BlockType.DIAMOND_PICKAXE
                ? '#00E5FF'
                : '#8b5a2b';
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className="w-[80%] h-[80%] relative rotate-45">
          {/* Stick */}
          <div className="absolute left-1/2 top-1/4 bottom-0 w-[15%] -translate-x-1/2 bg-[#8B5A2B] rounded-sm" />
          {/* Head */}
          <div className="absolute top-0 left-0 right-0 h-[30%] rounded-sm" style={{ backgroundColor: color, clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%, 80% 100%, 50% 40%, 20% 100%)' }} />
        </div>
      </div>
    );
  }
  if (type === BlockType.COCOA_SPEAR) {
    return (
      <div className={`${className} flex items-center justify-center bg-transparent`}>
        <div className="w-[82%] h-[3px] bg-[#4a3118] transform -rotate-45 relative">
          <div className="absolute inset-y-0 left-[8%] right-[12%] bg-[#8b5a2b]" />
          <div className="absolute w-4 h-4 bg-[#5a3920] right-[-4px] top-[-8px] transform rotate-45" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
          <div className="absolute w-2 h-2 bg-[#a67c52] right-[1px] top-[-2px] transform rotate-45" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }} />
        </div>
      </div>
    );
  }

  return <div className={className} style={{ backgroundColor: BLOCK_COLORS[type] }} />;
};
