import { Thought } from '../../domain/entities/Thought';

export interface EnvironmentalTrendSummary {
  locationId: string;
  cityName: string;
  totalAlerts: number;
  topConcern: string;
  severityLevel: 'low' | 'moderate' | 'high';
  observations: string[];
}

export class EnvironmentalIntelligenceService {
  public static analyzeTrends(thoughts: Thought[]): EnvironmentalTrendSummary[] {
    const groupedByLocation: Record<string, Thought[]> = {};

    thoughts.forEach(t => {
      if (t.isEnvironmentalAlert || t.category === 'Environment') {
        const key = t.location.id;
        if (!groupedByLocation[key]) groupedByLocation[key] = [];
        groupedByLocation[key].push(t);
      }
    });

    const summaries: EnvironmentalTrendSummary[] = [];

    Object.entries(groupedByLocation).forEach(([locationId, items]) => {
      const cityName = items[0]?.location.cityMunicipality || 'Unknown City';
      const totalAlerts = items.length;
      
      let severity: EnvironmentalTrendSummary['severityLevel'] = 'low';
      if (totalAlerts >= 5) severity = 'high';
      else if (totalAlerts >= 2) severity = 'moderate';

      summaries.push({
        locationId,
        cityName,
        totalAlerts,
        topConcern: totalAlerts > 0 ? 'Coastal Debris & Rain Accumulation' : 'General Awareness',
        severityLevel: severity,
        observations: items.map(i => i.body),
      });
    });

    return summaries;
  }
}
