import { DOCUMENT, Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ToastService } from '../../../core/services/toast.service';
import { PieceJointe } from '../domain/entities/dossier.entity';
import { DossierApi } from '../infrastructure/api/dossier.api';

/** Ouvre une pièce jointe dans un nouvel onglet (ou la télécharge si l'onglet est bloqué). */
@Service()
export class PieceOpener {
  private readonly api = inject(DossierApi);
  private readonly toast = inject(ToastService);
  private readonly document = inject(DOCUMENT);

  async open(piece: PieceJointe): Promise<void> {
    // Fichier choisi mais pas encore envoyé : lu en mémoire ; sinon téléchargé depuis l'API.
    let blob: Blob | null = piece.file ?? null;
    if (!blob && piece.dossierId) {
      try {
        blob = await firstValueFrom(this.api.fichier(piece.dossierId, piece.id));
      } catch {
        return;
      }
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
