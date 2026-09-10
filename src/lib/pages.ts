// ============================================================================
// src/lib/pages.ts
// 複数ページ版（master-template-multi）専用。下層ページ用の YAML
// （src/data/services.yml / about.yml / contactPage.yml）をビルド時に
// 読み込み・パースして型付きで公開する。siteInfo.yml に対する
// src/lib/site.ts と同じ役割・同じ実装方針（`?raw` インポート）。
// 各下層ページ（src/pages/services.astro 等）はこのモジュール経由でのみ
// データへアクセスし、コンポーネントへのテキスト直書きを禁止する。
// ============================================================================
import yaml from 'js-yaml';
import servicesRaw from '../data/services.yml?raw';
import aboutRaw from '../data/about.yml?raw';
import contactPageRaw from '../data/contactPage.yml?raw';

export interface ServicesPage {
  heading?: string;
  lead?: string;
  items?: {
    title?: string;
    description?: string;
    image?: string;
    features?: string[];
    /** true で「画像：右／テキスト：左」に左右反転（既定は画像：左） */
    reverseLayout?: boolean;
  }[];
  priceTable?: {
    name?: string;
    price?: number;
    note?: string;
    /** 「含まれる内容／特徴」チェックリスト（料金プランの features と同仕様） */
    features?: string[];
  }[];
  priceNote?: string;
}

export interface AboutPage {
  heading?: string;
  lead?: string;
  /** 各セクションの表示・非表示（false で非表示。未設定は表示） */
  sections?: {
    greeting?: boolean;
    companyOverview?: boolean;
    access?: boolean;
  };
  greeting?: {
    heading?: string;
    body?: string;
    name?: string;
    image?: string;
  };
  profile?: {
    label?: string;
    value?: string;
  }[];
  /** 会社概要（表形式）に表示する「公式SNS」行のラベル */
  companySnsLabel?: string;
  access?: {
    /** 表示順・ラベル・内容・表示可否を CMS で自由に編集できる可変リスト */
    items?: {
      label?: string;
      value?: string;
      enabled?: boolean;
    }[];
    mapEmbedUrl?: string;
  };
}

/** aboutPage.access.items を「表示する行だけ」表示順に整形して返す。 */
export function resolveAboutAccessItems(
  access?: AboutPage['access'],
): { label: string; value: string }[] {
  return (access?.items ?? [])
    .filter((row) => row && row.enabled !== false && !!(row.label && row.label.trim()) && !!(row.value && String(row.value).trim()))
    .map((row) => ({ label: String(row.label).trim(), value: String(row.value).trim() }));
}

/** CMS で個別設定できるフォーム入力項目のキー（表示順もこの順で固定） */
export type ContactFieldKey = 'name' | 'company' | 'email' | 'phone' | 'message';

/** contactPage.yml の formFields.<key> に入る CMS 側の生データ */
export interface ContactFieldConfig {
  enabled?: boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

/** contactPage.yml の custom_fields[] に入る CMS 側の生データ */
export interface CustomContactFieldConfig {
  label?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  options?: unknown;
  enabled?: boolean;
  required?: boolean;
}

export interface ContactPage {
  heading?: string;
  intro?: string;
  notes?: string[];
  formFields?: Partial<Record<ContactFieldKey, ContactFieldConfig>>;
  custom_fields?: CustomContactFieldConfig[];
  privacyPolicy?: {
    heading?: string;
    body?: string;
    updatedAt?: string;
  };
}

export const servicesPage = (yaml.load(servicesRaw) ?? {}) as ServicesPage;
export const aboutPage = (yaml.load(aboutRaw) ?? {}) as AboutPage;
export const contactPage = (yaml.load(contactPageRaw) ?? {}) as ContactPage;

// ============================================================================
// プレーンテキスト（text ウィジェット）を簡易的にブロック配列へ変換する。
// ・空行で段落を区切る
// ・行頭 "## " は小見出し（h3）として扱う
// Markdown パーサを新たに依存に加えないための最小実装。
// ============================================================================
export type TextBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string };

// ============================================================================
// お問い合わせフォームの入力項目を、CMS設定（contactPage.formFields）＋既定値で
// 解決し、「表示する項目だけ」を表示順に並べて返す。
// Contact.astro（トップページ #contact）と contact.astro（/contact）の両方、
// および preview.js（renderContactFields）が同じ定義を使う。
// ============================================================================
export type ContactFieldType = 'text' | 'email' | 'tel' | 'textarea';

export interface ContactFormField {
  key: ContactFieldKey;
  label: string;
  placeholder: string;
  required: boolean;
  type: ContactFieldType;
  autocomplete: string;
}

const CONTACT_FIELD_DEFAULTS: Record<
  ContactFieldKey,
  { label: string; placeholder: string; required: boolean; type: ContactFieldType; autocomplete: string }
> = {
  name: { label: 'お名前', placeholder: '山田 太郎', required: true, type: 'text', autocomplete: 'name' },
  company: { label: '会社名', placeholder: '株式会社サンプル', required: false, type: 'text', autocomplete: 'organization' },
  email: { label: 'メールアドレス', placeholder: 'example@example.com', required: true, type: 'email', autocomplete: 'email' },
  phone: { label: '電話番号', placeholder: '090-1234-5678', required: false, type: 'tel', autocomplete: 'tel' },
  message: { label: 'お問い合わせ内容', placeholder: 'お問い合わせ内容をご記入ください', required: true, type: 'textarea', autocomplete: 'off' },
};

/** 表示順（この順で固定。電話番号は必ずメールアドレスとお問い合わせ内容の間） */
export const CONTACT_FIELD_ORDER: ContactFieldKey[] = ['name', 'company', 'email', 'phone', 'message'];

export function resolveContactFormFields(
  config?: Partial<Record<ContactFieldKey, ContactFieldConfig>>,
): ContactFormField[] {
  return CONTACT_FIELD_ORDER.map((key) => {
    const d = CONTACT_FIELD_DEFAULTS[key];
    const c = config?.[key] ?? {};
    return {
      key,
      enabled: c.enabled !== false, // 未設定なら表示
      label: (c.label ?? '').trim() || d.label,
      placeholder: c.placeholder ?? d.placeholder,
      required: typeof c.required === 'boolean' ? c.required : d.required,
      type: d.type,
      autocomplete: d.autocomplete,
    };
  })
    .filter((f) => f.enabled)
    .map(({ enabled, ...rest }) => rest);
}

// ============================================================================
// カスタム追加項目（contactPage.custom_fields[]）の解決。
// 固定項目の後ろに表示。name（キー名）は半角英数字と _ のみに正規化し、
// 空欄・固定項目と同名・予約語・重複は除外する。
// ============================================================================
export type CustomContactFieldType = 'text' | 'number' | 'tel' | 'email' | 'textarea' | 'select';

export interface CustomContactField {
  /** レンダリング用の一意キー（= name） */
  key: string;
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: CustomContactFieldType;
  /** type === 'select' のときの選択肢 */
  options: string[];
}

const CUSTOM_FIELD_TYPES: readonly CustomContactFieldType[] = [
  'text',
  'number',
  'tel',
  'email',
  'textarea',
  'select',
];

/** 固定項目や Web3Forms の予約フィールドと衝突させないための予約語 */
const RESERVED_CONTACT_FIELD_NAMES = new Set<string>([
  'name',
  'company',
  'email',
  'phone',
  'message',
  'subject',
  'from_name',
  'access_key',
  'botcheck',
  'redirect',
  'ccemail',
]);

/**
 * 固定項目・カスタム項目を ContactField.astro に渡すための共通の形。
 * （ContactFormField / CustomContactField を正規化したもの）
 */
export interface ContactRenderField {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: CustomContactFieldType;
  autocomplete?: string;
  options?: string[];
}

export function resolveCustomContactFields(list?: CustomContactFieldConfig[]): CustomContactField[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: CustomContactField[] = [];
  for (const c of list) {
    if (!c || c.enabled === false) continue;
    const name = (c.name ?? '').trim().replace(/[^A-Za-z0-9_]/g, '');
    const label = (c.label ?? '').trim();
    if (!name || !label) continue;
    if (RESERVED_CONTACT_FIELD_NAMES.has(name) || seen.has(name)) continue;
    seen.add(name);
    const type: CustomContactFieldType = CUSTOM_FIELD_TYPES.includes(c.type as CustomContactFieldType)
      ? (c.type as CustomContactFieldType)
      : 'text';
    const options = Array.isArray(c.options)
      ? (c.options.filter((o): o is string => typeof o === 'string' && o.trim() !== ''))
      : [];
    out.push({
      key: name,
      name,
      label,
      placeholder: c.placeholder ?? '',
      required: c.required === true,
      type,
      options,
    });
  }
  return out;
}

export function parseTextBlocks(source: string | undefined | null): TextBlock[] {
  if (!source) return [];
  return source
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const headingMatch = chunk.match(/^#{1,6}\s+(.*)$/);
      if (headingMatch && !chunk.includes('\n')) {
        return { type: 'heading', text: headingMatch[1].trim() } as const;
      }
      return { type: 'paragraph', text: chunk } as const;
    });
}
