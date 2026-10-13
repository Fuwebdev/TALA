export const PHILIPPINES_BOUNDS = {
  southWest: [116.5, 4.5] as [number, number],
  northEast: [127.0, 21.5] as [number, number],
  center: [121.7740, 12.8797] as [number, number], // Geographic center approx
  defaultZoom: 5.8,
};

export const THOUGHT_CATEGORIES = [
  'All',
  'Thoughts',
  'School',
  'Life',
  'Community',
  'Environment',
] as const;

export type ThoughtCategory = typeof THOUGHT_CATEGORIES[number];
