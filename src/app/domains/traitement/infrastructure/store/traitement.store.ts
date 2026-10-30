import { Service, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, of } from 'rxjs';
import { SessionService } from '../../../../core/services/session.service';
import {
  ApiDossier,
  ApiDossierDetail,
  ApiTransition,
  routedFromApi,
} from '../../../dossiers/domain/entities/dossier-api.entity';
import { RoutedDossier } from '../../../dossiers/domain/entities/dossier.entity';
import { MemberFunctions } from '../../../dossiers/domain/routing';
import { DossierAction, actionCodeTo, targetOf } from '../../../dossiers/domain/workflow';
import { ApiMembre, ApiRepartition, TraitementApi } from '../api/traitement.api';

const NO_FUNCTION: MemberFunctions = {
  traiter: false,
  pool: false,
  affecter: false,
  rechercher: false,
};

/** Fiche d'un dossier et passages du circuit que son gestionnaire peut faire. */
export interface DossierFiche {
  dossier: RoutedDossier;
  actions: ApiTransition[];
}

/**
 * Entité de traitement de l'utilisateur, tenue par l'API : sa répartition (mode, équipe, droits) et ses
 * portefeuilles (mes dossiers, pool, bac du répartiteur, tous les dossiers pour le droit « Rechercher »).
 */
@Service()
export class TraitementStore {
  private readonly api = inject(TraitementApi);
  private readonly session = inject(SessionService);

  readonly repartition = signal<ApiRepartition | null>(null);
  readonly mine = signal<RoutedDossier[]>([]);
  readonly pool = signal<RoutedDossier[]>([]);
  readonly bac = signal<RoutedDossier[]>([]);
  readonly entity = signal<RoutedDossier[]>([]);

  /** Membre de l'équipe correspondant à l'utilisateur connecté. */
  readonly me = computed(
    () =>
      this.repartition()?.membres.find(
        (membre) => membre.utilisateurId === this.session.account()?.id,
      ) ?? null,
  );

  readonly functions = computed<MemberFunctions>(() => {
    const droits = this.me()?.droits ?? [];
    return droits.length
      ? {
          traiter: droits.includes('Traiter'),
          pool: droits.includes("S'attribuer"),
          affecter: droits.includes('Affecter'),
          rechercher: droits.includes('Rechercher'),
        }
      : NO_FUNCTION;
  });

  /** Équipe de l'entité, en prénom et nom. */
  readonly team = computed(() => (this.repartition()?.membres ?? []).map(nomComplet));

  private loading: Promise<void> | null = null;

  /** Chargement en cours ou terminé ; lance le premier chargement si besoin (gardes des routes). */
  ready(): Promise<void> {
    return this.loading ?? this.load();
  }

  load(): Promise<void> {
    this.loading = this.fetch();
    return this.loading;
  }

  private async fetch(): Promise<void> {
    const entiteId = this.session.account()?.entityId;
    if (!entiteId) {
      return;
    }
    this.repartition.set(await firstValueFrom(this.api.repartition(entiteId)));
    const functions = this.functions();
    const [mine, pool, bac, entity] = await Promise.all([
      this.list(this.api.mesDossiers()),
      functions.pool ? this.list(this.api.pool()) : [],
      functions.affecter ? this.list(this.api.bac()) : [],
      functions.rechercher ? this.list(this.api.recherche()) : [],
    ]);
    this.mine.set(mine);
    this.pool.set(pool);
    this.bac.set(bac);
    this.entity.set(entity);
  }

  async fiche(id: string): Promise<DossierFiche> {
    const detail = await firstValueFrom(this.api.dossier(id));
    return { dossier: this.withGestionnaire(routedFromApi(detail)), actions: detail.actions };
  }

  /** Applique une action de traitement ; rend le message de compte rendu. */
  async act(dossier: RoutedDossier, action: DossierAction): Promise<string> {
    await firstValueFrom(this.call(dossier, action));
    await this.load();
    return `Dossier ${dossier.ref} : ${targetOf(action)}.`;
  }

  async take(id: string): Promise<void> {
    await firstValueFrom(this.api.prendre(id));
    await this.load();
  }

  /** Attribue (ou réattribue) un dossier au membre désigné par son nom. */
  async assign(id: string, gestionnaire: string, commentaire?: string): Promise<void> {
    const membre = this.repartition()?.membres.find(
      (candidate) => nomComplet(candidate) === gestionnaire,
    );
    if (!membre) {
      throw new Error(`Gestionnaire inconnu : ${gestionnaire}`);
    }
    await firstValueFrom(this.api.affecter(id, membre.utilisateurId, commentaire));
    await this.load();
  }

  private call(dossier: RoutedDossier, action: DossierAction): Observable<ApiDossier> {
    switch (action.kind) {
      case 'rejet_info':
        return this.api.demanderDocuments(dossier.id, action.docs, action.note);
      case 'retour_noneligible':
      case 'retour_docs':
        return this.api.retourner(dossier.id, [], action.reason);
      default: {
        const code = actionCodeTo(dossier, targetOf(action));
        return code ? this.api.agir(dossier.id, code) : of(dossier as unknown as ApiDossier);
      }
    }
  }

  private async list(source: Observable<ApiDossier[]>): Promise<RoutedDossier[]> {
    const dossiers = await firstValueFrom(source);
    return dossiers.map((dossier) => this.withGestionnaire(routedFromApi(empty(dossier))));
  }

  /** Nom du gestionnaire en charge, lu dans l'équipe de l'entité. */
  private withGestionnaire(dossier: RoutedDossier): RoutedDossier {
    if (dossier.gest) {
      return dossier;
    }
    const membre = this.repartition()?.membres.find(
      (candidate) => candidate.utilisateurId === dossier.gestId,
    );
    return membre ? { ...dossier, gest: nomComplet(membre) } : dossier;
  }
}

function nomComplet(membre: ApiMembre): string {
  return `${membre.prenom} ${membre.nom}`.trim();
}

/** Détail réduit au dossier, pour les listes (sans historique ni pièces). */
function empty(dossier: ApiDossier): ApiDossierDetail {
  return { dossier, actions: [], suspens: null, retour: null, pieces: [], historique: [] };
}
