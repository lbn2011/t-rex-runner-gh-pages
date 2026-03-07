import type { CollisionBox, Obstacle, Trex } from '../types';
import { IS_IOS } from '../config/gameConfig';

/**
 * 获取随机数
 * @param min 最小值
 * @param max 最大值
 * @returns 随机数
 */
export function getRandomNum(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 移动设备振动
 * @param duration 振动持续时间（毫秒）
 */
export function vibrate(duration: number): void {
  if (
    typeof window !== 'undefined' &&
    window.navigator &&
    window.navigator.vibrate
  ) {
    window.navigator.vibrate(duration);
  }
}

/**
 * 创建Canvas元素
 * @param container 容器元素
 * @param width 宽度
 * @param height 高度
 * @param opt_classname 可选类名
 * @returns Canvas元素
 */
export function createCanvas(
  container: HTMLElement,
  width: number,
  height: number,
  opt_classname?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = opt_classname
    ? `runner-canvas ${opt_classname}`
    : 'runner-canvas';
  canvas.width = width;
  canvas.height = height;
  container.appendChild(canvas);
  return canvas;
}

/**
 * 解码Base64音频为ArrayBuffer
 * @param base64String Base64字符串
 * @returns ArrayBuffer
 */
export function decodeBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const len = (base64String.length / 4) * 3;
  const str = atob(base64String);
  const arrayBuffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(arrayBuffer);

  for (let i = 0; i < len; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 获取当前时间戳
 * @returns 时间戳
 */
export function getTimeStamp(): number {
  return IS_IOS ? new Date().getTime() : performance.now();
}

/**
 * 检查碰撞
 * @param obstacle 障碍物
 * @param tRex 霸王龙
 * @param opt_canvasCtx 可选的Canvas上下文，用于绘制碰撞盒
 * @returns 碰撞盒数组或false
 */
export function checkForCollision(
  obstacle: Obstacle,
  tRex: Trex,
  opt_canvasCtx?: CanvasRenderingContext2D
): [CollisionBox, CollisionBox] | false {
  // 调整碰撞盒，因为霸王龙和障碍物周围有1像素的白色边框
  const tRexBox: CollisionBox = {
    x: tRex.xPos + 1,
    y: tRex.yPos + 1,
    width: tRex.width - 2,
    height: tRex.height - 2,
  };

  const obstacleBox: CollisionBox = {
    x: obstacle.xPos + 1,
    y: obstacle.yPos + 1,
    width: obstacle.typeConfig.width * obstacle.size - 2,
    height: obstacle.typeConfig.height - 2,
  };

  // 调试外框
  if (opt_canvasCtx) {
    drawCollisionBoxes(opt_canvasCtx, tRexBox, obstacleBox);
  }

  // 简单的外框检查
  if (boxCompare(tRexBox, obstacleBox)) {
    const collisionBoxes = obstacle.collisionBoxes;
    const tRexCollisionBoxes = tRex.ducking
      ? TrexCollisionBoxes.DUCKING
      : TrexCollisionBoxes.RUNNING;

    // 详细的轴对齐框检查
    for (let t = 0; t < tRexCollisionBoxes.length; t++) {
      for (let i = 0; i < collisionBoxes.length; i++) {
        // 调整框到实际位置
        const adjTrexBox = createAdjustedCollisionBox(
          tRexCollisionBoxes[t],
          tRexBox
        );
        const adjObstacleBox = createAdjustedCollisionBox(
          collisionBoxes[i],
          obstacleBox
        );
        const crashed = boxCompare(adjTrexBox, adjObstacleBox);

        // 绘制框用于调试
        if (opt_canvasCtx) {
          drawCollisionBoxes(opt_canvasCtx, adjTrexBox, adjObstacleBox);
        }

        if (crashed) {
          return [adjTrexBox, adjObstacleBox];
        }
      }
    }
  }
  return false;
}

/**
 * 调整碰撞盒
 * @param box 原始碰撞盒
 * @param adjustment 调整盒
 * @returns 调整后的碰撞盒
 */
export function createAdjustedCollisionBox(
  box: CollisionBox,
  adjustment: CollisionBox
): CollisionBox {
  return {
    x: box.x + adjustment.x,
    y: box.y + adjustment.y,
    width: box.width,
    height: box.height,
  };
}

/**
 * 绘制碰撞盒用于调试
 * @param canvasCtx Canvas上下文
 * @param tRexBox 霸王龙碰撞盒
 * @param obstacleBox 障碍物碰撞盒
 */
export function drawCollisionBoxes(
  canvasCtx: CanvasRenderingContext2D,
  tRexBox: CollisionBox,
  obstacleBox: CollisionBox
): void {
  canvasCtx.save();
  canvasCtx.strokeStyle = '#f00';
  canvasCtx.strokeRect(tRexBox.x, tRexBox.y, tRexBox.width, tRexBox.height);

  canvasCtx.strokeStyle = '#0f0';
  canvasCtx.strokeRect(
    obstacleBox.x,
    obstacleBox.y,
    obstacleBox.width,
    obstacleBox.height
  );
  canvasCtx.restore();
}

/**
 * 比较两个碰撞盒是否碰撞
 * @param tRexBox 霸王龙碰撞盒
 * @param obstacleBox 障碍物碰撞盒
 * @returns 是否碰撞
 */
export function boxCompare(
  tRexBox: CollisionBox,
  obstacleBox: CollisionBox
): boolean {
  return (
    tRexBox.x < obstacleBox.x + obstacleBox.width &&
    tRexBox.x + tRexBox.width > obstacleBox.x &&
    tRexBox.y < obstacleBox.y + obstacleBox.height &&
    tRexBox.height + tRexBox.y > obstacleBox.y
  );
}

/**
 * 霸王龙碰撞盒定义
 */
export const TrexCollisionBoxes = {
  RUNNING: [
    { x: 1, y: 1, width: 38, height: 38 },
    { x: 22, y: 1, width: 17, height: 18 },
    { x: 1, y: 18, width: 30, height: 20 },
    { x: 10, y: 35, width: 18, height: 5 },
  ],
  DUCKING: [
    { x: 1, y: 1, width: 40, height: 25 },
    { x: 1, y: 25, width: 40, height: 13 },
    { x: 10, y: 35, width: 18, height: 5 },
  ],
};

/**
 * 更新Canvas缩放
 * @param canvas Canvas元素
 * @param opt_width 可选宽度
 * @param opt_height 可选高度
 * @returns 是否缩放
 */
export function updateCanvasScaling(
  canvas: HTMLCanvasElement,
  opt_width?: number,
  opt_height?: number
): boolean {
  const context = canvas.getContext('2d');
  if (!context) return false;

  // 查询各种像素比
  const devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
  const backingStoreRatio =
    Math.floor((context as any).webkitBackingStorePixelRatio) || 1;
  const ratio = devicePixelRatio / backingStoreRatio;

  // 如果两个比率不匹配，则放大Canvas
  if (devicePixelRatio !== backingStoreRatio) {
    const oldWidth = opt_width || canvas.width;
    const oldHeight = opt_height || canvas.height;

    canvas.width = oldWidth * ratio;
    canvas.height = oldHeight * ratio;

    canvas.style.width = oldWidth + 'px';
    canvas.style.height = oldHeight + 'px';

    // 缩放上下文以抵消我们手动缩放Canvas元素的事实
    context.scale(ratio, ratio);
    return true;
  } else if (devicePixelRatio == 1) {
    // 重置Canvas宽度/高度。修复页面缩放时的缩放错误，此时devicePixelRatio会相应变化。
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
  }
  return false;
}
