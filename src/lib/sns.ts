// ============================================================================
// src/lib/sns.ts
// SNSリンクの一覧を、管理画面（siteInfo.yml の contact.snsOrder）で指定された
// 順序どおりに、かつURL未入力のものを自動的に除外して返す。
// Access.astro / Footer.astro など、SNSアイコンを掲載するすべての箇所は
// 必ずこのモジュール経由でリンク一覧を取得し、表示順序・非表示条件が
// サイト全体で常に一致するようにする（アイコンの見た目・色は各コンポーネント
// 側で個別に決めてよい実装詳細のため、ここでは扱わない）。
// ============================================================================
import { site } from './site';

export type SnsId = 'line' | 'instagram' | 'x' | 'facebook';

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

const SNS_URL_FIELD: Record<SnsId, 'lineUrl' | 'instagramUrl' | 'xUrl' | 'facebookUrl'> = {
  line: 'lineUrl',
  instagram: 'instagramUrl',
  x: 'xUrl',
  facebook: 'facebookUrl',
};

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
};

const DEFAULT_ORDER: SnsId[] = ['line', 'instagram', 'x', 'facebook'];

function isSnsId(value: string): value is SnsId {
  return value in SNS_DEFS;
}

/**
 * 管理画面で指定された表示順序（未指定・一部欠落があれば既定順序で補完）に沿って、
 * URLが設定されているSNSのみを返す。
 */
export function orderedSnsLinks(): SnsLink[] {
  const configuredOrder = (site.contact.snsOrder ?? []).map((item) => item.id).filter(isSnsId);
  // 管理画面側の並び替えリストに全SNSが揃っていない場合（未設定・追加直後等）に
  // 備え、既定順序で補完してから重複を除去する。
  const ids = [...configuredOrder, ...DEFAULT_ORDER].filter((id, index, arr) => arr.indexOf(id) === index);

  return ids
    .map((id) => ({ id, href: site.contact[SNS_URL_FIELD[id]], ...SNS_DEFS[id] }))
    .filter((sns): sns is SnsLink => !!sns.href);
}
