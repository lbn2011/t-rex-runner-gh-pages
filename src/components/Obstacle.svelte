<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type {
  Obstacle as ObstacleType,
  ObstacleTypeConfig,
  SpriteDefinition,
  GameDimensions,
} from '../types';
import { getRandomNum } from '../utils/gameUtils';
import { IS_HIDPI, IS_MOBILE } from '../config/gameConfig';
import { MAX_OBSTACLE_LENGTH } from '../config/obstacleTypes';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

export let canvasCtx: CanvasRenderingContext2D;
export let type: ObstacleTypeConfig;
export let spritePos: SpriteDefinition;
export let dimensions: GameDimensions;
export let gapCoefficient: number;
export let speed: number;
export let xOffset = 0;

let size = getRandomNum(1, MAX_OBSTACLE_LENGTH);
let remove = false;
let xPos = dimensions.WIDTH + xOffset;
let yPos = 0;
let width = 0;
let collisionBoxes = type.collisionBoxes.map((box) => ({ ...box }));
let gap = 0;
let speedOffset = 0;
let currentFrame = 0;
let timer = 0;

const COMPONENT_NAME = 'Obstacle';

// Initialize obstacle
function init () {
  logger.time('obstacle-init', ModuleType.OBSTACLE);

  try {
    // Only allow resizing at correct speed
    if (size > 1 && type.multipleSpeed > speed) {
      const originalSize = size;
      size = 1;

      logger.trace(ModuleType.OBSTACLE, EventType.INIT, 'Obstacle size adjusted for speed', {
        component: COMPONENT_NAME,
        context: { originalSize, newSize: size, speed, multipleSpeed: type.multipleSpeed },
      });
    }

    width = type.width * size;

    // Check if obstacle can be positioned at different heights
    if (Array.isArray(type.yPos)) {
      const yPosConfig = IS_MOBILE && type.yPosMobile ? type.yPosMobile : type.yPos;
      yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
    } else {
      yPos = type.yPos;
    }

    // Adjust collision boxes
    if (size > 1) {
      collisionBoxes[1].width = width - collisionBoxes[0].width - collisionBoxes[2].width;
      collisionBoxes[2].x = width - collisionBoxes[2].width;
    }

    // For obstacles that move at different speeds
    if (type.speedOffset) {
      speedOffset = Math.random() > 0.5 ? type.speedOffset : -type.speedOffset;
    }

    gap = getGap(gapCoefficient, speed);

    // Set component context for logging
    logger.setComponentContext(COMPONENT_NAME, {
      type: type.type,
      size,
      position: { x: xPos, y: yPos },
      dimensions: { width, height: type.height },
    });

    logComponentInit(COMPONENT_NAME, {
      obstacleType: type.type,
      size,
      position: { x: xPos, y: yPos },
      width,
      gap,
      speedOffset,
      isHIDPI: IS_HIDPI,
      isMobile: IS_MOBILE,
    });

    draw();
    logger.timeEnd('obstacle-init', ModuleType.OBSTACLE);
  } catch (error) {
    logger.error(ModuleType.OBSTACLE, EventType.ERROR, 'Failed to initialize obstacle', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message, type: type.type },
    });
    throw error;
  }
}

// Draw obstacle
function draw () {
  try {
    let sourceWidth = type.width;
    let sourceHeight = type.height;

    if (IS_HIDPI) {
      sourceWidth = sourceWidth * 2;
      sourceHeight = sourceHeight * 2;
    }

    // X position in sprite
    let sourceX = sourceWidth * size * (0.5 * (size - 1)) + spritePos.x;

    // Animation frame
    if (currentFrame > 0) {
      sourceX += sourceWidth * currentFrame;
    }

    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      sourceX,
      spritePos.y,
      sourceWidth * size,
      sourceHeight,
      xPos,
      yPos,
      type.width * size,
      type.height
    );

    logger.trace(ModuleType.RENDER, EventType.DRAW, 'Obstacle drawn', {
      component: COMPONENT_NAME,
      context: {
        type: type.type,
        position: { x: xPos, y: yPos },
        frame: currentFrame,
        size,
      },
    });
  } catch (error) {
    logger.error(ModuleType.RENDER, EventType.DRAW, 'Failed to draw obstacle', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.RENDER_ERROR,
      context: { error: (error as Error).message, type: type.type },
    });
  }
}

// Update obstacle
export function update (deltaTime: number, currentSpeed: number) {
  if (!remove) {
    let adjustedSpeed = currentSpeed;
    if (type.speedOffset) {
      adjustedSpeed += speedOffset;

      logger.trace(ModuleType.OBSTACLE, EventType.ANIMATION, 'Speed offset applied', {
        component: COMPONENT_NAME,
        context: { baseSpeed: currentSpeed, speedOffset, adjustedSpeed },
      });
    }

    const previousX = xPos;
    xPos -= Math.floor(((adjustedSpeed * 60) / 1000) * deltaTime);

    // Update frames
    if (type.numFrames) {
      timer += deltaTime;
      if (timer >= (type.frameRate || 100)) {
        const previousFrame = currentFrame;
        currentFrame = currentFrame == type.numFrames - 1 ? 0 : currentFrame + 1;
        timer = 0;

        logger.trace(ModuleType.OBSTACLE, EventType.ANIMATION, 'Animation frame changed', {
          component: COMPONENT_NAME,
          context: { previousFrame, currentFrame, type: type.type },
        });
      }
    }

    draw();

    if (!isVisible()) {
      remove = true;

      logger.debug(ModuleType.OBSTACLE, EventType.ANIMATION, 'Obstacle marked for removal', {
        component: COMPONENT_NAME,
        context: {
          type: type.type,
          finalPosition: { x: xPos, y: yPos },
          distanceTraveled: previousX - xPos,
        },
      });
    }
  }
}

// Calculate random gap size
function getGap (gapCoefficient: number, speed: number): number {
  const minGap = Math.round(width * speed + type.minGap * gapCoefficient);
  const maxGap = Math.round(minGap * 1.5); // MAX_GAP_COEFFICIENT
  const calculatedGap = getRandomNum(minGap, maxGap);

  logger.trace(ModuleType.OBSTACLE, EventType.INIT, 'Gap calculated', {
    component: COMPONENT_NAME,
    context: { minGap, maxGap, calculatedGap, width, speed, gapCoefficient },
  });

  return calculatedGap;
}

// Check if obstacle is visible
function isVisible (): boolean {
  return xPos + width > 0;
}

// Get obstacle object
export function getObstacle (): ObstacleType {
  return {
    canvasCtx,
    spritePos,
    typeConfig: type,
    gapCoefficient,
    size,
    dimensions,
    remove,
    xPos,
    yPos,
    width,
    collisionBoxes,
    gap,
    speedOffset,
    currentFrame,
    timer,
  };
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, {
    canvasCtx: !!canvasCtx,
    type: type.type,
    speed,
    xOffset,
  });
  init();
});

onDestroy(() => {
  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      type: type.type,
      position: { x: xPos, y: yPos },
      removed: remove,
      frame: currentFrame,
    },
  });
  logger.clearComponentContext(COMPONENT_NAME);
});
</script>

<!-- Obstacle Component -->
