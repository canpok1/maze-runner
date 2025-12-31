import { type MazeMap, TileType } from '@maze-runner/lib';
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

    it('迷路内にゴールが1つだけ存在すること', () => {
      const size = 11;
      const maze = generateMaze(size);
      const goalCount = maze.flat().filter((tile) => tile === TileType.GOAL).length;
      expect(goalCount).toBe(1);
    });
  });

  describe('ゴール位置のランダム化', () => {
    const findGoal = (maze: MazeMap): { x: number; y: number } | null => {
      for (let y = 0; y < maze.length; y++) {
        for (let x = 0; x < maze[y].length; x++) {
          if (maze[y][x] === TileType.GOAL) {
            return { x, y };
          }
        }
      }
      return null;
    };

    it('ゴールがスタート地点(1,1)とは異なる位置にあること', () => {
      const size = 11;
      const maze = generateMaze(size);
      expect(maze[1][1]).not.toBe(TileType.GOAL);
    });

    it('ゴールが外周の壁ではなく内部に配置されていること', () => {
      const size = 11;
      const maze = generateMaze(size);

      const goal = findGoal(maze);
      expect(goal).not.toBeNull();

      // ゴールが外周でないことを確認(通路エリア内にあること)
      expect(goal!.x).toBeGreaterThan(0);
      expect(goal!.x).toBeLessThan(size - 1);
      expect(goal!.y).toBeGreaterThan(0);
      expect(goal!.y).toBeLessThan(size - 1);
    });

    it('ゴールとスタートのマンハッタン距離が迷路サイズの50%以上であること', () => {
      const size = 11;
      const maze = generateMaze(size);

      const goal = findGoal(maze);
      expect(goal).not.toBeNull();

      const manhattanDistance = Math.abs(goal!.x - 1) + Math.abs(goal!.y - 1);
      expect(manhattanDistance).toBeGreaterThanOrEqual(size * 0.5);
    });

    it('複数回生成してもマンハッタン距離の条件を満たすこと', () => {
      const size = 11;
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const maze = generateMaze(size);

        const goal = findGoal(maze);
        expect(goal).not.toBeNull();

        const manhattanDistance = Math.abs(goal!.x - 1) + Math.abs(goal!.y - 1);
        expect(manhattanDistance).toBeGreaterThanOrEqual(size * 0.5);
      }
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
