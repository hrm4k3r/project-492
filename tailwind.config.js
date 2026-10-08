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
        // Paleta da Curadoria da Mesa, extraída do logo: marrom do fundo
        // (#5A2A14), creme das letras (#F7E3C5) e tons de madeira/âmbar
        // das fotos. O briefing pede bege, branco e marrom.
        brand: '#5A2A14', // marrom do logo — header, footer, faixas de destaque
        light: '#F8F1E4', // bege — fundo principal
        cream: '#F7E3C5', // creme do logo — texto sobre fundo marrom
        primary: '#3A1B0D', // marrom profundo — texto e botões
        ink: '#3A1B0D',
        secondary: '#C9A36A',
        gold: '#C9A36A', // champanhe — detalhes e filetes
        tertiary: '#A4531C',
        terracotta: '#A4531C', // cobre — preços e destaques
        olive: '#5B6B3E',
        cardBorder: '#E7D9C0',
        sand: '#EFE3CE', // bege mais escuro — faixas alternadas
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-sans)'],
        script: ['var(--font-script)'],
      },
      dropShadow: {
        dark: '0.35rem 0.35rem 0.2rem rgba(0, 0, 0, 0.8)',
        dark0: '0.1rem 0.2rem 0rem rgba(0, 0, 0, 0.8)',
        dark1: '0rem 0rem 2rem #FFFFFF',
      },
      boxShadow: {
        card: '0 10px 32px -10px rgba(58, 27, 13, 0.28)',
        soft: '0 2px 12px rgba(58, 27, 13, 0.08)',
      },
    },
  },
  plugins: [],
}
