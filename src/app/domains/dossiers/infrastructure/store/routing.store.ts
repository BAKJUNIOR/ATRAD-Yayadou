import { Service, inject, signal } from '@angular/core';
import { StorageService } from '../../../../core/services/storage.service';
import { entityCode } from '../../domain/referentiel';
import {
  EntitySettings,
  RoutingConfig,
  defaultRouting,
  setRoutingConfig,
} from '../../domain/routing';
import { ReferentielStore } from './referentiel.store';

const ROUTING_KEY = 'atrad_routing_v1';

/**
 * Paramétrage du routage et de l'affectation, modifiable par l'administrateur.
 * Conservé dans le navigateur en attendant l'API ; s'applique aux prochaines réceptions.
 */
@Service()
export class RoutingStore {
  private readonly storage = inject(StorageService);
  // Le référentiel (jeu de données, entités) doit être en place avant les réglages par défaut.
  private readonly referentiel = inject(ReferentielStore);

  private readonly current = signal<RoutingConfig>(this.load());

  readonly config = this.current.asReadonly();

  constructor() {
    setRoutingConfig(this.current());
  }

  save(config: RoutingConfig): void {
    const copy = structuredClone(config);
    setRoutingConfig(copy);
    this.current.set(copy);
    this.storage.set(ROUTING_KEY, copy);
  }

  reset(): void {
    this.storage.remove(ROUTING_KEY);
    const defaults = defaultRouting();
    setRoutingConfig(defaults);
    this.current.set(defaults);
  }

  /**
   * Paramétrage enregistré, complété par les valeurs par défaut pour ce qui manquerait. Les
   * réglages enregistrés par libellé d'entité (avant les codes) sont repris sous leur code.
   */
  private load(): RoutingConfig {
    const defaults = defaultRouting();
    const stored = this.storage.get<Partial<RoutingConfig>>(ROUTING_KEY);
    const ent: Record<string, EntitySettings> = {};
    for (const [key, settings] of Object.entries(stored?.ent ?? {})) {
      ent[entityCode(key)] = settings;
    }
    return { ent: { ...defaults.ent, ...ent } };
  }
}
