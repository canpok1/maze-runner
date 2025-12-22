import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig, GameState } from '../types';
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
        [1, 1, 1, 1, 1],
        [1, 0, 0, 0, 1],
        [1, 0, 1, 0, 1],
        [1, 0, 0, 2, 1],
        [1, 1, 1, 1, 1],
      ],
      exploredMap: [
        [0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0],
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
      mockGameState.exploredMap[1][2] = 0; // 未探索

      const renderer = createRenderer(deps);
      renderer.render();

      // 探索済みになっていることを確認（移動後の位置）
      expect(
        mockGameState.exploredMap[Math.floor(mockGameState.player.y)][
          Math.floor(mockGameState.player.x)
        ]
      ).toBe(1);
    });

    it('ゴール位置に到達した場合winコールバックを呼び出す', () => {
      // ゴール位置（3, 3）に配置
      mockGameState.player.x = 3.5;
      mockGameState.player.y = 3.5;
      mockGameState.map[3][3] = 2; // ゴール

      const renderer = createRenderer(deps);
      renderer.render();

      expect(mockWin).toHaveBeenCalled();
    });

    it('ゴール到達時はrequestAnimationFrameを呼び出さない', () => {
      mockGameState.player.x = 3.5;
      mockGameState.player.y = 3.5;
      mockGameState.map[3][3] = 2;

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
  });
});
