import { PieceJointe } from './entities/dossier.entity';

const ACCEPTED_FILE = /\.(pdf|jpe?g|png|docx?)$/i;
export const MAX_PIECE_SIZE = 5 * 1024 * 1024;
export const MAX_PIECES = 10;

/** `1,2 Mo`, `340 Ko` */
export function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Répartit les fichiers proposés entre ceux à joindre et les refus motivés. */
export function screenPieces(
  files: readonly File[],
  current: readonly PieceJointe[],
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (!ACCEPTED_FILE.test(file.name)) {
      errors.push(`« ${file.name} » : format non accepté (PDF, JPG, PNG, Word)`);
    } else if (file.size > MAX_PIECE_SIZE) {
      errors.push(`« ${file.name} » : ${fileSizeLabel(file.size)}, au-delà de 5 Mo`);
    } else if (current.length + accepted.length >= MAX_PIECES) {
      errors.push(`« ${file.name} » : ${MAX_PIECES} fichiers maximum par dossier`);
    } else if (
      [...current, ...accepted].some(
        (piece) => piece.name === file.name && piece.size === file.size,
      )
    ) {
      errors.push(`« ${file.name} » : déjà joint`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}
