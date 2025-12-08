import TabBar from '@/components/TabBar'

export default function MenuLayout({
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


