// ============================================================================
// src/pages/works-titles.json.ts
// 「実績・活用事例作成」（works コレクション）の slug → タイトル対応表を
// ビルド時に静的JSONとして生成する。管理画面の「サイト全体設定 ＞ 実績 ＞
// 表示順序」リストは、選択済みの実績を relation ウィジェットの value_field
// （＝slug文字列）としてのみ保持しており、Decap側にタイトルを解決する
// 仕組みが無い。かつ Redux ストアも「実績・活用事例作成」コレクションを
// 一度も開いていないセッションでは該当エントリを保持していないため、
// src/pages/media-library.json.ts と同じ「ビルド時静的生成データを
// 同一オリジンから fetch する」方式で解決する（CLAUDE.md 9.33 参照）。
// ============================================================================
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const works = await getCollection('works');
  const map: Record<string, string> = {};
  for (const work of works) {
    if (work.data.title) map[work.slug] = work.data.title;
  }
  return new Response(JSON.stringify(map), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
