/* ============================================================================
 * public/admin/editor-components.js
 * 本文リッチテキストエディタ（works / news の `body`、widget: markdown）の
 * 機能拡張。Decap CMS の公開APIで実現できる範囲は以下の2つに限られる：
 *   1. CMS.registerLocale()  … 既存 `ja` ロケールに欠けている訳語を補う
 *   2. CMS.registerEditorComponent() … 「+」ボタンから挿入するブロック型
 *      ショートコード（動画埋め込み・囲い枠・吹き出し・テキスト配置等）
 *
 * 【重要な制約（実装前に確認済み）】
 * Decap CMS の markdown ウィジェットは、ツールバーの太字・斜体・打ち消し線
 * 等の「固定ボタン一覧」（config.yml の `buttons:` で並び替え・絞り込みは
 * できるが種類の追加はできない）と、「+」ボタンから挿入する
 * registerEditorComponent の「ブロック単位の挿入」の2種類の拡張点しか
 * 公開していない。そのため、以下は本体のAPIでは実現不可能：
 *   ・既存の文章の途中を選択して後から着色する「本物のインライン
 *     ハイライト」（マーカー機能は、テキストをこのコンポーネント自身の
 *     入力欄に書き直して挿入する「ブロック単位」の疑似ハイライトとして
 *     実装している。運用上は名称のとおり蛍光ペンを引いたような見た目に
 *     なるが、既存の段落の一部だけを選択して色を付ける操作はできない）
 *   ・テキスト整列ツールバーボタン（同様に「テキスト配置」コンポーネント
 *     として、専用フィールドに文章を入力する形で実装。text-align は
 *     元来ブロック＝段落単位のCSSプロパティのため、この実装様式は
 *     大きな妥協ではない）
 *   ・検索・置換（Find & Replace）… Decap内部はSlate（contentEditable）で
 *     文書を管理しており、DOM文字列を外部から直接書き換えるとSlate内部の
 *     状態と食い違い、保存内容が壊れる・入力不能になる等のリスクが高い。
 *     公式に提供されているフックも無いため、安全に実装する方法が無く
 *     未実装とした（無理に動くふりをする実装は行わない）。
 * ============================================================================ */
(function () {
  var h = window.h;
  if (!window.CMS) return;

  // ==========================================================================
  // 日本語ロケールの補完
  // 本体バンドル（decap-cms@3.16.2）の `ja` ロケールを実機確認したところ、
  // editorWidgets.markdown に `strikethrough` と `toggleMode` の2キーが
  // 欠落しており、この2箇所だけ英語表示（"Strikethrough" 等）にフォール
  // バックすることを確認した（en以外の大半のロケールで同様に欠落している、
  // decap-cms本体側の既知の翻訳漏れ）。
  // ⚠️ CMS.registerLocale(locale, dict) は既存の辞書へのマージではなく
  // `ks.locales[locale] = dict` という単純な代入（decap-cms本体のソースで
  // 確認済み）。そのため部分オブジェクトをそのまま渡すと、本体バンドルが
  // 起動時に登録した ja ロケール全体（ヘッダー・ボタン・確認ダイアログ等
  // 数百のキー）が丸ごと消え、UIの大部分が英語に戻る重大な不具合を
  // 実機で確認した。CMS.getLocale('ja') で「起動時に登録済みの完全な
  // 辞書オブジェクト」を取得し、そこに不足キーだけを追加してから
  // 同じ参照を再登録する（＝実質的には既存オブジェクトへの追記）ことで、
  // 他のキーを一切失わずに済む。
  // ==========================================================================
  var jaLocale = window.CMS.getLocale && window.CMS.getLocale('ja');
  if (jaLocale) {
    jaLocale.editor = jaLocale.editor || {};
    jaLocale.editor.editorWidgets = jaLocale.editor.editorWidgets || {};
    jaLocale.editor.editorWidgets.markdown = jaLocale.editor.editorWidgets.markdown || {};
    jaLocale.editor.editorWidgets.markdown.strikethrough = '打ち消し線';
    jaLocale.editor.editorWidgets.markdown.toggleMode = {
      rich: 'リッチテキストモードに切り替え',
      markdown: 'Markdownモードに切り替え',
    };
    window.CMS.registerLocale('ja', jaLocale);
  }

  // ==========================================================================
  // 共通ヘルパー
  // ==========================================================================
  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // 構造化データ（オブジェクト）をMarkdown本文中に安全に往復させるための
  // エンコード。表示用のHTML（toBlockが生成する本体）とは別に、非表示の
  // HTMLコメントとしてJSON化したデータを埋め込み、fromBlockではその
  // コメントだけを読み戻す。フィールド数が多い・本文に任意のMarkdown
  // 記法を含み得るコンポーネント（囲い枠・吹き出し）で、正規表現による
  // 直接パースが壊れやすい問題を避けるために採用している。
  function encodeData(obj) {
    return encodeURIComponent(JSON.stringify(obj));
  }
  function decodeData(str) {
    try {
      return JSON.parse(decodeURIComponent(str));
    } catch (e) {
      return {};
    }
  }

  function extractYouTubeId(url) {
    if (!url) return '';
    var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
    return m ? m[1] : '';
  }

  // ==========================================================================
  // 1) 動画埋め込み（YouTube）
  // ==========================================================================
  window.CMS.registerEditorComponent({
    id: 'youtube-video',
    label: '動画（YouTube）',
    fields: [{ name: 'url', label: 'YouTube動画のURL', widget: 'string', hint: '例：https://www.youtube.com/watch?v=XXXXXXXXXXX' }],
    pattern: /^<div class="cms-video-embed"><iframe[^>]*src="https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]+)"[^>]*><\/iframe><\/div>\s*$/,
    fromBlock: function (match) {
      return { url: 'https://www.youtube.com/watch?v=' + match[1] };
    },
    toBlock: function (obj) {
      var id = extractYouTubeId(obj.url);
      if (!id) return '';
      return (
        '<div class="cms-video-embed"><iframe src="https://www.youtube.com/embed/' +
        id +
        '" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
      );
    },
    toPreview: function (obj) {
      var id = extractYouTubeId(obj.url);
      return h(
        'div',
        { style: { padding: '12px', border: '1px dashed #b9c0cc', borderRadius: '8px', color: '#4b5468', fontSize: '13px' } },
        id ? '▶ YouTube動画（ID: ' + id + '）' : '（YouTube動画のURLを入力してください）'
      );
    },
  });

  // ==========================================================================
  // 2) 動画埋め込み（ファイルアップロード）
  // アップロード先は astro:assets の最適化対象外（動画は最適化されない）
  // のため、他の画像フィールドと異なり public/ 配下の専用フォルダに
  // 直接保存し、本文中の <video src> がビルド後もそのまま配信可能な
  // 絶対パス（/uploads/editor/xxx.mp4）になるようにしている。
  // ==========================================================================
  window.CMS.registerEditorComponent({
    id: 'video-file',
    label: '動画（ファイルアップロード）',
    fields: [
      {
        name: 'src',
        label: '動画ファイル（.mp4等）',
        widget: 'file',
        media_folder: '/public/uploads/editor',
        public_folder: '/uploads/editor',
      },
    ],
    pattern: /^<video class="cms-video-file" controls src="([^"]*)"><\/video>\s*$/,
    fromBlock: function (match) {
      return { src: match[1] };
    },
    toBlock: function (obj) {
      if (!obj.src) return '';
      return '<video class="cms-video-file" controls src="' + escapeHtml(obj.src) + '"></video>';
    },
    toPreview: function (obj) {
      return h(
        'div',
        { style: { padding: '12px', border: '1px dashed #b9c0cc', borderRadius: '8px', color: '#4b5468', fontSize: '13px' } },
        obj.src ? '🎬 動画ファイル：' + obj.src : '（動画ファイルを選択してください）'
      );
    },
  });

  // ==========================================================================
  // 3) マーカー（蛍光ペンハイライト・5色）
  // ==========================================================================
  var MARK_COLORS = [
    { label: 'イエロー', value: 'yellow' },
    { label: 'ピンク', value: 'pink' },
    { label: 'グリーン', value: 'green' },
    { label: 'ブルー', value: 'blue' },
    { label: 'オレンジ', value: 'orange' },
  ];
  var MARK_HEX = { yellow: '#fff3a3', pink: '#ffd1e3', green: '#c8f2d4', blue: '#cfe4ff', orange: '#ffe0bd' };

  window.CMS.registerEditorComponent({
    id: 'highlight-marker',
    label: 'マーカー（蛍光ペン）',
    fields: [
      { name: 'color', label: 'カラー', widget: 'select', options: MARK_COLORS, default: 'yellow' },
      { name: 'text', label: 'テキスト', widget: 'string' },
    ],
    pattern: /^<mark class="cms-mark cms-mark--(yellow|pink|green|blue|orange)">([\s\S]*?)<\/mark>\s*$/,
    fromBlock: function (match) {
      return { color: match[1], text: match[2] };
    },
    toBlock: function (obj) {
      return '<mark class="cms-mark cms-mark--' + (obj.color || 'yellow') + '">' + escapeHtml(obj.text) + '</mark>';
    },
    toPreview: function (obj) {
      return h('mark', { style: { background: MARK_HEX[obj.color] || MARK_HEX.yellow, padding: '0 3px', borderRadius: '2px' } }, obj.text);
    },
  });

  // ==========================================================================
  // 4) 囲い枠（5色・見出しバッジ付き）
  // ==========================================================================
  var BOX_COLORS = [
    { label: 'ブルー', value: 'blue' },
    { label: 'レッド', value: 'red' },
    { label: 'グリーン', value: 'green' },
    { label: 'パープル', value: 'purple' },
    { label: 'オレンジ', value: 'orange' },
  ];
  var BOX_HEX = { blue: '#2563eb', red: '#dc2626', green: '#16a34a', purple: '#7c3aed', orange: '#ea580c' };

  window.CMS.registerEditorComponent({
    id: 'callout-box',
    label: '囲い枠（見出しバッジ付き）',
    fields: [
      { name: 'color', label: 'カラー', widget: 'select', options: BOX_COLORS, default: 'blue' },
      { name: 'badge', label: '見出しバッジ（未入力なら非表示）', widget: 'string', required: false },
      { name: 'text', label: '本文', widget: 'text' },
    ],
    pattern: /^<!--cms-box:([^>]*)-->\n<div class="cms-box[\s\S]*?<\/div>\s*$/,
    fromBlock: function (match) {
      return decodeData(match[1]);
    },
    toBlock: function (obj) {
      var color = obj.color || 'blue';
      var badgeHtml = obj.badge ? '<span class="cms-box-badge">' + escapeHtml(obj.badge) + '</span>' : '';
      return (
        '<!--cms-box:' +
        encodeData(obj) +
        '-->\n<div class="cms-box cms-box--' +
        color +
        '">' +
        badgeHtml +
        '<div class="cms-box-body">\n\n' +
        (obj.text || '') +
        '\n\n</div></div>'
      );
    },
    toPreview: function (obj) {
      var color = BOX_HEX[obj.color] || BOX_HEX.blue;
      return h(
        'div',
        { style: { position: 'relative', marginTop: '14px', padding: '16px', border: '2px solid ' + color, borderRadius: '10px' } },
        obj.badge &&
          h(
            'span',
            {
              style: {
                position: 'absolute',
                top: '-12px',
                left: '12px',
                background: color,
                color: '#fff',
                fontSize: '11px',
                fontWeight: 'bold',
                padding: '2px 10px',
                borderRadius: '999px',
              },
            },
            obj.badge
          ),
        h('div', { style: { fontSize: '13px', whiteSpace: 'pre-line' } }, obj.text)
      );
    },
  });

  // ==========================================================================
  // 5) 画像付き吹き出し
  // アイコン画像は他の画像フィールドと違い、複数記事間で使い回す「話者
  // アバター」用途のため、works/newsの記事ごとのmedia_folder（../../assets）
  // ではなく、メディアライブラリ全体（既定のグローバル設定）から選ぶ。
  // ==========================================================================
  window.CMS.registerEditorComponent({
    id: 'speech-bubble',
    label: '吹き出し（アイコン付き）',
    fields: [
      { name: 'avatar', label: 'アイコン画像（話者アバター）', widget: 'image', required: false },
      { name: 'name', label: '名前（未入力なら非表示）', widget: 'string', required: false },
      {
        name: 'align',
        label: '向き',
        widget: 'select',
        default: 'left',
        options: [
          { label: '左（アイコン→本文）', value: 'left' },
          { label: '右（本文→アイコン）', value: 'right' },
        ],
      },
      { name: 'text', label: '本文', widget: 'text' },
    ],
    pattern: /^<!--cms-speech:([^>]*)-->\n<div class="cms-speech[\s\S]*?<\/div>\s*$/,
    fromBlock: function (match) {
      return decodeData(match[1]);
    },
    toBlock: function (obj) {
      var avatarImg = obj.avatar ? '<img class="cms-speech-avatar" src="' + escapeHtml(obj.avatar) + '" alt="' + escapeHtml(obj.name || '') + '" />' : '';
      var nameHtml = obj.name ? '<div class="cms-speech-name">' + escapeHtml(obj.name) + '</div>' : '';
      return (
        '<!--cms-speech:' +
        encodeData(obj) +
        '-->\n<div class="cms-speech cms-speech--' +
        (obj.align || 'left') +
        '"><div class="cms-speech-avatar-col">' +
        avatarImg +
        nameHtml +
        '</div><div class="cms-speech-bubble">\n\n' +
        (obj.text || '') +
        '\n\n</div></div>'
      );
    },
    toPreview: function (obj) {
      var row = [
        obj.avatar &&
          h('img', { src: obj.avatar, style: { width: '40px', height: '40px', borderRadius: '999px', objectFit: 'cover', flex: 'none' } }),
        h(
          'div',
          { style: { background: '#f2f4f8', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', whiteSpace: 'pre-line' } },
          obj.text
        ),
      ];
      if (obj.align === 'right') row.reverse();
      return h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start', marginTop: '10px' } }, row);
    },
  });

  // ==========================================================================
  // 6) テキスト配置（左揃え・中央揃え・右揃え）
  // text-align は本来「段落単位」のCSSプロパティのため、専用フィールドに
  // 文章を入力してブロックとして挿入する方式は妥協ではなく自然な実装形式。
  // ==========================================================================
  window.CMS.registerEditorComponent({
    id: 'aligned-text',
    label: 'テキスト配置（左・中央・右）',
    fields: [
      {
        name: 'align',
        label: '配置',
        widget: 'select',
        default: 'left',
        options: [
          { label: '左揃え', value: 'left' },
          { label: '中央揃え', value: 'center' },
          { label: '右揃え', value: 'right' },
        ],
      },
      { name: 'text', label: '本文', widget: 'text' },
    ],
    pattern: /^<div class="cms-align cms-align--(left|center|right)">\n\n([\s\S]*?)\n\n<\/div>\s*$/,
    fromBlock: function (match) {
      return { align: match[1], text: match[2] };
    },
    toBlock: function (obj) {
      return '<div class="cms-align cms-align--' + (obj.align || 'left') + '">\n\n' + (obj.text || '') + '\n\n</div>';
    },
    toPreview: function (obj) {
      return h('div', { style: { textAlign: obj.align || 'left', fontSize: '13px', whiteSpace: 'pre-line' } }, obj.text);
    },
  });
})();
