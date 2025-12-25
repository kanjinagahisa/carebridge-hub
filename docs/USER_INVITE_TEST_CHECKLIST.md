# ユーザー招待：本番テスト用チェックリスト（SQL付き）

**対象環境**: 本番（Vercel: carebridge-hub-prod）  
**目的**: ユーザー招待機能が正しく動作し、招待されたユーザーが適切な権限でアプリを利用できることを確認

---

## 📋 事前準備（共通）

### テストで使う値を決定

- [ ] **FACILITY_ID**: 招待する施設のIDを決める
- [ ] **INVITE_CODE**: 作成された招待コード（テスト後に確認）
- [ ] **INVITE_LINK**: 作成された招待リンクURL（例: `https://carebridge-hub.vercel.app/invite/{code}`）
- [ ] **INVITER_EMAIL** または **INVITER_UID**: 招待リンクを作成する既存ユーザー（管理者）のメールアドレスまたは UID

---

## ✅ テスト項目

### 1. 招待リンクが作成されたか（招待リンク作成〜共有）

#### UIチェック

- [ ] 施設設定ページ（`/settings/facility/invite?facility_id={FACILITY_ID}`）にアクセス
- [ ] 「招待ロール」を選択（`一般職員` または `管理者`）
- [ ] 「招待メッセージ（任意）」を入力（オプション）
- [ ] 「招待リンクを作成」ボタンをクリック
- [ ] 招待リンクが画面に表示される
- [ ] リンクのコピーボタンでクリップボードにコピーできる
- [ ] リンクの形式が `https://carebridge-hub.vercel.app/invite/{code}` になっている

#### SQL：invite_codes テーブルに作成されたか確認

```sql
-- 作成された招待コードを確認
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
WHERE facility_id = 'FACILITY_ID_HERE'::uuid
ORDER BY created_at DESC
LIMIT 10;
```

#### 判定

- [ ] `invite_codes` テーブルに新しいレコードが作成されている
- [ ] `code` が生成されている（UUID形式）
- [ ] `facility_id` が正しい
- [ ] `role` が選択したロールと一致している（`staff` または `admin`）
- [ ] `expires_at` が設定されている（48時間後）
- [ ] `used = false`
- [ ] `cancelled = false`

---

### 2. 招待リンクにアクセスできるか（招待リンクの有効性確認）

#### UIチェック

- [ ] 作成した招待リンク（`/invite/{code}`）にアクセスできる
- [ ] 未ログイン状態でリンクにアクセスしても問題なく表示される
- [ ] 施設名が正しく表示される
- [ ] 「ログインして承認する」ボタンが表示される（未ログインの場合）

#### SQL：招待リンクの状態確認

```sql
-- 特定の招待コードの状態を確認
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
WHERE ic.code = 'INVITE_CODE_HERE'
  AND f.deleted = false;
```

#### 判定

- [ ] 招待コードが存在する
- [ ] 施設が削除されていない（`f.deleted = false`）
- [ ] 期限切れでない（`expires_at > NOW()`）
- [ ] 使用済みでない（`used = false`）
- [ ] キャンセルされていない（`cancelled = false`）

---

### 3. 招待リンクを使用してユーザーが参加できるか（招待受け入れ〜ユーザー作成）

#### UIチェック

- [ ] 未ログイン状態で招待リンクにアクセス
- [ ] 「ログインして承認する」ボタンをクリック
- [ ] ログインページにリダイレクトされる（`/login?redirect=/invite/{code}`）
- [ ] 既存アカウントでログインする（または新規サインアップする）
- [ ] ログイン後、招待受け入れページに戻る
- [ ] 施設名と「この施設に参加しますか？」が表示される
- [ ] 「参加する」ボタンをクリック
- [ ] 「参加が完了しました！」のメッセージが表示される
- [ ] ホーム画面に遷移できる

#### SQL：ユーザーが作成されたか確認（新規ユーザーの場合）

```sql
-- 招待リンク使用後に作成されたユーザーを確認
-- 注意: 既存ユーザーが招待を受け入れた場合は、auth.users には既に存在します
SELECT
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 hour'  -- 直近1時間以内に作成されたユーザー
ORDER BY created_at DESC;
```

---

### 4. アプリ側の「施設ロール付与」ができているか（最重要）

ここはあなたの実装だと思うので、`user_facility_roles`（または近いテーブル）に紐付くかを見ます。

#### 4-1) まずテーブルが存在するか確認（保険）

```sql
-- それっぽいテーブルの存在確認
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('user_facility_roles', 'facilities', 'clients', 'groups', 'invite_codes')
ORDER BY table_schema, table_name;
```

#### 4-2) user_facility_roles の付与確認

```sql
-- 招待を受け入れたユーザーの uid で施設ロールを確認
-- 注意: ユーザーの email または uid を事前に取得してください
SELECT
  ufr.user_id,
  ufr.facility_id,
  f.name AS facility_name,
  ufr.role,
  ufr.deleted,
  ufr.created_at
FROM user_facility_roles ufr
JOIN facilities f ON f.id = ufr.facility_id
WHERE ufr.user_id = 'USER_ID_HERE'::uuid  -- または WHERE u.id = (SELECT id FROM auth.users WHERE email = 'EMAIL_HERE')
  AND ufr.facility_id = 'FACILITY_ID_HERE'::uuid
ORDER BY ufr.created_at DESC;
```

#### 4-3) 招待コードが使用済みになったか確認

```sql
-- 招待コードが使用済み（used = true）になっているか確認
SELECT
  code,
  facility_id,
  role,
  used,
  used_at,  -- もしこのカラムがあれば
  created_at
FROM invite_codes
WHERE code = 'INVITE_CODE_HERE';
```

#### 判定

- [ ] `facility_id` が入っている
- [ ] `deleted = false`
- [ ] `role` が想定通り（例：`admin` / `staff` など）

---

### 5. "見えるべきものだけ"見えるか（権限境界テスト）

招待ユーザーでログインして、UIで確認します（SQLだけだとRLS判定できないため）。

#### UIチェック（招待ユーザーで実行）

- [ ] `/clients` が開ける
- [ ] 自施設の利用者一覧が見える
- [ ] 他施設の利用者は見えない（もし他施設データが存在するなら）

#### 参考：SQLで「他施設の利用者が存在するか」だけ確認

```sql
-- 他施設の clients が存在するか（境界テストの材料チェック）
SELECT facility_id, COUNT(*) AS cnt
FROM clients
WHERE deleted = false
GROUP BY facility_id
ORDER BY cnt DESC;
```

---

### 6. client-documents が「招待ユーザーでも」想定通りか

招待ユーザーでログインして、対象利用者（自施設）で：

#### UIチェック

- [ ] 書類アップロードできる（INSERT）
- [ ] 一覧に出る（SELECT）
- [ ] 削除できる（DELETE）
- [ ] 他施設の利用者IDに対しては見えない/操作できない（重要）

#### SQL：実際に Storage に入ったパス確認（監査）

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

-- パス先頭の clientId を抽出して確認（あなたのRLS前提）
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

---

### 7. ✅ 事故りにくくする「任意の＋1点」（おすすめ）

招待ユーザーの初回ログイン後に "facility紐付けが無い状態" を検知してブロックする（UI側ガード）。

#### チェック項目

- [ ] 招待リンクを使用して参加したユーザーでログイン直後、もし `user_facility_roles` が無いなら
- [ ] 「管理者に連絡してください」等を表示して、勝手に進めない

※ これがあると「招待リンクは有効だったけど権限が入ってない」事故が即検出できます。

---

## 🔍 付録：トラブルが出た時の切り分け順

1. **invite_codes に招待コードが作成されているか**
   ```sql
   SELECT
     code,
     facility_id,
     role,
     expires_at,
     used,
     cancelled,
     created_at
   FROM invite_codes
   WHERE code = 'INVITE_CODE_HERE';
   ```

2. **招待リンクが有効か（期限切れ/使用済み/キャンセル済みでないか）**
   ```sql
   SELECT
     code,
     expires_at < NOW() AS is_expired,
     used,
     cancelled,
     CASE
       WHEN cancelled = true THEN 'キャンセル済み'
       WHEN used = true THEN '使用済み'
       WHEN expires_at < NOW() THEN '期限切れ'
       ELSE '有効'
     END AS status
   FROM invite_codes
   WHERE code = 'INVITE_CODE_HERE';
   ```

3. **auth.users にユーザーがいるか（参加後の確認）**
   ```sql
   SELECT id, email, created_at, last_sign_in_at
   FROM auth.users
   WHERE email = 'USER_EMAIL_HERE';
   ```

4. **user_facility_roles に紐付いているか（deleted=falseか）**
   ```sql
   SELECT
     ufr.user_id,
     ufr.facility_id,
     f.name AS facility_name,
     ufr.role,
     ufr.deleted,
     ufr.created_at
   FROM user_facility_roles ufr
   JOIN facilities f ON f.id = ufr.facility_id
   WHERE ufr.user_id = 'USER_ID_HERE'::uuid
     AND ufr.facility_id = 'FACILITY_ID_HERE'::uuid;
   ```

5. **UIで /clients が見えるか**
   - ブラウザで実際にアクセスして確認

6. **Storage.objects に "clientId/…" 形式で入っているか**
   ```sql
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

---

## 📝 テスト結果記録

### テスト実施日時
- **日時**: _______________
- **実施者**: _______________
- **環境**: carebridge-hub-prod（本番）

### テスト結果サマリー

| テスト項目 | 結果 | 備考 |
|---------|------|------|
| 1. 招待リンク作成 | ⏳ | |
| 2. 招待リンクの有効性確認 | ⏳ | |
| 3. 招待リンクを使用して参加 | ⏳ | |
| 4. 施設ロール付与 | ⏳ | |
| 5. 権限境界テスト | ⏳ | |
| 6. client-documents 動作確認 | ⏳ | |
| 7. UI側ガード実装確認 | ⏳ | |

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

## 🎯 完了条件

すべてのテスト項目が ✅ になれば、ユーザー招待機能のテストは完了です。

- [ ] 招待リンクが正しく作成される ✅
- [ ] 招待リンクが有効である（期限切れ/使用済み/キャンセル済みでない） ✅
- [ ] 招待リンクを使用してユーザーが参加できる ✅
- [ ] 施設ロールが正しく付与される ✅
- [ ] 権限境界が正しく機能する ✅
- [ ] client-documents が正しく動作する ✅
- [ ] UI側ガードが実装されている（任意） ✅

