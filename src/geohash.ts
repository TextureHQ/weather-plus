import geohash from 'ngeohash';

export function getGeohash(lat: number, lng: number, precision: number): string {
  return geohash.encode(lat, lng, precision);
}
