// ============================================================================
// src/core/lib/images.ts
// siteInfo.yml に文字列で書かれた相対パス（例: "../assets/hero.jpg"）を、
// astro:assets が最適化できる ImageMetadata へ解決するためのヘルパー。
// Decap CMS でパス文字列だけを差し替えても、ビルド時に自動で
// WebP変換・サイズ最適化が効く状態を保つための橋渡し役。
// ============================================================================
import type { ImageMetadata } from 'astro';

const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{png,jpg,jpeg,webp,gif,svg}',
  { eager: true }
);

export function resolveImage(relativePath: string): ImageMetadata {
  // "../assets/hero.jpg" → "/src/assets/hero.jpg" に正規化
  const fileName = relativePath.split('/').pop();
  const key = Object.keys(modules).find((k) => k.endsWith(`/assets/${fileName}`));

  if (!key) {
    throw new Error(
      `[resolveImage] 画像が見つかりません: "${relativePath}"（src/assets/ 配下に配置してください）`
    );
  }

  return modules[key].default;
}

// ============================================================================
// resolveImage() は「値が入っているが該当ファイルが無い」場合のみエラーに
// したい（本当の設定ミスを検知するため）。一方、CMS側の画像フィールドが
// すべて任意入力になったことで「未入力（空文字/undefined）」も正当な状態に
// なったため、その場合は例外を投げず null を返し、呼び出し側で
// `{image && <Image ... />}` のように非表示にできるようにする。
// ============================================================================
export function resolveImageOrNull(relativePath: string | undefined | null): ImageMetadata | null {
  if (!relativePath) return null;
  return resolveImage(relativePath);
}
