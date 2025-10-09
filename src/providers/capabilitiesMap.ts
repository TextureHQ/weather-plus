import { OPENWEATHER_CAPABILITY } from './openweather/client';
import { NWS_CAPABILITY } from './nws/client';
import { TOMORROW_CAPABILITY } from './tomorrow/client';
import { WEATHERBIT_CAPABILITY } from './weatherbit/client';
import { ProviderCapability } from './capabilities';

export function getBuiltInCapabilities(): Record<string, ProviderCapability> {
  return {
    nws: NWS_CAPABILITY,
    openweather: OPENWEATHER_CAPABILITY,
    tomorrow: TOMORROW_CAPABILITY,
    weatherbit: WEATHERBIT_CAPABILITY,
  } as const;
}
