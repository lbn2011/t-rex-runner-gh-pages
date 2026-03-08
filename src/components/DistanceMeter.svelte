<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type { SpriteDefinition } from '../types';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  logScore,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

export let canvas: HTMLCanvasElement;
export let textSpritePos: SpriteDefinition;
export let canvasWidth: number;

let canvasCtx: CanvasRenderingContext2D;
let xPos = 0;
let yPos = 25;
let currentDistance = 0;
let highScore = 0;
let digits = [0, 0, 0, 0, 0];
let highScoreDigits = [0, 0, 0, 0, 0];
let digitWidth = 10;

const COMPONENT_NAME = 'DistanceMeter';

// Initialize DistanceMeter
function init () {
  logger.time('distance-meter-init', ModuleType.SCORE);

  try {
    canvasCtx = canvas.getContext('2d')!;
    if (!canvasCtx) {
      throw new Error('Failed to get 2D canvas context');
    }

    calcXPos(canvasWidth);

    logger.setComponentContext(COMPONENT_NAME, {
      canvasWidth,
      xPos,
      yPos,
      digitWidth,
    });

    logComponentInit(COMPONENT_NAME, {
      canvasDimensions: { width: canvas.width, height: canvas.height },
      textSpritePos,
      initialPosition: { x: xPos, y: yPos },
    });

    logger.timeEnd('distance-meter-init', ModuleType.SCORE);
  } catch (error) {
    logger.error(ModuleType.SCORE, EventType.ERROR, 'Failed to initialize DistanceMeter', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message },
    });
    throw error;
  }
}

// Calculate X position
export function calcXPos (width: number) {
  const previousX = xPos;
  xPos = width - digits.length * digitWidth - 10;

  logger.trace(ModuleType.SCORE, EventType.INIT, 'Position recalculated', {
    component: COMPONENT_NAME,
    context: { canvasWidth: width, previousX, newX: xPos },
  });
}

// Update distance
export function update (deltaTime: number, distance: number): boolean {
  const newDistance = Math.floor(distance);
  let milestoneReached = false;

  if (newDistance !== currentDistance) {
    const previousDistance = currentDistance;
    currentDistance = newDistance;
    updateDigits(currentDistance, digits);

    // Log score update
    logScore(currentDistance, {
      deltaTime,
      previousDistance,
      increment: currentDistance - previousDistance,
    });

    logger.debug(ModuleType.SCORE, EventType.SCORE_UPDATE, 'Distance updated', {
      component: COMPONENT_NAME,
      context: {
        previousDistance,
        currentDistance,
        deltaTime,
        digits: [...digits],
      },
    });

    // Check if new achievement reached
    if (currentDistance > 0 && currentDistance % 100 === 0) {
      milestoneReached = true;

      logger.info(ModuleType.SCORE, EventType.SCORE_UPDATE, 'Milestone reached', {
        component: COMPONENT_NAME,
        context: {
          milestone: currentDistance,
          highScore,
        },
      });
    }
  }

  draw();
  return milestoneReached;
}

// Update digits
function updateDigits (value: number, digitArray: number[]) {
  const str = value.toString().padStart(digitArray.length, '0');
  for (let i = 0; i < digitArray.length; i++) {
    digitArray[i] = parseInt(str[i]);
  }

  logger.trace(ModuleType.SCORE, EventType.INIT, 'Digits updated', {
    component: COMPONENT_NAME,
    context: { value, digitArray: [...digitArray] },
  });
}

// Reset
export function reset (newHighScore: number) {
  const previousDistance = currentDistance;
  const previousHighScore = highScore;

  currentDistance = 0;
  highScore = newHighScore;
  updateDigits(0, digits);
  updateDigits(highScore, highScoreDigits);

  logger.info(ModuleType.SCORE, EventType.RESTART, 'Distance meter reset', {
    component: COMPONENT_NAME,
    context: {
      previousDistance,
      previousHighScore,
      newHighScore,
    },
  });

  draw();
}

// Set high score
export function setHighScore (score: number) {
  const previousHighScore = highScore;
  highScore = score;
  updateDigits(highScore, highScoreDigits);

  logger.info(ModuleType.SCORE, EventType.SCORE_UPDATE, 'High score updated', {
    component: COMPONENT_NAME,
    context: {
      previousHighScore,
      newHighScore: highScore,
    },
  });
}

// Get actual distance
export function getActualDistance (distance: number): number {
  const actualDistance = Math.floor(distance / 100);

  logger.trace(ModuleType.SCORE, EventType.INIT, 'Actual distance calculated', {
    component: COMPONENT_NAME,
    context: { rawDistance: distance, actualDistance },
  });

  return actualDistance;
}

// Draw distance meter
function draw () {
  if (!canvasCtx) {
    logger.warn(ModuleType.RENDER, EventType.DRAW, 'Canvas context not available', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CANVAS_CONTEXT_LOST,
    });
    return;
  }

  try {
    // Draw current distance
    drawDigits(digits, xPos, yPos);

    // Draw high score
    if (highScore > 0) {
      const highScoreX = xPos - digitWidth * highScoreDigits.length - 20;
      drawDigits(highScoreDigits, highScoreX, yPos);
    }

    logger.trace(ModuleType.RENDER, EventType.DRAW, 'Distance meter drawn', {
      component: COMPONENT_NAME,
      context: {
        currentDistance,
        highScore,
        position: { x: xPos, y: yPos },
      },
    });
  } catch (error) {
    logger.error(ModuleType.RENDER, EventType.DRAW, 'Failed to draw distance meter', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.RENDER_ERROR,
      context: { error: (error as Error).message },
    });
  }
}

// Draw digits
function drawDigits (digitArray: number[], x: number, y: number) {
  const sourceWidth = 10;
  const sourceHeight = 13;

  digitArray.forEach((digit, index) => {
    const sourceX = textSpritePos.x + digit * sourceWidth;
    const targetX = x + index * digitWidth;

    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      sourceX,
      textSpritePos.y,
      sourceWidth,
      sourceHeight,
      targetX,
      y,
      sourceWidth,
      sourceHeight
    );
  });
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, { canvas: !!canvas, canvasWidth });
  init();
});

onDestroy(() => {
  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      currentDistance,
      highScore,
    },
  });
  logger.clearComponentContext(COMPONENT_NAME);
});
</script>

<!-- Distance Meter Component -->
