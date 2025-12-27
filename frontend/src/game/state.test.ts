import { ExplorationState, type GameState, type MazeMap, TileType } from '@maze-runner/lib';
import { type StartGameDependencies, startGame } from './state';

describe('startGame', () => {
  const createMockMaze = (size: number): MazeMap => {
    const maze = Array.from({ length: size }, () => Array(size).fill(TileType.WALL));
    // スタート地点を通路に
    maze[1][1] = TileType.FLOOR;
    // ゴール地点をゴールに
    maze[size - 2][size - 2] = TileType.GOAL;
    // スタートから右に通路を作る
    maze[1][2] = TileType.FLOOR;
    return maze;
  };

  const createMockGameState = (): GameState => ({
    map: [],
    exploredMap: [],
    mapSize: 0,
    player: {
      x: 0,
      y: 0,
      dir: 0,
      speed: 0,
    },
    gameActive: false,
    startTime: 0,
    animationId: 0,
  });

  const createMockDependencies = (gameState: GameState): StartGameDependencies => {
    // DOM要素をモック
    const menuElement = {
      style: {
        display: 'flex',
      },
    } as HTMLElement;

    return {
      gameState,
      generateMaze: vi.fn((size: number) => createMockMaze(size)),
      menuElement,
      resizeCanvas: vi.fn(),
      render: vi.fn(),
      cancelAnimationFrame: vi.fn(),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ゲーム状態の初期化', () => {
    it('startGame関数がゲーム状態を正しく初期化すること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);
      const size = 11;

      startGame(size, deps);

      expect(gameState.mapSize).toBe(size);
      expect(gameState.map.length).toBe(size);
      expect(gameState.exploredMap.length).toBe(size);
      expect(gameState.gameActive).toBe(true);
      expect(gameState.startTime).toBeGreaterThan(0);
    });

    it('generateMaze関数が呼び出されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);
      const size = 11;

      startGame(size, deps);

      expect(deps.generateMaze).toHaveBeenCalledWith(size);
      expect(deps.generateMaze).toHaveBeenCalledTimes(1);
    });
  });

  describe('プレイヤーの初期化', () => {
    it('プレイヤーが正しい初期位置(1.5, 1.5)に配置されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(gameState.player.x).toBe(1.5);
      expect(gameState.player.y).toBe(1.5);
    });

    it('プレイヤーの初期速度が0であること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(gameState.player.speed).toBe(0);
    });

    it('プレイヤーの初期方向が設定されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      // 初期方向は通路が開いている方向に設定される（createMockMazeで東方向が通路）
      expect(gameState.player.dir).toBe(0);
    });
  });

  describe('探索済みマップの初期化', () => {
    it('exploredMapが正しいサイズで初期化されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);
      const size = 11;

      startGame(size, deps);

      expect(gameState.exploredMap.length).toBe(size);
      expect(gameState.exploredMap[0].length).toBe(size);
    });

    it('スタート地点が探索済み(1)としてマークされること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(gameState.exploredMap[1][1]).toBe(ExplorationState.EXPLORED);
    });

    it('スタート地点以外が未探索(0)であること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);
      const size = 11;

      startGame(size, deps);

      // スタート地点(1,1)以外をチェック
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (x === 1 && y === 1) continue;
          expect(gameState.exploredMap[y][x]).toBe(ExplorationState.UNEXPLORED);
        }
      }
    });
  });

  describe('UI要素の更新', () => {
    it('メニュー要素が非表示になること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(deps.menuElement.style.display).toBe('none');
    });

    it('resizeCanvas関数が呼び出されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(deps.resizeCanvas).toHaveBeenCalledTimes(1);
    });

    it('render関数が呼び出されること', () => {
      const gameState = createMockGameState();
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(deps.render).toHaveBeenCalledTimes(1);
    });
  });

  describe('アニメーションの管理', () => {
    it('既存のアニメーションがキャンセルされること', () => {
      const gameState = createMockGameState();
      gameState.animationId = 123;
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(deps.cancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it('アニメーションIDが0の場合、cancelAnimationFrameが呼び出されないこと', () => {
      const gameState = createMockGameState();
      gameState.animationId = 0;
      const deps = createMockDependencies(gameState);

      startGame(11, deps);

      expect(deps.cancelAnimationFrame).not.toHaveBeenCalled();
    });
  });
});
