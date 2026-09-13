// ============================================================================
// src/lib/mediaLibrary.ts
// 管理画面「メディア管理」（src/data/mediaLibrary.yml）で登録した画像ごとの
// カテゴリ・タイトル・Altテキストを、ファイル名をキーにしたルックアップに
//変換して公開する。Decap CMSの既定メディアライブラリ（画像フィールドを
// 開いた時のアップロード／選択モーダル）にはこの種のメタデータをその場で
// 参照する仕組みが無いため、`src/pages/media-library.json.ts`（ビルド時
// 生成の静的JSON）経由で、管理画面側から `fetch('/media-library.json')`
// して読み込む（既存の「本番公開済みHTMLの流用」パターン＝preview.js の
// loadSiteStylesheetAndTheme() と同じ考え方。詳細は CLAUDE.md 9.32 参照）。
// ============================================================================
import yaml from 'js-yaml';
import raw from '../data/mediaLibrary.yml?raw';

interface MediaLibraryItem {
  image?: string;
  category?: string;
  title?: string;
  alt?: string;
}

interface MediaLibraryData {
  items?: MediaLibraryItem[];
}

const data = (yaml.load(raw) as MediaLibraryData) ?? {};

export interface MediaMeta {
  category?: string;
  title?: string;
  alt?: string;
}

/** ファイル名（拡張子込み。パスは含まない）をキーにしたメタデータ一覧。 */
export const mediaMetaByFilename: Record<string, MediaMeta> = Object.fromEntries(
  (data.items ?? [])
    .filter((item) => item.image)
    .map((item) => {
      const filename = String(item.image).split('/').pop() ?? '';
      return [filename, { category: item.category, title: item.title, alt: item.alt }];
    })
    .filter(([filename]) => filename)
);
