/**
 * api/geocode.ts
 * Server-side reverse geocoding proxy to eliminate browser CORS blocks on OpenStreetMap Nominatim.
 * Adds custom User-Agent, handles CORS headers, and caches results.
 */

interface GeocodeQuery {
  lat?: number;
  lng?: number;
  zoom?: number;
  q?: string;
}

// In-memory server cache to stay well within OSM usage policies
const geocodeCache = new Map<string, { data: any; expiresAt: number }>();

export async function processGeocodeRequest(query: GeocodeQuery) {
  const { lat, lng, zoom = 18, q } = query;

  // Handle Search Query if provided
  if (q && typeof q === 'string') {
    const trimmed = q.trim();
    const cacheKey = `search_${trimmed.toLowerCase()}`;
    const now = Date.now();
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
        body: cached.data,
      };
    }

    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=ph&addressdetails=1&limit=8`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Tala-Philippines-App/1.0 (arosobenj@gmail.com)',
          'Accept-Language': 'en,fil',
        },
      });

      if (!response.ok) {
        return {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: [],
        };
      }

      const data = await response.json();
      geocodeCache.set(cacheKey, {
        data,
        expiresAt: now + 60 * 60 * 1000,
      });

      return {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
        body: data,
      };
    } catch (err: any) {
      return {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: [],
      };
    }
  }

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: { error: 'Invalid coordinates provided' },
    };
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},${zoom}`;
  const now = Date.now();
  const cached = geocodeCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: cached.data,
    };
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}&addressdetails=1`;
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Tala-Philippines-App/1.0 (arosobenj@gmail.com)',
        'Accept-Language': 'en,fil',
      },
    });

    if (!response.ok) {
      return {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: { error: `Upstream geocoder returned ${response.status}` },
      };
    }

    const data = await response.json();

    // Cache valid response for 1 hour
    geocodeCache.set(cacheKey, {
      data,
      expiresAt: now + 60 * 60 * 1000,
    });

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: data,
    };
  } catch (err: any) {
    return {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: { error: 'Failed to contact geocoding service', details: err?.message },
    };
  }
}

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // CORS Preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat((req.query.lon || req.query.lng) as string);
  const zoom = req.query.zoom ? parseInt(req.query.zoom as string, 10) : 18;

  const result = await processGeocodeRequest({ lat, lng, zoom });
  return res.status(result.status).json(result.body);
}
