// Производные типы данных для интерфейса.

export type WorkerStatus = 'online' | 'stale';

export interface Worker {
  name: string;
  hash: number; // текущий хешрейт H/s (0, если сейчас не репортит)
  totalHash: number; // суммарно отправлено хешей
  lts: number | null; // last time seen, unix seconds
  firstSeen: number; // unix ms, 0 = существовал до начала мониторинга
  status: WorkerStatus; // online / stale (не появлялся > порога)
  isNew: boolean; // появился недавно (в окне «новый»)
  isReporting: boolean; // присутствует в текущем ответе allWorkers
  inactiveSec: number | null; // сколько секунд назад был активен
  poolShare: number; // доля в общем хешрейте воркеров (0..1)
}

export interface Summary {
  totalHashrate: number; // H/s — общий (global) текущий
  workersTotal: number;
  online: number;
  stale: number;
  newCount: number;
  validShares: number;
  invalidShares: number;
  amtDue: number;
  amtPaid: number;
  totalHashes: number;
  lastShare: number | null; // unix seconds
}
