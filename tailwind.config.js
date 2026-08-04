/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Application surfaces (dark theme)
        base: '#0B0D10',
        panel: '#14171C',
        'panel-hover': '#1B2027',
        'panel-active': '#22272F',
        // Borders
        edge: '#262C36',
        'edge-light': '#333B47',
        // Text
        muted: '#8B94A3',
        // Semantic accents
        accent: {
          DEFAULT: '#10B981',
          hover: '#0EA472',
          active: '#0C8F64',
          muted: 'rgba(16, 185, 129, 0.12)'
        },
        danger: {
          DEFAULT: '#EF4444',
          hover: '#DC2626',
          muted: 'rgba(239, 68, 68, 0.12)'
        },
        warning: '#F59E0B'
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
};
