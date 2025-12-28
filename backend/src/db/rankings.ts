import type { D1Database } from '@cloudflare/workers-types';

export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && DIFFICULTIES.includes(value as Difficulty);
}

interface RankingRow {
  player_name: string;
  clear_time: number;
  created_at: string;
}

export interface Ranking {
  playerName: string;
  clearTime: number;
  createdAt: string;
}

export interface RankingWithId extends Ranking {
  id: number;
}

/**
 * 指定された難易度のランキングを取得する
 * @param db D1データベースインスタンス
 * @param difficulty 難易度名（'easy', 'normal', 'hard'）
 * @param limit 取得する件数
 * @returns ランキングの配列
 */
export async function getRankings(
  db: D1Database,
  difficulty: Difficulty,
  limit: number
): Promise<Ranking[]> {
  const query = `
    SELECT r.player_name, r.clear_time, r.created_at
    FROM rankings r
    JOIN difficulties d ON r.difficulty_id = d.id
    WHERE d.name = ?
    ORDER BY r.clear_time ASC
    LIMIT ?
  `;

  const result = await db.prepare(query).bind(difficulty, limit).all<RankingRow>();

  return result.results.map((row) => ({
    playerName: row.player_name,
    clearTime: row.clear_time,
    createdAt: row.created_at,
  }));
}

/**
 * 新しいランキングスコアを追加する
 * @param db D1データベースインスタンス
 * @param playerName プレイヤー名
 * @param clearTime クリアタイム（ミリ秒）
 * @param difficulty 難易度名（'easy', 'normal', 'hard'）
 * @returns 追加されたランキング情報
 */
export async function addRanking(
  db: D1Database,
  playerName: string,
  clearTime: number,
  difficulty: Difficulty
): Promise<RankingWithId> {
  const query = `
    INSERT INTO rankings (player_name, clear_time, difficulty_id)
    SELECT ?, ?, id FROM difficulties WHERE name = ?
    RETURNING id, created_at
  `;

  const newRankingInfo = await db
    .prepare(query)
    .bind(playerName, clearTime, difficulty)
    .first<{ id: number; created_at: string }>();

  if (!newRankingInfo) {
    throw new Error('Failed to add ranking');
  }

  return {
    id: newRankingInfo.id,
    playerName,
    clearTime,
    createdAt: newRankingInfo.created_at,
  };
}
