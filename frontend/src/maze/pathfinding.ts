import { type MazeMap, TileType } from '@maze-runner/lib';

/**
 * キューの要素を表すインターフェース
 */
interface QueueNode {
  x: number;
  y: number;
  distance: number;
}

/**
 * BFSを用いて迷路のスタート地点からゴールまでの最短経路長を計算する
 * @param maze - 迷路マップ
 * @param startX - スタート地点のX座標（デフォルト: 1）
 * @param startY - スタート地点のY座標（デフォルト: 1）
 * @returns 最短経路長（ゴールが見つからない場合は null）
 */
export function calculateShortestPath(maze: MazeMap, startX = 1, startY = 1): number | null {
  // 迷路のサイズを取得
  const height = maze.length;
  const width = maze[0]?.length ?? 0;

  // 迷路が空の場合
  if (height === 0 || width === 0) {
    return null;
  }

  // スタート地点が範囲外または壁の場合
  if (
    startY < 0 ||
    startY >= height ||
    startX < 0 ||
    startX >= width ||
    maze[startY][startX] === TileType.WALL
  ) {
    return null;
  }

  // 訪問済みフラグの2次元配列
  const visited: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false)
  );

  // BFS用のキュー
  const queue: QueueNode[] = [];
  queue.push({ x: startX, y: startY, distance: 0 });
  visited[startY][startX] = true;

  // 4方向の移動（上、右、下、左）
  const directions = [
    { dx: 0, dy: -1 }, // 上
    { dx: 1, dy: 0 }, // 右
    { dx: 0, dy: 1 }, // 下
    { dx: -1, dy: 0 }, // 左
  ];

  // BFSによる探索
  while (queue.length > 0) {
    // キューの先頭を取り出す
    const current = queue.shift();
    if (!current) break;

    // ゴールに到達した場合
    if (maze[current.y][current.x] === TileType.GOAL) {
      return current.distance;
    }

    // 4方向を探索
    for (const dir of directions) {
      const nextX = current.x + dir.dx;
      const nextY = current.y + dir.dy;

      // 範囲外チェック
      if (nextY < 0 || nextY >= height || nextX < 0 || nextX >= width) {
        continue;
      }

      // 壁または訪問済みの場合はスキップ
      if (visited[nextY][nextX] || maze[nextY][nextX] === TileType.WALL) {
        continue;
      }

      // 訪問済みにマーク
      visited[nextY][nextX] = true;

      // キューに追加
      queue.push({
        x: nextX,
        y: nextY,
        distance: current.distance + 1,
      });
    }
  }

  // ゴールに到達できなかった場合
  return null;
}
