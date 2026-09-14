/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // ============================================================
      // Design Tokens（テーマ変数）
      // 案件ごとの恒久的な着せ替えは、この colors ブロックの値だけを
      // 書き換えれば全ページに反映されます（直書き禁止ルール参照）。
      //
      // 【2026-09、Phase 3で全カラーをCSS変数参照へ統一】以前は
      // primary/footer.bg だけが src/styles/global.css の :root /
      // [data-theme="..."] を参照するCSS変数経由で、secondary/surface/ink/
      // accent は生の16進数カラーコードをこのファイルへ直書きしていた。
      // 「実際の色の値はすべて1箇所（global.cssの:root）に集約する」
      // という単一の原則に統一するため、後者もCSS変数参照へ変更した
      // （見た目・computed styleの値は変更前と完全に同一。既存の
      // primary系だけが唯一 [data-theme="..."] で複数プリセットの値を
      // 持つ＝Decap CMSの「デザインテーマ設定」で実行時に切り替え可能。
      // secondary/surface/ink/accentは:rootにのみ定義され、
      // [data-theme]では上書きしない中立・固定色）。
      // ============================================================
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          light: 'var(--color-secondary-light)',
          dark: 'var(--color-secondary-dark)',
        },
        // フッター専用の背景色（--color-footer-bg、テーマカラー連動だが
        // primary.dark とは別の「彩度を落としたシックなダークトーン」。
        // 詳細は src/styles/global.css の :root コメント参照）。
        footer: {
          bg: 'var(--color-footer-bg)',
        },
        // LINE 公式ブランドカラー（#06C755）。第三者ブランドの色のため、
        // サイトのテーマカラー切り替え（primary）とは独立して固定値のまま。
        // スマホ下部固定バーの「LINEで相談」ボタン・SNSアイコンで使用する。
        // ブランド遵守を優先しており、白文字のコントラスト比は WCAG AA 未達
        // （LINE 自身の UI も白文字＋この緑を使用しているため許容）。
        accent: {
          DEFAULT: 'var(--color-accent)',
        },
        surface: {
          DEFAULT: 'var(--color-surface)',
          muted: 'var(--color-surface-muted)',
          border: 'var(--color-surface-border)',
          // 表組みの項目名（dt）帯など、白／muted 背景よりわずかに1トーンだけ
          // 濃い落ち着いたニュートラルグレー。テーマカラー非連動。
          band: 'var(--color-surface-band)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
          // faint（補足テキスト・注意書き・パンくず等）。白／#f5f7fb 背景の
          // どちらでもコントラスト比 4.5:1 以上を満たす値に調整済み
          // （白 5.34:1 / #f5f7fb 4.98:1。旧 #8a93a6 は 3.09:1 / 2.88:1 で AA 未達）。
          faint: 'var(--color-ink-faint)',
        },
        // フォーム入力欄の枠線色（ContactField.astro／preview.jsで共有）。
        // surface.border（#e7eaf2、カード・表組み用）とは意図的に別の
        // 微妙に濃いトーン（#dbdfe8）のため、既存トークンと統合せず
        // 専用トークンとして分離している（2026-09、Phase 3設計トークン化）。
        formBorder: 'var(--color-form-border)',
        // フォーム「必須」バッジの背景色。ContactField.astro／preview.jsで共有。
        required: 'var(--color-required)',
        // お問い合わせフォーム送信エラーメッセージの文字色／背景色
        // （Material Design風のエラーレッド）。Contact.astro／
        // src/pages/contact.astroの2箇所で共有。
        error: {
          DEFAULT: 'var(--color-error-text)',
          bg: 'var(--color-error-bg)',
        },
        // 「制作の流れ」（Flow.astro）のステップ間コネクター矢印の色。
        flow: {
          connector: 'var(--color-flow-connector)',
        },
        // 各SNSの公式ブランドカラー（テーマカラーとは独立した固定値。
        // accentのLINEブランドカラーと同じ考え方）。SnsIcons.astro／
        // Footer.astro／preview.jsのSNSアイコン配色で共有する。
        // Instagramは単色ではなく公式のグラデーションのため、開始/経由/
        // 終了の3色をCSS変数として持ち、src/styles/global.cssの
        // `.bg-sns-instagram`ユーティリティで組み立てる。
        sns: {
          facebook: 'var(--color-sns-facebook)',
          youtube: 'var(--color-sns-youtube)',
          tiktok: 'var(--color-sns-tiktok)',
        },
      },
      // Google Fonts 等の外部通信を発生させないよう、OS標準搭載の
      // システムフォントのみで構成する（PageSpeed Insightsの
      // レンダリングブロッキング対策）。日本語はOSごとの標準ゴシック体
      // （Hiragino / Meiryo 等）にフォールバックする。
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Hiragino Sans"',
          '"Hiragino Kaku Gothic ProN"',
          '"Meiryo"',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
