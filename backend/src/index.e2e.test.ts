import { describe, expect, it } from 'vitest';
import app from './index';

describe('GET /api/health', () => {
  it('should return status ok with timestamp', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');

    // timestampがISO 8601形式であることを確認
    const timestamp = data.timestamp as string;
    expect(() => new Date(timestamp).toISOString()).not.toThrow();
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
