// ============================================================================
// src/scripts/cardSlider.ts
// トップページ「サービス内容」「商品一覧」のスマホ用カードスライダー
// （Service.astro / Products.astro が共通で読み込む）。
// スタイル（PC・タブレット幅ではグリッド、スマホ幅のみ横スクロール＋
// スナップの1枚送りスライダーに切り替える）は src/styles/global.css の
// .card-slider-mobile 側で完結しており、ここでは
// ・矢印クリックでカード1枚分 scrollBy（スマホでのみ矢印を表示。
//   CSS側で sm 以上は非表示）
// ・実際にオーバーフローしている（＝スマホ幅で2枚以上ある）ときだけ
//   矢印を表示し、スクロール端で disabled にする
// の2点を担当する。「実績・活用事例」（Works.astro）と同じ考え方だが、
// 複数セクションで共有するため、`[data-slider-track]` を持つ要素を
// まとめて初期化する汎用実装にしている。
// ============================================================================

function initSlider(track: HTMLElement): void {
  const root = track.closest<HTMLElement>('[data-slider-root]');
  if (!root) return;
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-slider-prev]');
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-slider-next]');

  const step = () => {
    const first = track.querySelector<HTMLElement>(':scope > *');
    if (!first) return track.clientWidth;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || '0') || 0;
    return first.getBoundingClientRect().width + gap;
  };

  const updateArrows = () => {
    const hasOverflow = track.scrollWidth > track.clientWidth + 4;
    if (prevBtn) prevBtn.hidden = !hasOverflow;
    if (nextBtn) nextBtn.hidden = !hasOverflow;
    if (!hasOverflow) return;
    if (prevBtn) prevBtn.disabled = track.scrollLeft <= 4;
    if (nextBtn) nextBtn.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };

  prevBtn?.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
  nextBtn?.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));

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
