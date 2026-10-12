import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { formatStamp } from '../../../../../core/utils/date.util';
import { Status } from '../../../../../shared/models/status';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { DOSSIER_TYPES } from '../../../../dossiers/domain/dossier-catalog';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { ETAT_STATUS_OPTIONS, EtatCriteria, pendingEtats } from '../../../domain/reception';
import { EtatSearchState } from '../../etat-search.state';

type TextCriterion = 'ref' | 'num' | 'prenom' | 'compte';

/** Parcours accueil : retrouver un état transmis pour en pointer la réception. */
@Component({
  selector: 'app-etats-recus',
  imports: [IconComponent, StatusBadgeComponent],
  templateUrl: './etats-recus.component.html',
})
export class EtatsRecusComponent {
  private readonly store = inject(TransmissionStore);
  private readonly router = inject(Router);
  protected readonly search = inject(EtatSearchState);

  protected readonly types = DOSSIER_TYPES;
  protected readonly statuts = ETAT_STATUS_OPTIONS;
  protected readonly formatStamp = formatStamp;

  protected readonly pendingCount = computed(() => pendingEtats(this.store.etats()).length);
  protected readonly agences = computed(() => [
    ...new Set(this.store.etats().map((etat) => etat.agence)),
  ]);

  protected readonly noResultMessage = computed(() => {
    const ref = this.search.applied().ref;
    if (!ref) {
      return 'Aucun état ne correspond aux critères sélectionnés.';
    }
    const suffix = this.search.appliedAdvancedCount() ? ' avec les critères sélectionnés.' : '.';
    return `Aucun état ne correspond à la référence « ${ref} »${suffix}`;
  });

  protected onText(key: TextCriterion, event: Event): void {
    this.search.patch({ [key]: (event.target as HTMLInputElement).value });
  }

  protected onSelect(key: 'agence' | 'type', event: Event): void {
    this.search.patch({ [key]: (event.target as HTMLSelectElement).value });
  }

  protected onStatut(event: Event): void {
    this.search.patch({ statut: (event.target as HTMLSelectElement).value as Status | '' });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const results = this.search.submit();
    // Un seul état trouvé : il est ouvert directement.
    if (results.length === 1) {
      this.open(results[0].ref);
    }
  }

  protected open(ref: string): void {
    void this.router.navigate(['/accueil-central/etats-recus', ref]);
  }

  protected criteria(): EtatCriteria {
    return this.search.draft();
  }
}
