export type StatusFilter = 'all' | 'online' | 'new' | 'stale';
export type SortField = 'hash' | 'name' | 'lts' | 'totalHash' | 'firstSeen';
export type SortDir = 'asc' | 'desc';

interface ToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  filter: StatusFilter;
  onFilter: (v: StatusFilter) => void;
  sortField: SortField;
  onSortField: (v: SortField) => void;
  sortDir: SortDir;
  onToggleDir: () => void;
  counts: Record<StatusFilter, number>;
  shown: number;
}

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'online', label: 'Онлайн' },
  { key: 'new', label: 'Новые' },
  { key: 'stale', label: 'Пропали' },
];

const SORTS: { key: SortField; label: string }[] = [
  { key: 'hash', label: 'Хешрейт' },
  { key: 'name', label: 'Имя' },
  { key: 'lts', label: 'Последняя активность' },
  { key: 'totalHash', label: 'Всего хешей' },
  { key: 'firstSeen', label: 'Дата появления' },
];

export function Toolbar({
  search,
  onSearch,
  filter,
  onFilter,
  sortField,
  onSortField,
  sortDir,
  onToggleDir,
  counts,
  shown,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar__search">
        <svg viewBox="0 0 24 24" className="toolbar__search-icon" aria-hidden>
          <path
            d="M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          placeholder="Поиск воркера по имени…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        {search && (
          <button className="toolbar__clear" onClick={() => onSearch('')} aria-label="Очистить">
            ×
          </button>
        )}
      </div>

      <div className="toolbar__filters" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            className={`chip chip--${f.key} ${filter === f.key ? 'is-active' : ''}`}
            onClick={() => onFilter(f.key)}
          >
            {f.label}
            <span className="chip__count">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar__sort">
        <label>
          Сортировка
          <select value={sortField} onChange={(e) => onSortField(e.target.value as SortField)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="toolbar__dir"
          onClick={onToggleDir}
          title={sortDir === 'asc' ? 'По возрастанию' : 'По убыванию'}
          aria-label="Направление сортировки"
        >
          {sortDir === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="toolbar__shown">Показано: {shown}</div>
    </div>
  );
}
