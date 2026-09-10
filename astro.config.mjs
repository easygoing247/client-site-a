import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// 本番公開時は実際のドメインに差し替えてください（sitemap生成に使用されます）
const SITE_URL = 'https://master-template-multi.easygoing247.workers.dev';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],
  image: {
    // astro:assets のデフォルト画像最適化（sharp）を使用
    domains: [],
  },
  build: {
    // サイト全体で共有する CSS は1ファイル約20KB（gzip 約5KB）と小さいため、
    // 外部 <link rel="stylesheet"> による追加リクエスト（レンダーブロック）を
    // なくし、各HTMLの <head> に直接インライン展開する。
    // （'auto' は既定4KB未満のみインライン化するため、この規模だと外部化される）
    inlineStylesheets: 'always',
  },
});
