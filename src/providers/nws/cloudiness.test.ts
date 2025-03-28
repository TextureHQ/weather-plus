import { getCloudinessFromCloudLayers } from './cloudiness';
import { ICloudLayer } from './interfaces';

describe('getCloudinessFromCloudLayers', () => {
  it('should return 0 for null or empty cloud layers', () => {
    expect(getCloudinessFromCloudLayers(null as any)).toBe(0);
    expect(getCloudinessFromCloudLayers([])).toBe(0);
  });

  it('should correctly calculate cloudiness for a single cloud layer', () => {
    const testCases: Array<{ cloudLayer: ICloudLayer, expected: number }> = [
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'CLR' }, 
        expected: 0 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'SKC' }, 
        expected: 0 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'FEW' }, 
        expected: 20 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'SCT' }, 
        expected: 40 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'BKN' }, 
        expected: 75 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'OVC' }, 
        expected: 100 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'VV' }, 
        expected: 100 
      },
      { 
        cloudLayer: { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'UNKNOWN' }, 
        expected: 0 
      }
    ];

    testCases.forEach(({ cloudLayer, expected }) => {
      expect(getCloudinessFromCloudLayers([cloudLayer])).toBe(expected);
    });
  });

  it('should correctly calculate the average cloudiness for multiple cloud layers', () => {
    const cloudLayers: Array<ICloudLayer> = [
      { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'FEW' },  // 20%
      { base: { unitCode: 'wmoUnit:m', value: 2000 }, amount: 'SCT' },  // 40%
      { base: { unitCode: 'wmoUnit:m', value: 3000 }, amount: 'BKN' }   // 75%
    ];

    // Average of 20%, 40%, and 75% = 45%
    expect(getCloudinessFromCloudLayers(cloudLayers)).toBe(45);
  });

  it('should round the average cloudiness to the nearest integer', () => {
    const cloudLayers: Array<ICloudLayer> = [
      { base: { unitCode: 'wmoUnit:m', value: 1000 }, amount: 'FEW' },  // 20%
      { base: { unitCode: 'wmoUnit:m', value: 2000 }, amount: 'BKN' }   // 75%
    ];

    // Average of 20% and 75% = 47.5%, which should round to 48%
    expect(getCloudinessFromCloudLayers(cloudLayers)).toBe(48);
  });
});