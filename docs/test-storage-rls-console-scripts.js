// ============================================================================
// Storage RLSポリシー動作確認用 - ブラウザConsole実行スクリプト
// ============================================================================
// 使用方法:
// 1. ブラウザで https://carebridge-hub.vercel.app にアクセスしてログイン
// 2. F12キーで開発者ツールを開く
// 3. Consoleタブを選択
// 4. 以下のスクリプトをコピー&ペーストして実行
// ============================================================================

// ============================================================================
// ステップ1: テスト用ファイルのアップロード（クライアント用）
// ============================================================================
// 注意: YOUR_CLIENT_ID_HERE を実際のクライアントIDに置き換えてください
// クライアントIDは、Supabase SQL Editorで以下のクエリを実行して取得できます:
// SELECT id, name, facility_id FROM clients WHERE deleted = FALSE LIMIT 1;

async function uploadClientTestFile(clientId) {
  if (!clientId || clientId === 'YOUR_CLIENT_ID_HERE') {
    console.error('❌ エラー: clientIdを設定してください');
    console.log('使用方法: uploadClientTestFile("d34da20a-5f18-4695-ab5b-396f1f81d4a0")');
    return;
  }

  const testContent = `RLS Policy Test File
Created at: ${new Date().toISOString()}
Client ID: ${clientId}`;
  
  const blob = new Blob([testContent], { type: 'text/plain' });
  const file = new File([blob], 'rls-test-file.txt', { type: 'text/plain' });
  const filePath = `${clientId}/${file.name}`;

  try {
    const { data, error } = await window.supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ アップロード失敗:', error);
      console.error('エラーメッセージ:', error.message);
    } else {
      console.log('✅ ファイルアップロード成功!');
      console.log('ファイルパス:', filePath);
      console.log('データ:', data);
      return filePath;
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
  }
}

// 実行例:
// uploadClientTestFile('d34da20a-5f18-4695-ab5b-396f1f81d4a0');

// ============================================================================
// ステップ2: ファイル読み取りテスト（自分の施設のクライアント）
// ============================================================================

async function testDownloadOwnFacilityFile(filePath) {
  if (!filePath) {
    console.error('❌ エラー: filePathを設定してください');
    console.log('使用方法: testDownloadOwnFacilityFile("client-id/filename.txt")');
    return;
  }

  try {
    const { data, error } = await window.supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) {
      console.error('❌ ダウンロード失敗:', error);
      console.error('エラーコード:', error.statusCode);
      console.error('エラーメッセージ:', error.message);
      return false;
    } else {
      console.log('✅ ダウンロード成功!');
      const text = await data.text();
      console.log('ファイル内容:', text);
      return true;
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
    return false;
  }
}

// 実行例:
// testDownloadOwnFacilityFile('d34da20a-5f18-4695-ab5b-396f1f81d4a0/rls-test-file.txt');

// ============================================================================
// ステップ3: 他の施設のファイル読み取りテスト（アクセス拒否されることを確認）
// ============================================================================

async function testDownloadOtherFacilityFile(otherFacilityClientId) {
  if (!otherFacilityClientId || otherFacilityClientId === 'YOUR_OTHER_FACILITY_CLIENT_ID_HERE') {
    console.error('❌ エラー: otherFacilityClientIdを設定してください');
    console.log('使用方法: testDownloadOtherFacilityFile("other-facility-client-id")');
    return;
  }

  const filePath = `${otherFacilityClientId}/test-file.txt`;

  try {
    const { data, error } = await window.supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) {
      console.log('✅ 期待通り: RLSポリシーによりアクセス拒否されました');
      console.log('エラーコード:', error.statusCode);
      console.log('エラーメッセージ:', error.message);
      
      // 403 Forbidden または permission/policy 関連のエラーが期待される
      if (error.statusCode === '403' || 
          error.message?.toLowerCase().includes('permission') ||
          error.message?.toLowerCase().includes('policy') ||
          error.message?.toLowerCase().includes('row-level security')) {
        console.log('✅ RLSポリシーは正しく動作しています - アクセス拒否');
        return true;
      } else {
        console.warn('⚠️ 予期しないエラー形式:', error);
        return false;
      }
    } else {
      console.error('❌ 予期しない結果: ファイルがダウンロードできました（拒否されるべき）');
      const text = await data.text();
      console.log('ファイル内容:', text);
      return false;
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
    return false;
  }
}

// 実行例:
// testDownloadOtherFacilityFile('other-facility-client-id');

// ============================================================================
// ステップ4: グループファイルのテスト（オプション）
// ============================================================================

async function uploadGroupTestFile(groupId) {
  if (!groupId || groupId === 'YOUR_GROUP_ID_HERE') {
    console.error('❌ エラー: groupIdを設定してください');
    return;
  }

  const testContent = `RLS Policy Test File for Group
Created at: ${new Date().toISOString()}
Group ID: ${groupId}`;
  
  const blob = new Blob([testContent], { type: 'text/plain' });
  const file = new File([blob], 'rls-test-group-file.txt', { type: 'text/plain' });
  const filePath = `${groupId}/${file.name}`;

  try {
    const { data, error } = await window.supabase.storage
      .from('attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('❌ グループファイルアップロード失敗:', error);
    } else {
      console.log('✅ グループファイルアップロード成功!');
      console.log('ファイルパス:', filePath);
      return filePath;
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
  }
}

async function testDownloadGroupFile(filePath) {
  if (!filePath) {
    console.error('❌ エラー: filePathを設定してください');
    return;
  }

  try {
    const { data, error } = await window.supabase.storage
      .from('attachments')
      .download(filePath);

    if (error) {
      console.error('❌ グループファイルダウンロード失敗:', error);
    } else {
      console.log('✅ グループファイルダウンロード成功!');
      const text = await data.text();
      console.log('ファイル内容:', text);
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
  }
}

// ============================================================================
// ステップ5: 一括テスト実行（推奨）
// ============================================================================

async function runAllRLSTests(clientId, otherFacilityClientId) {
  console.log('🚀 Storage RLSポリシーの動作確認テストを開始します...\n');

  // テスト1: 自分の施設のクライアントファイルをアップロード
  console.log('📤 テスト1: 自分の施設のクライアントファイルをアップロード');
  const filePath = await uploadClientTestFile(clientId);
  
  if (!filePath) {
    console.error('❌ テスト1失敗: ファイルのアップロードに失敗しました');
    return;
  }

  console.log('\n📥 テスト2: 自分の施設のクライアントファイルを読み取る');
  const downloadSuccess = await testDownloadOwnFacilityFile(filePath);
  
  if (!downloadSuccess) {
    console.error('❌ テスト2失敗: ファイルの読み取りに失敗しました');
    return;
  }

  if (otherFacilityClientId) {
    console.log('\n🚫 テスト3: 他の施設のファイルは読み取れないことを確認');
    const accessDenied = await testDownloadOtherFacilityFile(otherFacilityClientId);
    
    if (!accessDenied) {
      console.error('❌ テスト3失敗: 他の施設のファイルが読み取れてしまいました（RLSポリシーに問題があります）');
      return;
    }
  } else {
    console.log('\n⚠️ テスト3スキップ: otherFacilityClientIdが設定されていません');
  }

  console.log('\n✅ すべてのテストが成功しました！RLSポリシーは正しく動作しています。');
}

// 実行例:
// runAllRLSTests(
//   'd34da20a-5f18-4695-ab5b-396f1f81d4a0',  // 自分の施設のクライアントID
//   'other-facility-client-id'                // 他の施設のクライアントID（オプション）
// );

// ============================================================================
// ヘルパー関数: 現在のユーザー情報を表示
// ============================================================================

async function showCurrentUserInfo() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) {
      console.error('❌ ユーザー情報の取得に失敗:', error);
      return;
    }

    console.log('👤 現在のユーザー情報:');
    console.log('ユーザーID:', user.id);
    console.log('メールアドレス:', user.email);

    // ユーザーの施設情報を取得（Supabaseクライアント経由）
    const { data: facilities, error: facilitiesError } = await window.supabase
      .from('user_facility_roles')
      .select(`
        facility_id,
        role,
        facilities (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('deleted', false);

    if (facilitiesError) {
      console.error('❌ 施設情報の取得に失敗:', facilitiesError);
    } else {
      console.log('所属施設:', facilities);
    }
  } catch (err) {
    console.error('❌ 予期しないエラー:', err);
  }
}

// 実行例:
// showCurrentUserInfo();

console.log(`
✅ Storage RLSポリシー動作確認スクリプトが読み込まれました

使用可能な関数:
1. uploadClientTestFile(clientId)          - クライアント用テストファイルをアップロード
2. testDownloadOwnFacilityFile(filePath)   - 自分の施設のファイルを読み取るテスト
3. testDownloadOtherFacilityFile(clientId) - 他の施設のファイル読み取り拒否テスト
4. uploadGroupTestFile(groupId)            - グループ用テストファイルをアップロード
5. testDownloadGroupFile(filePath)         - グループファイル読み取りテスト
6. runAllRLSTests(clientId, otherFacilityClientId) - 一括テスト実行（推奨）
7. showCurrentUserInfo()                    - 現在のユーザー情報を表示

詳細な使用方法は docs/test-storage-rls-policy.md を参照してください。
`);










