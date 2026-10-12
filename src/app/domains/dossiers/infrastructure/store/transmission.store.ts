import { Service, computed, effect, inject, signal } from '@angular/core';
import { isoDateInDays, nowIso } from '../../../../core/utils/date.util';
import { StorageService } from '../../../../core/services/storage.service';
import { Account } from '../../../auth/domain/entities/account.entity';
import { ACCUEIL_CENTRAL } from '../../domain/dossier-catalog';
import {
  Dossier,
  DossierData,
  DossierLog,
  RoutedDossier,
} from '../../domain/entities/dossier.entity';
import { Etat } from '../../domain/entities/etat.entity';
import {
  DELAI_PRIORITE,
  ENTITES,
  ENTITY_SETTINGS,
  entityOf,
  shortEntity,
} from '../../domain/routing';

const STORE_KEY = 'atrad_live_data_v1';

interface TransmissionState {
  draft: Dossier[];
  draftCreatedAt: string;
  etats: Etat[];
  /** Dossiers réceptionnés et routés vers leur entité de traitement. */
  dossiers: RoutedDossier[];
  /** Prochain gestionnaire de chaque entité en répartition automatique (tour de rôle). */
  roundRobin: Record<string, number>;
  nextId: number;
  nextRef: number;
  nextEtatRef: number;
}

const INITIAL_STATE: TransmissionState = {
  draft: [],
  draftCreatedAt: '',
  etats: [],
  dossiers: [],
  roundRobin: {},
  nextId: 1,
  nextRef: 88201,
  nextEtatRef: 401,
};

export interface ReceptionResult {
  received: number;
  missing: number;
  /** Répartition des dossiers reçus : `Crédits (1), Réclamations (1)`. */
  routing: string;
}

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
  readonly dossiers = computed(() => this.state().dossiers);
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

  /**
   * Pointe les dossiers d'un état physiquement reçus par l'Accueil. Les dossiers pointés sont
   * routés vers leur entité ; les autres sont marqués « Non reçu » et pourront l'être plus tard.
   */
  receive(etatRef: string, pickedRefs: readonly string[], by: string): ReceptionResult | null {
    const state = this.state();
    const etat = state.etats.find((candidate) => candidate.ref === etatRef);
    if (!etat) {
      return null;
    }
    const remaining = etat.dossiers.filter((dossier) => !dossier.rec);
    const picked = new Set(pickedRefs);
    const received = remaining.filter((dossier) => picked.has(dossier.ref));
    if (!received.length) {
      return null;
    }

    const at = nowIso();
    const dossiers = etat.dossiers.map((dossier) => {
      if (dossier.rec) {
        return dossier;
      }
      return picked.has(dossier.ref)
        ? { ...dossier, rec: { at, by } }
        : { ...dossier, nonRec: dossier.nonRec ?? { at, by } };
    });
    const missing = remaining.length - received.length;
    const updated: Etat = {
      ...etat,
      dossiers,
      receivedAt: etat.receivedAt || at,
      receivedBy: etat.receivedBy || by,
      status: dossiers.every((dossier) => dossier.rec) ? 'Reçu' : 'Reçu partiellement',
      recLog: [
        ...(etat.recLog ?? []),
        { at, by, n: received.length, missing, refs: received.map((dossier) => dossier.ref) },
      ],
    };

    const roundRobin = { ...state.roundRobin };
    const alreadyRouted = new Set(state.dossiers.map((dossier) => dossier.ref));
    const routed = received
      .filter((dossier) => !alreadyRouted.has(dossier.ref))
      .map((dossier) => this.route(dossier, updated, at, roundRobin));

    const counts = new Map<string, number>();
    for (const dossier of routed) {
      const key = shortEntity(dossier.entite);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    this.state.set({
      ...state,
      etats: state.etats.map((candidate) => (candidate.ref === etatRef ? updated : candidate)),
      dossiers: [...state.dossiers, ...routed],
      roundRobin,
    });
    return {
      received: received.length,
      missing,
      routing:
        [...counts].map(([name, count]) => `${name} (${count})`).join(', ') || 'aucun dossier',
    };
  }

  /** Confirme le renvoi à leur agence de dossiers retournés par une entité de traitement. */
  renvoyer(ids: readonly number[], by: string): RoutedDossier[] {
    const at = nowIso();
    const targets = this.state().dossiers.filter(
      (dossier) => ids.includes(dossier.id) && !dossier.renvoyeAt,
    );
    if (!targets.length) {
      return [];
    }
    const done = new Set(targets.map((dossier) => dossier.id));
    this.state.update((state) => ({
      ...state,
      dossiers: state.dossiers.map((dossier) => {
        if (!done.has(dossier.id)) {
          return dossier;
        }
        const reason = dossier.docsRetAt
          ? ` · document(s) manquant(s) : ${dossier.complements || '—'}`
          : ` · motif : ${dossier.rejectReason || '—'}`;
        return {
          ...dossier,
          status: 'Retourné en agence',
          renvoyeAt: at,
          renvoyeBy: by,
          log: [
            ...dossier.log,
            {
              at,
              who: by,
              label: `Changement de statut : ${dossier.status} → Retourné en agence · retour confirmé par l'Accueil (${dossier.agence})${reason}`,
              tone: 'success',
            },
          ],
        };
      }),
    }));
    return targets;
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

  /** Route un dossier reçu vers son entité et l'affecte selon le mode de répartition de celle-ci. */
  private route(
    dossier: Dossier,
    etat: Etat,
    at: string,
    roundRobin: Record<string, number>,
  ): RoutedDossier {
    const entite = entityOf(dossier.type) || ENTITES[0].name;
    const days = DELAI_PRIORITE[dossier.prio];
    const routed: RoutedDossier = {
      ...dossier,
      status: 'Reçu',
      agence: `${etat.agence} (${etat.code})`,
      etat: etat.ref,
      entite,
      affecte: at,
      affectedBy: 'Routage automatique',
      echeanceIso: isoDateInDays(days),
      delai: `${days} j (priorité ${dossier.prio.toLowerCase()})`,
      gest: '',
      gestAt: '',
      log: [...dossier.log],
    };

    const settings = ENTITY_SETTINGS[entite];
    if (settings?.mode === 'disp' || settings?.mode === 'pool') {
      const place = settings.mode === 'disp' ? 'le bac de répartition' : 'le pool de dossiers';
      routed.log.push({
        at,
        who: 'Système',
        label: `Déposé dans ${place} de l'entité`,
        tone: 'info',
      });
      return routed;
    }
    if (!settings?.team.length) {
      return routed;
    }
    const index = (roundRobin[entite] ?? 0) % settings.team.length;
    roundRobin[entite] = (index + 1) % settings.team.length;
    const gestionnaire = settings.team[index];
    routed.gest = gestionnaire;
    routed.gestAt = at;
    routed.status = 'En cours';
    routed.log.push({
      at,
      who: 'Répartition automatique',
      label: `Affectation automatique (tour de rôle) : ${gestionnaire}`,
      tone: 'brand',
    });
    return routed;
  }

  private etatRef(sequence: number): string {
    return `ET-${new Date().getFullYear()}-0${sequence}`;
  }
}
