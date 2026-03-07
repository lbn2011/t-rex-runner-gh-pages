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
import { logGameStart, logGameOver, logCollision, logJump } from '../services/logger';

// 全局对象类型声明
declare type FrameRequestCallback = (time: number) => void;
declare const requestAnimationFrame: (callback: FrameRequestCallback) => number;
declare const cancelAnimationFrame: (id: number) => void;

let container: HTMLElement;
let canvas: HTMLCanvasElement;
let canvasCtx: CanvasRenderingContext2D;
let trexRef: any;
let horizonRef: any;
let distanceMeterRef: any;
let gameOverPanelRef: any;

// 游戏状态
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
  highestScore: 0,
  currentSpeed: gameConfig.SPEED,
  runningTime: 0,
  playCount: 0,
};

// 游戏数据
let dimensions = { ...defaultDimensions };
let spriteDef = IS_HIDPI ? spriteDefinition.HDPI : spriteDefinition.LDPI;
let audioContext: any = null;
let soundFx: SoundFx = {};
let raqId: number = 0;
let updatePending: boolean = false;
let time: number = 0;
let msPerFrame = 1000 / FPS;
let resizeTimerId: number | null = null;

// 初始化
function init() {
  // 隐藏静态图标
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
    canvasCtx.fillStyle = '#f7f7f7';
    canvasCtx.fillRect(0, 0, dimensions.WIDTH, dimensions.HEIGHT);
    updateCanvasScaling(canvas);
  }

  startListening();
  update();

  window.addEventListener(events.RESIZE, debounceResize);
}

// 防抖调整大小
function debounceResize() {
  if (!resizeTimerId) {
    resizeTimerId = window.setInterval(adjustDimensions, 250);
  }
}

// 调整游戏空间维度
function adjustDimensions() {
  if (resizeTimerId) {
    clearInterval(resizeTimerId);
    resizeTimerId = null;
  }

  const boxStyles = window.getComputedStyle(container);
  const padding = Number(boxStyles.paddingLeft.substr(0, boxStyles.paddingLeft.length - 2));

  dimensions.WIDTH = container.offsetWidth - padding * 2;
  dimensions.WIDTH = Math.min(defaultDimensions.WIDTH, dimensions.WIDTH); // 街机模式

  if (state.activated) {
    setArcadeModeContainerScale();
  }

  // 重绘元素到画布
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

    // 外部容器和距离计量器
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

    // 游戏结束面板
    if (state.crashed && gameOverPanelRef) {
      gameOverPanelRef.updateDimensions(dimensions.WIDTH);
      gameOverPanelRef.draw();
    }
  }
}

// 清除画布
function clearCanvas() {
  if (canvasCtx) {
    canvasCtx.clearRect(0, 0, dimensions.WIDTH, dimensions.HEIGHT);
  }
}

// 设置游戏速度
function setSpeed(optSpeed?: number) {
  const speed = optSpeed || state.currentSpeed;

  // 在较小的移动屏幕上降低速度
  if (dimensions.WIDTH < defaultDimensions.WIDTH) {
    const mobileSpeed =
      ((speed * dimensions.WIDTH) / defaultDimensions.WIDTH) * gameConfig.MOBILE_SPEED_COEFFICIENT;
    state.currentSpeed = mobileSpeed > speed ? speed : mobileSpeed;
  } else if (optSpeed) {
    state.currentSpeed = optSpeed;
  }
}

// 开始游戏介绍
function playIntro() {
  if (!state.activated && !state.crashed) {
    state.playingIntro = true;
    if (trexRef) {
      trexRef.playingIntro = true;
    }

    // CSS动画定义
    const keyframes =
      '@-webkit-keyframes intro { ' +
      'from { width:' +
      40 +
      'px }' +
      'to { width: ' +
      dimensions.WIDTH +
      'px }' +
      '}';

    // 创建样式表并放入html头部
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

// 开始游戏
function startGame() {
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

  // 处理标签页切换。暂停当前游戏。
  document.addEventListener(events.VISIBILITY, onVisibilityChange);
  window.addEventListener(events.BLUR, onVisibilityChange);
  window.addEventListener(events.FOCUS, onVisibilityChange);
}

// 设置街机模式
function setArcadeMode() {
  document.body.classList.add(classes.ARCADE_MODE);
  setArcadeModeContainerScale();
}

// 设置街机模式容器缩放
function setArcadeModeContainerScale() {
  const windowHeight = window.innerHeight;
  const scaleHeight = windowHeight / dimensions.HEIGHT;
  const scaleWidth = window.innerWidth / dimensions.WIDTH;
  const scale = Math.max(1, Math.min(scaleHeight, scaleWidth));
  const scaledCanvasHeight = dimensions.HEIGHT * scale;
  // 将游戏容器定位在可用垂直窗口高度的10%处，减去游戏容器高度。
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
}

// 游戏主循环
function update() {
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

    // 第一次跳跃触发介绍。
    if (trexRef && trexRef.jumpCount == 1 && !state.playingIntro) {
      playIntro();
    }

    // 直到介绍结束，地平线才会移动。
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

    // 检查碰撞。
    let collision: false | [CollisionBox, CollisionBox] = false;
    if (hasObstacles && trexRef && horizonRef) {
      const obstacles = horizonRef.getObstacles();
      if (obstacles.length > 0) {
        collision = checkForCollision(obstacles[0], trexRef.getTrex());
      }
    }

    if (!collision) {
      state.distanceRan += (state.currentSpeed * deltaTime) / msPerFrame;

      if (state.currentSpeed < gameConfig.MAX_SPEED) {
        state.currentSpeed += gameConfig.ACCELERATION;
      }
    } else {
      logCollision();
      gameOver();
    }

    let playAchievementSound = false;
    if (distanceMeterRef) {
      playAchievementSound = distanceMeterRef.update(deltaTime, Math.ceil(state.distanceRan));
    }

    if (playAchievementSound) {
      playSound(soundFx.SCORE);
    }

    // 夜间模式。
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

// 调度下一次更新
function scheduleNextUpdate() {
  if (!updatePending) {
    updatePending = true;
    raqId = requestAnimationFrame(update);
  }
}

// 事件处理程序
function handleEvent(e: Event) {
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

// 开始监听
function startListening() {
  // 键盘
  document.addEventListener(events.KEYDOWN, handleEvent);
  document.addEventListener(events.KEYUP, handleEvent);

  if (IS_MOBILE) {
    // 移动设备触摸
    const containerEl = container.querySelector(`.${classes.CONTAINER}`);
    if (containerEl) {
      containerEl.addEventListener(events.TOUCHSTART, handleEvent);
    }
  } else {
    // 鼠标
    document.addEventListener(events.MOUSEDOWN, handleEvent);
    document.addEventListener(events.MOUSEUP, handleEvent);
  }
}

// 停止监听
function stopListening() {
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
}

// 处理按键按下
function onKeyDown(e: Event) {
  // 防止在移动设备上点击时原生页面滚动
  if (IS_MOBILE && state.playing) {
    e.preventDefault();
  }

  const keyEvent = e as KeyboardEvent;
  if (!state.crashed && (keycodes.JUMP[keyEvent.keyCode] || e.type == events.TOUCHSTART)) {
    if (!state.playing) {
      loadSounds();
      state.playing = true;
      update();
      logGameStart();
    }
    // 第一次开始游戏时播放音效并跳跃。
    if (trexRef && !trexRef.jumping && !trexRef.ducking) {
      playSound(soundFx.BUTTON_PRESS);
      logJump();
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
      // 快速下落，仅在未按下跳跃键时激活。
      trexRef.setSpeedDrop();
    } else if (trexRef && !trexRef.jumping && !trexRef.ducking) {
      // 下蹲。
      trexRef.setDuck(true);
    }
  }
}

// 处理按键释放
function onKeyUp(e: Event) {
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
    // 检查是否经过足够的时间后才允许跳跃键重新开始。
    const deltaTime = getTimeStamp() - time;

    if (
      keycodes.RESTART[keyCode] ||
      isLeftClickOnCanvas(e) ||
      (deltaTime >= gameConfig.GAMEOVER_CLEAR_TIME && keycodes.JUMP[keyCode])
    ) {
      restart();
    }
  } else if (state.paused && isjumpKey) {
    // 重置跳跃状态
    if (trexRef) {
      trexRef.reset();
    }
    play();
  }
}

// 检查是否为画布上的左键点击
function isLeftClickOnCanvas(e: Event): boolean {
  const mouseEvent = e as MouseEvent;
  return (
    mouseEvent.button != null &&
    mouseEvent.button < 2 &&
    e.type == events.MOUSEUP &&
    e.target === canvas
  );
}

// 游戏是否正在运行
function isRunning(): boolean {
  return !!raqId;
}

// 游戏结束
function gameOver() {
  playSound(soundFx.HIT);
  vibrate(200);

  stop();
  state.crashed = true;

  if (trexRef) {
    trexRef.update(100, TrexStatus.CRASHED);
  }

  // 游戏结束面板
  if (!gameOverPanelRef) {
    // 游戏结束面板将在组件挂载时创建
  }

  // 更新最高分
  if (state.distanceRan > state.highestScore) {
    state.highestScore = Math.ceil(state.distanceRan);
    if (distanceMeterRef) {
      distanceMeterRef.setHighScore(state.highestScore);
    }
  }

  logGameOver(state.highestScore);

  // 重置时钟。
  time = getTimeStamp();
}

// 停止游戏
function stop() {
  state.playing = false;
  state.paused = true;
  cancelAnimationFrame(raqId);
  raqId = 0;
}

// 播放游戏
function play() {
  if (!state.crashed) {
    state.playing = true;
    state.paused = false;
    if (trexRef) {
      trexRef.update(0, TrexStatus.RUNNING);
    }
    time = getTimeStamp();
    update();
  }
}

// 重新开始游戏
function restart() {
  if (!raqId) {
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
  }
}

// 加载音效
function loadSounds() {
  if (!IS_IOS) {
    audioContext = new (window as any).AudioContext();

    const resourceTemplate = document.getElementById(gameConfig.RESOURCE_TEMPLATE_ID) as any;
    if (resourceTemplate) {
      const content = resourceTemplate.content;
      if (content) {
        for (const sound in sounds) {
          const soundId = sounds[sound as keyof typeof sounds];
          const soundElement = content.getElementById(soundId);
          if (soundElement) {
            let soundSrc = soundElement.src;
            soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
            const buffer = decodeBase64ToArrayBuffer(soundSrc);

            // 异步，所以数组中没有顺序保证。
            audioContext.decodeAudioData(buffer, (audioData: any) => {
              soundFx[sound as keyof SoundFx] = audioData;
            });
          }
        }
      }
    }
  }
}

// 播放音效
function playSound(soundBuffer?: any) {
  if (soundBuffer && audioContext) {
    const sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = soundBuffer;
    sourceNode.connect(audioContext.destination);
    sourceNode.start(0);
  }
}

// 反转当前页面/画布颜色
function invert(reset?: boolean) {
  if (reset) {
    document.body.classList.toggle(classes.INVERTED, false);
    state.invertTimer = 0;
    state.inverted = false;
  } else {
    state.inverted = document.body.classList.toggle(classes.INVERTED, state.invertTrigger);
  }
}

// 标签页可见性变化
function onVisibilityChange(e: Event) {
  const webkitHidden = (document as any).webkitHidden;
  if (
    document.hidden ||
    webkitHidden ||
    e.type == 'blur' ||
    document.visibilityState != 'visible'
  ) {
    stop();
  } else if (!state.crashed) {
    if (trexRef) {
      trexRef.reset();
    }
    play();
  }
}

// 组件挂载时初始化
onMount(() => {
  // 确保Runner.imageSprite可用
  (window as any).Runner = (window as any).Runner || {};
  (window as any).Runner.imageSprite = IS_HIDPI
    ? document.getElementById('offline-resources-2x')
    : document.getElementById('offline-resources-1x');

  init();
});

// 组件销毁时清理
onDestroy(() => {
  stopListening();
  stop();
  if (resizeTimerId) {
    clearInterval(resizeTimerId);
  }
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
