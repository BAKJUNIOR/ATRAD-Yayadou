import { Service, computed, effect, inject, signal } from '@angular/core';
import { nowIso } from '../../../../core/utils/date.util';
import { StorageService } from '../../../../core/services/storage.service';
import { Account } from '../../../auth/domain/entities/account.entity';
import { ACCUEIL_CENTRAL } from '../../domain/dossier-catalog';
import { Dossier, DossierData, DossierLog } from '../../domain/entities/dossier.entity';
import { Etat } from '../../domain/entities/etat.entity';

const STORE_KEY = 'atrad_live_data_v1';

interface TransmissionState {
  draft: Dossier[];
  draftCreatedAt: string;
  etats: Etat[];
  nextId: number;
  nextRef: number;
  nextEtatRef: number;
}

const INITIAL_STATE: TransmissionState = {
  draft: [],
  draftCreatedAt: '',
  etats: [],
  nextId: 1,
  nextRef: 88201,
  nextEtatRef: 401,
};

export type TransmitResult = { ok: true; etat: Etat } | { ok: false; error: string };

/**
 * Dossiers et états de transmission, conservés dans le navigateur.
 * Tient lieu de backend le temps de construire les écrans : chaque méthode correspond à un
 * futur appel d'API (`infrastructure/api/`).
 */
@Service()
export class TransmissionStore {
  private readonly storage = inject(StorageService);

  private readonly state = signal<TransmissionState>({
    ...INITIAL_STATE,
    ...(this.storage.get<Partial<TransmissionState>>(STORE_KEY) ?? {}),
  });

  /** Dossiers de l'état en cours de constitution. */
  readonly draft = computed(() => this.state().draft);
  readonly draftCreatedAt = computed(() => this.state().draftCreatedAt);
  readonly etats = computed(() => this.state().etats);
  /** Référence que portera l'état en cours une fois transmis. */
  readonly draftRef = computed(() => this.etatRef(this.state().nextEtatRef));

  constructor() {
    effect(() => this.storage.set(STORE_KEY, this.state()));
  }

  addDossier(data: DossierData): Dossier {
    const state = this.state();
    const createdAt = nowIso();
    const dossier: Dossier = {
      ...data,
      id: state.nextId,
      ref: `DOS-${state.nextRef}`,
      createdAt,
      log: [],
    };
    this.state.set({
      ...state,
      draft: [...state.draft, dossier],
      draftCreatedAt: state.draft.length ? state.draftCreatedAt : createdAt,
      nextId: state.nextId + 1,
      nextRef: state.nextRef + 1,
    });
    return dossier;
  }

  /** Remplace le contenu d'un dossier de l'état en cours ; sa référence est conservée. */
  updateDossier(id: number, data: DossierData, log: DossierLog): void {
    this.state.update((state) => ({
      ...state,
      draft: state.draft.map((dossier) =>
        dossier.id === id
          ? { ...dossier, ...data, montant: data.montant, log: [...dossier.log, log] }
          : dossier,
      ),
    }));
  }

  removeDossier(id: number): void {
    this.state.update((state) => {
      const draft = state.draft.filter((dossier) => dossier.id !== id);
      return { ...state, draft, draftCreatedAt: draft.length ? state.draftCreatedAt : '' };
    });
  }

  /** Valide l'état en cours et le transmet à l'Accueil central. Action définitive. */
  transmit(emetteur: Account): TransmitResult {
    const state = this.state();
    if (!state.draft.length) {
      return { ok: false, error: 'Ajoutez au moins un dossier avant de transmettre.' };
    }

    const alreadySent = new Set(state.etats.flatMap((etat) => etat.dossiers.map((d) => d.ref)));
    if (state.draft.some((dossier) => alreadySent.has(dossier.ref))) {
      this.state.set({ ...state, draft: state.draft.filter((d) => !alreadySent.has(d.ref)) });
      return {
        ok: false,
        error: 'Transmission refusée : dossier(s) déjà transmis dans un autre état.',
      };
    }

    let etatNumber = state.nextEtatRef;
    while (state.etats.some((etat) => etat.ref === this.etatRef(etatNumber))) {
      etatNumber++;
    }

    const [, agence, code] = emetteur.entity.match(/^(.*) \(([^)]+)\)$/) ?? [
      null,
      emetteur.entity,
      '',
    ];
    const types = [...new Set(state.draft.map((dossier) => dossier.type))];
    const sentAt = nowIso();
    const etat: Etat = {
      ref: this.etatRef(etatNumber),
      agence: agence ?? emetteur.entity,
      code: code ?? '',
      type: types.length > 1 ? `Mixte (${types.length} types)` : types[0],
      createdAt: state.draftCreatedAt || sentAt,
      sentAt,
      status: 'Transmis',
      receivedAt: '',
      emetteur: emetteur.name,
      dest: ACCUEIL_CENTRAL,
      dossiers: state.draft.map((dossier) => ({
        ...dossier,
        status: 'Transmis',
        transmisAt: sentAt,
      })),
      prints: [],
    };

    this.state.set({
      ...state,
      etats: [...state.etats, etat],
      draft: [],
      draftCreatedAt: '',
      nextEtatRef: etatNumber + 1,
    });
    return { ok: true, etat };
  }

  /** Historise une impression du bordereau. */
  recordPrint(ref: string, by: string): void {
    const at = nowIso();
    this.state.update((state) => ({
      ...state,
      etats: state.etats.map((etat) =>
        etat.ref === ref ? { ...etat, prints: [...etat.prints, { at, by }] } : etat,
      ),
    }));
  }

  private etatRef(sequence: number): string {
    return `ET-${new Date().getFullYear()}-0${sequence}`;
  }
}
