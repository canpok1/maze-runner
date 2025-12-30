import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { addRanking, checkRankEligibility, getRankings, isDifficulty } from '../db/rankings';

type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

// GET /rankings?difficulty=easy&limit=10
app.get('/rankings', async (c) => {
  const difficulty = c.req.query('difficulty');
  const limitStr = c.req.query('limit') || '10';
  const limit = Number.parseInt(limitStr, 10);

  if (!isDifficulty(difficulty)) {
    return c.json(
      { error: "difficulty parameter is required and must be one of 'easy', 'normal', or 'hard'" },
      400
    );
  }

  if (Number.isNaN(limit) || limit <= 0) {
    return c.json({ error: 'limit must be a positive number' }, 400);
  }

  try {
    const rankings = await getRankings(c.env.DB, difficulty, limit);
    return c.json({ rankings });
  } catch (error) {
    console.error('Error getting rankings:', error);
    return c.json({ error: 'Failed to get rankings' }, 500);
  }
});

// POST /rankings
app.post('/rankings', async (c) => {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  if (typeof body !== 'object' || body === null) {
    return c.json({ error: 'Request body must be an object' }, 400);
  }

  const { playerName, clearTime, difficulty } = body as Record<string, unknown>;

  if (typeof playerName !== 'string' || playerName.trim() === '') {
    return c.json({ error: 'playerName is required and must be a non-empty string' }, 400);
  }

  if (typeof clearTime !== 'number' || Number.isNaN(clearTime) || clearTime <= 0) {
    return c.json({ error: 'clearTime is required and must be a positive number' }, 400);
  }

  if (!isDifficulty(difficulty)) {
    return c.json(
      { error: "difficulty is required and must be one of 'easy', 'normal', or 'hard'" },
      400
    );
  }

  try {
    const ranking = await addRanking(c.env.DB, playerName, clearTime, difficulty);
    return c.json({ success: true, ranking }, 201);
  } catch (error) {
    console.error('Error adding ranking:', error);
    return c.json({ error: 'Failed to add ranking' }, 500);
  }
});

// GET /rankings/check?difficulty=easy&clearTime=12345
app.get('/rankings/check', async (c) => {
  const difficulty = c.req.query('difficulty');
  const clearTimeStr = c.req.query('clearTime');

  if (!isDifficulty(difficulty)) {
    return c.json(
      { error: "difficulty parameter is required and must be one of 'easy', 'normal', or 'hard'" },
      400
    );
  }

  if (!clearTimeStr) {
    return c.json({ error: 'clearTime parameter is required' }, 400);
  }

  const clearTime = Number.parseInt(clearTimeStr, 10);

  if (Number.isNaN(clearTime) || clearTime <= 0) {
    return c.json({ error: 'clearTime must be a positive number' }, 400);
  }

  try {
    const result = await checkRankEligibility(c.env.DB, difficulty, clearTime);
    return c.json(result);
  } catch (error) {
    console.error('Error checking rank eligibility:', error);
    return c.json({ error: 'Failed to check rank eligibility' }, 500);
  }
});

export default app;
