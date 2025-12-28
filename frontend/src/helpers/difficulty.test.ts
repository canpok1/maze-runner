import { describe, expect, it } from 'vitest';
import { getDifficultyFromSize } from './difficulty';

describe('getDifficultyFromSize', () => {
  it('サイズ10の場合、easyを返す', () => {
    expect(getDifficultyFromSize(10)).toBe('easy');
  });

  it('サイズ11の場合、easyを返す（境界値）', () => {
    expect(getDifficultyFromSize(11)).toBe('easy');
  });

  it('サイズ12の場合、normalを返す（境界値）', () => {
    expect(getDifficultyFromSize(12)).toBe('normal');
  });

  it('サイズ17の場合、normalを返す（境界値）', () => {
    expect(getDifficultyFromSize(17)).toBe('normal');
  });

  it('サイズ18の場合、hardを返す（境界値）', () => {
    expect(getDifficultyFromSize(18)).toBe('hard');
  });

  it('サイズ23の場合、hardを返す', () => {
    expect(getDifficultyFromSize(23)).toBe('hard');
  });
});
