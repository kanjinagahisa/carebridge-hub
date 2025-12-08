import TabBar from '@/components/TabBar'

export default function HomeLayout({
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


