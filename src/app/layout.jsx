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

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.curadoriadamesa.com.br'
const TITULO = 'Curadoria da Mesa | Seleção de Sabores'
const DESCRICAO =
  'Cervejas artesanais nacionais e importadas, vinhos, queijos e cafés selecionados com cuidado, com sugestões de harmonização. Entregamos para todo o Brasil.'

// Imagem de prévia do link (WhatsApp, Instagram etc.): public/og-image.png, 1200x630.
const IMAGEM_PREVIA = { url: '/og-image.png', width: 1200, height: 630, alt: TITULO }

export const metadata = {
  metadataBase: new URL(SITE),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: SITE,
    siteName: 'Curadoria da Mesa',
    locale: 'pt_BR',
    type: 'website',
    images: [IMAGEM_PREVIA],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITULO,
    description: DESCRICAO,
    images: [IMAGEM_PREVIA.url],
  },
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
