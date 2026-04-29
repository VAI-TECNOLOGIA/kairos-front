/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Static brand colors — never change with theme
        navy  : '#02030B',
        accent: '#0055FE',
        green : '#00C9A7',
        amber : '#F59E0B',
        red   : '#FF4D6D',
        purple: '#7C3AED',
        // Theme-aware colors — driven by CSS variables (see globals.css)
        // Using rgb(var(--X-rgb) / <alpha-value>) so Tailwind opacity modifiers work
        // e.g. bg-bg3/30 → rgb(var(--bg3-rgb) / 0.3) — updates when theme changes
        bg    : 'rgb(var(--bg-rgb)    / <alpha-value>)',
        bg2   : 'rgb(var(--bg2-rgb)   / <alpha-value>)',
        bg3   : 'rgb(var(--bg3-rgb)   / <alpha-value>)',
        text  : 'rgb(var(--text-rgb)  / <alpha-value>)',
        text2 : 'rgb(var(--text2-rgb) / <alpha-value>)',
        text3 : 'rgb(var(--text3-rgb) / <alpha-value>)',
        border: 'rgb(var(--border-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in' : 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn  : { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp : { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.4' } },
      },
    },
  },
  plugins: [],
};
