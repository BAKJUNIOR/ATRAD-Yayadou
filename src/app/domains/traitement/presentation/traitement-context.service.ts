import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { DemoClock } from '../../../core/services/demo-clock.service';
import { entityCode } from '../../../core/utils/text.util';
import { entiteOf, normalizeEntity } from '../../dossiers/domain/referentiel';
import {
  ENTITES,
  MODE_LABEL,
  entitySettings,
  functionsOf,
  shortEntity,
} from '../../dossiers/domain/routing';
import { ReferentielStore } from '../../dossiers/infrastructure/store/referentiel.store';
import { RoutingStore } from '../../dossiers/infrastructure/store/routing.store';
import { TransmissionStore } from '../../dossiers/infrastructure/store/transmission.store';

/**
 * Point de vue de l'agent de traitement connecté : son entité, ses fonctions et le portefeuille
 * correspondant. Le sélecteur « Voir en tant que » change d'entité ou de membre pour la
 * démonstration ; il disparaîtra avec l'authentification réelle.
 */
@Service()
export class TraitementContext {
  private readonly session = inject(SessionService);
  private readonly store = inject(TransmissionStore);
  private readonly routing = inject(RoutingStore);
  private readonly referentiel = inject(ReferentielStore);

  /** Réglages de l'entité, tels que paramétrés par l'administrateur. */
  private readonly settings = computed(() => {
    this.routing.config();
    return entitySettings(this.entite());
  });

  private readonly clock = inject(DemoClock);

  /** Date du jour (`yyyy-MM-dd`) ; suit la date de démonstration. */
  get today(): string {
    return this.clock.today();
  }

  /** Entité de l'agent ; à défaut de correspondance, la première du référentiel. */
  readonly entite = computed(() => {
    this.referentiel.value();
    const entity = normalizeEntity(this.session.account()?.entity ?? '');
    return ENTITES.some((candidate) => candidate.name === entity)
      ? entity
      : (ENTITES[0]?.name ?? entity);
  });
  readonly entiteShort = computed(() => shortEntity(this.entite()));
  readonly team = computed(() => this.settings()?.team ?? []);

  /** Membre de l'équipe incarné : l'utilisateur connecté s'il en fait partie, sinon le premier. */
  readonly user = computed(() => {
    const name = this.session.account()?.name ?? '';
    return this.team().includes(name) ? name : (this.team()[0] ?? name);
  });
  /** Signature des opérations : `Fatou Bamba — ET-007`. */
  readonly signature = computed(() => `${this.user()} — ${entityCode(this.entite())}`);

  readonly mode = computed(() => this.settings()?.mode ?? 'auto');
  readonly modeLabel = computed(() => MODE_LABEL[this.mode()]);
  readonly functions = computed(() => {
    this.settings();
    return functionsOf(this.user(), this.entite());
  });

  /** Dossiers de l'entité, puis ceux du membre incarné. */
  readonly entityDossiers = computed(() =>
    this.store.dossiers().filter((dossier) => dossier.entite === this.entite()),
  );
  readonly myDossiers = computed(() =>
    this.entityDossiers().filter((dossier) => dossier.gest === this.user()),
  );

  setEntite(entite: string): void {
    this.impersonate(entite, entitySettings(entite)?.team[0] ?? this.user());
  }

  setUser(user: string): void {
    this.impersonate(this.entite(), user);
  }

  private impersonate(entite: string, user: string): void {
    const account = this.session.account();
    if (!account) {
      return;
    }
    this.session.impersonate({
      ...account,
      name: user,
      entity: entite,
      roleLabel: `${entiteOf(entite)?.recep ? 'Entité réceptrice + traitement' : 'Entité de traitement'} — ${shortEntity(entite)}`,
    });
  }
}
