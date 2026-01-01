import { describe, it, expect } from 'vitest';
import { calculateShortestPath } from './pathfinding';
import { type MazeMap, TileType } from '@maze-runner/lib';

describe('calculateShortestPath', () => {
  it('スタートからゴールまでの最短経路長が正しく計算されること', () => {
    // 5x5の簡単な迷路
    // S = スタート(1,1), G = ゴール(1,3)
    // 最短経路: (1,1) -> (2,1) -> (3,1) -> (3,2) -> (3,3) -> (2,3) -> (1,3) = 6ステップ
    const maze: MazeMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 0, 1],
      [1, 2, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze, 1, 1);
    expect(result).toBe(6);
  });

  it('ゴールが存在しない場合は null を返すこと', () => {
    // ゴールが存在しない迷路
    const maze: MazeMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze, 1, 1);
    expect(result).toBeNull();
  });

  it('ゴールに到達できない場合（壁で囲まれている）は null を返すこと', () => {
    // ゴールが壁で完全に囲まれている迷路
    const maze: MazeMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 1, 1],
      [1, 0, 1, 2, 1],
      [1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze, 1, 1);
    expect(result).toBeNull();
  });

  it('複数の経路がある場合、最短の経路長を返すこと', () => {
    // 複数経路がある迷路
    // 上回りの経路: (1,1)->(2,1)->(3,1)->(4,1)->(5,1)->(5,2)->(5,3)->(5,4) = 7ステップ
    // 下回りの経路: (1,1)->(1,2)->(1,3)->(2,3)->(3,3)->(4,3)->(5,3)->(5,4) = 7ステップ
    const maze: MazeMap = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 2, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze, 1, 1);
    expect(result).toBe(7);
  });

  it('直線経路の場合、正しい経路長を返すこと', () => {
    // 横一直線の迷路
    const maze: MazeMap = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze, 1, 1);
    expect(result).toBe(4);
  });

  it('スタート地点がデフォルト値(1,1)で動作すること', () => {
    // 最短経路: (1,1) -> (1,2) -> (1,3) -> (2,3) -> (3,3) = 4ステップ
    const maze: MazeMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 2, 1],
      [1, 1, 1, 1, 1],
    ];

    const result = calculateShortestPath(maze);
    expect(result).toBe(4);
  });
});
