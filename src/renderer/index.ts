import type { GameConfig, GameState, MazeMap } from '../types';
import { ExplorationState, TileType } from '../types';
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
 * 指定座標のマップタイルを取得する
 * @param map マップ配列
 * @param x X座標
 * @param y Y座標
 * @returns タイルの値（範囲外の場合undefined）
 */
function getTile(map: MazeMap, x: number, y: number): TileType | undefined {
  const mapY = Math.floor(y);
  const mapX = Math.floor(x);
  return map[mapY]?.[mapX];
}

/**
 * ゲーム状態を更新する
 * @param gameState ゲーム状態
 * @param timerElement タイマー表示要素
 * @returns ゴールに到達した場合true、それ以外false
 */
function update(gameState: GameState, timerElement: HTMLElement): boolean {
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

  if (getTile(gameState.map, checkX, checkY) !== TileType.WALL) {
    gameState.player.x = nx;
    gameState.player.y = ny;

    // 通路中心への補正
    const cellX = Math.floor(gameState.player.x);
    const cellY = Math.floor(gameState.player.y);
    const offsetX = gameState.player.x - cellX; // セル内のX位置（0.0〜1.0）
    const offsetY = gameState.player.y - cellY; // セル内のY位置（0.0〜1.0）

    // 隣接セルが壁かどうかをチェック
    const leftWall = getTile(gameState.map, cellX - 1, cellY) === TileType.WALL;
    const rightWall = getTile(gameState.map, cellX + 1, cellY) === TileType.WALL;
    const topWall = getTile(gameState.map, cellX, cellY - 1) === TileType.WALL;
    const bottomWall = getTile(gameState.map, cellX, cellY + 1) === TileType.WALL;

    // 左に壁があり、左側に寄りすぎている場合 → X座標を中心に補正
    if (leftWall && offsetX < 0.5) {
      gameState.player.x = cellX + 0.5;
    }

    // 右に壁があり、右側に寄りすぎている場合 → X座標を中心に補正
    if (rightWall && offsetX > 0.5) {
      gameState.player.x = cellX + 0.5;
    }

    // 上に壁があり、上側に寄りすぎている場合 → Y座標を中心に補正
    if (topWall && offsetY < 0.5) {
      gameState.player.y = cellY + 0.5;
    }

    // 下に壁があり、下側に寄りすぎている場合 → Y座標を中心に補正
    if (bottomWall && offsetY > 0.5) {
      gameState.player.y = cellY + 0.5;
    }

    // 探索済みタイルを更新
    gameState.exploredMap[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] =
      ExplorationState.EXPLORED;
  }

  // 3. ゴール判定
  if (getTile(gameState.map, gameState.player.x, gameState.player.y) === TileType.GOAL) {
    return true; // ゴール到達
  }

  return false;
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

    // ゲーム状態を更新
    const reachedGoal = update(gameState, timerElement);

    // ゴール到達時は処理を終了
    if (reachedGoal) {
      win();
      return;
    }

    // レイキャスティング描画
    renderRaycasting({
      ctx,
      canvas,
      player: gameState.player,
      map: gameState.map,
      config,
    });

    // ミニマップ描画
    renderMinimap({
      ctx,
      canvasWidth: canvas.width,
      player: gameState.player,
      map: gameState.map,
      exploredMap: gameState.exploredMap,
      mapSize: gameState.mapSize,
      config,
    });

    // 次フレーム
    gameState.animationId = requestAnimationFrame(render);
  }

  return { render };
}
