import type { GameConfig, Player } from '../types';
import { ExplorationState, TileType } from '../types';

/**
 * ミニマップの色定数
 */
const MINIMAP_COLORS = {
  BACKGROUND: '#111122',
  WALL_EXPLORED: '#555577',
  GOAL: '#ff4444',
  PATH_EXPLORED: '#222244',
  UNEXPLORED: '#0d0d1a',
  PLAYER: '#00ff00',
  PLAYER_DIRECTION: '#00ffff',
} as const;

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
  ctx.fillStyle = MINIMAP_COLORS.BACKGROUND;
  ctx.fillRect(mapOriginX, mapOriginY, config.miniMapSize, config.miniMapSize);
  ctx.globalAlpha = 1.0;

  // 迷路タイルの描画
  for (let y = 0; y < mapSize; y++) {
    for (let x = 0; x < mapSize; x++) {
      let color = '';

      // 探索済みの場合のみ内容を表示
      if (exploredMap[y][x] === ExplorationState.EXPLORED) {
        if (map[y][x] === TileType.WALL) {
          color = MINIMAP_COLORS.WALL_EXPLORED;
        } else if (map[y][x] === TileType.GOAL) {
          color = MINIMAP_COLORS.GOAL;
        } else {
          color = MINIMAP_COLORS.PATH_EXPLORED;
        }
      } else {
        // 未探索エリア
        color = MINIMAP_COLORS.UNEXPLORED;
      }

      ctx.fillStyle = color;
      ctx.fillRect(mapOriginX + x * cellSize, mapOriginY + y * cellSize, cellSize, cellSize);
    }
  }

  // プレイヤーの描画
  const pX = mapOriginX + player.x * cellSize;
  const pY = mapOriginY + player.y * cellSize;
  const playerRadius = cellSize / 3;

  // プレイヤー円
  ctx.fillStyle = MINIMAP_COLORS.PLAYER;
  ctx.beginPath();
  ctx.arc(pX, pY, playerRadius, 0, Math.PI * 2);
  ctx.fill();

  // プレイヤーの向き
  const dirLength = cellSize * 0.8;
  ctx.strokeStyle = MINIMAP_COLORS.PLAYER_DIRECTION;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pX, pY);
  ctx.lineTo(pX + Math.cos(player.dir) * dirLength, pY + Math.sin(player.dir) * dirLength);
  ctx.stroke();
}
