// Локальное отслеживание истории воркеров (для статусов «новый» и «пропал»).
// API не отдаёт время первого появления, поэтому храним его сами в localStorage,
// привязывая к адресу майнера.

export interface WorkerHistoryEntry {
  firstSeen: number; // unix ms — когда воркер впервые замечен этим монитором
  lastSeenLts: number; // unix seconds — максимальный lts, что мы наблюдали
  lastHash: number; // последний известный хешрейт
}

export type WorkerHistory = Record<string, WorkerHistoryEntry>;

const PREFIX = 'sxmr-monitor:history:';

function key(address: string): string {
  return PREFIX + address;
}

export function loadHistory(address: string): WorkerHistory {
  try {
    const raw = localStorage.getItem(key(address));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WorkerHistory;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveHistory(address: string, history: WorkerHistory): void {
  try {
    localStorage.setItem(key(address), JSON.stringify(history));
  } catch {
    /* квота переполнена или приватный режим — не критично */
  }
}

export function resetHistory(address: string): void {
  try {
    localStorage.removeItem(key(address));
  } catch {
    /* ignore */
  }
}
