import { OPENWEATHER_CAPABILITY } from './openweather/client';
import { NWS_CAPABILITY } from './nws/client';
import { ProviderCapability } from './capabilities';
import { TOMORROW_CAPABILITY } from './tomorrow/client';
import { WEATHERBIT_CAPABILITY } from './weatherbit/client';

describe('provider capabilities', () => {
  it('NWS_CAPABILITY matches expected shape and values', () => {
    const cap: ProviderCapability = NWS_CAPABILITY;
    expect(cap.supports.current).toBe(true);
    expect(cap.supports.hourly).toBeFalsy();
    expect(cap.supports.daily).toBeFalsy();
    expect(cap.supports.alerts).toBeFalsy();
    expect(cap.regions).toContain('US');
  });

  it('OPENWEATHER_CAPABILITY matches expected shape and values', () => {
    const cap: ProviderCapability = OPENWEATHER_CAPABILITY;
    expect(cap.supports.current).toBe(true);
    expect(cap.supports.hourly).toBe(true);
    expect(cap.supports.daily).toBe(true);
    expect(cap.supports.alerts).toBe(true);
    expect(cap.units).toEqual(expect.arrayContaining(['standard', 'metric', 'imperial']));
  });

  it('TOMORROW_CAPABILITY matches expected shape and values', () => {
    const cap: ProviderCapability = TOMORROW_CAPABILITY;
    expect(cap.supports.current).toBe(true);
    expect(cap.supports.hourly).toBeFalsy();
    expect(cap.supports.daily).toBeFalsy();
    expect(cap.supports.alerts).toBeFalsy();
  });

  it('WEATHERBIT_CAPABILITY matches expected shape and values', () => {
    const cap: ProviderCapability = WEATHERBIT_CAPABILITY;
    expect(cap.supports.current).toBe(true);
    expect(cap.supports.hourly).toBeFalsy();
    expect(cap.supports.daily).toBeFalsy();
    expect(cap.supports.alerts).toBeFalsy();
  });

  it('validates the built-in capabilities map explicitly', () => {
    const map = {
      nws: NWS_CAPABILITY,
      openweather: OPENWEATHER_CAPABILITY,
      tomorrow: TOMORROW_CAPABILITY,
      weatherbit: WEATHERBIT_CAPABILITY,
    } as const;
    expect(map).toEqual({
      nws: {
        supports: { current: true, hourly: false, daily: false, alerts: false },
        regions: ['US'],
      },
      openweather: {
        supports: { current: true, hourly: true, daily: true, alerts: true },
        units: ['standard', 'metric', 'imperial'],
        locales: [],
      },
      tomorrow: {
        supports: { current: true, hourly: false, daily: false, alerts: false },
        regions: [],
      },
      weatherbit: {
        supports: { current: true, hourly: false, daily: false, alerts: false },
        regions: [],
      },
    });
  });
});
