# ユーザー招待機能：テスト実施ガイド（手取り足取り）

**対象環境**: 本番（Vercel: carebridge-hub.vercel.app）  
**目的**: ユーザー招待機能の動作確認を段階的に実施

---

## 📋 テスト実施前の準備

### 準備0: 既存テストデータの削除（任意）

**注意**: 既存のテストデータがあっても、新規施設作成のテストは問題なく実行できます。  
ただし、クリーンな状態からテストを始めたい場合は、以下の手順で既存のテストデータを削除できます。

#### オプションA: 既存テスト施設とユーザーの関連付けを削除する場合

1. **Supabase SQL Editorを開く**
   - Supabaseダッシュボード → SQL Editor → New query

2. **削除前に確認（推奨）**
   ```sql
   -- 「RLS Policy Test」という名前の施設を確認
   SELECT id, name, type, created_at, deleted
   FROM facilities
   WHERE name LIKE '%RLS Policy Test%'
     AND deleted = false;
   
   -- 特定のメールアドレスのユーザーが所属している施設を確認
   SELECT 
     au.email,
     f.name AS facility_name,
     ufr.role,
     ufr.deleted AS role_deleted
   FROM auth.users au
   JOIN user_facility_roles ufr ON ufr.user_id = au.id
   JOIN facilities f ON f.id = ufr.facility_id
   WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
     AND ufr.deleted = false
     AND f.deleted = false;
   ```

3. **施設を論理削除（soft delete）**
   ```sql
   -- 「RLS Policy Test」という名前の施設を論理削除
   UPDATE facilities
   SET deleted = true, updated_at = NOW()
   WHERE name LIKE '%RLS Policy Test%'
     AND deleted = false;
   ```

4. **ユーザーの施設との関連付けを削除**
   ```sql
   -- 特定のメールアドレスのユーザーを全ての施設から削除
   UPDATE user_facility_roles ufr
   SET deleted = true, updated_at = NOW()
   WHERE ufr.user_id IN (
     SELECT id FROM auth.users
     WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
   )
     AND ufr.deleted = false;
   ```

5. **削除結果を確認**
   ```sql
   -- 削除された施設を確認
   SELECT id, name, deleted, updated_at
   FROM facilities
   WHERE name LIKE '%RLS Policy Test%';
   
   -- 削除された関連付けを確認
   SELECT 
     au.email,
     f.name AS facility_name,
     ufr.deleted AS role_deleted
   FROM auth.users au
   JOIN user_facility_roles ufr ON ufr.user_id = au.id
   JOIN facilities f ON f.id = ufr.facility_id
   WHERE au.email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com');
   ```

#### オプションB: ユーザーアカウント自体も完全に削除する場合

**警告**: この操作は元に戻せません。ユーザーアカウントとそのすべての関連データが削除されます。

```sql
-- 1. 関連付けを削除（オプションAのステップ4を実行）

-- 2. public.usersテーブルから削除
DELETE FROM users
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com')
);

-- 3. auth.usersテーブルから削除（CASCADEにより関連データも自動削除）
DELETE FROM auth.users
WHERE email IN ('kanjinagatomi99@gmail.com', 'niversnagatomi@gmail.com');
```

---

### 準備1: テスト用アカウントの準備

本番を想定したテストを行うため、以下のアカウントを準備してください。

#### ステップ1-1: 施設作成者（管理者）のアカウントを準備

1. **新しいアカウントを作成するか、既存のアカウントを使用**
   - テスト用のメールアドレスで新規サインアップ（後述のステップ0-1を参照）
   - または、既存のアカウントを使用
   - **このアカウントを「施設作成者（管理者）」として使用します**

2. **アカウント情報を記録**
   ```
   施設作成者（管理者）のメールアドレス: [記録してください]
   施設作成者（管理者）のパスワード: [記録してください]
   ```

#### ステップ1-2: 招待されるユーザーのアカウント（後で作成）

- 招待リンクを使用して参加するユーザーは、後で新規サインアップします
- または、既存のアカウントを使用することもできます

#### ステップ1-3: テスト用の値を記録する準備

テスト中に以下の値を記録してください：

```
FACILITY_ID: [施設作成後に取得]
FACILITY_NAME: [施設作成時に設定]
INVITE_CODE: [招待リンク作成後に取得]
INVITE_LINK: [招待リンク作成後に取得]
招待ユーザーのメールアドレス: [後で取得]
招待ユーザーのUSER_ID: [後で取得]
```

---

## ✅ テスト項目0: 新規施設の作成（本番を想定したフロー）

### ステップ0-1: 新規アカウントを作成（まだアカウントがない場合）

1. **サインアップページにアクセス**
   ```
   https://carebridge-hub.vercel.app/signup
   ```

2. **アカウント情報を入力**
   - **メールアドレス**: テスト用のメールアドレスを入力
   - **パスワード**: 強固なパスワードを入力（8文字以上、大文字・小文字・数字を含む）
   - **表示名**: 任意の名前を入力（例: 「テスト管理者」）
   - **職種**: ドロップダウンから選択（例: 「管理者」）

3. **「アカウントを作成」ボタンをクリック**
   - メール確認が必要な場合は、メールを確認して認証を完了してください

4. **ログインページにリダイレクトされることを確認**
   - サインアップ後、ログインページにリダイレクトされます

### ステップ0-2: ログイン

1. **ログインページでログイン**
   ```
   https://carebridge-hub.vercel.app/login
   ```
   - ステップ0-1で作成したメールアドレスとパスワードでログイン

2. **セットアップ選択ページにリダイレクトされることを確認**
   - ログイン後、`/setup/choose` にリダイレクトされます
   - 「新しい施設を作成する」と「招待リンクで参加する」の2つの選択肢が表示されます

### ステップ0-3: 新規施設を作成

1. **「新しい施設を作成する」をクリック**
   - `/setup/create` に遷移します

2. **施設名を入力**
   - 「施設名」欄に任意の施設名を入力
   - 例: 「テスト施設（本番テスト用）」
   - **この施設名を `FACILITY_NAME` として記録してください**

3. **「施設を作成する」ボタンをクリック**
   - ボタンをクリック
   - 「作成中...」と表示される
   - 数秒待つ

4. **ホーム画面にリダイレクトされることを確認**
   - 施設作成後、自動的に `/home` にリダイレクトされます
   - ホーム画面が正しく表示されることを確認

### ステップ0-4: SQLで施設と管理者ロールを確認

1. **Supabase SQL Editorを開く**
   - Supabaseダッシュボード → SQL Editor → New query

2. **施設が作成されたか確認**
   ```sql
   -- 直近1時間以内に作成された施設を確認
   SELECT 
     id, 
     name, 
     type,
     created_at
   FROM facilities
   WHERE deleted = false
     AND created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **施設IDを記録**
   - 結果から、作成した施設の `id` をコピー
   - **この値を `FACILITY_ID` として記録してください**

4. **管理者ロールが自動付与されたか確認**
   ```sql
   -- {USER_ID} をログインしているユーザーのIDに置き換えてください
   -- ユーザーIDは、ブラウザのコンソールで確認できます（後述）
   -- または、auth.usersテーブルから取得できます
   SELECT
     ufr.user_id,
     ufr.facility_id,
     f.name AS facility_name,
     ufr.role,
     ufr.deleted,
     ufr.created_at
   FROM user_facility_roles ufr
   JOIN facilities f ON f.id = ufr.facility_id
   WHERE ufr.facility_id = '{FACILITY_ID}'::uuid
     AND ufr.deleted = false
   ORDER BY ufr.created_at DESC;
   ```
   - `{FACILITY_ID}` を実際の施設IDに置き換えて実行

5. **結果を確認**
   - `facility_id` が正しいことを確認
   - `facility_name` が入力した施設名と一致している
   - `role = 'admin'` であることを確認（施設作成者が自動的に管理者になる）
   - `deleted = false` であることを確認

6. **ユーザーIDを取得（後で使用するため）**
   ```sql
   -- メールアドレスからユーザーIDを取得
   SELECT id, email, created_at
   FROM auth.users
   WHERE email = '施設作成者のメールアドレス'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - 結果の `id` をコピーして記録（後で使用します）

### ✅ チェックリスト0の完了確認

- [x] 新規アカウントを作成した（または既存アカウントでログインした）
- [x] ログイン後、セットアップ選択ページにリダイレクトされた
- [x] 「新しい施設を作成する」をクリックした
- [x] 施設名を入力して施設を作成した
- [x] ホーム画面にリダイレクトされた
- [x] SQLで施設が作成されたことを確認した
- [x] SQLで管理者ロール（`role = 'admin'`）が自動付与されたことを確認した
- [x] 施設ID（`FACILITY_ID`）を記録した

---

## ✅ テスト項目1: 招待リンクが作成されたか（招待リンク作成〜共有）

### ステップ1-1: 施設設定ページにアクセス

1. **ホーム画面から施設設定ページにアクセス**
   - ホーム画面の右上のメニュー（または設定アイコン）から「施設設定」をクリック
   - または、直接以下のURLにアクセス：
     ```
     https://carebridge-hub.vercel.app/settings/facility/invite?facility_id={FACILITY_ID}
     ```
   - `{FACILITY_ID}` をステップ0-4で記録した施設IDに置き換えてください

2. **ログイン状態を確認**
   - 施設作成者（管理者）のアカウントでログインしていることを確認
   - 未ログインの場合は、ログインページにリダイレクトされます

3. **ページが表示されることを確認**
   - 「スタッフを招待」というタイトルが表示される
   - 「招待ロール」の選択肢がある
   - 「招待メッセージ（任意）」の入力欄がある
   - 「招待リンクを作成」ボタンがある

### ステップ1-2: 招待リンクを作成

1. **招待ロールを選択**
   - ドロップダウンから「一般職員」または「管理者」を選択
   - テストでは「一般職員」を選択することを推奨

2. **招待メッセージを入力（任意）**
   - 「招待メッセージ（任意）」欄に任意のメッセージを入力
   - 例: 「テスト用の招待リンクです」
   - **注意**: メッセージは任意なので、空欄でも問題ありません

3. **「招待リンクを作成」ボタンをクリック**
   - ボタンをクリック
   - 「作成中...」と表示される
   - 数秒待つ

4. **招待リンクが表示されることを確認**
   - 「招待リンクが作成されました」というメッセージが表示される
   - 招待リンクのURLが表示される
   - リンクの形式が `https://carebridge-hub.vercel.app/invite/{code}` になっている

5. **招待リンクをコピー**
   - リンクの右側にある「コピー」ボタン（📋アイコン）をクリック
   - コピーできたことを確認（✅アイコンが表示される）
   - **このリンクを `INVITE_LINK` として記録してください**
   - リンクの最後の部分（`/invite/` 以降）を `INVITE_CODE` として記録してください

### ステップ1-3: SQLで招待コードを確認

1. **Supabase SQL Editorを開く**
   - Supabaseダッシュボード → SQL Editor → New query

2. **以下のSQLを実行**
   ```sql
   -- {FACILITY_ID} を実際の施設IDに置き換えてください
   SELECT
     id,
     facility_id,
     code,
     role,
     expires_at,
     used,
     cancelled,
     message,
     created_by,
     created_at
   FROM invite_codes
   WHERE facility_id = '{FACILITY_ID}'::uuid
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   - `{FACILITY_ID}` を実際の施設IDに置き換えて実行

3. **結果を確認**
   - 最新のレコードが表示される
   - `code` が表示されている（UUID形式）
   - `facility_id` が正しいことを確認
   - `role` が選択したロールと一致している（`staff` または `admin`）
   - `expires_at` が表示されている（約48時間後の日時）
   - `used = false` であることを確認
   - `cancelled = false` であることを確認

### ✅ チェックリスト1の完了確認

- [x] 施設設定ページにアクセスできた
- [x] 招待ロールを選択した
- [x] 招待メッセージを入力した（任意）
- [x] 「招待リンクを作成」ボタンをクリックした
- [x] 招待リンクが画面に表示された
- [x] リンクのコピーボタンでクリップボードにコピーできた
- [x] リンクの形式が正しい
- [x] SQLで `invite_codes` テーブルに新しいレコードが作成されている
- [x] `code` が生成されている（UUID形式）
- [x] `facility_id` が正しい
- [x] `role` が選択したロールと一致している
- [x] `expires_at` が設定されている（48時間後）
- [x] `used = false`
- [x] `cancelled = false`

---

## ✅ テスト項目2: 招待リンクにアクセスできるか（招待リンクの有効性確認）

### ステップ2-1: 招待リンクにアクセス（未ログイン状態）

1. **新しいブラウザウィンドウまたはプライベートモードで開く**
   - テスト用に別ブラウザまたはプライベートモードを使用
   - **重要**: 現在ログインしているブラウザとは別にする

2. **招待リンクにアクセス**
   - ステップ1-2で記録した `INVITE_LINK` をブラウザのアドレスバーに貼り付けてアクセス
   - 例: `https://carebridge-hub.vercel.app/invite/e543d586-59ee-4967-ae3d-7b64c586c86d`

3. **ページが表示されることを確認**
   - 施設名が正しく表示される
   - 「ログインして承認する」ボタンが表示される
   - エラーメッセージが表示されない

### ステップ2-2: SQLで招待リンクの状態を確認

1. **Supabase SQL Editorを開く**
   - SQL Editor → New query

2. **以下のSQLを実行**
   ```sql
   -- {INVITE_CODE} を実際の招待コードに置き換えてください
   SELECT
     ic.id,
     ic.code,
     ic.facility_id,
     f.name AS facility_name,
     ic.role,
     ic.expires_at,
     ic.used,
     ic.cancelled,
     ic.created_at,
     CASE
       WHEN ic.cancelled = true THEN 'キャンセル済み'
       WHEN ic.used = true THEN '使用済み'
       WHEN ic.expires_at < NOW() THEN '期限切れ'
       ELSE '有効'
     END AS status
   FROM invite_codes ic
   JOIN facilities f ON f.id = ic.facility_id
   WHERE ic.code = '{INVITE_CODE}'
     AND f.deleted = false;
   ```
   - `{INVITE_CODE}` を実際の招待コードに置き換えて実行

3. **結果を確認**
   - 招待コードが存在する
   - `facility_name` が正しく表示される
   - `status` が「有効」と表示される
   - `expires_at > NOW()` である（期限切れでない）
   - `used = false`（使用済みでない）
   - `cancelled = false`（キャンセルされていない）

### ✅ チェックリスト2の完了確認

- [x] 作成した招待リンク（`/invite/{code}`）にアクセスできた
- [x] 未ログイン状態でリンクにアクセスしても問題なく表示された
- [x] 施設名が正しく表示された
- [x] 「ログインして承認する」ボタンが表示された（未ログインの場合）
- [x] SQLで招待コードが存在することを確認した
- [x] 施設が削除されていない（`f.deleted = false`）
- [x] 期限切れでない（`expires_at > NOW()`）
- [x] 使用済みでない（`used = false`）
- [x] キャンセルされていない（`cancelled = false`）

---

## ✅ テスト項目3: 招待リンクを使用してユーザーが参加できるか（招待受け入れ〜ユーザー作成）

### ステップ3-1: ログインまたは新規サインアップ

1. **新しいブラウザウィンドウまたはプライベートモードで開く**
   - **重要**: 施設作成者とは別のブラウザまたはプライベートモードを使用
   - これにより、招待されるユーザーの視点でテストできます

2. **招待リンクにアクセス**
   - ステップ1-2で記録した `INVITE_LINK` をブラウザのアドレスバーに貼り付けてアクセス

3. **「ログインして承認する」ボタンをクリック**
   - 招待リンクのページで「ログインして承認する」ボタンをクリック
   - ログインページにリダイレクトされる（`/login?redirect=/invite/{code}`）

4. **新規サインアップする（推奨）**
   - ログインページで「新規登録」リンクをクリック
   - **メールアドレス**: 施設作成者とは別のメールアドレスを入力（例: `test-user@example.com`）
   - **パスワード**: 強固なパスワードを入力
   - **表示名**: 任意の名前を入力（例: 「テストユーザー」）
   - **職種**: ドロップダウンから選択（例: 「一般職員」）
   - **「アカウントを作成」ボタンをクリック**
   - メール確認が必要な場合は、メールを確認して認証を完了
   - **このメールアドレスを「招待ユーザーのメールアドレス」として記録してください**

5. **既存アカウントでログインする場合（オプション）**
   - 既存のアカウントでログインすることも可能
   - **注意**: 既にこの施設に参加しているアカウントの場合は、後で別のテストを実施します

6. **ログイン後のリダイレクトを確認**
   - ログイン後、自動的に招待受け入れページに戻る
   - URLが `/invite/{code}` になっていることを確認

### ステップ3-2: 招待を受け入れる

1. **招待受け入れページを確認**
   - 施設名が正しく表示される
   - 「この施設に参加しますか？」というメッセージが表示される
   - 「参加する」ボタンが表示される

2. **「参加する」ボタンをクリック**
   - 「参加する」ボタンをクリック
   - 「処理中...」と表示される
   - 数秒待つ

3. **参加完了メッセージを確認**
   - 「参加が完了しました！」のメッセージが表示される
   - 緑のチェックマークアイコンが表示される

4. **ホーム画面への遷移を確認**
   - 約1秒後に自動的にホーム画面（`/home`）に遷移する
   - ホーム画面が正しく表示されることを確認

### ステップ3-3: SQLでユーザーとロールを確認

1. **新規ユーザーの場合: auth.usersを確認**
   ```sql
   -- 直近1時間以内に作成されたユーザーを確認
   SELECT
     id,
     email,
     created_at,
     last_sign_in_at
   FROM auth.users
   WHERE created_at > NOW() - INTERVAL '1 hour'
   ORDER BY created_at DESC;
   ```

2. **user_facility_rolesを確認**
   ```sql
   -- {USER_ID} をテストでログインしたユーザーのIDに置き換えてください
   -- ユーザーIDは、上記のSQL結果から取得できます
   SELECT
     ufr.user_id,
     ufr.facility_id,
     f.name AS facility_name,
     ufr.role,
     ufr.deleted,
     ufr.created_at
   FROM user_facility_roles ufr
   JOIN facilities f ON f.id = ufr.facility_id
   WHERE ufr.user_id = '{USER_ID}'::uuid
     AND ufr.facility_id = '{FACILITY_ID}'::uuid
   ORDER BY ufr.created_at DESC;
   ```
   - `{USER_ID}` と `{FACILITY_ID}` を実際の値に置き換えて実行

3. **結果を確認**
   - `facility_id` が正しいことを確認
   - `facility_name` が正しく表示される
   - `role` が想定通り（`admin` または `staff`）
   - `deleted = false` であることを確認

4. **招待コードが使用済みになったか確認**
   ```sql
   -- {INVITE_CODE} を実際の招待コードに置き換えてください
   SELECT
     code,
     facility_id,
     role,
     used,
     created_at
   FROM invite_codes
   WHERE code = '{INVITE_CODE}';
   ```
   - `used = true` になっていることを確認

### ✅ チェックリスト3の完了確認

- [x] 未ログイン状態で招待リンクにアクセスした
- [x] 「ログインして承認する」ボタンをクリックした
- [x] ログインページにリダイレクトされた（`/login?redirect=/invite/{code}`）
- [x] 既存アカウントでログインした（または新規サインアップした）
- [x] ログイン後、招待受け入れページに戻った
- [x] 施設名と「この施設に参加しますか？」が表示された
- [x] 「参加する」ボタンをクリックした
- [x] 「参加が完了しました！」のメッセージが表示された
- [x] ホーム画面に遷移した
- [x] SQLで `user_facility_roles` にレコードが作成されたことを確認した
- [x] `facility_id` が正しいことを確認した
- [x] `role` が想定通りであることを確認した
- [x] `deleted = false` であることを確認した
- [x] 招待コードの `used = true` になったことを確認した

---

## ✅ テスト項目4: 既参加ユーザーが招待リンクにアクセスした場合の動作確認

### ステップ4-1: 既参加ユーザーで招待リンクにアクセス

1. **既に施設に参加しているユーザーでログイン**
   - ステップ3で参加したユーザーでログイン（または既存の参加済みユーザーでログイン）

2. **新しい招待リンクを作成**
   - 管理者アカウントでログイン
   - ステップ1-2と同様に新しい招待リンクを作成

3. **参加済みユーザーで招待リンクにアクセス**
   - 参加済みユーザーのブラウザで、新しい招待リンクにアクセス

4. **適切なメッセージが表示されることを確認**
   - 「あなたはすでにこの施設に所属しています。」というメッセージが表示される
   - ホームへ戻るリンクが表示される

### ✅ チェックリスト4の完了確認

- [x] 既参加ユーザーで招待リンクにアクセスした
- [x] 「既に所属しています」というメッセージが表示された
- [x] ホームへ戻るリンクが表示された

---

## ✅ テスト項目5: setup/chooseページでの自動リダイレクト確認

### ステップ5-1: 既参加ユーザーでsetup/chooseにアクセス

1. **既に施設に参加しているユーザーでログイン**
   - 参加済みユーザーのアカウントでログイン

2. **setup/chooseページにアクセス**
   ```
   https://carebridge-hub.vercel.app/setup/choose
   ```

3. **自動リダイレクトを確認**
   - 自動的に `/home` にリダイレクトされる
   - セットアップ画面が表示されない

### ✅ チェックリスト5の完了確認

- [x] 既参加ユーザーで `/setup/choose` にアクセスした
- [x] 自動的に `/home` にリダイレクトされた

---

## ✅ テスト項目6: "見えるべきものだけ"見えるか（権限境界テスト）

### ステップ6-1: 招待ユーザーでログイン

1. **ステップ3で参加したユーザーでログイン**
   - 招待リンクを使用して参加したユーザーでログイン

2. **ホーム画面を確認**
   - ホーム画面が正しく表示されることを確認

### ステップ6-2: 利用者一覧を確認

1. **`/clients` にアクセス**
   - ブラウザのアドレスバーに `https://carebridge-hub.vercel.app/clients` と入力
   - または、下部のナビゲーションバーから「利用者」をタップ

2. **自施設の利用者一覧が表示されることを確認**
   - 自施設の利用者が一覧に表示される
   - エラーメッセージが表示されない

3. **他施設の利用者が表示されないことを確認（他施設データが存在する場合）**
   - 他施設の利用者が一覧に表示されない
   - **注意**: 他施設のデータが存在しない場合は、この確認はスキップできます

### ステップ6-3: SQLで確認（参考）

1. **他施設の利用者が存在するか確認**
   ```sql
   -- 他施設の clients が存在するか（境界テストの材料チェック）
   SELECT facility_id, COUNT(*) AS cnt
   FROM clients
   WHERE deleted = false
   GROUP BY facility_id
   ORDER BY cnt DESC;
   ```
   - 複数の施設に利用者が存在する場合、権限境界テストが可能です

### ✅ チェックリスト6の完了確認

- [x] 招待ユーザーでログインした
- [x] `/clients` が開けた
- [x] 自施設の利用者一覧が見えた
- [x] 他施設の利用者は見えなかった（もし他施設データが存在するなら）

---

## ✅ テスト項目7: client-documents が「招待ユーザーでも」想定通りか

### ステップ7-1: 書類のアップロード

1. **招待ユーザーでログイン**
   - ステップ3で参加したユーザーでログイン

2. **利用者ページにアクセス**
   - `/clients` から利用者を選択
   - または、利用者IDが分かっている場合: `/clients/{client_id}`

3. **書類アップロード機能を確認**
   - 書類アップロードボタンがあることを確認
   - ファイルを選択してアップロードを実行
   - アップロードが成功することを確認

### ステップ7-2: 書類一覧の確認

1. **一覧に表示されることを確認**
   - アップロードした書類が一覧に表示される
   - ファイル名が正しく表示される

### ステップ7-3: 書類の削除

1. **削除機能を確認**
   - アップロードした書類の削除ボタンをクリック
   - 削除が成功することを確認
   - 一覧から削除されることを確認

### ステップ7-4: SQLでStorageを確認（監査）

1. **Supabase SQL Editorを開く**
   - SQL Editor → New query

2. **以下のSQLを実行**
   ```sql
   -- client-documents の最新20件
   SELECT
     id,
     bucket_id,
     name,
     owner,
     created_at,
     updated_at
   FROM storage.objects
   WHERE bucket_id = 'client-documents'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

3. **パス形式を確認**
   ```sql
   -- パス先頭の clientId を抽出して確認
   SELECT
     id,
     name,
     split_part(name, '/', 1) AS client_id,
     split_part(name, '/', 2) AS file_name,
     created_at
   FROM storage.objects
   WHERE bucket_id = 'client-documents'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

4. **結果を確認**
   - `name` が `{client_id}/{file_name}` の形式になっている
   - `client_id` が自施設の利用者IDであることを確認

### ✅ チェックリスト7の完了確認

- [x] 書類アップロードできた（INSERT）
- [x] 一覧に出た（SELECT）
- [x] 削除できた（DELETE）
- [x] 他施設の利用者IDに対しては見えない/操作できない（重要）
- [x] SQLでStorageに正しく保存されることを確認した

---

## 📝 テスト結果の記録

### テスト実施日時
- **日時**: _______________
- **実施者**: _______________
- **環境**: carebridge-hub.vercel.app（本番）

### テスト結果サマリー

| テスト項目 | 結果 | 備考 |
|---------|------|------|
| 0. 新規施設の作成 | ⏳ / ✅ | |
| 1. 招待リンク作成 | ⏳ / ✅ | |
| 2. 招待リンクの有効性確認 | ⏳ / ✅ | |
| 3. 招待リンクを使用して参加 | ⏳ / ✅ | |
| 4. 既参加ユーザーの処理 | ⏳ / ✅ | |
| 5. setup/choose自動リダイレクト | ⏳ / ✅ | |
| 6. 権限境界テスト | ⏳ / ✅ | |
| 7. client-documents 動作確認 | ⏳ / ✅ | |

### 発見された問題

問題が発生した場合は、以下を記録してください：

1. **問題1**: 
   - **現象**: 
   - **再現手順**: 
   - **想定原因**: 
   - **対応**: 

---

## 🎯 完了条件

すべてのテスト項目が ✅ になれば、ユーザー招待機能のテストは完了です。

- [ ] 新規施設が正しく作成される ✅
- [ ] 施設作成者が自動的に管理者ロールを持つ ✅
- [ ] 招待リンクが正しく作成される ✅
- [ ] 招待リンクが有効である（期限切れ/使用済み/キャンセル済みでない） ✅
- [ ] 招待リンクを使用してユーザーが参加できる ✅
- [ ] 既参加ユーザーが適切に処理される ✅
- [ ] setup/chooseページで自動リダイレクトされる ✅
- [ ] 権限境界が正しく機能する ✅
- [ ] client-documents が正しく動作する ✅

---

## 💡 トラブルシューティング

### 問題: 招待リンクが作成されない

**確認ポイント:**
1. 管理者アカウントでログインしているか確認
2. ブラウザのコンソールにエラーが表示されていないか確認
3. Supabase SQL Editorで `invite_codes` テーブルを確認

### 問題: 招待リンクにアクセスできない

**確認ポイント:**
1. 招待コードが正しいか確認
2. SQLで招待コードの状態を確認（期限切れ/使用済み/キャンセル済みでないか）
3. 施設が削除されていないか確認

### 問題: 参加が完了しない

**確認ポイント:**
1. ログイン状態を確認
2. ブラウザのコンソールにエラーが表示されていないか確認
3. SQLで `user_facility_roles` にレコードが作成されているか確認

### 問題: 権限が正しく動作しない

**確認ポイント:**
1. SQLで `user_facility_roles` の `role` が正しいか確認
2. SQLで `deleted = false` であることを確認
3. RLSポリシーが正しく適用されているか確認

---

## 📞 サポート

テスト実施中に問題が発生した場合は、以下を記録して共有してください：

1. **問題の現象**: 何が起こったか
2. **再現手順**: どの操作で発生したか
3. **エラーメッセージ**: ブラウザのコンソールやSQLのエラーメッセージ
4. **スクリーンショット**: 可能であれば、画面のスクリーンショット

