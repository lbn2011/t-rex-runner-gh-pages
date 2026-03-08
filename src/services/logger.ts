import consola from 'consola';
import type { LogConfig, LogEntry } from './loggerConfig';
import {
  LogLevel,
  ModuleType,
  EventType,
  ErrorCode,
  DEFAULT_LOG_CONFIG,
} from './loggerConfig';
import { logStorage } from './logStorage';

/**
 * Structured logger for T-Rex Runner game
 * Provides comprehensive logging with component tracking, event types, and error codes
 */
class Logger {
  private config: LogConfig = { ...DEFAULT_LOG_CONFIG };
  private timers: Map<string, number> = new Map();
  private componentContext: Map<string, Record<string, any>> = new Map();

  constructor () {
    this.loadConfig();
  }

  private loadConfig (): void {
    try {
      const savedConfig = localStorage.getItem('trex-log-config');
      if (savedConfig) {
        this.config = { ...DEFAULT_LOG_CONFIG, ...JSON.parse(savedConfig) };
      }
    } catch {
      // Silently fail on config load error
    }
  }

  private saveConfig (): void {
    try {
      localStorage.setItem('trex-log-config', JSON.stringify(this.config));
    } catch {
      // Silently fail on config save error
    }
  }

  /**
   * Update logger configuration
   */
  updateConfig (partialConfig: Partial<LogConfig>): void {
    this.config = { ...this.config, ...partialConfig };
    this.saveConfig();
    consola.level = this.config.globalLevel;
    logStorage.setMaxSize(this.config.maxStorageSize);
  }

  getConfig (): LogConfig {
    return { ...this.config };
  }

  /**
   * Set log level for a specific module
   */
  setModuleLevel (module: ModuleType, level: LogLevel): void {
    this.config.moduleLevels[module] = level;
    this.saveConfig();
  }

  /**
   * Set context data for a component
   */
  setComponentContext (component: string, context: Record<string, any>): void {
    this.componentContext.set(component, context);
  }

  /**
   * Clear context data for a component
   */
  clearComponentContext (component: string): void {
    this.componentContext.delete(component);
  }

  private shouldLog (level: LogLevel, module: ModuleType): boolean {
    const moduleLevel = this.config.moduleLevels[module];
    const effectiveLevel =
      moduleLevel !== undefined ? moduleLevel : this.config.globalLevel;
    return level <= effectiveLevel;
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry (
    level: LogLevel,
    module: ModuleType,
    eventType: EventType,
    message: string,
    options: {
      component?: string;
      context?: Record<string, any>;
      errorCode?: ErrorCode;
      duration?: number;
    } = {}
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      eventType,
      message,
      component: options.component,
      context: options.context,
      errorCode: options.errorCode,
      duration: options.duration,
    };

    if (this.config.enablePerformanceTracking) {
      entry.performance = {
        memory: this.getMemoryUsage(),
      };
    }

    return entry;
  }

  private getMemoryUsage (): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Main log method with structured logging support
   */
  log (
    level: LogLevel,
    module: ModuleType,
    eventType: EventType,
    message: string,
    options: {
      component?: string;
      context?: Record<string, any>;
      errorCode?: ErrorCode;
      duration?: number;
    } = {}
  ): void {
    if (!this.shouldLog(level, module)) {
      return;
    }

    // Merge component context if available
    if (options.component) {
      const componentContext = this.componentContext.get(options.component);
      if (componentContext) {
        options.context = { ...componentContext, ...options.context };
      }
    }

    const entry = this.createLogEntry(
      level,
      module,
      eventType,
      message,
      options
    );

    if (this.config.enableStorage) {
      logStorage.add(entry);
    }

    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  private outputToConsole (entry: LogEntry): void {
    const prefix = `[${entry.module.toUpperCase()}]`;
    const eventTag = `[${entry.eventType.toUpperCase()}]`;
    const componentTag = entry.component ? `[${entry.component}]` : '';
    const errorTag = entry.errorCode !== undefined ? `[ERR:${entry.errorCode}]` : '';

    const formattedMessage = `${prefix}${eventTag}${componentTag}${errorTag} ${entry.message}`;

    switch (entry.level) {
    case LogLevel.FATAL:
      consola.fatal(formattedMessage, entry.context);
      break;
    case LogLevel.ERROR:
      consola.error(formattedMessage, entry.context);
      break;
    case LogLevel.WARN:
      consola.warn(formattedMessage, entry.context);
      break;
    case LogLevel.INFO:
      consola.info(formattedMessage, entry.context);
      break;
    case LogLevel.DEBUG:
      consola.debug(formattedMessage, entry.context);
      break;
    case LogLevel.TRACE:
      consola.trace(formattedMessage, entry.context);
      break;
    }
  }

  // Convenience methods for different log levels
  fatal (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
      errorCode?: ErrorCode;
    }
  ): void {
    this.log(LogLevel.FATAL, module, eventType, message, options);
  }

  error (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
      errorCode?: ErrorCode;
    }
  ): void {
    this.log(LogLevel.ERROR, module, eventType, message, options);
  }

  warn (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
      errorCode?: ErrorCode;
    }
  ): void {
    this.log(LogLevel.WARN, module, eventType, message, options);
  }

  info (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
    }
  ): void {
    this.log(LogLevel.INFO, module, eventType, message, options);
  }

  debug (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
    }
  ): void {
    this.log(LogLevel.DEBUG, module, eventType, message, options);
  }

  trace (
    module: ModuleType,
    eventType: EventType,
    message: string,
    options?: {
      component?: string;
      context?: Record<string, any>;
    }
  ): void {
    this.log(LogLevel.TRACE, module, eventType, message, options);
  }

  /**
   * Start a timer for performance tracking
   */
  time (label: string, module: ModuleType = ModuleType.GAME): void {
    this.timers.set(label, Date.now());
    this.debug(module, EventType.INIT, `Timer started: ${label}`);
  }

  /**
   * End a timer and log the duration
   */
  timeEnd (label: string, module: ModuleType = ModuleType.GAME): void {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.timers.delete(label);
      this.debug(module, EventType.INIT, `Timer ended: ${label}`, {
        context: { duration: `${duration}ms` },
      });
    }
  }

  /**
   * Clear all logs
   */
  clear (): void {
    logStorage.clear();
    consola.info('Logs cleared');
  }
}

const logger = new Logger();

export default logger;
export { LogLevel, ModuleType, EventType, ErrorCode };

// =============================================================================
// Game-specific logging functions
// =============================================================================

/**
 * Log game lifecycle events
 */
export function logGameStart (context?: Record<string, any>): void {
  logger.info(ModuleType.GAME, EventType.START, 'Game started', { context });
}

export function logGameOver (
  score: number,
  context?: Record<string, any>
): void {
  logger.info(ModuleType.GAME, EventType.GAME_OVER, 'Game over', {
    context: { score, ...context },
  });
}

export function logGameRestart (context?: Record<string, any>): void {
  logger.info(ModuleType.GAME, EventType.RESTART, 'Game restarted', {
    context,
  });
}

/**
 * Log T-Rex actions
 */
export function logJump (yPos: number, context?: Record<string, any>): void {
  logger.debug(ModuleType.TREX, EventType.JUMP, 'T-Rex jumped', {
    context: { yPos, ...context },
  });
}

export function logDuck (
  isDucking: boolean,
  context?: Record<string, any>
): void {
  logger.debug(
    ModuleType.TREX,
    EventType.DUCK,
    `T-Rex ${isDucking ? 'started' : 'stopped'} ducking`,
    {
      context: { isDucking, ...context },
    }
  );
}

export function logTrexStateChange (
  fromState: string,
  toState: string,
  context?: Record<string, any>
): void {
  logger.debug(ModuleType.TREX, EventType.ANIMATION, 'T-Rex state changed', {
    context: { fromState, toState, ...context },
  });
}

/**
 * Log collision events
 */
export function logCollision (
  obstacleType: string,
  context?: Record<string, any>
): void {
  logger.warn(ModuleType.PHYSICS, EventType.COLLISION, 'Collision detected', {
    context: { obstacleType, ...context },
  });
}

/**
 * Log score updates
 */
export function logScore (score: number, context?: Record<string, any>): void {
  logger.debug(ModuleType.SCORE, EventType.SCORE_UPDATE, 'Score updated', {
    context: { score, ...context },
  });
}

/**
 * Log speed changes
 */
export function logSpeedChange (
  speed: number,
  context?: Record<string, any>
): void {
  logger.debug(ModuleType.GAME, EventType.SPEED_CHANGE, 'Game speed changed', {
    context: { speed, ...context },
  });
}

/**
 * Log input events
 */
export function logInput (
  keyCode: number,
  keyName: string,
  context?: Record<string, any>
): void {
  logger.trace(ModuleType.INPUT, EventType.KEY_PRESS, 'Input detected', {
    context: { keyCode, keyName, ...context },
  });
}

/**
 * Log errors with error codes
 */
export function logError (
  error: Error,
  errorCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  context?: Record<string, any>
): void {
  logger.error(ModuleType.GAME, EventType.ERROR, error.message, {
    errorCode,
    context: { stack: error.stack, ...context },
  });
}

export function logSpriteLoadError (spriteName: string, error: Error): void {
  logger.error(
    ModuleType.RENDER,
    EventType.SPRITE_LOAD,
    `Failed to load sprite: ${spriteName}`,
    {
      errorCode: ErrorCode.SPRITE_LOAD_FAILED,
      context: { spriteName, error: error.message },
    }
  );
}

export function logAudioError (operation: string, error: Error): void {
  logger.error(
    ModuleType.AUDIO,
    EventType.ERROR,
    `Audio operation failed: ${operation}`,
    {
      errorCode: ErrorCode.AUDIO_INIT_FAILED,
      context: { operation, error: error.message },
    }
  );
}

/**
 * Log component lifecycle events
 */
export function logComponentMount (
  componentName: string,
  context?: Record<string, any>
): void {
  logger.debug(
    ModuleType.UI,
    EventType.MOUNT,
    `${componentName} component mounted`,
    {
      component: componentName,
      context,
    }
  );
}

export function logComponentUnmount (
  componentName: string,
  context?: Record<string, any>
): void {
  logger.debug(
    ModuleType.UI,
    EventType.UNMOUNT,
    `${componentName} component unmounted`,
    {
      component: componentName,
      context,
    }
  );
}

export function logComponentInit (
  componentName: string,
  context?: Record<string, any>
): void {
  logger.info(
    ModuleType.UI,
    EventType.INIT,
    `${componentName} component initialized`,
    {
      component: componentName,
      context,
    }
  );
}
