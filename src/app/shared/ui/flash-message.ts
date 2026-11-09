import { DestroyRef, inject, signal } from '@angular/core';

/** Message affiché quelques secondes puis effacé ; à créer dans un contexte d'injection (champ d'un composant). */
export function flashMessage(durationMs = 5000) {
  const text = signal('');
  let timer: ReturnType<typeof setTimeout> | undefined;
  inject(DestroyRef).onDestroy(() => clearTimeout(timer));
  return {
    text: text.asReadonly(),
    show(message: string): void {
      clearTimeout(timer);
      text.set(message);
      if (message) {
        timer = setTimeout(() => text.set(''), durationMs);
      }
    },
    clear(): void {
      clearTimeout(timer);
      text.set('');
    },
  };
}
