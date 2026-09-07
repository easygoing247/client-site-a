/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      // ============================================================
      // Design Tokens（テーマ変数）
      // 案件ごとの着せ替えは、この colors ブロックの値だけを
      // 書き換えれば全ページに反映されます（直書き禁止ルール参照）。
      // ============================================================
      colors: {
        primary: {
          DEFAULT: '#1954e0',
          light: '#e7edfd',
          dark: '#1440b8',
        },
        secondary: {
          DEFAULT: '#12203f',
          light: '#3d4658',
          dark: '#0f1e3d',
        },
        accent: {
          DEFAULT: '#06c755', // LINEブランドカラー等、CTA強調用
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f7fb',
          border: '#e7eaf2',
        },
        ink: {
          DEFAULT: '#12203f',
          soft: '#5b6472',
          faint: '#8a93a6',
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
