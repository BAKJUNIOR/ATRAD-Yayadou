import { Component, computed, inject, input } from '@angular/core';
import { formatDateTime } from '../../../../../core/utils/date.util';
import { Dossier } from '../../../domain/entities/dossier.entity';
import { fileSizeLabel } from '../../../domain/piece.rules';
import { entityOfDossier } from '../../../domain/routing';
import { PieceOpener } from '../../piece-opener.service';

interface DetailField {
  label: string;
  value: string;
  mono?: boolean;
}

/** Fiche complète d'un dossier : identité, informations propres au type, pièces et observation. */
@Component({
  selector: 'app-dossier-details',
  host: { class: 'flex flex-col gap-3.5' },
  templateUrl: './dossier-details.component.html',
})
export class DossierDetailsComponent {
  protected readonly pieceOpener = inject(PieceOpener);

  readonly dossier = input.required<Dossier & { entite?: string }>();

  protected readonly sizeLabel = fileSizeLabel;

  protected readonly fields = computed<DetailField[]>(() => {
    const dossier = this.dossier();
    return [
      { label: 'Référence', value: dossier.ref, mono: true },
      { label: 'Prénom', value: dossier.prenom || '—' },
      { label: 'Nom', value: dossier.nom || '—' },
      { label: 'N° client', value: dossier.num || '—', mono: true },
      { label: 'N° de compte', value: dossier.compte || '—', mono: true },
      { label: 'Type de dossier', value: dossier.type },
      { label: 'Produit', value: dossier.produit },
      { label: 'Priorité', value: dossier.prio },
      {
        label: dossier.entite ? 'Entité de traitement' : 'Entité de traitement prévue',
        value: entityOfDossier(dossier),
      },
      ...(dossier.montant ? [{ label: 'Montant', value: dossier.montant, mono: true }] : []),
      { label: 'Date de création', value: formatDateTime(dossier.createdAt), mono: true },
    ];
  });
}
