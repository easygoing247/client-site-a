// ============================================================================
// src/lib/rehypeMarkBlankParagraphs.mjs
// works / news の本文（Markdown）で、Enterキーを2回押して作った意図的な
// 空行（3行目：「1行目」→空行→「3行目」）が、本番ページで「テキストの
// 行間が広がっただけ」に見えてしまう不具合の修正（2026-09、9.48）。
//
// 背景：Decap CMSのSlateエディタは、ユーザーが意図的に空けた行を
// 「ゼロ幅スペース（U+200B）だけを内容に持つ段落」としてMarkdownへ
// シリアライズすることがある（CommonMarkの仕様上、本当に中身が空の行は
// 単なる段落区切りとして無視され前後の段落と区別が付かなくなるため、
// 見えない文字を1つ入れて「区切りではなく実体のある段落」として保持する
// ための工夫）。これ自体はDecap側の仕様で、このリポジトリのコードでは
// 変更できない。
//
// このゼロ幅スペースだけの`<p>`は、`.prose-content p`に一律で
// 適用しているmargin-bottom（9.41）をそのまま受け取ってしまうため、
// 「直前の段落のmargin」＋「このゼロ幅スペース段落自身の行の高さ」＋
// 「このゼロ幅スペース段落自身のmargin」の3つが単純に積み重なり、
// 意図した「空行1つぶん」よりも明らかに広い余白になってしまう
// （実機検証で1行分の約3倍の高さになることを確認）。CSSの`:empty`
// セレクタは「子ノードが1つも無い」場合にしか一致せず、ゼロ幅スペースの
// テキストノードを持つこの段落には一致しないため、CSSだけでは
// 正しく判定できない。
//
// この rehype プラグインは、ビルド時にHTMLへ変換された後の各`<p>`要素の
// テキスト内容を検査し、ゼロ幅スペース・通常の空白のみ（＝見た目上は
// 何も無い）の場合に`prose-blank-line`というクラスを付与する。CSS側
// （src/styles/global.css）はこのクラスを目印に、直前の段落のmarginを
// 打ち消しつつ、この段落自体の高さをちょうど本文の行送り1行ぶんに
// 揃えることで、「空行1つがそのまま1行分の空白として見える」という
// 要件どおりの見た目を実現する。
// ============================================================================

const ZERO_WIDTH_SPACE = /​/g;

function textOf(node) {
  if (node.type === 'text') return node.value;
  if (!node.children) return '';
  return node.children.map(textOf).join('');
}

// 「ゼロ幅スペース（等の見えない文字）だけを内容に持つ段落」を判定する。
// `rawText`が空文字（＝子ノード自体が無い、真に空の<p></p>）は対象外
// （そちらはCSSの`:empty`で従来どおり扱う）。ゼロ幅スペースを取り除いた
// 上でなお何らかの見える文字が残るなら、当然ただの通常の段落。
function isBlankParagraph(node) {
  if (node.type !== 'element' || node.tagName !== 'p') return false;
  const rawText = textOf(node);
  if (!rawText) return false;
  return rawText.replace(ZERO_WIDTH_SPACE, '').trim() === '';
}

function walk(node) {
  if (isBlankParagraph(node)) {
    const existing = (node.properties && node.properties.className) || [];
    const classes = Array.isArray(existing) ? existing : [existing];
    node.properties = node.properties || {};
    node.properties.className = classes.concat('prose-blank-line');
  }
  if (node.children) {
    node.children.forEach(walk);
  }
}

export default function rehypeMarkBlankParagraphs() {
  return function transformer(tree) {
    walk(tree);
  };
}
