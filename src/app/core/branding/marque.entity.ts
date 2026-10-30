import { BRAND_DEFAULT, BRAND_FONTS, Brand, BrandFont } from './brand';

/** Configuration de la marque telle que l'API la stocke (« Logo & Couleurs »), vocabulaire compris. */
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

/** Marque renvoyée par l'API (`branding.base`) ; les logos sont des chemins d'API, vides sans logo. */
export interface Marque {
  configuration: ConfigurationMarque;
  logoComplet: string | null;
  logoIcone: string | null;
  favicon: string | null;
  modifieLe: string | null;
}

/** Marque appliquée par le front ; `url` complète les chemins des logos avec l'adresse du serveur. */
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
  };
}

function isBrandFont(value: string): value is BrandFont {
  return (BRAND_FONTS as readonly string[]).includes(value);
}
