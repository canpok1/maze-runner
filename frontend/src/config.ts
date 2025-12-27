import type { GameConfig } from './types';

/**
 * ゲームの設定
 */
export const config: GameConfig = {
  rotationStep: Math.PI / 4,
  minDistance: 0.3,
  maxWallHeightFactor: 2,
  miniMapSize: 150,
  mapPadding: 10,
  moveSpeed: 0.1,
};
