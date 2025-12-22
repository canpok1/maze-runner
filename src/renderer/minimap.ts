import type { GameConfig, Player } from '../types';

/**
 * ミニマップ描画のパラメータ
 */
export interface MinimapParams {
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  player: Player;
  map: number[][];
  exploredMap: number[][];
  mapSize: number;
  config: GameConfig;
}

/**
 * ミニマップを描画する関数
 * @param params ミニマップ描画のパラメータ
 */
export function renderMinimap(params: MinimapParams): void {
  const { ctx, canvasWidth, player, map, exploredMap, mapSize, config } = params;

  const cellSize = config.miniMapSize / mapSize;

  // ミニマップの原点座標（右上）
  const mapOriginX = canvasWidth - config.miniMapSize - config.mapPadding;
  const mapOriginY = config.mapPadding;

  // 背景描画
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#111122';
  ctx.fillRect(mapOriginX, mapOriginY, config.miniMapSize, config.miniMapSize);
  ctx.globalAlpha = 1.0;

  // 迷路タイルの描画
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
  ctx.lineTo(pX + Math.cos(player.dir) * dirLength, pY + Math.sin(player.dir) * dirLength);
  ctx.stroke();
}
