// ============================================================================
// src/lib/news.ts
// お知らせ・ブログ（news コレクション）の取得ヘルパー。
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

/** 日付を「2026年9月9日」形式に整形（未設定なら空文字）。 */
export function formatNewsDate(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 下書き（draft: true）を除外し、公開日の新しい順に並べた記事一覧を返す。 */
export async function getPublishedNews(): Promise<NewsEntry[]> {
  const entries = await getCollection('news', ({ data }) => data.draft !== true);
  return entries.sort(
    (a, b) => (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0),
  );
}
