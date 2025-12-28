export type { Difficulty, Ranking, RankingWithId } from '@maze-runner/lib';
export { DIFFICULTIES } from '@maze-runner/lib';

/**
 * APIエラー用のカスタムエラークラス
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
