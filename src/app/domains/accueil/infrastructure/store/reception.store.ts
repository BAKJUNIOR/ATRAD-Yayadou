import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { etatFromApi } from '../../../dossiers/domain/entities/dossier-api.entity';
import { Etat } from '../../../dossiers/domain/entities/etat.entity';
import { EtatApi } from '../../../dossiers/infrastructure/api/etat.api';

/**
 * États destinés à l'entité réceptrice de l'utilisateur, avec leurs dossiers (recherche et pointage), tenus par
 * l'API. Chaque état est relu en détail : la recherche porte aussi sur ses dossiers.
 */
@Service()
export class ReceptionStore {
  private readonly etatApi = inject(EtatApi);

  private readonly list = signal<Etat[]>([]);
  private readonly loaded = signal(false);

  readonly etats = this.list.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();

  async load(): Promise<void> {
    const etats = await firstValueFrom(this.etatApi.recus());
    const details = await Promise.all(
      etats.map((etat) => firstValueFrom(this.etatApi.etat(etat.id))),
    );
    this.list.set(details.map(etatFromApi));
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
