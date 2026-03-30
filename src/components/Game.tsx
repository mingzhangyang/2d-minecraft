import React, { useEffect, useRef, useState } from 'react';
import { Heart, Drumstick } from 'lucide-react';
import { soundEngine } from '../utils/SoundEngine';

const TILE_SIZE = 32;
const WORLD_WIDTH = 100000;
const WORLD_HEIGHT = 64;
const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const MOVE_SPEED = 4;
const REACH = TILE_SIZE * 5;

const STARS = Array.from({ length: 150 }).map(() => ({
  x: Math.random(),
  y: Math.random() * 0.7, // Top 70% of the screen
  size: Math.random() * 1.5 + 0.5,
  twinkleSpeed: Math.random() * 0.05 + 0.01
}));

enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  WOOD = 4,
  LEAVES = 5,
  PLANKS = 6,
  BRICKS = 7,
  APPLE = 8,
  COAL_ORE = 9,
  IRON_ORE = 10,
  GOLD_ORE = 11,
  DIAMOND_ORE = 12,
  WORM = 13,
  MEAT = 14,
  COAL = 15,
  FURNACE = 16,
  COOKED_MEAT = 17,
  TALL_GRASS = 18,
  SAND = 19,
  CACTUS = 20,
  SNOW_GRASS = 21,
  SNOW_DIRT = 22,
  STICK = 23,
  FANG = 24,
  WOODEN_SWORD = 25,
  FANG_LANCE = 26,
  WATER = 27,
  CORAL = 28,
  IRON_INGOT = 29,
  GOLD_INGOT = 30,
  DIAMOND = 31,
  WOODEN_PICKAXE = 32,
  STONE_PICKAXE = 33,
  IRON_PICKAXE = 34,
  GOLD_PICKAXE = 35,
  DIAMOND_PICKAXE = 36,
  FLOWER_BUD = 37,
  FLOWER_BLOOM = 38,
  PINE_WOOD = 39,
  PINE_LEAVES = 40,
  PALM_WOOD = 41,
  PALM_LEAVES = 42,
  MAGMA = 43,
  OBSIDIAN = 44,
  MUD = 45,
  JUNGLE_WOOD = 46,
  JUNGLE_LEAVES = 47,
  RED_SAND = 48,
  TERRACOTTA = 49,
  BEEF = 50,
  COOKED_BEEF = 51,
  PORK = 52,
  COOKED_PORK = 53,
  CHICKEN_MEAT = 54,
  COOKED_CHICKEN_MEAT = 55,
  FISH_MEAT = 56,
  COOKED_FISH_MEAT = 57,
  COCOA_PORTAL = 58,
  COCOA_HELMET = 59,
  COCOA_CHESTPLATE = 60,
  COCOA_LEGGINGS = 61,
  COCOA_BOOTS = 62,
  COCOA_FUR = 63,
  GOLD_BLOCK = 64,
  DIAMOND_BLOCK = 65
}

const BLOCK_COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: 'transparent',
  [BlockType.DIRT]: '#8B4513',
  [BlockType.GRASS]: '#4CAF50',
  [BlockType.STONE]: '#9E9E9E',
  [BlockType.WOOD]: '#5D4037',
  [BlockType.LEAVES]: '#2E7D32',
  [BlockType.PLANKS]: '#D7CCC8',
  [BlockType.BRICKS]: '#D32F2F',
  [BlockType.APPLE]: '#E53935',
  [BlockType.COAL_ORE]: '#1a1a1a',
  [BlockType.IRON_ORE]: '#E6C280',
  [BlockType.GOLD_ORE]: '#FFD700',
  [BlockType.DIAMOND_ORE]: '#00E5FF',
  [BlockType.WORM]: '#FF8DA1',
  [BlockType.MEAT]: '#E57373',
  [BlockType.COAL]: '#212121',
  [BlockType.FURNACE]: '#616161',
  [BlockType.COOKED_MEAT]: '#795548',
  [BlockType.TALL_GRASS]: '#4CAF50',
  [BlockType.SAND]: '#EEDD82',
  [BlockType.SNOW_GRASS]: '#FFFFFF',
  [BlockType.SNOW_DIRT]: '#8B4513',
  [BlockType.STICK]: '#8B5A2B',
  [BlockType.FANG]: '#F5F5DC',
  [BlockType.WOODEN_SWORD]: '#8B5A2B',
  [BlockType.FANG_LANCE]: '#F5F5DC',
  [BlockType.CACTUS]: '#2E7D32',
  [BlockType.WATER]: 'rgba(33, 150, 243, 0.6)',
  [BlockType.CORAL]: '#FF7F50',
  [BlockType.IRON_INGOT]: 'transparent',
  [BlockType.GOLD_INGOT]: 'transparent',
  [BlockType.DIAMOND]: 'transparent',
  [BlockType.WOODEN_PICKAXE]: 'transparent',
  [BlockType.STONE_PICKAXE]: 'transparent',
  [BlockType.IRON_PICKAXE]: 'transparent',
  [BlockType.GOLD_PICKAXE]: 'transparent',
  [BlockType.DIAMOND_PICKAXE]: 'transparent',
  [BlockType.FLOWER_BUD]: 'transparent',
  [BlockType.FLOWER_BLOOM]: 'transparent',
  [BlockType.PINE_WOOD]: '#4E342E',
  [BlockType.PINE_LEAVES]: '#1B5E20',
  [BlockType.PALM_WOOD]: '#8D6E63',
  [BlockType.PALM_LEAVES]: '#689F38',
  [BlockType.MAGMA]: '#FF4500',
  [BlockType.OBSIDIAN]: '#110022',
  [BlockType.MUD]: '#3e2723',
  [BlockType.JUNGLE_WOOD]: '#3e2723',
  [BlockType.JUNGLE_LEAVES]: '#33691e',
  [BlockType.RED_SAND]: '#d84315',
  [BlockType.TERRACOTTA]: '#bf360c',
  [BlockType.BEEF]: '#b71c1c',
  [BlockType.COOKED_BEEF]: '#4e342e',
  [BlockType.PORK]: '#f48fb1',
  [BlockType.COOKED_PORK]: '#d81b60',
  [BlockType.CHICKEN_MEAT]: '#ffcdd2',
  [BlockType.COOKED_CHICKEN_MEAT]: '#d84315',
  [BlockType.FISH_MEAT]: '#e0f7fa',
  [BlockType.COOKED_FISH_MEAT]: '#006064',
  [BlockType.COCOA_PORTAL]: '#5d4037',
  [BlockType.COCOA_HELMET]: '#654321',
  [BlockType.COCOA_CHESTPLATE]: '#654321',
  [BlockType.COCOA_LEGGINGS]: '#654321',
  [BlockType.COCOA_BOOTS]: '#654321',
  [BlockType.COCOA_FUR]: '#4a3118',
  [BlockType.GOLD_BLOCK]: '#FBC02D',
  [BlockType.DIAMOND_BLOCK]: '#18FFFF'
};

const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, type: BlockType, size: number = TILE_SIZE) => {
  if (type === BlockType.AIR) return;

  ctx.fillStyle = BLOCK_COLORS[type];
  
  if (type === BlockType.DIRT || type === BlockType.GRASS || type === BlockType.STONE || type === BlockType.SAND || type === BlockType.SNOW_DIRT || type === BlockType.SNOW_GRASS || type === BlockType.WOOD || type === BlockType.PINE_WOOD || type === BlockType.PALM_WOOD || type === BlockType.PLANKS || type === BlockType.COBBLESTONE || type === BlockType.COAL_ORE || type === BlockType.IRON_ORE || type === BlockType.GOLD_ORE || type === BlockType.DIAMOND_ORE || type === BlockType.OBSIDIAN || type === BlockType.MAGMA || type === BlockType.GOLD_BLOCK || type === BlockType.DIAMOND_BLOCK) {
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
    ctx.fillRect(x + s*2, y + s*2, s, s);
    ctx.fillRect(x + s*5, y + s*3, s*2, s);
    ctx.fillRect(x + s*1, y + s*6, s, s);
    ctx.fillRect(x + s*6, y + s*6, s, s);
    
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(x + s*4, y + s*1, s, s);
    ctx.fillRect(x + s*1, y + s*4, s*2, s);
    ctx.fillRect(x + s*5, y + s*5, s, s);
    
    if (type === BlockType.GRASS) {
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y, size, s*2);
      ctx.fillRect(x + s*1, y + s*2, s, s);
      ctx.fillRect(x + s*3, y + s*2, s, s);
      ctx.fillRect(x + s*6, y + s*2, s, s);
    } else if (type === BlockType.SNOW_GRASS) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x, y, size, s*2);
      ctx.fillRect(x + s*1, y + s*2, s, s);
      ctx.fillRect(x + s*3, y + s*2, s, s);
      ctx.fillRect(x + s*6, y + s*2, s, s);
    } else if (type === BlockType.COAL_ORE || type === BlockType.IRON_ORE || type === BlockType.GOLD_ORE || type === BlockType.DIAMOND_ORE) {
      ctx.fillStyle = type === BlockType.COAL_ORE ? '#000000' : type === BlockType.IRON_ORE ? '#E6C280' : type === BlockType.GOLD_ORE ? '#FFD700' : '#00E5FF';
      ctx.fillRect(x + s*2, y + s*2, s*2, s*2);
      ctx.fillRect(x + s*5, y + s*5, s*2, s*2);
      ctx.fillRect(x + s*1, y + s*5, s, s);
      ctx.fillRect(x + s*6, y + s*2, s, s);
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

  if (type === BlockType.MEAT || type === BlockType.COOKED_MEAT || type === BlockType.BEEF || type === BlockType.COOKED_BEEF || type === BlockType.PORK || type === BlockType.COOKED_PORK || type === BlockType.CHICKEN_MEAT || type === BlockType.COOKED_CHICKEN_MEAT || type === BlockType.FISH_MEAT || type === BlockType.COOKED_FISH_MEAT) {
    const isCooked = [BlockType.COOKED_MEAT, BlockType.COOKED_BEEF, BlockType.COOKED_PORK, BlockType.COOKED_CHICKEN_MEAT, BlockType.COOKED_FISH_MEAT].includes(type);
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

  if (type === BlockType.TALL_GRASS || type === BlockType.FLOWER_BUD || type === BlockType.FLOWER_BLOOM) {
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
  if (type === BlockType.WOODEN_PICKAXE || type === BlockType.STONE_PICKAXE || type === BlockType.IRON_PICKAXE || type === BlockType.GOLD_PICKAXE || type === BlockType.DIAMOND_PICKAXE) {
    const color = type === BlockType.WOODEN_PICKAXE ? '#8B5A2B' :
                  type === BlockType.STONE_PICKAXE ? '#9E9E9E' :
                  type === BlockType.IRON_PICKAXE ? '#E6C280' :
                  type === BlockType.GOLD_PICKAXE ? '#FFD700' : '#00E5FF';
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

  ctx.fillRect(x, y, size, size);
  
  // Textures
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  if (type === BlockType.WOOD || type === BlockType.PINE_WOOD || type === BlockType.PALM_WOOD) {
    ctx.fillStyle = type === BlockType.PINE_WOOD ? '#3E2723' : type === BlockType.PALM_WOOD ? '#795548' : '#4E342E';
    ctx.fillRect(x + size*0.1, y, size*0.1, size);
    ctx.fillRect(x + size*0.4, y, size*0.1, size);
    ctx.fillRect(x + size*0.7, y, size*0.1, size);
  } else if (type === BlockType.LEAVES || type === BlockType.PINE_LEAVES || type === BlockType.PALM_LEAVES) {
    ctx.fillStyle = type === BlockType.PINE_LEAVES ? '#003300' : type === BlockType.PALM_LEAVES ? '#558B2F' : '#1B5E20';
    ctx.fillRect(x + size*0.1, y + size*0.1, size*0.25, size*0.25);
    ctx.fillRect(x + size*0.6, y + size*0.2, size*0.25, size*0.25);
    ctx.fillRect(x + size*0.3, y + size*0.6, size*0.25, size*0.25);
  } else if (type === BlockType.PLANKS) {
    ctx.fillStyle = '#BCAAA4';
    ctx.fillRect(x, y + size*0.25, size, size*0.05);
    ctx.fillRect(x, y + size*0.55, size, size*0.05);
    ctx.fillRect(x, y + size*0.85, size, size*0.05);
    ctx.fillRect(x + size*0.2, y, size*0.05, size*0.25);
    ctx.fillRect(x + size*0.7, y + size*0.3, size*0.05, size*0.25);
    ctx.fillRect(x + size*0.4, y + size*0.6, size*0.05, size*0.25);
  } else if (type === BlockType.BRICKS) {
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(x, y + size*0.45, size, size*0.05);
    ctx.fillRect(x + size*0.45, y, size*0.05, size*0.45);
    ctx.fillRect(x + size*0.2, y + size*0.5, size*0.05, size*0.5);
    ctx.fillRect(x + size*0.7, y + size*0.5, size*0.05, size*0.5);
  } else if (type === BlockType.COAL_ORE || type === BlockType.IRON_ORE || type === BlockType.GOLD_ORE || type === BlockType.DIAMOND_ORE) {
    // Draw stone base
    ctx.fillStyle = BLOCK_COLORS[BlockType.STONE];
    ctx.fillRect(x, y, size, size);
    
    // Draw stone texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(x + size*0.1, y + size*0.1, size*0.3, size*0.3);
    ctx.fillRect(x + size*0.6, y + size*0.6, size*0.3, size*0.3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(x + size*0.5, y + size*0.1, size*0.2, size*0.2);

    // Draw ore specs
    ctx.fillStyle = BLOCK_COLORS[type];
    const specSize = size * 0.15;
    ctx.fillRect(x + size * 0.2, y + size * 0.2, specSize, specSize);
    ctx.fillRect(x + size * 0.65, y + size * 0.3, specSize, specSize);
    ctx.fillRect(x + size * 0.3, y + size * 0.65, specSize, specSize);
    ctx.fillRect(x + size * 0.7, y + size * 0.7, specSize, specSize);
    ctx.fillRect(x + size * 0.45, y + size * 0.45, specSize * 1.2, specSize * 1.2);
  } else if (type === BlockType.MAGMA) {
    ctx.fillStyle = '#FF8C00'; // Orange highlights
    ctx.fillRect(x + size * 0.2, y + size * 0.2, size * 0.3, size * 0.2);
    ctx.fillRect(x + size * 0.6, y + size * 0.5, size * 0.2, size * 0.3);
    ctx.fillStyle = '#FFFF00'; // Yellow bright spots
    ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.1, size * 0.1);
    ctx.fillRect(x + size * 0.7, y + size * 0.6, size * 0.1, size * 0.1);
  } else if (type === BlockType.OBSIDIAN) {
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

const INVENTORY_BLOCKS = [
  BlockType.DIRT,
  BlockType.GRASS,
  BlockType.STONE,
  BlockType.WOOD,
  BlockType.LEAVES,
  BlockType.PLANKS,
  BlockType.BRICKS,
  BlockType.APPLE,
  BlockType.COAL_ORE,
  BlockType.IRON_ORE,
  BlockType.GOLD_ORE,
  BlockType.DIAMOND_ORE,
  BlockType.WORM,
  BlockType.MEAT,
  BlockType.COAL,
  BlockType.FURNACE,
  BlockType.COOKED_MEAT,
  BlockType.BEEF,
  BlockType.COOKED_BEEF,
  BlockType.PORK,
  BlockType.COOKED_PORK,
  BlockType.CHICKEN_MEAT,
  BlockType.COOKED_CHICKEN_MEAT,
  BlockType.FISH_MEAT,
  BlockType.COOKED_FISH_MEAT,
  BlockType.COCOA_PORTAL,
  BlockType.COCOA_HELMET,
  BlockType.COCOA_CHESTPLATE,
  BlockType.COCOA_LEGGINGS,
  BlockType.COCOA_BOOTS,
  BlockType.COCOA_FUR,
  BlockType.TALL_GRASS,
  BlockType.STICK,
  BlockType.FANG,
  BlockType.WOODEN_SWORD,
  BlockType.FANG_LANCE,
  BlockType.CACTUS,
  BlockType.WATER,
  BlockType.CORAL,
  BlockType.IRON_INGOT,
  BlockType.GOLD_INGOT,
  BlockType.DIAMOND,
  BlockType.WOODEN_PICKAXE,
  BlockType.STONE_PICKAXE,
  BlockType.IRON_PICKAXE,
  BlockType.GOLD_PICKAXE,
  BlockType.DIAMOND_PICKAXE,
  BlockType.FLOWER_BUD,
  BlockType.FLOWER_BLOOM,
  BlockType.PINE_WOOD,
  BlockType.PINE_LEAVES,
  BlockType.PALM_WOOD,
  BlockType.PALM_LEAVES,
  BlockType.MAGMA,
  BlockType.OBSIDIAN,
  BlockType.SNOW_DIRT,
  BlockType.SNOW_GRASS
];

const MAX_DURABILITY: Record<number, number> = {
  [BlockType.WOODEN_PICKAXE]: 60,
  [BlockType.STONE_PICKAXE]: 132,
  [BlockType.IRON_PICKAXE]: 251,
  [BlockType.GOLD_PICKAXE]: 33,
  [BlockType.DIAMOND_PICKAXE]: 1562,
  [BlockType.WOODEN_SWORD]: 60,
  [BlockType.FANG_LANCE]: 132,
};

const getMaxStack = (type: BlockType): number => {
  if (MAX_DURABILITY[type] !== undefined) return 1;
  if ([BlockType.COCOA_HELMET, BlockType.COCOA_CHESTPLATE, BlockType.COCOA_LEGGINGS, BlockType.COCOA_BOOTS].includes(type)) return 1;
  return 64;
};

interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  grounded: boolean;
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  exhaustion: number;
  inventory: Record<number, number>;
  durability: Record<number, number>;
  fallStartY?: number;
  hurtTime: number;
  poisonTimer: number;
  poisonTick: number;
  isFlying?: boolean;
  breath?: number;
  maxBreath?: number;
  attackTimer?: number;
}

interface DroppedItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BlockType;
  id: number;
  pickupTimer?: number;
  sunExposureTimer?: number;
}

enum AnimalType {
  PIG = 'PIG',
  COW = 'COW',
  CHICKEN = 'CHICKEN',
  SNAKE = 'SNAKE',
  STRIPED_SNAKE = 'STRIPED_SNAKE',
  TIGER_SNAKE = 'TIGER_SNAKE',
  ANT = 'ANT',
  BIRD = 'BIRD',
  FISH = 'FISH',
  ORCA = 'ORCA',
  DOLPHIN = 'DOLPHIN',
  SHARK = 'SHARK',
  LEOPARD = 'LEOPARD',
  JAGUAR = 'JAGUAR',
  BLACK_JAGUAR = 'BLACK_JAGUAR',
  COCOA_CAT = 'COCOA_CAT'
}

enum Weather {
  CLEAR = 'CLEAR',
  RAIN = 'RAIN',
  SNOW = 'SNOW',
  STORM = 'STORM'
}

interface Animal {
  id: number;
  type: AnimalType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  facing: -1 | 1;
  state: 'idle' | 'walking' | 'launching' | 'attacking';
  stateTime: number;
  health: number;
  maxHealth?: number;
  hurtTime: number;
  attackCooldown?: number;
  launchCooldown?: number;
  aggro?: boolean;
  poisonTimer?: number;
  poisonTick?: number;
  regenTimer?: number;
  tamed?: boolean;
  attackTimer?: number;
  attackPattern?: 'normal' | 'lunge' | 'charge';
  chargeTimer?: number;
  fallStartY?: number;
}

interface FurnaceData {
  input: { type: BlockType, count: number } | null;
  fuel: { type: BlockType, count: number } | null;
  output: { type: BlockType, count: number } | null;
  progress: number;
  fuelLeft: number;
  maxFuel: number;
}

interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SPAWN_X = 50;

const getSurfaceY = (x: number) => {
  if (x >= 89000) return Math.floor(WORLD_HEIGHT / 2);
  const biomeIndex = Math.floor(x / 100) % 10;
  if (biomeIndex === 3) {
    return Math.floor(WORLD_HEIGHT / 2); // Flat water surface for Ocean
  }
  let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
  const biomePos = (x % 100) / 100;
  const mountainHeight = Math.sin(biomePos * Math.PI);

  if (biomeIndex === 4) { // Mountain
    heightOffset -= mountainHeight * 25;
  } else if (biomeIndex === 5) { // Snowy Mountain
    heightOffset -= mountainHeight * 15;
  } else if (biomeIndex === 6) { // Volcano
    heightOffset -= mountainHeight * 20;
    if (biomePos > 0.4 && biomePos < 0.6) {
      heightOffset += 5; // Crater
    }
  } else if (biomeIndex === 7) { // Swamp
    heightOffset += 2; // Slightly lower
  } else if (biomeIndex === 9) { // Badlands
    heightOffset -= mountainHeight * 15; // Plateaus
  }
  
  let actualSurfaceY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);
  if (biomeIndex === 7) {
    actualSurfaceY += 1; // Shallow water for swamp
  }
  return actualSurfaceY;
};

const getValidSpawnX = (type: AnimalType, world: BlockType[][], playerX?: number): number | null => {
  for (let attempt = 0; attempt < 50; attempt++) {
    let x;
    if (playerX !== undefined) {
      const minOffset = 800 / TILE_SIZE;
      const maxOffset = 2500 / TILE_SIZE;
      const offset = (Math.random() * (maxOffset - minOffset) + minOffset) * (Math.random() > 0.5 ? 1 : -1);
      x = Math.floor(playerX / TILE_SIZE + offset);
      if (x < 0 || x >= WORLD_WIDTH) continue;
    } else {
      x = Math.floor(Math.random() * WORLD_WIDTH);
    }
    
    if (x >= 89000 && type !== AnimalType.COCOA_CAT) continue;

    const biomeIndex = Math.floor(x / 100) % 10;
    let validBiome = false;
    
    if (type === AnimalType.FISH || type === AnimalType.ORCA || type === AnimalType.DOLPHIN || type === AnimalType.SHARK) {
      validBiome = biomeIndex === 3 || biomeIndex === 7; // Ocean, Swamp
    } else if (type === AnimalType.PIG || type === AnimalType.COW || type === AnimalType.CHICKEN) {
      validBiome = biomeIndex === 0 || biomeIndex === 2 || biomeIndex === 4 || biomeIndex === 5 || biomeIndex === 9;
    } else if (type === AnimalType.ANT) {
      validBiome = biomeIndex === 0 || biomeIndex === 1 || biomeIndex === 4 || biomeIndex === 6 || biomeIndex === 8 || biomeIndex === 9;
    } else if (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE || type === AnimalType.TIGER_SNAKE) {
      validBiome = biomeIndex === 0 || biomeIndex === 1 || biomeIndex === 4 || biomeIndex === 6 || biomeIndex === 7 || biomeIndex === 8 || biomeIndex === 9;
    } else if (type === AnimalType.BIRD) {
      validBiome = biomeIndex === 0 || biomeIndex === 2 || biomeIndex === 4 || biomeIndex === 5 || biomeIndex === 8;
    } else if (type === AnimalType.LEOPARD) {
      validBiome = biomeIndex === 0 || biomeIndex === 4 || biomeIndex === 5 || biomeIndex === 8;
    } else if (type === AnimalType.JAGUAR || type === AnimalType.BLACK_JAGUAR) {
      validBiome = biomeIndex === 0 || biomeIndex === 6 || biomeIndex === 8;
    } else if (type === AnimalType.COCOA_CAT) {
      validBiome = false; // Only spawned via portal
    }

    if (!validBiome) continue;

    if (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE || type === AnimalType.TIGER_SNAKE) {
      const testY = getSurfaceY(x) - 1;
      let hasTree = false;
      for (let y = 0; y <= testY; y++) {
        const block = world[x] && world[x][y];
        if (block === BlockType.WOOD || block === BlockType.PINE_WOOD || block === BlockType.PALM_WOOD || block === BlockType.LEAVES || block === BlockType.PINE_LEAVES || block === BlockType.PALM_LEAVES) {
          hasTree = true;
          break;
        }
      }
      if (hasTree || (world[x] && (world[x][testY] === BlockType.TALL_GRASS || world[x][testY] === BlockType.FLOWER_BUD || world[x][testY] === BlockType.FLOWER_BLOOM))) {
        return x;
      }
      if (attempt > 20) return x;
    } else {
      return x;
    }
  }
  return null;
};

const generateWorld = (): BlockType[][] => {
  const world: BlockType[][] = Array(WORLD_WIDTH)
    .fill(0)
    .map(() => Array(WORLD_HEIGHT).fill(BlockType.AIR));

  let grassPatch = 0;

  const hasPortal = true;

  for (let x = 0; x < WORLD_WIDTH; x++) {
    // Determine biome based on x coordinate
    // Biome size: 100 blocks
    const biomeIndex = Math.floor(x / 100) % 10;
    
    let heightOffset = Math.sin(x / 8) * 4 + Math.sin(x / 3) * 2;
    const biomePos = (x % 100) / 100;
    const mountainHeight = Math.sin(biomePos * Math.PI);

    if (biomeIndex === 4) { // Mountain
      heightOffset -= mountainHeight * 25;
    } else if (biomeIndex === 5) { // Snowy Mountain
      heightOffset -= mountainHeight * 15;
    } else if (biomeIndex === 6) { // Volcano
      heightOffset -= mountainHeight * 20;
      if (biomePos > 0.4 && biomePos < 0.6) {
        heightOffset += 5; // Crater
      }
    } else if (biomeIndex === 7) { // Swamp
      heightOffset += 2; // Slightly lower
    } else if (biomeIndex === 9) { // Badlands
      heightOffset -= mountainHeight * 15; // Plateaus
    }

    const terrainY = Math.floor(WORLD_HEIGHT / 2 + heightOffset);
    
    let topBlock = BlockType.GRASS;
    let subBlock = BlockType.DIRT;
    
    if (biomeIndex === 1) {
      // Desert
      topBlock = BlockType.SAND;
      subBlock = BlockType.SAND;
    } else if (biomeIndex === 2) {
      // Snow
      topBlock = BlockType.SNOW_GRASS;
      subBlock = BlockType.SNOW_DIRT;
    } else if (biomeIndex === 3) {
      // Ocean
      topBlock = BlockType.SAND;
      subBlock = BlockType.SAND;
    } else if (biomeIndex === 4) {
      // Mountain
      topBlock = BlockType.STONE;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === 5) {
      // Snowy Mountain
      topBlock = BlockType.SNOW_GRASS;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === 6) {
      // Volcano
      topBlock = BlockType.OBSIDIAN;
      subBlock = BlockType.STONE;
    } else if (biomeIndex === 7) {
      // Swamp
      topBlock = BlockType.MUD;
      subBlock = BlockType.DIRT;
    } else if (biomeIndex === 8) {
      // Jungle
      topBlock = BlockType.GRASS;
      subBlock = BlockType.DIRT;
    } else if (biomeIndex === 9) {
      // Badlands
      topBlock = BlockType.RED_SAND;
      subBlock = BlockType.TERRACOTTA;
    }

    // Adjust surfaceY for ocean and swamp
    let actualSurfaceY = terrainY;
    if (biomeIndex === 3) {
      actualSurfaceY += 8; // Deeper surface for ocean
    } else if (biomeIndex === 7) {
      actualSurfaceY += 1; // Shallow water for swamp
    }

    if (x >= 89000) {
      topBlock = BlockType.COCOA_FUR;
      subBlock = BlockType.DIRT;
      actualSurfaceY = Math.floor(WORLD_HEIGHT / 2);
    }

    const WATER_LEVEL = Math.floor(WORLD_HEIGHT / 2);

    for (let y = 0; y < WORLD_HEIGHT; y++) {
      if (x < 89000 && ((biomeIndex === 3 && y >= WATER_LEVEL && y < actualSurfaceY) || (biomeIndex === 7 && y >= WATER_LEVEL + 2 && y < actualSurfaceY))) {
        world[x][y] = BlockType.WATER;
      } else if (y === actualSurfaceY) {
        if (biomeIndex === 6 && biomePos > 0.45 && biomePos < 0.55) {
          world[x][y] = BlockType.MAGMA;
        } else {
          world[x][y] = topBlock;
        }
      } else if (y > actualSurfaceY && y < actualSurfaceY + 4) {
        if (biomeIndex === 6 && biomePos > 0.4 && biomePos < 0.6) {
          world[x][y] = BlockType.MAGMA;
        } else {
          world[x][y] = subBlock;
        }
      } else if (y >= actualSurfaceY + 4) {
        world[x][y] = BlockType.STONE;
        const depth = y - (actualSurfaceY + 4);
        const rand = Math.random();
        if (biomeIndex === 6 && biomePos > 0.45 && biomePos < 0.55) {
          world[x][y] = BlockType.MAGMA;
        } else if (depth > 20 && rand < 0.005) {
          world[x][y] = BlockType.DIAMOND_ORE;
        } else if (depth > 10 && rand < 0.015) {
          world[x][y] = BlockType.GOLD_ORE;
        } else if (depth > 5 && rand < 0.03) {
          world[x][y] = BlockType.IRON_ORE;
        } else if (rand < 0.05) {
          world[x][y] = BlockType.COAL_ORE;
        }
      }
    }

    const isPortalLocation = x === 1000 || x === 2000 || x === 3000 || x === 89995;

    if (hasPortal && isPortalLocation) {
      const portalX = x;
      const portalY = actualSurfaceY - 1;

      for (let px = portalX - 1; px <= portalX + 2; px++) {
        for (let py = portalY - 5; py <= portalY; py++) {
          if (px >= 0 && px < WORLD_WIDTH && py >= 0 && py < WORLD_HEIGHT) {
            if (px === portalX - 1 || px === portalX + 2 || py === portalY || py === portalY - 5) {
              world[px][py] = BlockType.COCOA_FUR;
            } else {
              world[px][py] = BlockType.COCOA_PORTAL;
            }
          }
        }
      }
    }

    // Generate surface features based on biome
    if (x < 89000 && (biomeIndex === 0 || biomeIndex === 2 || biomeIndex === 1 || biomeIndex === 3 || biomeIndex === 4 || biomeIndex === 5 || biomeIndex === 7 || biomeIndex === 8)) {
      // Trees in Forest, Snow, Desert (oasis), Ocean (islands), Swamp, Jungle
      let treeChance = 0;
      if (biomeIndex === 0) treeChance = 0.08; // Forest: Oak
      else if (biomeIndex === 2 || biomeIndex === 5) treeChance = 0.03; // Snow: Pine
      else if (biomeIndex === 1) treeChance = 0.01; // Desert: Palm (rare oasis)
      else if (biomeIndex === 3) treeChance = 0.02; // Ocean: Palm (islands)
      else if (biomeIndex === 4) treeChance = 0.04; // Mountain: Oak/Pine mix
      else if (biomeIndex === 7) treeChance = 0.06; // Swamp: Willow
      else if (biomeIndex === 8) treeChance = 0.15; // Jungle: Dense

      // Only spawn trees on solid ground (not water)
      const isNearPortal = Math.abs(x - 1000) <= 5 || Math.abs(x - 2000) <= 5 || Math.abs(x - 3000) <= 5 || Math.abs(x - 89995) <= 5;
      if (!isNearPortal && world[x][actualSurfaceY] !== BlockType.WATER && Math.random() < treeChance && x > 2 && x < WORLD_WIDTH - 2) {
        if (biomeIndex === 0 || biomeIndex === 4 || biomeIndex === 7) {
          // Oak / Willow Tree
          const treeHeight = Math.floor(Math.random() * 3) + 3;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = biomeIndex === 7 ? BlockType.JUNGLE_WOOD : BlockType.WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          const leaf = biomeIndex === 7 ? BlockType.JUNGLE_LEAVES : BlockType.LEAVES;
          world[x][topY] = leaf;
          world[x - 1][topY] = leaf;
          world[x + 1][topY] = leaf;
          world[x][topY - 1] = leaf;
          world[x - 1][topY + 1] = leaf;
          world[x + 1][topY + 1] = leaf;
        } else if (biomeIndex === 2 || biomeIndex === 5) {
          // Pine Tree
          const treeHeight = Math.floor(Math.random() * 4) + 4;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = BlockType.PINE_WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          world[x][topY] = BlockType.PINE_LEAVES;
          world[x][topY - 1] = BlockType.PINE_LEAVES;
          world[x - 1][topY + 1] = BlockType.PINE_LEAVES;
          world[x + 1][topY + 1] = BlockType.PINE_LEAVES;
          world[x - 1][topY + 2] = BlockType.PINE_LEAVES;
          world[x + 1][topY + 2] = BlockType.PINE_LEAVES;
          world[x - 2][topY + 2] = BlockType.PINE_LEAVES;
          world[x + 2][topY + 2] = BlockType.PINE_LEAVES;
        } else if (biomeIndex === 1 || biomeIndex === 3) {
          // Palm Tree
          const treeHeight = Math.floor(Math.random() * 3) + 4;
          for (let i = 1; i <= treeHeight; i++) {
            // Slight curve
            const offsetX = i > 3 ? 1 : 0;
            world[x + offsetX][actualSurfaceY - i] = BlockType.PALM_WOOD;
          }
          const topX = x + (treeHeight > 3 ? 1 : 0);
          const topY = actualSurfaceY - treeHeight;
          world[topX][topY] = BlockType.PALM_LEAVES;
          world[topX - 1][topY] = BlockType.PALM_LEAVES;
          world[topX + 1][topY] = BlockType.PALM_LEAVES;
          world[topX - 2][topY + 1] = BlockType.PALM_LEAVES;
          world[topX + 2][topY + 1] = BlockType.PALM_LEAVES;
          world[topX][topY - 1] = BlockType.PALM_LEAVES;
        } else if (biomeIndex === 8) {
          // Jungle Tree
          const treeHeight = Math.floor(Math.random() * 5) + 5;
          for (let i = 1; i <= treeHeight; i++) {
            world[x][actualSurfaceY - i] = BlockType.JUNGLE_WOOD;
          }
          const topY = actualSurfaceY - treeHeight;
          world[x][topY] = BlockType.JUNGLE_LEAVES;
          world[x - 1][topY] = BlockType.JUNGLE_LEAVES;
          world[x + 1][topY] = BlockType.JUNGLE_LEAVES;
          world[x - 2][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x + 2][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x - 1][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x + 1][topY + 1] = BlockType.JUNGLE_LEAVES;
          world[x][topY - 1] = BlockType.JUNGLE_LEAVES;
          world[x][topY - 2] = BlockType.JUNGLE_LEAVES;
        }
      } else if (biomeIndex === 0 || biomeIndex === 8) {
        // Generate tall grass in forest and jungle
        if (Math.random() < (biomeIndex === 8 ? 0.2 : 0.05)) {
          grassPatch = Math.floor(Math.random() * 5) + 3; // 3 to 7 blocks wide
        }
        if (grassPatch > 0 && world[x][actualSurfaceY - 1] === BlockType.AIR) {
          if (Math.random() < 0.1) {
            world[x][actualSurfaceY - 1] = BlockType.FLOWER_BUD;
          } else {
            world[x][actualSurfaceY - 1] = BlockType.TALL_GRASS;
          }
          grassPatch--;
        }
      }
    } else if (biomeIndex === 1 || biomeIndex === 9) {
      // Cactus in Desert and Badlands
      if (Math.random() < 0.05 && x > 2 && x < WORLD_WIDTH - 2) {
        const cactusHeight = Math.floor(Math.random() * 3) + 2;
        for (let i = 1; i <= cactusHeight; i++) {
          world[x][actualSurfaceY - i] = BlockType.CACTUS;
        }
      }
    } else if (biomeIndex === 3) {
      // Coral in Ocean
      if (Math.random() < 0.2) {
        world[x][actualSurfaceY - 1] = BlockType.CORAL;
      }
    }
  }

  // Generate Cocoa Castle
  const castleStartX = 90030;
  const castleWidth = 80;
  const castleHeight = 35;
  const castleY = Math.floor(WORLD_HEIGHT / 2);

  for (let cx = castleStartX; cx < castleStartX + castleWidth; cx++) {
    for (let cy = castleY - castleHeight - 1; cy <= castleY; cy++) {
      if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
        const isTower = cx < castleStartX + 8 || cx >= castleStartX + castleWidth - 8;
        const wallHeight = isTower ? castleHeight : castleHeight - 10;
        
        if (cy > castleY - wallHeight - 1) {
          // Battlements
          if (cy === castleY - wallHeight - 1) {
            if (cx % 2 === 0) world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Walls
          else if (cx === castleStartX || cx === castleStartX + castleWidth - 1 || 
                   cx === castleStartX + 7 || cx === castleStartX + castleWidth - 8) {
            world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Floor and Ceiling
          else if (cy === castleY || cy === castleY - wallHeight) {
            world[cx][cy] = BlockType.OBSIDIAN;
          }
          // Inside
          else {
            world[cx][cy] = BlockType.AIR;
          }
        }
      }
    }
  }
  
  // Doorways
  for (let cy = castleY - 6; cy <= castleY; cy++) {
    world[castleStartX][cy] = BlockType.AIR;
    world[castleStartX + 7][cy] = BlockType.AIR;
    world[castleStartX + castleWidth - 8][cy] = BlockType.AIR;
    world[castleStartX + castleWidth - 1][cy] = BlockType.AIR;
  }

  // Red Carpet
  for (let cx = castleStartX + 1; cx < castleStartX + castleWidth - 1; cx++) {
    if (world[cx][castleY] === BlockType.OBSIDIAN && cx > castleStartX + 7 && cx < castleStartX + castleWidth - 8) {
      world[cx][castleY - 1] = BlockType.TERRACOTTA;
    }
  }

  // Throne
  const throneCenterX = castleStartX + Math.floor(castleWidth / 2);
  const throneBaseY = castleY - 1;
  
  // Throne Base (Gold)
  for (let i = -3; i <= 3; i++) {
    world[throneCenterX + i][throneBaseY] = BlockType.GOLD_BLOCK;
  }
  for (let i = -2; i <= 2; i++) {
    world[throneCenterX + i][throneBaseY - 1] = BlockType.GOLD_BLOCK;
  }
  
  // Throne Seat (Diamond)
  for (let i = -1; i <= 1; i++) {
    world[throneCenterX + i][throneBaseY - 2] = BlockType.DIAMOND_BLOCK;
  }
  
  // Throne Back (Gold & Diamond)
  world[throneCenterX - 1][throneBaseY - 3] = BlockType.GOLD_BLOCK;
  world[throneCenterX][throneBaseY - 3] = BlockType.DIAMOND_BLOCK;
  world[throneCenterX + 1][throneBaseY - 3] = BlockType.GOLD_BLOCK;
  
  world[throneCenterX - 1][throneBaseY - 4] = BlockType.GOLD_BLOCK;
  world[throneCenterX][throneBaseY - 4] = BlockType.DIAMOND_BLOCK;
  world[throneCenterX + 1][throneBaseY - 4] = BlockType.GOLD_BLOCK;
  
  world[throneCenterX][throneBaseY - 5] = BlockType.GOLD_BLOCK;

  return world;
};

const spawnAnimals = (world: BlockType[][]): Animal[] => {
  const animals: Animal[] = [];
  const animalTypes = [
    AnimalType.PIG, AnimalType.PIG, AnimalType.PIG,
    AnimalType.COW, AnimalType.COW, AnimalType.COW,
    AnimalType.CHICKEN, AnimalType.CHICKEN, AnimalType.CHICKEN,
    AnimalType.ANT, AnimalType.ANT, AnimalType.ANT,
    AnimalType.SNAKE, AnimalType.STRIPED_SNAKE, AnimalType.TIGER_SNAKE,
    AnimalType.BIRD, AnimalType.BIRD, AnimalType.BIRD,
    AnimalType.FISH, AnimalType.FISH, AnimalType.FISH,
    AnimalType.ORCA, AnimalType.DOLPHIN, AnimalType.SHARK,
    AnimalType.LEOPARD, AnimalType.LEOPARD, AnimalType.JAGUAR, AnimalType.JAGUAR, AnimalType.BLACK_JAGUAR, AnimalType.BLACK_JAGUAR
  ];
  
  for (let i = 0; i < 80; i++) {
    const type = animalTypes[Math.floor(Math.random() * animalTypes.length)];
    let x = getValidSpawnX(type, world, SPAWN_X * TILE_SIZE);
    
    if (x === null) continue;

    const surfaceY = getSurfaceY(x);
    
    const isWaterAnimal = type === AnimalType.FISH || type === AnimalType.ORCA || type === AnimalType.DOLPHIN || type === AnimalType.SHARK;
    if (!isWaterAnimal && type !== AnimalType.BIRD) {
      if (world[x] && world[x][surfaceY] === BlockType.WATER) {
        continue;
      }
    }
    
    let width = 16, height = 16;
    if (type === AnimalType.PIG) { width = 20; height = 16; }
    else if (type === AnimalType.COW) { width = 24; height = 20; }
    else if (type === AnimalType.CHICKEN) { width = 12; height = 12; }
    else if (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE || type === AnimalType.TIGER_SNAKE) { width = 20; height = 6; }
    else if (type === AnimalType.ANT) { width = 6; height = 4; }
    else if (type === AnimalType.BIRD) { width = 12; height = 8; }
    else if (type === AnimalType.FISH) { width = 12; height = 8; }
    else if (type === AnimalType.ORCA) { width = 48; height = 24; }
    else if (type === AnimalType.DOLPHIN) { width = 32; height = 16; }
    else if (type === AnimalType.SHARK) { width = 40; height = 20; }
    else if (type === AnimalType.LEOPARD || type === AnimalType.JAGUAR || type === AnimalType.BLACK_JAGUAR) { width = 24; height = 16; }
    else if (type === AnimalType.COCOA_CAT) { width = 120; height = 120; }

    let spawnY = surfaceY - 2;
    if (type === AnimalType.BIRD) {
      spawnY = surfaceY - 10 - Math.floor(Math.random() * 10);
    } else if (isWaterAnimal) {
      // Find water
      let foundWater = false;
      for (let y = surfaceY; y < WORLD_HEIGHT; y++) {
        if (world[x] && world[x][y] === BlockType.WATER) {
          spawnY = y + 1;
          foundWater = true;
          break;
        }
      }
      if (!foundWater) continue; // Don't spawn fish if no water
    } else if (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE || type === AnimalType.TIGER_SNAKE) {
      // Find the highest block in this column (could be a tree)
      for (let y = 0; y <= surfaceY; y++) {
        if (world[x] && world[x][y] !== BlockType.AIR && world[x][y] !== BlockType.TALL_GRASS && world[x][y] !== BlockType.FLOWER_BUD && world[x][y] !== BlockType.FLOWER_BLOOM) {
          spawnY = y - 1;
          break;
        }
      }
    }

    const numToSpawn = (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE || type === AnimalType.TIGER_SNAKE) ? Math.floor(Math.random() * 3) + 1 : 1;
    
    for (let j = 0; j < numToSpawn; j++) {
      animals.push({
        id: Math.random(),
        type,
        x: (x + (Math.random() - 0.5) * 2) * TILE_SIZE,
        y: spawnY * TILE_SIZE,
        vx: 0,
        vy: 0,
        width,
        height,
        facing: Math.random() > 0.5 ? 1 : -1,
        state: 'idle',
        stateTime: Math.random() * 60,
        health: type === AnimalType.COCOA_CAT ? 100 : type === AnimalType.ORCA ? 30 : type === AnimalType.SHARK ? 25 : type === AnimalType.DOLPHIN ? 20 : type === AnimalType.COW ? 10 : type === AnimalType.PIG ? 8 : (type === AnimalType.SNAKE || type === AnimalType.STRIPED_SNAKE) ? 6 : type === AnimalType.CHICKEN ? 4 : (type === AnimalType.LEOPARD || type === AnimalType.JAGUAR || type === AnimalType.BLACK_JAGUAR) ? 20 : 1,
        hurtTime: 0,
        attackCooldown: 0,
        launchCooldown: 0,
        attackPattern: (type === AnimalType.COW || type === AnimalType.PIG) ? 'charge' : (type === AnimalType.LEOPARD || type === AnimalType.JAGUAR || type === AnimalType.BLACK_JAGUAR) ? 'lunge' : 'normal'
      });
    }
  }
  return animals;
};

const checkCrafting = (grid: ({ type: BlockType, count: number } | null)[]): { type: BlockType, count: number } | null => {
  const types = grid.map(slot => slot ? slot.type : null);
  
  let totalItems = 0;
  const counts = new Map<BlockType, number>();
  for (const t of types) {
    if (t !== null) {
      totalItems++;
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }

  if (totalItems === 0) return null;

  if (totalItems === 1 && (counts.get(BlockType.WOOD) === 1 || counts.get(BlockType.PINE_WOOD) === 1 || counts.get(BlockType.PALM_WOOD) === 1)) {
    return { type: BlockType.PLANKS, count: 4 };
  }

  if (totalItems === 2 && counts.get(BlockType.PLANKS) === 2) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.PLANKS && types[i+3] === BlockType.PLANKS) {
        return { type: BlockType.STICK, count: 4 };
      }
    }
  }

  // Wooden Sword: 2 planks, 1 stick
  if (totalItems === 3 && counts.get(BlockType.PLANKS) === 2 && counts.get(BlockType.STICK) === 1) {
    for (let i = 0; i < 3; i++) {
      if (types[i] === BlockType.PLANKS && types[i+3] === BlockType.PLANKS && types[i+6] === BlockType.STICK) {
        return { type: BlockType.WOODEN_SWORD, count: 1 };
      }
    }
  }

  // Fang Lance: 1 fang, 1 stick
  if (totalItems === 2 && counts.get(BlockType.FANG) === 1 && counts.get(BlockType.STICK) === 1) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.FANG && types[i+3] === BlockType.STICK) {
        return { type: BlockType.FANG_LANCE, count: 1 };
      }
    }
  }

  if (totalItems === 4 && counts.get(BlockType.STONE) === 4) {
    const is2x2 = (
      (types[0] === BlockType.STONE && types[1] === BlockType.STONE && types[3] === BlockType.STONE && types[4] === BlockType.STONE) ||
      (types[1] === BlockType.STONE && types[2] === BlockType.STONE && types[4] === BlockType.STONE && types[5] === BlockType.STONE) ||
      (types[3] === BlockType.STONE && types[4] === BlockType.STONE && types[6] === BlockType.STONE && types[7] === BlockType.STONE) ||
      (types[4] === BlockType.STONE && types[5] === BlockType.STONE && types[7] === BlockType.STONE && types[8] === BlockType.STONE)
    );
    if (is2x2) return { type: BlockType.BRICKS, count: 4 };
  }

  if (totalItems === 8 && counts.get(BlockType.STONE) === 8 && types[4] === null) {
    return { type: BlockType.FURNACE, count: 1 };
  }

  if (totalItems === 2 && counts.get(BlockType.DIRT) === 2) {
    for (let i = 0; i < 6; i++) {
      if (types[i] === BlockType.DIRT && types[i+3] === BlockType.DIRT) {
        return { type: BlockType.GRASS, count: 1 };
      }
    }
  }

  // Pickaxes: 3 material on top, 2 sticks below
  if (totalItems === 5 && types[4] === BlockType.STICK && types[7] === BlockType.STICK) {
    if (types[0] === BlockType.PLANKS && types[1] === BlockType.PLANKS && types[2] === BlockType.PLANKS) return { type: BlockType.WOODEN_PICKAXE, count: 1 };
    if (types[0] === BlockType.STONE && types[1] === BlockType.STONE && types[2] === BlockType.STONE) return { type: BlockType.STONE_PICKAXE, count: 1 };
    if (types[0] === BlockType.IRON_INGOT && types[1] === BlockType.IRON_INGOT && types[2] === BlockType.IRON_INGOT) return { type: BlockType.IRON_PICKAXE, count: 1 };
    if (types[0] === BlockType.GOLD_INGOT && types[1] === BlockType.GOLD_INGOT && types[2] === BlockType.GOLD_INGOT) return { type: BlockType.GOLD_PICKAXE, count: 1 };
    if (types[0] === BlockType.DIAMOND && types[1] === BlockType.DIAMOND && types[2] === BlockType.DIAMOND) return { type: BlockType.DIAMOND_PICKAXE, count: 1 };
  }

  return null;
};

const BlockIcon = ({ type, className = "absolute inset-2" }: { type: BlockType, className?: string }) => {
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
  if (type === BlockType.MEAT || type === BlockType.COOKED_MEAT || type === BlockType.BEEF || type === BlockType.COOKED_BEEF || type === BlockType.PORK || type === BlockType.COOKED_PORK || type === BlockType.CHICKEN_MEAT || type === BlockType.COOKED_CHICKEN_MEAT || type === BlockType.FISH_MEAT || type === BlockType.COOKED_FISH_MEAT) {
    const isCooked = [BlockType.COOKED_MEAT, BlockType.COOKED_BEEF, BlockType.COOKED_PORK, BlockType.COOKED_CHICKEN_MEAT, BlockType.COOKED_FISH_MEAT].includes(type);
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`w-[80%] h-[50%] rounded-full relative`} style={{ backgroundColor: BLOCK_COLORS[type] }}>
          <div className={`absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 ${isCooked ? 'bg-[#5D4037]' : 'bg-[#FFCDD2]'} rounded-full`} />
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
  if (type === BlockType.WOODEN_PICKAXE || type === BlockType.STONE_PICKAXE || type === BlockType.IRON_PICKAXE || type === BlockType.GOLD_PICKAXE || type === BlockType.DIAMOND_PICKAXE) {
    const color = type === BlockType.WOODEN_PICKAXE ? '#8B5A2B' :
                  type === BlockType.STONE_PICKAXE ? '#9E9E9E' :
                  type === BlockType.IRON_PICKAXE ? '#E6C280' :
                  type === BlockType.GOLD_PICKAXE ? '#FFD700' : '#00E5FF';
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

  return <div className={className} style={{ backgroundColor: BLOCK_COLORS[type] }} />;
};

const getRequiredProgress = (type: BlockType, selectedBlock: BlockType, hasItem: boolean, isFlying: boolean = false) => {
  if (isFlying) {
    return { requiredProgress: 0, canMine: true };
  }

  const getPickaxeTier = (item: BlockType) => {
    if (!hasItem) return 0;
    if (item === BlockType.WOODEN_PICKAXE) return 1;
    if (item === BlockType.STONE_PICKAXE) return 2;
    if (item === BlockType.IRON_PICKAXE) return 3;
    if (item === BlockType.GOLD_PICKAXE) return 4;
    if (item === BlockType.DIAMOND_PICKAXE) return 5;
    return 0;
  };

  const toolTier = getPickaxeTier(selectedBlock);
  let requiredProgress = 15;
  let canMine = true;

  if (type === BlockType.TALL_GRASS || type === BlockType.FLOWER_BUD || type === BlockType.FLOWER_BLOOM) {
    requiredProgress = 2;
  } else if (type === BlockType.STONE || type === BlockType.FURNACE) {
    if (toolTier < 1) canMine = false;
    requiredProgress = 60;
  } else if (type === BlockType.COAL_ORE) {
    if (toolTier < 1) canMine = false;
    requiredProgress = 60;
  } else if (type === BlockType.IRON_ORE) {
    if (toolTier < 2) canMine = false;
    requiredProgress = 90;
  } else if (type === BlockType.GOLD_ORE || type === BlockType.DIAMOND_ORE) {
    if (toolTier < 3) canMine = false;
    requiredProgress = 120;
  } else if (type === BlockType.WOOD || type === BlockType.PLANKS || type === BlockType.PINE_WOOD || type === BlockType.PALM_WOOD) {
    requiredProgress = 45;
  } else if (type === BlockType.MAGMA) {
    if (toolTier < 2) canMine = false;
    requiredProgress = 120;
  } else if (type === BlockType.OBSIDIAN) {
    if (toolTier < 5) canMine = false;
    requiredProgress = 300;
  } else if (type === BlockType.DIRT || type === BlockType.GRASS || type === BlockType.SAND || type === BlockType.SNOW_DIRT || type === BlockType.SNOW_GRASS) {
    requiredProgress = 15;
  } else if (type === BlockType.LEAVES || type === BlockType.PINE_LEAVES || type === BlockType.PALM_LEAVES) {
    requiredProgress = 5;
  }

  if (toolTier > 0 && canMine) {
    requiredProgress = Math.max(5, requiredProgress - toolTier * 10);
  }

  return { requiredProgress, canMine };
};

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clickState = useRef({ time: 0, slot: null as string | null });
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(BlockType.DIRT);
  const [stats, setStats] = useState({ health: 10, hunger: 10, daysPlayed: 0 });
  const [inventory, setInventory] = useState<Record<number, number>>({
    [BlockType.DIRT]: 0,
    [BlockType.GRASS]: 0,
    [BlockType.STONE]: 0,
    [BlockType.WOOD]: 0,
    [BlockType.LEAVES]: 0,
    [BlockType.PLANKS]: 0,
    [BlockType.BRICKS]: 0,
    [BlockType.APPLE]: 0,
    [BlockType.COAL_ORE]: 0,
    [BlockType.IRON_ORE]: 0,
    [BlockType.GOLD_ORE]: 0,
    [BlockType.DIAMOND_ORE]: 0,
    [BlockType.WORM]: 0,
    [BlockType.MEAT]: 0,
    [BlockType.COAL]: 0,
    [BlockType.FURNACE]: 0,
    [BlockType.COOKED_MEAT]: 0,
    [BlockType.BEEF]: 0,
    [BlockType.COOKED_BEEF]: 0,
    [BlockType.PORK]: 0,
    [BlockType.COOKED_PORK]: 0,
    [BlockType.CHICKEN_MEAT]: 0,
    [BlockType.COOKED_CHICKEN_MEAT]: 0,
    [BlockType.FISH_MEAT]: 0,
    [BlockType.COOKED_FISH_MEAT]: 0,
    [BlockType.TALL_GRASS]: 0,
    [BlockType.CORAL]: 0,
    [BlockType.IRON_INGOT]: 0,
    [BlockType.GOLD_INGOT]: 0,
    [BlockType.DIAMOND]: 0,
    [BlockType.WOODEN_PICKAXE]: 0,
    [BlockType.STONE_PICKAXE]: 0,
    [BlockType.IRON_PICKAXE]: 0,
    [BlockType.GOLD_PICKAXE]: 0,
    [BlockType.DIAMOND_PICKAXE]: 0,
    [BlockType.FLOWER_BUD]: 0,
    [BlockType.FLOWER_BLOOM]: 0,
    [BlockType.PINE_WOOD]: 0,
    [BlockType.PINE_LEAVES]: 0,
    [BlockType.PALM_WOOD]: 0,
    [BlockType.PALM_LEAVES]: 0,
    [BlockType.MAGMA]: 0,
    [BlockType.OBSIDIAN]: 0,
    [BlockType.SNOW_DIRT]: 0,
    [BlockType.SNOW_GRASS]: 0,
  });
  const [durability, setDurability] = useState<Record<number, number>>({ ...MAX_DURABILITY });
  const [discoveredItems, setDiscoveredItems] = useState<Record<number, boolean>>({});
  const [isDead, setIsDead] = useState(false);
  const [autoRespawn, setAutoRespawn] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showHotbar, setShowHotbar] = useState(true);
  const [openFurnaceId, setOpenFurnaceId] = useState<string | null>(null);
  const [furnaceUI, setFurnaceUI] = useState<FurnaceData | null>(null);
  const [craftingGrid, setCraftingGrid] = useState<({ type: BlockType, count: number } | null)[]>(Array(9).fill(null));
  const [cursorItem, setCursorItem] = useState<{ type: BlockType, count: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoveredSlotRef = useRef<{type: 'inventory', block: BlockType} | {type: 'crafting', index: number} | null>(null);
  
  // Use refs for mutable game state to avoid dependency issues in the animation loop
  const initialWorld = generateWorld();
  
  const gameState = useRef({
    tick: 0,
    isDead: false,
    autoRespawn: false,
    isInventoryOpen: false,
    openFurnaceId: null as string | null,
    timeOfDay: 3600, // Starts at noon (0 = midnight, 3600 = noon, 7200 = full cycle)
    weather: Weather.CLEAR,
    weatherTimer: 3600, // 1 minute
    invChanged: false,
    selectedBlock: BlockType.AIR,
    actionCooldown: 0,
    world: initialWorld,
    mining: { x: -1, y: -1, progress: 0 },
    droppedItems: [] as DroppedItem[],
    animals: spawnAnimals(initialWorld),
    furnaces: {} as Record<string, FurnaceData>,
    discoveredItems: {} as Record<number, boolean>,
    history: [] as any[],
    cocoaCatDefeated: false,
    player: {
      x: SPAWN_X * TILE_SIZE,
      y: (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE,
      vx: 0,
      vy: 0,
      width: 24,
      height: 48,
      grounded: false,
      health: 10,
      maxHealth: 10,
      hunger: 10,
      maxHunger: 10,
      exhaustion: 0,
      fallStartY: undefined,
      hurtTime: 0,
      poisonTimer: 0,
      poisonTick: 0,
      inventory: {
        [BlockType.DIRT]: 0,
        [BlockType.GRASS]: 0,
        [BlockType.STONE]: 0,
        [BlockType.WOOD]: 0,
        [BlockType.LEAVES]: 0,
        [BlockType.PLANKS]: 0,
        [BlockType.BRICKS]: 0,
        [BlockType.APPLE]: 0,
        [BlockType.COAL_ORE]: 0,
        [BlockType.IRON_ORE]: 0,
        [BlockType.GOLD_ORE]: 0,
        [BlockType.DIAMOND_ORE]: 0,
        [BlockType.WORM]: 0,
        [BlockType.MEAT]: 0,
        [BlockType.COAL]: 0,
        [BlockType.FURNACE]: 0,
        [BlockType.COOKED_MEAT]: 0,
        [BlockType.BEEF]: 0,
        [BlockType.COOKED_BEEF]: 0,
        [BlockType.PORK]: 0,
        [BlockType.COOKED_PORK]: 0,
        [BlockType.CHICKEN_MEAT]: 0,
        [BlockType.COOKED_CHICKEN_MEAT]: 0,
        [BlockType.FISH_MEAT]: 0,
        [BlockType.COOKED_FISH_MEAT]: 0,
        [BlockType.TALL_GRASS]: 0,
        [BlockType.STICK]: 0,
        [BlockType.FANG]: 0,
        [BlockType.WOODEN_SWORD]: 0,
        [BlockType.FANG_LANCE]: 0,
        [BlockType.CORAL]: 0,
        [BlockType.IRON_INGOT]: 0,
        [BlockType.GOLD_INGOT]: 0,
        [BlockType.DIAMOND]: 0,
        [BlockType.WOODEN_PICKAXE]: 0,
        [BlockType.STONE_PICKAXE]: 0,
        [BlockType.IRON_PICKAXE]: 0,
        [BlockType.GOLD_PICKAXE]: 0,
        [BlockType.DIAMOND_PICKAXE]: 0,
        [BlockType.FLOWER_BUD]: 0,
        [BlockType.FLOWER_BLOOM]: 0,
        [BlockType.PINE_WOOD]: 0,
        [BlockType.PINE_LEAVES]: 0,
        [BlockType.PALM_WOOD]: 0,
        [BlockType.PALM_LEAVES]: 0,
      },
      durability: { ...MAX_DURABILITY },
    } as Player,
    camera: {
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    } as Camera,
    keys: {} as Record<string, boolean>,
    mouse: { x: 0, y: 0, leftDown: false, rightDown: false },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;
    const state = gameState.current;

    // Find initial spawn Y
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      if (state.world[Math.floor(state.player.x / TILE_SIZE)][y] !== BlockType.AIR && state.world[Math.floor(state.player.x / TILE_SIZE)][y] !== BlockType.TALL_GRASS && state.world[Math.floor(state.player.x / TILE_SIZE)][y] !== BlockType.FLOWER_BUD && state.world[Math.floor(state.player.x / TILE_SIZE)][y] !== BlockType.FLOWER_BLOOM) {
        state.player.y = (y - 2) * TILE_SIZE;
        break;
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => { 
      soundEngine.init();
      if (e.repeat) return;
      state.keys[e.code] = true; 
      if (e.key.toLowerCase() === 'd') {
        state.isDead = true;
      }
      if (e.key.toLowerCase() === 'r') {
        state.autoRespawn = !state.autoRespawn;
      }
      if (e.key.toLowerCase() === 'f') {
        state.player.isFlying = !state.player.isFlying;
        if (state.player.isFlying) {
          state.player.health = Math.max(1, state.player.health - 2); // Lose 1 heart
        }
        
        // Remove dirt from hand
        if (state.selectedBlock === BlockType.DIRT) {
          state.player.inventory[BlockType.DIRT] = 0;
          state.invChanged = true;
          window.dispatchEvent(new CustomEvent('clearDirt'));
        }
      }
      if (e.key.toLowerCase() === 'c') {
        setShowControls(prev => !prev);
      }
      if (e.key.toLowerCase() === 'h') {
        setShowHotbar(prev => !prev);
      }
      if (e.code === 'KeyI' || e.code === 'KeyE' || e.key.toLowerCase() === 'i' || e.key.toLowerCase() === 'e') {
        setIsInventoryOpen(prev => {
          if (prev) {
            window.dispatchEvent(new CustomEvent('closeInventory'));
          }
          return !prev;
        });
      } else if (e.code === 'Escape' || e.key === 'Escape') {
        setIsInventoryOpen(prev => {
          if (prev) {
            window.dispatchEvent(new CustomEvent('closeInventory'));
            return false;
          }
          return prev;
        });
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { state.keys[e.code] = false; };
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      soundEngine.init();
      const rect = canvas.getBoundingClientRect();
      state.mouse.x = e.clientX - rect.left;
      state.mouse.y = e.clientY - rect.top;
      
      // Allow Shift+Left Click to act as Right Click for users without a right mouse button
      const isRightClick = e.button === 2 || (e.button === 0 && e.shiftKey);
      const isLeftClick = e.button === 0 && !e.shiftKey;

      if (isLeftClick) state.mouse.leftDown = true;
      if (isRightClick) {
        state.mouse.rightDown = true;
        state.actionCooldown = 0;
      }
      
      handleInteract(isRightClick ? 2 : 0);
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      const isRightClick = e.button === 2 || (e.button === 0 && e.shiftKey);
      const isLeftClick = e.button === 0 && !e.shiftKey;
      
      if (isLeftClick) state.mouse.leftDown = false;
      if (isRightClick) state.mouse.rightDown = false;
      
      // Failsafe to clear both if shift state changed during click
      if (e.button === 0) {
        state.mouse.leftDown = false;
        state.mouse.rightDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    // Attach keyboard events to window so they work even if canvas isn't focused
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);

    const checkCollision = (rect: { x: number; y: number; width: number; height: number }, animalType?: AnimalType) => {
      const startX = Math.floor(rect.x / TILE_SIZE);
      const endX = Math.floor((rect.x + rect.width) / TILE_SIZE);
      const startY = Math.floor(rect.y / TILE_SIZE);
      const endY = Math.floor((rect.y + rect.height) / TILE_SIZE);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            const block = state.world[x][y];
            if (block !== BlockType.AIR && block !== BlockType.TALL_GRASS && block !== BlockType.FLOWER_BUD && block !== BlockType.FLOWER_BLOOM && block !== BlockType.WATER && block !== BlockType.CACTUS && block !== BlockType.MAGMA && block !== BlockType.COCOA_PORTAL) {
              if (animalType === AnimalType.TIGER_SNAKE && (block === BlockType.DIRT || block === BlockType.GRASS)) {
                continue; // Tiger snake can dig through dirt and grass
              }
              return true;
            }
          } else {
            return true; // World bounds
          }
        }
      }
      return false;
    };

    const isIntersecting = (r1: any, r2: any) => {
      return !(r2.x >= r1.x + r1.width || 
               r2.x + r2.width <= r1.x || 
               r2.y >= r1.y + r1.height || 
               r2.y + r2.height <= r1.y);
    };

    const handleInteract = (button: number) => {
      const worldX = state.mouse.x + state.camera.x;
      const worldY = state.mouse.y + state.camera.y;
      const gridX = Math.floor(worldX / TILE_SIZE);
      const gridY = Math.floor(worldY / TILE_SIZE);

      if (gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
        const playerCenterX = state.player.x + state.player.width / 2;
        const playerCenterY = state.player.y + state.player.height / 2;
        const dist = Math.sqrt(Math.pow(worldX - playerCenterX, 2) + Math.pow(worldY - playerCenterY, 2));

        const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;

        if (dist <= currentReach) {
          if (button === 2) { // Right click: Place/Interact
            // Check if clicking an animal to tame
            const isMeat = [
              BlockType.MEAT, BlockType.COOKED_MEAT,
              BlockType.BEEF, BlockType.COOKED_BEEF,
              BlockType.PORK, BlockType.COOKED_PORK,
              BlockType.CHICKEN_MEAT, BlockType.COOKED_CHICKEN_MEAT,
              BlockType.FISH_MEAT, BlockType.COOKED_FISH_MEAT
            ].includes(state.selectedBlock);

            if (isMeat && state.player.inventory[state.selectedBlock] > 0) {
              for (const animal of state.animals) {
                if (
                  worldX >= animal.x && worldX <= animal.x + animal.width &&
                  worldY >= animal.y && worldY <= animal.y + animal.height
                ) {
                  if (
                    (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) &&
                    !animal.tamed
                  ) {
                    animal.tamed = true;
                    animal.aggro = false; // Stop attacking player
                    state.player.inventory[state.selectedBlock]--;
                    state.invChanged = true;
                    return; // Tamed, don't place block
                  }
                }
              }
            }

            // Check if clicking a furnace
            if (state.world[gridX][gridY] === BlockType.FURNACE) {
              const id = `${gridX},${gridY}`;
              if (!state.furnaces[id]) {
                state.furnaces[id] = { input: null, fuel: null, output: null, progress: 0, fuelLeft: 0, maxFuel: 0 };
              }
              setFurnaceUI(state.furnaces[id]);
              setOpenFurnaceId(id);
              setIsInventoryOpen(true);
              return;
            }

            if (state.selectedBlock === BlockType.APPLE) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.APPLE] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 3);
                state.player.inventory[BlockType.APPLE]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (state.selectedBlock === BlockType.WORM) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[BlockType.WORM] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 1);
                state.player.inventory[BlockType.WORM]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (state.selectedBlock === BlockType.MEAT || state.selectedBlock === BlockType.BEEF || state.selectedBlock === BlockType.PORK || state.selectedBlock === BlockType.CHICKEN_MEAT || state.selectedBlock === BlockType.FISH_MEAT) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 4);
                state.player.health -= 2; // Raw meat damages you
                state.player.hurtTime = 10;
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if (state.selectedBlock === BlockType.COOKED_MEAT || state.selectedBlock === BlockType.COOKED_BEEF || state.selectedBlock === BlockType.COOKED_PORK || state.selectedBlock === BlockType.COOKED_CHICKEN_MEAT || state.selectedBlock === BlockType.COOKED_FISH_MEAT) {
              if (state.player.hunger < state.player.maxHunger && state.player.inventory[state.selectedBlock] > 0) {
                state.player.hunger = Math.min(state.player.maxHunger, state.player.hunger + 8);
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
                return; // Consumed, don't place
              }
            }
            if ((state.world[gridX][gridY] === BlockType.AIR || state.world[gridX][gridY] === BlockType.TALL_GRASS || state.world[gridX][gridY] === BlockType.FLOWER_BUD || state.world[gridX][gridY] === BlockType.FLOWER_BLOOM || state.world[gridX][gridY] === BlockType.WATER || state.world[gridX][gridY] === BlockType.MAGMA) && state.player.inventory[state.selectedBlock] > 0) {
              const blockRect = { x: gridX * TILE_SIZE, y: gridY * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
              if (!isIntersecting(state.player, blockRect)) {
                soundEngine.place();
                state.world[gridX][gridY] = state.selectedBlock;
                state.player.inventory[state.selectedBlock]--;
                state.invChanged = true;
              }
            }
          } else if (button === 0) { // Left click: Attack
            state.player.attackTimer = 15; // Set attack animation timer
            for (const animal of state.animals) {
              if (
                worldX >= animal.x && worldX <= animal.x + animal.width &&
                worldY >= animal.y && worldY <= animal.y + animal.height
              ) {
                if (animal.hurtTime <= 0) {
                  const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
                  let damage = 2;
                  if (hasItem) {
                    if (state.selectedBlock === BlockType.FANG) {
                      damage = 4;
                      animal.poisonTimer = 300; // 5 seconds of poison
                      animal.poisonTick = 60;
                    } else if (state.selectedBlock === BlockType.WOODEN_SWORD) {
                      damage = 5;
                    } else if (state.selectedBlock === BlockType.FANG_LANCE) {
                      damage = 7;
                      animal.poisonTimer = 300;
                      animal.poisonTick = 60;
                    } else if (state.selectedBlock === BlockType.WOODEN_PICKAXE) {
                      damage = 3;
                    } else if (state.selectedBlock === BlockType.STONE_PICKAXE) {
                      damage = 4;
                    } else if (state.selectedBlock === BlockType.IRON_PICKAXE) {
                      damage = 5;
                    } else if (state.selectedBlock === BlockType.GOLD_PICKAXE) {
                      damage = 3;
                    } else if (state.selectedBlock === BlockType.DIAMOND_PICKAXE) {
                      damage = 6;
                    }
                  }

                  // Durability logic
                  if (hasItem && MAX_DURABILITY[state.selectedBlock] !== undefined) {
                    state.player.durability[state.selectedBlock]--;
                    if (state.player.durability[state.selectedBlock] <= 0) {
                      state.player.inventory[state.selectedBlock]--;
                      if (state.player.inventory[state.selectedBlock] > 0) {
                        state.player.durability[state.selectedBlock] = MAX_DURABILITY[state.selectedBlock];
                      } else {
                        state.player.durability[state.selectedBlock] = 0;
                      }
                    }
                    state.invChanged = true;
                  }

                  if (animal.type === AnimalType.COCOA_CAT) {
                    const hasFullCocoaArmor = state.player.inventory[BlockType.COCOA_HELMET] > 0 &&
                                              state.player.inventory[BlockType.COCOA_CHESTPLATE] > 0 &&
                                              state.player.inventory[BlockType.COCOA_LEGGINGS] > 0 &&
                                              state.player.inventory[BlockType.COCOA_BOOTS] > 0;
                    if (!hasFullCocoaArmor || state.player.isFlying) {
                      state.player.health = 0;
                      if (hasItem && (
                        state.selectedBlock === BlockType.WOODEN_SWORD ||
                        state.selectedBlock === BlockType.FANG_LANCE ||
                        state.selectedBlock === BlockType.WOODEN_PICKAXE ||
                        state.selectedBlock === BlockType.STONE_PICKAXE ||
                        state.selectedBlock === BlockType.IRON_PICKAXE ||
                        state.selectedBlock === BlockType.GOLD_PICKAXE ||
                        state.selectedBlock === BlockType.DIAMOND_PICKAXE
                      )) {
                        state.player.inventory[state.selectedBlock]--;
                        if (state.player.inventory[state.selectedBlock] <= 0) {
                          state.player.inventory[state.selectedBlock] = 0;
                          state.player.durability[state.selectedBlock] = 0;
                        }
                        state.invChanged = true;
                      }
                    }
                  }

                  animal.health -= damage;
                  soundEngine.animalSound(animal.type);
                  animal.hurtTime = 10;
                  animal.aggro = true;
                  animal.vy = -3; // Knockback up
                  animal.vx = (animal.x + animal.width / 2 > playerCenterX ? 1 : -1) * 3; // Knockback away
                  
                  // If we hit a snake, alert nearby snakes
                  if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
                    for (const other of state.animals) {
                      if (other !== animal && (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE)) {
                        const distToOther = Math.hypot(other.x - animal.x, other.y - animal.y);
                        if (distToOther < 400) { // Alert radius
                          other.aggro = true;
                        }
                      }
                    }
                  }

                  // Stop mining if we hit an animal
                  state.mining.progress = 0;
                  return;
                }
              }
            }
          }
        }
      }
    };

    const update = () => {
      const { player, keys } = state;
      const oldHealth = player.health;

      // Rewind Logic
      if (keys['KeyG']) {
        if (state.history.length > 0) {
          const pastState = state.history.pop();
          if (state.history.length > 0) state.history.pop(); // 2x speed rewind
          if (pastState) {
            state.player = pastState.player;
            state.animals = pastState.animals;
            state.droppedItems = pastState.droppedItems;
            state.tick = pastState.tick;
            state.timeOfDay = pastState.timeOfDay;
            state.camera = pastState.camera;
          }
        }
        return; // Skip normal update
      } else {
        // Save state to history
        state.history.push({
          player: { ...state.player },
          animals: state.animals.map(a => ({ ...a })),
          droppedItems: state.droppedItems.map(i => ({ ...i })),
          tick: state.tick,
          timeOfDay: state.timeOfDay,
          camera: { ...state.camera }
        });
        if (state.history.length > 600) { // 10 seconds at 60fps
          state.history.shift();
        }
      }

      // Death logic
      if (player.health <= 0 || state.isDead) {
        if (state.autoRespawn) {
          player.health = player.maxHealth;
          player.hunger = player.maxHunger;
          player.exhaustion = 0;
          player.x = SPAWN_X * TILE_SIZE;
          player.y = (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE;
          player.vx = 0;
          player.vy = 0;
          player.fallStartY = undefined;
          state.isDead = false;
        } else if (!state.isDead) {
          state.isDead = true;
          if (state.isInventoryOpen) {
            window.dispatchEvent(new CustomEvent('forceCloseInventory'));
          }
        }
      } else {
        if (state.isDead) {
          state.isDead = false;
        }
      }

      // Remove dirt from inventory continuously per user request
      if (state.player.inventory[BlockType.DIRT] > 0) {
        state.player.inventory[BlockType.DIRT] = 0;
        state.invChanged = true;
        if (state.selectedBlock === BlockType.DIRT) {
          window.dispatchEvent(new CustomEvent('clearDirt'));
        }
      }

      if (state.isDead) {
        player.vy += GRAVITY;
        player.y += player.vy;
        if (checkCollision(player)) {
          if (player.vy > 0) {
            player.y = Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE - player.height - 0.01;
          }
          player.vy = 0;
        }
        state.camera.width = canvas.width;
        state.camera.height = canvas.height;
        state.camera.x = player.x + player.width / 2 - state.camera.width / 2;
        state.camera.y = player.y + player.height / 2 - state.camera.height / 2;
        state.camera.x = Math.max(0, Math.min(state.camera.x, WORLD_WIDTH * TILE_SIZE - state.camera.width));
        state.camera.y = Math.max(0, Math.min(state.camera.y, WORLD_HEIGHT * TILE_SIZE - state.camera.height));
        return;
      }

      // Furnace logic
      for (const [id, f] of Object.entries(state.furnaces)) {
        const furnace = f as FurnaceData;
        // Check if furnace block still exists
        const [fx, fy] = id.split(',').map(Number);
        if (state.world[fx] && state.world[fx][fy] !== BlockType.FURNACE) {
          // Drop contents if broken
          const dropItem = (item: { type: BlockType, count: number } | null) => {
            if (item) {
              for (let i = 0; i < item.count; i++) {
                state.droppedItems.push({
                  x: fx * TILE_SIZE + 8,
                  y: fy * TILE_SIZE + 8,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -4,
                  type: item.type,
                  id: Math.random()
                });
              }
            }
          };
          dropItem(furnace.input);
          dropItem(furnace.fuel);
          dropItem(furnace.output);
          delete state.furnaces[id];
          if (state.openFurnaceId === id) {
            window.dispatchEvent(new CustomEvent('forceCloseInventory'));
          }
          continue;
        }

        let isSmelting = false;

        if (furnace.fuelLeft > 0) {
          furnace.fuelLeft--;
          isSmelting = true;
        }

        const getSmeltResult = (inputType: BlockType) => {
          if (inputType === BlockType.MEAT) return BlockType.COOKED_MEAT;
          if (inputType === BlockType.BEEF) return BlockType.COOKED_BEEF;
          if (inputType === BlockType.PORK) return BlockType.COOKED_PORK;
          if (inputType === BlockType.CHICKEN_MEAT) return BlockType.COOKED_CHICKEN_MEAT;
          if (inputType === BlockType.FISH_MEAT) return BlockType.COOKED_FISH_MEAT;
          if (inputType === BlockType.IRON_ORE) return BlockType.IRON_INGOT;
          if (inputType === BlockType.GOLD_ORE) return BlockType.GOLD_INGOT;
          return null;
        };
        const smeltResult = furnace.input ? getSmeltResult(furnace.input.type) : null;

        if (smeltResult && (!furnace.output || (furnace.output.type === smeltResult && furnace.output.count < 64))) {
          if (furnace.fuelLeft <= 0 && furnace.fuel) {
            // Consume fuel
            let fuelTicks = 0;
            if (furnace.fuel.type === BlockType.PLANKS) fuelTicks = 600; // 10 seconds (1 item)
            else if (furnace.fuel.type === BlockType.WOOD || furnace.fuel.type === BlockType.PINE_WOOD || furnace.fuel.type === BlockType.PALM_WOOD) fuelTicks = 2400; // 40 seconds (4 items)
            else if (furnace.fuel.type === BlockType.COAL) fuelTicks = 2400; // 40 seconds (4 items)
            
            if (fuelTicks > 0) {
              furnace.fuelLeft = fuelTicks;
              furnace.maxFuel = fuelTicks;
              furnace.fuel.count--;
              if (furnace.fuel.count <= 0) furnace.fuel = null;
              isSmelting = true;
            }
          }

          if (isSmelting) {
            furnace.progress++;
            if (furnace.progress >= 600) { // 10 seconds to smelt
              furnace.progress = 0;
              furnace.input.count--;
              if (furnace.input.count <= 0) furnace.input = null;
              
              if (furnace.output) {
                furnace.output.count++;
              } else {
                furnace.output = { type: smeltResult, count: 1 };
              }
            }
          } else {
            furnace.progress = 0;
          }
        } else {
          furnace.progress = 0;
        }
        
        // Sync UI if this furnace is open
        if (state.openFurnaceId === id) {
          setFurnaceUI({ ...furnace });
        }
      }

      if (state.isInventoryOpen) {
        player.vy += GRAVITY;
        player.y += player.vy;
        player.grounded = false;
        if (checkCollision(player)) {
          if (player.vy > 0) {
            player.y = Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE - player.height - 0.01;
            player.grounded = true;
          } else if (player.vy < 0) {
            player.y = Math.floor(player.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          }
          player.vy = 0;
        }
        return;
      }

      if (state.actionCooldown > 0) state.actionCooldown--;

      // Continuous placement
      if (state.mouse.rightDown && state.actionCooldown === 0) {
        handleInteract(2);
        state.actionCooldown = 10; // Cooldown between placements
      }

      // Mining logic
      if (state.mouse.leftDown) {
        const worldX = state.mouse.x + state.camera.x;
        const worldY = state.mouse.y + state.camera.y;
        
        let hoveringAnimal = false;
        for (const animal of state.animals) {
          if (
            worldX >= animal.x && worldX <= animal.x + animal.width &&
            worldY >= animal.y && worldY <= animal.y + animal.height
          ) {
            hoveringAnimal = true;
            break;
          }
        }

        const gridX = Math.floor(worldX / TILE_SIZE);
        const gridY = Math.floor(worldY / TILE_SIZE);
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        const dist = Math.sqrt(Math.pow(worldX - playerCenterX, 2) + Math.pow(worldY - playerCenterY, 2));

        const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;

        if (!hoveringAnimal && dist <= currentReach && gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
          if (state.world[gridX][gridY] !== BlockType.AIR) {
            if (state.mining.x === gridX && state.mining.y === gridY) {
              state.mining.progress += 1;
              const type = state.world[gridX][gridY];
              
              const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
              const { requiredProgress, canMine } = getRequiredProgress(type, state.selectedBlock, hasItem, state.player.isFlying);

              if (!canMine) {
                state.mining.progress = 0; // Reset progress if can't mine
              } else if (state.mining.progress >= requiredProgress) {
                soundEngine.mine();
                state.world[gridX][gridY] = BlockType.AIR;
                state.mining.progress = 0;
                
                // Durability logic
                if (hasItem && MAX_DURABILITY[state.selectedBlock] !== undefined) {
                  state.player.durability[state.selectedBlock]--;
                  if (state.player.durability[state.selectedBlock] <= 0) {
                    state.player.inventory[state.selectedBlock]--;
                    if (state.player.inventory[state.selectedBlock] > 0) {
                      state.player.durability[state.selectedBlock] = MAX_DURABILITY[state.selectedBlock];
                    } else {
                      state.player.durability[state.selectedBlock] = 0;
                    }
                  }
                  state.invChanged = true;
                }

                let dropType = type;
                if (type === BlockType.COAL_ORE) dropType = BlockType.COAL;
                if (type === BlockType.DIAMOND_ORE) dropType = BlockType.DIAMOND;
                
                state.droppedItems.push({
                  x: gridX * TILE_SIZE + 8,
                  y: gridY * TILE_SIZE + 8,
                  vx: (Math.random() - 0.5) * 4,
                  vy: -4,
                  type: dropType,
                  id: Math.random()
                });
                if ((type === BlockType.LEAVES || type === BlockType.PINE_LEAVES || type === BlockType.PALM_LEAVES) && Math.random() < 0.1) {
                  state.droppedItems.push({
                    x: gridX * TILE_SIZE + 8,
                    y: gridY * TILE_SIZE + 8,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -4,
                    type: BlockType.APPLE,
                    id: Math.random()
                  });
                }
                if (type === BlockType.DIRT && Math.random() < 0.15) {
                  state.droppedItems.push({
                    x: gridX * TILE_SIZE + 8,
                    y: gridY * TILE_SIZE + 8,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -4,
                    type: BlockType.WORM,
                    id: Math.random()
                  });
                }
              }
            } else {
              state.mining.x = gridX;
              state.mining.y = gridY;
              state.mining.progress = 0;
            }
          } else {
            state.mining.progress = 0;
          }
        } else {
          state.mining.progress = 0;
        }
      } else {
        state.mining.progress = 0;
      }

      // Dropped items logic
      for (let i = state.droppedItems.length - 1; i >= 0; i--) {
        const item = state.droppedItems[i];
        
        // Magnet effect
        if (item.type !== BlockType.WORM) {
          const dx = (player.x + player.width / 2) - (item.x + 8);
          const dy = (player.y + player.height / 2) - (item.y + 8);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < REACH * 1.5) {
            item.vx += (dx / dist) * 0.8;
            item.vy += (dy / dist) * 0.8;
            item.vx *= 0.9;
            item.vy *= 0.9;
          } else {
            item.vy += GRAVITY;
          }
        } else {
          // Worms wiggle around randomly
          item.vy += GRAVITY;
          if (Math.random() < 0.05 && item.vy === GRAVITY) { // Jump randomly
            item.vy = -2;
            item.vx = (Math.random() - 0.5) * 2;
          }

          // Check if in sun
          const isDay = state.timeOfDay > 1800 && state.timeOfDay < 5400;
          let inSun = false;
          if (isDay) {
            let cx = Math.floor((item.x + 8) / TILE_SIZE);
            let cy = Math.floor((item.y + 8) / TILE_SIZE);
            if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT) {
              inSun = true;
              for (let y = cy - 1; y >= 0; y--) {
                if (state.world[cx] && state.world[cx][y] !== BlockType.AIR && state.world[cx][y] !== BlockType.TALL_GRASS && state.world[cx][y] !== BlockType.FLOWER_BUD && state.world[cx][y] !== BlockType.FLOWER_BLOOM) {
                  inSun = false;
                  break;
                }
              }
            }
          }
          if (inSun) {
            item.sunExposureTimer = (item.sunExposureTimer || 0) + 1;
            if (item.sunExposureTimer > 600) { // 10 seconds at 60fps
              state.droppedItems.splice(i, 1);
              continue;
            }
          } else {
            item.sunExposureTimer = Math.max(0, (item.sunExposureTimer || 0) - 1);
          }
        }

        item.x += item.vx;
        
        let cx = Math.floor((item.x + 8) / TILE_SIZE);
        let cy = Math.floor((item.y + 8) / TILE_SIZE);
        if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT && state.world[cx][cy] !== BlockType.AIR && state.world[cx][cy] !== BlockType.TALL_GRASS && state.world[cx][cy] !== BlockType.FLOWER_BUD && state.world[cx][cy] !== BlockType.FLOWER_BLOOM) {
          item.vx *= -0.5;
          item.x += item.vx;
        }
        
        item.y += item.vy;
        cx = Math.floor((item.x + 8) / TILE_SIZE);
        cy = Math.floor((item.y + 16) / TILE_SIZE);
        if (cx >= 0 && cx < WORLD_WIDTH && cy >= 0 && cy < WORLD_HEIGHT && state.world[cx][cy] !== BlockType.AIR && state.world[cx][cy] !== BlockType.TALL_GRASS && state.world[cx][cy] !== BlockType.FLOWER_BUD && state.world[cx][cy] !== BlockType.FLOWER_BLOOM) {
          item.y = cy * TILE_SIZE - 16;
          if (item.vy > 0) item.vy = 0;
          item.vx *= 0.8;
        }

        if (isIntersecting(player, { x: item.x, y: item.y, width: 16, height: 16 })) {
          if (item.type === BlockType.WORM) {
            item.pickupTimer = (item.pickupTimer || 0) + 1;
            if (item.pickupTimer < 180) { // 3 seconds at 60fps
              continue; // Don't pick up yet
            }
          }
          
          const maxStack = getMaxStack(item.type);
          const currentCount = player.inventory[item.type] || 0;
          if (currentCount < maxStack) {
            player.inventory[item.type] = currentCount + 1;
            state.discoveredItems[item.type] = true;
            state.droppedItems.splice(i, 1);
            state.invChanged = true;
            soundEngine.pickup();
          } else {
            if (item.type === BlockType.WORM) {
              item.pickupTimer = 0; // Reset if player steps off
            }
          }
      }

      // Animal spawning logic
      if (state.tick % 60 === 0) { // Check every second
        const counts = {
          [AnimalType.PIG]: 0,
          [AnimalType.COW]: 0,
          [AnimalType.CHICKEN]: 0,
          [AnimalType.SNAKE]: 0,
          [AnimalType.STRIPED_SNAKE]: 0,
          [AnimalType.TIGER_SNAKE]: 0,
          [AnimalType.ANT]: 0,
          [AnimalType.BIRD]: 0,
          [AnimalType.FISH]: 0,
          [AnimalType.ORCA]: 0,
          [AnimalType.DOLPHIN]: 0,
          [AnimalType.SHARK]: 0,
          [AnimalType.LEOPARD]: 0,
          [AnimalType.JAGUAR]: 0,
          [AnimalType.BLACK_JAGUAR]: 0,
          [AnimalType.COCOA_CAT]: 0
        };
        for (const a of state.animals) {
          if (counts[a.type] !== undefined) {
            counts[a.type]++;
          }
        }

        const limits = {
          [AnimalType.PIG]: 15,
          [AnimalType.COW]: 15,
          [AnimalType.CHICKEN]: 15,
          [AnimalType.SNAKE]: 10,
          [AnimalType.STRIPED_SNAKE]: 10,
          [AnimalType.TIGER_SNAKE]: 10,
          [AnimalType.ANT]: 15,
          [AnimalType.BIRD]: 15,
          [AnimalType.FISH]: 15,
          [AnimalType.ORCA]: 5,
          [AnimalType.DOLPHIN]: 8,
          [AnimalType.SHARK]: 5,
          [AnimalType.LEOPARD]: 5,
          [AnimalType.JAGUAR]: 5,
          [AnimalType.BLACK_JAGUAR]: 5,
          [AnimalType.COCOA_CAT]: 1
        };

        const typesToSpawn = [
          AnimalType.PIG, AnimalType.PIG, AnimalType.PIG,
          AnimalType.COW, AnimalType.COW, AnimalType.COW,
          AnimalType.CHICKEN, AnimalType.CHICKEN, AnimalType.CHICKEN,
          AnimalType.ANT, AnimalType.ANT, AnimalType.ANT,
          AnimalType.SNAKE, AnimalType.STRIPED_SNAKE, AnimalType.TIGER_SNAKE,
          AnimalType.BIRD, AnimalType.BIRD, AnimalType.BIRD,
          AnimalType.FISH, AnimalType.FISH, AnimalType.FISH,
          AnimalType.ORCA, AnimalType.DOLPHIN, AnimalType.SHARK,
          AnimalType.LEOPARD, AnimalType.LEOPARD, AnimalType.JAGUAR, AnimalType.JAGUAR, AnimalType.BLACK_JAGUAR, AnimalType.BLACK_JAGUAR
        ];
        const typeToSpawn = typesToSpawn[Math.floor(Math.random() * typesToSpawn.length)];
        
        if (counts[typeToSpawn] < limits[typeToSpawn]) {
          const spawnX = getValidSpawnX(typeToSpawn, state.world, player.x);
          
          if (spawnX !== null && Math.abs(spawnX * TILE_SIZE - player.x) > 400) {
            const surfaceY = getSurfaceY(spawnX);
            
            let canSpawn = true;
            const isWaterAnimal = typeToSpawn === AnimalType.FISH || typeToSpawn === AnimalType.ORCA || typeToSpawn === AnimalType.DOLPHIN || typeToSpawn === AnimalType.SHARK;
            if (!isWaterAnimal && typeToSpawn !== AnimalType.BIRD) {
              if (state.world[spawnX] && state.world[spawnX][surfaceY] === BlockType.WATER) {
                canSpawn = false; // Don't spawn non-fish in water
              }
            }
            
            if (canSpawn) {
              let width = 16, height = 16;
              if (typeToSpawn === AnimalType.PIG) { width = 20; height = 16; }
              else if (typeToSpawn === AnimalType.COW) { width = 24; height = 20; }
              else if (typeToSpawn === AnimalType.CHICKEN) { width = 12; height = 12; }
              else if (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE || typeToSpawn === AnimalType.TIGER_SNAKE) { width = 20; height = 6; }
              else if (typeToSpawn === AnimalType.ANT) { width = 6; height = 4; }
              else if (typeToSpawn === AnimalType.BIRD) { width = 12; height = 8; }
              else if (typeToSpawn === AnimalType.FISH) { width = 12; height = 8; }
              else if (typeToSpawn === AnimalType.ORCA) { width = 48; height = 24; }
              else if (typeToSpawn === AnimalType.DOLPHIN) { width = 32; height = 16; }
              else if (typeToSpawn === AnimalType.SHARK) { width = 40; height = 20; }
              else if (typeToSpawn === AnimalType.LEOPARD || typeToSpawn === AnimalType.JAGUAR || typeToSpawn === AnimalType.BLACK_JAGUAR) { width = 24; height = 16; }
              else if (typeToSpawn === AnimalType.COCOA_CAT) { width = 120; height = 120; }

              let spawnY = surfaceY - 2;
              if (typeToSpawn === AnimalType.BIRD) {
                spawnY = surfaceY - 10 - Math.floor(Math.random() * 10);
              } else if (isWaterAnimal) {
                let foundWater = false;
                for (let y = surfaceY; y < WORLD_HEIGHT; y++) {
                  if (state.world[spawnX] && state.world[spawnX][y] === BlockType.WATER) {
                    spawnY = y + 1;
                    foundWater = true;
                    break;
                  }
                }
                if (!foundWater) canSpawn = false;
              } else if (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE || typeToSpawn === AnimalType.TIGER_SNAKE) {
                for (let y = 0; y <= surfaceY; y++) {
                  if (state.world[spawnX] && state.world[spawnX][y] !== BlockType.AIR && state.world[spawnX][y] !== BlockType.TALL_GRASS && state.world[spawnX][y] !== BlockType.FLOWER_BUD && state.world[spawnX][y] !== BlockType.FLOWER_BLOOM) {
                    spawnY = y - 1;
                    break;
                  }
                }
              }

              if (canSpawn) {
                const numToSpawn = (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE || typeToSpawn === AnimalType.TIGER_SNAKE) ? Math.floor(Math.random() * 3) + 1 : 1;
                
                for (let j = 0; j < numToSpawn; j++) {
                  state.animals.push({
                    id: Math.random(),
                    type: typeToSpawn,
                    x: (spawnX + (Math.random() - 0.5) * 2) * TILE_SIZE,
                    y: spawnY * TILE_SIZE,
                    vx: 0,
                    vy: 0,
                    width,
                    height,
                    facing: Math.random() > 0.5 ? 1 : -1,
                    state: 'idle',
                    stateTime: Math.random() * 60,
                    health: typeToSpawn === AnimalType.COCOA_CAT ? 100 : typeToSpawn === AnimalType.ORCA ? 30 : typeToSpawn === AnimalType.SHARK ? 25 : typeToSpawn === AnimalType.DOLPHIN ? 20 : typeToSpawn === AnimalType.COW ? 10 : typeToSpawn === AnimalType.PIG ? 8 : (typeToSpawn === AnimalType.SNAKE || typeToSpawn === AnimalType.STRIPED_SNAKE) ? 6 : typeToSpawn === AnimalType.CHICKEN ? 4 : (typeToSpawn === AnimalType.LEOPARD || typeToSpawn === AnimalType.JAGUAR || typeToSpawn === AnimalType.BLACK_JAGUAR) ? 20 : 1,
                    hurtTime: 0,
                    attackCooldown: 0,
                    launchCooldown: 0,
                    attackPattern: (typeToSpawn === AnimalType.COW || typeToSpawn === AnimalType.PIG) ? 'charge' : (typeToSpawn === AnimalType.LEOPARD || typeToSpawn === AnimalType.JAGUAR || typeToSpawn === AnimalType.BLACK_JAGUAR) ? 'lunge' : 'normal'
                  });
                }
              }
            }
          }
        }
      }

      // Animal logic
      for (let i = state.animals.length - 1; i >= 0; i--) {
        const animal = state.animals[i];
        
        // Despawn far animals
        if (Math.abs(animal.x - player.x) > 3000) {
          state.animals.splice(i, 1);
          continue;
        }

        if (animal.health <= 0) {
          if (animal.type === AnimalType.COCOA_CAT) {
            state.cocoaCatDefeated = true;
            [BlockType.COCOA_HELMET, BlockType.COCOA_CHESTPLATE, BlockType.COCOA_LEGGINGS, BlockType.COCOA_BOOTS].forEach(type => {
              state.droppedItems.push({
                x: animal.x + animal.width / 2 - 8,
                y: animal.y + animal.height / 2 - 8,
                vx: (Math.random() - 0.5) * 8,
                vy: -6,
                type,
                id: Math.random()
              });
            });
          } else if (animal.type !== AnimalType.ANT) {
            const isSnake = animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE;
            const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
            state.droppedItems.push({
              x: animal.x + animal.width / 2 - 8,
              y: animal.y + animal.height / 2 - 8,
              vx: (Math.random() - 0.5) * 4,
              vy: -4,
              type: isSnake || isCat ? BlockType.FANG : BlockType.MEAT,
              id: Math.random()
            });
            if (isCat) {
              state.droppedItems.push({
                x: animal.x + animal.width / 2 - 8,
                y: animal.y + animal.height / 2 - 8,
                vx: (Math.random() - 0.5) * 4,
                vy: -4,
                type: BlockType.MEAT,
                id: Math.random()
              });
            }
          }
          state.animals.splice(i, 1);
          continue;
        }

        if (animal.hurtTime > 0) animal.hurtTime--;
        if (animal.attackTimer && animal.attackTimer > 0) animal.attackTimer--;
        if (animal.chargeTimer && animal.chargeTimer > 0) animal.chargeTimer--;

        if (Math.random() < 0.002 && Math.abs(animal.x - player.x) < 800 && Math.abs(animal.y - player.y) < 600) {
          soundEngine.animalSound(animal.type);
        }

        if (animal.poisonTimer && animal.poisonTimer > 0) {
          animal.poisonTimer--;
          if (animal.poisonTick && animal.poisonTick > 0) {
            animal.poisonTick--;
            if (animal.poisonTick <= 0) {
              const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
              animal.health -= isCat ? 1 : 3; // 1 damage for cats, 3 for others
              soundEngine.animalSound(animal.type);
              animal.hurtTime = 10;
              animal.poisonTick = isCat ? 120 : 60;
            }
          }
        }

        let touchingMagma = false;
        const magmaStartX = Math.floor(animal.x / TILE_SIZE);
        const magmaEndX = Math.floor((animal.x + animal.width) / TILE_SIZE);
        const magmaStartY = Math.floor(animal.y / TILE_SIZE);
        const magmaEndY = Math.floor((animal.y + animal.height) / TILE_SIZE);
        for (let x = magmaStartX; x <= magmaEndX; x++) {
          for (let y = magmaStartY; y <= magmaEndY; y++) {
            if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
              if (state.world[x][y] === BlockType.MAGMA) touchingMagma = true;
            }
          }
        }

        if (touchingMagma && animal.hurtTime <= 0) {
          animal.health -= 2;
          animal.hurtTime = 30;
          soundEngine.animalSound(animal.type);
        }

        const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
        if (isCat && animal.health < 20) {
          if (animal.regenTimer === undefined) animal.regenTimer = 0;
          animal.regenTimer++;
          if (animal.regenTimer >= 60) {
            animal.health++;
            animal.regenTimer = 0;
          }
        }

        animal.stateTime--;
        
        let targetX: number | null = null;
        let fleeX: number | null = null;
        
        // Flee from predators
        if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
          // Flee from player if hurt recently, unless they have charge attack pattern
          if (animal.hurtTime > 0) {
            if (animal.attackPattern === 'charge') {
              animal.aggro = true;
            } else {
              fleeX = player.x;
            }
          }
          
          if (animal.aggro) {
            const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
            if (distToPlayer > 600) {
              animal.aggro = false; // Lose aggro if player runs far away
            } else {
              targetX = player.x;
            }
          } else if (fleeX === null) {
            // Flee from snakes
            for (const other of state.animals) {
              if (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
                if (Math.hypot(animal.x - other.x, animal.y - other.y) < 200) {
                  fleeX = other.x;
                  break;
                }
              }
            }
          }
        } else if (animal.type === AnimalType.ANT) {
          for (const other of state.animals) {
            if (other.type === AnimalType.CHICKEN || other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
              if (Math.hypot(animal.x - other.x, animal.y - other.y) < 150) {
                fleeX = other.x;
                break;
              }
            }
          }
        } else if (animal.type === AnimalType.BIRD) {
          if (animal.hurtTime > 0) {
            fleeX = player.x;
          }
        } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
          if (animal.hurtTime > 0) {
            fleeX = player.x;
          }
        }

        // Shark attacks player if player is in water and close
        if (animal.type === AnimalType.SHARK && fleeX === null) {
          const playerInWater = state.world[Math.floor(player.x / TILE_SIZE)]?.[Math.floor(player.y / TILE_SIZE)] === BlockType.WATER ||
                                state.world[Math.floor(player.x / TILE_SIZE)]?.[Math.floor((player.y + player.height) / TILE_SIZE)] === BlockType.WATER;
          if (playerInWater) {
            const dist = Math.hypot(animal.x - player.x, animal.y - player.y);
            if (dist < 300) {
              targetX = player.x;
            }
          }
        }

        // Orca attacks other sea animals
        if (animal.type === AnimalType.ORCA && fleeX === null) {
          let closestDist = 400;
          let targetAnimal = null;
          for (const other of state.animals) {
            if (other.id !== animal.id && (other.type === AnimalType.FISH || other.type === AnimalType.DOLPHIN || other.type === AnimalType.SHARK)) {
              const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
              if (dist < closestDist) {
                closestDist = dist;
                targetAnimal = other;
              }
            }
          }
          if (targetAnimal) {
            targetX = targetAnimal.x;
            // If close enough, attack
            if (closestDist < 40 && (!animal.attackCooldown || animal.attackCooldown <= 0)) {
              targetAnimal.health -= 5;
              soundEngine.animalSound(targetAnimal.type);
              targetAnimal.hurtTime = 20;
              animal.attackCooldown = 60; // 1 second cooldown
              animal.attackTimer = 15;
            }
          }
        }

        // Seek food if not fleeing
        if (fleeX === null && targetX === null) {
          if (animal.type === AnimalType.PIG || animal.type === AnimalType.COW || animal.type === AnimalType.CHICKEN) {
             // Seek tall grass or dropped apple/worm
             let closestDist = 300;
             for (const item of state.droppedItems) {
               if (item.type === BlockType.APPLE || item.type === BlockType.WORM) {
                 const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
                 if (dist < closestDist) {
                   closestDist = dist;
                   targetX = item.x;
                 }
               }
             }
             if (targetX === null) {
               // Look for tall grass
               const searchRadius = 5;
               const tileX = Math.floor(animal.x / TILE_SIZE);
               const tileY = Math.floor(animal.y / TILE_SIZE);
               for (let dx = -searchRadius; dx <= searchRadius; dx++) {
                 for (let dy = -searchRadius; dy <= searchRadius; dy++) {
                   const x = tileX + dx;
                   const y = tileY + dy;
                   if (state.world[x] && (state.world[x][y] === BlockType.TALL_GRASS || state.world[x][y] === BlockType.FLOWER_BUD || state.world[x][y] === BlockType.FLOWER_BLOOM)) {
                     const dist = Math.hypot(dx * TILE_SIZE, dy * TILE_SIZE);
                     if (dist < closestDist) {
                       closestDist = dist;
                       targetX = x * TILE_SIZE;
                     }
                   }
                 }
               }
             }
          } else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
             if (animal.aggro) {
               const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
               if (distToPlayer > 600) {
                 animal.aggro = false; // Lose aggro if player runs far away
               } else {
                 targetX = player.x;
               }
             }
             
             if (!animal.aggro) {
               // Seek prey
               let closestDist = 250;
               for (const other of state.animals) {
                 if (other.type === AnimalType.PIG || other.type === AnimalType.CHICKEN || other.type === AnimalType.ANT) {
                   const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
                   if (dist < closestDist) {
                     closestDist = dist;
                     targetX = other.x;
                   }
                 }
               }
             }
          } else if (animal.type === AnimalType.ANT) {
             // Seek dropped apple/worm
             let closestDist = 200;
             for (const item of state.droppedItems) {
               if (item.type === BlockType.APPLE || item.type === BlockType.WORM) {
                 const dist = Math.hypot(animal.x - item.x, animal.y - item.y);
                 if (dist < closestDist) {
                   closestDist = dist;
                   targetX = item.x;
                 }
               }
             }
          } else if (animal.type === AnimalType.BIRD) {
            // Birds fly around randomly
            if (Math.random() < 0.02) {
              animal.facing = Math.random() > 0.5 ? 1 : -1;
            }
            targetX = animal.x + animal.facing * 100;
          } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
            // Fish swim around randomly
            if (Math.random() < 0.02) {
              animal.facing = Math.random() > 0.5 ? 1 : -1;
            }
            targetX = animal.x + animal.facing * 100;
          } else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
            let closestDist = 400;
            let targetEntity: {x: number, y: number} | null = null;
            
            // Check player
            const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
            if (!animal.tamed && distToPlayer < closestDist) {
              closestDist = distToPlayer;
              targetEntity = player;
            }
            
            // Check other animals
            for (const other of state.animals) {
              if (other.id !== animal.id && other.type !== AnimalType.LEOPARD && other.type !== AnimalType.JAGUAR && other.type !== AnimalType.BLACK_JAGUAR) {
                const dist = Math.hypot(animal.x - other.x, animal.y - other.y);
                if (dist < closestDist) {
                  closestDist = dist;
                  targetEntity = other;
                }
              }
            }
            
            if (targetEntity) {
              targetX = targetEntity.x;
            } else if (animal.tamed && distToPlayer > 100) {
              targetX = player.x;
            } else {
              // Wander randomly
              if (Math.random() < 0.01) {
                animal.facing = Math.random() > 0.5 ? 1 : -1;
              }
              targetX = animal.x + animal.facing * 100;
            }
          }
        }

        if (fleeX !== null) {
          animal.state = 'walking';
          animal.facing = animal.x > fleeX ? 1 : -1;
          animal.stateTime = 10; // Keep fleeing
        } else if (targetX !== null) {
          animal.state = 'walking';
          animal.facing = targetX > animal.x ? 1 : -1;
          animal.stateTime = 10; // Keep seeking
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

        if (animal.type === AnimalType.COCOA_CAT) {
          const hasFullCocoaArmor = player.inventory[BlockType.COCOA_HELMET] > 0 &&
                                    player.inventory[BlockType.COCOA_CHESTPLATE] > 0 &&
                                    player.inventory[BlockType.COCOA_LEGGINGS] > 0 &&
                                    player.inventory[BlockType.COCOA_BOOTS] > 0;
          if (isIntersecting(animal, player)) {
            if (!hasFullCocoaArmor || player.isFlying) {
              player.health = 0;
            }
          }
          if (player.y < 30 * TILE_SIZE && !hasFullCocoaArmor) {
            targetX = player.x;
            if (Math.abs(player.x - animal.x) < 150 && animal.attackCooldown! <= 0) {
              animal.state = 'attacking';
              animal.stateTime = 30;
              animal.attackCooldown = 60;
              animal.attackTimer = 15;
            }
          }
        }

        if (animal.state === 'walking') {
          let speed = 1;
          if (fleeX !== null) speed = 2.5; // Run faster when fleeing
          else if (targetX !== null) speed = 1.5; // Walk faster when seeking
          
          if (animal.type === AnimalType.CHICKEN) speed *= 1.5;
          else if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) speed *= 2.5; // Charge fast
          else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) speed *= 1.5;
          else if (animal.type === AnimalType.ANT) speed *= 0.5;
          else if (animal.type === AnimalType.SHARK && targetX === player.x) speed *= 2.0; // Sharks swim fast when attacking
          else if (animal.type === AnimalType.ORCA && targetX !== null) speed *= 2.0; // Orcas swim fast when attacking
          else if (animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN) speed *= 1.5;
          else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
            speed *= (targetX === player.x ? 2.5 : 1.0); // Sprint when attacking
          } else if (animal.type === AnimalType.COCOA_CAT) {
            speed *= (targetX === player.x ? 3.0 : 1.0);
          }
          
          animal.vx = speed * animal.facing;
        } else if (animal.state === 'launching') {
          // Keep current vx
        } else {
          animal.vx = 0;
        }

        // Apply gravity
        let inWater = false;
        let inTree = false;
        const aStartX = Math.floor(animal.x / TILE_SIZE);
        const aEndX = Math.floor((animal.x + animal.width) / TILE_SIZE);
        const aStartY = Math.floor(animal.y / TILE_SIZE);
        const aEndY = Math.floor((animal.y + animal.height) / TILE_SIZE);
        for (let x = aStartX; x <= aEndX; x++) {
          for (let y = aStartY; y <= aEndY; y++) {
            if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
              const block = state.world[x][y];
              if (block === BlockType.WATER || block === BlockType.MAGMA) inWater = true;
              if (block === BlockType.WOOD || block === BlockType.PINE_WOOD || block === BlockType.PALM_WOOD || block === BlockType.LEAVES || block === BlockType.PINE_LEAVES || block === BlockType.PALM_LEAVES) {
                inTree = true;
              }
            }
          }
        }

        if (animal.type === AnimalType.BIRD) {
          // Birds fly
          animal.vy += (Math.random() - 0.5) * 0.5;
          if (animal.vy > 2) animal.vy = 2;
          if (animal.vy < -2) animal.vy = -2;
          // Keep above ground
          const surfaceY = getSurfaceY(Math.floor(animal.x / TILE_SIZE)) * TILE_SIZE;
          if (animal.y > surfaceY - 50) {
            animal.vy -= 0.5;
          }
        } else if (animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) {
          // Fish swim in water
          if (inWater) {
            animal.vy += (Math.random() - 0.5) * 0.2;
            if (animal.type === AnimalType.SHARK && targetX === player.x) {
               // Swim towards player vertically
               if (player.y < animal.y) animal.vy -= 0.2;
               else if (player.y > animal.y) animal.vy += 0.2;
            } else if (animal.type === AnimalType.ORCA && targetX !== null) {
               // Swim towards target vertically
               let targetY = animal.y;
               for (const other of state.animals) {
                 if (other.x === targetX) {
                   targetY = other.y;
                   break;
                 }
               }
               if (targetY < animal.y) animal.vy -= 0.2;
               else if (targetY > animal.y) animal.vy += 0.2;
            }
            if (animal.vy > 1) animal.vy = 1;
            if (animal.vy < -1) animal.vy = -1;
          } else {
            // Flop out of water
            animal.vy += GRAVITY;
          }
        } else if ((animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) && inTree && animal.state !== 'launching') {
          // Snakes can climb trees
          animal.vy = 0;
          if (targetX !== null) {
            let targetY = animal.y;
            if (animal.aggro) {
              targetY = player.y;
            } else {
              for (const other of state.animals) {
                if (other.x === targetX) {
                  targetY = other.y;
                  break;
                }
              }
            }
            if (targetY < animal.y - 10) animal.vy = -1;
            else if (targetY > animal.y + 10) animal.vy = 1;
          } else {
            // Wander vertically slightly
            if (Math.random() < 0.05) {
              animal.vy = (Math.random() > 0.5 ? 1 : -1);
            }
          }
        } else {
          animal.vy += GRAVITY;
        }

        // Horizontal movement
        if ((animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK) && !inWater) {
          animal.vx = 0; // Can't move horizontally out of water
        } else {
          animal.x += animal.vx;
        }
        if (checkCollision(animal, animal.type)) {
          if (animal.vx > 0) {
            animal.x = Math.floor((animal.x + animal.width) / TILE_SIZE) * TILE_SIZE - animal.width - 0.01;
          } else if (animal.vx < 0) {
            animal.x = Math.floor(animal.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          }
          animal.vx = 0;
          if (animal.state !== 'launching') {
            const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR;
            if (isCat && targetX !== null && animal.vy === GRAVITY) {
              animal.vy = -11.3; // Jump 5 blocks
            } else {
              animal.facing *= -1; // Turn around
              // Maybe jump
              if (Math.random() < 0.5 && animal.vy === GRAVITY) {
                animal.vy = isCat ? -11.3 : -JUMP_FORCE * 0.8;
              }
            }
          }
        }

        // Track fall start
        if (animal.vy > 0 && animal.fallStartY === undefined) {
          animal.fallStartY = animal.y;
        } else if (animal.vy < 0) {
          animal.fallStartY = undefined;
        }

        // Vertical movement
        animal.y += animal.vy;
        if (checkCollision(animal, animal.type)) {
          if (animal.vy > 0) {
            animal.y = Math.floor((animal.y + animal.height) / TILE_SIZE) * TILE_SIZE - animal.height - 0.01;
            
            // Calculate fall damage
            if (animal.fallStartY !== undefined) {
              const blocksFallen = (animal.y - animal.fallStartY) / TILE_SIZE;
              // Birds, fish, and cats don't take fall damage
              const isCat = animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT;
              const isBird = animal.type === AnimalType.BIRD;
              const isFish = animal.type === AnimalType.FISH || animal.type === AnimalType.ORCA || animal.type === AnimalType.DOLPHIN || animal.type === AnimalType.SHARK;
              
              if (blocksFallen > 3 && !isCat && !isBird && !isFish) {
                const damage = Math.floor(blocksFallen - 3);
                animal.health -= damage;
                animal.hurtTime = 10;
                soundEngine.animalSound(animal.type);
              }
              animal.fallStartY = undefined;
            }

            if (animal.state === 'launching') {
              animal.state = 'idle';
              animal.stateTime = 30; // Brief pause after landing
            }
          } else if (animal.vy < 0) {
            animal.y = Math.floor(animal.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          }
          animal.vy = 0;
        }

        // Snake bite and launch logic
        if (animal.attackCooldown && animal.attackCooldown > 0) {
          animal.attackCooldown--;
        }
        if (animal.launchCooldown && animal.launchCooldown > 0) {
          animal.launchCooldown--;
        }
        
        if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
          const distToPlayer = Math.hypot(player.x - animal.x, player.y - animal.y);
          
          // Check if player falls on the snake
          if (isIntersecting(animal, player) && player.vy > 0 && !player.grounded) {
            animal.aggro = true;
          }
          
          if (animal.aggro) {
            // Launch at player if close enough and grounded
            if (distToPlayer < 120 && (!animal.launchCooldown || animal.launchCooldown <= 0) && animal.vy === 0) {
              animal.state = 'launching';
              animal.vy = -6; // Jump up
              animal.vx = (player.x > animal.x ? 1 : -1) * 5; // Leap towards player
              animal.facing = player.x > animal.x ? 1 : -1;
              animal.launchCooldown = 120; // 2 seconds cooldown
            }
            
            // Bite player
            if ((!animal.attackCooldown || animal.attackCooldown <= 0) && isIntersecting(animal, player)) {
              if (animal.type === AnimalType.TIGER_SNAKE) {
                player.health -= 2; // 1 heart
                player.hurtTime = 10;
                player.vy = -3; // Knockback up
                player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4; // Knockback away
                animal.attackCooldown = 60; // 1 second cooldown
                animal.attackTimer = 15;
              } else {
                player.health -= animal.type === AnimalType.STRIPED_SNAKE ? 6 : 1;
                player.hurtTime = 10;
                player.poisonTimer = 300; // 5 seconds at 60fps
                player.poisonTick = 60; // First tick after 1 second
                player.vy = -3; // Knockback up
                player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4; // Knockback away
                animal.attackCooldown = 60; // 1 second cooldown
                animal.attackTimer = 15;
              }
            }
          }
          // Bite other animals
          if (!animal.attackCooldown || animal.attackCooldown <= 0) {
            for (const other of state.animals) {
              if (other !== animal && isIntersecting(animal, other)) {
                // Don't bite other snakes
                if (other.type === AnimalType.SNAKE || other.type === AnimalType.STRIPED_SNAKE || other.type === AnimalType.TIGER_SNAKE) {
                  continue;
                }
                if (animal.type === AnimalType.TIGER_SNAKE) {
                  other.health -= 2;
                  soundEngine.animalSound(other.type);
                  other.hurtTime = 10;
                  other.vy = -3;
                  other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
                  animal.attackCooldown = 60;
                  animal.attackTimer = 15;
                } else {
                  other.health -= animal.type === AnimalType.STRIPED_SNAKE ? 6 : 1;
                  soundEngine.animalSound(other.type);
                  other.hurtTime = 10;
                  const isCat = other.type === AnimalType.LEOPARD || other.type === AnimalType.JAGUAR || other.type === AnimalType.BLACK_JAGUAR;
                  other.poisonTimer = isCat ? 120 : 300;
                  other.poisonTick = isCat ? 120 : 60;
                  other.vy = -3;
                  other.vx = (other.x + other.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4;
                  animal.attackCooldown = 60;
                  animal.attackTimer = 15;
                }
                break; // Only bite one animal per frame
              }
            }
          }
        }

        // Pig and Cow charge logic
        if ((animal.type === AnimalType.PIG || animal.type === AnimalType.COW) && animal.aggro) {
          if ((!animal.attackCooldown || animal.attackCooldown <= 0) && isIntersecting(animal, player) && !player.isFlying) {
            player.health -= animal.type === AnimalType.COW ? 3 : 2;
            player.hurtTime = 10;
            player.vy = -3; // Knockback up
            player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 5; // Strong knockback away
            animal.attackCooldown = 60; // 1 second cooldown
            animal.attackTimer = 15;
          }
        }

        // Shark bite logic
        if (animal.type === AnimalType.SHARK) {
          if ((!animal.attackCooldown || animal.attackCooldown <= 0) && isIntersecting(animal, player) && !player.isFlying) {
            player.health -= 5; // 2.5 hearts
            player.hurtTime = 10;
            player.vy = -2; // Knockback up
            player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 3; // Knockback away
            animal.attackCooldown = 60; // 1 second cooldown
            animal.attackTimer = 15;
          }
        }

        // Big Cats bite logic
        if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR) {
          // Pounce logic
          if (targetX !== null && (!animal.launchCooldown || animal.launchCooldown <= 0) && animal.vy === 0) {
            const hDist = Math.abs(targetX - animal.x);
            if (hDist < 150 && hDist > 40) {
              animal.state = 'launching';
              animal.vy = -6; // Jump up
              animal.vx = (targetX > animal.x ? 1 : -1) * 6; // Leap towards target
              animal.facing = targetX > animal.x ? 1 : -1;
              animal.launchCooldown = 120; // 2 seconds cooldown
            }
          }

          if ((!animal.attackCooldown || animal.attackCooldown <= 0)) {
            let attacked = false;
            if (!animal.tamed && isIntersecting(animal, player) && !player.isFlying) {
              player.health -= 8; // 8 hearts
              player.hurtTime = 10;
              player.vy = -3; // Knockback up
              player.vx = (player.x + player.width / 2 > animal.x + animal.width / 2 ? 1 : -1) * 4; // Knockback away
              animal.attackCooldown = 60; // 1 second cooldown
              animal.attackTimer = 15;
              attacked = true;
            }
            if (!attacked) {
              for (const other of state.animals) {
                if (other.id !== animal.id && other.type !== AnimalType.LEOPARD && other.type !== AnimalType.JAGUAR && other.type !== AnimalType.BLACK_JAGUAR) {
                  if (isIntersecting(animal, other)) {
                    other.health -= 8;
                    soundEngine.animalSound(other.type);
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
          }
        }
      }

      // Player hurt time update
      if (player.hurtTime > 0) player.hurtTime--;
      if (player.attackTimer && player.attackTimer > 0) player.attackTimer--;

      // Poison logic
      if (player.poisonTimer > 0) {
        player.poisonTimer--;
        player.poisonTick--;
        if (player.poisonTick <= 0) {
          player.health -= 3; // 3 hearts per second
          player.hurtTime = 10;
          player.poisonTick = 60;
        }
      }

      // Check water, cactus, and magma
      let inWater = false;
      let touchingCactus = false;
      let touchingMagma = false;
      let touchingPortal = false;
      const pStartX = Math.floor(player.x / TILE_SIZE);
      const pEndX = Math.floor((player.x + player.width) / TILE_SIZE);
      const pStartY = Math.floor(player.y / TILE_SIZE);
      const pEndY = Math.floor((player.y + player.height) / TILE_SIZE);
      for (let x = pStartX; x <= pEndX; x++) {
        for (let y = pStartY; y <= pEndY; y++) {
          if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
            if (state.world[x][y] === BlockType.WATER || state.world[x][y] === BlockType.MAGMA) inWater = true;
            if (state.world[x][y] === BlockType.CACTUS) touchingCactus = true;
            if (state.world[x][y] === BlockType.MAGMA) touchingMagma = true;
            if (state.world[x][y] === BlockType.COCOA_PORTAL) touchingPortal = true;
          }
        }
      }

      if (touchingPortal) {
        if (player.x < 89000 * TILE_SIZE) {
          player.x = 90000 * TILE_SIZE;
          player.y = (getSurfaceY(90000) - 2) * TILE_SIZE;
          player.vx = 0;
          player.vy = 0;

          const cocoaCatExists = state.animals.some(a => a.type === AnimalType.COCOA_CAT);
          if (!cocoaCatExists && !state.cocoaCatDefeated) {
            const castleStartX = 90030;
            const castleWidth = 80;
            const throneCenterX = castleStartX + Math.floor(castleWidth / 2);
            const castleY = Math.floor(WORLD_HEIGHT / 2);
            const throneSeatY = castleY - 3;
            
            const spawnX = throneCenterX * TILE_SIZE - 60; // Center the 120px wide cat
            const spawnY = throneSeatY * TILE_SIZE - 120; // Place on top of the seat
            
            state.animals.push({
              x: spawnX,
              y: spawnY,
              width: 120,
              height: 120,
              vx: 0,
              vy: 0,
              type: AnimalType.COCOA_CAT,
              id: Math.random(),
              state: 'idle',
              stateTime: 100,
              facing: -1,
              health: 500,
              maxHealth: 500,
              hurtTime: 0,
              attackCooldown: 0,
              launchCooldown: 0,
              attackPattern: 'lunge'
            });
          }
        } else {
          player.x = SPAWN_X * TILE_SIZE;
          player.y = (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE;
          player.vx = 0;
          player.vy = 0;
        }
      }

      const hasFullCocoaArmor = player.inventory[BlockType.COCOA_HELMET] > 0 &&
                                player.inventory[BlockType.COCOA_CHESTPLATE] > 0 &&
                                player.inventory[BlockType.COCOA_LEGGINGS] > 0 &&
                                player.inventory[BlockType.COCOA_BOOTS] > 0;

      if (touchingCactus && player.hurtTime <= 0 && !player.isFlying && !hasFullCocoaArmor) {
        player.health -= 1;
        player.hurtTime = 30;
        player.vy = -3;
        player.vx = (Math.random() > 0.5 ? 1 : -1) * 3;
      }
      
      if (touchingMagma && player.hurtTime <= 0 && !player.isFlying && !hasFullCocoaArmor) {
        player.health -= 2; // Magma hurts more than cactus
        player.hurtTime = 30;
        // No knockback so player can swim out
      }

      // Drowning logic
      let headInWater = false;
      const headY = Math.floor(player.y / TILE_SIZE);
      for (let x = pStartX; x <= pEndX; x++) {
        if (x >= 0 && x < WORLD_WIDTH && headY >= 0 && headY < WORLD_HEIGHT) {
          if (state.world[x][headY] === BlockType.WATER) headInWater = true;
        }
      }

      if (player.breath === undefined) player.breath = 600;
      if (player.maxBreath === undefined) player.maxBreath = 600;

      if (headInWater && !player.isFlying) {
        player.breath--;
        if (player.breath <= 0) {
          player.breath = 0;
          if (state.tick % 60 === 0) {
            player.health -= 1;
            player.hurtTime = 30;
          }
        }
      } else {
        player.breath = player.maxBreath;
      }

      if (player.isFlying) {
        if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -MOVE_SPEED * 2;
        else if (keys['KeyD'] || keys['ArrowRight']) player.vx = MOVE_SPEED * 2;
        else player.vx = 0;

        if (keys['KeyW'] || keys['ArrowUp'] || keys['Space']) player.vy = -MOVE_SPEED * 2;
        else if (keys['KeyS'] || keys['ArrowDown']) player.vy = MOVE_SPEED * 2;
        else player.vy = 0;

        player.x += player.vx;
        if (checkCollision(player)) {
          if (player.vx > 0) player.x = Math.floor((player.x + player.width) / TILE_SIZE) * TILE_SIZE - player.width - 0.01;
          else if (player.vx < 0) player.x = Math.floor(player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          player.vx = 0;
        }

        player.y += player.vy;
        if (checkCollision(player)) {
          if (player.vy > 0) player.y = Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE - player.height - 0.01;
          else if (player.vy < 0) player.y = Math.floor(player.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          player.vy = 0;
        }
        
        player.grounded = false;
        player.fallStartY = undefined;
        player.health = player.maxHealth; // God mode
      } else {
        const speedMultiplier = hasFullCocoaArmor ? 1.5 : 1;
        if (hasFullCocoaArmor) {
          player.health = player.maxHealth;
        }

        // Horizontal movement
        if (keys['KeyA'] || keys['ArrowLeft']) player.vx = -MOVE_SPEED * speedMultiplier * (inWater ? 0.5 : 1);
        else if (keys['KeyD'] || keys['ArrowRight']) player.vx = MOVE_SPEED * speedMultiplier * (inWater ? 0.5 : 1);
        else player.vx = 0;

        // Apply horizontal movement and resolve collisions
        player.x += player.vx;
        if (checkCollision(player)) {
          if (player.vx > 0) {
            player.x = Math.floor((player.x + player.width) / TILE_SIZE) * TILE_SIZE - player.width - 0.01;
          } else if (player.vx < 0) {
            player.x = Math.floor(player.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          }
          player.vx = 0;
        }

        // Vertical movement (Gravity and Jumping)
        if (inWater) {
          player.vy += GRAVITY * 0.2; // Slower gravity in water
          if (player.vy > 2) player.vy = 2; // Terminal velocity in water
        } else {
          player.vy += GRAVITY;
        }

        if (keys['KeyW'] || keys['ArrowUp'] || keys['Space']) {
          if (player.grounded) {
            soundEngine.jump();
            player.vy = JUMP_FORCE * speedMultiplier;
            player.grounded = false;
          } else if (inWater) {
            player.vy = JUMP_FORCE * speedMultiplier * 0.4; // Swim up
          }
        }

        // Track fall start
        if (!player.grounded && player.vy > 0 && player.fallStartY === undefined) {
          player.fallStartY = player.y;
        } else if (player.vy < 0) {
          player.fallStartY = undefined;
        }

        // Apply vertical movement and resolve collisions
        player.y += player.vy;
        player.grounded = false;
        if (checkCollision(player)) {
          if (player.vy > 0) {
            player.y = Math.floor((player.y + player.height) / TILE_SIZE) * TILE_SIZE - player.height - 0.01;
            player.grounded = true;
            
            // Calculate fall damage
            if (player.fallStartY !== undefined) {
              const blocksFallen = (player.y - player.fallStartY) / TILE_SIZE;
              if (blocksFallen > 3 && !hasFullCocoaArmor) {
                const damage = Math.floor(blocksFallen - 3);
                player.health -= damage;
              }
              player.fallStartY = undefined;
            }
          } else if (player.vy < 0) {
            player.y = Math.floor(player.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE + 0.01;
          }
          player.vy = 0;
        }
      }

      // Exhaustion logic
      if (Math.abs(player.vx) > 0 || Math.abs(player.vy) > 0) player.exhaustion += 0.01;
      if (player.exhaustion >= 10) {
        player.exhaustion = 0;
        if (player.hunger > 0) player.hunger -= 1;
      }

      // Tick logic (Healing & Starvation)
      state.tick++;
      state.timeOfDay = (state.timeOfDay + 1) % 7200;
      
      // Update flowers based on time of day and weather
      if (state.tick % 60 === 0) { // Every second
        const isDaytime = state.timeOfDay > 1800 && state.timeOfDay < 5400;
        const isRaining = state.weather === Weather.RAIN || state.weather === Weather.STORM;
        const shouldBloom = isDaytime || isRaining;

        // Scan visible area
        const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE) - 5);
        const endX = Math.min(WORLD_WIDTH - 1, Math.floor((state.camera.x + state.camera.width) / TILE_SIZE) + 5);
        const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE) - 5);
        const endY = Math.min(WORLD_HEIGHT - 1, Math.floor((state.camera.y + state.camera.height) / TILE_SIZE) + 5);

        for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
            const block = state.world[x][y];
            if (block === BlockType.FLOWER_BUD && shouldBloom) {
              if (Math.random() < 0.2) { // 20% chance to bloom per second when conditions are met
                state.world[x][y] = BlockType.FLOWER_BLOOM;
              }
            } else if (block === BlockType.FLOWER_BLOOM && !shouldBloom) {
              if (Math.random() < 0.2) { // 20% chance to close per second when conditions are not met
                state.world[x][y] = BlockType.FLOWER_BUD;
              }
            }
          }
        }
      }

      state.weatherTimer--;
      if (state.weatherTimer <= 0) {
        const rand = Math.random();
        if (rand < 0.6) state.weather = Weather.CLEAR;
        else if (rand < 0.8) state.weather = Weather.RAIN;
        else if (rand < 0.9) state.weather = Weather.SNOW;
        else state.weather = Weather.STORM;
        state.weatherTimer = 3600 + Math.floor(Math.random() * 3600); // 1-2 minutes
      }
      
      if (state.tick % 120 === 0) { // Every 2 seconds
        if (player.hunger >= 9 && player.health < player.maxHealth) {
          player.health += 1;
          player.exhaustion += 5; // Healing costs exhaustion
        } else if (player.hunger === 0) {
          player.health -= 1;
        }
      }

      // Update camera
      state.camera.width = canvas.width;
      state.camera.height = canvas.height;
      state.camera.x = player.x + player.width / 2 - state.camera.width / 2;
      state.camera.y = player.y + player.height / 2 - state.camera.height / 2;

      // Clamp camera to world bounds
      state.camera.x = Math.max(0, Math.min(state.camera.x, WORLD_WIDTH * TILE_SIZE - state.camera.width));
      state.camera.y = Math.max(0, Math.min(state.camera.y, WORLD_HEIGHT * TILE_SIZE - state.camera.height));

      if (player.health < oldHealth) {
        soundEngine.damage();
      }
    };

    const draw = () => {
      const timeProgress = state.timeOfDay / 7200;
      // Shift so 0.5 is noon, 0/1 is midnight
      const sunHeight = Math.cos((timeProgress - 0.5) * Math.PI * 2);

      // Base night sky
      ctx.fillStyle = '#0B0B2A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Day sky overlay
      const dayOpacity = Math.max(0, Math.min(1, sunHeight + 0.5));
      ctx.fillStyle = `rgba(135, 206, 235, ${dayOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Sunset overlay
      const sunsetOpacity = Math.max(0, 1 - Math.abs(sunHeight) * 2.5) * 0.6;
      ctx.fillStyle = `rgba(255, 120, 50, ${sunsetOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Stars
      const starOpacity = Math.max(0, Math.min(1, -sunHeight * 2));
      if (starOpacity > 0) {
        STARS.forEach(star => {
          const twinkle = Math.sin(state.tick * star.twinkleSpeed) * 0.5 + 0.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${starOpacity * (0.5 + twinkle * 0.5)})`;
          ctx.beginPath();
          ctx.arc(star.x * canvas.width, star.y * canvas.height, star.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw Sun and Moon
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height); // Center bottom
      ctx.rotate(timeProgress * Math.PI * 2 + Math.PI); // Rotate based on time
      
      // Sun
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, -canvas.height * 0.8, 40, 0, Math.PI * 2);
      ctx.fill();
      
      // Moon
      ctx.fillStyle = '#F0F8FF';
      ctx.beginPath();
      ctx.arc(0, canvas.height * 0.8, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(-state.camera.x, -state.camera.y);

      // Draw world
      const startX = Math.max(0, Math.floor(state.camera.x / TILE_SIZE));
      const endX = Math.min(WORLD_WIDTH, Math.ceil((state.camera.x + state.camera.width) / TILE_SIZE));
      const startY = Math.max(0, Math.floor(state.camera.y / TILE_SIZE));
      const endY = Math.min(WORLD_HEIGHT, Math.ceil((state.camera.y + state.camera.height) / TILE_SIZE));

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          const block = state.world[x][y];
          if (block !== BlockType.AIR) {
            drawBlock(ctx, x * TILE_SIZE, y * TILE_SIZE, block);
          }
        }
      }

      // Draw dropped items
      for (const item of state.droppedItems) {
        drawBlock(ctx, item.x, item.y, item.type, 16);
      }

      // Draw animals
      for (const animal of state.animals) {
        ctx.save();
        
        // Apply attack animation
        if (animal.attackTimer && animal.attackTimer > 0) {
          const attackProgress = (15 - animal.attackTimer) / 15;
          const lungeDist = Math.sin(attackProgress * Math.PI) * 10;
          ctx.translate(animal.x + animal.width / 2, animal.y + animal.height / 2);
          ctx.translate(lungeDist * animal.facing, 0);
          ctx.translate(-(animal.x + animal.width / 2), -(animal.y + animal.height / 2));
        }

        if (animal.hurtTime > 0) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = (animal.poisonTimer && animal.poisonTimer > 0) ? '#4CAF50' : 'red';
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          ctx.globalAlpha = 1;
        } else if (animal.poisonTimer && animal.poisonTimer > 0) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          ctx.globalAlpha = 1;
        }

        if (animal.type === AnimalType.PIG) {
          ctx.fillStyle = '#F8BBD0'; // Pink body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          ctx.fillStyle = '#F48FB1'; // Snout
          const snoutX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
          ctx.fillRect(snoutX, animal.y + 4, 4, 8);
          ctx.fillStyle = 'black'; // Eye
          const eyeX = animal.facing === 1 ? animal.x + animal.width - 6 : animal.x + 4;
          ctx.fillRect(eyeX, animal.y + 2, 2, 2);
        } else if (animal.type === AnimalType.COW) {
          ctx.fillStyle = 'white'; // Body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          ctx.fillStyle = 'black'; // Spots
          ctx.fillRect(animal.x + 4, animal.y + 4, 6, 6);
          ctx.fillRect(animal.x + 14, animal.y + 10, 8, 6);
          ctx.fillStyle = '#D7CCC8'; // Snout
          const snoutX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
          ctx.fillRect(snoutX, animal.y + 4, 4, 10);
          ctx.fillStyle = 'black'; // Eye
          const eyeX = animal.facing === 1 ? animal.x + animal.width - 6 : animal.x + 4;
          ctx.fillRect(eyeX, animal.y + 2, 2, 2);
        } else if (animal.type === AnimalType.CHICKEN) {
          ctx.fillStyle = 'white'; // Body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          ctx.fillStyle = 'red'; // Comb
          const combX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
          ctx.fillRect(combX, animal.y - 2, 4, 2);
          ctx.fillStyle = 'orange'; // Beak
          const beakX = animal.facing === 1 ? animal.x + animal.width : animal.x - 2;
          ctx.fillRect(beakX, animal.y + 2, 2, 2);
          ctx.fillStyle = 'black'; // Eye
          const eyeX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x + 2;
          ctx.fillRect(eyeX, animal.y + 2, 2, 2);
        } else if (animal.type === AnimalType.SNAKE || animal.type === AnimalType.STRIPED_SNAKE || animal.type === AnimalType.TIGER_SNAKE) {
          // Draw a segmented snake body
          const segments = 5;
          const segmentWidth = animal.width / segments;
          
          for (let s = 0; s < segments; s++) {
            // Calculate wiggle for each segment to make it slither
            const segmentX = animal.facing === 1 ? animal.x + s * segmentWidth : animal.x + animal.width - (s + 1) * segmentWidth;
            const wiggle = Math.sin((animal.x + s * 4) * 0.2) * 2;
            
            // Alternating colors for pattern
            if (animal.type === AnimalType.STRIPED_SNAKE) {
              const colors = ['#000000', '#FF0000', '#FFFF00'];
              ctx.fillStyle = colors[s % colors.length];
            } else if (animal.type === AnimalType.TIGER_SNAKE) {
              const colors = ['#FF8C00', '#000000']; // Orange and black
              ctx.fillStyle = colors[s % colors.length];
            } else {
              ctx.fillStyle = s % 2 === 0 ? '#2E7D32' : '#4CAF50'; // Dark green / light green
            }
            
            // Head is slightly larger
            if (s === (animal.facing === 1 ? segments - 1 : 0)) {
              ctx.fillRect(segmentX, animal.y + wiggle - 1, segmentWidth + 2, animal.height + 2);
              
              // Eyes
              ctx.fillStyle = animal.type === AnimalType.STRIPED_SNAKE ? 'white' : 'black';
              const eyeX = animal.facing === 1 ? segmentX + segmentWidth - 2 : segmentX + 2;
              ctx.fillRect(eyeX, animal.y + wiggle + 1, 2, 2);
              
              // Tongue
              if (Math.random() > 0.9) {
                ctx.fillStyle = 'red';
                const tongueX = animal.facing === 1 ? segmentX + segmentWidth + 2 : segmentX - 4;
                ctx.fillRect(tongueX, animal.y + wiggle + 3, 4, 1);
                // Forked part
                ctx.fillRect(tongueX + (animal.facing === 1 ? 4 : -1), animal.y + wiggle + 2, 1, 3);
              }
            } else {
              // Body segments
              ctx.fillRect(segmentX, animal.y + wiggle, segmentWidth + 1, animal.height);
            }
          }
        } else if (animal.type === AnimalType.ANT) {
          ctx.fillStyle = '#212121'; // Black body
          // Draw 3 small segments
          const segW = animal.width / 3;
          ctx.fillRect(animal.x, animal.y, segW - 1, animal.height);
          ctx.fillRect(animal.x + segW, animal.y, segW - 1, animal.height);
          ctx.fillRect(animal.x + segW * 2, animal.y, segW - 1, animal.height);
        } else if (animal.type === AnimalType.BIRD) {
          ctx.fillStyle = '#3498db'; // Blue bird
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          // Beak
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(animal.x + animal.width, animal.y + 2, 4, 4);
          // Wing
          ctx.fillStyle = '#2980b9';
          ctx.fillRect(animal.x + 2, animal.y + 2, 6, 4);
        } else if (animal.type === AnimalType.FISH) {
          ctx.fillStyle = '#e67e22'; // Orange fish
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          // Tail
          ctx.beginPath();
          ctx.moveTo(animal.x, animal.y + animal.height / 2);
          ctx.lineTo(animal.x - 4, animal.y);
          ctx.lineTo(animal.x - 4, animal.y + animal.height);
          ctx.fill();
        } else if (animal.type === AnimalType.ORCA) {
          ctx.fillStyle = '#111'; // Black body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          // White patches
          ctx.fillStyle = '#fff';
          ctx.fillRect(animal.x + 8, animal.y + animal.height - 8, 16, 8); // Belly
          ctx.fillRect(animal.x + animal.width - 12, animal.y + 4, 6, 6); // Eye patch
          // Dorsal fin
          ctx.fillStyle = '#111';
          ctx.beginPath();
          ctx.moveTo(animal.x + 16, animal.y);
          ctx.lineTo(animal.x + 24, animal.y - 12);
          ctx.lineTo(animal.x + 28, animal.y);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(animal.x, animal.y + animal.height / 2);
          ctx.lineTo(animal.x - 8, animal.y + 4);
          ctx.lineTo(animal.x - 8, animal.y + animal.height - 4);
          ctx.fill();
        } else if (animal.type === AnimalType.DOLPHIN) {
          ctx.fillStyle = '#7f8c8d'; // Gray body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          // Light belly
          ctx.fillStyle = '#bdc3c7';
          ctx.fillRect(animal.x + 4, animal.y + animal.height - 6, animal.width - 8, 6);
          // Dorsal fin
          ctx.fillStyle = '#7f8c8d';
          ctx.beginPath();
          ctx.moveTo(animal.x + 12, animal.y);
          ctx.lineTo(animal.x + 18, animal.y - 8);
          ctx.lineTo(animal.x + 22, animal.y);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(animal.x, animal.y + animal.height / 2);
          ctx.lineTo(animal.x - 6, animal.y + 2);
          ctx.lineTo(animal.x - 6, animal.y + animal.height - 2);
          ctx.fill();
        } else if (animal.type === AnimalType.SHARK) {
          ctx.fillStyle = '#576574'; // Dark gray body
          ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
          // Light belly
          ctx.fillStyle = '#c8d6e5';
          ctx.fillRect(animal.x + 4, animal.y + animal.height - 6, animal.width - 8, 6);
          // Dorsal fin
          ctx.fillStyle = '#576574';
          ctx.beginPath();
          ctx.moveTo(animal.x + 16, animal.y);
          ctx.lineTo(animal.x + 20, animal.y - 10);
          ctx.lineTo(animal.x + 26, animal.y);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(animal.x, animal.y + animal.height / 2);
          ctx.lineTo(animal.x - 8, animal.y);
          ctx.lineTo(animal.x - 8, animal.y + animal.height);
          ctx.fill();
          // Teeth
          ctx.fillStyle = '#fff';
          ctx.fillRect(animal.x + animal.width - 6, animal.y + animal.height - 4, 2, 2);
          ctx.fillRect(animal.x + animal.width - 3, animal.y + animal.height - 4, 2, 2);
        } else if (animal.type === AnimalType.LEOPARD || animal.type === AnimalType.JAGUAR || animal.type === AnimalType.BLACK_JAGUAR || animal.type === AnimalType.COCOA_CAT) {
          // Base color
          if (animal.type === AnimalType.LEOPARD) ctx.fillStyle = '#F5DEB3'; // Light tan/yellow
          else if (animal.type === AnimalType.JAGUAR) ctx.fillStyle = '#E69A28'; // Rich orange-tan
          else if (animal.type === AnimalType.COCOA_CAT) ctx.fillStyle = '#654321'; // Brown Siberian Cat
          else ctx.fillStyle = '#111111'; // Deep Black
          
          // Body
          ctx.beginPath();
          ctx.roundRect(animal.x, animal.y, animal.width, animal.height, 4);
          ctx.fill();
          
          // Spots (Rosettes for Jaguar, solid spots for Leopard)
          if (animal.type !== AnimalType.BLACK_JAGUAR) {
            ctx.fillStyle = animal.type === AnimalType.COCOA_CAT ? '#3d2611' : '#222222';
            const spotSize = animal.type === AnimalType.JAGUAR ? 4 : (animal.type === AnimalType.COCOA_CAT ? 12 : 3);
            
            // Draw spots
            let spots = [
              {x: 4, y: 4}, {x: 12, y: 8}, {x: 20, y: 3}, {x: 8, y: 12}, 
              {x: 16, y: 14}, {x: 24, y: 10}, {x: 28, y: 4}
            ];
            if (animal.type === AnimalType.COCOA_CAT) {
              spots = [
                {x: 15, y: 20}, {x: 45, y: 15}, {x: 80, y: 25}, {x: 105, y: 15},
                {x: 25, y: 50}, {x: 60, y: 45}, {x: 95, y: 55},
                {x: 15, y: 80}, {x: 50, y: 85}, {x: 85, y: 75}, {x: 105, y: 85},
                {x: 35, y: 105}, {x: 75, y: 100}
              ];
            }
            
            spots.forEach(spot => {
              if (spot.x < animal.width - (animal.type === AnimalType.COCOA_CAT ? 10 : 4)) {
                ctx.beginPath();
                ctx.arc(animal.x + spot.x, animal.y + spot.y, spotSize/2, 0, Math.PI * 2);
                ctx.fill();
                
                // Jaguars have spots inside their rosettes
                if (animal.type === AnimalType.JAGUAR) {
                  ctx.fillStyle = '#E69A28'; // Inner color
                  ctx.beginPath();
                  ctx.arc(animal.x + spot.x, animal.y + spot.y, spotSize/4, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = '#222222'; // Reset to black for next spot
                }
              }
            });
          } else {
             // Subtle spots for black jaguar (melanistic)
             ctx.fillStyle = '#000000';
             const spots = [
              {x: 4, y: 4}, {x: 12, y: 8}, {x: 20, y: 3}, {x: 8, y: 12}, 
              {x: 16, y: 14}, {x: 24, y: 10}, {x: 28, y: 4}
            ];
            spots.forEach(spot => {
              if (spot.x < animal.width - 4) {
                ctx.beginPath();
                ctx.arc(animal.x + spot.x, animal.y + spot.y, 2, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
          
          // Head
          const headX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x - 8;
          
          if (animal.type === AnimalType.LEOPARD) ctx.fillStyle = '#F5DEB3';
          else if (animal.type === AnimalType.JAGUAR) ctx.fillStyle = '#E69A28';
          else if (animal.type === AnimalType.COCOA_CAT) ctx.fillStyle = '#654321';
          else ctx.fillStyle = '#111111';
          
          ctx.beginPath();
          ctx.roundRect(headX, animal.y - 6, animal.type === AnimalType.COCOA_CAT ? 60 : 12, animal.type === AnimalType.COCOA_CAT ? 50 : 10, 3);
          ctx.fill();
          
          // Ears
          ctx.beginPath();
          ctx.arc(headX + (animal.type === AnimalType.COCOA_CAT ? 10 : 2), animal.y - 6, animal.type === AnimalType.COCOA_CAT ? 15 : 3, Math.PI, 0);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(headX + (animal.type === AnimalType.COCOA_CAT ? 50 : 10), animal.y - 6, animal.type === AnimalType.COCOA_CAT ? 15 : 3, Math.PI, 0);
          ctx.fill();
          
          // Snout
          ctx.fillStyle = animal.type === AnimalType.BLACK_JAGUAR ? '#222222' : '#FFFFFF';
          const snoutX = animal.facing === 1 ? headX + 8 : headX;
          ctx.fillRect(snoutX, animal.y - 1, 4, 4);
          
          // Nose
          ctx.fillStyle = '#000000';
          const noseX = animal.facing === 1 ? headX + 10 : headX;
          ctx.fillRect(noseX, animal.y - 1, 2, 2);
          
          // Eye
          ctx.fillStyle = animal.type === AnimalType.BLACK_JAGUAR ? '#FFD700' : '#000000'; // Yellow eyes for black jaguar
          const eyeX = animal.facing === 1 ? headX + 6 : headX + 4;
          ctx.fillRect(eyeX, animal.y - 4, 2, 2);
          
          // Collar if tamed
          if (animal.tamed) {
            ctx.fillStyle = '#FF0000'; // Red collar
            ctx.fillRect(headX, animal.y + 2, 12, 2);
          }
          
          // Legs
          ctx.fillStyle = animal.type === AnimalType.LEOPARD ? '#DEB887' : animal.type === AnimalType.JAGUAR ? '#CD853F' : animal.type === AnimalType.COCOA_CAT ? '#4a3118' : '#0A0A0A';
          const legOffset = animal.state === 'walking' ? Math.sin(Date.now() / 100) * (animal.type === AnimalType.COCOA_CAT ? 20 : 4) : 0;
          
          const legWidth = animal.type === AnimalType.COCOA_CAT ? 20 : 4;
          const legHeight = animal.type === AnimalType.COCOA_CAT ? 40 : 8;
          const legSpacing1 = animal.type === AnimalType.COCOA_CAT ? 40 : 8;
          const legSpacing2 = animal.type === AnimalType.COCOA_CAT ? 70 : 14;
          const legSpacing3 = animal.type === AnimalType.COCOA_CAT ? 20 : 4;
          const legSpacing4 = animal.type === AnimalType.COCOA_CAT ? 50 : 10;

          // Front legs
          ctx.fillRect(animal.facing === 1 ? animal.x + animal.width - legSpacing1 + legOffset : animal.x + legSpacing3 + legOffset, animal.y + animal.height, legWidth, legHeight);
          ctx.fillRect(animal.facing === 1 ? animal.x + animal.width - legSpacing2 - legOffset : animal.x + legSpacing4 - legOffset, animal.y + animal.height, legWidth, legHeight);
          
          // Back legs
          ctx.fillRect(animal.facing === 1 ? animal.x + legSpacing3 - legOffset : animal.x + animal.width - legSpacing1 - legOffset, animal.y + animal.height, legWidth, legHeight);
          ctx.fillRect(animal.facing === 1 ? animal.x + legSpacing4 + legOffset : animal.x + animal.width - legSpacing2 + legOffset, animal.y + animal.height, legWidth, legHeight);
          
          // Tail
          if (animal.type === AnimalType.LEOPARD) ctx.fillStyle = '#F5DEB3';
          else if (animal.type === AnimalType.JAGUAR) ctx.fillStyle = '#E69A28';
          else if (animal.type === AnimalType.COCOA_CAT) ctx.fillStyle = '#654321';
          else ctx.fillStyle = '#111111';
          
          const tailX = animal.facing === 1 ? animal.x - 2 : animal.x + animal.width + 2;
          
          ctx.beginPath();
          ctx.moveTo(tailX, animal.y + 2);
          
          // Tail animation
          const tailSway = animal.state === 'walking' ? Math.sin(Date.now() / 150) * (animal.type === AnimalType.COCOA_CAT ? 20 : 4) : Math.sin(Date.now() / 500) * (animal.type === AnimalType.COCOA_CAT ? 10 : 2);
          const tailLength = animal.type === AnimalType.COCOA_CAT ? 60 : 12;
          
          if (animal.facing === 1) {
            ctx.quadraticCurveTo(tailX - (animal.type === AnimalType.COCOA_CAT ? 40 : 8), animal.y + 2, tailX - tailLength + tailSway, animal.y + (animal.type === AnimalType.COCOA_CAT ? 50 : 10));
          } else {
            ctx.quadraticCurveTo(tailX + (animal.type === AnimalType.COCOA_CAT ? 40 : 8), animal.y + 2, tailX + tailLength + tailSway, animal.y + (animal.type === AnimalType.COCOA_CAT ? 50 : 10));
          }
          
          ctx.lineWidth = animal.type === AnimalType.COCOA_CAT ? 15 : 3;
          ctx.strokeStyle = ctx.fillStyle;
          ctx.stroke();
          
          // Tail tip
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          if (animal.facing === 1) {
            ctx.arc(tailX - tailLength + tailSway, animal.y + (animal.type === AnimalType.COCOA_CAT ? 50 : 10), animal.type === AnimalType.COCOA_CAT ? 10 : 2, 0, Math.PI * 2);
          } else {
            ctx.arc(tailX + tailLength + tailSway, animal.y + (animal.type === AnimalType.COCOA_CAT ? 50 : 10), animal.type === AnimalType.COCOA_CAT ? 10 : 2, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.lineWidth = 1;
        }
        
        // Health bar removed per user request
        
        ctx.restore();
      }

      // Draw player
      ctx.save();
      if (state.player.hurtTime > 0) {
        ctx.globalAlpha = 0.7;
        // Flash green if poisoned, otherwise red
        ctx.fillStyle = state.player.poisonTimer > 0 ? '#4CAF50' : 'red';
        ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
        ctx.globalAlpha = 1;
      } else if (state.player.poisonTimer > 0) {
        // Slight green tint when poisoned
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);
        ctx.globalAlpha = 1;
      }

      // Body
      ctx.fillStyle = state.player.inventory[BlockType.COCOA_CHESTPLATE] > 0 ? '#654321' : '#1565C0'; // Blue shirt or Cocoa Chestplate
      ctx.fillRect(state.player.x, state.player.y + 16, state.player.width, state.player.height - 32);
      // Legs
      ctx.fillStyle = state.player.inventory[BlockType.COCOA_LEGGINGS] > 0 ? '#4a3118' : '#424242'; // Dark pants or Cocoa Leggings
      ctx.fillRect(state.player.x + 2, state.player.y + state.player.height - 16, 8, 16);
      ctx.fillRect(state.player.x + state.player.width - 10, state.player.y + state.player.height - 16, 8, 16);
      // Head
      ctx.fillStyle = state.player.inventory[BlockType.COCOA_HELMET] > 0 ? '#654321' : '#FFCCBC'; // Skin tone or Cocoa Helmet
      ctx.fillRect(state.player.x + 2, state.player.y, state.player.width - 4, 16);
      
      // Boots
      if (state.player.inventory[BlockType.COCOA_BOOTS] > 0) {
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(state.player.x + 2, state.player.y + state.player.height - 4, 8, 4);
        ctx.fillRect(state.player.x + state.player.width - 10, state.player.y + state.player.height - 4, 8, 4);
      }

      // Cocoa Helmet Ears
      if (state.player.inventory[BlockType.COCOA_HELMET] > 0) {
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.arc(state.player.x + 6, state.player.y, 4, Math.PI, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(state.player.x + state.player.width - 6, state.player.y, 4, Math.PI, 0);
        ctx.fill();
      }
      
      // Player eyes
      ctx.fillStyle = '#000';
      const facingRight = state.mouse.x + state.camera.x > state.player.x + state.player.width / 2;
      const eyeOffsetX = facingRight ? 12 : 4;
      ctx.fillRect(state.player.x + eyeOffsetX, state.player.y + 4, 4, 4);
      ctx.fillRect(state.player.x + eyeOffsetX + (facingRight ? 4 : 4), state.player.y + 4, 4, 4);

      // Draw arms and held item
      const armPlayerCenterX = state.player.x + state.player.width / 2;
      const armPlayerCenterY = state.player.y + state.player.height / 2;
      const mouseWorldX = state.mouse.x + state.camera.x;
      const mouseWorldY = state.mouse.y + state.camera.y;
      
      const isFacingRight = mouseWorldX > armPlayerCenterX;

      ctx.save();
      ctx.translate(armPlayerCenterX, armPlayerCenterY);
      
      // Arm doesn't swing, just points left or right
      if (!isFacingRight) {
        ctx.scale(-1, 1);
      }
      
      // Apply attack animation rotation
      if (state.player.attackTimer && state.player.attackTimer > 0) {
        const attackProgress = (15 - state.player.attackTimer) / 15;
        // Swing down and back up
        const swingAngle = Math.sin(attackProgress * Math.PI) * (Math.PI / 2);
        ctx.rotate(swingAngle);
      }
      
      // Draw arm (T-shirt sleeve + skin)
      ctx.fillStyle = '#1565C0'; // T-shirt sleeve
      ctx.fillRect(-4, -4, 10, 8);
      ctx.fillStyle = '#FFCCBC'; // Skin tone
      ctx.fillRect(6, -4, 10, 8);
      
      // Draw held item at the bottom of the arms
      if (state.selectedBlock !== BlockType.AIR && state.selectedBlock !== BlockType.DIRT && (state.player.inventory[state.selectedBlock] || 0) > 0) {
        ctx.translate(12, 4); // Move to end of arm, slightly down
        ctx.rotate(Math.PI / 4); // Rotate so it looks like it's being held forward
        // Draw the item
        drawBlock(ctx, -8, -16, state.selectedBlock, 24); // Draw slightly larger and offset
      }
      
      ctx.restore();
      ctx.restore();

      // Draw mining progress
      if (state.mining.progress > 0 && state.mining.x !== -1) {
        const type = state.world[state.mining.x][state.mining.y];
        const hasItem = (state.player.inventory[state.selectedBlock] || 0) > 0;
        const { requiredProgress } = getRequiredProgress(type, state.selectedBlock, hasItem, state.player.isFlying);
        const progressRatio = Math.min(1, state.mining.progress / requiredProgress);
        ctx.fillStyle = `rgba(0, 0, 0, ${progressRatio * 0.5})`;
        ctx.fillRect(state.mining.x * TILE_SIZE, state.mining.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(state.mining.x * TILE_SIZE + TILE_SIZE/2, state.mining.y * TILE_SIZE + TILE_SIZE/2);
        ctx.lineTo(state.mining.x * TILE_SIZE + TILE_SIZE * progressRatio, state.mining.y * TILE_SIZE + TILE_SIZE * progressRatio);
        ctx.stroke();
      }

      // Draw player health bar
      if (state.player.health < state.player.maxHealth) {
        const healthRatio = Math.max(0, state.player.health / state.player.maxHealth);
        ctx.fillStyle = 'red';
        ctx.fillRect(state.player.x, state.player.y - 8, state.player.width, 4);
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(state.player.x, state.player.y - 8, state.player.width * healthRatio, 4);
      }

      // Draw highlight block
      const worldX = state.mouse.x + state.camera.x;
      const worldY = state.mouse.y + state.camera.y;
      const gridX = Math.floor(worldX / TILE_SIZE);
      const gridY = Math.floor(worldY / TILE_SIZE);
      
      const playerCenterX = state.player.x + state.player.width / 2;
      const playerCenterY = state.player.y + state.player.height / 2;
      const dist = Math.sqrt(Math.pow(worldX - playerCenterX, 2) + Math.pow(worldY - playerCenterY, 2));

      const currentReach = state.selectedBlock === BlockType.FANG_LANCE ? REACH * 1.5 : REACH;

      if (dist <= currentReach && gridX >= 0 && gridX < WORLD_WIDTH && gridY >= 0 && gridY < WORLD_HEIGHT) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(gridX * TILE_SIZE, gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }

      ctx.restore();

      // Ambient Darkness (Multiply Blend Mode)
      const darkness = Math.max(0, Math.min(1, -sunHeight * 1.2 + 0.2));
      if (darkness > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const r = Math.floor(255 - darkness * (255 - 100));
        const g = Math.floor(255 - darkness * (255 - 100));
        const b = Math.floor(255 - darkness * (255 - 150));
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Draw weather
      if (state.weather !== Weather.CLEAR) {
        ctx.save();
        const isSnow = state.weather === Weather.SNOW;
        const isStorm = state.weather === Weather.STORM;
        
        // Darken sky
        ctx.fillStyle = isStorm ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Particles
        ctx.fillStyle = isSnow ? 'white' : 'rgba(150, 200, 255, 0.6)';
        const particleCount = isStorm ? 200 : 100;
        for (let i = 0; i < particleCount; i++) {
          // Pseudo-random based on tick and i
          const px = ((i * 137 + state.tick * (isSnow ? 1 : 15)) % canvas.width);
          const py = ((i * 93 + state.tick * (isSnow ? 2 : 25)) % canvas.height);
          
          if (isSnow) {
            ctx.fillRect(px, py, 3, 3);
          } else {
            ctx.fillRect(px, py, 2, 12);
          }
        }
        
        // Lightning
        if (isStorm && Math.random() < 0.01) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.restore();
      }
    };

    const loop = () => {
      frameCount++;
      const isSlowMo = state.keys['KeyV'];
      
      // Update at full speed normally, or 1/4 speed if holding V
      if (!isSlowMo || frameCount % 4 === 0) {
        update();
      }
      
      draw();
      
      // Add a visual indicator for slow motion
      if (isSlowMo) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'rgba(0, 150, 255, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '20px monospace';
            ctx.fillText('SLOW MOTION', 20, 120);
          }
        }
      }
      
      if (state.tick % 5 === 0) {
        setStats(prev => {
          const daysPlayed = Math.floor(state.tick / 7200);
          if (prev.health !== state.player.health || prev.hunger !== state.player.hunger || prev.daysPlayed !== daysPlayed) {
            return { health: state.player.health, hunger: state.player.hunger, daysPlayed };
          }
          return prev;
        });
      }

      // Check for durability resets
      for (const [typeStr, count] of Object.entries(state.player.inventory)) {
        const type = parseInt(typeStr);
        if ((count as number) > 0 && state.player.durability[type] === 0 && MAX_DURABILITY[type]) {
          state.player.durability[type] = MAX_DURABILITY[type];
          state.invChanged = true;
        }
      }

      if (state.invChanged) {
        setInventory({ ...state.player.inventory });
        setDurability({ ...state.player.durability });
        setDiscoveredItems({ ...state.discoveredItems });
        state.invChanged = false;
      }

      if (state.isDead) {
        setIsDead(prev => prev ? prev : true);
      } else {
        setIsDead(prev => prev ? false : prev);
      }

      setAutoRespawn(prev => prev !== state.autoRespawn ? state.autoRespawn : prev);

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

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

  const handleRespawn = () => {
    const state = gameState.current;
    state.player.health = state.player.maxHealth;
    state.player.hunger = state.player.maxHunger;
    state.player.exhaustion = 0;
    state.player.x = SPAWN_X * TILE_SIZE;
    state.player.y = (getSurfaceY(SPAWN_X) - 2) * TILE_SIZE;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.fallStartY = undefined;
    state.isDead = false;
    setIsDead(false);
    setStats({ health: state.player.health, hunger: state.player.hunger });
    
    if (canvasRef.current) {
      canvasRef.current.focus();
    }
  };

  const handleInventoryClick = (e: React.MouseEvent, type: BlockType) => {
    e.preventDefault();
    const isRightClick = e.button === 2 || e.type === 'contextmenu';
    
    if (cursorItem) {
      if (cursorItem.type === type) {
        const maxStack = getMaxStack(type);
        setInventory(prev => {
          const currentAmount = prev[type] || 0;
          const availableSpace = maxStack - currentAmount;
          if (availableSpace <= 0) return prev;

          const amountToAdd = isRightClick ? 1 : cursorItem.count;
          const actualAmount = Math.min(amountToAdd, availableSpace);

          const newInv = { ...prev, [type]: currentAmount + actualAmount };
          gameState.current.player.inventory = { ...newInv };
          
          setCursorItem(prevCursor => prevCursor ? (prevCursor.count === actualAmount ? null : { ...prevCursor, count: prevCursor.count - actualAmount }) : null);
          return newInv;
        });
      } else {
        setInventory(prev => {
          const newInv = { ...prev };
          const maxCursorStack = getMaxStack(cursorItem.type);
          const currentCursorInv = newInv[cursorItem.type] || 0;
          const spaceForCursor = maxCursorStack - currentCursorInv;
          
          const amountToReturn = Math.min(cursorItem.count, spaceForCursor);
          newInv[cursorItem.type] = currentCursorInv + amountToReturn;
          
          if (amountToReturn === cursorItem.count) {
            const pickupAmount = isRightClick ? Math.ceil((newInv[type] || 0) / 2) : (newInv[type] || 0);
            if (pickupAmount > 0) {
              newInv[type] -= pickupAmount;
              setCursorItem({ type, count: pickupAmount });
            } else {
              setCursorItem(null);
            }
          } else {
            setCursorItem({ type: cursorItem.type, count: cursorItem.count - amountToReturn });
          }
          
          gameState.current.player.inventory = { ...newInv };
          return newInv;
        });
      }
    } else {
      setInventory(prev => {
        const amount = prev[type] || 0;
        if (amount === 0) return prev;
        const pickupAmount = isRightClick ? Math.ceil(amount / 2) : amount;
        setCursorItem({ type, count: pickupAmount });
        const newInv = { ...prev, [type]: amount - pickupAmount };
        gameState.current.player.inventory = { ...newInv };
        return newInv;
      });
    }
  };

  const handleCraftingGridClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const isRightClick = e.button === 2 || e.type === 'contextmenu';
    
    setCraftingGrid(prev => {
      const newGrid = [...prev];
      const currentSlot = newGrid[index];
      
      if (cursorItem) {
        if (currentSlot === null) {
          const amount = isRightClick ? 1 : cursorItem.count;
          newGrid[index] = { type: cursorItem.type, count: amount };
          setCursorItem(prevCursor => prevCursor ? (prevCursor.count === amount ? null : { ...prevCursor, count: prevCursor.count - amount }) : null);
        } else if (currentSlot.type === cursorItem.type) {
          const maxStack = getMaxStack(cursorItem.type);
          const availableSpace = maxStack - currentSlot.count;
          if (availableSpace <= 0) return prev;
          
          const amount = Math.min(isRightClick ? 1 : cursorItem.count, availableSpace);
          newGrid[index] = { ...currentSlot, count: currentSlot.count + amount };
          setCursorItem(prevCursor => prevCursor ? (prevCursor.count === amount ? null : { ...prevCursor, count: prevCursor.count - amount }) : null);
        } else {
          newGrid[index] = { type: cursorItem.type, count: cursorItem.count };
          setCursorItem({ type: currentSlot.type, count: currentSlot.count });
        }
      } else {
        if (currentSlot !== null) {
          const amount = isRightClick ? Math.ceil(currentSlot.count / 2) : currentSlot.count;
          setCursorItem({ type: currentSlot.type, count: amount });
          if (amount === currentSlot.count) {
            newGrid[index] = null;
          } else {
            newGrid[index] = { ...currentSlot, count: currentSlot.count - amount };
          }
        }
      }
      return newGrid;
    });
  };

  const handleFurnaceClick = (e: React.MouseEvent, slotType: 'input' | 'fuel' | 'output') => {
    e.preventDefault();
    if (!openFurnaceId) return;
    const isRightClick = e.button === 2 || e.type === 'contextmenu';
    
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
        // Validate input
        if (slotType === 'input' && cursorItem.type !== BlockType.MEAT && cursorItem.type !== BlockType.BEEF && cursorItem.type !== BlockType.PORK && cursorItem.type !== BlockType.CHICKEN_MEAT && cursorItem.type !== BlockType.FISH_MEAT && cursorItem.type !== BlockType.IRON_ORE && cursorItem.type !== BlockType.GOLD_ORE) return;
        if (slotType === 'fuel' && ![BlockType.PLANKS, BlockType.WOOD, BlockType.PINE_WOOD, BlockType.PALM_WOOD, BlockType.COAL].includes(cursorItem.type)) return;

        if (currentSlot === null) {
          const amount = isRightClick ? 1 : cursorItem.count;
          furnace[slotType] = { type: cursorItem.type, count: amount };
          setCursorItem(prev => prev ? (prev.count === amount ? null : { ...prev, count: prev.count - amount }) : null);
        } else if (currentSlot.type === cursorItem.type) {
          const maxStack = getMaxStack(cursorItem.type);
          const availableSpace = maxStack - currentSlot.count;
          if (availableSpace <= 0) return;
          const amount = Math.min(isRightClick ? 1 : cursorItem.count, availableSpace);
          furnace[slotType] = { ...currentSlot, count: currentSlot.count + amount };
          setCursorItem(prev => prev ? (prev.count === amount ? null : { ...prev, count: prev.count - amount }) : null);
        } else {
          furnace[slotType] = { type: cursorItem.type, count: cursorItem.count };
          setCursorItem({ type: currentSlot.type, count: currentSlot.count });
        }
      } else if (currentSlot) {
        const pickupAmount = isRightClick ? Math.ceil(currentSlot.count / 2) : currentSlot.count;
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

  const handleCraftingResultClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const result = checkCrafting(craftingGrid);
    if (!result) return;
    
    if (cursorItem) {
      if (cursorItem.type === result.type) {
        const maxStack = getMaxStack(result.type);
        if (cursorItem.count + result.count > maxStack) return; // Can't craft, stack full
        setCursorItem(prev => prev ? ({ ...prev, count: prev.count + result.count }) : null);
      } else {
        return; // Can't craft if cursor has different item
      }
    } else {
      setCursorItem({ type: result.type, count: result.count });
    }
    
    setDiscoveredItems(prev => ({ ...prev, [result.type]: true }));
    gameState.current.discoveredItems[result.type] = true;
    
    // Consume 1 from each slot
    setCraftingGrid(prev => prev.map(slot => {
      if (slot === null) return null;
      if (slot.count === 1) return null;
      return { ...slot, count: slot.count - 1 };
    }));
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && isInventoryOpen) {
        const hovered = hoveredSlotRef.current;
        if (hovered && hovered.type === 'inventory') {
          const blockType = hovered.block;
          const count = inventory[blockType] || 0;
          if (count > 0) {
            const moveAmount = count > 1 ? Math.floor(count / 2) : 1;
            
            let targetIndex = craftingGrid.findIndex(slot => slot && slot.type === blockType);
            if (targetIndex === -1) {
              targetIndex = craftingGrid.findIndex(slot => slot === null);
            }

            if (targetIndex !== -1) {
              setCraftingGrid(prev => {
                const newGrid = [...prev];
                const existing = newGrid[targetIndex];
                newGrid[targetIndex] = {
                  type: blockType,
                  count: (existing ? existing.count : 0) + moveAmount
                };
                return newGrid;
              });

              setInventory(prev => {
                const newInv = { ...prev, [blockType]: prev[blockType] - moveAmount };
                gameState.current.player.inventory = { ...newInv };
                return newInv;
              });
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isInventoryOpen, cursorItem, inventory, craftingGrid, discoveredItems]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {isDead && (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
          <h1 className="text-6xl font-bold text-white mb-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">You Died!</h1>
          <button 
            onClick={handleRespawn}
            className="px-8 py-4 bg-white text-red-900 text-2xl font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-lg"
          >
            Respawn
          </button>
        </div>
      )}

      {isInventoryOpen && (
        <div 
          className="absolute inset-0 bg-black/60 flex items-center justify-center z-40 backdrop-blur-sm" 
          onContextMenu={e => e.preventDefault()}
          onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
        >
          <div className="bg-[#C6C6C6] p-6 rounded-lg shadow-2xl border-4 border-[#555] flex gap-12">
            {/* Left: Inventory */}
            <div>
              <h2 className="text-[#373737] font-bold mb-2 text-xl">Inventory</h2>
              <div className="grid grid-cols-4 gap-2">
                {INVENTORY_BLOCKS.map(block => (
                  <div 
                    key={block}
                    className="w-16 h-16 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                    onMouseDown={(e) => discoveredItems[block] ? handleInventoryClick(e, block) : undefined}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseEnter={() => hoveredSlotRef.current = { type: 'inventory', block }}
                    onMouseLeave={() => hoveredSlotRef.current = null}
                  >
                    {discoveredItems[block] && (
                      <>
                        <BlockIcon type={block} />
                        {inventory[block] > 0 && (
                          <span className={`absolute ${MAX_DURABILITY[block] ? 'bottom-1.5' : 'bottom-0'} right-1 text-white text-sm font-bold drop-shadow-md z-10`}>{inventory[block]}</span>
                        )}
                        {MAX_DURABILITY[block] && inventory[block] > 0 && (
                          <div className="absolute bottom-0 left-1 right-1 h-1 bg-black/50 z-20">
                            <div className={`h-full ${durability[block] / MAX_DURABILITY[block] > 0.5 ? 'bg-green-500' : durability[block] / MAX_DURABILITY[block] > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(durability[block] / MAX_DURABILITY[block]) * 100}%` }} />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Crafting or Furnace */}
            {openFurnaceId && furnaceUI ? (
              <div>
                <h2 className="text-[#373737] font-bold mb-2 text-xl">Furnace</h2>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-4">
                    <div 
                      className="w-16 h-16 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                      onMouseDown={(e) => handleFurnaceClick(e, 'input')}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {furnaceUI.input && (
                        <>
                          <BlockIcon type={furnaceUI.input.type} />
                          <span className="absolute bottom-0 right-1 text-white text-sm font-bold drop-shadow-md">{furnaceUI.input.count}</span>
                        </>
                      )}
                    </div>
                    
                    <div className="w-16 h-8 flex items-center justify-center relative">
                      {/* Fire icon background */}
                      <div className="w-8 h-8 bg-[#373737] mask-fire opacity-20"></div>
                      {/* Active fire */}
                      {furnaceUI.maxFuel > 0 && (
                        <div 
                          className="absolute bottom-0 w-8 bg-orange-500 mask-fire"
                          style={{ height: `${(furnaceUI.fuelLeft / furnaceUI.maxFuel) * 32}px` }}
                        ></div>
                      )}
                    </div>

                    <div 
                      className="w-16 h-16 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                      onMouseDown={(e) => handleFurnaceClick(e, 'fuel')}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {furnaceUI.fuel && (
                        <>
                          <BlockIcon type={furnaceUI.fuel.type} />
                          <span className="absolute bottom-0 right-1 text-white text-sm font-bold drop-shadow-md">{furnaceUI.fuel.count}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-4 bg-[#373737] relative overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-white"
                        style={{ width: `${(furnaceUI.progress / 600) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-[#373737] font-bold text-4xl mt-2">➔</div>
                  </div>
                  
                  <div 
                    className="w-20 h-20 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                    onMouseDown={(e) => handleFurnaceClick(e, 'output')}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {furnaceUI.output && (
                      <>
                        <BlockIcon type={furnaceUI.output.type} className="absolute inset-3" />
                        <span className="absolute bottom-1 right-2 text-white text-lg font-bold drop-shadow-md">{furnaceUI.output.count}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-[#373737] font-bold mb-2 text-xl">Crafting</h2>
                <div className="flex items-center gap-6">
                  <div className="grid grid-cols-3 gap-2">
                    {craftingGrid.map((slot, i) => (
                      <div 
                        key={i}
                        className="w-16 h-16 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                        onMouseDown={(e) => handleCraftingGridClick(e, i)}
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseEnter={() => hoveredSlotRef.current = { type: 'crafting', index: i }}
                        onMouseLeave={() => hoveredSlotRef.current = null}
                      >
                        {slot && (
                          <>
                            <BlockIcon type={slot.type} />
                            <span className="absolute bottom-0 right-1 text-white text-sm font-bold drop-shadow-md">{slot.count}</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-[#373737] font-bold text-4xl">➔</div>
                  
                  <div 
                    className="w-20 h-20 bg-[#8B8B8B] border-4 border-t-[#373737] border-l-[#373737] border-b-white border-r-white relative hover:bg-[#9B9B9B] cursor-pointer"
                    onMouseDown={handleCraftingResultClick}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {checkCrafting(craftingGrid) && (
                      <>
                        <BlockIcon type={checkCrafting(craftingGrid)!.type} className="absolute inset-3" />
                        <span className="absolute bottom-1 right-2 text-white text-lg font-bold drop-shadow-md">{checkCrafting(craftingGrid)!.count}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Cursor Item */}
          {cursorItem && (
            <div 
              className="fixed pointer-events-none z-50 w-12 h-12"
              style={{ left: mousePos.x - 24, top: mousePos.y - 24 }}
            >
              <BlockIcon type={cursorItem.type} className="absolute inset-0" />
              <span className={`absolute ${MAX_DURABILITY[cursorItem.type] ? 'bottom-1.5' : 'bottom-0'} right-0 text-white text-sm font-bold drop-shadow-md z-10`}>{cursorItem.count}</span>
              {MAX_DURABILITY[cursorItem.type] && (
                <div className="absolute bottom-0 left-1 right-1 h-1 bg-black/50 z-20">
                  <div className={`h-full ${durability[cursorItem.type] / MAX_DURABILITY[cursorItem.type] > 0.5 ? 'bg-green-500' : durability[cursorItem.type] / MAX_DURABILITY[cursorItem.type] > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(durability[cursorItem.type] / MAX_DURABILITY[cursorItem.type]) * 100}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair focus:outline-none"
        style={{ imageRendering: 'pixelated' }}
        tabIndex={0}
      />
      
      {/* UI Overlay */}
      {showHotbar && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1.5 bg-black/50 rounded-xl backdrop-blur-sm">
          {INVENTORY_BLOCKS.map((block) => (
            discoveredItems[block] ? (
              <button
                key={block}
                onClick={() => setSelectedBlock(block)}
                className={`relative w-8 h-8 rounded-md border-2 transition-all overflow-hidden ${
                  selectedBlock === block ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
                title={BlockType[block]}
              >
                <BlockIcon type={block} className="absolute inset-0" />
                <span className={`absolute ${MAX_DURABILITY[block] ? 'bottom-1' : 'bottom-0'} right-0.5 text-white text-[10px] font-bold drop-shadow-md z-10`}>
                  {inventory[block] || 0}
                </span>
                {MAX_DURABILITY[block] && inventory[block] > 0 && (
                  <div className="absolute bottom-0 left-0.5 right-0.5 h-1 bg-black/50 z-20">
                    <div className={`h-full ${durability[block] / MAX_DURABILITY[block] > 0.5 ? 'bg-green-500' : durability[block] / MAX_DURABILITY[block] > 0.2 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${(durability[block] / MAX_DURABILITY[block]) * 100}%` }} />
                  </div>
                )}
              </button>
            ) : (
              <div key={block} className="w-8 h-8 rounded-md border-2 border-transparent opacity-30 bg-black/30" />
            )
          ))}
        </div>
      )}

      {showControls && (
        <div className="absolute top-4 left-4 text-white/80 text-sm font-mono bg-black/50 p-3 rounded-lg backdrop-blur-sm pointer-events-none">
          <p className="font-bold mb-1 text-white">Controls</p>
          <p>WASD / Arrows : Move</p>
          <p>Space / Up : Jump</p>
          <p>Left Click  : Break Block</p>
          <p>Right/Shift+Click : Place Block / Eat Food</p>
          <p>I / E / Esc : Open/Close Inventory</p>
          <p>S : Split Item (Hover in Inv/Crafting)</p>
          <p>D : Kill Player (Dev)</p>
          <p>R : Toggle Auto-Respawn</p>
          <p>F : Toggle Flight</p>
          <p>C : Toggle Controls</p>
          <p>H : Toggle Hotbar</p>
          <p className="mt-2 text-yellow-300 font-bold">Days Played: {stats.daysPlayed}</p>
          {autoRespawn && <p className="text-green-400 font-bold">Auto-Respawn: ON</p>}
        </div>
      )}

      {/* Health and Hunger UI */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex gap-1 justify-end">
          {Array.from({ length: 10 }).map((_, i) => (
            <Heart
              key={`hp-${i}`}
              size={24}
              className={i < stats.health ? "fill-red-500 text-red-600" : "fill-black/50 text-black/80"}
            />
          ))}
        </div>
        <div className="flex gap-1 justify-end">
          {Array.from({ length: 10 }).map((_, i) => (
            <Drumstick
              key={`hg-${i}`}
              size={24}
              className={i < stats.hunger ? "fill-amber-700 text-amber-800" : "fill-black/50 text-black/80"}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
