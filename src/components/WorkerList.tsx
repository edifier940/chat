import { formatCompact, formatHashrate, formatRelative } from '../format';
import type { Worker } from '../types';

interface WorkerListProps {
  workers: Worker[];
  now: number;
  onSelect: (name: string) => void;
}

function StatusDot({ worker }: { worker: Worker }) {
  const cls = worker.status === 'online' ? 'online' : 'stale';
  const title =
    worker.status === 'online'
      ? 'Онлайн'
      : 'Не появлялся дольше порога';
  return <span className={`dot dot--${cls}`} title={title} />;
}

export function WorkerList({ workers, now, onSelect }: WorkerListProps) {
  if (workers.length === 0) {
    return <div className="worker-empty">Воркеры не найдены — попробуйте изменить фильтр или поиск.</div>;
  }

  return (
    <div className="worker-table" role="table">
      <div className="worker-table__head" role="row">
        <span>Воркер</span>
        <span>Хешрейт</span>
        <span className="col-share">Доля</span>
        <span className="col-total">Всего хешей</span>
        <span>Активность</span>
      </div>
      <div className="worker-table__body">
        {workers.map((w) => (
          <button
            key={w.name}
            className={`worker-row ${w.status === 'stale' ? 'is-stale' : ''}`}
            role="row"
            onClick={() => onSelect(w.name)}
          >
            <span className="worker-row__name" role="cell">
              <StatusDot worker={w} />
              <span className="worker-row__title">{w.name}</span>
              {w.isNew && <span className="badge badge--new">NEW</span>}
              {w.status === 'stale' && <span className="badge badge--stale">пропал</span>}
            </span>

            <span className="worker-row__hash" role="cell">
              {formatHashrate(w.hash)}
            </span>

            <span className="worker-row__share col-share" role="cell">
              <span className="share-bar">
                <span
                  className="share-bar__fill"
                  style={{ width: `${Math.min(100, w.poolShare * 100).toFixed(1)}%` }}
                />
              </span>
              <span className="share-bar__pct">{(w.poolShare * 100).toFixed(1)}%</span>
            </span>

            <span className="worker-row__total col-total" role="cell">
              {formatCompact(w.totalHash)}
            </span>

            <span className="worker-row__seen" role="cell">
              {formatRelative(w.lts, now)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
