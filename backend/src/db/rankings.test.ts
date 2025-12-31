import type { D1Database, D1Result } from '@cloudflare/workers-types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addRanking, calculateRank, getRankings } from './rankings';

describe('getRankings', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;
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
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await getRankings(mockDb, 'easy', 10);

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(result).toEqual([
      { playerName: 'Player1', clearTime: 100, createdAt: '2025-01-01T00:00:00.000Z' },
      { playerName: 'Player2', clearTime: 150, createdAt: '2025-01-01T01:00:00.000Z' },
    ]);
  });

  it('should limit the number of results', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    await getRankings(mockDb, 'normal', 5);

    const bindCall = mockPrepare.mock.results[0].value.bind;
    expect(bindCall).toHaveBeenCalledWith('normal', 5);
  });

  it('should return empty array when no rankings exist', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await getRankings(mockDb, 'hard', 10);

    expect(result).toEqual([]);
  });
});

describe('addRanking', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;
  });

  it('should add a new ranking and return the inserted data', async () => {
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

    const result = await addRanking(mockDb, 'TestPlayer', 200, 'easy');

    expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('INSERT'));
    expect(result.id).toBe(1);
    expect(result.playerName).toBe('TestPlayer');
    expect(result.clearTime).toBe(200);
    expect(result.createdAt).toBe(mockCreatedAt);
  });

  it('should use the correct difficulty_id based on difficulty name', async () => {
    const mockCreatedAt = '2025-01-02T00:00:00.000Z';
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({
          id: 2,
          created_at: mockCreatedAt,
        }),
      }),
    });

    mockDb.prepare = mockPrepare;

    await addRanking(mockDb, 'Player', 300, 'normal');

    const bindCall = mockPrepare.mock.results[0].value.bind;
    expect(bindCall).toHaveBeenCalledWith('Player', 300, 'normal');
  });

  it('should throw error when database operation fails', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({
          success: false,
          error: 'Database error',
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    await expect(addRanking(mockDb, 'Player', 100, 'easy')).rejects.toThrow();
  });
});

describe('calculateRank', () => {
  let mockDb: D1Database;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
    } as unknown as D1Database;
  });

  it('should return rank 1 when no rankings exist', async () => {
    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [],
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await calculateRank(mockDb, 'easy', 1000);

    expect(result).toBe(1);
  });

  it('should return correct rank when rankings have less than 10 entries', async () => {
    const mockRows = [
      { player_name: 'Player1', clear_time: 100, created_at: '2025-01-01T00:00:00.000Z' },
      { player_name: 'Player2', clear_time: 200, created_at: '2025-01-01T01:00:00.000Z' },
      { player_name: 'Player3', clear_time: 300, created_at: '2025-01-01T02:00:00.000Z' },
    ];

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: mockRows,
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await calculateRank(mockDb, 'easy', 250);

    expect(result).toBe(3);
  });

  it('should return correct rank when clear time beats 10th place', async () => {
    const mockRows = Array.from({ length: 10 }, (_, i) => ({
      player_name: `Player${i + 1}`,
      clear_time: (i + 1) * 100,
      created_at: '2025-01-01T00:00:00.000Z',
    }));

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: mockRows,
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await calculateRank(mockDb, 'easy', 550);

    expect(result).toBe(6);
  });

  it('should return rank 11 when clear time does not beat 10th place', async () => {
    const mockRows = Array.from({ length: 10 }, (_, i) => ({
      player_name: `Player${i + 1}`,
      clear_time: (i + 1) * 100,
      created_at: '2025-01-01T00:00:00.000Z',
    }));

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: mockRows,
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await calculateRank(mockDb, 'easy', 1100);

    expect(result).toBe(11);
  });

  it('should return rank 1 when clear time is faster than all existing rankings', async () => {
    const mockRows = [
      { player_name: 'Player1', clear_time: 100, created_at: '2025-01-01T00:00:00.000Z' },
      { player_name: 'Player2', clear_time: 200, created_at: '2025-01-01T01:00:00.000Z' },
    ];

    const mockPrepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: mockRows,
          success: true,
        } as D1Result),
      }),
    });

    mockDb.prepare = mockPrepare;

    const result = await calculateRank(mockDb, 'easy', 50);

    expect(result).toBe(1);
  });
});
