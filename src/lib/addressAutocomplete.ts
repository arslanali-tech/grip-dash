export interface UkAddressDetails {
  address: string;
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

export interface UkAddressSuggestion extends UkAddressDetails {
  id: string;
  label: string;
  source: 'postcodes.io' | 'nominatim' | 'photon' | 'overpass' | 'getaddress' | 'osplaces' | 'osnames';
  isContainer?: boolean;
  containerId?: string;
}

// â”€â”€ Postcodes.io response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PostcodeResult {
  postcode: string;
  admin_district: string | null;
  admin_county: string | null;
  admin_ward: string | null;
  region: string | null;
  country: string | null;
}

interface PostcodesIoAutocompleteResponse {
  status: number;
  result: string[] | null;
}

interface PostcodesIoBulkResponse {
  status: number;
  result: Array<{ query: string; result: PostcodeResult | null }> | null;
}

interface PostcodesIoSingleResponse {
  status: number;
  result: {
    latitude: number;
    longitude: number;
    postcode: string;
    eastings?: number | null;
    northings?: number | null;
    admin_district?: string | null;
    admin_county?: string | null;
    region?: string | null;
  } | null;
}

// â”€â”€ Photon response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PhotonProperties {
  osm_id?: number;
  osm_type?: string;
  osm_key?: string;
  osm_value?: string;
  name?: string;
  housenumber?: string;
  street?: string;
  district?: string;
  city?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countrycode?: string;
  type?: string;
}

interface PhotonFeature {
  type: string;
  properties: PhotonProperties;
}

interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

// â”€â”€ Nominatim response shapes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface NominatimResult {
  place_id: number;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    postcode?: string;
    country?: string;
  };
}
// Overpass response shapes
interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}
interface GetAddressSuggestion {
  id: string;
  address: string;
  url: string;
}

interface GetAddressAutocompleteResponse {
  suggestions: GetAddressSuggestion[];
}

interface GetAddressDetailsResponse {
  postcode?: string;
  formatted_address?: string[];
  line_1?: string;
  line_2?: string;
  line_3?: string;
  line_4?: string;
  town_or_city?: string;
  county?: string;
  country?: string;
  thoroughfare?: string;
  building_number?: string;
}

interface OsPlacesHeader {
  totalresults?: number;
}

interface OsPlacesDpaResult {
  UPRN?: string | number;
  ADDRESS?: string;
  BUILDING_NUMBER?: string | number;
  BUILDING_NAME?: string;
  SUB_BUILDING_NAME?: string;
  THOROUGHFARE_NAME?: string;
  DEPENDENT_THOROUGHFARE_NAME?: string;
  POST_TOWN?: string;
  POSTCODE?: string;
}

interface OsPlacesResultItem {
  DPA?: OsPlacesDpaResult;
}

interface OsPlacesPostcodeResponse {
  header?: OsPlacesHeader;
  results?: OsPlacesResultItem[];
}

interface OsPlacesAddress {
  id: string;
  street: string;
  line1: string;
  line2?: string;
  city?: string;
  postcode: string;
  address: string;
}

interface OsNamesGazetteerEntry {
  ID?: string;
  NAME1?: string;
  LOCAL_TYPE?: string;
  GEOMETRY_X?: number;
  GEOMETRY_Y?: number;
  POPULATED_PLACE?: string;
}

interface OsNamesResultItem {
  GAZETTEER_ENTRY?: OsNamesGazetteerEntry;
}

interface OsNamesResponseHeader {
  totalresults?: number;
}

interface OsNamesFindResponse {
  header?: OsNamesResponseHeader;
  results?: OsNamesResultItem[];
}



// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const POSTCODES_IO_BASE = 'https://api.postcodes.io';
const OS_PLACES_BASE = 'https://api.os.uk/search/places/v1';
const OS_NAMES_BASE = 'https://api.os.uk/search/names/v1';
const PHOTON_BASE = 'https://photon.komoot.io/api';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter';
const GETADDRESS_BASE = 'https://api.getAddress.io';
// UK bounding box: west, south, east, north
const UK_BBOX = '-10.592,49.959,1.6848,60.703';
// Matches partial postcodes like "SW1", "SW1A", "SW1A 2", full like "BR2 0JP", "ME38FJ"
const POSTCODE_PREFIX_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{0,2})?$/i;
const FULL_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/i;
const OVERPASS_TIMEOUT_SECONDS = 25;
const OS_PLACES_PAGE_SIZE = 100;
const OS_NAMES_MAX_RESULTS = 100;
const OS_NAMES_BBOX_RADIUS_METERS = 700;
const STREET_KEYWORD_REGEX = /\b(road|street|avenue|lane|close|drive|way|place|crescent|gardens|court|park|hill|green|square|row|mews|terrace|grove|view|walk|rise|circus|parade|wharf)\b/i;
const GETADDRESS_API_KEY =
  (import.meta.env.VITE_GETADDRESS_API_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_GETADDRESS_DOMAIN_TOKEN as string | undefined)?.trim() ||
  '';
const OS_PLACES_API_KEY =
  (import.meta.env.VITE_OS_PLACES_API_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_OS_PLACES_PROJECT_API_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_OS_PROJECT_API_KEY as string | undefined)?.trim() ||
  '';

// Nominatim usage policy requires a meaningful User-Agent
const NOMINATIM_HEADERS = {
  'Accept-Language': 'en-GB',
  'User-Agent': 'GripDashboard/1.0 (address-lookup)',
};

/**
 * Normalise a raw postcode string:
 * - uppercase
 * - remove extra whitespace
 * - if a full postcode is provided, re-insert the standard space.
 */
const normalizePostcode = (pc: string): string => {
  const compact = pc.replace(/\s+/g, '').trim().toUpperCase();
  if (!compact) return '';
  if (FULL_POSTCODE_REGEX.test(compact)) {
    return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
  }
  return compact;
};

const compactPostcode = (pc: string): string =>
  pc.replace(/\s+/g, '').trim().toUpperCase();

const matchesPostcode = (value: string | null | undefined, target: string): boolean => {
  if (!value || !target) return false;
  return compactPostcode(value) === compactPostcode(target);
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildPostcodeRegex = (postcode: string): string => {
  const compact = compactPostcode(postcode);
  if (!compact) return '';
  if (compact.length <= 3) return `^${escapeRegExp(compact)}$`;
  const outward = compact.slice(0, -3);
  const inward = compact.slice(-3);
  return `^${escapeRegExp(outward)} ?${escapeRegExp(inward)}$`;
};

const normalizeCountry = (country?: string | null): string => {
  if (!country) return 'United Kingdom';
  if (['england', 'scotland', 'wales', 'northern ireland'].includes(country.toLowerCase())) {
    return 'United Kingdom';
  }
  return country;
};

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, ' ').trim();

const normalizeAddressText = (value: string): string =>
  value
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(', ');

const toText = (value: string | number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value).trim();

const hasOsPlacesKey = () => Boolean(OS_PLACES_API_KEY);

const buildCityFromPostcode = (r: PostcodeResult): string | undefined =>
  r.admin_district?.trim() || r.admin_county?.trim() || r.region?.trim() || undefined;

interface PostcodeGeoMeta {
  lat: number;
  lon: number;
  eastings?: number;
  northings?: number;
  city?: string;
}

const postcodeGeoCache = new Map<string, PostcodeGeoMeta>();

async function fetchPostcodeGeoMeta(
  postcode: string,
  signal?: AbortSignal,
): Promise<PostcodeGeoMeta | null> {
  const compact = compactPostcode(postcode);
  if (!compact) return null;
  const cached = postcodeGeoCache.get(compact);
  if (cached) return cached;

  const url = `${POSTCODES_IO_BASE}/postcodes/${encodeURIComponent(compact)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;

  const data = (await response.json()) as PostcodesIoSingleResponse;
  if (!data.result) return null;

  const city = [data.result.admin_district, data.result.admin_county, data.result.region]
    .map((part) => part?.trim())
    .find(Boolean);
  const meta: PostcodeGeoMeta = {
    lat: data.result.latitude,
    lon: data.result.longitude,
    eastings: data.result.eastings ?? undefined,
    northings: data.result.northings ?? undefined,
    city: city || undefined,
  };
  postcodeGeoCache.set(compact, meta);
  return meta;
}

async function fetchPostcodeLatLon(
  postcode: string,
  signal?: AbortSignal,
): Promise<{ lat: number; lon: number } | null> {
  const meta = await fetchPostcodeGeoMeta(postcode, signal);
  if (!meta) return null;
  return { lat: meta.lat, lon: meta.lon };
}

async function fetchOverpassElements(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassElement[]> {
  if (!query) return [];
  const url = `${OVERPASS_BASE}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as OverpassResponse;
  return data.elements ?? [];
}

const hasGetAddressKey = () => Boolean(GETADDRESS_API_KEY);

const looksLikePostcode = (value: string): boolean =>
  FULL_POSTCODE_REGEX.test(compactPostcode(value));

const getAddressPostcodeCache = new Map<string, GetAddressSuggestion[]>();
const osPlacesPostcodeCache = new Map<string, OsPlacesAddress[]>();
const osNamesStreetCache = new Map<string, UkAddressSuggestion[]>();
const hasOsNamesKey = () => Boolean(OS_PLACES_API_KEY);
const OS_NAMES_QUERY_TERMS = [
  'road',
  'street',
  'lane',
  'close',
  'avenue',
  'drive',
  'way',
  'court',
  'place',
  'crescent',
  'gardens',
  'grove',
  'hill',
  'mews',
  'rise',
  'walk',
  'view',
  'row',
  'park',
  'parade',
];

async function fetchGetAddressAutocomplete(
  term: string,
  signal?: AbortSignal,
  options?: { all?: boolean; showPostcode?: boolean; top?: number; template?: string },
): Promise<GetAddressSuggestion[]> {
  if (!hasGetAddressKey()) return [];
  if (!term.trim()) return [];

  const params = new URLSearchParams({ 'api-key': GETADDRESS_API_KEY });
  if (options?.all) params.set('all', 'true');
  if (options?.showPostcode) params.set('show-postcode', 'true');
  if (options?.top) params.set('top', String(options.top));
  if (options?.template) params.set('template', options.template);

  const url = `${GETADDRESS_BASE}/autocomplete/${encodeURIComponent(term)}?${params.toString()}`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as GetAddressAutocompleteResponse;
  const suggestions = data.suggestions ?? [];
  return suggestions;
}

const normalizeStreetName = (value: string): string =>
  normalizeWhitespace(value);

function buildStreetFromOsPlacesDpa(
  dpa: OsPlacesDpaResult,
  postcode: string,
): string {
  const explicitStreet = normalizeStreetName(
    [toText(dpa.DEPENDENT_THOROUGHFARE_NAME), toText(dpa.THOROUGHFARE_NAME)]
      .filter(Boolean)
      .join(' '),
  );
  if (explicitStreet) return explicitStreet;
  const fromAddress = extractStreetFromGetAddress(toText(dpa.ADDRESS), postcode);
  return fromAddress ? normalizeStreetName(fromAddress) : '';
}

function mapOsPlacesResultToAddress(
  item: OsPlacesResultItem,
  fallbackPostcode: string,
): OsPlacesAddress | null {
  const dpa = item.DPA;
  if (!dpa) return null;

  const postcode = normalizePostcode(toText(dpa.POSTCODE) || fallbackPostcode);
  if (!postcode) return null;
  if (fallbackPostcode && !matchesPostcode(postcode, fallbackPostcode)) return null;

  const street = buildStreetFromOsPlacesDpa(dpa, postcode);
  if (!street) return null;

  const buildingNumber = toText(dpa.BUILDING_NUMBER);
  const buildingName = normalizeWhitespace(toText(dpa.BUILDING_NAME));
  const subBuilding = normalizeWhitespace(toText(dpa.SUB_BUILDING_NAME));
  const city = normalizeWhitespace(toText(dpa.POST_TOWN));

  let line1 = normalizeWhitespace([buildingNumber, street].filter(Boolean).join(' '));
  if (!line1 && buildingName) {
    line1 = normalizeWhitespace([buildingName, street].filter(Boolean).join(' '));
  }
  if (!line1) {
    const firstSegment = normalizeAddressText(toText(dpa.ADDRESS)).split(',')[0]?.trim() ?? '';
    line1 = firstSegment || street;
  }

  const line2Parts = [subBuilding, buildingName]
    .filter(Boolean)
    .filter((value) => !line1.toLowerCase().includes(value.toLowerCase()));
  const line2 = line2Parts.length > 0 ? line2Parts.join(', ') : undefined;
  const normalizedAddress = normalizeAddressText(toText(dpa.ADDRESS));
  const fallbackAddress = [line1, line2, city, postcode].filter(Boolean).join(', ');
  const address = normalizedAddress || fallbackAddress;
  const idSuffix =
    toText(dpa.UPRN) ||
    `${compactPostcode(postcode)}-${line1.toLowerCase()}-${(line2 ?? '').toLowerCase()}`;

  return {
    id: `os:${idSuffix}`,
    street,
    line1,
    line2,
    city: city || undefined,
    postcode,
    address,
  };
}

async function fetchOsPlacesPostcodeAddresses(
  postcode: string,
  signal?: AbortSignal,
): Promise<OsPlacesAddress[]> {
  if (!hasOsPlacesKey()) return [];

  const normalizedPostcode = normalizePostcode(postcode);
  const cacheKey = compactPostcode(normalizedPostcode);
  if (!cacheKey) return [];

  const cached = osPlacesPostcodeCache.get(cacheKey);
  if (cached) return cached;

  const collected: OsPlacesAddress[] = [];
  const seen = new Set<string>();
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      key: OS_PLACES_API_KEY,
      postcode: normalizedPostcode,
      dataset: 'DPA',
      maxresults: String(OS_PLACES_PAGE_SIZE),
      offset: String(offset),
      lr: 'EN',
      fq: 'LOGICAL_STATUS_CODE:1',
    });
    const response = await fetch(`${OS_PLACES_BASE}/postcode?${params.toString()}`, { signal });
    if (!response.ok) {
      if (offset === 0) return [];
      break;
    }

    const data = (await response.json()) as OsPlacesPostcodeResponse;
    const pageItems = data.results ?? [];
    if (pageItems.length === 0) break;

    for (const item of pageItems) {
      const mapped = mapOsPlacesResultToAddress(item, normalizedPostcode);
      if (!mapped) continue;
      const dedupKey = `${mapped.id}|${mapped.address.toLowerCase()}`;
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      collected.push(mapped);
    }

    const totalResults = data.header?.totalresults ?? pageItems.length;
    offset += pageItems.length;
    if (offset >= totalResults || pageItems.length < OS_PLACES_PAGE_SIZE) break;
  }

  if (collected.length > 0) {
    osPlacesPostcodeCache.set(cacheKey, collected);
  }
  return collected;
}

async function fetchOsPlacesStreetsAtPostcode(
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const normalizedPostcode = normalizePostcode(postcode);
  if (!normalizedPostcode) return [];

  const addresses = await fetchOsPlacesPostcodeAddresses(normalizedPostcode, signal);
  if (addresses.length === 0) return [];

  const streetMap = new Map<string, { street: string; city?: string; postcode: string }>();
  for (const address of addresses) {
    const key = normalizeStreetName(address.street).toLowerCase();
    if (!key) continue;
    if (streetMap.has(key)) continue;
    streetMap.set(key, {
      street: address.street,
      city: address.city,
      postcode: address.postcode || normalizedPostcode,
    });
  }

  return Array.from(streetMap.values())
    .sort((a, b) => a.street.localeCompare(b.street))
    .map(({ street, city, postcode: resolvedPostcode }) => {
      const containerId = `st:${encodeURIComponent(street)}|${encodeURIComponent(city ?? '')}|${encodeURIComponent(resolvedPostcode)}`;
      const displayLabel = [street, resolvedPostcode].filter(Boolean).join(', ');
      return {
        id: containerId,
        label: `${displayLabel} - More Addresses`,
        address: displayLabel,
        line1: street,
        city,
        postcode: resolvedPostcode || undefined,
        country: 'United Kingdom',
        source: 'osplaces' as const,
        isContainer: true,
        containerId,
      };
    });
}

async function fetchOsPlacesAddressesOnStreet(
  street: string,
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const normalizedPostcode = normalizePostcode(postcode);
  const normalizedStreet = normalizeStreetName(street).toLowerCase();
  if (!normalizedPostcode || !normalizedStreet) return [];

  const addresses = await fetchOsPlacesPostcodeAddresses(normalizedPostcode, signal);
  if (addresses.length === 0) return [];

  const results: UkAddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const address of addresses) {
    if (normalizeStreetName(address.street).toLowerCase() !== normalizedStreet) continue;

    const label = [address.line1, address.line2, address.city, address.postcode]
      .filter(Boolean)
      .join(', ');
    const resolvedAddress = address.address || label;
    const dedupKey = `${resolvedAddress.toLowerCase()}|${compactPostcode(address.postcode)}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    results.push({
      id: address.id,
      label,
      address: resolvedAddress,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      postcode: address.postcode,
      country: 'United Kingdom',
      source: 'osplaces' as const,
    });
  }

  return sortAddressesByHouseNumber(results);
}

const isNamedRoadEntry = (entry: OsNamesGazetteerEntry | null | undefined): entry is OsNamesGazetteerEntry =>
  Boolean(entry?.NAME1) && entry?.LOCAL_TYPE === 'Named Road';

const buildStreetContainerSuggestion = (
  street: string,
  postcode: string,
  city: string | undefined,
  source: UkAddressSuggestion['source'],
): UkAddressSuggestion => {
  const containerId = `st:${encodeURIComponent(street)}|${encodeURIComponent(city ?? '')}|${encodeURIComponent(postcode)}`;
  const displayLabel = [street, postcode].filter(Boolean).join(', ');
  return {
    id: containerId,
    label: `${displayLabel} - More Addresses`,
    address: displayLabel,
    line1: street,
    city,
    postcode: postcode || undefined,
    country: 'United Kingdom',
    source,
    isContainer: true,
    containerId,
  };
};

async function fetchOsNamesRoadsForQuery(
  query: string,
  bbox: string,
  signal?: AbortSignal,
): Promise<OsNamesGazetteerEntry[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    key: OS_PLACES_API_KEY,
    query: query.trim(),
    maxresults: String(OS_NAMES_MAX_RESULTS),
  });
  params.append('fq', 'LOCAL_TYPE:Named_Road');
  params.append('fq', `BBOX:${bbox}`);

  const response = await fetch(`${OS_NAMES_BASE}/find?${params.toString()}`, { signal });
  if (!response.ok) return [];
  const data = (await response.json()) as OsNamesFindResponse;
  return (data.results ?? [])
    .map((item) => item.GAZETTEER_ENTRY)
    .filter(isNamedRoadEntry);
}

async function fetchOsNamesStreetsAtPostcode(
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  if (!hasOsNamesKey()) return [];

  const normalizedPostcode = normalizePostcode(postcode);
  const cacheKey = compactPostcode(normalizedPostcode);
  if (!cacheKey) return [];

  const cached = osNamesStreetCache.get(cacheKey);
  if (cached) return cached;

  const meta = await fetchPostcodeGeoMeta(normalizedPostcode, signal);
  if (!meta?.eastings || !meta?.northings) return [];

  const xmin = Math.round(meta.eastings - OS_NAMES_BBOX_RADIUS_METERS);
  const ymin = Math.round(meta.northings - OS_NAMES_BBOX_RADIUS_METERS);
  const xmax = Math.round(meta.eastings + OS_NAMES_BBOX_RADIUS_METERS);
  const ymax = Math.round(meta.northings + OS_NAMES_BBOX_RADIUS_METERS);
  const bbox = `${xmin},${ymin},${xmax},${ymax}`;

  const seedQueries = [meta.city?.trim(), normalizedPostcode.split(' ')[0]]
    .filter(Boolean) as string[];
  const entries: OsNamesGazetteerEntry[] = [];

  for (const seed of seedQueries) {
    try {
      const roads = await fetchOsNamesRoadsForQuery(seed, bbox, signal);
      entries.push(...roads);
      if (entries.length >= 8) break;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
    }
  }

  if (entries.length < 8) {
    for (const term of OS_NAMES_QUERY_TERMS) {
      try {
        const roads = await fetchOsNamesRoadsForQuery(term, bbox, signal);
        entries.push(...roads);
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err;
      }
    }
  }

  const seen = new Set<string>();
  const suggestions: UkAddressSuggestion[] = [];
  for (const entry of entries) {
    const street = normalizeStreetName(entry.NAME1 ?? '');
    if (!street) continue;
    const key = street.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    suggestions.push(
      buildStreetContainerSuggestion(
        street,
        normalizedPostcode,
        meta.city,
        'osnames',
      ),
    );
  }

  suggestions.sort((a, b) => (a.line1 ?? '').localeCompare(b.line1 ?? ''));
  if (suggestions.length > 0) {
    osNamesStreetCache.set(cacheKey, suggestions);
  }
  return suggestions;
}

function extractStreetFromGetAddress(
  addressLabel: string,
  postcode: string,
): string | null {
  if (!addressLabel) return null;
  const parts = addressLabel
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);

  if (parts.length === 0) return null;

  // Drop postcode suffix if present
  while (parts.length > 0 && matchesPostcode(parts[parts.length - 1], postcode)) {
    parts.pop();
  }

  if (parts.length === 0) return null;

  const deriveStreet = (candidate: string): string => {
    const cleaned = candidate
      .replace(/^(flat|unit|apartment|suite|room|floor)\s+\S+\s+/i, '')
      .trim();
    const withoutNumber = cleaned.replace(/^\d+[A-Z\d-]*\s+/, '').trim();
    return withoutNumber || cleaned;
  };

  // Prefer address-like parts and avoid picking the town/city token.
  for (const candidate of parts) {
    const street = deriveStreet(candidate);
    if (!street || !/[A-Za-z]/.test(street)) continue;
    if (STREET_KEYWORD_REGEX.test(street) || /^\d/.test(candidate)) {
      return street;
    }
  }

  const fallbackStreet = deriveStreet(parts[0]);
  return fallbackStreet || null;
}

function extractPostcodeFromLabel(label: string): string | undefined {
  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (looksLikePostcode(parts[i])) return normalizePostcode(parts[i]);
  }
  return undefined;
}

// â”€â”€ Step 1a: Postcodes.io â€” postcode prefix â†’ postcode containers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchPostcodeContainers(
  query: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  // Normalise so that "ME38FJ" is submitted as "ME3 8FJ" which postcodes.io handles
  const normalizedQuery = normalizePostcode(query);
  const url = `${POSTCODES_IO_BASE}/postcodes/${encodeURIComponent(normalizedQuery)}/autocomplete?limit=8`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    if (looksLikePostcode(normalizedQuery)) {
      return [{
        id: `pc:${normalizedQuery}`,
        label: `${normalizedQuery} - More Addresses`,
        address: normalizedQuery,
        postcode: normalizedQuery,
        source: 'postcodes.io' as const,
        isContainer: true,
        containerId: `pc:${normalizedQuery}`,
      }];
    }
    return [];
  }

  const data = (await response.json()) as PostcodesIoAutocompleteResponse;
  const postcodes = data.result ?? [];
  if (postcodes.length === 0) {
    if (looksLikePostcode(normalizedQuery)) {
      return [{
        id: `pc:${normalizedQuery}`,
        label: `${normalizedQuery} - More Addresses`,
        address: normalizedQuery,
        postcode: normalizedQuery,
        source: 'postcodes.io' as const,
        isContainer: true,
        containerId: `pc:${normalizedQuery}`,
      }];
    }
    return [];
  }

  // Bulk-enrich with district names
  try {
    const bulkResp = await fetch(`${POSTCODES_IO_BASE}/postcodes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postcodes }),
      signal,
    });
    if (bulkResp.ok) {
      const bulk = (await bulkResp.json()) as PostcodesIoBulkResponse;
      const enriched = (bulk.result ?? [])
        .filter((r): r is { query: string; result: PostcodeResult } => r.result !== null)
        .map((r) => {
          const pc = r.result;
          const area = pc.admin_district || pc.admin_ward || pc.region || '';
          const display = area ? `${pc.postcode}, ${area}` : pc.postcode;
          return {
            id: `pc:${pc.postcode}`,
            label: `${display} â€“ More Addresses`,
            // Use just the postcode in the input so trimmedValue stays a clean
            // postcode and does not confuse the POSTCODE_PREFIX_REGEX check on
            // the next render (containerId takes priority anyway).
            address: pc.postcode,
            postcode: pc.postcode,
            city: buildCityFromPostcode(pc),
            country: normalizeCountry(pc.country),
            source: 'postcodes.io' as const,
            isContainer: true,
            containerId: `pc:${pc.postcode}`,
          };
        });
      if (enriched.length > 0) return enriched;
    }
  } catch { /* ignore bulk failure */ }

  return postcodes.map((pc) => ({
    id: `pc:${pc}`,
    label: `${pc} â€“ More Addresses`,
    address: pc,
    postcode: pc,
    source: 'postcodes.io' as const,
    isContainer: true,
    containerId: `pc:${pc}`,
  }));
}

// â”€â”€ Step 1b: Photon â€” free-text address search (streets + houses) â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function fetchPhotonResults(
  query: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: '10',
    lang: 'en',
    bbox: UK_BBOX,
  });

  const response = await fetch(`${PHOTON_BASE}?${params}`, { signal });
  if (!response.ok) return [];

  const data = (await response.json()) as PhotonResponse;
  const results: UkAddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const feature of data.features ?? []) {
    const p = feature.properties;
    if (!p) continue;

    // UK-only filter
    const cc = (p.countrycode ?? '').toUpperCase();
    const cn = (p.country ?? '').toLowerCase();
    if (cc !== 'GB' && !cn.includes('united kingdom')) continue;

    const housenumber = p.housenumber?.trim() ?? '';
    const street = (p.street ?? p.name ?? '').trim();
    const city = (p.city ?? p.county ?? p.district ?? '').trim();
    const postcode = p.postcode ? normalizePostcode(p.postcode) : '';

    if (!street) continue;

    const line1 = housenumber ? `${housenumber} ${street}` : street;
    const dedupKey = `${line1.toLowerCase()}|${postcode.toLowerCase()}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const labelParts = [line1, city, postcode].filter(Boolean);
    const label = labelParts.join(', ');
    const id = `photon-${p.osm_type ?? 'N'}-${p.osm_id ?? dedupKey}`;

    if (housenumber) {
      // Full address with house number â†’ selectable final result
      results.push({
        id,
        label,
        address: label,
        line1,
        city: city || undefined,
        postcode: postcode || undefined,
        country: 'United Kingdom',
        source: 'photon' as const,
      });
    } else {
      // Street / area result â†’ container to drill down into
      const containerId = `st:${encodeURIComponent(street)}|${encodeURIComponent(city)}|${encodeURIComponent(postcode)}`;
      results.push({
        id,
        label: `${label} â€“ More Addresses`,
        address: label,
        line1: street,
        city: city || undefined,
        postcode: postcode || undefined,
        country: 'United Kingdom',
        source: 'photon' as const,
        isContainer: true,
        containerId,
      });
    }
  }

  return results;
}

async function fetchOverpassStreetsAtPostcode(
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const regex = buildPostcodeRegex(postcode);
  if (!regex) return [];
  const coords = await fetchPostcodeLatLon(postcode, signal);
  const around = coords ? `(around:500,${coords.lat},${coords.lon})` : '';
  const query = `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];` +
    `\n(\n  node${around}["addr:postcode"~"${regex}"]["addr:street"];\n  node${around}["addr:postcode"~"${regex}"]["addr:road"];\n  way${around}["addr:postcode"~"${regex}"]["addr:street"];\n  way${around}["addr:postcode"~"${regex}"]["addr:road"];\n  relation${around}["addr:postcode"~"${regex}"]["addr:street"];\n  relation${around}["addr:postcode"~"${regex}"]["addr:road"];\n);\nout tags;`;
  const elements = await fetchOverpassElements(query, signal);
  return extractStreetsFromOverpass(elements, postcode);
}

async function fetchOverpassAddressesOnStreet(
  street: string,
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const trimmedStreet = street.trim();
  if (!trimmedStreet) return [];
  const postcodeRegex = buildPostcodeRegex(postcode);
  if (!postcodeRegex) return [];
  const coords = await fetchPostcodeLatLon(postcode, signal);
  const around = coords ? `(around:500,${coords.lat},${coords.lon})` : '';
  const streetRegex = `^${escapeRegExp(trimmedStreet)}$`;
  const query = `[out:json][timeout:${OVERPASS_TIMEOUT_SECONDS}];` +
    `\n(\n  node${around}["addr:postcode"~"${postcodeRegex}"]["addr:street"~"${streetRegex}",i]["addr:housenumber"];\n  node${around}["addr:postcode"~"${postcodeRegex}"]["addr:road"~"${streetRegex}",i]["addr:housenumber"];\n  way${around}["addr:postcode"~"${postcodeRegex}"]["addr:street"~"${streetRegex}",i]["addr:housenumber"];\n  way${around}["addr:postcode"~"${postcodeRegex}"]["addr:road"~"${streetRegex}",i]["addr:housenumber"];\n  relation${around}["addr:postcode"~"${postcodeRegex}"]["addr:street"~"${streetRegex}",i]["addr:housenumber"];\n  relation${around}["addr:postcode"~"${postcodeRegex}"]["addr:road"~"${streetRegex}",i]["addr:housenumber"];\n);\nout tags;`;
  const elements = await fetchOverpassElements(query, signal);
  return parseOverpassAddresses(elements, postcode, trimmedStreet);
}

function groupGetAddressSuggestionsByStreet(
  postcode: string,
  suggestions: GetAddressSuggestion[],
) {
  const streetMap = new Map<string, { street: string; suggestions: GetAddressSuggestion[] }>();
  for (const suggestion of suggestions) {
    const street = extractStreetFromGetAddress(suggestion.address, postcode);
    if (!street) continue;
    const key = street.trim().toLowerCase();
    const entry = streetMap.get(key) ?? { street, suggestions: [] };
    entry.suggestions.push(suggestion);
    streetMap.set(key, entry);
  }
  return streetMap;
}

async function fetchGetAddressStreetsAtPostcode(
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  if (!hasGetAddressKey()) return [];
  const normalizedPostcode = normalizePostcode(postcode);
  const cacheKey = compactPostcode(normalizedPostcode);
  if (!cacheKey) return [];

  let suggestions = getAddressPostcodeCache.get(cacheKey);
  if (!suggestions) {
    suggestions = await fetchGetAddressAutocomplete(normalizedPostcode, signal, {
      all: true,
      showPostcode: true,
    });
    if (suggestions.length > 0) {
      getAddressPostcodeCache.set(cacheKey, suggestions);
    }
  }
  if (!suggestions || suggestions.length === 0) return [];

  const streetMap = groupGetAddressSuggestionsByStreet(normalizedPostcode, suggestions);
  return Array.from(streetMap.values())
    .sort((a, b) => a.street.localeCompare(b.street))
    .map(({ street }) => {
      const containerId = `st:${encodeURIComponent(street)}||${encodeURIComponent(normalizedPostcode)}`;
      const displayLabel = [street, normalizedPostcode].filter(Boolean).join(', ');
      return {
        id: containerId,
        label: `${displayLabel} - More Addresses`,
        address: displayLabel,
        line1: street,
        postcode: normalizedPostcode || undefined,
        country: 'United Kingdom',
        source: 'getaddress' as const,
        isContainer: true,
        containerId,
      };
    });
}

async function fetchGetAddressAddressesOnStreet(
  street: string,
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  if (!hasGetAddressKey()) return [];
  const normalizedPostcode = normalizePostcode(postcode);
  const cacheKey = compactPostcode(normalizedPostcode);
  if (!cacheKey) return [];

  let suggestions = getAddressPostcodeCache.get(cacheKey);
  if (!suggestions) {
    suggestions = await fetchGetAddressAutocomplete(normalizedPostcode, signal, {
      all: true,
      showPostcode: true,
    });
    if (suggestions.length > 0) {
      getAddressPostcodeCache.set(cacheKey, suggestions);
    }
  }
  if (!suggestions || suggestions.length === 0) return [];

  const targetStreet = street.trim().toLowerCase();
  const addresses: UkAddressSuggestion[] = [];
  const seen = new Set<string>();

  for (const suggestion of suggestions) {
    const derivedStreet = extractStreetFromGetAddress(suggestion.address, normalizedPostcode);
    if (!derivedStreet) continue;
    if (derivedStreet.trim().toLowerCase() !== targetStreet) continue;

    const label = extractPostcodeFromLabel(suggestion.address)
      ? suggestion.address
      : `${suggestion.address}, ${normalizedPostcode}`;
    const dedupKey = `${label.toLowerCase()}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    addresses.push({
      id: `ga:${suggestion.id}`,
      label,
      address: label,
      line1: label.split(',')[0]?.trim(),
      postcode: normalizedPostcode || undefined,
      country: 'United Kingdom',
      source: 'getaddress' as const,
    });
  }

  return sortAddressesByHouseNumber(addresses);
}

// Step 2a: Postcode drill-down - streets at a postcode
//
// Returns each unique road as a container (st:) rather than raw addresses.
// This prevents roads-without-house-numbers from appearing as selectable
// final results (the "Church Road" bug).

async function fetchAddressesAtPostcode(
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const normalized = normalizePostcode(postcode);
  if (!normalized) return [];

  if (hasOsPlacesKey()) {
    try {
      const osPlacesStreets = await fetchOsPlacesStreetsAtPostcode(normalized, signal);
      if (osPlacesStreets.length > 0) return osPlacesStreets;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('OS Places postcode lookup failed', err);
    }
  }

  if (hasOsNamesKey()) {
    try {
      const osNamesStreets = await fetchOsNamesStreetsAtPostcode(normalized, signal);
      if (osNamesStreets.length > 0) return osNamesStreets;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('OS Names postcode lookup failed', err);
    }
  }

  try {
    const getAddressStreets = await fetchGetAddressStreetsAtPostcode(normalized, signal);
    if (getAddressStreets.length > 0) return getAddressStreets;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('getAddress postcode lookup failed', err);
  }

  try {
    const streets = await fetchOverpassStreetsAtPostcode(normalized, signal);
    if (streets.length > 0) return streets;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('Overpass postcode lookup failed', err);
  }

  const params = new URLSearchParams({
    postalcode: normalized,
    countrycodes: 'gb',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '50',
    dedupe: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
    signal,
    headers: NOMINATIM_HEADERS,
  });
  if (!response.ok) return [];

  const items = (await response.json()) as NominatimResult[];
  return extractStreetsAsContainers(items, normalized);
}

// Step 2b: Street drill-down - house numbers on a street

async function fetchAddressesOnStreet(
  street: string,
  city: string,
  postcode: string,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion[]> {
  const normalizedPostcode = normalizePostcode(postcode);

  if (normalizedPostcode && hasOsPlacesKey()) {
    try {
      const osPlacesAddresses = await fetchOsPlacesAddressesOnStreet(street, normalizedPostcode, signal);
      if (osPlacesAddresses.length > 0) return osPlacesAddresses;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('OS Places street lookup failed', err);
    }
  }

  if (normalizedPostcode) {
    try {
      const getAddressAddresses = await fetchGetAddressAddressesOnStreet(
        street,
        normalizedPostcode,
        signal,
      );
      if (getAddressAddresses.length > 0) return getAddressAddresses;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('getAddress street lookup failed', err);
    }

    try {
      const overpassAddresses = await fetchOverpassAddressesOnStreet(street, normalizedPostcode, signal);
      if (overpassAddresses.length > 0) return overpassAddresses;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('Overpass street lookup failed', err);
    }
  }

  // Free-text query: "Shortland Road, BR2 0JP, UK"
  const q = [street, normalizedPostcode || city, 'UK'].filter(Boolean).join(', ');
  const params = new URLSearchParams({
    q,
    countrycodes: 'gb',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '50',
    dedupe: '1',
  });
  const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
    signal,
    headers: NOMINATIM_HEADERS,
  });
  if (!response.ok) return [];

  const items = (await response.json()) as NominatimResult[];
  return parseNominatimAddresses(items, normalizedPostcode || postcode, street);
}

const sortAddressesByHouseNumber = (results: UkAddressSuggestion[]) => {
  results.sort((a, b) => {
    const nA = parseInt((a.line1 ?? '').replace(/\D.*/, ''), 10) || 0;
    const nB = parseInt((b.line1 ?? '').replace(/\D.*/, ''), 10) || 0;
    if (nA !== nB) return nA - nB;
    return (a.line1 ?? '').localeCompare(b.line1 ?? '');
  });
  return results;
};

function extractStreetsFromOverpass(
  elements: OverpassElement[],
  postcode: string,
): UkAddressSuggestion[] {
  const normalizedPostcode = normalizePostcode(postcode);
  const streetMap = new Map<string, { road: string; city: string; resolvedPostcode: string }>();

  for (const element of elements) {
    const tags = element.tags ?? {};
    const road = tags['addr:street']?.trim() || tags['addr:road']?.trim();
    if (!road) continue;

    const rawPostcode = tags['addr:postcode']?.trim() || normalizedPostcode;
    if (normalizedPostcode && rawPostcode && !matchesPostcode(rawPostcode, normalizedPostcode)) continue;

    const city =
      tags['addr:city']?.trim() ||
      tags['addr:town']?.trim() ||
      tags['addr:village']?.trim() ||
      tags['addr:hamlet']?.trim() ||
      tags['addr:suburb']?.trim() ||
      '';
    const resolvedPostcode = normalizePostcode(rawPostcode);
    const key = road.toLowerCase();
    if (streetMap.has(key)) continue;
    streetMap.set(key, { road, city, resolvedPostcode });
  }

  return Array.from(streetMap.values())
    .sort((a, b) => a.road.localeCompare(b.road))
    .map(({ road, city, resolvedPostcode }) => {
      const containerId = `st:${encodeURIComponent(road)}|${encodeURIComponent(city)}|${encodeURIComponent(resolvedPostcode)}`;
      const displayLabel = [road, resolvedPostcode].filter(Boolean).join(', ');
      return {
        id: containerId,
        label: `${displayLabel} - More Addresses`,
        address: displayLabel,
        line1: road,
        city: city || undefined,
        postcode: resolvedPostcode || undefined,
        country: 'United Kingdom',
        source: 'overpass' as const,
        isContainer: true,
        containerId,
      };
    });
}

function parseOverpassAddresses(
  elements: OverpassElement[],
  fallbackPostcode: string,
  targetStreet?: string,
): UkAddressSuggestion[] {
  const seen = new Set<string>();
  const results: UkAddressSuggestion[] = [];
  const normalizedTarget = targetStreet?.trim().toLowerCase();
  const normalizedFallback = fallbackPostcode ? normalizePostcode(fallbackPostcode) : '';

  for (const element of elements) {
    const tags = element.tags ?? {};
    const houseNumber = tags['addr:housenumber']?.trim() ?? '';
    const road = tags['addr:street']?.trim() || tags['addr:road']?.trim() || '';
    if (!houseNumber || !road) continue;

    if (normalizedTarget && road.toLowerCase() !== normalizedTarget) continue;

    const rawPostcode = tags['addr:postcode']?.trim() || normalizedFallback;
    if (normalizedFallback && rawPostcode && !matchesPostcode(rawPostcode, normalizedFallback)) continue;

    const line1 = `${houseNumber} ${road}`;
    const resolvedPostcode = normalizePostcode(rawPostcode);
    const dedup = `${line1.toLowerCase()}|${compactPostcode(resolvedPostcode)}`;
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const line2 = tags['addr:unit']?.trim() || tags['addr:suburb']?.trim() || undefined;
    const city =
      tags['addr:city']?.trim() ||
      tags['addr:town']?.trim() ||
      tags['addr:village']?.trim() ||
      tags['addr:hamlet']?.trim() ||
      tags['addr:suburb']?.trim() ||
      undefined;
    const label = [line1, city, resolvedPostcode].filter(Boolean).join(', ');

    results.push({
      id: `overpass-${element.type}-${element.id}`,
      label,
      address: label,
      line1,
      line2,
      city,
      postcode: resolvedPostcode || undefined,
      country: 'United Kingdom',
      source: 'overpass' as const,
    });
  }

  return sortAddressesByHouseNumber(results);
}

// â”€â”€ Nominatim parsers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Postcode drill-down (step 2):
 * Extract unique road names from Nominatim results and return each as a
 * street container (st: containerId). Roads without house numbers no longer
 * appear as fake final-address suggestions.
 */
function extractStreetsAsContainers(
  items: NominatimResult[],
  postcode: string,
): UkAddressSuggestion[] {
  // road.toLowerCase() â†’ { road (original casing), city, resolvedPostcode }
  const streetMap = new Map<string, { road: string; city: string; resolvedPostcode: string }>();

  for (const item of items) {
    if (!item.place_id) continue;
    const addr = item.address ?? {};
    const road = addr.road?.trim();
    if (!road) continue;

    const key = road.toLowerCase();
    if (streetMap.has(key)) continue;

    const city =
      addr.city?.trim() ||
      addr.town?.trim() ||
      addr.village?.trim() ||
      addr.county?.trim() ||
      '';
    const resolvedPostcode = normalizePostcode(addr.postcode?.trim() || postcode);
    if (postcode && resolvedPostcode && !matchesPostcode(resolvedPostcode, postcode)) continue;
    streetMap.set(key, { road, city, resolvedPostcode });
  }

  return Array.from(streetMap.values())
    .sort((a, b) => a.road.localeCompare(b.road))
    .map(({ road, city, resolvedPostcode }) => {
      const containerId = `st:${encodeURIComponent(road)}|${encodeURIComponent(city)}|${encodeURIComponent(resolvedPostcode)}`;
      const displayLabel = [road, resolvedPostcode].filter(Boolean).join(', ');
      return {
        id: containerId,
        label: `${displayLabel} â€“ More Addresses`,
        address: displayLabel,
        line1: road,
        city: city || undefined,
        postcode: resolvedPostcode || undefined,
        country: 'United Kingdom',
        source: 'nominatim' as const,
        isContainer: true,
        containerId,
      };
    });
}

/**
 * Street drill-down (step 3):
 * Parse Nominatim results into final address suggestions.
 * Only items with BOTH a road AND a house_number are included, so
 * bare road names can never appear as selectable addresses.
 * If targetStreet is provided, results are filtered to that street only.
 */
function parseNominatimAddresses(
  items: NominatimResult[],
  fallbackPostcode: string,
  targetStreet?: string,
): UkAddressSuggestion[] {
  const seen = new Set<string>();
  const results: UkAddressSuggestion[] = [];

  for (const item of items) {
    if (!item.place_id) continue;
    const addr = item.address ?? {};
    const houseNumber = addr.house_number?.trim() ?? '';
    const road = addr.road?.trim() ?? '';

    // Skip entries without a full address (house number + road both required)
    if (!houseNumber || !road) continue;

    // When drilling down from a street container, keep only that street
    if (targetStreet && road.toLowerCase() !== targetStreet.toLowerCase()) continue;

    const line1 = `${houseNumber} ${road}`;
    const dedup = line1.toLowerCase();
    if (seen.has(dedup)) continue;
    seen.add(dedup);

    const line2 = addr.neighbourhood?.trim() || addr.suburb?.trim() || undefined;
    const city =
      addr.city?.trim() ||
      addr.town?.trim() ||
      addr.village?.trim() ||
      addr.county?.trim() ||
      undefined;
    const resolvedPostcode = normalizePostcode(addr.postcode?.trim() || fallbackPostcode);
    if (fallbackPostcode && resolvedPostcode && !matchesPostcode(resolvedPostcode, fallbackPostcode)) continue;
    const country = normalizeCountry(addr.country);
    const label = [line1, city, resolvedPostcode].filter(Boolean).join(', ');

    results.push({
      id: String(item.place_id),
      label,
      address: label,
      line1,
      line2,
      city,
      postcode: resolvedPostcode || undefined,
      country,
      source: 'nominatim' as const,
    });
  }

  return sortAddressesByHouseNumber(results);
}

// â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Fetch address suggestions.
 *
 * 3-step flow:
 *   1. Postcode prefix typed  -> postcodes.io containers  (pc: containerId)
 *   2. pc: containerId set    -> OS Places (if configured) or fallback providers for streets
 *   3. st: containerId set    -> OS Places (if configured) or fallback providers for houses
 *
 *   General free-text -> getAddress (if configured), otherwise Photon.
 *
 * When in drill-down mode (containerId set) we do NOT fall through to the
 * normal postcode/Photon search to avoid re-showing the already-selected
 * postcode in the dropdown.
 */
export async function fetchUkAddressSuggestions(
  query: string,
  signal?: AbortSignal,
  options?: { containerId?: string | null },
): Promise<UkAddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // â”€ Drill-down mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (options?.containerId) {
    try {
      if (options.containerId.startsWith('pc:')) {
        // Postcode container â†’ streets as st: containers
        const postcode = options.containerId.slice(3);
        const streets = await fetchAddressesAtPostcode(postcode, signal);
        if (streets.length > 0) return streets;
      } else if (options.containerId.startsWith('st:')) {
        // Street container â†’ house numbers
        const [street, city, postcode] = options.containerId
          .slice(3)
          .split('|')
          .map(decodeURIComponent);
        const addresses = await fetchAddressesOnStreet(street, city, postcode, signal);
        if (addresses.length > 0) return addresses;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('Address drill-down failed', err);
    }
    // In drill-down mode return empty rather than re-showing the same
    // postcode suggestions the user just selected.
    return [];
  }

  // â”€ Postcode prefix typed â†’ postcode containers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (POSTCODE_PREFIX_REGEX.test(trimmed)) {
    try {
      const postcodes = await fetchPostcodeContainers(trimmed, signal);
      if (postcodes.length > 0) return postcodes;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('Postcode autocomplete failed, falling back to Photon', err);
    }
  }

  // General search via getAddress (if configured)
  if (hasGetAddressKey()) {
    try {
      const getAddressResults = await fetchGetAddressAutocomplete(trimmed, signal, {
        showPostcode: true,
      });
      const mapped = getAddressResults.map((suggestion) => {
        const label = suggestion.address;
        const postcode = extractPostcodeFromLabel(label);
        return {
          id: `ga:${suggestion.id}`,
          label,
          address: label,
          line1: label.split(',')[0]?.trim(),
          postcode,
          country: 'United Kingdom',
          source: 'getaddress' as const,
        };
      });
      if (mapped.length > 0) return mapped;
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('getAddress autocomplete failed, falling back to Photon', err);
    }
  }

  // General search via Photon
  try {
    const photonResults = await fetchPhotonResults(trimmed, signal);
    if (photonResults.length > 0) return photonResults;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    console.warn('Photon address search failed', err);
  }

  return [];
}

/** Resolve extra details for providers that require a second lookup. */
export async function resolveUkAddressSuggestion(
  suggestion: UkAddressSuggestion,
  signal?: AbortSignal,
): Promise<UkAddressSuggestion> {
  if (suggestion.source === 'getaddress' && suggestion.id.startsWith('ga:') && hasGetAddressKey()) {
    const id = suggestion.id.slice(3);
    try {
      const params = new URLSearchParams({ 'api-key': GETADDRESS_API_KEY });
      const url = `${GETADDRESS_BASE}/get/${encodeURIComponent(id)}?${params.toString()}`;
      const response = await fetch(url, { signal });
      if (!response.ok) return suggestion;
      const data = (await response.json()) as GetAddressDetailsResponse;
      const formatted = (data.formatted_address ?? []).filter(Boolean).join(', ');
      const postcode = normalizePostcode(data.postcode ?? suggestion.postcode ?? '');
      return {
        ...suggestion,
        label: formatted || suggestion.label,
        address: formatted || suggestion.address,
        line1: data.line_1 ?? suggestion.line1,
        line2: data.line_2 ?? data.line_3 ?? suggestion.line2,
        city: data.town_or_city ?? suggestion.city,
        postcode: postcode || suggestion.postcode,
        country: data.country ?? suggestion.country,
      };
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw err;
      console.warn('getAddress resolve failed', err);
      return suggestion;
    }
  }

  return suggestion;
}

/** Address lookup is available via free providers; getAddress is optional. */
export const hasConfiguredUkAddressProvider = () => true;
