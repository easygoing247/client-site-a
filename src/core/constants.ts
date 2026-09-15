// src/core/constants.ts
// 共通コア定数：テンプレートのバージョン情報・制作/サポート会社の
// 基本情報を一元管理する。複数ページ版マスターテンプレート
// （master-template-multi）の src/core/constants.ts と同じ位置づけの
// ファイルで、multi-gitter等による一括アップデート運用時の目印・
// 参照元として使う想定（詳細は multi-gitter 運用マニュアル参照）。
//
// public/admin/index.html（Decap CMS管理画面）はビルドパイプラインを
// 経由しない静的ファイルのため、この定数を直接importすることはできない
// （値を変更した場合、フッター等の表示文言は手動で同期すること）。

/** サポート窓口の連絡先URL群 */
export interface CoreSupportContact {
  /** LINE公式アカウントの相談用URL（要置き換え） */
  lineUrl: string;
  /** Webお問い合わせフォームのURL（要置き換え） */
  contactFormUrl: string;
}

/** テンプレートの共通コア情報 */
export interface CoreInfo {
  /** テンプレートのバージョン（一括アップデート時に更新する） */
  templateVersion: string;
  /** 制作・サポート会社名 */
  supportCompanyName: string;
  /** サポート窓口の連絡先URL群 */
  supportContact: CoreSupportContact;
}

export const CORE_INFO: CoreInfo = {
  templateVersion: '1.0.1',
  supportCompanyName: '合同会社ドーンメディア',
  supportContact: {
    lineUrl: 'https://lin.ee/YOUR_LINE_ID',
    contactFormUrl: 'https://your-domain.com/contact/',
  },
};

/**
 * テンプレートバージョンの単体参照用エイリアス。
 * master-template-multi の CORE_VERSION と同じ役割（multi-gitter
 * 一括アップデートの動作確認用の目印）を持たせつつ、常に
 * CORE_INFO.templateVersion と同じ値を指す。
 */
export const CORE_VERSION = CORE_INFO.templateVersion;
