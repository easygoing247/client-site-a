// ============================================================================
// cms-oauth-worker/src/index.js
// Decap CMS の GitHub バックエンド（backend.name: github）用の OAuth 仲介
// プロキシ。Cloudflare Workers 上で動作する。
//
// フロー：
//   1. Decap CMS がポップアップで `${base_url}${auth_endpoint}` を開く
//      （config.yml の base_url / auth_endpoint 参照）
//   2. /auth はスコープ付きの GitHub OAuth 認可URLへリダイレクトする
//      （CSRF対策の state を発行し、HttpOnly Cookieに保存）
//   3. GitHub 認可後、/callback に code・state 付きでリダイレクトされる
//   4. /callback は Cookie の state と照合した上で、code をアクセストークン
//      に交換し、Decap CMS が既定で待ち受けている
//      `window.opener.postMessage` のハンドシェイク（authorizing:github →
//      authorization:github:success:{...}）でトークンを渡し、ポップアップを
//      閉じる。
//
// 必須のシークレット（wrangler secret put で登録し、コードには書かない）：
//   - GITHUB_CLIENT_ID
//   - GITHUB_CLIENT_SECRET
// ============================================================================

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const STATE_COOKIE_NAME = 'oauth_state';
const DEFAULT_SCOPE = 'repo,user';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/auth') {
        return handleAuth(url, env);
      }
      if (url.pathname === '/callback') {
        return await handleCallback(request, url, env);
      }
      return new Response('Not Found', { status: 404 });
    } catch (err) {
      return renderHandshakeError(err instanceof Error ? err.message : 'unknown error');
    }
  },
};

function handleAuth(url, env) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response('GITHUB_CLIENT_ID is not configured', { status: 500 });
  }

  const scope = url.searchParams.get('scope') || DEFAULT_SCOPE;
  const state = crypto.randomUUID();
  const redirectUri = `${url.origin}/callback`;

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      // state はCSRF対策。HttpOnly + Secure + SameSite=Laxで発行し、
      // /callback 側でクエリの state と突き合わせて検証する。
      'Set-Cookie': `${STATE_COOKIE_NAME}=${state}; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax`,
    },
  });
}

async function handleCallback(request, url, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return renderHandshakeError('OAuth client is not configured on the server');
  }

  const error = url.searchParams.get('error');
  if (error) {
    return renderHandshakeError(url.searchParams.get('error_description') || error);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = getCookie(request, STATE_COOKIE_NAME);

  if (!code) {
    return renderHandshakeError('missing "code" parameter from GitHub');
  }
  if (!state || !cookieState || state !== cookieState) {
    return renderHandshakeError('invalid OAuth state (possible CSRF)');
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'master-template-oauth-worker',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });

  if (!tokenResponse.ok) {
    return renderHandshakeError(`GitHub token exchange failed (HTTP ${tokenResponse.status})`);
  }

  const tokenData = await tokenResponse.json();

  if (tokenData.error || !tokenData.access_token) {
    return renderHandshakeError(tokenData.error_description || tokenData.error || 'failed to obtain access token');
  }

  return renderHandshakeSuccess(tokenData.access_token);
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Decap CMS（github backend）がポップアップ側に期待している postMessage の
// ハンドシェイク手順：
//   1. ポップアップから opener へ "authorizing:github" を送る
//   2. opener からの返信メッセージを受け取ったら、その e.origin 宛てに
//      "authorization:github:success:<JSON>" を送り返す
//   3. Decap CMS 側がポップアップを閉じる
function renderHandshakeSuccess(token) {
  const payload = JSON.stringify({ token, provider: 'github' });
  return htmlResponse(`
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:success:${escapeForScript(payload)}',
            e.origin
          );
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
    <p>認証が完了しました。このウィンドウは自動的に閉じます…</p>
  `);
}

function renderHandshakeError(message) {
  const safeMessage = escapeForScript(String(message));
  return htmlResponse(
    `
    <script>
      (function () {
        function receiveMessage(e) {
          window.opener.postMessage(
            'authorization:github:error:${safeMessage}',
            e.origin
          );
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
    <p>認証エラーが発生しました: ${escapeForHtml(String(message))}</p>
  `,
    400
  );
}

function escapeForScript(value) {
  // シングルクオートで文字列リテラルに埋め込むため、バックスラッシュ・
  // シングルクオート・改行をエスケープする。
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function escapeForHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function htmlResponse(bodyHtml, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>Decap CMS 認証</title>
  </head>
  <body>
    ${bodyHtml}
  </body>
</html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
}
