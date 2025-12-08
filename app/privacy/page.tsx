import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'プライバシーポリシー | CareBridge Hub',
  description: 'CareBridge Hub のプライバシーポリシーです。本サービスにおける個人情報等の取扱いについて定めています。',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/menu" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">プライバシーポリシー</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            CareBridge Hub プライバシーポリシー（完全版）
          </h2>
          <p className="text-xs text-gray-500 mb-6">制定日：2025年12月1日</p>

          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm leading-relaxed text-gray-700">
              永冨寛治（以下「当事業者」といいます。）は、CareBridge Hub（以下「本サービス」といいます。）において取り扱う個人情報および要配慮個人情報（医療・福祉・支援に関する情報等）の重要性を認識し、これを適切に保護することを社会的責務と考えています。本プライバシーポリシーは、本サービスにおける個人情報等の取扱いについて定めるものです。
            </p>
            <p className="text-sm leading-relaxed text-gray-700">
              本サービスをご利用いただく前に、本ポリシーをよくお読みいただき、内容に同意のうえご利用ください。
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第1条（取得する情報の種類）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                当事業者は、本サービスの提供にあたり、以下の情報を取得する場合があります。
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  利用者に関する情報
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>氏名、メールアドレス、所属施設名、役職、職種 等</li>
                    <li>ログインID、ハッシュ化されたパスワード</li>
                  </ul>
                </li>
                <li>
                  施設およびサービス対象者に関する情報
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>施設名、所在地、連絡先 等</li>
                    <li>サービス対象者の氏名、性別、生年月日 等</li>
                    <li>
                      サービス提供上必要な健康状態、障害に関する情報、アレルギー情報、服薬情報、既往歴、支援記録
                      等
                    </li>
                  </ul>
                </li>
                <li>
                  利用状況・ログ情報
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>アクセス日時、IPアドレス、ブラウザ情報、端末情報</li>
                    <li>本サービス上での操作ログ、投稿・閲覧の履歴 等</li>
                  </ul>
                </li>
                <li>
                  クッキー等により取得する情報
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>セッション管理等に必要なクッキー情報（ブラウザ設定により制御可能）</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第2条（利用目的）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                当事業者は、取得した情報を以下の目的のために利用します。
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm leading-relaxed text-gray-700">
                <li>本サービスの提供・運営・保守のため</li>
                <li>利用者の本人確認、アカウント管理、認証のため</li>
                <li>施設内外の関係者間における連絡・情報共有・記録のため</li>
                <li>障害対応、不正アクセス監視、セキュリティ向上のため</li>
                <li>本サービスの品質向上、新機能の開発、利用状況の分析のため</li>
                <li>利用規約違反行為への対応、紛争解決のため</li>
                <li>法令や行政機関の要請に基づく対応のため</li>
                <li>上記利用目的に付随する目的のため</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第3条（要配慮個人情報の取扱い）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスでは、健康情報、医療情報、障害に関する情報等の要配慮個人情報を取り扱う場合があります。
                </li>
                <li>
                  当事業者は、これらの情報について、法令に基づく場合および本サービスの提供に必要な範囲でのみ利用し、適切な安全管理措置を講じます。
                </li>
                <li>
                  利用者（施設や職員）は、要配慮個人情報を本サービスに登録・利用するにあたり、必要に応じて本人または保護者等から適切な同意を得る責任を負います。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第4条（第三者提供）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  当事業者は、次のいずれかに該当する場合を除き、取得した個人情報を第三者に提供しません。
                  <ol className="list-[lower-alpha] list-inside ml-4 mt-2 space-y-1">
                    <li>本人の同意がある場合</li>
                    <li>法令に基づく場合</li>
                    <li>
                      人の生命・身体・財産の保護のために必要がある場合であって、本人の同意を得ることが困難な場合
                    </li>
                    <li>
                      公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難な場合
                    </li>
                    <li>
                      国の機関等への協力が必要な場合であって、本人の同意取得が支障となるおそれがある場合
                    </li>
                  </ol>
                </li>
                <li>
                  統計情報など、個人を識別できない形式に加工した情報については、適切な安全管理措置を講じたうえで業務改善等に利用・提供する場合があります。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第5条（業務委託・クラウドサービス利用）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  当事業者は、本サービスの提供にあたり、クラウドサービス事業者等に対して個人情報の取扱いを委託することがあります。
                </li>
                <li>
                  委託先を選定する際は、個人情報保護体制等を十分に確認し、必要な契約を締結したうえで、適切な監督を行います。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第6条（安全管理措置）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                当事業者は、個人情報等の漏えい、滅失、毀損等を防止するため、以下の安全管理措置を講じます。
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  組織的安全管理措置
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>個人情報保護責任者の設置</li>
                    <li>アクセス権限の管理</li>
                    <li>不正アクセスや不正利用に関する監査</li>
                  </ul>
                </li>
                <li>
                  人的安全管理措置
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>関係者への教育・研修</li>
                    <li>秘密保持に関する契約または誓約</li>
                  </ul>
                </li>
                <li>
                  物理的安全管理措置
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>端末へのパスワード設定、画面ロック等</li>
                    <li>不要な記録媒体の適切な廃棄</li>
                  </ul>
                </li>
                <li>
                  技術的安全管理措置
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>通信の暗号化（SSL/TLS）</li>
                    <li>アクセスログの取得・監視</li>
                    <li>認証情報（パスワード等）のハッシュ化保存</li>
                    <li>行レベルセキュリティ（RLS）等によるアクセス制御</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第7条（保管期間と削除）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  当事業者は、利用目的の達成に必要な期間、または法令に定められた期間に限り、個人情報等を保管します。
                </li>
                <li>
                  保管期間経過後、または不要となった場合、復元不可能な方法により、適切に削除または匿名化します。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第8条（パスワードの管理と通知）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>パスワードはハッシュ化して保存し、平文で保管しません。</li>
                <li>
                  利用者は、パスワードを第三者に開示せず、推測されにくいものを設定する義務を負います。
                </li>
                <li>
                  パスワード再設定機能を利用した場合、当事業者は、パスワードの再設定手続開始および完了に関する通知メールを送信することがあります。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第9条（開示・訂正・利用停止・削除等の請求）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本人またはその代理人は、当事業者が保有する自己の個人情報について、開示・訂正・追加・削除・利用停止・第三者提供の停止等を求めることができます。
                </li>
                <li>これらの請求があった場合、当事業者は、法令に従い、合理的な範囲で速やかに対応します。</li>
                <li>開示等の請求に際し、本人確認のための書類等の提示をお願いする場合があります。</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第10条（クッキー等の利用）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスでは、ログイン状態の維持や利用状況の把握のためにクッキー等の技術を利用する場合があります。
                </li>
                <li>
                  利用者は、ブラウザの設定によりクッキーを無効にすることができますが、その場合、本サービスの一部機能が利用できなくなる場合があります。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第11条（未成年の利用者の個人情報）
              </h3>
              <p className="text-sm leading-relaxed text-gray-700">
                未成年のサービス対象者に関する情報については、原則としてその保護者等、適法な代理権を有する者の管理の下で登録・利用されるものとします。必要に応じて保護者等からの同意取得が行われることを前提とします。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第12条（本ポリシーの変更）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>当事業者は、必要に応じて本プライバシーポリシーを変更することがあります。</li>
                <li>重要な変更がある場合は、本サービス上での掲示その他適切な方法によりお知らせします。</li>
                <li>変更後に本サービスの利用を継続した場合、当該変更に同意したものとみなします。</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第13条（法令遵守）</h3>
              <p className="text-sm leading-relaxed text-gray-700">
                当事業者は、個人情報の取扱いに関して、個人情報保護法その他適用される法令およびガイドラインを遵守します。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第14条（お問い合わせ窓口）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                個人情報の取扱いに関するお問い合わせ、開示等のご請求は、以下の窓口までお願いします。
              </p>
              <ul className="list-none space-y-1 text-sm leading-relaxed text-gray-700">
                <li>・事業者名：永冨寛治</li>
                <li>・メールアドレス：kanjinagahisa@gmail.com</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
