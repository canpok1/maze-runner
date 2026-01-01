import { describe, expect, it } from 'vitest';
import {
  getDifficultyFromSize,
  getPathLengthThreshold,
  getPathLengthThresholdFromSize,
  PATH_LENGTH_THRESHOLDS,
} from './difficulty';

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

describe('PATH_LENGTH_THRESHOLDS', () => {
  it('easy難易度の基準値が0.4であること', () => {
    expect(PATH_LENGTH_THRESHOLDS.easy).toBe(0.4);
  });

  it('normal難易度の基準値が0.5であること', () => {
    expect(PATH_LENGTH_THRESHOLDS.normal).toBe(0.5);
  });

  it('hard難易度の基準値が0.6であること', () => {
    expect(PATH_LENGTH_THRESHOLDS.hard).toBe(0.6);
  });
});

describe('getPathLengthThreshold', () => {
  it('easy難易度の場合、0.4を返す', () => {
    expect(getPathLengthThreshold('easy')).toBe(0.4);
  });

  it('normal難易度の場合、0.5を返す', () => {
    expect(getPathLengthThreshold('normal')).toBe(0.5);
  });

  it('hard難易度の場合、0.6を返す', () => {
    expect(getPathLengthThreshold('hard')).toBe(0.6);
  });
});

describe('getPathLengthThresholdFromSize', () => {
  it('サイズ11（easy）の場合、0.4を返す', () => {
    expect(getPathLengthThresholdFromSize(11)).toBe(0.4);
  });

  it('サイズ15（normal）の場合、0.5を返す', () => {
    expect(getPathLengthThresholdFromSize(15)).toBe(0.5);
  });

  it('サイズ21（hard）の場合、0.6を返す', () => {
    expect(getPathLengthThresholdFromSize(21)).toBe(0.6);
  });
});
