import { config } from './config';

describe('config', () => {
  describe('設定オブジェクトの構造', () => {
    it('configオブジェクトは期待される構造と型を持つこと', () => {
      const expectedKeys: (keyof typeof config)[] = [
        'rotationStep',
        'minDistance',
        'maxWallHeightFactor',
        'miniMapSize',
        'mapPadding',
        'moveSpeed',
      ];

      expect(Object.keys(config).sort()).toEqual(expectedKeys.sort());

      for (const key of expectedKeys) {
        expect(typeof config[key]).toBe('number');
      }
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
    it('は期待される値を持つこと', () => {
      expect(config).toEqual({
        rotationStep: Math.PI / 4,
        minDistance: 0.3,
        maxWallHeightFactor: 2,
        miniMapSize: 150,
        mapPadding: 10,
        moveSpeed: 0.1,
      });
    });
  });
});
