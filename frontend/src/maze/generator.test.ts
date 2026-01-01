import { type MazeMap, TileType } from '@maze-runner/lib';
import { generateMaze, generateQualityMaze } from './generator';

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
      const goalPos = goal as { x: number; y: number };
      expect(goalPos.x).toBeGreaterThan(0);
      expect(goalPos.x).toBeLessThan(size - 1);
      expect(goalPos.y).toBeGreaterThan(0);
      expect(goalPos.y).toBeLessThan(size - 1);
    });

    it('ゴールが右端（x = size - 2）または下端（y = size - 2）にあること', () => {
      const size = 11;
      const maze = generateMaze(size);

      const goal = findGoal(maze);
      expect(goal).not.toBeNull();

      const goalPos = goal as { x: number; y: number };
      const isOnRightEdge = goalPos.x === size - 2;
      const isOnBottomEdge = goalPos.y === size - 2;
      expect(isOnRightEdge || isOnBottomEdge).toBe(true);
    });

    it('複数回生成してもゴールが右端または下端にあること', () => {
      const size = 11;
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const maze = generateMaze(size);

        const goal = findGoal(maze);
        expect(goal).not.toBeNull();

        const goalPos = goal as { x: number; y: number };
        const isOnRightEdge = goalPos.x === size - 2;
        const isOnBottomEdge = goalPos.y === size - 2;
        expect(isOnRightEdge || isOnBottomEdge).toBe(true);
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

describe('generateQualityMaze', () => {
  it('品質検証結果が正しい形式で返されること', () => {
    const result = generateQualityMaze(11);

    expect(result).toHaveProperty('maze');
    expect(result).toHaveProperty('pathLength');
    expect(result).toHaveProperty('meetsStandard');
    expect(result).toHaveProperty('attempts');
    expect(result).toHaveProperty('wallsRemoved');
  });

  it('生成された迷路が有効であること', () => {
    const result = generateQualityMaze(11);

    expect(result.maze.length).toBe(11);
    expect(result.pathLength).not.toBeNull();
  });

  it('試行回数が1以上であること', () => {
    const result = generateQualityMaze(11);

    expect(result.attempts).toBeGreaterThanOrEqual(1);
    expect(result.attempts).toBeLessThanOrEqual(10);
  });

  it('壁除去回数が0〜2の範囲であること', () => {
    const result = generateQualityMaze(11);

    expect(result.wallsRemoved).toBeGreaterThanOrEqual(0);
    expect(result.wallsRemoved).toBeLessThanOrEqual(2);
  });

  it('各難易度サイズで迷路が生成されること', () => {
    const sizes = [11, 15, 21];

    for (const size of sizes) {
      const result = generateQualityMaze(size);
      expect(result.maze).toBeDefined();
      expect(result.pathLength).not.toBeNull();
    }
  });
});
