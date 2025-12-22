import { config } from '../config';
import type { GameState } from '../types';

/**
 * 操作の種類
 */
type ControlType = 'move' | 'rot';

/**
 * 操作マッピング定義
 */
interface ControlMapping {
  id: string;
  type: ControlType;
  val: number;
}

/**
 * 押下中のキーを追跡するSet
 */
const pressedKeys = new Set<string>();

/**
 * 入力処理の初期化
 * タッチ/マウス操作とキーボード操作のイベントリスナーを設定する
 *
 * @param gameState ゲーム状態
 */
export function setupControls(gameState: GameState): void {
  setupTouchAndMouseControls(gameState);
  setupKeyboardControls(gameState);
}

/**
 * タッチ/マウス操作の初期化
 *
 * @param gameState ゲーム状態
 */
function setupTouchAndMouseControls(gameState: GameState): void {
  const controlMappings: ControlMapping[] = [
    // 移動: 連続入力 (start/end)
    { id: 'forward', type: 'move', val: config.moveSpeed },
    { id: 'backward', type: 'move', val: -config.moveSpeed },

    // 旋回: 離散入力 (tap/click のみ)
    { id: 'left', type: 'rot', val: -config.rotationStep },
    { id: 'right', type: 'rot', val: config.rotationStep },
  ];

  const startHandler = (e: Event, type: ControlType, val: number): void => {
    e.preventDefault();
    if (!gameState.gameActive) return;

    if (type === 'move') {
      gameState.player.speed = val;
    } else if (type === 'rot') {
      gameState.player.dir += val;
    }
  };

  const endHandler = (_e: Event, type: ControlType): void => {
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
      ['touchstart', 'mousedown'].forEach((event) => {
        el.addEventListener(event, (e) => startHandler(e, type, val));
      });
      ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach((event) => {
        el.addEventListener(event, (e) => endHandler(e, type));
      });
    } else if (type === 'rot') {
      // 離散入力のイベント設定 (タッチ開始またはマウスダウンで即時実行)
      ['touchstart', 'mousedown'].forEach((event) => {
        el.addEventListener(event, (e) => startHandler(e, type, val));
      });
    }
  });
}

/**
 * キーボード操作の初期化
 * WASD キーと矢印キーによる操作をサポート
 *
 * @param gameState ゲーム状態
 */
function setupKeyboardControls(gameState: GameState): void {
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (!gameState.gameActive) return;
    const key = e.key.toLowerCase();

    const isNewPress = !pressedKeys.has(key);
    pressedKeys.add(key);

    // Movement
    if (['w', 'arrowup', 's', 'arrowdown'].includes(key)) {
      let move = 0;
      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) move += 1;
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) move -= 1;
      gameState.player.speed = move * config.moveSpeed;
      e.preventDefault();
    }

    // Rotation (only on first press)
    if (isNewPress) {
      if (key === 'a' || key === 'arrowleft') {
        gameState.player.dir -= config.rotationStep;
        e.preventDefault();
      } else if (key === 'd' || key === 'arrowright') {
        gameState.player.dir += config.rotationStep;
        e.preventDefault();
      }
    }
  };

  const handleKeyUp = (e: KeyboardEvent): void => {
    if (!gameState.gameActive) return;
    const key = e.key.toLowerCase();

    if (!pressedKeys.has(key)) return;
    pressedKeys.delete(key);

    // Movement
    if (['w', 'arrowup', 's', 'arrowdown'].includes(key)) {
      let move = 0;
      if (pressedKeys.has('w') || pressedKeys.has('arrowup')) move += 1;
      if (pressedKeys.has('s') || pressedKeys.has('arrowdown')) move -= 1;
      gameState.player.speed = move * config.moveSpeed;
      e.preventDefault();
    }

    // Rotation
    if (['a', 'arrowleft', 'd', 'arrowright'].includes(key)) {
      e.preventDefault();
    }
  };

  // イベントリスナーの登録
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}
