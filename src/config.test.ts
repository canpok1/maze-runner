import { config } from './config';

describe('config', () => {
  describe('設定オブジェクトの構造', () => {
    it('configオブジェクトが必要なプロパティを持つこと', () => {
      expect(config).toHaveProperty('rotationStep');
      expect(config).toHaveProperty('minDistance');
      expect(config).toHaveProperty('maxWallHeightFactor');
      expect(config).toHaveProperty('miniMapSize');
      expect(config).toHaveProperty('mapPadding');
      expect(config).toHaveProperty('moveSpeed');
    });

    it('すべてのプロパティが数値型であること', () => {
      expect(typeof config.rotationStep).toBe('number');
      expect(typeof config.minDistance).toBe('number');
      expect(typeof config.maxWallHeightFactor).toBe('number');
      expect(typeof config.miniMapSize).toBe('number');
      expect(typeof config.mapPadding).toBe('number');
      expect(typeof config.moveSpeed).toBe('number');
    });
  });

  describe('設定値の妥当性', () => {
    it('rotationStepが正の値であること', () => {
      expect(config.rotationStep).toBeGreaterThan(0);
    });

    it('rotationStepが2π以下であること', () => {
      expect(config.rotationStep).toBeLessThanOrEqual(2 * Math.PI);
    });

    it('minDistanceが正の値であること', () => {
      expect(config.minDistance).toBeGreaterThan(0);
    });

    it('minDistanceが1未満であること', () => {
      expect(config.minDistance).toBeLessThan(1);
    });

    it('maxWallHeightFactorが正の値であること', () => {
      expect(config.maxWallHeightFactor).toBeGreaterThan(0);
    });

    it('miniMapSizeが正の値であること', () => {
      expect(config.miniMapSize).toBeGreaterThan(0);
    });

    it('mapPaddingが0以上であること', () => {
      expect(config.mapPadding).toBeGreaterThanOrEqual(0);
    });

    it('moveSpeedが正の値であること', () => {
      expect(config.moveSpeed).toBeGreaterThan(0);
    });

    it('moveSpeedが1以下であること', () => {
      expect(config.moveSpeed).toBeLessThanOrEqual(1);
    });
  });

  describe('具体的な設定値', () => {
    it('rotationStepがπ/4(45度)であること', () => {
      expect(config.rotationStep).toBe(Math.PI / 4);
    });

    it('minDistanceが0.3であること', () => {
      expect(config.minDistance).toBe(0.3);
    });

    it('maxWallHeightFactorが2であること', () => {
      expect(config.maxWallHeightFactor).toBe(2);
    });

    it('miniMapSizeが150であること', () => {
      expect(config.miniMapSize).toBe(150);
    });

    it('mapPaddingが10であること', () => {
      expect(config.mapPadding).toBe(10);
    });

    it('moveSpeedが0.1であること', () => {
      expect(config.moveSpeed).toBe(0.1);
    });
  });
});
