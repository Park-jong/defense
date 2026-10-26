export const THEMES = {
  frontier: { name: '프런티어', caption: 'FRONTIER / ORIGINAL', description: '강철과 화약의 기지 방어', color: '#101512' },
  bishoujo: { name: '모에크래프트', caption: '星灯りの戦姫 / STELLA', description: '별빛을 두른 전희들의 방어선', color: '#21172f' },
} as const;
export type ThemeKey = keyof typeof THEMES;
export const THEME_STORAGE_KEY = 'frontier-theme';
export const THEME_CHANGED = 'frontier-theme-changed';
export const isTheme = (value: unknown): value is ThemeKey => value === 'frontier' || value === 'bishoujo';

function initialTheme(): ThemeKey {
  if (typeof window === 'undefined') return 'frontier';
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : 'frontier';
  } catch { return 'frontier'; }
}
let current = initialTheme();
export const activeTheme = (): ThemeKey => current;
export const isBishoujo = (): boolean => current === 'bishoujo';
export const themeBrand = (): string => isBishoujo() ? '모에크래프트' : 'FRONTIER';

/** Canonical texture names stay stable in gameplay; both visual sets are preloaded. */
export function themeTexture(key: string): string {
  const original = key.replace(/^bishoujo:/, '');
  return isBishoujo() && /^(base_|barrel_|unit_|console-chrome$|portrait$)/.test(original)
    ? 'bishoujo:' + original : original;
}

export function applyThemeDocument(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = current;
  document.title = isBishoujo() ? '모에크래프트 — 별빛 방어선' : 'FRONTIER — 기지 방어';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEMES[current].color);
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', themeBrand());
  const game = document.getElementById('game');
  if (game) game.setAttribute('aria-label', (game.getAttribute('aria-label') ?? '').replace(/^(프런티어 기지 방어|미소녀크래프트 별빛 방어선|모에크래프트 별빛 방어선)/,
    isBishoujo() ? '모에크래프트 별빛 방어선' : '프런티어 기지 방어'));
}

export function selectTheme(value: unknown): void {
  if (!isTheme(value) || current === value) return;
  current = value;
  try { window.localStorage.setItem(THEME_STORAGE_KEY, value); } catch { /* Private browsing still supports this session. */ }
  applyThemeDocument();
  window.dispatchEvent(new Event(THEME_CHANGED));
}
