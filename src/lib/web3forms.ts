// ============================================================================
// src/lib/web3forms.ts
// src/data/web3forms.json（Decap CMS の「Web3Formsアクセスキー設定」）を
// 型付きで公開する。お問い合わせフォーム（Contact.astro / contact.astro）の
// 送信先（Web3Forms）で使う公開アクセスキー。
// 「デザインテーマ設定（site-settings.json）」と同じく、siteInfo.yml とは
// 独立したファイルコレクションとして CMS 上に単独タブで表示される。
// ============================================================================
import raw from '../data/web3forms.json';

export interface Web3FormsSettings {
  /** Web3Forms のアクセスキー（36桁UUID形式。未設定なら空文字） */
  accessKey: string;
}

const value = (raw as { web3forms_access_key?: unknown }).web3forms_access_key;

export const web3forms: Web3FormsSettings = {
  accessKey: typeof value === 'string' ? value.trim() : '',
};
