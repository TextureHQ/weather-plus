import { OPENWEATHER_CAPABILITY } from './openweather/client';
import { NWS_CAPABILITY } from './nws/client';
import { ProviderCapability } from './capabilities';

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

  it('snapshots the built-in capabilities map', () => {
    const map = {
      nws: NWS_CAPABILITY,
      openweather: OPENWEATHER_CAPABILITY,
    } as const;
    expect(map).toMatchSnapshot();
  });
});
