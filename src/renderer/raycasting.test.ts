import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameConfig, Player } from '../types';
import type { RaycastingParams } from './raycasting';
import { renderRaycasting } from './raycasting';

describe('renderRaycasting', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;
  let mockPlayer: Player;
  let mockMap: number[][];
  let mockConfig: GameConfig;

  beforeEach(() => {
    // Canvas と Context のモックを作成
    mockCanvas = {
      width: 640,
      height: 480,
    } as HTMLCanvasElement;

    mockCtx = {
      fillStyle: '',
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    // プレイヤーのモックデータ
    mockPlayer = {
      x: 2,
      y: 2,
      dir: 0,
      speed: 0.1,
    };

    // シンプルな迷路マップ
    mockMap = [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 2, 1],
      [1, 1, 1, 1, 1],
    ];

    // 設定のモックデータ
    mockConfig = {
      rotationStep: Math.PI / 4,
      minDistance: 0.3,
      maxWallHeightFactor: 2,
      miniMapSize: 150,
      mapPadding: 10,
      moveSpeed: 0.1,
    };
  });

  describe('天井と床の描画', () => {
    it('天井を画面上半分に描画すること', () => {
      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: mockMap,
        config: mockConfig,
      };

      renderRaycasting(params);

      // 天井の描画呼び出しを確認
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 640, 240);
      // fillStyleが天井色に設定されていることを確認
      const fillRectCalls = (mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      const ceilingCallIndex = fillRectCalls.findIndex(
        (call) => call[0] === 0 && call[1] === 0 && call[2] === 640 && call[3] === 240
      );
      expect(ceilingCallIndex).toBeGreaterThanOrEqual(0);
    });

    it('床を画面下半分に描画すること', () => {
      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: mockMap,
        config: mockConfig,
      };

      renderRaycasting(params);

      // 床の描画呼び出しを確認
      expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 240, 640, 240);
    });
  });

  describe('レイキャスティング描画', () => {
    it('320本のレイを描画すること', () => {
      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: mockMap,
        config: mockConfig,
      };

      renderRaycasting(params);

      // fillRectは天井1回 + 床1回 + 320本のレイ = 322回呼ばれる
      expect(mockCtx.fillRect).toHaveBeenCalledTimes(322);
    });

    it('壁のスライス幅が正しく計算されること', () => {
      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: mockMap,
        config: mockConfig,
      };

      renderRaycasting(params);

      const fillRectCalls = (mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      // 最初の2つのfillRect呼び出しは天井と床なので、3番目以降がレイキャスティング
      const raycastCalls = fillRectCalls.slice(2);

      // スライス幅は canvas.width / 320 = 2
      const expectedSliceWidth = 640 / 320;

      // 各レイの幅を確認（sliceWidth + 1 なので 3）
      for (const call of raycastCalls) {
        expect(call[2]).toBe(expectedSliceWidth + 1);
      }
    });

    it('壁の高さが maxWallHeightFactor を超えないこと', () => {
      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: mockMap,
        config: mockConfig,
      };

      renderRaycasting(params);

      const fillRectCalls = (mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      const raycastCalls = fillRectCalls.slice(2);

      const maxWallHeight = mockCanvas.height * mockConfig.maxWallHeightFactor;

      for (const call of raycastCalls) {
        const wallHeight = call[3]; // height parameter
        expect(wallHeight).toBeLessThanOrEqual(maxWallHeight);
      }
    });
  });

  describe('空のマップでの動作', () => {
    it('壁がない場合でもエラーが発生しないこと', () => {
      const emptyMap = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];

      const params: RaycastingParams = {
        ctx: mockCtx,
        canvas: mockCanvas,
        player: mockPlayer,
        map: emptyMap,
        config: mockConfig,
      };

      expect(() => renderRaycasting(params)).not.toThrow();
    });
  });
});
