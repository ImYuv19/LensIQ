/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0C0E',
        surface: {
          DEFAULT: '#121417',
          elevated: '#181B1F',
          border: '#23272F',
          hover: '#1E2228',
          subtle: '#2A2F38',
        },
        primary: {
          DEFAULT: '#D71920', // Bloody red accent
          hover: '#BF141A',
          active: '#9E0F14',
          subtle: 'rgba(215, 25, 32, 0.12)',
          border: 'rgba(215, 25, 32, 0.35)',
        },
        foreground: '#F3F4F6',
        muted: {
          DEFAULT: '#8E95A2',
          dark: '#5B6270',
          light: '#BAC0CC',
        },
        border: '#23272F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'modal': '0 12px 32px rgba(0, 0, 0, 0.7)',
        'glow-red': '0 0 15px rgba(215, 25, 32, 0.25)',
      },
    },
  },
  plugins: [],
}

