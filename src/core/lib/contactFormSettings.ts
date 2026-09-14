// ============================================================================
// src/core/lib/contactFormSettings.ts
// src/data/contact-form.json（Decap CMS「サイト設定」の3つ目のファイル項目
// 「お問い合わせフォーム設定」）を型付きで公開する。
// 「デザインテーマ設定（site-settings.json）」と同じく siteInfo.yml とは
// 独立したファイルコレクションとして CMS 上に単独タブで表示される。
//
// トップページ #contact セクション（Contact.astro）と /contact ページ
// （contact.astro）の両フォームがこの値を参照する：
//  - web3forms_access_key   → <form data-access-key>
//  - contact_email_subject  → hidden <input name="subject">
//  - contact_email_from_name → hidden <input name="from_name">
// ============================================================================
import raw from '../../data/contact-form.json';

export interface ContactFormSettings {
  /** Web3Forms のアクセスキー（36桁UUID。未設定なら送信は失敗） */
  web3forms_access_key: string;
  /** Web3Forms 通知メールの件名（hidden の subject） */
  contact_email_subject: string;
  /** Web3Forms 通知メールの送信者名（hidden の from_name） */
  contact_email_from_name: string;
}

const r = raw as Partial<ContactFormSettings>;

export const contactFormSettings: ContactFormSettings = {
  web3forms_access_key:
    typeof r.web3forms_access_key === 'string' ? r.web3forms_access_key.trim() : '',
  contact_email_subject:
    typeof r.contact_email_subject === 'string' ? r.contact_email_subject : '',
  contact_email_from_name:
    typeof r.contact_email_from_name === 'string' ? r.contact_email_from_name : '',
};
