/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        income:  '#22c55e',
        expense: '#ef4444',
        ai:      '#3b82f6',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      // Consistent surface tokens used throughout components
      backgroundColor: {
        surface: {
          DEFAULT: '#ffffff',
          dark:    '#0f172a', // slate-900
        },
      },
    },
  },
  plugins: [],
};
