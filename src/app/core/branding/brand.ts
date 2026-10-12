import { deepColor, mixColors } from '../utils/color.util';

/** Identité visuelle de l'application (marque blanche), réglée dans « Logo & Couleurs ». */
export interface Brand {
  appName: string;
  shortName: string;
  org: string;
  /** Logos enregistrés en `data:` URL ; vide = pastille aux initiales. */
  logoFull: string;
  logoIcon: string;
  favicon: string;
  /** Identifiant de la palette prédéfinie, ou `custom` dès qu'une couleur est modifiée. */
  palette: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  accentLight: string;
  background: string;
  text: string;
  font: BrandFont;
  radius: number;
  /** Mode sombre pour les utilisateurs qui n'ont pas encore choisi eux-mêmes. */
  darkDefault: boolean;
}

export type BrandLogoKey = 'logoFull' | 'logoIcon' | 'favicon';
export type BrandColorKey = 'primary' | 'secondary' | 'accent' | 'background' | 'text';

export const SYSTEM_FONT = 'Police système';
export const BRAND_FONTS = [
  'Geist',
  'Inter',
  'Poppins',
  'Roboto',
  'Montserrat',
  SYSTEM_FONT,
] as const;
export type BrandFont = (typeof BRAND_FONTS)[number];

/** Graisses chargées depuis Google Fonts ; Geist est déjà chargée par `styles.css`. */
export const FONT_QUERY: Partial<Record<BrandFont, string>> = {
  Inter: 'Inter:wght@400;500;600;700',
  Poppins: 'Poppins:wght@400;500;600;700',
  Roboto: 'Roboto:wght@400;500;700',
  Montserrat: 'Montserrat:wght@400;500;600;700',
};

export const BRAND_DEFAULT: Brand = {
  appName: 'YDXTrace — Démo',
  shortName: 'YDXTrace',
  org: '',
  logoFull: '',
  logoIcon: '',
  favicon: '',
  palette: 'atrad',
  primary: '#0F6E70',
  primaryDark: '#0A5254',
  secondary: '#0B2942',
  accent: '#8CCFD0',
  accentLight: '#E3F3F3',
  background: '#F4F8F9',
  text: '#0B2942',
  font: 'Geist',
  radius: 10,
  darkDefault: false,
};

export interface Palette {
  id: string;
  label: string;
  primary: string;
  primaryDark: string;
  accent: string;
  background: string;
  secondary?: string;
  accentLight?: string;
  text?: string;
}

export const PALETTES: Palette[] = [
  {
    id: 'atrad',
    label: 'Par défaut',
    primary: '#0F6E70',
    primaryDark: '#0A5254',
    accent: '#8CCFD0',
    background: '#F4F8F9',
    secondary: '#0B2942',
    accentLight: '#E3F3F3',
    text: '#0B2942',
  },
  {
    id: 'orange',
    label: 'Orange',
    primary: '#FF7518',
    primaryDark: '#CC5E13',
    accent: '#FFD1B3',
    background: '#FFF0E1',
  },
  {
    id: 'bleu',
    label: 'Bleu',
    primary: '#2563EB',
    primaryDark: '#1D4ED8',
    accent: '#93C5FD',
    background: '#EFF6FF',
  },
  {
    id: 'vert',
    label: 'Vert',
    primary: '#16A34A',
    primaryDark: '#15803D',
    accent: '#86EFAC',
    background: '#F0FDF4',
  },
  {
    id: 'violet',
    label: 'Violet',
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    accent: '#C4B5FD',
    background: '#F5F3FF',
  },
  {
    id: 'neutre',
    label: 'Neutre',
    primary: '#475569',
    primaryDark: '#334155',
    accent: '#CBD5E1',
    background: '#F8FAFC',
  },
];

/** Couleurs complètes d'une palette : les teintes absentes sont dérivées de la principale. */
export function paletteColors(palette: Palette): Partial<Brand> {
  const secondary = palette.secondary ?? deepColor(palette.primary);
  return {
    palette: palette.id,
    primary: palette.primary,
    primaryDark: palette.primaryDark,
    accent: palette.accent,
    background: palette.background,
    secondary,
    accentLight: palette.accentLight ?? mixColors(palette.primary, '#FFFFFF', 0.9),
    text: palette.text ?? secondary,
  };
}

/** Modification d'une couleur : la principale entraîne ses teintes dérivées. */
export function colorChange(key: BrandColorKey, value: string): Partial<Brand> {
  const change: Partial<Brand> = { [key]: value.toUpperCase(), palette: 'custom' };
  if (key === 'primary') {
    change.primaryDark = mixColors(value, '#000000', 0.2);
    change.accentLight = mixColors(value, '#FFFFFF', 0.9);
  }
  return change;
}

/** Variables CSS de la marque, lues par les jetons de `styles.css`. */
export function brandVars(brand: Brand): Record<string, string> {
  return {
    '--brand-primary': brand.primary,
    '--brand-primary-dark': brand.primaryDark,
    '--brand-secondary': brand.secondary,
    '--brand-accent': brand.accent,
    '--brand-accent-light': brand.accentLight,
    '--brand-background': brand.background,
    '--brand-text-color': brand.text,
    '--brand-font-family': brand.font === SYSTEM_FONT ? 'system-ui' : `"${brand.font}"`,
    '--brand-border-radius': `${brand.radius}px`,
  };
}
