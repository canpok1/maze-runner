import type { D1Database, ExecutionContext, ScheduledEvent } from '@cloudflare/workers-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import indexModule from './index';

// deleteOldRankings関数のモック
vi.mock('./db/rankings', () => ({
  deleteOldRankings: vi.fn(),
}));

import { deleteOldRankings } from './db/rankings';

describe('scheduled handler', () => {
  let mockDb: D1Database;
  let mockEvent: ScheduledEvent;
  let mockCtx: ExecutionContext;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockDb = {} as D1Database;
    mockEvent = {} as ScheduledEvent;
    mockCtx = {} as ExecutionContext;

    // console.log/console.errorをスパイ
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should call deleteOldRankings with correct database', async () => {
    vi.mocked(deleteOldRankings).mockResolvedValue(5);

    await indexModule.scheduled(mockEvent, { DB: mockDb }, mockCtx);

    expect(deleteOldRankings).toHaveBeenCalledWith(mockDb);
  });

  it('should log success message when deletion succeeds', async () => {
    const deletedCount = 5;
    vi.mocked(deleteOldRankings).mockResolvedValue(deletedCount);

    await indexModule.scheduled(mockEvent, { DB: mockDb }, mockCtx);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      `[Scheduled] 古いランキングデータを ${deletedCount} 件削除しました`
    );
  });

  it('should log error message when deletion fails', async () => {
    const testError = new Error('Database error');
    vi.mocked(deleteOldRankings).mockRejectedValue(testError);

    await indexModule.scheduled(mockEvent, { DB: mockDb }, mockCtx);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Scheduled] ランキング削除処理でエラーが発生しました:',
      testError
    );
  });
});
