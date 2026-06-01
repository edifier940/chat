// Слой работы с публичным API пула SupportXMR.
// CORS открыт (сервер отражает Origin), поэтому фронтенд ходит в API напрямую.

export const DEFAULT_ADDRESS =
  '47mFb5ZZqu5VXr4NrRwdfBGStQMDKJWudZXjUBDTGFA7T8Cq5fyc3S1A71GX88preJgh7zhByQbGL8jXLiKQbFJpKNLpV72';

const API_BASE = 'https://www.supportxmr.com/api';

/** Общая статистика майнера (адреса). */
export interface MinerStats {
  hash: number;
  identifier: string;
  lastHash: number; // unix seconds
  totalHashes: number;
  validShares: number;
  invalidShares: number;
  expiry: number;
  amtPaid: number; // атомарные единицы (piconero), 1 XMR = 1e12
  amtDue: number;
  txnCount: number;
}

/** Запись по одному воркеру из /stats/allWorkers. */
export interface RawWorker {
  lts: number | null; // last time seen, unix seconds
  identifer: string; // (в API именно с такой опечаткой)
  hash: number;
  totalHash: number;
}

/** Точка графика хешрейта. */
export interface HashPoint {
  ts: number; // unix ms
  hs: number; // H/s
}

export type AllWorkersResponse = Record<string, RawWorker>;

/** Унифицированная запись по воркеру после слияния источников. */
export interface WorkerSnapshot {
  lts: number | null;
  hash: number;
  totalHash: number;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Запрос ${url} вернул ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchMinerStats(address: string, signal?: AbortSignal): Promise<MinerStats> {
  return getJson<MinerStats>(`${API_BASE}/miner/${address}/stats`, signal);
}

/** Список имён всех воркеров (надёжный источник полного набора). */
export function fetchIdentifiers(address: string, signal?: AbortSignal): Promise<string[]> {
  return getJson<string[]>(`${API_BASE}/miner/${address}/identifiers`, signal);
}

/** Все воркеры за один запрос: имя -> данные. Содержит также ключ "global". */
export function fetchAllWorkers(address: string, signal?: AbortSignal): Promise<AllWorkersResponse> {
  return getJson<AllWorkersResponse>(`${API_BASE}/miner/${address}/stats/allWorkers`, signal);
}

/** Статистика одного воркера. В этом эндпоинте hash/totalHash приходят строками. */
interface RawWorkerStats {
  lts: number | null;
  identifer: string;
  hash: string | number | null;
  totalHash: string | number | null;
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n : 0;
}

export async function fetchWorkerStats(
  address: string,
  worker: string,
  signal?: AbortSignal,
): Promise<WorkerSnapshot> {
  const d = await getJson<RawWorkerStats>(
    `${API_BASE}/miner/${address}/stats/${encodeURIComponent(worker)}`,
    signal,
  );
  return { lts: d.lts ?? null, hash: toNum(d.hash), totalHash: toNum(d.totalHash) };
}

/** Параллельная обработка с ограничением одновременных запросов. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]);
    }
  }
  const pool = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(pool);
  return results;
}

/**
 * Надёжный снимок всех воркеров.
 * Эндпоинт allWorkers у SupportXMR нестабилен (иногда отдаёт только "global"),
 * поэтому берём полный список имён из /identifiers, заполняем что можем из
 * allWorkers, а недостающих воркеров дозапрашиваем поштучно (с ограничением
 * на число одновременных запросов).
 */
export async function fetchWorkerSnapshot(
  address: string,
  signal?: AbortSignal,
): Promise<Record<string, WorkerSnapshot>> {
  const [names, all] = await Promise.all([
    fetchIdentifiers(address, signal),
    fetchAllWorkers(address, signal).catch(() => ({}) as AllWorkersResponse),
  ]);

  const map: Record<string, WorkerSnapshot> = {};
  for (const [key, w] of Object.entries(all)) {
    if (key === 'global' || !w) continue;
    map[key] = { lts: w.lts ?? null, hash: w.hash ?? 0, totalHash: w.totalHash ?? 0 };
  }

  const missing = names.filter((n) => !(n in map));
  if (missing.length > 0) {
    const fetched = await mapLimit(missing, 10, async (name) => {
      try {
        return [name, await fetchWorkerStats(address, name, signal)] as const;
      } catch {
        return [name, { lts: null, hash: 0, totalHash: 0 }] as const;
      }
    });
    for (const [name, snap] of fetched) map[name] = snap;
  }

  return map;
}

export function fetchGlobalHashrateChart(address: string, signal?: AbortSignal): Promise<HashPoint[]> {
  return getJson<HashPoint[]>(`${API_BASE}/miner/${address}/chart/hashrate`, signal);
}

export function fetchWorkerHashrateChart(
  address: string,
  worker: string,
  signal?: AbortSignal,
): Promise<HashPoint[]> {
  return getJson<HashPoint[]>(
    `${API_BASE}/miner/${address}/chart/hashrate/${encodeURIComponent(worker)}`,
    signal,
  );
}
