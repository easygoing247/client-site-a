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
  features: {
    enableFeatures: boolean;
    enableServices: boolean;
    enableFlow: boolean;
    enableProducts: boolean;
    enableWorks: boolean;
    enablePlans: boolean;
    enableFaq: boolean;
    enableAccess: boolean;
    enableContact: boolean;
    /** トップページの「お知らせ」セクション（ヒーローと選ばれる理由の間） */
    enableNews: boolean;
  };
  /** トップページの「お知らせ」セクション設定 */
  newsSection: {
    eyebrow: string;
    heading: string;
    /** トップページに表示するお知らせの件数 */
    count: number;
    linkLabel: string;
    linkHref: string;
  };
  sectionOrder: { id: string }[];
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
  };
  ui: {
    privacyPolicyLabel: string;
    privacyConsentSuffix: string;
  };
  nav: { label: string; href: string }[];
  navCta: { label: string; href: string };
  footerNav: { label: string; href: string }[];
  /** スマホ表示時、画面下部に常時表示される「お電話」「LINEで相談」固定バーの設定。
   * 電話番号・LINEのURL自体は `contact` / `sns` を参照する（このオブジェクトは
   * 文言・表示トグルのみを持つ）。 */
  stickyContactBar: {
    leftButton: {
      label: string;
      show: boolean;
      /** "primary"=デザインテーマ設定のテーマカラーに連動／"accent"=LINE風グリーン */
      color?: 'primary' | 'accent';
      /** 未入力（既定 "tel"）時の解釈は StickyContactBar.astro 側の既定値に委ねる */
      actionType?: 'tel' | 'url' | 'form';
      /** 入力があれば「連絡先」の電話番号より優先される個別リンク先 */
      customLink?: string;
    };
    rightButton: {
      label: string;
      show: boolean;
      actionType?: 'tel' | 'url' | 'form';
      /** 入力があれば「SNS設定」のLINE URLより優先される個別リンク先 */
      customLink?: string;
    };
  };
  copyright: string;
}

export const site = yaml.load(raw) as SiteInfo;

// ============================================================================
// ヘッダー／フッターのナビゲーション項目は、リンク先セクションが
// `features.*` フラグで非表示になっている場合、連動して非表示にする。
// （管理画面の「機能フラグ」で該当セクションをOFFにした際、ナビだけ
// 　リンク切れのまま残ってしまうのを防ぐため）
// ============================================================================
// 複数ページ版（master-template-multi）では、トップページのセクションへ戻る
// リンクを「/#works」のようにルート付きハッシュで持たせるため、旧来の
// 「#works」形式と両方をキーに登録しておく。「/services」などの下層ページ
// 専用リンクは対応フラグを持たない＝常に表示。
const navHrefToFeatureFlag: Partial<Record<string, keyof SiteInfo['features']>> = {
  '#features': 'enableFeatures',
  '#services': 'enableServices',
  '#flow': 'enableFlow',
  '#products': 'enableProducts',
  '#works': 'enableWorks',
  '#plans': 'enablePlans',
  '#faq': 'enableFaq',
  '#access': 'enableAccess',
  '#contact': 'enableContact',
  '/#features': 'enableFeatures',
  '/#services': 'enableServices',
  '/#flow': 'enableFlow',
  '/#products': 'enableProducts',
  '/#works': 'enableWorks',
  '/#plans': 'enablePlans',
  '/#faq': 'enableFaq',
  '/#access': 'enableAccess',
  '/#contact': 'enableContact',
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

export function visibleNavItems<T extends { href: string; label: string }>(items: T[]): T[] {
  return (items ?? [])
    .filter((item) => {
      // 表示名・リンク先のどちらかが未入力の項目は表示しない
      if (!item.label || !item.href) return false;
      const flag = navHrefToFeatureFlag[item.href];
      // 対応するセクションフラグが無いリンク（外部リンク等）は常に表示する
      return flag === undefined || site.features[flag];
    })
    .map((item) => {
      const pageHeading = navHrefToPageHeading[item.href];
      return pageHeading ? { ...item, label: pageHeading } : item;
    });
}
