import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StorageService } from '../../../../core/services/storage.service';
import { activateDataset, dataset } from '../../domain/dossier-catalog';
import { DATASET_KEY, DatasetId, datasetOf, storedDatasetId } from '../../domain/datasets';
import {
  Circuit,
  DEFAULT_VOCABULARY,
  Referentiel,
  defaultReferentiel,
  entityCode,
  setReferentiel,
} from '../../domain/referentiel';
import { syncEntites } from '../../domain/routing';
import { ReferentielApi } from '../api/referentiel.api';

const REFERENTIEL_KEY = 'atrad_referentiel_v1';
/** Routage enregistré avant les types d'état : type de dossier → libellé de l'entité. */
const LEGACY_ROUTING_KEY = 'atrad_routing_v1';

/**
 * Paramétrage de l'administrateur : entités, types d'état, circuits des types de dossier (avec leurs champs et
 * pièces), mode de saisie et vocabulaire. Lu dans l'API après la connexion (`refresh()`) ; la dernière version
 * lue est gardée dans le navigateur pour s'afficher aussitôt au rechargement. Le vocabulaire et les libellés du
 * formulaire viennent encore du jeu de données choisi à la dernière réinitialisation.
 */
@Service()
export class ReferentielStore {
  private readonly storage = inject(StorageService);
  private readonly api = inject(ReferentielApi);

  /** Jeu de données en vigueur jusqu'au prochain rechargement. */
  readonly datasetId: DatasetId = this.activate();

  private readonly current = signal<Referentiel>(this.load());

  readonly value = this.current.asReadonly();

  constructor() {
    this.publish(this.current());
  }

  get datasetLabel(): string {
    return datasetOf(this.datasetId).label;
  }

  /**
   * Remplace le paramétrage par celui de l'API (le vocabulaire est gardé). En cas d'échec, la dernière version lue
   * reste en place et l'erreur a déjà été signalée par l'intercepteur.
   */
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
    this.storage.set(REFERENTIEL_KEY, next);
  }

  /** Revient au paramétrage du jeu actif. */
  reset(): void {
    this.storage.remove(REFERENTIEL_KEY);
    const defaults = defaultReferentiel();
    this.publish(defaults);
    this.current.set(defaults);
  }

  /** Jeu à charger au prochain démarrage (le rechargement de la page l'applique). */
  chooseDataset(id: DatasetId): void {
    try {
      localStorage.setItem(DATASET_KEY, id);
    } catch {
      // Sans stockage, le jeu par défaut sera rechargé.
    }
  }

  private activate(): DatasetId {
    const id = storedDatasetId();
    activateDataset(id);
    return id;
  }

  private publish(referentiel: Referentiel): void {
    setReferentiel(referentiel);
    syncEntites();
  }

  /** Paramétrage enregistré, complété par celui du jeu pour ce qui manquerait. */
  private load(): Referentiel {
    const defaults = defaultReferentiel();
    const stored = this.storage.get<Partial<Referentiel>>(REFERENTIEL_KEY);
    if (!stored) {
      return { ...defaults, circuits: this.withLegacyRouting(defaults.circuits) };
    }
    const dossierTypes = stored.dossierTypes?.length ? stored.dossierTypes : defaults.dossierTypes;
    return {
      entites: stored.entites?.length ? stored.entites : defaults.entites,
      etatTypes: stored.etatTypes ?? defaults.etatTypes,
      dossierTypes,
      circuits: Object.fromEntries(
        dossierTypes.map((type) => [
          type,
          stored.circuits?.[type] ?? defaults.circuits[type] ?? { et: '', trait: '', check: false },
        ]),
      ),
      saisieMode: stored.saisieMode === 'auto' ? 'auto' : 'choix',
      vocab: { ...DEFAULT_VOCABULARY, ...(stored.vocab ?? {}) },
      typeIds: stored.typeIds ?? {},
      typeFields: stored.typeFields ?? {},
      typePieces: stored.typePieces ?? {},
      typeOperations: stored.typeOperations ?? {},
      motifsRetour: stored.motifsRetour ?? [],
    };
  }

  /** Reprend les entités de traitement choisies avec l'ancien écran de routage (jeu neutre). */
  private withLegacyRouting(circuits: Record<string, Circuit>): Record<string, Circuit> {
    const legacy = this.storage.get<{ map?: Record<string, string> }>(LEGACY_ROUTING_KEY);
    if (!legacy?.map || dataset().id !== 'neutre') {
      return circuits;
    }
    const next = { ...circuits };
    for (const [type, label] of Object.entries(legacy.map)) {
      const code = entityCode(label);
      if (next[type] && dataset().entites.some((entite) => entite.code === code && entite.trait)) {
        next[type] = { ...next[type], trait: code };
      }
    }
    return next;
  }
}
