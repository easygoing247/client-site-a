// ============================================================================
// src/pages/llms.txt.ts
// llms.txt（https://llmstxt.org/ 準拠）。LLMがサイトをクロール・要約する際の
// 手がかりとなるMarkdownファイルをビルド時に動的生成する。
// 仕様上必須の「H1見出し」「本文中のリンク」を満たす内容を
// siteInfo.yml から組み立てるため、テキストのハードコードを避けつつ
// 常にサイトの実際の内容と同期した状態を保てる。
// ============================================================================
import type { APIRoute } from 'astro';
import { site } from '../lib/site';

export const GET: APIRoute = ({ site: siteURL }) => {
  const base = (siteURL ?? new URL('https://example.com/')).toString().replace(/\/$/, '');

  const lines: string[] = [];
  lines.push(`# ${site.company.siteName}`);
  lines.push('');
  lines.push(`> ${site.company.description}`);
  lines.push('');
  lines.push('## ページ');
  lines.push('');
  lines.push(`- [トップページ](${base}/): ${site.company.tagline}`);
  lines.push(`- [プライバシーポリシー](${base}/privacy/): 個人情報の取り扱いについて`);

  if (site.features.enableProducts) {
    lines.push(`- [商品・プラン一覧](${base}/#products): ${site.productsSection.heading}`);
  }

  lines.push('');
  lines.push('## 会社情報');
  lines.push('');
  lines.push(`- 会社名: ${site.company.name}`);
  lines.push(`- 代表者: ${site.company.representative}`);
  lines.push(`- 所在地: ${site.store.postalCode} ${site.store.address}`);
  lines.push(`- 電話番号: ${site.contact.phone}`);
  lines.push(`- メールアドレス: ${site.contact.email}`);

  const body = lines.join('\n') + '\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
    },
  });
};
