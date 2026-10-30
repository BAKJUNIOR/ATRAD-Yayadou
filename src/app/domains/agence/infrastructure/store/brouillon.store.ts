import { Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiDossier,
  brouillonOf,
  dossierFromApi,
  etatFromApi,
} from '../../../dossiers/domain/entities/dossier-api.entity';
import { Dossier, DossierData, PieceJointe } from '../../../dossiers/domain/entities/dossier.entity';
import { Etat } from '../../../dossiers/domain/entities/etat.entity';
import { DossierApi } from '../../../dossiers/infrastructure/api/dossier.api';
import { EtatApi } from '../../../dossiers/infrastructure/api/etat.api';

/**
 * Brouillon de l'entité émettrice, tenu par l'API : les dossiers Temporaire en attente de transmission, avec
 * leurs pièces jointes. Chaque méthode appelle l'API puis met la liste à jour ; une erreur est déjà signalée par
 * l'intercepteur et remonte à l'appelant.
 */
@Service()
export class BrouillonStore {
  private readonly dossierApi = inject(DossierApi);
  private readonly etatApi = inject(EtatApi);

  private readonly dossiers = signal<Dossier[]>([]);
  private readonly loaded = signal(false);

  readonly draft = this.dossiers.asReadonly();
  readonly isLoaded = this.loaded.asReadonly();
  /** Création du plus ancien dossier du brouillon. */
  readonly draftCreatedAt = computed(() =>
    this.dossiers().reduce((oldest, dossier) => (!oldest || dossier.createdAt < oldest ? dossier.createdAt : oldest), ''),
  );
  /** L'API attribue la référence de l'état à sa transmission. */
  readonly draftRef = computed(() => 'Nouvel état');

  async load(): Promise<void> {
    const dossiers = await firstValueFrom(this.dossierApi.brouillon());
    this.dossiers.set(await Promise.all(dossiers.map((dossier) => this.withPieces(dossier))));
    this.loaded.set(true);
  }

  /** Crée le dossier puis envoie ses pièces jointes. */
  async add(data: DossierData): Promise<Dossier> {
    const created = await firstValueFrom(this.dossierApi.creer(brouillonOf(data)));
    await this.sendPieces(created.id, data.pieces);
    const dossier = await this.withPieces(created);
    this.dossiers.update((list) => [...list, dossier]);
    return dossier;
  }

  /** Enregistre le dossier, envoie les nouvelles pièces et supprime celles retirées. */
  async update(previous: Dossier, data: DossierData): Promise<Dossier> {
    const saved = await firstValueFrom(this.dossierApi.modifier(previous.id, brouillonOf(data)));
    const kept = new Set(data.pieces.map((piece) => piece.id));
    const removed = previous.pieces.filter((piece) => piece.dossierId && !kept.has(piece.id));
    await Promise.all(
      removed.map((piece) => firstValueFrom(this.dossierApi.supprimerPiece(previous.id, piece.id))),
    );
    await this.sendPieces(previous.id, data.pieces);
    const dossier = await this.withPieces(saved);
    this.dossiers.update((list) => list.map((candidate) => (candidate.id === dossier.id ? dossier : candidate)));
    return dossier;
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.dossierApi.supprimer(id));
    this.dossiers.update((list) => list.filter((dossier) => dossier.id !== id));
  }

  /** Transmet tout le brouillon ; `typeEtatId` vide en mode de saisie automatique. Rend les états produits. */
  async transmit(typeEtatId: string | null): Promise<Etat[]> {
    const ids = this.dossiers().map((dossier) => dossier.id);
    const etats = await firstValueFrom(this.etatApi.transmettre(typeEtatId || null, ids));
    this.dossiers.set([]);
    return etats.map(etatFromApi);
  }

  private async sendPieces(dossierId: string, pieces: readonly PieceJointe[]): Promise<void> {
    for (const piece of pieces) {
      if (piece.file && !piece.dossierId) {
        await firstValueFrom(this.dossierApi.ajouterPiece(dossierId, piece.file));
      }
    }
  }

  private async withPieces(dossier: ApiDossier): Promise<Dossier> {
    const pieces = await firstValueFrom(this.dossierApi.pieces(dossier.id));
    return dossierFromApi(dossier, pieces);
  }
}
