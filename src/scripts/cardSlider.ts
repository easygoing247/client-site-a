// ============================================================================
// src/scripts/cardSlider.ts
// カードスライダー共通ロジック（「実績・活用事例」「サービス内容」
// 「商品一覧」「料金プラン」のスマホスライダーが共通で読み込む）。
// スタイル（PC・タブレット幅ではグリッド、スマホ幅のみ横スクロール＋
// スナップの1枚送りスライダーに切り替える。「実績・活用事例」のみ
// PC幅でも列数超過時はスライダーのまま）は各コンポーネント側のCSSで
// 完結しており、ここでは
// ・矢印クリックでカード1枚分 scrollBy
// ・ドットインジケーターのクリックで該当カードへ scrollTo
// ・実際にオーバーフローしているときだけ矢印・ドットを表示し、
//   スクロール端で矢印を disabled、現在位置に対応するドットを
//   アクティブ色に切り替える
// を担当する。複数セクションで共有するため、`[data-slider-track]` を
// 持つ要素をまとめて初期化する汎用実装にしている。
// ============================================================================

const DOT_ACTIVE = ['bg-primary', 'w-5'];
const DOT_INACTIVE = ['bg-surface-border', 'w-2'];

function initSlider(track: HTMLElement): void {
  const root = track.closest<HTMLElement>('[data-slider-root]');
  if (!root) return;
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-slider-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-slider-next]');
  // ドットは矢印センタリングの高さ計算に影響させないため data-slider-root の
  // 「外」（兄弟要素）に置く構成を基本とする。念のため root 内部に置かれた
  // 場合にも対応できるよう、root 自身→root の親要素の順で探す。
  const dotsContainer =
    root.querySelector<HTMLElement>('[data-slider-dots]') ??
    root.parentElement?.querySelector<HTMLElement>('[data-slider-dots]') ??
    null;
  const dots = dotsContainer
    ? Array.from(dotsContainer.querySelectorAll<HTMLButtonElement>('[data-slider-dot]'))
    : [];

  const step = () => {
    const first = track.querySelector<HTMLElement>(':scope > *');
    if (!first) return track.clientWidth;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    return first.getBoundingClientRect().width + gap;
  };

  const updateDots = () => {
    if (!dots.length) return;
    const s = step();
    const rawIndex = s > 0 ? Math.round(track.scrollLeft / s) : 0;
    const activeIndex = Math.max(0, Math.min(dots.length - 1, rawIndex));
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;
      dot.classList.remove(...(isActive ? DOT_INACTIVE : DOT_ACTIVE));
      dot.classList.add(...(isActive ? DOT_ACTIVE : DOT_INACTIVE));
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  const updateArrows = () => {
    const hasOverflow = track.scrollWidth > track.clientWidth + 4;
    if (prevBtn) prevBtn.hidden = !hasOverflow;
    if (nextBtn) nextBtn.hidden = !hasOverflow;
    if (dotsContainer) dotsContainer.hidden = !hasOverflow;
    if (!hasOverflow) return;
    if (prevBtn) prevBtn.disabled = track.scrollLeft <= 4;
    if (nextBtn) nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    updateDots();
  };

  prevBtn?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  nextBtn?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      track.scrollTo({ left: step() * i, behavior: 'smooth' });
    });
  });

  let scrollTicking = false;
  track.addEventListener('scroll', () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      updateArrows();
      scrollTicking = false;
    });
  });
  window.addEventListener('resize', updateArrows);
  updateArrows();
}

document.querySelectorAll<HTMLElement>('[data-slider-track]').forEach(initSlider);
