/* ============================================================================
 * public/admin/preview.js
 * Decap CMS の「サイト全体設定（siteInfo.yml）」「デザインテーマ設定
 * （site-settings.json）」に対するリアルタイムプレビューテンプレート。
 *
 * Astroコンポーネント（.astro）はビルド時にHTMLへ変換されるサーバー
 * サイド専用の仕組みのため、CMSの編集画面内でそのまま動かすことはできない。
 * そのため、本番の各コンポーネント（Hero/Features/Service/Flow/Works/
 * Plans/Access/Faq/Contact/Header/Footer）のマークアップ・Tailwind
 * クラスをこのファイル内でReact要素として再現し、フォームの入力値
 * （entry）を直接バインドすることで、保存・ビルドを待たずに実際のサイトに
 * 近い見た目でリアルタイムにプレビューする。
 *
 * スタイルは、実際にビルドされたサイトが読み込んでいるCSS（Tailwindの
 * コンパイル済みスタイルシート）をトップページのHTMLから動的に見つけ出し、
 * CMS.registerPreviewStyle() でそのままプレビューiframeに読み込ませる。
 * これにより、フォント・配色・コンポーネントの見た目は本番と完全に同一の
 * CSSファイルを使う（このファイル側で独自にスタイルを再定義しない）。
 * 商品・施工事例（Content Collections）一覧セクションのみ、ビルド時に
 * しか取得できないデータのためプレビュー対象外（プレースホルダー表示）。
 * ============================================================================ */
(function () {
  var h = window.h;
  var createClass = window.createClass;
  if (!h || !createClass || !window.CMS) return;

  // ==========================================================================
  // 0) 本番サイトが実際に読み込んでいるCSSと、現在のテーマカラーを取得する
  // ==========================================================================
  var currentTheme = 'blue';
  function loadSiteStylesheetAndTheme() {
    return fetch('/')
      .then(function (res) {
        return res.text();
      })
      .then(function (html) {
        var themeMatch = html.match(/<html[^>]*\sdata-theme="([^"]+)"/i);
        if (themeMatch) currentTheme = themeMatch[1];
        // Astroの本番ビルドは <link rel="stylesheet" href="/_astro/xxxx.css">
        // を出力する（開発サーバーではCSSがJS経由で注入されるためこの
        // <link>タグ自体が存在せず、その場合はスタイル無しでプレビュー
        // される＝`npm run build && npm run preview` での確認を推奨）。
        var cssMatches = html.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/gi) || [];
        cssMatches.forEach(function (tag) {
          var hrefMatch = tag.match(/href="([^"]+)"/i);
          if (hrefMatch && hrefMatch[1]) {
            window.CMS.registerPreviewStyle(hrefMatch[1]);
          }
        });
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
    var nav = (data.nav || []).filter(function (n) {
      return n && n.label && n.href;
    });
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
      { className: cx('py-16 px-5', muted && 'bg-surface-muted') },
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
      { className: cx('py-16 px-5', muted && 'bg-surface-muted') },
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
      { className: cx('py-16', muted && 'bg-surface-muted') },
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
      { className: cx('py-16 px-5', muted && 'bg-surface-muted') },
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
                item.industry && h('p', { className: 'text-[12px] text-ink-soft mb-[10px]' }, item.industry),
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
      { className: cx('py-16 px-5', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-[1100px] mx-auto' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'p',
          { className: 'text-center text-[13px] text-ink-faint' },
          '（商品・施工事例の一覧は、別途登録された型化ページのデータを元に表示されるため、このプレビューでは省略しています）'
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
      { className: cx('py-16', muted && 'bg-surface-muted') },
      h(
        'div',
        { className: 'max-w-xl sm:max-w-2xl lg:max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-5' },
        renderSectionHeading(h, section.eyebrow, section.heading),
        h(
          'div',
          { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6 items-start' },
          items.map(function (plan, i) {
            return h(
              'div',
              {
                key: i,
                className: cx(
                  'relative rounded-2xl p-7 bg-white flex flex-col items-center text-center',
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
  var SNS_ORDER_DEFAULT = ['line', 'instagram', 'x', 'facebook'];
  var SNS_URL_FIELD = { line: 'lineUrl', instagram: 'instagramUrl', x: 'xUrl', facebook: 'facebookUrl' };
  var SNS_STYLE = {
    line: { className: 'bg-accent' },
    instagram: { style: styleObj('background:linear-gradient(45deg,#f58529,#dd2a7b 50%,#515bd4);') },
    x: { className: 'bg-secondary' },
    facebook: { className: 'bg-[#1877f2]' },
  };

  function orderedSnsForPreview(data) {
    var contact = data.contact || {};
    var configured = (contact.snsOrder || []).map(function (o) {
      return o.id;
    });
    var ids = configured.concat(SNS_ORDER_DEFAULT).filter(function (id, i, arr) {
      return SNS_ORDER_DEFAULT.indexOf(id) !== -1 && arr.indexOf(id) === i;
    });
    return ids
      .map(function (id) {
        return { id: id, href: contact[SNS_URL_FIELD[id]] };
      })
      .filter(function (sns) {
        return sns.href;
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
      { className: cx('py-16', muted && 'bg-surface-muted') },
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
      { className: cx('py-16', muted && 'bg-surface-muted') },
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
  // お問い合わせ
  // ==========================================================================
  function renderContact(h, data, muted) {
    var section = data.contactSection || {};
    var form = section.form || {};
    var ui = data.ui || {};
    return h(
      'section',
      { className: cx('py-16', muted && 'bg-surface-muted') },
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
            h(
              'div',
              { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              h('input', { type: 'text', readOnly: true, placeholder: form.namePlaceholder, className: 'px-4 py-[14px] border border-[#dbdfe8] rounded-lg text-[14px]' }),
              h('input', { type: 'text', readOnly: true, placeholder: form.companyPlaceholder, className: 'px-4 py-[14px] border border-[#dbdfe8] rounded-lg text-[14px]' })
            ),
            h('input', { type: 'email', readOnly: true, placeholder: form.emailPlaceholder, className: 'px-4 py-[14px] border border-[#dbdfe8] rounded-lg text-[14px]' }),
            h('textarea', { readOnly: true, placeholder: form.messagePlaceholder, rows: 4, className: 'px-4 py-[14px] border border-[#dbdfe8] rounded-lg text-[14px]' }),
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
    var footerNav = (data.footerNav || []).filter(function (n) {
      return n && n.label && n.href;
    });
    var logoUrl = assetUrl(getAsset, company.logo);
    var snsLinks = orderedSnsForPreview(data);

    return h(
      'footer',
      { className: 'bg-secondary-dark text-[#c7cede] pt-12 px-5 pb-10 text-[12px]' },
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
                return h('span', { key: i, className: 'w-9 h-9 rounded-full bg-white/10 flex items-center justify-center' });
              })
            )
        ),
        h(
          'nav',
          { className: 'grid grid-cols-2 gap-x-12 gap-y-3 text-center md:text-left justify-center md:justify-start' },
          footerNav.map(function (item, i) {
            return h('a', { key: i, href: item.href, className: 'text-[#c7cede]' }, item.label);
          })
        )
      ),
      data.copyright &&
        h('div', { className: 'text-center border-t border-white/10 pt-6' }, h('div', { className: 'mt-2' }, data.copyright))
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
        h('main', {}, renderHero(h, data, getAsset), visibleSections.map(function (s) {
          return h('div', { key: s.id }, renderSection(h, s.id, data, getAsset, s.muted));
        })),
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
})();
