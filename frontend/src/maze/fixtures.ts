import { TileType } from '@maze-runner/lib';

/**
 * テスト用の固定迷路データを定義
 * 各迷路はURLパラメータ `?testMaze=<name>` で使用可能
 */

const F = TileType.FLOOR;
const W = TileType.WALL;
const G = TileType.GOAL;

/**
 * テスト用迷路データの型
 * ゲームで使用するMazeMap（TileType[][]）に加えて、メタデータを含む
 */
export interface TestMazeData {
  /** 迷路のサイズ（幅・高さ） */
  size: number;
  /** タイルデータの2次元配列 */
  tiles: TileType[][];
  /** スタート地点の座標 */
  start: { x: number; y: number };
  /** ゴール地点の座標 */
  goal: { x: number; y: number };
}

/**
 * テスト用迷路データのコレクション
 *
 * simple: 5×5の最小迷路（2手でクリア可能）
 * - スタート(1,1) → ゴール(3,1)
 * - 右に2マス移動でクリア
 *
 * マップ構造:
 * W W W W W
 * W S F G W
 * W W W W W
 * W W W W W
 * W W W W W
 */
export const TEST_MAZES: Record<string, TestMazeData> = {
  simple: {
    size: 5,
    tiles: [
      [W, W, W, W, W],
      [W, F, F, G, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
    ],
    start: { x: 1, y: 1 },
    goal: { x: 3, y: 1 },
  },
};

/**
 * テスト用迷路を取得
 * @param name 迷路名（例: "simple"）
 * @returns 迷路データ、見つからない場合はundefined
 */
export function getTestMaze(name: string): TestMazeData | undefined {
  return TEST_MAZES[name];
}
