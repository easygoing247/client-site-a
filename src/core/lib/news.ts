// ============================================================================
// src/core/lib/news.ts
// お知らせ（news コレクション）の取得ヘルパー。
// 一覧・詳細の両ページから利用し、公開日降順・下書き除外の条件を統一する。
// ============================================================================
import { getCollection, type CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;

/**
 * カテゴリの slug（newsCategories コレクションのファイル名）→表示名の対応表を
 * ビルド時に取得する。一覧・詳細ページはこの結果を `newsCategoryLabel()` /
 * `collectNewsCategories()` へ渡して使う（2026-09、カテゴリの動的管理化に伴い
 * 旧・固定4択の NEWS_CATEGORY_LABELS を置き換えた）。
 */
export async function getNewsCategoryMap(): Promise<Record<string, string>> {
  const categories = await getCollection('newsCategories');
  const map: Record<string, string> = {};
  for (const entry of categories) {
    if (entry.data.title) map[entry.id] = entry.data.title;
  }
  return map;
}

/**
 * カテゴリslugを表示名へ変換する。`labelMap` に存在しないslug（カテゴリが
 * 削除された後も記事側に値が残っている場合など）は、素のslugをそのまま
 * 表示するのではなく「カテゴリ無し」として扱う（安全側のフォールバック。
 * 存在しない識別子をそのまま訪問者に見せないため）。
 */
export function newsCategoryLabel(category: string | undefined, labelMap: Record<string, string>): string | undefined {
  if (!category) return undefined;
  return labelMap[category];
}

/**
 * URL・リンク先として使う「日付を含まない」公開用スラッグ。
 * config.yml の news コレクションは、2026-09の変更で
 * `slug: "{{fields.urlSlug}}"`（旧: "{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}"）
 * に変更したため、新規作成される記事のファイル名にはもう日付が付かない。
 * ただし変更前に作成済みの既存ファイル（`2026-09-09-sample.md` 等）は
 * リネームしていないため、`entry.slug`（＝ファイル名）には引き続き
 * 先頭に日付が残っている。新旧どちらの記事も同じ「日付なしURL」で
 * アクセスできるよう、この関数で先頭の `YYYY-MM-DD-` を正規表現で
 * 除去してから使う（該当しない場合はそのまま返すため、日付の付いていない
 * 新規記事にも安全に適用できる）。`getStaticPaths()` のルート生成・
 * 一覧ページやトップページのリンク先（href）は必ずこの値を経由し、
 * `entry.slug` を直接URLに使わないこと。
 */
export function getPublicSlug(entry: NewsEntry): string {
  return entry.slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

/** 日付を「2026年9月9日」形式に整形（未設定なら空文字）。 */
export function formatNewsDate(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 下書き（draft: true）を除外した記事一覧を、以下の優先順位で並べて返す：
 *   1. `pinned: true` の記事を常に最優先（最上部）に配置。
 *   2. 固定記事が複数ある場合は `pinOrder`（数値が小さいほど上）の昇順。
 *   3. 固定されていない記事は、従来どおり公開日の新しい順（降順）。
 * トップページ（News.astro）・一覧ページ（news/index.astro）の両方が
 * この関数経由で取得するため、ソート順の変更はここ1箇所で完結する。
 */
export async function getPublishedNews(): Promise<NewsEntry[]> {
  const entries = await getCollection('news', ({ data }) => data.draft !== true);
  return entries.sort((a, b) => {
    const aPinned = a.data.pinned === true;
    const bPinned = b.data.pinned === true;
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    if (aPinned && bPinned) {
      const orderDiff = (a.data.pinOrder ?? 1) - (b.data.pinOrder ?? 1);
      if (orderDiff !== 0) return orderDiff;
    }
    return (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0);
  });
}

/**
 * 記事一覧に実際に使われているカテゴリを、表示名の五十音・アルファベット順で
 * 返す（一覧ページのカテゴリフィルター用）。`labelMap` に無いカテゴリ（削除済み
 * カテゴリを指す記事が残っている場合等）は、フィルターボタン自体を出さない
 * （該当記事は「すべて」フィルターでのみ表示される、安全側のフォールバック）。
 */
export function collectNewsCategories(
  posts: NewsEntry[],
  labelMap: Record<string, string>,
): { value: string; label: string }[] {
  const present = new Set<string>();
  for (const p of posts) {
    if (p.data.category) present.add(p.data.category);
  }
  return Array.from(present)
    .filter((value) => labelMap[value])
    .map((value) => ({ value, label: labelMap[value] }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ja'));
}
