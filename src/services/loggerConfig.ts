export enum LogLevel {
  FATAL = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

/**
 * Module types for T-Rex Runner game components
 * Each module represents a specific game subsystem
 */
export enum ModuleType {
  // Core game modules
  GAME = 'game',
  TREX = 'trex',
  OBSTACLE = 'obstacle',
  HORIZON = 'horizon',
  SCORE = 'score',

  // System modules
  PHYSICS = 'physics',
  RENDER = 'render',
  INPUT = 'input',
  AUDIO = 'audio',
  UI = 'ui',
  STATE = 'state',

  // Storage module
  STORAGE = 'storage',
}

/**
 * Event types for structured logging
 */
export enum EventType {
  // Lifecycle events
  INIT = 'init',
  MOUNT = 'mount',
  UNMOUNT = 'unmount',
  DESTROY = 'destroy',

  // Game events
  START = 'start',
  PAUSE = 'pause',
  RESUME = 'resume',
  RESTART = 'restart',
  GAME_OVER = 'game_over',

  // Action events
  JUMP = 'jump',
  DUCK = 'duck',
  COLLISION = 'collision',
  SCORE_UPDATE = 'score_update',
  SPEED_CHANGE = 'speed_change',

  // Render events
  DRAW = 'draw',
  ANIMATION = 'animation',
  SPRITE_LOAD = 'sprite_load',

  // Input events
  KEY_PRESS = 'key_press',
  TOUCH = 'touch',

  // Error events
  ERROR = 'error',
  WARNING = 'warning',
  ASSERT = 'assert',
}

/**
 * Error codes for game-specific errors
 */
export enum ErrorCode {
  NONE = 0,
  SPRITE_LOAD_FAILED = 1001,
  AUDIO_INIT_FAILED = 1002,
  CANVAS_CONTEXT_LOST = 1003,
  RENDER_ERROR = 1004,
  COLLISION_DETECTION_ERROR = 2001,
  PHYSICS_CALCULATION_ERROR = 2002,
  STATE_TRANSITION_ERROR = 3001,
  CONFIGURATION_ERROR = 4001,
  STORAGE_ERROR = 5001,
  UNKNOWN_ERROR = 9999,
}

export interface LogConfig {
  globalLevel: LogLevel;
  moduleLevels: Partial<Record<ModuleType, LogLevel>>;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageSize: number;
  enablePerformanceTracking: boolean;
  enableStructuredLogging: boolean;
}

/**
 * Structured log entry with comprehensive information
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: ModuleType;
  eventType: EventType;
  message: string;
  component?: string;
  context?: Record<string, any>;
  errorCode?: ErrorCode;
  duration?: number;
  performance?: {
    memory?: number;
    fps?: number;
    frameTime?: number;
  };
}

export interface LogFilter {
  level?: LogLevel;
  module?: ModuleType;
  eventType?: EventType;
  startTime?: number;
  endTime?: number;
  keyword?: string;
  errorCode?: ErrorCode;
}

export const DEFAULT_LOG_CONFIG: LogConfig = {
  globalLevel: LogLevel.INFO,
  moduleLevels: {},
  enableConsole: true,
  enableStorage: true,
  maxStorageSize: 1000,
  enablePerformanceTracking: false,
  enableStructuredLogging: true,
};
