// ============================================================================
// src/lib/pages.ts
// 複数ページ版（master-template-multi）専用。下層ページ用の YAML
// （src/data/services.yml / about.yml / contactPage.yml）をビルド時に
// 読み込み・パースして型付きで公開する。siteInfo.yml に対する
// src/lib/site.ts と同じ役割・同じ実装方針（`?raw` インポート）。
// 各下層ページ（src/pages/services.astro 等）はこのモジュール経由でのみ
// データへアクセスし、コンポーネントへのテキスト直書きを禁止する。
// ============================================================================
import yaml from 'js-yaml';
import servicesRaw from '../data/services.yml?raw';
import aboutRaw from '../data/about.yml?raw';
import contactPageRaw from '../data/contactPage.yml?raw';

export interface ServicesPage {
  heading?: string;
  lead?: string;
  items?: {
    title?: string;
    description?: string;
    image?: string;
    features?: string[];
  }[];
  priceTable?: {
    name?: string;
    price?: number;
    note?: string;
  }[];
  priceNote?: string;
}

export interface AboutPage {
  heading?: string;
  lead?: string;
  greeting?: {
    heading?: string;
    body?: string;
    name?: string;
    image?: string;
  };
  profile?: {
    label?: string;
    value?: string;
  }[];
  access?: {
    address?: string;
    directions?: string;
    parking?: string;
    mapEmbedUrl?: string;
  };
}

export interface ContactPage {
  heading?: string;
  intro?: string;
  notes?: string[];
  privacyPolicy?: {
    heading?: string;
    body?: string;
    updatedAt?: string;
  };
}

export const servicesPage = (yaml.load(servicesRaw) ?? {}) as ServicesPage;
export const aboutPage = (yaml.load(aboutRaw) ?? {}) as AboutPage;
export const contactPage = (yaml.load(contactPageRaw) ?? {}) as ContactPage;

// ============================================================================
// プレーンテキスト（text ウィジェット）を簡易的にブロック配列へ変換する。
// ・空行で段落を区切る
// ・行頭 "## " は小見出し（h3）として扱う
// Markdown パーサを新たに依存に加えないための最小実装。
// ============================================================================
export type TextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

export function parseTextBlocks(source: string | undefined | null): TextBlock[] {
  if (!source) return [];
  return source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const headingMatch = chunk.match(/^#{1,6}\s+(.*)$/);
      if (headingMatch && !chunk.includes('\n')) {
        return { type: 'heading', text: headingMatch[1].trim() } as const;
      }
      return { type: 'paragraph', text: chunk } as const;
    });
}
