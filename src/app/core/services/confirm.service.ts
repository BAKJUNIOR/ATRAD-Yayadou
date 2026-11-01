import { Dialog } from '@angular/cdk/dialog';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../shared/ui/confirm-dialog/confirm-dialog.component';

export interface ConfirmOptions {
  title: string;
  text: string;
  /** Seconde ligne, mise en retrait (engagement, conséquence). */
  note?: string;
  okLabel: string;
  cancelLabel?: string;
  /** Action destructrice : bouton de confirmation en rouge. */
  danger?: boolean;
  /** Pastille de l'en-tête ; par défaut `danger` si l'action est destructrice, sinon `info`. */
  tone?: 'danger' | 'warning' | 'success' | 'info';
}

@Service()
export class ConfirmService {
  private readonly dialog = inject(Dialog);

  /** Résout à `true` si l'utilisateur confirme, `false` s'il annule ou ferme le dialogue. */
  ask(options: ConfirmOptions): Promise<boolean> {
    const ref = this.dialog.open<boolean, ConfirmOptions>(ConfirmDialogComponent, {
      data: options,
      role: 'alertdialog',
      ariaLabel: options.title,
      backdropClass: 'app-dialog-backdrop',
      panelClass: 'app-dialog-panel',
    });
    return firstValueFrom(ref.closed).then((confirmed) => confirmed === true);
  }
}
