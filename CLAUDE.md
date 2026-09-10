# CLAUDE.md

このファイルは、このリポジトリで Claude Code が作業する際の必読ルールです。
人間の開発者にも同様に適用されます。

## 1. プロジェクト構造

```
astro.config.mjs        Astro設定（sitemap統合、site URL）
tailwind.config.mjs      デザイントークン（primary/secondary/accent 等）を定義
src/
  data/siteInfo.yml      ★サイト全データの唯一のソース（Single Source of Truth）
  lib/site.ts            siteInfo.yml をパースして型付きで公開
  lib/images.ts           siteInfo.yml内の画像パス文字列を astro:assets の
                          ImageMetadata に解決するヘルパー
  layouts/Layout.astro    共通<head>・フォント読み込み最適化
  components/             セクション単位のAstroコンポーネント（1コンポーネント1責務）
  content/
    config.ts             Content Collections スキーマ定義（products）
    products/*.md          型化ページの実データ（Markdown + frontmatter）
  pages/
    index.astro            トップページ（コンポーネントを並べるだけ）
    privacy.astro           プライバシーポリシー（siteInfo.ymlから動的生成）
    products/[slug].astro   型化ページの動的ルート
public/
  admin/                   Decap CMS（index.html + config.yml）
  robots.txt               検索エンジン向け設定（sitemapは@astrojs/sitemapが自動生成）
```

### 絶対ルール①：テキスト直書き禁止

- コンポーネント（`.astro`）内に日本語テキスト・電話番号・住所・価格などを直接書き込まないこと。
- すべてのテキスト／数値／リンク先は `src/data/siteInfo.yml` に定義し、
  `src/lib/site.ts` の `site` オブジェクト経由で参照すること。
- 型化ページ（商品一覧）のテキストは `src/content/products/*.md` の frontmatter に書く。
- 例外：aria-label の補助文言、SVGのpath座標など「コンテンツではない実装詳細」のみ許容。

### 絶対ルール②：画像は astro:assets の `<Image />` を使用する

- `<img>` タグを直接書かない。必ず `astro:assets` の `<Image />` コンポーネントを使う。
- 画像ファイルは `src/assets/` に配置し、`siteInfo.yml` にはそのファイル名を含む
  相対パス文字列（例: `"../assets/hero.jpg"`）を書き、`resolveImage()` で解決する。
- Content Collections（products）内の画像は、スキーマの `image()` ヘルパーを使い、
  frontmatterに相対パスで記述する（`mainImage: "../../assets/xxx.jpg"`）。
- ヒーロー画像など LCP に影響する画像には `fetchpriority="high"` と `loading="eager"` を、
  それ以外の画像には `loading="lazy"` を必ず指定する。
- 切り抜き表示（`object-fit: cover`）の画像位置は CSS 既定（中央）に従う。
  個別の `object-position` 指定や CMS からの表示位置調整は行わない。

## 2. 案件初期化用プロンプト例（新規案件へ着せ替える手順）

新しいクライアント案件にこのマスターテンプレートを流用する場合、Claude Code に対して
以下のようなプロンプトを投げることを想定しています。

```
このマスターテンプレートを新しい案件用に初期化してください。
- 店舗名・住所・電話番号・営業時間・SNSリンクを次の内容に置き換えてください：
  （ここに新しい店舗情報を貼り付け）
- ブランドカラーを primary=#○○○○○○, secondary=#○○○○○○, accent=#○○○○○○ に変更してください。
  tailwind.config.mjs の colors ブロックのみを更新し、コンポーネント側の
  クラス名（bg-primary 等）は変更しないでください。
- src/assets/ 内の画像を、案件用に用意した写真に差し替えてください
  （ファイル名は既存のものに合わせるか、siteInfo.yml のパスも合わせて更新してください）。
- 料金プラン・サービス内容・FAQ・実績事例のテキストを、src/data/siteInfo.yml 内の
  該当ブロックのみ書き換えてください（コンポーネント本体は変更不要です）。
```

このプロンプトのポイントは「**変更対象を siteInfo.yml とデザイントークンに限定する**」ことです。
コンポーネントのマークアップ・ロジックには手を入れず、データと色の変数だけを
差し替えることで、型化ページや将来の機能追加との衝突を避けられます。

## 3. セキュリティ方針

- `/admin`（Decap CMS）には、このリポジトリのコード側では認可制御を実装していません。
- **本番デプロイ後、必ず Cloudflare Access（または同等のIdP連携リバースプロキシ）で
  `/admin/*` へのアクセスを許可ユーザーのみに制限してください。**
- Decap CMS関連スクリプト（netlify-identity-widget、decap-cms本体）は
  `public/admin/index.html` にのみ読み込ませており、トップページ等の一般公開ページには
  一切混入させないこと（パフォーマンス・セキュリティ両面での必須ルール）。
- GitHub連携（`backend.name: github`）のバックエンド設定は `public/admin/config.yml` の
  `backend` ブロックのみで完結させ、ソースコード側に認証情報をハードコードしないこと。
  GitHub OAuth Appのクライアントシークレット等は、GitHub側・OAuth仲介サーバー側の
  設定として管理し、このリポジトリには一切含めない。

## 4. 型化ページの管理ルールと 梅／竹／松 プラン運用

### 型化ページ（`src/content/products/`）

- 1商品 = 1つの `.md` ファイル。ファイル名（拡張子除く）がそのまま
  URLスラッグになる（例: `sample.md` → `/products/sample/`）。
  ※ CMS 上のコレクション名は「商品一覧」（旧「商品・施工事例」）。「お知らせ」
  （旧「お知らせ・ブログ」）と合わせて表記を統一済み。
- frontmatterのスキーマは `src/content/config.ts` で定義されている。
  必須フィールド：`title`, `price`, `mainImage`, `summary`, `specs`, `order`。
- 型化ページのファイル自体は、機能フラグの状態に関わらず `npm run build` 時に
  常に静的ページとして生成される（直接URLでのアクセス・先行公開プレビュー用）。
  トップページからの導線表示のみが機能フラグで制御される。

### 機能フラグによるプラン切り替え（`src/data/siteInfo.yml` の `features`）

| フラグ | 用途 |
|---|---|
| `features.enableProducts` | `false`=梅プラン（1ページLPのみ、商品セクション非表示） / `true`=竹・松プラン（トップページに商品一覧セクションを表示し、`/products/[slug]` への導線を出す） |
| `features.enableWorks` | 実績セクションの表示/非表示 |
| `features.enableFaq` | FAQセクションの表示/非表示 |
| `features.enablePlans` | 料金プランセクションの表示/非表示 |

- 梅プランの案件では `enableProducts: false` のまま運用し、`src/content/products/`
  にファイルを追加しても、トップページの商品セクションは表示されない
  （ただし個別ページは生成されるため、将来のプラン変更に備えてコンテンツだけ
  先に用意しておくことも可能）。
- 竹・松プランへのアップグレード時は `enableProducts: true` に変更するのみでよい。
  コンポーネントやルーティングの変更は不要。

## 5. ローカルでのDecap CMS動作確認

- `astro dev` は `public/` 配下のサブディレクトリで `index.html` の自動解決を行わない仕様があるため、
  開発サーバーでは `http://localhost:3001/admin/index.html`（末尾まで明記）でアクセスすること。
  `npm run build && npm run preview` で確認する場合は `/admin/`（末尾スラッシュ）でもアクセス可能。
- `public/admin/config.yml` の `backend` は本番用の `github`（GitHub OAuth前提）のため、
  OAuth仲介サーバーを別途用意していないローカル環境ではログインできない。ローカル確認時は以下の手順で
  `local_backend: true` を使ったローカルプロキシ経由のログインを利用する：

  ```bash
  npm run dev        # ターミナル1
  npm run cms:proxy  # ターミナル2（decap-serverを起動）
  ```

  その上で `/admin/index.html` を開き、「ログイン」ボタンを押すだけで
  （Git認証不要で）ローカルの `siteInfo.yml` や `src/content/products/` を直接編集できる。
- `local_backend: true` はlocalhost以外では自動的に無視されるため、本番ビルドには影響しない。

## 6. .gitignore

`node_modules/`, `dist/`, `.astro/`, `.env` 系は Git 管理対象外（`.gitignore` 参照）。
`src/assets/` の画像ファイルは案件ごとに差し替わる資産のためコミット対象に含める。

## 7. Decap CMSライブプレビュー（`public/admin/preview.js`）の保守ルール

- 「サイト設定」「商品一覧」および複数ページ版で追加した「下層ページ
  （services / about / contact）」「お知らせ（news）」の各コレクションには
  `CMS.registerPreviewTemplate` による独自のライブプレビューを実装済み（Decap既定の
  Markdownプレビューではなく、実サイトに近い見た目をリアルタイム表示するため）。
  file コレクションの登録名は**ファイルの `name`**（`siteInfo` / `siteSettings` /
  `services` / `about` / `contact`）、folder コレクションは**コレクション名**
  （`products` / `news`）。
- `preview.js` は `src/components/*.astro`・`src/pages/*.astro` の対応するマークアップと
  **同じマークアップ・Tailwindクラス**をJS（`h()` = React.createElement呼び出し）で
  再現する二重管理構成。そのため、コンポーネント／ページ側の
  マークアップ・クラス・条件分岐を変更した場合は、`preview.js` 内の対応する関数
  （トップページ：`renderHeader` / `renderHero` / `renderNewsSectionPreview`（お知らせ
  セクション。ヒーロー直下に固定）/ `renderFeatures` / `renderServices`（下層リンク付き）/
  `renderFlow` / `renderWorks` / `renderPlans`（各カードにボタン。人気プランは強調）/
  `renderAccess` / `renderFaq` / `renderContact` / `renderFooter`。お問い合わせフォームの入力欄は
  `renderContactFields` / `renderContactFieldPreview` / `resolveContactFieldsForPreview`
  （＝`ContactFields.astro` / `ContactField.astro` / `src/lib/pages.ts` の
  `resolveContactFormFields`）。下層ページ：`renderPagePreviewHeading`
  （＝`PageHeader.astro`）/ `renderPreviewButton`（＝`Button.astro`）/
  `parseTextBlocksForPreview`（＝`src/lib/pages.ts` の `parseTextBlocks`）/
  `ServicesPagePreview` / `AboutPagePreview` / `ContactPagePreview` / `NewsPreview`）も
  必ず追従修正すること。自動同期の仕組みは無いため、変更の都度手動で見比べる必要がある。
- **プレビューへのCSS流し込み**：`loadSiteStylesheetAndTheme()` が本番の `/` を
  fetch し、`<link rel="stylesheet">`（外部CSS）と `<style>`（インラインCSS）の
  両方を `CMS.registerPreviewStyle()` に渡す（`<style>` は `{ raw: true }` 指定）。
  本テンプレートは `astro.config.mjs` の `build.inlineStylesheets: 'always'` により
  CSSがインライン化されるため、**`<style>` の raw 登録がプレビュー描画の生命線**。
  `npm run build && npm run preview`（末尾スラッシュ `/admin/`）で確認すること
  （`astro dev` はCSSがJS注入のため初期HTMLに含まれず、プレビューは無スタイルになる）。
- 下層ページ（`services` / `about` / `contact` / `news`）のプレビューは siteInfo.yml とは
  別エントリのため、ヘッダー・フッターは商品プレビューと同様に「公開済みの実HTML」
  （`publishedHeaderHtml` / `publishedFooterHtml`）を流用する。会社名・フォーム項目文言など
  siteInfo.yml 側の値はプレビューでは既定値で代替する（`CONTACT_FORM_DEFAULTS` 等）。
- **プレビュー追従スクロール（全コレクション共通）**：`index.html` の
  `syncPreviewScroll()` は2モード。(A) サイト全体設定＝フォームの大項目ラベルと
  プレビューの `<section id>` が対応するため `findActiveSectionKey()` で編集中
  セクションの見出し位置へスナップ。(B) 商品・下層ページ・お知らせ＝対応 id が
  無いので、フォーム側のスクロール進捗率をプレビュー側へ比例適用して追従。
  トリガー（`ControlPaneContainer` の scroll ／ `EditorToggle` のトグルクリック
  ／80px閾値）はコレクション非依存で共通。
- ヘッダー・フッターのナビゲーション項目は、実サイト（`src/lib/site.ts` の
  `visibleNavItems()`）・プレビュー（`preview.js` の `filterVisibleNavForPreview()`）の
  どちらも、リンク先セクションの機能フラグ（`features.enableFaq` 等）と連動して
  自動的に表示/非表示が切り替わる。新しいセクション／ナビ項目を追加する場合は、
  両方の `href → フラグ` 対応表（`navHrefToFeatureFlag` と `NAV_HREF_TO_FLAG`）に
  同じキーを追加すること。
- Decap自身の内部スクロール同期・プレビュー表示切替ボタン（`ViewControls`）は
  カスタムプレビューテンプレートと非互換なため、`public/admin/index.html` 側で
  スクロール同期・アイコン状態を完全に自前実装している（`scrollSyncEnabled`,
  `applyScrollSyncIcon()`, `findActiveSectionKey()`, `syncPreviewScroll()` 等）。
  Decap本体のバージョンアップ等でこの内部DOM構造（`ToolbarSubSectionLast`,
  `ControlPaneContainer`, `EditorToggle` 等のクラス名）が変わった場合は
  再調整が必要になる可能性がある。

## 8. デプロイ手順

派生元 `master-template`（LP版）は Cloudflare **Pages**（プロジェクト名
`master-template` / 本番ドメイン `master-template-c2u.pages.dev`）で運用。

**このリポジトリ（`master-template-multi`）は Cloudflare Workers（Workers Builds）で
静的アセットとして配信する。** 本番URL：`master-template-multi.easygoing247.workers.dev`。

このプロジェクトは **`output` 未指定＝完全な静的サイト（SSG）**。`dist/` に
プレーンなHTML/CSS/JS/画像のみを出力する。`@astrojs/cloudflare` アダプターや
`output: "hybrid"` は**入れない**（SSR不要）。Workers での配信は
`_worker.js` を使わず、ビルド済み `dist/` を静的アセットとして返すだけの
`wrangler.json` で行う（下記）。

### `wrangler.json`（プロジェクトルート、Git 管理対象）

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "master-template-multi",
  "compatibility_date": "2024-09-23",
  "assets": { "directory": "./dist" }
}
```

- `main` が無い＝Worker スクリプトは持たず、`assets.directory` の中身をそのまま配信。
- Cloudflare 側の Workers Builds（Git 連携）が `main` への push 毎に
  Build command `npm run build` を実行し、生成された `dist/` を配信する。
  Build settings：Build command `npm run build` / Deploy command は既定
  （`wrangler deploy` 相当）/ ルートディレクトリはリポジトリ直下。
- ⚠️ `npx wrangler pages project create` は使わない。wrangler 4.13x では
  レガシー Pages ではなく Workers＋SSRアダプター構成へ自動変換し、
  `astro.config.mjs` / `package.json` / `package-lock.json` を書き換えてしまう。

### 手動デプロイ（Git 連携を使わない場合）

```bash
npm run build
npx wrangler deploy
```

### 本番URL関連の設定

`astro.config.mjs` の `site` と `public/admin/config.yml` の `site_url` /
`display_url` は本番URL（`https://master-template-multi.easygoing247.workers.dev`）
に設定済み。独自ドメインに切り替えた場合は両方を更新すること。
`config.yml` の `backend.base_url` は複製先専用 OAuth プロキシに向ける
（セクション9.2 の 2〜4 と合わせて対応）。

Git 連携なら push で自動再デプロイされる。Git 未連携の場合、Decap CMS から
クライアントが直接編集・保存した内容（`main` への直接コミット）も含めて、
上記コマンドで都度デプロイし直す必要がある。

コード側に変更を加える際は、CMSからの同時コミット（`Update サイト設定 "siteInfo"` 等）
と衝突しないよう、必ず `git fetch origin` → 差分確認 → （必要なら）`git pull` で
マージしてからコミット・push・デプロイする。進捗の詳細は `PROGRESS.md` を参照。

## 9. リポジトリ複製時の注意・複数ページ版（master-template-multi）の構成ルール

### 9.1 このリポジトリの位置づけ

- このリポジトリは **`easygoing247/master-template-multi`**（複数ページ版マスター
  テンプレート）。1ページLP版の `master-template` をコードごと複製して作成した派生元。
- 実案件へ着せ替える際も、原則 `src/data/*.yml` とデザイントークンのみを変更する
  （セクション2の方針を踏襲）。

### 9.2 複製直後に必ず再設定するもの

`master-template` を複製して新しいリポジトリを作った場合、以下は元リポジトリを
向いたまま／未作成なので、実案件で使う前に必ず再設定すること。

1. **`public/admin/config.yml` の `backend.repo`** … 複製先リポジトリ名に変更する
   （最優先。放置すると複製先の `/admin` から誤って元リポジトリへ保存される事故になる）。
   → 本リポジトリでは `easygoing247/master-template-multi` に変更済み。
2. **`public/admin/config.yml` の `backend.base_url`** … 複製先専用の Cloudflare Worker
   OAuth プロキシ（`cms-oauth-worker/` の別デプロイ）の URL に変更する。**未対応**
   （現状は `master-template-oauth.easygoing247.workers.dev` のまま）。
3. **複製先専用の GitHub OAuth App** … 既存 App の使い回し禁止。新規作成し、
   Client ID / Secret を Worker 側の環境変数に設定する。**未作成**。
4. **複製先専用の Cloudflare Pages プロジェクト** … `wrangler pages deploy` の
   `--project-name` を複製先用に変更する。**未作成**。
5. **`astro.config.mjs` の `site` URL** … 複製先の本番ドメインに合わせる。

### 9.3 複数ページ版で追加した下層ページ・コレクション

`public/admin/config.yml` に、既存の「サイト設定」「デザインテーマ設定」
「商品一覧（型化ページ）」を保持したまま、以下を追加している。

| コレクション | 種別 | データファイル | 内容 |
|---|---|---|---|
| 下層ページ ＞ サービス内容・料金（`name: services`） | file | `src/data/services.yml` | サービス詳細、料金表、注記 |
| 下層ページ ＞ 会社概要（`name: about`） | file | `src/data/about.yml` | 会社概要、代表挨拶、アクセス情報（`access.items[]` 可変リスト）、「公式SNS」行ラベル |
| 下層ページ ＞ お問い合わせ・ご予約（`name: contact`） | file | `src/data/contactPage.yml` | フォーム案内文、注意事項、プライバシーポリシー |
| お知らせ（news） | folder（投稿型） | `src/content/news/*.md` | 記事タイトル・アイキャッチ・本文・公開日・カテゴリ |

- 下層ページ用 `.yml` は `src/data/siteInfo.yml` と同じ「唯一のデータソース」原則に従う。
  パーサは **`src/lib/pages.ts`**（`servicesPage` / `aboutPage` / `contactPage`、
  `site.ts` と同じ `?raw` インポート方式）。コンポーネントへのテキスト直書きは禁止（絶対ルール①）。
- `pages` コレクションの各 file エントリ（`services` / `about` / `contact`）は
  `summary: "{{fields.heading}}"` を指定し、管理画面の一覧・エディタ上に各 `.yml` の
  「ページ見出し（`heading`）」を表示する。3ファイルとも先頭フィールドは
  `heading`（label「ページ見出し」）で統一すること。
- `news` コレクションのスキーマは `src/content/config.ts` の `news` で定義。取得は
  **`src/lib/news.ts`** の `getPublishedNews()`（`draft: true` を除外し公開日降順）を経由する。
  カテゴリ表示名・日付整形も同モジュールに集約。画像は `image()` ヘルパー経由で
  `../../assets/` からの相対パスで指定する（絶対ルール②）。
- `src/content/news/2026-09-09-sample.md` はサンプル記事。実案件では削除または差し替える。
- **公式SNS**：siteInfo.yml トップレベルの `sns` リスト（CMS「SNS設定」、`{id, url, enabled}`、
  id は `line`/`instagram`/`x`/`facebook`/`youtube`）に一元化。SNSアイコンを掲載する箇所
  （`Access.astro` / `Footer.astro` / `about.astro` の「公式SNS」行 → 共有コンポーネント
  `SnsIcons.astro`）は必ず `src/lib/sns.ts` の `orderedSnsLinks()` 経由でリンク一覧を取得する。
  スマホ下部バーの LINE ボタンは `snsUrl('line')` を参照。`preview.js` は `orderedSnsForPreview()`
  で `data.sns` を同じ判定で読む。
- **画像パスの必須設定**：`products` / `news` の各 folder コレクションには
  `media_folder: "/src/assets"` ＋ `public_folder: "../../assets"` を個別指定している。
  グローバル設定（`public_folder: /src/assets`）のままだと、CMS が挿入する画像パスが
  `/src/assets/xxx` になり、frontmatter の `image()` は解決できても**本文中の
  Markdown 画像（`![](...)`）が Astro の最適化対象外**となって `/src/assets/...` の
  まま出力され、本番（`dist/` に `src/` は存在しない）で 404 になる。
  `../../assets/xxx` にすることで frontmatter・本文の両方が最適化される。
  新規 folder コレクション（`src/content/**/*.md`）を追加する場合も同じ2行を必ず入れること。

### 9.4 下層ページ本体（`src/pages/`）とルーティング

| URL | ファイル | データソース |
|---|---|---|
| `/services` | `src/pages/services.astro` | `src/lib/pages.ts` `servicesPage` |
| `/about` | `src/pages/about.astro` | `src/lib/pages.ts` `aboutPage` |
| `/contact` | `src/pages/contact.astro` | `contactPage`（`formFields` 含む）＋ `contactFormSettings` ＋ `siteInfo.yml` の `contactSection.form`（送信ボタン・結果メッセージ） |
| `/news` | `src/pages/news/index.astro` | `news` コレクション（一覧） |
| `/news/<slug>` | `src/pages/news/[slug].astro` | `news` コレクション（詳細・静的生成） |

- 共通パーツ：`Header` / `Footer` / `StickyContactBar` / `BackToTop` に加え、
  下層ページ共通の見出し＋パンくずは **`src/components/PageHeader.astro`**、
  CTAボタンは **`src/components/Button.astro`** を再利用する。
- **`/services`（サービス内容・料金）**：
  - 「サービス詳細」各項目の `reverseLayout`（boolean）が true のとき、`md:` 以上で
    画像カードに `md:order-2` を付与し「画像：右／テキスト：左」に反転（既定は画像：左。
    スマホ1カラムでは常に画像→テキスト順）。自動交互配置はしない。
  - 「料金表」各行は `note` の下に `features`（`string[]`／`priceTable[].features`）を
    チェックマーク付き箇条書きで表示（サービス詳細・料金プランの features と同じ体裁）。
  - 「料金表」各行の `showBadge`（boolean）が true かつ `badgeText` が非空のとき、
    項目名の左隣に強調バッジ（`bg-primary text-white` の pill。テーマカラー連動）を
    `inline-flex`＋`gap` で表示。PC・スマホとも折り返し対応。
  - ページ最下部の問い合わせ CTA セクションは廃止（ヘッダーCTA・`StickyContactBar` で導線は担保）。
  - 上記はいずれも `preview.js` の `ServicesPagePreview` を一致させること。
- **`/about`（会社概要）** の3セクション（代表挨拶／会社概要（表形式）／アクセス）は
  `about.yml` の `sections.{greeting,companyOverview,access}`（CMS「セクションの
  表示・非表示」）で個別に enabled 制御。`AboutPage` 型・`about.astro`・`preview.js`
  の `AboutPagePreview` の3箇所を一致させること。
  - **背景ゼブラ**：`about.astro` は `mutedByKey`、`AboutPagePreview` は
    `visibleAboutSections`（`[{show, render}]` を `filter(show).map((s,i)=>s.render(i%2===1))`）で、
    **毎レンダー “表示中セクションだけ” を配列にまとめ index を振り直す**。
    Decap はフォード変更のたびに preview 関数を再実行するため、トグル切替が
    即座にプレビューへ反映される（一部非表示でも必ず 白→グレー→白…）。
  - 会社概要テーブルの `dt` はスマホで全幅の帯になる。テーマ非連動の
    落ち着いたニュートラルグレー **`bg-surface-band`（`#e5e7eb`）** の帯にして
    セクション背景（白／`bg-surface-muted`）と同化させない。`sm:bg-transparent`
    で白カード上に戻す。`dd` はスマホ縦積み時に `pt-3` で余白を確保。
- **`/news`（一覧）** はカテゴリフィルター＋カード／リスト表示切替をクライアントJSで実装
  （`src/pages/news/index.astro` の `<script>`）。カテゴリ一覧は
  `src/lib/news.ts` の `collectNewsCategories()`（記事に実在するカテゴリのみ）。
- **トップページ「お知らせ」セクション**（`src/components/News.astro`）は
  ヒーローと「選ばれる3つの理由」の間に**固定配置**（`sectionOrder` 対象外）。
  `features.enableNews` と `newsSection`（`count` / 見出し / 一覧リンク）で制御。
  `index.astro` で `<Hero />` の直後に `<News />` を置く。
- **「サービス・事業内容」** セクションの下層リンクは `services.linkLabel` /
  `services.linkHref`、**「料金プラン」** カードのボタンは `plans.buttonLabel` /
  `plans.buttonHref`。人気プラン（`popular: true`）のボタンは
  `Button.astro` の `variant="solid"` ＋ `shadow-[...var(--color-primary-rgb)...]` で
  強調（色はテーマ設定の CSS変数に連動）。
- ヘッダー／フッターのナビ（`siteInfo.yml` の `nav` / `footerNav` / `navCta`）は、
  下層ページへは絶対パス（`/services` 等）、トップページのセクションへは
  **ルート付きハッシュ（`/#works` 等）** でリンクする。`SmoothScroll.astro` は
  「リンク先が現在表示中ページと同一パス」のハッシュリンクのみスクロール処理し、
  別ページ宛て（`/#works` を下層ページでクリック）はブラウザ標準遷移に任せる。

### 9.5 CMSライブプレビュー・ナビ連動との整合

- 下層ページ用コンポーネントを追加した場合は、`public/admin/preview.js` の対応する
  `render*()` 関数も追従修正すること（セクション7の二重管理ルール）。
- ナビ項目とセクション表示フラグの連動は `src/lib/site.ts`（`navHrefToFeatureFlag`、
  `#works` と `/#works` の両形式を登録）と `preview.js`（`NAV_HREF_TO_FLAG`、同様に両形式）
  の2箇所で管理。新規セクション／ナビ項目を追加する場合は両方に同じキーを追加すること。

### 9.7 お問い合わせフォーム（Web3Forms）

- 送信処理は **`src/scripts/contactForm.ts`** に集約（2フォーム共通）。
  `#contact-form` を持つ `Contact.astro`（`#contact` セクション）と
  `src/pages/contact.astro` が `<script>import '../scripts/contactForm.ts'</script>`
  で読み込む。フォームのマークアップも2箇所でほぼ同一に保つこと。
- Fetch API で `https://api.web3forms.com/submit` に `FormData`（各入力欄＋
  `access_key`＋hidden の `subject` / `from_name`）を POST。送信中は送信ボタンを
  `disabled` にし `.contact-submit-label` を「送信中…」に差し替え、
  **成功で `<form>` を `hidden` 属性＋`style.display = 'none'` の両方で確実に非表示**
  （form には Tailwind の `.flex` が付いており UA の `[hidden]{display:none}` より
  詳細度が高いため、hidden 属性だけでは消えない＝「送信ボタンだけ『送信中…』の
  まま残る」不具合の原因）にして `#contact-success` のみをフェードイン、
  失敗で送信ボタンの `disabled` 解除・ラベルを「送信する」に戻してから
  `#contact-error` をフェードイン。
- **送信設定は独立ファイル `src/data/contact-form.json`**（`web3forms_access_key` /
  `contact_email_subject` / `contact_email_from_name`）。パーサは
  **`src/lib/contactFormSettings.ts`**（`contactFormSettings`）。`siteInfo.yml` には
  持たせない。CMS 上は「サイト設定」コレクションの **3つ目のファイル項目
  「お問い合わせフォーム設定（contact-form.json）」**（1.サイト全体設定
  → 2.デザインテーマ設定 → 3.お問い合わせフォーム設定 の順）で編集する。
  各フォームは `contactFormSettings.*` を `<form data-access-key>` と hidden
  `subject` / `from_name` に埋め込み、スクリプトは `form.dataset` からのみ読む。
- ボタン文言・「送信中」文言・成功／失敗メッセージは `siteInfo.yml` の
  `contactSection.form.*`（`submitLabel` / `sendingLabel` / `successMessage` /
  `errorMessage`）。コンポーネントへの直書き禁止（絶対ルール①）。
- **入力欄（お名前 / 会社名 / メールアドレス / 電話番号 / お問い合わせ内容）**は
  `src/data/contactPage.yml` の `formFields.<key>` で「表示（enabled）／ラベル（label）
  ／プレースホルダー（placeholder）／必須（required）」を CMS 編集できる。
  解決は `src/lib/pages.ts` の **`resolveContactFormFields()`**（既定値とマージし、
  `enabled` の項目だけを固定順 name→company→email→phone→message で返す）。
  レンダリングは共通コンポーネント **`ContactFields.astro` / `ContactField.astro`**
  （`Contact.astro` と `contact.astro` の両 `<form>` 内で使用）。ラベル横に
  `required` に応じて「必須」（赤 `#c62828`）／「任意」（グレー）バッジを出し分ける。
- **カスタム追加項目**：`contactPage.yml` の `custom_fields[]`（CMS の list ウィジェット
  で自由に追加・削除・並べ替え。固定項目は削除不可）。各項目は
  `label` / `name`（送信キー。英数字＋`_` に正規化）/ `placeholder` / `type`
  （text/number/tel/email/textarea/select）/ `options`（select用）/ `enabled` / `required`。
  解決は `src/lib/pages.ts` の **`resolveCustomContactFields()`**
  （予約語・重複・空欄・`enabled: false` を除外）→ `ContactRenderField` に正規化。
  **表示順は「お名前 → 会社名 → メールアドレス → 電話番号 →〈カスタム項目〉→
  お問い合わせ内容」で固定**（＝カスタム項目は「電話番号」の直後・「お問い合わせ内容」の
  直前に挿入。`ContactFields.astro` の `beforeCustom` / `custom` / `messageField` の
  並び）。`preview.js` の `ContactPagePreview` も同順。
- 送信は `contactForm.ts` が `input[name], textarea[name], select[name]` を明示的に
  走査して `FormData` に集約する（固定・電話番号・カスタム・`<select>`・hidden の
  `subject`/`from_name`・checked の `botcheck` を含む。非表示項目は DOM に無い＝送信されない）。
- 上記フォーム系の定義を変えたら `preview.js` の `resolveContactFieldsForPreview` /
  `resolveCustomContactFieldsForPreview` / `renderContactFieldPreview` /
  `renderContactFields` も `src/lib/pages.ts` と一致させること。
- `#contact-success` / `#contact-error` のフェードインは `src/styles/global.css` の
  `.is-visible` クラス＋`contactForm.ts` の `reveal()`（hidden 解除 → 1回だけ
  `offsetWidth` でリフローを確定 → クラス付与）。`prefers-reduced-motion` 尊重。
  成功メッセージには `mt-8`（2rem）で上部余白を確保。
- `botcheck` の隠しチェックボックス（ハニーポット）を各フォームに配置済み。
- フォームのマークアップを変更した場合は `preview.js` の `renderContact` /
  `ContactPagePreview` も確認すること（メッセージ類は既定 hidden のため
  プレビューには描画しない方針）。

### 9.6 パフォーマンス方針（PageSpeed Insights Mobile 90+ の維持）

複数ページ化後も、以下の前提により全ページで軽量な構成を保っている。
ビルド出力（`dist/`）実測：JS 合計 約2.7KB・CSS 1ファイル約20KB（全ページ共有）・
各HTML 12〜19KB（トップのみ約51KB）・画像は全て WebP（`astro:assets` で自動最適化）。

- **フォント**：OS標準のシステムフォントのみ（`tailwind.config.mjs` の `font-sans`）。
  外部フォントCDN・`@import`・`<link rel="preconnect">` は一切使わない。
- **CSS**：`astro.config.mjs` の `build.inlineStylesheets: 'always'` で、共有CSS
  （約20KB／gzip約5KB）を全HTMLの `<head>` に `<style>` インライン展開する。
  外部 `<link rel="stylesheet">` によるレンダーブロックが発生しないことを
  ビルド出力で確認すること（`dist/*.html` に `_astro/*.css` への `<link>` が無い）。
- **スクリプト**：外部CDN読み込みゼロ。`SmoothScroll` / `StickyContactBar` /
  `BackToTop` / `MobileNavDrawer` の hoisted スクリプトのみ（合計数KB）。
  scroll イベントで DOM を触る処理（`BackToTop`）は `requestAnimationFrame` で
  間引き、状態変化時のみ class を書き換える（強制リフロー・ロングタスク対策）。
- **コントラスト（WCAG AA 4.5:1）**：`tailwind.config.mjs` の色トークンは
  白／`#f5f7fb` 背景で AA を満たす値に調整済み。特に注意：
  - `ink.faint`（`#646b7b`）… 補足テキスト・注意書き・パンくず。これより明るくしない。
  - `accent`（`#06c755`）… **LINE 公式ブランドカラー**。スマホ下部固定バーの
    「LINEで相談」ボタン・SNSアイコンで使用。白文字のコントラストは AA 未達だが、
    LINE 自身の UI も同配色のためブランド遵守を優先している（例外）。
    視認性補助として、この LINE ボタンのテキストは `text-white`＋`font-bold`＋
    `tracking-wide`＋`[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]`、アイコンは
    `drop-shadow-[…]` を付与している（背景色は変えない）。
  案件ごとの着せ替え（セクション2）で色を差し替える際も、白文字ボタン・
  補足テキストのコントラスト比 4.5:1 以上を必ず確認すること（`accent` の LINE 緑は除く）。
- **画像**：必ず `astro:assets` の `<Image />`（`<img>` 直書き禁止＝絶対ルール②）。
  各ページで**ファーストビューに入る先頭画像1枚だけ** `fetchpriority="high"` +
  `loading="eager"`、それ以外は `loading="lazy"`。`width` / `height` を必ず指定して
  CLS を防ぐ。
  - トップ：`Hero.astro` の背景画像
  - `/services`：サービス詳細の1枚目（`i === 0`）
  - `/about`：代表挨拶の写真
  - `/news`：一覧カードの1枚目（`i === 0`）
  - `/news/<slug>`：アイキャッチ画像
  - `/contact`：画像なし
- **Googleマップ**：`about.astro` / `Access.astro` の埋め込み `<iframe>` は
  `loading="lazy"`（ファーストビュー外）。重い外部リソースのため、上部には置かない。
- 新しい下層ページ・画像を追加する際も、この「先頭1枚 eager / 残り lazy」ルールと
  システムフォント・外部CDN不使用を必ず踏襲すること。
- 本番URL確定後の PSI 実測は、`https://pagespeed.web.dev/` に各URL
  （`/` `/services` `/about` `/contact` `/news` `/news/<slug>`）を入力して確認する
  （デプロイ前はローカルの `npm run preview` ＋ Lighthouse で代替検証）。

### 9.8 最近の仕様変更サマリ（2026-09 複数ページ版バッチ）

上記 9.3〜9.7 の該当箇所に詳細を記載。ここは全体像の索引。

- **Decap CMS「サイト設定」コレクション** … file 項目は 3 つ、この順で固定：
  1. サイト全体設定（`siteInfo.yml`）／2. デザインテーマ設定（`site-settings.json`）／
  3. お問い合わせフォーム設定（`contact-form.json`）。
  - **SNS設定**は「連絡先」から独立し、`siteInfo.yml` トップレベルの `sns` リスト
    （CMS では「サイト全体設定」内の独立フィールド群）として一括管理（→ 9.3）。
  - **下層ページ**コレクションの各 file（services / about / contact）は
    `summary: "{{fields.heading}}"` で「ページ見出し」を管理画面に動的表示（→ 9.3）。
  - コレクション名の表記統一：「商品・施工事例」→「**商品一覧**」、
    「お知らせ・ブログ」→「**お知らせ**」（実サイト側の見出し・パンくず、`preview.js`、
    コメントまで一括置換済み）。
- **ライブプレビュー** … 全コレクションでスクロール追従（サイト設定はセクション
  `id` スナップ、その他は進捗率比例）。`/about` の背景ゼブラは毎レンダー再計算で
  トグル切替に即追従（→ 9.4「背景ゼブラ」）。
- **トップページ** … ヒーロー直下に「お知らせ」セクション（`News.astro`、`sectionOrder`
  対象外の固定配置。CMS「セクションの表示・非表示」でも先頭項目）。「サービス内容を見る ›」
  リンク（`services.linkLabel/linkHref`）、料金プラン各カードの「詳しく見る ›」ボタン
  （`plans.buttonLabel/buttonHref`。人気プランはテーマカラー連動で強調）。
- **`/about`** … 代表挨拶／会社概要（末尾に「公式SNS」行）／アクセス（`access.items[]`＝
  郵便番号・住所・最寄り駅・駐車場を可変リスト化）の 3 セクションを個別 enabled 制御、
  表示状況に応じた白／`bg-surface-muted` の自動交互配色（→ 9.4）。
- **`/news`** … カテゴリ絞り込みタブ＋カード／リスト表示切替（クライアント JS。→ 9.4）。
- **`/services`** … サービス詳細の左右反転（`reverseLayout`／`md:order-2`）、料金表の
  「含まれる内容／特徴」チェックリスト（`priceTable[].features`）、項目名左のテーマカラー
  連動バッジ（`showBadge` boolean＋`badgeText` string。どちらも `required: false`、
  boolean は `default: false` を明示して Decap の保存バリデーションエラーを回避）、
  ページ最下部の問い合わせ CTA セクションは廃止（→ 9.4）。
- **お問い合わせフォーム（Web3Forms）** … 送信設定（アクセスキー／`subject`／`from_name`）は
  `contact-form.json` に集約。入力欄は `formFields.<key>` で 表示・ラベル・
  プレースホルダー・必須 を動的制御。カスタム項目（`custom_fields[]`）は「電話番号」の
  直後・「お問い合わせ内容」の直前に挿入。送信成功時はフォーム全体を
  `hidden`＋`display:none` で確実に隠し、`mt-8` の余白を付けた `#contact-success` のみ表示
  （→ 9.7）。
