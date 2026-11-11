import Navbar from '../../Navbar'

// same top bar as the home page
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
