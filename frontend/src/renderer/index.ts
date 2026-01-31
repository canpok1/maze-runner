import type { GameConfig, GameState, MazeMap } from '@maze-runner/lib';
import { ExplorationState, TileType } from '@maze-runner/lib';
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
 * 移動パス上にゴールが存在するかチェックする
 * @param map マップ配列
 * @param x0 開始位置のX座標
 * @param y0 開始位置のY座標
 * @param x1 終了位置のX座標
 * @param y1 終了位置のY座標
 * @returns パス上のいずれかのセルがゴールの場合true、それ以外false
 */
function checkGoalAlongPath(map: MazeMap, x0: number, y0: number, x1: number, y1: number): boolean {
  // 開始位置と終了位置のセルをチェック
  const startCellX = Math.floor(x0);
  const startCellY = Math.floor(y0);
  const endCellX = Math.floor(x1);
  const endCellY = Math.floor(y1);

  // 開始位置のセルがゴールかチェック
  if (getTile(map, x0, y0) === TileType.GOAL) {
    return true;
  }

  // 終了位置のセルがゴールかチェック
  if (getTile(map, x1, y1) === TileType.GOAL) {
    return true;
  }

  // 開始位置と終了位置が同じセルの場合、これ以上チェック不要
  if (startCellX === endCellX && startCellY === endCellY) {
    return false;
  }

  // パスに沿って0.5セル間隔で補間し、各中間位置のセルをチェック
  const distance = Math.hypot(x1 - x0, y1 - y0);
  const step = 0.5; // 0.5セル間隔

  // 移動距離が短くてもセルをまたぐ場合、中間点のチェックが必須。
  // stepsが1になるような短い距離だとループが実行されないため、
  // 常に最低1回の中間点チェック（numChecks=2）が行われるようにする。
  const steps = Math.ceil(distance / step);
  const numChecks = Math.max(2, steps);

  for (let i = 1; i < numChecks; i++) {
    const t = i / numChecks;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;

    if (getTile(map, x, y) === TileType.GOAL) {
      return true;
    }
  }

  return false;
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

  // 移動前の位置を保存
  const prevX = gameState.player.x;
  const prevY = gameState.player.y;

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

    const CELL_CENTER_OFFSET = 0.5;

    // X座標の補正: 左右に壁があり、壁側に寄りすぎている場合
    if ((leftWall && offsetX < CELL_CENTER_OFFSET) || (rightWall && offsetX > CELL_CENTER_OFFSET)) {
      gameState.player.x = cellX + CELL_CENTER_OFFSET;
    }

    // Y座標の補正: 上下に壁があり、壁側に寄りすぎている場合
    if ((topWall && offsetY < CELL_CENTER_OFFSET) || (bottomWall && offsetY > CELL_CENTER_OFFSET)) {
      gameState.player.y = cellY + CELL_CENTER_OFFSET;
    }

    // 探索済みタイルを更新
    gameState.exploredMap[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] =
      ExplorationState.EXPLORED;
  }

  // 3. ゴール判定（移動パス全体をチェック）
  if (checkGoalAlongPath(gameState.map, prevX, prevY, gameState.player.x, gameState.player.y)) {
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
