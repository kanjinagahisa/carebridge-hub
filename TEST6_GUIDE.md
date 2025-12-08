# テスト6: password_updated_at の更新確認 - 実施ガイド

## 📋 目的

パスワード更新時に `password_updated_at` が正しく更新されているかを確認します。

## 🔍 実装確認

現在の実装では、パスワード更新時に以下が実行されます：

```typescript
await supabase.auth.updateUser({
  password: newPassword,
  data: {
    password_updated_at: new Date().toISOString(),
  },
})
```

この `data` オプションの値は、Supabase Auth の **`user_metadata`** に保存されます。

**保存先:**
- `auth.users` テーブルの `raw_user_meta_data` カラム
- または、Supabase Dashboard → Auth → Users → ユーザー詳細 → `user_metadata` フィールド

---

## 📝 テスト手順

### ステップ1: パスワード更新を実行

1. `/auth/forgot-password` にアクセス
2. テスト用メールアドレスを入力して「送信する」をクリック
3. メール内のURLをクリックして `/auth/reset-password` にアクセス
4. パスワード入力欄に新しいパスワードを入力（例: `Test123!pass`）
5. 「送信する」をクリック
6. パスワード更新が成功し、ログイン画面にリダイレクトされることを確認

**記録:**
- パスワード更新を実行した時刻をメモしてください（例: `2024-01-15 14:30:00`）

---

### ステップ2: Supabase Dashboard で確認

#### 方法A: Auth → Users で確認（推奨）

1. **Supabase Dashboard にアクセス**
   - https://supabase.com/dashboard
   - 該当プロジェクトを選択

2. **Auth → Users を開く**
   - 左側メニューから「Authentication」をクリック
   - 「Users」タブを選択

3. **対象ユーザーを検索**
   - テストで使用したメールアドレスで検索
   - 該当ユーザーをクリック

4. **user_metadata を確認**
   - ユーザー詳細画面を開く
   - 「User Metadata」セクションを確認
   - 以下の項目があるか確認:
     ```json
     {
       "password_updated_at": "2024-01-15T14:30:00.000Z"
     }
     ```

5. **時刻の確認**
   - `password_updated_at` の値が、ステップ1でパスワード更新を実行した時刻と一致しているか確認
   - タイムゾーンの違いに注意（ISO 8601形式はUTC時間）

#### 方法B: SQL Editor で確認

1. **Supabase Dashboard → SQL Editor を開く**

2. **以下のSQLクエリを実行**

```sql
-- メールアドレスを指定して確認
SELECT 
  id,
  email,
  raw_user_meta_data->>'password_updated_at' as password_updated_at,
  updated_at,
  created_at
FROM auth.users
WHERE email = 'テストで使用したメールアドレス';
```

3. **結果を確認**
   - `password_updated_at` カラムに値が表示される
   - 時刻がパスワード更新時刻と一致しているか確認

---

### ステップ3: 複数回のパスワード更新を確認（オプション）

より確実に動作を確認するため、複数回パスワードを更新して、`password_updated_at` が都度更新されることを確認します。

1. 再度 `/auth/forgot-password` から新しいパスワード再設定メールを送信
2. 新しいパスワードで更新（例: `NewPass456!abc`）
3. Supabase Dashboard で `password_updated_at` が更新されているか確認
4. 時刻が最新の更新時刻になっていることを確認

---

## ✅ 期待結果

以下の条件をすべて満たせば合格です：

### 必須条件

- ✅ `password_updated_at` が `user_metadata` に存在する
- ✅ `password_updated_at` の値が、パスワード更新を実行した時刻と一致している（または数秒以内）
- ✅ タイムゾーンは UTC 形式（ISO 8601）

### 推奨確認事項

- ✅ 複数回パスワードを更新した場合、`password_updated_at` が都度更新される
- ✅ 値の形式が正しい（ISO 8601形式: `YYYY-MM-DDTHH:mm:ss.sssZ`）

---

## 📊 確認項目チェックリスト

| 確認項目 | 結果 | 備考 |
|---------|------|------|
| `user_metadata` に `password_updated_at` が存在する | ☐ | |
| 値がパスワード更新時刻と一致している | ☐ | |
| 値の形式が正しい（ISO 8601） | ☐ | |
| 複数回更新で都度更新される | ☐ | （オプション） |

---

## 🔍 トラブルシューティング

### `password_updated_at` が存在しない場合

1. **ブラウザのConsoleタブを確認**
   - パスワード更新時にエラーが出ていないか確認
   - `Password update error` というエラーメッセージがないか確認

2. **Networkタブを確認**
   - `updateUser` リクエストが成功しているか確認
   - レスポンスに `user_metadata` が含まれているか確認

3. **実装を確認**
   - `app/auth/reset-password/page.tsx` の `updateUser` 呼び出しを確認
   - `data` オプションに `password_updated_at` が含まれているか確認

### 時刻が一致しない場合

- **タイムゾーンの違いを確認**
  - `password_updated_at` は UTC 時間で保存される
  - ローカル時間（JST）との時差は +9時間
  - 例: JST 14:30:00 = UTC 05:30:00

- **更新タイミングのずれを許容**
  - ネットワーク遅延や処理時間により、数秒のずれは許容範囲

---

## 📸 スクリーンショット推奨

確認の証跡として、以下をスクリーンショットに保存することを推奨します：

1. Supabase Dashboard → Auth → Users → ユーザー詳細画面
2. `user_metadata` セクション（`password_updated_at` が表示されている状態）
3. SQL Editor の実行結果（方法Bを使用した場合）

---

## ✅ 合格条件まとめ

- ✅ `password_updated_at` が `user_metadata` に保存されている
- ✅ 値がパスワード更新時刻と一致している（数秒の誤差は許容）
- ✅ 値の形式が正しい（ISO 8601形式）

**テスト6の判定: 上記の条件をすべて満たせば合格です！**

