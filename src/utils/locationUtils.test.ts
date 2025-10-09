import { isLocationInUS } from './locationUtils';

describe('isLocationInUS', () => {
  it('returns true for a US coordinate and false for an international coordinate', () => {
    expect(isLocationInUS(38.8977, -77.0365)).toBe(true); // Washington, D.C.
    expect(isLocationInUS(51.5074, -0.1278)).toBe(false); // London
  });

  it('falls back gracefully when topology lacks polygon features', async () => {
    jest.resetModules();
    jest.doMock('us-atlas/states-10m.json', () => ({
      type: 'Topology',
      objects: { states: { type: 'GeometryCollection', geometries: [{ type: 'LineString', arcs: [] }] } },
      arcs: [],
      transform: { scale: [1, 1], translate: [0, 0] },
    }));
    jest.doMock('topojson-client', () => ({
      feature: () => ({
        type: 'FeatureCollection',
        features: undefined,
      }),
    }));

    await jest.isolateModulesAsync(async () => {
      const module = await import('./locationUtils');
      expect(module.isLocationInUS(0, 0)).toBe(false);
    });

    jest.dontMock('topojson-client');
    jest.dontMock('us-atlas/states-10m.json');
    jest.resetModules();
  });
});
