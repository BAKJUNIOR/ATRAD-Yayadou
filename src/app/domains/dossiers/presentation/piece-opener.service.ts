import { DOCUMENT, Service, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { PieceJointe } from '../domain/entities/dossier.entity';
import { PieceFileStore } from '../infrastructure/store/piece-file.store';

/** Ouvre une pièce jointe dans un nouvel onglet (ou la télécharge si l'onglet est bloqué). */
@Service()
export class PieceOpener {
  private readonly files = inject(PieceFileStore);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  async open(piece: PieceJointe): Promise<void> {
    let blob: Blob | null;
    try {
      blob = await this.files.get(piece.id);
    } catch {
      this.toast.error('Ouverture impossible.');
      return;
    }
    if (!blob) {
      this.toast.warning(`Fichier « ${piece.name} » introuvable sur ce poste.`);
      return;
    }

    const url = URL.createObjectURL(blob);
    const view = this.document.defaultView;
    if (!view?.open(url, '_blank')) {
      const link = this.document.createElement('a');
      link.href = url;
      link.download = piece.name;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
