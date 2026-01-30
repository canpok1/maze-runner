import { describe, expect, it } from 'vitest';
import { formatDateJST } from './date-format';

describe('formatDateJST', () => {
  it('UTC時刻をJSTに変換してフォーマットする', () => {
    expect(formatDateJST('2025-12-28T10:30:00Z')).toBe('2025/12/28 19:30:00 JST');
  });

  it('日付が変わるケース（UTC 15:00 → JST 翌日 00:00）', () => {
    expect(formatDateJST('2025-12-31T15:00:00Z')).toBe('2026/01/01 00:00:00 JST');
  });

  it('深夜のケース', () => {
    expect(formatDateJST('2025-01-01T00:00:00Z')).toBe('2025/01/01 09:00:00 JST');
  });

  it('ミリ秒付きの日付文字列を正しく処理する', () => {
    expect(formatDateJST('2025-06-15T12:34:56.789Z')).toBe('2025/06/15 21:34:56 JST');
  });
});
