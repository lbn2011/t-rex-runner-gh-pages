<script lang="ts">
import { onMount } from 'svelte';
import type { SpriteDefinition, GameDimensions } from '../types';
import { IS_HIDPI } from '../config/gameConfig';

export let canvas: HTMLCanvasElement;
export let textImgPos: SpriteDefinition;
export let restartImgPos: SpriteDefinition;
export let dimensions: GameDimensions;

let canvasCtx: CanvasRenderingContext2D;

// 面板维度
const panelDimensions = {
  TEXT_X: 0,
  TEXT_Y: 13,
  TEXT_WIDTH: 191,
  TEXT_HEIGHT: 11,
  RESTART_WIDTH: 36,
  RESTART_HEIGHT: 32,
};

// 初始化
function init() {
  canvasCtx = canvas.getContext('2d')!;
  draw();
}

// 更新面板维度
export function updateDimensions(width: number, height?: number) {
  dimensions.WIDTH = width;
  if (height) {
    dimensions.HEIGHT = height;
  }
  draw();
}

// 绘制面板
export function draw() {
  if (!canvasCtx) return;

  const centerX = dimensions.WIDTH / 2;

  // 游戏结束文本
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

  // 从精灵绘制游戏结束文本
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

  // 重新开始按钮
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
}

// 组件挂载时初始化
onMount(() => {
  init();
});
</script>

<!-- 游戏结束面板组件 -->
