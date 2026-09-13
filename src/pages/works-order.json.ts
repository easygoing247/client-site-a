// ============================================================================
// src/pages/works-order.json.ts
// 「サイト全体設定 ＞ 実績 ＞ 表示順序」（site.works.order）をビルド時に
// 静的JSONとして生成する。管理画面の「実績・活用事例作成」一覧画面は、
// この表示順序リストをReduxストアから読み取って一覧の並び順を実サイトと
// 連動させている（public/admin/index.html の computeWorksDisplayOrder）が、
// Decap CMSはアクティブに開いていないコレクション（この場合は「サイト
// 全体設定」）のエントリをReduxへロードしない場合があり、その場合は
// 表示順序が常に「未キュレーション扱い」にフォールバックしてしまい、
// リロードのたびに正しい順序が反映されたりされなかったりする不安定な
// 挙動の原因になっていた。works-titles.json.ts と同じ「ビルド時静的
// 生成データを同一オリジンから fetch する」方式で、Reduxに未ロードでも
// 常に最後にデプロイした時点の表示順序を確実に参照できるようにする
// （CLAUDE.md 9.33/9.37/9.40参照）。
// ============================================================================
import type { APIRoute } from 'astro';
import { site } from '../lib/site';

export const GET: APIRoute = async () => {
  const order = Array.isArray(site.works.order) ? site.works.order : [];
  return new Response(JSON.stringify(order), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
