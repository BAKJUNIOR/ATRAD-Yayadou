import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { BaseService } from '../../../../core/services/base.service';
import {
  ApiDossier,
  ApiDossierBrouillon,
  ApiPieceJointe,
} from '../../domain/entities/dossier-api.entity';

/** Brouillon de l'entité émettrice (dossiers au statut Temporaire) et pièces jointes des dossiers. */
@Service()
export class DossierApi {
  private readonly baseService = inject(BaseService);
  private readonly brouillonUrl = environment.endpoints.brouillon;
  private readonly piecesUrl = environment.endpoints.pieces;

  brouillon(): Observable<ApiDossier[]> {
    return this.baseService.getOne<ApiDossier[]>(this.brouillonUrl.base);
  }

  creer(dossier: ApiDossierBrouillon): Observable<ApiDossier> {
    return this.baseService.create<ApiDossier>(this.brouillonUrl.base, dossier);
  }

  modifier(id: string, dossier: ApiDossierBrouillon): Observable<ApiDossier> {
    return this.baseService.update<ApiDossier>(this.brouillonUrl.byId(id), dossier);
  }

  supprimer(id: string): Observable<void> {
    return this.baseService.delete<void>(this.brouillonUrl.byId(id));
  }

  pieces(dossierId: string): Observable<ApiPieceJointe[]> {
    return this.baseService.getOne<ApiPieceJointe[]>(this.piecesUrl.base(dossierId));
  }

  ajouterPiece(dossierId: string, file: File): Observable<ApiPieceJointe> {
    return this.baseService.upload<ApiPieceJointe>('POST', this.piecesUrl.base(dossierId), file);
  }

  supprimerPiece(dossierId: string, pieceId: string): Observable<void> {
    return this.baseService.delete<void>(this.piecesUrl.byId(dossierId, pieceId));
  }

  /** Contenu d'une pièce jointe (lecture réservée aux entités du circuit du dossier). */
  fichier(dossierId: string, pieceId: string): Observable<Blob> {
    return this.baseService.getBlob(this.piecesUrl.byId(dossierId, pieceId));
  }
}
