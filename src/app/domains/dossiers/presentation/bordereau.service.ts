import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { BordereauPreviewComponent } from './components/bordereau-preview/bordereau-preview.component';

/** Ouvre l'aperçu avant impression du bordereau d'un état transmis, désigné par son identifiant dans l'API. */
@Service()
export class BordereauService {
  private readonly dialog = inject(Dialog);

  open(etatId: string): void {
    this.dialog.open<void, string>(BordereauPreviewComponent, {
      data: etatId,
      ariaLabel: "Aperçu avant impression du bordereau de l'état",
      backdropClass: 'app-dialog-backdrop',
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
    });
  }
}
