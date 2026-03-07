<script lang="ts">
import { onMount } from 'svelte';
import type {
  Obstacle as ObstacleType,
  ObstacleTypeConfig,
  SpriteDefinition,
  GameDimensions,
} from '../types';
import { getRandomNum } from '../utils/gameUtils';
import { IS_HIDPI, IS_MOBILE } from '../config/gameConfig';
import { MAX_OBSTACLE_LENGTH } from '../config/obstacleTypes';

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

// 初始化
function init() {
  // 只有在正确速度时才允许调整大小
  if (size > 1 && type.multipleSpeed > speed) {
    size = 1;
  }

  width = type.width * size;

  // 检查障碍物是否可以定位在不同高度
  if (Array.isArray(type.yPos)) {
    const yPosConfig = IS_MOBILE && type.yPosMobile ? type.yPosMobile : type.yPos;
    yPos = yPosConfig[getRandomNum(0, yPosConfig.length - 1)];
  } else {
    yPos = type.yPos;
  }

  draw();

  // 调整碰撞盒
  if (size > 1) {
    collisionBoxes[1].width = width - collisionBoxes[0].width - collisionBoxes[2].width;
    collisionBoxes[2].x = width - collisionBoxes[2].width;
  }

  // 对于以不同速度移动的障碍物
  if (type.speedOffset) {
    speedOffset = Math.random() > 0.5 ? type.speedOffset : -type.speedOffset;
  }

  gap = getGap(gapCoefficient, speed);
}

// 绘制障碍物
function draw() {
  let sourceWidth = type.width;
  let sourceHeight = type.height;

  if (IS_HIDPI) {
    sourceWidth = sourceWidth * 2;
    sourceHeight = sourceHeight * 2;
  }

  // 精灵中的X位置
  let sourceX = sourceWidth * size * (0.5 * (size - 1)) + spritePos.x;

  // 动画帧
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
}

// 更新障碍物
export function update(deltaTime: number, currentSpeed: number) {
  if (!remove) {
    let adjustedSpeed = currentSpeed;
    if (type.speedOffset) {
      adjustedSpeed += speedOffset;
    }
    xPos -= Math.floor(((adjustedSpeed * 60) / 1000) * deltaTime);

    // 更新帧
    if (type.numFrames) {
      timer += deltaTime;
      if (timer >= (type.frameRate || 100)) {
        currentFrame = currentFrame == type.numFrames - 1 ? 0 : currentFrame + 1;
        timer = 0;
      }
    }
    draw();

    if (!isVisible()) {
      remove = true;
    }
  }
}

// 计算随机间隙大小
function getGap(gapCoefficient: number, speed: number): number {
  const minGap = Math.round(width * speed + type.minGap * gapCoefficient);
  const maxGap = Math.round(minGap * 1.5); // MAX_GAP_COEFFICIENT
  return getRandomNum(minGap, maxGap);
}

// 检查障碍物是否可见
function isVisible(): boolean {
  return xPos + width > 0;
}

// 获取障碍物对象
export function getObstacle(): ObstacleType {
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

// 组件挂载时初始化
onMount(() => {
  init();
});
</script>

<!-- 障碍物组件 -->
