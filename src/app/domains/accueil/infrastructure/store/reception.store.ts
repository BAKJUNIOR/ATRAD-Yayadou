import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { etatFromApi } from '../../../dossiers/domain/entities/dossier-api.entity';
import { Etat } from '../../../dossiers/domain/entities/etat.entity';
import { EtatApi } from '../../../dossiers/infrastructure/api/etat.api';
import { AccueilApi } from '../api/accueil.api';

/**
 * États destinés à l'entité réceptrice de l'utilisateur, avec leurs dossiers (recherche et pointage), tenus par
 * l'API. Chaque état est relu en détail : la recherche porte aussi sur ses dossiers.
 */
@Service()
export class ReceptionStore {
  private readonly etatApi = inject(EtatApi);
  private readonly accueilApi = inject(AccueilApi);

  private readonly list = signal<Etat[]>([]);
  private readonly loaded = signal(false);

  readonly etats = this.list.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();
  /** Dossiers reçus encore sans gestionnaire, et retours à renvoyer aux agences (pastilles du menu). */
  readonly nonPrisEnCharge = signal(0);
  readonly retoursARenvoyer = signal(0);
  readonly dossiersReceptionnes = signal(0);

  async load(): Promise<void> {
    const [etats, suivi] = await Promise.all([
      firstValueFrom(this.etatApi.recus()),
      firstValueFrom(this.accueilApi.suivi()),
    ]);
    const details = await Promise.all(
      etats.map((etat) => firstValueFrom(this.etatApi.etat(etat.id))),
    );
    this.list.set(details.map(etatFromApi));
    this.nonPrisEnCharge.set(suivi.nonPrisEnCharge);
    this.retoursARenvoyer.set(suivi.retoursARenvoyer);
    this.dossiersReceptionnes.set(suivi.dossiersReceptionnes);
    this.loaded.set(true);
  }

  /** Pointe les dossiers reçus ; les autres dossiers en attente passent « non reçus ». Rend l'état à jour. */
  async receive(etatId: string, dossierIds: readonly string[]): Promise<Etat> {
    const etat = etatFromApi(await firstValueFrom(this.etatApi.receptionner(etatId, dossierIds)));
    this.list.update((list) =>
      list.map((candidate) => (candidate.id === etat.id ? etat : candidate)),
    );
    return etat;
  }
}
