/* ============================================================================
 * public/admin/preview.js
 * Decap CMS の「サイト全体設定（siteInfo.yml）」「デザインテーマ設定
 * （site-settings.json）」「実績・活用事例一覧（型化ページ／works）」
 * 「商品作成（src/data/products.yml）」に対するリアルタイムプレビュー
 * テンプレート。
 *
 * Astroコンポーネント（.astro）はビルド時にHTMLへ変換されるサーバー
 * サイド専用の仕組みのため、CMSの編集画面内でそのまま動かすことはできない。
 * そのため、本番の各コンポーネント（Hero/Features/Service/Flow/Works/
 * Products/Plans/Access/Faq/Contact/Header/Footer、および実績詳細ページ
 * works/[slug].astro、商品一覧ページ products.astro）のマークアップ・
 * Tailwindクラスをこのファイル内でReact要素として再現し、フォームの
 * 入力値（entry）を直接バインドすることで、保存・ビルドを待たずに
 * 実際のサイトに近い見た目でリアルタイムにプレビューする。
 *
 * スタイルは、実際にビルドされたサイトが読み込んでいるCSS（Tailwindの
 * コンパイル済みスタイルシート）をトップページのHTMLから動的に見つけ出し、
 * CMS.registerPreviewStyle() でそのままプレビューiframeに読み込ませる。
 * これにより、フォント・配色・コンポーネントの見た目は本番と完全に同一の
 * CSSファイルを使う（このファイル側で独自にスタイルを再定義しない）。
 * 同じトップページのHTMLから実際の<header>・<footer>（ロゴ・ナビ・
 * SNSアイコン等、siteInfo.yml側の最新公開データを反映したもの）もそのまま
 * 抜き出し、実績詳細ページのプレビューにも本物のヘッダー・フッターとして
 * 使い回す（works コレクションのプレビューは別エントリのため、
 * siteInfo.yml側の"未保存の編集中の値"までは参照できない＝直近に公開
 * 済みの内容が表示される）。
 * トップページの「サービス内容」「商品一覧」「実績・活用事例」「お知らせ」の
 * 各セクションも同様に、カード本体は別CMSエントリ（services.yml／
 * products.yml／worksコレクション／newsコレクション）のデータで
 * ビルド時にしか取得できないため、直近に公開済みのカード群・一覧のHTMLを
 * そのまま流用する（見出し・リンク文言など siteInfo.yml 側の値は
 * 編集中の最新値をこのファイル側で再現する）。
 * ============================================================================ */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  if (!h || !createClass || !window.CMS) return;

  // ==========================================================================
  // works/news の markdown ウィジェットのプレビュー（widgetFor('body')。
  // WorkPreview/NewsPreview が使用）は、Decap本体に内蔵された独自の
  // remarkパイプラインでHTML化されており、本番ビルド側（astro.config.mjs
  // の remark-breaks プラグイン）とは完全に別物のため、本番側だけを
  // 修正しても「段落内の単一改行（Enter1回）が見た目上詰まる」問題は
  // このプレビュー画面には反映されない。
  // 実機検証で、Decap側が生成するHTMLの`<p>`要素には、単一改行の
  // 箇所に**元の改行文字（\n）がテキストノードとしてそのまま残って
  // いる**ことを確認した（`white-space: normal`の既定値のせいで
  // ブラウザ表示上は空白1個に見えているだけで、DOM上は消えていない）。
  // そのため、Decapのプレビュー描画にのみ付与される
  // `[class*="WidgetPreviewContainer"]`（本番サイトには存在しない
  // Decap内部クラス）配下の`<p>`にだけ`white-space: pre-line`を
  // 適用し、この残存する改行文字を見た目上も改行として表示させる。
  // 本番サイト側の`.prose-content`（global.css）には適用しない——
  // 本番のビルド後HTMLは既に`<br>`要素として改行が明示的に挿入されて
  // おり、`<br>`直後にも同じ理由で改行文字が残っているため、ここに
  // `white-space: pre-line`を適用すると`<br>`と残存改行文字の両方が
  // 改行として扱われ、意図せず二重改行（空行）になってしまう
  // （本番側は`<br>`という確実な手段が既にあるため、この保険的な
  // CSSは不要かつ有害）。
  window.CMS.registerPreviewStyle(
    '[class*="WidgetPreviewContainer"] p { white-space: pre-line; }',
    { raw: true }
  );

  // ==========================================================================
  // 「お知らせ」「実績・活用事例」記事のURLスラッグに日本語（非ASCII）が
  // 紛れ込むのを防ぐ。config.yml の news / works コレクションは、記事
  // タイトルからではなくフォームの「URL用識別子（半角英数字）」フィールド
  // （`urlSlug`、pattern: ^[a-z0-9-]+$）からファイル名を組み立てる
  // （news: `{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}` / works:
  // `{{fields.urlSlug}}`。フィールド名を敢えて "slug" にしていない理由は
  // src/content/config.ts のコメント参照）。とはいえ同フィールドは任意入力
  // （required: false）のため、未入力のまま保存されるとファイル名が壊れる。
  // それを防ぐため、保存直前（preSave）に空欄ならランダムな識別子を
  // 自動採番する。
  //
  // 実装上の注意（Decap既知の落とし穴）：
  // ・handler の引数 entry は Immutable.js の Map。ネイティブの Map/Object
  //   と混同して `.data` 等でアクセスしないこと（`entry.get('data')` を使う）。
  // ・戻り値は必ず「元の data（Immutable Map）」または `.set()` で更新した
  //   ものを返すこと。`undefined` を返すと identifier_field が欠落した扱いに
  //   なり、後続の保存・画面遷移処理まで巻き込んで壊れる原因になる
  //   （decaporg/decap-cms#6775）。そのため対象外の場合も必ず `data` を
  //   そのまま返し、`entry` や `data` が想定外の形（undefined 等）のときは
  //   何も返さずそのまま Decap のデフォルト挙動に委ねる。
  // ・対象コレクションをハードコードせず、`urlSlug` フィールドを持つ
  //   コレクションかどうか（`data.has('urlSlug')`）で判定する。将来
  //   同じ仕組みを他のコレクションに追加した場合も自動的に適用される。
  // ==========================================================================
  // ==========================================================================
  // 本文（body）中の装飾ブロック（マーカー等）の前後にできる空行の削減。
  // registerEditorComponentで挿入した装飾は、Slateの内部データ構造上
  // 必ず独立したブロック（＝Markdownへシリアライズする際に前後を空行
  // "\n\n"で区切られた別段落）になる（CLAUDE.md 9.21/9.22で実証済みの
  // Decap CMS側の制約で、外部から変更できない）。
  // ただし実機確認したところ、この「前後の空行」自体は保存後のMarkdown
  // ソース上の見た目上の区切りに過ぎず、CommonMarkの仕様では
  // 「空行を挟まない連続した行」は同一段落として扱われる。かつ`<mark>`
  // タグ（マーカー）はCommonMarkの「HTMLブロック」開始タグ一覧に含まれない
  // ため、空行さえ無ければ前後の地の文とインラインで同じ<p>にまとまる
  // （`<div>`ベースの囲い枠・吹き出し・テキスト配置・動画埋め込みは
  // HTMLブロック開始タグに該当する`div`/`video`を使っているため、空行の
  // 有無に関わらず常に独立したブロックのままになる＝マーカーのみ有効）。
  // そのため保存直前（preSave）に本文中の装飾マーカーの前後の空行
  // （\n\n以上の連続改行）を単一の改行へ圧縮し、公開後のページで
  // マーカー適用箇所が前後の文章と同じ段落として自然につながるようにする。
  // Slateの内部contentEditableへ直接手を加えるわけではなく、保存直前の
  // 文字列（Immutable.jsのMapにセットする値）を書き換えるだけなので、
  // 9.21/9.22で確認したexecCommand系の手法のようなデータ破損リスクは無い。
  // ==========================================================================
  function collapseDecorationBlankLines(body) {
    if (typeof body !== 'string' || !body) return body;
    return body
      .replace(/\n{2,}(?=<mark class="cms-mark|<!--cms-box:|<!--cms-speech:|<div class="cms-align|<div class="cms-video-embed|<video class="cms-video-file)/g, '\n')
      .replace(/(<\/mark>|<\/div>|<\/video>)\n{2,}/g, '$1\n');
  }

  // urlSlug（works / news が持つ「URL用識別子」）を空欄のまま保存した
  // 場合、ランダムな識別子を自動採番してファイル名が壊れないようにする
  // 補正（9.3参照）。当初は `data.has('urlSlug')` で対象コレクション
  // かどうかを判定していたが、実機検証で **preSave の `args` には
  // `entry` と `author` しか含まれず、コレクション情報が一切渡されない**
  // こと、および **`default:` を持たないフィールド（`urlSlug` 等）は、
  // ユーザーが一度もフォーカス／入力していない場合、エントリの
  // `data` Immutable Map に**キー自体が存在しない**（`has()` が
  // `false` を返す）ことを確認した。つまり「新規作成→タイトルだけ
  // 入力してURL識別子欄には一切触れず即座に公開」という、最も
  // ありがちな操作パターンでこの安全策が発動せず、`slug:
  // "{{fields.urlSlug}}"` が空文字のまま評価されて `.md`（ファイル名が
  // 拡張子のみ）という不可視ファイルが生成される実害を実機で再現した
  // （Astro の Content Collections はこの種のファイルを検出せず、
  // 静的サイトに一切反映されない＝「新規作成したのに表示されない」の
  // 実例だった）。
  // 対策：`has()` によるコレクション判定をやめ、代わりに現在の画面の
  // ハッシュ（`#/collections/<name>/...`）からコレクション名を判定する
  // （postSave 側の `pendingCreateNewCollection` 判定と同じ手法）。
  // これなら `urlSlug` フィールドが一度も触れられていなくても、
  // 「works / news エントリの保存である」という事実さえ分かれば
  // 確実に値を検査・補正できる。
  var URLSLUG_COLLECTIONS = ['works', 'news'];

  window.CMS.registerEventListener({
    name: 'preSave',
    handler: function (args) {
      var entry = args && args.entry;
      var data = entry && typeof entry.get === 'function' ? entry.get('data') : undefined;
      if (!data || typeof data.set !== 'function') return data;

      var collectionMatch = location.hash.match(/^#\/collections\/([^/]+)/);
      var collectionName = collectionMatch ? collectionMatch[1] : null;
      if (collectionName && URLSLUG_COLLECTIONS.indexOf(collectionName) !== -1) {
        var urlSlug = data.get('urlSlug');
        if (!(typeof urlSlug === 'string' && urlSlug.trim())) {
          var random = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
          data = data.set('urlSlug', random);
        }
      }

      if (typeof data.has === 'function' && data.has('body') && typeof data.get('body') === 'string') {
        data = data.set('body', collapseDecorationBlankLines(data.get('body')));
      }

      return data;
    },
  });

  // ==========================================================================
  // 0) 本番サイトが実際に読み込んでいるCSSと、現在のテーマカラーを取得する
  // ==========================================================================
  var currentTheme = 'blue';
  var publishedHeaderHtml = '';
  var publishedFooterHtml = '';
  var publishedStickyBarHtml = '';
  var publishedServicesCardsHtml = '';
  var publishedProductsCardsHtml = '';
  var publishedWorksCardsHtml = '';
  var publishedNewsListEl = null;

  // 「サービス内容」「商品一覧」「実績・活用事例」のトップページ用カード群は、
  // すべて同一の構成（`[data-slider-root]` の中にカードのグリッド／
  // スライダー、その外側の兄弟要素として `[data-slider-dots]` ＝9.16で
  // 確立した規約）を共有しているため、共通のヘルパーで抽出できる。
  // 見出し（eyebrow/heading）・下部のリンクボタンは「サイト全体設定」側の
  // 現在編集中の値（data.services.heading等）を使って別途このファイル側で
  // 再現しているため、ここでは意図的に含めない（公開済みの古い見出しと
  // 混在させないため）。カード自体は別CMSエントリ（services.yml／
  // products.yml／worksコレクション）のデータのため、このプレビューからは
  // 編集中の値を参照できず、直近に公開済みの内容がそのまま表示される
  // （ヘッダー・フッター・画面下部固定バーと同じ制約・同じ方針）。
  function extractCardsHtml(parsed, sectionId) {
    if (!parsed) return '';
    try {
      var root = parsed.querySelector('#' + sectionId + ' [data-slider-root]');
      if (!root) return '';
      var html = root.outerHTML;
      var dots = root.parentElement && root.parentElement.querySelector('[data-slider-dots]');
      if (dots) html += dots.outerHTML;
      return html;
    } catch (e) {
      return '';
    }
  }
  function loadSiteStylesheetAndTheme() {
    return fetch('/')
      .then(function (res) {
        return res.text();
      })
      .then(function (html) {
        var themeMatch = html.match(/<html[^>]*\sdata-theme="([^"]+)"/i);
        if (themeMatch) currentTheme = themeMatch[1];

        var parsed = null;
        try {
          parsed = new DOMParser().parseFromString(html, 'text/html');
        } catch (e) {
          parsed = null;
        }

        // --- 本番サイトのCSSをプレビューiframeへ流し込む ---------------------
        // 本番ビルドの構成により、CSSは次の2形態で出力される：
        //  (A) 外部ファイル … <link rel="stylesheet" href="/_astro/xxxx.css">
        //  (B) インライン   … <style>...compiled Tailwind...</style>
        //      （astro.config.mjs の build.inlineStylesheets: 'always' により
        //        本テンプレートは基本的にこの (B) になる）
        // (A) は URL 指定、(B) は raw 文字列指定で registerPreviewStyle する。
        // どちらも拾うことで、インライン化設定を変えても崩れないようにする。
        // （開発サーバー `astro dev` では CSS が JS 経由で注入されるため
        //   どちらの形でも初期HTMLに含まれず、スタイル無しでプレビューされる。
        //   確認は `npm run build && npm run preview` で行うこと。）
        var linkTags = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi) || [];
        linkTags.forEach(function (tag) {
          var hrefMatch = tag.match(/href="([^"]+)"/i);
          if (hrefMatch && hrefMatch[1]) {
            try {
              window.CMS.registerPreviewStyle(hrefMatch[1]);
            } catch (e) {
              /* noop */
            }
          }
        });

        var styleEls = parsed ? parsed.querySelectorAll('style') : [];
        for (var i = 0; i < styleEls.length; i++) {
          var css = styleEls[i].textContent || '';
          if (css.trim()) {
            try {
              window.CMS.registerPreviewStyle(css, { raw: true });
            } catch (e) {
              /* raw 未対応の古い Decap の場合は諦める */
            }
          }
        }
        // DOMParser が使えない環境向けの正規表現フォールバック
        if (!parsed) {
          var styleMatches = html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
          styleMatches.forEach(function (block) {
            var inner = block.replace(/^<style[^>]*>/i, '').replace(/<\/style>\s*$/i, '');
            if (inner.trim()) {
              try {
                window.CMS.registerPreviewStyle(inner, { raw: true });
              } catch (e) {
                /* noop */
              }
            }
          });
        }

        // --- 商品／下層ページのプレビュー用に、公開済みのヘッダー・フッター・
        //     画面下部固定バーを抜き出す ---
        // （innerHTML 挿入時に内部 <script> は実行されないため、ハンバーガー
        //   メニュー等の動的挙動はプレビュー上では動かないが見た目には影響しない）
        // 画面下部固定バー（StickyContactBar.astro）は<footer>の外側の
        // 独立した<div>のため、footerElとは別にaria-labelで直接取得する
        // （両ボタンとも非表示設定・リンク先未設定の場合は公開ページ自体に
        // この要素が存在しないため、その場合はプレビューにも表示されない）。
        try {
          if (parsed) {
            var headerEl = parsed.querySelector('header');
            var footerEl = parsed.querySelector('footer');
            var stickyBarEl = parsed.querySelector('[aria-label="お問い合わせショートカット"]');
            if (headerEl) publishedHeaderHtml = headerEl.outerHTML;
            if (footerEl) publishedFooterHtml = footerEl.outerHTML;
            if (stickyBarEl) publishedStickyBarHtml = stickyBarEl.outerHTML;

            publishedServicesCardsHtml = extractCardsHtml(parsed, 'services');
            publishedProductsCardsHtml = extractCardsHtml(parsed, 'products');
            publishedWorksCardsHtml = extractCardsHtml(parsed, 'works');
            publishedNewsListEl = parsed.querySelector('#news ul');
          }
        } catch (e) {
          /* DOMParser非対応環境等では諦め、ヘッダー無しのプレビューにフォールバックする */
        }
      })
      .catch(function () {
        /* ローカルでのCMS単体確認時など、取得できなくてもプレビュー自体は表示させる */
      });
  }
  var stylesReady = loadSiteStylesheetAndTheme();

  // ==========================================================================
  // 共通ヘルパー
  // ==========================================================================
  function cx() {
    return Array.prototype.slice
      .call(arguments)
      .filter(Boolean)
      .join(' ');
  }

  // Astroコンポーネント側の style="prop:value;prop2:value2" 文字列を、
  // そのままコピーしてReactのstyleオブジェクト（キャメルケース）に変換する。
  function styleObj(str) {
    var obj = {};
    if (!str) return obj;
    str.split(';').forEach(function (decl) {
      var idx = decl.indexOf(':');
      if (idx === -1) return;
      var prop = decl.slice(0, idx).trim();
      var value = decl.slice(idx + 1).trim();
      if (!prop || !value) return;
      var camel = prop.replace(/-([a-z])/g, function (_, c) {
        return c.toUpperCase();
      });
      obj[camel] = value;
    });
    return obj;
  }

  function getData(entry) {
    var data = entry && entry.getIn(['data']);
    return data && data.toJS ? data.toJS() : {};
  }

  function assetUrl(getAsset, path) {
    if (!path) return '';
    // siteInfo.yml内の画像パスは基本的に "../assets/xxx.jpg"（siteInfo.yml
    // からの相対パス）形式だが、hero.imageとaccess.store.imageの2項目のみ
    // 過去のデータ移行時の名残で "/src/assets/xxx.jpg"（ルート絶対パス）
    // 形式になっている。getAssetは相対パス前提のためこの形式を解決できず、
    // 空の画像になってしまう（Decap本体のフォーム側サムネイルも同様に
    // 表示できていない、config.yml側の問題ではなくデータ側の形式差異）。
    // プレビューだけでも正しく表示できるよう、ここで相対パス形式に
    // 正規化してから解決する。
    var normalized = path.replace(/^\/?src\/assets\//, '../assets/');
    try {
      var asset = getAsset(normalized);
      return asset ? String(asset) : '';
    } catch (e) {
      return '';
    }
  }

  function htmlProp(str) {
    return { dangerouslySetInnerHTML: { __html: str || '' } };
  }

  // ==========================================================================
  // 「公開済みの実HTML」として流用しているヘッダー（publishedHeaderHtml、
  // 下層ページ／商品／実績詳細の各プレビューで使用）は、
  // dangerouslySetInnerHTML でDOMに挿入するため、埋め込まれた
  // <script>（src/components/MobileNavDrawer.astro のハンバーガー開閉
  // ロジック）は一切実行されない（7章・9.21で既知の制約として記載済み。
  // 実サイトのマークアップ自体は正しく含まれているため、見た目には影響
  // しないが「ハンバーガーをクリックしてもメニューが開閉しない」原因に
  // なっていた）。
  // MobileMenuButton.astro / MobileNavDrawer.astro が持つ安定したID
  // （#menu-btn / #mobile-nav / #bar1-3）を使い、挿入後のDOMに対して
  // 同じ開閉ロジックを手動で再アタッチすることで、実サイトと同じ
  // クリック挙動を復元する。
  // ⚠️ 実装上の注意：`window.h`（このファイル冒頭でDecapから受け取る
  // React.createElement）は実機解析の結果、`ref`プロパティを
  // 通常のpropsとして扱うだけで特別扱いしない（＝ref callbackが
  // 一切発火しない）ことを確認した。そのため挿入先のDOMノードへは
  // reactのrefではなく、このプレビューiframe自体（`.Pane2 iframe`）を
  // 呼び出し元の`componentDidMount`/`componentDidUpdate`から
  // 都度querySelectorで辿って取得する方式にしている（このファイル内の
  // 他の箇所が最初からrefを一切使っていないのも同じ理由と考えられる）。
  // 二重アタッチ防止のため、対象ボタンに `data-menu-wired` を立てる。
  // ==========================================================================
  function activateStaticHeaderMenu() {
    try {
      var iframe = document.querySelector('.Pane2 iframe');
      var doc = iframe && iframe.contentDocument;
      if (!doc) return;
      var btn = doc.getElementById('menu-btn');
      var nav = doc.getElementById('mobile-nav');
      if (!btn || !nav || btn.getAttribute('data-menu-wired')) return;
      btn.setAttribute('data-menu-wired', '1');
      var bar1 = doc.getElementById('bar1');
      var bar2 = doc.getElementById('bar2');
      var bar3 = doc.getElementById('bar3');

      function setMenu(open) {
        btn.setAttribute('aria-expanded', String(open));
        if (open) {
          nav.style.maxHeight = nav.scrollHeight + 'px';
          nav.classList.add('nav-open');
        } else {
          nav.style.maxHeight = '0px';
          nav.classList.remove('nav-open');
        }
        if (bar1) bar1.style.transform = open ? 'translateY(8px) rotate(45deg)' : '';
        if (bar2) bar2.style.opacity = open ? '0' : '1';
        if (bar3) bar3.style.transform = open ? 'translateY(-8px) rotate(-45deg)' : '';
      }

      btn.addEventListener('click', function () {
        setMenu(btn.getAttribute('aria-expanded') !== 'true');
      });
      doc.querySelectorAll('.mobile-nav-link').forEach(function (link) {
        link.addEventListener('click', function () {
          setMenu(false);
        });
      });
    } catch (e) {
      /* iframeが未マウント・クロスオリジン等で参照できない場合は諦める */
    }
  }

  // ==========================================================================
  // ヘッダー（簡易版：ロゴ＋PCナビのみ。ハンバーガーメニューの開閉は
  // プレビューの目的上不要なため省略）
  // ==========================================================================
  // mobileNav（省略可）: { open: boolean, onToggle: function } を渡すと、
  // 実サイト（Header.astro + MobileMenuButton.astro + MobileNavDrawer.astro）
  // と同じ見た目のハンバーガーボタン＋開閉ドロワーを描画し、クリックで
  // 実際に開閉できるようにする（デバイス幅切替でスマホ幅にした時に
  // 動作確認できるようにするための実装。渡さない呼び出し元（現状は
  // SiteInfoPreviewのみが対応）では従来どおりハンバーガー無しの
  // 簡易表示のまま）。
  function renderHeader(h, data, getAsset, mobileNav) {
    var company = data.company || {};
    var nav = filterVisibleNavForPreview(data, data.nav);
    var navCta = data.navCta || {};
    var logoUrl = assetUrl(getAsset, company.logo);
    var showTextLogo = !logoUrl || company.useTextLogo === true;
    var textLogo = company.textLogo || company.name || 'LOGO';
    var navOpen = !!(mobileNav && mobileNav.open);
    var closeNav = function () {
      if (mobileNav && mobileNav.onClose) mobileNav.onClose();
    };

    return h(
      'header',
      { className: 'sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur-sm' },
      h(
        'div',
        { className: 'max-w-[1200px] mx-auto px-5 py-[14px] flex items-center justify-between gap-4' },
        showTextLogo
          ? h('span', { className: 'text-[20px] font-bold text-secondary leading-none' }, textLogo)
          : h('img', { src: logoUrl, alt: (company.name || '') + ' ロゴ', className: 'h-7 w-auto object-contain' }),
        h(
          'nav',
          { className: 'hidden md:flex items-center gap-8' },
          nav.map(function (item, i) {
            return h(
              'a',
              { key: i, href: item.href, className: 'text-[15px] font-bold text-secondary hover:text-primary transition-colors' },
              item.label
            );
          }),
          navCta.label && navCta.href
            ? h(
                'a',
                { href: navCta.href, className: 'text-[14px] font-bold text-white bg-primary px-[22px] py-[10px] rounded-full' },
                navCta.label
              )
            : null
        ),
        mobileNav &&
          h(
            'button',
            {
              type: 'button',
              className: 'md:hidden p-2 bg-transparent border-none cursor-pointer flex flex-col justify-center flex-none',
              'aria-label': navOpen ? 'メニューを閉じる' : 'メニューを開く',
              'aria-expanded': navOpen ? 'true' : 'false',
              onClick: mobileNav.onToggle,
            },
            h('span', { className: 'block w-6 h-0.5 bg-secondary mb-1.5', style: styleObj(navOpen ? 'transform:translateY(8px) rotate(45deg);' : '') }),
            h('span', { className: 'block w-6 h-0.5 bg-secondary mb-1.5', style: styleObj(navOpen ? 'opacity:0;' : '') }),
            h('span', { className: 'block w-6 h-0.5 bg-secondary', style: styleObj(navOpen ? 'transform:translateY(-8px) rotate(-45deg);' : '') })
          )
      ),
      mobileNav &&
        h(
          'nav',
          {
            className: 'md:hidden overflow-hidden',
            style: styleObj('max-height:' + (navOpen ? '600px' : '0px') + ';transition:max-height 0.25s ease;'),
          },
          nav.map(function (item, i) {
            return h(
              'a',
              { key: i, href: item.href, onClick: closeNav, className: 'block px-5 py-[14px] text-[15px] font-bold text-secondary border-b border-surface-border' },
              item.label
            );
          }),
          navCta.label && navCta.href
            ? h('a', { href: navCta.href, onClick: closeNav, className: 'block px-5 py-[14px] text-[15px] font-bold text-primary' }, navCta.label)
            : null
        )
    );
  }

  // 画面下部固定バー（スマホのみ・StickyContactBar.astro相当）のプレビュー。
  // 「サイト全体設定」プレビューだけが stickyContactBar / contact / sns の
  // 全フィールドに同時アクセスできるため、このプレビューにのみ実装する
  // （実サイトの StickyContactBar.astro の resolveHref() と同じロジック。
  // 2箇所の実装が乖離しないよう、ロジックを変更した場合は両方を
  // 追従修正すること）。
  function resolveStickyHrefForPreview(actionType, customLink, fallbackHref) {
    if (!customLink) return fallbackHref;
    if (actionType === 'tel') {
      return customLink.indexOf('tel:') === 0 ? customLink : 'tel:' + customLink.replace(/[^0-9+]/g, '');
    }
    return customLink;
  }

  // src/components/StickyContactBar.astro の buttonColorClass() と一致させること。
  function stickyButtonColorClass(color) {
    return color === 'accent'
      ? 'bg-accent tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]'
      : 'bg-gradient-to-br from-primary to-primary-dark';
  }

  function renderStickyContactBarPreview(h, data) {
    var bar = data.stickyContactBar || {};
    var left = bar.leftButton || {};
    var right = bar.rightButton || {};
    var contact = data.contact || {};
    var lineUrl = orderedSnsForPreview(data).reduce(function (acc, link) {
      return link.id === 'line' ? link.href : acc;
    }, '');
    var phoneHref = resolveStickyHrefForPreview(left.actionType, left.customLink, contact.phoneHref || '');
    var lineHref = resolveStickyHrefForPreview(right.actionType, right.customLink, lineUrl || '');
    var showPhone = left.show && !!phoneHref;
    var showLine = right.show && !!lineHref;
    if (!showPhone && !showLine) return null;

    return h(
      'div',
      { className: 'fixed left-0 right-0 bottom-0 z-[60] md:hidden' },
      h(
        'div',
        { className: cx('grid', showPhone && showLine ? 'grid-cols-2' : 'grid-cols-1') },
        showPhone &&
          h(
            'a',
            {
              href: phoneHref,
              className: cx('flex items-center justify-center gap-2 text-white font-bold text-[14px] py-4', stickyButtonColorClass(left.color)),
            },
            h(
              'svg',
              { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none' },
              h('path', {
                d: 'M6.62 10.79a15.09 15.09 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z',
                fill: '#fff',
              })
            ),
            h('span', {}, left.label || 'お電話')
          ),
        showLine &&
          h(
            'a',
            { href: lineHref, className: cx('flex items-center justify-center gap-2 text-white font-bold text-[14px] py-4', stickyButtonColorClass(right.color)) },
            h(
              'svg',
              { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none' },
              h('path', {
                d: 'M12 3C6.48 3 2 6.69 2 11.24c0 4.08 3.58 7.49 8.42 8.13.33.07.78.22.89.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1 .88.55 1.07-.46 5.8-3.42 7.92-5.85C21.34 14.86 22 13.13 22 11.24 22 6.69 17.52 3 12 3Z',
                fill: '#fff',
              })
            ),
            h('span', {}, right.label || 'LINEで相談')
          )
      )
    );
  }

  // ==========================================================================
  // ヒーローセクション
  // ==========================================================================
  function renderHero(h, data, getAsset) {
    var hero = data.hero || {};
    var imageUrl = assetUrl(getAsset, hero.image);
    return h(
      'section',
      {
        className: cx('relative w-full overflow-hidden', !imageUrl && 'bg-secondary-dark'),
        style: styleObj('height:clamp(440px,72vw,640px);'),
      },
      imageUrl && h('img', { src: imageUrl, alt: hero.imageAlt || '', className: 'absolute inset-0 w-full h-full object-cover' }),
      imageUrl &&
        h('div', {
          className: 'absolute inset-0',
          style: styleObj(
            'background:linear-gradient(180deg, rgba(8,16,34,0.72) 0%, rgba(8,16,34,0.48) 45%, rgba(8,16,34,0.8) 100%);'
          ),
        }),
      h(
        'div',
        { className: 'relative z-10 h-full max-w-[1200px] mx-auto px-5 flex flex-col justify-center' },
        hero.heading &&
          h('h1', {
            className: 'font-bold leading-[1.4] mb-5 tracking-[0.01em] text-white whitespace-pre-line',
            style: styleObj('font-size:clamp(26px,3.6vw,38px);text-shadow:0 2px 14px rgba(0,0,0,0.45);'),
            ...htmlProp(hero.heading),
          }),
        hero.body &&
          h('p', {
            className: 'text-[15px] leading-[1.9] text-white mb-7 whitespace-pre-line',
            style: styleObj('text-shadow:0 1px 8px rgba(0,0,0,0.4);'),
            ...htmlProp(hero.body),
          }),
        hero.ctaLabel &&
          hero.ctaHref &&
          h(
            'a',
            {
              href: hero.ctaHref,
              className: 'inline-flex items-center gap-2 text-white font-bold text-[15px] px-8 py-4 rounded-full w-fit bg-gradient-to-br from-primary to-primary-dark',
              style: styleObj('box-shadow:0 10px 24px -8px rgba(var(--color-primary-rgb),0.55);'),
            },
            hero.ctaLabel + ' ›'
          ),
        hero.badges &&
          hero.badges.filter(Boolean).length > 0 &&
          h(
            'ul',
            { className: 'flex flex-wrap gap-[18px] mt-7 list-none p-0 m-0' },
            hero.badges.filter(Boolean).map(function (badge, i) {
              return h(
                'li',
                {
                  key: i,
                  className: 'flex items-center gap-1.5 text-[13px] text-white font-bold',
                  style: styleObj('text-shadow:0 1px 6px rgba(0,0,0,0.4);'),
                },
                '✓ ' + badge
              );
            })
          )
      )
    );
  }

  // ==========================================================================
  // 見出しブロック（eyebrow + h2）。ほぼ全セクション共通のパターン。
  // ==========================================================================
  function renderSectionHeading(h, eyebrow, heading, headingId) {
    return h(
      'div',
      { className: 'text-center mb-10' },
      eyebrow && h('div', { className: 'text-[12px] tracking-[0.2em] text-primary font-bold mb-2' }, eyebrow),
      heading &&
        h(
          'h2',
          { id: headingId, className: 'font-bold m-0', style: styleObj('font-size:clamp(24px,3.4vw,32px);') },
          heading
        )
    );
  }

  // ==========================================================================
  // 選ばれる3つの理由
  // ==========================================================================
  function renderFeatures(h, data, getAsset, muted) {
    var section = data.features_section || {};
    var items = section.items || [];
    return h(
      'section',
      { id: 'features', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-3 gap-9' },
          items.map(function (item, i) {
            var iconUrl = assetUrl(getAsset, item.icon);
            return h(
              'div',
              { key: i, className: 'text-center' },
              iconUrl &&
                h(
                  'div',
                  { className: 'w-[72px] h-[72px] rounded-full bg-primary-light flex items-center justify-center mx-auto mb-[18px]' },
                  h('img', { src: iconUrl, alt: '', className: 'w-8 h-8 object-contain' })
                ),
              (item.number || item.title) &&
                h(
                  'h3',
                  { className: 'text-[13px] font-bold text-primary mb-2' },
                  (item.number ? item.number + (item.title ? '｜' : '') : '') + (item.title || '')
                ),
              item.text && h('p', { className: 'text-[14px] leading-[1.8] text-ink-soft m-0 whitespace-pre-line' }, item.text)
            );
          })
        )
      )
    );
  }

  // ==========================================================================
  // サービス・事業内容
  // カード個別項目（画像・タイトル・説明）は siteInfo.yml には無く、
  // 「下層ページ ＞ サービス内容・料金」（別CMSエントリ）の「サービス詳細」を
  // 実サイトが直接参照する。このプレビューからは編集中のそのエントリの値を
  // 参照できないため、直近に公開済みのカード群（`publishedServicesCardsHtml`。
  // ヘッダー・フッターと同じ「公開済みHTMLの流用」方式）をそのまま表示する。
  // 取得できなかった場合（`astro dev`でCSSがJS注入される等、7章参照）のみ
  // 案内テキストにフォールバックする。
  // ==========================================================================
  function renderServices(h, data, getAsset, muted) {
    var section = data.services || {};
    return h(
      'section',
      { id: 'services', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        publishedServicesCardsHtml
          ? h('div', htmlProp(publishedServicesCardsHtml))
          : h(
              'p',
              { className: 'text-center text-[13px] text-ink-faint' },
              '（サービス項目一覧を取得できませんでした。「下層ページ ＞ サービス内容・料金」の「サービス詳細」を確認してください）'
            ),
        section.linkLabel &&
          section.linkHref &&
          h(
            'div',
            { className: 'text-center mt-10' },
            h(
              'a',
              {
                href: section.linkHref,
                className:
                  'inline-flex items-center justify-center gap-2 font-bold text-[15px] px-8 py-4 rounded-full text-primary bg-white border border-primary',
              },
              section.linkLabel + ' ›'
            )
          )
      )
    );
  }

  // ==========================================================================
  // お知らせセクション（トップページ／ヒーロー直下）
  // 記事本体は別コレクション（news）のデータのため、直近に公開済みの一覧
  // （`publishedNewsListHtml`）をそのまま表示する（services/products/works
  // と同じ「公開済みHTMLの流用」方式）。取得できなかった場合のみ案内文に
  // フォールバックする。
  // ==========================================================================
  function renderNewsSectionPreview(h, data) {
    var section = data.newsSection || {};
    var count = Number(section.count) > 0 ? Math.floor(Number(section.count)) : 3;
    // 「トップページに表示する件数」は今まさに編集中の値のため、公開済みの
    // 一覧HTMLをそのまま流用するのではなく、<li>単位で先頭count件だけを
    // 切り出して再構成する（他のセクションのカード群と違い、件数の反映を
    // 即座に確認できたほうが実用的なため）。
    var newsListHtml = '';
    if (publishedNewsListEl) {
      var items = Array.prototype.slice.call(publishedNewsListEl.children, 0, count);
      if (items.length) {
        newsListHtml =
          '<ul class="' +
          publishedNewsListEl.className +
          '">' +
          items.map(function (li) { return li.outerHTML; }).join('') +
          '</ul>';
      }
    }
    return h(
      'section',
      { id: 'news', className: 'py-16 px-5' },
      h(
        'div',
        { className: 'max-w-[820px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        newsListHtml
          ? h('div', htmlProp(newsListHtml))
          : h(
              'p',
              { className: 'text-center text-[13px] text-ink-faint' },
              '（お知らせ一覧を取得できませんでした。トップページには最新の記事が ' + count + ' 件表示されます）'
            ),
        section.linkLabel &&
          h(
            'div',
            { className: 'text-center mt-8' },
            h(
              'a',
              {
                href: section.linkHref || '/news',
                className:
                  'inline-flex items-center justify-center gap-2 font-bold text-[15px] px-8 py-4 rounded-full text-primary bg-white border border-primary',
              },
              section.linkLabel + ' ›'
            )
          )
      )
    );
  }

  // ==========================================================================
  // ご相談から納品までの流れ
  // ==========================================================================
  function renderFlow(h, data, muted) {
    var section = data.flow || {};
    var steps = section.steps || [];
    return h(
      'section',
      { id: 'flow', className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-5' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'flex flex-col lg:flex-row lg:items-stretch gap-3 lg:gap-2' },
          steps.reduce(function (acc, step, i) {
            var isLast = i === steps.length - 1;
            var isHighlighted = step.highlight === true;
            acc.push(
              h(
                'div',
                {
                  key: 'step-' + i,
                  className: cx(
                    'flex-1 rounded-2xl border-2 p-6 flex flex-col items-center text-center',
                    isHighlighted ? 'border-primary bg-gradient-to-br from-primary to-primary-dark' : 'border-surface-border bg-white'
                  ),
                },
                step.number != null &&
                  h('div', { className: cx('text-[26px] font-bold mb-2 leading-none', isHighlighted ? 'text-white' : 'text-primary') }, String(step.number)),
                step.title && h('h3', { className: cx('text-[14px] font-bold mb-1.5', isHighlighted && 'text-white') }, step.title),
                step.text &&
                  h(
                    'p',
                    { className: cx('text-[12px] leading-[1.7] m-0 whitespace-pre-line', isHighlighted ? 'text-white/85' : 'text-ink-soft') },
                    step.text
                  )
              )
            );
            if (!isLast) {
              acc.push(h('div', { key: 'arrow-' + i, className: 'flex-none flex items-center justify-center py-1 lg:py-0 lg:px-1 text-ink-faint' }, '↓'));
            }
            return acc;
          }, [])
        )
      )
    );
  }

  // ==========================================================================
  // 実績・活用事例 — カード本体は型化ページ（Content Collections: works、
  // 別のCMSエントリ）のデータのため、直近に公開済みのカード群
  // （`publishedWorksCardsHtml`）をそのまま表示する（servicesと同じ方式）。
  // ==========================================================================
  function renderWorksPlaceholder(h, data, muted) {
    var section = data.works || {};
    return h(
      'section',
      { id: 'works', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        publishedWorksCardsHtml
          ? h('div', htmlProp(publishedWorksCardsHtml))
          : h(
              'p',
              { className: 'text-center text-[13px] text-ink-faint' },
              '（実績カードを取得できませんでした。「実績・活用事例作成」コレクションを確認してください）'
            )
      )
    );
  }

  // ==========================================================================
  // 商品一覧 — カード本体は「商品作成」コレクション（別のCMSエントリ）の
  // データのため、直近に公開済みのカード群（`publishedProductsCardsHtml`）
  // をそのまま表示する（services/worksと同じ方式）。
  // ==========================================================================
  function renderProductsPlaceholder(h, data, muted) {
    var section = data.productsSection || {};
    return h(
      'section',
      { id: 'products', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        publishedProductsCardsHtml
          ? h('div', htmlProp(publishedProductsCardsHtml))
          : h(
              'p',
              { className: 'text-center text-[13px] text-ink-faint' },
              '（商品カードを取得できませんでした。「商品作成」コレクションを確認してください）'
            ),
        section.linkLabel &&
          section.linkHref &&
          h(
            'div',
            { className: 'text-center mt-10' },
            h(
              'a',
              {
                href: section.linkHref,
                className:
                  'inline-flex items-center justify-center gap-2 font-bold text-[15px] px-8 py-4 rounded-full text-primary bg-white border border-primary',
              },
              section.linkLabel + ' ›'
            )
          )
      )
    );
  }

  // ==========================================================================
  // 料金プラン
  // ==========================================================================
  function renderPlans(h, data, muted) {
    var section = data.plans || {};
    var items = section.items || [];
    return h(
      'section',
      { id: 'plans', className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-5' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          // 実サイト（Plans.astro）はスマホ幅で .card-slider-mobile による
          // 横スクロールスライダーになるが、プレビューiframeは常時PC相当の
          // 幅で表示されるため矢印ボタン等のJSは省略し、グリッドのクラス
          // だけ実サイトと一致させている（幅を絞ってもscroll-snapで
          // 横スクロールはできるが、矢印UIは出ない）。
          'div',
          { className: 'card-slider-mobile grid lg:grid-cols-3 gap-6 items-stretch pt-6 sm:pt-0' },
          items.map(function (plan, i) {
            return h(
              'div',
              {
                key: i,
                className: cx(
                  'relative rounded-2xl p-7 bg-white flex flex-col items-center text-center h-full',
                  plan.popular ? 'border-2 border-primary' : 'border border-surface-border'
                ),
                style: plan.popular ? styleObj('box-shadow:0 16px 32px -12px rgba(var(--color-primary-rgb),0.28);') : undefined,
              },
              plan.popular &&
                section.popularBadgeLabel &&
                h(
                  'div',
                  { className: 'absolute -top-[14px] left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold px-[14px] py-[5px] rounded-full whitespace-nowrap' },
                  section.popularBadgeLabel
                ),
              plan.name && h('h3', { className: cx('text-[17px] font-bold mb-1', plan.popular && 'mt-2') }, plan.name),
              plan.description && h('p', { className: 'text-[12px] text-ink-soft mb-5' }, plan.description),
              !!plan.price &&
                h(
                  'div',
                  { className: 'text-[28px] font-bold mb-6' },
                  '￥' + Number(plan.price).toLocaleString('ja-JP'),
                  h('span', { className: 'text-[14px] font-normal text-ink-soft' }, '〜')
                ),
              plan.features &&
                plan.features.filter(Boolean).length > 0 &&
                h(
                  'ul',
                  { className: 'list-none m-0 p-0 flex flex-col gap-3 w-fit mx-auto text-left' },
                  plan.features.filter(Boolean).map(function (feature, fi) {
                    return h(
                      'li',
                      { key: fi, className: 'flex gap-2 items-center text-[13px] text-secondary-light' },
                      h(
                        'svg',
                        { key: 'i', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', className: 'flex-none' },
                        h('path', {
                          d: 'M4 12.5l5 5L20 6',
                          style: styleObj('stroke: var(--color-primary);'),
                          strokeWidth: 2.4,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                        })
                      ),
                      feature
                    );
                  })
                ),
              section.buttonLabel &&
                section.buttonHref &&
                h(
                  'div',
                  { className: 'mt-auto pt-7 w-full' },
                  h(
                    'a',
                    {
                      href: section.buttonHref,
                      className: plan.popular
                        ? 'inline-flex items-center justify-center gap-2 w-full font-bold text-[15px] px-8 py-4 rounded-full text-white bg-gradient-to-br from-primary to-primary-dark'
                        : 'inline-flex items-center justify-center gap-2 w-full font-bold text-[15px] px-8 py-4 rounded-full text-primary bg-white border border-primary',
                      style: plan.popular ? styleObj('box-shadow:0 14px 30px -8px rgba(var(--color-primary-rgb),0.55);') : undefined,
                    },
                    section.buttonLabel + ' ›'
                  )
                )
            );
          })
        ),
        section.note && h('p', { className: 'text-center text-[12px] text-ink-faint mt-6' }, section.note)
      )
    );
  }

  // ==========================================================================
  // 店舗概要・アクセス
  // ==========================================================================
  // SNS のアイコン配色。src/components/SnsIcons.astro の SNS_STYLE と一致させること。
  var SNS_KNOWN_IDS = ['line', 'instagram', 'x', 'facebook', 'youtube', 'tiktok'];
  var SNS_STYLE = {
    line: { className: 'bg-accent' },
    instagram: { style: styleObj('background:linear-gradient(45deg,#f58529,#dd2a7b 50%,#515bd4);') },
    x: { className: 'bg-secondary' },
    facebook: { className: 'bg-[#1877f2]' },
    youtube: { className: 'bg-[#ff0000]' },
    tiktok: { className: 'bg-[#010101]' },
  };

  // siteInfo.yml トップレベルの `sns` リスト（{id,url,enabled}）を、
  // 並び順どおりに enabled かつ URL 入力済みのものだけ返す。
  // src/lib/sns.ts の orderedSnsLinks() と判定を一致させること。
  function orderedSnsForPreview(data) {
    return (data.sns || [])
      .filter(function (s) {
        return (
          s &&
          SNS_KNOWN_IDS.indexOf(s.id) !== -1 &&
          s.enabled !== false &&
          !!(s.url && String(s.url).trim())
        );
      })
      .map(function (s) {
        return { id: s.id, href: String(s.url).trim() };
      });
  }

  function renderAccess(h, data, getAsset, muted) {
    var section = data.access || {};
    var store = section.store || {};
    var labels = section.labels || {};
    var contact = data.contact || {};
    var imageUrl = assetUrl(getAsset, store.image);

    var infoRows = [
      { label: labels.postalCode, value: store.postalCode },
      { label: labels.address, value: store.address },
      { label: labels.nearestStation, value: store.nearestStation },
      { label: labels.phone, value: contact.phone, href: contact.phoneHref },
      { label: labels.businessHours, value: store.businessHours },
      { label: labels.closedDays, value: store.closedDays },
      { label: labels.parking, value: store.parking },
    ].filter(function (row) {
      return row.label && row.value;
    });

    var snsLinks = orderedSnsForPreview(data);

    return h(
      'section',
      { id: 'access', className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-5' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 lg:grid-cols-2 gap-8 items-start' },
          imageUrl &&
            h(
              'div',
              { className: 'rounded-2xl overflow-hidden border border-surface-border' },
              h('img', { src: imageUrl, alt: store.imageAlt || '', className: 'w-full h-[260px] sm:h-[320px] object-cover block' })
            ),
          h(
            'div',
            {},
            store.name && h('h3', { className: 'text-[18px] font-bold mb-5' }, store.name),
            infoRows.length > 0 &&
              h(
                'dl',
                { className: 'grid grid-cols-[100px_1fr] gap-x-4 gap-y-[14px] text-[13px] text-secondary-light m-0' },
                infoRows.reduce(function (acc, row, i) {
                  acc.push(h('dt', { key: 'dt-' + i, className: 'font-bold text-secondary' }, row.label));
                  acc.push(
                    h(
                      'dd',
                      { key: 'dd-' + i, className: 'm-0' },
                      row.href ? h('a', { href: row.href, className: 'text-primary' }, row.value) : row.value
                    )
                  );
                  return acc;
                }, [])
              ),
            snsLinks.length > 0 &&
              h(
                'div',
                { className: 'grid grid-cols-[100px_1fr] gap-x-4 items-center mt-[14px]' },
                h('span', { className: 'text-[13px] font-bold text-secondary-light' }, labels.sns),
                h(
                  'div',
                  { className: 'flex items-center gap-2' },
                  snsLinks.map(function (sns, i) {
                    var styleProps = SNS_STYLE[sns.id] || {};
                    return h('a', {
                      key: i,
                      href: sns.href,
                      className: cx('flex-none w-9 h-9 rounded-full flex items-center justify-center', styleProps.className),
                      style: styleProps.style,
                    });
                  })
                )
              )
          )
        ),
        store.mapEmbedUrl &&
          h(
            'div',
            { className: 'mt-10 rounded-2xl overflow-hidden border border-surface-border' },
            h('iframe', {
              title: store.name ? 'Googleマップ：' + store.name + '周辺' : 'Googleマップ',
              src: store.mapEmbedUrl,
              className: 'w-full h-[300px] sm:h-[360px] border-0 block',
              loading: 'lazy',
            })
          )
      )
    );
  }

  // ==========================================================================
  // よくある質問（プレビューでは開閉なしで全件展開表示）
  // ==========================================================================
  function renderFaq(h, data, muted) {
    var section = data.faq || {};
    var items = (section.items || []).filter(function (item) {
      return item.q;
    });
    return h(
      'section',
      { id: 'faq', className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[760px] mx-auto px-4 sm:px-6 lg:px-0' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'flex flex-col gap-3' },
          items.map(function (item, i) {
            return h(
              'div',
              { key: i, className: 'bg-white border border-surface-border rounded-xl overflow-hidden' },
              h(
                'div',
                { className: 'w-full flex items-center gap-3 px-5 py-[18px]' },
                h(
                  'span',
                  { className: 'flex-none w-5 h-5 rounded-full bg-primary text-white text-[11px] font-bold flex items-center justify-center' },
                  'Q'
                ),
                h('span', { className: 'text-[14px] font-bold text-secondary' }, item.q)
              ),
              item.a &&
                h(
                  'div',
                  { className: 'px-5 pb-[20px] text-[13px] leading-[1.8] text-ink-soft whitespace-pre-line', style: { paddingLeft: '52px' } },
                  item.a
                )
            );
          })
        )
      )
    );
  }

  // ==========================================================================
  // お問い合わせフォームの入力欄（src/components/ContactFields.astro / ContactField.astro）
  // 表示/非表示・ラベル・プレースホルダー・必須は contactPage.yml の formFields。
  // renderContact（siteInfo プレビュー）は別エントリの contactPage を参照できない
  // ため既定値のみ、ContactPagePreview は data.formFields を反映する。
  // 定義は src/lib/pages.ts の resolveContactFormFields と一致させること。
  // ==========================================================================
  var CONTACT_FIELD_PREVIEW_DEFAULTS = {
    name: { label: 'お名前', placeholder: '山田 太郎', required: true, type: 'text' },
    company: { label: '会社名', placeholder: '株式会社サンプル', required: false, type: 'text' },
    email: { label: 'メールアドレス', placeholder: 'example@example.com', required: true, type: 'email' },
    phone: { label: '電話番号', placeholder: '090-1234-5678', required: false, type: 'tel' },
    message: { label: 'お問い合わせ内容', placeholder: 'お問い合わせ内容をご記入ください', required: true, type: 'textarea' },
  };
  var CONTACT_FIELD_PREVIEW_ORDER = ['name', 'company', 'email', 'phone', 'message'];

  function resolveContactFieldsForPreview(config) {
    config = config || {};
    return CONTACT_FIELD_PREVIEW_ORDER.map(function (key) {
      var d = CONTACT_FIELD_PREVIEW_DEFAULTS[key];
      var c = config[key] || {};
      return {
        key: key,
        enabled: c.enabled !== false,
        label: typeof c.label === 'string' && c.label.trim() ? c.label.trim() : d.label,
        placeholder: typeof c.placeholder === 'string' ? c.placeholder : d.placeholder,
        required: typeof c.required === 'boolean' ? c.required : d.required,
        type: d.type,
      };
    }).filter(function (f) {
      return f.enabled;
    });
  }

  // カスタム追加項目（contactPage.custom_fields[]）。src/lib/pages.ts の
  // resolveCustomContactFields と同じ判定（予約語・重複・空欄を除外）。
  var CUSTOM_FIELD_TYPES_PREVIEW = ['text', 'number', 'tel', 'email', 'textarea', 'select'];
  var RESERVED_CONTACT_NAMES_PREVIEW = {
    name: 1, company: 1, email: 1, phone: 1, message: 1,
    subject: 1, from_name: 1, access_key: 1, botcheck: 1, redirect: 1, ccemail: 1,
  };

  function resolveCustomContactFieldsForPreview(list) {
    if (!Array.isArray(list)) return [];
    var seen = {};
    var out = [];
    list.forEach(function (c) {
      if (!c || c.enabled === false) return;
      var name = String(c.name == null ? '' : c.name).trim().replace(/[^A-Za-z0-9_]/g, '');
      var label = String(c.label == null ? '' : c.label).trim();
      if (!name || !label) return;
      if (RESERVED_CONTACT_NAMES_PREVIEW[name] || seen[name]) return;
      seen[name] = 1;
      var type = CUSTOM_FIELD_TYPES_PREVIEW.indexOf(c.type) !== -1 ? c.type : 'text';
      var options = Array.isArray(c.options)
        ? c.options.filter(function (o) {
            return typeof o === 'string' && o.trim() !== '';
          })
        : [];
      out.push({
        key: name,
        label: label,
        placeholder: typeof c.placeholder === 'string' ? c.placeholder : '',
        required: c.required === true,
        type: type,
        options: options,
      });
    });
    return out;
  }

  function renderContactFieldPreview(h, f) {
    var inputClass = 'px-4 py-[14px] border border-[#dbdfe8] rounded-lg text-[14px]';
    var control;
    if (f.type === 'textarea') {
      control = h('textarea', { readOnly: true, rows: 5, placeholder: f.placeholder, className: inputClass + ' resize-y' });
    } else if (f.type === 'select') {
      control = h(
        'select',
        { disabled: true, className: inputClass + ' bg-white appearance-none' },
        h('option', {}, f.placeholder || '選択してください'),
        (f.options || []).map(function (opt, i) {
          return h('option', { key: i }, opt);
        })
      );
    } else {
      control = h('input', { type: f.type, readOnly: true, placeholder: f.placeholder, className: inputClass });
    }
    return h(
      'label',
      { key: f.key, className: 'flex flex-col gap-1.5' },
      h(
        'span',
        { className: 'text-[13px] font-bold text-secondary flex items-center gap-2' },
        f.label,
        f.required
          ? h('span', { className: 'text-[10px] font-bold text-white bg-[#c62828] rounded px-1.5 py-[3px] leading-none' }, '必須')
          : h('span', { className: 'text-[10px] font-bold text-ink-faint bg-surface-muted rounded px-1.5 py-[3px] leading-none' }, '任意')
      ),
      control
    );
  }

  function renderContactFields(h, fields) {
    var pair = fields.filter(function (f) {
      return f.key === 'name' || f.key === 'company';
    });
    var rest = fields.filter(function (f) {
      return f.key !== 'name' && f.key !== 'company';
    });
    var out = [];
    if (pair.length === 2) {
      out.push(
        h(
          'div',
          { key: 'pair', className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
          pair.map(function (f) {
            return renderContactFieldPreview(h, f);
          })
        )
      );
    } else {
      pair.forEach(function (f) {
        out.push(renderContactFieldPreview(h, f));
      });
    }
    rest.forEach(function (f) {
      out.push(renderContactFieldPreview(h, f));
    });
    return out;
  }

  // ==========================================================================
  // お問い合わせ
  // ==========================================================================
  function renderContact(h, data, muted) {
    var section = data.contactSection || {};
    var form = section.form || {};
    var ui = data.ui || {};
    return h(
      'section',
      { id: 'contact', className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-5' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 md:grid-cols-2 gap-10' },
          h(
            'div',
            {},
            section.body && h('p', { className: 'text-[14px] leading-[1.9] text-secondary-light mb-6 whitespace-pre-line', ...htmlProp(section.body) }),
            section.points &&
              section.points.filter(Boolean).length > 0 &&
              h(
                'ul',
                { className: 'list-none p-0 m-0 flex flex-col gap-[14px]' },
                section.points.filter(Boolean).map(function (point, i) {
                  return h('li', { key: i, className: 'text-[13px] text-secondary-light font-normal' }, '・' + point);
                })
              )
          ),
          h(
            'div',
            { className: 'flex flex-col gap-3' },
            renderContactFields(h, resolveContactFieldsForPreview()),
            h(
              'button',
              { type: 'button', className: 'mt-1.5 text-white font-bold text-[15px] py-[15px] border-none rounded-full bg-gradient-to-br from-primary to-primary-dark' },
              (form.submitLabel || '') + ' ›'
            ),
            ui.privacyPolicyLabel &&
              h(
                'p',
                { className: 'text-[12px] text-ink-faint text-center m-0' },
                h('span', { className: 'text-primary underline' }, ui.privacyPolicyLabel),
                ui.privacyConsentSuffix
              )
          )
        )
      )
    );
  }

  // ==========================================================================
  // フッター（簡易版）
  // ==========================================================================
  function renderFooter(h, data, getAsset) {
    var company = data.company || {};
    var footerNav = filterVisibleNavForPreview(data, data.footerNav);
    var logoUrl = assetUrl(getAsset, company.logo);
    var showTextLogo = !logoUrl || company.useTextLogo === true;
    var textLogo = company.textLogo || company.name || 'LOGO';
    var snsLinks = orderedSnsForPreview(data);

    return h(
      'footer',
      { className: 'bg-footer-bg text-white pt-12 px-5 pb-10 text-[12px]' },
      h(
        'div',
        { className: 'max-w-[900px] mx-auto flex flex-col md:flex-row md:justify-between gap-9 mb-9' },
        h(
          'div',
          { className: 'text-center md:text-left' },
          showTextLogo
            ? h('p', { className: 'text-[18px] font-bold text-white mb-4' }, textLogo)
            : h('img', { src: logoUrl, alt: (company.name || '') + ' ロゴ', className: 'h-6 w-auto object-contain mb-4 mx-auto md:mx-0 block' }),
          snsLinks.length > 0 &&
            h(
              'div',
              { className: 'flex items-center justify-center md:justify-start gap-3' },
              snsLinks.map(function (sns, i) {
                return h('span', { key: i, className: 'w-9 h-9 rounded-full bg-white/20 flex items-center justify-center' });
              })
            )
        ),
        h(
          'nav',
          { className: 'grid grid-cols-2 gap-x-12 gap-y-3 text-center md:text-left justify-center md:justify-start' },
          footerNav.map(function (item, i) {
            return h('a', { key: i, href: item.href, className: 'text-white' }, item.label);
          })
        )
      ),
      data.copyright &&
        h('div', { className: 'text-center border-t border-white/20 pt-6' }, h('div', { className: 'mt-2 text-white' }, data.copyright))
    );
  }

  // ==========================================================================
  // セクションの並び順・表示/非表示（トップページ index.astro と同じロジック）
  // ==========================================================================
  var SECTION_KEYS = ['features', 'services', 'flow', 'products', 'works', 'plans', 'faq', 'access', 'contact'];
  var FEATURE_FLAG_MAP = {
    features: 'enableFeatures',
    services: 'enableServices',
    flow: 'enableFlow',
    products: 'enableProducts',
    works: 'enableWorks',
    plans: 'enablePlans',
    faq: 'enableFaq',
    access: 'enableAccess',
    contact: 'enableContact',
  };

  // ヘッダー・フッターのナビゲーション項目は、リンク先セクションが
  // 「セクションの表示・非表示」機能フラグでOFFになっている場合、
  // 実サイト側（src/lib/site.ts の visibleNavItems）と同様に連動して
  // 非表示にする。キーはFEATURE_FLAG_MAPと同じ対応関係を「#セクションID」
  // の形（nav/footerNavのhref表記）に変換したもの。
  // 複数ページ版（master-template-multi）では、トップページのセクションへ戻る
  // リンクを「/#works」形式（ルート付きハッシュ）で持たせるため、
  // 旧来の「#works」形式と両方をキーに登録する。「/services」等の
  // 下層ページ専用リンクは対応フラグを持たない＝常に表示。
  var NAV_HREF_TO_FLAG = Object.keys(FEATURE_FLAG_MAP).reduce(function (acc, id) {
    acc['#' + id] = FEATURE_FLAG_MAP[id];
    acc['/#' + id] = FEATURE_FLAG_MAP[id];
    return acc;
  }, {});

  function filterVisibleNavForPreview(data, items) {
    var features = data.features || {};
    return (items || []).filter(function (item) {
      if (!item || !item.label || !item.href) return false;
      var flag = NAV_HREF_TO_FLAG[item.href];
      // 対応するセクションフラグが無いリンク（外部リンク等）は常に表示する
      return flag === undefined || features[flag];
    });
  }

  function computeVisibleSections(data) {
    var order = (data.sectionOrder || [])
      .map(function (s) {
        return s.id;
      })
      .filter(function (id) {
        return SECTION_KEYS.indexOf(id) !== -1;
      });
    if (!order.length) order = SECTION_KEYS.slice();
    var features = data.features || {};
    return order
      .filter(function (id) {
        return !!features[FEATURE_FLAG_MAP[id]];
      })
      .map(function (id, i) {
        return { id: id, muted: i % 2 === 0 };
      });
  }

  function renderSection(h, id, data, getAsset, muted) {
    switch (id) {
      case 'features':
        return renderFeatures(h, data, getAsset, muted);
      case 'services':
        return renderServices(h, data, getAsset, muted);
      case 'flow':
        return renderFlow(h, data, muted);
      case 'products':
        return renderProductsPlaceholder(h, data, muted);
      case 'works':
        return renderWorksPlaceholder(h, data, muted);
      case 'plans':
        return renderPlans(h, data, muted);
      case 'access':
        return renderAccess(h, data, getAsset, muted);
      case 'faq':
        return renderFaq(h, data, muted);
      case 'contact':
        return renderContact(h, data, muted);
      default:
        return null;
    }
  }

  // ==========================================================================
  // 「サイト全体設定（siteInfo.yml）」プレビュー本体
  // ==========================================================================
  var SiteInfoPreview = createClass({
    getInitialState: function () {
      return { stylesLoaded: false, mobileNavOpen: false };
    },
    componentDidMount: function () {
      var self = this;
      this._unmounted = false;
      stylesReady.then(function () {
        if (!self._unmounted) {
          self.setState({ stylesLoaded: true });
        }
      });
    },
    componentWillUnmount: function () {
      this._unmounted = true;
    },
    toggleMobileNav: function () {
      this.setState({ mobileNavOpen: !this.state.mobileNavOpen });
    },
    closeMobileNav: function () {
      this.setState({ mobileNavOpen: false });
    },
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = getData(entry);
      var visibleSections = computeVisibleSections(data);

      return h(
        'div',
        { 'data-theme': currentTheme, className: 'font-sans bg-surface text-ink' },
        renderHeader(h, data, getAsset, {
          open: this.state.mobileNavOpen,
          onToggle: this.toggleMobileNav,
          onClose: this.closeMobileNav,
        }),
        h(
          'main',
          {},
          renderHero(h, data, getAsset),
          data.features && data.features.enableNews && renderNewsSectionPreview(h, data),
          visibleSections.map(function (s) {
            return h('div', { key: s.id }, renderSection(h, s.id, data, getAsset, s.muted));
          })
        ),
        renderFooter(h, data, getAsset),
        renderStickyContactBarPreview(h, data)
      );
    },
  });

  window.CMS.registerPreviewTemplate('siteInfo', SiteInfoPreview);

  // ==========================================================================
  // 「デザインテーマ設定（site-settings.json）」プレビュー本体
  // こちらは編集中の値（data.theme）をそのまま即座に反映する。
  // ==========================================================================
  var THEME_LABELS = { blue: 'ブルー', red: 'レッド', green: 'グリーン', purple: 'パープル', orange: 'オレンジ' };

  var SiteSettingsPreview = createClass({
    // 公開済みフッターHTML（publishedFooterHtml）は非同期fetch
    // （loadSiteStylesheetAndTheme()）の完了後にしか埋まらないため、
    // 初回マウント時点ではまだ空の可能性がある。取得完了を待って
    // forceUpdate() するパターンは下層ページ系プレビュー（makePagePreview）
    // と同じ（このプレビューは同関数を使わず独自実装のため、同じロジックを
    // ここにも個別に持たせている）。
    componentDidMount: function () {
      var self = this;
      this._unmounted = false;
      stylesReady.then(function () {
        if (!self._unmounted) self.forceUpdate();
      });
    },
    componentWillUnmount: function () {
      this._unmounted = true;
    },
    render: function () {
      var data = getData(this.props.entry);
      var theme = data.theme || 'blue';
      return h(
        'div',
        { 'data-theme': theme, className: 'font-sans bg-surface' },
        h(
          'div',
          { className: 'p-8' },
          h('p', { className: 'text-[13px] text-ink-soft mb-4' }, '選択中のテーマカラー：' + (THEME_LABELS[theme] || theme)),
          h(
            'a',
            {
              href: '#',
              className: 'inline-flex items-center gap-2 text-white font-bold text-[15px] px-8 py-4 rounded-full w-fit bg-gradient-to-br from-primary to-primary-dark',
            },
            'ボタンのサンプル ›'
          ),
          h('p', { className: 'text-[13px] font-bold text-primary mt-6' }, 'リンク・見出しのサンプルテキスト'),
          h(
            'div',
            { className: 'mt-6 rounded-2xl p-6 bg-white border-2 border-primary', style: styleObj('box-shadow:0 16px 32px -12px rgba(var(--color-primary-rgb),0.28);') },
            h('p', { className: 'text-[13px] text-secondary-light m-0' }, '人気プランカードのサンプル表示（枠線・影の色もテーマカラー連動）')
          ),
          h('p', { className: 'text-[13px] text-ink-soft mt-8 mb-0' }, 'フッターのサンプル表示（背景色・リンク・著作権表記もテーマカラー連動）')
        ),
        // フッターは src/components/Footer.astro をJSで再現するのではなく、
        // 公開済みの実HTML（publishedFooterHtml。商品／下層ページの
        // プレビューと同じ仕組み＝7章参照）をそのまま流用する。フッター
        // 自身は data-theme を持たないため、この div（編集中の theme を
        // data-theme に反映）の子として置くだけで、bg-footer-bg 等の
        // CSS変数がここで上書きした theme の値を正しく参照するようになる
        // （publishedFooterHtml 自体は「公開時点のテーマ」で生成された
        // 静的HTMLだが、色はすべてCSS変数経由のクラス名であって、
        // フッター側に固定の data-theme やインラインカラーは含まれない
        // ため、編集中のテーマ変更にそのまま追従する）。
        publishedFooterHtml
          ? h('div', htmlProp(publishedFooterHtml))
          : h('p', { className: 'text-[12px] text-ink-faint px-8 pb-8' }, '（本番サイトからフッターを取得できませんでした。npm run build && npm run preview で確認してください）'),
        publishedStickyBarHtml && h('div', htmlProp(publishedStickyBarHtml))
      );
    },
  });

  window.CMS.registerPreviewTemplate('siteSettings', SiteSettingsPreview);

  // ==========================================================================
  // 「実績・活用事例一覧（型化ページ）」プレビュー本体
  // src/pages/works/[slug].astro の構造をそのまま再現する（旧: products）。
  // パンくずリストの「トップ」表示名・「仕様・含まれる内容」見出し・
  // 相談CTAボタン文言は siteInfo.yml 側の productPage フィールドの値だが、
  // works コレクションのプレビューからは別エントリである siteInfo.yml
  // の“編集中の値”を参照する手段がないため、現時点でのデフォルト文言を
  // 固定値としてここに用意している（siteInfo.yml側でこれらの文言自体を
  // 変更した場合、このプレビュー表示だけは追従しない）。
  // ==========================================================================
  var PRODUCT_PAGE_DEFAULTS = {
    breadcrumbHome: 'トップ',
    specsHeading: '仕様・含まれる内容',
    ctaLabel: 'このプランで相談する',
  };

  var WorkPreview = createClass({
    componentDidMount: function () {
      var self = this;
      this._unmounted = false;
      stylesReady.then(function () {
        if (!self._unmounted) self.forceUpdate();
      });
      activateStaticHeaderMenu();
    },
    componentDidUpdate: function () {
      activateStaticHeaderMenu();
    },
    componentWillUnmount: function () {
      this._unmounted = true;
    },
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var widgetFor = this.props.widgetFor;
      var data = getData(entry);
      var imageUrl = assetUrl(getAsset, data.image);
      var specs = (data.specs || []).filter(Boolean);

      return h(
        'div',
        { 'data-theme': currentTheme, className: 'font-sans bg-surface text-ink' },
        publishedHeaderHtml && h('div', htmlProp(publishedHeaderHtml)),
        h(
          'main',
          {},
          h(
            'article',
            { className: 'py-12 px-5' },
            h(
              'div',
              { className: 'max-w-[820px] mx-auto' },
              h(
                'nav',
                { className: 'text-[12px] text-ink-faint mb-6' },
                h('a', { href: '#', className: 'hover:text-primary' }, PRODUCT_PAGE_DEFAULTS.breadcrumbHome),
                ' › ',
                data.title || ''
              ),
              imageUrl &&
                h(
                  'div',
                  { className: 'rounded-2xl overflow-hidden border border-surface-border mb-8 md:max-w-[67%] md:mx-auto' },
                  h('img', { src: imageUrl, alt: data.title || '', className: 'w-full h-auto object-cover block' })
                ),
              data.title &&
                h('h1', { className: 'font-bold mb-3', style: styleObj('font-size:clamp(24px,3.6vw,34px);') }, data.title),
              !!data.price &&
                h(
                  'div',
                  { className: 'text-[26px] font-bold text-primary mb-6' },
                  '￥' + Number(data.price).toLocaleString('ja-JP'),
                  h('span', { className: 'text-[14px] font-normal text-ink-soft' }, '〜')
                ),
              data.summary &&
                h('p', { className: 'text-[14px] leading-[1.9] text-secondary-light mb-8 whitespace-pre-line' }, data.summary),
              specs.length > 0 &&
                h(
                  'div',
                  { className: 'mb-10 bg-surface-muted rounded-2xl p-6' },
                  h('h2', { className: 'text-[14px] font-bold mb-4' }, PRODUCT_PAGE_DEFAULTS.specsHeading),
                  h(
                    'ul',
                    { className: 'list-none m-0 p-0 flex flex-col gap-2.5' },
                    specs.map(function (spec, i) {
                      return h(
                        'li',
                        { key: i, className: 'flex gap-2 items-start text-[13px] text-secondary-light' },
                        h('span', { className: 'text-primary flex-none' }, '✓'),
                        spec
                      );
                    })
                  )
                ),
              // 本文（markdownウィジェット）はDecap自身のwidgetFor()で
              // レンダリングさせる。自前でmarkdownパースを行うより、
              // 実際のエディタ・保存後の変換結果と確実に一致する。
              h('div', { className: 'prose-content text-[14px] leading-[1.9] text-secondary-light mb-10' }, widgetFor ? widgetFor('body') : null),
              h(
                'a',
                {
                  href: '#',
                  className: 'inline-flex items-center gap-2 text-white font-bold text-[15px] px-8 py-4 rounded-full bg-gradient-to-br from-primary to-primary-dark',
                },
                PRODUCT_PAGE_DEFAULTS.ctaLabel + ' ›'
              )
            )
          )
        ),
        publishedFooterHtml && h('div', htmlProp(publishedFooterHtml)),
        publishedStickyBarHtml && h('div', htmlProp(publishedStickyBarHtml))
      );
    },
  });

  window.CMS.registerPreviewTemplate('works', WorkPreview);

  // ==========================================================================
  // 「商品一覧設定」（src/data/products.yml、CMS「商品作成」）プレビュー本体
  // src/pages/products.astro の2セクション（横長カード／縦型カード）を
  // そのまま再現する。ヘッダー・フッターは公開済みの実HTMLを流用する
  // （下層ページプレビューと同じ方針）。画像拡大（ライトボックス）は
  // プレビュー上では省略し、通常のカード表示のみ行う。
  // ==========================================================================
  function resolveProductItemsForPreview(items, placement) {
    return (items || [])
      .filter(function (item) {
        return item && item.name && String(item.name).trim();
      })
      .filter(function (item) {
        var section = item.section || 'regular';
        return section === placement || section === 'both';
      });
  }

  function renderProductCardPreview(h, item, getAsset, variant) {
    var imageUrl = assetUrl(getAsset, item.image);
    var badge =
      item.showBadge &&
      item.badgeText &&
      h(
        'span',
        {
          className: cx(
            'inline-flex items-center rounded-full bg-primary text-white text-[10px] font-bold leading-none px-2 py-1 whitespace-nowrap',
            variant === 'regular' ? 'absolute top-3 left-3 z-10' : 'mb-3'
          ),
        },
        item.badgeText
      );
    var price =
      typeof item.price === 'number' &&
      h(
        'div',
        { className: variant === 'featured' ? 'text-[22px] font-bold text-primary' : 'text-[15px] font-bold text-primary' },
        '￥' + Number(item.price).toLocaleString('ja-JP'),
        h('span', { className: 'text-[13px] font-normal text-ink-soft' }, '〜')
      );

    if (variant === 'featured') {
      return h(
        'div',
        { key: item.name, className: 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center rounded-2xl border border-surface-border bg-white p-5 md:p-6' },
        imageUrl &&
          h(
            'div',
            { className: 'rounded-2xl overflow-hidden border border-surface-border' },
            h('img', { src: imageUrl, alt: item.name + 'のイメージ', className: 'w-full h-[220px] sm:h-[260px] object-cover block' })
          ),
        h(
          'div',
          {},
          badge,
          h('h3', { className: 'text-[19px] font-bold mb-2' }, item.name),
          item.description && h('p', { className: 'text-[14px] leading-[1.9] text-secondary-light whitespace-pre-line mb-3' }, item.description),
          price
        )
      );
    }

    // 下段掲載商品（regular）は products.astro と同じ理由で aspect-square を
    // 付けない（スマホ幅は1列表示のため高さを揃える必要がなく、正方形に
    // 固定すると説明文が短い項目で価格〜カード底辺間に不自然な余白ができる
    // 不具合があった）。
    return h(
      'div',
      { key: item.name, className: 'relative flex flex-col bg-white rounded-card overflow-hidden border border-surface-border' },
      badge,
      imageUrl &&
        h('img', { src: imageUrl, alt: item.name + 'のイメージ', className: 'w-full flex-none aspect-video md:aspect-auto md:h-[170px] object-cover block' }),
      h(
        'div',
        { className: 'px-4 py-4 md:py-5' },
        h('h3', { className: 'font-bold text-[15px] mb-1' }, item.name),
        item.description && h('p', { className: 'text-[12px] leading-[1.7] text-ink-soft mb-2 line-clamp-2 whitespace-pre-line' }, item.description),
        price
      )
    );
  }

  var ProductsCatalogPreview = makePagePreview(function (h, data, getAsset) {
    var heading = data.heading || '商品一覧';
    var featuredHeading = data.featuredHeading || '新商品';
    var regularHeading = data.regularHeading || '通年商品';
    var featuredItems = resolveProductItemsForPreview(data.items, 'featured');
    var regularItems = resolveProductItemsForPreview(data.items, 'regular');

    return [
      renderPagePreviewHeading(h, {
        key: 'head',
        eyebrow: 'PRODUCTS',
        title: heading,
        lead: data.lead,
        crumbs: [{ label: 'トップ', href: '#' }, { label: heading }],
      }),
      featuredItems.length > 0 &&
        h(
          'section',
          { key: 'featured', className: 'py-14 px-5' },
          h(
            'div',
            { className: 'max-w-[900px] mx-auto' },
            featuredHeading && h('h2', { className: 'text-center font-bold mb-10', style: styleObj('font-size:clamp(20px,3vw,26px);') }, featuredHeading),
            h(
              'div',
              { className: 'flex flex-col gap-8' },
              featuredItems.map(function (item) {
                return renderProductCardPreview(h, item, getAsset, 'featured');
              })
            )
          )
        ),
      regularItems.length > 0 &&
        h(
          'section',
          { key: 'regular', className: 'py-14 px-5 bg-surface-muted' },
          h(
            'div',
            { className: 'max-w-[1100px] mx-auto' },
            regularHeading && h('h2', { className: 'text-center font-bold mb-10', style: styleObj('font-size:clamp(20px,3vw,26px);') }, regularHeading),
            h(
              'div',
              { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' },
              regularItems.map(function (item) {
                return renderProductCardPreview(h, item, getAsset, 'regular');
              })
            )
          )
        ),
    ];
  });

  window.CMS.registerPreviewTemplate('products', ProductsCatalogPreview);

  // ==========================================================================
  // 複数ページ版（master-template-multi）専用：下層ページのプレビュー
  // src/pages/services.astro / about.astro / contact.astro / news/[slug].astro
  // のマークアップ・Tailwindクラスをそのまま再現する。
  // これらは siteInfo.yml とは別エントリのため、ヘッダー・フッターは
  // 商品プレビューと同様に「公開済みの実HTML」（publishedHeaderHtml /
  // publishedFooterHtml）を流用する（編集中の siteInfo.yml の値は参照不可）。
  // ==========================================================================

  // --- 共通：ページ見出し＋パンくず（src/components/PageHeader.astro） --------
  function renderPagePreviewHeading(h, opts) {
    var crumbs = opts.crumbs || [];
    return h(
      'section',
      { key: opts.key || 'page-heading', className: 'pt-10 pb-8 px-5 border-b border-surface-border bg-white' },
      h(
        'div',
        { className: 'max-w-[900px] mx-auto' },
        crumbs.length > 0 &&
          h(
            'nav',
            { className: 'text-[12px] text-ink-faint mb-5 flex flex-wrap items-center gap-1.5' },
            crumbs.reduce(function (acc, crumb, i) {
              if (i > 0) acc.push(h('span', { key: 'sep-' + i }, '›'));
              acc.push(
                crumb.href
                  ? h('a', { key: 'c-' + i, href: '#', className: 'hover:text-primary transition-colors' }, crumb.label)
                  : h('span', { key: 'c-' + i, className: 'text-ink-soft' }, crumb.label)
              );
              return acc;
            }, [])
          ),
        opts.eyebrow && h('div', { className: 'text-[12px] tracking-[0.2em] text-primary font-bold mb-2' }, opts.eyebrow),
        h('h1', { className: 'font-bold m-0', style: styleObj('font-size:clamp(24px,3.6vw,34px);') }, opts.title),
        opts.lead &&
          h('p', { className: 'mt-4 text-[14px] leading-[1.9] text-secondary-light whitespace-pre-line m-0' }, opts.lead)
      )
    );
  }

  // --- 共通：CTAボタン（src/components/Button.astro） -----------------------
  function renderPreviewButton(h, label, variant) {
    var base =
      'inline-flex items-center justify-center gap-2 font-bold text-[15px] px-8 py-4 rounded-full transition-opacity hover:opacity-90';
    var styles =
      variant === 'outline'
        ? 'text-primary bg-white border border-primary'
        : 'text-white bg-gradient-to-br from-primary to-primary-dark';
    return h('a', { href: '#', className: cx(base, styles) }, (label || '') + ' ›');
  }

  // --- 共通：プレーンテキスト → ブロック配列（src/lib/pages.ts parseTextBlocks） -
  function parseTextBlocksForPreview(source) {
    if (!source) return [];
    return source
      .split(/\n{2,}/)
      .map(function (chunk) {
        return chunk.trim();
      })
      .filter(Boolean)
      .map(function (chunk) {
        var m = chunk.match(/^#{1,6}\s+(.*)$/);
        if (m && chunk.indexOf('\n') === -1) return { type: 'heading', text: m[1].trim() };
        return { type: 'paragraph', text: chunk };
      });
  }

  // --- 共通：下層ページのラッパー（ヘッダー／フッターは公開HTMLを流用） ----
  function pagePreviewShell(h, children) {
    return h(
      'div',
      { 'data-theme': currentTheme, className: 'font-sans bg-surface text-ink' },
      publishedHeaderHtml && h('div', htmlProp(publishedHeaderHtml)),
      h('main', {}, children),
      publishedFooterHtml && h('div', htmlProp(publishedFooterHtml)),
      publishedStickyBarHtml && h('div', htmlProp(publishedStickyBarHtml))
    );
  }

  function makePagePreview(renderBody) {
    return createClass({
      componentDidMount: function () {
        var self = this;
        this._unmounted = false;
        stylesReady.then(function () {
          if (!self._unmounted) self.forceUpdate();
        });
        activateStaticHeaderMenu();
      },
      componentDidUpdate: function () {
        activateStaticHeaderMenu();
      },
      componentWillUnmount: function () {
        this._unmounted = true;
      },
      render: function () {
        var data = getData(this.props.entry);
        return pagePreviewShell(
          h,
          renderBody(h, data, this.props.getAsset, this.props.widgetFor)
        );
      },
    });
  }

  // ==========================================================================
  // サービス内容・料金（src/pages/services.astro）
  // ==========================================================================
  var ServicesPagePreview = makePagePreview(function (h, data, getAsset) {
    var heading = data.heading || 'サービス内容・料金';
    var itemsHeading = data.itemsHeading || 'サービス内容';
    var priceHeading = data.priceHeading || '料金表';
    var items = data.items || [];
    var priceTable = data.priceTable || [];
    return [
      renderPagePreviewHeading(h, {
        key: 'head',
        eyebrow: 'SERVICE',
        title: heading,
        lead: data.lead,
        crumbs: [{ label: 'トップ', href: '#' }, { label: heading }],
      }),
      items.length > 0 &&
        h(
          'section',
          { key: 'items', className: 'py-14 px-5' },
          h(
            'div',
            { className: 'max-w-[900px] mx-auto' },
            itemsHeading &&
              h(
                'h2',
                { className: 'text-center font-bold mb-10', style: styleObj('font-size:clamp(20px,3vw,26px);') },
                itemsHeading
              ),
            h(
            'div',
            { className: 'flex flex-col gap-12' },
            items.map(function (item, i) {
              var imageUrl = assetUrl(getAsset, item.image);
              var features = (item.features || []).filter(Boolean);
              return h(
                'article',
                { key: i, className: 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center' },
                imageUrl &&
                  h(
                    'div',
                    { className: cx('rounded-2xl overflow-hidden border border-surface-border', item.reverseLayout && 'md:order-2') },
                    h('img', {
                      src: imageUrl,
                      alt: item.title ? item.title + 'のイメージ' : '',
                      className: 'w-full h-[220px] sm:h-[260px] object-cover block',
                    })
                  ),
                h(
                  'div',
                  {},
                  item.title &&
                    h(
                      'h3',
                      { className: 'flex items-center flex-wrap gap-x-2 gap-y-1 text-[19px] font-bold mb-3' },
                      item.badgeText &&
                        h(
                          'span',
                          { className: 'inline-flex items-center rounded-full bg-primary text-white text-[11px] font-bold leading-none px-2.5 py-1 whitespace-nowrap' },
                          item.badgeText
                        ),
                      item.title
                    ),
                  item.description &&
                    h('p', { className: 'text-[14px] leading-[1.9] text-secondary-light whitespace-pre-line mb-4' }, item.description),
                  features.length > 0 &&
                    h(
                      'ul',
                      { className: 'list-none m-0 p-0 flex flex-col gap-2' },
                      features.map(function (feature, fi) {
                        return h(
                          'li',
                          { key: fi, className: 'flex gap-2 items-start text-[13px] text-secondary-light' },
                          h('span', { className: 'text-primary flex-none' }, '✓'),
                          feature
                        );
                      })
                    )
                )
              );
            })
            )
          )
        ),
      priceTable.length > 0 &&
        h(
          'section',
          { key: 'price', className: 'py-14 px-5 bg-surface-muted' },
          h(
            'div',
            { className: 'max-w-[760px] mx-auto' },
            h('h2', { className: 'text-center font-bold mb-8', style: styleObj('font-size:clamp(20px,3vw,26px);') }, priceHeading),
            h(
              'div',
              { className: 'rounded-2xl overflow-hidden border border-surface-border bg-white' },
              priceTable.map(function (row, i) {
                var rowFeatures = (row.features || []).filter(Boolean);
                // services.astro と同じ理由：ハイライト行は自前の青枠（4辺）で
                // 囲むため、直上・直下の通常の区切り線と二重線にならないよう、
                // 自分自身または直前の行がハイライトのときは区切り線を出さない。
                var prevHighlighted = i > 0 && !!(priceTable[i - 1] && priceTable[i - 1].highlight);
                var showDivider = i > 0 && !row.highlight && !prevHighlighted;
                return h(
                  'div',
                  {
                    key: i,
                    className: cx(
                      'px-5 py-4',
                      showDivider && 'border-t border-surface-border',
                      row.highlight &&
                        'relative z-10 my-2 rounded-xl border-2 border-primary bg-white shadow-[0_10px_24px_-10px_rgba(var(--color-primary-rgb),0.35)]'
                    ),
                  },
                  h(
                    'div',
                    { className: 'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1' },
                    h(
                      'div',
                      { className: 'inline-flex items-center flex-wrap gap-x-2 gap-y-1' },
                      row.showBadge && row.badgeText
                        ? h(
                            'span',
                            {
                              className:
                                'inline-flex items-center rounded-full bg-primary text-white text-[10px] font-bold leading-none px-2 py-1 whitespace-nowrap',
                            },
                            row.badgeText
                          )
                        : null,
                      h('span', { className: 'text-[14px] font-bold text-secondary' }, row.name)
                    ),
                    h(
                      'div',
                      { className: 'text-[15px] font-bold text-primary' },
                      typeof row.price === 'number'
                        ? [
                            '￥' + Number(row.price).toLocaleString('ja-JP'),
                            h('span', { key: 's', className: 'text-[12px] font-normal text-ink-soft' }, '〜'),
                          ]
                        : null
                    ),
                    row.note && h('div', { className: 'w-full text-[12px] text-ink-faint' }, row.note)
                  ),
                  rowFeatures.length > 0 &&
                    h(
                      'ul',
                      { className: 'list-none m-0 p-0 mt-3 flex flex-col gap-2' },
                      rowFeatures.map(function (feature, fi) {
                        return h(
                          'li',
                          { key: fi, className: 'flex gap-2 items-start text-[13px] text-secondary-light' },
                          h(
                            'svg',
                            { key: 'i', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', className: 'flex-none mt-0.5' },
                            h('path', {
                              d: 'M4 12.5l5 5L20 6',
                              style: styleObj('stroke: var(--color-primary);'),
                              strokeWidth: 2.4,
                              strokeLinecap: 'round',
                              strokeLinejoin: 'round',
                            })
                          ),
                          feature
                        );
                      })
                    )
                );
              })
            ),
            data.priceNote &&
              h('p', { className: 'mt-5 text-[12px] leading-[1.8] text-ink-faint whitespace-pre-line' }, data.priceNote)
          )
        ),
    ];
  });

  window.CMS.registerPreviewTemplate('services', ServicesPagePreview);

  // ==========================================================================
  // 店舗概要・アクセス（src/pages/about.astro）
  // ==========================================================================
  var AboutPagePreview = makePagePreview(function (h, data, getAsset) {
    var heading = data.heading || '会社概要';
    var sections = data.sections || {};
    var greeting = data.greeting || {};
    var greetingImg = assetUrl(getAsset, greeting.image);
    var profile = (data.profile || []).filter(function (row) {
      return row.label && row.value;
    });
    var access = data.access || {};
    var accessItems = (access.items || []).filter(function (row) {
      return row && row.enabled !== false && row.label && String(row.label).trim() && row.value && String(row.value).trim();
    });
    var companySnsLabel = (data.companySnsLabel && String(data.companySnsLabel).trim()) || '公式SNS';
    var showCompanySnsRow = !!(data.companySnsLabel && String(data.companySnsLabel).trim());
    var showGreeting = sections.greeting !== false && (greeting.heading || greeting.body || greeting.name);
    var showCompanyOverview = sections.companyOverview !== false && (profile.length > 0 || showCompanySnsRow);
    var showAccess = sections.access !== false && (accessItems.length > 0 || access.mapEmbedUrl);

    // --- セクション動的背景色（ゼブラ） ---------------------------------------
    // 「セクション表示・非表示」トグルを切り替えると、data（フォームの入力値）が
    // 変わるたびにこの関数全体が React により再実行される。そのたびに
    //   1. show が true のセクションだけを配列に残し（filter）
    //   2. 先頭から 0,1,2… と付け直したインデックスで白 / bg-surface-muted を
    //      交互（index % 2）に割り当て直す（map）
    // ことで、一部を非表示にしても常に「白→グレー→白…」の互い違いになり、
    // 右側プレビューに即座に反映される。
    var greetingSection = function (muted) {
      return h(
        'section',
        { key: 'greeting', className: cx('py-14 px-5', muted && 'bg-surface-muted') },
        h(
          'div',
          { className: 'max-w-[900px] mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start' },
          greetingImg &&
            h(
              'div',
              { className: 'rounded-2xl overflow-hidden border border-surface-border' },
              h('img', {
                src: greetingImg,
                alt: greeting.name ? greeting.name + 'の写真' : '',
                className: 'w-full h-[240px] md:h-[260px] object-cover block',
              })
            ),
          h(
            'div',
            {},
            greeting.heading && h('h2', { className: 'text-[19px] font-bold mb-4' }, greeting.heading),
            greeting.body &&
              h('p', { className: 'text-[14px] leading-[1.9] text-secondary-light whitespace-pre-line mb-4' }, greeting.body),
            // 実サイトでは「{会社名}　代表　{氏名}」だが、会社名は siteInfo.yml
            // 側の別エントリのためプレビューでは氏名のみ表示する。
            greeting.name && h('p', { className: 'text-[13px] text-secondary font-bold m-0' }, '代表　' + greeting.name)
          )
        )
      );
    };
    var companyOverviewSection = function (muted) {
      return h(
        'section',
        { key: 'profile', className: cx('py-14 px-5', muted && 'bg-surface-muted') },
        h(
          'div',
          { className: 'max-w-[760px] mx-auto' },
          h('h2', { className: 'text-center font-bold mb-8', style: styleObj('font-size:clamp(20px,3vw,26px);') }, '会社概要'),
          h(
            'dl',
            { className: 'rounded-2xl overflow-hidden border border-surface-border bg-white m-0' },
            profile
              .map(function (row, i) {
                return h(
                  'div',
                  { key: i, className: cx('grid grid-cols-1 sm:grid-cols-[150px_1fr]', i > 0 && 'border-t border-surface-border') },
                  h(
                    'dt',
                    { className: 'px-5 py-3 text-[13px] font-bold text-secondary bg-surface-band sm:bg-transparent sm:py-4' },
                    row.label
                  ),
                  h(
                    'dd',
                    { className: 'px-5 pb-4 pt-3 sm:pt-4 text-[13px] leading-[1.9] text-secondary-light whitespace-pre-line m-0' },
                    row.value
                  )
                );
              })
              .concat(
                showCompanySnsRow
                  ? [
                      h(
                        'div',
                        {
                          key: 'sns',
                          className: cx(
                            'grid grid-cols-1 sm:grid-cols-[150px_1fr] sm:items-center',
                            profile.length > 0 && 'border-t border-surface-border'
                          ),
                        },
                        h(
                          'dt',
                          { className: 'px-5 py-3 text-[13px] font-bold text-secondary bg-surface-band sm:bg-transparent sm:py-4' },
                          companySnsLabel
                        ),
                        h(
                          'dd',
                          { className: 'px-5 pb-4 pt-3 sm:pt-4 text-[12px] text-ink-faint m-0' },
                          '（サイト設定の「SNS設定」で表示中のSNSアイコンがここに並びます）'
                        )
                      ),
                    ]
                  : []
              )
          )
        )
      );
    };
    var accessSection = function (muted) {
      return h(
        'section',
        { key: 'access', className: cx('py-14 px-5', muted && 'bg-surface-muted') },
        h(
          'div',
          { className: 'max-w-[900px] mx-auto' },
          h('h2', { className: 'text-center font-bold mb-8', style: styleObj('font-size:clamp(20px,3vw,26px);') }, 'アクセス'),
          accessItems.length > 0 &&
            h(
              'dl',
              { className: 'grid grid-cols-[100px_1fr] gap-x-4 gap-y-[14px] text-[13px] text-secondary-light max-w-[600px] mx-auto m-0' },
              accessItems.reduce(function (acc, row, i) {
                acc.push(h('dt', { key: 'dt-' + i, className: 'font-bold text-secondary' }, String(row.label).trim()));
                acc.push(h('dd', { key: 'dd-' + i, className: 'm-0 whitespace-pre-line' }, String(row.value).trim()));
                return acc;
              }, [])
            ),
          access.mapEmbedUrl &&
            h(
              'div',
              { className: 'mt-8 rounded-2xl overflow-hidden border border-surface-border' },
              h('iframe', {
                title: 'Googleマップ',
                src: access.mapEmbedUrl,
                className: 'w-full h-[300px] sm:h-[360px] border-0 block',
                loading: 'lazy',
              })
            )
        )
      );
    };

    var visibleAboutSections = [
      { show: showGreeting, render: greetingSection },
      { show: showCompanyOverview, render: companyOverviewSection },
      { show: showAccess, render: accessSection },
    ]
      .filter(function (s) {
        return s.show;
      })
      .map(function (s, i) {
        return s.render(i % 2 === 1);
      });

    return [
      renderPagePreviewHeading(h, {
        key: 'head',
        eyebrow: 'ABOUT',
        title: heading,
        lead: data.lead,
        crumbs: [{ label: 'トップ', href: '#' }, { label: heading }],
      }),
    ].concat(visibleAboutSections);
  });

  window.CMS.registerPreviewTemplate('about', AboutPagePreview);

  // ==========================================================================
  // お問い合わせ・ご予約（src/pages/contact.astro）
  // 送信ボタン文言・同意文は siteInfo.yml（別エントリ）の値だが参照できないため
  // 現行のデフォルト文言を固定値で用意する。入力欄はこのエントリ自身の
  // data.formFields を反映する（renderContactFields）。
  // ==========================================================================
  var CONTACT_FORM_DEFAULTS = {
    submitLabel: '送信する',
    privacyPolicyLabel: 'プライバシーポリシー',
    privacyConsentSuffix: 'に同意の上、送信してください。',
  };

  var ContactPagePreview = makePagePreview(function (h, data) {
    var heading = data.heading || 'お問い合わせ・ご予約';
    var notes = (data.notes || []).filter(Boolean);
    var f = CONTACT_FORM_DEFAULTS;
    // 表示順：お名前 → 会社名 → メールアドレス → 電話番号 → カスタム項目 → お問い合わせ内容
    var fixedFields = resolveContactFieldsForPreview(data.formFields);
    var customFields = resolveCustomContactFieldsForPreview(data.custom_fields);
    var contactFields = fixedFields
      .filter(function (x) {
        return x.key !== 'message';
      })
      .concat(customFields)
      .concat(
        fixedFields.filter(function (x) {
          return x.key === 'message';
        })
      );
    var privacy = data.privacyPolicy || {};
    var privacyBlocks = parseTextBlocksForPreview(privacy.body);
    return [
      renderPagePreviewHeading(h, {
        key: 'head',
        eyebrow: 'CONTACT',
        title: heading,
        lead: data.intro,
        crumbs: [{ label: 'トップ', href: '#' }, { label: heading }],
      }),
      h(
        'section',
        { key: 'form', className: 'py-14 px-5' },
        h(
          'div',
          { className: 'max-w-[720px] mx-auto' },
          notes.length > 0 &&
            h(
              'ul',
              { className: 'list-none p-0 m-0 mb-8 flex flex-col gap-2 bg-surface-muted rounded-2xl px-6 py-5' },
              notes.map(function (note, i) {
                return h('li', { key: i, className: 'text-[13px] leading-[1.8] text-secondary-light' }, '・' + note);
              })
            ),
          h(
            'div',
            { className: 'flex flex-col gap-3' },
            renderContactFields(h, contactFields),
            h(
              'button',
              { type: 'button', className: 'mt-1.5 text-white font-bold text-[15px] py-[15px] border-none rounded-full bg-gradient-to-br from-primary to-primary-dark' },
              f.submitLabel + ' ›'
            ),
            h(
              'p',
              { className: 'text-[12px] text-ink-faint text-center m-0' },
              h('span', { className: 'text-primary underline' }, f.privacyPolicyLabel),
              f.privacyConsentSuffix
            )
          )
          // 実サイトの送信成功／失敗メッセージ（#contact-success / #contact-error）は
          // 既定で hidden のため、プレビューでは描画しない（siteInfo.yml 側の
          // contactSection.form.successMessage / errorMessage で管理）。
        )
      ),
      (privacy.heading || privacyBlocks.length > 0) &&
        h(
          'section',
          { key: 'privacy', className: 'py-14 px-5 bg-surface-muted' },
          h(
            'div',
            { className: 'max-w-[760px] mx-auto' },
            privacy.heading && h('h2', { className: 'font-bold mb-6', style: styleObj('font-size:clamp(20px,3vw,26px);') }, privacy.heading),
            h(
              'div',
              { className: 'flex flex-col gap-4 text-[14px] leading-[1.9] text-secondary-light' },
              privacyBlocks.map(function (block, i) {
                return block.type === 'heading'
                  ? h('h3', { key: i, className: 'text-[15px] font-bold text-secondary mt-2' }, block.text)
                  : h('p', { key: i, className: 'whitespace-pre-line m-0' }, block.text);
              })
            ),
            privacy.updatedAt && h('p', { className: 'mt-6 text-[12px] text-ink-faint' }, '最終改定日：' + privacy.updatedAt)
          )
        ),
    ];
  });

  window.CMS.registerPreviewTemplate('contact', ContactPagePreview);

  // ==========================================================================
  // お知らせ一覧ページ（src/pages/news/index.astro）
  // 個々の記事（news コレクション）はこのエントリとは別データのため取得できず、
  // productsのプレビュー同様プレースホルダー表示に留める。見出し・リード文・
  // 一覧セクション見出しはこのエントリ自身のデータなのでそのまま反映する。
  // ==========================================================================
  var NewsListPagePreview = makePagePreview(function (h, data) {
    var heading = data.heading || 'お知らせ';
    var listHeading = data.listHeading || 'お知らせ一覧';
    return [
      renderPagePreviewHeading(h, {
        key: 'head',
        eyebrow: 'NEWS',
        title: heading,
        lead: data.lead,
        crumbs: [{ label: 'トップ', href: '#' }, { label: heading }],
      }),
      h(
        'section',
        { key: 'list', className: 'py-14 px-5' },
        h(
          'div',
          { className: 'max-w-[900px] mx-auto' },
          listHeading && h('h2', { className: 'text-center font-bold mb-10', style: styleObj('font-size:clamp(20px,3vw,26px);') }, listHeading),
          h(
            'p',
            { className: 'text-center text-[13px] text-ink-faint' },
            '（カテゴリ絞り込み・記事一覧は「お知らせ」コレクションのデータを元に表示されるため、このプレビューでは省略しています）'
          )
        )
      ),
    ];
  });

  window.CMS.registerPreviewTemplate('newsPage', NewsListPagePreview);

  // ==========================================================================
  // お知らせ 記事詳細（src/pages/news/[slug].astro）
  // ==========================================================================
  var NEWS_CATEGORY_LABELS = { info: 'お知らせ', blog: 'ブログ', event: 'イベント', works: '実績紹介' };

  function formatNewsDateForPreview(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  var NewsPreview = makePagePreview(function (h, data, getAsset, widgetFor) {
    var category = data.category ? NEWS_CATEGORY_LABELS[data.category] || data.category : '';
    var dateText = formatNewsDateForPreview(data.publishedAt);
    var eyecatchUrl = assetUrl(getAsset, data.image);
    return h(
      'article',
      { className: 'py-12 px-5' },
      h(
        'div',
        { className: 'max-w-[760px] mx-auto' },
        h(
          'nav',
          { className: 'text-[12px] text-ink-faint mb-6 flex flex-wrap items-center gap-1.5' },
          h('a', { href: '#', className: 'hover:text-primary transition-colors' }, 'トップ'),
          h('span', {}, '›'),
          h('a', { href: '#', className: 'hover:text-primary transition-colors' }, 'お知らせ'),
          h('span', {}, '›'),
          h('span', { className: 'text-ink-soft' }, data.title || '')
        ),
        (category || dateText) &&
          h(
            'div',
            { className: 'flex items-center gap-2 mb-3 text-[12px]' },
            category && h('span', { className: 'font-bold text-primary bg-primary-light px-[10px] py-1 rounded-full' }, category),
            dateText && h('time', { className: 'text-ink-faint' }, dateText)
          ),
        data.title && h('h1', { className: 'font-bold mb-6', style: styleObj('font-size:clamp(22px,3.4vw,32px);') }, data.title),
        eyecatchUrl &&
          h(
            'div',
            { className: 'rounded-2xl overflow-hidden border border-surface-border mb-8 md:max-w-[67%] md:mx-auto' },
            h('img', { src: eyecatchUrl, alt: data.imageAlt || data.title || '', className: 'w-full h-auto object-cover block' })
          ),
        h(
          'div',
          { className: 'prose-content text-[14px] leading-[1.9] text-secondary-light mb-12' },
          widgetFor ? widgetFor('body') : null
        ),
        h(
          'div',
          { className: 'text-center border-t border-surface-border pt-10' },
          renderPreviewButton(h, '一覧へ戻る', 'outline')
        )
      )
    );
  });

  window.CMS.registerPreviewTemplate('news', NewsPreview);
})();
