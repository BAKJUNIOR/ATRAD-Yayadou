/** Initiales d'un nom complet : `Aminata Diallo` → `AD`. */
export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Code entre parenthèses d'une entité : `Agence Plateau (AG-014)` → `AG-014`. */
export function entityCode(entity: string): string {
  return entity.match(/\(([^)]+)\)/)?.[1] ?? '';
}
