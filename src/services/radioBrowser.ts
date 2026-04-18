export interface RadioStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  tags: string;
  favicon: string;
  votes: number;
  codec: string;
  bitrate: number;
}

// Round-robin entre mirrors da API
const API_BASE = 'https://de1.api.radio-browser.info/json';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'User-Agent': 'SimpleRadioPlayer/1.0' },
  });
  if (!res.ok) throw new Error(`Radio Browser API error: ${res.status}`);
  return res.json();
}

export async function fetchTopStations(limit = 100): Promise<RadioStation[]> {
  return apiFetch<RadioStation[]>(
    `/stations/search?limit=${limit}&hidebroken=true&order=votes&reverse=true&has_extended_info=false`
  );
}

export async function searchStations(
  query: string,
  limit = 100
): Promise<RadioStation[]> {
  const params = new URLSearchParams({
    name: query,
    limit: String(limit),
    hidebroken: 'true',
    order: 'votes',
    reverse: 'true',
  });
  return apiFetch<RadioStation[]>(`/stations/search?${params}`);
}

export async function fetchByCountry(
  countrycode: string,
  limit = 200
): Promise<RadioStation[]> {
  return apiFetch<RadioStation[]>(
    `/stations/search?countrycode=${countrycode}&limit=${limit}&hidebroken=true&order=votes&reverse=true`
  );
}

export async function fetchCountries(): Promise<{ name: string; iso_3166_1: string; stationcount: number }[]> {
  return apiFetch('/countries');
}

export async function fetchStationByUrl(url: string): Promise<RadioStation | null> {
  try {
    const params = new URLSearchParams({ url });
    const results = await apiFetch<RadioStation[]>(`/stations/byurl?${params}`);
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

export function stationToRadio(station: RadioStation) {
  return {
    label: station.name,
    value: station.url_resolved,
    favicon: station.favicon,
    country: station.country,
    tags: station.tags,
    bitrate: station.bitrate,
    codec: station.codec,
  };
}