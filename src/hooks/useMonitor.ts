import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchGlobalHashrateChart,
  fetchMinerStats,
  fetchWorkerSnapshot,
  type HashPoint,
  type MinerStats,
} from '../api';
import { loadHistory, saveHistory, resetHistory, type WorkerHistory } from '../storage';
import type { Summary, Worker, WorkerStatus } from '../types';

export interface MonitorConfig {
  refreshMs: number;
  staleThresholdSec: number; // воркер «пропал», если lts старше этого
  newWindowSec: number; // воркер «новый» столько секунд после первого появления
}

export const DEFAULT_CONFIG: MonitorConfig = {
  refreshMs: 30_000,
  staleThresholdSec: 3600, // 1 час
  newWindowSec: 3600, // 1 час
};

export interface MonitorState {
  workers: Worker[];
  summary: Summary | null;
  globalChart: HashPoint[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface BuildResult {
  workers: Worker[];
  summary: Summary;
  history: WorkerHistory;
}

function buildWorkers(
  stats: MinerStats,
  allWorkers: Record<string, { lts: number | null; hash: number; totalHash: number }>,
  prevHistory: WorkerHistory,
  cfg: MonitorConfig,
  nowMs: number,
): BuildResult {
  const isInitialSeeding = Object.keys(prevHistory).length === 0;
  const history: WorkerHistory = { ...prevHistory };

  // Множество всех имён: текущие репортящие + ранее известные.
  const names = new Set<string>();
  for (const key of Object.keys(allWorkers)) {
    if (key !== 'global') names.add(key);
  }
  for (const key of Object.keys(prevHistory)) names.add(key);

  const nowSec = nowMs / 1000;
  let hashSum = 0;
  for (const name of names) {
    hashSum += allWorkers[name]?.hash ?? 0;
  }

  const workers: Worker[] = [];
  let online = 0;
  let stale = 0;
  let newCount = 0;

  for (const name of names) {
    const raw = allWorkers[name];
    const prev = history[name];
    const isReporting = !!raw;

    const firstSeen = prev ? prev.firstSeen : isInitialSeeding ? 0 : nowMs;
    const lts = raw?.lts ?? prev?.lastSeenLts ?? null;
    const hash = raw?.hash ?? 0;
    const totalHash = raw?.totalHash ?? 0;

    history[name] = {
      firstSeen,
      lastSeenLts: Math.max(prev?.lastSeenLts ?? 0, raw?.lts ?? 0) || (lts ?? 0),
      lastHash: hash || prev?.lastHash || 0,
    };

    const inactiveSec = lts != null ? Math.max(0, nowSec - lts) : null;
    const status: WorkerStatus =
      lts != null && inactiveSec != null && inactiveSec <= cfg.staleThresholdSec
        ? 'online'
        : 'stale';
    const isNew = firstSeen > 0 && nowMs - firstSeen < cfg.newWindowSec * 1000;

    if (status === 'online') online++;
    else stale++;
    if (isNew) newCount++;

    workers.push({
      name,
      hash,
      totalHash,
      lts,
      firstSeen,
      status,
      isNew,
      isReporting,
      inactiveSec,
      poolShare: hashSum > 0 ? hash / hashSum : 0,
    });
  }

  const summary: Summary = {
    totalHashrate: stats.hash,
    workersTotal: workers.length,
    online,
    stale,
    newCount,
    validShares: stats.validShares,
    invalidShares: stats.invalidShares,
    amtDue: stats.amtDue,
    amtPaid: stats.amtPaid,
    totalHashes: stats.totalHashes,
    lastShare: stats.lastHash ?? null,
  };

  return { workers, summary, history };
}

export function useMonitor(address: string, config: MonitorConfig) {
  const [state, setState] = useState<MonitorState>({
    workers: [],
    summary: null,
    globalChart: [],
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  });

  // Держим актуальный конфиг в ref, чтобы интервал использовал свежие значения
  // без пересоздания цикла опроса.
  const cfgRef = useRef(config);
  cfgRef.current = config;
  const addrRef = useRef(address);
  addrRef.current = address;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const addr = addrRef.current;
    const cfg = cfgRef.current;
    setState((s) => ({ ...s, refreshing: true }));
    try {
      const [stats, allWorkers, globalChart] = await Promise.all([
        fetchMinerStats(addr, signal),
        fetchWorkerSnapshot(addr, signal),
        fetchGlobalHashrateChart(addr, signal).catch(() => [] as HashPoint[]),
      ]);
      const nowMs = Date.now();
      const prevHistory = loadHistory(addr);
      const { workers, summary, history } = buildWorkers(stats, allWorkers, prevHistory, cfg, nowMs);
      saveHistory(addr, history);
      setState({
        workers,
        summary,
        globalChart: [...globalChart].sort((a, b) => a.ts - b.ts),
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: nowMs,
      });
    } catch (err) {
      if (signal?.aborted) return;
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : 'Не удалось загрузить данные',
      }));
    }
  }, []);

  // Сброс при смене адреса.
  useEffect(() => {
    setState({
      workers: [],
      summary: null,
      globalChart: [],
      loading: true,
      refreshing: false,
      error: null,
      lastUpdated: null,
    });
  }, [address]);

  // Цикл опроса.
  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    const id = window.setInterval(() => {
      refresh(controller.signal);
    }, config.refreshMs);
    return () => {
      controller.abort();
      window.clearInterval(id);
    };
  }, [refresh, config.refreshMs, address]);

  const manualRefresh = useCallback(() => refresh(), [refresh]);

  const resetTracking = useCallback(() => {
    resetHistory(addrRef.current);
    refresh();
  }, [refresh]);

  return { ...state, manualRefresh, resetTracking };
}
