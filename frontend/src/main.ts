import type { GameState } from '@maze-runner/lib';
import { config } from './config';
import {
  type StartGameDependencies,
  startGame as startGameCore,
  type WinDependencies,
  win as winCore,
} from './game/state';
import { getDifficultyFromSize } from './helpers/difficulty';
import { setupControls } from './input/controls';
import { getTestMaze } from './maze/fixtures';
import { generateMaze } from './maze/generator';
import { createRenderer } from './renderer';
import { initRankingDisplay } from './ui/ranking-display';
import { showScoreModal } from './ui/score-modal';

/**
 * 指定されたIDの要素を取得し、型チェックを行う
 *
 * @param id - 要素のID
 * @param type - 期待する要素の型
 * @returns 指定された型の要素
 * @throws 要素が見つからないか、型が一致しない場合
 */
function getRequiredElement<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`Required element #${id} not found or is not a ${type.name}.`);
  }
  return element;
}

/**
 * Canvasの2D描画コンテキストを取得する
 *
 * @param canvas - 対象のCanvas要素
 * @returns 2D描画コンテキスト
 * @throws コンテキストの取得に失敗した場合
 */
function getRequired2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context.');
  }
  return ctx;
}

const canvas = getRequiredElement('gameCanvas', HTMLCanvasElement);
const ctx = getRequired2DContext(canvas);
const timerElement = getRequiredElement('timer', HTMLElement);
const menuElement = getRequiredElement('menu', HTMLElement);

const gameState: GameState = {
  map: [],
  exploredMap: [],
  mapSize: 0,
  player: { x: 0, y: 0, dir: 0, speed: 0 },
  gameActive: false,
  startTime: 0,
  animationId: 0,
};

/** ランキング画面の制御関数（初期化後に設定される） */
let rankingControls: {
  refresh: () => Promise<void>;
  show: () => Promise<void>;
  hide: () => void;
} | null = null;

/**
 * URLパラメータからテスト用迷路名を取得する
 *
 * @returns テスト迷路名、未指定の場合はnull
 */
function getTestMazeParam(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('testMaze');
}

/**
 * ゲームを開始する
 *
 * @param size - 迷路のサイズ
 */
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

  // テスト迷路のチェック
  const testMazeName = getTestMazeParam();
  const testMaze = testMazeName ? getTestMaze(testMazeName) : undefined;

  const deps: StartGameDependencies = {
    gameState,
    generateMaze,
    menuElement,
    resizeCanvas,
    render,
    cancelAnimationFrame: cancelAnimationFrame.bind(window),
    maze: testMaze, // テスト迷路がある場合は渡す
  };
  startGameCore(size, deps);
}

/**
 * ゲームクリア処理を実行する
 */
function win(): void {
  const deps: WinDependencies = {
    gameState,
    menuElement,
    cancelAnimationFrame: cancelAnimationFrame.bind(window),
    showScoreModal: async (score, difficulty, onComplete) => {
      await showScoreModal(score, difficulty, () => {
        onComplete();
        // スコア登録後にランキングを再取得
        rankingControls?.refresh();
      });
    },
    getDifficultyFromSize,
  };
  winCore(deps);
}

/**
 * Canvasのサイズを親要素に合わせて調整する
 *
 * @throws 親要素が見つからない場合
 */
function resizeCanvas(): void {
  if (!canvas.parentElement) {
    throw new Error('Canvas parent element not found.');
  }
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}

/**
 * 難易度選択ボタンのクリックイベントを設定する
 */
function setupDifficultyButtons(): void {
  const buttons = document.querySelectorAll('.diff-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const size = parseInt((btn as HTMLElement).dataset.size || '11', 10);
      startGame(size);
    });
  });
}

/**
 * ランキングボタンのクリックイベントを設定する
 */
function setupRankingButton(): void {
  const showRankingBtn = document.getElementById('show-ranking-btn');
  if (showRankingBtn) {
    showRankingBtn.addEventListener('click', async () => {
      if (rankingControls) {
        await rankingControls.show();
      }
    });
  }
}

window.addEventListener('load', () => {
  setupControls(gameState);
  setupDifficultyButtons();
  setupRankingButton();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  initRankingDisplay()
    .then((result) => {
      rankingControls = result;
    })
    .catch((error) => {
      console.error('Failed to initialize ranking display:', error);
    });
});
