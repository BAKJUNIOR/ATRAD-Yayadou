import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { RouterLink } from '@angular/router';
import { Clock } from '../../../../../core/services/clock.service';
import { StatusBadgeComponent } from '../../../../../shared/ui/status-badge/status-badge.component';
import { TimelineComponent } from '../../../../../shared/ui/timeline/timeline.component';
import { Priorite } from '../../../../dossiers/domain/dossier-catalog';
import { etatInfo } from '../../../../dossiers/domain/referentiel';
import { entityOf } from '../../../../dossiers/domain/routing';
import { etatFromApi } from '../../../../dossiers/domain/entities/dossier-api.entity';
import { EtatApi } from '../../../../dossiers/infrastructure/api/etat.api';
import {
  SuiviDossier,
  receptionLabel,
  returnNotice,
  suiviDossierOf,
  timelineOf,
} from '../../../domain/suivi';
import { SuiviAgenceApi } from '../../../infrastructure/api/suivi-agence.api';

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
  /** Précision affichée sous la valeur. */
  sub?: string;
}

/** Fiche d'un dossier transmis et historique de son parcours. */
@Component({
  selector: 'app-suivi-dossier-detail',
  imports: [RouterLink, StatusBadgeComponent, TimelineComponent],
  templateUrl: './suivi-dossier-detail.component.html',
})
export class SuiviDossierDetailComponent {
  private readonly suiviApi = inject(SuiviAgenceApi);
  private readonly etatApi = inject(EtatApi);
  private readonly clock = inject(Clock);

  /** Identifiant du dossier, lu dans l'URL (`/agence/suivi/:id`). */
  readonly id = input.required<string>();

  protected readonly dossier = signal<SuiviDossier | null>(null);
  /** Chargement terminé : le message « aucun dossier » ne s'affiche qu'ensuite. */
  protected readonly loaded = signal(false);

  protected readonly history = computed(() => timelineOf(this.dossier()?.log ?? []));

  constructor() {
    effect(() => void this.load(this.id()));
  }

  /** Fiche du dossier, puis son état d'origine pour le pointage de réception. */
  private async load(id: string): Promise<void> {
    this.loaded.set(false);
    try {
      const detail = await firstValueFrom(this.suiviApi.dossier(id));
      const etatId = detail.dossier.etatOrigineId;
      const etat = etatId ? etatFromApi(await firstValueFrom(this.etatApi.etat(etatId))) : null;
      this.dossier.set(suiviDossierOf(detail, etat));
    } catch {
      this.dossier.set(null);
    } finally {
      this.loaded.set(true);
    }
  }

  protected readonly notice = computed(() => {
    const dossier = this.dossier();
    return dossier ? returnNotice(dossier, this.clock.today()) : null;
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
        sub: `« ${etatInfo(dossier.etat).nom} » · réceptionné par ${etatInfo(dossier.etat).dest}`,
      },
      {
        label: 'Entité de traitement',
        value: dossier.entite || `${entityOf(dossier.type) || '—'} (prévue)`,
      },
      {
        label: 'Réception',
        value: reception.label,
        classes: `font-medium ${RECEPTION_TEXT[reception.tone]}`,
      },
      { label: 'Gestionnaire', value: dossier.routed?.gest || 'Non affecté' },
    ];
  });
}
