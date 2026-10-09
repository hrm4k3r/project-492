import ShellPublico from './components/ShellPublico'
import '../app/styles/globals.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import { Cormorant_Garamond, Jost, Pinyon_Script } from 'next/font/google'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

config.autoAddCss = false

const SCRIPT_MAIORIDADE =
  '(function(){try{var t=Number(localStorage.getItem("maioridade-confirmada"));if(t&&Date.now()-t<2592000000)document.documentElement.setAttribute("data-maior","1")}catch(e){}})();'

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})
const sans = Jost({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-sans' })
const script = Pinyon_Script({ subsets: ['latin'], weight: '400', variable: '--font-script' })

export const metadata = {
  title: 'Curadoria da Mesa | Seleção de Sabores',
  description:
    'Cervejas artesanais nacionais e importadas, vinhos, queijos e cafés selecionados com cuidado, com sugestões de harmonização. Entregamos para todo o Brasil.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_MAIORIDADE }} />
      </head>
      <body
        className={`${display.variable} ${sans.variable} ${script.variable} min-h-screen bg-light font-sans text-primary`}
      >
        <AuthProvider>
          <CartProvider>
            <ShellPublico>{children}</ShellPublico>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
