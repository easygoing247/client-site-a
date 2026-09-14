#!/usr/bin/env node
// ============================================================================
// scripts/build-config.js
// src/admin/config/*.yml（機能単位に分割されたDecap CMS設定）を決まった
// 順序で連結し、public/admin/config.yml を自動生成する。
// `npm run dev` / `npm run build` の実行前（predev/prebuild）に必ず呼ばれる
// （package.json 参照）。「納品済みの顧客テンプレートの一括アップデート.md」
// の設計（②③ config.yml のモジュール分割・ビルド時結合）を実装したもの。
//
// 【なぜオブジェクトへパース→マージではなく、生テキストの連結なのか】
// 分割ファイルの一部（works.yml と news.yml）は、YAMLアンカー
// （&richTextButtons / &richTextComponents）を「定義するファイル」と
// 「エイリアス（*richTextButtons 等）で参照するファイル」が別々に分かれて
// いる。YAMLのアンカー/エイリアスは単一ドキュメント内でのみ解決される
// ため、各ファイルを個別に js-yaml でパースしてからJSオブジェクトとして
// マージする方式では、この参照が失われてしまう（パース時点でファイルが
// 分かれているため、js-yamlの実装上アンカーのスコープが共有されない）。
// そのため、このスクリプトは各ファイルの「生テキスト」をそのまま連結して
// 単一のYAMLドキュメントを組み立て、それを最後に一度だけ js-yaml で
// パースして構文検証する（＝Decap CMS自身が実際のブラウザ上で行うのと
// 同じ「1つのYAMLファイルとして読む」処理を、ビルド時に事前検証する）。
//
// 【結合順序が重要】
// YAMLの仕様上、エイリアスはそれより前に出現したアンカーしか参照できない
// （前方参照は不可）。そのため MODULE_ORDER の並び順は固定であり、
// 変更する場合は各ファイルのアンカー依存関係（各ファイル冒頭のコメント
// 参照）を必ず確認すること：
//   base.yml → settings.yml → works.yml → pages.yml → news.yml → custom.yml
//   （worksが定義する&richTextButtons等をnewsがエイリアス参照するため、
//   worksは必ずnewsより前）
// ============================================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CONFIG_SRC_DIR = join(ROOT_DIR, 'src', 'admin', 'config');
const OUTPUT_FILE = join(ROOT_DIR, 'public', 'admin', 'config.yml');

// 結合順序（変更する場合は上記コメントのアンカー依存関係を必ず確認すること）。
// base/settings/works/pages/news は必須（1つでも欠けるとCMSが壊れるため
// ビルドを失敗させる）。custom.yml は顧客固有の追加コレクション用の
// プレースホルダーのため、存在しなくても許容する（無ければ何も追加しない）。
const REQUIRED_MODULES = ['base.yml', 'settings.yml', 'works.yml', 'pages.yml', 'news.yml'];
const OPTIONAL_MODULES = ['custom.yml'];
const MODULE_ORDER = [...REQUIRED_MODULES, ...OPTIONAL_MODULES];

const GENERATED_BANNER = `# ============================================================================
# ⚠️ このファイルは自動生成されます。直接編集しないでください。
#
# 実体は src/admin/config/*.yml に機能単位で分割保存されており、
# \`npm run dev\` / \`npm run build\` の実行前（predev/prebuild、
# scripts/build-config.js）に自動結合されてこのファイルが生成されます。
# ここへ直接加えた変更は、次回のビルド／dev起動時に上書きされ消えます。
#
# 設定を変更する場合は、以下のいずれかを編集してください：
#   src/admin/config/base.yml     … backend/media_folder等のベース設定
#   src/admin/config/settings.yml … 「サイト設定」コレクション
#   src/admin/config/works.yml    … 「商品作成」「実績・活用事例作成」
#   src/admin/config/pages.yml    … 「下層ページ編集」コレクション
#   src/admin/config/news.yml     … 「お知らせカテゴリ管理」「お知らせ投稿」
#   src/admin/config/custom.yml   … 顧客固有の追加コレクション（案件複製時）
# ============================================================================

`;

function readModule(filename, required) {
  const filePath = join(CONFIG_SRC_DIR, filename);
  if (!existsSync(filePath)) {
    if (required) {
      throw new Error(
        `[build-config] 必須の設定モジュールが見つかりません: ${filePath}\n` +
          'src/admin/config/ 配下に base.yml/settings.yml/works.yml/pages.yml/news.yml の5ファイルが揃っているか確認してください。'
      );
    }
    return null;
  }
  let content = readFileSync(filePath, 'utf8');
  // Windows(CRLF)/Unix(LF)どちらで保存されていても、連結後の出力はLFに統一する。
  content = content.replace(/\r\n/g, '\n');
  // 各ファイルの末尾に改行が無い場合に備えて補う（連結時に隣接ファイルの
  // 先頭行と結合してしまい構文が壊れるのを防ぐ）。
  if (!content.endsWith('\n')) content += '\n';
  return content;
}

function buildConfig() {
  const parts = [];
  for (const filename of MODULE_ORDER) {
    const required = REQUIRED_MODULES.includes(filename);
    const content = readModule(filename, required);
    if (content !== null) parts.push(content);
  }

  const combined = GENERATED_BANNER + parts.join('');

  // 連結結果が実際に妥当な単一YAMLドキュメントとして解決できるかを
  // ここで検証する（アンカー/エイリアスの結合順序ミス・構文崩れを
  // ビルド時点で検出し、ブラウザ上のDecap CMSが壊れて初めて気づく事態を防ぐ）。
  let parsed;
  try {
    parsed = yaml.load(combined);
  } catch (err) {
    throw new Error(
      `[build-config] 結合後のYAMLが不正です。分割ファイルの構文、または結合順序
（src/admin/config/base.yml 冒頭コメントのMODULE_ORDER）を確認してください。\n${err.message}`
    );
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.collections)) {
    throw new Error('[build-config] 結合後のYAMLに collections（配列）が含まれていません。分割ファイルの構成を確認してください。');
  }

  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, combined, 'utf8');

  const collectionNames = parsed.collections.map((c) => c && c.name).filter(Boolean);
  console.log(
    `[build-config] public/admin/config.yml を生成しました（${parts.length}モジュール結合、` +
      `collections: ${collectionNames.join(', ')}）`
  );
}

try {
  buildConfig();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
