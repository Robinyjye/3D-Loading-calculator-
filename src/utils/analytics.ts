export interface GlobalStats {
  uniqueUsers: number;
  totalVisits: number;
  totalCalculations: number;
  totalUsage: number;
  lastUpdated: string;
  isOnline: boolean;
}

export interface LocalDeviceStats {
  visitorId: string;
  firstVisit: string;
  localVisits: number;
  localCalculations: number;
  lastActive: string;
}

const API_BASE = 'https://abacus.jasoncameron.dev';
// Fresh namespace starting from today (2026-09-16)
const NAMESPACE = 'container-calc-2026-09-16';

const STORAGE_KEYS = {
  VISITOR_ID: 'container_calc_20260916_visitor_id',
  USER_REGISTERED: 'container_calc_20260916_unique_registered',
  FIRST_VISIT: 'container_calc_20260916_first_visit',
  LOCAL_VISITS: 'container_calc_20260916_local_visits',
  LOCAL_CALCS: 'container_calc_20260916_local_calcs',
  LAST_ACTIVE: 'container_calc_20260916_last_active',
  SESSION_RECORDED: 'container_calc_20260916_session_recorded',
  CACHED_GLOBAL: 'container_calc_20260916_cached_global',
};

// Clear legacy pre-reset records from browser storage
try {
  const legacyKeys = [
    'container_calc_visitor_id',
    'container_calc_unique_registered_v2',
    'container_calc_first_visit',
    'container_calc_local_visits',
    'container_calc_local_calcs',
    'container_calc_last_active',
    'container_calc_session_recorded',
    'container_calc_cached_global',
  ];
  legacyKeys.forEach(k => localStorage.removeItem(k));
  sessionStorage.removeItem('container_calc_session_recorded');
} catch {
  // ignore in SSR / sandbox
}

// Helper to safely read or hit a numeric value from the API with timeout
async function fetchValue(endpoint: 'get' | 'hit', key: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_BASE}/${endpoint}/${NAMESPACE}/${key}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.value === 'number' ? data.value : null;
  } catch (err) {
    console.warn(`[Analytics] Failed to ${endpoint} key ${key}:`, err);
    return null;
  }
}

export function getLocalDeviceStats(): LocalDeviceStats {
  let visitorId = localStorage.getItem(STORAGE_KEYS.VISITOR_ID);
  let firstVisit = localStorage.getItem(STORAGE_KEYS.FIRST_VISIT);
  
  if (!visitorId) {
    visitorId = `usr_${Math.random().toString(36).substring(2, 8)}_${Date.now().toString(36)}`;
    firstVisit = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.VISITOR_ID, visitorId);
    localStorage.setItem(STORAGE_KEYS.FIRST_VISIT, firstVisit);
  }

  const localVisits = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_VISITS) || '0', 10);
  const localCalculations = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_CALCS) || '0', 10);
  const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE) || new Date().toISOString();

  return {
    visitorId,
    firstVisit: firstVisit || new Date().toISOString(),
    localVisits,
    localCalculations,
    lastActive,
  };
}

export async function fetchGlobalStats(): Promise<GlobalStats> {
  const cachedRaw = localStorage.getItem(STORAGE_KEYS.CACHED_GLOBAL);
  let cached: Partial<GlobalStats> = {};
  if (cachedRaw) {
    try {
      cached = JSON.parse(cachedRaw);
    } catch {
      // ignore
    }
  }

  const local = getLocalDeviceStats();

  try {
    const [usersRes, visitsRes, calcsRes] = await Promise.allSettled([
      fetchValue('get', 'unique_users'),
      fetchValue('get', 'total_visits'),
      fetchValue('get', 'total_calculations'),
    ]);

    const remoteUsers = usersRes.status === 'fulfilled' ? usersRes.value : null;
    const remoteVisits = visitsRes.status === 'fulfilled' ? visitsRes.value : null;
    const remoteCalcs = calcsRes.status === 'fulfilled' ? calcsRes.value : null;

    const isOnline = remoteUsers !== null || remoteVisits !== null || remoteCalcs !== null;

    const uniqueUsers = Math.max(remoteUsers ?? cached.uniqueUsers ?? 0, 0);
    const totalVisits = Math.max(remoteVisits ?? cached.totalVisits ?? local.localVisits, local.localVisits, 0);
    const totalCalculations = Math.max(remoteCalcs ?? cached.totalCalculations ?? local.localCalculations, local.localCalculations, 0);
    const totalUsage = totalVisits + totalCalculations;

    const stats: GlobalStats = {
      uniqueUsers,
      totalVisits,
      totalCalculations,
      totalUsage,
      lastUpdated: new Date().toISOString(),
      isOnline,
    };

    localStorage.setItem(STORAGE_KEYS.CACHED_GLOBAL, JSON.stringify(stats));
    return stats;
  } catch {
    return {
      uniqueUsers: cached.uniqueUsers ?? 0,
      totalVisits: Math.max(cached.totalVisits ?? 0, local.localVisits),
      totalCalculations: Math.max(cached.totalCalculations ?? 0, local.localCalculations),
      totalUsage: (cached.totalVisits ?? 0) + (cached.totalCalculations ?? 0),
      lastUpdated: new Date().toISOString(),
      isOnline: false,
    };
  }
}

export async function recordVisit(): Promise<GlobalStats> {
  const isRegistered = localStorage.getItem(STORAGE_KEYS.USER_REGISTERED) === 'true';
  const sessionRecorded = sessionStorage.getItem(STORAGE_KEYS.SESSION_RECORDED);

  // Synchronously ensure visitor ID exists
  getLocalDeviceStats();

  const promises: Promise<unknown>[] = [];

  // 1. If this device has not registered as a unique user, hit unique_users on remote
  if (!isRegistered) {
    promises.push(
      fetchValue('hit', 'unique_users').then((val) => {
        if (val !== null) {
          localStorage.setItem(STORAGE_KEYS.USER_REGISTERED, 'true');
        }
      })
    );
  }

  // 2. Record 1 visit per browser session for BOTH local and remote
  if (!sessionRecorded) {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_RECORDED, 'true');

    // Update local device visit counter
    const currentVisits = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_VISITS) || '0', 10) + 1;
    localStorage.setItem(STORAGE_KEYS.LOCAL_VISITS, currentVisits.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());

    // Hit remote visits counter
    promises.push(fetchValue('hit', 'total_visits'));
  } else {
    // Session already counted, just update last active timestamp
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }

  return fetchGlobalStats();
}

export async function recordCalculation(): Promise<GlobalStats> {
  // Update local device record
  const localCalcs = parseInt(localStorage.getItem(STORAGE_KEYS.LOCAL_CALCS) || '0', 10) + 1;
  localStorage.setItem(STORAGE_KEYS.LOCAL_CALCS, localCalcs.toString());
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, new Date().toISOString());

  // Increment remote calculation counter
  await fetchValue('hit', 'total_calculations');

  return fetchGlobalStats();
}
