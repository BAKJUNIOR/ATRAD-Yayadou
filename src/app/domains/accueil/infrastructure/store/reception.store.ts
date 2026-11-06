import { Service, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { etatFromApi } from '../../../dossiers/domain/entities/dossier-api.entity';
import { Etat } from '../../../dossiers/domain/entities/etat.entity';
import { EtatApi } from '../../../dossiers/infrastructure/api/etat.api';
import { AccueilApi } from '../api/accueil.api';

@Service()
export class ReceptionStore {
  private readonly etatApi = inject(EtatApi);
  private readonly accueilApi = inject(AccueilApi);

  private readonly list = signal<Etat[]>([]);
  private readonly loaded = signal(false);

  readonly etats = this.list.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();
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

  async receive(etatId: string, dossierIds: readonly string[]): Promise<Etat> {
    const etat = etatFromApi(await firstValueFrom(this.etatApi.receptionner(etatId, dossierIds)));
    this.list.update((list) =>
      list.map((candidate) => (candidate.id === etat.id ? etat : candidate)),
    );
    return etat;
  }
}
