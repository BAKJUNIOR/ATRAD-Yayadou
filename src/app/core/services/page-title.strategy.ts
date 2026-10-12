import { Service, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_NAME = 'ATRAD';

/**
 * Les routes déclarent uniquement le titre de leur écran (`title: 'Suivi des dossiers'`).
 * Cette stratégie le suffixe du nom de l'application pour l'onglet et l'expose à l'en-tête.
 */
@Service()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly current = signal('');

  readonly pageTitle = this.current.asReadonly();

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const pageTitle = this.buildTitle(snapshot) ?? '';
    this.current.set(pageTitle);
    this.title.setTitle(pageTitle ? `${pageTitle} | ${APP_NAME}` : APP_NAME);
  }
}
