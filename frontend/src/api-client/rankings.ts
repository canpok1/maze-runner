import { ApiError, type Difficulty, type Ranking, type RankingWithId } from './types';

/**
 * ランキングデータを取得する
 * @param difficulty 難易度
 * @param limit 取得件数
 * @returns ランキングの配列
 * @throws {ApiError} APIリクエストが失敗した場合
 */
export async function fetchRankings(difficulty: Difficulty, limit: number): Promise<Ranking[]> {
  const url = `/api/rankings?difficulty=${difficulty}&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new ApiError(response.status, `Failed to fetch rankings: ${response.statusText}`);
  }

  const data = await response.json();
  return data.rankings;
}

/**
 * スコアを送信する
 * @param playerName プレイヤー名
 * @param clearTime クリアタイム（ミリ秒）
 * @param difficulty 難易度
 * @returns 登録されたランキング情報
 * @throws {ApiError} APIリクエストが失敗した場合
 */
export async function submitScore(
  playerName: string,
  clearTime: number,
  difficulty: Difficulty
): Promise<RankingWithId> {
  const response = await fetch('/api/rankings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      playerName,
      clearTime,
      difficulty,
    }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Failed to submit score: ${response.statusText}`);
  }

  const data = await response.json();
  return data.ranking;
}
