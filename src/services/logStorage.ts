import type { LogEntry, LogFilter } from './loggerConfig';
import { ErrorCode } from './loggerConfig';

class LogStorage {
  private logs: LogEntry[] = [];
  private maxSize: number = 1000;

  setMaxSize (size: number): void {
    this.maxSize = size;
    this.trim();
  }

  add (entry: LogEntry): void {
    this.logs.push(entry);
    this.trim();
  }

  private trim (): void {
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  query (filter?: LogFilter): LogEntry[] {
    let result = [...this.logs];

    if (filter) {
      if (filter.level !== undefined) {
        result = result.filter((log) => log.level <= filter.level!);
      }

      if (filter.module) {
        result = result.filter((log) => log.module === filter.module);
      }

      if (filter.eventType) {
        result = result.filter((log) => log.eventType === filter.eventType);
      }

      if (filter.startTime !== undefined) {
        result = result.filter((log) => log.timestamp >= filter.startTime!);
      }

      if (filter.endTime !== undefined) {
        result = result.filter((log) => log.timestamp <= filter.endTime!);
      }

      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase();
        result = result.filter(
          (log) =>
            log.message.toLowerCase().includes(keyword) ||
            (log.context &&
              JSON.stringify(log.context).toLowerCase().includes(keyword))
        );
      }

      if (filter.errorCode !== undefined) {
        result = result.filter((log) => log.errorCode === filter.errorCode);
      }
    }

    return result;
  }

  clear (): void {
    this.logs = [];
  }

  getStats (): {
    total: number;
    byLevel: Record<number, number>;
    byModule: Record<string, number>;
    byEventType: Record<string, number>;
    byErrorCode: Record<number, number>;
    } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<number, number>,
      byModule: {} as Record<string, number>,
      byEventType: {} as Record<string, number>,
      byErrorCode: {} as Record<number, number>,
    };

    this.logs.forEach((log) => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
      stats.byEventType[log.eventType] =
        (stats.byEventType[log.eventType] || 0) + 1;
      if (log.errorCode !== undefined && log.errorCode !== ErrorCode.NONE) {
        stats.byErrorCode[log.errorCode] =
          (stats.byErrorCode[log.errorCode] || 0) + 1;
      }
    });

    return stats;
  }

  export (): string {
    return JSON.stringify(this.logs, null, 2);
  }

  import (json: string): void {
    try {
      const imported = JSON.parse(json) as LogEntry[];
      this.logs = [...this.logs, ...imported];
      this.trim();
    } catch {
      // Silently fail on import error
    }
  }

  /**
   * Get recent logs
   */
  getRecent (count: number = 10): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs by component name
   */
  getByComponent (componentName: string): LogEntry[] {
    return this.logs.filter((log) => log.component === componentName);
  }
}

export const logStorage = new LogStorage();
