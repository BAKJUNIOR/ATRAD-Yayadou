import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../../../../core/services/session.service';
import { entityCode } from '../../../../../core/utils/text.util';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { TimelineComponent } from '../../../../../shared/ui/timeline/timeline.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { entityOf } from '../../../../dossiers/domain/routing';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';
import { dossierHistory, receptionLabel, suiviDossiers } from '../../../domain/suivi';

const RECEPTION_TEXT = { brand: 'text-brand-ink', danger: 'text-danger', warning: 'text-warning' };

const PRIORITY_TEXT: Record<Priorite, string> = {
  Normale: 'text-ink-muted',
  Haute: 'text-warning',
  Urgente: 'text-danger',
};

interface DetailField {
  label: string;
  value: string;
  classes?: string;
}

/** Fiche d'un dossier transmis et historique de son parcours. */
@Component({
  selector: 'app-suivi-dossier-detail',
  imports: [RouterLink, StatusBadgeComponent, TimelineComponent],
  templateUrl: './suivi-dossier-detail.component.html',
})
export class SuiviDossierDetailComponent {
  private readonly store = inject(TransmissionStore);
  private readonly session = inject(SessionService);

  /** Référence du dossier, lue dans l'URL (`/agence/suivi/:ref`). */
  readonly ref = input.required<string>();

  protected readonly dossier = computed(() => {
    const code = entityCode(this.session.account()?.entity ?? '');
    return (
      suiviDossiers(this.store.etats(), this.store.dossiers(), code).find(
        (d) => d.ref === this.ref(),
      ) ?? null
    );
  });

  protected readonly history = computed(() => {
    const dossier = this.dossier();
    return dossier ? dossierHistory(dossier) : [];
  });

  protected readonly fields = computed<DetailField[]>(() => {
    const dossier = this.dossier();
    if (!dossier) {
      return [];
    }
    const reception = receptionLabel(dossier.etat, dossier);
    return [
      { label: 'Prénom du client', value: dossier.prenom || '—' },
      { label: 'Nom du client', value: dossier.nom || (dossier.prenom ? '—' : dossier.client) },
      { label: 'N° de compte', value: dossier.compte || '—', classes: 'font-mono' },
      { label: 'Type de dossier', value: dossier.type },
      { label: 'Produit', value: dossier.produit },
      { label: 'Priorité', value: dossier.prio, classes: PRIORITY_TEXT[dossier.prio] },
      {
        label: 'État de transmission',
        value: dossier.etat.ref,
        classes: 'font-mono text-heading',
      },
      {
        label: 'Entité de traitement',
        value: dossier.entite || `${entityOf(dossier.type) || '—'} (prévue)`,
      },
      {
        label: 'Réception Accueil',
        value: reception.label,
        classes: `font-medium ${RECEPTION_TEXT[reception.tone]}`,
      },
      { label: 'Gestionnaire', value: dossier.routed?.gest || 'Non affecté' },
    ];
  });
}
