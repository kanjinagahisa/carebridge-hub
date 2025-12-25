# client-documentsバケット SELECT/DELETEポリシー完全確認用SQL

## 目的
画像では`qual`の内容が途中で切れているため、完全な内容を確認するためのSQLです。

## 実行SQL

### 完全なqual内容を取得（推奨）

```sql
select
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Users can read client documents from their facilities',
    'Users can delete client documents from their facilities'
  )
order by policyname, cmd;
```

### より詳細な情報を取得（qualとwith_check両方）

```sql
select
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Users can read client documents from their facilities',
    'Users can delete client documents from their facilities'
  )
order by policyname, cmd;
```

## 期待される完全なqual内容

### SELECT ポリシー ("Users can read client documents from their facilities")
```sql
((bucket_id = 'client-documents'::text) AND (auth.uid() IS NOT NULL) AND 
 (EXISTS (SELECT 1 FROM (clients c JOIN user_facility_roles ufr ON ((c.facility_id = ufr.facility_id)))
   WHERE (((c.id)::text = split_part(objects.name, '/'::text, 1)) AND (ufr.user_id = auth.uid()) 
          AND (ufr.deleted = false) AND (c.deleted = false)))))
```

### DELETE ポリシー ("Users can delete client documents from their facilities")
```sql
((bucket_id = 'client-documents'::text) AND (auth.uid() IS NOT NULL) AND 
 (EXISTS (SELECT 1 FROM (clients c JOIN user_facility_roles ufr ON ((c.facility_id = ufr.facility_id)))
   WHERE (((c.id)::text = split_part(objects.name, '/'::text, 1)) AND (ufr.user_id = auth.uid()) 
          AND (ufr.deleted = false) AND (c.deleted = false)))))
```

## 確認ポイント

1. ✅ `bucket_id = 'client-documents'::text` が含まれている
2. ✅ `auth.uid() IS NOT NULL` が含まれている
3. ✅ `clients` テーブルのチェックが含まれている
4. ✅ `user_facility_roles` とのJOINでユーザーの施設アクセスを確認している
5. ✅ `split_part(objects.name, '/'::text, 1)` でclient_idを抽出している
6. ✅ `groups` のチェックが**含まれていない**（client-documentsは利用者書類専用のため）

## 画像から読み取れる情報

画像から見える部分：
- 両方のポリシーが `FROM (clients c JOIN user_facility_roles ufr ON ((c.facility_id = ufr.facility_` で始まっている
- これは期待される構造と一致しています
- INSERTポリシーと同じ構造であることが確認できます

## 次のステップ

上記SQLを実行して、完全な`qual`内容を確認してください。結果を共有していただければ、最終的な評価を行います。





