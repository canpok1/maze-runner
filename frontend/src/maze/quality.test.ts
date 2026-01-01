import { type MazeMap, TileType } from '@maze-runner/lib';
import { describe, expect, it } from 'vitest';
import {
  calculateDiagonalDistance,
  getRemovableWalls,
  meetsQualityStandard,
  removeRandomWalls,
  removeWall,
} from './quality';

const F = TileType.FLOOR;
const W = TileType.WALL;
const G = TileType.GOAL;

describe('calculateDiagonalDistance', () => {
  it('正しい対角線距離が計算されること', () => {
    // 5x5の迷路の対角線距離は (5-1) * sqrt(2) ≈ 5.66
    expect(calculateDiagonalDistance(5)).toBeCloseTo(5.66, 2);

    // 11x11の迷路の対角線距離は (11-1) * sqrt(2) ≈ 14.14
    expect(calculateDiagonalDistance(11)).toBeCloseTo(14.14, 2);

    // 21x21の迷路の対角線距離は (21-1) * sqrt(2) ≈ 28.28
    expect(calculateDiagonalDistance(21)).toBeCloseTo(28.28, 2);
  });
});

describe('meetsQualityStandard', () => {
  it('基準を満たす場合にtrueを返すこと', () => {
    // 対角線距離が14.14、閾値が0.5の場合、最短経路が7.07以上なら合格
    expect(meetsQualityStandard(8, 11, 0.5)).toBe(true);
    expect(meetsQualityStandard(10, 11, 0.5)).toBe(true);
  });

  it('基準を満たさない場合にfalseを返すこと', () => {
    // 対角線距離が14.14、閾値が0.5の場合、最短経路が7.07未満なら不合格
    expect(meetsQualityStandard(7, 11, 0.5)).toBe(false);
    expect(meetsQualityStandard(5, 11, 0.5)).toBe(false);
  });
});

describe('getRemovableWalls', () => {
  it('除去可能な壁が正しく取得されること', () => {
    // 以下の迷路で壁(2,1)は除去可能
    // W W W W W
    // W F W F W
    // W W W W W
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, F, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
    ];

    const removableWalls = getRemovableWalls(maze);

    // (2,1)の壁は左右が通路なので除去可能
    expect(removableWalls).toContainEqual({ x: 2, y: 1 });
  });

  it('外壁が除去候補に含まれないこと', () => {
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, F, F, W],
      [W, F, W, F, W],
      [W, F, F, F, W],
      [W, W, W, W, W],
    ];

    const removableWalls = getRemovableWalls(maze);

    // 外壁（x=0, y=0, x=4, y=4）は含まれないこと
    for (const wall of removableWalls) {
      expect(wall.x).toBeGreaterThan(0);
      expect(wall.x).toBeLessThan(4);
      expect(wall.y).toBeGreaterThan(0);
      expect(wall.y).toBeLessThan(4);
    }
  });

  it('通路が1つしか隣接していない壁は除去候補に含まれないこと', () => {
    // 以下の迷路で壁(2,2)は下にしか通路がないため除去不可
    // W W W W W
    // W W W W W
    // W W W W W
    // W W F W W
    // W W W W W
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, F, W, W],
      [W, W, W, W, W],
    ];

    const removableWalls = getRemovableWalls(maze);

    // (2,2)は除去候補に含まれないこと
    expect(removableWalls).not.toContainEqual({ x: 2, y: 2 });
  });

  it('ゴールタイルも通路として扱うこと', () => {
    // 以下の迷路で壁(2,1)は左が通路、右がゴールなので除去可能
    // W W W W W
    // W F W G W
    // W W W W W
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, G, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
    ];

    const removableWalls = getRemovableWalls(maze);

    // (2,1)の壁は左が通路、右がゴールなので除去可能
    expect(removableWalls).toContainEqual({ x: 2, y: 1 });
  });
});

describe('removeWall', () => {
  it('指定した壁が除去されること', () => {
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, F, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
    ];

    const result = removeWall(maze, 2, 1);

    // 壁が通路になっていること
    expect(result[1][2]).toBe(TileType.FLOOR);
  });

  it('元の配列を変更すること', () => {
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, F, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
      [W, W, W, W, W],
    ];

    const result = removeWall(maze, 2, 1);

    // 返り値と元の配列が同じオブジェクトであること
    expect(result).toBe(maze);
    // 元の配列も変更されていること
    expect(maze[1][2]).toBe(TileType.FLOOR);
  });
});

describe('removeRandomWalls', () => {
  it('壁が除去されてループが追加されること', () => {
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, F, W],
      [W, F, W, F, W],
      [W, F, F, F, W],
      [W, W, W, W, W],
    ];

    const result = removeRandomWalls(maze, 1);

    // 元の迷路と結果が異なること（壁が除去されている）
    let wallRemoved = false;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        if (maze[y][x] === TileType.WALL && result[y][x] === TileType.FLOOR) {
          wallRemoved = true;
          break;
        }
      }
      if (wallRemoved) break;
    }
    expect(wallRemoved).toBe(true);
  });

  it('元の配列が変更されないこと', () => {
    const maze: MazeMap = [
      [W, W, W, W, W],
      [W, F, W, F, W],
      [W, F, W, F, W],
      [W, F, F, F, W],
      [W, W, W, W, W],
    ];

    // 元の配列をディープコピーして保存
    const originalMaze = maze.map((row) => [...row]);

    removeRandomWalls(maze, 1);

    // 元の配列が変更されていないこと
    expect(maze).toEqual(originalMaze);
  });

  it('除去する壁の数を指定できること', () => {
    const maze: MazeMap = [
      [W, W, W, W, W, W, W],
      [W, F, W, F, W, F, W],
      [W, F, W, F, W, F, W],
      [W, F, F, F, F, F, W],
      [W, W, W, W, W, W, W],
    ];

    const result = removeRandomWalls(maze, 2);

    // 2箇所の壁が除去されていること
    let removedCount = 0;
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 7; x++) {
        if (maze[y][x] === TileType.WALL && result[y][x] === TileType.FLOOR) {
          removedCount++;
        }
      }
    }
    expect(removedCount).toBe(2);
  });

  it('除去可能な壁がない場合は元の迷路を返すこと', () => {
    // 全て外壁のみの迷路
    const maze: MazeMap = [
      [W, W, W],
      [W, F, W],
      [W, W, W],
    ];

    const result = removeRandomWalls(maze, 1);

    // 元の迷路と同じ内容であること（参照は異なる）
    expect(result).toEqual(maze);
    expect(result).not.toBe(maze);
  });
});
