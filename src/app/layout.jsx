import ShellPublico from './components/ShellPublico' 
import '../app/styles/globals.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { config } from '@fortawesome/fontawesome-svg-core'
import localFont from 'next/font/local'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'

config.autoAddCss = false

const SCRIPT_MAIORIDADE =
  '(function(){try{var t=Number(localStorage.getItem("maioridade-confirmada"));if(t&&Date.now()-t<2592000000)document.documentElement.setAttribute("data-maior","1")}catch(e){}})();'

// Fontes (Google Fonts, subconjunto latino) guardadas no projeto em src/app/fonts: o build não
// depende mais de baixar nada do Google, que às vezes estoura o tempo e derruba o deploy.
const display = localFont({
  src: [
    { path: './fonts/CormorantGaramond-normal.woff2', weight: '300 700', style: 'normal' },
    { path: './fonts/CormorantGaramond-italic.woff2', weight: '300 700', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
})
const sans = localFont({
  src: './fonts/Jost-normal.woff2',
  weight: '300 600',
  variable: '--font-sans',
  display: 'swap',
})
const script = localFont({
  src: './fonts/PinyonScript-normal.woff2',
  weight: '400',
  variable: '--font-script',
  display: 'swap',
})

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
