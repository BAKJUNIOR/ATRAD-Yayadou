import { Service, computed, inject } from '@angular/core';
import { SessionService } from '../../../core/services/session.service';
import { todayIsoDate } from '../../../core/utils/date.util';
import { entityCode } from '../../../core/utils/text.util';
import {
  ENTITES,
  ENTITY_SETTINGS,
  MODE_LABEL,
  functionsOf,
  shortEntity,
} from '../../dossiers/domain/routing';
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

  readonly today = todayIsoDate();

  /** Entité de l'agent ; à défaut de correspondance, la première du référentiel. */
  readonly entite = computed(() => {
    const entity = this.session.account()?.entity ?? '';
    return ENTITES.some((candidate) => candidate.name === entity) ? entity : ENTITES[0].name;
  });
  readonly entiteShort = computed(() => shortEntity(this.entite()));
  readonly team = computed(() => ENTITY_SETTINGS[this.entite()]?.team ?? []);

  /** Membre de l'équipe incarné : l'utilisateur connecté s'il en fait partie, sinon le premier. */
  readonly user = computed(() => {
    const name = this.session.account()?.name ?? '';
    return this.team().includes(name) ? name : (this.team()[0] ?? name);
  });
  /** Signature des opérations : `Fatou Bamba — ET-007`. */
  readonly signature = computed(() => `${this.user()} — ${entityCode(this.entite())}`);

  readonly mode = computed(() => ENTITY_SETTINGS[this.entite()]?.mode ?? 'auto');
  readonly modeLabel = computed(() => MODE_LABEL[this.mode()]);
  readonly functions = computed(() => functionsOf(this.user(), this.entite()));

  /** Dossiers de l'entité, puis ceux du membre incarné. */
  readonly entityDossiers = computed(() =>
    this.store.dossiers().filter((dossier) => dossier.entite === this.entite()),
  );
  readonly myDossiers = computed(() =>
    this.entityDossiers().filter((dossier) => dossier.gest === this.user()),
  );

  setEntite(entite: string): void {
    this.impersonate(entite, ENTITY_SETTINGS[entite]?.team[0] ?? this.user());
  }

  setUser(user: string): void {
    this.impersonate(this.entite(), user);
  }

  private impersonate(entite: string, user: string): void {
    const account = this.session.account();
    if (!account) {
      return;
    }
    this.session.signIn({
      ...account,
      name: user,
      entity: entite,
      roleLabel: `Agent entité de traitement — ${shortEntity(entite)}`,
    });
  }
}
