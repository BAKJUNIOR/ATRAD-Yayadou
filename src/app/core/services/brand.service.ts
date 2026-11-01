import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  BRAND_DEFAULT,
  Brand,
  BrandFont,
  BrandLogoKey,
  FONT_QUERY,
  brandVars,
} from '../branding/brand';
import { BrandingApi } from '../branding/branding.api';
import { configurationOf } from '../branding/marque.entity';

const BRAND_LOGO_KEYS: readonly BrandLogoKey[] = ['logoFull', 'logoIcon', 'favicon'];
import { initialsOf } from '../utils/text.util';

/** Ancienne copie locale de la marque, effacée au démarrage. */
const LEGACY_BRAND_KEY = 'atrad_brand_v1';
const FAVICON_MARK = 'data-atrad';

/**
 * Marque blanche : nom, logos, couleurs, police et rayon appliqués à toute l'application. La marque vient de
 * l'API (`refresh()`, avant le premier affichage) ; si elle ne répond pas, la marque par défaut reste appliquée.
 */
@Service()
export class BrandService {
  private readonly document = inject(DOCUMENT);
  private readonly api = inject(BrandingApi);

  private readonly current = signal<Brand>({ ...BRAND_DEFAULT });
  private defaultFavicon: string | null = null;

  readonly brand = this.current.asReadonly();
  readonly appName = computed(() => this.current().appName || BRAND_DEFAULT.appName);
  readonly org = computed(() => this.current().org);
  readonly initials = computed(() =>
    initialsOf(this.current().shortName || this.current().appName),
  );

  constructor() {
    try {
      localStorage.removeItem(LEGACY_BRAND_KEY);
    } catch {
      // Stockage indisponible : rien à effacer.
    }
    this.apply(this.current());
  }

  /** Lit la marque de l'API ; en cas d'échec (serveur injoignable), la marque en place est gardée. */
  async refresh(): Promise<void> {
    try {
      const brand = await firstValueFrom(this.api.brand());
      this.current.set(brand);
      this.apply(brand);
    } catch {
      // Marque en place conservée.
    }
  }

  /**
   * Enregistre la marque dans l'API (administrateur) : configuration et vocabulaire, puis les logos choisis
   * (`files`) et ceux retirés. La marque relue de l'API est ensuite appliquée. Une erreur remonte à l'appelant.
   */
  async save(brand: Brand, files: Partial<Record<BrandLogoKey, File>>): Promise<void> {
    const previous = this.current();
    await firstValueFrom(this.api.modifier(configurationOf(brand)));
    for (const key of BRAND_LOGO_KEYS) {
      const file = files[key];
      if (file) {
        await firstValueFrom(this.api.deposerLogo(key, file));
      } else if (!brand[key] && previous[key]) {
        await firstValueFrom(this.api.retirerLogo(key));
      }
    }
    await this.refresh();
  }

  /** Revient à la marque par défaut, dans l'API puis à l'écran. */
  async reset(): Promise<void> {
    await firstValueFrom(this.api.reinitialiser());
    await this.refresh();
  }

  /** Charge la police depuis Google Fonts (une seule fois), y compris pour l'aperçu. */
  loadFont(font: BrandFont): void {
    const query = FONT_QUERY[font];
    const id = `atrad-font-${font}`;
    if (!query || this.document.getElementById(id)) {
      return;
    }
    const link = this.document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${query}&display=swap`;
    this.document.head.appendChild(link);
  }

  // Appliqué de façon synchrone pour éviter un flash des couleurs par défaut au chargement.
  private apply(brand: Brand): void {
    const root = this.document.documentElement;
    for (const [name, value] of Object.entries(brandVars(brand))) {
      root.style.setProperty(name, value);
    }
    this.loadFont(brand.font);
    this.applyFavicon(brand.favicon);
  }

  private applyFavicon(favicon: string): void {
    const link = this.document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      return;
    }
    this.defaultFavicon ??= link.getAttribute('href');
    if (favicon) {
      link.removeAttribute('type');
      link.setAttribute('href', favicon);
      link.setAttribute(FAVICON_MARK, '1');
    } else if (link.hasAttribute(FAVICON_MARK)) {
      link.setAttribute('href', this.defaultFavicon ?? '');
      link.removeAttribute(FAVICON_MARK);
    }
  }
}
