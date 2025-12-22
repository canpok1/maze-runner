// --- 型定義 ---
interface Player {
  x: number;
  y: number;
  dir: number;
  speed: number;
}

// --- ゲーム定数と変数 ---
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const timerElement = document.getElementById('timer')!;
const menuElement = document.getElementById('menu') as HTMLElement;

// 45度 (π/4) をラジアンで定義
const ROTATION_STEP = Math.PI / 4;
// 最小距離 (これより近い距離はクリップされる)
const MIN_DISTANCE = 0.3;
// 壁の高さの最大値 (画面の高さの 2倍に制限)
const MAX_WALL_HEIGHT_FACTOR = 2;

// ミニマップの設定
const MINI_MAP_SIZE = 150; // ミニマップの幅と高さ (pixels)
const MAP_PADDING = 10;

let map: number[][] = []; // 迷路データ (1: 壁, 0: 通路, 2: ゴール)
let exploredMap: number[][] = []; // 探索済みデータ (0: 未探索, 1: 探索済み)
let mapSize = 11;
let player: Player = { x: 1.5, y: 1.5, dir: 0, speed: 0 }; // プレイヤー位置, 向き, 移動速度
let gameActive = false;
let startTime = 0;
let animationId: number;

// --- 迷路生成関数 (穴掘り法) ---
function generateMaze(size: number): number[][] {
  // サイズが偶数の場合は奇数に調整
  size = size % 2 === 0 ? size + 1 : size;
  // 全て壁(1)で初期化
  const newMap: number[][] = Array.from({ length: size }, () => Array(size).fill(1));

  // 再帰的に通路を掘り進む関数
  function walk(x: number, y: number): void {
    newMap[y][x] = 0; // 現在地を通路にする
    // 掘り進む方向 (東, 西, 南, 北) をランダムにシャッフル
    const dirs: [number, number][] = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    dirs.sort(() => Math.random() - 0.5);

    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy; // 2マス先の座標

      // 2マス先がマップ内でかつ壁(1)であれば
      if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && newMap[ny][nx] === 1) {
        // 間の壁を崩して通路にする
        newMap[y + dy / 2][x + dx / 2] = 0;
        // 2マス先に移動して再帰
        walk(nx, ny);
      }
    }
  }

  walk(1, 1); // スタート地点(1, 1)から掘り始め

  newMap[size - 2][size - 2] = 2; // ゴールを設定
  return newMap;
}

// --- ゲーム開始 ---
function startGame(size: number): void {
  mapSize = size;
  map = generateMaze(mapSize); // ランダム迷路生成
  // 探索済みマップを初期化 (すべて未探索 0)
  exploredMap = Array.from({ length: mapSize }, () => Array(mapSize).fill(0));

  // プレイヤーのマップグリッド座標
  const startX = 1;
  const startY = 1;
  let initialDir = 0; // 初期方向 (デフォルトは東)

  // 方向チェック: (dx, dy, direction_in_radians) [東, 南, 西, 北 の順]
  const directionsToCheck = [
    { dx: 1, dy: 0, dir: 0 },              // East (右)
    { dx: 0, dy: 1, dir: Math.PI / 2 },    // South (下)
    { dx: -1, dy: 0, dir: Math.PI },       // West (左)
    { dx: 0, dy: -1, dir: 3 * Math.PI / 2 }, // North (上)
  ];

  // 通路が開いている方向を探索
  for (const { dx, dy, dir } of directionsToCheck) {
    const checkX = startX + dx;
    const checkY = startY + dy;

    // 座標がマップ内であり、かつ壁(1)ではないことを確認
    if (map[checkY] !== undefined && map[checkY][checkX] !== undefined && map[checkY][checkX] !== 1) {
      initialDir = dir;
      break; // 最初の通路を見つけたら確定
    }
  }

  // プレイヤーの初期設定
  player = { x: 1.5, y: 1.5, dir: initialDir, speed: 0 };

  // スタート地点を探索済みとしてマーク
  exploredMap[startY][startX] = 1;

  menuElement.style.display = 'none';
  gameActive = true;
  startTime = Date.now();

  resizeCanvas();
  if (animationId) cancelAnimationFrame(animationId);
  render();
}

// --- レイキャスティング描画ループ ---
function render(): void {
  if (!gameActive) return;

  // 1. タイマー更新
  timerElement.innerText = ((Date.now() - startTime) / 1000).toFixed(2);

  // 2. プレイヤーの移動
  const moveStep = player.speed;

  const nx = player.x + Math.cos(player.dir) * moveStep;
  const ny = player.y + Math.sin(player.dir) * moveStep;

  // 壁衝突判定 (マージンを設ける)
  const margin = 0.2;
  const checkX = player.x + Math.cos(player.dir) * moveStep * (1 + margin);
  const checkY = player.y + Math.sin(player.dir) * moveStep * (1 + margin);

  if (map[Math.floor(checkY)] && map[Math.floor(checkY)][Math.floor(checkX)] !== 1) {
    player.x = nx;
    player.y = ny;

    // 探索済みタイルを更新
    exploredMap[Math.floor(player.y)][Math.floor(player.x)] = 1;
  }

  // 3. ゴール判定
  if (map[Math.floor(player.y)] && map[Math.floor(player.y)][Math.floor(player.x)] === 2) {
    win();
    return;
  }

  // 4. 画面クリア (天井と床)
  const cw = canvas.width;
  const ch = canvas.height;
  ctx.fillStyle = "#5c5c8a"; // 天井色
  ctx.fillRect(0, 0, cw, ch / 2);
  ctx.fillStyle = "#778899"; // 床色
  ctx.fillRect(0, ch / 2, cw, ch / 2);

  // 5. 疑似3D壁描画 (レイキャスティング)
  const fov = Math.PI / 3;
  const rayCount = 320;
  const sliceWidth = cw / rayCount;
  const maxWallHeight = ch * MAX_WALL_HEIGHT_FACTOR;

  for (let i = 0; i < rayCount; i++) {
    const rayAngle = (player.dir - fov / 2) + (i / rayCount) * fov;
    let distance = 0;
    let hitType = 0;

    while (distance < 30) {
      distance += 0.05;
      const rx = player.x + Math.cos(rayAngle) * distance;
      const ry = player.y + Math.sin(rayAngle) * distance;

      const mapX = Math.floor(rx);
      const mapY = Math.floor(ry);

      if (map[mapY] && map[mapY][mapX] === 1) {
        hitType = 1;
        break;
      }
      if (map[mapY] && map[mapY][mapX] === 2) {
        hitType = 2;
        break;
      }
    }

    // 魚眼レンズ効果の補正
    let correctedDistance = distance * Math.cos(rayAngle - player.dir);

    // 近すぎる距離をクリップ
    correctedDistance = Math.max(correctedDistance, MIN_DISTANCE);

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
      const mapTileX = Math.floor(player.x + Math.cos(rayAngle) * distance);
      const isVerticalHit = Math.abs(mapTileX - (player.x + Math.cos(rayAngle) * distance)) < 0.05 || Math.abs(mapTileX + 1 - (player.x + Math.cos(rayAngle) * distance)) < 0.05;

      if (isVerticalHit) {
        colorValue = Math.floor(colorValue * 0.8);
        wallColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
      }
    }

    ctx.fillStyle = wallColor;
    ctx.fillRect(i * sliceWidth, (ch - wallHeight) / 2, sliceWidth + 1, wallHeight);
  }

  // --- 6. ミニマップ描画 ---
  const cellSize = MINI_MAP_SIZE / mapSize;

  // 背景 (右上に描画)
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#111122'; // 濃い背景
  const mapOriginX = cw - MINI_MAP_SIZE - MAP_PADDING;
  const mapOriginY = MAP_PADDING;
  ctx.fillRect(mapOriginX, mapOriginY, MINI_MAP_SIZE, MINI_MAP_SIZE);
  ctx.globalAlpha = 1.0;

  // 迷路の描画
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      let color = '';

      // 探索済みの場合のみ内容を表示
      if (exploredMap[y][x] === 1) {
        if (map[y][x] === 1) {
          color = '#555577'; // 壁 (探索済み)
        } else if (map[y][x] === 2) {
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
  const pX = mapOriginX + player.x * cellSize;
  const pY = mapOriginY + player.y * cellSize;
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
    pX + Math.cos(player.dir) * dirLength,
    pY + Math.sin(player.dir) * dirLength
  );
  ctx.stroke();
  // --- ミニマップ描画 終了 ---

  animationId = requestAnimationFrame(render);
}

// --- クリア処理 ---
function win(): void {
  gameActive = false;
  cancelAnimationFrame(animationId);

  const score = ((Date.now() - startTime) / 1000).toFixed(2);

  document.getElementById('last-score')!.innerHTML = `<h2>CLEAR! クリアタイム: ${score}秒</h2>`;
  menuElement.style.display = 'flex';
}

// --- キャンバスサイズ調整 ---
function resizeCanvas(): void {
  canvas.width = canvas.parentElement!.clientWidth;
  canvas.height = canvas.parentElement!.clientHeight;
}

// --- 入力（タッチ/マウス）処理 ---
function setupControls(): void {
  const MOVE_SPEED = 0.10; // 移動速度
  const CTRL_ROTATION_STEP = Math.PI / 4; // 45度旋回

  const controlMappings: { id: string; type: 'move' | 'rot'; val: number }[] = [
    // 移動: 連続入力 (start/end)
    { id: 'forward', type: 'move', val: MOVE_SPEED },
    { id: 'backward', type: 'move', val: -MOVE_SPEED },

    // 旋回: 離散入力 (tap/click のみ)
    { id: 'left', type: 'rot', val: -CTRL_ROTATION_STEP },
    { id: 'right', type: 'rot', val: CTRL_ROTATION_STEP }
  ];

  const startHandler = (e: Event, type: 'move' | 'rot', val: number): void => {
    e.preventDefault();
    if (!gameActive) return;

    if (type === 'move') {
      player.speed = val;
    } else if (type === 'rot') {
      player.dir += val;
    }
  };

  const endHandler = (_e: Event, type: 'move' | 'rot'): void => {
    if (!gameActive) return;
    if (type === 'move') {
      player.speed = 0;
    }
    // 旋回はタップ/クリックで完結するため、endHandlerは不要
  };

  controlMappings.forEach(({ id, type, val }) => {
    const el = document.getElementById(id)!;

    if (type === 'move') {
      // 連続入力のイベント設定
      el.addEventListener('touchstart', (e) => startHandler(e, type, val));
      el.addEventListener('touchend', (e) => endHandler(e, type));
      el.addEventListener('touchcancel', (e) => endHandler(e, type));
      el.addEventListener('mousedown', (e) => startHandler(e, type, val));
      el.addEventListener('mouseup', (e) => endHandler(e, type));
      el.addEventListener('mouseleave', (e) => endHandler(e, type));
    }

    else if (type === 'rot') {
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
