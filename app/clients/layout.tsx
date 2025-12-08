import TabBar from '@/components/TabBar'

export default function ClientsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <TabBar />
    </>
  )
}


