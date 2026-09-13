/* ============================================================================
 * public/admin/kuromoji-worker.js
 * タイトル→URL用識別子（urlSlug）の自動ローマ字変換（9.41）のうち、
 * 漢字の読み解決を担うkuromoji.js（形態素解析＋IPADIC辞書）を、
 * メインスレッドではなくこの専用Web Worker上で実行する（9.45）。
 *
 * 背景：kuromoji.jsの辞書構築処理（gzip圧縮された数MB規模のバイナリ
 * 辞書をメインスレッド上で解凍・パースし、ダブル配列Trieを組み立てる、
 * 本質的にCPUバウンドな重い処理）を管理画面のメインスレッドで直接
 * 実行すると、その間UIの描画・入力操作が完全に応答不能になる
 * （9.44で「一覧画面を開いただけで発生」という形で問題が顕在化し、
 * 起動タイミングの見直しで一覧画面では発生しなくなったが、エントリ
 * 編集画面を開いた直後や実際にタイトルを入力した瞬間には、メイン
 * スレッド上で辞書構築が走る限り、程度の差はあれ同種のフリーズが
 * 起こり得る）。Web Workerはメインスレッドとは別のスレッドで動作する
 * ため、ここでどれだけ重い処理をしてもメインスレッド（＝実際の画面の
 * 描画・入力）は一切ブロックされない。
 *
 * classic worker（type: module ではない）のため、importScripts()は
 * <script src="...">タグと同様にクロスオリジンのURLを制限なく読み込める
 * （CORSの対象外）。
 * ============================================================================ */
importScripts('https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/build/kuromoji.js');

var tokenizer = null;
var buildPromise = null;

function ensureTokenizer() {
  if (tokenizer) return Promise.resolve(tokenizer);
  if (buildPromise) return buildPromise;
  buildPromise = new Promise(function (resolve, reject) {
    try {
      self.kuromoji
        .builder({ dicPath: 'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/' })
        .build(function (err, builtTokenizer) {
          if (err || !builtTokenizer) {
            reject(err || new Error('kuromoji build failed'));
            return;
          }
          tokenizer = builtTokenizer;
          resolve(tokenizer);
        });
    } catch (e) {
      reject(e);
    }
  });
  return buildPromise;
}

self.onmessage = function (e) {
  var data = e.data || {};
  if (data.type !== 'tokenize') return;
  var id = data.id;
  var title = data.title || '';
  ensureTokenizer()
    .then(function (t) {
      var tokens = t.tokenize(title);
      var readings = tokens.map(function (tok) {
        return tok.reading && tok.reading !== '*' ? tok.reading : tok.surface_form;
      });
      self.postMessage({ id: id, readings: readings });
    })
    .catch(function (err) {
      self.postMessage({ id: id, error: String(err && err.message ? err.message : err) });
    });
};
