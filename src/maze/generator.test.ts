import { TileType } from '../types';
import { generateMaze } from './generator';

describe('generateMaze', () => {
  describe('迷路サイズの調整', () => {
    it('偶数サイズの場合、奇数に調整されること', () => {
      const maze = generateMaze(10);
      expect(maze.length).toBe(11);
      expect(maze[0].length).toBe(11);
    });

    it('奇数サイズの場合、そのままのサイズであること', () => {
      const maze = generateMaze(11);
      expect(maze.length).toBe(11);
      expect(maze[0].length).toBe(11);
    });
  });

  describe('迷路の基本構造', () => {
    it('生成された迷路が指定サイズであること', () => {
      const size = 15;
      const maze = generateMaze(size);
      expect(maze.length).toBe(size);
      expect(maze[0].length).toBe(size);
    });

    it('スタート地点(1,1)が通路(0)であること', () => {
      const maze = generateMaze(11);
      expect(maze[1][1]).toBe(TileType.FLOOR);
    });

    it('ゴール地点(size-2, size-2)がゴール(2)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      expect(maze[size - 2][size - 2]).toBe(TileType.GOAL);
    });
  });

  describe('外周の壁', () => {
    it('がすべて壁(1)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      for (let i = 0; i < size; i++) {
        expect(maze[0][i]).toBe(TileType.WALL); // 上辺
        expect(maze[size - 1][i]).toBe(TileType.WALL); // 下辺
        expect(maze[i][0]).toBe(TileType.WALL); // 左辺
        expect(maze[i][size - 1]).toBe(TileType.WALL); // 右辺
      }
    });
  });

  describe('迷路の妥当性', () => {
    it('迷路に通路(0)とゴール(2)が含まれること', () => {
      const maze = generateMaze(11);
      const flatMaze = maze.flat();
      expect(flatMaze).toContain(TileType.FLOOR); // 通路
      expect(flatMaze).toContain(TileType.GOAL); // ゴール
    });

    it('迷路の各行が同じ長さであること', () => {
      const size = 11;
      const maze = generateMaze(size);
      for (const row of maze) {
        expect(row.length).toBe(size);
      }
    });
  });
});
