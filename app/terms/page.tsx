import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '利用規約 | CareBridge Hub',
  description: 'CareBridge Hub の利用規約です。本サービスを利用される前に、本規約をよくお読みいただき、内容に同意のうえご利用ください。',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/menu" className="p-2">
            <span className="text-gray-600">←</span>
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">利用規約</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            CareBridge Hub 利用規約（商用対応・完全版）
          </h2>
          <p className="text-xs text-gray-500 mb-6">制定日：2025年12月1日</p>

          <div className="prose prose-sm max-w-none space-y-6">
            <p className="text-sm leading-relaxed text-gray-700">
              本利用規約（以下「本規約」といいます。）は、CareBridge Hub（以下「本サービス」といいます。）の利用条件を定めるものです。本サービスを利用される前に、本規約をよくお読みいただき、内容に同意のうえご利用ください。本サービスを利用された場合、本規約に同意されたものとみなします。
            </p>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第1条（適用）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本規約は、本サービスの提供条件および本サービスの利用に関する、運営者と利用者との間の一切の関係に適用されます。
                </li>
                <li>
                  運営者が本サービス上で随時掲載するプライバシーポリシー、ガイドライン、各種ルール等は、本規約の一部を構成するものとします。
                </li>
                <li>
                  本規約と前項の各規定が矛盾・抵触する場合は、本規約の定めが優先して適用されます。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第2条（定義）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                本規約において使用する用語の定義は、次のとおりとします。
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>「運営者」とは、本サービスを運営する永冨寛治をいいます。</li>
                <li>「利用者」とは、本サービスに利用登録を行い、運営者が承認した個人または法人をいいます。</li>
                <li>
                  「施設」とは、医療機関、福祉施設、介護事業所、放課後等デイサービスなど、本サービスを通じて情報共有・連絡を行う組織をいいます。
                </li>
                <li>
                  「職員」とは、施設に所属し、本サービスを通じて情報記録・共有等を行うスタッフをいいます。
                </li>
                <li>
                  「サービス対象者」とは、施設が支援・医療・介護等のサービスを提供する利用者・患者等をいいます。
                </li>
                <li>
                  「投稿情報」とは、利用者が本サービスに入力・投稿・保存した一切の情報（テキスト、画像、ファイル等を含みます）をいいます。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第3条（利用登録）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスの利用を希望する者は、本規約に同意のうえ、運営者の定める方法により利用登録を申請するものとします。
                </li>
                <li>
                  運営者は、以下の各号のいずれかに該当すると判断した場合、登録申請を承認しないことがあります。
                  <ol className="list-[lower-alpha] list-inside ml-4 mt-2 space-y-1">
                    <li>登録情報に虚偽、誤記または記載漏れがあった場合</li>
                    <li>過去に本規約違反等により利用停止処分を受けている場合</li>
                    <li>反社会的勢力またはその関係者であると運営者が判断した場合</li>
                    <li>その他、運営者が利用登録を適当でないと判断した場合</li>
                  </ol>
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第4条（アカウント管理）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  利用者は、自己の責任において、本サービスのアカウントIDおよびパスワードを厳重に管理するものとします。
                </li>
                <li>
                  パスワードは、英小文字・英大文字・数字・記号のうち3種類以上を含むものを設定し、第三者に推測されにくいものとしてください。
                </li>
                <li>
                  利用者は、アカウント情報を第三者に利用させ、譲渡し、名義変更し、売買し、貸与し、担保に供し、その他の処分をしてはなりません。
                </li>
                <li>
                  アカウント情報の管理不備、使用上の過誤、第三者の使用等により生じた損害について、運営者は一切の責任を負いません。
                </li>
                <li>
                  アカウントの不正利用が疑われる場合、利用者は直ちに運営者に連絡し、その指示に従うものとします。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第5条（禁止事項）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm leading-relaxed text-gray-700">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為または犯罪行為に結びつくおそれのある行為</li>
                <li>虚偽の情報を登録・送信する行為</li>
                <li>第三者の名誉・信用・プライバシー・肖像権・その他権利を侵害する行為</li>
                <li>
                  サービス対象者の個人情報・医療情報等を、適法な根拠なく取得・利用・第三者提供する行為
                </li>
                <li>本サービスのサーバーやネットワークに過度な負荷を与える行為、不正アクセス行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>本サービスを利用した営業、宣伝、勧誘等（運営者が別途認めた場合を除く）</li>
                <li>反社会的勢力への利益供与その他の協力行為</li>
                <li>その他、運営者が不適切と判断する行為</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第6条（個人情報・医療情報の取扱い）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスは、サービス対象者に関する健康情報、診療情報、支援記録等の要配慮個人情報を取り扱う可能性があります。
                </li>
                <li>
                  利用者は、当該情報を適法に取得し、本サービス上で扱う権限を有することを保証するものとします。
                </li>
                <li>
                  運営者は、別途定めるプライバシーポリシーに従い、個人情報および要配慮個人情報を適切に管理・保護します。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第7条（投稿情報の取扱い）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  利用者が本サービスに投稿した情報の著作権その他の権利は、原則として当該情報を投稿した利用者または正当な権利者に帰属します。
                </li>
                <li>
                  利用者は、運営者に対し、本サービスの運営・改善・保守のために必要な範囲で投稿情報を利用する権利（複製、保存、バックアップ等を含む）を無償かつ非独占的に許諾するものとします。
                </li>
                <li>
                  運営者は、法令に基づく要請、公的機関からの正当な要請、または生命・身体・財産の保護のために必要な場合、投稿情報を閲覧・開示することがあります。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第8条（利用停止・登録抹消）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  運営者は、利用者が以下の各号のいずれかに該当すると判断した場合、事前の通知なく、当該利用者の本サービスの全部または一部の利用停止または登録抹消を行うことができます。
                  <ol className="list-[lower-alpha] list-inside ml-4 mt-2 space-y-1">
                    <li>本規約のいずれかの条項に違反した場合</li>
                    <li>登録情報に虚偽があると判明した場合</li>
                    <li>不正アクセス、不正利用等の行為があった場合</li>
                    <li>反社会的勢力であることが判明した場合</li>
                    <li>その他、運営者が本サービスの利用継続を不適当と判断した場合</li>
                  </ol>
                </li>
                <li>
                  本条に基づき運営者が行った措置により利用者に生じた損害について、運営者は一切の責任を負いません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第9条（サービス内容の変更・中断・終了）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  運営者は、利用者への事前通知なしに、本サービスの内容の全部または一部を変更し、または提供を中断・終了することができます。
                </li>
                <li>
                  運営者は、本サービスの変更、中断、終了により利用者または第三者に生じた損害について、一切の責任を負いません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第10条（保証の否認）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスは、医師その他の専門職による診療行為・専門的判断を代替するものではありません。
                </li>
                <li>
                  運営者は、本サービスが常に正常に動作すること、エラーやバグが存在しないこと、特定の目的への適合性等について、明示または黙示の保証を行いません。
                </li>
                <li>
                  本サービスを通じて取得した情報の正確性・完全性・有用性について、運営者は一切保証しません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第11条（免責事項）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  運営者は、利用者が本サービスを利用したこと、または利用できなかったことにより生じた一切の損害について、運営者に故意または重過失がある場合を除き、責任を負いません。
                </li>
                <li>
                  運営者が責任を負う場合でも、その責任は、直接かつ通常の損害に限られ、かつ過去12か月間に当該利用者から受領した利用料金の総額を上限とします（無償利用の場合は1万円を上限とします）。
                </li>
                <li>
                  利用者同士、利用者と第三者、または利用者とサービス対象者との間で生じた紛争については、当事者間で解決するものとし、運営者はその紛争に関し一切の責任を負いません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第12条（損害賠償）</h3>
              <p className="text-sm leading-relaxed text-gray-700">
                利用者は、本規約に違反し、または違法な行為により運営者に損害（弁護士費用を含む）が生じた場合、その一切の損害を賠償するものとします。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第13条（反社会的勢力の排除）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  利用者は、自らが反社会的勢力（暴力団、暴力団関係企業、総会屋、反社会的活動を行う団体、その他これらに準ずる者をいいます。）に該当しないこと、また将来にわたっても該当しないことを表明し、保証します。
                </li>
                <li>
                  利用者が前項に違反した場合、運営者は何らの催告を要せず、本サービスの利用停止または登録抹消を行うことができます。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第14条（知的財産権）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスに関する一切の知的財産権（プログラム、デザイン、ロゴ、商標等）は運営者または正当な権利者に帰属します。
                </li>
                <li>
                  利用者は、運営者の事前の書面による承諾なく、本サービスに関する著作物等を複製、送信、譲渡、貸与、翻案等してはなりません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第15条（利用規約の変更）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>運営者は、必要と判断した場合、本規約を変更することができます。</li>
                <li>規約変更後に利用者が本サービスを利用した場合、当該変更に同意したものとみなします。</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第16条（利用の終了）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>利用者は、運営者の定める方法により、本サービスの利用を終了することができます。</li>
                <li>
                  利用終了後も、第5条、第6条、第7条、第9条〜第13条、第21条〜第23条の規定は有効に存続します。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第17条（利用環境の整備）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  利用者は、本サービス利用に必要な通信機器、ソフトウェア、通信回線等を自己の負担と責任において準備・維持するものとします。
                </li>
                <li>通信費用は利用者の負担とします。</li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第18条（サービス対象者等への説明責任）
              </h3>
              <p className="text-sm leading-relaxed text-gray-700">
                利用者は、本サービスを通じてサービス対象者の情報を取り扱う場合、必要に応じて当該本人やその保護者等に対して本サービスの利用目的や情報取扱いについて説明し、適切な同意取得等を行う責任を負います。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第19条（外部サービスとの連携）</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスが他の外部サービスと連携する場合、利用者は当該外部サービスの利用規約等を遵守するものとします。
                </li>
                <li>
                  外部サービス側の障害や仕様変更等により連携機能が利用できない場合でも、運営者はその責任を負いません。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                第20条（利用停止・廃止時のデータ取扱い）
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm leading-relaxed text-gray-700">
                <li>
                  本サービスが停止または廃止される場合、運営者は可能な範囲で事前に利用者に通知します。
                </li>
                <li>
                  本サービス停止・廃止後のデータの保管・削除については、別途定めるプライバシーポリシーの定めに従います。
                </li>
              </ol>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第21条（準拠法）</h3>
              <p className="text-sm leading-relaxed text-gray-700">
                本規約は、日本法に準拠し、同法に従って解釈されます。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第22条（合意管轄）</h3>
              <p className="text-sm leading-relaxed text-gray-700">
                本サービスに関して運営者と利用者との間で紛争が生じた場合、運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">第23条（問い合わせ窓口）</h3>
              <p className="text-sm leading-relaxed text-gray-700 mb-2">
                本サービスおよび本規約に関するお問い合わせは、以下の窓口までご連絡ください。
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
