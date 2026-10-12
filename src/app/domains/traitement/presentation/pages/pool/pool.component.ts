import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../../../core/services/toast.service';
import { isoDateToFr } from '../../../../../core/utils/date.util';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { RoutedDossier } from '../../../../dossiers/domain/entities/dossier.entity';
import { DELAI_PRIORITE } from '../../../../dossiers/domain/routing';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { unassigned } from '../../../domain/portfolio';
import { TraitementContext } from '../../traitement-context.service';

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

/** Parcours traitement (mode pool) : liste commune où chaque membre s'attribue des dossiers. */
@Component({
  selector: 'app-pool',
  imports: [RouterLink],
  templateUrl: './pool.component.html',
})
export class PoolComponent {
  private readonly store = inject(TransmissionStore);
  private readonly toast = inject(ToastService);
  protected readonly context = inject(TraitementContext);

  protected readonly priorityText = PRIORITY_TEXT;
  protected readonly isoDateToFr = isoDateToFr;

  /** Dossiers sans gestionnaire, les plus prioritaires puis les plus anciens d'abord. */
  protected readonly rows = computed(() =>
    unassigned(this.context.entityDossiers()).sort(
      (a, b) =>
        DELAI_PRIORITE[a.prio] - DELAI_PRIORITE[b.prio] || a.affecte.localeCompare(b.affecte),
    ),
  );
  protected readonly countLabel = computed(() => {
    const count = this.rows().length;
    return `${count} dossier${count > 1 ? 's' : ''} en attente`;
  });

  protected take(dossier: RoutedDossier): void {
    const result = this.store.take(dossier.id, this.context.user());
    if (result.ok) {
      this.toast.success(result.message);
    } else {
      this.toast.warning(result.message);
    }
  }
}
