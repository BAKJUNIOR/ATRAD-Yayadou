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

@Service()
export class TraitementContext {
  private readonly session = inject(SessionService);
  private readonly store = inject(TraitementStore);
  private readonly clock = inject(Clock);

  get today(): string {
    return this.clock.today();
  }

  readonly entite = computed(() => this.session.account()?.entity ?? '');
  readonly entiteShort = computed(() => shortEntity(this.entite()));
  readonly team = this.store.team;
  readonly user = computed(() => this.session.account()?.name ?? '');
  readonly signature = computed(() => `${this.user()} — ${entityCode(this.entite())}`);

  readonly mode = computed<AssignmentMode>(
    () => MODE_OF[this.store.repartition()?.mode ?? 'AUTOMATIQUE'],
  );
  readonly modeLabel = computed(() => MODE_LABEL[this.mode()]);
  readonly functions = this.store.functions;

  readonly entityDossiers = computed(() =>
    this.functions().rechercher ? this.store.entity() : this.store.mine(),
  );
  readonly myDossiers = this.store.mine;
  readonly poolDossiers = this.store.pool;
  readonly bacDossiers = this.store.bac;

  load(): Promise<void> {
    return this.store.load().catch(() => undefined);
  }

  ready(): Promise<void> {
    return this.store.ready().catch(() => undefined);
  }
}
