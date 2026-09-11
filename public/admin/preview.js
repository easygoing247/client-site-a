/* ============================================================================
 * public/admin/preview.js
 * Decap CMS の「サイト全体設定（siteInfo.yml）」「デザインテーマ設定
 * （site-settings.json）」「商品一覧（型化ページ／products）」に
 * 対するリアルタイムプレビューテンプレート。
 *
 * Astroコンポーネント（.astro）はビルド時にHTMLへ変換されるサーバー
 * サイド専用の仕組みのため、CMSの編集画面内でそのまま動かすことはできない。
 * そのため、本番の各コンポーネント（Hero/Features/Service/Flow/Works/
 * Plans/Access/Faq/Contact/Header/Footer、および商品詳細ページ
 * products/[slug].astro）のマークアップ・Tailwindクラスをこのファイル内で
 * React要素として再現し、フォームの入力値（entry）を直接バインドする
 * ことで、保存・ビルドを待たずに実際のサイトに近い見た目でリアルタイムに
 * プレビューする。
 *
 * スタイルは、実際にビルドされたサイトが読み込んでいるCSS（Tailwindの
 * コンパイル済みスタイルシート）をトップページのHTMLから動的に見つけ出し、
 * CMS.registerPreviewStyle() でそのままプレビューiframeに読み込ませる。
 * これにより、フォント・配色・コンポーネントの見た目は本番と完全に同一の
 * CSSファイルを使う（このファイル側で独自にスタイルを再定義しない）。
 * 同じトップページのHTMLから実際の<header>・<footer>（ロゴ・ナビ・
 * SNSアイコン等、siteInfo.yml側の最新公開データを反映したもの）もそのまま
 * 抜き出し、商品詳細ページのプレビューにも本物のヘッダー・フッターとして
 * 使い回す（productsコレクションのプレビューは別エントリのため、
 * siteInfo.yml側の"未保存の編集中の値"までは参照できない＝直近に公開
 * 済みの内容が表示される）。
 * トップページの「商品・プラン一覧」セクションのみ、ビルド時にしか
 * 取得できないデータのためプレビュー対象外（プレースホルダー表示）。
 * ============================================================================ */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  if (!h || !createClass || !window.CMS) return;

  // ==========================================================================
  // 0) 本番サイトが実際に読み込んでいるCSSと、現在のテーマカラーを取得する
  // ==========================================================================
  var currentTheme = 'blue';
  var publishedHeaderHtml = '';
  var publishedFooterHtml = '';
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

        // --- 商品／下層ページのプレビュー用に、公開済みのヘッダー・フッターを抜き出す ---
        // （innerHTML 挿入時に内部 <script> は実行されないため、ハンバーガー
        //   メニュー等の動的挙動はプレビュー上では動かないが見た目には影響しない）
        try {
          if (parsed) {
            var headerEl = parsed.querySelector('header');
            var footerEl = parsed.querySelector('footer');
            if (headerEl) publishedHeaderHtml = headerEl.outerHTML;
            if (footerEl) publishedFooterHtml = footerEl.outerHTML;
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
  // ヘッダー（簡易版：ロゴ＋PCナビのみ。ハンバーガーメニューの開閉は
  // プレビューの目的上不要なため省略）
  // ==========================================================================
  function renderHeader(h, data, getAsset) {
    var company = data.company || {};
    var nav = filterVisibleNavForPreview(data, data.nav);
    var navCta = data.navCta || {};
    var logoUrl = assetUrl(getAsset, company.logo);

    return h(
      'header',
      { className: 'sticky top-0 z-50 border-b border-surface-border bg-white/95 backdrop-blur-sm' },
      h(
        'div',
        { className: 'max-w-[1200px] mx-auto px-5 py-[14px] flex items-center justify-between gap-4' },
        logoUrl
          ? h('img', { src: logoUrl, alt: (company.name || '') + ' ロゴ', className: 'h-7 w-auto object-contain' })
          : h('div', { className: 'font-bold text-[18px] text-secondary' }, company.name || 'LOGO'),
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
  // ==========================================================================
  function renderServices(h, data, getAsset, muted) {
    var section = data.services || {};
    var items = section.items || [];
    return h(
      'section',
      { id: 'services', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5' },
          items.map(function (item, i) {
            var imageUrl = assetUrl(getAsset, item.image);
            return h(
              'article',
              { key: i, className: 'flex flex-col aspect-square md:aspect-auto border border-surface-border rounded-card overflow-hidden bg-white' },
              imageUrl &&
                h('img', {
                  src: imageUrl,
                  alt: item.title ? item.title + 'のイメージ' : '',
                  className: 'w-full flex-none aspect-video md:aspect-auto md:h-[150px] object-cover block',
                }),
              h(
                'div',
                { className: 'flex-1 px-[18px] py-4 md:py-7' },
                item.title && h('h3', { className: 'font-bold text-[15px] mb-2' }, item.title),
                item.text && h('p', { className: 'text-[13px] leading-[1.7] text-ink-soft m-0 whitespace-pre-line' }, item.text)
              )
            );
          })
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
  // 実際の記事はビルド時取得のため、プレビューでは案内のみ表示する。
  // ==========================================================================
  function renderNewsSectionPreview(h, data) {
    var section = data.newsSection || {};
    var count = Number(section.count) > 0 ? Math.floor(Number(section.count)) : 3;
    return h(
      'section',
      { id: 'news', className: 'py-16 px-5' },
      h(
        'div',
        { className: 'max-w-[820px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'p',
          { className: 'text-center text-[13px] text-ink-faint' },
          '（トップページには最新のお知らせ ' + count + ' 件がリスト表示されます。実際の記事はビルド時に取得されるため、このプレビューでは省略しています）'
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
            acc.push(
              h(
                'div',
                {
                  key: 'step-' + i,
                  className: cx(
                    'flex-1 rounded-2xl border-2 p-6 flex flex-col items-center text-center',
                    isLast ? 'border-primary bg-gradient-to-br from-primary to-primary-dark' : 'border-surface-border bg-white'
                  ),
                },
                step.number != null &&
                  h('div', { className: cx('text-[26px] font-bold mb-2 leading-none', isLast ? 'text-white' : 'text-primary') }, String(step.number)),
                step.title && h('h3', { className: cx('text-[14px] font-bold mb-1.5', isLast && 'text-white') }, step.title),
                step.text &&
                  h(
                    'p',
                    { className: cx('text-[12px] leading-[1.7] m-0 whitespace-pre-line', isLast ? 'text-white/85' : 'text-ink-soft') },
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
  // 実績・活用事例
  // ==========================================================================
  function renderWorks(h, data, getAsset, muted) {
    var section = data.works || {};
    var items = section.items || [];
    return h(
      'section',
      { id: 'works', className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 sm:grid-cols-3 gap-6' },
          items.map(function (item, i) {
            var imageUrl = assetUrl(getAsset, item.image);
            return h(
              'article',
              { key: i, className: 'flex flex-col aspect-square md:aspect-auto bg-white rounded-card overflow-hidden border border-surface-border' },
              imageUrl &&
                h('img', {
                  src: imageUrl,
                  alt: item.title ? item.title + 'の実績イメージ' : '',
                  className: 'w-full flex-none aspect-video md:aspect-auto md:h-[170px] object-cover block',
                }),
              h(
                'div',
                { className: 'flex-1 px-4 py-4 md:py-6' },
                item.title && h('h3', { className: 'font-bold text-[15px] mb-1' }, item.title),
                item.industry &&
                  h('p', { className: 'text-[12px] text-ink-soft mb-[10px]', style: { whiteSpace: 'pre-wrap' } }, item.industry),
                item.tag &&
                  h('span', { className: 'inline-block text-[11px] font-bold text-primary bg-primary-light px-[10px] py-1 rounded-full' }, item.tag)
              )
            );
          })
        )
      )
    );
  }

  // ==========================================================================
  // 商品・プラン一覧（型化ページ）— Content Collectionsのデータはビルド時
  // にしか取得できないため、プレビューでは案内のみ表示する。
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
        h(
          'p',
          { className: 'text-center text-[13px] text-ink-faint' },
          '（商品一覧は、別途登録された型化ページのデータを元に表示されるため、このプレビューでは省略しています）'
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
          'div',
          { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch' },
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
                      h('span', { className: 'text-primary flex-none' }, '✓'),
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
    var snsLinks = orderedSnsForPreview(data);

    return h(
      'footer',
      { className: 'bg-primary-dark text-white pt-12 px-5 pb-10 text-[12px]' },
      h(
        'div',
        { className: 'max-w-[900px] mx-auto flex flex-col md:flex-row md:justify-between gap-9 mb-9' },
        h(
          'div',
          { className: 'text-center md:text-left' },
          logoUrl
            ? h('img', { src: logoUrl, alt: (company.name || '') + ' ロゴ', className: 'h-6 w-auto object-contain mb-4 mx-auto md:mx-0 block' })
            : h('div', { className: 'font-bold text-white mb-4' }, company.name || 'LOGO'),
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
        return renderWorks(h, data, getAsset, muted);
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
      return { stylesLoaded: false };
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
    render: function () {
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var data = getData(entry);
      var visibleSections = computeVisibleSections(data);

      return h(
        'div',
        { 'data-theme': currentTheme, className: 'font-sans bg-surface text-ink' },
        renderHeader(h, data, getAsset),
        h(
          'main',
          {},
          renderHero(h, data, getAsset),
          data.features && data.features.enableNews && renderNewsSectionPreview(h, data),
          visibleSections.map(function (s) {
            return h('div', { key: s.id }, renderSection(h, s.id, data, getAsset, s.muted));
          })
        ),
        renderFooter(h, data, getAsset)
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
    render: function () {
      var data = getData(this.props.entry);
      var theme = data.theme || 'blue';
      return h(
        'div',
        { 'data-theme': theme, className: 'font-sans bg-surface p-8' },
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
        )
      );
    },
  });

  window.CMS.registerPreviewTemplate('siteSettings', SiteSettingsPreview);

  // ==========================================================================
  // 「商品一覧（型化ページ）」プレビュー本体
  // src/pages/products/[slug].astro の構造をそのまま再現する。
  // パンくずリストの「トップ」表示名・「仕様・含まれる内容」見出し・
  // 相談CTAボタン文言は siteInfo.yml 側の productPage フィールドの値だが、
  // productsコレクションのプレビューからは別エントリであるsiteInfo.yml
  // の“編集中の値”を参照する手段がないため、現時点でのデフォルト文言を
  // 固定値としてここに用意している（siteInfo.yml側でこれらの文言自体を
  // 変更した場合、このプレビュー表示だけは追従しない）。
  // ==========================================================================
  var PRODUCT_PAGE_DEFAULTS = {
    breadcrumbHome: 'トップ',
    specsHeading: '仕様・含まれる内容',
    ctaLabel: 'このプランで相談する',
  };

  var ProductPreview = createClass({
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
      var entry = this.props.entry;
      var getAsset = this.props.getAsset;
      var widgetFor = this.props.widgetFor;
      var data = getData(entry);
      var imageUrl = assetUrl(getAsset, data.mainImage);
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
                  { className: 'rounded-2xl overflow-hidden border border-surface-border mb-8' },
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
        publishedFooterHtml && h('div', htmlProp(publishedFooterHtml))
      );
    },
  });

  window.CMS.registerPreviewTemplate('products', ProductPreview);

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
      publishedFooterHtml && h('div', htmlProp(publishedFooterHtml))
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
                  item.title && h('h3', { className: 'text-[19px] font-bold mb-3' }, item.title),
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
                return h(
                  'div',
                  { key: i, className: cx('px-5 py-4', i > 0 && 'border-t border-surface-border') },
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
                          h('span', { className: 'text-primary flex-none' }, '✓'),
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
    var eyecatchUrl = assetUrl(getAsset, data.eyecatch);
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
            { className: 'rounded-2xl overflow-hidden border border-surface-border mb-8' },
            h('img', { src: eyecatchUrl, alt: data.eyecatchAlt || data.title || '', className: 'w-full h-auto object-cover block' })
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
