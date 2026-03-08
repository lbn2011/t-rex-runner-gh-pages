import logger, { LogLevel, ModuleType, EventType, ErrorCode } from './logger';
import { logStorage } from './logStorage';
import type { LogEntry, LogFilter } from './loggerConfig';

class LogManager {
  private exportFormat: 'json' | 'csv' = 'json';

  setExportFormat (format: 'json' | 'csv'): void {
    this.exportFormat = format;
  }

  getLogs (filter?: LogFilter): LogEntry[] {
    return logStorage.query(filter);
  }

  getLogsByModule (
    module: ModuleType,
    minLevel: LogLevel = LogLevel.TRACE
  ): LogEntry[] {
    return logStorage.query({
      module,
      level: minLevel,
    });
  }

  getLogsByEventType (eventType: EventType): LogEntry[] {
    return logStorage.query({ eventType });
  }

  getLogsByLevel (level: LogLevel): LogEntry[] {
    return logStorage.query({ level });
  }

  getLogsByTimeRange (startTime: number, endTime: number): LogEntry[] {
    return logStorage.query({
      startTime,
      endTime,
    });
  }

  getLogsByComponent (componentName: string): LogEntry[] {
    return logStorage.getByComponent(componentName);
  }

  getLogsByErrorCode (errorCode: ErrorCode): LogEntry[] {
    return logStorage.query({ errorCode });
  }

  searchLogs (keyword: string): LogEntry[] {
    return logStorage.query({ keyword });
  }

  getLogStats (): {
    total: number;
    byLevel: Record<number, number>;
    byModule: Record<string, number>;
    byEventType: Record<string, number>;
    byErrorCode: Record<number, number>;
    } {
    return logStorage.getStats();
  }

  getRecentLogs (count: number = 10): LogEntry[] {
    return logStorage.getRecent(count);
  }

  exportLogs (filter?: LogFilter): string {
    const logs = logStorage.query(filter);

    if (this.exportFormat === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      return this.convertToCSV(logs);
    }
  }

  private convertToCSV (logs: LogEntry[]): string {
    const headers = [
      'timestamp',
      'level',
      'module',
      'eventType',
      'component',
      'message',
      'errorCode',
      'context',
    ];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      this.getLevelName(log.level),
      log.module,
      log.eventType,
      log.component || '',
      `"${log.message.replace(/"/g, '""')}"`,
      log.errorCode !== undefined ? log.errorCode.toString() : '',
      log.context ? `"${JSON.stringify(log.context).replace(/"/g, '""')}"` : '',
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  private getLevelName (level: LogLevel): string {
    const names = ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'];
    return names[level] || 'UNKNOWN';
  }

  downloadLogs (filter?: LogFilter): void {
    const content = this.exportLogs(filter);
    const blob = new Blob([content], {
      type: this.exportFormat === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trex-logs_${Date.now()}.${this.exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info(ModuleType.GAME, EventType.INIT, 'Logs exported', {
      context: {
        format: this.exportFormat,
        count: logStorage.query(filter).length,
      },
    });
  }

  clearLogs (): void {
    logStorage.clear();
    logger.info(ModuleType.GAME, EventType.INIT, 'Logs cleared');
  }

  importLogs (json: string): void {
    logStorage.import(json);
    logger.info(ModuleType.GAME, EventType.INIT, 'Logs imported');
  }

  /**
   * Get error summary for debugging
   */
  getErrorSummary (): {
    totalErrors: number;
    errorsByCode: Record<number, number>;
    recentErrors: LogEntry[];
    } {
    const stats = logStorage.getStats();
    const recentErrors = logStorage.query({ level: LogLevel.ERROR }).slice(-10);

    return {
      totalErrors: stats.byLevel[LogLevel.ERROR] || 0,
      errorsByCode: stats.byErrorCode,
      recentErrors,
    };
  }
}

export const logManager = new LogManager();
export default logManager;
