import { ExplorationState, type GameConfig, type GameState, TileType } from '@maze-runner/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RenderDependencies } from './index';
import { createRenderer } from './index';

describe('createRenderer', () => {
  let mockGameState: GameState;
  let mockCtx: CanvasRenderingContext2D;
  let mockCanvas: HTMLCanvasElement;
  let mockTimerElement: HTMLElement;
  let mockConfig: GameConfig;
  let mockWin: () => void;
  let deps: RenderDependencies;

  beforeEach(() => {
    // ゲームステートのモック
    mockGameState = {
      map: [
        [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
        [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.FLOOR, TileType.WALL],
        [TileType.WALL, TileType.FLOOR, TileType.WALL, TileType.FLOOR, TileType.WALL],
        [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.GOAL, TileType.WALL],
        [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
      ],
      exploredMap: [
        [
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
        ],
        [
          ExplorationState.UNEXPLORED,
          ExplorationState.EXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
        ],
        [
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
        ],
        [
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
        ],
        [
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
          ExplorationState.UNEXPLORED,
        ],
      ],
      mapSize: 5,
      player: {
        x: 1.5,
        y: 1.5,
        dir: 0,
        speed: 0.05,
      },
      gameActive: true,
      startTime: Date.now(),
      animationId: 0,
    };

    // Canvas関連のモック
    mockCanvas = {
      width: 800,
      height: 600,
    } as HTMLCanvasElement;

    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockTimerElement = {
      innerText: '',
    } as HTMLElement;

    mockConfig = {
      rotationStep: 0.05,
      minDistance: 0.3,
      maxWallHeightFactor: 2.0,
      miniMapSize: 150,
      mapPadding: 10,
      moveSpeed: 0.05,
    };

    mockWin = vi.fn();

    deps = {
      gameState: mockGameState,
      ctx: mockCtx,
      canvas: mockCanvas,
      timerElement: mockTimerElement,
      config: mockConfig,
      win: mockWin,
    };

    // requestAnimationFrameのモック
    globalThis.requestAnimationFrame = vi.fn((callback) => {
      setTimeout(callback, 16);
      return 1;
    });

    // Date.nowのモック
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });

  it('createRendererはrenderメソッドを持つオブジェクトを返す', () => {
    const renderer = createRenderer(deps);
    expect(renderer).toHaveProperty('render');
    expect(typeof renderer.render).toBe('function');
  });

  describe('render関数', () => {
    it('gameActiveがfalseの場合は何もしない', () => {
      mockGameState.gameActive = false;
      const renderer = createRenderer(deps);

      renderer.render();

      expect(mockTimerElement.innerText).toBe('');
      expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('タイマーを更新する', () => {
      vi.spyOn(Date, 'now').mockReturnValue(2500);
      mockGameState.startTime = 1000;

      const renderer = createRenderer(deps);
      renderer.render();

      expect(mockTimerElement.innerText).toBe('1.50');
    });

    it('プレイヤーの位置を更新する（壁がない場合）', () => {
      mockGameState.player.x = 1.5;
      mockGameState.player.y = 1.5;
      mockGameState.player.dir = 0; // 右方向
      mockGameState.player.speed = 0.1;

      const renderer = createRenderer(deps);
      renderer.render();

      // x座標が増加していることを確認
      expect(mockGameState.player.x).toBeGreaterThan(1.5);
      expect(mockGameState.player.y).toBeCloseTo(1.5, 1);
    });

    it('壁に衝突する場合はプレイヤーの位置を更新しない', () => {
      // マップ:
      // [1, 1, 1, 1, 1],
      // [1, 0, 0, 0, 1],
      // [1, 0, 1, 0, 1],  <- y=2, x=2に壁がある
      // [1, 0, 0, 2, 1],
      // [1, 1, 1, 1, 1],
      // 右方向(dir=0)を向き、map[2][2]の壁に向かう
      // margin=0.2, speed=0.05なので checkX = x + speed * (1 + 0.2) = x + 0.06
      // x + 0.06 >= 2.0 なら壁判定される → x >= 1.94
      mockGameState.player.x = 1.95;
      mockGameState.player.y = 2.5;
      mockGameState.player.dir = 0; // 右方向
      mockGameState.player.speed = 0.05;

      const initialX = mockGameState.player.x;
      const initialY = mockGameState.player.y;

      const renderer = createRenderer(deps);
      renderer.render();

      // 位置が変わっていないことを確認
      expect(mockGameState.player.x).toBe(initialX);
      expect(mockGameState.player.y).toBe(initialY);
    });

    it('プレイヤーの探索済みマップを更新する', () => {
      mockGameState.player.x = 2.5;
      mockGameState.player.y = 1.5;
      mockGameState.exploredMap[1][2] = ExplorationState.UNEXPLORED; // 未探索

      const renderer = createRenderer(deps);
      renderer.render();

      // 探索済みになっていることを確認（移動後の位置）
      expect(
        mockGameState.exploredMap[Math.floor(mockGameState.player.y)][
          Math.floor(mockGameState.player.x)
        ]
      ).toBe(ExplorationState.EXPLORED);
    });

    it('ゴール位置に到達した場合winコールバックを呼び出す', () => {
      // ゴール位置（3, 3）に配置
      mockGameState.player.x = 3.5;
      mockGameState.player.y = 3.5;
      mockGameState.map[3][3] = TileType.GOAL; // ゴール

      const renderer = createRenderer(deps);
      renderer.render();

      expect(mockWin).toHaveBeenCalled();
    });

    it('ゴール到達時はrequestAnimationFrameを呼び出さない', () => {
      mockGameState.player.x = 3.5;
      mockGameState.player.y = 3.5;
      mockGameState.map[3][3] = TileType.GOAL;

      const renderer = createRenderer(deps);
      renderer.render();

      expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    });

    it('通常時はrequestAnimationFrameを呼び出す', () => {
      const renderer = createRenderer(deps);
      renderer.render();

      expect(globalThis.requestAnimationFrame).toHaveBeenCalled();
    });

    it('animationIdを更新する', () => {
      (globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>).mockReturnValue(42);

      const renderer = createRenderer(deps);
      renderer.render();

      expect(mockGameState.animationId).toBe(42);
    });

    describe('通路中心への補正', () => {
      it('水平通路（上下が壁）の場合、Y軸を中心に補正する', () => {
        // マップを水平通路に設定:
        // [1, 1, 1, 1, 1],
        // [1, 0, 0, 0, 1],  <- この行が水平通路（上下が壁、左右が開いている）
        // [1, 1, 1, 1, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
        ];
        mockGameState.mapSize = 3;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 3 }, () => Array(5).fill(ExplorationState.UNEXPLORED));
          map[1][1] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーを水平通路に配置（Y座標が中心からずれている）
        mockGameState.player.x = 1.5;
        mockGameState.player.y = 1.3; // 中心(1.5)からずれている
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // Y座標が1.5に補正されている
        expect(mockGameState.player.y).toBe(1.5);
        // X座標は移動方向に従って変化している
        expect(mockGameState.player.x).toBeGreaterThan(1.5);
      });

      it('垂直通路（左右が壁）の場合、X軸を中心に補正する', () => {
        // マップを垂直通路に設定:
        // [1, 1, 1],
        // [1, 0, 1],  <- この列が垂直通路（左右が壁、上下が開いている）
        // [1, 0, 1],
        // [1, 0, 1],
        // [1, 1, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.WALL],
        ];
        mockGameState.mapSize = 5;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 5 }, () => Array(3).fill(ExplorationState.UNEXPLORED));
          map[1][1] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーを垂直通路に配置（X座標が中心からずれている）
        mockGameState.player.x = 1.3; // 中心(1.5)からずれている
        mockGameState.player.y = 1.5;
        mockGameState.player.dir = Math.PI / 2; // 下方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // X座標が1.5に補正されている
        expect(mockGameState.player.x).toBe(1.5);
        // Y座標は移動方向に従って変化している
        expect(mockGameState.player.y).toBeGreaterThan(1.5);
      });

      it('交差点（4方向が開いている）の場合、補正しない', () => {
        // マップを交差点に設定:
        // [1, 1, 1, 1, 1],
        // [1, 1, 0, 1, 1],
        // [1, 0, 0, 0, 1],  <- 中心が交差点
        // [1, 1, 0, 1, 1],
        // [1, 1, 1, 1, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.FLOOR, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.FLOOR, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
        ];
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 5 }, () => Array(5).fill(ExplorationState.UNEXPLORED));
          map[2][2] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーを交差点に配置（中心からずれている）
        mockGameState.player.x = 2.3;
        mockGameState.player.y = 2.3;
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const initialX = mockGameState.player.x;

        const renderer = createRenderer(deps);
        renderer.render();

        // 交差点では補正されない（移動方向の変化のみ）
        expect(mockGameState.player.x).not.toBe(2.5);
        expect(mockGameState.player.y).not.toBe(2.5);
        // X座標は右方向に移動している
        expect(mockGameState.player.x).toBeGreaterThan(initialX);
      });

      it('T字路（上が壁）で上側に寄った場合、Y座標が補正される', () => {
        // マップをT字路に設定:
        // [1, 1, 1, 1, 1],
        // [1, 0, 0, 0, 1],  <- この行がT字路（上が壁、左右下が開いている）
        // [1, 1, 0, 1, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.FLOOR, TileType.WALL, TileType.WALL],
        ];
        mockGameState.mapSize = 3;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 3 }, () => Array(5).fill(ExplorationState.UNEXPLORED));
          map[1][2] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーをT字路に配置（上側に寄っている: offsetY < 0.5）
        mockGameState.player.x = 2.5;
        mockGameState.player.y = 1.3; // セル内位置0.3 < 0.5なので上側に寄っている
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // Y座標が1.5に補正されている
        expect(mockGameState.player.y).toBe(1.5);
      });

      it('T字路（上が壁）で下側に寄った場合、Y座標は補正されない', () => {
        // マップをT字路に設定:
        // [1, 1, 1, 1, 1],
        // [1, 0, 0, 0, 1],  <- この行がT字路（上が壁、左右下が開いている）
        // [1, 1, 0, 1, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.WALL, TileType.FLOOR, TileType.WALL, TileType.WALL],
        ];
        mockGameState.mapSize = 3;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 3 }, () => Array(5).fill(ExplorationState.UNEXPLORED));
          map[1][2] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーをT字路に配置（下側に寄っている: offsetY > 0.5）
        mockGameState.player.x = 2.5;
        mockGameState.player.y = 1.7; // セル内位置0.7 > 0.5なので下側に寄っている
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // Y座標は補正されない（移動によって変化する可能性はある）
        expect(mockGameState.player.y).not.toBe(1.5);
      });

      it('L字路（左上が壁）で左上に寄った場合、X座標とY座標の両方が補正される', () => {
        // マップをL字路に設定:
        // [1, 1, 1],
        // [1, 0, 0],  <- この位置がL字路（左と上が壁、右と下が開いている）
        // [1, 0, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
        ];
        mockGameState.mapSize = 3;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 3 }, () => Array(3).fill(ExplorationState.UNEXPLORED));
          map[1][1] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーをL字路に配置（左上に寄っている: offsetX < 0.5, offsetY < 0.5）
        mockGameState.player.x = 1.3; // セル内位置0.3 < 0.5なので左側に寄っている
        mockGameState.player.y = 1.2; // セル内位置0.2 < 0.5なので上側に寄っている
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // X座標とY座標の両方が1.5に補正されている
        expect(mockGameState.player.x).toBe(1.5);
        expect(mockGameState.player.y).toBe(1.5);
      });

      it('L字路（左上が壁）で右下に寄った場合、補正されない', () => {
        // マップをL字路に設定:
        // [1, 1, 1],
        // [1, 0, 0],  <- この位置がL字路（左と上が壁、右と下が開いている）
        // [1, 0, 1],
        mockGameState.map = [
          [TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.FLOOR],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
        ];
        mockGameState.mapSize = 3;
        mockGameState.exploredMap = (() => {
          const map = Array.from({ length: 3 }, () => Array(3).fill(ExplorationState.UNEXPLORED));
          map[1][1] = ExplorationState.EXPLORED;
          return map;
        })();

        // プレイヤーをL字路に配置（右下に寄っている: offsetX > 0.5, offsetY > 0.5）
        mockGameState.player.x = 1.7; // セル内位置0.7 > 0.5なので右側に寄っている
        mockGameState.player.y = 1.8; // セル内位置0.8 > 0.5なので下側に寄っている
        mockGameState.player.dir = 0; // 右方向
        mockGameState.player.speed = 0.05;

        const renderer = createRenderer(deps);
        renderer.render();

        // 補正されない（移動によって変化する可能性はある）
        expect(mockGameState.player.x).not.toBe(1.5);
        expect(mockGameState.player.y).not.toBe(1.5);
      });
    });
  });
});
