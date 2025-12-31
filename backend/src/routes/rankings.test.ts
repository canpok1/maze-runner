import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import rankingsRoute from './rankings';

type Env = {
  DB: D1Database;
};

describe('GET /rankings', () => {
  let app: Hono<{ Bindings: Env }>;
  let mockDb: D1Database;

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>();
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;

    app.route('/', rankingsRoute);
  });

  it('should return rankings for the specified difficulty', async () => {
    const mockRows = [
      { player_name: 'Player1', clear_time: 100, created_at: '2025-01-01T00:00:00.000Z' },
      { player_name: 'Player2', clear_time: 150, created_at: '2025-01-01T01:00:00.000Z' },
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
      '/rankings?difficulty=easy&limit=10',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rankings');
    expect(data.rankings).toHaveLength(2);
    expect(data.rankings[0]).toEqual({
      playerName: 'Player1',
      clearTime: 100,
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });

  it('should use default limit of 10 when not specified', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    await app.request(
      '/rankings?difficulty=normal',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    const bindCall = mockPrepare.mock.results[0].value.bind;
    expect(bindCall).toHaveBeenCalledWith('normal', 10);
  });

  it('should return 400 when difficulty parameter is missing', async () => {
    const res = await app.request(
      '/rankings',
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

  it('should return 400 when difficulty value is invalid', async () => {
    const res = await app.request(
      '/rankings?difficulty=invalid',
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

  it('should return empty rankings array when no data exists', async () => {
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
      '/rankings?difficulty=hard&limit=5',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.rankings).toEqual([]);
  });
});

describe('POST /rankings', () => {
  let app: Hono<{ Bindings: Env }>;
  let mockDb: D1Database;

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>();
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;

    app.route('/', rankingsRoute);
  });

  it('should add a new ranking and return success response', async () => {
    const mockCreatedAt = '2025-01-01T00:00:00.000Z';
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 1,
          created_at: mockCreatedAt,
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 200,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('ranking');
    expect(data.ranking).toHaveProperty('id', 1);
    expect(data.ranking).toHaveProperty('playerName', 'TestPlayer');
    expect(data.ranking).toHaveProperty('clearTime', 200);
    expect(data.ranking).toHaveProperty('createdAt', mockCreatedAt);
  });

  it('should return 400 when playerName is missing', async () => {
    const res = await app.request(
      '/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clearTime: 200,
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
      '/rankings',
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
      '/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 200,
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
      '/rankings',
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
  });

  it('should return 400 when difficulty value is invalid', async () => {
    const res = await app.request(
      '/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 200,
          difficulty: 'invalid',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });

  it('should return 500 when database operation fails', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/rankings',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 200,
          difficulty: 'easy',
        }),
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});

describe('GET /rankings/:difficulty/rank', () => {
  let app: Hono<{ Bindings: Env }>;
  let mockDb: D1Database;

  beforeEach(() => {
    app = new Hono<{ Bindings: Env }>();
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;

    app.route('/', rankingsRoute);
  });

  it('should return rank eligibility when parameters are valid', async () => {
    const mockRows = [
      { player_name: 'Player1', clear_time: 100, created_at: '2025-01-01T00:00:00.000Z' },
      { player_name: 'Player2', clear_time: 200, created_at: '2025-01-01T01:00:00.000Z' },
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
      '/rankings/easy/rank?clearTime=150',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rank', 2);
  });

  it('should return 400 when difficulty value is invalid', async () => {
    const res = await app.request(
      '/rankings/invalid/rank?clearTime=150',
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

  it('should return 400 when clearTime parameter is missing', async () => {
    const res = await app.request(
      '/rankings/easy/rank',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when clearTime is not a number', async () => {
    const res = await app.request(
      '/rankings/easy/rank?clearTime=invalid',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when clearTime is not positive', async () => {
    const res = await app.request(
      '/rankings/easy/rank?clearTime=-100',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 500 when database operation fails', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockRejectedValue(new Error('Database error')),
      }),
    });

    mockDb.prepare = mockPrepare;

    const res = await app.request(
      '/rankings/easy/rank?clearTime=150',
      {
        method: 'GET',
      },
      { DB: mockDb }
    );

    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data).toHaveProperty('error');
  });
});
