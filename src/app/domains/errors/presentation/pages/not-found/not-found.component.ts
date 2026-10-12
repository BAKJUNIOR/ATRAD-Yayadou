import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, ButtonComponent],
  template: `
    <main
      class="flex min-h-screen flex-col items-center justify-center gap-4 bg-soft px-6 text-center"
    >
      <p class="font-mono text-[13px] font-medium text-brand-ink">Erreur 404</p>
      <h1 class="text-[28px] font-semibold tracking-[-0.015em] text-ink">Page introuvable</h1>
      <p class="max-w-sm text-[13.5px] text-pretty text-ink-muted">
        L'adresse demandée n'existe pas ou n'est plus disponible.
      </p>
      <a appButton routerLink="/">Retour à l'accueil</a>
    </main>
  `,
})
export class NotFoundComponent {}
