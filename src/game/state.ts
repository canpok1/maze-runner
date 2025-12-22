import type { GameState } from '../types';
import { ExplorationState, TileType } from '../types';

/** プレイヤーのスタートグリッド座標 X */
const START_GRID_X = 1;
/** プレイヤーのスタートグリッド座標 Y */
const START_GRID_Y = 1;

/** 方向チェック用の定数配列 [東, 南, 西, 北] */
const DIRECTIONS_TO_CHECK = [
  { dx: 1, dy: 0, dir: 0 }, // East (右)
  { dx: 0, dy: 1, dir: Math.PI / 2 }, // South (下)
  { dx: -1, dy: 0, dir: Math.PI }, // West (左)
  { dx: 0, dy: -1, dir: (3 * Math.PI) / 2 }, // North (上)
];

/**
 * startGame関数の依存関係を定義するインターフェース
 */
export interface StartGameDependencies {
  gameState: GameState;
  generateMaze: (size: number) => number[][];
  menuElement: HTMLElement;
  resizeCanvas: () => void;
  render: () => void;
  cancelAnimationFrame: (id: number) => void;
}

/**
 * win関数の依存関係を定義するインターフェース
 */
export interface WinDependencies {
  gameState: GameState;
  menuElement: HTMLElement;
  cancelAnimationFrame: (id: number) => void;
}

/**
 * ゲームを開始する
 *
 * @param size - 迷路のサイズ
 * @param deps - 依存関係
 */
export function startGame(size: number, deps: StartGameDependencies): void {
  deps.gameState.mapSize = size;
  deps.gameState.map = deps.generateMaze(deps.gameState.mapSize); // ランダム迷路生成
  // 探索済みマップを初期化 (すべて未探索 0)
  deps.gameState.exploredMap = Array.from({ length: deps.gameState.mapSize }, () =>
    Array(deps.gameState.mapSize).fill(ExplorationState.UNEXPLORED)
  );

  // プレイヤーのマップグリッド座標
  const startX = START_GRID_X;
  const startY = START_GRID_Y;
  let initialDir = 0; // 初期方向 (デフォルトは東)

  // 通路が開いている方向を探索
  for (const { dx, dy, dir } of DIRECTIONS_TO_CHECK) {
    const checkX = startX + dx;
    const checkY = startY + dy;

    // 座標がマップ内であり、かつ壁(1)ではないことを確認
    if (deps.gameState.map[checkY] && deps.gameState.map[checkY][checkX] !== TileType.WALL) {
      initialDir = dir;
      break; // 最初の通路を見つけたら確定
    }
  }

  // プレイヤーの初期設定
  deps.gameState.player = {
    x: START_GRID_X + 0.5,
    y: START_GRID_Y + 0.5,
    dir: initialDir,
    speed: 0,
  };

  // スタート地点を探索済みとしてマーク
  deps.gameState.exploredMap[startY][startX] = ExplorationState.EXPLORED;

  deps.menuElement.style.display = 'none';
  deps.gameState.gameActive = true;
  deps.gameState.startTime = Date.now();

  deps.resizeCanvas();
  if (deps.gameState.animationId) deps.cancelAnimationFrame(deps.gameState.animationId);
  deps.render();
}

/**
 * ゲームクリア処理
 *
 * @param deps - 依存関係
 */
export function win(deps: WinDependencies): void {
  deps.gameState.gameActive = false;
  deps.cancelAnimationFrame(deps.gameState.animationId);

  const score = ((Date.now() - deps.gameState.startTime) / 1000).toFixed(2);

  const lastScoreElement = document.getElementById('last-score');
  if (lastScoreElement) {
    lastScoreElement.innerHTML = `<h2>CLEAR! クリアタイム: ${score}秒</h2>`;
  }
  deps.menuElement.style.display = 'flex';
}
