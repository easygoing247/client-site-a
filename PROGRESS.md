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
