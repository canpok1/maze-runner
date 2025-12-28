import { beforeEach, describe, expect, it } from 'vitest';
import { apiRequest, resetDatabase } from '../setup/testUtils';

describe('GET /api/rankings', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should return rankings with valid difficulty parameter', async () => {
    const res = await apiRequest('/rankings?difficulty=easy');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rankings');
    expect(Array.isArray(data.rankings)).toBe(true);
  });

  it('should return 400 without difficulty parameter', async () => {
    const res = await apiRequest('/rankings');

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });

  it('should return rankings with limit parameter', async () => {
    const res = await apiRequest('/rankings?difficulty=normal&limit=5');

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveProperty('rankings');
    expect(Array.isArray(data.rankings)).toBe(true);
  });

  it('should return 400 with invalid limit parameter', async () => {
    const res = await apiRequest('/rankings?difficulty=easy&limit=0');

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('limit');
  });

  it('should return 400 when difficulty value is invalid', async () => {
    const res = await apiRequest('/rankings?difficulty=invalid');

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });
});

describe('POST /api/rankings', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should add a new ranking with valid body', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        clearTime: 120,
        difficulty: 'easy',
      }),
    });

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
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clearTime: 120,
        difficulty: 'easy',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('playerName');
  });

  it('should return 400 when clearTime is missing', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        difficulty: 'easy',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when difficulty is missing', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        clearTime: 120,
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });

  it('should return 400 when clearTime is not a number', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        clearTime: 'invalid',
        difficulty: 'easy',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 when playerName is empty string', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: '',
        clearTime: 120,
        difficulty: 'easy',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('playerName');
  });

  it('should return 400 when clearTime is negative', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        clearTime: -10,
        difficulty: 'easy',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('clearTime');
  });

  it('should return 400 with invalid JSON body', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('JSON');
  });

  it('should return 400 when difficulty value is invalid', async () => {
    const res = await apiRequest('/rankings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerName: 'TestPlayer',
        clearTime: 120,
        difficulty: 'invalid',
      }),
    });

    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data).toHaveProperty('error');
    expect(data.error).toContain('difficulty');
  });
});
