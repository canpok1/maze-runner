import { type MazeMap, TileType } from '@maze-runner/lib';

/**
 * 迷路の対角線距離を計算する
 * @param size - 迷路のサイズ
 * @returns 対角線距離
 */
export function calculateDiagonalDistance(size: number): number {
  return (size - 1) * Math.sqrt(2);
}

/**
 * 最短経路長が基準を満たしているかチェックする
 * @param pathLength - 最短経路長
 * @param size - 迷路のサイズ
 * @param threshold - 基準値（対角線距離に対する比率、0-1）
 * @returns 基準を満たしていれば true
 */
export function meetsQualityStandard(
  pathLength: number,
  size: number,
  threshold: number,
): boolean {
  const diagonalDistance = calculateDiagonalDistance(size);
  return pathLength >= diagonalDistance * threshold;
}

/**
 * 除去可能な壁（通路同士を繋げる内壁）の候補を取得する
 * @param maze - 迷路マップ
 * @returns 除去可能な壁の座標リスト [{x, y}]
 */
export function getRemovableWalls(maze: MazeMap): Array<{ x: number; y: number }> {
  const size = maze.length;
  const removableWalls: Array<{ x: number; y: number }> = [];

  // 内壁のみを対象とする（外壁は除外）
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      // 壁でない場合はスキップ
      if (maze[y][x] !== TileType.WALL) {
        continue;
      }

      // 隣接する通路またはゴールの数をカウント
      let adjacentFloorCount = 0;
      const directions = [
        [0, -1], // 上
        [0, 1], // 下
        [-1, 0], // 左
        [1, 0], // 右
      ];

      for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (
          nx >= 0 &&
          nx < size &&
          ny >= 0 &&
          ny < size &&
          (maze[ny][nx] === TileType.FLOOR || maze[ny][nx] === TileType.GOAL)
        ) {
          adjacentFloorCount++;
        }
      }

      // 2つ以上の通路またはゴールに隣接していれば除去可能
      if (adjacentFloorCount >= 2) {
        removableWalls.push({ x, y });
      }
    }
  }

  return removableWalls;
}

/**
 * 指定した座標の壁を除去してループを追加する
 * @param maze - 迷路マップ（変更される）
 * @param x - X座標
 * @param y - Y座標
 * @returns 除去後の迷路マップ（元のオブジェクトを変更）
 */
export function removeWall(maze: MazeMap, x: number, y: number): MazeMap {
  maze[y][x] = TileType.FLOOR;
  return maze;
}

/**
 * ランダムに1〜2箇所の壁を除去してループを追加する
 * @param maze - 迷路マップ（コピーが作成される）
 * @param count - 除去する壁の数（1-2、デフォルト: 1）
 * @returns 壁除去後の迷路マップ（新しいオブジェクト）
 */
export function removeRandomWalls(maze: MazeMap, count = 1): MazeMap {
  // 元の配列のディープコピーを作成
  const newMaze: MazeMap = maze.map((row) => [...row]);

  // 除去可能な壁のリストを取得
  const removableWalls = getRemovableWalls(newMaze);

  // 除去可能な壁がない場合は、そのまま返す
  if (removableWalls.length === 0) {
    return newMaze;
  }

  // ランダムにcount個の壁を除去
  const wallsToRemove = Math.min(count, removableWalls.length);
  const selectedWalls = [...removableWalls]
    .sort(() => Math.random() - 0.5)
    .slice(0, wallsToRemove);

  for (const wall of selectedWalls) {
    removeWall(newMaze, wall.x, wall.y);
  }

  return newMaze;
}
