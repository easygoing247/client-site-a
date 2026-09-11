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

// ドットは常に同じ大きさ（w-2 h-2、マークアップ側に固定で指定）を保ち、
// JSは背景色（アクティブ＝テーマカラー／非アクティブ＝グレー）だけを
// 切り替える。以前はアクティブ時にサイズも変える（w-5のピル形状）
// 実装だったが、要件変更によりサイズ変更は廃止した。
const DOT_ACTIVE_CLASS = 'bg-primary';
const DOT_INACTIVE_CLASS = 'bg-surface-border';

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
    // ドット数（＝アイテム数）と「1回のスクロールで進む量」が一致しない
    // ケース（例：「実績・活用事例」のPC幅のように1画面に複数枚
    // 同時表示される場合）では、scrollLeftをstep()でそのまま割ると、
    // 実際には端（最後のアイテム）まで到達しているのに、算出される
    // インデックスがドット数の途中（中央寄り）にしかならず、最後の
    // ドットが永遠にアクティブにならない不具合になる（1画面に3枚見えて
    // いれば、最後までスクロールしてもscrollLeftはアイテム2個分強にしか
    // 進まないため）。
    // そのため「スクロール可能な全区間に対する現在位置の割合
    // （0〜1）」をドット数の範囲（0〜dots.length-1）に線形マッピングする
    // 方式にする。1画面に1枚だけ表示されるスライダー（サービス内容／
    // 商品一覧／料金プラン）では、この計算は従来の
    // `Math.round(scrollLeft / step())` と数学的に等価（末尾アイテムの
    // scrollLeftが必ずmaxScrollと一致するため）で、挙動は変わらない。
    const maxScroll = track.scrollWidth - track.clientWidth;
    const progress = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
    const rawIndex = Math.round(progress * (dots.length - 1));
    const activeIndex = Math.max(0, Math.min(dots.length - 1, rawIndex));
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;
      dot.classList.toggle(DOT_ACTIVE_CLASS, isActive);
      dot.classList.toggle(DOT_INACTIVE_CLASS, !isActive);
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

  // 初期表示位置の指定（例：「料金プラン」で人気プランを最初から表示）。
  // スマホ幅のスライダーでのみ視覚的な意味を持つが、PC幅（グリッド表示）で
  // scrollLeftを動かしても見た目に影響しないため、幅を判定せず常に適用する。
  const initialIndexAttr = track.dataset.sliderInitialIndex;
  const initialIndex = initialIndexAttr ? parseInt(initialIndexAttr, 10) : NaN;
  if (!Number.isNaN(initialIndex) && initialIndex > 0) {
    track.scrollTo({ left: step() * initialIndex, behavior: 'auto' });
  }

  updateArrows();
}

document.querySelectorAll<HTMLElement>('[data-slider-track]').forEach(initSlider);
