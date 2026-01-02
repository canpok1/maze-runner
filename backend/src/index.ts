import type { D1Database, ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { deleteOldRankings } from './db/rankings';
import rankingsRoute from './routes/rankings';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.route('/', rankingsRoute);

export default {
  fetch: app.fetch,
  /**
   * Cloudflare Workersの定期実行ハンドラー
   * wrangler.jsoncで設定されたcronスケジュール（毎日15:00 UTC = JST 00:00）に基づいて実行される
   * 30日より古いランキングデータを自動削除する
   *
   * @param _event スケジュールイベント（未使用）
   * @param env 環境変数（D1データベースバインディングを含む）
   * @param _ctx 実行コンテキスト（未使用）
   */
  scheduled: async (_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) => {
    try {
      const deletedCount = await deleteOldRankings(env.DB);
      console.log(`[Scheduled] 古いランキングデータを ${deletedCount} 件削除しました`);
    } catch (error) {
      console.error('[Scheduled] ランキング削除処理でエラーが発生しました:', error);
    }
  },
};
