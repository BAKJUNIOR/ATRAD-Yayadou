import { Service, computed, signal } from '@angular/core';
import { setDayOffset, todayIsoDate } from '../utils/date.util';

const LEGACY_OFFSET_KEY = 'atrad_day_offset_v1';

@Service()
export class Clock {
  private readonly tick = signal(0);

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
