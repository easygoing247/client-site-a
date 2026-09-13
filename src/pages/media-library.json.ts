// ============================================================================
// src/pages/media-library.json.ts
// 管理画面「メディア管理」で登録した画像メタデータ（カテゴリ・タイトル・
// Altテキスト）を、ファイル名をキーにしたJSONとしてビルド時に静的出力する。
// public/admin/index.html のメディアライブラリ拡張（カテゴリ絞り込み）が
// 同一オリジンから `fetch('/media-library.json')` して参照する
// （CLAUDE.md 9.32 参照）。
// ============================================================================
import type { APIRoute } from 'astro';
import { mediaMetaByFilename } from '../lib/mediaLibrary';

export const GET: APIRoute = () => {
  return new Response(JSON.stringify(mediaMetaByFilename), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
