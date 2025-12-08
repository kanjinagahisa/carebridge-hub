# RLSポリシー違反の根本原因分析と確認手順

## 考えられる根本的な原因

### 1. **クライアント側でセッションが正しくデータベースリクエストに含まれていない**
   - `createBrowserClient`はCookieからセッションを自動的に読み取るはずですが、実際にリクエストヘッダーに認証トークンが含まれていない可能性があります
   - **確認方法**: ブラウザのNetworkタブで、`/rest/v1/facilities`へのリクエストの`Authorization`ヘッダーを確認

### 2. **`auth.uid()`がNULLになっている**
   - セッションが存在しても、データベースリクエスト時に`auth.uid()`がNULLになっている可能性があります
   - **確認方法**: Supabaseで直接SQLを実行して`auth.uid()`の値を確認

### 3. **ポリシーが正しく適用されていない（キャッシュの問題）**
   - ポリシーを更新しても、Supabaseの内部キャッシュが古い可能性があります
   - **確認方法**: RLSを一度無効にしてから再度有効にする

### 4. **複数のポリシーが競合している**
   - `facilities`テーブルに複数のINSERTポリシーが存在し、競合している可能性があります
   - **確認方法**: すべてのINSERTポリシーを確認

### 5. **ポリシーの構文に問題がある**
   - `WITH CHECK`句の構文が正しくない可能性があります
   - **確認方法**: ポリシーの定義を再確認

---

## 確認手順

### ステップ1: Networkタブでリクエストヘッダーを確認

1. ブラウザで `http://localhost:3000/setup/create` にアクセス
2. 開発者ツールを開く（F12）
3. **Network**タブを選択
4. 施設名を入力して「施設を作成する」ボタンをクリック
5. Networkタブで、`/rest/v1/facilities`へのリクエストを探す
6. リクエストをクリックして、**Headers**タブを確認
7. **Request Headers**セクションで、以下を確認：
   - `Authorization: Bearer <token>` が存在するか
   - `apikey: <anon_key>` が存在するか

**期待される結果**: `Authorization`ヘッダーに有効なJWTトークンが含まれている必要があります

---

### ステップ2: Supabaseで`auth.uid()`を確認

1. Supabaseダッシュボード → SQL Editorを開く
2. 以下のSQLを実行（**注意**: このSQLは認証コンテキストがないため、`auth.uid()`はNULLになります。これは正常です）

```sql
-- 現在のauth.uid()を確認（SQL EditorではNULLになるのが正常）
SELECT 
  auth.uid() as auth_uid,
  auth.role() as auth_role,
  (auth.uid() IS NOT NULL) as is_authenticated;
```

**期待される結果**: SQL Editorでは`auth.uid()`はNULLになります（認証コンテキストがないため）

---

### ステップ3: ポリシーを再確認

1. Supabaseダッシュボード → Table Editor → `facilities`テーブルを選択
2. 「RLS policies」ボタンをクリック
3. 以下のポリシーが存在し、内容が正しいか確認：
   - **Policy Name**: "Authenticated users can create facilities"
   - **Command**: INSERT
   - **Roles**: `{public}` または空（すべてのロールに適用）
   - **WITH CHECK**: `(auth.uid() IS NOT NULL)`

---

### ステップ4: RLSをリフレッシュ（必要に応じて）

1. 「RLS policies」画面で、右上の「Row Level Security (RLS)」トグルを一度「Off」にする
2. 確認ダイアログで「Disable RLS」をクリック
3. 再度「Row Level Security (RLS)」トグルを「On」にする
4. 確認ダイアログで「Enable RLS」をクリック

---

### ステップ5: すべてのINSERTポリシーを確認

1. Supabaseダッシュボード → Authentication → Policiesを開く
2. 検索バーに「facilities」と入力
3. `facilities`テーブルのすべてのINSERTポリシーを確認
4. 複数のINSERTポリシーが存在する場合、競合している可能性があります

---

## 最も可能性が高い原因

**クライアント側でセッションが正しくデータベースリクエストに含まれていない**可能性が最も高いです。

`createBrowserClient`は自動的にCookieからセッションを読み取るはずですが、実際にリクエストヘッダーに認証トークンが含まれていない可能性があります。

---

## 次のステップ

まず、**ステップ1（Networkタブでリクエストヘッダーを確認）**を実行してください。これが最も重要な確認です。

結果を共有してください。


