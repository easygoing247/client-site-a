// ============================================================================
// src/content/config.ts — Content Collections スキーマ定義
// 竹/松プラン（型化ページ）用の products コレクション。
// siteInfo.yml の features.enableProducts が true のときのみ
// トップページの商品セクションおよび /products/[slug] への導線が有効になる。
// ============================================================================
import { defineCollection, z } from 'astro:content';

const products = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      // CMS側（config.yml）で全項目を任意入力にしているため、スキーマ側も
      // 未入力を許容する。表示側（Products.astro / products/[slug].astro）
      // で値が無い項目は非表示にする。
      title: z.string().optional(),
      price: z.number().optional(),
      mainImage: image().optional(),
      summary: z.string().optional(),
      specs: z.array(z.string()).default([]),
      order: z.number().default(0),
      publishedAt: z.coerce.date().optional(),
    }),
});

// 複数ページ版（master-template-multi）専用：お知らせ・ブログの投稿コレクション。
// config.yml の「お知らせ・ブログ」コレクションと対応。CMS側で全項目を任意入力に
// しているため、スキーマ側も未入力を許容する。draft: true の記事は一覧・詳細の
// 表示側で除外する想定。
const news = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      eyecatch: image().optional(),
      eyecatchAlt: z.string().optional(),
      publishedAt: z.coerce.date().optional(),
      category: z.enum(['info', 'blog', 'event', 'works']).optional(),
      summary: z.string().optional(),
      draft: z.boolean().default(false),
    }),
});

export const collections = { products, news };
