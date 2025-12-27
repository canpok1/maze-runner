// --- インポート ---

import type { GameState } from '@maze-runner/lib';
import { config } from './config';
import {
  type StartGameDependencies,
  startGame as startGameCore,
  type WinDependencies,
  win as winCore,
} from './game/state';
import { setupControls } from './input/controls';
import { generateMaze } from './maze/generator';
import { createRenderer } from './renderer';

// --- DOM要素の取得とバリデーション ---
function getRequiredElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Required element #${id} not found or is not a ${type.name}.`);
  }
  return element;
}

function getRequired2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context.');
  }
  return ctx;
}

// --- ゲーム定数と変数 ---
const canvas = getRequiredElement('gameCanvas', HTMLCanvasElement);
const ctx = getRequired2DContext(canvas);
const timerElement = getRequiredElement('timer', HTMLElement);
const menuElement = getRequiredElement('menu', HTMLElement);

// ゲームの状態
const gameState: GameState = {
  map: [], // 迷路データ (1: 壁, 0: 通路, 2: ゴール)
  exploredMap: [], // 探索済みデータ (0: 未探索, 1: 探索済み)
  mapSize: 11,
  player: { x: 1.5, y: 1.5, dir: 0, speed: 0 }, // プレイヤー位置, 向き, 移動速度
  gameActive: false,
  startTime: 0,
  animationId: 0,
};

// --- ゲーム開始 ---
function startGame(size: number): void {
  // レンダラーを作成
  const { render } = createRenderer({
    gameState,
    ctx,
    canvas,
    timerElement,
    config,
    win,
  });

  const deps: StartGameDependencies = {
    gameState,
    generateMaze,
    menuElement,
    resizeCanvas,
    render,
    cancelAnimationFrame: cancelAnimationFrame.bind(window),
  };
  startGameCore(size, deps);
}

// --- クリア処理 ---
function win(): void {
  const deps: WinDependencies = {
    gameState,
    menuElement,
    cancelAnimationFrame: cancelAnimationFrame.bind(window),
  };
  winCore(deps);
}

// --- キャンバスサイズ調整 ---
function resizeCanvas(): void {
  if (!canvas.parentElement) {
    throw new Error('Canvas parent element not found.');
  }
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}

// --- 難易度ボタンのイベント設定 ---
function setupDifficultyButtons(): void {
  const buttons = document.querySelectorAll('.diff-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const size = parseInt((btn as HTMLElement).dataset.size || '11', 10);
      startGame(size);
    });
  });
}

// --- 初期化 ---
window.addEventListener('load', () => {
  setupControls(gameState);
  setupDifficultyButtons();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});
