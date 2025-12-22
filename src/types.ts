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
 * ゲームの状態を表す型
 */
export type GameState = {
  map: number[][];
  exploredMap: number[][];
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
