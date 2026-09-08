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

export interface SiteInfo {
  company: {
    name: string;
    logo: string;
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
    lineUrl: string;
    instagramUrl: string;
    xUrl: string;
    facebookUrl: string;
    phoneLabel: string;
    lineLabel: string;
    showPhoneButton: boolean;
    showLineButton: boolean;
  };
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
    items: { title: string; text: string; image: string }[];
  };
  flow: {
    eyebrow: string;
    heading: string;
    steps: { number: number; title: string; text: string }[];
  };
  works: {
    eyebrow: string;
    heading: string;
    items: { title: string; industry: string; tag: string; image: string }[];
  };
  plans: {
    eyebrow: string;
    heading: string;
    note: string;
    popularBadgeLabel: string;
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
      namePlaceholder: string;
      companyPlaceholder: string;
      emailPlaceholder: string;
      messagePlaceholder: string;
      submitLabel: string;
    };
  };
  productsSection: {
    eyebrow: string;
    heading: string;
  };
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
  icons: { check: string };
  copyright: string;
}

export const site = yaml.load(raw) as SiteInfo;

// ============================================================================
// ヘッダー／フッターのナビゲーション項目は、リンク先セクションが
// `features.*` フラグで非表示になっている場合、連動して非表示にする。
// （管理画面の「機能フラグ」で該当セクションをOFFにした際、ナビだけ
// 　リンク切れのまま残ってしまうのを防ぐため）
// ============================================================================
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
};

export function visibleNavItems<T extends { href: string; label: string }>(items: T[]): T[] {
  return (items ?? []).filter((item) => {
    // 表示名・リンク先のどちらかが未入力の項目は表示しない
    if (!item.label || !item.href) return false;
    const flag = navHrefToFeatureFlag[item.href];
    // 対応するセクションフラグが無いリンク（外部リンク等）は常に表示する
    return flag === undefined || site.features[flag];
  });
}
