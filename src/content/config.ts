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
      title: z.string(),
      price: z.number(),
      mainImage: image(),
      summary: z.string(),
      specs: z.array(z.string()).default([]),
      order: z.number().default(0),
      publishedAt: z.coerce.date().optional(),
    }),
});

export const collections = { products };
