import { Service, computed, effect, inject, signal } from '@angular/core';
import { formatStamp, isoDateInDays, isoDateToFr, nowIso } from '../../../../core/utils/date.util';
import { StorageService } from '../../../../core/services/storage.service';
import { Account } from '../../../auth/domain/entities/account.entity';
import {
  Dossier,
  DossierData,
  DossierLog,
  RoutedDossier,
} from '../../domain/entities/dossier.entity';
import { Etat } from '../../domain/entities/etat.entity';
import {
  entityCode,
  entityLabel,
  draftGroups,
  normalizeEntity,
  recepOf,
} from '../../domain/referentiel';
import { DELAI_PRIORITE, entitySettings, entityOf, shortEntity } from '../../domain/routing';
import { ReferentielStore } from './referentiel.store';
import {
  ATTENTE_DOCS,
  DOC_DELAI_JOURS,
  DossierAction,
  isLocked,
  nextStatuses,
  targetOf,
} from '../../domain/workflow';

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

export type ReceptionResult =
  | {
      ok: true;
      received: number;
      missing: number;
      /** Répartition des dossiers reçus : `Crédits (1), Réclamations (1)`. */
      routing: string;
      /** Tous les dossiers reçus sont traités par l'entité réceptrice elle-même. */
      allDirect: boolean;
    }
  | { ok: false; error: string };

/** Issue d'une opération sur un dossier : message à afficher, et succès ou refus. */
export interface OperationResult {
  ok: boolean;
  message: string;
}

export type TransmitResult = { ok: true; etats: Etat[] } | { ok: false; error: string };

/**
 * Dossiers et états de transmission, conservés dans le navigateur.
 * Tient lieu de backend le temps de construire les écrans : chaque méthode correspond à un
 * futur appel d'API (`infrastructure/api/`).
 */
@Service()
export class TransmissionStore {
  private readonly storage = inject(StorageService);
  // Le référentiel doit être en place pour remettre à jour les libellés d'entités.
  private readonly referentiel = inject(ReferentielStore);

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
    this.normalizeEntities();
    effect(() => this.storage.set(STORE_KEY, this.state()));
  }

  /**
   * Remet à jour le libellé des entités de traitement (renommées par l'administrateur) dans les
   * dossiers et les états.
   */
  normalizeEntities(): void {
    const fix = <T extends { entite?: string }>(dossier: T): T =>
      dossier.entite && normalizeEntity(dossier.entite) !== dossier.entite
        ? { ...dossier, entite: normalizeEntity(dossier.entite) }
        : dossier;
    const state = this.state();
    const next: TransmissionState = {
      ...state,
      dossiers: state.dossiers.map(fix),
      etats: state.etats.map((etat) => ({ ...etat, dossiers: etat.dossiers.map(fix) })),
    };
    if (JSON.stringify(next) !== JSON.stringify(state)) {
      this.state.set(next);
    }
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

  /**
   * Valide l'état en cours et le transmet : un état par type d'état, chacun vers son entité
   * réceptrice. Action définitive.
   */
  transmit(emetteur: Account, etatTypeId: string): TransmitResult {
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

    const { groups, miss } = draftGroups(state.draft, entityCode(emetteur.entity), etatTypeId);
    if (miss.length) {
      return {
        ok: false,
        error: `Transmission bloquée : ${miss.map((d) => `${d.ref} (${d.type})`).join(', ')} n'appartient à aucun type d'état autorisé pour votre entité.`,
      };
    }

    const [, agence, code] = emetteur.entity.match(/^(.*) \(([^)]+)\)$/) ?? [
      null,
      emetteur.entity,
      '',
    ];
    const sentAt = nowIso();
    let etatNumber = state.nextEtatRef;
    const etats = groups.map(({ etatType, dossiers }): Etat => {
      while (state.etats.some((etat) => etat.ref === this.etatRef(etatNumber))) {
        etatNumber++;
      }
      const types = [...new Set(dossiers.map((dossier) => dossier.type))];
      const ref = this.etatRef(etatNumber);
      etatNumber++;
      return {
        ref,
        agence: agence ?? emetteur.entity,
        code: code ?? '',
        type: types.length > 1 ? `Mixte (${types.length} types)` : types[0],
        createdAt: state.draftCreatedAt || sentAt,
        sentAt,
        status: 'Transmis',
        receivedAt: '',
        emetteur: emetteur.name,
        etType: etatType.id,
        etTypeNom: etatType.nom,
        recep: etatType.recep,
        dest: entityLabel(etatType.recep),
        dossiers: dossiers.map((dossier) => ({
          ...dossier,
          status: 'Transmis',
          transmisAt: sentAt,
        })),
        prints: [],
      };
    });

    this.state.set({
      ...state,
      etats: [...state.etats, ...etats],
      draft: [],
      draftCreatedAt: '',
      nextEtatRef: etatNumber,
    });
    return { ok: true, etats };
  }

  /**
   * Pointe les dossiers d'un état physiquement reçus par son entité réceptrice (`recepCode`). Les
   * dossiers pointés sont dispatchés vers leur entité de traitement, ou pris en charge directement
   * quand la réceptrice les traite elle-même ; les autres sont marqués « Non reçu » et pourront
   * l'être plus tard.
   */
  receive(
    etatRef: string,
    pickedRefs: readonly string[],
    by: string,
    recepCode: string,
  ): ReceptionResult {
    const state = this.state();
    const etat = state.etats.find((candidate) => candidate.ref === etatRef);
    if (!etat) {
      return { ok: false, error: 'État introuvable.' };
    }
    const remaining = etat.dossiers.filter((dossier) => !dossier.rec);
    const picked = new Set(pickedRefs);
    const received = remaining.filter((dossier) => picked.has(dossier.ref));
    if (!received.length) {
      return { ok: false, error: 'Cochez au moins un dossier reçu.' };
    }
    if (recepOf(etat) !== recepCode) {
      return {
        ok: false,
        error: `Réception impossible : cet état est destiné à ${entityLabel(recepOf(etat))}.`,
      };
    }
    const orphans = received.filter((dossier) => !entityOf(dossier.type));
    if (orphans.length) {
      return {
        ok: false,
        error: `Réception bloquée : aucune entité de traitement n'est paramétrée pour ${orphans.map((d) => `${d.ref} (${d.type})`).join(', ')}. Complétez Administration › Routage & affectation.`,
      };
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
      .map((dossier) => this.route(dossier, updated, at, roundRobin, by));

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
      ok: true,
      received: received.length,
      missing,
      routing:
        [...counts].map(([name, count]) => `${name} (${count})`).join(', ') || 'aucun dossier',
      allDirect: routed.length > 0 && routed.every((dossier) => dossier.direct),
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
              label: `Changement de statut : ${dossier.status} → Retourné en agence · retour confirmé par l'entité réceptrice (${dossier.agence})${reason}`,
              tone: 'success',
            },
          ],
        };
      }),
    }));
    return targets;
  }

  /** Affecte un dossier à un gestionnaire de son entité (répartiteur ou réaffectation). */
  assign(id: number, gestionnaire: string, by: string): OperationResult {
    const dossier = this.state().dossiers.find((candidate) => candidate.id === id);
    if (!dossier) {
      return { ok: false, message: 'Dossier introuvable.' };
    }
    if (isLocked(dossier)) {
      return {
        ok: false,
        message:
          dossier.status === 'Clôturé'
            ? 'Dossier clôturé : aucune modification possible.'
            : "Dossier renvoyé vers l'entité réceptrice : aucune modification possible.",
      };
    }
    const at = nowIso();
    this.patchDossier(
      id,
      {
        gest: gestionnaire,
        gestAt: at,
        status: dossier.status === 'Reçu' ? 'En cours' : dossier.status,
      },
      { at, who: by, label: `Affectation : ${gestionnaire}`, tone: 'brand' },
    );
    return { ok: true, message: `Dossier affecté à ${gestionnaire} — notification envoyée.` };
  }

  /** Transfère un dossier en cours à un autre gestionnaire de l'entité. */
  reassign(id: number, gestionnaire: string, motif: string, by: string): OperationResult {
    const dossier = this.state().dossiers.find((candidate) => candidate.id === id);
    if (!dossier || dossier.status !== 'En cours' || !dossier.gest) {
      return { ok: false, message: "Réaffectation impossible : le dossier n'est plus en cours." };
    }
    const at = nowIso();
    const reason = motif.trim() ? ` — motif : ${motif.trim()}` : '';
    this.patchDossier(
      id,
      { gest: gestionnaire, gestAt: at },
      {
        at,
        who: by,
        label: `Réaffecté de ${dossier.gest} à ${gestionnaire}${reason}`,
        tone: 'brand',
      },
    );
    return {
      ok: true,
      message: `${dossier.ref} réaffecté à ${gestionnaire} — notification envoyée.`,
    };
  }

  addComment(id: number, who: string, text: string): void {
    const at = nowIso();
    this.state.update((state) => ({
      ...state,
      dossiers: state.dossiers.map((dossier) =>
        dossier.id === id
          ? { ...dossier, comments: [...(dossier.comments ?? []), { who, at, text }] }
          : dossier,
      ),
    }));
  }

  /** Applique une action de traitement, si le circuit du dossier l'autorise. */
  applyAction(id: number, action: DossierAction, by: string): OperationResult {
    const dossier = this.state().dossiers.find((candidate) => candidate.id === id);
    if (!dossier) {
      return { ok: false, message: 'Dossier introuvable.' };
    }
    if (isLocked(dossier)) {
      return {
        ok: false,
        message:
          dossier.status === 'Clôturé'
            ? 'Dossier clôturé : aucune modification possible.'
            : "Dossier renvoyé vers l'entité réceptrice : aucune action possible.",
      };
    }
    const target = targetOf(action);
    if (!nextStatuses(dossier).includes(target)) {
      return {
        ok: false,
        message: `Transition « ${dossier.status} → ${target} » non autorisée par le circuit « ${dossier.type} ».`,
      };
    }

    const at = nowIso();
    const stamp = formatStamp(at);
    const { ref } = dossier;
    switch (action.kind) {
      case 'statut': {
        const resumed = dossier.status === ATTENTE_DOCS && target === 'En cours';
        this.patchDossier(
          id,
          { status: target, ...(target === 'Traité' ? { closedAt: at, closedBy: by } : {}) },
          {
            at,
            who: by,
            label: resumed
              ? `Documents reçus — reprise du traitement : ${ATTENTE_DOCS} → En cours · pièce(s) : ${(dossier.docsMissing ?? []).join(', ') || '—'}`
              : `Changement de statut : ${dossier.status} → ${target}`,
            tone: target === 'Traité' || resumed ? 'success' : 'brand',
          },
        );
        return {
          ok: true,
          message: resumed
            ? `Documents reçus — traitement de ${ref} repris.`
            : `Dossier ${ref} : statut « ${target} ».`,
        };
      }
      case 'valider':
        this.patchDossier(
          id,
          { status: 'Validé', validatedAt: at, validatedBy: by },
          { at, who: by, label: 'Dossier validé', tone: 'success' },
        );
        return { ok: true, message: `Dossier ${ref} validé le ${stamp}.` };
      case 'cloturer':
        this.patchDossier(
          id,
          { status: 'Clôturé', closedAt: at, closedBy: by },
          {
            at,
            who: by,
            label: 'Dossier clôturé — plus aucune modification possible',
            tone: 'neutral',
          },
        );
        return { ok: true, message: `Dossier ${ref} clôturé le ${stamp}.` };
      case 'retour_noneligible':
        this.patchDossier(
          id,
          {
            status: 'Dossier retourné',
            rejectedAt: at,
            rejectedBy: by,
            rejectReason: action.reason,
            complements: '',
          },
          {
            at,
            who: by,
            label: `Retour pour non-éligibilité, renvoyé vers l'entité réceptrice — motif : ${action.reason}`,
            tone: 'warning',
          },
        );
        return {
          ok: true,
          message: `Dossier ${ref} renvoyé vers l'entité réceptrice (Dossiers retournés).`,
        };
      case 'rejet_info': {
        const deadlineIso = isoDateInDays(DOC_DELAI_JOURS);
        const deadline = isoDateToFr(deadlineIso);
        const note = action.note.trim();
        this.patchDossier(
          id,
          {
            status: ATTENTE_DOCS,
            docsMissing: action.docs,
            docsReqAt: at,
            docsDeadlineIso: deadlineIso,
            docsNote: note,
            rejectReason: 'Document(s) complémentaire(s) manquant(s)',
            complements: action.docs.join(', '),
          },
          {
            at,
            who: by,
            label: `Changement de statut : ${dossier.status} → ${ATTENTE_DOCS} · document(s) attendu(s) : ${action.docs.join(', ')} · à fournir avant le ${deadline}${note ? ` · remarque : ${note}` : ''} · notification envoyée à l'agence (${dossier.agence})`,
            tone: 'warning',
          },
        );
        return {
          ok: true,
          message: `Agence notifiée — document(s) attendu(s) sur ${ref} avant le ${deadline}.`,
        };
      }
      case 'retour_docs': {
        const missing = dossier.docsMissing?.length
          ? dossier.docsMissing
          : dossier.complements
            ? [dossier.complements]
            : [];
        const reason = action.reason.trim();
        this.patchDossier(
          id,
          {
            status: 'Dossier retourné',
            rejectedAt: at,
            rejectedBy: by,
            docsRetAt: at,
            rejectReason: reason || 'Document(s) non fourni(s) dans le délai',
            complements: missing.join(', '),
          },
          {
            at,
            who: by,
            label: `Changement de statut : ${ATTENTE_DOCS} → Dossier retourné · faute de document(s) : ${missing.join(', ') || '—'}${reason ? ` · motif : ${reason}` : ''} · renvoyé vers l'entité réceptrice · agence notifiée`,
            tone: 'danger',
          },
        );
        return {
          ok: true,
          message: `Dossier ${ref} retourné faute de document(s) — visible dans « Dossiers retournés » de l'entité réceptrice.`,
        };
      }
    }
  }

  /** Un membre de l'équipe s'attribue un dossier du pool partagé de son entité. */
  take(id: number, user: string): OperationResult {
    const dossier = this.state().dossiers.find((candidate) => candidate.id === id);
    if (!dossier) {
      return { ok: false, message: 'Dossier introuvable.' };
    }
    if (dossier.gest) {
      return { ok: false, message: `Dossier déjà pris en charge par ${dossier.gest}.` };
    }
    if (isLocked(dossier)) {
      return {
        ok: false,
        message: `Dossier ${dossier.status.toLowerCase()} : aucune prise en charge possible.`,
      };
    }
    const settings = entitySettings(dossier.entite);
    if (settings?.mode !== 'pool') {
      return {
        ok: false,
        message: `L'entité ${shortEntity(dossier.entite)} n'est pas en mode pool : prise en charge impossible.`,
      };
    }
    if (!settings.team.includes(user)) {
      return {
        ok: false,
        message: `${user} ne fait pas partie de l'équipe de ${shortEntity(dossier.entite)}.`,
      };
    }
    const at = nowIso();
    this.patchDossier(
      id,
      { gest: user, gestAt: at, status: dossier.status === 'Reçu' ? 'En cours' : dossier.status },
      { at, who: user, label: `Pris en charge depuis le pool partagé : ${user}`, tone: 'brand' },
    );
    return { ok: true, message: `Vous avez pris en charge ${dossier.ref}.` };
  }

  /** Efface tous les dossiers et états (réinitialisation de la démonstration). */
  reset(): void {
    this.state.set({ ...INITIAL_STATE });
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

  private patchDossier(id: number, patch: Partial<RoutedDossier>, log: DossierLog): void {
    this.state.update((state) => ({
      ...state,
      dossiers: state.dossiers.map((dossier) =>
        dossier.id === id ? { ...dossier, ...patch, log: [...dossier.log, log] } : dossier,
      ),
    }));
  }

  /** Route un dossier reçu vers son entité et l'affecte selon le mode de répartition de celle-ci. */
  private route(
    dossier: Dossier,
    etat: Etat,
    at: string,
    roundRobin: Record<string, number>,
    by: string,
  ): RoutedDossier {
    const entite = entityOf(dossier.type);
    const direct = entityCode(entite) === recepOf(etat);
    const days = DELAI_PRIORITE[dossier.prio];
    const routed: RoutedDossier = {
      ...dossier,
      status: 'Reçu',
      agence: `${etat.agence} (${etat.code})`,
      etat: etat.ref,
      entite,
      affecte: at,
      affectedBy: direct ? 'Réception directe' : 'Routage automatique',
      direct,
      echeanceIso: isoDateInDays(days),
      delai: `${days} j (priorité ${dossier.prio.toLowerCase()})`,
      gest: '',
      gestAt: '',
      log: [
        ...dossier.log,
        direct
          ? { at, who: by, label: `Reçu et pris en charge par ${entite}`, tone: 'brand' }
          : {
              at,
              who: 'Système',
              label: `Reçu par ${entityLabel(recepOf(etat))} et dispatché vers ${entite}`,
              tone: 'info',
            },
      ],
    };

    const settings = entitySettings(entite);
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
