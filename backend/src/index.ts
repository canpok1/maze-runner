import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
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

export default app;
