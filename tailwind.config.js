/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta extraída do rótulo/logo da Fazenda Santo Antônio:
        // casca do queijo (terracota), fita de premiação (bronze/ouro),
        // painel de texto (carvão) e o creme do papel do rótulo.
        light: '#FBF3E6', // creme do rótulo — fundo principal
        cream: '#FBF3E6',
        primary: '#2A1B14', // carvão amadeirado — texto, header, footer
        ink: '#2A1B14',
        secondary: '#C7A15A', // bronze/ouro da fita "Santo Antônio"
        gold: '#C7A15A',
        tertiary: '#BD5B2C', // terracota da casca do queijo — CTAs, preço
        terracotta: '#BD5B2C',
        olive: '#4B5A3A', // verde do pasto — selos naturais
        cardBorder: '#EADFC9',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
      },
      dropShadow: {
        dark: '0.35rem 0.35rem 0.2rem rgba(0, 0, 0, 0.8)',
        dark0: '0.1rem 0.2rem 0rem rgba(0, 0, 0, 0.8)',
        dark1: '0rem 0rem 2rem #FFFFFF',
      },
      boxShadow: {
        card: '0 8px 30px -8px rgba(42, 27, 20, 0.18)',
        soft: '0 2px 12px rgba(42, 27, 20, 0.08)',
      },
    },
  },
  plugins: [],
}
