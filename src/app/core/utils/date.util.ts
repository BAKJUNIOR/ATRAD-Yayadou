const pad = (value: number): string => String(value).padStart(2, '0');

/** Décalage de la date de démonstration, en jours (voir `DemoClock`). */
let dayOffset = 0;

export function setDayOffset(days: number): void {
  dayOffset = days;
}

/** Instant courant, décalé de la date de démonstration. */
function now(): Date {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date;
}

/** Horodatage courant, au format ISO 8601 (celui que renverra l'API). */
export function nowIso(): string {
  return now().toISOString();
}

/** Date locale du jour au format `yyyy-MM-dd`, comparable aux valeurs d'un `<input type="date">`. */
export function todayIsoDate(): string {
  return toIsoDate(now());
}

/** Date locale au format `yyyy-MM-dd`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `17/09/2026` */
export function formatDate(iso: string): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** `09:12` */
export function formatTime(iso: string): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `17/09/2026 à 09:12` */
export function formatDateTime(iso: string): string {
  return iso ? `${formatDate(iso)} à ${formatTime(iso)}` : '—';
}

/** Convertit `2026-09-17` (champ date) en `17/09/2026`. */
export function isoDateToFr(isoDate: string): string {
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

/** `17/09/2026 09:12` — forme compacte des tableaux et des historiques. */
export function formatStamp(iso: string): string {
  return iso ? `${formatDate(iso)} ${formatTime(iso)}` : '—';
}

/** Date locale au format `yyyy-MM-dd`, décalée de `days` jours. */
export function isoDateInDays(days: number): string {
  const date = now();
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}
