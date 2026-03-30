import type { GameState } from '../runtime';
import { AnimalType, type Animal } from '../types';

type DrawAnimalsParams = {
  ctx: CanvasRenderingContext2D;
  state: GameState;
};

type AnimalDrawFn = (ctx: CanvasRenderingContext2D, animal: Animal) => void;

const applyAttackAnimation = (ctx: CanvasRenderingContext2D, animal: Animal) => {
  if (!animal.attackTimer || animal.attackTimer <= 0) {
    return;
  }

  const attackProgress = (15 - animal.attackTimer) / 15;
  const lungeDist = Math.sin(attackProgress * Math.PI) * 10;
  ctx.translate(animal.x + animal.width / 2, animal.y + animal.height / 2);
  ctx.translate(lungeDist * animal.facing, 0);
  ctx.translate(-(animal.x + animal.width / 2), -(animal.y + animal.height / 2));
};

const drawStatusTint = (ctx: CanvasRenderingContext2D, animal: Animal) => {
  if (animal.hurtTime > 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = animal.poisonTimer && animal.poisonTimer > 0 ? '#4CAF50' : 'red';
    ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
    ctx.globalAlpha = 1;
    return;
  }

  if (animal.poisonTimer && animal.poisonTimer > 0) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
    ctx.globalAlpha = 1;
  }
};

const drawPig: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#F8BBD0';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = '#F48FB1';
  const snoutX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
  ctx.fillRect(snoutX, animal.y + 4, 4, 8);
  ctx.fillStyle = 'black';
  const eyeX = animal.facing === 1 ? animal.x + animal.width - 6 : animal.x + 4;
  ctx.fillRect(eyeX, animal.y + 2, 2, 2);
};

const drawCow: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = 'white';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(animal.x + 4, animal.y + 4, 6, 6);
  ctx.fillRect(animal.x + 14, animal.y + 10, 8, 6);
  ctx.fillStyle = '#D7CCC8';
  const snoutX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
  ctx.fillRect(snoutX, animal.y + 4, 4, 10);
  ctx.fillStyle = 'black';
  const eyeX = animal.facing === 1 ? animal.x + animal.width - 6 : animal.x + 4;
  ctx.fillRect(eyeX, animal.y + 2, 2, 2);
};

const drawChicken: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = 'white';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = 'red';
  const combX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x;
  ctx.fillRect(combX, animal.y - 2, 4, 2);
  ctx.fillStyle = 'orange';
  const beakX = animal.facing === 1 ? animal.x + animal.width : animal.x - 2;
  ctx.fillRect(beakX, animal.y + 2, 2, 2);
  ctx.fillStyle = 'black';
  const eyeX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x + 2;
  ctx.fillRect(eyeX, animal.y + 2, 2, 2);
};

const drawSnake: AnimalDrawFn = (ctx, animal) => {
  const segments = 5;
  const segmentWidth = animal.width / segments;

  for (let segment = 0; segment < segments; segment += 1) {
    const segmentX =
      animal.facing === 1
        ? animal.x + segment * segmentWidth
        : animal.x + animal.width - (segment + 1) * segmentWidth;
    const wiggle = Math.sin((animal.x + segment * 4) * 0.2) * 2;

    if (animal.type === AnimalType.STRIPED_SNAKE) {
      const colors = ['#000000', '#FF0000', '#FFFF00'];
      ctx.fillStyle = colors[segment % colors.length];
    } else if (animal.type === AnimalType.TIGER_SNAKE) {
      const colors = ['#FF8C00', '#000000'];
      ctx.fillStyle = colors[segment % colors.length];
    } else {
      ctx.fillStyle = segment % 2 === 0 ? '#2E7D32' : '#4CAF50';
    }

    const headSegmentIndex = animal.facing === 1 ? segments - 1 : 0;
    if (segment === headSegmentIndex) {
      ctx.fillRect(segmentX, animal.y + wiggle - 1, segmentWidth + 2, animal.height + 2);
      ctx.fillStyle = animal.type === AnimalType.STRIPED_SNAKE ? 'white' : 'black';
      const eyeX = animal.facing === 1 ? segmentX + segmentWidth - 2 : segmentX + 2;
      ctx.fillRect(eyeX, animal.y + wiggle + 1, 2, 2);

      if (Math.random() > 0.9) {
        ctx.fillStyle = 'red';
        const tongueX = animal.facing === 1 ? segmentX + segmentWidth + 2 : segmentX - 4;
        ctx.fillRect(tongueX, animal.y + wiggle + 3, 4, 1);
        ctx.fillRect(tongueX + (animal.facing === 1 ? 4 : -1), animal.y + wiggle + 2, 1, 3);
      }
      continue;
    }

    ctx.fillRect(segmentX, animal.y + wiggle, segmentWidth + 1, animal.height);
  }
};

const drawAnt: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#212121';
  const segmentWidth = animal.width / 3;
  ctx.fillRect(animal.x, animal.y, segmentWidth - 1, animal.height);
  ctx.fillRect(animal.x + segmentWidth, animal.y, segmentWidth - 1, animal.height);
  ctx.fillRect(animal.x + segmentWidth * 2, animal.y, segmentWidth - 1, animal.height);
};

const drawBird: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#3498db';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = '#f1c40f';
  ctx.fillRect(animal.x + animal.width, animal.y + 2, 4, 4);
  ctx.fillStyle = '#2980b9';
  ctx.fillRect(animal.x + 2, animal.y + 2, 6, 4);
};

const drawFish: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#e67e22';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.beginPath();
  ctx.moveTo(animal.x, animal.y + animal.height / 2);
  ctx.lineTo(animal.x - 4, animal.y);
  ctx.lineTo(animal.x - 4, animal.y + animal.height);
  ctx.fill();
};

const drawOrca: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#111';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(animal.x + 8, animal.y + animal.height - 8, 16, 8);
  ctx.fillRect(animal.x + animal.width - 12, animal.y + 4, 6, 6);
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.moveTo(animal.x + 16, animal.y);
  ctx.lineTo(animal.x + 24, animal.y - 12);
  ctx.lineTo(animal.x + 28, animal.y);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(animal.x, animal.y + animal.height / 2);
  ctx.lineTo(animal.x - 8, animal.y + 4);
  ctx.lineTo(animal.x - 8, animal.y + animal.height - 4);
  ctx.fill();
};

const drawDolphin: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = '#bdc3c7';
  ctx.fillRect(animal.x + 4, animal.y + animal.height - 6, animal.width - 8, 6);
  ctx.fillStyle = '#7f8c8d';
  ctx.beginPath();
  ctx.moveTo(animal.x + 12, animal.y);
  ctx.lineTo(animal.x + 18, animal.y - 8);
  ctx.lineTo(animal.x + 22, animal.y);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(animal.x, animal.y + animal.height / 2);
  ctx.lineTo(animal.x - 6, animal.y + 2);
  ctx.lineTo(animal.x - 6, animal.y + animal.height - 2);
  ctx.fill();
};

const drawShark: AnimalDrawFn = (ctx, animal) => {
  ctx.fillStyle = '#576574';
  ctx.fillRect(animal.x, animal.y, animal.width, animal.height);
  ctx.fillStyle = '#c8d6e5';
  ctx.fillRect(animal.x + 4, animal.y + animal.height - 6, animal.width - 8, 6);
  ctx.fillStyle = '#576574';
  ctx.beginPath();
  ctx.moveTo(animal.x + 16, animal.y);
  ctx.lineTo(animal.x + 20, animal.y - 10);
  ctx.lineTo(animal.x + 26, animal.y);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(animal.x, animal.y + animal.height / 2);
  ctx.lineTo(animal.x - 8, animal.y);
  ctx.lineTo(animal.x - 8, animal.y + animal.height);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(animal.x + animal.width - 6, animal.y + animal.height - 4, 2, 2);
  ctx.fillRect(animal.x + animal.width - 3, animal.y + animal.height - 4, 2, 2);
};

const getBigCatMainColor = (animalType: AnimalType) => {
  if (animalType === AnimalType.LEOPARD) return '#F5DEB3';
  if (animalType === AnimalType.JAGUAR) return '#E69A28';
  if (animalType === AnimalType.COCOA_CAT) return '#654321';
  return '#111111';
};

const getBigCatSpotColor = (animalType: AnimalType) =>
  animalType === AnimalType.COCOA_CAT ? '#3d2611' : '#222222';

const getBigCatLegColor = (animalType: AnimalType) => {
  if (animalType === AnimalType.LEOPARD) return '#DEB887';
  if (animalType === AnimalType.JAGUAR) return '#CD853F';
  if (animalType === AnimalType.COCOA_CAT) return '#4a3118';
  return '#0A0A0A';
};

const drawBigCatSpots = (ctx: CanvasRenderingContext2D, animal: Animal) => {
  if (animal.type === AnimalType.BLACK_JAGUAR) {
    ctx.fillStyle = '#000000';
    const subtleSpots = [
      { x: 4, y: 4 },
      { x: 12, y: 8 },
      { x: 20, y: 3 },
      { x: 8, y: 12 },
      { x: 16, y: 14 },
      { x: 24, y: 10 },
      { x: 28, y: 4 },
    ];
    subtleSpots.forEach((spot) => {
      if (spot.x < animal.width - 4) {
        ctx.beginPath();
        ctx.arc(animal.x + spot.x, animal.y + spot.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return;
  }

  ctx.fillStyle = getBigCatSpotColor(animal.type);
  const spotSize =
    animal.type === AnimalType.JAGUAR ? 4 : animal.type === AnimalType.COCOA_CAT ? 12 : 3;
  let spots = [
    { x: 4, y: 4 },
    { x: 12, y: 8 },
    { x: 20, y: 3 },
    { x: 8, y: 12 },
    { x: 16, y: 14 },
    { x: 24, y: 10 },
    { x: 28, y: 4 },
  ];

  if (animal.type === AnimalType.COCOA_CAT) {
    spots = [
      { x: 15, y: 20 },
      { x: 45, y: 15 },
      { x: 80, y: 25 },
      { x: 105, y: 15 },
      { x: 25, y: 50 },
      { x: 60, y: 45 },
      { x: 95, y: 55 },
      { x: 15, y: 80 },
      { x: 50, y: 85 },
      { x: 85, y: 75 },
      { x: 105, y: 85 },
      { x: 35, y: 105 },
      { x: 75, y: 100 },
    ];
  }

  spots.forEach((spot) => {
    if (spot.x >= animal.width - (animal.type === AnimalType.COCOA_CAT ? 10 : 4)) {
      return;
    }

    ctx.beginPath();
    ctx.arc(animal.x + spot.x, animal.y + spot.y, spotSize / 2, 0, Math.PI * 2);
    ctx.fill();

    if (animal.type === AnimalType.JAGUAR) {
      ctx.fillStyle = '#E69A28';
      ctx.beginPath();
      ctx.arc(animal.x + spot.x, animal.y + spot.y, spotSize / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222222';
    }
  });
};

const drawBigCat: AnimalDrawFn = (ctx, animal) => {
  const isCocoaCat = animal.type === AnimalType.COCOA_CAT;
  const mainColor = getBigCatMainColor(animal.type);
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(animal.x, animal.y, animal.width, animal.height, 4);
  ctx.fill();

  drawBigCatSpots(ctx, animal);

  const headX = animal.facing === 1 ? animal.x + animal.width - 4 : animal.x - 8;
  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.roundRect(headX, animal.y - 6, isCocoaCat ? 60 : 12, isCocoaCat ? 50 : 10, 3);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(headX + (isCocoaCat ? 10 : 2), animal.y - 6, isCocoaCat ? 15 : 3, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(headX + (isCocoaCat ? 50 : 10), animal.y - 6, isCocoaCat ? 15 : 3, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = animal.type === AnimalType.BLACK_JAGUAR ? '#222222' : '#FFFFFF';
  const snoutX = animal.facing === 1 ? headX + 8 : headX;
  ctx.fillRect(snoutX, animal.y - 1, 4, 4);

  ctx.fillStyle = '#000000';
  const noseX = animal.facing === 1 ? headX + 10 : headX;
  ctx.fillRect(noseX, animal.y - 1, 2, 2);

  ctx.fillStyle = animal.type === AnimalType.BLACK_JAGUAR ? '#FFD700' : '#000000';
  const eyeX = animal.facing === 1 ? headX + 6 : headX + 4;
  ctx.fillRect(eyeX, animal.y - 4, 2, 2);

  if (animal.tamed) {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(headX, animal.y + 2, 12, 2);
  }

  ctx.fillStyle = getBigCatLegColor(animal.type);
  const legOffset = animal.state === 'walking' ? Math.sin(Date.now() / 100) * (isCocoaCat ? 20 : 4) : 0;
  const legWidth = isCocoaCat ? 20 : 4;
  const legHeight = isCocoaCat ? 40 : 8;
  const legSpacing1 = isCocoaCat ? 40 : 8;
  const legSpacing2 = isCocoaCat ? 70 : 14;
  const legSpacing3 = isCocoaCat ? 20 : 4;
  const legSpacing4 = isCocoaCat ? 50 : 10;

  ctx.fillRect(
    animal.facing === 1
      ? animal.x + animal.width - legSpacing1 + legOffset
      : animal.x + legSpacing3 + legOffset,
    animal.y + animal.height,
    legWidth,
    legHeight,
  );
  ctx.fillRect(
    animal.facing === 1
      ? animal.x + animal.width - legSpacing2 - legOffset
      : animal.x + legSpacing4 - legOffset,
    animal.y + animal.height,
    legWidth,
    legHeight,
  );
  ctx.fillRect(
    animal.facing === 1
      ? animal.x + legSpacing3 - legOffset
      : animal.x + animal.width - legSpacing1 - legOffset,
    animal.y + animal.height,
    legWidth,
    legHeight,
  );
  ctx.fillRect(
    animal.facing === 1
      ? animal.x + legSpacing4 + legOffset
      : animal.x + animal.width - legSpacing2 + legOffset,
    animal.y + animal.height,
    legWidth,
    legHeight,
  );

  const tailX = animal.facing === 1 ? animal.x - 2 : animal.x + animal.width + 2;
  const tailSway =
    animal.state === 'walking'
      ? Math.sin(Date.now() / 150) * (isCocoaCat ? 20 : 4)
      : Math.sin(Date.now() / 500) * (isCocoaCat ? 10 : 2);
  const tailLength = isCocoaCat ? 60 : 12;

  ctx.fillStyle = mainColor;
  ctx.beginPath();
  ctx.moveTo(tailX, animal.y + 2);
  if (animal.facing === 1) {
    ctx.quadraticCurveTo(
      tailX - (isCocoaCat ? 40 : 8),
      animal.y + 2,
      tailX - tailLength + tailSway,
      animal.y + (isCocoaCat ? 50 : 10),
    );
  } else {
    ctx.quadraticCurveTo(
      tailX + (isCocoaCat ? 40 : 8),
      animal.y + 2,
      tailX + tailLength + tailSway,
      animal.y + (isCocoaCat ? 50 : 10),
    );
  }
  ctx.lineWidth = isCocoaCat ? 15 : 3;
  ctx.strokeStyle = mainColor;
  ctx.stroke();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  if (animal.facing === 1) {
    ctx.arc(tailX - tailLength + tailSway, animal.y + (isCocoaCat ? 50 : 10), isCocoaCat ? 10 : 2, 0, Math.PI * 2);
  } else {
    ctx.arc(tailX + tailLength + tailSway, animal.y + (isCocoaCat ? 50 : 10), isCocoaCat ? 10 : 2, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.lineWidth = 1;
};

const drawByType: Record<AnimalType, AnimalDrawFn> = {
  [AnimalType.PIG]: drawPig,
  [AnimalType.COW]: drawCow,
  [AnimalType.CHICKEN]: drawChicken,
  [AnimalType.SNAKE]: drawSnake,
  [AnimalType.STRIPED_SNAKE]: drawSnake,
  [AnimalType.TIGER_SNAKE]: drawSnake,
  [AnimalType.ANT]: drawAnt,
  [AnimalType.BIRD]: drawBird,
  [AnimalType.FISH]: drawFish,
  [AnimalType.ORCA]: drawOrca,
  [AnimalType.DOLPHIN]: drawDolphin,
  [AnimalType.SHARK]: drawShark,
  [AnimalType.LEOPARD]: drawBigCat,
  [AnimalType.JAGUAR]: drawBigCat,
  [AnimalType.BLACK_JAGUAR]: drawBigCat,
  [AnimalType.COCOA_CAT]: drawBigCat,
};

export const drawAnimals = ({ ctx, state }: DrawAnimalsParams) => {
  for (const animal of state.animals) {
    ctx.save();
    applyAttackAnimation(ctx, animal);
    drawStatusTint(ctx, animal);
    drawByType[animal.type](ctx, animal);

    ctx.restore();
  }
};
