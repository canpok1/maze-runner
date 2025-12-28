import { describe, expect, it } from 'vitest';
import { apiRequest } from '../setup/testUtils';

describe('GET /api/health', () => {
  it('should return status ok with timestamp', async () => {
    const res = await apiRequest('/health');

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});
