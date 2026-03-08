import logger from './logger';
import { ModuleType, EventType, ErrorCode } from './loggerConfig';

const STORAGE_KEY = 'trex-high-score';

/**
 * Storage service for persisting game data
 */
class StorageService {
  private highScore: number = 0;

  constructor () {
    this.loadHighScore();
  }

  /**
   * Load high score from localStorage
   */
  private loadHighScore (): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.highScore = parseInt(saved, 10);
        if (isNaN(this.highScore)) {
          this.highScore = 0;
        }
      }

      logger.debug(ModuleType.STORAGE, EventType.INIT, 'High score loaded from storage', {
        context: { highScore: this.highScore },
      });
    } catch (error) {
      logger.error(
        ModuleType.STORAGE,
        EventType.ERROR,
        'Failed to load high score from storage',
        {
          errorCode: ErrorCode.STORAGE_ERROR,
          context: { error: (error as Error).message },
        }
      );
      this.highScore = 0;
    }
  }

  /**
   * Save high score to localStorage
   */
  private saveHighScore (): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.highScore.toString());

      logger.debug(ModuleType.STORAGE, EventType.INIT, 'High score saved to storage', {
        context: { highScore: this.highScore },
      });
    } catch (error) {
      logger.error(
        ModuleType.STORAGE,
        EventType.ERROR,
        'Failed to save high score to storage',
        {
          errorCode: ErrorCode.STORAGE_ERROR,
          context: { error: (error as Error).message },
        }
      );
    }
  }

  /**
   * Get current high score
   */
  getHighScore (): number {
    return this.highScore;
  }

  /**
   * Update high score if new score is higher
   * @returns true if new high score was set
   */
  updateHighScore (score: number): boolean {
    if (score > this.highScore) {
      const previousScore = this.highScore;
      this.highScore = score;
      this.saveHighScore();

      logger.info(ModuleType.STORAGE, EventType.SCORE_UPDATE, 'New high score saved', {
        context: {
          previousScore,
          newScore: this.highScore,
        },
      });

      return true;
    }
    return false;
  }

  /**
   * Reset high score (for testing)
   */
  resetHighScore (): void {
    this.highScore = 0;
    this.saveHighScore();

    logger.warn(ModuleType.STORAGE, EventType.RESTART, 'High score reset', {
      context: { highScore: this.highScore },
    });
  }
}

export const storageService = new StorageService();
export default storageService;
