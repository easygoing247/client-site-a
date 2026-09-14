// ============================================================================
// src/content/config.ts — Content Collections スキーマ定義
// 型化ページ（1件=1ファイル）用の works コレクション＝「実績・活用事例」。
// 「セクション表示順序」の works が表示ONの間、トップページ「実績・活用事例」セクション
// （src/components/Works.astro）に一覧表示され、各カードは /works/[slug] の
// 個別ページへリンクする。
// ※「商品一覧」トップセクション・/products ページは型化ページではなく、
//   単一ファイル（src/data/products.yml、CMS「商品作成」）のリスト構造。
//   スキーマ検証は無く（js-yaml のみ）、テンプレート側の
//   `typeof x === 'number'` 等のガードで空文字を吸収する（src/lib/pages.ts 参照）。
// ============================================================================
import { defineCollection, z } from 'astro:content';

// ============================================================================
// CMS 起因の型ゆれを吸収する共通ヘルパー（再発防止）
// Decap CMS は number ウィジェットの値を空欄にすると frontmatter に
// `price: ""`（空文字）として書き出す。素の z.number() だと
// 「Expected number, received string」でビルドが落ちるため、
// 「空文字・null → 未入力扱い」「"1,000" のようなカンマ入り文字列 → 数値」
// へ正規化してから検証する。
// ============================================================================
const toNumberOrUndefined = (v: unknown): unknown => {
  if (v === '' || v === null || v === undefined) return undefined;
  if (typeof v === 'string') {
    const n = Number(v.replace(/,/g, '').trim());
    return Number.isNaN(n) ? undefined : n;
  }
  return v;
};

/** 任意の数値項目（未入力なら undefined）。 */
const cmsNumberOptional = z.preprocess(toNumberOrUndefined, z.number().optional());

/** 既定値つきの数値項目（未入力・変換不可なら fallback）。 */
const cmsNumberWithDefault = (fallback: number) =>
  z.preprocess((v) => toNumberOrUndefined(v) ?? fallback, z.number());

/** 任意の日付項目（空文字・null は未入力扱い）。 */
const cmsDateOptional = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.date().optional(),
);

const works = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      // CMS側（config.yml）で全項目を任意入力にしているため、スキーマ側も
      // 未入力を許容する。表示側（Works.astro / works/[slug].astro）
      // で値が無い項目は非表示にする。
      title: z.string().optional(),
      // URL用識別子（半角英数字・ハイフン）。config.yml の collection slug:
      // "{{fields.urlSlug}}" の組み立てにのみ使う入力用フィールドで、
      // フロントエンドの表示・ロジックでは参照しない。フィールド名を敢えて
      // `slug` にしていない理由は news コレクションの同名フィールドの
      // コメント（本ファイル内 news 定義）を参照。
      urlSlug: z.string().optional(),
      price: cmsNumberOptional,
      // フィールド名は Decap CMS のコレクション一覧「カード」表示が
      // サムネイルを自動表示するために内部で認識する名前（image等）に
      // 合わせている（"mainImage"のような任意の名前では認識されない）。
      image: image().optional(),
      imageAlt: z.string().optional(),
      summary: z.string().optional(),
      specs: z.array(z.string()).default([]),
      publishedAt: cmsDateOptional,
    }),
});

// 複数ページ版（master-template-multi）専用：お知らせの投稿コレクション。
// config.yml の「お知らせ」コレクションと対応。CMS側で全項目を任意入力に
// しているため、スキーマ側も未入力を許容する。draft: true の記事は一覧・詳細の
// 表示側で除外する想定。
const news = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z.object({
      title: z.string().optional(),
      // URL用識別子（半角英数字・ハイフン）。Decap側で collection の slug:
      // "{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}" の組み立てにのみ使う
      // 入力用フィールドで、フロントエンドの表示・ロジックでは参照しない
      // （URLスラッグ自体は Astro の `post.slug`＝実際のファイル名を使う）。
      // ※ フィールド名はあえて `slug` にしない：Astro の Content Collections は
      // frontmatter の `slug` キーを「スラッグ上書き用の予約語」として特別扱いし、
      // スキーマに含めると `ContentSchemaContainsSlugError` でビルドが落ちる上、
      // 仮にスキーマから外して残しても「年月日を含まないこのフィールドの値だけ」が
      // 実際のURLスラッグとして上書き適用されてしまい、ファイル名（年月日込み）と
      // 食い違う（例: ファイル名 `2026-09-10-greeting.md` なのにURLが `/news/greeting/`
      // になる）。そのため `urlSlug` という別名にしている。
      urlSlug: z.string().optional(),
      // フィールド名はworksと同じ理由でDecap CMSのカード表示サムネイル
      // 自動認識のため"image"にしている（旧"eyecatch"）。
      image: image().optional(),
      imageAlt: z.string().optional(),
      publishedAt: cmsDateOptional,
      category: z.enum(['info', 'blog', 'event', 'works']).optional(),
      summary: z.string().optional(),
      // 記事の固定表示（トップ／一覧の最上部への固定）。複数の記事を固定
      // した場合の並び順は pinOrder（数値が小さいほど上）で決める。
      // cmsNumberWithDefault(1) を使う理由は works.price 等と同じ
      // （Decapのnumberウィジェットは空欄だと frontmatter に "" を
      // 書き出すため、素の z.number() だとビルドが落ちる）。
      pinned: z.boolean().default(false),
      pinOrder: cmsNumberWithDefault(1),
      draft: z.boolean().default(false),
    }),
});

export const collections = { works, news };
