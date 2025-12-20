# ローカル認証付きプレビュー実装ガイド

Demeter で採用している「ローカル環境でも認証ヘッダーを付与した状態で Next.js アプリをプレビューする」仕組みを、他プロジェクトでも再現できるようにまとめました。モック（MSW）による API 代替も合わせて整理しています。

---

## 1. ざっくり手順（認証プレビュー）
1. `.env.local` に擬似ログインユーザーや API 鍵を定義する。
2. Next.js Middleware で `USER_NAME` を `X-Forwarded-User` ヘッダーとして注入し、`AUTHORIZED_USERS` でアクセス制御する。
3. サーバーコンポーネント／Server Action 側で `headers()` 経由で `X-Forwarded-User` を取得し、アプリ内部の認可に利用する。
4. 外部 API クライアントでは、必要に応じて `X-Forwarded-User` をヘッダーにフォワードし、環境変数ベースのトークン認証（Bearer Token 等）と組み合わせる。
5. `pnpm dev` などでアプリを起動すると、ローカルでも本番相当の認証フローを再現したプレビューが可能。

---

## 2. 必須環境変数
`.env.local` 例:

```
# Pteron API 基本設定
PTERON_API_URL=https://pteron.trap.show/api/v1
PTERON_PROJECT_ID=00000000-0000-0000-0000-000000000000
PTERON_ACCESS_TOKEN=your-bearer-token-here

# ローカル認証プレビュー用
USER_NAME=your-traq-id
AUTHORIZED_USERS=alice;bob;your-traq-id
PTERON_TARGET_USER_ID=fallback-user-or-project-id
```

- `USER_NAME`: ローカルで擬似ログインさせたい traQ ID 等。
- `AUTHORIZED_USERS`: `;` 区切りのホワイトリスト。ここに含まれないユーザーはミドルウェアで 403 にリライトされる。
- `PTERON_*`: Pteron API にアクセスするための固定パラメータ。別サービスでも同様に、自身の API 群が求める最低限のキーをここで定義する。

> **Note:** プロジェクトに `.env.example` を置いて、必須キーと説明をドキュメント化しておくと他メンバーが真似しやすいです。

---

## 3. Middleware での擬似認証
`src/middleware.ts` から再利用できる最小構成:

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const userName = process.env.USER_NAME ?? "";

  if (userName) {
    headers.set("X-Forwarded-User", userName);
  }

  const authorized = process.env.AUTHORIZED_USERS?.split(";") ?? [];
  if (authorized.length > 0 && !authorized.includes(headers.get("X-Forwarded-User") ?? "")) {
    request.nextUrl.pathname = "/forbidden";
    return NextResponse.rewrite(request.nextUrl, { status: 403 });
  }

  return NextResponse.next({ request: { headers } });
}
```

- **ポイント**
  - Vercel などのリバースプロキシが本番で付ける `X-Forwarded-User` をローカルで再現。
  - 403/Forbidden ページ（`src/app/forbidden/page.tsx` など）を用意しておく。
  - 他プロジェクトでも `USER_EMAIL` 等に置き換えるだけで流用可能。

---

## 4. サーバー側でのユーザー識別
Demeter では Server Action から `headers()` でヘッダーを参照し、Pteron API に伝播しています。

```ts
import { headers } from "next/headers";
import { getUserInfo } from "@/lib/pteron";

export async function fetchUserBalance() {
  const headersList = await headers();
  const userId = headersList.get("X-Forwarded-User");
  if (!userId) {
    return { success: false, error: "ユーザーIDが取得できません" };
  }
  const userInfo = await getUserInfo(userId);
  return { success: true, data: userInfo };
}
```

- Next.js の Server Action / Route Handler / Server Component いずれでも同じ方法で取得可能。
- クライアントコンポーネントには `router.refresh()` 等で再フェッチさせれば最新状態を反映できます。

---

## 5. 外部 API クライアントでのヘッダー伝播
`src/lib/pteron.ts` では、固定トークンで API を叩きつつ `X-Forwarded-User` を任意指定できるようにしています。

```ts
const PTERON_API_URL = process.env.PTERON_API_URL;
const PTERON_ACCESS_TOKEN = process.env.PTERON_ACCESS_TOKEN;

export async function getUserInfo(userId: string) {
  if (!PTERON_ACCESS_TOKEN) throw new Error("PTERON_ACCESS_TOKEN is not configured");

  const response = await fetch(`${PTERON_API_URL}/me`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PTERON_ACCESS_TOKEN}`,
      "X-Forwarded-User": userId,
    },
  });

  if (!response.ok) throw new PteronApiError(response.status, (await response.json()).message);
  return response.json();
}
```

- 他プロジェクトでは、バックエンド API が想定するユーザー識別ヘッダー名に置き換えるだけで応用可能。
- API から 401/403 が返る場合でも、Middleware でリライトされるためフロントエンドの負担は小さく済みます。

---

## 6. モック環境（MSW）との切り分け
### 6.1 有効化ポイント
- `src/instrumentation.ts` で `NODE_ENV === "development" && NEXT_RUNTIME === "nodejs"` のときだけ MSW サーバーを `server.listen()`。Next.js 13 以降の公式ガイドライン準拠です。
- `pnpm dev` 時は自動でモックが立ち上がるため、API トークンが空でも UI を動かせます。

```ts
export async function register() {
  if (process.env.NODE_ENV === "development" && process.env.NEXT_RUNTIME === "nodejs") {
    const { server } = await import("./mocks/server");
    server.listen({ onUnhandledRequest: "bypass" });
  }
}
```

### 6.2 ハンドラ設計
- `src/mocks/handlers.ts` で `X-Forwarded-User` を参照し、ユーザー／プロジェクトの残高を即席で返却。
- `mockProjectBalance` / `mockUserBalance` をローカル state として保持し、送金や請求をシミュレート。
- 実際の API 仕様に沿ったレスポンス構造を返すと、UI 側の分岐やエラーハンドリングの検証が容易。

```ts
http.get(`${PTERON_API_URL}/me`, ({ request }) => {
  const forwardedUser = request.headers.get("X-Forwarded-User");
  if (forwardedUser) {
    return HttpResponse.json({
      id: forwardedUser,
      name: `${forwardedUser}-mock`,
      balance: mockUserBalance,
    });
  }
  return HttpResponse.json({ id: "mock-project", balance: mockProjectBalance });
});
```

> 認証ヘッダーの注入（Middleware）とモックサーバーの利用は独立しているため、API が準備できていない初期段階でもフロントエンドをローカルで実際の挙動に近い形で確認できます。

---

## 7. 他プロジェクトへ展開するときのチェックリスト
- [ ] Next.js の `middleware.ts`（または `src/middleware.ts`）がルートに配置されているか。
- [ ] `USER_NAME` など擬似ログイン用の環境変数が設定されているか。
- [ ] `AUTHORIZED_USERS` の初期値が空の場合の挙動（全許可 vs 全拒否）を決めているか。
- [ ] `Forbidden` ページやエラーハンドリングが用意されているか。
- [ ] Server Action / Route Handler で `headers()` を参照しているか。
- [ ] API クライアントが `X-Forwarded-User` を正しく利用しているか。
- [ ] モックが必要な場合、`instrumentation.ts` での初期化と `handlers.ts` のカバレッジが十分か。
- [ ] README などに「ローカルで認証付きプレビューを行う方法」を明記したか。

---

## 8. よくあるハマりどころ
| 症状 | 原因 | 対応 |
| --- | --- | --- |
| ログインしてもすぐ `Forbidden` になる | `AUTHORIZED_USERS` に `USER_NAME` が含まれていない | `.env.local` を見直し、再起動する |
| API 呼び出しで 401/403 | `PTERON_ACCESS_TOKEN` が未設定 or 無効 | 有効なトークンを設定し、必要なら MSW モードで動作確認 |
| MSW が起動しない | `instrumentation.ts` が登録されていない or `NEXT_RUNTIME` が edge | `next.config.ts` で `instrumentation` を指定し、Node.js ランタイムで実行 |
| ブラウザでユーザーを切り替えたい | `USER_NAME` はビルド時に決まる | `.env.local` を更新し dev サーバーを再起動（または `next dev` の Hot Reload に任せる） |

---

## 9. まとめ
- **認証プレビュー**: Middleware でヘッダーを注入 → Server Action で取得 → API クライアントへ伝播、という 3 ステップで完結。
- **モック**: Instrumentation + MSW で本番 API を再現し、環境変数と切り離して運用。
- これらをテンプレ化しておけば、別プロジェクトでも「ローカルで本番同等の認証フローを体験できる」状態を短時間で再構築できます。

