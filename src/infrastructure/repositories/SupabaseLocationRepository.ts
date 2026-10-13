import { ILocationRepository } from '../../domain/repositories/ILocationRepository';
import { Location } from '../../domain/entities/Location';
import { supabase } from '../supabase/client';
import { MockLocationRepository } from './MockLocationRepository';

export class SupabaseLocationRepository implements ILocationRepository {
  private mockRepo = new MockLocationRepository();

  async getAllLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('cities_municipalities')
        .select(`
          id,
          name,
          latitude,
          longitude,
          province:provinces (
            name,
            region:regions (
              name
            )
          )
        `);

      if (error || !data || data.length === 0) {
        return this.mockRepo.getAllLocations();
      }

      return data.map((item: any) => ({
        id: item.id,
        region: item.province?.region?.name || 'Philippines',
        province: item.province?.name || 'Local Province',
        cityMunicipality: item.name,
        coordinates: {
          lat: Number(item.latitude),
          lng: Number(item.longitude),
        },
      }));
    } catch {
      return this.mockRepo.getAllLocations();
    }
  }

  async getLocationById(id: string): Promise<Location | null> {
    const locations = await this.getAllLocations();
    return locations.find(loc => loc.id === id) || null;
  }

  async searchLocations(query: string): Promise<Location[]> {
    const locations = await this.getAllLocations();
    const q = query.toLowerCase();
    return locations.filter(
      loc =>
        loc.cityMunicipality.toLowerCase().includes(q) ||
        loc.province.toLowerCase().includes(q) ||
        loc.region.toLowerCase().includes(q)
    );
  }

  /**
   * Ensures a dynamically reverse-geocoded exact location exists in Supabase (or local list)
   * so it appears in the dropdown and can be referenced by foreign keys.
   */
  async ensureLocationPersisted(location: Location): Promise<Location> {
    try {
      // 1. Check if this exact location name already exists in cities_municipalities
      const { data: existingCity } = await supabase
        .from('cities_municipalities')
        .select(`
          id,
          name,
          latitude,
          longitude,
          province:provinces (
            name,
            region:regions (
              name
            )
          )
        `)
        .ilike('name', location.cityMunicipality)
        .maybeSingle();

      if (existingCity?.id) {
        return {
          id: existingCity.id,
          region: (existingCity as any).province?.region?.name || location.region,
          province: (existingCity as any).province?.name || location.province,
          cityMunicipality: existingCity.name,
          coordinates: {
            lat: Number(existingCity.latitude),
            lng: Number(existingCity.longitude),
          },
        };
      }

      // 2. Ensure region exists
      const regionCode = ('REG_' + location.region.replace(/[^A-Za-z0-9]/g, '').toUpperCase()).slice(0, 28);
      let regionId: string | null = null;

      const { data: existingRegion } = await supabase
        .from('regions')
        .select('id')
        .ilike('name', location.region)
        .maybeSingle();

      if (existingRegion?.id) {
        regionId = existingRegion.id;
      } else {
        const { data: insertedRegion } = await supabase
          .from('regions')
          .upsert({ code: regionCode, name: location.region }, { onConflict: 'code' })
          .select('id')
          .single();
        regionId = insertedRegion?.id || null;
      }

      // Fallback to any existing region if RLS blocks region insert
      if (!regionId) {
        const { data: fallbackReg } = await supabase.from('regions').select('id').limit(1).maybeSingle();
        regionId = fallbackReg?.id || null;
      }

      // 3. Ensure province exists
      const provCode = ('PRV_' + location.province.replace(/[^A-Za-z0-9]/g, '').toUpperCase()).slice(0, 28);
      let provinceId: string | null = null;

      const { data: existingProv } = await supabase
        .from('provinces')
        .select('id')
        .ilike('name', location.province)
        .maybeSingle();

      if (existingProv?.id) {
        provinceId = existingProv.id;
      } else if (regionId) {
        const { data: insertedProv } = await supabase
          .from('provinces')
          .upsert({ region_id: regionId, code: provCode, name: location.province }, { onConflict: 'code' })
          .select('id')
          .single();
        provinceId = insertedProv?.id || null;
      }

      if (!provinceId) {
        const { data: fallbackProv } = await supabase.from('provinces').select('id').limit(1).maybeSingle();
        provinceId = fallbackProv?.id || null;
      }

      // 4. Insert the exact detected city/barangay into cities_municipalities
      if (provinceId) {
        const cityCode = ('LOC_' + location.cityMunicipality.replace(/[^A-Za-z0-9]/g, '').toUpperCase() + '_' + Math.floor(100 + Math.random() * 900)).slice(0, 30);
        const { data: insertedCity, error: cityErr } = await supabase
          .from('cities_municipalities')
          .insert({
            id: location.id,
            province_id: provinceId,
            code: cityCode,
            name: location.cityMunicipality,
            latitude: location.coordinates.lat,
            longitude: location.coordinates.lng,
          })
          .select('id')
          .single();

        if (!cityErr && insertedCity?.id) {
          return {
            ...location,
            id: insertedCity.id,
          };
        }
      }

      await this.mockRepo.ensureLocationPersisted(location);
      return location;
    } catch {
      await this.mockRepo.ensureLocationPersisted(location);
      return location;
    }
  }
}
