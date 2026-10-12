import { Service, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { BrandService } from './brand.service';

/**
 * Les routes déclarent uniquement le titre de leur écran (`title: 'Suivi des dossiers'`).
 * Cette stratégie le suffixe du nom de l'application (marque blanche) pour l'onglet et
 * l'expose à l'en-tête.
 */
@Service()
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly brand = inject(BrandService);
  private readonly current = signal('');

  readonly pageTitle = this.current.asReadonly();

  constructor() {
    super();
    // L'onglet suit aussi un changement de nom enregistré dans « Logo & Couleurs ».
    effect(() => {
      const pageTitle = this.current();
      const appName = this.brand.appName();
      this.title.setTitle(pageTitle ? `${pageTitle} | ${appName}` : appName);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.current.set(this.buildTitle(snapshot) ?? '');
  }
}
