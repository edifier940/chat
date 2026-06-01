// Форматтеры значений для интерфейса.

/** Хешрейт H/s -> человекочитаемая строка. */
export function formatHashrate(hs: number | null | undefined): string {
  if (hs == null || !isFinite(hs) || hs <= 0) return '0 H/s';
  const units = ['H/s', 'kH/s', 'MH/s', 'GH/s', 'TH/s'];
  let value = hs;
  let i = 0;
  while (value >= 1000 && i < units.length - 1) {
    value /= 1000;
    i++;
  }
  const digits = value >= 100 || i === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[i]}`;
}

const PICO = 1e12; // 1 XMR в атомарных единицах

export function formatXmr(atomic: number | null | undefined, digits = 6): string {
  if (atomic == null || !isFinite(atomic)) return '—';
  return `${(atomic / PICO).toFixed(digits)} XMR`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString('ru-RU');
}

/** Большие числа хешей -> компактно (1.2M, 3.4B). */
export function formatCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—';
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Относительное время «сколько назад» от unix-секунд. */
export function formatRelative(unixSeconds: number | null | undefined, now = Date.now()): string {
  if (unixSeconds == null) return 'никогда';
  const diffSec = Math.max(0, Math.floor(now / 1000 - unixSeconds));
  if (diffSec < 5) return 'только что';
  if (diffSec < 60) return `${diffSec} сек назад`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} ${plural(min, 'минуту', 'минуты', 'минут')} назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}

export function formatClock(unixMs: number | null | undefined): string {
  if (unixMs == null) return '—';
  return new Date(unixMs).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

/** Короткий адрес для шапки. */
export function shortAddress(addr: string, head = 8, tail = 6): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
