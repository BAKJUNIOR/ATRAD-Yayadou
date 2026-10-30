import { Service, computed, signal } from '@angular/core';
import { setDayOffset, todayIsoDate } from '../utils/date.util';

/** Ancien décalage de la date de démonstration, effacé au démarrage. */
const LEGACY_OFFSET_KEY = 'atrad_day_offset_v1';

/** Date du jour réelle (`yyyy-MM-dd`), lue par les écrans qui calculent des délais. */
@Service()
export class Clock {
  private readonly tick = signal(0);

  /** Date du jour (`yyyy-MM-dd`). */
  readonly today = computed(() => {
    this.tick();
    return todayIsoDate();
  });

  constructor() {
    setDayOffset(0);
    try {
      localStorage.removeItem(LEGACY_OFFSET_KEY);
    } catch {
      // Rien à effacer si le stockage est indisponible.
    }
  }
}
