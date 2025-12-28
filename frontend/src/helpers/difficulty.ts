import type { Difficulty } from '@maze-runner/lib';

const EASY_MAX_SIZE = 11;
const NORMAL_MAX_SIZE = 17;

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
