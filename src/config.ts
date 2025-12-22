/**
 * ゲームの設定定数
 */

/** 45度 (π/4) をラジアンで定義 */
export const ROTATION_STEP = Math.PI / 4;

/** 最小距離 (これより近い距離はクリップされる) */
export const MIN_DISTANCE = 0.3;

/** 壁の高さの最大値 (画面の高さの 2倍に制限) */
export const MAX_WALL_HEIGHT_FACTOR = 2;

/** ミニマップの幅と高さ (pixels) */
export const MINI_MAP_SIZE = 150;

/** ミニマップの余白 (pixels) */
export const MAP_PADDING = 10;

/** プレイヤーの移動速度 */
export const MOVE_SPEED = 0.1;
