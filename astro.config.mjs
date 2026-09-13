import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';
import fs from 'node:fs';
import path from 'node:path';

// 本番公開時は実際のドメインに差し替えてください（sitemap生成に使用されます）
const SITE_URL = 'https://master-template-multi.easygoing247.workers.dev';

// `/admin`・`/admin/`（末尾スラッシュ無し・有り）へのアクセス時、
// `astro dev`の開発サーバーに限り`/admin/index.html`へ内部的に書き換える
// 軽量ミドルウェア。Decap CMS本体（index.html/config.yml等）は
// `public/admin/`にプレーンな静的ファイルとして配置しているが、
// Astroの開発サーバーは`public/`配下のサブディレクトリに対して
// 「ディレクトリ名だけのURLをindex.htmlへ解決する」機能を持たないため、
// `http://localhost:4321/admin/`のようにファイル名を省略したURLで
// アクセスすると404になる（`/admin/index.html`と明記すれば正常に
// 表示される。5章参照）。この既知の制約はファイルの欠落によるものでは
// なく（`public/admin/`にはconfig.yml・index.html等が実在する）、
// 開発時の利便性の問題のため、`astro:server:setup`フックでdevサーバー
// にのみ介入して解消する。
// ⚠️ 一度Astro標準の`redirects`設定（ビルド時に実ファイルとして
// リダイレクトページを生成する機能）で同じことを試みたが、`/admin`・
// `/admin/`の出力先ファイルパスが`dist/admin/index.html`となり、
// 本物のDecap CMS本体（`public/admin/index.html`がそのままコピーされる
// 場所）と完全に衝突して上書きしてしまう重大な不具合を実機ビルドで
// 確認したため、その方式は採用していない（本番ビルド・
// `public/`配下の静的ファイルコピーには一切影響しない、dev限定の
// ミドルウェア方式に変更した経緯）。
function adminDirectoryIndexDevMiddleware() {
  return {
    name: 'admin-directory-index-dev-middleware',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/admin' || req.url === '/admin/') {
            req.url = '/admin/index.html';
          }
          next();
        });
      },
    },
  };
}

// kuromoji.jsの辞書ファイル（public/admin/dict/*.gz）を`astro dev`が
// 配信する際に、Viteの静的ファイルサーバー（sirv）が拡張子`.gz`を
// 見て自動的に`Content-Encoding: gzip`ヘッダーを付与してしまう問題を
// 回避するdev限定ミドルウェア（2026-09、9.47）。
//
// 背景：kuromoji.jsは辞書ファイルを生のgzip圧縮バイト列としてfetchし、
// 自前で（zlib.js相当の内蔵実装で）解凍する設計になっている。ところが
// `Content-Encoding: gzip`が付いたレスポンスは、ブラウザ自身が
// **transparent decompression**（fetch/XHRの結果を返す前に自動で
// 解凍してしまう）を行うため、kuromoji.js側は「既に解凍済みの生データ」
// を「まだ圧縮されたバイト列のはず」として誤って再解凍しようとし、
// 実機で`invalid file signature:XX,YY`という例外を出して失敗していた
// （F12コンソールへの明示的なエラー出力を追加したことで発覚。9.47）。
// これが、外部CDNをやめてリポジトリ内へ辞書を配置したにも関わらず、
// 依然として「私は学生です」→「ha-desu」のまま格上げされない
// （＝kuromojiの辞書構築が常に失敗し続ける）原因になっていた。
//
// 対処：`/admin/dict/*.gz`へのリクエストをViteの既定の静的ファイル
// ミドルウェアより先に横取りし、`fs.readFile`で直接読み出した生の
// バイト列を、`Content-Encoding`ヘッダーを一切付与せずに返す
// （`Content-Type: application/octet-stream`のみ設定）。これにより
// ブラウザ側の自動解凍が発生せず、kuromoji.js自身が期待どおり
// 生のgzipバイト列を受け取って自前で解凍できるようになる。
function kuromojiDictDevMiddleware() {
  return {
    name: 'kuromoji-dict-dev-middleware',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          var m = req.url && req.url.match(/^\/admin\/dict\/([a-zA-Z0-9_.-]+\.gz)(?:\?.*)?$/);
          if (!m) {
            next();
            return;
          }
          var filePath = path.join(process.cwd(), 'public', 'admin', 'dict', m[1]);
          fs.readFile(filePath, function (err, data) {
            if (err) {
              next();
              return;
            }
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(data);
          });
        });
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
    adminDirectoryIndexDevMiddleware(),
    kuromojiDictDevMiddleware(),
  ],
  image: {
    // astro:assets のデフォルト画像最適化（sharp）を使用
    domains: [],
  },
  markdown: {
    // works / news の本文（Markdown）で、CommonMark既定の「段落内の
    // 単一改行（Enter1回）はスペース1個に変換され、見た目上は詰まって
    // 表示される」という仕様を上書きする。Decap CMSのリッチテキスト
    // エディタでEnterキーを1回だけ押した改行が、本番ページ・CMS
    // プレビューの双方で見た目どおりの改行として反映されない不具合の
    // 直接の原因だったため、remark-breaks（単一改行を<br>に変換する
    // remarkプラグイン）を追加した。Enterキー2回（段落区切り／空行）の
    // 挙動は9.23で別途 .prose-content 側のCSS（p の margin・
    // :empty への min-height）で対応済みで、このプラグインの追加が
    // その挙動と競合することはない（段落区切りは引き続き<p>タグの
    // 境界として扱われる。remark-breaksが変換するのは「同じ段落内の」
    // 単一改行のみ）。
    remarkPlugins: [remarkBreaks],
  },
  build: {
    // サイト全体で共有する CSS は1ファイル約20KB（gzip 約5KB）と小さいため、
    // 外部 <link rel="stylesheet"> による追加リクエスト（レンダーブロック）を
    // なくし、各HTMLの <head> に直接インライン展開する。
    // （'auto' は既定4KB未満のみインライン化するため、この規模だと外部化される）
    inlineStylesheets: 'always',
  },
});
