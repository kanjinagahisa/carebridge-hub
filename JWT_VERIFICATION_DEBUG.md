# JWT検証問題の原因追求ガイド

## 現状の確認事項

### ✅ 確認済み
- JWTトークンは有効（`role: "authenticated"`, `isExpired: false`）
- `Authorization: Bearer <token>`ヘッダーは存在している
- 権限は正しく付与されている（`anon`と`authenticated`の両方に`INSERT`と`SELECT`）
- デバッグポリシー（`WITH CHECK (true)`）でも403エラーが発生

### ❓ 未確認
- PostgRESTがJWTトークンを正しく検証できているか
- SupabaseプロジェクトのJWT設定が正しいか
- PostgRESTのログにエラーが記録されているか

## 確認方法

### 1. SupabaseダッシュボードでJWTトークンの検証を確認

**手順：**
1. Supabaseダッシュボード → **Authentication** → **Policies**
2. または、**Database** → **Functions** でJWT検証関数を確認

**確認事項：**
- JWTシークレットが正しく設定されているか
- JWTトークンの署名が正しいか

### 2. PostgRESTのログを確認

**手順：**
1. Supabaseダッシュボード → **Logs** → **PostgREST**
2. 施設作成を試行した時刻のログを確認

**確認事項：**
- JWTトークンの検証エラーが記録されているか
- `auth.uid()`が`NULL`として評価されているか

### 3. JWTトークンの内容を再確認

**手順：**
1. ブラウザのコンソールで `Ready to create facility:` のログを展開
2. `jwtPayload` の内容を確認

**確認事項：**
- `sub`（ユーザーID）が正しく含まれているか
- `role`が`authenticated`になっているか
- `exp`（有効期限）が未来の日時になっているか

### 4. Networkタブでリクエストヘッダーを再確認

**手順：**
1. ブラウザの開発者ツール → **Network**タブ
2. `facilities?select=*` へのリクエストを選択
3. **Headers**タブ → **Request Headers**を確認

**確認事項：**
- `Authorization: Bearer <token>`ヘッダーが存在するか
- `apikey`ヘッダーが正しく設定されているか
- リクエストURLが正しいか（`/rest/v1/facilities?select=*`）

### 5. Supabaseプロジェクトの設定を確認

**手順：**
1. Supabaseダッシュボード → **Settings** → **API**
2. **Project API keys**を確認

**確認事項：**
- `anon`キーが正しく設定されているか
- JWTシークレットが正しく設定されているか

## 推奨される確認順序

1. **まず、PostgRESTのログを確認**（最も重要）
   - 施設作成を試行した時刻のログを確認
   - JWTトークンの検証エラーが記録されているか確認

2. **次に、Networkタブでリクエストヘッダーを再確認**
   - `Authorization`ヘッダーが正しく送信されているか確認
   - リクエストURLが正しいか確認

3. **最後に、Supabaseプロジェクトの設定を確認**
   - JWTシークレットが正しく設定されているか確認

## 次のステップ

上記の確認を行った後、結果を共有してください。それに基づいて、適切な修正案を提案します。











