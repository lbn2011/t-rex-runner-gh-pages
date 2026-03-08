<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import Trex from './Trex.svelte';
import Horizon from './Horizon.svelte';
import DistanceMeter from './DistanceMeter.svelte';
import GameOverPanel from './GameOverPanel.svelte';
import { TrexStatus } from '../types';
import type { GameState, SoundFx, CollisionBox } from '../types';
import {
  gameConfig,
  defaultDimensions,
  classes,
  spriteDefinition,
  sounds,
  keycodes,
  events,
  IS_HIDPI,
  IS_MOBILE,
  IS_IOS,
  FPS,
} from '../config/gameConfig';
import {
  checkForCollision,
  getTimeStamp,
  decodeBase64ToArrayBuffer,
  updateCanvasScaling,
  vibrate,
} from '../utils/gameUtils';
import {
  logger,
  ModuleType,
  EventType,
  ErrorCode,
  storageService,
  logGameStart,
  logGameOver,
  logGameRestart,
  logCollision,
  logJump,
  logInput,
  logSpeedChange,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from '../services';

let container: HTMLElement;
let canvas: HTMLCanvasElement;
let canvasCtx: CanvasRenderingContext2D;
let trexRef: any;
let horizonRef: any;
let distanceMeterRef: any;
let gameOverPanelRef: any;

const COMPONENT_NAME = 'Game';

// Game state - load highest score from storage
let state: GameState = {
  activated: false,
  playing: false,
  crashed: false,
  paused: false,
  inverted: false,
  invertTimer: 0,
  invertTrigger: false,
  playingIntro: false,
  distanceRan: 0,
  highestScore: storageService.getHighScore(),
  currentSpeed: gameConfig.SPEED,
  runningTime: 0,
  playCount: 0,
};

// Game data
let dimensions = { ...defaultDimensions };
let spriteDef = IS_HIDPI ? spriteDefinition.HDPI : spriteDefinition.LDPI;
let audioContext: any = null;
let soundFx: SoundFx = {};
let raqId: number = 0;
let updatePending: boolean = false;
let time: number = 0;
let msPerFrame = 1000 / FPS;
let resizeTimerId: number | null = null;

// Initialize
function init () {
  logger.time('game-init', ModuleType.GAME);

  try {
    // Hide static icon
    const icon = document.querySelector('.icon') as HTMLElement;
    if (icon) {
      icon.style.visibility = 'hidden';
    }

    adjustDimensions();
    setSpeed();

    if (canvas) {
      canvas.width = dimensions.WIDTH;
      canvas.height = dimensions.HEIGHT;

      canvasCtx = canvas.getContext('2d')!;
      if (!canvasCtx) {
        throw new Error('Failed to get 2D canvas context');
      }

      canvasCtx.fillStyle = '#f7f7f7';
      canvasCtx.fillRect(0, 0, dimensions.WIDTH, dimensions.HEIGHT);
      updateCanvasScaling(canvas);
    }

    // Set component context for logging
    logger.setComponentContext(COMPONENT_NAME, {
      dimensions,
      isHIDPI: IS_HIDPI,
      isMobile: IS_MOBILE,
      isIOS: IS_IOS,
    });

    logComponentInit(COMPONENT_NAME, {
      canvasDimensions: { width: dimensions.WIDTH, height: dimensions.HEIGHT },
      spriteDef,
      gameConfig,
    });

    startListening();
    update();

    window.addEventListener(events.RESIZE, debounceResize);

    logger.info(ModuleType.GAME, EventType.INIT, 'Game initialized', {
      component: COMPONENT_NAME,
      context: {
        dimensions,
        isHIDPI: IS_HIDPI,
        isMobile: IS_MOBILE,
      },
    });

    logger.timeEnd('game-init', ModuleType.GAME);
  } catch (error) {
    logger.error(ModuleType.GAME, EventType.ERROR, 'Failed to initialize game', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.CONFIGURATION_ERROR,
      context: { error: (error as Error).message },
    });
    throw error;
  }
}

// Debounce resize
function debounceResize () {
  if (!resizeTimerId) {
    resizeTimerId = window.setInterval(adjustDimensions, 250);

    logger.debug(ModuleType.UI, EventType.INIT, 'Resize debounce started', {
      component: COMPONENT_NAME,
    });
  }
}

// Adjust game space dimensions
function adjustDimensions () {
  if (resizeTimerId) {
    clearInterval(resizeTimerId);
    resizeTimerId = null;

    logger.debug(ModuleType.UI, EventType.INIT, 'Resize debounce cleared', {
      component: COMPONENT_NAME,
    });
  }

  const boxStyles = window.getComputedStyle(container);
  const padding = Number(boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2));

  const previousWidth = dimensions.WIDTH;
  dimensions.WIDTH = container.offsetWidth - padding * 2;
  dimensions.WIDTH = Math.min(defaultDimensions.WIDTH, dimensions.WIDTH); // Arcade mode

  logger.debug(ModuleType.UI, EventType.INIT, 'Dimensions adjusted', {
    component: COMPONENT_NAME,
    context: {
      previousWidth,
      newWidth: dimensions.WIDTH,
      padding,
    },
  });

  if (state.activated) {
    setArcadeModeContainerScale();
  }

  // Redraw elements to canvas
  if (canvas) {
    canvas.width = dimensions.WIDTH;
    canvas.height = dimensions.HEIGHT;

    updateCanvasScaling(canvas);

    if (distanceMeterRef) {
      distanceMeterRef.calcXPos(dimensions.WIDTH);
    }

    clearCanvas();
    if (horizonRef) {
      horizonRef.update(0, 0, true);
    }
    if (trexRef) {
      trexRef.update(0);
    }

    // External container and distance meter
    if (state.playing || state.crashed || state.paused) {
      const containerEl = container.querySelector(`.${classes.CONTAINER}`) as HTMLElement;
      if (containerEl) {
        containerEl.style.width = dimensions.WIDTH + 'px';
        containerEl.style.height = dimensions.HEIGHT + 'px';
      }
      if (distanceMeterRef) {
        distanceMeterRef.update(0, Math.ceil(state.distanceRan));
      }
      stop();
    } else {
      if (trexRef) {
        trexRef.update(0);
      }
    }

    // Game over panel
    if (state.crashed && gameOverPanelRef) {
      gameOverPanelRef.updateDimensions(dimensions.WIDTH);
      gameOverPanelRef.draw();
    }
  }
}

// Clear canvas
function clearCanvas () {
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, dimensions.WIDTH, dimensions.HEIGHT);
  }
}

// Set game speed
function setSpeed (optSpeed?: number) {
  const previousSpeed = state.currentSpeed;
  const speed = optSpeed || state.currentSpeed;

  // Reduce speed on smaller mobile screens
  if (dimensions.WIDTH < defaultDimensions.WIDTH) {
    const mobileSpeed =
      ((speed * dimensions.WIDTH) / defaultDimensions.WIDTH) * gameConfig.MOBILE_SPEED_COEFFICIENT;
    state.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
  } else if (optSpeed) {
    state.currentSpeed = optSpeed;
  }

  if (previousSpeed !== state.currentSpeed) {
    logSpeedChange(state.currentSpeed, {
      previousSpeed,
      isMobile: dimensions.WIDTH < defaultDimensions.WIDTH,
    });

    logger.debug(ModuleType.GAME, EventType.SPEED_CHANGE, 'Game speed updated', {
      component: COMPONENT_NAME,
      context: {
        previousSpeed,
        currentSpeed: state.currentSpeed,
        isMobile: dimensions.WIDTH < defaultDimensions.WIDTH,
      },
    });
  }
}

// Play game intro
function playIntro () {
  if (!state.activated && !state.crashed) {
    state.playingIntro = true;
    if (trexRef) {
      trexRef.playingIntro = true;
    }

    logger.info(ModuleType.GAME, EventType.START, 'Game intro started', {
      component: COMPONENT_NAME,
      context: { playingIntro: true },
    });

    // CSS animation definition
    const keyframes =
      '@-webkit-keyframes intro { ' +
      'from { width:' +
      40 +
      'px }' +
      'to { width: ' +
      dimensions.WIDTH +
      'px }' +
      '}';

    // Create stylesheet and put in html head
    const sheet = document.createElement('style');
    sheet.innerHTML = keyframes;
    document.head.appendChild(sheet);

    const containerEl = container.querySelector(`.${classes.CONTAINER}`) as HTMLElement;
    if (containerEl) {
      containerEl.addEventListener(events.ANIM_END, startGame);
      containerEl.style.webkitAnimation = 'intro .4s ease-out 1 both';
      containerEl.style.width = dimensions.WIDTH + 'px';
    }

    state.playing = true;
    state.activated = true;
  } else if (state.crashed) {
    restart();
  }
}

// Start game
function startGame () {
  setArcadeMode();
  state.runningTime = 0;
  state.playingIntro = false;
  if (trexRef) {
    trexRef.playingIntro = false;
  }
  const containerEl = container.querySelector(`.${classes.CONTAINER}`) as HTMLElement;
  if (containerEl) {
    containerEl.style.webkitAnimation = '';
  }
  state.playCount++;

  logger.info(ModuleType.GAME, EventType.START, 'Game started', {
    component: COMPONENT_NAME,
    context: {
      playCount: state.playCount,
      currentSpeed: state.currentSpeed,
    },
  });

  // Handle tab switching. Pause current game.
  document.addEventListener(events.VISIBILITY, onVisibilityChange);
  window.addEventListener(events.BLUR, onVisibilityChange);
  window.addEventListener(events.FOCUS, onVisibilityChange);
}

// Set arcade mode
function setArcadeMode () {
  document.body.classList.add(classes.ARCADE_MODE);
  setArcadeModeContainerScale();

  logger.debug(ModuleType.UI, EventType.INIT, 'Arcade mode set', {
    component: COMPONENT_NAME,
  });
}

// Set arcade mode container scale
function setArcadeModeContainerScale () {
  const windowHeight = window.innerHeight;
  const scaleHeight = windowHeight / dimensions.HEIGHT;
  const scaleWidth = window.innerWidth / dimensions.WIDTH;
  const scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
  const scaledCanvasHeight = dimensions.HEIGHT * scale;
  // Position game container at 10% of available vertical window height, minus game container height.
  const translateY =
    Math.ceil(
      Math.max(
        0,
        (windowHeight - scaledCanvasHeight - gameConfig.ARCADE_MODE_INITIAL_TOP_POSITION) *
          gameConfig.ARCADE_MODE_TOP_POSITION_PERCENT
      )
    ) * window.devicePixelRatio;

  const cssScale = scale;
  const containerEl = container.querySelector(`.${classes.CONTAINER}`) as HTMLElement;
  if (containerEl) {
    containerEl.style.transform = `scale(${cssScale}) translateY(${translateY}px)`;
  }

  logger.trace(ModuleType.UI, EventType.INIT, 'Arcade mode scale set', {
    component: COMPONENT_NAME,
    context: { scale, translateY, cssScale },
  });
}

// Game main loop
function update () {
  updatePending = false;

  const now = getTimeStamp();
  const deltaTime = now - (time || now);
  time = now;

  if (state.playing) {
    clearCanvas();

    if (trexRef && trexRef.jumping) {
      trexRef.updateJump(deltaTime);
    }

    state.runningTime += deltaTime;
    const hasObstacles = state.runningTime > gameConfig.CLEAR_TIME;

    // First jump triggers intro.
    if (trexRef && trexRef.jumpCount == 1 && !state.playingIntro) {
      playIntro();
    }

    // Horizon doesn't move until intro ends.
    if (state.playingIntro) {
      if (horizonRef) {
        horizonRef.update(0, state.currentSpeed, hasObstacles);
      }
    } else {
      const delta = !state.activated ? 0 : deltaTime;
      if (horizonRef) {
        horizonRef.update(delta, state.currentSpeed, hasObstacles, state.inverted);
      }
    }

    // Check for collisions.
    let collision: false | [CollisionBox, CollisionBox] = false;
    let collidedObstacleType = 'unknown';
    if (hasObstacles && trexRef && horizonRef) {
      const obstacles = horizonRef.getObstacles();
      if (obstacles.length > 0) {
        collision = checkForCollision(obstacles[0], trexRef.getTrex());
        collidedObstacleType = obstacles[0]?.typeConfig?.type || 'unknown';
      }
    }

    if (!collision) {
      state.distanceRan += (state.currentSpeed * deltaTime) / msPerFrame;

      if (state.currentSpeed < gameConfig.MAX_SPEED) {
        state.currentSpeed += gameConfig.ACCELERATION;
      }
    } else {
      logCollision(collidedObstacleType);
      gameOver();
    }

    let playAchievementSound = false;
    if (distanceMeterRef) {
      playAchievementSound = distanceMeterRef.update(deltaTime, Math.ceil(state.distanceRan));
    }

    if (playAchievementSound) {
      playSound(soundFx.SCORE);
    }

    // Night mode.
    if (state.invertTimer > gameConfig.INVERT_FADE_DURATION) {
      state.invertTimer = 0;
      state.invertTrigger = false;
      invert();
    } else if (state.invertTimer) {
      state.invertTimer += deltaTime;
    } else {
      let actualDistance = 0;
      if (distanceMeterRef) {
        actualDistance = distanceMeterRef.getActualDistance(Math.ceil(state.distanceRan));
      }

      if (actualDistance > 0) {
        state.invertTrigger = !(actualDistance % gameConfig.INVERT_DISTANCE);

        if (state.invertTrigger && state.invertTimer === 0) {
          state.invertTimer += deltaTime;
          invert();

          logger.debug(ModuleType.GAME, EventType.ANIMATION, 'Night mode triggered', {
            component: COMPONENT_NAME,
            context: { actualDistance, invertDistance: gameConfig.INVERT_DISTANCE },
          });
        }
      }
    }
  }

  if (
    state.playing ||
    (!state.activated && trexRef && trexRef.blinkCount < gameConfig.MAX_BLINK_COUNT)
  ) {
    if (trexRef) {
      trexRef.update(deltaTime);
    }
    scheduleNextUpdate();
  }
}

// Schedule next update
function scheduleNextUpdate () {
  if (!updatePending) {
    updatePending = true;
    raqId = window.requestAnimationFrame(update);
  }
}

// Event handler
function handleEvent (e: Event) {
  switch (e.type) {
  case events.KEYDOWN:
  case events.TOUCHSTART:
  case events.MOUSEDOWN:
    onKeyDown(e);
    break;
  case events.KEYUP:
  case events.TOUCHEND:
  case events.MOUSEUP:
    onKeyUp(e);
    break;
  }
}

// Start listening
function startListening () {
  // Keyboard
  document.addEventListener(events.KEYDOWN, handleEvent);
  document.addEventListener(events.KEYUP, handleEvent);

  if (IS_MOBILE) {
    // Mobile touch
    const containerEl = container.querySelector(`.${classes.CONTAINER}`);
    if (containerEl) {
      containerEl.addEventListener(events.TOUCHSTART, handleEvent);
    }
  } else {
    // Mouse
    document.addEventListener(events.MOUSEDOWN, handleEvent);
    document.addEventListener(events.MOUSEUP, handleEvent);
  }

  logger.debug(ModuleType.INPUT, EventType.INIT, 'Input listeners started', {
    component: COMPONENT_NAME,
    context: { isMobile: IS_MOBILE },
  });
}

// Stop listening
function stopListening () {
  document.removeEventListener(events.KEYDOWN, handleEvent);
  document.removeEventListener(events.KEYUP, handleEvent);

  if (IS_MOBILE) {
    const containerEl = container.querySelector(`.${classes.CONTAINER}`);
    if (containerEl) {
      containerEl.removeEventListener(events.TOUCHSTART, handleEvent);
    }
  } else {
    document.removeEventListener(events.MOUSEDOWN, handleEvent);
    document.removeEventListener(events.MOUSEUP, handleEvent);
  }

  logger.debug(ModuleType.INPUT, EventType.INIT, 'Input listeners stopped', {
    component: COMPONENT_NAME,
  });
}

// Handle key down
function onKeyDown (e: Event) {
  // Prevent native page scrolling on mobile when tapping
  if (IS_MOBILE && state.playing) {
    e.preventDefault();
  }

  const keyEvent = e as KeyboardEvent;

  logInput(keyEvent.keyCode, keyEvent.key || 'unknown', {
    eventType: e.type,
    isPlaying: state.playing,
    isCrashed: state.crashed,
  });

  if (!state.crashed && (keycodes.JUMP[keyEvent.keyCode] || e.type == events.TOUCHSTART)) {
    if (!state.playing) {
      loadSounds();
      state.playing = true;
      update();
      logGameStart();

      logger.info(ModuleType.GAME, EventType.START, 'Game started by user input', {
        component: COMPONENT_NAME,
        context: { inputType: e.type, keyCode: keyEvent.keyCode },
      });
    }
    // Play sound and jump on first game start.
    if (trexRef && !trexRef.jumping && !trexRef.ducking) {
      playSound(soundFx.BUTTON_PRESS);
      logJump(trexRef.yPos, { speed: state.currentSpeed });
      trexRef.startJump(state.currentSpeed);
    }
  }

  if (state.crashed && e.type == events.TOUCHSTART) {
    const target = e.target as HTMLElement;
    const containerEl = container.querySelector(`.${classes.CONTAINER}`);
    if (containerEl && target === containerEl) {
      restart();
    }
  }

  if (state.playing && !state.crashed && keycodes.DUCK[keyEvent.keyCode]) {
    e.preventDefault();
    if (trexRef && trexRef.jumping) {
      // Speed drop, only activates when jump key is not pressed.
      trexRef.setSpeedDrop();
    } else if (trexRef && !trexRef.jumping && !trexRef.ducking) {
      // Duck.
      trexRef.setDuck(true);
    }
  }
}

// Handle key up
function onKeyUp (e: Event) {
  const keyEvent = e as KeyboardEvent;
  const keyCode = String(keyEvent.keyCode);
  const isjumpKey = keycodes.JUMP[keyCode] || e.type == events.TOUCHEND || e.type == events.MOUSEUP;

  if (isRunning() && isjumpKey) {
    if (trexRef) {
      trexRef.endJump();
    }
  } else if (keycodes.DUCK[keyCode]) {
    if (trexRef) {
      trexRef.speedDrop = false;
      trexRef.setDuck(false);
    }
  } else if (state.crashed) {
    // Check if enough time has passed before allowing jump key to restart.
    const deltaTime = getTimeStamp() - time;

    if (
      keycodes.RESTART[keyCode] ||
      isLeftClickOnCanvas(e) ||
      (deltaTime >= gameConfig.GAMEOVER_CLEAR_TIME && keycodes.JUMP[keyCode])
    ) {
      restart();
    }
  } else if (state.paused && isjumpKey) {
    // Reset jump state
    if (trexRef) {
      trexRef.reset();
    }
    play();
  }
}

// Check if left click on canvas
function isLeftClickOnCanvas (e: Event): boolean {
  const mouseEvent = e as MouseEvent;
  return (
    mouseEvent.button != null &&
    mouseEvent.button < 2 &&
    e.type == events.MOUSEUP &&
    e.target === canvas
  );
}

// Check if game is running
function isRunning (): boolean {
  return !!raqId;
}

// Game over
function gameOver () {
  playSound(soundFx.HIT);
  vibrate(200);

  stop();
  state.crashed = true;

  if (trexRef) {
    trexRef.update(100, TrexStatus.CRASHED);
  }

  // Update high score
  const previousHighScore = state.highestScore;
  const newScore = Math.ceil(state.distanceRan);
  if (storageService.updateHighScore(newScore)) {
    state.highestScore = newScore;
    if (distanceMeterRef) {
      distanceMeterRef.setHighScore(state.highestScore);
    }

    logger.info(ModuleType.GAME, EventType.SCORE_UPDATE, 'New high score achieved and saved', {
      component: COMPONENT_NAME,
      context: {
        previousHighScore,
        newHighScore: state.highestScore,
        distanceRan: state.distanceRan,
      },
    });
  }

  logGameOver(state.highestScore, {
    distanceRan: state.distanceRan,
    runningTime: state.runningTime,
    playCount: state.playCount,
  });

  logger.info(ModuleType.GAME, EventType.GAME_OVER, 'Game over', {
    component: COMPONENT_NAME,
    context: {
      distanceRan: state.distanceRan,
      highestScore: state.highestScore,
      runningTime: state.runningTime,
      currentSpeed: state.currentSpeed,
    },
  });

  // Reset clock.
  time = getTimeStamp();
}

// Stop game
function stop () {
  state.playing = false;
  state.paused = true;
  window.cancelAnimationFrame(raqId);
  raqId = 0;

  logger.debug(ModuleType.GAME, EventType.PAUSE, 'Game stopped', {
    component: COMPONENT_NAME,
    context: {
      distanceRan: state.distanceRan,
      runningTime: state.runningTime,
    },
  });
}

// Play game
function play () {
  if (!state.crashed) {
    state.playing = true;
    state.paused = false;
    if (trexRef) {
      trexRef.update(0, TrexStatus.RUNNING);
    }
    time = getTimeStamp();
    update();

    logger.debug(ModuleType.GAME, EventType.RESUME, 'Game resumed', {
      component: COMPONENT_NAME,
    });
  }
}

// Restart game
function restart () {
  if (!raqId) {
    logGameRestart({
      previousHighScore: state.highestScore,
      previousDistance: state.distanceRan,
      playCount: state.playCount,
    });

    state.playCount++;
    state.runningTime = 0;
    state.playing = true;
    state.crashed = false;
    state.distanceRan = 0;
    setSpeed(gameConfig.SPEED);
    time = getTimeStamp();

    const containerEl = container.querySelector(`.${classes.CONTAINER}`);
    if (containerEl) {
      containerEl.classList.remove(classes.CRASHED);
    }

    clearCanvas();

    if (distanceMeterRef) {
      distanceMeterRef.reset(state.highestScore);
    }
    if (horizonRef) {
      horizonRef.reset();
    }
    if (trexRef) {
      trexRef.reset();
    }

    playSound(soundFx.BUTTON_PRESS);
    invert(true);
    update();

    logger.info(ModuleType.GAME, EventType.RESTART, 'Game restarted', {
      component: COMPONENT_NAME,
      context: {
        playCount: state.playCount,
        highestScore: state.highestScore,
      },
    });
  }
}

// Load sounds
function loadSounds () {
  if (!IS_IOS) {
    try {
      audioContext = new (window as any).AudioContext();

      const resourceTemplate = document.getElementById(gameConfig.RESOURCE_TEMPLATE_ID) as any;
      if (resourceTemplate) {
        const content = resourceTemplate.content;
        if (content) {
          let loadedSounds = 0;
          const totalSounds = Object.keys(sounds).length;

          for (const sound in sounds) {
            const soundId = sounds[sound as keyof typeof sounds];
            const soundElement = content.getElementById(soundId);
            if (soundElement) {
              let soundSrc = soundElement.src;
              soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
              const buffer = decodeBase64ToArrayBuffer(soundSrc);

              // Async, so no order guarantee in array.
              audioContext.decodeAudioData(buffer, (audioData: any) => {
                soundFx[sound as keyof SoundFx] = audioData;
                loadedSounds++;

                if (loadedSounds === totalSounds) {
                  logger.debug(ModuleType.AUDIO, EventType.INIT, 'All sounds loaded', {
                    component: COMPONENT_NAME,
                    context: { totalSounds },
                  });
                }
              });
            }
          }
        }
      }

      logger.debug(ModuleType.AUDIO, EventType.INIT, 'Audio context created', {
        component: COMPONENT_NAME,
      });
    } catch (error) {
      logger.error(ModuleType.AUDIO, EventType.ERROR, 'Failed to load sounds', {
        component: COMPONENT_NAME,
        errorCode: ErrorCode.AUDIO_INIT_FAILED,
        context: { error: (error as Error).message },
      });
    }
  }
}

// Play sound
function playSound (soundBuffer?: any) {
  if (soundBuffer && audioContext) {
    try {
      const sourceNode = audioContext.createBufferSource();
      sourceNode.buffer = soundBuffer;
      sourceNode.connect(audioContext.destination);
      sourceNode.start(0);

      logger.trace(ModuleType.AUDIO, EventType.INIT, 'Sound played', {
        component: COMPONENT_NAME,
      });
    } catch (error) {
      logger.warn(ModuleType.AUDIO, EventType.WARNING, 'Failed to play sound', {
        component: COMPONENT_NAME,
        context: { error: (error as Error).message },
      });
    }
  }
}

// Invert current page/canvas colors
function invert (reset?: boolean) {
  if (reset) {
    document.body.classList.toggle(classes.INVERTED, false);
    state.invertTimer = 0;
    state.inverted = false;

    logger.debug(ModuleType.GAME, EventType.ANIMATION, 'Night mode reset', {
      component: COMPONENT_NAME,
    });
  } else {
    state.inverted = document.body.classList.toggle(classes.INVERTED, state.invertTrigger);

    logger.debug(ModuleType.GAME, EventType.ANIMATION, 'Night mode toggled', {
      component: COMPONENT_NAME,
      context: { inverted: state.inverted, invertTrigger: state.invertTrigger },
    });
  }
}

// Tab visibility change
function onVisibilityChange (e: Event) {
  const webkitHidden = (document as any).webkitHidden;
  if (
    document.hidden ||
    webkitHidden ||
    e.type == 'blur' ||
    document.visibilityState != 'visible'
  ) {
    stop();

    logger.debug(ModuleType.GAME, EventType.PAUSE, 'Game paused due to visibility change', {
      component: COMPONENT_NAME,
      context: { eventType: e.type },
    });
  } else if (!state.crashed) {
    if (trexRef) {
      trexRef.reset();
    }
    play();

    logger.debug(ModuleType.GAME, EventType.RESUME, 'Game resumed after visibility change', {
      component: COMPONENT_NAME,
    });
  }
}

// Component lifecycle
onMount(() => {
  logComponentMount(COMPONENT_NAME, { container: !!container });

  // Load high score from storage on mount
  const storedHighScore = storageService.getHighScore();
  if (storedHighScore > state.highestScore) {
    state.highestScore = storedHighScore;
    logger.info(ModuleType.GAME, EventType.INIT, 'High score loaded from storage', {
      component: COMPONENT_NAME,
      context: { highScore: state.highestScore },
    });
  }

  // Ensure Runner.imageSprite is available
  (window as any).Runner = (window as any).Runner || {};
  (window as any).Runner.imageSprite = IS_HIDPI
    ? document.getElementById('offline-resources-2x')
    : document.getElementById('offline-resources-1x');

  if (!(window as any).Runner.imageSprite) {
    logger.error(ModuleType.GAME, EventType.ERROR, 'Sprite image not found', {
      component: COMPONENT_NAME,
      errorCode: ErrorCode.SPRITE_LOAD_FAILED,
      context: { isHIDPI: IS_HIDPI },
    });
  }

  init();
});

// Component cleanup
onDestroy(() => {
  stopListening();
  stop();
  if (resizeTimerId) {
    clearInterval(resizeTimerId);
  }

  logComponentUnmount(COMPONENT_NAME, {
    finalState: {
      playCount: state.playCount,
      highestScore: state.highestScore,
      distanceRan: state.distanceRan,
    },
  });

  logger.clearComponentContext(COMPONENT_NAME);

  logger.info(ModuleType.GAME, EventType.DESTROY, 'Game component destroyed', {
    component: COMPONENT_NAME,
  });
});
</script>

<style>
.game-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

<div bind:this={container} class="game-container">
  <div class={classes.CONTAINER}>
    <canvas
      bind:this={canvas}
      class={`${classes.CANVAS} ${classes.PLAYER}`}
      width={dimensions.WIDTH}
      height={dimensions.HEIGHT}
    ></canvas>
    {#if canvas}
      <Trex bind:this={trexRef} {canvas} spritePos={spriteDef.TREX} />
      <Horizon
        bind:this={horizonRef}
        {canvas}
        {spriteDef}
        {dimensions}
        gapCoefficient={gameConfig.GAP_COEFFICIENT}
      />
      <DistanceMeter
        bind:this={distanceMeterRef}
        {canvas}
        textSpritePos={spriteDef.TEXT_SPRITE}
        canvasWidth={dimensions.WIDTH}
      />
      {#if state.crashed}
        <GameOverPanel
          bind:this={gameOverPanelRef}
          {canvas}
          textImgPos={spriteDef.TEXT_SPRITE}
          restartImgPos={spriteDef.RESTART}
          {dimensions}
        />
      {/if}
    {/if}
  </div>
  {#if IS_MOBILE}
    <div class={classes.TOUCH_CONTROLLER}></div>
  {/if}
</div>
