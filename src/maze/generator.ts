import { type MazeMap, TileType } from '../types';

/**
 * 穴掘り法を用いて迷路を生成する純粋関数
 *
 * @param size - 迷路のサイズ（偶数の場合は自動的に奇数に調整される）
 * @returns 生成された迷路（TileType.WALL: 壁, TileType.FLOOR: 通路, TileType.GOAL: ゴール）
 */
export function generateMaze(size: number): MazeMap {
  // サイズが偶数の場合は奇数に調整
  size = size % 2 === 0 ? size + 1 : size;
  // 全て壁で初期化
  const newMap: MazeMap = Array.from({ length: size }, () => Array(size).fill(TileType.WALL));

  // 再帰的に通路を掘り進む関数
  function walk(x: number, y: number): void {
    newMap[y][x] = TileType.FLOOR; // 現在地を通路にする
    // 掘り進む方向 (東, 西, 南, 北) をランダムにシャッフル
    const dirs: [number, number][] = [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ];
    dirs.sort(() => Math.random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx,
        ny = y + dy; // 2マス先の座標

      // 2マス先がマップ内でかつ壁であれば
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && newMap[ny][nx] === TileType.WALL) {
        // 間の壁を崩して通路にする
        newMap[y + dy / 2][x + dx / 2] = TileType.FLOOR;
        // 2マス先に移動して再帰
        walk(nx, ny);
      }
    }
  }

  walk(1, 1); // スタート地点(1, 1)から掘り始め

  newMap[size - 2][size - 2] = TileType.GOAL; // ゴールを設定
  return newMap;
}
