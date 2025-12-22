// --- インポート ---

import { config } from './config';
import {
  type StartGameDependencies,
  startGame as startGameCore,
  type WinDependencies,
  win as winCore,
} from './game/state';
import { generateMaze } from './maze/generator';
import type { GameState } from './types';

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
  const deps: StartGameDependencies = {
    gameState,
    generateMaze,
    menuElement,
    resizeCanvas,
    render,
    cancelAnimationFrame,
  };
  startGameCore(size, deps);
}

// --- レイキャスティング描画ループ ---
function render(): void {
  if (!gameState.gameActive) return;

  // 1. タイマー更新
  timerElement.innerText = ((Date.now() - gameState.startTime) / 1000).toFixed(2);

  // 2. プレイヤーの移動
  const moveStep = gameState.player.speed;

  const nx = gameState.player.x + Math.cos(gameState.player.dir) * moveStep;
  const ny = gameState.player.y + Math.sin(gameState.player.dir) * moveStep;

  // 壁衝突判定 (マージンを設ける)
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

  // 4. 画面クリア (天井と床)
  const cw = canvas.width;
  const ch = canvas.height;
  ctx.fillStyle = '#5c5c8a'; // 天井色
  ctx.fillRect(0, 0, cw, ch / 2);
  ctx.fillStyle = '#778899'; // 床色
  ctx.fillRect(0, ch / 2, cw, ch / 2);

  // 5. 疑似3D壁描画 (レイキャスティング)
  const fov = Math.PI / 3;
  const rayCount = 320;
  const sliceWidth = cw / rayCount;
  const maxWallHeight = ch * config.maxWallHeightFactor;

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = gameState.player.dir - fov / 2 + (i / rayCount) * fov;
    let distance = 0;
    let hitType = 0;

    while (distance < 30) {
      distance += 0.05;
      const rx = gameState.player.x + Math.cos(rayAngle) * distance;
      const ry = gameState.player.y + Math.sin(rayAngle) * distance;

      const mapX = Math.floor(rx);
      const mapY = Math.floor(ry);

      if (gameState.map[mapY] && gameState.map[mapY][mapX] === 1) {
        hitType = 1;
        break;
      }
      if (gameState.map[mapY] && gameState.map[mapY][mapX] === 2) {
        hitType = 2;
        break;
      }
    }

    // 魚眼レンズ効果の補正
    let correctedDistance = distance * Math.cos(rayAngle - gameState.player.dir);

    // 近すぎる距離をクリップ
    correctedDistance = Math.max(correctedDistance, config.minDistance);

    // 壁の高さ
    let wallHeight = ch / (correctedDistance || 0.01);

    // 壁の高さを制限
    wallHeight = Math.min(wallHeight, maxWallHeight);

    // 影（距離に応じて暗くする）
    const darkness = Math.min(1, correctedDistance / 10);
    let colorValue = Math.floor(255 * (1 - darkness));

    let wallColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;

    if (hitType === 2) {
      // ゴール (赤色)
      wallColor = `rgb(255, ${colorValue * 0.5}, ${colorValue * 0.5})`;
    } else if (hitType === 1) {
      // 壁に簡単なテクスチャ効果（横の影）
      const mapTileX = Math.floor(gameState.player.x + Math.cos(rayAngle) * distance);
      const isVerticalHit =
        Math.abs(mapTileX - (gameState.player.x + Math.cos(rayAngle) * distance)) < 0.05 ||
        Math.abs(mapTileX + 1 - (gameState.player.x + Math.cos(rayAngle) * distance)) < 0.05;

      if (isVerticalHit) {
        colorValue = Math.floor(colorValue * 0.8);
        wallColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
      }
    }

    ctx.fillStyle = wallColor;
    ctx.fillRect(i * sliceWidth, (ch - wallHeight) / 2, sliceWidth + 1, wallHeight);
  }

  // --- 6. ミニマップ描画 ---
  const cellSize = config.miniMapSize / gameState.mapSize;

  // 背景 (右上に描画)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#111122'; // 濃い背景
  const mapOriginX = cw - config.miniMapSize - config.mapPadding;
  const mapOriginY = config.mapPadding;
  ctx.fillRect(mapOriginX, mapOriginY, config.miniMapSize, config.miniMapSize);
  ctx.globalAlpha = 1.0;

  // 迷路の描画
  for (let y = 0; y < gameState.mapSize; y++) {
    for (let x = 0; x < gameState.mapSize; x++) {
      let color = '';

      // 探索済みの場合のみ内容を表示
      if (gameState.exploredMap[y][x] === 1) {
        if (gameState.map[y][x] === 1) {
          color = '#555577'; // 壁 (探索済み)
        } else if (gameState.map[y][x] === 2) {
          color = '#ff4444'; // ゴール
        } else {
          color = '#222244'; // 通路 (探索済み)
        }
      } else {
        // 未探索エリア
        color = '#0d0d1a';
      }

      ctx.fillStyle = color;
      ctx.fillRect(mapOriginX + x * cellSize, mapOriginY + y * cellSize, cellSize, cellSize);
    }
  }

  // プレイヤーの描画
  const pX = mapOriginX + gameState.player.x * cellSize;
  const pY = mapOriginY + gameState.player.y * cellSize;
  const playerRadius = cellSize / 3;

  // プレイヤー円 (緑)
  ctx.fillStyle = '#00ff00';
  ctx.beginPath();
  ctx.arc(pX, pY, playerRadius, 0, Math.PI * 2);
  ctx.fill();

  // プレイヤーの向き (青)
  const dirLength = cellSize * 0.8;
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pX, pY);
  ctx.lineTo(
    pX + Math.cos(gameState.player.dir) * dirLength,
    pY + Math.sin(gameState.player.dir) * dirLength
  );
  ctx.stroke();
  // --- ミニマップ描画 終了 ---

  gameState.animationId = requestAnimationFrame(render);
}

// --- クリア処理 ---
function win(): void {
  const deps: WinDependencies = {
    gameState,
    menuElement,
    cancelAnimationFrame,
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

// --- 入力（タッチ/マウス）処理 ---
function setupControls(): void {
  const controlMappings: { id: string; type: 'move' | 'rot'; val: number }[] = [
    // 移動: 連続入力 (start/end)
    { id: 'forward', type: 'move', val: config.moveSpeed },
    { id: 'backward', type: 'move', val: -config.moveSpeed },

    // 旋回: 離散入力 (tap/click のみ)
    { id: 'left', type: 'rot', val: -config.rotationStep },
    { id: 'right', type: 'rot', val: config.rotationStep },
  ];

  const startHandler = (e: Event, type: 'move' | 'rot', val: number): void => {
    e.preventDefault();
    if (!gameState.gameActive) return;

    if (type === 'move') {
      gameState.player.speed = val;
    } else if (type === 'rot') {
      gameState.player.dir += val;
    }
  };

  const endHandler = (_e: Event, type: 'move' | 'rot'): void => {
    if (!gameState.gameActive) return;
    if (type === 'move') {
      gameState.player.speed = 0;
    }
    // 旋回はタップ/クリックで完結するため、endHandlerは不要
  };

  controlMappings.forEach(({ id, type, val }) => {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Required control element #${id} not found.`);
    }

    if (type === 'move') {
      // 連続入力のイベント設定
      el.addEventListener('touchstart', (e) => startHandler(e, type, val));
      el.addEventListener('touchend', (e) => endHandler(e, type));
      el.addEventListener('touchcancel', (e) => endHandler(e, type));
      el.addEventListener('mousedown', (e) => startHandler(e, type, val));
      el.addEventListener('mouseup', (e) => endHandler(e, type));
      el.addEventListener('mouseleave', (e) => endHandler(e, type));
    } else if (type === 'rot') {
      // 離散入力のイベント設定 (タッチ開始またはマウスダウンで即時実行)
      el.addEventListener('touchstart', (e) => startHandler(e, type, val));
      el.addEventListener('mousedown', (e) => startHandler(e, type, val));
    }
  });
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
  setupControls();
  setupDifficultyButtons();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});
