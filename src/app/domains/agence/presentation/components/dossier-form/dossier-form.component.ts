import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormFieldComponent } from '../../../../../shared/ui/form-field/form-field.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import {
  COMPTE_LABELS,
  DossierType,
  PRIORITES,
  Priorite,
  Produit,
  TypeField,
  produitsOf,
  saisieOf,
} from '../../../../dossiers/domain/dossier-catalog';
import { fileSizeLabel, pieceHint } from '../../../../dossiers/domain/piece.rules';
import { PieceOpener } from '../../../../dossiers/presentation/piece-opener.service';
import { BaseFieldKey } from '../../../domain/dossier-form.rules';
import { CreerEtatFacade } from '../../creer-etat.facade';

@Component({
  selector: 'app-dossier-form',
  imports: [FormFieldComponent, IconComponent, NgTemplateOutlet],
  templateUrl: './dossier-form.component.html',
})
export class DossierFormComponent {
  protected readonly facade = inject(CreerEtatFacade);
  protected readonly pieceOpener = inject(PieceOpener);

  protected readonly produits = computed(() => produitsOf(this.facade.value().type));
  protected readonly saisie = computed(() => {
    this.facade.typeFields();
    return saisieOf(this.facade.value().type);
  });
  /** Un compte par rôle demandé : le premier dans `compte`/`cle`, le second dans `compte2`/`cle2`. */
  protected readonly comptes = computed(() =>
    this.saisie().comptes.map((role, index) => ({
      label: COMPTE_LABELS[role],
      numero: (index ? 'compte2' : 'compte') as BaseFieldKey,
      cle: (index ? 'cle2' : 'cle') as BaseFieldKey,
    })),
  );
  protected readonly headFields = computed(() =>
    this.facade.typeFields().filter((field) => field.enTete),
  );
  protected readonly bodyFields = computed(() =>
    this.facade.typeFields().filter((field) => !field.enTete),
  );
  protected readonly fichier = computed(() => this.saisie().fichier);
  protected readonly pieceHint = computed(() => pieceHint(this.fichier()));
  protected readonly accept = computed(() => {
    const fichier = this.fichier();
    return fichier
      ? fichier.formats.map((format) => `.${format}`).join(',')
      : '.pdf,.jpg,.jpeg,.png,.doc,.docx';
  });
  protected readonly priorites = PRIORITES;
  protected readonly sizeLabel = fileSizeLabel;

  protected readonly dragging = signal(false);

  protected onText(key: BaseFieldKey, event: Event): void {
    const control = event.target as HTMLInputElement | HTMLTextAreaElement;
    // Réécrit la valeur retenue : le n° client n'accepte que des chiffres.
    control.value = this.facade.setText(key, control.value);
  }

  protected onEtatType(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const previous = this.facade.etatType()?.id ?? '';
    void this.facade.setEtatType(select.value).then(() => {
      // Changement refusé : la liste revient au type d'état conservé.
      select.value = this.facade.etatType()?.id ?? previous;
    });
  }

  protected onTypeQuery(event: Event): void {
    this.facade.setTypeQuery((event.target as HTMLInputElement).value);
  }

  protected onType(event: Event): void {
    this.facade.setType((event.target as HTMLSelectElement).value as DossierType);
  }

  protected onProduit(event: Event): void {
    this.facade.patch({ produit: (event.target as HTMLSelectElement).value as Produit });
  }

  protected onPriorite(event: Event): void {
    this.facade.patch({ prio: (event.target as HTMLSelectElement).value as Priorite });
  }

  protected onExtra(field: TypeField, event: Event): void {
    this.facade.setExtra(field.key, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected extraLabel(field: TypeField): string {
    const unit = field.unit ? ` (${field.unit === 'mois' ? 'en mois' : field.unit})` : '';
    return `${field.label}${unit}${field.optional ? ' (facultatif)' : ' *'}`;
  }

  protected extraInvalid(field: TypeField): boolean {
    const value = (this.facade.value().extra[field.key] ?? '').trim();
    return (
      !!this.facade.errors()[field.key] || (this.facade.touched() && !field.optional && !value)
    );
  }

  protected onFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.facade.addPieces(input.files);
    input.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    void this.facade.addPieces(event.dataTransfer?.files);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.facade.submit();
  }
}
