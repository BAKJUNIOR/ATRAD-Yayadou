export function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function entityCode(entity: string): string {
  return entity.match(/\(([^)]+)\)/)?.[1] ?? '';
}
