import { Hono } from 'hono';

type Env = {
  // 今後利用する環境変数の型をここに追加します
  // 例: MY_KV: KVNamespace;
};

const app = new Hono<{ Bindings: Env }>().basePath('/api');

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

export default app;
