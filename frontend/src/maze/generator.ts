import { type MazeMap, TileType } from '@maze-runner/lib';
import { calculateShortestPath } from './pathfinding';
import { meetsQualityStandard, removeRandomWalls } from './quality';
import { getPathLengthThresholdFromSize } from '../helpers/difficulty';

/** 再生成の最大回数 */
const MAX_REGENERATION_ATTEMPTS = 10;

/** 壁除去の最大回数 */
const MAX_WALL_REMOVAL_ATTEMPTS = 2;

/**
 * 品質検証結果を表すインターフェース
 */
export interface QualityCheckResult {
  maze: MazeMap;
  pathLength: number | null;
  meetsStandard: boolean;
  attempts: number;
  wallsRemoved: number;
}

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

  // ゴール位置をランダムに選択
  // 右端または下端の通路から選択することで、スタート地点(1,1)から十分な距離を確保し、
  // プレイヤーが迷路を横断・縦断する必要がある適切な難易度を実現する
  const edge = size - 2; // マップ内部の最右列・最下行のインデックス
  const goalCandidates: [number, number][] = [];

  // 右端（x = edge）の通路セルを収集
  for (let y = 1; y <= edge; y++) {
    if (newMap[y][edge] === TileType.FLOOR) {
      goalCandidates.push([edge, y]);
    }
  }

  // 下端（y = edge）の通路セルを収集
  // 右下角(edge, edge)は右端で収集済みのため、x < edge として重複を回避
  for (let x = 1; x < edge; x++) {
    if (newMap[edge][x] === TileType.FLOOR) {
      goalCandidates.push([x, edge]);
    }
  }

  if (goalCandidates.length > 0) {
    const [goalX, goalY] = goalCandidates[Math.floor(Math.random() * goalCandidates.length)];
    newMap[goalY][goalX] = TileType.GOAL;
  } else {
    // フォールバック: 右端・下端に通路がない場合、スタート地点以外の通路からゴールを選ぶ
    // これにより、常に到達可能なゴールが保証される
    const fallbackCandidates: [number, number][] = [];
    for (let y = 1; y <= edge; y++) {
      for (let x = 1; x <= edge; x++) {
        if (newMap[y][x] === TileType.FLOOR && (x !== 1 || y !== 1)) {
          fallbackCandidates.push([x, y]);
        }
      }
    }

    if (fallbackCandidates.length > 0) {
      const [goalX, goalY] =
        fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
      newMap[goalY][goalX] = TileType.GOAL;
    } else {
      // スタート地点しか通路がないエッジケース(例: 3x3)
      // この場合、迷路として成立しないが、右下隅をゴールに設定
      newMap[edge][edge] = TileType.GOAL;
    }
  }

  return newMap;
}

/**
 * 品質検証付きで迷路を生成する
 *
 * 1. 穴掘り法で基本迷路を生成
 * 2. 最短経路長を計算
 * 3. 基準値と比較
 * 4. 基準未満の場合、ランダムに壁を1〜2箇所除去
 * 5. それでも基準未満の場合は再生成（最大10回）
 *
 * @param size - 迷路のサイズ
 * @returns 品質検証結果
 */
export function generateQualityMaze(size: number): QualityCheckResult {
  // サイズが偶数の場合は奇数に調整
  const adjustedSize = size % 2 === 0 ? size + 1 : size;
  const threshold = getPathLengthThresholdFromSize(adjustedSize);

  let attempts = 0;

  while (attempts < MAX_REGENERATION_ATTEMPTS) {
    attempts++;

    // 基本迷路を生成
    let maze = generateMaze(adjustedSize);
    let wallsRemoved = 0;

    // 最短経路長を計算
    let pathLength = calculateShortestPath(maze);

    // ゴールに到達できない場合は再生成
    if (pathLength === null) {
      continue;
    }

    // 基準を満たしているかチェック
    if (meetsQualityStandard(pathLength, adjustedSize, threshold)) {
      return { maze, pathLength, meetsStandard: true, attempts, wallsRemoved };
    }

    // 基準未満の場合、壁を除去してループを追加
    for (let i = 0; i < MAX_WALL_REMOVAL_ATTEMPTS; i++) {
      maze = removeRandomWalls(maze, 1);
      wallsRemoved++;

      pathLength = calculateShortestPath(maze);

      if (pathLength !== null && meetsQualityStandard(pathLength, adjustedSize, threshold)) {
        return { maze, pathLength, meetsStandard: true, attempts, wallsRemoved };
      }
    }

    // 壁除去でも基準を満たさない場合は再生成
  }

  // 最大試行回数に達した場合、警告ログを出力して最後に生成した迷路を返す
  console.warn(`迷路生成: ${MAX_REGENERATION_ATTEMPTS}回の試行後も品質基準を満たしませんでした。現状の迷路を使用します。`);

  const finalMaze = generateMaze(adjustedSize);
  const finalPathLength = calculateShortestPath(finalMaze);

  return {
    maze: finalMaze,
    pathLength: finalPathLength,
    meetsStandard: false,
    attempts,
    wallsRemoved: 0,
  };
}
