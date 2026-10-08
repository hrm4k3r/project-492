import Footer from './components/Footer'
import NavBar from './components/NavBar'
import '../app/styles/globals.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import { Fraunces, Inter } from 'next/font/google'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

config.autoAddCss = false

const display = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})
const sans = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata = {
  title: 'Queijo Fazenda Santo Antônio | Queijos Artesanais Premiados',
  description:
    'Queijos artesanais premiados na França, produzidos na Fazenda Santo Antônio, em Alagoa (MG). Tradição de família, leite cru e sabor que conquistou o mundo.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body
        className={`${display.variable} ${sans.variable} min-h-screen bg-light font-sans text-primary`}
      >
        <AuthProvider>
          <CartProvider>
            <NavBar />
            {children}
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
