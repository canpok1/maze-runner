import type { GameConfig, MazeMap, Player } from '../types';
import { TileType } from '../types';

/**
 * レイキャスティングの定数
 */
const RAYCASTING_CONSTANTS = {
  RAY_COUNT: 320,
  MAX_RAY_DISTANCE: 30,
  RAY_STEP: 0.05,
  SHADOW_DISTANCE_FACTOR: 10,
};

export interface RaycastingParams {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  player: Player;
  map: MazeMap;
  config: GameConfig;
}

/**
 * レイキャスティングで3D壁を描画する
 * @param params 描画に必要なパラメータ
 */
export function renderRaycasting(params: RaycastingParams): void {
  const { ctx, canvas, player, map, config } = params;

  const cw = canvas.width;
  const ch = canvas.height;

  // 天井を描画
  ctx.fillStyle = '#5c5c8a';
  ctx.fillRect(0, 0, cw, ch / 2);

  // 床を描画
  ctx.fillStyle = '#778899';
  ctx.fillRect(0, ch / 2, cw, ch / 2);

  // レイキャスティングのパラメータ
  const fov = Math.PI / 3;
  const rayCount = RAYCASTING_CONSTANTS.RAY_COUNT;
  const sliceWidth = cw / rayCount;
  const maxWallHeight = ch * config.maxWallHeightFactor;

  // 各レイを描画
  for (let i = 0; i < rayCount; i++) {
    const rayAngle = player.dir - fov / 2 + (i / rayCount) * fov;
    let distance = 0;
    let hitType: TileType = TileType.FLOOR;

    // レイを進めて壁との衝突を検出
    while (distance < RAYCASTING_CONSTANTS.MAX_RAY_DISTANCE) {
      distance += RAYCASTING_CONSTANTS.RAY_STEP;
      const rx = player.x + Math.cos(rayAngle) * distance;
      const ry = player.y + Math.sin(rayAngle) * distance;

      const mapX = Math.floor(rx);
      const mapY = Math.floor(ry);

      // 壁との衝突判定
      if (map[mapY] && map[mapY][mapX] === TileType.WALL) {
        hitType = TileType.WALL;
        break;
      }

      // ゴールとの衝突判定
      if (map[mapY] && map[mapY][mapX] === TileType.GOAL) {
        hitType = TileType.GOAL;
        break;
      }
    }

    // 魚眼レンズ効果の補正
    let correctedDistance = distance * Math.cos(rayAngle - player.dir);

    // 近すぎる距離をクリップ
    correctedDistance = Math.max(correctedDistance, config.minDistance);

    // 壁の高さを計算
    let wallHeight = ch / (correctedDistance || 0.01);

    // 壁の高さを制限
    wallHeight = Math.min(wallHeight, maxWallHeight);

    // 影（距離に応じて暗くする）
    const darkness = Math.min(1, correctedDistance / RAYCASTING_CONSTANTS.SHADOW_DISTANCE_FACTOR);
    let colorValue = Math.floor(255 * (1 - darkness));

    let wallColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;

    if (hitType === TileType.GOAL) {
      // ゴール（赤色）
      wallColor = `rgb(255, ${colorValue * 0.5}, ${colorValue * 0.5})`;
    } else if (hitType === TileType.WALL) {
      // 壁に簡単なテクスチャ効果（縦の影）
      const mapTileX = Math.floor(player.x + Math.cos(rayAngle) * distance);
      const isVerticalHit =
        Math.abs(mapTileX - (player.x + Math.cos(rayAngle) * distance)) < 0.05 ||
        Math.abs(mapTileX + 1 - (player.x + Math.cos(rayAngle) * distance)) < 0.05;

      if (isVerticalHit) {
        colorValue = Math.floor(colorValue * 0.8);
        wallColor = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;
      }
    }

    // 壁のスライスを描画
    ctx.fillStyle = wallColor;
    ctx.fillRect(i * sliceWidth, (ch - wallHeight) / 2, sliceWidth + 1, wallHeight);
  }
}
