# /api/push/subscribe の認証修正 - 申し送りドキュメント

## 目的
`/api/push/subscribe` の 401 Unauthorized を解消するため、Next.js App Router 環境で Supabase 認証を Cookie 経由で正しく取得できるように修正しました。

## 修正対象ファイル
- `app/api/push/subscribe/route.ts`

## 修正前の問題点

### 1. 認証方法の問題
- カスタムの `createRouteHandlerClient` 関数が `NextRequest` と `NextResponse` を直接使用していた
- Cookie の読み取り・書き込みが Route Handler のコンテキストで正しく動作していなかった

### 2. 実装の不一致
- `lib/supabase/server.ts` では `next/headers` の `cookies()` を使用していたが、Route Handler では異なる実装を使用していた

## 修正内容

### 1. Supabase クライアント初期化の変更

**変更前:**
```typescript
function createRouteHandlerClient(
  request: NextRequest,
  response: NextResponse
) {
  // request.cookies と response.cookies を直接使用
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookies) {
        // response.cookies に直接反映
      },
    },
  })
}
```

**変更後:**
```typescript
async function createRouteHandlerClient() {
  const cookieStore = await cookies() // next/headers から取得
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (value === '' || options?.maxAge === 0) {
              cookieStore.delete(name)
            } else {
              cookieStore.set(name, value, options)
            }
          })
        } catch (error) {
          // Route Handler から呼ばれた場合、Cookie の set/remove ができない場合がある
          // これは middleware でセッションをリフレッシュしている場合は問題ない
        }
      },
    } as any, // 型エラー回避のため
  })
}
```

### 2. 関数呼び出しの修正

**変更前:**
```typescript
const supabase = createRouteHandlerClient(request, response)
```

**変更後:**
```typescript
const supabase = await createRouteHandlerClient()
```

### 3. ログの追加

認証確認のため、以下のログを追加しました：

```typescript
// 環境変数チェックログ
console.log('[ENV_CHECK]', {
  hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceRole:
    !!process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !!process.env.SUPABASE_SECRET_KEY,
})

// 認証チェックログ
const { data: { user } } = await supabase.auth.getUser()
console.log('[AUTH_CHECK]', {
  user,
})
```

## 発生したエラーと解決方法

### エラー 1: TypeScript 型エラー
**エラーメッセージ:**
```
Type error: Object literal may only specify known properties, and 'getAll' does not exist in type 'CookieMethods'.
```

**解決方法:**
- `cookies` オブジェクトに型アサーション `as any` を追加
- `lib/supabase/server.ts` と同じパターンに統一

### エラー 2: Promise 型エラー
**エラーメッセージ:**
```
Type error: Property 'auth' does not exist on type 'Promise<SupabaseClient<...>>'.
```

**解決方法:**
- `createRouteHandlerClient()` を `async` 関数に変更
- 呼び出し時に `await` を追加（POST 関数で最初に漏れていたが、修正済み）

## コミット履歴

1. `cd00182` - `fix: use cookie-based supabase auth in /api/push/subscribe`
   - 初回修正：`next/headers` の `cookies()` を使用する形に変更
   - ログ追加

2. `81fba9b` - `fix: add type assertion for cookies in createRouteHandlerClient`
   - 型エラー修正：型アサーション `as any` を追加
   - `async` 関数に変更、`await cookies()` を使用

3. `7fba671` - `fix: add missing await for createRouteHandlerClient in POST handler`
   - POST 関数の `await` 漏れを修正

## 技術的なポイント

### 1. `next/headers` の `cookies()` の使用
- Route Handler では `next/headers` の `cookies()` を使用することで、Cookie の読み取り・書き込みが正しく動作する
- `cookies()` は `async` 関数なので、`await` が必要

### 2. 型アサーションの使用
- `@supabase/ssr` の型定義が完全でない場合、`as any` を使用して回避
- `lib/supabase/server.ts` と同じパターンに統一することで、一貫性を保つ

### 3. エラーハンドリング
- Cookie の `set/remove` ができない場合（Route Handler の制約）は、エラーを握りつぶす
- Middleware でセッションをリフレッシュしている場合は問題ない

## 確認事項

### デプロイ後の確認
- Vercel Runtime Logs で `[ENV_CHECK]` と `[AUTH_CHECK]` が出力されることを確認
- `user` が `null` ではないことを確認
- 401 Unauthorized エラーが解消されていることを確認

### 既存のビジネスロジック
- 既存の DB 処理、Push 購読処理、レスポンス形式は変更していない
- 認証取得方法の修正とログ追加以外は触っていない

## 参考実装
- `lib/supabase/server.ts` - 同じパターンで実装されているため、参考にした

## 注意事項
- この修正は `/api/push/subscribe` の Route Handler のみに適用
- 他の Route Handler で同様の問題が発生する場合は、同じパターンを適用可能
- `lib/supabase/server.ts` の実装と一貫性を保つことが重要



