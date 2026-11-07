import { BRAND_DEFAULT, BRAND_FONTS, Brand, BrandFont } from './brand';

export interface ConfigurationMarque {
  nomApplication: string;
  nomCourt: string;
  organisation: string | null;
  palette: string;
  couleurPrincipale: string;
  couleurPrincipaleFoncee: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurAccentClaire: string;
  couleurFond: string;
  couleurTexte: string;
  police: string;
  rayon: number;
  modeSombreParDefaut: boolean;
  vocabulaire: { tiers: string; dossier: string };
}

export interface Marque {
  configuration: ConfigurationMarque;
  logoComplet: string | null;
  logoIcone: string | null;
  favicon: string | null;
  modifieLe: string | null;
}

export function brandFromMarque(marque: Marque, url: (path: string) => string): Brand {
  const c = marque.configuration;
  const logo = (path: string | null): string => (path ? url(path) : '');
  return {
    appName: c.nomApplication,
    shortName: c.nomCourt,
    org: c.organisation ?? '',
    logoFull: logo(marque.logoComplet),
    logoIcon: logo(marque.logoIcone),
    favicon: logo(marque.favicon),
    palette: c.palette,
    primary: c.couleurPrincipale,
    primaryDark: c.couleurPrincipaleFoncee,
    secondary: c.couleurSecondaire,
    accent: c.couleurAccent,
    accentLight: c.couleurAccentClaire,
    background: c.couleurFond,
    text: c.couleurTexte,
    font: isBrandFont(c.police) ? c.police : BRAND_DEFAULT.font,
    radius: c.rayon,
    darkDefault: c.modeSombreParDefaut,
    vocab: { tiers: c.vocabulaire?.tiers || 'Client', dossier: c.vocabulaire?.dossier || 'Dossier' },
  };
}

export function configurationOf(brand: Brand): ConfigurationMarque {
  return {
    nomApplication: brand.appName.trim(),
    nomCourt: brand.shortName.trim(),
    organisation: brand.org.trim(),
    palette: brand.palette,
    couleurPrincipale: brand.primary,
    couleurPrincipaleFoncee: brand.primaryDark,
    couleurSecondaire: brand.secondary,
    couleurAccent: brand.accent,
    couleurAccentClaire: brand.accentLight,
    couleurFond: brand.background,
    couleurTexte: brand.text,
    police: brand.font,
    rayon: brand.radius,
    modeSombreParDefaut: brand.darkDefault,
    vocabulaire: { tiers: brand.vocab.tiers.trim(), dossier: brand.vocab.dossier.trim() },
  };
}

function isBrandFont(value: string): value is BrandFont {
  return (BRAND_FONTS as readonly string[]).includes(value);
}
