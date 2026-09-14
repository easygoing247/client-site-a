// ============================================================================
// src/pages/news-categories.json.ts
// 「お知らせカテゴリ管理」（newsCategories コレクション）の slug → カテゴリ名
// 対応表をビルド時に静的JSONとして生成する。管理画面のライブプレビュー
// （public/admin/preview.js の NewsPreview）はビルド対象外のブラウザ上JSで
// あり、Astro の Content Collections を直接参照できないため、
// src/pages/works-titles.json.ts と同じ「ビルド時静的生成データを同一
// オリジンから fetch する」方式で解決する（CLAUDE.md 9.33 参照）。
// ============================================================================
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const categories = await getCollection('newsCategories');
  const map: Record<string, string> = {};
  for (const entry of categories) {
    if (entry.data.title) map[entry.id] = entry.data.title;
  }
  return new Response(JSON.stringify(map), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
