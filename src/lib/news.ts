// ============================================================================
// src/lib/news.ts
// お知らせ（news コレクション）の取得ヘルパー。
// 一覧・詳細の両ページから利用し、公開日降順・下書き除外の条件を統一する。
// ============================================================================
import { getCollection, type CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;

export const NEWS_CATEGORY_LABELS: Record<string, string> = {
  info: 'お知らせ',
  blog: 'ブログ',
  event: 'イベント',
  works: '実績紹介',
};

export function newsCategoryLabel(category: string | undefined): string | undefined {
  if (!category) return undefined;
  return NEWS_CATEGORY_LABELS[category] ?? category;
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
 * 記事一覧に実際に使われているカテゴリを、既定の並び順（お知らせ→ブログ→
 * イベント→実績紹介）で返す（一覧ページのカテゴリフィルター用）。
 */
export function collectNewsCategories(posts: NewsEntry[]): { value: string; label: string }[] {
  const present = new Set<string>();
  for (const p of posts) {
    if (p.data.category) present.add(p.data.category);
  }
  const ordered = Object.keys(NEWS_CATEGORY_LABELS).filter((v) => present.has(v));
  // 既定リストに無いカテゴリ（将来追加分）も後ろに拾う
  for (const v of present) {
    if (!ordered.includes(v)) ordered.push(v);
  }
  return ordered.map((value) => ({ value, label: NEWS_CATEGORY_LABELS[value] ?? value }));
}
