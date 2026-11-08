import { Component, computed, inject, signal } from '@angular/core';
import { FormFieldComponent } from '../../../../../shared/ui/form-field/form-field.component';
import { IconComponent } from '../../../../../shared/ui/icon/icon.component';
import {
  DossierType,
  PRIORITES,
  Priorite,
  Produit,
  TypeField,
  produitsOf,
} from '../../../../dossiers/domain/dossier-catalog';
import { fileSizeLabel } from '../../../../dossiers/domain/piece.rules';
import { PieceOpener } from '../../../../dossiers/presentation/piece-opener.service';
import { BaseFieldKey } from '../../../domain/dossier-form.rules';
import { CreerEtatFacade } from '../../creer-etat.facade';

@Component({
  selector: 'app-dossier-form',
  imports: [FormFieldComponent, IconComponent],
  templateUrl: './dossier-form.component.html',
})
export class DossierFormComponent {
  protected readonly facade = inject(CreerEtatFacade);
  protected readonly pieceOpener = inject(PieceOpener);

  protected readonly produits = computed(() => produitsOf(this.facade.value().type));
  protected readonly priorites = PRIORITES;
  protected readonly sizeLabel = fileSizeLabel;

  protected readonly dragging = signal(false);

  protected onText(key: BaseFieldKey, event: Event): void {
    const control = event.target as HTMLInputElement | HTMLTextAreaElement;
    // Réécrit la valeur retenue : le n° client n'accepte que des chiffres.
    control.value = this.facade.setText(key, control.value);
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
