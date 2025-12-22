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
      expect(maze[1][1]).toBe(0);
    });

    it('ゴール地点(size-2, size-2)がゴール(2)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      expect(maze[size - 2][size - 2]).toBe(2);
    });
  });

  describe('外周の壁', () => {
    it('上辺がすべて壁(1)であること', () => {
      const maze = generateMaze(11);
      for (let x = 0; x < maze[0].length; x++) {
        expect(maze[0][x]).toBe(1);
      }
    });

    it('下辺がすべて壁(1)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      const lastRow = size - 1;
      for (let x = 0; x < maze[lastRow].length; x++) {
        expect(maze[lastRow][x]).toBe(1);
      }
    });

    it('左辺がすべて壁(1)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      for (let y = 0; y < size; y++) {
        expect(maze[y][0]).toBe(1);
      }
    });

    it('右辺がすべて壁(1)であること', () => {
      const size = 11;
      const maze = generateMaze(size);
      const lastCol = size - 1;
      for (let y = 0; y < size; y++) {
        expect(maze[y][lastCol]).toBe(1);
      }
    });
  });

  describe('迷路の妥当性', () => {
    it('迷路に通路(0)とゴール(2)が含まれること', () => {
      const maze = generateMaze(11);
      const flatMaze = maze.flat();
      expect(flatMaze).toContain(0); // 通路
      expect(flatMaze).toContain(2); // ゴール
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
