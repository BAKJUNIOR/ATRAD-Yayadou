import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { entiteByCode, entites } from '../../../dossiers/domain/referentiel';
import {
  AssignmentMode,
  EntitySettings,
  RoutingConfig,
  setRoutingConfig,
} from '../../../dossiers/domain/routing';
import { ApiModeRepartition } from '../../../traitement/infrastructure/api/traitement.api';
import { AdministrationApi } from '../api/administration.api';
import { UtilisateurApi } from '../api/utilisateur.api';

const MODE_OF: Record<ApiModeRepartition, AssignmentMode> = {
  AUTOMATIQUE: 'auto',
  POOL: 'pool',
  REPARTITEUR: 'disp',
};

const API_MODE: Record<AssignmentMode, ApiModeRepartition> = {
  auto: 'AUTOMATIQUE',
  pool: 'POOL',
  disp: 'REPARTITEUR',
};

/**
 * Répartition interne des entités de traitement, tenue par l'API : mode d'attribution, équipe, répartiteurs et
 * droit de recherche. Les membres sont désignés par leur prénom et nom ; les candidats sont les utilisateurs du
 * profil Traitement.
 */
@Service()
export class RoutingStore {
  private readonly api = inject(AdministrationApi);
  private readonly utilisateurs = inject(UtilisateurApi);

  private readonly current = signal<RoutingConfig>({ ent: {} });
  /** Prénom et nom → identifiant de l'utilisateur dans l'API. */
  private readonly ids = new Map<string, string>();

  readonly config = this.current.asReadonly();
  /** Gestionnaires pouvant faire partie d'une équipe. */
  readonly gestionnaires = signal<string[]>([]);

  async load(): Promise<void> {
    const users = await firstValueFrom(
      this.utilisateurs.rechercher({ profil: 'TRAITEMENT', taille: 500 }),
    );
    for (const user of users.content) {
      this.ids.set(`${user.prenom} ${user.nom}`.trim(), user.id);
    }
    const traitantes = entites().filter((entite) => entite.trait && entite.id);
    const repartitions = await Promise.all(
      traitantes.map((entite) => firstValueFrom(this.api.repartition(entite.id!))),
    );
    const ent: Record<string, EntitySettings> = {};
    repartitions.forEach((repartition, index) => {
      const nom = (membre: { prenom: string; nom: string }) =>
        `${membre.prenom} ${membre.nom}`.trim();
      repartition.membres.forEach((membre) => this.ids.set(nom(membre), membre.utilisateurId));
      ent[traitantes[index].code] = {
        mode: MODE_OF[repartition.mode],
        team: repartition.membres.map(nom),
        dispatchers: repartition.membres.filter((membre) => membre.repartiteur).map(nom),
        searchers: repartition.membres.filter((membre) => membre.droitRecherche).map(nom),
      };
    });
    const config = { ent };
    setRoutingConfig(config);
    this.current.set(config);
    this.gestionnaires.set([...this.ids.keys()].sort((a, b) => a.localeCompare(b)));
  }

  /** Enregistre la répartition d'une entité (par son code) puis relit celles de toutes les entités. */
  async save(code: string, settings: EntitySettings): Promise<void> {
    const entiteId = entiteByCode(code)?.id;
    if (!entiteId) {
      throw new Error(`Entité inconnue : ${code}`);
    }
    await firstValueFrom(
      this.api.modifierRepartition(entiteId, {
        mode: API_MODE[settings.mode],
        membres: settings.team
          .filter((name) => this.ids.has(name))
          .map((name) => ({
            utilisateurId: this.ids.get(name)!,
            repartiteur: settings.dispatchers.includes(name),
            droitRecherche: settings.searchers.includes(name),
          })),
      }),
    );
    await this.load();
  }
}
