import type { D1Database } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../src/index';

describe('GET /api/rankings', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;
  });

  it('should return rankings with valid difficulty parameter', async () => {
    const mockRows = [
      {
        player_name: 'Player1',
        clear_time: 100,
        created_at: '2025-01-01T00:00:00.000Z',
      },
    ];

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: mockRows,
          success: true,
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/api/rankings?difficulty=easy',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rankings');
    expect(Array.isArray(data.rankings)).toBe(true);
  });

  it('should return 400 without difficulty parameter', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });

  it('should return rankings with limit parameter', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/api/rankings?difficulty=normal&limit=5',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rankings');
    expect(Array.isArray(data.rankings)).toBe(true);
  });

  it('should return 400 with invalid limit parameter', async () => {
    const res = await app.request(
      '/api/rankings?difficulty=easy&limit=0',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('limit');
  });
});

describe('POST /api/rankings', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;
  });

  it('should add a new ranking with valid body', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({
          success: true,
          meta: {
            last_row_id: 1,
          },
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 120,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('ranking');
    expect(data.ranking).toHaveProperty('playerName', 'TestPlayer');
    expect(data.ranking).toHaveProperty('clearTime', 120);
    expect(data.ranking).toHaveProperty('id');
    expect(data.ranking).toHaveProperty('createdAt');
  });

  it('should return 400 when playerName is missing', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearTime: 120,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('playerName');
  });

  it('should return 400 when clearTime is missing', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when difficulty is missing', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 120,
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });

  it('should return 400 when clearTime is not a number', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 'invalid',
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when playerName is empty string', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: '',
          clearTime: 120,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('playerName');
  });

  it('should return 400 when clearTime is negative', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: -10,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 with invalid JSON body', async () => {
    const res = await app.request(
      '/api/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('JSON');
  });
});
