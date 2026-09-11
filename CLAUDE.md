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

## 4. 型化ページ（実績・活用事例）と「商品一覧」カタログの管理ルール

複数ページ版には、性質の異なる2つの「複数アイテムを並べる」仕組みがある。
新しい一覧・カード機能を追加する際は、どちらのパターンに合うか先に見極めること。

|  | 型化ページ（`works`） | 商品カタログ（`products.yml`） |
|---|---|---|
| 実体 | 1件＝1つの `.md` ファイル（Content Collections） | 1ファイル内の可変リスト（`widget: list`） |
| 個別詳細ページ | あり（`/works/[slug]`） | なし（クリックで画像をライトボックス拡大表示のみ） |
| CMS上の操作 | ファイルの新規作成／削除 | リスト項目のドラッグ並び替え／追加／削除 |
| 用途 | 実績・施工事例など「1件ごとに読み物として見せたい」コンテンツ | 商品・パッケージなど「価格と概要を一覧比較させたい」コンテンツ |

### 型化ページ（`src/content/works/`）＝「実績・活用事例」

- 1実績 = 1つの `.md` ファイル。ファイル名（拡張子除く）がそのまま
  URLスラッグになる（例: `sample.md` → `/works/sample/`）。CMS 上のコレクション名は
  「実績作成（型化ページ）」（旧「実績・活用事例一覧（型化ページ）」／さらに旧
  「商品一覧（型化ページ）」／さらに旧「商品・施工事例」）。旧 `src/content/products/` → `src/content/works/`、
  旧 `src/pages/products/[slug].astro` → `src/pages/works/[slug].astro` に
  改名済み（trailing slug のみ変更、frontmatterスキーマ自体は不変）。
- frontmatterのスキーマは `src/content/config.ts` の `works` で定義されている。
  必須フィールド：`title`, `price`, `mainImage`, `summary`, `specs`, `order`。
- **CMS 起因の型ゆれ対策**：Decap の number ウィジェットは値を空欄にすると
  frontmatter に `price: ""`（空文字）を書き出す。素の `z.number()` だと
  `InvalidContentEntryFrontmatterError`（Expected number, received string）で
  ビルドが落ちるため、`config.ts` の共通ヘルパー `cmsNumberOptional` /
  `cmsNumberWithDefault(fallback)` /  `cmsDateOptional`（`z.preprocess` で
  空文字・null を未入力扱いにし、`"1,000"` のようなカンマ入り文字列も数値化）
  を通して定義すること。新しい数値・日付フィールドを追加する際も同ヘルパーを使う
  （`news` コレクションの `publishedAt` にも同様に適用済み）。
- 型化ページのファイル自体は、機能フラグの状態に関わらず `npm run build` 時に
  常に静的ページとして生成される（直接URLでのアクセス・先行公開プレビュー用）。
  トップページ「実績・活用事例」セクション（`Works.astro`）への導線表示のみが
  `features.enableWorks`（＋実績が1件以上あるか）で制御される。トップページの
  カードは `site.works.count`（既定3件）を先頭から表示し、クリックで
  `/works/[slug]` へ遷移する。

### 商品カタログ（`src/data/products.yml`）＝「商品一覧」

- CMS 上のコレクション名は「商品作成」（`files` コレクション、
  ファイル1件のみ）。実体は型化ページではなく `src/data/products.yml` 内の
  可変リスト `items[]`。パーサ・型は `src/lib/pages.ts` の `productsPage` /
  `ProductItemConfig`。js-yaml でパースするのみで Zod 検証は行わないため、
  各項目は `resolveProductItems()` / `resolveAllProductItems()`
  （`src/lib/pages.ts`）を経由して取得し、商品名が空欄の項目は自動的に除外、
  画像・説明・価格・バッジはそれぞれ未入力なら描画側で非表示にする
  （`typeof price === 'number'` 等のガード）。
- 各項目の `section`（`featured` / `regular` / `both`）で、`/products` ページの
  どちらのセクションに出すかを選ぶ：
  - `featuredHeading`（既定「新商品」）＝横長カード（画像左・テキスト右）。
  - `regularHeading`（既定「通年商品」）＝縦型カード。列数は `regularColumns`
    （既定3、`resolveProductColumns()` で2〜4に丸める。**PC表示（`md:`以上）のみ**
    適用され、Tailwind の JIT が動的クラス名を検出できないため
    `src/styles/global.css` の `.products-grid` ＋ CSS変数 `--products-cols`
    経由で列数を渡している。モバイルは常に1列）。
  - `both` は両方のセクションに表示される。
- **`/products` ページはカードをクリックしても個別ページへ遷移しない**。
  ネイティブ `<dialog id="product-lightbox">` ＋ `showModal()` で、登録画像を
  大きく表示するだけのライトボックスを開く（`getImage()` で事前に1200px幅の
  最適化画像を生成し `data-lightbox-src` に埋め込み、クリック時にJSが
  `<dialog>` 内の `<img src>` を差し替える方式。外部ライブラリ不使用）。
  背景クリック・Escで閉じる。
- トップページ「商品一覧」セクション（`Products.astro`）は `section` を問わず
  登録順の先頭 `site.productsSection.count`（既定4件）を表示し、下部の
  「さらに商品を見る ›」ボタン（`productsSection.linkLabel/linkHref`）で
  `/products` へ誘導する。カード自体はクリックできない（ライトボックスは
  `/products` ページのみ）。

### 機能フラグによるプラン切り替え（`src/data/siteInfo.yml` の `features`）

| フラグ | 用途 |
|---|---|
| `features.enableProducts` | `false`=梅プラン（1ページLPのみ、商品セクション非表示） / `true`=竹・松プラン（トップページに「商品一覧」セクションを表示し、`/products` への導線を出す） |
| `features.enableWorks` | 「実績・活用事例」セクションの表示/非表示（型化ページが1件も無ければ自動的に非表示） |
| `features.enableFaq` | FAQセクションの表示/非表示 |
| `features.enablePlans` | 料金プランセクションの表示/非表示 |

- 梅プランの案件では `enableProducts: false` のまま運用してよい
  （`products.yml` に項目があってもトップページ・`/products` ページ双方が
  参照時に非表示判定するため、削除しなくても影響しない…と言いたいところだが
  `/products` ページ自体は `enableProducts` を見ずに常時静的生成される点に注意。
  完全に隠したい場合はナビ・リンクから `/products` を外すこと）。
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
  `ServicesPagePreview` / `AboutPagePreview` / `ContactPagePreview` / `NewsListPagePreview`
  （お知らせ一覧ページ。見出し・リード文・一覧見出しのみ反映、記事一覧はプレースホルダー
  ＝9.16） / `NewsPreview`（お知らせ記事詳細）/ `SiteSettingsPreview`（デザインテーマ
  設定。編集中の`data.theme`をそのまま`data-theme`に反映するボタン・カード等の
  サンプルに加え、フッター全体は`publishedFooterHtml`を流用＝9.18）も必ず追従
  修正すること。自動同期の仕組みは無いため、変更の都度手動で見比べる必要がある。
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

`public/admin/config.yml` に、既存の「サイト設定」「デザインテーマ設定」を
保持したまま、以下を追加している。コレクションの並び順（＝CMSサイドバーの表示順）は
サイト設定 → **商品作成** → **実績作成（型化ページ）** → 下層ページ → お知らせ。

| コレクション | 種別 | データファイル | 内容 |
|---|---|---|---|
| 商品作成（`name: productsCatalog`、file名 `products`） | files（単一ファイル） | `src/data/products.yml` | 商品カタログの可変リスト（§4参照） |
| 実績作成（型化ページ）（`name: works`） | folder（型化ページ） | `src/content/works/*.md` | タイトル・価格・メイン画像・概要・仕様・本文（§4参照） |
| 下層ページ ＞ サービス内容・料金（`name: services`） | file | `src/data/services.yml` | サービス詳細、料金表、注記 |
| 下層ページ ＞ 会社概要（`name: about`） | file | `src/data/about.yml` | 会社概要、代表挨拶、アクセス情報（`access.items[]` 可変リスト）、「公式SNS」行ラベル |
| 下層ページ ＞ お問い合わせ・ご予約（`name: contact`） | file | `src/data/contactPage.yml` | フォーム案内文、注意事項、プライバシーポリシー |
| 下層ページ ＞ お知らせ一覧ページ（`name: newsPage`） | file | `src/data/newsPage.yml` | `/news` のページ見出し・リード文・一覧セクション見出し（記事自体は下の`news`コレクション） |
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
- **URLスラッグに日本語を含めない**：`news` / `works` の記事・実績タイトルは
  日本語前提のため、ファイル名（＝URL）をタイトルからの自動生成（Decap既定の
  `{{slug}}`）に任せると非ASCII文字入りのURLになってしまう。そのため
  config.yml で `news`: `slug: "{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}"`、
  `works`: `slug: "{{fields.urlSlug}}"` とし、フォームの「URL用識別子
  （半角英数字）」フィールド（`urlSlug`、`pattern: ^[a-z0-9-]+$`）から明示的に
  ファイル名を組み立てる。**フィールド名は `slug` ではなく `urlSlug`**
  にしていることに注意：Astro の Content Collections は frontmatter の
  `slug` キーを「エントリの slug を上書きする予約語」として特別扱いするため、
  `src/content/config.ts` のスキーマに含めると `ContentSchemaContainsSlugError`
  でビルドが落ち、仮にスキーマから外して残しても「年月日を含まないその値だけ」
  が実際のURLになってしまいファイル名と食い違う（詳細は同ファイルのコメント
  参照）。`urlSlug` が空欄のまま保存された場合に備え、`preview.js` に
  `CMS.registerEventListener({ name: 'preSave', ... })` を登録し、`urlSlug`
  フィールドを持つコレクション（コレクション名をハードコードせず
  `data.has('urlSlug')` で判定＝将来同じ仕組みを他のコレクションに
  足しても自動適用される）で空欄ならランダムな識別子を自動採番して
  ファイル名が壊れないようにしている。
  - **既知の落とし穴**：`preSave` ハンドラは Immutable.js の `Map` を
    受け取り、必ず「元の `data`」または `.set()` で更新したものを返す
    こと。`undefined` を返すと `identifier_field` が欠落した扱いになり、
    保存後の画面遷移（「公開して新規作成」「公開して複製する」等）まで
    巻き込んで動かなくなることがある（[decaporg/decap-cms#6775](https://github.com/decaporg/decap-cms/issues/6775)）。
- **Decap CMS のCDNバージョンは明示的に固定**（`public/admin/index.html`
  の `<script src="https://unpkg.com/decap-cms@X.Y.Z/...">`）。unpkg は
  semver 範囲（`^3.0.0` 等）をリクエスト毎に解決するため、範囲指定のままだと
  配信される実体バージョンが無告知で変わり得て再現性が無い。バージョンを
  上げる際は https://github.com/decaporg/decap-cms/releases を確認し、
  この行のバージョンと隣接コメントの日付を両方更新すること。
- **「公開して新規作成」がフォームをリセットしない不具合への補正**：
  `local_backend: true` ＋ `decap-server`（`npm run cms:proxy`）を使った
  実機検証で、既存エントリの編集画面から「公開して新規作成」を実行すると
  git への保存自体は成功するのに Decap 側が `#/collections/<name>/new` への
  ルート遷移を行わず、直前の編集画面のまま留まることを確認した
  （`/new` 画面に既にいる状態から実行した場合はハッシュの変化こそないが、
  同様に Redux 側の入力値がリセットされない）。一方 `/new` へブラウザの
  通常のページ読み込みで直接アクセスすると必ず空欄になることも確認済み。
  「公開して複製する」は複製元の内容を引き継ぐのが仕様どおりの正しい動作
  のため対象外。`public/admin/index.html` に、メニュー項目
  「公開して新規作成」のクリックを検知してコレクション名を控え、
  Decap の `postSave` イベント（保存完了時に発火）を検知した時点で
  `location.hash` を強制的に `#/collections/<name>/new` へ設定して
  `location.reload()` する補正コードを追加している（`public/admin/index.html`
  末尾付近の `<script>` 内、「9) 「公開して新規作成」実行後に...」という
  コメントブロック参照）。Decap のバージョンアップ等で
  この挙動自体が修正された場合も、この補正コードは無害（単に少し余計に
  リロードされるだけ）なので残しておいて問題ない。
- `src/content/news/2026-09-09-sample.md` はサンプル記事。実案件では削除または差し替える。
- **公式SNS**：siteInfo.yml トップレベルの `sns` リスト（CMS「SNS設定」、`{id, url, enabled}`、
  id は `line`/`instagram`/`x`/`facebook`/`youtube`/`tiktok`）に一元化。アイコン定義（SVG パス・
  aria-label）は `src/lib/sns.ts` の `SNS_DEFS`、配色は `SnsIcons.astro` の `SNS_STYLE`
  ＋ `preview.js` の `SNS_STYLE`／`SNS_KNOWN_IDS`。新しい SNS を足すときはこの4箇所と
  `config.yml` の select options に同じ id を追加する。SNSアイコンを掲載する箇所
  （`Access.astro` / `Footer.astro` / `about.astro` の「公式SNS」行 → 共有コンポーネント
  `SnsIcons.astro`）は必ず `src/lib/sns.ts` の `orderedSnsLinks()` 経由でリンク一覧を取得する。
  スマホ下部バーの LINE ボタンは `snsUrl('line')` を参照。`preview.js` は `orderedSnsForPreview()`
  で `data.sns` を同じ判定で読む。
- **画像パスの必須設定**：`works` / `news` の各 folder コレクションには
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
| `/news` | `src/pages/news/index.astro` | `news` コレクション（一覧）＋ `src/lib/pages.ts` `newsPage`（見出し・リード文・一覧見出し） |
| `/news/<slug>` | `src/pages/news/[slug].astro` | `news` コレクション（詳細・静的生成） |
| `/products` | `src/pages/products.astro` | `src/lib/pages.ts` `productsPage`（`src/data/products.yml`。§4参照） |
| `/works/<slug>` | `src/pages/works/[slug].astro` | `works` コレクション（詳細・静的生成。§4参照） |

- 共通パーツ：`Header` / `Footer` / `StickyContactBar` / `BackToTop` に加え、
  下層ページ共通の見出し＋パンくずは **`src/components/PageHeader.astro`**、
  CTAボタンは **`src/components/Button.astro`** を再利用する。
- **Sticky Footer（全ページ共通）**：`Layout.astro` が `<slot>`（各ページの
  `<Header>` / `<main>` / `<Footer>`）を `<div class="layout-shell">` でラップし、
  `src/styles/global.css` で `.layout-shell { display:flex; flex-direction:column;
  min-height:100vh (100dvh) }` ＋ `.layout-shell > main { flex:1 0 auto }` を適用。
  コンテンツが短いページ（例：`/news` でカテゴリ絞り込みして表示件数が減ったとき）でも
  フッターが必ずビューポート最下部に付き、フッター下に地色の白い帯が出ない。
  各ページは `<Header /> <main>…</main> <Footer />` を slot 直下の兄弟として置くこと
  （`<main>` を別 div で包まない）。`position:fixed` の `StickyContactBar` /
  `BackToTop` はフロー外なので影響しない。
- **`/services`（サービス内容・料金）**：
  - セクション見出しは CMS 編集可：`servicesPage.itemsHeading`（サービス詳細一覧の上。
    既定「サービス内容」）／`servicesPage.priceHeading`（料金表の上。既定「料金表」）。
    サービス詳細の各項目タイトルは `<h3>`（セクション `<h2>` の下位）。
  - 「サービス詳細」各項目の `reverseLayout`（boolean）が true のとき、`md:` 以上で
    画像カードに `md:order-2` を付与し「画像：右／テキスト：左」に反転（既定は画像：左。
    スマホ1カラムでは常に画像→テキスト順）。自動交互配置はしない。
  - 「料金表」各行は `note` の下に `features`（`string[]`／`priceTable[].features`）を
    チェックマーク付き箇条書きで表示（サービス詳細・料金プランの features と同じ体裁）。
  - 「料金表」各行の `showBadge`（boolean）が true かつ `badgeText` が非空のとき、
    項目名の左隣に強調バッジ（`bg-primary text-white` の pill。テーマカラー連動）を
    `inline-flex`＋`gap` で表示。PC・スマホとも折り返し対応。
  - 「料金表」各行の `highlight`（boolean）が true のとき、トップページ「料金プラン」の
    人気プランと同様の青枠＋かげ（`border-2 border-primary` ＋ box-shadow）でその行
    だけを強調表示する（`showBadge`＋`badgeText`の「項目名左のバッジ」とは独立した、
    別の強調手段。併用可）。通常時は行同士を `border-t` の区切り線で仕切る単一の
    リスト表示だが、ハイライト行は4辺を自前の枠線で囲むため、区切り線と二重線に
    ならないよう「自分自身または直前の行がハイライトのときは区切り線を出さない」
    判定を入れている（→ 9.15）。
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
- **「サービス・事業内容」（トップページ）** は `siteInfo.yml` の `services`
  （`eyebrow` / `heading` / `linkLabel` / `linkHref` のみ）と、カード個別項目
  （画像・タイトル・説明）は `services.yml`「サービス詳細」（`servicesPage.items`）
  を単一のデータソースとして [Service.astro](src/components/Service.astro) が
  直接参照する（`siteInfo.yml` 側に `services.items` は持たない＝二重管理禁止）。
  `/services` ページと表示順・内容が常に一致する。`preview.js` の
  `renderServices`（サイト設定プレビュー）は別CMSエントリのデータを参照できない
  ため、`products` と同様プレースホルダー表示に留める（実データは
  `ServicesPagePreview` 側で確認する）。
- **「サービス・事業内容」（トップページ）** は `siteInfo.yml` の `services`
  （`eyebrow` / `heading` / `linkLabel` / `linkHref` のみ）と、カード個別項目
  （画像・タイトル・説明）は `services.yml`「サービス詳細」（`servicesPage.items`）
  を単一のデータソースとして [Service.astro](src/components/Service.astro) が
  直接参照する（`siteInfo.yml` 側に `services.items` は持たない＝二重管理禁止）。
  `/services` ページと表示順・内容が常に一致する。`preview.js` の
  `renderServices`（サイト設定プレビュー）は別CMSエントリのデータを参照できない
  ため、`products` と同様プレースホルダー表示に留める（実データは
  `ServicesPagePreview` 側で確認する）。
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
  - **フッター（`Footer.astro`）はテーマカラー連動**：背景 `bg-footer-bg`
    （`--color-footer-bg`、`tailwind.config.mjs` の `colors.footer.bg`）に対し、
    本文・ナビリンク・著作権表記・SNSアイコンはすべて `text-white` の
    **単色**で統一する。`--color-footer-bg` は `--color-primary-dark`
    （ボタン・グラデーション等で使う鮮やかな濃色）とは別の独立変数で、
    同じ色相のまま彩度を落とし明度を下げた「シックなダークトーン」
    （HSLで概ね彩度30%台・明度20%台）を採用している——`primary-dark`を
    そのままフッターのような広い面積に敷くと、特に赤・オレンジ系のテーマで
    圧迫感が出るため（2026-09、9.17参照）。5プリセットいずれの
    `footer-bg` も white とのコントラストが9:1以上になるよう選定済み。
    **透過白（`text-white/80` 等）や中間トーンのグレーは使わない**。
    リンクの押下可能性は色ではなく`hover:underline`（フッターナビ）／
    常時`underline`（プライバシーリンク）で示す。新しいテーマカラーを
    追加する場合も、そのテーマの`--color-footer-bg`をwhiteとのコントラストが
    4.5:1以上になる値で定義すること（`--color-primary-dark`をそのまま
    流用しない）。`preview.js`の`renderFooter`も同じ`bg-footer-bg`クラスに
    すること。
- **画像**：必ず `astro:assets` の `<Image />`（`<img>` 直書き禁止＝絶対ルール②）。
  各ページで**ファーストビューに入る先頭画像1枚だけ** `fetchpriority="high"` +
  `loading="eager"`、それ以外は `loading="lazy"`。`width` / `height` を必ず指定して
  CLS を防ぐ。
  - トップ：`Hero.astro` の背景画像
  - `/services`：サービス詳細の1枚目（`i === 0`）
  - `/about`：代表挨拶の写真
  - `/news`：一覧カードの1枚目（`i === 0`）
  - `/news/<slug>`：アイキャッチ画像
  - `/works/<slug>`：メイン画像
  - `/products`：先頭1枚固定の優先読み込みは無し（全カード `loading="lazy"`。
    横長カード・縦型カードとも複数枚が同時にファーストビュー付近へ並ぶ一覧ページのため）
  - `/contact`：画像なし
- **Googleマップ**：`about.astro` / `Access.astro` の埋め込み `<iframe>` は
  `loading="lazy"`（ファーストビュー外）。重い外部リソースのため、上部には置かない。
- 新しい下層ページ・画像を追加する際も、この「先頭1枚 eager / 残り lazy」ルールと
  システムフォント・外部CDN不使用を必ず踏襲すること。
- 本番URL確定後の PSI 実測は、`https://pagespeed.web.dev/` に各URL
  （`/` `/services` `/about` `/contact` `/news` `/news/<slug>` `/products` `/works/<slug>`）を入力して確認する
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
- **「商品」→「実績」への役割の入れ替え** … 旧・型化ページ `products`
  （1件=1ファイル、竹/松プラン向け）は `works`（実績・活用事例）へ完全に
  改名（`src/content/products/` → `src/content/works/`、
  `/products/[slug]` → `/works/[slug]`）。トップページ「実績・活用事例」
  セクションも旧来の siteInfo.yml 固定リスト（リンク無し）から `works`
  コレクション参照＋個別ページへのリンク付きに変更。空いた「商品一覧」の名前・
  導線は新設の商品カタログ（`src/data/products.yml`、CMS「商品作成」、
  型化ページではなく可変リスト）に割り当て、`/products` ページ（横長「新商品」＋
  縦型「通年商品」の2セクション、画像クリックでライトボックス拡大表示）と
  トップページ「商品一覧」セクションの両方がこれを参照する（→ 4章）。

### 9.9 最近の仕様変更サマリ（2026-09 バッチ・続き）

- **テキストロゴのフォールバック**：`site.company.textLogo`（未入力なら
  `company.name`）／`useTextLogo`（true でロゴ画像より常に優先）。
  `Header.astro` / `Footer.astro` は `!logo || useTextLogo` でテキスト表示に
  切り替える。`preview.js` の `renderHeader` / `renderFooter` も同じ判定。
- **「制作の流れ」の強調ステップ**：`flow.steps[].highlight`（boolean）が
  true のステップだけテーマカラーの背景で強調表示する（旧実装は
  `i === steps.length - 1` で最後の項目に固定していた）。複数 ON も可。
  `Flow.astro` / `preview.js` の `renderFlow` を対応させること。
- **実績・活用事例の拡張**（`Works.astro`）：
  - カードに `work.data.price` があれば `¥xxx〜` を表示。
  - トップページに表示する並び順は `site.works.order`（CMS「表示順序」＝
    `widget: list` ＋ 各項目 `widget: relation`（`collection: works`,
    `value_field: "{{slug}}"`, `display_fields: ["title"]`）でドラッグ&ドロップ
    並び替え）を優先し、そこに無い実績は `order`（数値フィールド）→
    登録順で後ろに続く。**Decap の folder コレクション自体はドラッグ&ドロップ
    並び替えに対応していない**ため、「並び順だけを別途 `relation` の
    `list` として siteInfo 側に持つ」のがこのテンプレートでの標準パターン。
    型化ページの並び順を CMS でドラッグ操作にしたい場合は今後もこの構成
    （siteInfo.yml 側に `order: list<relation>` を足し、コンポーネント側で
    「order リストにある分＋残りは数値 order でフォールバック」の二段構え
    でソートする）を踏襲すること。
  - PC表示の並列カード枚数は `site.works.columns`（1〜3、既定3）。表示件数が
    2件以上ある場合は常に矢印ボタンをマークアップに含め、実際に
    オーバーフローしているか（`scrollWidth > clientWidth`）をクライアント
    JS で判定して表示/非表示・有効/無効を切り替える（PCで列数以下なら
    非表示、スマホは1枚表示のため2件以上あれば常に表示、という非対称な
    条件を、SSR側で分岐せずクライアント側の実測1本に統一するため）。
  - スライダー本体は Swiper 等の外部ライブラリを使わず、CSS
    `scroll-snap-type: x mandatory` ＋ 矢印クリック時の `scrollBy({behavior:
    'smooth'})` によるネイティブ実装（`global.css` の `.works-track`、
    列数は `.products-grid` と同じ理由で CSS変数 `--works-cols` 経由）。
    外部CDN不使用の既存方針（9.6）を維持するため。スマホのフリックは
    ブラウザ標準のタッチスクロールがそのまま機能する。
- **商品作成のラベル変更**：CMS上の表記を「目立たせたい商品」→
  「上段掲載商品」、「そうではない商品」→「下段掲載商品」に統一
  （`section` の値 `featured`/`regular` 自体は変更していない。既存データ
  互換のため）。`/products` ページの「※PC表示時の目安列数です」の注釈は
  ページ本文からは削除（CMS側のフィールドヒントには残している）。
- **`/services` サービス詳細への強調バッジ**：`services.yml` の
  `items[].badgeText`（文字列のみ、ON/OFFトグルは無し＝入力があれば表示）。
  サービス名の左隣にテーマカラーの pill バッジを表示。料金表側の
  `showBadge`＋`badgeText`（2フィールド）とは異なる、より単純な1フィールド
  方式であることに注意（用途に応じてどちらのパターンでも良いが、混在させる
  場合はこの差異を意識すること）。

### 9.10 管理画面クイックナビ（左下メニューアイコン）のスクロール修正（2026-09）

- **不具合**：「サイト全体設定」等で左下のクイックナビ（`#cms-quick-nav-btn` /
  `#cms-quick-nav-menu`）から項目をクリックしても、PC幅（800px以上）では
  該当セクションへスクロールしなかった。
- **原因**：クリック時の実スクロール処理 `scrollToElement()` が呼ぶ
  `findScrollContainer()` の候補判定が「`scrollHeight - clientHeight > 4`
  （＝多少でもオーバーフローしていればスクロール可能とみなす）」だけだった
  ため、PC幅で実際にスクロールしているのは `[class*="ControlPaneContainer"]`
  （`overflow-y: auto`）なのに、候補の先頭にあった
  `[class*="EditorContainer"]`（PC幅では常に `overflow-y: hidden` かつ
  ツールバー領域の丸め誤差等で数十px程度の見せかけのオーバーフローを持つ）
  が先にマッチしてしまい、そちらの `scrollTop` を書き換えていた
  （`overflow-y: hidden` 自体はスマホ幅の自前スクロール実装
  （9.7 参照）の要となる正しい仕様のため、要素自体は変更していない）。
  スマホ幅（799px以下）では逆に `[class*="ControlPaneContainer"]` 側が
  ドロップダウン用に `overflow: visible !important`（7章・9.4 参照）で
  上書きされているため、`EditorContainer` を対象にするのが正しい。
- **修正**：`findScrollContainer()`（`public/admin/index.html`）の候補に
  `[class*="ControlPaneContainer"]` を `EditorContainer` より先に追加し、
  各候補について `getComputedStyle(el).overflowY === 'visible'` の場合は
  スキップするチェックを追加した（`overflow-y: visible` の要素は
  `scrollTop` を書き換えても視覚的に一切動かないため）。これにより
  PC幅では `ControlPaneContainer`（唯一 `overflow-y: auto` で条件を満たす）、
  スマホ幅では `EditorContainer`（`ControlPaneContainer` は
  `overflow-y: visible` でスキップされる）が、それぞれ正しく選ばれる。
  スクロール自体のアニメーション（`animateScrollTop()`、`setInterval` による
  自前イージング）や `scrollToElement()` の呼び出し側は変更していない。
  ローカル環境（`npm run dev` + `npm run cms:proxy`）でPC幅・スマホ幅の
  両方について、クリック後に対象コンテナの `scrollTop` が実際に変化し、
  該当セクションが画面上部に表示されることを確認済み。

### 9.11 トップページ「サービス内容」「商品一覧」のスマホ用スライダー化（2026-09）

- **要件**：スマホ幅（640px未満）に限り、「実績・活用事例」（Works.astro）と
  同様に1枚ずつのカード表示＋矢印クリック／スワイプで切り替えるスライダーに
  する。sm以上（PC・タブレット）では従来の `sm:grid-cols-2 lg:grid-cols-4`
  グリッドをそのまま維持する（Worksと異なり、PC側はスライダー化しない）。
- **実装**：`Service.astro` / `Products.astro` 共通で、カードのラッパーに
  `global.css` の component クラス `.card-slider-mobile` を付与し、
  矢印クリック・スクロール位置に応じた有効/無効切り替えは共通スクリプト
  `src/scripts/cardSlider.ts`（`data-slider-track` を持つ要素を
  `document.querySelectorAll` で一括初期化）に集約した。マークアップは
  `<div data-slider-root>` の中に `<div data-slider-track class="card-slider-mobile grid sm:grid-cols-2 lg:grid-cols-4 gap-5">…カード…</div>`
  ＋矢印ボタン（`data-slider-prev` / `data-slider-next`、`sm:hidden` で
  PC・タブレットでは非表示）を並べる構成。
  - `.card-slider-mobile` は `grid-auto-flow: column` ＋
    `grid-auto-columns: 100%` でスマホ幅を横スクロール＋スナップの
    1枚送りにし、sm以上では `grid-auto-flow: row` に戻すことで
    Tailwindの `sm:grid-cols-2 lg:grid-cols-4` がそのまま効く通常の
    グリッドに戻す（詳細・落とし穴は `global.css` の該当コメント参照）。
  - ⚠️ **マークアップに `grid-cols-1` を付けてはいけない**：明示的な
    `1fr` トラック（Tailwindの `grid-cols-1`）と暗黙トラックの
    `grid-auto-columns: 100%` が同じ行に混在すると、Grid のトラック
    サイジング計算上、暗黙トラック側が先にコンテナ幅の100%を要求して
    しまい、`1fr` の明示トラック（＝先頭カード）だけが幅ほぼ0まで
    潰れる不具合を実機検証で確認した（2枚目以降は正常、1枚目だけ
    極端に細くなる）。スマホ幅では `grid-template-columns` を
    指定せず、`grid-auto-columns: 100%` だけでサイズを揃えること。
  - `cardSlider.ts` は「実績・活用事例」（Works.astro）のスライダー
    ロジックと同じ考え方（矢印クリックで `scrollBy({behavior:'smooth'})`、
    `scroll` イベントで `scrollWidth > clientWidth` を実測して矢印の
    表示/無効を切り替え）だが、複数セクションで共有するため
    `[data-slider-track]` を持つ要素を汎用的に初期化する実装にしている。
    新しいセクションでも同じスライダーにしたい場合は、同じ
    `data-slider-root` / `data-slider-track` / `data-slider-prev` /
    `data-slider-next` の構成にすれば `cardSlider.ts` の読み込み
    （`<script>import '../scripts/cardSlider.ts'</script>`）だけで動く。
  - `preview.js` 側（`renderServices` / `renderProductsPlaceholder`）は
    どちらも「別CMSエントリのデータのため実データを描画できない」
    プレースホルダー表示に留まっており、実際のカードグリッドを
    再現していないため、この変更に伴う追従修正は不要（9.4参照）。

### 9.12 「サイト全体設定 ＞ 連絡先」データの参照箇所（2026-09 調査、9.13で構成変更）

`siteInfo.yml` の `contact:`（CMS「サイト全体設定 ＞ 連絡先」）を実際に
参照している箇所を全数調査した（`grep -rn "site\.contact\."` で確認済み）。
**住所・郵便番号・最寄り駅・営業時間・定休日・駐車場は「連絡先」ではなく
別オブジェクトの `site.access.store`（CMS「アクセス」）が持つ**ため
混同しないこと（"連絡先"の管轄は電話・メール・LINE導線のみ）。
※ 調査時点では `phoneLabel` / `lineLabel` / `showPhoneButton` /
`showLineButton` も `contact` 配下にあったが、9.13で「画面下部固定バー」
という別オブジェクトへ切り出した。以下は現在の構成（`contact` は
`phone`/`phoneHref`/`email`の3フィールドのみ）を反映済み。

| ファイル | 参照フィールド | 用途 |
|---|---|---|
| `src/components/StickyContactBar.astro` | `phone` / `phoneHref`（ボタン文言・表示トグルは `site.stickyContactBar`、9.13参照） | 全ページ共通・スマホ専用の画面下部固定バー（`md:hidden`）の「お電話」ボタンのリンク先。LINEのURL自体は`site.contact`ではなく`orderedSnsLinks`/`snsUrl('line')`（SNS設定）から取得 |
| `src/components/Access.astro` | `phone` / `phoneHref` | トップページ「アクセス」セクションの情報一覧（`dl`）に「電話番号」の行として、`site.access.labels.phone`ラベルと組み合わせて表示（住所等の他の行はすべて`site.access.store`由来） |
| `src/pages/privacy.astro` | `phone` / `phoneHref` / `email` | プライバシーポリシー「第1条（事業者情報）」の「連絡先」行（電話番号・メールアドレスの両方またはどちらか一方があれば表示、`mailto:`リンク付き） |
| `src/pages/llms.txt.ts` | `phone` / `email` | ビルド時生成される`/llms.txt`（[llmstxt.org](https://llmstxt.org/)準拠、LLMクローラー向け）の「会社情報」欄に「電話番号」「メールアドレス」の行として出力 |

補足：
- `public/admin/preview.js` は `renderAccess`（`data.contact.phone` /
  `data.contact.phoneHref`）のみが対応箇所で、`Access.astro`の実装と一致
  させている（他の3ファイルはCMSライブプレビュー対象外のページ・
  生成物のため、preview.js側の対応箇所自体が存在しない）。
- `Header.astro` / `Footer.astro` / `Contact.astro`（トップページ`#contact`
  セクション）/ `src/pages/contact.astro` は `site.contact` を一切参照
  しない（`contact.astro`は`StickyContactBar`を経由して間接的に表示
  されるのみで、フォーム自体は`contactPage.yml`・`contactFormSettings`
  が情報源）。
- `src/pages/llms.txt.ts` はCLAUDE.mdに記載がなかった既存ファイル
  （今回の調査で判明）。`/llms.txt`をビルド時に動的生成する独立した
  APIルートで、`site.contact.phone` / `site.contact.email` を含む
  会社情報を素の値のまま出力する（未入力時は`undefined`文字列が
  出力される点に注意。将来手を入れる際は空値ガードの追加を検討）。

### 9.13 「画面下部固定バー」セクションの独立（2026-09）

- **変更内容**：「サイト全体設定 ＞ 連絡先」に混在していた4項目
  （「お電話」「LINEで相談」の各ボタン文言 `phoneLabel`/`lineLabel`、
  各表示トグル `showPhoneButton`/`showLineButton`）を、独立した新規
  セクション「画面下部固定バー」（`siteInfo.yml` の `stickyContactBar:`、
  `config.yml` の `name: "stickyContactBar"`）へ切り出した。
  配置は「フッターナビゲーション」（`footerNav`）の直後（`config.yml`・
  `siteInfo.yml` 両方でこの順序を維持。当時は直後に「共通アイコン」
  （`icons`）セクションもあったが、9.19で唯一のフィールド`icons.check`
  が不要になり削除されたため、現在は「画面下部固定バー」の次は
  「コピーライト表記」になっている）。
  「連絡先」（`contact:`）には `phone` / `phoneHref` / `email` の3項目
  （電話番号・メールアドレスそのもの）のみが残る。
- **狙い**：「連絡先」という名前から連想しにくい「画面下部固定バー
  （スマホのみ表示されるUIパーツ）」の表示制御項目が混在していたため、
  UI要素としての性質で切り分けて分かりやすくした。電話番号・メール
  アドレス自体（実データ）と、それをスマホ下部バーでどう見せるか
  （文言・ON/OFF）という関心事の分離でもある。
- **実装**：
  - `public/admin/config.yml`：「連絡先」オブジェクトから4フィールドを
    削除し、`phone`/`phoneHref`/`email`のみに縮小。新規オブジェクト
    「画面下部固定バー」（`name: "stickyContactBar"`）を
    「フッターナビゲーション」の直後に追加し、そこへ4フィールドを
    移設（ヒントテキストも「スマホ下部固定バー」という重複した
    接頭辞を削除して整理）。
  - `src/data/siteInfo.yml`：`contact:` から4項目を削除、`footerNav:`
    の直後に `stickyContactBar:` ブロックを新設。
  - `src/lib/site.ts`：`SiteInfo.contact` 型から4フィールドを削除し、
    `SiteInfo.stickyContactBar`（`phoneLabel`/`lineLabel`/
    `showPhoneButton`/`showLineButton`）を`footerNav`と`icons`の間に追加。
  - `src/components/StickyContactBar.astro`：`site.contact.phoneLabel`
    等の4参照を `site.stickyContactBar.*` に変更（`phone`/`phoneHref`は
    引き続き`site.contact`を参照＝実データはそのまま「連絡先」由来）。
  - `public/admin/preview.js`：この4フィールドはどの `render*()` 関数
    からも参照されていなかった（`StickyContactBar`自体がCMSプレビュー
    対象外のため）ため、追従修正は不要だった。
  - 移動元・移動先の両方で `grep` により旧参照（`contact.phoneLabel` 等）
    が残っていないことを確認済み。

### 9.14 トップページ「料金プラン」のスマホ用スライダー化（2026-09）

- **要件**：「サービス内容」「商品一覧」（9.11）と同じ方式で、スマホ幅
  （640px未満）のみ1枚送りスライダー化。sm以上（PC・タブレット）は
  従来の `lg:grid-cols-3` グリッドを維持する。
- **実装**：`Plans.astro` のカードラッパーに `.card-slider-mobile`
  （9.11で追加したcomponentクラス）を付与し、矢印・スクロール実測による
  表示/無効切り替えは共通の `src/scripts/cardSlider.ts` をそのまま再利用
  （`data-slider-root` / `data-slider-track` / `data-slider-prev` /
  `data-slider-next` の構成に合わせるだけで済んだ）。
  マークアップは9.11の落とし穴を踏まえ、当初から明示的な `grid-cols-1`
  を付けずに `card-slider-mobile grid lg:grid-cols-3 gap-6 items-stretch`
  としている（Plansはそもそも`sm:grid-cols-2`を持たず`lg:`まで単列
  スタックだったため、sm〜lg間の見た目は変更前後で変わらない）。
- **`preview.js`の追従**：`renderPlans`（siteInfo プレビュー）は
  「サービス内容」「商品一覧」と異なり `data.plans.items` を使って
  実データのグリッドをそのまま描画しているため（別CMSエントリ参照では
  ない）、ここは対応が必要だった。グリッドの className を実サイトと
  一致する `card-slider-mobile grid lg:grid-cols-3 gap-6 items-stretch`
  に変更（プレビューiframeは常にPC相当の幅で表示されるため、矢印ボタン
  のJSは移植していない。幅を絞ってもscroll-snapで横スクロール自体は
  可能）。
- ローカル環境でモバイル幅（1枚表示・矢印の有効/無効切り替え・
  `StickyContactBar`の新データ参照）・PC幅（3列グリッド・矢印非表示・
  overflow無し）の両方をDOM実測で検証済み。

### 9.15 管理画面UI改善・スマホ表示不具合修正・料金表ハイライト追加（2026-09）

- **管理画面：編集フォーム最下部の余白**：`public/admin/index.html` に
  `[class*='ControlPaneContainer'] { padding-bottom: 90px !important; }`
  を追加（画面幅を問わず1箇所で完結、9.10の`findScrollContainer()`と同じ
  理由でPC幅・スマホ幅どちらのスクロール実装にも効く）。クイックナビ
  （`#cms-quick-nav-btn`）は常に画面下部に`position:fixed`で重なって
  表示されるため、余白がゼロだとフォーム最後の項目がボタンの下に隠れて
  操作できなくなる不具合があった。
  **`!important`が必須**：Decap本体（emotion）が同じクラスへ動的に
  独自スタイル（`padding-bottom`含む）を注入しており、その`<style>`は
  このファイルの静的な`<style>`より後にDOM挿入されるため、同じ詳細度
  では後勝ちでこちらの指定が無視されてしまうことを実機検証で確認した
  （`!important`を付けて初めて反映された。このファイル内の他の
  上書きルールが軒並み`!important`を使っているのと同じ理由）。
- **`/products`ページ「下段掲載商品」カードの価格下余白**：`src/pages/products.astro`
  の該当カードから `aspect-square`（スマホ幅で強制していた正方形の
  アスペクト比）と、テキスト領域の `flex-1` を削除。スマホ幅は1列表示
  （同じ行で高さを揃える必要がない）にも関わらず正方形に固定していた
  ため、説明文が短い項目で「価格〜カード底辺」間に本来の`py-4`（16px）
  を大きく超える余白（実測33px）ができていた不具合を解消（高さを
  コンテンツに応じた自然な値に任せることで実測17px＝ほぼ`py-4`ぴったり
  まで縮小）。`public/admin/preview.js` の `ProductsCatalogPreview`
  （`renderProductCardPreview`のregular分岐）も同じ理由で追従修正。
  ※ Works.astro/Service.astro/Products.astro（トップページ）等、他の
  「aspect-squareで正方形に揃える」カードは対象外（複数列・スライダー
  で高さを揃える必要があるため、意図した仕様のまま変更していない）。
- **「下層ページ ＞ サービス内容・料金」料金表への強調表示（ハイライト）**：
  `priceTable[]`に新フィールド`highlight`（boolean、既定false）を追加
  （`config.yml` / `src/lib/pages.ts` の `ServicesPage.priceTable[].highlight`）。
  ONの行は`services.astro`側で`border-2 border-primary`＋box-shadow
  （トップページ「料金プラン」の人気プランと同じ配色・かげ）を適用し、
  4辺を自前の枠線で囲む。既存の`showBadge`＋`badgeText`（項目名左の
  小さいバッジ）とは独立した別の強調手段で、併用可能。通常行は
  `border-t`の区切り線で仕切る単一リスト表示のため、ハイライト行の
  前後で区切り線と二重線にならないよう「自分自身または直前の行が
  ハイライトのときは区切り線を出さない」判定を追加。`preview.js`の
  `ServicesPagePreview`（価格表部分）も同じロジックで追従。
- **「サイト全体設定 ＞ 連絡先」への注釈追加**：`config.yml`の`contact`
  オブジェクトに`hint`を追加し、この項目の入力内容が反映される箇所
  （トップページ「アクセス」、プライバシーポリシー「事業者情報」、
  `/llms.txt`）と、紛らわしい「画面下部固定バー」（9.13で分離済み）が
  別セクションであることを管理画面上で明示（9.12の調査結果をそのまま
  ユーザー向け注釈文に転記）。
- **トップページ「料金プラン」スマホ表示：人気バッジの見切れ修正**：
  9.14のスライダー化で`.card-slider-mobile`の`overflow-x:auto`を
  適用した際、CSS仕様上「`overflow-x`が`visible`以外だと`overflow-y`も
  自動的に`auto`扱いになる」（`overflow-x:auto`と`overflow-y:visible`は
  共存できない）ため、人気プランの「人気No.1」バッジ（`absolute
  -top-[14px]`でカード上端よりさらに上へはみ出す配置）の上半分が
  スクロールコンテナの上端でクリップされる不具合が発生していた
  （実機検証で`overflow-y: auto`が実際に計算されていることを確認）。
  `Plans.astro`のtrack要素（`data-slider-track`）に`pt-6 sm:pt-0`
  （スマホ幅のみ24pxの上余白）を追加し、バッジのはみ出し分をコンテナの
  パディング領域内に収めることでクリップを回避。矢印ボタンは track の
  高さが24px増えた分、素の`top-1/2`のままだと視覚上の中心が実際の
  カードの中心より12px上にずれるため、`top-[calc(50%+12px)]`で補正
  （`sm:hidden`のため見た目に影響するのはスマホ幅のみ）。実機検証で
  バッジがコンテナ上端から12px内側（＝クリップなし）に収まることを
  確認済み。`preview.js`の`renderPlans`はプレビューiframeが常にPC相当
  幅（`sm:pt-0`が効く）のため実質的に影響しないが、グリッドclassNameの
  厳密な一致のため`pt-6 sm:pt-0`を同様に追加した。

### 9.16 「お知らせ」ページのUI改善・全スライダーへのドットインジケーター追加（2026-09）

- **「お知らせ」ページ（`/news`）の見出し・リード文**：新規データファイル
  `src/data/newsPage.yml`（`heading` / `lead` / `listHeading`、パーサは
  `src/lib/pages.ts` の `NewsPage` 型 / `newsPage`）を追加し、CMS「下層ページ
  ＞ お知らせ一覧ページ」（`config.yml` の `name: "newsPage"`。既存の記事
  投稿用コレクション`name: "news"`とは別物）で編集できるようにした。
  `heading`は`PageHeader`の`title`、`lead`はその直下のリード文、
  `listHeading`（既定「お知らせ一覧」）はカテゴリ絞り込み・記事一覧の
  直前に表示する`<h2>`（`/services`の`itemsHeading`と同じパターン）。
  以前は`heading`がコンポーネントに直書きされていた（絶対ルール①違反）ため、
  今回あわせてCMS化した。プレビューは`NewsListPagePreview`を新規追加
  （記事一覧自体は別コレクション参照のためプレースホルダー、9.4/7章参照）。
- **表示切替トグルへのアイコン追加**：「カード」「リスト」の各ボタン文頭に、
  グリッド4マス／横線3本のインラインSVGアイコンを追加（`currentColor`で
  テキスト色に追従、外部アイコンライブラリ不使用の既存方針を踏襲）。
- **カテゴリ絞り込みUIの改善**：ボタン列の先頭に「カテゴリで絞り込む：」
  ラベルを追加。アクティブなカテゴリボタンには、既存の
  `bg-primary text-white border-primary`に加えて薄いテーマカラーの
  発光状box-shadow（`shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.18)]`）
  を追加し、非アクティブとの区別を強化（JS側の`FILTER_ACTIVE`配列にも
  同じクラス文字列を追加し、クリック時の付け外しに追従）。
- **全カルーセル／スライダーへのドットインジケーター追加**：
  「実績・活用事例」「サービス内容」「商品一覧」「料金プラン」の
  4スライダーすべてに、現在位置を示すドット（アクティブ＝
  `bg-primary`＋横長`w-5`のピル形状、非アクティブ＝`bg-surface-border`の
  `w-2`丸）を追加。共通スクリプト`src/scripts/cardSlider.ts`に
  `updateDots()`を追加し、`[data-slider-dots]`配下の`[data-slider-dot]`
  ボタン群を、track のスクロール位置（`Math.round(scrollLeft / step())`）
  に応じて動的にハイライト、クリックで対応するカードへ`scrollTo`する
  汎用実装にした（1アイテム＝1ドット。複数列表示中のWorksも列数ではなく
  アイテム数分のドットを表示する仕様）。
  - **マークアップ規約の変更**：ドットコンテナ（`[data-slider-dots]`）は
    矢印ボタンとは異なり、`data-slider-root`（`.relative`な矢印用ラッパー）
    の**中ではなく外の兄弟要素**として置く（`isSlider && (...)` ブロックを
    `data-slider-root`の`</div>`の後に続けて記述）。矢印の`top-1/2`系の
    センタリング計算が `data-slider-root` 自身の高さ＝track の高さを
    前提にしているため（9.14〜9.15でPlansの`pt-6`とセットで調整した
    `top-[calc(50%+12px)]`等）、ドット行をroot内部に混ぜるとroot自身の
    高さにドット分の高さが加算されてこの計算が狂う。`cardSlider.ts`側は
    `root.querySelector('[data-slider-dots]')`で見つからない場合
    `root.parentElement?.querySelector(...)`にフォールバックする実装に
    しており、新しいセクションでスライダーを組む際もこの「dotsは
    root の外」の配置を踏襲すること。
  - **Works.astroの共通スクリプトへの移行**：これまでWorks.astroだけ
    `works-track`/`works-prev`/`works-next`という固有IDを使った専用の
    インラインスクリプトを持っていたが、ドット機構を1箇所に集約する
    ため、他の3スライダーと同じ`data-slider-root`/`data-slider-track`/
    `data-slider-prev`/`data-slider-next`/`data-slider-dots`の構成に
    揃えて`cardSlider.ts`を読み込む方式に統一した（IDベースの専用
    ロジックは削除）。Works固有の挙動（列数超過時はPC幅でもスライダー
    のまま＝`sm:hidden`等の幅指定をしない）は、ドット・矢印のCSSクラス
    側でそのまま維持しており、`cardSlider.ts`のロジック自体は完全に
    共通のまま変更していない。
  - 各`renderProductsPlaceholder`/`renderServices`（siteInfo プレビュー）・
    `ServicesPagePreview`/`ProductsCatalogPreview`（別エントリの実データ
    グリッド）はいずれもドット・矢印のJSを持たない静的マークアップの
    ため、ドット追加に伴う`preview.js`側の追従修正は不要だった
    （`renderPlans`のみグリッドclassNameの厳密一致のため軽微な追随を
    行っているが、ドット自体は追加していない＝プレビューiframeは常時
    PC相当幅で`sm:hidden`により最初から不可視のため）。
  - **検証上の注意**：この環境（Claude Browser pane）では
    `requestAnimationFrame`のコールバックが実行されないことを実機検証で
    新たに確認した（タブをフロントにして2秒待っても`window.__rafFired`が
    `false`のまま）。ドットのアクティブ切り替えは`scroll`イベント→`rAF`
    でスロットルする実装のため、この環境では見た目の同期を直接確認できない。
    実装の正しさは、(a) `scrollTo`呼び出しの引数を関数差し替えで
    フックしクリック時に正しい座標（`step() * index`）が渡っていること、
    (b) `Math.round(scrollLeft / step())`の計算結果が実際のスクロール位置
    から正しいインデックスを導出すること、(c) `scroll`イベント自体は
    正常に発火すること、の3点をDOM操作で個別に確認する形で担保した
    （スムーズスクロールアニメーション自体が完了しない既知の環境制限
    ＝本章より前の複数のタスクで既出、と根は同じ）。
    ※ (b)の`Math.round(scrollLeft / step())`という判定式自体は、
    9.17でPC幅の複数列表示スライダーに対応する式へ修正されている
    （このセクションは修正前の実装として記録を残す）。

### 9.17 ドットインジケーターのPC複数列表示バグ修正・デザイン簡素化／フッター配色調整／「サービス内容」PCレイアウト変更（2026-09）

- **ドットインジケーターのアクティブ位置バグ修正**：9.16で実装した
  `updateDots()`の`Math.round(scrollLeft / step())`は、1画面に1枚だけ
  表示されるスライダー（サービス内容／商品一覧／料金プラン）では
  正しく機能するが、1画面に複数枚（列数分）同時表示される「実績・
  活用事例」のPC幅では、最後までスクロールしてもこの式が算出する
  インデックスがドット数の中央付近にしかならず、最後のドットが
  永遠にアクティブにならない不具合があった（例：5件・PC3列表示では
  最大`scrollLeft`が「アイテム2個分強」にしかならないため、
  `scrollLeft / step()`は最大でも約2にしかならず、5個中5番目
  （index 4）のドットに到達できない）。
  修正：「スクロール可能な全区間に対する現在位置の割合（0〜1）」を
  ドット数の範囲（0〜dots.length-1）に線形マッピングする方式
  （`Math.round((scrollLeft / (scrollWidth - clientWidth)) * (dots.length - 1))`）
  に変更。1画面に1枚だけのスライダーでは末尾アイテムの`scrollLeft`が
  必ず`scrollWidth - clientWidth`と一致するため、この新しい式は
  旧式と数学的に等価（挙動は変わらない）。実機検証でPC幅の
  「実績・活用事例」（5件・3列）について、スクロール位置
  0/187/374/561/749px（＝maxScrollを4等分した各点）に対し
  ドットindexが0/1/2/3/4と正しく線形に進むことを確認済み。
- **ドットデザインの簡素化**：アクティブ時にサイズを変える演出
  （`w-2`→`w-5`のピル形状）を廃止し、常に同じ大きさ（`w-2 h-2`固定）を
  保った上で、アクティブ／非アクティブの区別は背景色（`bg-primary` /
  `bg-surface-border`）の切り替えのみにした。`cardSlider.ts`の
  `DOT_ACTIVE`/`DOT_INACTIVE`（クラス名の配列）を
  `DOT_ACTIVE_CLASS`/`DOT_INACTIVE_CLASS`（単一のbg-*クラス文字列）に
  簡素化し、4コンポーネント（Works/Service/Products/Plans）のドット
  マークアップの`transition-all`も`transition-colors`に修正（サイズが
  変化しなくなったため）。
- **フッター背景色をテーマカラーごとに調整**：`--color-primary-dark`
  （ボタン・グラデーション等の鮮やかな濃色）をそのままフッターの
  背景に使うと、特に赤・オレンジ系のテーマで彩度が高すぎて広い面積に
  敷いたときに圧迫感が出るため、独立した新変数`--color-footer-bg`
  （`tailwind.config.mjs`の`colors.footer.bg`、`bg-footer-bg`
  ユーティリティ）を追加。各テーマの`--color-primary`と同じ色相を
  保ったまま、HSLで彩度を34%・明度を23%程度まで落とした「シックな
  ダークトーン」を5プリセット分定義した（blue:`#27314f` /
  red:`#4f2727` / green:`#274f36` / purple:`#36274f` /
  orange:`#4f3227`）。white文字とのコントラスト比はいずれも9:1以上
  （WCAG AA基準4.5:1を大きく上回る）。`--color-primary-dark`自体は
  他の用途（ボタン・グラデーション等）にそのまま使われ続けるため
  変更していない。`Footer.astro`・`preview.js`の`renderFooter`の両方を
  `bg-primary-dark`から`bg-footer-bg`に変更。実機検証でテーマ「red」
  適用時、フッター背景が`rgb(79,39,39)`（`#4f2727`）になっていること、
  ボタン等の`primary-dark`（`#b91c1c`）とは別の落ち着いたトーンに
  なっていることを確認済み。
  ⚠️ Tailwindの設定ファイル（`tailwind.config.mjs`）を変更した際は、
  Viteの通常のHMRでは新しいユーティリティクラスが反映されないことが
  実機検証で判明した（`bg-footer-bg`のCSSルール自体が生成されず
  透明のままになった）。開発サーバーの**再起動**が必要（`npm run build`
  の単発ビルドでは初回から正しく反映されるため、本番ビルド・
  デプロイには影響しない）。
- **トップページ「サービス内容」PCレイアウトの変更**：`Service.astro`の
  カードグリッドを、PC・タブレット幅で常に列数を増やす方式
  （`sm:grid-cols-2 lg:grid-cols-4`）から、md以上（768px〜）固定の
  2列グリッド（`md:grid-cols-2`。現状4件のサービスなら2列×2行になる）
  に変更。各カードもmd以上で`flex-row`に切り替え、画像を左側
  （幅38%、`md:h-full`でカード全高に合わせて`object-cover`）、
  右側にバッジ（`item.badgeText`。従来このトップページカードには
  無かった表示で、`/services`ページの詳細カードと同様の表示に
  今回揃えた）＋タイトル＋説明を縦中央寄せ（`md:justify-center`）で
  配置する横長カードにした。
  - **640〜767px（sm相当のタブレット幅）の中間表示**：
    `.card-slider-mobile`のスライダー解除自体が640pxで起きる
    （9.11参照）ため、カード側のアスペクト比の強制（`aspect-square`）
    も同じ640px（`sm:aspect-auto`）で解除し、768px未満で不自然な
    正方形の巨大カードにならないようにしている。この幅では
    「1列・縦積み・画像は16:9で幅に応じた自然な高さ」という
    素直な中間状態になる（`md:flex-row`はまだ効かない）。実機検証で
    700px幅について、1列表示・`flex-direction:column`・
    `aspect-ratio:auto`・画像がaspect-video相当の高さになることを
    確認済み。
  - スマホ幅（640px未満）のスライダー仕様（1枚表示・矢印／ドット／
    スワイプ）は一切変更していない。
  - `preview.js`の`renderServices`（siteInfoプレビュー）はプレース
    ホルダーのみで実際のカードグリッドを描画しないため（9.11参照）、
    今回のレイアウト変更に伴う追従修正は不要だった。

### 9.18 「デザインテーマ設定」プレビューへのフッター実表示追加（2026-09）

- **要件**：管理画面「デザインテーマ設定」でテーマカラーを変更した際、
  右側プレビューでフッター全体（背景色・ナビリンク・SNSアイコン・
  著作権表記）の配色変化も即座に確認できるようにする。
- **実装**：`SiteSettingsPreview`（`public/admin/preview.js`）に、
  既存のボタン／カードのサンプル表示に加えて、`publishedFooterHtml`
  （本番`/`から取得した公開済みフッターの実HTML。下層ページ系
  プレビューの`pagePreviewShell`が使っているのと同じ変数、7章参照）を
  そのまま挿入した。`Footer.astro`をJSで再実装するのではなく、
  実際にビルドされたHTMLをそのまま流用する方式（productsや下層
  ページのヘッダー・フッターと同じ考え方）。
  - **色連動の仕組み**：フッターのHTML自体は`data-theme`属性を
    持たず、色はすべて`bg-footer-bg`等のTailwindクラス（実体は
    `var(--color-footer-bg)`等のCSS変数参照）で決まる。この
    `publishedFooterHtml`を、`SiteSettingsPreview`が既に持っていた
    「編集中の`data.theme`を`data-theme`に反映する`<div>`」の
    **子要素として**挿入するだけで、CSS変数はその祖先の`data-theme`を
    基準に再解決される。`publishedFooterHtml`自体は「公開時点の
    テーマ」で生成された静的HTMLだが、色の実体はすべてCSS変数経由の
    クラス名でありHTML側に色の実値は焼き込まれていないため、
    編集中の（未保存の）テーマ変更にそのまま追従する。`pagePreviewShell`
    が使う`currentTheme`（公開済みテーマの固定値）とは異なり、こちらは
    `data.theme`（今まさに編集中の値）を使う点に注意。
  - **初回マウント時の空白対策**：`publishedFooterHtml`は
    `loadSiteStylesheetAndTheme()`の非同期fetch完了後にしか埋まらない
    ため、`SiteSettingsPreview`にも`makePagePreview`と同じ
    `componentDidMount`（`stylesReady.then(...).forceUpdate()`）／
    `componentWillUnmount`のパターンを追加し、取得完了後に確実に
    再描画されるようにした（`SiteSettingsPreview`は`makePagePreview`を
    使わない独自実装のため、同じロジックを個別に持たせている）。
  - フッターが取得できなかった場合（`astro dev`でCSSがJS注入される
    等、7章に既出の理由）は、その旨をテキストで表示するフォールバックを
    用意した。
- **検証**：`npm run build && npx astro preview`（`astro dev`ではなく
  ビルド済み`dist/`を配信するモードで確認すること＝7章のCSS流し込み
  ルール参照）でローカルCMS（`local_backend`）にログインし、
  「デザインテーマ設定」の「テーマカラー」セレクトを
  レッド→グリーン→オレンジと切り替え、その都度フッターの背景色・
  ボタン・カードの配色が即座に切り替わることを実機で確認済み
  （保存はせず、`site-settings.json`が変更されていないことも
  `git status`で確認した）。

### 9.19 アイコンのSVGベクター化・Decap CMS「公開する」連続操作の不具合修正（2026-09）

- **「選ばれる3つの理由」アイコンのSVG化**：`src/data/siteInfo.yml`の
  `features_section.items[].icon`が参照する3つのアイコン画像
  （大型ディスプレイ／スマートフォン／ヘッドセット）を、低解像度PNG
  （拡大表示で白いノイズ状のドットが目立つ品質不良があった。特に
  ヘッドセットのアイコンで顕著）から、手描きのクリーンな線画SVG
  （`src/assets/icon-design.svg` / `icon-mobile.svg` / `icon-support.svg`。
  既存のロゴ配色に合わせ`#1954e0`のストローク、視認性重視のシンプルな
  線画スタイル）へ差し替えた。既存の`src/assets/`配置＋
  `resolveImageOrNull()`／`astro:assets`の`<Image />`という仕組みは
  変更しておらず（絶対ルール②を維持）、Decap CMSの「画像」ウィジェット
  （`widget: image`）から案件ごとに引き続き差し替え可能。旧PNG
  （`icon-design.png`/`icon-mobile.png`/`icon-support.png`）は
  参照が無くなったため削除。
  ⚠️ これらのアイコンは`<Image />`（`<img>`タグ）として描画される
  ため、色はSVGファイル自身に焼き込んだ固定値であり、テーマカラー
  変更には連動しない（CSSの`currentColor`等は`<img src="...">`越しには
  効かない）。案件の着せ替え時にテーマカラーと大きく色味が異なる
  場合は、このSVGファイル自体のstroke色を書き換えるか、案件独自の
  アイコン画像に差し替えること。
- **「料金プラン」チェックマークのSVG化＋テーマカラー連動**：
  `Plans.astro`の「含まれる内容」チェックリストが使っていた
  `site.icons.check`（低解像度PNG、`src/assets/icon-check.png`）を
  廃止し、`/services`ページの料金表チェックリストと同じインラインSVG
  （`stroke: var(--color-primary)`）に統一した。画像では実現できない
  テーマカラー連動が要件だったため、CMSの画像フィールドではなく
  インラインSVGを採用（他のアイコン系ボタン・矢印と同じ、この
  コードベース標準のパターン）。`site.icons.check`はこれが唯一の
  参照箇所だったため、`config.yml`の「共通アイコン」セクション・
  `siteInfo.yml`の`icons:`・`src/lib/site.ts`の型定義・
  `src/assets/icon-check.png`を丸ごと削除した（未使用のCMSフィールドを
  残すと、編集しても何も起きない紛らわしい項目になるため）。
  ついでに`preview.js`の同箇所（`renderPlans`・`ServicesPagePreview`の
  料金表チェックリスト）も、従来のプレーンな「✓」文字から同じSVGパスに
  統一し、実サイトとプレビューの見た目を一致させた。
- **Decap CMS「公開する」ボタンの連続操作不具合の修正**：管理画面で
  設定変更・公開後、画面遷移せず続けて別の項目を変更すると、2回目以降
  「公開する」ボタンが不活性のまま復帰しない不具合を修正した。
  - **調査**：文字列・真偽値（boolean）・選択肢（select）の各ウィジェットで
    複数パターンをローカル環境（`local_backend`）で実機検証したが、
    いずれも再現しなかった。一方、Decap CMSの前身であるNetlify CMSには
    「boolean／selectウィジェットで値を変更→公開→再度変更すると公開
    ボタンが不活性のまま復帰しない」という酷似した既知の不具合報告
    （[decaporg/decap-cms#6202](https://github.com/decaporg/decap-cms/issues/6202)、
    2022年）があり、実運用（GitHub連携・ネットワーク遅延あり）では
    ローカルより発生しやすい可能性があるため、発生条件を問わず確実に
    解消できる対処を実装した。
  - **修正**：`public/admin/index.html`の既存の`postSave`イベント
    リスナー（9.3章に記載の「公開して新規作成」の遷移補正と同じ関数）を
    拡張し、「公開して新規作成」以外の通常の「公開する」実行後にも
    `location.reload()`でエディタ画面を再読み込みするようにした。
    postSave発火時点で直前の変更はすべて保存済み（＝未保存の入力は
    存在しない）ため、リロードしてもデータを失う心配がない
    （※「ボタンが不活性のままなのを検知してからリロードする」という
    設計にはしなかった：検知の時点では既に次の未保存の変更が
    入力されている可能性があり、それを巻き込んで消してしまう
    リスクがあるため。「保存が完了した直後、まだ何も新しい入力が
    無いタイミング」を狙って必ずリロードする設計にすることで、
    データ消失のリスクを完全に排除している）。
    リロードで見た目上のスクロール位置が失われると体験を損なうため、
    リロード直前に編集フォームのスクロール位置
    （`findScrollContainer()`で特定）を`sessionStorage`へ退避し、
    `window`の`load`イベントで復元する（フォームの再マウントを
    待つため`setInterval`で最大20回・約4秒リトライ）。
  - **検証**：ローカル環境で「サイト全体設定」の文字列フィールドを
    編集→公開→リロード（スクロール位置が保持されることを確認）→
    続けて同じフィールドを再編集→「公開する」ボタンが正しく活性化
    することを確認済み。

### 9.20 ドキュメント整理：アイコン管理方針／Decap CMSイベントフック一覧／スライダー仕様／サイト設定データ構造（2026-09）

9.10〜9.19（2026-09の連続バッチ）で積み上がった変更のうち、今後の開発・
保守で繰り返し参照することになる4項目を、散らばった各セクションから
ここに集約する。各項目の実装の経緯・検証の詳細は元のセクション番号を参照。

**A. アイコンの管理方針**

- **原則**：アイコン画像は他の画像と同じく `src/assets/` に配置し、
  `resolveImageOrNull()` ＋ `astro:assets` の `<Image />` 経由で扱う
  （絶対ルール②）。`public/assets/images/icons/` のような `public/`
  配下への配置は**行わない**——`astro:assets` の最適化パイプライン
  （ビルド時のハッシュ付きファイル名・サイズ検証）を経由できなくなり、
  CMS の画像フィールドとしての差し替えも機能しなくなるため。
- **PNG/JPG か SVG か**：単純な線画・ピクトグラム系のアイコン
  （選ばれる理由セクションのモニター／スマホ／ヘッドセット等）は、
  低解像度PNGだと拡大時ににじみ・ノイズが出やすいため、**SVGベクター
  画像を優先**する（9.19で実施した置き換えが実例）。写真的・複雑な
  グラデーションを含む画像はPNG/JPG/WebPのままでよい。
- **テーマカラー連動が必要なアイコンはインラインSVGにする**：
  `<Image src={icon} />`（＝`<img src="....svg">`）として描画される
  外部SVGファイルは、色がファイル自身に焼き込まれた固定値になり、
  外部CSSの `currentColor` や `var(--color-primary)` では再着色できない。
  テーマカラーに応じて色を変えたいアイコン（料金表・料金プランの
  チェックマーク等）は、CMSの画像フィールドを使わず、Astro
  コンポーネント内に直接 `<svg><path stroke="var(--color-primary)" .../></svg>`
  を書く**インラインSVG**方式にすること（9.19、`Plans.astro` と
  `/services` の価格表チェックリストが実例。矢印・チェック等の
  小アイコンは既にこの方式が全体の標準）。
- **使い分けの判断基準**：「案件ごとにCMSから画像を差し替えたい」
  ＝ `src/assets/` ＋ `<Image />`（画像フィールド）。「テーマカラーに
  リアルタイム追従させたい」＝インラインSVG。両方を同時に満たす
  ことはできない点に注意（インラインSVGはCMSの画像アップロードでは
  差し替えられない、コードを書き換える必要がある）。

**B. Decap CMSイベントフック一覧**（`public/admin/index.html` /
`public/admin/preview.js`）

現時点で登録されている `registerEventListener` は以下の3系統
（`preSave` 1箇所、`postSave` は1つの関数内で2パターンに分岐）。
いずれも `window.CMS.registerEventListener({ name, handler })` で
登録し、`name` ごとに1つの関数にまとめている（Decap側の仕様上、
同名イベントに複数ハンドラを重ねて登録できるか未検証のため、
本プロジェクトでは各イベント名につき1関数に統一している。新しい
処理を追加する場合も、同名の新しいハンドラを増設するのではなく
既存の1関数に分岐を足すこと）。

| イベント | 登録場所 | 発火タイミング | やっていること |
|---|---|---|---|
| `preSave` | `preview.js` | フォームの保存（下書き保存／公開）実行の直前 | `urlSlug`フィールドを持つコレクション（`data.has('urlSlug')`で判定、コレクション名のハードコードなし）で、値が空欄ならランダムな識別子を自動採番してファイル名を確定させる（9.3）。**Immutable.jsの`data`（または`.set()`で更新したもの）を必ず返すこと**——`undefined`を返すと`identifier_field`欠落扱いになり保存後の画面遷移まで壊れる既知の落とし穴（decaporg/decap-cms#6775）。 |
| `postSave` | `index.html` | 保存（公開）が完了した直後 | ①メニュー「公開して新規作成」がクリックされていた場合（クリック時にコレクション名を`pendingCreateNewCollection`へ記録）：`location.hash`を`#/collections/<name>/new`へ強制設定し`location.reload()`（Decap側がこのケースでは`/new`へ自動遷移しないため。9.3）。②それ以外＝通常の「公開する」実行後：スクロール位置を`sessionStorage`へ退避してから`location.reload()`し、公開ボタンの不活性化バグを予防する（9.19）。どちらも`setTimeout(..., 300)`で少し待ってから実行（Decap自身のトースト表示等の後続処理と競合しないように）。 |
| `load`（ブラウザ標準イベント、CMS固有ではない） | `index.html` | ページ読み込み完了時 | 上記postSaveのリロードで退避したスクロール位置を`sessionStorage`から読み出し、`findScrollContainer()`で特定したコンテナへ復元する（`setInterval`で最大20回・約4秒リトライ。9.19）。同じ`load`リスナー内で`updateNavButtonVisibility()`等の初期化・`setInterval`による定期再チェック（500ms間隔）も行っている（9.7章参照）。 |

**postSaveでの`location.reload()`が安全な理由**（重要な設計原則）：
`postSave`が発火する時点では直前の変更はすべて保存済みであり、
未保存の入力は存在しない。そのため、その瞬間にリロードしてもユーザーの
入力データを失う心配がない。「ボタンが不活性のままなのを検知してから
リロードする」設計には**しなかった**——検知の時点では既に次の未保存の
変更が入力されている可能性があり、それを巻き込んで消してしまうリスクが
あるため（9.19）。新しくpostSave系の補正処理を追加する場合も、
「保存直後、何も新しい入力が無いタイミング」を保つこの原則を守ること。

**C. スライダーコンポーネント（`src/scripts/cardSlider.ts`）の仕様**

「実績・活用事例」「サービス内容」「商品一覧」「料金プラン」の4つの
カルーセルは、すべて共通の`src/scripts/cardSlider.ts`＋以下のマークアップ
規約で動作する（個別の実装経緯は9.11／9.16／9.17）。

- **マークアップ規約**：矢印ボタンを持つラッパーに`data-slider-root`
  （`position:relative`）、実際にスクロールするグリッド要素に
  `data-slider-track`、矢印に`data-slider-prev`/`data-slider-next`
  （`data-slider-root`の内部、`position:absolute`）を付与する。
  ドットインジケーターのコンテナ（`data-slider-dots`、中に1アイテム
  1つずつ`data-slider-dot`ボタン）は**`data-slider-root`の外側
  （兄弟要素）に置く**のが規約——矢印の垂直センタリング計算
  （`top-1/2`や`Plans.astro`の`top-[calc(50%+12px)]`等）が
  `data-slider-root`自身の高さ＝track単体の高さを前提にしているため、
  ドット行をroot内部に混ぜるとroot自身の高さにドット分が加算されて
  この計算が狂う（9.16）。`cardSlider.ts`側は`root`直下→
  `root.parentElement`の順でドットコンテナを探すフォールバックを
  持つが、新しいスライダーを追加する際は素直に「dotsはrootの外」を
  踏襲すること。
- **ドットの活性判定（`updateDots()`）**：1画面あたりの表示枚数
  （列数）に関わらず、**「スクロール可能な全区間に対する現在位置の
  割合（0〜1）を、ドット数の範囲（0〜dots.length-1）に線形
  マッピングする」**方式で計算する
  （`Math.round((scrollLeft / (scrollWidth - clientWidth)) * (dots.length - 1))`）。
  単純に`scrollLeft / step()`（＝1アイテム分の幅で割るだけ）にすると、
  1画面に複数枚同時表示されるスライダー（「実績・活用事例」のPC幅、
  列数`site.works.columns`）で、最後までスクロールしても算出される
  インデックスがドット数の途中までしか進まないバグになる——1画面に
  3枚見えていれば、末尾までスクロールしてもscrollLeftは
  「アイテム2個分強」にしかならないため（9.17で発見・修正）。
  1画面1枚のスライダー（サービス内容／商品一覧／料金プラン）では、
  この計算は末尾アイテムの`scrollLeft`が必ず`scrollWidth - clientWidth`
  と一致するため、単純な除算方式と数学的に等価（挙動は変わらない）。
- **ドットのデザイン**：常に同じ大きさ（`w-2 h-2 rounded-full`、
  マークアップに固定で指定）を保ち、JSは背景色（アクティブ＝
  `bg-primary`、非アクティブ＝`bg-surface-border`）だけを
  `classList.toggle()`で切り替える。サイズ変化（かつてのアクティブ時
  `w-5`ピル形状）は廃止済み（9.17）。
- **Works.astro固有の挙動**：他の3つ（Service/Products/Plans）は
  スマホ幅（640px未満）限定のスライダーだが、「実績・活用事例」は
  列数超過時はPC幅でもスライダーのまま（`sm:hidden`等の幅指定を
  矢印・ドットに付けていない）。この違いはCSS側だけで表現しており、
  `cardSlider.ts`のロジック自体はWorks/Service/Products/Plansで
  完全共通（Works.astroは元々専用のインラインスクリプトを持って
  いたが、9.16でこの共通実装に統一した）。

**D. サイト設定データ構造：「画面下部固定バー」と「連絡先」の分離**

`siteInfo.yml`のトップレベルに、名前が紛らわしい2つの関連オブジェクトが
ある（9.12で調査・9.13で分離、経緯は各セクション参照）。

| キー | CMS表示名 | 保持するフィールド | 用途 |
|---|---|---|---|
| `contact` | 「連絡先」 | `phone` / `phoneHref` / `email` | 電話番号・メールアドレスそのもの（実データ）。反映先：トップページ「アクセス」、プライバシーポリシー「事業者情報」、`/llms.txt`（9.12でCMSのhintとしても明記） |
| `stickyContactBar` | 「画面下部固定バー」 | `phoneLabel` / `lineLabel` / `showPhoneButton` / `showLineButton` | スマホ表示時に画面下部へ常時表示される「お電話」「LINEで相談」固定バー（`StickyContactBar.astro`）の文言・表示トグルのみ。電話番号自体は`contact.phone`／LINEのURLは`sns`（SNS設定）を参照し、このオブジェクトは持たない |

- `config.yml`・`siteInfo.yml`とも、`stickyContactBar`は
  `footerNav`（フッターナビゲーション）の直後、`copyright`
  （コピーライト表記）の直前に配置している（間にあった「共通
  アイコン」`icons`セクションは9.19で他に参照元が無くなり削除済み）。
- 住所・郵便番号・最寄り駅・営業時間・定休日・駐車場は、この
  どちらにも属さず別オブジェクト`site.access.store`（CMS「アクセス」）
  が持つ。「連絡先」＝電話・メールのみという原則を崩さないこと。
