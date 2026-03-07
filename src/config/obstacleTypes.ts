import type { ObstacleTypeConfig } from '../types';

// 障碍物类型定义
export const obstacleTypes: ObstacleTypeConfig[] = [
  {
    type: 'CACTUS_SMALL',
    width: 17,
    height: 35,
    yPos: 105,
    multipleSpeed: 4,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [
      { x: 0, y: 7, width: 5, height: 27 },
      { x: 4, y: 0, width: 6, height: 34 },
      { x: 10, y: 4, width: 7, height: 14 },
    ],
  },
  {
    type: 'CACTUS_LARGE',
    width: 25,
    height: 50,
    yPos: 90,
    multipleSpeed: 7,
    minGap: 120,
    minSpeed: 0,
    collisionBoxes: [
      { x: 0, y: 12, width: 7, height: 38 },
      { x: 8, y: 0, width: 7, height: 49 },
      { x: 13, y: 10, width: 10, height: 38 },
    ],
  },
  {
    type: 'PTERODACTYL',
    width: 46,
    height: 40,
    yPos: [100, 75, 50], // 可变高度
    yPosMobile: [100, 50], // 移动设备可变高度
    multipleSpeed: 999,
    minSpeed: 8.5,
    minGap: 150,
    collisionBoxes: [
      { x: 15, y: 15, width: 16, height: 5 },
      { x: 18, y: 21, width: 24, height: 6 },
      { x: 2, y: 14, width: 4, height: 3 },
      { x: 6, y: 10, width: 4, height: 7 },
      { x: 10, y: 8, width: 6, height: 9 },
    ],
    numFrames: 2,
    frameRate: 1000 / 6,
    speedOffset: 0.8,
  },
];

// 障碍物最大间隙系数
export const MAX_GAP_COEFFICIENT = 1.5;

// 最大障碍物分组数量
export const MAX_OBSTACLE_LENGTH = 3;
