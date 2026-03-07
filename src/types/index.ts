// 游戏配置类型
export interface GameConfig {
  ACCELERATION: number;
  BG_CLOUD_SPEED: number;
  BOTTOM_PAD: number;
  CLEAR_TIME: number;
  CLOUD_FREQUENCY: number;
  GAMEOVER_CLEAR_TIME: number;
  GAP_COEFFICIENT: number;
  GRAVITY: number;
  INITIAL_JUMP_VELOCITY: number;
  INVERT_FADE_DURATION: number;
  INVERT_DISTANCE: number;
  MAX_BLINK_COUNT: number;
  MAX_CLOUDS: number;
  MAX_OBSTACLE_LENGTH: number;
  MAX_OBSTACLE_DUPLICATION: number;
  MAX_SPEED: number;
  MIN_JUMP_HEIGHT: number;
  MOBILE_SPEED_COEFFICIENT: number;
  RESOURCE_TEMPLATE_ID: string;
  SPEED: number;
  SPEED_DROP_COEFFICIENT: number;
  ARCADE_MODE_INITIAL_TOP_POSITION: number;
  ARCADE_MODE_TOP_POSITION_PERCENT: number;
}

// 游戏维度类型
export interface GameDimensions {
  WIDTH: number;
  HEIGHT: number;
}

// 精灵定义类型
export interface SpriteDefinition {
  x: number;
  y: number;
}

// 精灵定义映射类型
export interface SpriteDefinitionMap {
  LDPI: Record<string, SpriteDefinition>;
  HDPI: Record<string, SpriteDefinition>;
}

// 碰撞盒类型
export interface CollisionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 障碍物类型配置
export interface ObstacleTypeConfig {
  type: string;
  width: number;
  height: number;
  yPos: number | number[];
  yPosMobile?: number[];
  multipleSpeed: number;
  minGap: number;
  minSpeed: number;
  collisionBoxes: CollisionBox[];
  numFrames?: number;
  frameRate?: number;
  speedOffset?: number;
}

// 障碍物类型
export interface Obstacle {
  canvasCtx: CanvasRenderingContext2D;
  spritePos: SpriteDefinition;
  typeConfig: ObstacleTypeConfig;
  gapCoefficient: number;
  size: number;
  dimensions: GameDimensions;
  remove: boolean;
  xPos: number;
  yPos: number;
  width: number;
  collisionBoxes: CollisionBox[];
  gap: number;
  speedOffset: number;
  currentFrame: number;
  timer: number;
}

// 霸王龙状态类型
export enum TrexStatus {
  RUNNING = 'running',
  CRASHED = 'crashed',
  JUMPING = 'jumping',
  DUCKING = 'ducking',
}

// 霸王龙配置类型
export interface TrexConfig {
  WIDTH: number;
  HEIGHT: number;
  DUCK_WIDTH: number;
  DUCK_HEIGHT: number;
  INITIAL_JUMP_VELOCITY: number;
  GRAVITY: number;
  MIN_JUMP_HEIGHT: number;
  SPEED_DROP_COEFFICIENT: number;
}

// 霸王龙类型
export interface Trex {
  canvas: HTMLCanvasElement;
  canvasCtx: CanvasRenderingContext2D;
  spritePos: SpriteDefinition;
  config: TrexConfig;
  xPos: number;
  yPos: number;
  width: number;
  height: number;
  jumping: boolean;
  ducking: boolean;
  speedDrop: boolean;
  jumpVelocity: number;
  maxJumpHeight: number;
  jumpCount: number;
  blinkCount: number;
  status: TrexStatus;
  runningTime: number;
  playingIntro: boolean;
}

// 游戏状态类型
export interface GameState {
  activated: boolean;
  playing: boolean;
  crashed: boolean;
  paused: boolean;
  inverted: boolean;
  invertTimer: number;
  invertTrigger: boolean;
  playingIntro: boolean;
  distanceRan: number;
  highestScore: number;
  currentSpeed: number;
  runningTime: number;
  playCount: number;
}

// 音频效果类型
export interface SoundFx {
  BUTTON_PRESS?: any;
  HIT?: any;
  SCORE?: any;
}

// 游戏事件类型
export interface GameEvents {
  ANIM_END: string;
  CLICK: string;
  KEYDOWN: string;
  KEYUP: string;
  MOUSEDOWN: string;
  MOUSEUP: string;
  RESIZE: string;
  TOUCHEND: string;
  TOUCHSTART: string;
  VISIBILITY: string;
  BLUR: string;
  FOCUS: string;
  LOAD: string;
}

// 键盘代码映射类型
export interface KeyCodeMap {
  JUMP: Record<string, number>;
  DUCK: Record<string, number>;
  RESTART: Record<string, number>;
}

// 音效映射类型
export interface SoundMap {
  BUTTON_PRESS: string;
  HIT: string;
  SCORE: string;
}

// CSS类名映射类型
export interface ClassNameMap {
  ARCADE_MODE: string;
  CANVAS: string;
  CONTAINER: string;
  CRASHED: string;
  ICON: string;
  INVERTED: string;
  SNACKBAR: string;
  SNACKBAR_SHOW: string;
  TOUCH_CONTROLLER: string;
  PLAYER?: string;
}
