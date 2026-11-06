import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Referentiel, emptyReferentiel, setReferentiel } from '../../domain/referentiel';
import { syncEntites } from '../../domain/routing';
import { ReferentielApi } from '../api/referentiel.api';

const LEGACY_KEYS = [
  'atrad_referentiel_v1',
  'atrad_routing_v1',
  'atrad_dataset_v1',
  'atrad_live_data_v1',
];

@Service()
export class ReferentielStore {
  private readonly api = inject(ReferentielApi);

  private readonly current = signal<Referentiel>(emptyReferentiel());

  readonly value = this.current.asReadonly();

  constructor() {
    try {
      LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      // Stockage indisponible : rien à effacer.
    }
    this.publish(this.current());
  }

  async refresh(): Promise<void> {
    try {
      const fromApi = await firstValueFrom(this.api.referentiel());
      this.save(fromApi);
    } catch {
      // Paramétrage précédent conservé.
    }
  }

  save(patch: Partial<Referentiel>): void {
    const next = structuredClone({ ...this.current(), ...patch });
    this.publish(next);
    this.current.set(next);
  }

  private publish(referentiel: Referentiel): void {
    setReferentiel(referentiel);
    syncEntites();
  }
}
