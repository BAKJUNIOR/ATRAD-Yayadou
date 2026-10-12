import { Service, computed, inject, signal } from '@angular/core';
import { setDayOffset, todayIsoDate } from '../utils/date.util';
import { StorageService } from './storage.service';

const OFFSET_KEY = 'atrad_day_offset_v1';

/**
 * Date de démonstration : permet d'avancer le calendrier d'un jour pour faire apparaître les
 * retards. Disparaîtra avec les données réelles.
 */
@Service()
export class DemoClock {
  private readonly storage = inject(StorageService);

  private readonly days = signal(Math.max(0, Number(this.storage.get<number>(OFFSET_KEY)) || 0));

  /** Nombre de jours ajoutés à la date réelle. */
  readonly offset = this.days.asReadonly();
  /** Date du jour (`yyyy-MM-dd`), décalage compris. */
  readonly today = computed(() => {
    this.days();
    return todayIsoDate();
  });

  constructor() {
    setDayOffset(this.days());
  }

  advance(): void {
    this.set(this.days() + 1);
  }

  reset(): void {
    this.set(0);
  }

  private set(days: number): void {
    setDayOffset(days);
    this.days.set(days);
    this.storage.set(OFFSET_KEY, days);
  }
}
