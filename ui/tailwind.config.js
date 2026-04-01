/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chain: { 50:'#f0fdf4', 100:'#dcfce7', 400:'#4ade80', 500:'#22c55e', 600:'#16a34a', 900:'#14532d' },
        eth:   { 400:'#a78bfa', 500:'#8b5cf6', 600:'#7c3aed', 900:'#2e1065' },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
