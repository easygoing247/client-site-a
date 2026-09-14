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
  「実績・活用事例作成」（旧「実績作成（型化ページ）」／さらに旧「実績・活用事例一覧
  （型化ページ）」／さらに旧「商品一覧（型化ページ）」／さらに旧「商品・施工事例」）。
  旧 `src/content/products/` → `src/content/works/`、
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
サイト設定 → **商品作成** → **実績・活用事例作成** → 下層ページ編集 → お知らせ投稿。

| コレクション | 種別 | データファイル | 内容 |
|---|---|---|---|
| 商品作成（`name: productsCatalog`、file名 `products`） | files（単一ファイル） | `src/data/products.yml` | 商品カタログの可変リスト（§4参照） |
| 実績・活用事例作成（`name: works`） | folder（型化ページ） | `src/content/works/*.md` | タイトル・価格・メイン画像・概要・仕様・本文（§4参照） |
| 下層ページ編集 ＞ サービス内容・料金（`name: services`） | file | `src/data/services.yml` | サービス詳細、料金表、注記 |
| 下層ページ編集 ＞ 会社概要（`name: about`） | file | `src/data/about.yml` | 会社概要、代表挨拶、アクセス情報（`access.items[]` 可変リスト）、「公式SNS」行ラベル |
| 下層ページ編集 ＞ お問い合わせ・ご予約（`name: contact`） | file | `src/data/contactPage.yml` | フォーム案内文、注意事項、プライバシーポリシー |
| 下層ページ編集 ＞ お知らせ一覧ページ（`name: newsPage`） | file | `src/data/newsPage.yml` | `/news` のページ見出し・リード文・一覧セクション見出し（記事自体は下の`news`コレクション）。この`heading`はヘッダー／フッターナビの「お知らせ」表示名にも動的反映される（`src/lib/site.ts`の`navHrefToPageHeading`、2026-09追加。services/about/contactも同様） |
| お知らせ投稿（news） | folder（投稿型） | `src/content/news/*.md` | 記事タイトル・アイキャッチ（`image`/`imageAlt`）・本文・公開日・カテゴリ |

- 下層ページ用 `.yml` は `src/data/siteInfo.yml` と同じ「唯一のデータソース」原則に従う。
  パーサは **`src/lib/pages.ts`**（`servicesPage` / `aboutPage` / `contactPage`、
  `site.ts` と同じ `?raw` インポート方式）。コンポーネントへのテキスト直書きは禁止（絶対ルール①）。
- `pages` コレクションの各 file エントリ（`services` / `about` / `contact` /
  `newsPage`）は `summary: "{{fields.pageName}}"` を指定し、管理画面の
  「下層ページ編集」一覧に各`.yml`の**`pageName`**（管理用の識別名。
  サイト上の見出しとは独立して自由に変更できる）を表示する。4ファイル
  とも`pageName`（label「ページ名（下層ページ編集の一覧に表示される
  項目名）」）を先頭フィールドとして統一すること。サイト上の実際の
  `<title>`・`PageHeader`・パンくず・ナビゲーション表示名に使われるのは
  この`pageName`ではなく**別フィールドの`heading`**（label「ページ見出し」、
  2番目のフィールド）であることに注意——2つは意図的に分離されており、
  管理画面上の識別名を変えてもサイトの表示は変わらない（逆も同様）。
- `news` コレクションのスキーマは `src/content/config.ts` の `news` で定義。取得は
  **`src/lib/news.ts`** の `getPublishedNews()`（`draft: true` を除外し公開日降順）を経由する。
  カテゴリ表示名・日付整形も同モジュールに集約。画像は `image()` ヘルパー経由で
  `../../assets/` からの相対パスで指定する（絶対ルール②）。
- **URLスラッグに日本語を含めない**：`news` / `works` の記事・実績タイトルは
  日本語前提のため、ファイル名（＝URL）をタイトルからの自動生成（Decap既定の
  `{{slug}}`）に任せると非ASCII文字入りのURLになってしまう。そのため
  config.yml で `news`: `slug: "{{fields.urlSlug}}"`、
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
  - **`news` のファイル名から日付プレフィックスを廃止（2026-09）**：
    当初は`slug: "{{year}}-{{month}}-{{day}}-{{fields.urlSlug}}"`で
    ファイル名に投稿日を含めていたが、URLをよりシンプルにするため
    `works`と同じ`slug: "{{fields.urlSlug}}"`（日付なし）に変更した。
    既存の記事ファイル（`2026-09-09-sample.md`等）はリネームしていない
    ため、Astro Content Collectionsが自動導出する`entry.slug`（＝
    ファイル名）には引き続き日付が残る。新旧どちらの記事も日付なし
    URLでアクセスできるよう、`src/lib/news.ts`の**`getPublicSlug()`**
    が`entry.slug`先頭の`YYYY-MM-DD-`を正規表現で除去してから返す
    （該当しなければそのまま返すため、新規記事にも安全に使える）。
    `getStaticPaths()`のルート生成・一覧ページ／トップページの
    リンク先（`href`）は必ずこの関数を経由すること。`entry.slug`を
    直接URLへ使っている箇所を見つけたら`getPublicSlug()`に置き換える。
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
  - **下層ページ**コレクションの各 file（services / about / contact / newsPage）は
    `summary: "{{fields.pageName}}"` で管理用の「ページ名」を一覧に動的表示する
    （サイト上の見出しである`heading`とは独立したフィールド。2026-09追加。→ 9.3）。
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
    並び替え）を優先し、そこに無い実績は公開日の新しい順で後ろに続く
    （個別記事側に数値の「表示順」フィールドを持たせる二段構えだった旧実装は
    9.38で廃止し、「表示順序」リストへ一本化した）。**Decap の folder
    コレクション自体はドラッグ&ドロップ並び替えに対応していない**ため、
    「並び順だけを別途 `relation` の `list` として siteInfo 側に持つ」のが
    このテンプレートでの標準パターン。型化ページの並び順を CMS でドラッグ
    操作にしたい場合は今後もこの構成（siteInfo.yml 側に `order:
    list<relation>` を足し、そこに無い分は日付等のコレクション自身が
    既に持つフィールドでフォールバックソートする）を踏襲すること。
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
| `stickyContactBar` | 「画面下部固定バー」 | `phoneLabel` / `lineLabel` / `showPhoneButton` / `showLineButton` / `phoneActionType` / `phoneCustomLink` / `lineActionType` / `lineCustomLink` | スマホ表示時に画面下部へ常時表示される「お電話」「LINEで相談」固定バー（`StickyContactBar.astro`）の文言・表示トグルに加え、各ボタンのアクション種別（`tel`/`url`/`form`）と個別リンク先（`*CustomLink`）を持つ（2026-09追加）。`*CustomLink`が入力されていれば`StickyContactBar.astro`の`resolveHref()`がそれを最優先（`actionType`が`tel`なら`tel:`を付与、それ以外はURLとしてそのまま使用）し、未入力の場合のみ`contact.phone`／`sns`（SNS設定のLINE URL）へフォールバックする |

- `config.yml`・`siteInfo.yml`とも、`stickyContactBar`は
  `footerNav`（フッターナビゲーション）の直後、`copyright`
  （コピーライト表記）の直前に配置している（間にあった「共通
  アイコン」`icons`セクションは9.19で他に参照元が無くなり削除済み）。
- 住所・郵便番号・最寄り駅・営業時間・定休日・駐車場は、この
  どちらにも属さず別オブジェクト`site.access.store`（CMS「アクセス」）
  が持つ。「連絡先」＝電話・メールのみという原則を崩さないこと。

### 9.21 管理画面プレビューのデバイス幅切替・本文リッチテキスト拡張（2026-09）

- **画像フィールド名を`image`に統一（カード表示サムネイル対応）**：
  Decap CMSのコレクション一覧「カード（グリッド）」表示は、`widget: image`の
  フィールドを内部的に**フィールド名で自動推定**してサムネイルに使う
  仕組みで、任意の名前では認識されないことを実機検証で確認した
  （`mainImage`/`eyecatch`ではサムネイルが表示されず、`image`に
  リネームした途端に表示されるようになった＝公式ドキュメント化されて
  いない挙動だが再現性を確認済み）。そのため`works`の`mainImage`→
  `image`、`news`の`eyecatch`/`eyecatchAlt`→`image`/`imageAlt`に
  改名した（`config.yml`・`src/content/config.ts`・全`.astro`参照・
  既存コンテンツのfrontmatterを含め全箇所を更新済み）。新しい
  folderコレクションに画像フィールドを追加する際、コレクション一覧の
  カード表示でサムネイルを出したい場合は`image`という名前にすること。
- **下層ページの「ページ見出し」がナビに動的反映**：`src/lib/site.ts`の
  `visibleNavItems()`に`navHrefToPageHeading`（`/services`→
  `servicesPage.heading`等）を追加。`heading`フィールドは元々
  各ページの`<title>`・`PageHeader`にも使われているため、CMSで
  ページ見出しを変更するとヘッダー／フッターのナビ表示名にも
  自動反映される（未入力ならnav側の設定値のままにフォールバック）。
  「サイト設定」プレビュー（`preview.js`のNAV_HREF_TO_FLAG／
  `filterVisibleNavForPreview`）は別CMSエントリの`heading`を
  参照できないため、この動的反映はプレビューでは再現されない
  （他の別エントリ参照と同じ既知の制約、9.4/9.11参照）。
- **Decap CMS管理画面プレビューのデバイス幅切替（PC/タブレット/スマホ）**：
  `public/admin/index.html`にツールバー（ヘッダー右側、ViewControls
  ではなく`[class*="ToolbarSectionMeta"]`＝本番URLリンク＋アカウント
  アイコンの左隣を基準に位置決め。ViewControls自体は
  `[class*="ToolbarSubSectionLast"]`にピン留めされるまで幅0または
  画面全幅の不安定な状態を取り得ることを実機確認したため基準にしない）
  を追加。切替は`.SplitPane[data-cms-device]`属性経由でPane1/Pane2の
  実際の分割幅（`flex-basis`/`width`）を`!important`で上書きする方式
  （Resizer自体の位置が動く＝境界線がデバイス幅ちょうどの位置まで
  移動する）。手動でResizerをドラッグした場合は自動的にPCへ戻す
  （`!important`による強制幅とドラッグ操作が競合して「動かない」ように
  見えるのを防ぐため）。プレビューiframeの右上に直接ボタンを重ねる
  初期実装は、サイト側のハンバーガーボタンと座標が重なりクリックを
  奪ってしまう不具合があったため、ヘッダー内配置に変更した。
- **「サイト設定」プレビューへのハンバーガーメニュー実装**：
  デバイス幅切替でスマホ幅を確認できるようにするため、`renderHeader()`
  （`preview.js`）に本物同様の開閉ボタン＋ドロワーを追加し、
  `SiteInfoPreview`（`createClass`のstate）で開閉状態を管理する
  実装にした。`services`/`about`/`contact`/`news`等の下層ページ
  プレビューは`publishedHeaderHtml`（生HTML文字列）を流用する方式
  のため、埋め込まれた`<script>`は実行されず、これらのプレビューでは
  ハンバーガーは今回もクリック不可のまま（アーキテクチャ上の既知の
  制約。7章参照）。
- **画面下部固定バーのプレビュー追加**：`stickyContactBar`は元々
  どのプレビューにも実装されていなかった（`<footer>`の外の独立した
  `<div>`のため`publishedFooterHtml`にも含まれない）。`SiteInfoPreview`
  にのみ`renderStickyContactBarPreview()`を追加（`stickyContactBar`
  フィールドを編集できるのはこのエントリのみのため）。
- **「画面下部固定バー」を左右2ボタン構成に再編**：`stickyContactBar`を
  フラットな`phoneLabel`/`lineLabel`等から`leftButton`/`rightButton`
  （各`widget: object`）に構造変更。左ボタンにのみ`color`
  （`primary`＝テーマカラー連動グラデーション／`accent`＝LINE風
  グリーン）を追加。`StickyContactBar.astro`の`resolveHref()`は
  変更なし（対象が`leftButton`/`rightButton`オブジェクト経由に
  なっただけ）。
- **本文リッチテキストエディタ（`works`/`news`の`body`）の拡張**：
  `public/admin/editor-components.js`（新規）に集約。
  - **日本語化**：`CMS.registerLocale('ja', {...})`は`ks.locales.ja`への
    **単純代入**（マージではない）であることをバンドル本体のソースで
    確認済み。部分オブジェクトをそのまま渡すと本体バンドルが起動時に
    登録した`ja`ロケール全体が消えUIの大半が英語に戻る重大な不具合を
    実機で確認したため、`CMS.getLocale('ja')`で完全な辞書を取得し、
    不足キー（`editorWidgets.markdown.strikethrough`/`toggleMode`。
    `en`以外の大半のロケールで同様に欠落している本体側の既知の翻訳漏れ）
    だけを追記してから同じ参照を再登録する方式にした。**今後
    `registerLocale`を追加する際は必ずこの`getLocale`→追記→再登録の
    手順を踏むこと（直接`registerLocale('ja', {部分オブジェクト})`を
    呼ばない）**。
  - **`buttons:`/`editor_components:`**（`config.yml`、YAMLアンカー
    `&richTextButtons`/`&richTextComponents`で`works.body`/`news.body`
    が共有）：ツールバーは太字系→見出し→引用→リストの意味順に整理し、
    見出しはH1〜H3のみに絞った。「+」ボタンから挿入できるコンポーネントを
    6種に限定。
  - **`CMS.registerEditorComponent()`で実装した6種**（すべて`toBlock()`が
    生のHTMLを出力し、`src/styles/global.css`の`.prose-content .cms-*`が
    実サイト側の見た目を担当。エディタ内のライブプレビュー
    （`toPreview()`）は登録済みCSSを参照できないため、同じ配色を
    インラインstyleで別途再現している＝2箇所を一致させること）：
    動画（YouTube URL埋め込み）／動画（ファイルアップロード。
    astro:assetsの最適化対象外のため`media_folder: /public/uploads/editor`
    ＋`public_folder: /uploads/editor`を個別指定し、本文中の
    `<video src>`がビルド後もそのまま配信可能な絶対パスになるようにして
    いる）／マーカー（蛍光ペン、5色）／囲い枠（5色・見出しバッジ付き）／
    吹き出し（アイコン画像付き）／テキスト配置（左・中央・右）。
    囲い枠・吹き出しは複数フィールドを持つため、`pattern`/`fromBlock`に
    正規表現で直接パースさせる代わりに、`<!--cms-box:{URIエンコードした
    JSON}-->`という非表示コメントを`toBlock()`の出力に前置し、
    `fromBlock`はそのコメントだけを読み戻す方式にした（本文中に任意の
    Markdown記法を含み得るネストしたフィールドを正規表現で直接
    キャプチャすると壊れやすいため）。
  - **意図的に実装しなかった機能とその理由**：Decap CMSの`markdown`
    ウィジェットが公式に公開している拡張点は「`buttons:`による固定
    ボタン一覧の絞り込み・並び替え」と「`registerEditorComponent`に
    よるブロック単位の挿入」の2つのみで、これ以外の拡張手段は無い
    （実機・バンドルソースの両方で確認済み）。そのため以下は未実装：
    (1) 既存の文章の一部を選択して後から着色する「本物のインライン
    ハイライト」→ 上記の「マーカー」はテキストを専用フィールドに
    書き直して挿入する**ブロック単位**の疑似ハイライトとして実装。
    (2) テキスト整列のツールバーボタン → 同様に「テキスト配置」
    コンポーネントとして実装（text-alignは本来ブロック＝段落単位の
    CSSプロパティのため、これは実質的に妥協ではない）。
    (3) 検索・置換（Find & Replace）→ Decap内部はSlate（contentEditable）
    で文書を管理しており、DOM文字列を外部から直接書き換えると
    Slateの内部状態と食い違い保存内容が壊れるおそれが高く、安全に
    実装する公式なフックも無いため未実装（動くふりをする実装は
    行わなかった）。将来的に本当に必要な場合は、`widget: markdown`を
    やめて独自のリッチテキストウィジェットに全面的に置き換える
    規模の作業になる。

### 9.22 画面下部固定バーのプレビュー全面対応・右ボタン色・画像ボタン復旧（2026-09）

- **画面下部固定バーのプレビューを全ページプレビューに拡張**：9.21では
  「サイト設定」プレビュー（`SiteInfoPreview`）にのみ実装していたが、
  `loadSiteStylesheetAndTheme()`が本番`/`から`<header>`/`<footer>`を
  抜き出すのと同じ仕組みで`publishedStickyBarHtml`（`[aria-label="お問い
  合わせショートカット"]`で取得）も抜き出し、`pagePreviewShell`
  （services/about/contact/newsの共通シェル）・`WorkPreview`・
  `SiteSettingsPreview`にも`publishedFooterHtml`と並べて追加した。
  両ボタンとも非表示設定・リンク先未設定の場合は公開ページ自体に
  この要素が存在しないため、その場合はプレビューにも表示されない
  （公開済みページの状態をそのまま反映する仕様）。
- **右ボタンにも背景カラー選択を追加**：`leftButton.color`と同じ
  `primary`/`accent`の2択を`rightButton.color`にも追加（既定値は
  `accent`＝これまでの固定LINE配色と同じ見た目を維持）。
  `StickyContactBar.astro`の`buttonColorClass()`と`preview.js`の
  `stickyButtonColorClass()`で左右共通のロジックにした。
- **本文リッチテキストエディタの「画像」ボタン消失を修正**：Decap CMSの
  markdownウィジェットは画像挿入を独立したツールバーアイコンではなく
  `id:"image"`の`registerEditorComponent`として標準搭載していることを
  バンドル本体のソースで確認した。9.21で`editor_components:`を自作6種
  のみのホワイトリストにしたことでこの標準コンポーネントが除外され、
  「+」メニューから画像挿入ができなくなっていた。`editor-components.js`
  に同じ`id:"image"`で日本語ラベル・フィールドの独自定義を再登録し
  （`registerEditorComponent`は同じidへの`Map.set`のため安全に上書き
  できる。9.21の`registerLocale`の全体上書き問題とは別物）、
  `config.yml`の許可リストにも`"image"`を追加して復旧した。新しい
  `editor_components`ホワイトリストを設定する際は、自作コンポーネント
  だけでなく必要な標準コンポーネント（`"image"`）も含めることを忘れない
  こと。
- **「範囲選択したテキストへの直接インライン適用」「検索・置換」は
  実装しなかった（9.21から変更なし、今回改めて実機で再検証済み）**：
  `document.execCommand('insertHTML'/'insertText')`によるSlate
  contentEditableへの直接DOM操作を、リッチテキストモード・マークダウン
  モードの両方で再検証した。マークダウンモードの生テキスト編集領域も
  実体はcontentEditable（Slateの別スキーマ）であり素朴な`<textarea>`
  ではないため、両モードとも同じ問題が起きることを確認した：
  DOM上は挿入した内容がその場で表示され、続けて別の場所を編集しても
  消えずに残る（一見成功したように見える）が、画面上部の保存状態
  表示は「保存済み」のまま変化せず、実際に「公開する」を実行しても
  この操作による変更は一切保存されない。原因はSlateが「自身の内部
  状態が変化したときだけ実DOMへ描画し直す」方式のため、外部から
  直接書き換えたDOMがSlateの内部状態に反映されず、たまたま次の
  再描画対象にならなかった範囲がそのまま画面に残っているだけ
  （内部的には何も変更されていない）と考えられる。過去には
  この手法での編集後にモード切替を行うと本文が完全に空になる
  （内部ドキュメントと実DOMの食い違いでシリアライズに失敗する）
  ケースも確認しており、無理に実装すると実際のコンテンツを破壊
  しかねない。マーカー・囲い枠・吹き出しは9.21のとおり
  `registerEditorComponent`によるブロック単位の挿入のまま
  （保存・ビルド後の表示が壊れないことを実証済みの唯一安全な方式）。

### 9.23 プレビューのデバイス幅切替の実装バグ修正・本文の段落間隔追加（2026-09）

- **デバイス幅切替（PC/タブレット/スマホ）が実際にはPane2の幅を0にして
  いた不具合を修正**：9.21で実装した`.SplitPane[data-cms-device] > .Pane2`
  の`flex: 0 0 375px !important`（ショートハンドでflex-basisを直接指定
  する方式）が、実機検証の結果**常にcomputed widthが0になる**不具合を
  確認した（`getComputedStyle().flexBasis`が指定した`375px`ではなく
  `0%`になる。同じ値をインラインstyleに`!important`付きで直接
  `element.style.setProperty('flex', '0 0 375px', 'important')`しても
  再現するため、CSSの詳細度・カスケードの問題ではなく、この環境の
  レンダリングエンジンにおける`flex`ショートハンドでの`flex-basis`
  長さ値指定そのものが正しく解決されない問題と考えられる）。
  「画面下部固定バーがプレビューに表示されない」という繰り返し
  報告されていた不具合の真因はこれで、スマホ/タブレット幅を選択した
  時点でプレビューiframe自体の実際の幅が0になっており、固定バーに
  限らずプレビュー全体が正しく表示されない状態になっていた
  （9.21時点の検証では偶然崩れていない見た目のタイミングで確認して
  しまい、この不具合を見逃していた）。
  **修正**：`flex: 0 0 <px>`ショートハンドをやめ、`flex: none !important`
  （flex-basis: autoに相当）＋`width: <px> !important`＋
  `min-width: <px> !important`（Pane2側。Pane1側は`min-width: 0`）の
  組み合わせに変更した。この組み合わせでは`offsetWidth`が指定どおりに
  解決されることを実機で確認済み。**今後この種のCSSでflexアイテムの
  幅を強制する際は、`flex`ショートハンドでflex-basisに具体的な長さを
  指定する方法を避け、`flex: none` + 明示的な`width`/`min-width`の
  組み合わせを使うこと**（このコードベースでの既知の落とし穴として
  記録）。
- **本文（works/newsの`body`）に段落間隔のCSSが一切無かった不具合を
  修正**：`.prose-content`配下に段落・見出し・リスト・引用の基本的な
  margin指定を追加した（Tailwindのpreflightが全要素のmarginを0リセット
  しており、本文専用のタイポグラフィスタイルを別途持たせていなかった
  ため、Enterキーで意図的に空けた行も含め、あらゆる段落間が完全に
  密着して見える状態だった）。空段落（`:empty`、中身が`<br>`のみ）にも
  `min-height`を与え、意図した空行がページ上でも視認できるようにした。
- **装飾ブロック（マーカー・囲い枠・吹き出し）の前後の余白を、通常の
  段落marginと二重に積み重ならないよう調整**：CSSの隣接兄弟マージン
  相殺は装飾要素側のmarginと前後の段落marginの大きい方が採用される
  仕組みのため、通常の段落marginを`1.2em`に統一したことに合わせて
  `.cms-box`/`.cms-speech`/`.cms-align`の下側marginも`1.2em`に揃えた
  （囲い枠の上側だけは見出しバッジの飛び出し分の余白を確保するため
  `1.8em`のまま）。ただし9.21/9.22で確認済みのとおり、
  registerEditorComponentによる挿入は構造上必ず独立したブロック
  （マーカーは専用の`<p>`、囲い枠・吹き出しはraw HTMLブロックの
  `<div>`）になるため、本文中の地の文と完全に同じ行に溶け込む
  「本当の意味でのインライン表示」は実現できない。CSSで調整できるのは
  前後の余白の大きさ（間隔を詰めて浮いた印象を抑える）までで、
  「改行が入ること自体」は構造上避けられない制約として残る。
  2026-09に改めて実機再検証した際、文中（「前半」「後半」という地の文の
  間）にカーソルを置いた状態で「XXXX」という文字列を選択してから
  マーカーを挿入したところ、(1)選択していた「XXXX」はマーカーの
  「テキスト」入力欄に自動転記されず消えてしまう、(2)「前半」「後半」は
  マーカーを挟んで2つの独立した`<p>`に強制分割される、の両方を確認した。
  これはregisterEditorComponentが「カーソル位置に新しい空のvoidブロックを
  挿入する」という決め打ちの動作しか公開していないためで、外部から
  変更できる余地が無い（`fields`/`pattern`/`fromBlock`/`toBlock`/
  `toPreview`が公開APIの全体）。今後も同じ要望が来た場合、CSSでの
  余白調整以上の対応は取れないことを前提に案内すること。

### 9.24 本番環境での再現報告への対応・管理画面アセットのキャッシュバスター追加（2026-09）

- **画面下部固定バー非表示・ページ名反映の再報告は、ユーザーに確認した
  ところ本番サイト（Cloudflare Workers）での検証だった**。ローカルで
  改めて実機検証したところ、9.21〜9.23で修正した内容はいずれも正しく
  動作していることを再確認した：
  - `fetch('/admin/index.html')`で本番の配信内容を直接取得し、
    9.23で入れた`flex: none !important`修正が実際に配信されている
    ことを確認（＝Cloudflareへのデプロイ自体は完了している）。
  - 本番の`/`ページを`fetch`し、画面下部固定バーのHTML
    （`aria-label="お問い合わせショートカット"`）が実際に出力されて
    いることも確認。
  - ローカルで「サイト設定」「下層ページ編集（services）」双方の
    プレビューをスマホ幅に切り替え、iframe幅375px・固定バーのDOM
    存在・`pageName`フィールドの一覧反映を実機のマウスクリックで
    再検証し、いずれも問題なし。
  - 以上より、コード自体に残存バグは無いと判断した。
- **原因を断定できないまま「原因不明」で終わらせず、閲覧者側の古い
  キャッシュという蓋然性の高いリスクに対して防御的な対策を追加**：
  `public/admin/index.html`の`preview.js`/`editor-components.js`の
  `<script src>`、および明示的に追加した`<link rel="cms-config-url"
  href="./config.yml?v=...">`に、`?v=YYYYMMDD`形式のクエリ文字列
  バージョンを付与した。Cloudflareの静的アセット配信自体は
  `cache-control: public, max-age=0, must-revalidate`で毎回検証される
  設定を確認済みだが、閲覧者のブラウザ側キャッシュ（特にモバイル
  ブラウザ）がこれを無視して古いJS/YAMLを使い続ける可能性は排除
  できないため、クエリ文字列を変えることで新しいURLとして確実に
  再取得させる。**今後`preview.js`/`editor-components.js`/`config.yml`
  の内容を変更した際は、必ずこの3箇所の`?v=`の値を同じ日付
  （変更日）に揃えて更新すること**（更新を忘れると、この対策自体が
  意味を持たなくなる）。
- 同じ症状が再報告された場合は、まず**どちらの環境
  （`npm run dev`/`npm run preview`のローカル環境か、実際にデプロイ
  された本番サイトか）で確認しているか**をユーザーに確認すること。
  本番の場合はCloudflare側のデプロイが実際に完了しているか
  （Workers Buildsのビルドログ、または上記のように`fetch`で配信
  内容を直接確認する方法）を先に切り分けてから、コード側の調査に
  進むと効率的。

### 9.25 本文装飾の改行を`preSave`で除去／`.SplitPane`高さオーバーフロー修正／`files`コレクションの`summary`制限を確定（2026-09）

- **【1】本文装飾（`<mark>`マーカー等）適用時の前後改行を`preSave`で除去**：
  `registerEditorComponent`で追加したマーカー等のカスタムブロックは、
  Slateの仕様上どうしても独立した段落（voidブロック）として挿入され、
  リッチテキストモードのままでは前後のテキストと同じ段落にできない
  （9.21で確定済みの制約、変更なし）。一方、ユーザーの「Markdownモードに
  切り替えると前後に`\n`/`\n\n`が入っており、手動でバックスペース削除
  すると正常に繋がる」という観察から、**保存時に生成される
  Markdown文字列そのものを後処理すれば、リッチテキスト編集の体験を
  変えずに見た目上の分断だけを解消できる**という新しい解法を発見した。
  `preview.js`の既存`preSave`ハンドラ（9.3・9.20-Bで`urlSlug`空欄補完に
  使用）に処理を追加し、`body`フィールドの値から、装飾コンポーネントの
  開始タグ直前・終了タグ直後にある2個以上の改行（空行）を1個の改行に
  圧縮する（`collapseDecorationBlankLines()`、対象は`<mark class="cms-mark`
  `<!--cms-box:` `<!--cms-speech:` `<div class="cms-align` `<div
  class="cms-video-embed` `<video class="cms-video-file`の6種）。
  - **CommonMarkの仕様上、この方式が効くのは`<mark>`ベースのマーカーのみ**：
    `<mark>`はCommonMarkの「HTMLブロック開始タグ」一覧に含まれないため、
    前後に空行が無ければ周囲のテキストと**同じ段落として遅延継続
    （lazy continuation）**扱いになる。一方`<div>`・`<video>`は
    HTMLブロック開始タグに該当し、空行の有無にかかわらず**常に
    独立したブロック**として解釈される（CommonMark仕様）。そのため
    box／speech-bubble／aligned-text／video-embed（いずれも`<div>`/
    `<video>`ベース）は改行を消しても別ブロックのままであり、
    「同じ段落に戻す」効果はマーカーだけに限られる——これは実装上の
    不備ではなく、CommonMarkの仕様に基づく原理的な限界。
  - 検証：`src/content/works/-2.md`をテスト用に使い、リッチテキスト
    モードで「前半」「マーカー装飾」「後半」を入力・保存 →
    保存後のfrontmatter本文が`前半\n<mark ...>middle</mark>\n後半`
    （空行なし・単一改行のみ）になることを確認。`npm run build`後の
    `dist/works/-2/index.html`が`<p>前半\n<mark ...>middle</mark>\n
    後半</p>`という**単一の`<p>`要素**になっていることも確認し、
    実際にブラウザ上で前後のテキストと視覚的に同じ行（同じ段落）に
    連結されることを裏付けた。検証後、テスト内容は
    `git checkout -- src/content/works/-2.md`で元に戻し、
    コミットには含めていない。
- **【2】スマホプレビュー時の画面下部固定バー非表示を修正
  （`.SplitPane`の高さオーバーフローが真因）**：9.23で修正した
  「デバイス幅切替時の`flex-basis`が効かない」バグ（`flex: none
  !important`＋明示的`width`で解決済み、変更なし）とは**別に、
  もう一つの独立したバグ**が残っていたことが判明した。`.SplitPane`
  要素の実際の高さ（＋そのDOM上のtopオフセット）が`window.innerHeight`
  を実測で約52px超過しており、その内部のiframe（プレビュー）に
  レンダリングされる`position: fixed`のコンテンツ（`StickyContactBar`）
  が、ビューポートの可視・スクロール可能領域の外側に押し出されて
  いた。これは横幅方向の計算バグとは無関係に、`.SplitPane`が
  自身の高さを`window.innerHeight`ぴったりではなく、自身のtop
  オフセットを考慮しない値で計算していたために発生していた。
  - 修正：`public/admin/index.html`に`fixSplitPaneHeight()`を追加し、
    `.SplitPane`の`height`/`max-height`を`window.innerHeight -
    splitPane.getBoundingClientRect().top`へ`!important`で強制設定
    する。`MutationObserver`（`document.body`の`childList`/`subtree`）
    と`resize`イベントの両方をトリガーにして、レイアウト変更の
    たびに再計算する。
  - 検証：この環境ではスクリーンショットのキャプチャが
    エミュレート幅の一部しか写らない既知のツール制約
    （9.16のrequestAnimationFrame同様、環境固有の制約であり
    コード側の不具合ではない）があったため、`getBoundingClientRect()`
    による実測値の比較を正としてPC幅・スマホ幅（デバイス幅切替後）の
    両方で確認した：修正前は`splitPane.bottom`が`window.innerHeight`を
    約52px超過していたのに対し、修正後は`splitPane.bottom`・
    `iframe.bottom`がいずれも`window.innerHeight`と完全に一致
    （オーバーフロー無し）になることを確認した。
- **【3】「下層ページ編集」一覧のページ名リアルタイム反映は
  config.ymlでは解決不可能——Decap CMS `files`コレクションの
  確定的な仕様上の制限と判明（9.20-Dの前提を修正）**：
  過去の複数セッションでは`summary: "{{fields.heading}}"`（9.3・
  9.20-D）を「効いている」ものとして記録していたが、これは
  **既定値と実際の値がたまたま一致していたことによる誤検知
  （false positive）だった**ことが、今回の統制実験で判明した。
  - 検証方法：既存の`productsCatalog`エントリ（`name:
    productsCatalog`、`summary: "{{fields.heading}}"`設定済み）が、
    セッション初期の頃から`label`（固定表示名）と実際の`heading`
    フィールド値が一致しない状態で放置されていたことを利用し、
    一覧に表示される文字列が`label`（設定上の固定ラベル）と
    `heading`（フィールド値）のどちらになるかをA/Bで確認した。
    結果、一覧には常に**`label`の静的な文字列**が表示され、
    `heading`の値やその変更は一切反映されないことを確認した。
  - 結論：Decap CMS 3.16.2において、`files:`コレクションの
    サイドバー・一覧の表示名は**常に`config.yml`の静的な`label:`
    文字列で決まり、`summary`テンプレートはこのコレクション種別の
    一覧表示には効果を持たない**（folderコレクションの一覧
    ラベルには`summary`が効く仕様と混同しないよう注意）。
  - **`window.CMS`の公開API（`registerPreviewTemplate`／
    `registerEventListener`等）にはRedux storeへのアクセスが
    一切含まれておらず**、フォーム側の値をサイドバー表示に
    安全に反映させるDOM横断的な仕組みを実装する手段が存在しない
    （危険なDOMパッチ以外に安全な実装経路が無い）。そのため、
    **これはこのテンプレートのコード側では解決できない、Decap CMS
    3.16.2自体のプラットフォーム制限**と結論づけ、`config.yml`は
    変更していない（既存の`summary: "{{fields.heading}}"`設定は
    実害がないため残しているが、一覧表示への効果は無いことを
    ここに明記する）。回避したい場合の唯一の現実的な手段は、
    「下層ページ」を`files`コレクションではなく、複数ファイルを
    扱う`folder`コレクション（`works`/`news`と同様の構成）に
    設計変更すること——ただし1コレクション1ファイル固定という
    現状の設計（services/about/contact/newsPage、9.3参照）を
    大きく変更することになるため、別途要件として持ち込む必要がある。

### 9.26 マーカーの真のインライン化（`type: 'inline'`の発見）／`files`一覧のページ名リアルタイム反映を実現（2026-09）

9.21・9.22・9.25で「Decap CMSの公開APIの範囲では不可能」と結論づけていた
2つの問題について、**バンドル本体のソースコードを直接解析する**という
より踏み込んだ調査を行った結果、いずれも新しい実装方法が見つかり、
過去の結論を覆す形で解決した。

**A. `registerEditorComponent`の非公開オプション`type: 'inline'`**

- unpkg配信の`decap-cms@3.16.2`本体バンドル（`decap-cms.js`、5MB超）を
  実機で`fetch`して文字列解析した結果、`registerEditorComponent`の
  内部実装が`type`プロパティを受け取っており、既定値`"shortcode"`
  （9.21〜9.25までに実装していた6コンポーネントは全てこれ＝常に
  Slateの独立ブロック要素として挿入される）とは別に、**`type:
  'inline'`を指定すると全く異なるレンダリングパスに切り替わる**ことを
  発見した。`type: 'inline'`のコンポーネントは、生成されるSlateノードが
  `{type: "inline-shortcode", isVoid: true}`という**インラインの
  voidノード**になり、本体側のレンダラー（バンドル内関数`i0`）が
  `<span style="display:inline-flex;align-items:center;
  vertical-align:baseline;...">`でラップして`toPreview()`の戻り値を
  そのまま**段落中のテキストの一部として**描画する。実機検証で、
  「前半」というテキストの直後に`type:'inline'`のマーカーを挿入すると、
  エディタのDOM上で`<p>前半<span data-slate-inline="true"
  data-slate-void="true">...<mark>...</mark>...</span></p>`という
  **単一の`<p>`要素の中に文字テキストとマーカーが共存する**構造に
  なることを確認した（9.21〜9.25までの`type:"shortcode"`では、
  マーカーは常に`<p>`の外側にある独立した`<div data-slate-void="true">`
  になり、これがエディタ上で「保存するまで改行されて見える」不具合の
  直接の原因だった）。これにより、エディタ上の見た目・実際の保存後の
  Markdown・実サイトのビルド後HTMLの3つが完全に一致するようになった
  （マーカーの前後に半角スペースが入って見えていた問題も、この構造
  変更に伴い解消した——空白文字が実際に挿入されていたわけではなく、
  旧来の独立ブロック構造がもたらす見た目上の「浮いた」印象が、保存後の
  詰まった表示とのギャップとして「前後にスペースがあるように見える」
  形で認識されていたと考えられる。新構造ではこのギャップ自体が
  発生しない）。
  - **`pattern`の書き方が変わる**：`type:'inline'`のパターンは
    「段落中の任意の位置」にマッチする必要があるため、末尾の
    `\s*$`（行末までの一致要求）を書いてはいけない（書くと、
    マーカーの後ろに文章が続くケースで、保存済みMarkdownの再読み込み
    時にパターンがマッチせず復元できなくなる）。先頭の`^`は本体側が
    自動付与するため書いても書かなくても同じ。
  - **既定では編集フォームが一切表示されない**：`type:"shortcode"`
    （既定）はクリックで「カラー」「テキスト」等の入力欄がその場に
    展開される専用UIを本体が自動提供するが、`type:'inline'`では
    このUIが提供されず、`onEdit(props)`という非公開コールバックを
    自分で実装しない限り、挿入後に一切編集できない（クリックしても
    何も起きない）ことを実機検証で確認した。そのため
    `editor-components.js`に`editMarkerModal()`という素のDOM操作
    （外部ライブラリ不使用の既存方針を踏襲）による簡易モーダルを
    自前実装し、`onEdit: function(props){ return
    editMarkerModal(props.data || {}); }`として登録した。
    `onEdit`はPromiseを返す関数として呼ばれ、解決値（新しい
    フィールド値のオブジェクト、またはキャンセル時は`null`相当）が
    自動的にSlateノードの`data`へ反映される。
  - **対象範囲を限定**：この`type:'inline'`変更は「マーカー
    （蛍光ペン）」のみに適用した。囲い枠・吹き出し・テキスト配置・
    動画埋め込みは実サイト上でも`<div>`/`<video>`という**本来
    ブロック要素**として表示される仕様のため、`type:"shortcode"`
    （ブロック挿入）のままが正しい。マーカーだけが「本来インライン
    要素であるべき`<mark>`」だったために、この非公開オプションが
    ぴったり適合した。
  - `editor-components.js`は今後もこのバンドル解析結果に依存する
    実装のため、decap-cms本体のバージョンアップ時は`type:'inline'`
    ・`onEdit`・`toPreview`の呼び出し関数（`i0`相当）が変わって
    いないか実機で再確認すること。

**B. React Fiber経由でのReduxストア読み取りによる、`files`一覧の
ページ名リアルタイム反映**

- 9.25で「`window.CMS`の公開APIにはRedux storeへのアクセスが一切無く、
  安全な実装経路が存在しない」と結論づけていたが、**「公開APIには
  無いが、Reactのレンダーツリー（Fiber）を辿れば読み取れる」**という
  別の経路があることに気づき、実機検証で確認した。具体的には、
  管理画面のルートDOM要素（`#nc-root`）が持つ`__reactContainer$...`
  プロパティ（Reactが内部的に付与するFiberツリーへの参照）を辿り、
  `memoizedProps.store`に`getState`関数を持つノード（＝
  `react-redux`の`<Provider store={store}>`が実際に保持している
  Reduxストア本体）を探索して取得できることを確認した
  （`store.getState().entries.get('entities').get('<collection>.<slug>')
  .get('data')`で、各エントリの実際に保存されている最新フィールド値に
  Immutable.jsの`Map`としてアクセスできる）。
  - **安全性の根拠**：(a) 参照は`store.getState()`のみで`dispatch`は
    一切行わない（純粋な読み取り専用アクセスで、Reduxの状態を変更
    しない）。(b) 書き換え対象は一覧画面の`<h2>`要素内の「見出し
    テキストの文字ノード」だけであり、実際の編集フォーム（Slateの
    contentEditable領域）には一切触れない——9.22で確認した
    execCommand経由のcontentEditable直接操作（Slateの内部状態との
    不整合でデータが壊れる恐れがある手法）とはリスクの性質が全く
    異なり、この処理が保存データを壊すことは構造上あり得ない。
    (c) 対象フィールド名`pageName`はハードコードせず
    `data.has('pageName')`で判定（9.3の`urlSlug`自動採番と同じ設計
    方針）しているため、将来別のfilesコレクションに`pageName`
    フィールドを追加した場合も自動的に適用される。(d) Fiber内部
    プロパティ名やストアの内部構造が見つからない場合は例外を投げず
    静かに諦める実装にしており、万一decap-cms本体・Reactの
    バージョンアップでこの非公開の内部構造が変わって動かなくなっても、
    一覧には静的な`label`が表示される（＝今までの挙動に戻るだけ）
    という安全側に倒れる設計にしている。
  - **実装**：`public/admin/index.html`に`findDecapReduxStore()`
    （Fiber探索、結果を`window.__cmsReduxStore`にキャッシュ）・
    `patchFilesCollectionListLabels()`（`a[href*="/entries/"]`を
    全て走査し、対応するReduxエントリの`data.pageName`があれば
    `<h2>`内の見出しテキストだけを書き換える。アイコン用の
    ネストした`<div>`は`textContent`一括代入ではなく最初の
    テキストノードだけを差し替えることで温存している）を追加。
    `MutationObserver`（一覧DOM再描画時）・`store.subscribe()`
    （Redux状態変化時）・`hashchange`（コレクション切替時）の
    3系統から呼び出し、常に最新の状態に追従させている。
  - **実機検証**：`services.yml`の`pageName`を「テスト用ページ名ABC」
    に変更して公開 → 一覧（リスト表示・グリッド表示の両方）が
    即座に「テスト用ページ名ABC」に更新されることを確認。
    `git checkout`でファイルを元の値に戻した後、ページを再読み込み
    すると一覧も元の「サービス内容・料金」に戻ることも確認済み
    （＝ファイルの実際の内容と一覧表示が常に一致する）。
  - **教訓**：`window.CMS`の公開APIに手段が無いことは、必ずしも
    「decap-cms本体に技術的な実現手段が無い」ことを意味しない。
    本体はReact+Reduxで構築されているため、Reactのレンダーツリーを
    経由すれば公開APIの外側にある内部状態に読み取り専用でアクセス
    できる場合がある。ただし内部実装への依存度が非常に高く、フェイル
    セーフ（例外を握りつぶし、失敗時は旧来の表示に自然に戻す）を
    必ず組み込むこと。

### 9.27 マーカーの左右余白ゼロ化／スマホでの管理画面編集スクロール不可の修正（9.25の副作用）（2026-09）

- **【1】マーカー適用テキストの左右余白を撤去**：`.prose-content
  .cms-mark`（`src/styles/global.css`、実サイト・CMSプレビュー共通）が
  持っていた`padding: 0 4px`を`padding: 0; margin: 0;`に変更し、
  `editor-components.js`の`toPreview`（テキスト入力済みの状態、
  空欄時のプレースホルダー表示は対象外）も同じく`padding: 0`に
  揃えた。9.26で`type:'inline'`化した際にマーカーが前後のテキストと
  同一`<p>`要素に収まるようになったことで、この左右paddingが
  「前後のテキストとの間にわずかな隙間がある」という見た目上の
  違和感として顕在化した（9.26以前は独立ブロックだったため
  paddingの有無は目立たなかった）。ビルド後のインラインCSSで
  `.cms-mark{padding:0;margin:0;border-radius:3px}`になっている
  ことを確認済み。
- **【2】スマホで管理画面の編集フォームがスクロールできない不具合
  （9.25で追加した`fixSplitPaneHeight()`の副作用と判明）**：
  9.25で「PC幅からデバイス幅切替ボタンでプレビューをスマホ幅
  シミュレーションした際、プレビューiframeが画面下にはみ出して
  固定バーが見えなくなる」不具合を修正するために追加した
  `fixSplitPaneHeight()`（`.SplitPane`の高さを`window.innerHeight -
  自身のtop座標`に強制する処理）が、**管理画面自体を実機の
  スマホ（狭いビューポート）で開いた場合には別の重大な副作用を
  引き起こす**ことが判明した。
  - **原因の詳細**：スマホ幅では`[class*='ControlPaneContainer']`に
    `overflow: visible !important`が指定されている（react-selectの
    ドロップダウンメニューが祖先要素のoverflowで見切れないようにする、
    7章／9.4／9.10で解説済みの必須設定）。この状態で`.SplitPane`の
    高さをJSで固定値に強制すると、`ControlPaneContainer`の実際の
    コンテンツ（フォーム全体、実測22000px超）は視覚的にはそのまま
    描画され続けるが、**`overflow:visible`の子要素の内容量は
    祖先のレイアウト計算上の高さには反映されない**というCSSの
    基本仕様により、スクロールを担う祖先`[class*='EditorContainer']`
    （9.7章の自前タッチスクロール実装の対象）の`scrollHeight`が
    `.SplitPane`に強制した固定値（実測746px）近辺
    （+ツールバー分の66px程度）に押し込まれてしまう。結果、
    実際にタッチでスワイプしても最大でも66px程度しかスクロール
    できず、フォームの大部分（特に最下部の項目）に到達できなくなって
    いた（実機検証で、修正前は`editorContainer.scrollHeight`が878px
    程度しかなく、修正後は`22620px`＝フォーム全体を正しく反映する
    ことを確認）。
  - **修正**：`fixSplitPaneHeight()`の先頭に、実機の管理画面自体が
    モバイル幅（既存の`@media (max-width: 799px)`と同じ799px基準、
    `window.matchMedia('(max-width: 799px)')`で判定）の場合は
    何もせず、かつ以前このJSが設定した強制値が残っていれば
    明示的に解除する（`removeProperty('height')` /
    `removeProperty('max-height')`）処理を追加した。この基準で
    「PC幅でデバイス幅切替ボタンによりプレビューだけをスマホ幅
    シミュレーションしている」ケース（9.25が対象とした本来の
    不具合）と、「管理画面自体が実機スマホで表示されている」
    ケースを判別できる——後者ではそもそもプレビューPane2自体が
    画面に表示されないため、9.25が解決しようとした「プレビュー
    iframeが画面外にはみ出す」問題自体が発生し得ない。
  - **検証**：実機のタッチスクロール処理（`touchstart`/`touchmove`/
    `touchend`）を`TouchEvent`で直接シミュレートし、修正前は
    ほぼ動かなかった`scrollTop`が、修正後はフォーム最下部
    （`scrollHeight - clientHeight`の最大値ぴったり）まで正しく
    到達することを確認。あわせて、PC幅でデバイス幅切替ボタンを
    「スマホ」に切り替えた場合は`.SplitPane`の高さ強制が引き続き
    働き、プレビューiframeの下端が`window.innerHeight`と一致する
    （＝9.25で解決した固定バー可視化の効果は変わらず維持されている）
    ことも確認済み。
  - **教訓**：ある不具合を直すために特定のDOM要素へCSS/JSでの
    強制値を導入する際は、その要素が**複数の異なる利用シーン
    （今回は「PC幅でのデバイス幅シミュレーション」と「実機スマホでの
    表示」の2つ）に共用されていないか**を必ず確認すること。片方の
    シーンだけを想定した対症療法が、もう片方のシーンで別の不具合を
    生む典型例だった。
- **テスト中に再発したエントリ間コンテンツ混線事故（9.25と同種、
  対処法も同じ）**：本タスクの検証中、`works`コレクションの
  テストエントリ（`-2.md`）でマーカーの動作確認を行っていた際、
  `git status`で`src/data/siteInfo.yml`が意図せず変更されている
  ことを検知した。中身を確認したところ、フィールドの並び順が
  丸ごとシャッフルされた上、ファイル末尾に`---`と
  `<mark class="cms-mark cms-mark--yellow">middle</mark>前半`という
  works側のテスト本文がそのまま混入していた——9.25で報告した
  「複数の異なるエントリ間をハッシュ変更・JSでのDOM操作を交えながら
  短時間に行き来すると、Decap内部のエントリコンテキストが混線し、
  別エントリの内容が誤って書き込まれる」事故が、今回も別の操作
  パターン（`location.href`によるハッシュ直接書き換え・
  `location.reload()`・`find`ツールの古いrefでのクリックを混在させた
  検証手順）で再現した。`git checkout -- src/data/siteInfo.yml`で
  即座に元へ戻し、コミット・pushには含めていない。**今後の検証でも、
  複数のCMSエントリを行き来する際は、ハッシュの直接書き換えや
  JSでの疑似操作を避け、実際のUIクリック（サイドバーのリンクを
  クリックする等）による通常のページ遷移のみを使うこと**（9.25の
  教訓を再確認する形になった）。

### 9.28 「お知らせ投稿」本文でのスマホスクロール不可を修正（`[contenteditable]`セレクタの落とし穴）／テキスト配置の`type:'inline'`化は安全に実装不可能と確定（2026-09）

- **【1】スマホで囲い枠・吹き出し等の下へスクロールできない不具合の
  根本原因と修正**：`public/admin/index.html`の自前タッチスクロール
  実装（9.7章参照）が持つ`isTouchScrollExempt()`の除外リストに
  `[contenteditable]`という属性セレクタが含まれていたが、**この
  セレクタは値を問わずマッチする**（`contenteditable="true"`だけでなく
  `contenteditable="false"`にも一致する）という、CSS属性セレクタの
  基本仕様に起因する見落としが原因と判明した。本文（markdownウィジェット）
  内の囲い枠・吹き出し等（`registerEditorComponent`の既定`type:"shortcode"`）
  が挿入するSlateのvoidブロックは、編集不可であることを示すために
  `contenteditable="false"`を持つが、これも同じセレクタでヒットして
  しまい、誤って自前スクロールの対象外に含まれていた。この状態で
  ブロックの背景・余白部分（内部のreact-selectドロップダウンや
  textarea自体ではない部分）から指でスワイプを開始すると、自前
  スクロール処理は「除外対象だから」と完全に手を引く一方、実際に
  スクロールを担う祖先`[class*="EditorContainer"]`は`overflow:hidden`
  （自前スクロール専用の設定、9.7章参照）のため、ブラウザの
  ネイティブスクロールも発生せず、その要素より下へ一切スクロール
  できなくなっていた。
  - 修正：`[contenteditable]`を`[contenteditable="true"]`に変更し、
    本当に編集可能なテキスト領域（Slateのエディタ本体）だけを除外
    対象とし、`contenteditable="false"`のvoidブロック自体は自前
    スクロールの対象に含めるようにした（内部のinput/textarea/select
    は引き続き別途この配列内の該当セレクタでスクロール対象外になる
    ため、実際のフォーム操作は妨げない）。
  - 検証：実際のDOM上に`contenteditable="false"`のvoidブロック相当の
    要素と`contenteditable="true"`の編集可能領域を用意し、更新後の
    除外セレクタ文字列に対して`Element.closest()`を実行した結果、
    前者が除外対象から外れ（＝自前スクロールが機能する）、後者は
    引き続き除外される（＝テキスト編集・選択操作は妨げられない）ことを
    確認した。加えて、本セッション中に何度か管理画面のリッチテキスト
    ツールバー（太字・見出し・「+」等）のボタンが`disabled`のまま
    反応しなくなる現象に繰り返し遭遇したが、DOM操作・タブの開閉・
    リッチテキスト/マークダウンモード切替を多用した自動テスト環境
    特有の状態不整合によるものと考えられ、コード変更のロールバックや
    再現手順の単純化を試みても解消しなかった一方、`git diff`で確認した
    修正コード自体に問題点は見当たらず、上記の`closest()`による
    ロジック単体検証で意図どおりの判定結果が得られていることから、
    実際の実機・通常のブラウザ操作では影響しないテスト環境固有の
    問題と判断した。
- **【2】テキスト配置（左・中央・右）の`type:'inline'`化は試みたが、
  安全に実装不可能と判明したため見送った**：マーカー（9.26）と同じ
  `type:'inline'`をテキスト配置コンポーネントにも適用し、「本文中に
  独立したブロック/セクションが生成される」という見た目上の違和感を
  解消できないか検証したが、**バンドル本体のソースコード解析により、
  `<div>`タグをベースにしたコンポーネントには適用できないことが
  判明した**：
  - decap-cms本体のブロックレベルshortcode解析処理
    （`fromBlock`のマッチング候補を探す関数）は
    `if ("inline"===e.type) return false`という条件で、`type:'inline'`
    に指定したコンポーネントを明示的にマッチング候補から除外する。
  - 一方、CommonMarkの仕様上`<div>`は「HTMLブロック開始タグ」に
    該当するため（9.25参照）、保存済みMarkdownを読み込む際、この
    `<div>`はインライン処理に到達する前にブロックレベルのHTMLとして
    処理される。
  - この2つを組み合わせると、`type:'inline'`にした`<div>`ベースの
    コンポーネントは、**保存後に一度でも編集画面を再読み込みすると
    二度と編集可能な状態に復元できなくなる**（生の壊れたHTML
    テキストとして表示される）——実機検証でも、リッチテキストモードで
    挿入した直後は正常に動作するが、いったんMarkdownモードに切り替えて
    から再度リッチテキストモードに戻すと、当該コンポーネントが
    パースされずプレーンテキストとして表示されることを確認した。
  - マーカーの`<mark>`タグはCommonMarkのHTMLブロック開始タグに
    該当しないため、`type:'inline'`化してもこの問題が起きなかった
    （9.26参照）。しかし`<div>`ベースの囲い枠・吹き出し・テキスト
    配置・`<video>`ベースの動画埋め込みには、同じ手法を**安全に
    適用できない**——これは実装上の妥協ではなく、CommonMarkの仕様と
    decap-cms本体の実装が組み合わさって生じる、機能を壊しかねない
    明確な技術的制約である。
  - このため`aligned-text`コンポーネントは変更前の`type:"shortcode"`
    （ブロック型）実装のまま維持し、`editor-components.js`にこの
    検証結果・実装しなかった理由を明記した。編集画面上で独立した
    カード状の入力欄に見える点（ユーザーからの繰り返しの指摘点）は
    解消できていないが、保存データの安全性を優先した結果であり、
    今後同種の要望が来た場合も同じ制約が適用されることを踏まえて
    対応すること。

### 9.29 スマホでの本文スクロール不可を完全修正（`[contenteditable="true"]`除外自体が原因だった）（2026-09）

- **9.28の修正だけでは不十分だった**：9.28では`[contenteditable]`
  （値を問わずマッチ）を`[contenteditable="true"]`に限定することで、
  囲い枠・吹き出し等のvoidブロック（`contenteditable="false"`）を
  誤って除外していた問題を修正したが、**本文の「装飾ではない普通の
  テキスト部分」自体も`[contenteditable="true"]`に一致する**ため、
  除外リストに残したままだと同じ理由（自前スクロールが手を引く一方、
  祖先`[class*="EditorContainer"]`は`overflow:hidden`のためネイティブ
  スクロールも発生しない）でスクロール不能のままだった。「ツールバーや
  外枠部分をスワイプすればスクロールするが、本文のテキスト部分の上だと
  スクロールできない」という再現手順の違いから、9.28では対処しきれて
  いなかった本丸がこちらだったと判明した。
  - 修正：`[contenteditable="true"]`を除外リストから完全に削除した
    （`input`/`textarea`/`select`等の実フォーム要素の除外は維持）。
    本文のSlateエディタ本体（`[data-slate-editor]`）へのタッチも
    自前スクロールの対象に含まれるようになる。
  - **タップによるカーソル位置指定を壊さない理由**：自前スクロールの
    `touchmove`処理は`TOUCH_MOVE_THRESHOLD`（6px）を超える移動が
    あった場合のみ`preventDefault`してスクロールを開始する設計に
    なっており、指を動かさない単純なタップはこの閾値を超えないため
    介入せず、`touchend`後のブラウザ標準のクリック処理でカーソル
    位置は従来どおり設定される。実機検証で、本文テキストを直接
    タップしてから文字を入力すると正しい位置に挿入されることを
    確認し、続けて同じテキスト上で下方向へのスワイプ（`touchstart`→
    `touchmove`×2→`touchend`をシミュレート）を行うと
    `[class*="EditorContainer"]`の`scrollTop`が正しく最大値まで
    到達する（＝本文の最後まで到達できる）ことを確認した。長押しから
    のテキスト選択ドラッグと完全には弁別できない可能性があるが、
    本UIは管理画面の編集フォームであり、スクロールできない致命的な
    不具合を放置するより優先すべきトレードオフと判断した（本文以外の
    フォーム要素でも同じ閾値ベースの判定が既に使われており、一貫した
    設計）。
  - 加えて、`[data-slate-editor]`と各voidブロック内の装飾要素
    （`img`/`mark`/直下の`div`）に`touch-action: pan-y`をCSSで
    明示し、ブラウザ自身のcontentEditable用ジェスチャー処理に
    タッチが奪われる前に、必ずJS側の`{ passive: false }`な
    `touchmove`リスナーが`preventDefault`で主導権を握れるようにする
    保険を追加した（`touch-action`だけでは実際のスクロール量制御は
    できないため、あくまでJS側の処理を確実に動作させるための
    補助）。
  - 9.28からの教訄：既存の除外セレクタを直しても「一部だけ直った」
    状態に見えることがある（今回は`contenteditable="false"`の
    void要素は直ったが、`contenteditable="true"`の本体テキストは
    直っていなかった）。同じ属性値を持つ複数の異なる対象
    （編集可能な本体テキスト／編集不可のvoidブロック）が同じ
    セレクタ系列に引っかかっていないか、修正後も範囲を分けて再検証
    すること。

### 9.30 プレビュー「PC」表示の幅が「タブレット」より狭い不具合／それに伴う画面下部固定バーの誤表示を修正（2026-09）

- **原因**：デバイス幅切替の「PC」は、tablet/mobileのような
  `!important`による強制幅を一切持たず、単に`data-cms-device`属性を
  外して**react-split-pane自身の既定値（両ペイン`flex: 1 1 0%`の
  単純な50/50分割）任せ**にする実装だった。この既定の50/50分割では、
  Pane2（プレビュー）の実測幅が、tabletの固定値768pxを**下回る
  場合がある**（実測：ウィンドウ幅1400pxでPane2が698px）ことを
  確認した——「PC表示のほうがタブレット表示より狭い」という報告と
  完全に一致する。
  - さらに、この698px（768px未満）という狭さが、実サイト側
    `StickyContactBar.astro`の`md:hidden`（Tailwind既定の`md`
    ブレークポイント=768px）を「768px未満だから表示する」に**正しく
    反応させてしまい**、「PC表示なのに画面下部固定バーが出る」という
    2つ目の不具合も引き起こしていた。サイト側のレスポンシブ判定
    ロジック自体は正しく、プレビューの実際の幅が想定より狭すぎた
    ことが根本原因——2つの不具合は独立した別々のバグではなく、
    **単一の原因（PC時の幅計算）から生じる一連の症状**だった。
- **修正**：「PC」もtablet/mobileと全く同じ「`data-cms-device`属性＋
  CSSの`!important`」方式に統一した。フォーム側（Pane1）に無理のない
  固定幅（400px）を、プレビュー側（Pane2）に残り全幅
  （`calc(100% - 400px)`）を明示指定する新規CSSルール
  `.SplitPane[data-cms-device='pc']`を追加。一般的なデスクトップ幅
  （1200px以上）であれば、Pane2は自然に1000px前後を確保でき、
  タブレット・スマホ双方のブレークポイントを安全に上回るように
  なる。
  - **Resizer手動ドラッグとの両立**：旧実装は「tablet/mobile表示中に
    Resizerをドラッグしたら自動的にPCへ戻す」処理を
    `currentPreviewDevice !== 'pc'`という条件で行っていたが、「PC」
    自体も`!important`で幅を強制するようになったため、この条件の
    ままだと**PC表示中にResizerをドラッグしても何も反応しなくなる**
    （既にPCだから条件に一致しない）。デバイスの種類を問わず、
    Resizerのドラッグ開始（`mousedown`/`touchstart`）を検知したら
    必ず`data-cms-device`属性そのものを外して自由なドラッグに戻す
    `releaseDeviceWidthLock()`に統一し、あわせてツールバーの
    PC/タブレット/スマホボタンの強調表示もすべて解除する（＝
    「今はどのプリセットにも一致しないカスタム幅」であることを示す）。
  - **初回マウント時の取りこぼし対策**：`.SplitPane`はReactが非同期に
    描画するため、初期化スクリプト実行時点ではまだDOMに存在せず、
    最初の`applyPreviewDevice('pc')`が属性を設定できないまま終わる
    ケースがあった（旧実装では「PC＝属性なし」がそのまま初期状態と
    一致していたため問題が表面化していなかったが、「PC＝属性
    `pc`」に変更したことでこの取りこぼしが可視化された）。
    `.SplitPane`の出現を監視するMutationObserverを追加し、出現した
    時点で現在選択中のデバイス（自由ドラッグ中＝`currentPreviewDevice`
    が`null`の場合は何もしない）を改めて適用するようにした。
  - **検証上の注意（自動テスト環境の既知の制約）**：この検証中、
    `getComputedStyle()`/`getBoundingClientRect()`によるJS側の幅
    測定が、実際の画面表示（スクリーンショット）と食い違う現象に
    複数回遭遇した（例：スクリーンショットでは明らかにPC/タブレット/
    スマホで異なる幅・レイアウトが正しく表示されているのに、直後の
    JS測定は変化前の値を返し続ける）。原因はビューポート
    エミュレーション環境特有の計測タイミングの問題と考えられ、
    実際の描画（スクリーンショット）は一貫して正しい結果を示して
    いた。**この種の幅・レイアウト検証では、JSの数値測定よりも
    スクリーンショットによる目視確認を優先すること**——今回もPC/
    タブレット/スマホの3状態＋手動ドラッグの計4パターンをすべて
    スクリーンショットで確認し、期待どおりに動作することを確認した
    （PC：デスクトップナビ・固定バーなし・プレビュー幅最大／
    タブレット：ナビが折り返し・PCより明確に狭い／スマホ：
    ハンバーガーメニュー・画面下部固定バー表示／手動ドラッグ：
    どのプリセットにも属さない自由な幅に追従し、その幅なりの
    レスポンシブ表示になる）。

### 9.31 プレビューのハンバーガーメニュー開閉を全画面で復元／「サイト全体設定」プレビューの完全ビジュアル化／お知らせのトップ固定機能を実装（2026-09）

**A. スマホプレビューのハンバーガーメニューが開閉しない不具合の修正**

- **原因の切り分け**：「サイト全体設定」（`SiteInfoPreview`）の
  ハンバーガーは9.21で実装済みの本物のReact state（`mobileNavOpen`）＋
  `onClick`ハンドラのため、実機検証でも問題なく開閉した。一方、
  「下層ページ編集」「商品作成」「実績・活用事例作成」「お知らせ投稿」
  の各プレビュー（`pagePreviewShell`／`WorkPreview`が使う
  `publishedHeaderHtml`＝本番`/`から取得した`<header>`の生HTMLを
  `dangerouslySetInnerHTML`でそのまま挿入する方式）は、7章・9.21で
  「埋め込まれた`<script>`は実行されないため見た目には影響しないが
  ハンバーガーはクリック不可のまま」と**既知の制約として記録済み**
  だったが、今回はこれを実際に解消できることが分かった。
- **修正**：`src/components/MobileMenuButton.astro` /
  `MobileNavDrawer.astro`が持つ安定したID（`#menu-btn` /
  `#mobile-nav` / `#bar1`〜`#bar3`）を使い、挿入後のDOMに対して
  `MobileNavDrawer.astro`の`<script>`と全く同じ開閉ロジック
  （`setMenu()`）を手動で再アタッチする`activateStaticHeaderMenu()`を
  追加した。二重アタッチ防止に`data-menu-wired`属性を使う。
  - **実装上のハマりどころ（reactのrefが効かない）**：当初は
    Reactの`ref`コールバックで挿入先のDOMノードを受け取る設計にしたが、
    実機検証で`ref`が一度も発火しないことが判明した。原因を
    `window.h`（Decapが公開している`React.createElement`）の実体を
    直接ダンプして確認したところ、`ref`を特別扱いせず通常のprops
    として扱っているだけの実装であることが分かった（本ファイルの
    どの既存コードも`ref`を使っていなかったのはこれが理由と考えられる）。
    そのため、挿入先のDOMを取得する手段として`ref`は使わず、
    代わりに（onClickハンドラ等の通常のReactイベント委譲は問題なく
    動作することを別途確認済みの上で）呼び出し元のクラスコンポーネントの
    `componentDidMount`/`componentDidUpdate`から、管理画面側の
    `document.querySelector('.Pane2 iframe')`を辿って
    プレビューiframeの`contentDocument`を取得し、そこから
    `#menu-btn`等をIDで検索する方式にした。この処理自体は
    `WorkPreview`・`makePagePreview`（内部的に`pagePreviewShell`を
    使う`ProductsCatalogPreview`/`ServicesPagePreview`/
    `AboutPagePreview`/`ContactPagePreview`/`NewsListPagePreview`/
    `NewsPreview`が共通利用）の両方に追加した。
  - 実機検証：`npm run dev`（`astro dev`）・`npm run build && npm run
    preview`の両モードで、実績・活用事例／下層ページ編集（サービス
    内容・料金）の各プレビューをスマホ幅に切り替え、ハンバーガーを
    クリックすると`aria-expanded`が`true`に変わり、ドロワーが実際に
    開く（ナビ項目・お問い合わせボタンまで表示される）ことを確認した。
  - **教訓**：「埋め込んだ`<script>`が実行されないため機能を諦める」
    という過去の結論（7章・9.21）は、`<script>`自体を動かす方法が
    無いことは事実だが、**挿入後のDOMに対して同じロジックを手動で
    再アタッチすれば同等の機能を実現できる**ケースがある、という
    より一般的な教訓として記録する。9.26（`type:'inline'`の発見）や
    9.26-B（React Fiber経由のRedux参照）と同様、「公式に用意された
    手段が無い＝実現不可能」と早期に断定せず、実際のDOM構造・
    バンドル内部実装を調べることで解決できる場合がある。

**B. 「サイト全体設定」プレビューの完全ビジュアル化（省略テキストの廃止）**

- **実装**：ヘッダー・フッター・画面下部固定バーで既に確立していた
  「本番`/`から取得した公開済みHTMLをそのまま流用する」方式
  （7章・9.22参照）を、トップページの「サービス内容」「商品一覧」
  「実績・活用事例」「お知らせ」の4セクションのカード本体にも拡張した。
  `loadSiteStylesheetAndTheme()`が取得済みの`parsed`（本番`/`の
  DOM）から、共通ヘルパー`extractCardsHtml(parsed, sectionId)`で
  各セクションの`[data-slider-root]`（カードのグリッド／スライダー
  本体）と、その外側の兄弟要素`[data-slider-dots]`（9.16で確立した
  「dotsはrootの外」規約）を抜き出し、`publishedServicesCardsHtml`
  `publishedProductsCardsHtml`（商品一覧トップセクション）
  `publishedWorksCardsHtml`にそれぞれ保持する。お知らせは
  `<ul>`要素を`publishedNewsListEl`（DOM参照のまま保持）として
  取得し、レンダー時に編集中の「トップページに表示する件数」
  （`data.newsSection.count`）で`<li>`単位に再スライスしてから
  `<ul>`を組み立て直す（他の3セクションと異なり、件数フィールドの
  変更を即座にプレビューへ反映できたほうが実用的なため）。
- **見出し・リンク文言との住み分け**：`eyebrow`/`heading`/
  `linkLabel`/`linkHref`は引き続き「今まさに編集中の値」を
  このファイル側で再現し、カード本体（別CMSエントリのデータ）だけを
  公開済みHTMLに置き換える。見出しまで公開済みHTMLに含めてしまうと、
  編集中の値と古い公開済みの値が混在して混乱を招くため、意図的に
  カード部分（`[data-slider-root]`＋`[data-slider-dots]`）だけを
  抽出している。
  取得できなかった場合（`astro dev`でCSSがJS注入される等の理由で
  `/`の取得自体に失敗した場合）のみ、内容の薄い案内文にフォールバック
  する（「省略しています」という表現はやめ、「取得できませんでした」
  に変更——恒常的な仕様ではなく異常系であることを明確にするため）。
  実機検証（`npm run build && npm run preview`）で、「サイト全体設定」
  プレビューをスクロールし、4セクションすべてに実際のカード
  （画像・タイトル・価格等を含む）が表示されることを確認した。
- **未対応（意図的に見送った）：サイト全体設定からのドラッグ&ドロップ
  並び替え**：ユーザーからは「サービス」「商品一覧」の掲載順序も
  `works.order`（9.9参照）と同じ`relation`ベースの並び替えリストを
  「サイト全体設定」に追加してほしいという要望があったが、**Decap
  CMSの`relation`ウィジェットの仕様上、安全に実装できないことを
  確認した**：`relation`は`collection:`で指定した**コレクションの
  個々のエントリ（＝ファイル）**を選択肢として列挙する仕組みであり、
  `works`（1実績＝1ファイルの`folder`コレクション）のように
  各アイテムが独立したファイルである場合にのみ機能する。一方
  「サービス詳細」（`services.yml`の`items`）・商品（`products.yml`の
  `items`）は、**1つのファイル（`files`コレクションのエントリ）の
  中のリストフィールド**であり、リストの各項目は独立したエントリ
  ではないため、`relation`の選択肢として列挙する対象にならない
  （`collection: "services"`と指定しても、選べるのは「services.yml
  という1ファイルそのもの」だけで、その中の個々の「サービス詳細」
  項目までは辿れない）。この制約は`works`が意図的に`folder`
  コレクションとして設計されている理由そのものであり（§4参照）、
  回避するには「サービス」「商品」も`works`と同様に1項目＝1ファイルの
  `folder`コレクションへ設計変更する必要があるが、これは既存データ・
  `/services`／`/products`ページの実装（§4・9.4参照）に及ぶ大きな
  構成変更となるため、今回は見送った。**サービス・商品の掲載順序は
  従来どおり、各データファイル（`services.yml`の「サービス詳細」／
  `products.yml`の商品リスト）自体が持つ`widget: list`のドラッグ&
  ドロップで変更する**（Decapの`list`ウィジェットは元々どのコレクション
  でも項目の並び替えに対応済みのため、これ自体は既に機能している。
  Service.astro／Products.astroともに、この保存済みの並び順を
  そのまま反映するだけで独自の並び替えロジックは持たない）。

**C. 「お知らせ投稿」のトップ固定（ピン留め）機能**

- **実装**：`src/content/config.ts`の`news`スキーマに
  `pinned`（`boolean`、既定`false`）・`pinOrder`（`number`、既定`1`。
  `works.price`等と同じ`cmsNumberWithDefault`ヘルパー経由——Decapの
  numberウィジェットは空欄だと`frontmatter`に`""`を書き出すため、
  素の`z.number()`だとビルドが落ちる、既知の型ゆれ対策）を追加。
  `public/admin/config.yml`の`news`コレクションに対応する2フィールド
  （「この記事を一覧の最上部に固定表示する」「固定時の表示優先度」）を
  追加した。
- **ソートロジック**：`src/lib/news.ts`の`getPublishedNews()`
  （トップページ`News.astro`・一覧ページ`news/index.astro`の両方が
  経由する唯一の取得関数）を、(1)`pinned: true`を常に最優先、
  (2)固定記事同士は`pinOrder`昇順、(3)非固定記事は従来どおり
  `publishedAt`降順、の3段階ソートに変更した。取得関数がこの1箇所に
  集約されているため、他のページ側のコードは一切変更不要だった。

### 9.32 ナビ表示名のページ見出しフォールバック／メディア管理機能の新設／商品一覧誘導ボタン・実績表示順ラベルの修正（2026-09）

**A. ヘッダー・フッターナビゲーション表示名の優先順位変更**

- **変更前**：`src/lib/site.ts`の`visibleNavItems()`は、ナビ項目の
  `label`が未入力の項目を一覧から除外した上で、対応する下層ページの
  `heading`（9.21で追加した`navHrefToPageHeading`）が存在する場合は
  **常にそちらを優先**していた——つまり`label`を入力しても、リンク先が
  下層ページであれば無条件に上書きされ、`label`フィールドは実質
  無意味化していた。
- **変更後**：優先順位を「①ページ見出し（下層ページの場合の既定値）→
  ②ナビ項目自身の「表示名」（入力があれば上書き）」に反転した
  （`label = item.label || pageHeading`）。あわせて、`label`が空欄の
  項目を除外していた旧フィルタ条件も撤廃し、`href`のみを必須とする
  ように変更——`label`は「個別の表記に差し替えたい場合だけ入力する
  任意の上書きフィールド」という位置づけになった（トップページの
  セクションへのリンク等、対応する`heading`が存在しないURLでは、
  従来どおり`label`の入力が実質必須）。
- 実機検証：`src/data/siteInfo.yml`の`nav`先頭項目（`/services`）の
  `label`を一時的に空欄にしてビルドし、ヘッダー・スマホドロワー双方の
  表示名が`services.yml`の`heading`（「サービス内容・料金」）へ
  自動的にフォールバックすることを確認。同時に`footerNav`側は
  `label: サービス`のまま変更していないため、フッターの表示名は
  従来どおり「サービス」のまま（＝個別上書きが優先される）ことも
  確認した。検証後、siteInfoの変更は元の値へ戻し、`git status`で
  差分が残っていないことを確認済み。
- `public/admin/config.yml`の`nav`/`footerNav`の`label`フィールド、
  および`services`/`about`/`contact`/`newsPage`各ページの`heading`
  フィールドに、この優先順位を説明する`hint`を追加した。
- **`preview.js`側は対応不要**：「サイト設定」プレビューのナビ
  （`filterVisibleNavForPreview`/`NAV_HREF_TO_FLAG`）は、他のCMS
  エントリ（下層ページ）の`heading`を参照できないという既存の制約
  （9.4/9.11/9.21参照）がそのまま当てはまるため、この変更に伴う
  追従修正は行っていない（プレビュー上のナビ表示名は常にサイト設定
  側の`label`のみを表示する。実際のフォールバック結果は本番ビルドで
  確認する必要がある）。

**B. 「メディア管理」機能の新設（画像メタデータ・カテゴリ絞り込み・ドラッグ&ドロップアップロード）**

- **前提調査（バンドル解析）**：decap-cms@3.16.2本体バンドルを
  文字列解析した結果、既定のメディアライブラリ（画像フィールドを
  開いた時のアップロード／選択モーダル）には、画像1枚ごとに
  カスタムメタデータ（カテゴリ・タイトル・Altテキスト等）を保存する
  仕組みが**存在しない**こと、およびファイルのドラッグ&ドロップ
  アップロード機構（`"Dropzone"`という文字列自体がバンドル中に
  存在しない）も**組み込まれていない**ことを確認した（`"アップロード
  する"`ボタン経由の`<input type="file">`からの選択のみが既定の
  アップロード手段）。これらはDecap CMSの公開APIで拡張できる範囲
  ではなく、対応するには以下の設計判断を行った。
- **画像メタデータ（カテゴリ・タイトル・Alt）**：Decap本体の
  アセットピッカー自体を安全に拡張する手段が無いため、独立した新規
  コレクション**「メディア管理」**（`name: mediaLibrary`、単一
  ファイル`src/data/mediaLibrary.yml`）を追加し、画像ごとに
  「カテゴリ」（select、7区分）「画像タイトル」「Altテキスト」を
  Decap標準の`list`ウィジェットで管理できるようにした（ドラッグ&
  ドロップの並び替え・追加・削除は`list`ウィジェットの標準機能で
  そのまま利用可能）。各ページの画像フィールド自体はこれまでどおり
  個別に選択する運用のまま変更しておらず、この一覧は**検索・整理用の
  メタデータ台帳**という位置づけであることをコレクションの`hint`に
  明記した。
- **メディアライブラリへのカテゴリ絞り込みドロップダウン**：
  「メディア管理」のデータをどう既定のアセットピッカー（全画像
  フィールド共通のモーダル）に反映させるかが課題だった。当初は
  9.26-Bと同じ「React Fiber経由でReduxストアを読み取る」方式を
  検討したが、実機検証で**このモーダルを開くだけでは`mediaLibrary`
  コレクションのエントリがReduxの`entities`ストアにロードされない**
  こと（Decapは各コレクションのエントリを、実際にそのコレクションの
  一覧ページを開くまで遅延ロードする仕様。起動直後は最初に表示
  される「サイト設定」のみがロード済み）を確認したため、この方式は
  「メディア管理」を一度も開いていないセッションでは機能しないという
  弱点があった。
  - **採用した方式**：既存の「本番公開済みデータの流用」パターン
    （`preview.js`の`loadSiteStylesheetAndTheme()`と同じ考え方。
    7章・9.22参照）を踏襲し、`src/lib/mediaLibrary.ts`（`mediaLibrary.yml`
    をファイル名キーのメタデータへ変換）→`src/pages/media-library.json.ts`
    （`llms.txt.ts`と同じ、ビルド時に静的生成されるAPIルート）→
    管理画面側（`public/admin/index.html`）が同一オリジンから
    `fetch('/media-library.json')`で取得、という経路にした。Redux
    読み取りに依存しないため、セッション内で「メディア管理」を
    一度も開いていなくても機能する。ただし**この方式は「最後に
    ビルド・デプロイした時点のメタデータ」を参照する**（＝メディア
    管理でカテゴリを変更した直後は、再ビルド・再デプロイするまで
    絞り込みには反映されない）という、他の「公開済みHTML流用」
    プレビューと同種の制約を持つことに注意。
  - 実装：メディアライブラリのモーダルが開いたことをMutationObserverで
    検知し、検索欄（`[class*="SearchContainer"]`）の右隣に
    「カテゴリ絞り込み」の`<select>`を挿入する。選択すると、各カード
    （`[class*="CardText"]`が持つファイル名テキストを、対応する
    `[class*="…-Card"]`祖先まで遡って取得し、`/media-library.json`の
    該当カテゴリと一致しなければ`display:none`で隠す）だけの純粋な
    見た目上のフィルタリングで、Decap自身の選択・アップロード処理には
    一切干渉しない（安全）。まだ1件もカテゴリが登録されていない場合は
    絞り込みドロップダウン自体を表示しない（空の選択肢だけの
    紛らわしいUIを避けるため）。
  - 実機検証：`mediaLibrary.yml`に`access-store.jpg`を`category: hero`
    としてテスト登録し、メディアライブラリを開いて「ヒーロー・背景」を
    選択すると該当画像のみが表示され、「すべてのカテゴリ」に戻すと
    全画像が再表示されることをDOM操作で確認した。検証後、テスト
    データは`items: []`に戻し、コミットには含めていない。
- **メディアライブラリへのドラッグ&ドロップアップロード**：モーダル
  自体に組み込みのドロップゾーンが無いため、Decap本体の保存処理を
  再実装する（＝GitHub APIへの直接アップロードを自前で行う）のは
  リスクが高いと判断し、代わりに**モーダル内に既に存在する
  `<input type="file">`（"アップロードする"ボタンの実体）へ、
  ドロップされたファイルを`DataTransfer`経由でセットして`change`
  イベントを発火させ、Decap自身の既存アップロード処理をそのまま
  起動させる**方式にした（手動でボタンをクリックしてファイルを
  選択した場合と全く同じコードパスを通るため、安全性は既存の
  アップロード機能と同一）。対象モーダルの判定は「開いている
  `[class*="StyledModal"]`のうち`input[type="file"]`を含むもの」
  （メディアライブラリ以外のモーダルを誤って対象にしないための
  ガード）。ドラッグ中は対象モーダルに枠線のハイライトを表示する。
  実機検証：1x1ピクセルのPNGを`File`オブジェクトとして生成し、
  `dragover`→`drop`イベントを合成して発火させたところ、実際に
  Decapのアップロード処理が起動し、ファイル一覧に新しいファイルが
  追加されることを確認した（テスト用にアップロードした画像は
  `src/assets/`から削除し、コミットには含めていない）。

**C. 「サイト全体設定」プレビュー：商品一覧の誘導ボタンが表示されない不具合を修正**

- **原因**：`preview.js`の`renderProductsPlaceholder`（「商品一覧」
  セクションのプレビュー）が、同じパターンの`renderServices`・
  `renderNewsSectionPreview`とは異なり、`section.linkLabel`/
  `section.linkHref`（「/productsへの誘導リンク文言」）を読んで
  ボタンを描画する処理を最初から実装していなかった（実サイト側の
  `Products.astro`には既にこのボタンが存在しており、プレビュー側の
  実装漏れだったと考えられる）。
- **修正**：`renderServices`と全く同じマークアップ・クラス
  （`Products.astro`の実際のボタンと一致するスタイル）でボタン描画を
  追加した。実機検証で、「サイト全体設定」プレビューの「商品一覧」
  セクション下部に「さらに商品を見る ›」ボタンが表示されることを
  確認した。

**D. 「実績」表示順序リストの項目ラベルを、選択中の実績が分かる表示に修正**

- **原因**：`config.yml`の`works.order`（`list`＋`relation`）に
  `summary`が設定されておらず、Decap CMSの既定動作では各行の折りたたみ
  表示ラベルとしてフィールドの`label`（「実績」）がそのまま表示され、
  どの実績を選択しているかが展開しないと分からなかった。
- **修正**：`summary: "{{fields.item}}"`を追加し、各行に選択中の
  実績の`relation`格納値（`value_field: "{{slug}}"`＝URL用識別子）を
  表示するようにした。実機検証で、既存の4件の登録済みリスト項目が
  それぞれ`sample`/`-2`/`lp-package`等の識別子で一目で見分けられる
  ようになったことを確認した。
  - **表示されるのは「タイトル」ではなく「URL用識別子（slug）」で
    あることに注意**：Decapの`relation`ウィジェットは選択時に
    `value_field`（＝スラッグ文字列）のみを値として保存する仕様で
    あり、`display_fields`（検索ドロップダウンでの表示用）とは別物。
    保存された値からは`title`まで遡れないため、`summary`テンプレート
    でタイトルを直接表示することはできない（Decap公式のmoustache
    テンプレートは、そのフィールド自身が保存している値しか参照できず、
    他コレクションのエントリを検索して埋め込むような機能は無い）。
    9.26-B（Redux直読みでのタイトル表示）と同様の手法を使えば
    タイトルへの置き換えも技術的には可能だが、実現できる効果が
    「識別子表示」から「タイトル表示」への差分にとどまる割に、
    Reduxの内部構造への依存というコストが見合わないと判断し、今回は
    ネイティブな`summary`設定のみで済ませた。URL用識別子は基本的に
    元タイトルに近い文字列（例：`corporate-site-renewal`）を設定する
    運用のため、実用上は十分に見分けが付く。
- **「表示順序」の双方向同期は実装していない（安全に実装できないと
  判断した）**：「サイト全体設定 ＞ 実績」の並び替えを各実績エントリ
  自身の`order`（数値）フィールドへ自動反映する、またはその逆方向の
  自動反映を行うには、**現在編集中のフォームとは別のコレクション
  エントリのファイルへ、ユーザーの明示的な「公開する」操作を介さずに
  変更を書き込む**必要がある。これは9.26-Bで確立した「Reduxストアは
  読み取り専用でのみ参照し、`dispatch`（状態変更・保存）は一切
  行わない」という本プロジェクトの安全原則に反するため、実装を
  見送った——ユーザーが意図せず別エントリのファイルが書き換えられ、
  無自覚なままGitコミットされてしまうリスク（データ破損・意図しない
  公開）を避けるための判断である。なお、フロントエンド側の表示順は
  9.9で確立した「`site.works.order`（表示順序リスト）を優先し、
  そこに無い実績は各自の`order`数値→登録順で後ろに続く」という
  優先度＋フォールバック方式で、**2つのデータソースを書き換えずとも
  実質的に統一された並び順を実現できている**ため、双方向の物理的な
  データ同期自体が無くても実用上の支障は生じない構成になっている。

### 9.33 実績表示順のタイトル表示（Redux直読み方式へ変更）／`/works`画像サイズ統一／メディア機能の実効性強化（2026-09）

**A. 「表示順序」リストにタイトルを表示（9.32-Dの結論を上書き）**

- 9.32-Dでは「`summary`テンプレートで表示できるのはURL識別子（slug）が
  限界で、タイトル表示にはReduxの内部構造依存というコストが見合わない」
  と判断していたが、改めてユーザーからタイトル表示の要望があったため
  実装した。9.26-Bと同じ「Reduxストアの読み取り専用参照」パターンを
  使い、`works.<slug>`エントリの`title`フィールドを直接参照して
  表示を差し替える。参照できない場合（そのセッションで対象の実績を
  一度も開いていない等）は、`src/pages/works-titles.json.ts`
  （ビルド時に全実績のslug→titleを静的生成したJSON。9.32-Bの
  `media-library.json.ts`と同じ「本番公開済みデータの流用」パターン）
  へフォールバックする。
- **重大な実装上の落とし穴（初回実装は無限ループでタブが完全に
  応答不能になった）**：当初は9.26-Bと全く同じ「MutationObserverで
  `document.body`全体を監視し、対象要素が見つかれば`textContent`を
  書き換える」という実装にしたところ、実機検証で「サイト全体設定」
  エントリ画面を開いた瞬間にタブが完全にフリーズする重大な不具合が
  発生した。
  - **原因の特定**：「サイト全体設定」のような巨大なエントリ画面
    （9.27で言及した実測22000px超のフォーム）は、スクロール同期・
    クイックナビ等の既存機能が持つ定期処理により、ユーザー操作が
    一切無い状態でも**常時、秒間十数回程度のDOM変化（mutation）が
    バックグラウンドで発生し続けている**ことを実機計測で確認した
    （`MutationObserver`でmutation件数を3秒間カウントし、アイドル
    状態でも約50件を記録）。この状態で「`document.body`全体を監視する
    MutationObserver」から`textContent`を書き換える処理を呼ぶと、
    **その書き換え自体が新たなmutationとして同じObserverに観測され、
    ハンドラが再度呼ばれ、さらに書き換えが起きる**……という共鳴的な
    フィードバックループに陥り、ブラウザのメインスレッドを実質的に
    占有してタブが応答不能になることを、最小再現コードで確認した
    （`document.title`の読み取りすら45秒以上応答しない状態を複数回
    確認）。
  - **既存の`patchFilesCollectionListLabels`（9.26-B）が同じ手法でも
    問題ない理由**：あちらは「下層ページ編集」コレクションの
    **一覧画面**（`a[href*="/entries/"]`を持つリンク群）を対象と
    しており、これは「サイト全体設定」のような単一の巨大フォームに
    比べて背景mutationがはるかに少ない、かつ対象要素が見つからない
    画面ではDOM書き込みが一切発生しない（早期return）ため、共鳴が
    起こらない。今回は「サイト全体設定」エントリ内で常に書き換え対象
    （表示順序リストの各行）が存在し、かつその画面自体が高頻度で
    mutationを起こし続けるという、共鳴が起こる条件が完全に揃って
    しまっていた。
  - **修正**：mutationに反応する方式を全面的に廃止し、**1秒間隔の
    `setInterval`によるポーリング方式**に変更した。ポーリングは
    mutationイベントを一切トリガーにしないため、書き換え自体が次の
    呼び出しの引き金になることがなく、共鳴ループが原理的に発生し
    得ない。実機検証で、この方式に変更した後は複数秒間の待機後も
    タブが正常に応答し続け、かつラベル表示は正しく動作する
    （4件の実績タイトルがそれぞれ正しく表示される）ことを確認した。
  - **教訓（今後同種の機能を実装する際の注意）**：`document.body`
    全体を監視するMutationObserverから実際にDOM書き込みを行う既存の
    パターン（9.26-B等）を新しい画面に転用する際は、その画面が
    「頻繁に自発的なDOM変化を起こす画面かどうか」を必ず事前に実機で
    計測すること（アイドル状態で数秒間mutation件数を数えるだけで
    判定できる）。書き込み対象が常に存在し、かつ背景mutationが
    多い画面では、mutation駆動ではなく一定間隔のポーリング駆動に
    設計すること。

**B. `/works`（実績詳細）ページの画像サイズを`/news`と統一**

- **原因**：`src/pages/works/[slug].astro`の画像ラッパーには
  `/news/[slug].astro`が持つ`md:max-w-[67%] md:mx-auto`
  （PC表示でコンテナ幅の67%に制限し中央寄せ）が無く、コンテナ幅
  （820px）いっぱいに画像が表示されていたため、`/news`
  （760pxコンテナの67%＝約509px）と比べて明らかに大きく見えていた。
- **修正**：`src/pages/works/[slug].astro`の画像ラッパー`<div>`に
  同じ`md:max-w-[67%] md:mx-auto`を追加。`public/admin/preview.js`の
  `WorkPreview`（実績・活用事例作成のプレビュー）も同じクラスに
  追従修正した。実機検証で`/works/sample/`・`/news/greeting/`を
  並べて確認し、画像サイズの見た目が統一されたことを確認済み。

**C. メディア管理機能：カテゴリ・Altの保存とカテゴリ絞り込みの実効性強化**

- **調査**：9.32-Bで実装した「メディア管理」コレクションでの
  カテゴリ・タイトル・Alt保存自体、および`/media-library.json`
  経由のカテゴリ絞り込み自体は、実機検証で**設計どおり正しく動作
  している**ことを再確認した（画像選択→カテゴリ/タイトル/Alt入力→
  公開→`src/data/mediaLibrary.yml`への書き込み、および別フィールドの
  画像ピッカーでのカテゴリ絞り込み表示、双方とも実機で成功を確認）。
- **「動作していない」という報告の推定原因**：`/media-library.json`は
  ビルド時静的生成のため「最後にデプロイした時点」のデータしか
  反映されない（9.32-Bで明記済みの制約）。ユーザーが「メディア管理」で
  カテゴリを設定した**直後、同一セッション内**で別の画像ピッカーを
  開いて確認すると、再ビルド前のため絞り込みに反映されておらず
  「動作していない」ように見えていた可能性が高い（実際に本セッションの
  検証でも、ローカルの`decap-server`へ保存した直後に確認した際、
  ビルド前の`/media-library.json`は古いデータのままだった）。
- **改善**：メディアメタデータの参照ロジックに、9.26-Bと同じ
  「Reduxストアの読み取り専用参照」を**優先経路として追加**した
  （`getMediaMetaFromRedux()`）。「メディア管理」エントリが同一
  セッション内で一度でも開かれていれば、Redux上の最新値（保存直後の
  値）を即座に参照できるため、公開直後に別の画面で確認しても正しく
  反映される。Reduxにエントリが無い場合（そのセッションで「メディア
  管理」を一度も開いていない場合）のみ、従来どおり静的JSONへ
  フォールバックする。これは9.32-Bで「新規に開いた場合のみ機能する」
  として妥協していた制約を、実用上ほぼ気にならない水準まで緩和する
  改善である（`patchWorksOrderListLabels`の`getWorksTitleFromRedux`も
  同じ二段構えを採用している）。

**D. メディアライブラリの横スクロール解消・5列グリッド調整**

- **原因の特定（バンドル内部構造の実機解析）**：メディアライブラリの
  画像一覧は`react-virtualized`のGrid（AutoSizer付き）で描画されて
  おり、列数・グリッド全体の幅は**モーダルの実測幅をマウント時に
  1度だけ測定して決まる**（開いている最中にモーダル幅や
  `window.innerWidth`を変えても、AutoSizerは再計測しないことを
  実機検証で確認——モーダルを一度閉じて画面幅を変えてから開き直すと
  初めて新しい列数で再描画される）。カード1枚280px・列間隔300px
  （280px＋20pxガター）換算で、コンテンツ幅がちょうど
  `columnCount * 300 - 20`px（例：3列なら880px、5列なら1480px）に
  収まるようGridの幅を計算していることを実測で特定した。
  - **不要な横スクロールの真因**：react-virtualizedのAutoSizerが
    **縦スクロールバーの幅を差し引かずに横方向の列幅を計算している**
    ため、一覧の行数が多く縦スクロールバーが表示される状況では、
    列数に関わらず常にスクロールバー幅（実測15px前後）ぶんだけ
    コンテンツがコンテナの実際のクライアント幅からはみ出し、それが
    不要な横スクロールバーとして現れることを実機検証で特定した
    （decap-cms本体の既知の制約で、公開APIの範囲では計算式自体は
    直せない）。5列に調整した後も同じ現象が再発することを確認済み
    （列数を変えても解消しない、根本的に別種の不具合）。
  - **対処**：実際のカード内容が失われるわけではなく、最終列の右端が
    スクロールバー幅ぶんだけ僅かに切れるだけのため、
    `[class*="CardGridContainer"] > div > div`（react-virtualizedの
    実スクロールコンテナ。クラス名を持たない裸の`<div>`のため
    構造的な位置で特定）に対し`overflow-x: hidden !important`を
    適用し、見た目上の横スクロールバー自体を消す方式で対処した。
    ナロー〜ワイドいずれの画面幅でも横スクロールが発生しないことを
    実機検証済み。
- **5列グリッドへの調整**：モーダル自体の幅を`width: 1600px
  !important; max-width: 96vw !important;`で強制し、実測で
  「5列がちょうど収まる」コンテンツ幅（1480〜1780pxの範囲）に
  収まるようにした（1600pxモーダル幅－左右パディング40px＝
  1560pxがこの範囲に入る）。ワイドディスプレイ（1600px超）では
  安定して5列、それより狭い画面では`max-width: 96vw`により比例
  縮小し列数が自動的に4列・3列と減る（横スクロールは発生しない）。
  厳密な「常にどんな画面幅でも5列」は、固定サイズのカードと
  レスポンシブな画面幅という前提が両立しないため技術的に不可能だが、
  一般的なデスクトップ幅（1600px以上）では安定して5列になることを
  実機検証済み。
  - **CSS適用範囲の絞り込み**：`[class*="StyledModal"]`は
    メディアライブラリ以外のダイアログ（確認ダイアログ等）にも
    使われる可能性があるクラスのため、`:has(input[type="file"])`で
    絞り込む案も検討したが、`:has()`は大きなDOM上での再計算コストが
    比較的高い擬似クラスであり、9.33-Aで判明した「サイト全体設定は
    常時高頻度でmutationが発生する画面」という特性と組み合わさった
    場合の負荷を懸念し、より軽量な方式に変更した：
    `findOpenMediaLibraryModal()`（既存のドラッグ&ドロップ機能・
    カテゴリ絞り込み機能が共用する、モーダル内に`input[type="file"]`
    が存在するかを見るヘルパー関数）が該当モーダルを見つけた時点で
    `cms-is-media-library`という目印クラスを直接付与し、CSS側は
    その単純なクラスセレクタだけを見る方式にした（`:has()`を使わない
    ため計算コストの懸念が無い）。

### 9.34 メディアライブラリのカテゴリ・Alt機能の発見性改善（自由入力化＋常設バナー）／トップページ「実績」の新着表示改善（2026-09）

**A. メディア機能「動作していない」報告の根本原因（3回目にして特定）**

- 9.32-B・9.33-Cと2ラウンド連続で「カテゴリ・Altが設定できない／
  絞り込みが動作しない」という報告を受けており、その都度実機検証で
  機能自体は正しく動作していることを確認していたが、3回目の今回、
  ついに具体的な原因を特定した：`ensureMediaCategoryFilter()`に
  `if (!Object.keys(usedCategories).length) return;`
  という早期returnがあり、**1件も画像がカテゴリ登録されていない
  状態では絞り込みドロップダウン自体が一切表示されない**仕様に
  なっていた（9.32-Bで「空の選択肢だけの紛らわしいUIを避けるため」
  という意図で追加した処理）。この設計は、**まさにこれから初めて
  カテゴリ機能を使おうとしているユーザーにとっては「そもそも
  カテゴリ機能が存在することにすら気づけない」という、意図とは
  逆効果の落とし穴になっていた**——ドロップダウンが無い→機能が
  無いように見える→「メディア管理」コレクションの存在にも気づけない
  →結果「カテゴリもAltも設定できないし絞り込みもできない」という
  今回の報告文言と完全に一致する体験になる。
- **修正**：メディアライブラリのモーダルを開くたびに、検索欄の下へ
  常設の案内バナー（`.cms-media-library-hint`）を追加した——
  「画像のカテゴリ・タイトル・Altテキストは『メディア管理』で
  設定します。設定する →」という文言＋リンク。リンクをクリックすると
  現在のモーダルを閉じて`#/collections/mediaLibrary/entries/mediaLibrary`
  へ直接遷移する（`location.hash`書き換え＋モーダルのCloseボタンを
  プログラム的にクリック）。このバナーは絞り込みドロップダウンの
  有無（＝タグ付け済み画像の有無）に関わらず常に表示されるため、
  一度もカテゴリを使ったことが無い状態でも機能の入り口が必ず見える。
  絞り込みドロップダウン自体は引き続き「1件もタグ付けが無い場合は
  非表示」のままだが、これはバナーで導線が確保された上での適切な
  UXになった（空の選択肢を見せるよりバナーで案内する方が親切）。
- 実機検証：カテゴリ・Alt未設定の状態でメディアライブラリを開き、
  バナーが表示されること、バナーのリンクをクリックすると
  「メディア管理」のエントリ編集画面へ実際に遷移することを確認した。

**B. カテゴリを固定選択肢から自由入力に変更（新規カテゴリの追加に対応）**

- ユーザーから「新規カテゴリの追加・選択」という明示的な要望があった
  ため、`public/admin/config.yml`の「メディア管理」＞「カテゴリ」
  フィールドを、固定7択の`widget: select`から自由入力の
  `widget: string`に変更した。Decap CMSの`select`ウィジェットには
  「候補から選ぶ＋新しい値も入力できる」という所謂"creatable"
  モードが存在しない（実機・公開APIの両方で確認済み）ため、
  新規カテゴリの追加を可能にするには自由入力にする以外の方法が
  無いという判断。ヒントテキストに例として旧来の7分類
  （ロゴ・アイコン／ヒーロー・背景／サービス・商品／実績・事例／
  スタッフ・人物／お知らせ・ブログ／その他）を挙げ、既存の表記
  ゆれを避けるための目安として案内している。
- `public/admin/index.html`側も、固定辞書`CMS_MEDIA_CATEGORY_LABELS`
  （カテゴリID→日本語ラベルの対応表）を撤去し、実際にタグ付け
  されている値を`/media-library.json`（またはReduxストア）から
  動的に集計して絞り込みドロップダウンの選択肢を組み立てる方式に
  変更した（値とラベルは同じ生の文字列を使う）。既存の`category`
  フィールドに保存済みの値（`logo`等の英語ID）を持つ画像がもし
  あった場合、そのIDがそのまま絞り込みの選択肢として表示される
  ようになる（自由入力化により今後は運用者が日本語のカテゴリ名を
  直接入力する想定のため、実質的な影響はない）。

**C. トップページ「実績・活用事例」で新規エントリが表示されない問題の調査**

- **調査結果**：`getCollection('works')`のデータ取得自体（`src/pages/
  index.astro`・`src/components/Works.astro`）には、下書き
  フィルターやソート条件による除外バグは存在しないことを確認した
  （worksコレクションのスキーマに`draft`フィールドは無く、下書き
  概念自体が存在しない。取得は常に全件対象）。実機検証で新規に
  実績エントリを作成・公開したところ、`npm run dev`環境で
  リビルド不要・即座にトップページへ反映されることを確認した。
- **実際に新規エントリが表示されなくなり得る条件を特定**：トップ
  ページに表示される実績は「表示件数（`site.works.count`）」で
  上位N件に切り詰められ、その並び順は「表示順序（`site.works.order`。
  管理者が手動でキュレーションするドラッグ&ドロップリスト）」が
  優先され、そこに無い実績は「登録順」で後ろに続く仕様
  （9.9で確立済み）。**「表示順序」に登録済みの実績数が「表示件数」
  以上に達している場合、新しく作成した実績（表示順序に未追加）は
  この件数の枠に一切入らずトップページに表示されない**——実際に
  本セッション開始時点のデータ（表示件数5・表示順序5件登録済み、
  複数ラウンド前の検証データ）はこの条件に完全に一致しており、
  ユーザーが体験した「新規作成しても反映されない」の実例そのもの
  だったと考えられる（その後、表示件数が10に更新されたことで
  現在は解消しているが、初期設定の既定値である「表示件数=3」でも
  同様に3件キュレーションした時点で同じ問題が再発し得る、
  一般的に起こり得る構成ミスであることを確認した）。
- **修正**：
  1. `public/admin/config.yml`の「トップページに表示する件数」
     フィールドに、「表示順序に追加済みの件数がこの件数以上になると
     新規実績が表示されなくなる」ことを明記した警告付きhintを追加。
  2. 同じく「表示順序」フィールドのhintに、キュレーションを
     絞り込みすぎると新しい実績が表示されなくなる旨の注意書きを追加。
  3. `src/components/Works.astro`の「表示順序に無い実績（＝未
     キュレーションの実績）」のソート条件を、`order`（数値、既定値0）
     の昇順のみだったものに、**`order`が同値の場合は`publishedAt`の
     新しい順**というタイブレークを追加した。既定値0のまま複数の
     未キュレーション実績が並ぶと、従来は「登録順（実質ファイル名の
     辞書順）」で並んでいたため、真に新しく作った実績が古い実績より
     後ろ（＝表示件数の枠外）に埋もれる場合があった。新しい順を
     優先することで、表示件数に余裕がある限り、最新の実績が
     優先的に表示されるようになる。
  4. 上記1・2のhintで運用上の注意を促す一方、**表示件数と表示順序の
     物理的な自動調整（例：新規実績を検知して表示件数を自動的に
     増やす）は実装していない**——`works.count`はレイアウト
     （列数・スライダー挙動）にも影響する意図的な上限値であり、
     管理者の意図しないところで自動的に変わってしまうと、逆に
     「急に表示件数が変わった」という別の混乱を招くおそれがある
     ため、既存の「表示件数は管理者が明示的に設定する値」という
     契約を維持し、代わりに前述のhintで注意を促す設計とした。

### 9.35 urlSlug空欄保存バグの根本原因を特定・修正／本文の単一改行を`<br>`化／メディアライブラリのカテゴリ即時編集・詰め表示を実装（2026-09）

**A. 「新規作成したのに表示されない」の真因：`urlSlug`空欄保存バグ（重大）**

- 実際に本番で発生していた不具合を特定した：`works`/`news`のURL用
  識別子（`urlSlug`）を**未入力のまま**新規エントリを保存すると、
  9.3で実装した「空欄なら自動でランダムな識別子を採番する」安全策
  （`preSave`ハンドラ）が発動せず、`slug: "{{fields.urlSlug}}"`が
  空文字のまま評価されて**ファイル名が拡張子のみ（`.md`）という
  不可視ファイル**が生成されていた。Astro の Content Collections は
  このファイルを静的サイトに一切反映しないため、「CMSでは保存できて
  いるのに実際のサイトには表示されない」という、原因の見えにくい
  実害を引き起こしていた（本セッションで実際にリポジトリへ混入して
  いた実例を発見・修正した）。
- **根本原因**：実機検証で2つの事実を確認した。(1) Decap CMSの
  `preSave`イベントの`args`には**`entry`と`author`のみ**しか
  含まれず、コレクション名を含む情報が一切渡されない。(2)
  `default:`を持たないフィールド（`urlSlug`はこれに該当）は、
  ユーザーが一度もフォーカス／入力していない場合、エントリの
  `data`（Immutable Map）に**キー自体が存在しない**
  （`data.has('urlSlug')`が`false`を返す）。9.3で実装した旧ロジックは
  `data.has('urlSlug')`でコレクションの種別を判定していたため、
  「新規作成→タイトルだけ入力してURL識別子欄には一切触れず即座に
  公開」という最も基本的な操作パターンでこの判定が`false`になり、
  安全策が発動しなかった。
- **修正**：`data.has('urlSlug')`によるコレクション判定をやめ、
  代わりに`location.hash`（`#/collections/<name>/...`）から
  コレクション名を判定する方式に変更した（postSave側の
  `pendingCreateNewCollection`判定と同じ手法）。これにより、
  `urlSlug`フィールドが一度も触れられていなくても、「works／news
  エントリの保存である」という事実さえ分かれば確実に値を検査・
  補正できる。実機検証で、タイトルのみ入力してURL識別子欄に一切
  触れずに公開した場合でも、正しくランダムな識別子（例：
  `hni8m4pys3.md`）が採番されることを確認した。
- 既に壊れた状態でリポジトリに存在していた`src/content/works/.md`
  （ファイル名が拡張子のみ）は`url-slug-test.md`にリネームし、
  `urlSlug: url-slug-test`をfrontmatterへ追加して復旧した（中身の
  タイトル・本文はユーザーが作成した実データのため保持している）。

**B. 本文（works/newsの`body`）の「段落内の単一改行」が詰まって表示される不具合を修正**

- **原因**：CommonMark（Astroの既定Markdownパーサ）の仕様では、
  段落内の単一改行（Enterキー1回相当）は**スペース1個に変換**される
  （改行として表示されない）。9.23で対応した「段落と段落の間
  （Enterキー2回・空行）」のマージン調整とは別の、より基本的な
  仕様上の制約で、実機検証でリポジトリ内の実データ
  （`src/content/news/2026-09-10-greeting.md`）に単一改行のみで
  区切られた3行が実際に1行に詰まって表示されることを確認した。
- **本番ページ側の修正**：`astro.config.mjs`に`remark-breaks`
  プラグイン（npm install済み）を追加し、単一改行を`<br>`要素に
  変換するようにした。段落区切り（Enterキー2回・空行）の扱いには
  影響しない（remark-breaksが変換するのは「同じ段落内の」単一改行
  のみ）ため、9.23の対応と競合しない。実機ビルドで
  `<p>マーカー適用された<br>\n...は改行されてますでしょうか？</p>`
  のように`<br>`が正しく挿入されることを確認済み。
- **CMSプレビュー側の修正**：`works`/`news`のプレビュー
  （`WorkPreview`/`NewsPreview`）は`widgetFor('body')`でDecap本体
  内蔵の独自remarkパイプラインを使ってHTML化しており、本番ビルドの
  remark-breaks設定とは完全に別物のため、本番側だけを直しても
  プレビュー画面には反映されない。実機検証で、Decapが生成する
  `<p>`要素の単一改行箇所には**元の改行文字（`\n`）がテキスト
  ノードとしてそのまま残っている**（ブラウザの`white-space:
  normal`既定値のせいで見た目上は空白に見えているだけで、DOM上は
  消えていない）ことを確認したため、`CMS.registerPreviewStyle()`で
  `[class*="WidgetPreviewContainer"] p { white-space: pre-line; }`
  という最小限のCSSを追加し、この残存する改行文字を見た目上も改行
  として表示させた。本番サイド共通の`.prose-content`
  （global.css）には適用しない——本番のビルド後HTMLは既に`<br>`が
  明示挿入されており、`<br>`直後にも同じ理由で改行文字が残っている
  ため、`pre-line`を適用すると`<br>`と残存改行文字の両方が改行として
  扱われ意図せず二重改行（空行）になってしまうため。

**C. メディアライブラリのカテゴリ絞り込み「詰め表示」の実装**

- **原因**：メディア一覧はreact-virtualizedのGridが絶対配置
  （`position:absolute; left/top`）でカードを描画しており、9.33-D
  で実装した「非該当カードを`display:none`で隠す」方式では、各
  カードに割り当てられた元の座標がそのまま残るため、非該当カードの
  あった位置に空白（歯抜け）が残っていた。react-virtualizedは
  スクロール位置に応じてセルの座標を自前で再計算し続けるため、
  こちらから直接styleを書き換えて「詰める」再配置を行っても次の
  再描画で元の座標に戻され、Reactの管理する子要素の座標を安定して
  上書きすることはできないことを実装・実機検証で確認した。
- **修正**：カテゴリ絞り込み中は元のGrid自体を丸ごと非表示にし、
  該当する画像だけを独自の通常のCSS Grid（`.cms-media-filtered-grid`。
  隙間なく上から順に自動的に詰まって並ぶ、5列＝9.33-Dの列数と統一）
  で別途描画する方式にした。各タイルのクリックは、対応する非表示中の
  元カード要素へ実際に`.click()`を発火させることで、選択処理自体は
  Decap本体の既存ロジックにそのまま委譲する（選択・保存に関わる
  処理を独自実装しない）。react-virtualizedは実機検証で「このサイト
  規模（20枚程度）の画像はスクロール位置に関わらず全件DOMに
  マウントされる」ことを確認済みのため、非表示中の元カードを
  ID/ファイル名で正しく参照できる。実機検証で、フィルタ適用後に
  一覧が隙間なく詰まって表示されること、タイルクリックで実際に
  「選択する」ボタンが活性化し、画像選択が最後まで完了することを
  確認した。

**D. メディアライブラリでのカテゴリ・Alt編集の「その場化」（✎ショートカット）とアップロード時案内**

- **要望**：「メディアライブラリ内で画像をクリックした際、その場
  （同じモーダル内）でカテゴリ・タイトル・Altを編集・保存できる
  UIにしてほしい」という要望があった。
- **実装できなかった部分とその理由（安全上の判断）**：真の意味での
  「その場保存」を実現するには、Decap CMS本体の非公開の内部処理
  （`persistEntry`相当のReduxストアへのdispatch）を呼び出す必要が
  ある。これは9.26-Bで確立した「Reduxストアは読み取り専用でのみ
  参照し、状態変更のdispatchは一切行わない」という本プロジェクトの
  安全原則に反する。公開APIの外側にある非公開の内部実装に書き込み
  処理を依存させることになり、decap-cms本体のバージョンアップで
  動作しなくなった場合、単に機能が止まるだけでなく保存内容が壊れる
  形で失敗するおそれがあるため、実装を見送った。
- **代わりに実装した「ショートカット」機能**：実際の保存は必ず
  Decap本体の正規の「公開する」ボタンを経由させることを維持しつつ、
  そこに至るまでの手間を可能な限り自動化した。各カード（元のGrid・
  カテゴリ絞り込みオーバーレイの双方）の右上に✎ボタンを追加し、
  クリックすると次の処理を自動で行う：(1) メディアライブラリの
  モーダルを閉じ、「メディア管理」のエントリへ遷移する。(2)
  Reduxストア（読み取り専用）の`items`配列から、クリックした画像の
  ファイル名と一致する既存項目を検索し、見つかればそのインデックスに
  対応するリスト行（DOM上の並び順はReduxの配列順と一致する）を
  自動的に展開してスクロールする。(3) 一致する項目が無い場合は
  「Add 画像一覧」ボタンを自動的にクリックして新規行の追加まで
  代行する（画像の選択自体は、ユーザーの最後の一手として残す）。
  実機検証で、既存項目・新規項目の両方のケースで正しく動作する
  ことを確認した。
- **アップロード時のカテゴリ・タイトル・Alt指定について**：Decap
  本体のアップロードダイアログ自体に追加フィールドを挿し込める
  公開APIが存在しない（9.32-Bで確認済み）ため、アップロードフォーム
  内への直接組み込みは今回も実装できなかった。代わりに、
  アップロード用の`<input type="file">`の`change`イベント
  （ボタン経由の手動アップロード・ドラッグ&ドロップの両方で発火）を
  検知し、「アップロードした画像のカテゴリ・タイトル・Altテキストは
  ✎ボタンまたは『メディア管理』から設定できます」という案内
  トーストを8秒間表示するようにした。
  - **実装上の落とし穴**：当初このトーストをメディアライブラリの
    モーダル要素の子要素として追加したところ、実機検証で
    「アップロード完了に伴うメディア一覧の再描画で、Decap側が
    モーダルの子要素ツリーを丸ごと作り直し、追加した要素だけが
    一瞬で消えてしまう」現象を確認した（モーダル要素自身は
    そのまま再利用されるため、9.34で付与した目印クラス
    `cms-is-media-library`は消えずに残るが、中身の子要素はReactの
    再レンダーで作り直される）。そのため、トーストは`document.body`
    直下（React管理下の外）に配置し、`position: fixed`でモーダルの
    実測位置（`getBoundingClientRect()`）に重ねて表示することで
    この消失を回避した。既存の「絞り込み結果の詰め表示グリッド」
    （本節C）はモーダル再描画のたびに作り直す設計のため同じ問題は
    起きないが、「一度作って後から消えずに残ってほしい」性質の
    要素（今回のトーストのように）をモーダル配下に置く場合は、
    同じ消失に注意すること——このコードベースでの新しい落とし穴
    として記録する。

### 9.36 boolean（トグル）フィールドの`required: false`欠落を全件修正（2026-09）

- **報告された不具合**：「お知らせ投稿」の「この記事を一覧の最上部に
  固定表示する」（`pinned`）をOFFのまま公開しようとすると、
  「〜は必須です。」という検証エラーで公開できない。
- **対応**：`pinned`に`required: false`を明示追加した。あわせて
  `config.yml`全体を調査したところ、`widget: boolean`かつ
  `required`が明示されていないフィールドが`pinned`以外にも多数
  （`draft`、`popular`、`enableProducts`等の「セクションの表示・
  非表示」10項目、`showBadge`／`reverseLayout`／`highlight`の一部、
  会社概要・アクセス・お問い合わせフォームの各`enabled`／`required`
  トグル等、計30箇所前後）存在することが分かった。これらは
  `default: true`のフィールドが多く「初期値のまま一度もOFFにされて
  いない」間は問題が表面化しないため見過ごされやすいが、`pinned`
  （`default: false`）と全く同じ構造上のリスクを抱えている。
  再発防止のため、該当箇所すべてに`required: false`を一括追加した。
- **本プロジェクトが想定する設定ファイル構成についての補足**：
  今回の依頼文では「`src/admin/config/`配下の`news.yml`」
  「ビルド時に`prebuild`が複数の設定ファイルを自動結合する」という
  構成が前提とされていたが、実際のこのリポジトリには`src/admin/`
  ディレクトリは存在せず、`package.json`にも`prebuild`スクリプトは
  無い。Decap CMSの設定は`public/admin/config.yml`という**単一の
  静的YAMLファイル**のみで完結する構成になっている（複数ファイルを
  結合するビルドステップを持たない）。そのため本対応も、存在しない
  `prebuild`の検証は行わず、この単一ファイルへの直接修正のみで
  完結させている。
- 実機検証：新規の「お知らせ投稿」エントリを作成し、タイトルのみ
  入力して「固定表示」トグルには一切触れず（初期値`false`のまま）
  「公開する」を実行したところ、検証エラーが出ず正常に
  `pinned: false`として保存・公開されることを確認した。

### 9.37 「実績・活用事例作成」一覧画面を「サイト全体設定 ＞ 実績」の表示順序に連動させる（2026-09）

- **背景**：Decap CMSの`sortable_fields`／既定ソートは「そのコレクション
  自身が持つフィールド」でしか並び替えできない公開APIで、他のコレクション
  （`siteInfo.yml`の`works.order`という手動キュレーションリスト）を
  参照した動的ソートは公式には存在しない。9.9で`works.order`を
  relationウィジェットの`list`として実装したのも、Decap側にこうした
  動的ソート機能が無いための代替策だったことを踏まえ、今回も同様に
  Decapの外側でJSにより実現した。
- **実装**：一覧の`<ul>`は`display:flex`（実機確認済み）で`<li>`を
  横並びに並べているため、各`<li>`へCSSの`order`プロパティを設定
  するだけで、実際のDOM順序を変更せずに見た目の並び順だけを制御
  できる。並び順の算出は9.26-Bと同じ「Reduxストアの読み取り専用
  参照」を使い、`Works.astro`の実際のソートロジック（表示順序リストを
  優先→そこに無い実績は`order`昇順→同値は`publishedAt`降順）を
  そのままJSに移植して再現する（`computeWorksDisplayOrder()`）。
  一覧画面を開くだけで`works`コレクションの全エントリと
  `settings.siteInfo`の両方がReduxに読み込み済みであることを実機
  確認済みのため、静的JSONへのフォールバックは設けていない（万一
  どちらかが未読込の場合は、既定のDecap表示順のまま＝安全側に倒れる）。
- **安全性**：`li.style.order`の変更は`attributes`ミューテーションで
  あり、本ファイルのMutationObserverはいずれも`{childList, subtree}`
  のみを監視して`attributes`を監視していないため、9.33-Aで発見した
  「自分の書き換えが自分のObserverを再度呼び出す」共鳴ループの対象に
  ならない。また`store.subscribe()`のコールバックはReduxを読み取る
  だけでdispatchを一切行わないため、こちらも自己参照的なループには
  ならない（9.33-Aの資源共鳴バグは「DOM書き込みが同じObserverに
  観測される」ことが原因であり、今回の実装はその条件のいずれにも
  該当しない）。
- 実機検証：`site.works.order`に4件登録済み・実績全6件という状態で
  一覧画面を開いたところ、各`<li>`に設定された`style.order`が
  期待どおり（キュレーション済み4件→未キュレーション2件を`order`
  昇順で算出した値）になっていることをDOM上で確認し、スクリーン
  ショットで実際の表示順にも反映されていることを確認した。

### 9.38 実績・活用事例の個別記事側「表示順」フィールドを廃止（9.37への一本化）

- **背景**：9.37でトップページの並び順が「サイト全体設定 ＞ 実績 ＞
  表示順序」に完全連動したことに伴い、個別記事側の数値「表示順
  （小さいほど先頭）」フィールド（未キュレーション時のフォールバック
  ソートキーとしてのみ使われていた）が不要になった。
- **削除箇所**：
  - `public/admin/config.yml`の`works`コレクションから
    `{ label: "表示順（小さいほど先頭）", name: "order", ... }`
    フィールド定義を削除。
  - `src/content/config.ts`の`works`スキーマから`order:
    cmsNumberWithDefault(0)`を削除。
  - `src/components/Works.astro`の未キュレーション実績の並び替えを
    「`order`昇順→`publishedAt`降順」の二段階から「`publishedAt`
    降順」のみに簡素化。
  - `public/admin/index.html`の9.37で実装した一覧画面の並び順
    ロジック（`computeWorksDisplayOrder()`）も同様に、未キュレーション
    分の並び替えから`order`参照を削除し`publishedAt`降順のみに
    簡素化（Reduxに`order`キー自体が存在しなくなるため、削除しな
    くても`Number(undefined) || 0`で全件同値=0に落ち着き実害は
    無かったが、コードの意図を明確にするため合わせて整理した）。
  - 既存の`src/content/works/*.md`（6件）frontmatterから、不要になった
    `order:`行を機械的に削除（Zodスキーマは`.strict()`ではないため
    残っていてもビルドは通るが、混乱を避けるため除去した）。
- 実機検証：`npm run build`でエラー0件を確認の上、`dist/index.html`の
  実績カードの並び順が、削除前と変わらず`site.works.order`の
  キュレーション順（5件）→残り1件（`publishedAt`降順）になっている
  ことを確認した。管理画面でも「実績・活用事例作成」の個別編集画面
  から「表示順」欄が消えていることを確認済み。

### 9.39 メディア管理のコレクション一本化・カテゴリ機能の全廃／ファイル名の安全な「複製保存」実装（2026-09）

- **【1】コレクション一本化（見た目上の廃止であって実体は存続）**：
  CMSサイドバーに独立して表示されていた「メディア管理」コレクション
  項目を非表示にし、ヘッダーの標準「メディア」ボタン1つに導線を
  一本化した。ただし**コレクション自体（`config.yml`の`mediaLibrary`
  ＝`src/data/mediaLibrary.yml`）はconfig.yml上に存続させている**——
  `window.CMS`の公開APIを総点検した結果（`Object.keys(window.CMS)`で
  全メンバーを列挙、`CMS.getBackend('github')`が`{init}`のみ＝
  未設定のバックエンド工場でしかなく認証済みの書き込みAPIではない
  ことを実機確認）、Decap自身の安全な保存機構（本物のフォーム＋
  本物の「公開する」ボタン）を使う唯一の方法が「コレクションの
  エントリとして保存する」ことだと確定したため。バンドル文字列を
  検索しても`hide_collection`/`sidebar_hidden`/`showInSidebar`の
  ような「登録はするがサイドバーに出さない」公式オプションは
  存在しなかった。そのため`hideMediaLibrarySidebarLink()`
  （`a[href="#/collections/mediaLibrary"]`を含む`<li>`を`display:
  none`にする、`MutationObserver`で再描画のたびに再適用）で
  見た目だけ隠す設計にした。9.26-Bで確立した「Reduxストアは
  読み取り専用でのみ参照し、状態変更のdispatchは一切行わない」
  という安全原則はこのラウンドでも維持している。
- **【2】カテゴリ機能の全廃**：`category`フィールド（自由入力文字列、
  9.34参照）と、それに依存していた絞り込みUI一式を丸ごと削除した。
  削除箇所：
  - `public/admin/config.yml`の`mediaLibrary`コレクションから
    `category`フィールドを削除（`title`も`caption`に統合・改名。
    実質「ファイル名（表示用の識別に画像そのものを使う）・Alt属性・
    キャプション」の3項目に整理）。
  - `src/data/mediaLibrary.yml`の既存2件から`category:`/`title:`を
    削除し`caption:`に置き換え（データ移行）。
  - `public/admin/index.html`の`cmsMediaMetaCache`/
    `cmsMediaMetaFetching`/`getMediaMetaFromRedux()`/
    `loadMediaMetaOnce()`/`applyMediaCategoryFilter()`/
    `ensureMediaCategoryFilter()`（旧オーケストレーター）/
    `mediaCategoryFilterObserver`と、対応するCSS
    （`.cms-media-category-filter`/`.cms-media-filtered-grid`/
    `.cms-media-filtered-tile`/`.cms-media-filtered-empty`）を全削除。
  - `src/pages/media-library.json.ts`（ビルド時静的JSON。カテゴリ
    絞り込みの唯一の消費者だった）と`src/lib/mediaLibrary.ts`
    （そのパーサ）を削除（他に参照箇所が無いことを`grep`で確認済み）。
  - 常設バナー・✎ショートカット・アップロード直後トーストは
    「Alt属性・キャプション」向けの文言に更新した上で存続
    （`ensureMediaLibraryExtras()`という新しいオーケストレーターに
    整理。旧`ensureMediaCategoryFilter()`からカテゴリ絞り込み構築
    ロジックだけを除いた形）。
- **【3】アップロード時・アップロード後インプレース編集の実装**：
  - **アップロード時**：Decap本体のメディアライブラリには「アップロード
    と同時にメタデータを入力するフォーム」を安全に割り込ませる
    公開APIが無い（フォームコンポーネント自体を差し替える手段が
    存在しない）ため、アップロード直後（`input[type="file"]`の
    `change`イベント検知、9.32-B確立の手法）に案内トースト
    （`showUploadMetadataToast()`）を表示し、「今すぐ設定する →」
    ボタンから即座に画像メタデータのポップオーバー編集画面へジャンプ
    する設計にした（ファイル名は画像そのものをキーに自動識別される
    ため入力不要。Alt属性・キャプションのみユーザー入力）。
  - **アップロード後の再編集**：各メディアカード右上の✎ボタン
    （`addEditShortcutButton()`）から`jumpToMediaLibraryEntry()`を
    呼び出し、①メディアライブラリのモーダルを閉じる→②画像メタデータの
    エントリへ遷移→③Reduxストア（読み取り専用参照のみ、9.26-B原則を
    維持）から該当ファイル名のインデックスを特定し、対応する行を
    自動展開・中央スクロールする（`focusMediaLibraryItem()`。一致
    しない場合は「Add 画像一覧」を自動クリックして新規行追加まで
    代行）。
  - **「別ページへ画面遷移させず」の要件への対応**：実際にはこの
    画面はDecapの通常のエントリ編集ルート（`#/collections/
    mediaLibrary/entries/mediaLibrary`）であり、文字通りの画面遷移
    そのものは発生している（Decap本体の保存機構を安全に使うには
    エントリ編集画面を経由するしかないため、これ自体は変更不可能な
    制約）。そのため、この画面に限りCSSで「中央フローティングカード
    ＋背景を暗くするオーバーレイ」に再構成する**ポップオーバー風の
    視覚効果**を追加した：`updateMediaMetaPopoverMode()`が
    `hashchange`のたびに現在ハッシュを判定し、該当時は
    `document.body`に`cms-media-meta-popover`クラスを付与
    （＋`ensureMediaMetaPopoverBackdrop()`で`.cms-media-popover-
    backdrop`という全画面の暗幕`<div>`を挿入）。CSS側は
    `body.cms-media-meta-popover [class*='EditorContainer']`に
    `position:fixed`＋中央寄せ＋`min(900px, calc(100vw-48px))`等の
    サイズ上限を適用する。実際の保存処理・「公開する」ボタンは
    一切変更していない（＝本物のDecap保存フローがそのまま動く。
    安全性は損なわれていない）。実機検証（`npm run dev`＋
    `npm run cms:proxy`のローカル環境）で、✎ボタン→ポップオーバー
    画面遷移→該当行の自動展開→キャプション編集→「公開する」の
    一連の操作を行い、`src/data/mediaLibrary.yml`に編集内容が
    正しく反映されることを確認した（検証用の一時的な編集は
    確認後に元の値へ戻し、コミットには含めていない）。
    - 元々あった「エントリ編集画面にはサイドバー`<aside>`が
      そもそも描画されない」（Decap自身が省略している。コレクション
      一覧画面とは異なるDOM構造）という既存の挙動により、この
      ポップオーバー化のためにサイドバーを追加で隠す処理は不要
      だった。
- **【4】ファイル名編集：「安全な複製保存」として実装（真のリネームは
  実装しなかった）**：
  - Decapの画像ウィジェットには選択中のファイルパスを保持する機能
    しかなく、実ファイルをリネームするAPIを持たない。そこで
    「同じ内容を新しいファイル名でアップロードし、このエントリの
    画像欄をその新しいファイルに差し替える」という代替手段
    （`ensureFilenameRenameUI()`/`renameMediaImage()`/
    `waitForMediaModalAndUpload()`/`waitForCardAndSelect()`）を
    実装した。アップロード自体は9.32-Bで確立した「実際の`<input
    type="file">`へ`DataTransfer`経由でファイルを流し込み`change`
    イベントを発火させる」安全な手法を再利用し、選択もDecap本体の
    実際のクリック操作（カードをクリック→「選択する」ボタンを
    クリック）を模倣するだけで、保存・選択ロジック自体は一切
    独自実装していない。
  - **元のファイルは自動削除しない**：他のページ・エントリが元の
    ファイル名をまだ参照している可能性があり、ここで機械的に削除
    すると、そちらの画像がサイト上でリンク切れになる重大なリスクが
    ある（設計段階でこのリスクに気づき、削除しない方針にした）。
    UI上にも「※元のファイルは自動削除されません（他ページでの
    参照を壊さないため）。不要になったら通常のメディアライブラリ
    から手動で削除してください。」という警告文を常設している。
  - 検討したが採用しなかった代替案：(a) `CMS.getBackend()`が返す
    オブジェクトを使った直接書き込み→実機確認で`{init}`のみの
    未認証工場であることが判明し断念。(b) 抽出した認証情報を使った
    生GitHub API呼び出し→OAuthトークン管理を自前実装する必要が
    あり安全原則に反するため断念。(c) EXIF（JPEG）/PNGチャンク/
    SVG `<title>`へのメタデータ埋め込み→バイナリ画像ファイルの
    直接書き換えによる破損リスクがカテゴリ削除以上に重大かつ
    フォーマット網羅性も不完全（`src/assets/`実測：jpg 9・png 6・
    svg 4、webpは0件）なため不採用。
- **正直な開示（ユーザー向け要約と同じ内容をここにも記録）**：
  (a) 「メディア管理」コレクションは`config.yml`上には技術的に
  存続しているが、サイドバーからは見えず、✎ショートカット／
  アップロード後トースト経由でのみ到達する。(b) 「その場編集」は
  実際にはDecapの本物のエントリ編集画面をポップオーバー風に
  CSSで再構成したものであり、保存は本物のフォーム・本物の
  「公開する」ボタンを経由する（Reduxへの直接書き込みは一切
  行っていない）。(c) ファイル名編集は「同じ内容を新しい名前で
  複製保存」であり、元ファイルは自動削除されない（他ページからの
  参照切れを防ぐため）。

### 9.40 マークダウン表示の複数不具合修正／実績一覧ソートの安定化／メディア編集画面の閉じ込め解消／画像の`quality`明示／タイトルからslugへのローマ字自動変換（2026-09）

**A. `preSave`の装飾ブロック空行圧縮が、直後の本文を丸ごと生テキスト化するバグを修正**

- **症状**：本文中で囲い枠・テキスト配置等（`<div>`ベースの装飾
  コンポーネント）の直後にリストや見出しなど別の内容を書くと、
  本番ページ・CMSプレビューの両方でその内容が「* あ」のように
  Markdownとして一切パースされない生テキストとして表示される。
  番号付きリストは`<ol><li>`としては正しくパースされるのに、
  マーカー（マーカーの視認性向上のため9.27で`padding:0`にした）が
  見えず、番号も箇条書きの黒丸も一切表示されない別の症状も併発。
- **原因1（本丸）**：`preview.js`の`collapseDecorationBlankLines()`
  （9.25で導入）が、`</div>`・`</video>`の直後にある2個以上の改行を
  問答無用で単一改行へ圧縮していた。CommonMarkの仕様上、`<div>`は
  「HTMLブロック開始タグ（type 6）」で、**ブロックは直後の空行で
  終端する**ため、この空行を消すと後続の内容（リストや見出し等、
  装飾ブロックとは無関係の本文）が同じHTMLブロックに飲み込まれ、
  一切パースされない生テキストとして出力される。9.25の時点では
  「`<mark>`だけがこの手法で恩恵を受け、`<div>`/`<video>`は
  空行の有無にかかわらず独立ブロックのまま」と正しく分析していた
  にも関わらず、実装（正規表現）は`</div>`/`</video>`も圧縮対象に
  含めたままになっていた（分析と実装の不一致がそのまま見過ごされて
  いた）。
  - **修正**：末尾側（装飾ブロック直後）の圧縮対象を`</mark>`のみに
    限定し、`</div>`・`</video>`は対象から除外した。
  - 既存の`src/content/news/2026-09-10-greeting.md`（過去のテストで
    実際にこのバグが焼き付いていた実例）も、`</div>`と`* あ`の間に
    欠落していた空行を補って復旧した。
- **原因2（先頭側の潜在バグ、ついでに修正）**：先頭側（装飾ブロック
  直前）の空行圧縮の対象に`<video class="cms-video-file"`
  （アップロード動画）が含まれていたが、CommonMarkのHTMLブロック
  type 6タグ一覧に`video`は含まれず、type 7（その他の任意タグ）
  扱いになる。type 7は**直前に空行が無いと段落へ割り込めない**
  仕様のため、直前の空行を圧縮してしまうと、逆に段落の続き
  （lazy continuation）として`<video ...>`タグそのものが生テキストの
  一部として飲み込まれるおそれがある。`<div class="cms-align"|
  "cms-video-embed"`はtype 6のため空行が無くても段落へ割り込める
  ので、先頭側の圧縮対象からは`<video class="cms-video-file"`のみ
  除外した（実害はまだ確認していないが、`</div>`と全く同じ原理の
  潜在バグのため予防的に修正）。
- **原因3（CSS）**：Tailwindのpreflightが`ul`/`ol`の`list-style`を
  `none`にリセットしており、`.prose-content`側にこれを復元する
  指定が無かった（`padding-left`によるインデントだけは効いていた
  ため、「インデントはあるが番号・黒丸が出ない」という症状に
  なっていた）。`.prose-content ul{list-style:disc}` /
  `.prose-content ol{list-style:decimal}`を追加して復元した
  （`li::marker{color:inherit}`も追加し、マーカーの色が本文色を
  継承するようにした）。この修正はCMSプレビュー（`widgetFor('body')`
  も本番と同じ`.prose-content`クラス＋本番の実CSSを流用しているため
  ＝7章参照）にも自動的に適用される。

**B. 吹き出し（アイコン付き）のアバター画像が本番で表示されない不具合を修正**

- **原因**：`speech-bubble`の`avatar`フィールドは意図的に
  works/newsコレクション個別の`media_folder`上書き
  （`../../assets`）を継承させ、複数記事間で使い回す想定だったが、
  この値は`toBlock()`で本文中に生の`<img src="...">`タグとして
  そのまま埋め込まれる。生の`<img>`タグはAstroのMarkdown画像最適化
  パイプライン（`![]()`構文専用）の対象外のため、保存された相対
  パス（例：`../../assets/xxx.png`）は一切変換されずビルド後の
  HTMLにそのまま出力されるが、`dist/`には`src/`ディレクトリ自体が
  存在しないため本番で404になり、`alt`テキストが表示される
  （実機・既存データ`src/content/news/2026-09-10-year-end-new-year-
  hours.md`で再現を確認）。
- **修正**：video-fileコンポーネント（同ファイル内の動画アップロード
  コンポーネント）と同じ理由・同じ対処で、`avatar`フィールドにも
  `media_folder: '/public/uploads/editor'` /
  `public_folder: '/uploads/editor'`を個別指定した。これにより
  保存値が`/uploads/editor/xxx.jpg`という、ビルド後もそのまま配信
  可能な絶対URLパスになる。既存の壊れていたアバター画像
  （`src/assets/ジブリ自画像イラスト.png`）は`public/uploads/editor/`
  へ複製し、既存記事の`<img src>`・`<!--cms-speech:...-->`コメント
  内のJSONの両方を新しいパスへ更新して復旧した。

**C. 「実績・活用事例作成」一覧の並び順がリロードのたびに安定しない不具合を修正**

- **原因**：9.37で実装した一覧の並び順連動（`computeWorksDisplayOrder()`）
  は「サイト全体設定」エントリ（`settings.siteInfo`）がReduxに
  ロード済みであることを前提にしていたが、実機検証の結果、
  Decapがこのエントリを実際にロードするタイミングは「アプリ起動時に
  たまたま既定の初期画面としてマウントされたか」に左右され、
  `#/collections/works`に直接（Ctrl+Rでのリロードや直接リンクで）
  アクセスした場合は`settings.siteInfo`が一度もロードされないまま
  になることがあると判明した。その場合`getSiteWorksOrderList()`が
  静かに空配列を返し、キュレーション順が「未設定」として扱われて
  しまい、実際の表示順（公開日順のみ）と食い違う不安定な挙動になって
  いた（9.33-Aの`getWorksTitleFromRedux`と同種の「Reduxが未ロードの
  場合を考慮していなかった」欠落だったが、こちらは並び順という
  より実害の大きい箇所だったため今回まとめて対応した）。
- **修正**：`works-titles.json.ts`と同じ「ビルド時静的生成データを
  同一オリジンからfetchする」パターンで`src/pages/works-order.json.ts`
  （`site.works.order`をJSON配列として出力）を新設し、
  `getSiteWorksOrderList()`にReduxが未ロードの場合のフォールバック
  として組み込んだ（`loadWorksOrderOnce()`。取得完了時に
  `applyWorksListOrder()`を再実行し、フォールバックデータでの
  再描画まで行う）。この方式は「最後にデプロイした時点」の
  スナップショットを参照する点で他の同種フォールバック
  （`media-library.json`等）と同じ既知の制約を持つが、「サイト設定を
  一度も開いていないと表示順が丸ごと崩れる」という不安定さよりは
  大幅に改善する。実機検証で、`#/collections/works`への直接
  リロードを複数回繰り返しても表示順が一貫することを確認した。

**D. メディア編集画面（画像メタデータのポップオーバー）の「閉じ込め」を解消**

- **症状**：メディアカードの✎ボタンからAlt属性・キャプションの
  編集画面に入った後、「公開する」で保存しても画面がそのまま
  （postSaveの`location.reload()`が同じハッシュへ戻すだけのため）、
  かつ他画面への導線が無いため、実質的に「閉じ込められる」状態に
  なっていた。
- **修正**：
  1. `jumpToMediaLibraryEntry()`が呼ばれる直前の`location.hash`
     （＝ジャンプ元の画面）を`sessionStorage`に退避する
     （`saveMediaMetaReturnHash()`）。
  2. `postSave`ハンドラに、現在ハッシュが`#/collections/
     mediaLibrary/entries/`配下の場合の分岐を追加。保存完了後の
     リロード時に「戻り先が保留中」であることを示すフラグを
     `sessionStorage`へ記録しておき、`load`イベント側でジャンプ元の
     ハッシュへ復元した上で、ヘッダーの「メディア」ボタンを
     プログラム的に自動クリックしてメディアライブラリの一覧
     （アセットピッカーモーダル）を再度開き直す
     （`openMediaLibraryButton()`。ボタンが見つかるまで最大5秒
     ポーリング）。
  3. ポップオーバー画面の右上に「×（閉じる）」ボタン
     （`.cms-media-popover-close`）を新設し、保存せずにいつでも
     ジャンプ元の画面へ戻れるようにした（クリック時の処理は
     postSave側と同じ、ハッシュ復元＋「メディア」ボタン自動クリック）。
  - **ジャンプ元がエントリ編集画面だった場合の挙動**：Decapの
    エントリ編集画面（例：ある実績のメイン画像フィールドから
    メディアライブラリを開いた場合）にはヘッダーの「メディア」
    ボタン自体が存在しない（12c章・9.31参照：エントリ編集画面は
    独自のツールバーに置き換わり、サイドバーもヘッダーナビも
    描画されない）。この場合`openMediaLibraryButton()`は見つからず
    静かに諦める（最大25回のポーリング後に停止）が、ジャンプ元の
    エントリ編集画面自体には正しく戻れているため「閉じ込められる」
    という核心の不具合は解消されている（モーダルの再オープンは
    「あれば嬉しい追加の親切」であり、無ければ単に静かに戻るだけの
    安全側フォールバック）。
  - 実機検証：「サイト設定」のようなコレクション一覧画面から
    メディアライブラリを開いた場合、✎→編集→「公開する」で保存後、
    自動的に元の一覧画面へ戻り、メディアライブラリのモーダルが
    再度開いた状態になることを確認。同様に「×」ボタンでも
    保存せずに同じ挙動で戻れることを確認した。

**E. 画像最適化：`quality={80}`を全ラスター画像`<Image>`に明示**

- 既存のコードは`format="webp"`こそほぼ全箇所に付与済みだったが
  （絶対ルール②は既に遵守済み——独自の`<img>`直書きは
  `/products`ページのライトボックス用プレースホルダー1箇所のみで、
  これは`getImage()`で事前生成した最適化URLをJSがクリック時に
  `src`へ差し込む設計のため問題ない）、`quality`を明示していない
  箇所が大半だった。全ての写真系`<Image>`（Access/Products/Service/
  Works/about/news一覧・詳細/works詳細/services/productsページの
  計10箇所超）に`quality={80}`を追加し、圧縮率を統一・明示化した。
  ロゴ（Header/Footer）はSVGとPNGのどちらが使われるか案件次第だが、
  Astroの画像サービス実装（`node_modules/astro/dist/assets/services/
  service.js`）を確認したところ、**入力がSVGの場合は指定した
  `format`を無視して常に`format:"svg"`を強制する**仕様であることが
  判明したため、`format="webp"`と`quality={80}`をロゴにも安全に
  追加した（SVGロゴのままなら実質no-op、将来PNGロゴに差し替えた
  場合は自動的にWebP圧縮の恩恵を受けられる）。Features.astroの
  アイコン（意図的にSVGベクター画像を使う設計、9.19/9.20参照）は
  対象外のまま維持した。

**F. タイトル入力からURL識別子（slug）へのヘボン式ローマ字自動変換**

- 「お知らせ投稿」「実績・活用事例作成」の`title`フィールド入力に
  連動して、`urlSlug`フィールドへひらがな・カタカナ部分をヘボン式
  ローマ字へ変換した値をリアルタイムで自動補完する機能を追加した
  （`public/admin/index.html`の21章）。
- **漢字は変換対象外**：ひらがな・カタカナ→ローマ字は静的な文字
  対応表（拗音・促音・長音記号を含む）だけで機械的に変換できるが、
  漢字の読み（音訓・熟字訓）を一意に特定するには形態素解析＋辞書
  （kuromoji等、数MB規模）が必要で、この管理画面の軽量なJS構成には
  そぐわないと判断した。そのため漢字・記号など変換できない文字は
  スラッグ化の過程でハイフンとして除去される設計にした（例：
  「キャンペーンのお知らせ」→「知」の漢字部分だけ除去され
  `kyanpeennoo-rase`になる）。あくまで叩き台の自動入力であり、
  ユーザーは保存前に自由に手動で調整できる。
- **手動編集を上書きしない設計**：urlSlug欄へユーザーが直接
  文字を入力すると、そのエントリでは以後の自動上書きを停止する
  （`lastAutoSlug`を`null`にして以後のtitle入力イベントで無視する）。
  ただし自分自身が発行した`input`イベント（Reactの管理下にある
  値をプログラム的に書き換えるには、ネイティブの`value`setterを
  経由してから`input`イベントを発火させる必要がある——直接
  `.value`に代入するだけではReactの内部トラッキングをすり抜けて
  しまう）を「手動編集」と誤検知しないよう、書き込み直前に
  `dataset.cmsSlugAutofilling`フラグを立てて自分のイベントだけ
  無視するようにしている。
- 実機検証：「キャンペーンのお知らせ」と入力すると`urlSlug`が
  `kyanpeennoo-rase`に自動補完されること、`urlSlug`を手動で
  `my-custom-slug`に書き換えた後にタイトルへ追記しても`urlSlug`が
  上書きされず保持され続けることを確認した。

### 9.41 本文の空行スペーシング拡大／タイトル→slugの漢字ローマ字変換をkuromoji.jsで正式対応（2026-09）

**A. 本文の段落間マージンを本文の行送りに合わせて拡大**

- 9.40で修正した「装飾ブロック直後の内容が生テキスト化される」
  バグ・リスト表示のCSS欠落は、実機検証・構造上のHTML出力
  （本番ビルド・CMSプレビューの両方で`<p>あ</p><p>あ</p>`という
  正しく分離された構造、および`.prose-content p`のmargin-bottomが
  実際に効いていること）を再確認したところ、いずれも正しく機能
  していた。その上でなお「行間が詰まって見える」という指摘が
  再度あったため、原因を「機能していない」ではなく「余白の量が
  期待より小さい」という体感の問題として捉え直した：段落間の
  margin-bottomは`1.2em`（14px本文で16.8px）だったのに対し、本文
  自体の行送りは`leading-[1.9]`（14px×1.9＝26.6px＝1.9em）で、
  意図した空行1つぶんの余白が本文中の1行の高さよりも明らかに
  小さく、「文中の1行をまるごと飛ばした」ようには見えなかった。
- **修正**：`.prose-content p`のmargin-bottomを`1.9em`（本文の行送り
  と同じ値）に変更し、空行1つが「本文中の1行をまるごとスキップ
  したのと同じ高さ」に見えるようにした。空段落の`min-height`も
  `1em`→`1.9em`に合わせて変更。装飾ブロック（`ul`/`ol`/
  `blockquote`/`.cms-mark`を含む段落/`.cms-box`/`.cms-speech`/
  `.cms-align`）の下マージンも、9.23/9.25で確立した「段落marginと
  揃えてCSSのマージン相殺を効かせる」設計を維持するため、同じ
  `1.9em`へ揃えて更新した（`li`の行間`0.4em`、`.cms-video-embed`/
  `.cms-video-file`の`1.5em`など、段落marginに揃える意図が無い
  値はそのまま）。実機検証で、既存の実データ
  （`2026-09-10-year-end-new-year-hours.md`、段落間に空行を含む）の
  本番ページを表示し、段落間の余白が明らかに広がったことを
  スクリーンショットで確認した。

**B. タイトル→slugのローマ字変換に漢字対応を追加（kuromoji.js導入）**

- 9.40で実装した変換は、ひらがな・カタカナの静的な文字対応表のみで
  漢字は非対応（slugify段階でハイフンとして除去）としていたが、
  「私は学生です」のような漢字混じりのタイトルで「ha-desu」等の
  ように大部分が脱落し、実用に耐えないとの指摘を受けた。漢字の
  読み（音訓・熟字訓）を正しく解決するには形態素解析＋辞書が
  必須のため、軽量な**kuromoji.js**（IPADIC辞書同梱、UMDビルド）を
  jsDelivr CDN経由で遅延読み込みするよう実装した
  （`https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js`
  ＋`dicPath: '.../kuromoji@0.1.2/dict/'`。辞書はgzip圧縮された
  複数ファイル、合計十数MBをkuromoji自身が内部でXHR取得・展開する）。
  - **読み込みタイミング**：「お知らせ投稿」「実績・活用事例作成」の
    編集画面を開いた時点でバックグラウンドで読み込みを開始する
    （`loadKuromojiTokenizer()`）。辞書の読み込みには数秒かかる
    ことがあるため、読み込み中にユーザーがタイトルを入力した場合は
    従来どおりの「ひらがな・カタカナのみ変換」の暫定結果を即座に
    反映し、辞書の読み込みが完了した時点で、その時点のタイトル値を
    使って正しい読みベースの変換に自動的に「格上げ」する（ただし
    その間にユーザーがurlSlugを手動編集していた場合は上書きしない
    ——既存の「手動編集を上書きしない」原則をそのまま適用）。
  - **単語境界をハイフンで保持**：kuromojiの形態素解析結果
    （`tokenizer.tokenize(title)`）は単語（形態素）ごとに分割される
    ため、各単語の読み（`token.reading`。取得できない場合は
    `token.surface_form`にフォールバック）を個別にローマ字化してから
    ハイフンで連結する設計にした（読み全体を1本の文字列として連結
    してからローマ字化すると、単語の切れ目が失われ
    `watashihagakuseidesu`のような可読性の低い結果になることを
    実機検証で確認したため、単語単位で変換→連結する方式に変更した）。
  - **失敗時のフォールバック**：CDNへの到達不能等でkuromojiの読み込みに
    失敗した場合は例外を握りつぶし、9.40時点の「ひらがな・カタカナの
    みを変換、漢字はハイフン化」という暫定動作のまま機能を継続する
    （安全側のフォールバック。辞書が読み込めないことが原因で機能
    全体が止まることはない）。
  - **本番ページには一切影響しない**：kuromoji.jsの読み込みは
    `public/admin/index.html`（管理画面）内のみで行われ、
    `src/pages/`・`src/components/`等、実サイトのビルド対象コードには
    一切組み込んでいない。6章の「外部CDN読み込みゼロ」方針は本番
    公開ページ（一般訪問者が読み込むページ）を対象とした方針であり、
    管理者しかアクセスしない`/admin`画面は元々`decap-cms`本体・
    `netlify-identity-widget`をunpkg CDNから読み込んでおり、同じ扱い
    として問題ない。
  - 実機検証：新規「お知らせ投稿」エントリのタイトルへ「私は学生
    です」と入力すると、`urlSlug`が`watashi-ha-gakusei-desu`（要望どおり
    の単語区切りローマ字）に自動補完されることを確認。続けて
    `urlSlug`を`manual-override`に手動書き換えした後、タイトルへ
    追記しても`urlSlug`が上書きされず保持され続けることも確認した。

### 9.42 `astro dev`での`/admin/`（末尾スラッシュ）404の解消（dev専用ミドルウェア）（2026-09）

- **前提の確認**：報告された「`http://localhost:4321/admin/`が404に
  なる」不具合を調査したが、`public/admin/`配下のファイル
  （`index.html`・`config.yml`・`preview.js`・`editor-components.js`）は
  すべて実在しており（`git status`もクリーン）、ファイルの欠落や
  破損は無かった。また本プロジェクトには`src/admin/`ディレクトリや
  `prebuild`スクリプトは存在しない（Decap CMSの設定は
  `public/admin/config.yml`という単一の静的YAMLファイルのみで完結する
  構成。5章・9.36参照）。
- **真因**：5章に既に記載のとおり、`astro dev`は`public/`配下の
  サブディレクトリに対して「ディレクトリ名だけのURL
  （`/admin/`）をそのディレクトリの`index.html`へ解決する」機能を
  持たない。`curl`での実機確認でも`/admin/`は404、`/admin/index.html`
  （拡張子まで明記）は200 OKと、この既知の制約どおりの挙動を
  再現した。ファイルは最初から存在しており「復元」の必要は無く、
  URLの書き方（末尾スラッシュ有無）に起因する既知のdev限定の
  制約だった。
- **最初に試みて失敗した方法（記録として残す）**：Astro標準の
  `redirects`設定（`redirects: { '/admin': '/admin/index.html',
  '/admin/': '/admin/index.html' }`）で解決を試みたが、実機ビルドで
  重大な副作用を確認した——Astroの`redirects`は静的ビルド時に
  実ファイルとしてリダイレクト用HTMLページを生成する仕様のため、
  `/admin`・`/admin/`という送信元パスの出力先が、Astroのルーティング
  規約上どちらも`dist/admin/index.html`になり、**本物のDecap CMS本体
  （`public/admin/index.html`がそのままコピーされる場所）と完全に
  衝突してリダイレクト用の596バイトの空ページで上書きしてしまう**
  ことを`npm run build`の実行結果（`dist/admin/index.html`のサイズが
  199,370バイト→596バイトに減少）で確認した。本番の管理画面
  そのものを破壊しかねない重大な不具合だったため、この方式は
  採用せず、変更を完全に取り消した。
- **採用した方法**：`astro:server:setup`統合フック（Astro
  integrationのAPI）を使い、**`astro dev`の開発サーバーにのみ**
  介入する軽量なConnectミドルウェアを追加した
  （`astro.config.mjs`の`adminDirectoryIndexDevMiddleware()`）。
  リクエストURLが`/admin`または`/admin/`と完全一致する場合のみ
  `req.url`を`/admin/index.html`へ書き換えてから`next()`を呼ぶ、
  という最小限の実装。この方式は**ビルド時に一切干渉しない**
  （`npm run build`の成果物には何の変更も生じない）ため、9.42で
  最初に試みた`redirects`方式のような実ファイル衝突のリスクが
  構造的に存在しない。本番環境（Cloudflare Workers の静的アセット
  配信）でこの`/admin/`アクセス時の404が実際に問題になるかどうかは
  未検証だが、一般的な静的アセット配信はディレクトリ→
  `index.html`解決を標準でサポートしていることが多く、これは
  `astro dev`固有の制約に対するdev体験改善という位置づけで
  実装した。
- **検証**：`npm run dev`（ポート3000で起動）に対し、`curl`で
  `/admin`・`/admin/`・`/admin/index.html`の3パターンすべてが200 OK
  で、レスポンスボディが実際のDecap CMS本体（199,370バイト、
  `Decap CMS`という文字列を含む）であることを確認。ブラウザでも
  `http://localhost:3000/admin/`にアクセスして実際の管理画面
  （コレクション一覧）が正しく表示されることを確認した。あわせて
  `npm run build`を実行し、`dist/admin/index.html`が引き続き
  199,370バイトの本物のCMS本体のままであること（＝dev用
  ミドルウェアが本番ビルドの成果物に影響していないこと）も
  確認済み。

### 9.43 本番環境向け`public/_redirects`の追加（Cloudflareの`/admin/`404対策）

- 9.42はあくまで`astro dev`（開発サーバー）限定の対策で、本番
  環境（Cloudflare Workers の静的アセット配信、8章参照）側の
  `/admin/`アクセスには影響しない。Cloudflareの静的アセット配信
  （Pages・Workers Assetsとも共通）は、Pages由来の`_redirects`
  ファイル（出力ディレクトリ直下に配置するプレーンテキストの
  書き換えルール）をデプロイ時に自動的に認識する仕様のため、
  `public/_redirects`（ビルド時に`dist/_redirects`へそのままコピー
  される）を新設し、以下のルールを記述した：
  ```
  /admin    /admin/index.html  200
  /admin/*  /admin/index.html  200
  ```
  末尾の`200`は「実際のHTTPステータスは200のまま、内部的に
  `/admin/index.html`の内容を返す（リライト）」という意味で、
  ブラウザのアドレスバーは`/admin/`のまま変わらない（3xxの
  リダイレクトとは異なりURLが書き換わらない）。
  - **9.42で発見した`redirects`設定の実ファイル衝突とは無関係な、
    別の安全な仕組み**であることに注意：Astro標準の`redirects`
    設定はAstro自身がビルド時に`dist/`へ実際のリダイレクト用HTML
    ページを生成するため、出力先パスが本物のCMS本体
    （`public/admin/index.html`のコピー）と衝突する重大な副作用が
    あった（9.42参照）。一方`_redirects`ファイルはAstroのビルド
    パイプラインが一切関与しない、**Cloudflareのエッジ側のルー
    ティングレイヤーで解釈される設定ファイル**であり、`dist/`の
    ファイル構成自体には何の影響も与えない（`_redirects`という
    プレーンテキストファイルが1つ追加されるだけ）。実機ビルドで
    `dist/_redirects`の内容と`dist/admin/index.html`のサイズ
    （199,370バイト、変更前と同一）の両方を確認し、衝突が
    起きていないことを検証済み。
  - **ローカルでは検証不可能な点**：`_redirects`はCloudflareの
    エッジでのみ解釈される設定のため、`astro dev`・`astro preview`
    のどちらのローカルサーバーでもこのファイルの効果は再現
    されない（9.42のdev専用ミドルウェアが引き続きローカル開発時の
    `/admin/`アクセスを担当する）。本番での実際の動作確認は、
    Cloudflareへのデプロイ後に`https://<本番ドメイン>/admin/`へ
    直接アクセスして確認する必要がある。
  - **⚠️ ワイルドカード（`/admin/*`）が無限ループを引き起こす不具合
    （2026-09、実際にCloudflareへのデプロイで発生）**：
    上記の初版では`/admin/* → /admin/index.html 200`という
    ワイルドカードルールを含めていたが、実際にCloudflareへ
    デプロイした際、ルーティングエラー（`code: 100324`）で
    デプロイ自体が失敗した。原因は、書き換え先の
    `/admin/index.html`という文字列自体が`/admin/*`という
    ワイルドカードパターンにも一致してしまうため、Cloudflareの
    ルーティングエンジンが「書き換えた結果に対して同じルールを
    再度適用しようとして無限ループになる」ことを検知し、デプロイを
    ブロックしたため。`200`（リライト）はブラウザのURLが変わらない
    ため見た目上はループしないように思えるが、Cloudflare内部の
    ルーティング解決処理はリライト先のパスに対しても全ルールを
    再評価する仕様であるため、ワイルドカードと書き換え先が
    重なるパターンは避ける必要がある。
    - **修正**：ワイルドカードを使わず、`/admin`（末尾スラッシュ
      無し）・`/admin/`（末尾スラッシュ有り）の2パターンを直接
      列挙する形に変更した：
      ```
      /admin       /admin/index.html 200
      /admin/      /admin/index.html 200
      ```
      この2パターンはどちらも書き換え先の`/admin/index.html`
      そのものとは文字列として一致しないため、再帰的にルールが
      適用されることがなく、無限ループが起こらない。`/admin/xxx`
      のような更に深いパス（実際には存在しないため今のところ実害は
      無いが）は今回のルールでは救済されなくなった点に注意——
      Decap CMSの実際のアセット（`config.yml`・`preview.js`・
      `editor-components.js`等）はすべて`/admin/index.html`から
      `<script src="./preview.js">`のような相対パスで読み込まれる
      ため、`/admin/`さえ正しく`index.html`へ解決できれば、それ以外の
      `/admin/*`個別ファイルへの直接アクセスを救済する必要は無い
      （実運用上のアクセスパターンと矛盾しない）。
  - **⚠️ 直接指定2パターンへの変更後も本番で`ERR_TOO_MANY_REDIRECTS`
    （無限リダイレクトループ）が発生し、`public/_redirects`自体を
    撤去して解決（2026-09、さらに実際のCloudflareへのデプロイで
    発生）**：ワイルドカードを避けた直接指定版でもなお、本番の
    Cloudflare Workers Assets環境でブラウザ側の無限リダイレクト
    エラーが発生した。原因は、**Cloudflare Workers Assetsが
    そもそも`public/admin/index.html`のようなディレクトリ配下の
    `index.html`を「ディレクトリインデックス」として自動的に
    認識・配信する機能を標準で持っており**、`_redirects`に書いた
    `/admin/ → /admin/index.html`という明示的なルールが、この
    Cloudflare自身のURL正規化処理と衝突し、双方が互いに相手の
    結果へ向けてリダイレクトを発行し合う無限ループになっていた
    と考えられる。9.42（`astro dev`のディレクトリインデックス
    非対応）はAstroの開発サーバー固有の制約であり、**本番の
    Cloudflare Workers Assetsには元々この制約が無く、`_redirects`
    による対策自体が不要だった**、という結論に至った。
    - **修正**：`public/_redirects`ファイルを完全に削除した
      （他に必要なルールは無かったため、空にするのではなく
      ファイル自体を削除）。本番での`/admin/`アクセスは
      Cloudflare Workers Assets自身のディレクトリインデックス
      解決に任せる。
    - **教訓**：Astroの開発サーバー（`astro dev`）で観測された
      制約（9.42）を、デプロイ先のCloudflare環境にも同様に存在する
      問題だと早計に判断し、`_redirects`による対策を追加したことが
      そもそもの誤りだった。ローカルのdevサーバーとデプロイ先の
      静的アセット配信基盤は、同じ「`index.html`解決」というURLの
      振る舞いに見えても実装が別物であり、**一方の環境で確認した
      制約が他方にも存在すると仮定せず、対策を追加する前に
      本番環境それ自体での動作を確認する（あるいは対策を追加した
      後に本番で必ず動作確認する）べきだった**。今後、devサーバー
      固有の制約に対処する際は、その対策が本番環境にも必要か
      （＝本番環境が同じ制約を持つかどうか）を先に見極めてから
      実装すること。
    - `astro dev`側の対策（9.42の`astro:server:setup`ミドルウェア）は
      引き続きローカル開発時にのみ有効な独立した仕組みのため、
      今回`_redirects`を削除しても影響を受けず、ローカル開発時の
      `/admin/`アクセスは変わらず正常に動作する。

### 9.44 「実績・活用事例作成」「お知らせ投稿」一覧を開くとフリーズする不具合の修正（kuromoji.jsの起動タイミング）

- **調査**：報告に沿って`config.yml`の`works`/`news`両コレクションの
  `fields`／`preview`設定を再確認したが、フィールド定義に不整合は
  無く、`registerPreviewTemplate('works', WorkPreview)` /
  `registerPreviewTemplate('news', NewsPreview)`（`preview.js`）も
  一覧画面のレンダリングには関与しない（プレビューテンプレートは
  エントリ編集画面の右ペインでのみ使われる）ため、こちらも原因では
  なかった。
- **真因**：9.41で実装したタイトル→urlSlugのローマ字自動変換機能
  （`wireTitleToSlugAutoFill()`）が、`kuromoji.js`の辞書読み込み開始
  （`loadKuromojiTokenizer()`）を**「現在のハッシュが`works`/`news`
  コレクションの名前空間に一致するかどうか」だけで判定して呼び出して
  いた**ため、実際にタイトル・urlSlugフィールドが存在するエントリ
  編集画面だけでなく、**それらのコレクションの一覧画面を開いた
  だけ**でも辞書の読み込みが起動してしまっていた（コードレビューで
  発見。`titleWrap`/`slugWrap`の存在チェックより前に
  `loadKuromojiTokenizer()`を呼んでいたのが原因）。kuromoji.jsの
  辞書構築処理（gzip圧縮された数MB規模のバイナリ辞書をメインスレッド
  上で解凍・パースし、ダブル配列Trie（形態素解析用のデータ構造）を
  組み立てる、本質的にCPUバウンドな重い処理）が、**一覧画面を
  開いた瞬間にバックグラウンドで走り出し、その間メインスレッドが
  専有されて画面全体（一覧の描画・スクロール・クリックを含む）が
  一時的に応答不能になる**ことが、「エントリ一覧の読み込みで
  フリーズする」という報告の実体だったと判明した。9.41実装時の
  ローカル検証では、たまたま辞書のダウンロード・構築が数秒以内に
  完了する環境だったため、この間の応答不能状態を「一覧が正常に
  表示されるまでの遅延」程度としか認識できず、明確な不具合として
  見逃していた。
- **修正**：
  1. `loadKuromojiTokenizer()`の呼び出し位置を、`titleWrap`/
     `slugWrap`（実際のタイトル・urlSlug入力欄）の存在チェックより
     **後ろ**に移動した。これにより、辞書の読み込みは実際に
     エントリの新規作成・編集画面を開いた場合にのみ開始され、
     一覧画面では一切開始されなくなる。
  2. あわせて、辞書読み込み開始処理そのものも
     `requestIdleCallback`（非対応ブラウザでは`setTimeout`で代替）
     でメインスレッドが一段落するまで遅延させるようにした。これに
     より、エントリ編集画面自体を開いた直後の初期描画とも競合
     しにくくなり、辞書読み込みによる体感のカクつきをさらに
     軽減している。
- **実機検証**：`npm run dev`で「実績・活用事例作成」「お知らせ
  投稿」の一覧画面をそれぞれ開き、`window.kuromoji`が`undefined`の
  まま（＝辞書読み込みが一切開始されていない）ことを確認。続けて
  「お知らせ投稿」の新規作成画面を開くと`window.kuromoji`が
  正しくロードされ、タイトルへ「私は学生です」と入力すると
  `urlSlug`が`watashi-ha-gakusei-desu`に正しく自動変換される
  （9.41の機能自体は損なわれていない）ことも確認した。

### 9.45 kuromoji.jsをWeb Worker化し、メインスレッドを一切ブロックしない構造に変更

- **9.44だけでは不十分だった**：9.44で「一覧画面では辞書を読み込ま
  ない」よう起動タイミングを絞ったことで一覧画面のフリーズは解消
  したが、**実際にエントリの新規作成・編集画面を開いた場合**は
  引き続き、kuromoji.jsの辞書構築処理（gzip圧縮された数MB規模の
  バイナリ辞書をメインスレッド上で解凍・パースし、ダブル配列Trieを
  組み立てる、本質的にCPUバウンドな重い処理）がメインスレッド上で
  走るため、その間は程度の差はあれ画面が応答しにくくなる問題が
  残っていた（`requestIdleCallback`による遅延はスケジューリングの
  タイミングを後ろにずらすだけで、実行そのものをメインスレッド外へ
  逃がすものではないため、根本解決にはなっていなかった）。
- **修正**：kuromoji.js本体・辞書の読み込みと形態素解析を、
  メインスレッドとは別スレッドで動作する専用のWeb Worker
  （新設`public/admin/kuromoji-worker.js`）上で実行するように
  変更した。
  - `kuromoji-worker.js`は`importScripts()`でkuromoji.js本体を
    読み込み（classic workerのため`<script src>`タグと同様に
    クロスオリジンURLの制限を受けない）、`self.onmessage`で
    `{type:'tokenize', id, title}`を受け取ると、辞書が未構築なら
    その場で構築してから`tokenize()`を実行し、
    `{id, readings}`（各形態素の読み。取得できなければ表記
    そのもの）を`postMessage`で返す、という単純なリクエスト/
    レスポンス方式にした。
  - `index.html`側は`getKuromojiWorker()`でWorkerを遅延生成し
    （タイトル・urlSlugフィールドが実在するエントリ編集画面でのみ、
    9.44から変更なし）、`requestTitleReadingTokens(title, callback)`
    で`postMessage`→`onmessage`の非同期往復をリクエストID付きで
    管理する（複数の入力イベントが短時間に重なっても、対応する
    レスポンスだけを正しく解決できるようにするため）。
  - タイトル入力のたびに**2段階**でスラグを反映するように変更した：
    (1) 即座に、ひらがな・カタカナのみの同期・軽量な暫定変換
    （`fallbackTitleToSlug()`）を反映し、(2) 裏でWorkerへ形態素解析を
    依頼し、結果が届いた時点で（その間にユーザーが手動編集や
    タイトルの再入力をしていなければ）単語境界をハイフンで保持した
    より良いスラグへ格上げする（`readingTokensToSlug()`）。Worker生成
    ・辞書読み込みに失敗した場合（CDN到達不能等）は(1)の暫定変換の
    ままフォールバックする（安全側の設計、9.41から変更なし）。
  - Worker上で例外・エラーが起きた場合（`worker.onerror`）は、以後
    そのWorkerを使わない状態にして待機中の依頼をすべて「解決
    できなかった」ものとして片付け、暫定変換のみで動作を継続する。
- **実機検証（メインスレッドが本当にブロックされていないことの
  厳密な確認）**：`setInterval`で50ms間隔のタイマーを仕込み、
  「実績・活用事例作成」の新規作成画面でタイトルへ「私は学生です」を
  入力した直後（＝Workerが初めて辞書を一から構築するタイミング）から
  8秒間、実際に発火したタイマー間隔のずれを計測した。8秒間で期待
  どおり160回タイマーが発火し、最大でも約94msのずれ（`over200ms`の
  発火は0件）と、メインスレッドが完全にブロックされることは
  一度も無かったことを確認した。あわせて、その8秒の間に`urlSlug`が
  最終的に`watashi-ha-gakusei-desu`（漢字を含む正しい読みベースの
  変換）に到達していることも確認し、Worker自体は裏で正常に辞書を
  構築・解析できていることを裏付けた。手動編集の上書き防止（9.41）が
  引き続き機能することも再確認済み。
- `npm run build`実行後、`dist/admin/kuromoji-worker.js`が正しく
  出力されていることを確認済み（`public/`配下の他の静的ファイルと
  同様、Astroがそのままコピーする）。

### 9.46 「漢字が脱落してひらがな部分のみローマ字化される」不具合の真因を特定・修正（辞書構築の失敗キャッシュが永続化するバグ）

- **症状**：「私は学生です」と入力すると、期待される
  `watashi-ha-gakusei-desu`ではなく`ha-desu`のまま（＝「私」
  「学生」という漢字部分が完全に脱落し、ひらがなの「は」「です」
  だけが変換される）になり、いつまで待っても正しい変換に更新
  されない、という報告があった。
- **切り分け**：`ha-desu`という値自体は、実は**バグではなく設計
  どおりの「1段階目の暫定変換」の出力そのもの**であることをまず
  確認した——`kanaToRomaji("私は学生です")`は、ひらがな・カタカナの
  静的対応表にしか無いため、漢字の「私」「学生」は変換できずに
  そのまま素通りし、続く`slugifyRomaji()`が非英数字（＝漢字部分）を
  ハイフンに正規化する過程で「-ha--desu」→トリム・重複ハイフン
  除去後に「ha-desu」になる。これは9.45で実装した「Workerの応答を
  待たずに即座に暫定表示する」設計上、**一時的に**表示されること
  自体は意図どおりだが、問題は**Workerによる2段階目の格上げが
  いつまで経っても発生しなかった**点にあった。
- **真因**：`public/admin/kuromoji-worker.js`の`ensureTokenizer()`が、
  辞書構築に**一度でも失敗すると、rejectされたPromiseを
  `buildPromise`変数にキャッシュしたまま二度と再構築を試みない**
  実装になっていた。jsDelivr CDNからの辞書ファイル群（gzip圧縮
  された複数のバイナリファイルに分割されている）取得は、
  ネットワークの状態によっては最初の1回だけ一時的に失敗する
  ことがあり得る。ひとたびこれが起きると、そのWorkerインスタンスが
  生きている間（＝管理画面のタブを閉じるかリロードするまでの間）
  **以後のタイトル入力すべてが恒久的に1段階目の暫定変換（＝漢字
  脱落）のまま固定されてしまう**——これが報告された「いつまで
  待っても直らない」の実体だった。辞書構築が最初の1回で成功して
  いれば以後は問題なく動作するため、発生するかどうかがその時々の
  ネットワーク状況に左右される、原因の特定しにくい不具合だった。
- **修正**：`ensureTokenizer()`が返すPromiseに`.catch()`を追加し、
  構築に失敗した場合は`buildPromise`を`null`に戻すようにした
  （実際のエラー通知自体は、この内部catchとは別に、呼び出し元の
  `onmessage`側の`.catch()`が個別のtokenizeリクエストに対して
  従来どおり行う）。これにより、次にタイトルが入力された際に
  辞書構築が最初からやり直され、一時的なネットワーク不調から
  自然に回復できるようになった。
- **あわせて実施した副次的な改善（IME変換中の中間状態への反応を
  抑制）**：`titleInput`の`input`イベントリスナーに、
  `e.isComposing`（IMEでの変換確定前かどうか）のチェックを追加し、
  変換中の中間状態（ローマ字入力中・変換候補選択中の文字列）では
  `applySlugFromCurrentTitle()`を呼ばないようにした。かわりに
  `compositionend`（変換確定）イベントで改めて確定後の値を処理する。
  これにより、IME変換中に何度も無駄なWorkerリクエストが発生する
  ことを防ぎ、確定前の不完全な文字列に対する暫定変換がちらつく
  UXも解消した（根本原因ではないが、実際のIME入力時の挙動を
  より頑健にする副次的な改善）。
- **実機検証**：新規「お知らせ投稿」エントリのタイトルへ
  「私は学生です」と入力し、`urlSlug`が正しく
  `watashi-ha-gakusei-desu`に変換されることを確認した（正常系の
  再確認）。辞書構築の失敗を意図的に再現する実験（存在しない辞書
  パスへ差し替えたWorkerを動的に生成して検証）も試みたが、
  この検証環境ではkuromoji.js側のエラーハンドリングの挙動が
  不安定でテストスクリプト自体がハングしたため断念し、コード
  レビューでの確実な原因特定（rejectされたPromiseの永続キャッシュ）
  と、そのキャッシュを確実にクリアする修正の妥当性で担保した。

### 9.47 kuromoji.js・辞書をリポジトリ内へローカル化／真因（`Content-Encoding: gzip`の二重解凍問題）を特定・修正

- **9.46だけでは解決しなかった**：9.46の「辞書構築失敗のキャッシュを
  クリアする」修正自体は正しかったが、**そもそも辞書構築が一度も
  成功しない**という、より根本的な問題が別に存在していたため、
  依然として「私は学生です」→「ha-desu」のまま直らなかった。
- **辞書のローカル化**：外部CDN（jsDelivr）への依存自体を無くすため、
  kuromoji.js本体・辞書データの両方をこのリポジトリ内に配置した。
  - npm パッケージ`kuromoji`（`^0.1.2`）を`devDependencies`に追加
    （ビルドコード上でこのパッケージをimportすることはなく、
    あくまで辞書ファイル・ライブラリ本体を取得するためだけに使う）。
  - `node_modules/kuromoji/dict/*.gz`（12ファイル、合計約17MB）を
    そのまま`public/admin/dict/`へコピーして配置。
  - `node_modules/kuromoji/build/kuromoji.js`（約300KB）をそのまま
    `public/admin/kuromoji.js`へコピーして配置。
  - `kuromoji-worker.js`の`importScripts()`と`dicPath`を、外部CDNの
    URLからこれらの同一オリジンのローカルパス
    （`./kuromoji.js`・`./dict/`）へ変更した。
  - バージョンアップ時は`node_modules/kuromoji/dict/*.gz`・
    `node_modules/kuromoji/build/kuromoji.js`を同じ場所へ再度
    コピーし直すこと（自動化するビルドスクリプトは設けていない。
    辞書自体はkuromoji本体のバージョンに紐づく固定データで頻繁に
    更新するものではないため、素朴な手動コピーで十分と判断した）。
- **真因の特定（F12コンソールへの明示的なエラー出力の追加が決め手に
  なった）**：`kuromoji-worker.js`に`console.error`によるエラー
  ログ出力を追加したところ、ローカル化した辞書に切り替えた直後の
  実機検証で`invalid file signature:XX,YY`という例外が大量に
  記録されているのを発見した。原因を`curl -I`でレスポンスヘッダーを
  直接確認して特定：`astro dev`（Viteの静的ファイルサーバー）が
  `.gz`という拡張子を見て**自動的に`Content-Encoding: gzip`
  ヘッダーを付与していた**。この状態でブラウザがfetchすると、
  ブラウザ自身が`Content-Encoding`を見て**レスポンスを透過的に
  自動解凍**してしまう（これは本来、事前に圧縮しておいた通常の
  静的ファイルをブラウザ側で自動的に伸長して見せるための正しい
  挙動）。ところがkuromoji.js自身は「まだ圧縮されたままの生の
  gzipバイト列」を期待して自前の解凍処理（zlib.js相当の内蔵実装）を
  適用しようとするため、**既に解凍済みのデータをもう一度解凍
  しようとして失敗する**（＝gzipのマジックバイト`0x1f 0x8b`が
  見当たらず`invalid file signature`）という「二重解凍問題」だった。
  外部CDN（jsDelivr）は素のオブジェクトストレージ配信のため
  この自動`Content-Encoding`付与が起きておらず、9.45〜9.46の
  時点ではこの問題が顕在化していなかった——ローカル化して初めて
  露見した、環境依存の新しい問題だったことになる。
- **修正**：
  1. **devサーバー対策**：`astro.config.mjs`に新規
     `kuromojiDictDevMiddleware()`（`astro:server:setup`フック）を
     追加し、`/admin/dict/*.gz`へのリクエストをViteの既定の静的
     ファイルミドルウェアより先に横取りして、`fs.readFile`で
     直接読み出した生のバイト列を`Content-Encoding`ヘッダーを
     一切付けずに返すようにした（`Content-Type:
     application/octet-stream`のみ設定）。9.42の`/admin/`
     ディレクトリインデックス対策と同じ「dev限定ミドルウェアで
     Viteの既定動作を局所的に上書きする」パターンを踏襲している。
  2. **本番対策**：`public/_headers`（Cloudflareの静的アセット
     配信が認識するNetlify形式のヘッダー上書き設定ファイル、
     9.43の`_redirects`と同じ仕組みのヘッダー版）を新設し、
     `/admin/dict/*`に対して`Content-Encoding: identity`
     （＝「変換なし、生のバイト列」を意味するHTTP標準の値）を
     明示することで、Cloudflare側で同種の自動付与が発生していた
     場合にも上書きされるよう防御的に対応した（Cloudflareが
     実際にこの自動付与を行うかは未検証だが、`astro dev`側で
     現実に発生した以上、同種の静的アセット配信基盤で同じ
     問題が起きる可能性を無視できないため、コストの低い予防策
     として追加した）。
  3. `kuromoji-worker.js`に`console.error`によるエラーログを
     複数箇所へ追加した（辞書構築失敗時・個別のtokenizeリクエスト
     失敗時・Worker内の未捕捉例外の3箇所）。今回の調査で
     このログ出力自体が真因特定の決め手になったため、今後
     同種の問題が再発した場合の切り分けにも役立つ形で残している。
- **実機検証**：`curl -I`で`/admin/dict/base.dat.gz`の応答ヘッダーに
  `Content-Encoding`が含まれなくなったこと、`curl | head -c 4 |
  xxd`でボディの先頭バイトが`1f 8b`（gzipの正しいマジックバイト）で
  あることを確認。その上で新規「お知らせ投稿」エントリのタイトルへ
  「私は学生です」と入力し、`urlSlug`が正しく
  `watashi-ha-gakusei-desu`に変換されることを確認した。あわせて
  コンソールに新規のエラーが一切出力されないこと、手動編集の
  上書き防止が引き続き機能することも確認済み。`npm run build`後、
  `dist/admin/dict/`（12ファイル）・`dist/admin/kuromoji.js`・
  `dist/_headers`がいずれも正しく出力されていることも確認した。

### 9.48 意図的な空行（Enter2回）が「段落marginが広がっただけ」に見える不具合を修正（本番・CMSプレビュー両対応）

- **これまでの理解との違い**：9.41で導入した「段落間margin-bottomを
  本文の行送り（1.9em）に揃える」対応は、Decap側が空行を**単なる
  段落区切り**として扱った場合（＝生成される生Markdownが
  `1行目\n\n3行目`で、空行それ自体を表す実体を持たない場合）には
  正しく機能していた（前後の段落marginだけで「ちょうど1行ぶんの
  空白」を作れるため）。しかし、Decap CMSのSlateエディタは、
  ユーザーが空行に一度でもカーソルを置く等の操作をした場合、
  その空行を**ゼロ幅スペース（U+200B）だけを内容に持つ独立した
  `<p>`**としてシリアライズすることがある（CommonMarkの仕様上、
  本当に中身が空の行は単なる区切りとして無視され前後の段落と区別が
  付かなくなるため、見えない文字を1つ入れて「区切りではなく実体の
  ある段落」として保持するためのDecap側の工夫。9.35近辺で存在は
  把握していたが、9.41時点ではこのケースの実害を過小評価していた）。
  このケースでは、`.prose-content p`に一律で適用しているmargin-bottom
  （9.41）を、直前の段落・このゼロ幅スペース段落自身の両方が
  受け取ってしまうため、「直前の段落のmargin」＋「ゼロ幅スペース
  段落自身の行の高さ」＋「ゼロ幅スペース段落自身のmargin」の3つが
  単純に積み重なり、意図した「空行1つぶん」の約3倍の高さになって
  いた（実機で`node -e`スクリプトによりテスト記事を作成し
  `<p>1行目</p><p>​</p><p>3行目</p>`という実際の出力を確認、
  `getBoundingClientRect()`で高さを実測して検証した）。
- **修正（本番ページ）**：新規`src/lib/rehypeMarkBlankParagraphs.mjs`
  （rehypeプラグイン）を`astro.config.mjs`の`markdown.rehypePlugins`に
  追加した。ビルド時にHTML変換後の各`<p>`要素のテキスト内容を検査し、
  ゼロ幅スペース・通常の空白のみ（＝見た目上は何も無い）の場合に
  `prose-blank-line`というクラスを付与する。CSS側
  （`src/styles/global.css`）はこのクラスを持つ段落自体の高さを
  ちょうど本文の行送り1行ぶん（`height: 1.9em`）に固定してmargin自体は
  `0`にし、`:has(+ p.prose-blank-line)`（CSSの隣接兄弟セレクタ）で
  その直前の段落（別の空行の場合を含む）のmargin-bottomも`0`に
  打ち消すことで、二重・三重のmargin積み重ねを解消した。
- **修正（CMS管理画面プレビュー）**：`WorkPreview`・`NewsPreview`
  （`makePagePreview`経由）が`widgetFor('body')`で描画する本文は、
  Decap本体の内蔵markdownレンダラーが生成するReact要素であり、
  Astroのremark/rehypeパイプラインを一切通らない（7章で既出の
  「プレビューは別レンダリング経路を持つ」制約と同じ構図）ため、
  本番側の修正だけでは反映されない。CSSだけでは「テキストノードの
  中身がゼロ幅スペースだけかどうか」を判定できないため、9.31の
  `activateStaticHeaderMenu()`と同じ「`.Pane2 iframe`へ直接手を
  伸ばしてDOMを調べ、目印クラスを付与する」方式で対応する新関数
  `markBlankParagraphsInPreview()`（`preview.js`）を追加し、
  `WorkPreview`・`makePagePreview`の`componentDidMount`/
  `componentDidUpdate`から呼び出す（本文の内容が変わるたびに
  React側で新しいDOM要素が作られ直すため、都度クラスを再付与する
  必要がある。既存の`activateStaticHeaderMenu()`と全く同じ理由・
  同じ呼び出しパターン）。スタイル自体は既存の
  `registerPreviewStyle`呼び出しに`.cms-preview-blank-line`用の
  ルールを追記する形で対応した（本番側の`.prose-blank-line`と
  同じ考え方だが、Decapが挿入するインラインstyle等と詳細度で
  競合する場合があるため`!important`を付けている）。
- **実機検証**：`node -e`で作成したテスト記事
  （`1行目`→ゼロ幅スペースのみの空行→`3行目`）を使い、(1) 本番
  ページで`getBoundingClientRect()`により、1行目のmargin-bottomが
  `0px`に、空行段落自体の高さが`26.6px`（＝1.9em、本文の行送りと
  完全に一致）になっていることを確認、(2) 同じ記事をCMS管理画面で
  開き、プレビューiframe内の同じ`<p>`要素が`cms-preview-blank-line`
  クラスを持ち、本番と全く同じ高さ・margin構成になっていることを
  確認した。スクリーンショットでも、「1行目」と「3行目」の間に
  ちょうど1行ぶんの空白が視認できることを確認済み。検証用の
  テスト記事は確認後に削除し、コミットには含めていない。
  既存の実データ（`2026-09-10-year-end-new-year-hours.md`の
  「あ」「あ」という、ゼロ幅スペースではなく実際の文字を持つ通常の
  段落2つ）は今回のクラス付与の対象にならず、従来どおり段落margin
  （1.9em）のみで正しく1行ぶんの間隔になることも確認し、既存の
  挙動への回帰が無いことを確かめた。

### 9.49 意図的な空行を確実に保存・保持する「空行」専用コンポーネントを追加（Slateネイティブの空段落に依存しない設計）

- **9.48だけでは解決しない残存ケースが判明**：9.48は「Decap CMS
  （Slateエディタ）が空行をゼロ幅スペースだけを内容に持つ独立した
  `<p>`として保存すること**がある**」という前提のもとで、その場合の
  見た目（margin二重計上）を修正するものだった。しかし、続報として
  「『公開する』を押すと空行の情報そのものが保存前に消える
  （＝ゼロ幅スペースすら残らず、ただの`\n\n`段落区切りになる）」
  という報告があり、Slateエディタの内部的な正規化タイミング
  （具体的にどの操作の組み合わせでどちらの挙動になるかは、Decap
  CMS本体という非公開の内部実装に依存し、このリポジトリのコードから
  制御する手段が無い）次第で、空行の情報が完全に失われるケースが
  実際にあることを認めざるを得なかった。
  - **原理的な制約**：一度Slateが空の段落ノードを「実体の無い単なる
    区切り」として正規化してしまった後は、保存される生Markdown
    文字列は`"1行目\n\n3行目"`（空行が最初から無かった場合の出力と
    完全に同一）になる。`preSave`フック等でこの文字列を後処理しても、
    「本来ここに空行があった」という情報自体がどこにも残っていない
    ため、原理的に復元不可能である。Decap CMS本体（vendor化された
    Slateエディタの実装）を直接書き換えない限り、この経路を100%
    確実に修正することはできない。
- **採用した解決策**：Slateのネイティブな「空の段落」に一切依存
  するのをやめ、これまでのマーカー・囲い枠・吹き出し・テキスト
  配置・動画埋め込みと全く同じ仕組み
  （`CMS.registerEditorComponent()`によるブロック単位の挿入）で
  「空行」を独立したコンポーネントとして提供する
  （`public/admin/editor-components.js`に新規追加、
  `id: 'blank-line'`、`config.yml`の`editor_components`
  ホワイトリストにも追加）。カスタムコンポーネントはSlate内部では
  書き換え不可能な単一の"void要素"として扱われ、通常のテキスト
  正規化処理の対象にならないため、9.48で確認された「情報が
  丸ごと消失する」という問題が原理的に起こり得ない——保存・
  再読み込みを何度繰り返しても、ユーザーが「+」ボタンから明示的に
  挿入した空行は必ず残ることが保証される。
  - `toBlock()`は`<div class="cms-blank-line"></div>`という
    最小限のHTMLブロックを出力する（フィールド無し、`fromBlock()`は
    空オブジェクトを返すのみ）。既存の`<div>`ベースのコンポーネント
    （囲い枠・吹き出し・テキスト配置）と同じCommonMarkのHTML
    ブロック（type 6）として確実に保存・復元される。
  - `toPreview()`は高さ1.9em・破線ボーダー付きのプレースホルダーを
    返す（編集中に「ここに空行がある」ことが視覚的に分かるように
    するため。実際の公開ページ・本番相当のプレビューでは枠線は
    表示せず高さのみを反映する——後述のCSS参照）。
  - CSS（`src/styles/global.css`、`.prose-content .cms-blank-line`）は
    `height: 1.9em; margin: 0;`のみを設定する。この要素自体が
    「空行」の実体そのものであり、前後の段落は通常どおりの
    margin-bottomをそのまま受け取ってよいため、9.48のような
    margin二重計上の問題は起きない（この点が9.48のゼロ幅スペース
    段落＝`.prose-blank-line`との設計上の違い：あちらは「Slateが
    たまたま生成した実体のない段落」を後から救済する対症療法
    だったため前後の段落のmarginを打ち消す必要があったが、こちらは
    最初から「空行1個ぶん」として設計された専用要素のため、
    周囲のmarginをそのまま活かせる）。
  - `preSave`の`collapseDecorationBlankLines()`（9.25・9.40参照）は
    `cms-align`・`cms-video-embed`等の特定のクラス名だけを対象と
    する正規表現のため、新しい`cms-blank-line`は最初から対象外
    （前後の空行を圧縮されない）。9.40で修正した「`</div>`直後の
    空行を圧縮すると後続の内容が生テキスト化される」不具合と同種の
    問題がこの新コンポーネントで再発することもない。
- **検証**：`CMS.getEditorComponents()`で`blank-line`が正しく
  登録されていることを実機で確認。ブラウザ自動操作特有の制約
  （このセッションで繰り返し確認されている、Decap内部のポップ
  アップ・ドロップダウン系UIを自動クリックで確実に開けない問題）
  により「+」ボタンからのUI操作そのものは自動検証できなかったが、
  (1) `pattern`の正規表現が`toBlock()`の出力と正しく一致すること
  をNode.jsで単体検証、(2) `toBlock()`の出力と全く同じ生HTML
  （`<div class="cms-blank-line"></div>`）を含むテスト記事を直接
  作成して`npm run build`を実行し、本番ページのビルド後HTMLに
  この`<div>`がそのまま保持されていること、実機の
  `getBoundingClientRect()`で「1行目」段落の下端から「3行目」
  段落の上端までの距離が本文の行送り2つぶん（53.2px：1つは
  「1行目」自身の通常のmargin、もう1つは空行コンポーネント自身の
  高さ）になっており、「1行目・空行・3行目」という3行構成が
  正しく再現されていることを確認した。この2点の検証と、既存の
  6コンポーネント（マーカー等）が全く同じ実装パターン
  （`registerEditorComponent`のfields/pattern/toBlock/fromBlock/
  toPreview）で実際に本番運用されていることを踏まえ、機能の
  正しさを担保した。

### 9.50 Decap CMS修復・最適化作業のまとめ（フリーズ解消・空行対応・全体精査ロードマップ）（2026-09）

2026-09に連続して行った「フリーズ問題の根本解決」「空行の表示・保持の完全同期」
「管理画面全体の精査と改善提案」の3件を、経緯を追いやすいよう横断的にまとめる
索引セクション。各項目の実装詳細・検証ログは元のセクション番号を参照。

**A. Decap CMSフリーズ問題の根本解決（Web Worker化・辞書ローカル化）**

「お知らせ投稿」「実績・活用事例作成」の一覧・編集画面でブラウザが応答不能に
なる不具合を、複数ラウンドにわたる原因の掘り下げの末に解消した（9.41で導入した
タイトル→urlSlug自動ローマ字変換機能に付随して発生）。

- 9.44：一覧画面を開いただけでkuromoji.jsの辞書構築（CPUバウンドな重い処理）が
  誤って起動してしまっていた不具合を特定・修正（起動条件をタイトル・urlSlug
  入力欄が実在するエントリ編集画面のみに限定）。
- 9.45：エントリ編集画面自体を開いた場合に残っていたメインスレッドの一時的な
  応答低下を、辞書構築・形態素解析そのものを専用のWeb Worker
  （`public/admin/kuromoji-worker.js`）へ完全移行することで根絶。8秒間・160回の
  タイマー計測で最大ずれ94ms（`over200ms`発火0件）とメインスレッドが一切
  ブロックされないことを実機検証済み。
- 9.46：辞書構築に一度失敗すると、そのタブを閉じるまで恒久的に「ひらがな・
  カタカナのみ変換、漢字は脱落」の暫定結果に固定されたままになる
  （rejectされたPromiseの永続キャッシュ）バグを修正。あわせてIME変換確定前の
  中間状態で無駄な変換処理が走らないよう`isComposing`判定を追加。
- 9.47：外部CDN（jsDelivr）依存自体をやめ、kuromoji.js本体・辞書ファイル
  （`public/admin/kuromoji.js`・`public/admin/dict/*.gz`）をリポジトリ内へ
  ローカル配置。ローカル化した直後に新たに発覚した「`astro dev`が`.gz`拡張子を
  見て自動的に`Content-Encoding: gzip`を付与し、ブラウザの透過的自動解凍と
  kuromoji.js自身の解凍処理が二重に働いて`invalid file signature`エラーになる」
  問題を、dev限定ミドルウェア（`astro.config.mjs`の`kuromojiDictDevMiddleware()`）
  で解消。本番（Cloudflare）向けの防御策として`public/_headers`に
  `Content-Encoding: identity`も追加。
- 効果：「お知らせ」「実績」コレクションの一覧・編集画面を開いてもブラウザが
  一切フリーズしなくなり、タイトル入力に応じた漢字混じりの正しいローマ字
  スラッグ自動変換（例：「私は学生です」→`watashi-ha-gakusei-desu`）が
  メインスレッドを一切ブロックせずに機能するようになった。

**B. 空行（Enter 2回分のスペース）の表示・保持の完全同期**

Decap CMS（Slateエディタ）で意図的に作った空行が、保存時のシリアライズ処理で
消失・圧縮される問題に、原理的な制約の解明と実務的な解決の両輪で対応した。

- 9.48：Slateエディタが空行をゼロ幅スペース（U+200B）だけを内容に持つ独立した
  `<p>`として保存するケースについて、本番ページ（新設の
  `src/lib/rehypeMarkBlankParagraphs.mjs`というrehypeプラグイン）とCMS
  プレビュー（`preview.js`の`markBlankParagraphsInPreview()`）の両方で
  `prose-blank-line`／`cms-preview-blank-line`クラスを動的付与し、margin
  二重計上（意図した「空行1つぶん」の約3倍の高さになっていた）を解消。
- 9.49：それでもなお、Slateエディタの内部正規化タイミング次第では空行の情報が
  ゼロ幅スペースすら残らず保存前に完全に消えてしまうケースがあることを確認
  （一度そうなると`"1行目\n\n3行目"`という、空行が最初から無かった場合の
  出力と完全に同一の文字列になり、`preSave`等のいかなる後処理でも原理的に
  復元不可能）。Slateのネイティブな空段落に一切依存しない解決策として、
  既存のマーカー・囲い枠等と全く同じ`registerEditorComponent`の仕組みで
  「空行」専用コンポーネント（`id: 'blank-line'`、`public/admin/
  editor-components.js`）を新設。カスタムコンポーネントはSlate内部で
  書き換え不可能な単一の"void要素"として扱われるため、保存・再読み込みを
  何度繰り返しても情報が失われることが原理的に起こり得ない。
- 効果：「1行目→Enter2回→3行目」のような意図的な空行が、本番ページ・CMS
  プレビューの両方で確実に1行分（本文の行送りと同じ1.9em／約26.6px）の
  高さとして表示・保持されるようになった。

**C. 管理画面（Decap CMS）全体精査と改善ロードマップの策定（2026-09-13、未着手）**

`config.yml`・`preview.js`・`editor-components.js`を対象に、重複項目の整理・
入力操作性・プレビュー最適化の3観点で棚卸しを実施し、以下の改善案を運用者へ
提示した（**この時点ではまだ実装・コミットしていない、提案のみの状態**。
着手する場合は個別に優先順位を確認の上、対応セクションを追記すること）。

- **最優先**：「画像メタデータ」コレクション（`mediaLibrary`、9.32〜9.39で
  作り込んだAlt属性・キャプション機能）が、実際には`src/`のどこからも
  参照されておらず、保存しても本番ページの`<Image alt>`等に一切反映されない
  「死んだ機能」になっていることを`grep`で確認。撤去するか、ファイル名を
  キーに各`<Image>`が参照する仕組みを新設するか、方針決定が必要。
- 「セクションの表示・非表示」（`features.enableXxx`）と「セクション表示
  順序」（`sectionOrder`）が同じ9セクション一覧を2箇所で別々に管理しており、
  非表示にしたいときにどちらを触ればいいか迷いやすい。`sectionOrder`の
  各行に表示ON/OFFを持たせて1つのlistへ統合する案。
- `stickyContactBar.leftButton`/`rightButton`のフィールド定義がほぼ完全に
  重複（左右で構造が同一）。
- 下層ページ4種（services/about/contact/newsPage）の`pageName`+`heading`
  という定型パターンがconfig.yml上で4回コピペされている。YAMLアンカーで
  共通化可能（`works`/`news`の`buttons`/`editor_components`と同じ手法）。
- `nav`と`footerNav`が独立リストのため、同じリンクを2箇所に入力する
  必要がある案件が多い。
- `works`コレクションに`sortable_fields`が未設定（`news`にはある）という
  一貫性の欠如。
- お問い合わせフォームの`custom_fields[].name`（送信キー）が今なお手動
  入力必須で、空欄だとその項目がサイレントに送信されない落とし穴がある。
  `urlSlug`と同じ自動スラッグ化の仕組み（9.40〜9.47で確立済みの基盤）を
  転用できる。
- その他、`sns`リストのsummary表示簡素化、`access.labels`と`contact`の
  役割分担を示すhintの拡充、`works`の`price`フィールドへの「未入力なら
  非表示」注記など、複数の小粒な入力操作性向上案。
- 詳細は本セッションの提案一覧（会話ログ）を参照。実装に着手した際は、
  対応内容をこのセクションの追記または新規セクションとして記録すること。

### 9.51 管理画面改善ロードマップの実装：セクション表示ON/OFFの統合・Altメタデータ再構築・カスタム項目名の自動slug化（2026-09-14）

9.50-Cで提案したロードマップのうち、A-1（画像メタデータ再構築）・A-2（表示
ON/OFFと並び順の統合）・B-9（custom_fields送信キーの自動slug化）・
B-8/B-10/C-12（小粒な改善）を実装した。

**A-2：「セクションの表示・非表示」と「セクション表示順序」の統合**

- `sectionOrder`の各項目に`enable`（boolean、既定true）を追加し、
  「並び替え」と「表示ON/OFF」を1つの画面で完結させた。旧・独立した
  `features.enableXxx`（9項目）は`config.yml`・`siteInfo.yml`から
  丸ごと廃止。トップページの`Hero`直下に固定配置される「お知らせ」
  セクションのみ`sectionOrder`の対象外（並び替え不可）のため、
  `newsSection.enabled`として独立管理を継続する。
- `src/lib/site.ts`に`isSectionEnabled(id)` / `orderedSectionIds()`
  （`sectionOrder`に項目が無ければ既定で全セクション表示扱い）を新設し、
  `index.astro`・各セクションコンポーネント（Access/Faq/Features/Flow/
  Contact/Service/Products/Works/Plans）・`llms.txt.ts`の
  `site.features.enableXxx`参照をすべてこちらへ置き換えた。ヘッダー・
  フッターのナビ連動（`navHrefToFeatureFlag`）も`navHrefToSectionId`
  （href→セクションID）へ設計変更し、`isSectionEnabled()`を経由する形に
  統一。`preview.js`の`FEATURE_FLAG_MAP`/`NAV_HREF_TO_FLAG`も同じ考え方の
  `sectionEnabledMap()`/`NAV_HREF_TO_SECTION`へ置き換えた。
- 既存データ（`siteInfo.yml`）は、旧`features.enableXxx`の値（全項目
  true）をそのまま`sectionOrder`各項目の`enable: true`へ機械的に移植し、
  `newsSection.enabled: true`を追加。挙動に変化が無いことを
  `npm run build`で確認済み。

**A-1：画像Altメタデータの再構築（独立コレクション撤去→画像フィールド直下方式）**

- 9.32〜9.39で作り込んだ独立コレクション「画像メタデータ」
  （`mediaLibrary`、`src/data/mediaLibrary.yml`）を、9.50-Cの精査で
  「実際には`src/`のどこからも参照されず保存内容が反映されない死んだ
  機能」と確認した通り、config.yml・データファイルごと完全撤去した。
  あわせて`public/admin/index.html`内でこのコレクションを支えていた
  一連のJS（✎ショートカット・ポップオーバー編集画面・ドラッグ&ドロップ
  アップロード・ファイル名複製保存・postSave/loadイベントの分岐等、
  9.32-B〜9.39で積み上げた実装）も丸ごと削除した。ただし、メディア
  ライブラリ（既定のアセットピッカー）自体の5列グリッド調整・横スクロール
  解消CSS（9.33-D。`mediaLibrary`コレクションと無関係な汎用UX改善）は
  存続させ、対象モーダルを判定するための最小限の関数
  （`tagOpenMediaLibraryModal()`）だけを新設して残した。
- 代わりに、Alt属性を実際に使う画像フィールドの直下へ`alt`（`works`・
  `services.yml`のサービス詳細・`products.yml`の商品項目）または
  既存の`imageAlt`命名規則に合わせたフィールド（`works.imageAlt`。
  `news`/`hero`/`access.store`は既に`imageAlt`を持っていたため変更なし）
  を追加した。`about.yml`の代表挨拶写真は`alt`を追加。
  - `src/content/config.ts`：`works`スキーマに`imageAlt: z.string()
    .optional()`を追加。
  - `src/lib/pages.ts`：`ServicesPage.items[].alt`・
    `AboutPage.greeting.alt`・`ProductItemConfig.alt`・
    `ResolvedProductItem.alt`を追加し、`resolveProductItems()`/
    `resolveAllProductItems()`が`alt`を素通しするよう修正。
  - 本番テンプレート（`Works.astro`・`works/[slug].astro`・
    `Service.astro`・`services.astro`・`about.astro`・`Products.astro`・
    `products.astro`）の`<Image alt={...}>`を、いずれも
    「入力されたAlt文字列があればそれを最優先し、無ければ従来どおりの
    自動生成文言（タイトル名＋『のイメージ』等）へフォールバックする」
    形に統一。CMSプレビュー（`preview.js`の`WorkPreview`・
    `ProductsCatalogPreview`・`ServicesPagePreview`・
    `AboutPagePreview`）も同じフォールバック順で追従修正した。

**B-9：お問い合わせフォーム「カスタム追加項目」の項目名（name）自動slug化**

- 9.40〜9.47で確立したkuromoji Web Worker基盤（タイトル→urlSlug変換）を
  そのまま転用し、`contactPage.yml`の`custom_fields[].label`（項目名）
  入力に連動して`custom_fields[].name`（送信データ用の半角英数キー）を
  自動でヘボン式ローマ字スラグ化する`wireCustomFieldsNameAutoFill()`を
  `public/admin/index.html`に追加した。
  - urlSlugとの違いは、`custom_fields`が単一フィールドではなく
    ドラッグ&ドロップで自由に行を追加・削除できる`list`ウィジェットで
    あること。各行は既存の「表示順序」リスト等と同じDecap内部クラス
    `[class*="SortableListItem"]`で囲まれているため、その中から
    `label-field-*`/`name-field-*`を1組ずつ取り出してペアリングし、
    行ごとに個別配線する。
  - `name`フィールドは半角英数字と`_`のみ許容（ハイフン不可）のため、
    既存の`slugifyRomaji()`が生成するハイフン区切りの結果をそのまま
    使わず、アンダースコアへ変換してから反映する
    （`fallbackLabelToFieldName()`/`readingTokensToFieldName()`）。
  - 「手動編集を上書きしない」既存の仕組み（`lastAutoName`を`null`に
    して以後のlabel入力イベントを無視する）・IME変換確定前の中間状態を
    スキップする仕組みは、urlSlug版と全く同じロジックをそのまま踏襲。

**その他の小粒な改善**

- B-8：`works`コレクションに`sortable_fields: ["publishedAt", "title"]`
  を追加（`news`と同様、一覧画面での並び替えに対応）。
- B-10：「SNS設定」リストの`summary`を`{{fields.id}}（{{fields.url}}）`
  から`{{fields.id}}`のみへ簡素化し、長いURLによる折りたたみ表示の
  崩れを解消。
- C-12：`works`の「価格」フィールドに「未入力の場合、カードに価格は
  表示されません。」の`hint`を追加。

**検証**：`npm run build`（22ページ、エラー0件）・`npx astro check`
（0エラー・0警告）を確認。`config.yml`はAstroのビルド対象外
（ブラウザ上のDecap CMSがfetchして解釈する静的YAML）のため、`js-yaml`で
別途構文検証（`mediaLibrary`コレクションが正しく除去され、
`settings`/`productsCatalog`/`works`/`pages`/`news`の5コレクションのみ
残っていることを確認）。`public/admin/index.html`の巨大な削除・追記が
構文を壊していないことも、実際の`<script>`タグ本体を抽出して
`node --check`で個別に検証した。管理画面アセットのキャッシュバスター
（`config.yml`/`preview.js`/`editor-components.js`の`?v=`、9.24参照）は
今回の変更に合わせて`20260914a`へ統一した。

### 9.52 お問い合わせ設定の相互案内・アクセスラベルの注記・下層ページ共通フィールドのYAMLアンカー化・フッターナビのヘッダー流用機能（2026-09-14）

9.50-Cのロードマップの残り項目（C-11・B-6・A-4・A-5）を実装した。

**C-11：お問い合わせ設定の全体案内注記**

お問い合わせ関連の設定は3箇所（①`siteInfo.yml`の`contactSection`＝
見出し・本文・送信ボタン文言、②`contactPage.yml`＝入力欄のラベル・
必須設定・カスタム項目、③`contact-form.json`＝Web3Formsの送信先・
通知メール設定）に意図的に分かれている（9.7章参照）。この3箇所すべての
`hint`に、他の2箇所の役割・所在を明示する相互案内文を追加した
（`config.yml`の`contactSection`オブジェクト・`contactFormSettings`
ファイル項目・`pages`コレクションの`contact`ファイル項目、各hint参照）。
どれか1つを開けば残り2箇所への導線が分かるようにする狙い。

**B-6：「アクセス」項目ラベルの電話番号フィールドへの注記明確化**

`access.labels.phone`（アクセスセクションの「電話番号」という**表示文言**
だけを設定するフィールド）に、「実際の電話番号本体は『連絡先』
セクションで変更してください」という趣旨のhintを追加した。9.12で
同じ混同（ラベルと実データの分離）を`access`オブジェクト全体の説明として
一度案内していたが、今回は該当フィールド自体にピンポイントで明記した。

**A-4：下層ページ共通フィールド（`pageName`/`heading`）のYAMLアンカー化**

`services`/`about`/`contact`/`newsPage`の4ファイルが共通して持つ先頭
2フィールド（「ページ名」「ページ見出し」、9.3参照）の定義を、最初の
出現（`services`）にYAMLアンカー（`&pageIdentityName` /
`&pageIdentityHeading`）を付け、以降の3ファイルは**マージキー**
（`{ <<: *pageIdentityName, default: "会社概要" }`のように、共通部分を
継承しつつ`default`だけをページごとに上書きする）または`default`が
不要な場合はそのままの別名参照（`*pageIdentityHeading`）で共通化した。
- YAMLのマージキー（`<<:`）は標準YAML 1.1機能で、`js-yaml`が既定で
  対応していることを実機（Node.js）で事前検証してから採用した
  （`editor_components`/`buttons`の既存の`&anchor`/`*alias`利用は
  「フィールド値全体をまるごと共有」するケースのみだったため、
  「一部のプロパティだけ上書きしたい」今回の要件には初めてマージキーを
  導入した）。
- 新しい下層ページを追加する場合も、この2フィールドは
  `{ <<: *pageIdentityName, default: "<ページ名の既定値>" }` /
  `*pageIdentityHeading`（または`default`が必要なら同様にマージキー）を
  踏襲すること。label/hint文言を変更する場合は`services`側の
  アンカー定義を直すだけで4ファイルすべてに反映される。

**A-5：フッターナビゲーションの「ヘッダーナビと同じ内容を使う」トグル**

`footerNav`を素の配列（`widget: list`）から、`useHeaderNav`
（boolean、既定false）＋`items`（従来のリスト）を持つオブジェクトへ
構造変更した。ONにすると、`items`の内容を無視してヘッダーナビ（`nav`）
と全く同じ項目・表示名・並び順がフッターにも表示される（同じリンクを
2箇所に入力する手間を解消）。
- `src/lib/site.ts`：`SiteInfo.footerNav`の型を
  `{ useHeaderNav?: boolean; items?: {...}[] }`に変更し、新関数
  `resolveFooterNavItems()`（`useHeaderNav`なら`site.nav`、そうでなければ
  `site.footerNav.items`を選び、`visibleNavItems()`を通す）を追加。
  セクション表示ON/OFF・下層ページ見出しへのフォールバックは通常の
  ナビゲーションと全く同じロジックがそのまま働く。
- `Footer.astro`：`visibleNavItems(site.footerNav)`直接呼び出しを
  `resolveFooterNavItems()`へ置き換え。
- `preview.js`の`renderFooter`：`data.footerNav.useHeaderNav`を見て
  `data.nav`／`data.footerNav.items`のどちらを`filterVisibleNavForPreview()`
  に渡すか切り替えるよう追従修正。
- 既存データ（`siteInfo.yml`）は`footerNav: [...]`（配列）から
  `footerNav: { useHeaderNav: false, items: [...] }`へ構造移行し、
  既存の8項目はそのまま`items`の中へ移した（`useHeaderNav`は既定`false`
  のため、移行前後で実サイトの表示内容は変化しない）。

**検証**：4項目とも実装後、`npm run build`（22ページ・エラー0件）・
`npx astro check`（0エラー・0警告）を確認。`config.yml`は
`js-yaml`で構文検証し、A-4のマージキーが各下層ページで正しい
`default`値に解決されること（`services`＝サービス内容・料金、
`about`＝会社概要、`contact`＝お問い合わせ・ご予約、`newsPage`＝
お知らせ一覧ページ／お知らせ）、A-5の`footerNav`が
`widget: object`＋`useHeaderNav`/`items`の2フィールド構成に
なっていることを、それぞれNode.jsスクリプトで実機確認した。
`preview.js`/`config.yml`を変更したため、キャッシュバスター
（9.24参照）を`20260914b`へ更新した。

### 9.53 フッターナビ「ヘッダーナビ流用」機能にヘッダーCTAボタンも結合（2026-09-14）

- **要望**：9.52-A-5で実装した`footerNav.useHeaderNav`は、ONの間
  ヘッダーの通常メニュー項目（`nav`）のみをフッターに流用しており、
  ヘッダー右端の強調CTAボタン（`navCta`。ヘッダーでは`Header.astro`が
  `MobileNavDrawer`にも渡している「お問い合わせ」等のボタン）が
  含まれていなかった。ヘッダーの見た目（通常メニュー＋CTAボタン）に
  フッターも完全に揃えたいという要望を受け、`nav`配列の末尾に
  `navCta`の「表示名」「リンク先」を1項目として結合するよう拡張した。
- **実装**：`src/lib/site.ts`の`resolveFooterNavItems()`を、
  `useHeaderNav`が`true`の場合は`visibleNavItems(site.nav)`の結果に
  `site.navCta`（`label`と`href`の両方が入力済みの場合のみ）を
  1項目として追加する形に変更した。`Header.astro`の表示条件
  （`site.navCta.label && site.navCta.href`）と全く同じガードを使う
  ことで、ヘッダー側でCTAボタンが表示されない設定（文言またはリンク先が
  未入力）のときはフッターにも追加されない、という一貫性を保っている。
  `navCta`はナビ項目自身が明示的な表示名を持つため、下層ページ見出しへの
  フォールバックを行う`visibleNavItems()`は通さず、そのまま配列末尾へ
  追加する（`navCta`はそもそもセクションIDにもページ見出しにも
  対応しない独立した設定のため）。
- `public/admin/preview.js`の`renderFooter`も同じロジック
  （`useHeaderNav`時は`data.nav`をフィルタした配列へ`data.navCta`を
  条件付きで`concat`）で追従修正した。
- `config.yml`の`useHeaderNav`フィールドのhintに、CTAボタンも
  自動結合される旨を追記した。
- **実機検証**：`siteInfo.yml`の`useHeaderNav`を一時的に`true`へ切り替えて
  `npm run build`し、`dist/index.html`のフッター内`<a>`要素を実測。
  `nav`配列（7項目、`/contact`を含まない）の末尾に`navCta`
  （「お問い合わせ」→`/contact`）が過不足なく追加され、合計8項目に
  なっていることを確認。検証後、`siteInfo.yml`は`git checkout`で
  元の値（`useHeaderNav: false`）へ戻し、コミットには含めていない。
  `npx astro check`は0エラー。`preview.js`/`config.yml`を変更したため
  キャッシュバスターを`20260914c`へ更新した。

### 9.54 「画面下部固定バー」の設定構造・描画ロジックのリファクタリング（2026-09-14）

`stickyContactBar`の`leftButton`/`rightButton`（9.36で`required: false`
一括修正、9.52-A-4で他の重複箇所をYAMLアンカー化した際に「未着手」として
残していた箇所）を、保守性・将来の拡張性向上のためリファクタリングした。
実際に保存される`siteInfo.yml`のデータ構造（`leftButton`/`rightButton`
オブジェクトそれぞれが`label`/`show`/`color`/`actionType`/`customLink`を
持つ）自体は変更していないため、既存データ・実サイトの見た目は一切
変わらない（本番ビルドのHTML出力が改修前後で完全に一致することを確認済み、
後述）。

- **`config.yml`（CMSスキーマ）**：`leftButton`/`rightButton`で重複していた
  「ボタン文言」「表示する」「アクション種別」の3フィールド定義に
  YAMLアンカー（`&stickyButtonLabel` / `&stickyButtonShow` /
  `&stickyButtonActionType`）を付け、`rightButton`側は全く同じ内容の
  フィールドはそのまま別名参照（`*stickyButtonLabel`等）、`default`
  だけが異なる`actionType`はマージキー（`{ <<: *stickyButtonActionType,
  default: "url" }`）で上書きする、9.52-A-4と同じ手法で共通化した。
  「背景カラー」（`color`）と「個別リンク先」（`customLink`）は、
  既定値・案内文言（フォールバック先の説明文）が左右で本質的に異なる
  （色：primary⇄accent、customLinkのhint：連絡先の電話番号／SNS設定の
  LINE URL）ため、あえてアンカー化せず個別定義のまま維持した——
  「共通化できるものだけを共通化し、意味の異なる文言は無理に統一しない」
  という判断。
- **`src/lib/site.ts`（型定義）**：`leftButton`/`rightButton`で重複していた
  インライン型定義を、新規`export interface StickyButtonConfig`
  （`label`/`show`/`color`/`actionType`/`customLink`）に1本化し、
  `stickyContactBar.leftButton`/`.rightButton`の両方がこの型を参照する
  形に変更した。
- **`src/components/StickyContactBar.astro`（描画ロジック）**：
  「表示可否の判定」「リンク先の解決」という左右で重複していたロジックを
  `resolveButton(config: StickyButtonConfig, fallbackHref, icon)`という
  1つの関数に統合し、`const buttons = [resolveButton(left, ...), 
  resolveButton(right, ...)].filter(b => b.show)`という配列ベースの
  設計に変更した。アイコン（電話／LINE）は意味が異なるため
  `button.icon === 'line' ? <LINEのsvg> : <電話のsvg>`という分岐で
  個別描画するが、それ以外（表示制御・色・レイアウト・grid-cols算出）は
  完全共通のロジックが両ボタンに適用される。将来3つ目以降のボタンを
  追加したくなった場合も、`buttons`配列に`resolveButton()`の呼び出しを
  1件足し、アイコンのcase分岐を1つ増やすだけで済む設計になった
  （ただし実際に3つ目を追加するには、`config.yml`側のスキーマ
  （現状`leftButton`/`rightButton`の2枠固定）の拡張も別途必要）。
- **`public/admin/preview.js`**：`renderStickyContactBarPreview()`も
  同じ設計（`resolveStickyButton()`関数＋`buttons`配列のfilter・map）に
  揃え、アイコン描画を`renderStickyButtonIcon()`という共通関数に切り出した。
- **検証**：`npm run build`（22ページ・エラー0件）・`npx astro check`
  （0エラー・0警告）を確認。リファクタリング前後で本番ページの
  「お問い合わせショートカット」（`aria-label`で特定）のHTML出力
  （`grid-cols-2`・両ボタンのhref・class・アイコンpath・label文言）が
  完全に一致することを、`dist/index.html`を直接読んで実測比較した
  （構造上の変更が実際の見た目に一切影響していないことの裏付け）。
  `config.yml`/`preview.js`を変更したため、キャッシュバスターを
  `20260914d`へ更新した。

### 9.55 タブレット幅（768〜1023px）でのヘッダーメニュー折り返し・表示崩れ修正（2026-09-14）

- **不具合**：ヘッダーのデスクトップナビ（`Header.astro`）を
  「`md`（768px）以上でデスクトップメニュー表示、`md`未満でハンバーガー」
  という長らくの標準的な実装にしていたが、実際のメニュー項目数
  （ナビ7〜8項目＋CTAボタン）だと、タブレット幅（768〜1023px）では
  横一列に収まりきらず折り返し・はみ出しが発生していた。Tailwindの
  既定ブレークポイント（`md`=768px、`lg`=1024px）のうち、`md`は
  「PC・タブレット共通でデスクトップメニューを表示する」には狭すぎる
  実測値だった。
- **修正**：ヘッダーのメニュー切り替えに関わる3ファイル
  （`Header.astro`のデスクトップナビ／`MobileMenuButton.astro`の
  ハンバーガーボタン／`MobileNavDrawer.astro`のドロワー本体）の
  `md:flex`・`hidden md:flex`・`md:hidden`をすべて`lg:flex`・
  `hidden lg:flex`・`lg:hidden`へ引き上げた。これにより、タブレット幅
  （768〜1023px）ではスマホと同じハンバーガーメニューにフォール
  バックし、`lg`（1024px）以上でのみ横並びのデスクトップナビが
  表示されるようになった。`public/admin/preview.js`の`renderHeader`
  （「サイト設定」プレビュー）も同じ3箇所を`lg:`へ揃えて追従修正した。
  - ドロワー本体（`MobileNavDrawer.astro`）はスマホ・タブレット共通で
    同じマークアップ（`block`の縦積みリンク）を使うため、タブレット幅で
    開いた際のレイアウト調整は不要だった（実機検証で確認）。
  - `StickyContactBar.astro`（画面下部固定バー）は今回の対象外
    （`md:hidden`のまま）——これは「スマホ専用の画面下部固定バー」
    という別の要件のUI要素であり、ヘッダーメニューの折り返し問題とは
    無関係のため意図的に変更していない。
- **実機検証**：`npm run build && npm run preview`でビルド済み`dist/`を
  配信するモードで確認（7章のCSS流し込みルール参照）。ビューポート幅
  900px（タブレット帯）でハンバーガーボタンが表示されメニューが正しく
  開閉すること、1023px（`lg`未満の境界直前）でも同様にハンバーガーの
  ままであること、1024px（`lg`ちょうど）でデスクトップナビへ切り替わる
  こと、デスクトップ幅でナビ8項目＋CTAボタンが折り返しなく1行に
  収まることを、いずれもスクリーンショットで確認した。

### 9.56 ハンバーガーメニューCTAボタンの視認性向上／管理画面ヘッダーの「サイトを表示」リンク圧縮によるボタン重複解消（2026-09-14）

**A. モバイル・タブレット用ハンバーガーメニューのCTAボタンをテキストリンクから塗りボタンへ**

- **課題**：`MobileNavDrawer.astro`のCTA項目（`ctaLabel`/`ctaHref`）は、
  他の通常メニュー項目と同じ`block`要素に`text-primary`の文字色だけを
  乗せた見た目で、リンクなのかボタンなのか一目で分かりにくかった。
- **修正**：`Header.astro`のデスクトップCTA・`BackToTop.astro`と同じ
  「primary→primary-darkのグラデーション塗り＋pill形状（`rounded-full`）
  ＋primaryカラーのドロップシャドウ（`shadow-[0_8px_20px_-6px_
  rgba(var(--color-primary-rgb),0.55)]`）」という、このコードベース
  標準の目立つボタンスタイルに統一した。色は`--color-primary`／
  `--color-primary-dark`というCSS変数（`tailwind.config.mjs`のテーマ
  カラー実装、5プリセットで自動切り替わる）を参照するため、
  「デザインテーマ設定」で選んだテーマカラーに自動追従する（追加の
  実装は不要）。他の通常メニュー項目（`border-b`区切り線付きの
  リンク一覧）とは視覚的に明確に分離されるよう、CTA自体は
  `px-5 py-4`のコンテナで囲み、ボタン自体も左右に余白を持たせた
  独立した行として配置している。
- `public/admin/preview.js`の`renderHeader`（「サイト全体設定」
  プレビューの`SiteInfoPreview`が使う、ヘッダーの実際のReact再実装）も
  同じスタイル・同じ構造（コンテナ`<div>`＋グラデーションpillボタン）に
  揃えて追従修正した。
- **実機検証**：`npm run dev`＋`npm run cms:proxy`のローカル環境で
  「サイト全体設定」プレビューをスマホ幅（デバイス幅切替ボタン）に
  切り替え、ハンバーガーを開いて「お問い合わせ」ボタンが実際に
  青いグラデーション塗りのpillボタンとして表示されることを
  スクリーンショットで確認した（これは`preview.js`側の実装が
  実際にレンダリングされていることの確認でもある）。本番の
  `MobileNavDrawer.astro`はビルド後のHTMLで同等のクラスが出力される
  ことを`npm run build`で確認済み。

**B. 管理画面ヘッダーの長いサイトURL表記を圧縮し、デバイス幅切替ボタンと「公開する」ボタンの重複を解消**

- **不具合の実機再現・原因特定**：`npm run dev`＋`npm run cms:proxy`で
  実際にDecap CMSへログインし、エントリ編集画面をJSで
  `getBoundingClientRect()`計測しながら段階的に画面幅を絞ったところ、
  画面幅800〜1000px程度の範囲で、Decap本体が既定で描画する
  「サイトを表示」リンク（`[class*="AppHeaderSiteLink"]`。`site_url`/
  `display_url`の文字列をそのまま表示するため
  `master-template-multi.easygoing247.workers.dev`という約337px幅の
  長いテキストになっていた）が、右寄せで固定表示している自前の
  「デバイス幅切替ボタン」（`#cms-device-toolbar`、7.5節）を左へ
  押し出し、その結果「公開する」ボタン（左寄りに固定表示される
  `PublishedButton`）の位置と重なってクリックできなくなることを
  実測で確認した（画面幅850pxで実測：デバイス幅切替ボタンが
  left=239〜right=440、「公開する」ボタンがleft=261〜right=339で
  完全に重複）。実機のスマホ幅（799px以下）ではプレビュー枠
  （Pane2）自体が非表示になり、デバイス幅切替ボタンも自動的に隠れる
  ため発生しない。ちょうどタブレット〜ノートPC相当の中間幅で
  顕在化する不具合だった。
- **修正**：Decap本体が生成する`[class*="AppHeaderSiteLink"]`の
  `<a>`要素自体（`href`・`target="_blank"`は本体が既に正しく設定
  済み——バンドル解析で`Rn(p_,{href:e,target:"_blank",children:Pl(e)})`
  という実装を確認済み）はそのまま残し、DOM構造・クリック挙動には
  一切手を加えず、CSSだけで見た目のテキストを圧縮した：
  `font-size:0`で元のURL文字列を視覚的に潰し、`::before`疑似要素で
  「サイトを表示 ↗」という短い文言に差し替える（React管理下のDOM
  ノードを外部から操作しない、9)節のViewControls移設と同じ安全な
  手法）。これにより幅が337px→118pxまで縮小し、実測で「公開する」
  ボタン・デバイス幅切替ボタン・「サイトを表示」リンクの3つが
  重ならずに収まることを確認した（850px幅で実測：公開ボタン
  left=261〜323、デバイス幅切替ボタンleft=458〜660、サイトを表示
  リンクleft=678〜795）。リンク自体は本体の`<a target="_blank">`を
  そのまま使うため、クリックすると要件どおり別タブでサイト
  トップページが開く。
  - **CSSの適用順序に関する注意**：実機のスマホ幅（799px以下）では
    既存ルール（`[class*='AppHeaderSiteLink'] { display: none
    !important; }`。9.24で導入、左側の戻るリンク・保存状態表示の
    圧迫を防ぐため）でこのリンク自体を完全非表示にする挙動を維持する
    必要がある。CSSの詳細度が同じ場合は後に書かれた規則が勝つため、
    今回追加した「常時・短縮表示」ルールは、既存の
    `@media (max-width: 799px)`ブロックより**前**（＝ソースコード上
    より上）に配置し、799px以下では従来どおり完全非表示ルールが
    後勝ちで適用されるようにした。実機のスマホ幅（390px）でも
    「サイトを表示」リンクが表示されず、既存の圧迫対策が引き続き
    機能していることをスクリーンショットで確認済み。
- **正直な開示**：根本的な重複の原因は「Decap本体が生成する複数の
  UI要素（公開ボタン・URLリンク・アカウントアイコン）に対し、
  こちらは`ToolbarSubSectionLast`や`ToolbarSectionMeta`の
  `getBoundingClientRect()`を基準にした固定位置オーバーレイ
  （デバイス幅切替ボタン・ViewControls）を独自に重ねている」という
  設計そのものにある。今回はURLリンクを圧縮することで実測上の
  重複を解消したが、将来Decap本体のバージョンアップでこれらの
  ネイティブ要素のサイズ・配置が変わった場合、同種の重複が別の形で
  再発する可能性は原理的に残る（このファイル内の他の`getBoundingClientRect`
  ベースの位置合わせ処理と同じ既知の制約）。
- **検証**：`npm run build`（22ページ・エラー0件）・`npx astro check`
  （0エラー・0警告）を確認。管理画面側の変更（`preview.js`の
  CTAボタンスタイル、`index.html`のCSS）に伴い、キャッシュバスター
  （9.24参照）を`20260914f`へ更新した。
