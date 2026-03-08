// Logger exports
export {
  default as logger,
  LogLevel,
  ModuleType,
  EventType,
  ErrorCode,
} from './logger';
export { default as logManager } from './logManager';
export { logStorage } from './logStorage';
export type { LogConfig, LogEntry, LogFilter } from './loggerConfig';
export { DEFAULT_LOG_CONFIG } from './loggerConfig';

// Game-specific log functions
export {
  logGameStart,
  logGameOver,
  logGameRestart,
  logJump,
  logDuck,
  logTrexStateChange,
  logCollision,
  logScore,
  logSpeedChange,
  logInput,
  logError,
  logSpriteLoadError,
  logAudioError,
  logComponentMount,
  logComponentUnmount,
  logComponentInit,
} from './logger';
