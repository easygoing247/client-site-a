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
 * 【2026-09、9.47】kuromoji.js本体・辞書データともに、外部CDN
 * （jsDelivr）ではなくこのリポジトリ内（public/admin/kuromoji.js・
 * public/admin/dict/*.gz）から読み込むように変更した。9.46で
 * 「辞書構築に一度失敗すると恒久的にフォールバック（ひらがな・
 * カタカナのみの変換、漢字は脱落）に固定される」バグ自体は修正した
 * ものの、根本的に「CDNへの依存自体がリスク」（一時的なネットワーク
 * 不調・CDN障害・企業ネットワークでの外部ドメインブロック等）である
 * ことに変わりはなかったため、CDNへの依存を完全に排除しリポジトリ
 * 内で完結させることにした。辞書ファイル自体はnpmパッケージ
 * `kuromoji`（devDependencies、辞書ファイル取得のためだけに追加。
 * ビルド時のコード上の依存ではない）の`dict/`フォルダをそのまま
 * コピーしたもので、`kuromoji.js`本体も同パッケージの`build/
 * kuromoji.js`をそのままコピーしたもの。バージョンアップ時は
 * `node_modules/kuromoji/dict/*.gz`・`node_modules/kuromoji/build/
 * kuromoji.js`を再度この場所へコピーし直すこと（CLAUDE.md 9.47参照）。
 *
 * classic worker（type: module ではない）のため、importScripts()は
 * 同一オリジンのURLをそのまま読み込める。
 * ============================================================================ */
importScripts('./kuromoji.js');

var DIC_PATH = './dict/';

var tokenizer = null;
var buildPromise = null;

// ⚠️ 辞書構築に一度失敗した場合、`buildPromise`にrejectされたPromiseを
// キャッシュしたまま放置しない（9.46で発見・修正）。以前の実装は
// 構築に失敗しても`buildPromise`をそのまま保持し続けていたため、
// 一時的な取得失敗が起きると、そのWorkerインスタンスが生きている間
// （＝管理画面のタブを開いたままの間）、以後のタイトル入力すべてが
// 恒久的にフォールバック（ひらがな・カタカナのみの変換、漢字は
// ハイフン化）のまま固定されてしまうという重大な不具合があった。
// 修正：構築に失敗した場合は`buildPromise`を`null`に戻し、次回の
// リクエストで辞書構築を最初からやり直せるようにした。
function ensureTokenizer() {
  if (tokenizer) return Promise.resolve(tokenizer);
  if (buildPromise) return buildPromise;
  buildPromise = new Promise(function (resolve, reject) {
    try {
      self.kuromoji
        .builder({ dicPath: DIC_PATH })
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
  buildPromise.catch(function (err) {
    // 失敗をコンソールへ明示的に出力する（9.47。今回のようにCDN・
    // ネットワーク起因の問題を切り分けやすくするため、ブラウザの
    // 開発者ツール（F12）のConsoleタブにWorker発の警告として必ず
    // 記録が残るようにする）。実際のエラー通知（呼び出し元への
    // フィードバック）は、これとは別にonmessage側の.catch()が
    // 個別のtokenizeリクエストに対して行う。
    console.error(
      '[kuromoji-worker] 辞書の構築に失敗しました（dicPath: ' + DIC_PATH + '）。' +
        'public/admin/dict/ 配下の辞書ファイルが正しく配置・配信されているか確認してください。',
      err
    );
    buildPromise = null;
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
      var message = String(err && err.message ? err.message : err);
      console.error('[kuromoji-worker] タイトル「' + title + '」の形態素解析に失敗しました:', message, err);
      self.postMessage({ id: id, error: message });
    });
};

self.onerror = function (event) {
  // importScripts自体の失敗（ファイルが見つからない等）や、上記の
  // try/catchで捕捉しきれない同期エラーをすべてコンソールへ出力する
  // 最後の砦。
  console.error('[kuromoji-worker] Worker内で未捕捉のエラーが発生しました:', event && event.message ? event.message : event);
};
