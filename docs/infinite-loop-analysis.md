# 無限ループ問題の原因分析

## 現在の状況

- ブラウザで `https://carebridge-hub.vercel.app/login` にアクセス
- 「アカウント確認中...」の画面が表示され続ける
- コンソールには「[Login] Existing session found, redirecting to home」と「Redirect may have failed, trying window.location.replace...」が表示される
- 無限ループが発生している

## 考えられるすべての原因

### 1. クライアント側とサーバー側のセッション状態の不一致

**原因:**
- クライアント側（ブラウザ）ではセッションが有効と判定される
- サーバー側（ミドルウェア）ではセッションが無効と判定される
- `/home` にリダイレクトしようとすると、ミドルウェアが認証エラーを検出して `/login` にリダイレクト
- `/login` に戻ると、クライアント側で再度セッションが有効と判定され、再度 `/home` にリダイレクト
- これが繰り返される

**確認方法:**
- ブラウザの開発者ツール → Application → Cookies でセッション関連のCookieを確認
- ネットワークタブで `/home` へのリクエストのステータスコードを確認（302リダイレクトかどうか）

### 2. `useEffect` の再実行による無限ループ

**原因:**
- `useEffect` の依存配列に `searchParams` が含まれている
- `searchParams` が変更されるたびに `useEffect` が再実行される
- リダイレクト処理が実行されるたびに、何らかの理由で `searchParams` が変更される可能性がある

**確認方法:**
- コンソールで `useEffect` が何回実行されているか確認
- `searchParams` の値が変更されているか確認

### 3. `redirectAttemptRef` のリセット

**原因:**
- `redirectAttemptRef.current` がページリロード時にリセットされていない
- または、`useEffect` が再実行されるたびにリセットされている
- リダイレクト試行回数の上限チェックが機能していない

**確認方法:**
- コンソールで `redirectAttemptRef.current` の値を確認
- リダイレクト試行回数の上限チェックが正しく動作しているか確認

### 4. `hasClearedSession` の状態更新のタイミング

**原因:**
- `hasClearedSession` が `useState` で管理されているが、状態更新が非同期
- `setHasClearedSession(true)` を呼び出しても、次の `useEffect` 実行時にはまだ `false` のまま
- これにより、セッションがクリアされた後も処理が続行される

**確認方法:**
- コンソールで `hasClearedSession` の値を確認
- セッションがクリアされた後も `useEffect` が再実行されているか確認

### 5. ブラウザのキャッシュ

**原因:**
- ブラウザが古いコードをキャッシュしている
- 修正したコードが反映されていない
- 古いコードが実行され続けている

**確認方法:**
- ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）
- ハードリロードを実行
- 開発者ツール → Network タブで「Disable cache」を有効にする

### 6. `window.location.replace('/home')` の実行タイミング

**原因:**
- `window.location.replace('/home')` が実行されているが、実際にはリダイレクトが発生していない
- または、リダイレクトが発生する前に `useEffect` が再実行される
- タイムアウト処理（30ms）がリダイレクトより先に実行される

**確認方法:**
- ネットワークタブで `/home` へのリクエストが発生しているか確認
- リダイレクトのタイミングを確認

### 7. ミドルウェアの認証チェック

**原因:**
- ミドルウェアが `/home` へのアクセスをブロックしている
- セッションが無効と判定され、`/login` にリダイレクトされる
- しかし、クライアント側ではセッションが有効と判定される

**確認方法:**
- Vercel のログでミドルウェアのログを確認
- ミドルウェアが `/home` へのアクセスをブロックしているか確認
- セッションの状態を確認

### 8. Cookie の設定問題

**原因:**
- セッション関連のCookieが正しく設定されていない
- Cookie のドメインやパスが正しくない
- Cookie が SameSite ポリシーによってブロックされている

**確認方法:**
- ブラウザの開発者ツール → Application → Cookies でCookieを確認
- Cookie の属性（Domain, Path, SameSite, Secure）を確認

### 9. `handleAuthCallback` の再実行

**原因:**
- `handleAuthCallback` が複数回実行されている
- `hashchange` イベントリスナーが複数回登録されている
- イベントリスナーが適切にクリーンアップされていない

**確認方法:**
- コンソールで `handleAuthCallback` が何回実行されているか確認
- `hashchange` イベントリスナーが適切に登録・削除されているか確認

### 10. サーバー側のセッション検証エラー

**原因:**
- `/home` ページでサーバー側のセッション検証が失敗している
- `getUser()` が失敗して `/login` にリダイレクトされる
- しかし、クライアント側ではセッションが有効と判定される

**確認方法:**
- Vercel のログで `/home` ページのエラーログを確認
- サーバー側のセッション検証が失敗しているか確認

## 追加で必要な情報

### 1. ブラウザの開発者ツールの情報

**ネットワークタブ:**
- `/home` へのリクエストのステータスコード（200, 302, 401, 403など）
- リクエストヘッダー（特にCookie）
- レスポンスヘッダー（特にSet-Cookie）
- リダイレクトチェーン（302 → `/login` など）

**コンソールタブ:**
- `useEffect` が何回実行されているか
- `redirectAttemptRef.current` の値
- `hasClearedSession` の値
- エラーメッセージの詳細

**Application タブ:**
- Cookies の内容（特に `sb-` で始まるCookie）
- Local Storage の内容
- Session Storage の内容

### 2. サーバー側のログ

**Vercel のログ:**
- ミドルウェアのログ（`[Middleware]` で始まるログ）
- `/home` ページのログ（`[HomePage]` で始まるログ）
- エラーログ

**確認方法:**
- Vercel ダッシュボード → プロジェクト → Deployments → 最新のデプロイ → Logs

### 3. セッションの状態

**クライアント側:**
- `supabase.auth.getSession()` の結果
- `supabase.auth.getUser()` の結果
- セッションの有効期限

**サーバー側:**
- ミドルウェアでのセッション検証結果
- `/home` ページでのセッション検証結果

### 4. 環境変数

**確認項目:**
- `NEXT_PUBLIC_SUPABASE_URL` が正しく設定されているか
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` が正しく設定されているか
- `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか
- 本番環境と開発環境で異なる値が設定されていないか

### 5. ブラウザの状態

**確認項目:**
- ブラウザの種類とバージョン
- プライベートモードかどうか
- 拡張機能が影響していないか
- JavaScript が有効かどうか

## 推奨される調査手順

1. **ブラウザのキャッシュをクリア**
   - Ctrl+Shift+R（Windows/Linux）または Cmd+Shift+R（Mac）
   - 開発者ツール → Network タブ → 「Disable cache」を有効にする

2. **ネットワークタブでリクエストを確認**
   - `/home` へのリクエストのステータスコードを確認
   - リダイレクトチェーンを確認
   - Cookie の送信状況を確認

3. **コンソールでログを確認**
   - `useEffect` が何回実行されているか
   - `redirectAttemptRef.current` の値
   - `hasClearedSession` の値

4. **Vercel のログを確認**
   - ミドルウェアのログ
   - `/home` ページのログ
   - エラーログ

5. **Cookie の状態を確認**
   - セッション関連のCookieが存在するか
   - Cookie の属性が正しいか

## 次のステップ

上記の情報を収集した後、以下のいずれかの対策を実施：

1. **セッションの状態を確認して、無効な場合は即座にクリア**
2. **リダイレクト試行回数の上限を1回に減らす**
3. **`useEffect` の依存配列を調整**
4. **ミドルウェアの認証チェックロジックを確認**
5. **Cookie の設定を確認**









