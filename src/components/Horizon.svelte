<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type { GameDimensions, SpriteDefinition, Obstacle as ObstacleType } from '../types';
import { getRandomNum } from '../utils/gameUtils';
import { obstacleTypes } from '../config/obstacleTypes';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

export let canvas: HTMLCanvasElement;
export let spriteDef: Record<string, SpriteDefinition>;
export let dimensions: GameDimensions;
export let gapCoefficient: number;

let canvasCtx: CanvasRenderingContext2D;
let obstacles: ObstacleType[] = [];
let clouds: any[] = [];
let ground: any;
let obstacleTimer = 0;
let cloudTimer = 0;

const COMPONENT_NAME = 'Horizon';

// Initialize Horizon component
function init () {
  logger.time('horizon-init', ModuleType.HORIZON);

  try {
    canvasCtx = canvas.getContext('2d')!;
    if (!canvasCtx) {
      throw new Error('Failed to get 2D canvas context');
    }

    ground = {
      x: 0,
      y: 0,
      width: 0,
      height: 12,
    };
    ground.y = canvas.height - ground.height - 10;
    ground.width = 600;

    logger.setComponentContext(COMPONENT_NAME, {
      canvasDimensions: { width: canvas.width, height: canvas.height },
      groundY: ground.y,
      gapCoefficient,
    });

    logComponentInit(COMPONENT_NAME, {
      spriteDefKeys: Object.keys(spriteDef),
      dimensions,
      gapCoefficient,
    });

    reset();
    logger.timeEnd('horizon-init', ModuleType.HORIZON);
  } catch (error) {
    logger.error(ModuleType.HORIZON, EventType.ERROR, 'Failed to initialize Horizon component', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message },
    });
    throw error;
  }
}

// Reset Horizon
export function reset () {
  const previousObstacleCount = obstacles.length;
  const previousCloudCount = clouds.length;

  obstacles = [];
  clouds = [];
  obstacleTimer = 0;
  cloudTimer = 0;
  ground.x = 0;

  logger.debug(ModuleType.HORIZON, EventType.RESTART, 'Horizon reset', {
    component: COMPONENT_NAME,
    context: {
      previousObstacleCount,
      previousCloudCount,
      groundPosition: ground.x,
    },
  });
}

// Update Horizon
export function update (deltaTime: number, speed: number, hasObstacles: boolean, inverted: boolean) {
  const adjustedSpeed = (speed * deltaTime) / 16;

  logger.trace(ModuleType.HORIZON, EventType.ANIMATION, 'Horizon update cycle', {
    component: COMPONENT_NAME,
    context: {
      deltaTime,
      speed,
      adjustedSpeed,
      hasObstacles,
      inverted,
    },
  });

  // Update ground
  ground.x -= adjustedSpeed;
  if (ground.x <= -ground.width / 2) {
    ground.x = 0;

    logger.trace(ModuleType.HORIZON, EventType.ANIMATION, 'Ground loop reset', {
      component: COMPONENT_NAME,
      context: { groundX: ground.x },
    });
  }

  // Update clouds
  updateClouds(adjustedSpeed);

  // Update obstacles
  if (hasObstacles) {
    updateObstacles(deltaTime, speed);
  }

  draw(inverted);
}

// Update clouds
function updateClouds (speed: number) {
  const cloudSpeed = speed * 0.2;
  let removedClouds = 0;

  clouds.forEach((cloud, index) => {
    cloud.x -= cloudSpeed;
    if (cloud.x + cloud.width < 0) {
      clouds.splice(index, 1);
      removedClouds++;
    }
  });

  if (removedClouds > 0) {
    logger.trace(ModuleType.HORIZON, EventType.ANIMATION, 'Clouds removed', {
      component: COMPONENT_NAME,
      context: { removedCount: removedClouds, remainingCount: clouds.length },
    });
  }

  // Add new clouds
  cloudTimer += speed;
  if (cloudTimer > 1000 && clouds.length < 6) {
    addCloud();
    cloudTimer = 0;
  }
}

// Add cloud
function addCloud () {
  try {
    const cloudSprite = spriteDef.CLOUD;
    const cloudWidth = 46;
    const cloudHeight = 14;
    const cloudX = canvas.width;
    const cloudY = getRandomNum(0, canvas.height / 2 - cloudHeight);

    clouds.push({
      x: cloudX,
      y: cloudY,
      width: cloudWidth,
      height: cloudHeight,
      sprite: cloudSprite,
    });

    logger.trace(ModuleType.HORIZON, EventType.INIT, 'Cloud added', {
      component: COMPONENT_NAME,
      context: {
        cloudCount: clouds.length,
        position: { x: cloudX, y: cloudY },
      },
    });
  } catch (error) {
    logger.warn(ModuleType.HORIZON, EventType.WARNING, 'Failed to add cloud', {
      component: COMPONENT_NAME,
      context: { error: (error as Error).message },
    });
  }
}

// Update obstacles
function updateObstacles (deltaTime: number, speed: number) {
  let removedObstacles = 0;

  obstacles.forEach((obstacle, index) => {
    const adjustedSpeed = (speed * deltaTime) / 16;
    obstacle.xPos -= adjustedSpeed;

    if (obstacle.xPos + obstacle.width < 0) {
      obstacles.splice(index, 1);
      removedObstacles++;
    }
  });

  if (removedObstacles > 0) {
    logger.debug(ModuleType.OBSTACLE, EventType.ANIMATION, 'Obstacles removed', {
      component: COMPONENT_NAME,
      context: { removedCount: removedObstacles, remainingCount: obstacles.length },
    });
  }

  // Add new obstacles
  obstacleTimer += deltaTime;
  const threshold = getObstacleTimerThreshold(speed);

  if (obstacleTimer > threshold) {
    addObstacle(speed);
    obstacleTimer = 0;

    logger.trace(ModuleType.OBSTACLE, EventType.INIT, 'Obstacle timer reset', {
      component: COMPONENT_NAME,
      context: { threshold, currentObstacleCount: obstacles.length },
    });
  }
}

// Get obstacle spawn threshold
function getObstacleTimerThreshold (speed: number): number {
  const baseThreshold = 1500;
  const minThreshold = 500;
  const calculatedThreshold = Math.max(minThreshold, baseThreshold - (speed - 6) * 100);

  logger.trace(ModuleType.OBSTACLE, EventType.INIT, 'Obstacle threshold calculated', {
    component: COMPONENT_NAME,
    context: { speed, baseThreshold, minThreshold, calculatedThreshold },
  });

  return calculatedThreshold;
}

// Add obstacle
function addObstacle (speed: number) {
  try {
    // Select appropriate obstacle type
    const validObstacles = obstacleTypes.filter((type) => type.minSpeed <= speed);
    if (validObstacles.length === 0) {
      logger.warn(
        ModuleType.OBSTACLE,
        EventType.WARNING,
        'No valid obstacle types for current speed',
        {
          component: COMPONENT_NAME,
          context: { speed, availableTypes: obstacleTypes.length },
        }
      );
      return;
    }

    const obstacleType = validObstacles[getRandomNum(0, validObstacles.length - 1)];
    const spritePos = spriteDef[obstacleType.type as keyof typeof spriteDef];

    if (!spritePos) {
      logger.error(
        ModuleType.OBSTACLE,
        EventType.ERROR,
        `Sprite position not found for obstacle type: ${obstacleType.type}`,
        {
          component: COMPONENT_NAME,
          errorCode: ErrorCode.SPRITE_LOAD_FAILED,
          context: { obstacleType: obstacleType.type, availableSprites: Object.keys(spriteDef) },
        }
      );
      return;
    }

    // Create obstacle object
    const obstacle: ObstacleType = {
      canvasCtx,
      spritePos,
      typeConfig: obstacleType,
      gapCoefficient,
      size: getRandomNum(1, 3),
      dimensions,
      remove: false,
      xPos: canvas.width,
      yPos: 0,
      width: obstacleType.width,
      collisionBoxes: obstacleType.collisionBoxes.map((box) => ({ ...box })),
      gap: 0,
      speedOffset: 0,
      currentFrame: 0,
      timer: 0,
    };

    // Initialize obstacle
    if (obstacle.size > 1 && obstacleType.multipleSpeed > speed) {
      obstacle.size = 1;
    }

    obstacle.width = obstacleType.width * obstacle.size;

    if (Array.isArray(obstacleType.yPos)) {
      const yPosConfig = obstacleType.yPos;
      obstacle.yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
    } else {
      obstacle.yPos = obstacleType.yPos;
    }

    if (obstacle.size > 1) {
      obstacle.collisionBoxes[1].width =
        obstacle.width - obstacle.collisionBoxes[0].width - obstacle.collisionBoxes[2].width;
      obstacle.collisionBoxes[2].x = obstacle.width - obstacle.collisionBoxes[2].width;
    }

    if (obstacleType.speedOffset) {
      obstacle.speedOffset =
        Math.random() > 0.5 ? obstacleType.speedOffset : -obstacleType.speedOffset;
    }

    obstacle.gap = getRandomNum(
      Math.round(obstacle.width * speed + obstacleType.minGap * gapCoefficient),
      Math.round((obstacle.width * speed + obstacleType.minGap * gapCoefficient) * 1.5)
    );

    obstacles.push(obstacle);

    logger.info(ModuleType.OBSTACLE, EventType.INIT, 'Obstacle added', {
      component: COMPONENT_NAME,
      context: {
        type: obstacleType.type,
        size: obstacle.size,
        position: { x: obstacle.xPos, y: obstacle.yPos },
        width: obstacle.width,
        gap: obstacle.gap,
        totalObstacles: obstacles.length,
      },
    });
  } catch (error) {
    logger.error(ModuleType.OBSTACLE, EventType.ERROR, 'Failed to add obstacle', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message, speed },
    });
  }
}

// Draw Horizon
function draw (_inverted: boolean) {
  if (!canvasCtx) {
    logger.warn(ModuleType.RENDER, EventType.DRAW, 'Canvas context not available', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CANVAS_CONTEXT_LOST,
    });
    return;
  }

  try {
    // Draw ground
    const groundSprite = spriteDef.HORIZON;
    const groundSourceWidth = 600;
    const groundSourceHeight = 12;

    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      groundSprite.x,
      groundSprite.y,
      groundSourceWidth,
      groundSourceHeight,
      ground.x,
      ground.y,
      groundSourceWidth,
      groundSourceHeight
    );

    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      groundSprite.x,
      groundSprite.y,
      groundSourceWidth,
      groundSourceHeight,
      ground.x + groundSourceWidth,
      ground.y,
      groundSourceWidth,
      groundSourceHeight
    );

    // Draw clouds
    clouds.forEach((cloud) => {
      const cloudSourceWidth = 46;
      const cloudSourceHeight = 14;

      canvasCtx.drawImage(
        (window as any).Runner.imageSprite,
        cloud.sprite.x,
        cloud.sprite.y,
        cloudSourceWidth,
        cloudSourceHeight,
        cloud.x,
        cloud.y,
        cloudSourceWidth,
        cloudSourceHeight
      );
    });

    // Draw obstacles
    obstacles.forEach((obstacle) => {
      const sourceWidth = obstacle.typeConfig.width;
      const sourceHeight = obstacle.typeConfig.height;

      let sourceX =
        sourceWidth * obstacle.size * (0.5 * (obstacle.size - 1)) + obstacle.spritePos.x;

      if (obstacle.currentFrame > 0) {
        sourceX += sourceWidth * obstacle.currentFrame;
      }

      canvasCtx.drawImage(
        (window as any).Runner.imageSprite,
        sourceX,
        obstacle.spritePos.y,
        sourceWidth * obstacle.size,
        sourceHeight,
        obstacle.xPos,
        obstacle.yPos,
        obstacle.typeConfig.width * obstacle.size,
        obstacle.typeConfig.height
      );
    });

    logger.trace(ModuleType.RENDER, EventType.DRAW, 'Horizon drawn', {
      component: COMPONENT_NAME,
      context: {
        groundPosition: ground.x,
        cloudCount: clouds.length,
        obstacleCount: obstacles.length,
      },
    });
  } catch (error) {
    logger.error(ModuleType.RENDER, EventType.DRAW, 'Failed to draw horizon', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.RENDER_ERROR,
      context: { error: (error as Error).message },
    });
  }
}

// Get obstacles list
export function getObstacles (): ObstacleType[] {
  return obstacles;
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, { canvas: !!canvas, spriteDef: !!spriteDef });
  init();
});

onDestroy(() => {
  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      obstacleCount: obstacles.length,
      cloudCount: clouds.length,
    },
  });
  logger.clearComponentContext(COMPONENT_NAME);
});
</script>

<!-- Horizon Component -->
