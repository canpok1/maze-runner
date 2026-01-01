import type { Difficulty } from '@maze-runner/lib';

const EASY_MAX_SIZE = 11;
const NORMAL_MAX_SIZE = 17;

/**
 * 難易度別の最短経路長基準値（対角線距離に対する比率）
 */
export const PATH_LENGTH_THRESHOLDS: Record<Difficulty, number> = {
  easy: 0.4, // 40%
  normal: 0.5, // 50%
  hard: 0.6, // 60%
};

/**
 * マップサイズから難易度を判定する
 * @param size マップサイズ
 * @returns 難易度
 */
export function getDifficultyFromSize(size: number): Difficulty {
  if (size <= EASY_MAX_SIZE) return 'easy';
  if (size <= NORMAL_MAX_SIZE) return 'normal';
  return 'hard';
}

/**
 * 難易度に応じた最短経路長の基準値を取得する
 * @param difficulty - 難易度
 * @returns 最短経路長の基準値（対角線距離に対する比率、0-1）
 */
export function getPathLengthThreshold(difficulty: Difficulty): number {
  return PATH_LENGTH_THRESHOLDS[difficulty];
}

/**
 * マップサイズに応じた最短経路長の基準値を取得する
 * @param size - マップサイズ
 * @returns 最短経路長の基準値（対角線距離に対する比率、0-1）
 */
export function getPathLengthThresholdFromSize(size: number): number {
  const difficulty = getDifficultyFromSize(size);
  return getPathLengthThreshold(difficulty);
}
