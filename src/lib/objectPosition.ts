// ============================================================================
// src/lib/objectPosition.ts
// 画像の掲載位置（CSS object-position）を CMS の設定文字列から安全に解決する。
// object-fit: cover で枠に切り抜き表示される画像に対し、被写体が中央から
// 外れている場合の見た目調整に使う。
// 許可リスト（キーワード）＋「N% M%」の数値ペアのみ通し、それ以外は
// undefined を返す（＝スタイルを出力しない＝ブラウザ既定の 50% 50%）。
// ============================================================================
const ALLOWED = new Set<string>([
  'center',
  'top',
  'bottom',
  'left',
  'right',
  'left top',
  'top left',
  'right top',
  'top right',
  'left bottom',
  'bottom left',
  'right bottom',
  'bottom right',
  'center top',
  'center bottom',
  'left center',
  'right center',
  'center 25%',
  'center 75%',
]);

export function objectPosition(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const v = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  if (!v || v === 'center' || v === 'center center' || v === '50% 50%') return undefined;
  if (ALLOWED.has(v)) return v;
  // "30% 70%" のような数値ペア（0〜100%）
  if (/^\d{1,3}%\s+\d{1,3}%$/.test(v)) return v;
  return undefined;
}

/** CMS の「掲載位置」select ウィジェット用の共通オプション定義。 */
export const OBJECT_POSITION_OPTIONS = [
  { label: '中央（既定）', value: 'center' },
  { label: '上', value: 'center top' },
  { label: 'やや上', value: 'center 25%' },
  { label: 'やや下', value: 'center 75%' },
  { label: '下', value: 'center bottom' },
  { label: '左', value: 'left center' },
  { label: '右', value: 'right center' },
  { label: '左上', value: 'left top' },
  { label: '右上', value: 'right top' },
  { label: '左下', value: 'left bottom' },
  { label: '右下', value: 'right bottom' },
] as const;
