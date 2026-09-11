# PROGRESS.md

このファイルは、本リポジトリ（`master-template-multi`／複数ページ版）に対して
これまで行われた実装内容・現在のステータス・未解決の課題をまとめた進捗記録です。
プロジェクトの構造・ルールそのものは `CLAUDE.md` を参照してください。

最終更新: 2026-09-10

## 0. デプロイ・運用情報

| 項目 | 値 |
|---|---|
| GitHub リポジトリ | `easygoing247/master-template-multi` |
| デプロイ先 | Cloudflare Workers（Workers Builds。静的アセット配信、`wrangler.json` の `assets.directory: ./dist`） |
| 本番ドメイン | `master-template-multi.easygoing247.workers.dev` |
| Decap CMS backend | GitHub直接連携（OAuth）。仲介プロキシは自前のCloudflare Worker（`cms-oauth-worker/`、`base_url: https://master-template-oauth.easygoing247.workers.dev`。※複製先専用プロキシへの差し替えは未対応。CLAUDE.md 9.2 参照） |
| デプロイコマンド | Git 連携で `main` への push 毎に自動ビルド／手動時は `npm run build` → `npx wrangler deploy` |
| 派生元 | 1ページLP版 `easygoing247/master-template`（Cloudflare Pages `master-template-c2u.pages.dev`） |

日常の運用フロー：クライアントがDecap CMS（`/admin`）で直接コンテンツを編集・保存すると
GitHubの `main` に直接コミットされる（`Update サイト設定 "siteInfo"` 等のコミットが
これにあたる）ため、開発側で新たな変更をpushする際は必ず `git fetch` → 差分確認 →
（コンフリクトしなければ）`git pull`／マージ → コミット・pushの順で進める運用を徹底している。

## 1. 実装済み機能・完了した改修（時系列サマリ）

### 1.1 サイト基盤（初期テンプレート）
- Astro + Tailwind構成。`src/data/siteInfo.yml` を唯一のデータソースとし、
  `src/lib/site.ts` 経由で全コンポーネントに型付きで供給。
- 型化ページ（`src/content/products/*.md`）と機能フラグ（`enableProducts` 等）による
  梅／竹／松プラン切り替えの仕組み。
- Decap CMSをGit Gateway（Netlify Identity）からGitHub直接連携（OAuth）へ切り替え、
  自前のCloudflare Worker OAuthプロキシ（`cms-oauth-worker/`）を追加。

### 1.2 Decap CMS 管理画面UI改善
- CMS選択式テーマカラー（blue/red/green/purple/orange）プリセットを追加
  （`site-settings.json` 経由）。
- モバイル管理画面でのピンチズーム無効化、タッチスクロール調整。
- 見出し追従（`GROUP_LABELS`）付きのクイックナビゲーション（フローティングボタン）を追加。
- 必須／任意ラベルの自動書き換え（`markRequiredFieldLabels` / `stripOptionalSuffix`）。
- react-select系ドロップダウンの位置ズレ（fixed-positioning）修正。
- フォーム/プレビュー間のリサイザー（split-pane）をドラッグした際のスクロールロック不具合を修正。

### 1.3 Decap CMS ライブプレビュー
- `CMS.registerPreviewTemplate` を用いた、実際のAstroコンポーネントに準拠した
  ライブプレビュー（`public/admin/preview.js`）を「サイト設定」「商品一覧」の
  両コレクションに実装（Decapの既定プレビューはCMSのデフォルトMarkdownレンダリングの
  ままだったため、実際の見た目に近づけるために独自実装）。
- プレビュー表示切り替え・スクロール同期の丸ボタン（`ViewControls`）を、
  プレビュー画面上への重なり配置からヘッダー内（旧「プレビューのチェック」ボタン跡地、
  ツールバー区切り線の左）へ再配置。
- 使われていなかった「プレビューのチェック」ボタンを削除。
- スクロール同期機能をゼロから再実装（Decap既定のスクロール同期はカスタムプレビュー
  テンプレートと非互換のため）。
  - 初期実装：パーセンテージ基準の同期 → セクション要素（`id`属性）基準の
    scrollspy方式（`findActiveSectionKey()`）に切り替え、精度を向上。
  - ON/OFFトグルの見た目反転バグを2回にわたり修正。最終的にアイコンの色を
    Decap自身の内部状態から完全に切り離し、自前の `scrollSyncEnabled` フラグのみで
    直接 `fill` を制御する方式に統一（`applyScrollSyncIcon()`）。
  - 入力欄をフォーカス・クリックした際にプレビューがセクション見出し位置まで
    強制的に巻き戻ってしまう不具合を修正。原因だった `focusin` 契機の再同期を廃止し、
    `scroll` イベント側に80pxの移動量閾値（`SCROLL_SYNC_THRESHOLD`）を追加。
    文字入力・カーソル移動では同期が発火せず、大きなスクロール操作時のみ
    セクション追従する仕様に整理。

### 1.4 スクロール・レイアウト精度
- ページ内アンカースクロール（`#services` 等）を、CSSの `scroll-margin-top` 依存から
  クリック時にヘッダー実測高さを計算するJS方式（`SmoothScroll.astro`）に一本化。
- モバイル／タブレットのレイアウト調整（カード比率、SNSボタンサイズ統一など）。

### 1.5 コンテンツ・データモデルの改善
- SNS設定を「連絡先」から独立させ、siteInfo.yml トップレベルの `sns` リスト
  （`{id, url, enabled}`／CMS「SNS設定」）に一元化（`src/lib/sns.ts`）。YouTube を追加。
  表示順序・非表示条件を Access・Footer・会社概要ページ「公式SNS」行・スマホ下部
  LINEボタンの全箇所で完全連動。
- /about のアクセス情報を固定3項目から可変リスト（`access.items[]`＝ラベル/内容/
  表示可否、ドラッグ並び替え・追加削除可）へ変更。
- 店舗情報を独立セクションから「店舗概要・アクセス」セクションへ統合。
- 実績・活用事例「業種」フィールドを単一行（`widget: string`）から複数行対応
  （`widget: text`）に変更し、ラベルを「本文（Enterキーで改行可）」に変更。
  実サイト・CMSプレビュー双方に `white-space: pre-wrap` を適用し、改行がそのまま
  反映されるように修正。

### 1.6 ヘッダー・フッターのナビゲーション連動
- 実サイト側（`src/lib/site.ts` の `visibleNavItems()`）で、ヘッダー・フッターの
  ナビゲーション項目を対応するセクションの機能フラグ（`features.enableFaq` 等）と
  連動させ、非表示セクションへのリンクを自動的に除外する仕組みを整備済み。
- Decap CMSのライブプレビュー（`preview.js`）側は同様の連動が未実装だったため、
  実サイトと同じ `href → フラグ` 対応表（`NAV_HREF_TO_FLAG`）を追加し、
  `renderHeader` / `renderFooter` に適用。管理画面でセクション表示トグルを
  切り替えると、プレビューのヘッダー・フッターからも該当リンクが即座に
  出し分けされることを確認済み。

### 1.7 複数ページ版（master-template-multi）としての拡張（2026-09 バッチ）

LP版から複製後に実施した、複数ページ構成・下層ページ・CMS拡張の主な改修。
詳細な実装ルールは `CLAUDE.md` セクション 9（特に 9.3〜9.8）を参照。

- **下層ページの新設**：`/services`・`/about`・`/contact`・`/news`（一覧＋`[slug]`）を
  追加。データは `src/data/{services,about,contactPage}.yml`＋`src/content/news/*.md`、
  パーサは `src/lib/pages.ts` / `src/lib/news.ts`。共通の見出し＋パンくずは
  `PageHeader.astro`、CTA は `Button.astro`。
- **お問い合わせフォーム（Web3Forms）**：
  - 送信処理を `src/scripts/contactForm.ts` に集約（`Contact.astro` と
    `contact.astro` の 2 フォーム共通）。Fetch API で `api.web3forms.com/submit` へ POST。
  - 送信設定（`web3forms_access_key` / `contact_email_subject`＝`subject` /
    `contact_email_from_name`＝`from_name`）を独立ファイル `src/data/contact-form.json`
    に分離（パーサ `src/lib/contactFormSettings.ts`）。CMS は「サイト設定」コレクション
    3 つ目の file 項目「お問い合わせフォーム設定」で編集。
  - 入力欄（お名前／会社名／メールアドレス／電話番号／お問い合わせ内容）を
    `contactPage.yml` の `formFields.<key>` で 表示・ラベル・プレースホルダー・必須 を
    動的制御（`resolveContactFormFields()`）。ラベル横に「必須／任意」バッジ。
  - カスタム追加項目（`custom_fields[]`）を CMS の list で自由に追加・削除・並べ替え。
    表示位置は「電話番号」の直後・「お問い合わせ内容」の直前で固定
    （`ContactFields.astro` の `beforeCustom` → `custom` → `messageField`）。
  - 送信中は送信ボタンを `disabled`＋ラベルを「送信中…」に。送信成功時は
    `<form>` を `hidden` 属性＋`style.display='none'` の両方で確実に非表示にし、
    `mt-8`（2rem）の上部余白を付けた `#contact-success` のみをフェードイン表示
    （`.flex` が UA の `[hidden]` に勝つため「送信ボタンだけ『送信中…』が残る」不具合を解消）。
- **SNS設定の独立化**：SNS URL を「連絡先」から切り出し、`siteInfo.yml` トップレベルの
  `sns` リスト（`{id, url, enabled}`／CMS「SNS設定」）に一元化。YouTube を追加。
  `src/lib/sns.ts` の `orderedSnsLinks()` / `snsUrl()` 経由で Access・Footer・
  `/about` の「公式SNS」行（共有 `SnsIcons.astro`）・スマホ下部 LINE ボタンが完全連動。
- **Decap CMS 構造・ラベル**：
  - 「サイト設定」コレクション＝ 1. サイト全体設定 → 2. デザインテーマ設定 →
    3. お問い合わせフォーム設定 の 3 file 項目。
  - 「下層ページ」の各 file（services / about / contact）に `summary: "{{fields.heading}}"`
    を付与し、管理画面に「ページ見出し」の値を動的表示。ラベルも統一。
  - 表記統一：「商品・施工事例」→「商品一覧」、「お知らせ・ブログ」→「お知らせ」
    （実サイトの見出し・パンくず、`preview.js`、コメントまで一括置換）。
- **ライブプレビュー拡張**：全コレクションでスクロール追従（サイト設定はセクション
  `id` スナップ、その他は進捗率比例の 2 モード）。`/about` の背景ゼブラは
  毎レンダー “表示中セクションのみ” で index を振り直し、トグル切替へ即追従。
- **トップページ**：ヒーロー直下に「お知らせ」セクション（`News.astro`。`sectionOrder`
  対象外の固定配置。CMS「セクションの表示・非表示」でも先頭項目）。
  「サービス内容を見る ›」リンク、料金プラン各カードの「詳しく見る ›」ボタン
  （人気プランはテーマカラー連動で強調）。
- **`/about`（会社概要）**：代表挨拶／会社概要（末尾に「公式SNS」行）／アクセス
  （`access.items[]`＝郵便番号・住所・最寄り駅・駐車場を可変リスト化。追加削除・並べ替え可）の
  3 セクションを個別 enabled 制御＋表示状況に応じた白／グレーの自動交互配色。
  会社概要テーブルの `dt` はスマホでニュートラルグレーの帯（`bg-surface-band`＝`#e5e7eb`）。
- **`/news`（お知らせ一覧）**：カテゴリ絞り込みタブ＋カード／リスト表示切替（クライアント JS）。
- **`/services`（サービス内容・料金）**：
  - サービス詳細の左右配置反転トグル（`reverseLayout` boolean → `md:order-2`。
    自動交互配置は廃止）。
  - 料金表各行に「含まれる内容／特徴」チェックリスト（`priceTable[].features`）。
  - 料金表の項目名左にテーマカラー連動の強調バッジ（`showBadge` boolean＋
    `badgeText` string）。両フィールドに `required: false`、boolean に `default: false` を
    明示し、Decap の保存バリデーションエラーを解消。
  - ページ最下部の問い合わせ CTA セクションを削除。
- **スマホ表示の改善**：
  - スマホ下部固定バーの「LINEで相談」ボタンを LINE 公式グリーン（`accent`＝`#06c755`）に
    戻しつつ、`text-white`＋`font-bold`＋`tracking-wide`＋`text-shadow`／アイコン
    `drop-shadow` で文字視認性を補強（WCAG 例外。CLAUDE.md 9.6）。
  - Decap 管理画面のスマホヘッダーが 1 文字ずつ折り返す崩れを修正（`@media (max-width:799px)`
    で不要リンクを非表示、戻るリンクを拡張、コレクション名を省略表示）。

## 2. 完了済みタスク（複数ページ版 master-template-multi）

直近バッチで完了し、`main` に push 済みのタスク一覧（詳細は 1.7 と `CLAUDE.md` 9 章）。

- [x] Web3Forms 送信完了 UI の改善（送信中ボタン停止の解消・成功メッセージの余白調整）
- [x] 「お問い合わせフォーム設定」および「SNS設定」の Decap CMS 独立化
- [x] お問い合わせフォームの入力項目動的カスタマイズ（プレースホルダー・必須切り替え・カスタム項目挿入）
- [x] Decap CMS プレビュー機能の改善（スクロール追従の全展開、表示崩れ修正、`/about` 動的背景色同期）
- [x] トップページ「お知らせ」セクション新設およびセクション表示制御の先頭配置
- [x] `/about` ページの各セクション（代表挨拶・会社概要・アクセス）個別表示制御および動的ゼブラパターン背景色適用
- [x] `/about` ページへの「公式SNS」および詳細アクセス情報（郵便番号・住所・最寄り駅・駐車場）の追加
- [x] スマホ表示の改善（LINE ボタンの公式グリーン復元＆文字視認性向上、CMS スマホヘッダー表示崩れ修正、会社概要テーブルの余白・落ち着いたトーンの背景色化）
- [x] お知らせ一覧ページの機能拡張（カテゴリ絞り込み・カード／リスト表示形式切り替え）
- [x] プロジェクト全体の表記統一（「商品一覧」「お知らせ」への変更）
- [x] `/services` ページの機能拡張（左右反転、料金表チェックリスト、項目名強調バッジ、最下部ボタン削除）
- [x] Decap CMS「下層ページ」でのページ見出し動的反映（`summary: "{{fields.heading}}"`）
- [x] 料金表バッジの Decap CMS 保存バリデーションエラー修正（`required: false` / `default: false` の明示）
- [x] Content Collection の型エラー修正（`products/sample.md` の `price: ""` を数値化）＋再発防止（`src/content/config.ts` に空文字・カンマ入り文字列を吸収する `z.preprocess` ヘルパーを導入し、`products` / `news` の数値・日付フィールドへ適用）
- [x] 全ページ Sticky Footer 化（`/news` 絞り込み時のフッター下の白い余白を解消）
- [x] 画像フォーカルポイント（`object-position`）機能：一度実装後、方針変更により全面削除し CSS 既定（中央切り抜き）へ復帰
- [x] SNS設定への TikTok 追加、`/services` セクション見出しの CMS 編集対応、フッターのテーマカラー連動＋コントラスト確保、トップページ「サービス内容」データの `/services` との単一データソース化
- [x] 「商品」機能を「実績・活用事例」（型化ページ `works`／`/works/[slug]`）へ改名し、新たに単一ファイル可変リストの「商品作成」カタログ（`src/data/products.yml`）と `/products` ページ（横長「新商品」＋縦型「通年商品」、画像クリックでライトボックス拡大表示）・トップページ「商品一覧」セクションを新設
- [x] 「お知らせ」記事のURLスラッグから日本語を排除：CMSに「URL用識別子（半角英数字、`urlSlug`）」フィールドを追加し `slug: "{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}"` で組み立て（空欄時は `preSave` イベントで自動採番）、既存の日本語ファイル名4件を英語スラッグへリネーム
- [x] 「公開して新規作成／公開して複製する」実行後にフォームが遷移しない不具合を調査・修正：`works` コレクションにも同じ `urlSlug` 方式を導入（日本語タイトル由来のスラッグ計算不良が原因の一つと判断）、`preview.js` の `preSave` ハンドラをコレクション名ハードコードから `data.has('urlSlug')` 判定に一般化（Decap既知の落とし穴＝`undefined` を返すと `identifier_field` 欠落扱いになり画面遷移まで壊れる、decaporg/decap-cms#6775 を踏まえ防御的に修正）、Decap CMS のCDNスクリプトを不安定な `^3.0.0` 範囲指定から明示的な固定バージョン `3.16.2`（スラッグ特殊文字対応等を含む現行安定版）へ変更
- [x] 上記でも「公開して新規作成」だけがフォームをリセットしない不具合が残ったため、`local_backend`（`decap-server`）を使った実機検証で原因を特定：既存エントリの編集画面から実行した場合にDecapが`/new`へのルート遷移自体を行わないことを確認（「公開して複製する」は正しく遷移・プリセットされる）。`public/admin/index.html`にメニュー項目クリック検知＋`postSave`イベントを組み合わせ、保存完了を検知した時点で該当コレクションの`/new`へ強制的に`location.hash`設定＋`location.reload()`する補正を追加。加えて、同ファイル内でDecap本体が描画するViewControls（プレビュー切替・スクロール同期ボタン）を`appendChild`で物理的に別要素へ再親付けしていた既存実装が、Reactのアンマウント時に`NotFoundError: removeChild`を誘発しうる危険な実装だったため、DOM構造を変更しないCSSの`position:fixed`ベースの見た目上の再配置に置き換え（副次的な安全性強化）
- [x] 7点の機能追加・改善バッチ：①ヘッダー・フッターのテキストロゴフォールバック（`company.textLogo`/`useTextLogo`）、②「制作の流れ」の強調ステップをCMSトグル化（`flow.steps[].highlight`、複数ON可）、③「商品作成」のラベル変更（「目立たせたい商品」→「上段掲載商品」等）、④実績・活用事例カードの料金表示＋PC最大3列・スマホ1枚のスライダー化（Swiper不使用・CSS scroll-snapのネイティブ実装）、⑤実績・活用事例の表示順を`widget: list`＋`relation`によるドラッグ&ドロップ対応に変更（folderコレクション自体は並び替え非対応のため、siteInfo側に順序リストを独立保持する方式）、⑥`/products`ページの列数注釈テキスト削除、⑦`/services`サービス詳細への単一フィールド`badgeText`バッジ追加（テーマカラー連動）
- [x] Decap CMS管理画面クイックナビ（左下メニューアイコン）のスムーズスクロール不具合を修正：`findScrollContainer()`の判定候補にPC幅（800px以上）で実際にスクロールする`[class*="ControlPaneContainer"]`が含まれておらず、代わりに先頭候補の`[class*="EditorContainer"]`（PC幅では`overflow-y: hidden`だが見せかけの数十px程度のオーバーフローを持つ）が誤って選ばれ`scrollTop`を書き換えても画面が一切動かなかった問題。候補の先頭に`ControlPaneContainer`を追加し、各候補について`overflow-y: visible`な要素（スマホ幅の`ControlPaneContainer`はドロップダウン用に`visible`へ上書きされているため対象外）をスキップするチェックを追加して修正。PC幅・スマホ幅の両方で`local_backend`実機検証済み（→ CLAUDE.md 9.10）
- [x] トップページ「サービス内容」「商品一覧」のスマホ幅（640px未満）スライダー化：`Service.astro` / `Products.astro`共通で`global.css`の`.card-slider-mobile`（`grid-auto-flow:column`＋`grid-auto-columns:100%`でスマホは1枚送り、sm以上は`grid-auto-flow:row`に戻し従来の`sm:grid-cols-2 lg:grid-cols-4`グリッドを維持）と共通スクリプト`src/scripts/cardSlider.ts`（`data-slider-track`要素を一括初期化、矢印クリック・スクロール実測で表示/無効切り替え）を追加。実装中に「Tailwindの`grid-cols-1`（明示的な1frトラック）と`grid-auto-columns:100%`（暗黙トラック）を同じ行に混在させると先頭カードだけ幅がほぼ0に潰れる」というGridのトラックサイジング特有の不具合を実機検証で発見・回避（マークアップから`grid-cols-1`を削除）。ローカル環境でモバイル幅・PC幅の両方をDOM実測で検証済み（→ CLAUDE.md 9.11）
- [x] 「サイト全体設定 ＞ 連絡先」（`site.contact`の`phone`/`phoneHref`/`email`/`phoneLabel`/`lineLabel`/`showPhoneButton`/`showLineButton`）の参照箇所を全数調査：`StickyContactBar.astro`（全ページ共通スマホ下部バー）・`Access.astro`（トップページ「アクセス」の電話番号行）・`privacy.astro`（プライバシーポリシーの連絡先行）・`llms.txt.ts`（`/llms.txt`の会社情報。CLAUDE.md未記載の既存ファイルと判明）の4箇所のみで全数。住所・営業時間等は「連絡先」ではなく別オブジェクト`site.access.store`が管轄しており混同されていないことも確認（→ CLAUDE.md 9.12）
- [x] Decap CMS「サイト全体設定 ＞ 連絡先」に混在していた4項目（「お電話」「LINEで相談」の各ボタン文言・表示トグル）を、新設セクション「画面下部固定バー」（`siteInfo.yml`の`stickyContactBar:`、`config.yml`の`name: "stickyContactBar"`、「フッターナビゲーション」と「共通アイコン」の間に配置）へ分離。「連絡先」には電話番号・メールアドレスそのもの（`phone`/`phoneHref`/`email`）のみ残す。`src/lib/site.ts`の型定義・`StickyContactBar.astro`のデータ参照先を追従修正し、`grep`で旧参照が残っていないことを確認。`preview.js`はこの4項目を元々参照していなかったため追従修正不要（→ CLAUDE.md 9.13）
- [x] トップページ「料金プラン」のスマホ幅（640px未満）スライダー化：`Plans.astro`に「サービス内容」「商品一覧」と共通の`.card-slider-mobile`＋`src/scripts/cardSlider.ts`を適用（PC・タブレット幅は従来の`lg:grid-cols-3`グリッドを維持）。Plansは`data.plans.items`を使い実データのグリッドをそのまま描画する`preview.js`の`renderPlans`があるため、こちらもグリッドのclassNameを実サイトと一致させて追従（矢印UIのJS移植は不要と判断）。ローカル環境でモバイル幅・PC幅の両方をDOM実測で検証済み（→ CLAUDE.md 9.14）
- [x] Decap CMS管理画面編集フォーム最下部の余白確保：`[class*='ControlPaneContainer']`に`padding-bottom: 90px !important`を追加し、常時画面下部に重なるクイックナビ（`#cms-quick-nav-btn`）にフォーム最後の項目が隠れて操作不能になる不具合を修正。Decap本体（emotion）が同じクラスへ後から独自スタイルを注入し同詳細度では後勝ちしてしまうため`!important`が必須と実機検証で判明（→ CLAUDE.md 9.15）
- [x] `/products`ページ「下段掲載商品」カードの価格〜カード底辺間の不自然な余白を修正：スマホ幅で強制していた`aspect-square`とテキスト領域の`flex-1`を削除し、高さをコンテンツに応じた自然な値に（実測33px→17pxに縮小）。`preview.js`の`ProductsCatalogPreview`も追従（他のaspect-squareカードは複数列・スライダーで高さを揃える必要があるため対象外、と意図的にスコープを限定）（→ CLAUDE.md 9.15）
- [x] 「下層ページ ＞ サービス内容・料金」の料金表に強調表示（ハイライト）機能を追加：`priceTable[].highlight`（boolean）ONでトップページ「料金プラン」の人気プランと同じ青枠＋かげをその行だけに適用（既存の項目名バッジ`showBadge`/`badgeText`とは独立、併用可）。区切り線とハイライト枠の二重線を避ける判定を追加。`config.yml`・`src/lib/pages.ts`・`services.astro`・`preview.js`の`ServicesPagePreview`を一致させて実装、実機検証済み（→ CLAUDE.md 9.15）
- [x] 「サイト全体設定 ＞ 連絡先」に注釈（hint）を追加：入力内容の反映先（トップページ「アクセス」・プライバシーポリシー・`/llms.txt`）と、紛らわしい「画面下部固定バー」が別セクションであることを管理画面上に明示（→ CLAUDE.md 9.15）
- [x] トップページ「料金プラン」スマホ表示：人気プランの「人気No.1」バッジ見切れ修正：`.card-slider-mobile`の`overflow-x:auto`はCSS仕様上`overflow-y`も自動的に`auto`扱いになり、カード上端よりはみ出す配置のバッジ上半分がクリップされていた不具合。`Plans.astro`のスライダーtrackに`pt-6 sm:pt-0`を追加してクリップを回避し、矢印ボタンの`top`位置も`top-[calc(50%+12px)]`で再センタリング。実機検証でバッジがクリップされず表示されることを確認（→ CLAUDE.md 9.15）
- [x] 「お知らせ」ページ（`/news`）に見出し直下のリード文・記事一覧直前のセクション見出しを追加：新規データファイル`src/data/newsPage.yml`（`heading`/`lead`/`listHeading`）とCMS「下層ページ ＞ お知らせ一覧ページ」を新設（従来コンポーネントに直書きされていた見出しをCMS化）。プレビュー`NewsListPagePreview`も追加（→ CLAUDE.md 9.16）
- [x] 「お知らせ」ページの表示切替（カード／リスト）ボタンにSVGアイコンを追加、カテゴリ絞り込みに「カテゴリで絞り込む：」ラベルとアクティブボタンの発光風box-shadowハイライトを追加（→ CLAUDE.md 9.16）
- [x] 「実績・活用事例」「サービス内容」「商品一覧」「料金プラン」の全4スライダーにドットインジケーターを追加：共通スクリプト`src/scripts/cardSlider.ts`に`updateDots()`を実装し、スクロール位置に応じてアクティブ色（テーマカラー・ピル形状）／非アクティブ色（グレー）を切り替え、クリックで該当スライドへ移動できるようにした。Works.astro独自だったインラインスクリプトを他3スライダーと同じ`data-slider-root`/`-track`/`-prev`/`-next`/`-dots`構成＋`cardSlider.ts`に統一（IDベースの専用ロジックは削除）。ドットは矢印センタリング計算に影響しないよう`data-slider-root`の外（兄弟要素）に置く規約とした。実機検証でこの環境固有の`requestAnimationFrame`停止（新規確認）を踏まえ、scrollTo呼び出し引数・インデックス計算・scrollイベント発火の3点を個別に確認する形で正しさを担保（→ CLAUDE.md 9.16）
- [x] ドットインジケーターのPC複数列表示（「実績・活用事例」PC3列等）でのバグ修正：`Math.round(scrollLeft/step())`では最後までスクロールしてもドット位置が中央付近で止まる不具合を発見・修正し、「スクロール可能な全区間に対する現在位置の割合をドット数の範囲に線形マッピングする」方式に変更（1画面1枚のスライダーでは旧式と数学的に等価で挙動不変）。実機検証でPC幅・5件・3列表示のスクロール位置4等分点についてドットindexが0→4まで正しく線形進行することを確認（→ CLAUDE.md 9.17）
- [x] ドットインジケーターのデザイン簡素化：アクティブ時のサイズ変更（w-2→w-5）を廃止し、常に同じ大きさで背景色のみが切り替わる仕様に変更（`cardSlider.ts`の`DOT_ACTIVE`/`DOT_INACTIVE`配列を単一クラスの`DOT_ACTIVE_CLASS`/`DOT_INACTIVE_CLASS`に簡素化）（→ CLAUDE.md 9.17）
- [x] フッター背景色をテーマカラーごとに目に優しいトーンへ調整：ボタン等で使う鮮やかな`--color-primary-dark`とは別に、同じ色相を保ちつつ彩度34%・明度23%程度まで落とした専用変数`--color-footer-bg`（`bg-footer-bg`）を5プリセット分新設し、`Footer.astro`・`preview.js`の`renderFooter`をこちらに切り替え。white文字とのコントラストはいずれも9:1以上を確保。tailwind.config.mjs変更時はViteの通常HMRでは反映されず開発サーバーの再起動が必要と判明（本番ビルドには影響なし）（→ CLAUDE.md 9.6, 9.17）
- [x] トップページ「サービス内容」のPCレイアウトを2列×2行の横長カード（左画像・右テキスト＋バッジ）に変更：`Service.astro`のグリッドを`md:grid-cols-2`固定にし、カードを`md:flex-row`＋画像`md:w-[38%] md:h-full object-cover`に変更。従来トップページカードに無かったバッジ（`item.badgeText`）表示も`/services`ページと同様に追加。640〜767px（sm相当）はアスペクト比のみ解除した1列縦積みの中間表示、640px未満のスマホスライダー仕様は変更なし。実機検証でPC幅の2列×2行・横長カード、タブレット幅の1列中間表示、スマホ幅のスライダー維持の3パターンすべてを確認（→ CLAUDE.md 9.17）

## 2b. 現在のステータス

- 上記 1.1〜1.7・完了済みタスクの内容はすべて `main` ブランチにコミット・push 済みで、
  Cloudflare Workers（`master-template-multi.easygoing247.workers.dev`）へのデプロイも
  Git 連携で反映されている。
- `npm run build`（13 ページ）／`npx astro check` は現時点でいずれもエラー 0 件
  （`public/admin/preview.js` に無害な既存の警告のみ：未使用変数、async 化を促す提案）。
- CMS からの直接コミット（クライアントによる日常編集）と開発側の変更が
  何度も同時発生しているが、`git fetch` → `git pull --rebase` で都度統合。
  `src/data/services.yml` 等でコンフリクトした際は「クライアントのデータを保持しつつ
  構造変更をマージ」する方針で解決している。

## 2c. 現在のフェーズ / 次のステップ

- 複数ページ版マスターテンプレートの主要機能および UI 調整は**完了**。
- 次フェーズ：ペライチ（LP）版テンプレート（`master-template`）への機能・
  カスタマイズ要素の横展開準備（Web3Forms 送信 UI、SNS 設定の独立化、
  CMS プレビュー改善、コントラスト調整などのうち LP 版にも有効なものを選定）。

## 3. 未解決の課題

- **Cloudflare Access未設定（優先度：高）**
  `CLAUDE.md` セクション3に記載の通り、`/admin/*` への本番アクセス制限
  （Cloudflare Access等のIdP連携）が**まだ設定されていない**。現状、本番URLの
  `/admin/index.html` に誰でも到達可能な状態（ただしGitHub OAuthログインが
  必須なため書き込みには権限が要る）。運用開始前に必ず設定すること。
- **GitHub OAuth Client Secretのローテーション推奨（優先度：中）**
  プロジェクト初期のやり取りの中でClient Secretが平文でチャットに貼られた
  経緯があるため、念のためGitHub OAuth App側でSecretを再発行し、
  Cloudflare Worker（`cms-oauth-worker`）側の環境変数を更新することを推奨
  （まだ未実施）。
- **スクロール同期のわずかな遅延**
  セクション単位のscrollspy同期で、素早く連続スクロールした場合に
  プレビュー側の追従が「1セクション分遅れる」現象が確認されているが、
  ユーザーからは問題として指摘されておらず、現状は許容範囲として未対応。
- **`public/admin/preview.js` の保守負担**
  実際のAstroコンポーネント（`src/components/*.astro`）とほぼ同じマークアップ・
  Tailwindクラスを`preview.js`内にJS（`h()`呼び出し）として二重管理している。
  コンポーネント側の見た目を変更した際は、`preview.js` 側の対応する
  `render*()` 関数も手動で追従させる必要がある（自動同期の仕組みはない）。
