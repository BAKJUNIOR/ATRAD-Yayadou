import { Service, computed, inject } from '@angular/core';
import { Clock } from '../../../core/services/clock.service';
import { SessionService } from '../../../core/services/session.service';
import { entityCode } from '../../dossiers/domain/referentiel';
import { AssignmentMode, MODE_LABEL, shortEntity } from '../../dossiers/domain/routing';
import { ApiModeRepartition } from '../infrastructure/api/traitement.api';
import { TraitementStore } from '../infrastructure/store/traitement.store';

const MODE_OF: Record<ApiModeRepartition, AssignmentMode> = {
  AUTOMATIQUE: 'auto',
  POOL: 'pool',
  REPARTITEUR: 'disp',
};

/**
 * Point de vue de l'agent de traitement connecté : son entité, ses droits et ses portefeuilles, lus dans l'API
 * (`load()`).
 */
@Service()
export class TraitementContext {
  private readonly session = inject(SessionService);
  private readonly store = inject(TraitementStore);
  private readonly clock = inject(Clock);

  /** Date du jour (`yyyy-MM-dd`). */
  get today(): string {
    return this.clock.today();
  }

  /** Entité de l'agent, au format `Nom (CODE)`. */
  readonly entite = computed(() => this.session.account()?.entity ?? '');
  readonly entiteShort = computed(() => shortEntity(this.entite()));
  readonly team = this.store.team;
  readonly user = computed(() => this.session.account()?.name ?? '');
  /** Signature des opérations : `Fatou Bamba — ET-007`. */
  readonly signature = computed(() => `${this.user()} — ${entityCode(this.entite())}`);

  readonly mode = computed<AssignmentMode>(
    () => MODE_OF[this.store.repartition()?.mode ?? 'AUTOMATIQUE'],
  );
  readonly modeLabel = computed(() => MODE_LABEL[this.mode()]);
  readonly functions = this.store.functions;

  /** Tous les dossiers de l'entité pour le droit « Rechercher », sinon ceux de l'agent. */
  readonly entityDossiers = computed(() =>
    this.functions().rechercher ? this.store.entity() : this.store.mine(),
  );
  readonly myDossiers = this.store.mine;
  /** Dossiers en attente d'un gestionnaire : pool partagé ou bac du répartiteur. */
  readonly poolDossiers = this.store.pool;
  readonly bacDossiers = this.store.bac;

  /** Recharge l'équipe et les portefeuilles ; une erreur est déjà signalée par l'intercepteur. */
  load(): Promise<void> {
    return this.store.load().catch(() => undefined);
  }

  /** Attend que l'équipe et les droits soient lus (gardes des routes). */
  ready(): Promise<void> {
    return this.store.ready().catch(() => undefined);
  }
}
