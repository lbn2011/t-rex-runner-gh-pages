import logger from './logger';
import { ModuleType, EventType, ErrorCode } from './loggerConfig';

const STORAGE_KEY = 'trex-high-score';
const COMPONENT_NAME = 'StorageService';

/**
 * Storage service for persisting game data
 */
class StorageService {
  private highScore: number = 0;

  constructor () {
    logger.info(ModuleType.STORAGE, EventType.INIT, 'Storage service initialized', {
      component: COMPONENT_NAME,
      context: { storageKey: STORAGE_KEY },
    });
    this.loadHighScore();
  }

  /**
   * Load high score from localStorage
   */
  private loadHighScore (): void {
    logger.debug(ModuleType.STORAGE, EventType.INIT, 'Loading high score from localStorage', {
      component: COMPONENT_NAME,
      context: { storageKey: STORAGE_KEY },
    });

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.highScore = parseInt(saved, 10);
        if (isNaN(this.highScore)) {
          logger.warn(ModuleType.STORAGE, EventType.ERROR, 'Invalid high score value in storage, resetting to 0', {
            component: COMPONENT_NAME,
            context: { rawValue: saved },
          });
          this.highScore = 0;
        } else {
          logger.info(ModuleType.STORAGE, EventType.INIT, 'High score successfully loaded from storage', {
            component: COMPONENT_NAME,
            context: { highScore: this.highScore },
          });
        }
      } else {
        logger.info(ModuleType.STORAGE, EventType.INIT, 'No high score found in storage, starting fresh', {
          component: COMPONENT_NAME,
          context: { highScore: 0 },
        });
      }
    } catch (error) {
      logger.error(
        ModuleType.STORAGE,
        EventType.ERROR,
        'Failed to load high score from localStorage',
        {
          component: COMPONENT_NAME,
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
    logger.debug(ModuleType.STORAGE, EventType.INIT, 'Saving high score to localStorage', {
      component: COMPONENT_NAME,
      context: { highScore: this.highScore },
    });

    try {
      localStorage.setItem(STORAGE_KEY, this.highScore.toString());
      logger.info(ModuleType.STORAGE, EventType.INIT, 'High score successfully saved to localStorage', {
        component: COMPONENT_NAME,
        context: { highScore: this.highScore, storageKey: STORAGE_KEY },
      });
    } catch (error) {
      logger.error(
        ModuleType.STORAGE,
        EventType.ERROR,
        'Failed to save high score to localStorage',
        {
          component: COMPONENT_NAME,
          errorCode: ErrorCode.STORAGE_ERROR,
          context: { error: (error as Error).message, highScore: this.highScore },
        }
      );
    }
  }

  /**
   * Get current high score
   */
  getHighScore (): number {
    logger.debug(ModuleType.STORAGE, EventType.INIT, 'Retrieving current high score', {
      component: COMPONENT_NAME,
      context: { highScore: this.highScore },
    });
    return this.highScore;
  }

  /**
   * Update high score if new score is higher
   * @returns true if new high score was set
   */
  updateHighScore (score: number): boolean {
    logger.debug(ModuleType.STORAGE, EventType.SCORE_UPDATE, 'Attempting to update high score', {
      component: COMPONENT_NAME,
      context: { newScore: score, currentHighScore: this.highScore },
    });

    if (score > this.highScore) {
      const previousScore = this.highScore;
      this.highScore = score;
      this.saveHighScore();

      logger.info(ModuleType.STORAGE, EventType.SCORE_UPDATE, 'New high score achieved and persisted', {
        component: COMPONENT_NAME,
        context: {
          previousScore,
          newHighScore: this.highScore,
          improvement: score - previousScore,
        },
      });

      return true;
    }

    logger.debug(ModuleType.STORAGE, EventType.SCORE_UPDATE, 'Score did not exceed current high score', {
      component: COMPONENT_NAME,
      context: { attemptedScore: score, currentHighScore: this.highScore },
    });

    return false;
  }

  /**
   * Reset high score (for testing)
   */
  resetHighScore (): void {
    const previousScore = this.highScore;
    this.highScore = 0;
    this.saveHighScore();

    logger.warn(ModuleType.STORAGE, EventType.RESTART, 'High score has been reset to zero', {
      component: COMPONENT_NAME,
      context: { previousScore, newScore: 0 },
    });
  }
}

export const storageService = new StorageService();
export default storageService;
