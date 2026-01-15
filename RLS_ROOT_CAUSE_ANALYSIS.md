# RLSポリシー違反エラーの根本原因分析

## 現在の状況

1. **JWTトークンは正しく送信されている**
   - `Authorization: Bearer <token>`ヘッダーが存在
   - JWTトークンは有効（`role: "authenticated"`, `isExpired: false`）

2. **apikeyも正しく送信されている**
   - `apikey: <anon_key>`ヘッダーが存在

3. **403 Forbiddenエラーが発生**
   - レスポンス: `{"message":"new row violates row-level security policy for table \"facilities\""}`

4. **RLSポリシーは設定されている**
   - `TO anon`と`WITH CHECK (auth.uid() IS NOT NULL)`のポリシーが存在

## なぜエラーが続いているのか？

### 考えられる根本原因

#### 1. PostgRESTがJWTトークンを正しく検証できていない
- `createBrowserClient`は`anon`キーを使うため、リクエストは`anon`ロールとして送信される
- しかし、`Authorization: Bearer <token>`ヘッダーが存在する場合、PostgRESTはJWTトークンを検証して`auth.uid()`を評価できるはず
- それでもエラーが発生するということは、PostgRESTがJWTトークンを正しく検証できていない可能性がある

#### 2. JWTトークンの形式が正しくない
- JWTトークンが正しい形式でない場合、PostgRESTは`auth.uid()`をNULLとして評価する
- これにより、`WITH CHECK (auth.uid() IS NOT NULL)`が失敗する

#### 3. RLSポリシーが正しく適用されていない
- ポリシーが作成されていても、PostgRESTが正しく評価していない可能性がある
- ポリシーの条件が正しく評価されていない

#### 4. 権限が不足している
- `anon`ロールに`INSERT`権限が付与されていない可能性がある
- スキーマの`USAGE`権限が不足している可能性がある

## 確実な解決方法

### 方法1: RLSを一時的に無効化してテスト（デバッグ用）

```sql
-- 一時的にRLSを無効化（デバッグ用のみ）
ALTER TABLE facilities DISABLE ROW LEVEL SECURITY;
```

**注意**: これは本番環境では使用しないでください。デバッグ目的のみです。

### 方法2: より寛容なRLSポリシーを設定

```sql
-- すべての認証済みユーザーが施設を作成できるようにする
CREATE POLICY "Allow all authenticated inserts"
  ON facilities FOR INSERT
  TO anon
  WITH CHECK (true);
```

**注意**: これはセキュリティリスクがあるため、本番環境では使用しないでください。

### 方法3: 正しいRLSポリシーを確実に設定

1. **すべての既存ポリシーを削除**
2. **権限を確認・付与**
3. **正しいポリシーを再作成**
4. **PostgRESTを再起動**（Supabaseダッシュボードから）

### 方法4: サーバーサイドで施設を作成（RLSを回避）

- クライアントサイドではなく、サーバーサイド（API Route）で施設を作成する
- サーバーサイドでは`service_role`キーを使用できるため、RLSを回避できる

## 推奨される解決手順

1. **現在のRLSポリシーの状態を確認**（`023_verify_and_fix_policies.sql`を実行）
2. **権限を確認・付与**
3. **正しいRLSポリシーを再作成**
4. **PostgRESTを再起動**（Supabaseダッシュボードから）
5. **ブラウザで再試行**

もしこれでも解決しない場合は、**方法4（サーバーサイドで施設を作成）**を実装することを推奨します。












