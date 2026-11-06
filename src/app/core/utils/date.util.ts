const pad = (value: number): string => String(value).padStart(2, '0');

let dayOffset = 0;

export function setDayOffset(days: number): void {
  dayOffset = days;
}

function now(): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date;
}

export function nowIso(): string {
  return now().toISOString();
}

export function todayIsoDate(): string {
  return toIsoDate(now());
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDate(iso: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatTime(iso: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(iso: string): string {
  return iso ? `${formatDate(iso)} à ${formatTime(iso)}` : '—';
}

export function isoDateToFr(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function formatStamp(iso: string): string {
  return iso ? `${formatDate(iso)} ${formatTime(iso)}` : '—';
}

export function isoDateInDays(days: number): string {
  const date = now();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
