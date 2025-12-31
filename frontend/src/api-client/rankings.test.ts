import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRankEligibility, fetchRankings, submitScore } from './rankings';
import type { Ranking, RankingWithId } from './types';
import { ApiError } from './types';

describe('rankings API client', () => {
  beforeEach(() => {
    // fetchモックをリセット
    vi.restoreAllMocks();
  });

  describe('fetchRankings', () => {
    it('正常系: ランキングデータを取得できる', async () => {
      const mockRankings: Ranking[] = [
        { playerName: 'Player1', clearTime: 100, createdAt: '2025-12-28T00:00:00Z' },
        { playerName: 'Player2', clearTime: 200, createdAt: '2025-12-28T00:01:00Z' },
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ rankings: mockRankings }),
      });

      const result = await fetchRankings('easy', 10);

      expect(result).toEqual(mockRankings);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rankings?difficulty=easy&limit=10', {
        cache: 'no-store',
      });
    });

    it('異常系: ネットワークエラーの場合、ApiErrorをスローする', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      try {
        await fetchRankings('easy', 10);
        expect.fail('Expected fetchRankings to throw, but it did not.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Failed to fetch rankings: Internal Server Error');
        }
      }
    });

    it('異常系: fetch自体が失敗した場合、エラーをスローする', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(fetchRankings('easy', 10)).rejects.toThrow('Network failure');
    });
  });

  describe('submitScore', () => {
    it('正常系: スコアを送信できる', async () => {
      const mockRanking: RankingWithId = {
        id: 1,
        playerName: 'TestPlayer',
        clearTime: 150,
        createdAt: '2025-12-28T00:00:00Z',
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ success: true, ranking: mockRanking }),
      });

      const result = await submitScore('TestPlayer', 150, 'normal');

      expect(result).toEqual(mockRanking);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerName: 'TestPlayer',
          clearTime: 150,
          difficulty: 'normal',
        }),
      });
    });

    it('異常系: サーバーエラーの場合、ApiErrorをスローする', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      try {
        await submitScore('TestPlayer', 150, 'normal');
        expect.fail('Expected submitScore to throw, but it did not.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(400);
          expect(error.message).toBe('Failed to submit score: Bad Request');
        }
      }
    });

    it('異常系: fetch自体が失敗した場合、エラーをスローする', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(submitScore('TestPlayer', 150, 'normal')).rejects.toThrow('Network failure');
    });
  });

  describe('checkRankEligibility', () => {
    it('正常系: ランクイン判定を取得できる（rank: 1, isTopTen: true）', async () => {
      const mockResponse = { rank: 1, isTopTen: true };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await checkRankEligibility('easy', 50000);

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rankings/easy/rank?clearTime=50000', {
        cache: 'no-store',
      });
    });

    it('正常系: ランク外判定を取得できる（rank: 11, isTopTen: false）', async () => {
      const mockResponse = { rank: 11, isTopTen: false };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const result = await checkRankEligibility('normal', 999999);

      expect(result).toEqual(mockResponse);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/rankings/normal/rank?clearTime=999999', {
        cache: 'no-store',
      });
    });

    it('異常系: ネットワークエラーの場合、ApiErrorをスローする', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      try {
        await checkRankEligibility('hard', 100000);
        expect.fail('Expected checkRankEligibility to throw, but it did not.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        if (error instanceof ApiError) {
          expect(error.status).toBe(500);
          expect(error.message).toBe('Failed to check rank eligibility: Internal Server Error');
        }
      }
    });

    it('異常系: fetch自体が失敗した場合、エラーをスローする', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

      await expect(checkRankEligibility('easy', 50000)).rejects.toThrow('Network failure');
    });
  });
});
