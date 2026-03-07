import consola from 'consola';

const isProduction =
  typeof window === 'undefined' &&
  typeof (globalThis as any).process !== 'undefined' &&
  (globalThis as any).process.env.NODE_ENV === 'production';

export const logger = consola.create({
  level: isProduction ? 3 : 5, // 生产环境使用info级别 ，开发环境使用debug级别
  formatOptions: {
    colors: true,
    date: true,
    badge: true,
  },
});

// 日志级别示例
export function logGameStart(): void {
  logger.info('游戏开始');
}

export function logGameOver(score: number): void {
  logger.info(`游戏结束，得分: ${score}`);
}

export function logCollision(): void {
  logger.warn('发生碰撞');
}

export function logJump(): void {
  logger.debug('霸王龙跳跃');
}

export function logScore(score: number): void {
  logger.debug(`得分: ${score}`);
}

export function logError(error: Error): void {
  logger.error('游戏错误:', error);
}
