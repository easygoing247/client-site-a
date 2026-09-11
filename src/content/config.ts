// ============================================================================
// src/content/config.ts — Content Collections スキーマ定義
// 竹/松プラン（型化ページ）用の products コレクション。
// siteInfo.yml の features.enableProducts が true のときのみ
// トップページの商品セクションおよび /products/[slug] への導線が有効になる。
// ============================================================================
import { defineCollection, z } from 'astro:content';

// ============================================================================
// CMS 起因の型ゆれを吸収する共通ヘルパー（再発防止）
// Decap CMS は number ウィジェットの値を空欄にすると frontmatter に
// `price: ""`（空文字）として書き出す。素の z.number() だと
// 「Expected number, received string」でビルドが落ちるため、
// 「空文字・null → 未入力扱い」「"1,000" のようなカンマ入り文字列 → 数値」
// へ正規化してから検証する。
// ============================================================================
const toNumberOrUndefined = (v: unknown): unknown => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim());
    return Number.isNaN(n) ? undefined : n;
  }
  return v;
};

/** 任意の数値項目（未入力なら undefined）。 */
const cmsNumberOptional = z.preprocess(toNumberOrUndefined, z.number().optional());

/** 既定値つきの数値項目（未入力・変換不可なら fallback）。 */
const cmsNumberWithDefault = (fallback: number) =>
  z.preprocess((v) => toNumberOrUndefined(v) ?? fallback, z.number());

/** 任意の日付項目（空文字・null は未入力扱い）。 */
const cmsDateOptional = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);

const products = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      // CMS側（config.yml）で全項目を任意入力にしているため、スキーマ側も
      // 未入力を許容する。表示側（Products.astro / products/[slug].astro）
      // で値が無い項目は非表示にする。
      title: z.string().optional(),
      price: cmsNumberOptional,
      mainImage: image().optional(),
      summary: z.string().optional(),
      specs: z.array(z.string()).default([]),
      order: cmsNumberWithDefault(0),
      publishedAt: cmsDateOptional,
    }),
});

// 複数ページ版（master-template-multi）専用：お知らせの投稿コレクション。
// config.yml の「お知らせ」コレクションと対応。CMS側で全項目を任意入力に
// しているため、スキーマ側も未入力を許容する。draft: true の記事は一覧・詳細の
// 表示側で除外する想定。
const news = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      eyecatch: image().optional(),
      eyecatchAlt: z.string().optional(),
      publishedAt: cmsDateOptional,
      category: z.enum(['info', 'blog', 'event', 'works']).optional(),
      summary: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { products, news };
