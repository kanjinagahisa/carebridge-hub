import TabBar from '@/components/TabBar'

export default function GroupsLayout({
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


