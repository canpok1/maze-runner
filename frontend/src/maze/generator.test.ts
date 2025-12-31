import { TileType } from '@maze-runner/lib';
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
    it('ゴールがスタート地点(1,1)とは異なる位置にあること', () => {
      const size = 11;
      const maze = generateMaze(size);
      expect(maze[1][1]).not.toBe(TileType.GOAL);
    });

    it('ゴールが外周の壁ではなく内部に配置されていること', () => {
      const size = 11;
      const maze = generateMaze(size);

      // ゴール位置を探す
      let goalX = -1;
      let goalY = -1;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (maze[y][x] === TileType.GOAL) {
            goalX = x;
            goalY = y;
            break;
          }
        }
        if (goalX !== -1) break;
      }

      // ゴールが外周でないことを確認(通路エリア内にあること)
      expect(goalX).toBeGreaterThan(0);
      expect(goalX).toBeLessThan(size - 1);
      expect(goalY).toBeGreaterThan(0);
      expect(goalY).toBeLessThan(size - 1);
    });

    it('ゴールとスタートのマンハッタン距離が迷路サイズの50%以上であること', () => {
      const size = 11;
      const maze = generateMaze(size);

      // ゴール位置を探す
      let goalX = -1;
      let goalY = -1;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (maze[y][x] === TileType.GOAL) {
            goalX = x;
            goalY = y;
            break;
          }
        }
        if (goalX !== -1) break;
      }

      expect(goalX).not.toBe(-1);
      expect(goalY).not.toBe(-1);

      const manhattanDistance = Math.abs(goalX - 1) + Math.abs(goalY - 1);
      expect(manhattanDistance).toBeGreaterThanOrEqual(size * 0.5);
    });

    it('複数回生成してもマンハッタン距離の条件を満たすこと', () => {
      const size = 11;
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const maze = generateMaze(size);

        // ゴール位置を探す
        let goalX = -1;
        let goalY = -1;
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (maze[y][x] === TileType.GOAL) {
              goalX = x;
              goalY = y;
              break;
            }
          }
          if (goalX !== -1) break;
        }

        const manhattanDistance = Math.abs(goalX - 1) + Math.abs(goalY - 1);
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
