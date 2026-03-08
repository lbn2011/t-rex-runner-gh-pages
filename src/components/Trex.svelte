<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { TrexStatus } from '../types';
import type { Trex as TrexType } from '../types';
import { gameConfig } from '../config/gameConfig';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  logJump,
  logDuck,
  logTrexStateChange,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

export let canvas: HTMLCanvasElement;
export let spritePos: { x: number; y: number };

let canvasCtx: CanvasRenderingContext2D;
let xPos = 50;
let yPos = 100;
let width = 40;
let height = 40;
let jumping = false;
let ducking = false;
let speedDrop = false;
let jumpVelocity = gameConfig.INITIAL_JUMP_VELOCITY;
let maxJumpHeight = 0;
let jumpCount = 0;
let blinkCount = 0;
let status: TrexStatus = TrexStatus.RUNNING;
let runningTime = 0;
let playingIntro = false;

const COMPONENT_NAME = 'Trex';

const config = {
  WIDTH: 40,
  HEIGHT: 40,
  DUCK_WIDTH: 51,
  DUCK_HEIGHT: 25,
  INITIAL_JUMP_VELOCITY: gameConfig.INITIAL_JUMP_VELOCITY,
  GRAVITY: gameConfig.GRAVITY,
  MIN_JUMP_HEIGHT: gameConfig.MIN_JUMP_HEIGHT,
  SPEED_DROP_COEFFICIENT: gameConfig.SPEED_DROP_COEFFICIENT,
};

// Initialize T-Rex component
function init () {
  logger.time('trex-init', ModuleType.TREX);

  try {
    canvasCtx = canvas.getContext('2d')!;
    if (!canvasCtx) {
      throw new Error('Failed to get 2D canvas context');
    }

    yPos = canvas.height - config.HEIGHT - 10;

    // Set component context for logging
    logger.setComponentContext(COMPONENT_NAME, {
      xPos,
      yPos,
      width,
      height,
      initialStatus: status,
    });

    logComponentInit(COMPONENT_NAME, {
      canvasDimensions: { width: canvas.width, height: canvas.height },
      spritePos,
      config,
    });

    logger.timeEnd('trex-init', ModuleType.TREX);
  } catch (error) {
    logger.error(ModuleType.TREX, EventType.ERROR, 'Failed to initialize T-Rex component', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message },
    });
    throw error;
  }
}

// Update T-Rex state
export function update (deltaTime: number, newStatus?: TrexStatus) {
  const previousStatus = status;

  if (newStatus) {
    status = newStatus;

    // Log state changes
    if (previousStatus !== status) {
      logTrexStateChange(previousStatus, status, {
        deltaTime,
        xPos,
        yPos,
        jumpCount,
      });
    }
  }

  runningTime += deltaTime;

  switch (status) {
  case TrexStatus.RUNNING:
    updateRunning(deltaTime);
    break;
  case TrexStatus.JUMPING:
    updateJump(deltaTime);
    break;
  case TrexStatus.DUCKING:
    updateDucking(deltaTime);
    break;
  case TrexStatus.CRASHED:
    logger.debug(ModuleType.TREX, EventType.ANIMATION, 'T-Rex crashed state', {
      component: COMPONENT_NAME,
      context: { xPos, yPos, runningTime },
    });
    break;
  }

  draw();
}

// Update running state
function updateRunning (_deltaTime: number) {
  // Blink animation
  if (blinkCount < 3) {
    const blinkInterval = 2000;
    const blinkDuration = 100;
    const blinkTime = runningTime % blinkInterval;

    if (blinkTime < blinkDuration) {
      logger.trace(ModuleType.TREX, EventType.ANIMATION, 'T-Rex blinking', {
        component: COMPONENT_NAME,
        context: { blinkCount, runningTime },
      });
    }
  }
}

// Update jump state
export function updateJump (_deltaTime: number) {
  if (speedDrop) {
    jumpVelocity = gameConfig.INITIAL_JUMP_VELOCITY * config.SPEED_DROP_COEFFICIENT;

    logger.trace(ModuleType.TREX, EventType.JUMP, 'Speed drop activated', {
      component: COMPONENT_NAME,
      context: { jumpVelocity, yPos },
    });
  }

  yPos += jumpVelocity;
  jumpVelocity += config.GRAVITY;

  // Check if landed
  const groundY = canvas.height - config.HEIGHT - 10;
  if (yPos >= groundY) {
    const landingY = yPos;
    yPos = groundY;
    jumping = false;
    speedDrop = false;
    jumpVelocity = config.INITIAL_JUMP_VELOCITY;
    status = TrexStatus.RUNNING;

    logger.debug(ModuleType.TREX, EventType.JUMP, 'T-Rex landed', {
      component: COMPONENT_NAME,
      context: { landingY, groundY, jumpCount },
    });
  }
}

// Update ducking state
function updateDucking (_deltaTime: number) {
  const previousWidth = width;
  const previousHeight = height;

  width = config.DUCK_WIDTH;
  height = config.DUCK_HEIGHT;

  logger.trace(ModuleType.TREX, EventType.DUCK, 'Ducking state updated', {
    component: COMPONENT_NAME,
    context: {
      previousDimensions: { width: previousWidth, height: previousHeight },
      currentDimensions: { width, height },
    },
  });
}

// Start jump
export function startJump (speed: number) {
  if (!jumping && !ducking) {
    jumping = true;
    status = TrexStatus.JUMPING;
    jumpCount++;
    maxJumpHeight = yPos - config.MIN_JUMP_HEIGHT;
    jumpVelocity = -config.INITIAL_JUMP_VELOCITY - speed / 10;

    logJump(yPos, {
      speed,
      jumpVelocity,
      maxJumpHeight,
      jumpCount,
    });

    logger.debug(ModuleType.TREX, EventType.JUMP, 'Jump started', {
      component: COMPONENT_NAME,
      context: {
        speed,
        jumpVelocity,
        maxJumpHeight,
        jumpCount,
      },
    });
  } else {
    logger.trace(ModuleType.TREX, EventType.JUMP, 'Jump ignored - already jumping or ducking', {
      component: COMPONENT_NAME,
      context: { jumping, ducking, status },
    });
  }
}

// End jump
export function endJump () {
  if (jumping && jumpVelocity < -3) {
    const previousVelocity = jumpVelocity;
    jumpVelocity = -3;

    logger.trace(ModuleType.TREX, EventType.JUMP, 'Jump cut short', {
      component: COMPONENT_NAME,
      context: { previousVelocity, newVelocity: jumpVelocity, yPos },
    });
  }
}

// Set duck state
export function setDuck (duck: boolean) {
  const wasDucking = ducking;
  ducking = duck;

  if (duck) {
    status = TrexStatus.DUCKING;
    width = config.DUCK_WIDTH;
    height = config.DUCK_HEIGHT;

    logDuck(true, { yPos, width, height });
  } else {
    status = TrexStatus.RUNNING;
    width = config.WIDTH;
    height = config.HEIGHT;

    logDuck(false, { yPos, width, height });

    logger.debug(ModuleType.TREX, EventType.DUCK, 'Ducking ended', {
      component: COMPONENT_NAME,
      context: { wasDucking, status, dimensions: { width, height } },
    });
  }
}

// Set speed drop
export function setSpeedDrop () {
  speedDrop = true;

  logger.debug(ModuleType.TREX, EventType.JUMP, 'Speed drop initiated', {
    component: COMPONENT_NAME,
    context: { jumping, yPos, jumpVelocity },
  });
}

// Reset T-Rex
export function reset () {
  const previousState = {
    xPos,
    yPos,
    status,
    jumpCount,
  };

  xPos = 50;
  yPos = canvas.height - config.HEIGHT - 10;
  width = config.WIDTH;
  height = config.HEIGHT;
  jumping = false;
  ducking = false;
  speedDrop = false;
  jumpVelocity = config.INITIAL_JUMP_VELOCITY;
  jumpCount = 0;
  blinkCount = 0;
  status = TrexStatus.RUNNING;
  runningTime = 0;

  logger.info(ModuleType.TREX, EventType.RESTART, 'T-Rex reset', {
    component: COMPONENT_NAME,
    context: {
      previousState,
      newState: { xPos, yPos, status, jumpCount },
    },
  });
}

// Draw T-Rex
function draw () {
  if (!canvasCtx) {
    logger.warn(ModuleType.RENDER, EventType.DRAW, 'Canvas context not available', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CANVAS_CONTEXT_LOST,
    });
    return;
  }

  try {
    const spriteX = spritePos.x;
    const spriteY = spritePos.y;
    const frameWidth = 44;
    const frameHeight = 59;

    // Select frame based on status

    let frameX = 0;
    if (status === TrexStatus.CRASHED) {
      frameX = 4 * frameWidth;
    } else if (ducking) {
      frameX = 6 * frameWidth;
    } else if (jumping) {
      frameX = 2 * frameWidth;
    } else {
      // Running animation
      const runningFrame = Math.floor(runningTime / 100) % 2;
      frameX = runningFrame * frameWidth;
    }

    canvasCtx.drawImage(
      (window as any).Runner.imageSprite,
      spriteX + frameX,
      spriteY,
      frameWidth,
      frameHeight,
      xPos,
      yPos - 19, // Adjust vertical position
      width,
      height + 19 // Adjust height
    );

    logger.trace(ModuleType.RENDER, EventType.DRAW, 'T-Rex drawn', {
      component: COMPONENT_NAME,
      context: {
        status,
        frameX,
        position: { x: xPos, y: yPos },
        dimensions: { width, height },
      },
    });
  } catch (error) {
    logger.error(ModuleType.RENDER, EventType.DRAW, 'Failed to draw T-Rex', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.RENDER_ERROR,
      context: { error: (error as Error).message },
    });
  }
}

// Get T-Rex object
export function getTrex (): TrexType {
  return {
    canvas,
    canvasCtx: canvasCtx!,
    spritePos,
    config,
    xPos,
    yPos,
    width,
    height,
    jumping,
    ducking,
    speedDrop,
    jumpVelocity,
    maxJumpHeight,
    jumpCount,
    blinkCount,
    status,
    runningTime,
    playingIntro,
  };
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, { canvas: !!canvas, spritePos });
  init();
});

onDestroy(() => {
  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      xPos,
      yPos,
      status,
      jumpCount,
      runningTime,
    },
  });
  logger.clearComponentContext(COMPONENT_NAME);
});
</script>

<!-- T-Rex Component -->
