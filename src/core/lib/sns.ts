// ============================================================================
// src/core/lib/sns.ts
// 公式SNSリンクの一覧を、管理画面（siteInfo.yml のトップレベル `sns` リスト）で
// 指定された順序どおりに、かつ enabled かつ URL 入力済みのものだけ返す。
// Access.astro / Footer.astro / about.astro（会社概要の「公式SNS」行）など、
// SNSアイコンを掲載するすべての箇所は必ずこのモジュール経由でリンク一覧を
// 取得し、表示順序・非表示条件がサイト全体で常に一致するようにする
// （アイコンの色は各コンポーネント側で決めてよい実装詳細のため扱わない）。
// ============================================================================
import { site } from './site';

export type SnsId = 'line' | 'instagram' | 'x' | 'facebook' | 'youtube' | 'tiktok';

export interface SnsLink {
  id: SnsId;
  href: string;
  /** アイコンのみで表示するため、視覚的なテキストではなくaria-label専用の補助文言 */
  label: string;
  /** 単色アイコンのSVGパス（isFrameの場合は未使用） */
  icon?: string;
  /** Instagramのような複数図形の枠線アイコン用フラグ */
  isFrame?: boolean;
}

const SNS_DEFS: Record<SnsId, Omit<SnsLink, 'id' | 'href'>> = {
  line: {
    label: 'LINE公式アカウント',
    icon: 'M12 3C6.48 3 2 6.69 2 11.24c0 4.08 3.58 7.49 8.42 8.13.33.07.78.22.89.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1 .88.55 1.07-.46 5.8-3.42 7.92-5.85C21.34 14.86 22 13.13 22 11.24 22 6.69 17.52 3 12 3Z',
  },
  instagram: {
    label: 'インスタグラム',
    isFrame: true,
  },
  x: {
    label: 'エックス（X）',
    icon: 'M4 3h3.6l4.7 6.3L17.6 3H21l-6.9 8.4L21.4 21h-3.6l-5.1-6.8L6.6 21H3l7.3-8.9L4 3Z',
  },
  facebook: {
    label: 'フェイスブック',
    icon: 'M15 8.5h2.2V5.6h-2.4c-2.4 0-3.8 1.5-3.8 3.9v1.8H8.6v3h2.4V21h3.1v-6.7h2.4l.4-3h-2.8v-1.5c0-.87.23-1.3 1.9-1.3Z',
  },
  youtube: {
    label: 'ユーチューブ',
    icon: 'M21.6 7.2a2.5 2.5 0 0 0-1.76-1.76C18.25 5 12 5 12 5s-6.25 0-7.84.44A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.76C5.75 19 12 19 12 19s6.25 0 7.84-.44a2.5 2.5 0 0 0 1.76-1.76A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z',
  },
  tiktok: {
    label: 'ティックトック',
    icon: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .6.05.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1Z',
  },
};

export const SNS_IDS = Object.keys(SNS_DEFS) as SnsId[];

function isSnsId(value: unknown): value is SnsId {
  return typeof value === 'string' && value in SNS_DEFS;
}

/**
 * 管理画面の `sns` リストの順序どおりに、enabled かつ URL 入力済みの SNS のみ返す。
 */
export function orderedSnsLinks(): SnsLink[] {
  return (site.sns ?? [])
    .filter((s) => !!s && isSnsId(s.id) && s.enabled !== false && !!(s.url && String(s.url).trim()))
    .map((s) => ({ id: s.id as SnsId, href: String(s.url).trim(), ...SNS_DEFS[s.id as SnsId] }));
}

/** 指定 SNS の URL を返す（enabled: false または未入力なら空文字）。 */
export function snsUrl(id: SnsId): string {
  const item = (site.sns ?? []).find((s) => s && s.id === id);
  if (!item || item.enabled === false) return '';
  return (item.url ?? '').trim();
}
