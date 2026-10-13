export interface Location {
  id: string;
  region: string;
  province: string;
  cityMunicipality: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export function formatLocationName(location: Location): string {
  return `${location.cityMunicipality}, ${location.province}`;
}
