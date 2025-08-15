import { OPENWEATHER_CAPABILITY } from './openweather/client';
import { NWS_CAPABILITY } from './nws/client';
import { ProviderCapability } from './capabilities';

export function getBuiltInCapabilities(): Record<string, ProviderCapability> {
  return {
    nws: NWS_CAPABILITY,
    openweather: OPENWEATHER_CAPABILITY,
  } as const;
}
