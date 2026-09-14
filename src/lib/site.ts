// ============================================================================
// src/lib/site.ts
// siteInfo.yml をビルド時（Node環境）に読み込み・パースして型付きで公開する。
// すべてのコンポーネントはこのモジュール経由でのみサイトデータへアクセスする。
// ============================================================================
import yaml from 'js-yaml';
// Viteの `?raw` インポートでYAML本文を文字列としてバンドルに埋め込む。
// fs.readFileSync + import.meta.url ベースのパス解決は、ビルド後に
// ファイル配置が変わり ENOENT になるため使用しない。
import raw from '../data/siteInfo.yml?raw';
import { servicesPage, aboutPage, contactPage, newsPage } from './pages';

/**
 * 「画面下部固定バー」の1ボタン分の設定（2026-09、左右ボタンで重複していた
 * 型定義をYAMLアンカー（config.yml側）と対になる形で1箇所へ集約）。
 * 左右で異なるのは既定値（config.yml側の `default`）だけで、構造自体は
 * 完全に共通。将来3つ目以降のボタンを追加する場合も、この型と
 * `StickyContactBar.astro` の `resolveButton()` をそのまま再利用できる。
 */
export interface StickyButtonConfig {
  label: string;
  show: boolean;
  /** "primary"=デザインテーマ設定のテーマカラーに連動／"accent"=LINE風グリーン */
  color?: 'primary' | 'accent';
  /** 未入力時の解釈は StickyContactBar.astro 側の既定値に委ねる */
  actionType?: 'tel' | 'url' | 'form';
  /** 入力があれば、対応する共通設定（連絡先の電話番号／SNS設定のLINE URL等）より優先される個別リンク先 */
  customLink?: string;
}

export interface SiteInfo {
  company: {
    name: string;
    logo: string;
    /** ロゴ画像が無い場合、または useTextLogo が true の場合に表示するテキストロゴ */
    textLogo?: string;
    /** true でロゴ画像より常にテキストロゴを優先表示する */
    useTextLogo?: boolean;
    siteName: string;
    tagline: string;
    description: string;
    representative: string;
    establishedYear: number;
    ogImage: string;
  };
  contact: {
    phone: string;
    phoneHref: string;
    email: string;
  };
  /** 公式SNS設定（サイト全体で一括管理）。並び順＝表示順。 */
  sns: { id: string; url: string; enabled: boolean }[];
  access: {
    eyebrow: string;
    heading: string;
    // 「店舗情報」は独立セクションではなく、アクセスセクションの一部として統合。
    store: {
      name: string;
      postalCode: string;
      address: string;
      nearestStation: string;
      businessHours: string;
      closedDays: string;
      parking: string;
      mapEmbedUrl: string;
      image: string;
      imageAlt: string;
    };
    labels: {
      postalCode: string;
      address: string;
      nearestStation: string;
      phone: string;
      businessHours: string;
      closedDays: string;
      parking: string;
      sns: string;
    };
  };
  /** トップページの「お知らせ」セクション設定 */
  newsSection: {
    /** トップページの「お知らせ」セクションを表示する（sectionOrder 対象外の固定配置のため独立管理） */
    enabled?: boolean;
    eyebrow: string;
    heading: string;
    /** トップページに表示するお知らせの件数 */
    count: number;
    linkLabel: string;
    linkHref: string;
  };
  /** セクションの並び順＋表示ON/OFF（統合管理、2026-09 A-2）。
   * `enable` 未入力（既存データ・末尾の未掲載セクション）は true 扱い。 */
  sectionOrder: { id: string; enable?: boolean }[];
  hero: {
    heading: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    image: string;
    imageAlt: string;
    badges: string[];
  };
  features_section: {
    eyebrow: string;
    heading: string;
    items: { number: string; title: string; text: string; icon: string }[];
  };
  services: {
    eyebrow: string;
    heading: string;
    /** セクション内に置く下層ページへのリンク文言（未入力なら非表示） */
    linkLabel: string;
    linkHref: string;
    // カード個別項目（画像・タイトル・説明）は siteInfo.yml では持たず、
    // 「下層ページ ＞ サービス内容・料金」の services.yml「サービス詳細」
    // （src/lib/pages.ts の servicesPage.items）を Service.astro が直接参照する
    // （二重管理防止。/services ページと完全に同じデータ・並び順を共有）。
  };
  flow: {
    eyebrow: string;
    heading: string;
    steps: { number: number; title: string; text: string; highlight?: boolean }[];
  };
  works: {
    eyebrow: string;
    heading: string;
    // カード個別項目は siteInfo.yml では持たない。型化ページ（Content
    // Collections: works）を src/components/Works.astro が直接参照する
    // （二重管理防止。/works/[slug] と表示内容・並び順が常に一致する）。
    /** トップページに表示する件数 */
    count: number;
    /** PC表示時の並列カード枚数（1〜3。超過分はスライダーで閲覧） */
    columns?: number;
    /** ドラッグ&ドロップで並べ替える表示順序（works の slug のリスト）。
     * 未掲載の実績は末尾に追加順で並ぶ。 */
    order?: string[];
  };
  plans: {
    eyebrow: string;
    heading: string;
    note: string;
    popularBadgeLabel: string;
    /** 各プランカードのボタン文言・リンク先 */
    buttonLabel: string;
    buttonHref: string;
    items: {
      name: string;
      description: string;
      price: number;
      popular: boolean;
      features: string[];
    }[];
  };
  faq: {
    eyebrow: string;
    heading: string;
    items: { q: string; a: string }[];
  };
  contactSection: {
    eyebrow: string;
    heading: string;
    body: string;
    points: string[];
    form: {
      // 各入力欄のラベル・プレースホルダー・必須・表示は
      // contactPage.yml の formFields（src/lib/pages.ts）で管理する。
      // ここは送信ボタン・送信結果メッセージのみ。
      submitLabel: string;
      /** 送信中の送信ボタン文言 */
      sendingLabel: string;
      /** 送信成功時に表示するメッセージ */
      successMessage: string;
      /** 送信失敗時に表示するメッセージ */
      errorMessage: string;
    };
  };
  /** トップページ「商品一覧」セクション（データ本体は src/lib/pages.ts の productsPage） */
  productsSection: {
    eyebrow: string;
    heading: string;
    /** トップページに表示する件数 */
    count: number;
    /** 「/products」への誘導リンク文言（未入力なら非表示） */
    linkLabel: string;
    linkHref: string;
  };
  /** 実績詳細（/works/[slug]）の共通文言。breadcrumbHome は全ページ共通の
   * パンくず「トップ」表示名としても使われる（about/services/contact/news 等）。 */
  productPage: {
    breadcrumbHome: string;
    specsHeading: string;
    ctaLabel: string;
    ctaHref: string;
  };
  ui: {
    privacyPolicyLabel: string;
    privacyConsentSuffix: string;
  };
  nav: { label: string; href: string }[];
  navCta: { label: string; href: string };
  footerNav: {
    /** true の場合、下の items を無視してヘッダーナビ（nav）と同じ内容を表示する */
    useHeaderNav?: boolean;
    items?: { label: string; href: string }[];
  };
  /** スマホ表示時、画面下部に常時表示される「お電話」「LINEで相談」固定バーの設定。
   * 電話番号・LINEのURL自体は `contact` / `sns` を参照する（このオブジェクトは
   * 文言・表示トグルのみを持つ）。 */
  stickyContactBar: {
    /** 既定：「連絡先」の電話番号へ発信するボタン */
    leftButton: StickyButtonConfig;
    /** 既定：「SNS設定」のLINE URLへ遷移するボタン */
    rightButton: StickyButtonConfig;
  };
  copyright: string;
}

export const site = yaml.load(raw) as SiteInfo;

// ============================================================================
// セクションの表示ON/OFFは、9.50の管理画面精査を受けて2026-09に
// 「セクション表示順序」（sectionOrder）へ一本化した（旧・独立した
// `features.enableXxx` フラグ群は廃止。CLAUDE.md 9.51参照）。
// トップページの`Hero`直下に固定配置される「お知らせ」セクションのみ
// sectionOrder の対象外のため、`newsSection.enabled` で独立管理する。
// ============================================================================
export type SectionId =
  | 'features'
  | 'services'
  | 'flow'
  | 'products'
  | 'works'
  | 'plans'
  | 'faq'
  | 'access'
  | 'contact';

const ALL_SECTION_IDS: SectionId[] = [
  'features',
  'services',
  'flow',
  'products',
  'works',
  'plans',
  'faq',
  'access',
  'contact',
];

/** 指定セクションが表示ONかどうか（sectionOrderに項目が無ければ既定でtrue）。 */
export function isSectionEnabled(id: SectionId): boolean {
  const item = (site.sectionOrder ?? []).find((s) => s.id === id);
  return item ? item.enable !== false : true;
}

/** 実際の表示順序（sectionOrderが空の場合は全セクションを既定順で返す）。 */
export function orderedSectionIds(): SectionId[] {
  const configured = (site.sectionOrder ?? [])
    .map((s) => s.id)
    .filter((id): id is SectionId => (ALL_SECTION_IDS as string[]).includes(id));
  return configured.length > 0 ? configured : ALL_SECTION_IDS;
}

// ============================================================================
// ヘッダー／フッターのナビゲーション項目は、リンク先セクションが
// 「セクション表示順序」で非表示（enable: false）になっている場合、
// 連動して非表示にする（管理画面で該当セクションをOFFにした際、ナビだけ
// リンク切れのまま残ってしまうのを防ぐため）。
// ============================================================================
// 複数ページ版（master-template-multi）では、トップページのセクションへ戻る
// リンクを「/#works」のようにルート付きハッシュで持たせるため、旧来の
// 「#works」形式と両方をキーに登録しておく。「/services」などの下層ページ
// 専用リンクは対応セクションIDを持たない＝常に表示。
const navHrefToSectionId: Partial<Record<string, SectionId>> = {
  '#features': 'features',
  '#services': 'services',
  '#flow': 'flow',
  '#products': 'products',
  '#works': 'works',
  '#plans': 'plans',
  '#faq': 'faq',
  '#access': 'access',
  '#contact': 'contact',
  '/#features': 'features',
  '/#services': 'services',
  '/#flow': 'flow',
  '/#products': 'products',
  '/#works': 'works',
  '/#plans': 'plans',
  '/#faq': 'faq',
  '/#access': 'access',
  '/#contact': 'contact',
};

// 「下層ページ編集」の4ページ（services/about/contact/news）は、CMS上で
// 各ページ自身の「ページ見出し」を編集できる（PageHeader・<title>にも
// 使われている、同じ `heading` フィールド）。ヘッダー／フッターのナビ表示名を
// 都度手動で二重管理しなくて済むよう、これらのURLへ向くナビ項目は表示名を
// 対応ページの `heading` で上書きする（未入力ならnav側の設定値のままにする
// フォールバック）。
const navHrefToPageHeading: Partial<Record<string, string | undefined>> = {
  '/services': servicesPage.heading,
  '/about': aboutPage.heading,
  '/contact': contactPage.heading,
  '/news': newsPage.heading,
};

// ============================================================================
// 表示名の優先順位：
//   1. 対象が「下層ページ編集」の各ページ（/services 等）へのリンクの場合、
//      既定では対応ページの「ページ見出し」を表示名として使う。
//   2. ナビ項目側の「表示名」フィールドに入力があれば、それを優先して
//      上書きする（個別に別の表記へ差し替えたい場合のみ入力すればよい）。
//   3. どちらも空の項目（リンク先・表示名が両方未入力）は表示しない。
// これにより「表示名」フィールドは省略可能な上書き用途に変わるため、
// 未入力を理由に項目ごと非表示にしていた旧ロジックの `!item.label` 判定は
// 撤廃している。
// ============================================================================
export function visibleNavItems<T extends { href: string; label: string }>(items: T[]): T[] {
  return (items ?? [])
    .map((item) => {
      if (!item.href) return null;
      const pageHeading = navHrefToPageHeading[item.href];
      const label = item.label || pageHeading;
      if (!label) return null;
      const sectionId = navHrefToSectionId[item.href];
      // 対応するセクションIDが無いリンク（外部リンク・下層ページ等）は常に表示する
      if (sectionId !== undefined && !isSectionEnabled(sectionId)) return null;
      return { ...item, label };
    })
    .filter((item): item is T => item !== null);
}

/**
 * フッターナビの表示元を解決する（2026-09、A-5／2026-09-14 CTA結合対応）。
 * `footerNav.useHeaderNav` が true の場合はヘッダーナビ（`nav`）と
 * 同じ項目を流用し、末尾にヘッダーCTAボタン（`navCta`）の「表示名」
 * 「リンク先」を1項目として追加する（ヘッダー側の見た目——通常メニュー
 * ＋強調CTAボタン——にフッターも合わせるため）。`useHeaderNav` が
 * false の場合は従来どおり `footerNav.items` のみを使う。
 * `navCta` は `label`／`href` のどちらかが未入力（＝ヘッダー自体でも
 * 非表示になる状態、`Header.astro` の `site.navCta.label &&
 * site.navCta.href` 判定と同じ条件）なら安全に追加をスキップする。
 * ナビ項目は最終的に `visibleNavItems()` を通すため、セクション表示
 * ON/OFF・下層ページ見出しへのフォールバックは通常のナビと同様に働く
 * （`navCta` はページ見出しフォールバックの対象外の明示的な表示名を
 * 持つため、`visibleNavItems()` を通さずそのまま追加する）。
 */
export function resolveFooterNavItems(): { label: string; href: string }[] {
  if (!site.footerNav?.useHeaderNav) {
    return visibleNavItems(site.footerNav?.items ?? []);
  }
  const items = visibleNavItems(site.nav ?? []);
  const cta = site.navCta;
  if (cta?.label && cta?.href) {
    return [...items, { label: cta.label, href: cta.href }];
  }
  return items;
}
