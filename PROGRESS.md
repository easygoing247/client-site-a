# PROGRESS.md

このファイルは、本リポジトリ（`master-template`）に対してこれまで行われた
実装内容・現在のステータス・未解決の課題をまとめた進捗記録です。
プロジェクトの構造・ルールそのものは `CLAUDE.md` を参照してください。

最終更新: 2026-09-09

## 0. デプロイ・運用情報

| 項目 | 値 |
|---|---|
| GitHub リポジトリ | `easygoing247/master-template` |
| デプロイ先 | Cloudflare Pages（プロジェクト名 `master-template`） |
| 本番ドメイン | `master-template-c2u.pages.dev` |
| Decap CMS backend | GitHub直接連携（OAuth）。仲介プロキシは自前のCloudflare Worker（`cms-oauth-worker/`、`base_url: https://master-template-oauth.easygoing247.workers.dev`） |
| デプロイコマンド | `npm run build` → `npx wrangler pages deploy dist --project-name=master-template` |

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
  ライブプレビュー（`public/admin/preview.js`）を「サイト設定」「商品・施工事例」の
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

## 2. 現在のステータス

- 上記1.1〜1.6の内容はすべて `main` ブランチにコミット・push済みで、
  Cloudflare Pages（`master-template`）へのデプロイも都度完了している。
- `npm run build` / `npx astro check` は現時点でいずれもエラー0件
  （`public/admin/preview.js` に無害な既存の警告2件のみ：未使用変数、
  async化を促す提案）。
- CMSからの直接コミット（クライアントによる日常編集）と開発側の変更が
  何度か同時に発生しているが、対象ファイルが被らない限り
  `git fetch` → `git pull`（fast-forwardまたはマージ）で問題なく統合できている。

## 3. 未解決の課題・today's TODO

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
