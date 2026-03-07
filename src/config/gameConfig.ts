import type {
  GameConfig,
  GameDimensions,
  SpriteDefinitionMap,
  ClassNameMap,
  KeyCodeMap,
  SoundMap,
  GameEvents,
} from '../types';

// 默认游戏宽度
export const DEFAULT_WIDTH = 600;

// 帧率
export const FPS = 60;

// 是否为高DPI屏幕
export const IS_HIDPI = window.devicePixelRatio > 1;

// 是否为iOS设备
export const IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);

// 是否为移动设备
export const IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;

// 是否支持触摸
export const IS_TOUCH_ENABLED = 'ontouchstart' in window;

// 默认游戏配置
export const gameConfig: GameConfig = {
  ACCELERATION: 0.001,
  BG_CLOUD_SPEED: 0.2,
  BOTTOM_PAD: 10,
  CLEAR_TIME: 3000,
  CLOUD_FREQUENCY: 0.5,
  GAMEOVER_CLEAR_TIME: 750,
  GAP_COEFFICIENT: 0.6,
  GRAVITY: 0.6,
  INITIAL_JUMP_VELOCITY: 12,
  INVERT_FADE_DURATION: 12000,
  INVERT_DISTANCE: 700,
  MAX_BLINK_COUNT: 3,
  MAX_CLOUDS: 6,
  MAX_OBSTACLE_LENGTH: 3,
  MAX_OBSTACLE_DUPLICATION: 2,
  MAX_SPEED: 13,
  MIN_JUMP_HEIGHT: 35,
  MOBILE_SPEED_COEFFICIENT: 1.2,
  RESOURCE_TEMPLATE_ID: 'audio-resources',
  SPEED: 6,
  SPEED_DROP_COEFFICIENT: 3,
  ARCADE_MODE_INITIAL_TOP_POSITION: 35,
  ARCADE_MODE_TOP_POSITION_PERCENT: 0.1,
};

// 默认游戏维度
export const defaultDimensions: GameDimensions = {
  WIDTH: DEFAULT_WIDTH,
  HEIGHT: 150,
};

// CSS类名
export const classes: ClassNameMap = {
  ARCADE_MODE: 'arcade-mode',
  CANVAS: 'runner-canvas',
  CONTAINER: 'runner-container',
  CRASHED: 'crashed',
  ICON: 'icon-offline',
  INVERTED: 'inverted',
  SNACKBAR: 'snackbar',
  SNACKBAR_SHOW: 'snackbar-show',
  TOUCH_CONTROLLER: 'controller',
  PLAYER: 'player',
};

// 精灵定义
export const spriteDefinition: SpriteDefinitionMap = {
  LDPI: {
    CACTUS_LARGE: { x: 332, y: 2 },
    CACTUS_SMALL: { x: 228, y: 2 },
    CLOUD: { x: 86, y: 2 },
    HORIZON: { x: 2, y: 54 },
    MOON: { x: 484, y: 2 },
    PTERODACTYL: { x: 134, y: 2 },
    RESTART: { x: 2, y: 2 },
    TEXT_SPRITE: { x: 655, y: 2 },
    TREX: { x: 848, y: 2 },
    STAR: { x: 645, y: 2 },
  },
  HDPI: {
    CACTUS_LARGE: { x: 652, y: 2 },
    CACTUS_SMALL: { x: 446, y: 2 },
    CLOUD: { x: 166, y: 2 },
    HORIZON: { x: 2, y: 104 },
    MOON: { x: 954, y: 2 },
    PTERODACTYL: { x: 260, y: 2 },
    RESTART: { x: 2, y: 2 },
    TEXT_SPRITE: { x: 1294, y: 2 },
    TREX: { x: 1678, y: 2 },
    STAR: { x: 1276, y: 2 },
  },
};

// 音效映射
export const sounds: SoundMap = {
  BUTTON_PRESS: 'offline-sound-press',
  HIT: 'offline-sound-hit',
  SCORE: 'offline-sound-reached',
};

// 键盘代码映射
export const keycodes: KeyCodeMap = {
  JUMP: { '38': 1, '32': 1 }, // Up, spacebar
  DUCK: { '40': 1 }, // Down
  RESTART: { '13': 1 }, // Enter
};

// 游戏事件
export const events: GameEvents = {
  ANIM_END: 'webkitAnimationEnd',
  CLICK: 'click',
  KEYDOWN: 'keydown',
  KEYUP: 'keyup',
  MOUSEDOWN: 'mousedown',
  MOUSEUP: 'mouseup',
  RESIZE: 'resize',
  TOUCHEND: 'touchend',
  TOUCHSTART: 'touchstart',
  VISIBILITY: 'visibilitychange',
  BLUR: 'blur',
  FOCUS: 'focus',
  LOAD: 'load',
};
