// ============================================================================
// src/core/lib/siteSettings.ts
// src/data/site-settings.json（Decap CMSの「デザインテーマ設定」）を
// 型付きで公開する。テーマカラーの切り替えは、この値を Layout.astro が
// <html data-theme="..."> に反映し、src/styles/global.css で定義した
// CSS変数（[data-theme="..."] { --color-primary: ... }）が
// tailwind.config.mjs 経由で primary 系ユーティリティクラスに反映される
// 仕組みになっている。
// ============================================================================
import rawSettings from '../../data/site-settings.json';

export const THEME_PRESETS = ['blue', 'red', 'green', 'purple', 'orange'] as const;
export type ThemePreset = (typeof THEME_PRESETS)[number];

export interface SiteSettings {
  theme: ThemePreset;
}

function normalizeTheme(value: unknown): ThemePreset {
  return (THEME_PRESETS as readonly string[]).includes(value as string) ? (value as ThemePreset) : 'blue';
}

export const siteSettings: SiteSettings = {
  theme: normalizeTheme((rawSettings as { theme?: string }).theme),
};
