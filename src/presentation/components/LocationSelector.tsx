import React, { useState } from 'react';
import { MapPin, Search, ChevronRight, Check } from 'lucide-react';
import { Location } from '../../domain/entities/Location';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocationId?: string;
  onSelectLocation: (location: Location | null) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
}) => {
  const [search, setSearch] = useState('');

  const filteredLocations = locations.filter(loc =>
    loc.cityMunicipality.toLowerCase().includes(search.toLowerCase()) ||
    loc.province.toLowerCase().includes(search.toLowerCase()) ||
    loc.region.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-400" />
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Philippine Locations
          </h3>
        </div>
        {selectedLocationId && (
          <button
            onClick={() => onSelectLocation(null)}
            className="text-[11px] text-sky-400 hover:underline font-medium"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search city or province..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
        />
      </div>

      {/* Location List */}
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        <button
          onClick={() => onSelectLocation(null)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
            !selectedLocationId
              ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20'
              : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
          }`}
        >
          <span>All Philippines Locations</span>
          {!selectedLocationId && <Check className="w-3.5 h-3.5 text-sky-400" />}
        </button>

        {filteredLocations.map(loc => {
          const isSelected = selectedLocationId === loc.id;
          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                isSelected
                  ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20'
                  : 'text-slate-300 hover:bg-slate-800/50'
              }`}
            >
              <div>
                <span className="block font-medium">{loc.cityMunicipality}</span>
                <span className="text-[10px] text-slate-400">{loc.province} • {loc.region}</span>
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
