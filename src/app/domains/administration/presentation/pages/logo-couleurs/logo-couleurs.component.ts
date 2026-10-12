import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  BRAND_DEFAULT,
  BRAND_FONTS,
  Brand,
  BrandColorKey,
  BrandFont,
  BrandLogoKey,
  PALETTES,
  Palette,
  brandVars,
  colorChange,
  paletteColors,
} from '../../../../../core/branding/brand';
import { LeaveAware } from '../../../../../core/guards/unsaved-changes.guard';
import { BrandService } from '../../../../../core/services/brand.service';
import { ConfirmService } from '../../../../../core/services/confirm.service';
import { ThemeService } from '../../../../../core/services/theme.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { contrastRatio, isHexColor } from '../../../../../core/utils/color.util';
import { initialsOf } from '../../../../../core/utils/text.util';
import { TransmissionStore } from '../../../../dossiers/infrastructure/store/transmission.store';

type PreviewTheme = 'light' | 'dark';
type StatusTone = 'danger' | 'warning' | 'muted';

const LOGOS: { key: BrandLogoKey; label: string; hint: string }[] = [
  { key: 'logoFull', label: 'Logo complet', hint: 'Barre latérale dépliée et bordereau' },
  { key: 'logoIcon', label: 'Logo icône', hint: 'Barre latérale repliée (carré)' },
  { key: 'favicon', label: 'Favicon', hint: 'Onglet du navigateur' },
];

const COLORS: { key: BrandColorKey; label: string }[] = [
  { key: 'primary', label: 'Principale' },
  { key: 'secondary', label: 'Secondaire' },
  { key: 'accent', label: 'Accent' },
  { key: 'background', label: 'Fond' },
  { key: 'text', label: 'Texte' },
];

const PREVIEW_THEMES: { id: PreviewTheme; label: string }[] = [
  { id: 'light', label: 'Clair' },
  { id: 'dark', label: 'Sombre' },
];

const MAX_LOGO_BYTES = 500 * 1024;
const MIN_CONTRAST = 4.5;

const STATUS_CLASS: Record<StatusTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  muted: 'text-ink-muted',
};

/** `4.46` → `4,5` */
function ratioLabel(ratio: number): string {
  return ratio.toFixed(1).replace('.', ',');
}

/** Administration : identité, couleurs, police et rayon de la marque blanche. */
@Component({
  selector: 'app-logo-couleurs',
  templateUrl: './logo-couleurs.component.html',
})
export class LogoCouleursComponent implements LeaveAware {
  private readonly brand = inject(BrandService);
  private readonly theme = inject(ThemeService);
  private readonly store = inject(TransmissionStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  protected readonly fonts = BRAND_FONTS;
  protected readonly previewThemes = PREVIEW_THEMES;

  /** Saisie en cours ; `null` tant que rien n'a été modifié depuis l'enregistrement. */
  private readonly edited = signal<Brand | null>(null);
  private readonly logoErrors = signal<Partial<Record<BrandLogoKey, string>>>({});
  /** Texte saisi dans un champ couleur, conservé tel quel tant qu'il n'est pas valide. */
  private readonly hexInputs = signal<Partial<Record<BrandColorKey, string>>>({});
  protected readonly previewTheme = signal<PreviewTheme>('light');

  protected readonly draft = computed(() => this.edited() ?? this.brand.brand());
  private readonly dirty = computed(
    () => JSON.stringify(this.draft()) !== JSON.stringify(this.brand.brand()),
  );

  protected readonly identityError = computed(() => {
    const draft = this.draft();
    if (!draft.appName.trim()) {
      return "Le nom de l'application est obligatoire.";
    }
    if (!draft.shortName.trim()) {
      return 'Le nom court est obligatoire.';
    }
    return draft.org.trim() ? '' : "Le nom de l'organisation est obligatoire.";
  });
  private readonly hexError = computed(() =>
    Object.values(this.hexInputs()).some((value) => !isHexColor(value)),
  );

  protected readonly initials = computed(() =>
    initialsOf(this.draft().shortName || this.draft().appName),
  );

  protected readonly logos = computed(() =>
    LOGOS.map((logo) => ({
      ...logo,
      src: this.draft()[logo.key],
      error: this.logoErrors()[logo.key] ?? '',
    })),
  );

  protected readonly palettes = computed(() =>
    PALETTES.map((palette) => ({
      palette,
      selected: this.draft().palette === palette.id,
      swatches: [palette.primary, palette.primaryDark, palette.accent, palette.background],
    })),
  );

  protected readonly colors = computed(() =>
    COLORS.map((color) => {
      const typed = this.hexInputs()[color.key];
      const value = this.draft()[color.key];
      return {
        ...color,
        value: isHexColor(value) ? value : '#000000',
        text: typed ?? value,
        invalid: typed !== undefined && !isHexColor(typed),
      };
    }),
  );

  protected readonly warnings = computed(() => {
    const draft = this.draft();
    const warnings: string[] = [];
    if (isHexColor(draft.text) && isHexColor(draft.background)) {
      const ratio = contrastRatio(draft.text, draft.background);
      if (ratio < MIN_CONTRAST) {
        warnings.push(
          `Contraste texte / fond insuffisant (${ratioLabel(ratio)}:1, minimum recommandé 4,5:1).`,
        );
      }
    }
    if (isHexColor(draft.primary)) {
      const ratio = contrastRatio('#FFFFFF', draft.primary);
      if (ratio < MIN_CONTRAST) {
        warnings.push(
          `Le texte blanc sur la couleur principale est peu lisible (${ratioLabel(ratio)}:1, minimum recommandé 4,5:1) : boutons et badges principaux concernés.`,
        );
      }
    }
    return warnings;
  });

  protected readonly saveDisabled = computed(
    () => !!this.identityError() || this.hexError() || !this.dirty(),
  );
  protected readonly saveTip = computed(() => {
    if (this.identityError()) {
      return this.identityError();
    }
    if (this.hexError()) {
      return 'Couleur au format invalide';
    }
    return this.dirty() ? '' : 'Aucune modification à enregistrer';
  });

  protected readonly status = computed<{ text: string; tone: string }>(() => {
    if (this.identityError()) {
      return { text: this.identityError(), tone: STATUS_CLASS.danger };
    }
    if (this.hexError()) {
      return {
        text: "Corrigez les couleurs au format invalide avant d'enregistrer.",
        tone: STATUS_CLASS.danger,
      };
    }
    return this.dirty()
      ? {
          text: "Modifications non enregistrées : visibles uniquement dans l'aperçu.",
          tone: STATUS_CLASS.warning,
        }
      : { text: "Thème enregistré — appliqué à toute l'application.", tone: STATUS_CLASS.muted };
  });

  /** Variables de marque du brouillon, posées sur le seul bloc d'aperçu. */
  protected readonly previewVars = computed(() => brandVars(this.draft()));
  protected readonly treatedCount = computed(
    () =>
      this.store
        .dossiers()
        .filter((dossier) => dossier.status === 'Validé' || dossier.status === 'Clôturé').length,
  );

  constructor() {
    // La police choisie doit être chargée pour que l'aperçu la montre avant l'enregistrement.
    effect(() => this.brand.loadFont(this.draft().font));
  }

  protected setText(key: 'appName' | 'shortName' | 'org', event: Event): void {
    this.update({ [key]: (event.target as HTMLInputElement).value });
  }

  protected onLogoFile(key: BrandLogoKey, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!/\.(png|svg|jpe?g|webp)$/i.test(file.name)) {
      this.setLogoError(
        key,
        `« ${file.name} » : format non accepté. Utilisez PNG, SVG, JPG ou WEBP.`,
      );
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      this.setLogoError(
        key,
        `« ${file.name} » pèse ${Math.round(file.size / 1024)} Ko : 500 Ko maximum.`,
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.setLogoError(key, '');
      this.update({ [key]: reader.result as string });
    };
    reader.onerror = () => this.setLogoError(key, 'Lecture du fichier impossible.');
    reader.readAsDataURL(file);
  }

  protected removeLogo(key: BrandLogoKey): void {
    this.update({ [key]: '' });
    this.setLogoError(key, '');
  }

  protected pickPalette(palette: Palette): void {
    this.hexInputs.set({});
    this.update(paletteColors(palette));
  }

  protected onColorPick(key: BrandColorKey, event: Event): void {
    this.hexInputs.update((inputs) => {
      const next = { ...inputs };
      delete next[key];
      return next;
    });
    this.update(colorChange(key, (event.target as HTMLInputElement).value));
  }

  protected onColorText(key: BrandColorKey, event: Event): void {
    let value = (event.target as HTMLInputElement).value.trim();
    if (value && !value.startsWith('#')) {
      value = `#${value}`;
    }
    this.hexInputs.update((inputs) => ({ ...inputs, [key]: value }));
    if (isHexColor(value)) {
      this.update(colorChange(key, value));
    }
  }

  protected setFont(event: Event): void {
    this.update({ font: (event.target as HTMLSelectElement).value as BrandFont });
  }

  protected setRadius(event: Event): void {
    this.update({ radius: parseInt((event.target as HTMLInputElement).value, 10) || 0 });
  }

  protected toggleDarkDefault(): void {
    this.update({ darkDefault: !this.draft().darkDefault });
  }

  protected save(): void {
    if (this.saveDisabled()) {
      return;
    }
    if (!this.brand.save({ ...this.draft() })) {
      this.toast.error(
        'Enregistrement impossible : logos trop volumineux pour le stockage du navigateur. Réduisez leur taille.',
      );
      return;
    }
    this.clearEdition();
    this.theme.followBrandDefault();
    this.toast.success('Thème enregistré');
  }

  protected async reset(): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: `Revenir au thème ${BRAND_DEFAULT.appName} par défaut ?`,
      text: `Le nom, les logos, les couleurs, la police et le rayon des bords reprennent les valeurs ${BRAND_DEFAULT.appName} d'origine, pour tous les profils.`,
      okLabel: 'Réinitialiser le thème',
      danger: true,
    });
    if (!confirmed) {
      return;
    }
    this.brand.reset();
    this.clearEdition();
    this.theme.followBrandDefault();
    this.toast.success(`Thème ${BRAND_DEFAULT.appName} par défaut rétabli.`);
  }

  /** Appelé par le garde de sortie de la route. */
  canLeave(): boolean | Promise<boolean> {
    if (!this.dirty()) {
      return true;
    }
    return this.confirm.ask({
      title: 'Quitter sans enregistrer ?',
      text: 'Le thème (logo et couleurs) a été modifié mais pas enregistré. Si vous quittez cet écran, cette saisie sera perdue.',
      okLabel: 'Quitter sans enregistrer',
      cancelLabel: 'Rester',
      danger: true,
    });
  }

  private update(change: Partial<Brand>): void {
    this.edited.set({ ...this.draft(), ...change });
  }

  private setLogoError(key: BrandLogoKey, message: string): void {
    this.logoErrors.update((errors) => ({ ...errors, [key]: message }));
  }

  private clearEdition(): void {
    this.edited.set(null);
    this.logoErrors.set({});
    this.hexInputs.set({});
  }
}
