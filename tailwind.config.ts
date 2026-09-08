import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { tinta: '#14110f', papel: '#e9e6e1', ouro: '#8a6f4a' },
      fontFamily: { serif: ['var(--serif)'], sans: ['var(--sans)'] }
    }
  },
  plugins: []
};
export default config;
