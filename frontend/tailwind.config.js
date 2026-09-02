/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#0F172A',
          card: '#1E293B',
          accent: '#6366F1',
          gold: '#F59E0B',
          win: '#10B981',
          lose: '#EF4444',
          draw: '#3B82F6',
        },
      },
      fontFamily: {
        game: ['Nunito', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'bounce-short': 'bounce 0.5s ease-in-out 1',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' },
        },
      },
    },
  },
  plugins: [],
};
