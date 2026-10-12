/** Outils sur les couleurs hexadécimales `#RRGGBB` (marque blanche). */

type Rgb = [number, number, number];

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function toRgb(hex: string): Rgb {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: number[]): string {
  const channels = rgb.map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel)))
      .toString(16)
      .padStart(2, '0'),
  );
  return `#${channels.join('')}`.toUpperCase();
}

/** Mélange linéaire : `ratio` = 0 rend `from`, 1 rend `to`. */
export function mixColors(from: string, to: string, ratio: number): string {
  const start = toRgb(from);
  const end = toRgb(to);
  return toHex(start.map((channel, index) => channel + (end[index] - channel) * ratio));
}

/** Version très foncée d'une couleur : même teinte, luminosité de 15 %. */
export function deepColor(hex: string): string {
  const [red, green, blue] = toRgb(hex).map((channel) => channel / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;
  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) {
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue /= 6;
  }
  saturation = Math.min(saturation, 0.62);
  const target = 0.15;
  const upper = target * (1 + saturation);
  const lower = 2 * target - upper;
  const channel = (shift: number): number => {
    const position = (shift + 1) % 1;
    if (position < 1 / 6) {
      return lower + (upper - lower) * 6 * position;
    }
    if (position < 0.5) {
      return upper;
    }
    if (position < 2 / 3) {
      return lower + (upper - lower) * (2 / 3 - position) * 6;
    }
    return lower;
  };
  return toHex([channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255]);
}

function luminance(hex: string): number {
  const weights = [0.2126, 0.7152, 0.0722];
  return toRgb(hex)
    .map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    })
    .reduce((total, value, index) => total + value * weights[index], 0);
}

/** Rapport de contraste WCAG entre deux couleurs (de 1 à 21). */
export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
