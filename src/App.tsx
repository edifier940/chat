import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_ADDRESS } from './api';
import { HashrateChart } from './components/HashrateChart';
import { StatCard } from './components/StatCard';
import {
  Toolbar,
  type SortDir,
  type SortField,
  type StatusFilter,
} from './components/Toolbar';
import { WorkerList } from './components/WorkerList';
import { WorkerModal } from './components/WorkerModal';
import {
  formatHashrate,
  formatNumber,
  formatRelative,
  formatXmr,
  shortAddress,
} from './format';
import { DEFAULT_CONFIG, useMonitor, type MonitorConfig } from './hooks/useMonitor';
import type { Worker } from './types';

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const REFRESH_OPTIONS = [
  { label: '10 сек', ms: 10_000 },
  { label: '30 сек', ms: 30_000 },
  { label: '1 мин', ms: 60_000 },
  { label: '5 мин', ms: 300_000 },
];

const THRESHOLD_OPTIONS = [
  { label: '15 минут', sec: 900 },
  { label: '30 минут', sec: 1800 },
  { label: '1 час', sec: 3600 },
  { label: '3 часа', sec: 10_800 },
];

export function App() {
  const [address, setAddress] = useState(DEFAULT_ADDRESS);
  const [config, setConfig] = useState<MonitorConfig>(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState(address);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('hash');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<string | null>(null);

  const now = useNow(1000);
  const monitor = useMonitor(address, config);
  const { workers, summary, globalChart, loading, refreshing, error, lastUpdated } = monitor;

  const counts = useMemo<Record<StatusFilter, number>>(() => {
    return {
      all: workers.length,
      online: workers.filter((w) => w.status === 'online').length,
      new: workers.filter((w) => w.isNew).length,
      stale: workers.filter((w) => w.status === 'stale').length,
    };
  }, [workers]);

  const visibleWorkers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = workers.filter((w) => {
      if (q && !w.name.toLowerCase().includes(q)) return false;
      if (filter === 'online') return w.status === 'online';
      if (filter === 'new') return w.isNew;
      if (filter === 'stale') return w.status === 'stale';
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'ru', { numeric: true });
          break;
        case 'hash':
          cmp = a.hash - b.hash;
          break;
        case 'lts':
          cmp = (a.lts ?? 0) - (b.lts ?? 0);
          break;
        case 'totalHash':
          cmp = a.totalHash - b.totalHash;
          break;
        case 'firstSeen':
          cmp = a.firstSeen - b.firstSeen;
          break;
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name, 'ru', { numeric: true });
      return cmp * dir;
    });
    return list;
  }, [workers, search, filter, sortField, sortDir]);

  const selectedWorker: Worker | undefined = useMemo(
    () => workers.find((w) => w.name === selected),
    [workers, selected],
  );

  const countdown =
    lastUpdated != null
      ? Math.max(0, Math.ceil((lastUpdated + config.refreshMs - now) / 1000))
      : null;

  const applyAddress = () => {
    const trimmed = addressDraft.trim();
    if (trimmed && trimmed !== address) {
      setAddress(trimmed);
      setSelected(null);
    }
    setSettingsOpen(false);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <div className="logo">
            <svg viewBox="0 0 64 64" aria-hidden>
              <path
                d="M32 8 L52 20 V44 L32 56 L12 44 V20 Z"
                fill="none"
                stroke="url(#lg)"
                strokeWidth="3"
              />
              <path
                d="M22 40 L28 28 L32 36 L36 24 L42 40"
                fill="none"
                stroke="url(#lg)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ff9a5a" />
                  <stop offset="1" stopColor="#ff3d3d" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1>
              SupportXMR <span>Monitor</span>
            </h1>
            <a
              className="header__addr"
              href={`https://www.supportxmr.com/#/dashboard?address=${address}`}
              target="_blank"
              rel="noreferrer"
              title={address}
            >
              {shortAddress(address)}
            </a>
          </div>
        </div>

        <div className="header__actions">
          <div className="refresh-state">
            {refreshing ? (
              <span className="refresh-state__live">
                <span className="pulse" /> обновление…
              </span>
            ) : countdown != null ? (
              <span className="refresh-state__next">обновление через {countdown}s</span>
            ) : null}
            {lastUpdated && (
              <span className="refresh-state__last">
                данные: {formatRelative(Math.floor(lastUpdated / 1000), now)}
              </span>
            )}
          </div>
          <button className="btn btn--icon" onClick={monitor.manualRefresh} title="Обновить сейчас">
            <svg viewBox="0 0 24 24" className={refreshing ? 'spin' : ''} aria-hidden>
              <path
                d="M20 11a8 8 0 10-2.3 5.7M20 5v6h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className={`btn btn--icon ${settingsOpen ? 'is-active' : ''}`}
            onClick={() => {
              setAddressDraft(address);
              setSettingsOpen((o) => !o);
            }}
            title="Настройки"
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {settingsOpen && (
        <section className="settings">
          <div className="settings__row">
            <label className="settings__field settings__field--wide">
              Адрес майнера
              <div className="settings__addr">
                <input
                  type="text"
                  value={addressDraft}
                  spellCheck={false}
                  onChange={(e) => setAddressDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyAddress()}
                />
                <button className="btn btn--primary" onClick={applyAddress}>
                  Применить
                </button>
              </div>
            </label>
          </div>
          <div className="settings__row">
            <label className="settings__field">
              Интервал обновления
              <select
                value={config.refreshMs}
                onChange={(e) => setConfig((c) => ({ ...c, refreshMs: Number(e.target.value) }))}
              >
                {REFRESH_OPTIONS.map((o) => (
                  <option key={o.ms} value={o.ms}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__field">
              «Пропал», если нет дольше
              <select
                value={config.staleThresholdSec}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, staleThresholdSec: Number(e.target.value) }))
                }
              >
                {THRESHOLD_OPTIONS.map((o) => (
                  <option key={o.sec} value={o.sec}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings__field">
              «Новый» в течение
              <select
                value={config.newWindowSec}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, newWindowSec: Number(e.target.value) }))
                }
              >
                {THRESHOLD_OPTIONS.map((o) => (
                  <option key={o.sec} value={o.sec}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn btn--ghost settings__reset"
              onClick={monitor.resetTracking}
              title="Сбросить накопленную историю первых появлений"
            >
              Сбросить трекинг
            </button>
          </div>
        </section>
      )}

      {error && (
        <div className="banner banner--error">
          Ошибка загрузки: {error}. Повторная попытка через {Math.round(config.refreshMs / 1000)}s.
        </div>
      )}

      {loading && !summary ? (
        <div className="loading">
          <span className="pulse" /> Загрузка данных пула…
        </div>
      ) : (
        <>
          <section className="stats-grid">
            <StatCard
              label="Общий хешрейт"
              value={formatHashrate(summary?.totalHashrate)}
              sub={`Всего хешей: ${formatNumber(summary?.totalHashes ?? 0)}`}
              accent="orange"
            />
            <StatCard
              label="Воркеры"
              value={summary?.workersTotal ?? 0}
              sub={`${summary?.online ?? 0} онлайн`}
              accent="blue"
            />
            <StatCard
              label="Новые"
              value={summary?.newCount ?? 0}
              sub="за выбранное окно"
              accent="green"
            />
            <StatCard
              label="Пропали"
              value={summary?.stale ?? 0}
              sub={`нет > ${THRESHOLD_OPTIONS.find((t) => t.sec === config.staleThresholdSec)?.label ?? ''}`}
              accent={summary && summary.stale > 0 ? 'red' : 'default'}
            />
            <StatCard
              label="Принятые шары"
              value={formatNumber(summary?.validShares)}
              sub={`Отклонено: ${formatNumber(summary?.invalidShares ?? 0)}`}
            />
            <StatCard
              label="К выплате"
              value={formatXmr(summary?.amtDue)}
              sub={`Выплачено: ${formatXmr(summary?.amtPaid)}`}
              accent="green"
            />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Хешрейт пула</h2>
              <span className="panel__hint">
                последняя точка: {formatHashrate(globalChart.at(-1)?.hs)}
              </span>
            </div>
            <HashrateChart data={globalChart} />
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2>Воркеры</h2>
              {summary && summary.lastShare != null && (
                <span className="panel__hint">
                  последняя шара: {formatRelative(summary.lastShare, now)}
                </span>
              )}
            </div>
            <Toolbar
              search={search}
              onSearch={setSearch}
              filter={filter}
              onFilter={setFilter}
              sortField={sortField}
              onSortField={setSortField}
              sortDir={sortDir}
              onToggleDir={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              counts={counts}
              shown={visibleWorkers.length}
            />
            <WorkerList workers={visibleWorkers} now={now} onSelect={setSelected} />
          </section>
        </>
      )}

      <footer className="footer">
        Данные:{' '}
        <a href="https://www.supportxmr.com/" target="_blank" rel="noreferrer">
          supportxmr.com
        </a>{' '}
        · Мониторинг обновляется автоматически. «Новые» и «пропавшие» считаются локально в браузере.
      </footer>

      {selectedWorker && (
        <WorkerModal
          address={address}
          worker={selectedWorker}
          now={now}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
