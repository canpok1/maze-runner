import {
  ExplorationState,
  type ExploredMap,
  type GameConfig,
  type MazeMap,
  type Player,
  TileType,
} from '@maze-runner/lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type MinimapParams, renderMinimap } from './minimap';

describe('renderMinimap', () => {
  let mockCtx: CanvasRenderingContext2D;
  let player: Player;
  let map: MazeMap;
  let exploredMap: ExploredMap;
  let config: GameConfig;

  beforeEach(() => {
    // fillStyleの履歴を保存するための配列
    const fillStyleHistory: string[] = [];
    let currentFillStyle = '';

    // モックのCanvasRenderingContext2Dを作成
    mockCtx = {
      fillRect: vi.fn(),
      get fillStyle() {
        return currentFillStyle;
      },
      set fillStyle(value: string) {
        currentFillStyle = value;
        fillStyleHistory.push(value);
      },
      globalAlpha: 1.0,
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      // テストで履歴を参照できるようにする
      _fillStyleHistory: fillStyleHistory,
    } as unknown as CanvasRenderingContext2D & { _fillStyleHistory: string[] };

    player = {
      x: 1.5,
      y: 1.5,
      dir: 0,
      speed: 0.1,
    };

    // 3x3の簡単な迷路
    map = [
      [TileType.WALL, TileType.WALL, TileType.WALL],
      [TileType.WALL, TileType.FLOOR, TileType.WALL],
      [TileType.WALL, TileType.GOAL, TileType.WALL],
    ];

    exploredMap = [
      [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
      [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.UNEXPLORED],
      [ExplorationState.UNEXPLORED, ExplorationState.UNEXPLORED, ExplorationState.UNEXPLORED],
    ];

    config = {
      rotationStep: Math.PI / 4,
      minDistance: 0.3,
      maxWallHeightFactor: 2,
      miniMapSize: 150,
      mapPadding: 10,
      moveSpeed: 0.1,
    };
  });

  describe('基本的な描画動作', () => {
    it('関数が正常に実行されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      expect(() => renderMinimap(params)).not.toThrow();
    });

    it('背景が描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // fillRectが呼ばれることを確認（背景 + タイル描画）
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it('globalAlphaが適切に設定・復元されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // globalAlphaが1.0に戻されていることを確認
      expect(mockCtx.globalAlpha).toBe(1.0);
    });
  });

  describe('迷路タイルの描画', () => {
    it('探索済みの壁が正しい色で描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // 探索済みの壁の色が設定されているか確認
      const history = (mockCtx as unknown as { _fillStyleHistory: string[] })._fillStyleHistory;
      expect(history).toContain('#555577');
    });

    it('探索済みの通路が正しい色で描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map: [
          [TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
        ],
        exploredMap: [
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
        ],
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // 探索済みの通路の色が設定されているか確認
      const history = (mockCtx as unknown as { _fillStyleHistory: string[] })._fillStyleHistory;
      expect(history).toContain('#222244');
    });

    it('ゴールが正しい色で描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map: [
          [TileType.WALL, TileType.WALL, TileType.WALL],
          [TileType.WALL, TileType.FLOOR, TileType.WALL],
          [TileType.WALL, TileType.GOAL, TileType.WALL],
        ],
        exploredMap: [
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
          [ExplorationState.EXPLORED, ExplorationState.EXPLORED, ExplorationState.EXPLORED],
        ],
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // ゴールの色が設定されているか確認
      const history = (mockCtx as unknown as { _fillStyleHistory: string[] })._fillStyleHistory;
      expect(history).toContain('#ff4444');
    });

    it('未探索エリアが正しい色で描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // 未探索エリアの色が設定されているか確認
      const history = (mockCtx as unknown as { _fillStyleHistory: string[] })._fillStyleHistory;
      expect(history).toContain('#0d0d1a');
    });
  });

  describe('プレイヤーの描画', () => {
    it('プレイヤーの円が描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // arcメソッドが呼ばれることを確認
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('プレイヤーの向きが描画されること', () => {
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth: 800,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // 線の描画メソッドが呼ばれることを確認
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('座標計算', () => {
    it('ミニマップが右上に配置されること', () => {
      const canvasWidth = 800;
      const params: MinimapParams = {
        ctx: mockCtx,
        canvasWidth,
        player,
        map,
        exploredMap,
        mapSize: 3,
        config,
      };

      renderMinimap(params);

      // 期待される座標
      const expectedMapOriginX = canvasWidth - config.miniMapSize - config.mapPadding;
      const expectedMapOriginY = config.mapPadding;

      // fillRectの最初の呼び出し（背景描画）の引数を確認
      const fillRectCalls = (mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
      expect(fillRectCalls[0]).toEqual([
        expectedMapOriginX,
        expectedMapOriginY,
        config.miniMapSize,
        config.miniMapSize,
      ]);
    });
  });
});
