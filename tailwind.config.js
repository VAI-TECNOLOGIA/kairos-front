/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:   '#02030B',
        accent: '#0055FE',
        green:  '#00C9A7',
        amber:  '#F59E0B',
        red:    '#FF4D6D',
        purple: '#7C3AED',
        bg:     '#060714',
        bg2:    '#0D1130',
        bg3:    '#131640', 
        border: 'rgba(61,69,96,0.5)',
        text:   '#E8EEFF',  
        text2:  '#8B9AB8',
        text3:  '#4A5568',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-dot': 'pulseDot 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.4' } },
      },
    },
  },
  plugins: [],
};
