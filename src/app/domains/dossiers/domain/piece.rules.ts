import { PieceAJoindre } from './dossier-catalog';
import { PieceJointe } from './entities/dossier.entity';

const ACCEPTED_FILE = /\.(pdf|jpe?g|png|docx?)$/i;
export const MAX_PIECE_SIZE = 5 * 1024 * 1024;
export const MAX_PIECES = 10;

export function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',').replace(/,0$/, '')} Mo`
    : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

function extensionOf(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

export function formatsLabel(formats: readonly string[]): string {
  return formats.map((format) => format.toUpperCase()).join(' ou ');
}

/** Texte d'aide sous la zone de dépôt : formats et taille acceptés. */
export function pieceHint(fichier: PieceAJoindre | null): string {
  if (!fichier) {
    return 'PDF, JPG, PNG, Word · 5 Mo max par fichier · 10 fichiers max';
  }
  const taille = fichier.tailleMaxKo ? ` · ${fileSizeLabel(fichier.tailleMaxKo * 1024)} max` : '';
  return `${formatsLabel(fichier.formats)}${taille}`;
}

export function missingRequiredFile(
  fichier: PieceAJoindre | null,
  pieces: readonly PieceJointe[],
): string {
  if (!fichier?.obligatoire) {
    return '';
  }
  const present = pieces.some((piece) => fichier.formats.includes(extensionOf(piece.name)));
  return present
    ? ''
    : `${fichier.libelle} : fichier obligatoire (${formatsLabel(fichier.formats)}).`;
}

export function screenPieces(
  files: readonly File[],
  current: readonly PieceJointe[],
  fichier: PieceAJoindre | null = null,
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  const maxSize = fichier?.tailleMaxKo ? fichier.tailleMaxKo * 1024 : MAX_PIECE_SIZE;
  for (const file of files) {
    if (fichier && !fichier.formats.includes(extensionOf(file.name))) {
      errors.push(`« ${file.name} » : format non accepté (${formatsLabel(fichier.formats)})`);
    } else if (!fichier && !ACCEPTED_FILE.test(file.name)) {
      errors.push(`« ${file.name} » : format non accepté (PDF, JPG, PNG, Word)`);
    } else if (file.size > maxSize) {
      errors.push(
        `« ${file.name} » : ${fileSizeLabel(file.size)}, au-delà de ${fileSizeLabel(maxSize)}`,
      );
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
