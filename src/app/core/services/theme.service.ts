import { DOCUMENT, Service, computed, inject, signal } from '@angular/core';
import { BrandService } from './brand.service';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'atrad_theme_v1';

@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly storage = inject(StorageService);
  private readonly brand = inject(BrandService);

  private readonly current = signal<Theme>(this.readStoredTheme());

  readonly theme = this.current.asReadonly();
  readonly isDark = computed(() => this.current() === 'dark');

  constructor() {
    this.apply(this.current());
  }

  toggleTheme(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.current.set(theme);
    this.storage.set(THEME_KEY, theme);
    this.apply(theme);
  }

  /** Oublie le choix de l'utilisateur et revient au mode par défaut de la marque. */
  clearChoice(): void {
    this.storage.remove(THEME_KEY);
    this.followBrandDefault();
  }

  /** Applique le mode par défaut de la marque tant que l'utilisateur n'a pas choisi lui-même. */
  followBrandDefault(): void {
    if (this.storedTheme()) {
      return;
    }
    const theme = this.brandDefault();
    this.current.set(theme);
    this.apply(theme);
  }

  // Appliqué de façon synchrone (et non dans un effect) pour éviter un flash du thème
  // clair au chargement.
  private apply(theme: Theme): void {
    const root = this.document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
  }

  private readStoredTheme(): Theme {
    return this.storedTheme() ?? this.brandDefault();
  }

  private storedTheme(): Theme | null {
    const stored = this.storage.get<Theme>(THEME_KEY);
    return stored === 'dark' || stored === 'light' ? stored : null;
  }

  private brandDefault(): Theme {
    return this.brand.brand().darkDefault ? 'dark' : 'light';
  }
}
