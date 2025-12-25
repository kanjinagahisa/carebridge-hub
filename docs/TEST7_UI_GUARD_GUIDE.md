# テスト項目7: UI側ガード実装確認 - 実施ガイド

## 📋 目的

招待ユーザーの初回ログイン後に「施設紐付けが無い状態」を検知してブロックするUI側ガードが正しく機能しているかを確認します。

**期待される動作**: 招待リンクを使用して参加したユーザーでログイン直後、もし `user_facility_roles` が無いなら、「管理者に連絡してください」等を表示して、勝手に進めない。

---

## 🔍 現在の実装状況

### 実装箇所

- **`app/home/page.tsx`** (158-161行目)
  - `userFacilities` が空の場合、`/setup/choose` にリダイレクト
  - これにより、施設に紐付けられていないユーザーは自動的にセットアップ画面に誘導される

- **`app/setup/choose/page.tsx`**
  - 施設に所属していないユーザーに対して、セットアップ画面を表示
  - 「新しい施設を作成する」または「招待リンクで既存施設に参加する」の選択肢を提供

### 実装の動作

1. ユーザーがログイン後、`/home` にアクセス
2. `user_facility_roles` を取得
3. 施設が無い場合（`userFacilities` が空）、`/setup/choose` にリダイレクト
4. セットアップ画面で、施設作成または招待リンクでの参加を促す

---

## 📝 テスト手順

### 事前準備

#### 1. テスト用のユーザーを準備

以下のいずれかの方法で、**施設に紐付けられていないユーザー**を作成します：

**方法A: 新規サインアップ（施設に参加しない）**
- 新しいメールアドレスでサインアップ
- 招待リンクを使用せずにサインアップ完了
- この時点で `user_facility_roles` には何も入っていない

**方法B: 招待リンクを使用したが、参加処理が失敗したユーザー**
- 招待リンクにアクセス
- ログイン/サインアップ
- しかし、何らかの理由で `user_facility_roles` への挿入が失敗した状態

**方法C: SQLで直接確認（推奨）**
- 既存のユーザーで、`user_facility_roles` が無い状態を確認

```sql
-- 施設に紐付けられていないユーザーを確認
SELECT
  u.id,
  u.email,
  u.display_name,
  COUNT(ufr.id) AS facility_count
FROM auth.users u
LEFT JOIN users pu ON pu.id = u.id
LEFT JOIN user_facility_roles ufr ON ufr.user_id = u.id AND ufr.deleted = false
WHERE pu.deleted = false
GROUP BY u.id, u.email, u.display_name
HAVING COUNT(ufr.id) = 0
ORDER BY u.created_at DESC
LIMIT 10;
```

#### 2. テスト用のユーザー情報を記録

- **TEST_USER_EMAIL**: テスト用ユーザーのメールアドレス
- **TEST_USER_ID**: テスト用ユーザーのUID（`auth.users.id`）

---

### ステップ1: 施設紐付けが無い状態を確認（SQL）

#### 1-1. ユーザーが `auth.users` に存在するか確認

```sql
-- テスト用ユーザーが auth.users に存在するか確認
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'TEST_USER_EMAIL_HERE';
```

**判定**: ✅ `auth.users` にユーザーが存在する

#### 1-2. `user_facility_roles` に紐付けが無いことを確認

```sql
-- テスト用ユーザーの施設紐付けを確認
SELECT
  ufr.user_id,
  ufr.facility_id,
  ufr.role,
  ufr.deleted,
  ufr.created_at
FROM user_facility_roles ufr
WHERE ufr.user_id = 'TEST_USER_ID_HERE'::uuid
  AND ufr.deleted = false;
```

**判定**: ✅ 結果が **0件** である（施設に紐付けられていない）

---

### ステップ2: UI側ガードの動作確認

#### 2-1. テスト用ユーザーでログイン

1. **ログアウト**（既にログインしている場合）
   - ブラウザで `/menu` にアクセス
   - 「ログアウト」をクリック
   - ログイン画面に遷移することを確認

2. **テスト用ユーザーでログイン**
   - `/login` にアクセス
   - **TEST_USER_EMAIL** とパスワードを入力
   - 「ログイン」をクリック

#### 2-2. ホーム画面へのアクセスを試みる

1. **直接 `/home` にアクセス**
   - ブラウザのアドレスバーに `/home` を入力してEnter
   - または、ログイン後に自動的に `/home` に遷移した場合

2. **期待される動作を確認**
   - ✅ `/home` にアクセスできない
   - ✅ 自動的に `/setup/choose` にリダイレクトされる
   - ✅ セットアップ画面が表示される

#### 2-3. セットアップ画面の表示内容を確認

**表示されるべき内容**:

- ✅ 「施設のセットアップ」というタイトル
- ✅ 「新しい施設を作成する」ボタン
- ✅ 「または」という区切り
- ✅ 「招待リンクで既存施設に参加する」ボタン

**表示されないべき内容**:

- ❌ ホーム画面の内容（新着投稿、未読メッセージなど）
- ❌ エラーメッセージ（「アクセスできません」など）

---

### ステップ3: 他のページへのアクセスを試みる（追加確認）

施設に紐付けられていないユーザーが、他の主要ページにアクセスした場合の動作を確認します。

#### 3-1. `/clients` にアクセス

1. ブラウザのアドレスバーに `/clients` を入力してEnter
2. **期待される動作**:
   - ✅ RLS（Row Level Security）により、データが取得できない
   - ✅ エラー画面が表示される、または `/setup/choose` にリダイレクトされる
   - ✅ または、空の一覧が表示される（RLSでフィルタリングされる）

#### 3-2. `/groups` にアクセス

1. ブラウザのアドレスバーに `/groups` を入力してEnter
2. **期待される動作**:
   - ✅ RLSにより、データが取得できない
   - ✅ エラー画面が表示される、または `/setup/choose` にリダイレクトされる
   - ✅ または、空の一覧が表示される

#### 3-3. `/settings` にアクセス

1. ブラウザのアドレスバーに `/settings` を入力してEnter
2. **期待される動作**:
   - ✅ 施設設定が表示できない
   - ✅ エラーメッセージが表示される、または `/setup/choose` にリダイレクトされる

---

### ステップ4: コンソールログの確認

#### 4-1. ブラウザの開発者ツールを開く

1. **F12** を押す、または右クリック → 「検証」
2. **Console** タブを開く

#### 4-2. ログを確認

`/home` にアクセスした際に、以下のようなログが出力されることを確認：

```
[HomePage] Starting...
[HomePage] Supabase client created
[HomePage] User authenticated: <USER_ID> <USER_EMAIL>
[HomePage] Fetching user facilities with admin client...
[HomePage] User has no facilities, redirecting to setup
```

**判定**: ✅ 上記のログが表示される

---

### ステップ5: 正常系の確認（対照実験）

施設に紐付けられているユーザーで、正常に動作することを確認します。

#### 5-1. 正常なユーザーでログイン

1. **正常なユーザーでログイン**
   - 施設に紐付けられている既存ユーザーでログイン

2. **`/home` にアクセス**
   - ✅ 正常にホーム画面が表示される
   - ✅ 施設名が表示される
   - ✅ 新着投稿などが表示される（データがあれば）

#### 5-2. SQLで正常なユーザーの状態を確認

```sql
-- 正常なユーザーの施設紐付けを確認
SELECT
  ufr.user_id,
  ufr.facility_id,
  f.name AS facility_name,
  ufr.role,
  ufr.deleted,
  ufr.created_at
FROM user_facility_roles ufr
JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.user_id = 'NORMAL_USER_ID_HERE'::uuid
  AND ufr.deleted = false;
```

**判定**: ✅ 施設に紐付けられている（1件以上）

---

## ✅ 期待される結果

### 成功パターン

- ✅ 施設に紐付けられていないユーザーで `/home` にアクセスすると、自動的に `/setup/choose` にリダイレクトされる
- ✅ セットアップ画面が正しく表示される
- ✅ コンソールログに「User has no facilities, redirecting to setup」が表示される
- ✅ 他のページ（`/clients`, `/groups`, `/settings`）でも、RLSにより適切にブロックされる
- ✅ 正常なユーザー（施設に紐付けられている）は、正常に `/home` にアクセスできる

### 失敗パターン

- ❌ 施設に紐付けられていないユーザーが `/home` にアクセスできてしまう
- ❌ エラーメッセージが表示されない
- ❌ 空の画面が表示される（リダイレクトされない）
- ❌ コンソールにエラーログが表示される

---

## 🔍 トラブルシューティング

### 問題1: リダイレクトされない

**症状**: 施設に紐付けられていないユーザーが `/home` にアクセスできる

**確認項目**:
1. **SQLで `user_facility_roles` を確認**
   ```sql
   SELECT * FROM user_facility_roles
   WHERE user_id = 'TEST_USER_ID_HERE'::uuid
     AND deleted = false;
   ```
   - 結果が0件であることを確認

2. **ブラウザのコンソールログを確認**
   - `[HomePage] User has no facilities, redirecting to setup` が表示されているか確認

3. **Next.jsのターミナルログを確認**
   - サーバー側のログにリダイレクト処理が実行されているか確認

**対処方法**:
- `app/home/page.tsx` の158-161行目の実装を確認
- `redirect('/setup/choose')` が正しく呼び出されているか確認

---

### 問題2: セットアップ画面が表示されない

**症状**: `/setup/choose` にリダイレクトされたが、画面が表示されない

**確認項目**:
1. **`app/setup/choose/page.tsx` が存在するか確認**
2. **ブラウザのコンソールにエラーが表示されていないか確認**
3. **Next.jsのターミナルにエラーが表示されていないか確認**

**対処方法**:
- `app/setup/choose/page.tsx` の実装を確認
- エラーログを確認して、問題を特定

---

### 問題3: 正常なユーザーもリダイレクトされる

**症状**: 施設に紐付けられているユーザーも `/setup/choose` にリダイレクトされる

**確認項目**:
1. **SQLで `user_facility_roles` を確認**
   ```sql
   SELECT * FROM user_facility_roles
   WHERE user_id = 'NORMAL_USER_ID_HERE'::uuid
     AND deleted = false;
   ```
   - 結果が1件以上であることを確認

2. **`app/home/page.tsx` の実装を確認**
   - `userFacilities` の取得処理が正しく動作しているか確認

**対処方法**:
- `app/home/page.tsx` の104-113行目の `userFacilities` 取得処理を確認
- `adminSupabase` クライアントが正しく使用されているか確認

---

## 📊 テスト結果の記録

### テスト実施日時
- **日時**: _______________
- **実施者**: _______________
- **環境**: 本番（carebridge-hub-prod）または ローカル（localhost）

### テスト結果サマリー

| 確認項目 | 結果 | 備考 |
|---------|------|------|
| SQL: 施設紐付けが無いことを確認 | ☐ | |
| UI: `/home` にアクセスできない | ☐ | |
| UI: `/setup/choose` にリダイレクトされる | ☐ | |
| UI: セットアップ画面が表示される | ☐ | |
| UI: `/clients` にアクセスできない | ☐ | |
| UI: `/groups` にアクセスできない | ☐ | |
| UI: `/settings` にアクセスできない | ☐ | |
| ログ: コンソールログが正しい | ☐ | |
| 正常系: 正常なユーザーは `/home` にアクセスできる | ☐ | |

### 発見された問題

1. **問題1**: 
   - **現象**: 
   - **再現手順**: 
   - **想定原因**: 
   - **対応**: 

2. **問題2**: 
   - **現象**: 
   - **再現手順**: 
   - **想定原因**: 
   - **対応**: 

---

## ✅ 合格条件

以下のすべてが満たされれば合格です：

- ✅ 施設に紐付けられていないユーザーが `/home` にアクセスすると、自動的に `/setup/choose` にリダイレクトされる
- ✅ セットアップ画面が正しく表示される
- ✅ コンソールログに適切なメッセージが表示される
- ✅ 正常なユーザー（施設に紐付けられている）は、正常に `/home` にアクセスできる
- ✅ 他のページ（`/clients`, `/groups`, `/settings`）でも、適切にブロックされる

**テスト項目7の判定: 上記の条件をすべて満たせば合格です！**

---

## 📝 補足: 実装の改善提案（任意）

現在の実装では、施設に紐付けられていないユーザーは `/setup/choose` にリダイレクトされますが、より明確なエラーメッセージを表示することを検討できます。

### 改善案1: エラーメッセージの追加

`/setup/choose` ページに、以下のようなメッセージを追加：

```
⚠️ 施設に所属していません

現在、あなたのアカウントはどの施設にも所属していません。
以下のいずれかの方法で施設に参加してください：

1. 新しい施設を作成する
2. 招待リンクを使用して既存施設に参加する

問題が解決しない場合は、管理者に連絡してください。
```

### 改善案2: 専用のエラーページを作成

`/setup/no-facility` のような専用のエラーページを作成し、より詳細な説明を表示。

---

## 🔗 関連ドキュメント

- [ユーザー招待：本番テスト用チェックリスト](./USER_INVITE_TEST_CHECKLIST.md)
- [テスト項目1-6の実施ガイド](./USER_INVITE_TEST_GUIDE.md)



