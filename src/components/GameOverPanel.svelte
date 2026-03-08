<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type { SpriteDefinition, GameDimensions } from '../types';
import { IS_HIDPI } from '../config/gameConfig';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  logGameOver,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

export let canvas: HTMLCanvasElement;
export let textImgPos: SpriteDefinition;
export let restartImgPos: SpriteDefinition;
export let dimensions: GameDimensions;

let canvasCtx: CanvasRenderingContext2D;
let isVisible = false;

const COMPONENT_NAME = 'GameOverPanel';

// Panel dimensions
const panelDimensions = {
  TEXT_X: 0,
  TEXT_Y: 13,
  TEXT_WIDTH: 191,
  TEXT_HEIGHT: 11,
  RESTART_WIDTH: 36,
  RESTART_HEIGHT: 32,
};

// Initialize
function init () {
  logger.time('game-over-panel-init', ModuleType.UI);

  try {
    canvasCtx = canvas.getContext('2d')!;
    if (!canvasCtx) {
      throw new Error('Failed to get 2D canvas context');
    }

    logger.setComponentContext(COMPONENT_NAME, {
      dimensions,
      panelDimensions,
      isHIDPI: IS_HIDPI,
    });

    logComponentInit(COMPONENT_NAME, {
      canvasDimensions: { width: canvas.width, height: canvas.height },
      textImgPos,
      restartImgPos,
      dimensions,
    });

    logger.timeEnd('game-over-panel-init', ModuleType.UI);
  } catch (error) {
    logger.error(ModuleType.UI, EventType.ERROR, 'Failed to initialize GameOverPanel', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message },
    });
    throw error;
  }
}

// Update panel dimensions
export function updateDimensions (width: number, height?: number) {
  const previousDimensions = { ...dimensions };

  dimensions.WIDTH = width;
  if (height) {
    dimensions.HEIGHT = height;
  }

  logger.debug(ModuleType.UI, EventType.INIT, 'Panel dimensions updated', {
    component: COMPONENT_NAME,
    context: {
      previousDimensions,
      newDimensions: { ...dimensions },
    },
  });

  if (isVisible) {
    draw();
  }
}

// Show game over panel
export function show (score: number) {
  isVisible = true;

  logGameOver(score, {
    dimensions: { ...dimensions },
    panelDimensions,
  });

  logger.info(ModuleType.UI, EventType.GAME_OVER, 'Game over panel shown', {
    component: COMPONENT_NAME,
    context: {
      score,
      dimensions: { ...dimensions },
    },
  });

  draw();
}

// Hide game over panel
export function hide () {
  isVisible = false;

  logger.debug(ModuleType.UI, EventType.RESTART, 'Game over panel hidden', {
    component: COMPONENT_NAME,
  });
}

// Draw panel
export function draw () {
  if (!canvasCtx) {
    logger.warn(ModuleType.RENDER, EventType.DRAW, 'Canvas context not available', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CANVAS_CONTEXT_LOST,
    });
    return;
  }

  if (!isVisible) {
    return;
  }

  try {
    const centerX = dimensions.WIDTH / 2;

    // Game over text
    let textSourceX = panelDimensions.TEXT_X;
    let textSourceY = panelDimensions.TEXT_Y;
    let textSourceWidth = panelDimensions.TEXT_WIDTH;
    let textSourceHeight = panelDimensions.TEXT_HEIGHT;

    const textTargetX = Math.round(centerX - panelDimensions.TEXT_WIDTH / 2);
    const textTargetY = Math.round((dimensions.HEIGHT - 25) / 3);
    const textTargetWidth = panelDimensions.TEXT_WIDTH;
    const textTargetHeight = panelDimensions.TEXT_HEIGHT;

    let restartSourceWidth = panelDimensions.RESTART_WIDTH;
    let restartSourceHeight = panelDimensions.RESTART_HEIGHT;
    const restartTargetX = centerX - panelDimensions.RESTART_WIDTH / 2;
    const restartTargetY = dimensions.HEIGHT / 2;

    if (IS_HIDPI) {
      textSourceY *= 2;
      textSourceX *= 2;
      textSourceWidth *= 2;
      textSourceHeight *= 2;
      restartSourceWidth *= 2;
      restartSourceHeight *= 2;
    }

    textSourceX += textImgPos.x;
    textSourceY += textImgPos.y;

    // Draw game over text from sprite
    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      textSourceX,
      textSourceY,
      textSourceWidth,
      textSourceHeight,
      textTargetX,
      textTargetY,
      textTargetWidth,
      textTargetHeight
    );

    // Restart button
    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      restartImgPos.x,
      restartImgPos.y,
      restartSourceWidth,
      restartSourceHeight,
      restartTargetX,
      restartTargetY,
      panelDimensions.RESTART_WIDTH,
      panelDimensions.RESTART_HEIGHT
    );

    logger.trace(ModuleType.RENDER, EventType.DRAW, 'Game over panel drawn', {
      component: COMPONENT_NAME,
      context: {
        dimensions: { ...dimensions },
        textPosition: { x: textTargetX, y: textTargetY },
        restartPosition: { x: restartTargetX, y: restartTargetY },
      },
    });
  } catch (error) {
    logger.error(ModuleType.RENDER, EventType.DRAW, 'Failed to draw game over panel', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.RENDER_ERROR,
      context: { error: (error as Error).message },
    });
  }
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, {
    canvas: !!canvas,
    textImgPos: !!textImgPos,
    restartImgPos: !!restartImgPos,
  });
  init();
});

onDestroy(() => {
  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      dimensions: { ...dimensions },
      wasVisible: isVisible,
    },
  });
  logger.clearComponentContext(COMPONENT_NAME);
});
</script>

<!-- Game Over Panel Component -->
