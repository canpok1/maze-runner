import type { GameConfig, GameState } from '../types';
import { renderMinimap } from './minimap';
import { renderRaycasting } from './raycasting';

/**
 * レンダラーの依存関係を表すインターフェース
 */
export interface RenderDependencies {
  gameState: GameState;
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  timerElement: HTMLElement;
  config: GameConfig;
  win: () => void;
}

/**
 * レンダラーを作成する
 * @param deps レンダリングに必要な依存関係
 * @returns render関数を持つオブジェクト
 */
export function createRenderer(deps: RenderDependencies) {
  const { gameState, ctx, canvas, timerElement, config, win } = deps;

  /**
   * メインレンダーループ
   * ゲームの状態を更新し、画面に描画する
   */
  function render(): void {
    if (!gameState.gameActive) return;

    // 1. タイマー更新
    timerElement.innerText = ((Date.now() - gameState.startTime) / 1000).toFixed(2);

    // 2. プレイヤーの移動
    const moveStep = gameState.player.speed;

    const nx = gameState.player.x + Math.cos(gameState.player.dir) * moveStep;
    const ny = gameState.player.y + Math.sin(gameState.player.dir) * moveStep;

    // 壁衝突判定（マージンを設ける）
    const margin = 0.2;
    const checkX = gameState.player.x + Math.cos(gameState.player.dir) * moveStep * (1 + margin);
    const checkY = gameState.player.y + Math.sin(gameState.player.dir) * moveStep * (1 + margin);

    if (
      gameState.map[Math.floor(checkY)] &&
      gameState.map[Math.floor(checkY)][Math.floor(checkX)] !== 1
    ) {
      gameState.player.x = nx;
      gameState.player.y = ny;

      // 探索済みタイルを更新
      gameState.exploredMap[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] = 1;
    }

    // 3. ゴール判定
    if (
      gameState.map[Math.floor(gameState.player.y)] &&
      gameState.map[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] === 2
    ) {
      win();
      return;
    }

    // 4. レイキャスティング描画
    renderRaycasting({
      ctx,
      canvas,
      player: gameState.player,
      map: gameState.map,
      config,
    });

    // 5. ミニマップ描画
    renderMinimap({
      ctx,
      canvasWidth: canvas.width,
      player: gameState.player,
      map: gameState.map,
      exploredMap: gameState.exploredMap,
      mapSize: gameState.mapSize,
      config,
    });

    // 6. 次フレーム
    gameState.animationId = requestAnimationFrame(render);
  }

  return { render };
}
