# Storage RLSポリシーの動作確認ガイド

このガイドでは、StorageのattachmentsバケットのRLSポリシーが正しく動作しているかを確認する手順を説明します。

## 前提条件

1. Supabaseプロジェクトにアクセスできること
2. テスト用のユーザーアカウントが2つ以上あること（異なる施設に所属）
3. テスト用のクライアントまたはグループが作成されていること
4. ブラウザの開発者ツール（F12）が使用できること

## 確認項目

1. ✅ 認証済みユーザーでStorageのattachmentsバケットからファイルを読み取れるか
2. ✅ ユーザーが所属する施設のクライアント/グループに関連するファイルのみ読み取れるか
3. ✅ 他の施設のファイルは読み取れないか

---

## ステップ1: テスト用データの準備

### 1.1 現在のユーザー情報を確認

SupabaseのSQL Editorで以下のクエリを実行して、現在のユーザー情報を確認します：

```sql
-- 現在のユーザーIDと所属施設を確認
SELECT 
  u.id as user_id,
  u.email,
  ufr.facility_id,
  f.name as facility_name,
  ufr.role
FROM auth.users u
LEFT JOIN user_facility_roles ufr ON u.id = ufr.user_id
LEFT JOIN facilities f ON ufr.facility_id = f.id
WHERE ufr.deleted = FALSE
ORDER BY u.email;
```

### 1.2 テスト用クライアントIDを取得

```sql
-- テスト用のクライアントIDを取得（最初のクライアントを使用）
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
ORDER BY c.created_at
LIMIT 5;
```

**重要**: このクエリで取得した`client_id`をメモしておいてください（例: `d34da20a-5f18-4695-ab5b-396f1f81d4a0`）

### 1.3 テスト用グループIDを取得（オプション）

```sql
-- テスト用のグループIDを取得
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.facility_id,
  f.name as facility_name
FROM groups g
LEFT JOIN facilities f ON g.facility_id = f.id
WHERE g.deleted = FALSE
ORDER BY g.created_at
LIMIT 5;
```

**重要**: このクエリで取得した`group_id`をメモしておいてください

---

## ステップ2: テスト用ファイルのアップロード

### 2.1 ブラウザの開発者ツールを開く

1. ブラウザで `https://carebridge-hub.vercel.app` にアクセス
2. **F12**キーを押して開発者ツールを開く
3. **Console**タブを選択

### 2.2 テスト用ファイルをアップロード（クライアント用）

Consoleタブに以下のコードを貼り付けて実行します：

```javascript
// ステップ1.1で取得したclient_idをここに設定
const clientId = 'YOUR_CLIENT_ID_HERE'; // 例: 'd34da20a-5f18-4695-ab5b-396f1f81d4a0'

// テスト用のテキストファイルを作成
const testContent = 'This is a test file for RLS policy verification';
const blob = new Blob([testContent], { type: 'text/plain' });
const file = new File([blob], 'test-file.txt', { type: 'text/plain' });

// ファイルパス: {client_id}/{filename}
const filePath = `${clientId}/${file.name}`;

// Supabaseクライアントを取得（ページが既にロードされている場合）
const { createClient } = window.supabase || {};
if (!createClient) {
  console.error('Supabase client not found. Please make sure you are logged in.');
} else {
  // ファイルをアップロード
  window.supabase.storage
    .from('attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })
    .then(({ data, error }) => {
      if (error) {
        console.error('Upload error:', error);
      } else {
        console.log('✅ File uploaded successfully:', data);
        console.log('File path:', filePath);
      }
    });
}
```

**実行方法**:
1. `YOUR_CLIENT_ID_HERE`をステップ1.2で取得した`client_id`に置き換える
2. コード全体をコピー
3. Consoleタブに貼り付け
4. **Enter**キーを押して実行

### 2.3 アップロード成功の確認

成功すると、Consoleに以下のようなメッセージが表示されます：
```
✅ File uploaded successfully: { path: 'd34da20a-5f18-4695-ab5b-396f1f81d4a0/test-file.txt' }
File path: d34da20a-5f18-4695-ab5b-396f1f81d4a0/test-file.txt
```

---

## ステップ3: ファイル読み取りのテスト

### 3.1 自分の施設のクライアントファイルを読み取れるか確認

Consoleタブに以下のコードを貼り付けて実行します：

```javascript
// ステップ2.2でアップロードしたファイルパスを使用
const filePath = 'YOUR_CLIENT_ID_HERE/test-file.txt'; // ステップ2.2で表示されたパス

window.supabase.storage
  .from('attachments')
  .download(filePath)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Download failed:', error);
      console.error('Error message:', error.message);
    } else {
      console.log('✅ Download successful!');
      // ファイル内容を読み取る
      data.text().then(text => {
        console.log('File content:', text);
      });
    }
  });
```

**期待される結果**: ✅ Download successful! と表示され、ファイル内容が表示される

### 3.2 他の施設のクライアントファイルは読み取れないか確認

**前提**: 別の施設に所属するクライアントIDが必要です。

```sql
-- 別の施設のクライアントIDを取得（現在のユーザーが所属していない施設）
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  f.name as facility_name
FROM clients c
LEFT JOIN facilities f ON c.facility_id = f.id
WHERE c.deleted = FALSE
  AND c.facility_id NOT IN (
    SELECT facility_id 
    FROM user_facility_roles 
    WHERE user_id = auth.uid() 
      AND deleted = FALSE
  )
ORDER BY c.created_at
LIMIT 1;
```

このクエリで取得した`client_id`を使用して、以下のコードを実行します：

```javascript
// 別の施設のクライアントID（現在のユーザーが所属していない施設）
const otherFacilityClientId = 'OTHER_FACILITY_CLIENT_ID_HERE';

// 存在しないファイルパスでテスト（RLSポリシーがブロックするか確認）
const filePath = `${otherFacilityClientId}/test-file.txt`;

window.supabase.storage
  .from('attachments')
  .download(filePath)
  .then(({ data, error }) => {
    if (error) {
      console.log('✅ Expected: Download blocked by RLS policy');
      console.log('Error code:', error.statusCode);
      console.log('Error message:', error.message);
      // エラーコード 403 (Forbidden) が期待される
      if (error.statusCode === '403' || error.message.includes('permission') || error.message.includes('policy')) {
        console.log('✅ RLS policy is working correctly - access denied');
      }
    } else {
      console.error('❌ Unexpected: File downloaded successfully (should be blocked)');
      console.log('File content:', data);
    }
  });
```

**期待される結果**: 
- ❌ Download failed と表示される
- エラーコード: `403` または エラーメッセージに "permission" や "policy" が含まれる
- ✅ RLS policy is working correctly - access denied と表示される

---

## ステップ4: グループファイルのテスト（オプション）

### 4.1 グループ用ファイルのアップロード

```javascript
// ステップ1.3で取得したgroup_idをここに設定
const groupId = 'YOUR_GROUP_ID_HERE';

const testContent = 'This is a test file for group RLS policy verification';
const blob = new Blob([testContent], { type: 'text/plain' });
const file = new File([blob], 'test-group-file.txt', { type: 'text/plain' });

const filePath = `${groupId}/${file.name}`;

window.supabase.storage
  .from('attachments')
  .upload(filePath, file, {
    cacheControl: '3600',
    upsert: false
  })
  .then(({ data, error }) => {
    if (error) {
      console.error('Upload error:', error);
    } else {
      console.log('✅ Group file uploaded successfully:', data);
    }
  });
```

### 4.2 グループファイルの読み取りテスト

```javascript
const groupId = 'YOUR_GROUP_ID_HERE';
const filePath = `${groupId}/test-group-file.txt`;

window.supabase.storage
  .from('attachments')
  .download(filePath)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Download failed:', error);
    } else {
      console.log('✅ Group file download successful!');
      data.text().then(text => {
        console.log('File content:', text);
      });
    }
  });
```

---

## ステップ5: 結果の確認

### 成功の基準

以下のすべてが満たされていれば、RLSポリシーは正しく動作しています：

1. ✅ **自分の施設のクライアント/グループファイルは読み取れる**
   - ステップ3.1でファイルが正常にダウンロードできる

2. ✅ **他の施設のファイルは読み取れない**
   - ステップ3.2でエラー（403 Forbidden）が返される

3. ✅ **認証されていない場合はアクセスできない**
   - ログアウト状態でファイルにアクセスしようとするとエラーが返される

### トラブルシューティング

#### 問題: 自分の施設のファイルも読み取れない

**確認事項**:
1. ファイルパスが正しいか（`{client_id}/{filename}`形式）
2. クライアントが正しい施設に所属しているか
3. ユーザーがその施設に所属しているか

**デバッグ用クエリ**:
```sql
-- ファイルパスとクライアントの関係を確認
SELECT 
  c.id as client_id,
  c.name as client_name,
  c.facility_id,
  ufr.user_id,
  ufr.role
FROM clients c
LEFT JOIN user_facility_roles ufr ON c.facility_id = ufr.facility_id
WHERE c.id::text = 'YOUR_CLIENT_ID_HERE' -- ステップ1.2で取得したID
  AND ufr.user_id = auth.uid()
  AND c.deleted = FALSE
  AND ufr.deleted = FALSE;
```

#### 問題: 他の施設のファイルも読み取れてしまう

**確認事項**:
1. RLSポリシーが正しく作成されているか（`docs/fix-storage-read-policy.sql`を再実行）
2. StorageバケットのRLSが有効になっているか

**確認用クエリ**:
```sql
-- StorageバケットのRLS設定を確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
```

`rowsecurity`が`true`であることを確認してください。

---

## 完了

すべてのテストが成功したら、StorageのRLSポリシーは正しく動作しています！🎉









