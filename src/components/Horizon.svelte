<script lang="ts">
import { onMount } from 'svelte';
import type { GameDimensions, SpriteDefinition, Obstacle as ObstacleType } from '../types';
import { getRandomNum } from '../utils/gameUtils';
import { obstacleTypes } from '../config/obstacleTypes';

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

// 初始化
function init() {
  canvasCtx = canvas.getContext('2d')!;
  ground = {
    x: 0,
    y: 0,
    width: 0,
    height: 12,
  };
  ground.y = canvas.height - ground.height - 10;
  ground.width = 600;
  reset();
}

// 重置
export function reset() {
  obstacles = [];
  clouds = [];
  obstacleTimer = 0;
  cloudTimer = 0;
  ground.x = 0;
}

// 更新地平线
export function update(deltaTime: number, speed: number, hasObstacles: boolean, inverted: boolean) {
  const adjustedSpeed = (speed * deltaTime) / 16;

  // 更新地面
  ground.x -= adjustedSpeed;
  if (ground.x <= -ground.width / 2) {
    ground.x = 0;
  }

  // 更新云朵
  updateClouds(adjustedSpeed);

  // 更新障碍物
  if (hasObstacles) {
    updateObstacles(deltaTime, speed);
  }

  draw(inverted);
}

// 更新云朵
function updateClouds(speed: number) {
  const cloudSpeed = speed * 0.2;
  clouds.forEach((cloud, index) => {
    cloud.x -= cloudSpeed;
    if (cloud.x + cloud.width < 0) {
      clouds.splice(index, 1);
    }
  });

  // 添加新云朵
  cloudTimer += speed;
  if (cloudTimer > 1000 && clouds.length < 6) {
    addCloud();
    cloudTimer = 0;
  }
}

// 添加云朵
function addCloud() {
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
}

// 更新障碍物
function updateObstacles(deltaTime: number, speed: number) {
  obstacles.forEach((obstacle, index) => {
    // 这里需要调用obstacle的update方法，但由于我们使用组件，需要另一种方式实现
    // 暂时使用简化的更新逻辑
    const adjustedSpeed = (speed * deltaTime) / 16;
    obstacle.xPos -= adjustedSpeed;

    if (obstacle.xPos + obstacle.width < 0) {
      obstacles.splice(index, 1);
    }
  });

  // 添加新障碍物
  obstacleTimer += deltaTime;
  if (obstacleTimer > getObstacleTimerThreshold(speed)) {
    addObstacle(speed);
    obstacleTimer = 0;
  }
}

// 获取障碍物生成阈值
function getObstacleTimerThreshold(speed: number): number {
  const baseThreshold = 1500;
  const minThreshold = 500;
  return Math.max(minThreshold, baseThreshold - (speed - 6) * 100);
}

// 添加障碍物
function addObstacle(speed: number) {
  // 选择合适的障碍物类型
  const validObstacles = obstacleTypes.filter((type) => type.minSpeed <= speed);
  if (validObstacles.length === 0) return;

  const obstacleType = validObstacles[getRandomNum(0, validObstacles.length - 1)];
  const spritePos = spriteDef[obstacleType.type as keyof typeof spriteDef];

  if (!spritePos) return;

  // 创建障碍物对象
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

  // 初始化障碍物
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
}

// 绘制地平线
function draw(_inverted: boolean) {
  if (!canvasCtx) return;

  // 绘制地面
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

  // 绘制云朵
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

  // 绘制障碍物
  obstacles.forEach((obstacle) => {
    const sourceWidth = obstacle.typeConfig.width;
    const sourceHeight = obstacle.typeConfig.height;

    let sourceX = sourceWidth * obstacle.size * (0.5 * (obstacle.size - 1)) + obstacle.spritePos.x;

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
}

// 获取障碍物列表
export function getObstacles(): ObstacleType[] {
  return obstacles;
}

// 组件挂载时初始化
onMount(() => {
  init();
});
</script>

<!-- 地平线组件 -->
