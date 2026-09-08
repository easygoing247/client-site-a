# cms-oauth-worker

Decap CMS の `backend.name: github` 用の GitHub OAuth 仲介プロキシ（Cloudflare Worker）。

このディレクトリは Astro サイト本体（`npm run build`）には含まれない、独立してデプロイする Worker です。

## エンドポイント

- `GET /auth` — GitHub の OAuth 認可画面へリダイレクトする。
- `GET /callback` — GitHub からのコールバックを受け、アクセストークンを取得して
  `window.opener.postMessage` 経由で Decap CMS 側のポップアップへ渡す。

## 必須シークレット

コードや `wrangler.toml` には書かず、以下のコマンドで登録すること：

```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

## デプロイ

```bash
cd cms-oauth-worker
npx wrangler deploy
```

## GitHub OAuth App 側の設定

GitHub の OAuth App（Settings > Developer settings > OAuth Apps）で、
**Authorization callback URL** を以下に設定すること：

```
https://master-template-oauth.<あなたのCloudflareサブドメイン>.workers.dev/callback
```

## `public/admin/config.yml` 側の設定

```yaml
backend:
  name: github
  repo: easygoing247/master-template
  branch: main
  base_url: https://master-template-oauth.<あなたのCloudflareサブドメイン>.workers.dev
  auth_endpoint: /auth
```
