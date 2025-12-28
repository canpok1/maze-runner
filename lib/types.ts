/**
 * プレイヤーの状態を表すインターフェース
 */
export interface Player {
  x: number;
  y: number;
  dir: number;
  speed: number;
}

/**
 * マップタイルの種類を表す定数
 */
export const TileType = {
  /** 通路（移動可能） */
  FLOOR: 0,
  /** 壁（移動不可） */
  WALL: 1,
  /** ゴール地点 */
  GOAL: 2,
} as const;

/** マップタイルの種類を表す型 */
export type TileType = (typeof TileType)[keyof typeof TileType];

/**
 * 探索状態を表す定数
 */
export const ExplorationState = {
  /** 未探索 */
  UNEXPLORED: 0,
  /** 探索済み */
  EXPLORED: 1,
} as const;

/** 探索状態を表す型 */
export type ExplorationState = (typeof ExplorationState)[keyof typeof ExplorationState];

/** 迷路マップの型（タイルの2次元配列） */
export type MazeMap = TileType[][];

/** 探索済みマップの型（探索状態の2次元配列） */
export type ExploredMap = ExplorationState[][];

/**
 * ゲームの状態を表す型
 */
export type GameState = {
  map: MazeMap;
  exploredMap: ExploredMap;
  mapSize: number;
  player: Player;
  gameActive: boolean;
  startTime: number;
  animationId: number;
};

/**
 * ゲームの設定を表す型
 */
export type GameConfig = {
  rotationStep: number;
  minDistance: number;
  maxWallHeightFactor: number;
  miniMapSize: number;
  mapPadding: number;
  moveSpeed: number;
};

/**
 * ゲームの難易度を表す定数
 */
export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

/**
 * ゲームの難易度を表す型
 */
export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * ランキング情報を表すインターフェース
 */
export interface Ranking {
  playerName: string;
  clearTime: number;
  createdAt: string;
}

/**
 * ID付きランキング情報を表すインターフェース
 */
export interface RankingWithId extends Ranking {
  id: number;
}
