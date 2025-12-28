import type { Difficulty } from '@maze-runner/lib';

/**
 * マップサイズから難易度を判定する
 * @param size マップサイズ
 * @returns 難易度
 */
export function getDifficultyFromSize(size: number): Difficulty {
  if (size <= 11) return 'easy';
  if (size <= 17) return 'normal';
  return 'hard';
}
