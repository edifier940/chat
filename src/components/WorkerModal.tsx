import { useEffect, useState } from 'react';
import { fetchWorkerHashrateChart, type HashPoint } from '../api';
import { formatCompact, formatHashrate, formatRelative } from '../format';
import type { Worker } from '../types';
import { HashrateChart } from './HashrateChart';

interface WorkerModalProps {
  address: string;
  worker: Worker;
  now: number;
  onClose: () => void;
}

export function WorkerModal({ address, worker, now, onClose }: WorkerModalProps) {
  const [chart, setChart] = useState<HashPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchWorkerHashrateChart(address, worker.name, controller.signal)
      .then((d) => {
        setChart([...d].sort((a, b) => a.ts - b.ts));
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'Ошибка загрузки графика');
        setLoading(false);
      });
    return () => controller.abort();
  }, [address, worker.name]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const avg =
    chart.length > 0 ? chart.reduce((s, p) => s + p.hs, 0) / chart.length : 0;
  const peak = chart.reduce((m, p) => Math.max(m, p.hs), 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <div className="modal__header">
          <div>
            <div className="modal__title">
              <span className={`dot dot--${worker.status === 'online' ? 'online' : 'stale'}`} />
              {worker.name}
              {worker.isNew && <span className="badge badge--new">NEW</span>}
            </div>
            <div className="modal__subtitle">
              {worker.status === 'online' ? 'Онлайн' : 'Не появлялся дольше порога'} ·{' '}
              {formatRelative(worker.lts, now)}
            </div>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="modal__stats">
          <div>
            <span className="modal__stat-label">Текущий</span>
            <span className="modal__stat-value">{formatHashrate(worker.hash)}</span>
          </div>
          <div>
            <span className="modal__stat-label">Средний</span>
            <span className="modal__stat-value">{formatHashrate(avg)}</span>
          </div>
          <div>
            <span className="modal__stat-label">Пик</span>
            <span className="modal__stat-value">{formatHashrate(peak)}</span>
          </div>
          <div>
            <span className="modal__stat-label">Всего хешей</span>
            <span className="modal__stat-value">{formatCompact(worker.totalHash)}</span>
          </div>
          <div>
            <span className="modal__stat-label">Доля</span>
            <span className="modal__stat-value">{(worker.poolShare * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="modal__chart">
          {loading && <div className="chart-empty">Загрузка графика…</div>}
          {error && <div className="chart-empty error">{error}</div>}
          {!loading && !error && (
            <HashrateChart data={chart} color="#5b9dff" gradientId="workerGradient" height={240} />
          )}
        </div>
      </div>
    </div>
  );
}
