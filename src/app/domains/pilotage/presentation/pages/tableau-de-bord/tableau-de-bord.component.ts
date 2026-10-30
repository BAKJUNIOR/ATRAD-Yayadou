import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { DemoClock } from '../../../../../core/services/demo-clock.service';
import { KpiCardComponent } from '../../../../../shared/ui/kpi-card/kpi-card.component';
import { DOSSIER_TYPES, DossierType } from '../../../../dossiers/domain/dossier-catalog';
import { entiteOf, entites, labelOf, referentiel } from '../../../../dossiers/domain/referentiel';
import {
  PeriodId,
  SLA_TARGET,
  agencePerformanceFromApi,
  byStatusFromApi,
  byTypeFromApi,
  delayLabel,
  kpiCardsFromApi,
  periods,
} from '../../../domain/indicators';
import { FiltrePilotage, PilotageApi } from '../../../infrastructure/api/pilotage.api';
import { TONE_BAR, TONE_TEXT } from '../../tone';

/** Pilotage : indicateurs du réseau sur un périmètre (agence, période, type de dossier). */
@Component({
  selector: 'app-tableau-de-bord',
  imports: [KpiCardComponent],
  templateUrl: './tableau-de-bord.component.html',
})
export class TableauDeBordComponent {
  private readonly api = inject(PilotageApi);
  private readonly clock = inject(DemoClock);

  protected readonly types = DOSSIER_TYPES;
  protected readonly target = SLA_TARGET;
  protected readonly toneBar = TONE_BAR;
  protected readonly toneText = TONE_TEXT;

  protected readonly agence = signal('');
  protected readonly type = signal<DossierType | ''>('');
  protected readonly periodId = signal<PeriodId>('all');

  protected readonly periodOptions = computed(() => periods(this.clock.today()));
  /** Entités émettrices proposées dans le filtre, au format `Nom (CODE)`. */
  protected readonly agences = computed(() =>
    entites()
      .filter((entite) => entite.emet)
      .map((entite) => labelOf(entite)),
  );

  /** Filtres de l'écran, traduits en paramètres de l'API. */
  private readonly filtre = computed<FiltrePilotage>(() => {
    const period =
      this.periodOptions().find((candidate) => candidate.id === this.periodId()) ??
      this.periodOptions()[3];
    return {
      agenceId: entiteOf(this.agence())?.id,
      typeDossierId: this.type() ? referentiel().typeIds[this.type()] : undefined,
      dateDebut: period?.from,
      dateFin: period?.to,
    };
  });

  private readonly tableau = toSignal(
    toObservable(this.filtre).pipe(
      switchMap((filtre) => this.api.tableauDeBord(filtre).pipe(catchError(() => of(null)))),
    ),
    { initialValue: null },
  );

  protected readonly cards = computed(() =>
    this.tableau() ? kpiCardsFromApi(this.tableau()!) : [],
  );
  protected readonly statuses = computed(() =>
    this.tableau() ? byStatusFromApi(this.tableau()!) : [],
  );
  protected readonly volumes = computed(() =>
    this.tableau() ? byTypeFromApi(this.tableau()!) : [],
  );
  protected readonly averageDelay = computed(() => delayLabel(this.tableau()?.delaiMoyenJours));
  protected readonly performance = computed(() =>
    agencePerformanceFromApi(this.tableau()?.parAgence ?? []),
  );
  /** Nombre de dossiers du périmètre. */
  protected readonly scoped = computed(() => ({ length: this.tableau()?.total ?? 0 }));

  protected onAgence(event: Event): void {
    this.agence.set((event.target as HTMLSelectElement).value);
  }

  protected onPeriod(event: Event): void {
    this.periodId.set((event.target as HTMLSelectElement).value as PeriodId);
  }

  protected onType(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value as DossierType | '');
  }

  protected reset(): void {
    this.agence.set('');
    this.type.set('');
    this.periodId.set('all');
  }
}
