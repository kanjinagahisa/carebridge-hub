import { redirect } from 'next/navigation'

/**
 * 利用者ページ（/clients/[id]）
 * タイムラインページにリダイレクト
 */
export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/clients/${id}/timeline`)
}
