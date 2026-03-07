<script lang="ts">
import { onMount } from 'svelte';
import { TrexStatus } from '../types';
import type { Trex as TrexType } from '../types';
import { gameConfig } from '../config/gameConfig';

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

// 初始化
function init() {
  canvasCtx = canvas.getContext('2d')!;
  yPos = canvas.height - config.HEIGHT - 10;
}

// 更新霸王龙状态
export function update(deltaTime: number, newStatus?: TrexStatus) {
  if (newStatus) {
    status = newStatus;
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
      break;
  }

  draw();
}

// 更新跑步状态
function updateRunning(_deltaTime: number) {
  // 眨眼动画
  if (blinkCount < 3) {
    const blinkInterval = 2000;
    const blinkDuration = 100;
    const blinkTime = runningTime % blinkInterval;
    if (blinkTime < blinkDuration) {
      // 眨眼状态
    } else {
      // 正常状态
    }
  }
}

// 更新跳跃状态
export function updateJump(_deltaTime: number) {
  if (speedDrop) {
    jumpVelocity = gameConfig.INITIAL_JUMP_VELOCITY * config.SPEED_DROP_COEFFICIENT;
  }

  yPos += jumpVelocity;
  jumpVelocity += config.GRAVITY;

  // 检查是否落地
  const groundY = canvas.height - config.HEIGHT - 10;
  if (yPos >= groundY) {
    yPos = groundY;
    jumping = false;
    speedDrop = false;
    jumpVelocity = config.INITIAL_JUMP_VELOCITY;
    status = TrexStatus.RUNNING;
  }
}

// 更新下蹲状态
function updateDucking(_deltaTime: number) {
  width = config.DUCK_WIDTH;
  height = config.DUCK_HEIGHT;
}

// 开始跳跃
export function startJump(speed: number) {
  if (!jumping && !ducking) {
    jumping = true;
    status = TrexStatus.JUMPING;
    jumpCount++;
    maxJumpHeight = yPos - config.MIN_JUMP_HEIGHT;
    // 调整跳跃速度基于游戏速度
    jumpVelocity = -config.INITIAL_JUMP_VELOCITY - speed / 10;
  }
}

// 结束跳跃
export function endJump() {
  if (jumping && jumpVelocity < -3) {
    jumpVelocity = -3;
  }
}

// 设置下蹲
export function setDuck(duck: boolean) {
  ducking = duck;
  if (duck) {
    status = TrexStatus.DUCKING;
    width = config.DUCK_WIDTH;
    height = config.DUCK_HEIGHT;
  } else {
    status = TrexStatus.RUNNING;
    width = config.WIDTH;
    height = config.HEIGHT;
  }
}

// 设置快速下落
export function setSpeedDrop() {
  speedDrop = true;
}

// 重置
export function reset() {
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
}

// 绘制霸王龙
function draw() {
  if (!canvasCtx) return;

  const spriteX = spritePos.x;
  const spriteY = spritePos.y;
  const frameWidth = 44;
  const frameHeight = 59;

  // 根据状态选择帧
  // eslint-disable-next-line no-useless-assignment
  let frameX = 0;
  if (status === TrexStatus.CRASHED) {
    frameX = 4 * frameWidth;
  } else if (ducking) {
    frameX = 6 * frameWidth;
  } else if (jumping) {
    frameX = 2 * frameWidth;
  } else {
    // 跑步动画
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
    yPos - 19, // 调整垂直位置
    width,
    height + 19 // 调整高度
  );
}

// 获取霸王龙对象
export function getTrex(): TrexType {
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

// 组件挂载时初始化
onMount(() => {
  init();
});
</script>

<!-- 霸王龙组件 -->
