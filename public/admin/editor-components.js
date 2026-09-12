/* ============================================================================
 * public/admin/editor-components.js
 * 本文リッチテキストエディタ（works / news の `body`、widget: markdown）の
 * 機能拡張。Decap CMS の公開APIで実現できる範囲は以下の2つに限られる：
 *   1. CMS.registerLocale()  … 既存 `ja` ロケールに欠けている訳語を補う
 *   2. CMS.registerEditorComponent() … 「+」ボタンから挿入するブロック型
 *      ショートコード（画像・動画埋め込み・囲い枠・吹き出し・テキスト配置等）
 *
 * 【重要な制約（実機検証で確認済み。以下は推測ではなく実証済みの事実）】
 * Decap CMS の markdown ウィジェットは、ツールバーの太字・斜体・打ち消し線
 * 等の「固定ボタン一覧」（config.yml の `buttons:` で並び替え・絞り込みは
 * できるが種類の追加はできない）と、「+」ボタンから挿入する
 * registerEditorComponent の「ブロック単位の挿入」の2種類の拡張点しか
 * 公開していない。
 *
 * 「範囲選択したテキストにその場でインライン装飾を適用する」「検索・
 * 置換」機能について、本体の外側から `document.execCommand()` や
 * ペーストイベントの模倣でSlateのcontentEditableへ直接DOM操作を行う
 * 手法を実機で検証した結果：
 *   - DOM上は挿入したHTML（<mark>等）がその場で正しく表示され、続けて
 *     別の場所を編集してもその表示は消えない（＝一見成功したように見える）。
 *   - しかし画面上部の保存状態表示は編集後も「保存済み」のまま変化せず、
 *     実際に「公開する」を実行して保存されるMarkdownソースを確認すると、
 *     この操作による変更は一切反映されていなかった（リッチテキスト
 *     モード・マークダウンモードの両方で再現。マークダウンモードの
 *     生テキスト編集領域も実体はcontentEditableで、素朴なtextareaでは
 *     ないため同じ問題が起きる）。
 *   - さらに別のケースでは、この手法での編集後にモードを切り替えた際、
 *     本文が完全に空になって表示される（内部のSlateドキュメントと
 *     実際のDOM表示が食い違い、シリアライズに失敗した）ことも確認した。
 *   - 原因は、SlateがReactの仮想DOMと同様に「自身の内部状態が変化した
 *     ときだけ実DOMへ描画し直す」方式のため、外部から直接書き換えた
 *     DOMはSlateの内部状態に一切反映されず、たまたま次の再描画対象に
 *     ならなかった範囲がそのまま画面に残っているだけ（＝内部的には
 *     何も変更されていない）と考えられる。
 * このため「無理に動くふりをする実装」は行わず、以下は未実装とした：
 *   ・検索・置換（Find & Replace）
 *   ・マーカー／囲い枠／吹き出しの「範囲選択への直接インライン適用」
 *     （この3つは registerEditorComponent によるブロック単位の挿入
 *     のまま。保存・ビルド後の表示が壊れないことを実際に確認済みの
 *     唯一安全な実装方式のため）
 * 将来的にこれらを本当に実装する場合、`widget: markdown` を諦めて
 * Slateのプラグイン機構を直接叩く独自ウィジェットに全面的に置き換える
 * （decap-cms本体のバージョンアップで内部実装が変わるたびに追従が
 * 必要になる、相応の規模の作業）以外に安全な方法は無い。
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
  // 0) 画像アップロード（本体組み込みの "image" コンポーネントの再登録）
  // Decap CMS の markdown ウィジェットは、本文中に画像を挿入する機能を
  // 独立したツールバーアイコンとしてではなく、id:"image" の
  // registerEditorComponent として標準搭載している（バンドル本体の
  // ソースで確認済み：label:"Image",id:"image",pattern:標準的な
  // Markdown画像記法 ![alt](src "title") ）。
  // 前回の実装で config.yml の `editor_components:` を自作6種のみの
  // 許可リストにしたことで、この標準の "image" コンポーネントが「+」の
  // 候補から除外され、画像挿入ボタンが消えていた（今回の不具合の原因）。
  // ここで同じ id "image" に日本語ラベル・フィールドの独自定義を
  // 再登録し（registerEditorComponentは同じidへのMap.setで安全に
  // 上書きできる＝registerLocaleのような全体上書きの危険は無い）、
  // config.yml側の許可リストにも "image" を追加することで復旧する。
  // ==========================================================================
  window.CMS.registerEditorComponent({
    id: 'image',
    label: '画像',
    fields: [
      { label: '画像', name: 'image', widget: 'image', media_library: { allow_multiple: false } },
      { label: '代替テキスト（alt）', name: 'alt', widget: 'string', required: false },
      { label: 'タイトル', name: 'title', widget: 'string', required: false },
    ],
    pattern: /^!\[([^\]]*)\]\((.*?)(\s"([^"]*)")?\)/,
    fromBlock: function (match) {
      return match && { image: match[2], alt: match[1], title: match[4] };
    },
    toBlock: function (obj) {
      var title = obj.title ? ' "' + String(obj.title).replace(/"/g, '\\"') + '"' : '';
      return '![' + (obj.alt || '') + '](' + (obj.image || '') + title + ')';
    },
    toPreview: function (obj, getAsset) {
      var src = typeof getAsset === 'function' ? getAsset(obj.image) : obj.image;
      return h('img', { src: src || '', alt: obj.alt || '', title: obj.title || '', style: { maxWidth: '100%' } });
    },
  });

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

  // `type: 'inline'`のコンポーネント（下記参照）は、本体バンドルの仕様上
  // フィールドの編集フォームを自動では表示しない——クリック時に呼ばれる
  // `onEdit(props)`を自分で実装し、新しい値をPromiseで解決した場合のみ
  // 反映される（未実装だとクリックしても何も起きない）。既存の
  // ブロック型コンポーネント（囲い枠・吹き出し等）が持つ「クリックで
  // その場にカラー・テキスト入力欄が展開される」体験とは異なるため、
  // 同等の操作感を保つために簡易モーダル（オーバーレイ）を自前実装した。
  // 外部ライブラリは使わず、素のDOM操作のみで完結させている。
  function editMarkerModal(current) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(15,23,42,0.45);z-index:99999;' +
        'display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div');
      box.style.cssText =
        'background:#fff;border-radius:10px;padding:20px;width:280px;' +
        'box-shadow:0 10px 30px rgba(0,0,0,0.28);font-family:inherit;';
      var colorOptions = MARK_COLORS.map(function (c) {
        return '<option value="' + c.value + '">' + c.label + '</option>';
      }).join('');
      box.innerHTML =
        '<div style="font-weight:bold;font-size:14px;margin-bottom:14px;">マーカー（蛍光ペン）を編集</div>' +
        '<label style="display:block;font-size:12px;color:#4b5468;margin-bottom:4px;">カラー</label>' +
        '<select style="width:100%;margin-bottom:14px;padding:6px;border:1px solid #d0d5dd;border-radius:6px;">' +
        colorOptions +
        '</select>' +
        '<label style="display:block;font-size:12px;color:#4b5468;margin-bottom:4px;">テキスト</label>' +
        '<input type="text" style="width:100%;margin-bottom:18px;padding:6px;border:1px solid #d0d5dd;border-radius:6px;box-sizing:border-box;" />' +
        '<div style="display:flex;justify-content:flex-end;gap:8px;">' +
        '<button type="button" data-action="cancel" style="padding:6px 14px;border:1px solid #d0d5dd;border-radius:6px;background:#fff;cursor:pointer;">キャンセル</button>' +
        '<button type="button" data-action="ok" style="padding:6px 14px;border:none;border-radius:6px;background:#3a69c7;color:#fff;cursor:pointer;">OK</button>' +
        '</div>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      var colorSel = box.querySelector('select');
      var textInput = box.querySelector('input[type="text"]');
      colorSel.value = (current && current.color) || 'yellow';
      textInput.value = (current && current.text) || '';
      textInput.focus();
      textInput.select();

      function close(result) {
        document.body.removeChild(overlay);
        resolve(result);
      }
      box.querySelector('[data-action="cancel"]').addEventListener('click', function () {
        close(null);
      });
      box.querySelector('[data-action="ok"]').addEventListener('click', function () {
        close({ color: colorSel.value, text: textInput.value });
      });
      overlay.addEventListener('mousedown', function (e) {
        if (e.target === overlay) close(null);
      });
      textInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          close({ color: colorSel.value, text: textInput.value });
        } else if (e.key === 'Escape') {
          e.preventDefault();
          close(null);
        }
      });
    });
  }

  // 【重要】decap-cms@3.16.2のバンドル本体（unpkg配信物）を実機で解析した結果、
  // registerEditorComponentには公開ドキュメントに明記されていない
  // `type: 'inline'` オプションが存在することを確認した。これを指定すると、
  // 生成されるSlateノードが従来の独立ブロック（type:"shortcode"、常に
  // 大きなカード状の編集フォームとして別行に表示される）ではなく、
  // 段落中に直接埋め込まれる `type:"inline-shortcode"` になり、
  // 本体側のレンダラー（`i0`関数）が`toPreview()`の戻り値を
  // `<span style="display:inline-flex;...">`でラップしてテキストの
  // 途中にそのまま差し込む。マーカーは実サイト上でも`<mark>`が
  // 前後のテキストと同じ段落・同じ行に収まる仕様（CLAUDE.md 9.25参照）
  // のため、これでエディタの見た目と実際の保存結果が完全に一致する
  // （エディタ上だけ改行されて見える問題の根本解決）。
  // `type:'inline'`の場合、パターンは行内の任意の位置にマッチする
  // 必要があるため、`^`（内部で自動付与されるため書かない）はともかく
  // 末尾の`\s*$`（行末までの一致要求）を外すこと——付けたままだと
  // 段落末尾に無いと一致しなくなり、後ろに文章が続くケースで
  // 保存済みMarkdownを読み込んだ際に復元できなくなる。
  window.CMS.registerEditorComponent({
    id: 'highlight-marker',
    label: 'マーカー（蛍光ペン）',
    type: 'inline',
    fields: [
      { name: 'color', label: 'カラー', widget: 'select', options: MARK_COLORS, default: 'yellow' },
      { name: 'text', label: 'テキスト', widget: 'string' },
    ],
    pattern: /<mark class="cms-mark cms-mark--(yellow|pink|green|blue|orange)">([\s\S]*?)<\/mark>/,
    fromBlock: function (match) {
      return { color: match[1], text: match[2] };
    },
    toBlock: function (obj) {
      return '<mark class="cms-mark cms-mark--' + (obj.color || 'yellow') + '">' + escapeHtml(obj.text) + '</mark>';
    },
    toPreview: function (obj) {
      var hasText = obj && obj.text;
      return h(
        'mark',
        {
          style: hasText
            ? { background: MARK_HEX[obj.color] || MARK_HEX.yellow, padding: 0, margin: 0, borderRadius: '2px' }
            : {
                background: 'transparent',
                border: '1px dashed #b9c0cc',
                borderRadius: '4px',
                padding: '0 6px',
                color: '#8a93a6',
                fontSize: '12px',
              },
        },
        hasText ? obj.text : 'クリックしてテキストを入力'
      );
    },
    // クリック時にフィールド編集モーダルを開く（上記editMarkerModal参照。
    // `type:'inline'`のコンポーネントは本体側が自動でフィールドフォームを
    // 表示しないため、これを実装しないと挿入後に一切編集できなくなる）。
    onEdit: function (props) {
      return editMarkerModal((props && props.data) || {});
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
  //
  // ⚠️【検証済み・意図的に`type:'inline'`にしていない】マーカー（9.26）と
  // 同じ`type:'inline'`をこのコンポーネントにも適用できないか検証した
  // 結果、`<div>`タグをベースにした本コンポーネントには**安全に適用できない**
  // ことがバンドル本体のソース解析で判明した。decap-cms本体の
  // ブロックレベルshortcode解析処理は`if ("inline"===e.type) return false`
  // という条件で`type:'inline'`のコンポーネントを明示的に除外しており、
  // かつCommonMarkの仕様上`<div>`は「HTMLブロック開始タグ」に該当する
  // ため（9.25参照）、保存済みMarkdownを再度読み込んだ際、この`<div>`は
  // インライン処理に到達する前にブロックレベルのHTMLとして処理されて
  // しまい、`type:'inline'`ではブロック側のマッチング候補から除外されて
  // いるため、**保存後に一度でも編集画面を再読み込みすると、この
  // コンポーネントが編集可能な状態に復元できなくなる**（＝壊れた生の
  // HTMLテキストとして表示される）机上ではなく実際にバンドルの
  // ソースコードから確認済みの致命的な問題。マーカーの`<mark>`タグは
  // CommonMarkのHTMLブロック開始タグに該当しないため問題にならなかったが
  // （9.25・9.26参照）、`<div>`ベースの本コンポーネント・囲い枠・吹き出し・
  // 動画埋め込みには同じ手法を適用できない。編集画面上で独立した
  // カード状の入力欄に見える点は変更できないが、これは保存データの
  // 安全性を優先した結果であり、妥協ではなく必要な設計上の制約である。
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
