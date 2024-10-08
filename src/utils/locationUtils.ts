import { Feature, Geometry, Point, GeoJsonProperties } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { feature } from 'topojson-client';
import usAtlasData from 'us-atlas/states-10m.json';
import { Polygon, MultiPolygon } from 'geojson';

// Cast the imported JSON data to 'any'
const usAtlas = usAtlasData as any;

// Convert TopoJSON to GeoJSON and extract US boundaries
const usGeoJSON = feature(usAtlas, usAtlas.objects.states) as any;
const usBoundaries = usGeoJSON.features as Feature<Geometry, GeoJsonProperties>[];

/**
 * Checks if a given latitude and longitude are within the United States boundaries.
 * @param lat Latitude of the point to check.
 * @param lng Longitude of the point to check.
 * @returns True if the point is within the US boundaries, false otherwise.
 */
export function isLocationInUS(lat: number, lng: number): boolean {
  const point: Feature<Point, GeoJsonProperties> = {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
    properties: {},
  };

  for (const boundary of usBoundaries) {
    if (
      boundary.geometry.type === 'Polygon' ||
      boundary.geometry.type === 'MultiPolygon'
    ) {
      const polygon = boundary as Feature<Polygon | MultiPolygon, GeoJsonProperties>;

      if (booleanPointInPolygon(point, polygon)) {
        return true;
      }
    }
  }
  return false;
}