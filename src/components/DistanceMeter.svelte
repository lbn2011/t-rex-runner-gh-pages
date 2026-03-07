<script lang="ts">
import { onMount } from 'svelte';
import type { SpriteDefinition } from '../types';

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

// 初始化
function init() {
  canvasCtx = canvas.getContext('2d')!;
  calcXPos(canvasWidth);
}

// 计算X位置
export function calcXPos(width: number) {
  xPos = width - digits.length * digitWidth - 10;
}

// 更新距离
export function update(deltaTime: number, distance: number): boolean {
  const newDistance = Math.floor(distance);
  if (newDistance !== currentDistance) {
    currentDistance = newDistance;
    updateDigits(currentDistance, digits);

    // 检查是否达到新的成就
    if (currentDistance > 0 && currentDistance % 100 === 0) {
      return true;
    }
  }
  draw();
  return false;
}

// 更新数字
function updateDigits(value: number, digitArray: number[]) {
  const str = value.toString().padStart(digitArray.length, '0');
  for (let i = 0; i < digitArray.length; i++) {
    digitArray[i] = parseInt(str[i]);
  }
}

// 重置
export function reset(newHighScore: number) {
  currentDistance = 0;
  highScore = newHighScore;
  updateDigits(0, digits);
  updateDigits(highScore, highScoreDigits);
  draw();
}

// 设置最高分
export function setHighScore(score: number) {
  highScore = score;
  updateDigits(highScore, highScoreDigits);
}

// 获取实际距离
export function getActualDistance(distance: number): number {
  return Math.floor(distance / 100);
}

// 绘制距离计量器
function draw() {
  if (!canvasCtx) return;

  // 绘制当前距离
  drawDigits(digits, xPos, yPos);

  // 绘制最高分
  if (highScore > 0) {
    const highScoreX = xPos - digitWidth * highScoreDigits.length - 20;
    drawDigits(highScoreDigits, highScoreX, yPos);
  }
}

// 绘制数字
function drawDigits(digitArray: number[], x: number, y: number) {
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

// 组件挂载时初始化
onMount(() => {
  init();
});
</script>

<!-- 距离计量器组件 -->
