# PostgRESTログでのエラー確認ガイド

## 現在表示されているログについて

現在表示されているログは、PostgRESTの起動時のログです：
- Schema cache loaded
- Connection Pool initialized
- Successfully connected to PostgreSQL

これらは正常な起動ログで、実際のリクエストやエラーログではありません。

## JWT検証エラーやRLSエラーの表示例

### 1. JWTトークンの検証エラーが記録されている場合

以下のようなメッセージが表示されます：

```
25 Nov 25 11:50:xx JWT verification failed: invalid signature
25 Nov 25 11:50:xx JWT verification failed: token expired
25 Nov 25 11:50:xx JWT verification failed: invalid token format
```

または、より詳細なエラー：

```
25 Nov 25 11:50:xx Error verifying JWT: JWT verification failed
25 Nov 25 11:50:xx Request failed: JWT verification error
```

### 2. auth.uid()がNULLとして評価されている場合

RLSポリシーで`auth.uid() IS NOT NULL`をチェックしている場合、以下のようなメッセージが表示されることがあります：

```
25 Nov 25 11:50:xx new row violates row-level security policy for table "facilities"
25 Nov 25 11:50:xx RLS policy violation: auth.uid() returned NULL
```

または、PostgRESTのログに直接表示されない場合もありますが、HTTPレスポンスとして403エラーが返されます。

### 3. その他のエラーメッセージ

#### RLSポリシー違反の場合：
```
25 Nov 25 11:50:xx new row violates row-level security policy for table "facilities"
25 Nov 25 11:50:xx RLS policy check failed for INSERT on facilities
```

#### 権限エラーの場合：
```
25 Nov 25 11:50:xx permission denied for table facilities
25 Nov 25 11:50:xx insufficient privileges for INSERT operation
```

#### リクエストエラーの場合：
```
25 Nov 25 11:50:xx POST /rest/v1/facilities HTTP/1.1 403
25 Nov 25 11:50:xx Request failed with status 403
```

## 実際のリクエストログを確認する方法

### ステップ1: 施設作成を試行する

1. ブラウザで `/setup/create` を開く
2. 施設名を入力
3. 「施設を作成する」ボタンをクリック
4. **すぐに**（数秒以内に）SupabaseダッシュボードのPostgRESTログを確認

### ステップ2: ログのフィルタリング

1. PostgRESTログ画面の「Search events」フィールドに以下を入力：
   - `facilities` - 施設テーブルに関連するログ
   - `403` - 403エラー
   - `RLS` - RLS関連のエラー
   - `JWT` - JWT検証関連のエラー

2. 「Last hour」を「Last 5 minutes」に変更して、最新のログを確認

### ステップ3: ログの詳細を確認

各ログエントリをクリックして、詳細情報を確認：
- エラーメッセージの全文
- リクエストヘッダー（Authorizationヘッダーが含まれているか）
- レスポンスステータスコード
- タイムスタンプ（施設作成を試行した時刻と一致するか）

## 確認すべき具体的なログパターン

### パターンA: JWT検証エラー
```
[ERROR] JWT verification failed: <エラー詳細>
[ERROR] Invalid JWT token in Authorization header
```

### パターンB: RLSポリシー違反
```
[ERROR] new row violates row-level security policy for table "facilities"
[ERROR] RLS policy check failed
```

### パターンC: 権限エラー
```
[ERROR] permission denied for table facilities
[ERROR] insufficient privileges
```

### パターンD: 正常なリクエスト（エラーなし）
```
[INFO] POST /rest/v1/facilities HTTP/1.1 201
[INFO] Request completed successfully
```

## 次のステップ

1. **施設作成を試行する**
2. **すぐにPostgRESTログを確認する**
3. **上記のパターンに該当するログを探す**
4. **見つかったログの全文を共有する**

特に、以下の情報を共有してください：
- エラーメッセージの全文
- タイムスタンプ
- リクエストの詳細（URL、メソッド、ステータスコード）











