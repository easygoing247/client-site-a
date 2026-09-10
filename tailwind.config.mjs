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
      // primary系のみ CSS変数（src/styles/global.css の :root /
      // [data-theme="..."] 参照）を経由しており、Decap CMSの
      // 「デザインテーマ設定」（blue/red/green/purple/orange）で
      // ビルドし直すことなく "実行時に" 切り替えられる。
      // secondary/surface/ink は中立色のためテーマ非連動の固定値のまま。
      // ============================================================
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
          hover: 'var(--color-primary-hover)',
        },
        secondary: {
          DEFAULT: '#12203f',
          light: '#3d4658',
          dark: '#0f1e3d',
        },
        // LINEブランドを想起させる緑。第三者ブランドの色のため、サイトの
        // テーマカラー切り替え（primary）とは独立して固定値のままにする。
        // 明度は WCAG AA を満たすよう調整済み：白文字（LINE相談ボタン等）で
        // コントラスト比 4.75:1（本来の #06c755 は 2.26:1 で AA 未達だった）。
        accent: {
          DEFAULT: '#04853b',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f7fb',
          border: '#e7eaf2',
        },
        ink: {
          DEFAULT: '#12203f',
          soft: '#5b6472',
          // faint（補足テキスト・注意書き・パンくず等）。白／#f5f7fb 背景の
          // どちらでもコントラスト比 4.5:1 以上を満たす値に調整済み
          // （白 5.34:1 / #f5f7fb 4.98:1。旧 #8a93a6 は 3.09:1 / 2.88:1 で AA 未達）。
          faint: '#646b7b',
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
