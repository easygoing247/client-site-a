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
});
