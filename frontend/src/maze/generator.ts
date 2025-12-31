import { type MazeMap, TileType } from '@maze-runner/lib';

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

  // ゴール位置をランダムに選択（右端または下端の通路から選択）
  // 右端（x = size - 2）の通路セルを収集
  const rightEdgeCells: [number, number][] = [];
  for (let y = 1; y < size - 1; y++) {
    if (newMap[y][size - 2] === TileType.FLOOR) {
      rightEdgeCells.push([size - 2, y]);
    }
  }

  // 下端（y = size - 2）の通路セルを収集
  const bottomEdgeCells: [number, number][] = [];
  for (let x = 1; x < size - 1; x++) {
    if (newMap[size - 2][x] === TileType.FLOOR) {
      bottomEdgeCells.push([x, size - 2]);
    }
  }

  // 重複を除外して候補リストを作成（Set を使用）
  const candidateSet = new Set<string>();
  for (const [x, y] of rightEdgeCells) {
    candidateSet.add(`${x},${y}`);
  }
  for (const [x, y] of bottomEdgeCells) {
    candidateSet.add(`${x},${y}`);
  }
  const goalCandidates: [number, number][] = Array.from(candidateSet).map((s) => {
    const [x, y] = s.split(',').map(Number);
    return [x, y] as [number, number];
  });

  if (goalCandidates.length > 0) {
    // 候補からランダムに選択
    const [goalX, goalY] = goalCandidates[Math.floor(Math.random() * goalCandidates.length)];
    newMap[goalY][goalX] = TileType.GOAL;
  } else {
    // 候補がない場合のフォールバック処理（例: 3x3の迷路など）
    newMap[size - 2][size - 2] = TileType.GOAL;
  }

  return newMap;
}
