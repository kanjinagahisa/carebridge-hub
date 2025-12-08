import TabBar from '@/components/TabBar'

export default function ConnectionsLayout({
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


