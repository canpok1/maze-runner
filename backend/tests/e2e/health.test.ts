import { describe, expect, it } from 'vitest';
import app from '../../src/index';

describe('GET /api/health', () => {
  it('should return status ok with timestamp', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');

    // timestampがISO 8601形式（YYYY-MM-DDTHH:mm:ss.sssZ）であることを正規表現で確認
    expect(typeof data.timestamp).toBe('string');
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
