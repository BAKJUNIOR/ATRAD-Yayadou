import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { BRAND_DEFAULT, Brand, BrandFont, FONT_QUERY, brandVars } from '../branding/brand';
import { initialsOf } from '../utils/text.util';
import { StorageService } from './storage.service';

const BRAND_KEY = 'atrad_brand_v1';
const FAVICON_MARK = 'data-atrad';

/** Marque blanche : nom, logos, couleurs, police et rayon appliqués à toute l'application. */
@Service()
export class BrandService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);

  private readonly current = signal<Brand>(this.read());
  private defaultFavicon: string | null = null;

  readonly brand = this.current.asReadonly();
  readonly appName = computed(() => this.current().appName || BRAND_DEFAULT.appName);
  readonly org = computed(() => this.current().org);
  readonly initials = computed(() =>
    initialsOf(this.current().shortName || this.current().appName),
  );

  constructor() {
    this.apply(this.current());
  }

  /** Enregistre le thème ; `false` si le navigateur refuse (logos trop volumineux). */
  save(brand: Brand): boolean {
    try {
      localStorage.setItem(BRAND_KEY, JSON.stringify(brand));
    } catch {
      return false;
    }
    this.current.set(brand);
    this.apply(brand);
    return true;
  }

  reset(): void {
    this.storage.remove(BRAND_KEY);
    this.current.set({ ...BRAND_DEFAULT });
    this.apply(this.current());
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

  private read(): Brand {
    const stored = this.storage.get<Partial<Brand>>(BRAND_KEY);
    return stored && typeof stored === 'object'
      ? { ...BRAND_DEFAULT, ...stored }
      : { ...BRAND_DEFAULT };
  }
}
