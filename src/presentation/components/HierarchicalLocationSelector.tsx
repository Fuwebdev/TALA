import React, { useState, useMemo } from 'react';
import { MapPin, ChevronRight, Layers, Check } from 'lucide-react';
import { Location } from '../../domain/entities/Location';

interface HierarchicalLocationSelectorProps {
  locations: Location[];
  selectedLocationId?: string;
  onSelectLocation: (location: Location | null) => void;
}

export const HierarchicalLocationSelector: React.FC<HierarchicalLocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');

  // Extract unique regions & provinces
  const regions = useMemo(() => {
    const list = Array.from(new Set(locations.map(l => l.region)));
    return ['All', ...list];
  }, [locations]);

  const provinces = useMemo(() => {
    let filtered = locations;
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(l => l.region === selectedRegion);
    }
    const list = Array.from(new Set(filtered.map(l => l.province)));
    return ['All', ...list];
  }, [locations, selectedRegion]);

  const cities = useMemo(() => {
    let filtered = locations;
    if (selectedRegion !== 'All') {
      filtered = filtered.filter(l => l.region === selectedRegion);
    }
    if (selectedProvince !== 'All') {
      filtered = filtered.filter(l => l.province === selectedProvince);
    }
    return filtered;
  }, [locations, selectedRegion, selectedProvince]);

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            PH Location Hierarchy
          </h3>
        </div>
        {selectedLocationId && (
          <button
            onClick={() => {
              setSelectedRegion('All');
              setSelectedProvince('All');
              onSelectLocation(null);
            }}
            className="text-[11px] text-sky-400 hover:underline font-medium"
          >
            Reset Hierarchy
          </button>
        )}
      </div>

      {/* Region & Province Selectors */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Region</label>
          <select
            value={selectedRegion}
            onChange={(e) => {
              setSelectedRegion(e.target.value);
              setSelectedProvince('All');
            }}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-sky-500/50"
          >
            {regions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Province</label>
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-sky-500/50"
          >
            {provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cities list matching selection */}
      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 border-t border-slate-800/80 pt-2">
        {cities.map(loc => {
          const isSelected = selectedLocationId === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-left transition-colors ${
                isSelected
                  ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20'
                  : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <div>
                <span className="font-medium block">{loc.cityMunicipality}</span>
                <span className="text-[10px] text-slate-400">{loc.province}</span>
              </div>
              {isSelected ? (
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
};
