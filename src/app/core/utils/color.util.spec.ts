import { contrastRatio, deepColor, isHexColor, mixColors } from './color.util';

describe('color.util', () => {
  it('should only accept #RRGGBB colours', () => {
    expect(isHexColor('#0F6E70')).toBe(true);
    expect(isHexColor('#0f6e70')).toBe(true);
    expect(isHexColor('0F6E70')).toBe(false);
    expect(isHexColor('#0F6')).toBe(false);
    expect(isHexColor('#0F6E7G')).toBe(false);
  });

  it('should mix two colours linearly', () => {
    expect(mixColors('#000000', '#FFFFFF', 0)).toBe('#000000');
    expect(mixColors('#000000', '#FFFFFF', 1)).toBe('#FFFFFF');
    expect(mixColors('#FF7518', '#000000', 0.2)).toBe('#CC5E13');
  });

  it('should compute the WCAG contrast ratio', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(contrastRatio('#FFFFFF', '#FF7518')).toBeLessThan(4.5);
    expect(contrastRatio('#FFFFFF', '#0F6E70')).toBeGreaterThan(4.5);
  });

  it('should derive a very dark colour that keeps white text readable', () => {
    const deep = deepColor('#2563EB');
    expect(isHexColor(deep)).toBe(true);
    expect(contrastRatio('#FFFFFF', deep)).toBeGreaterThan(10);
    expect(deepColor('#808080')).toBe('#262626');
  });
});
