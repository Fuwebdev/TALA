import { PHILIPPINES_BOUNDS } from '../../shared/constants/philippines';

export const MAPLIBRE_STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
export const MAPLIBRE_STYLE_VOYAGER = 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json';

export const PHILIPPINES_MAP_OPTIONS = {
  style: MAPLIBRE_STYLE_DARK,
  center: PHILIPPINES_BOUNDS.center,
  zoom: PHILIPPINES_BOUNDS.defaultZoom,
  minZoom: 5,
  maxZoom: 15,
  maxBounds: [
    [114.0, 3.5],
    [130.0, 23.5],
  ] as [[number, number], [number, number]],
  attributionControl: false as const,
};
