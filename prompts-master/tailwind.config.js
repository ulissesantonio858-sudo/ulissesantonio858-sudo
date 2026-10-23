/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060B16',
        'bg-2': '#0B1224',
        surface: '#11182D',
        'surface-2': '#18213B',
        violet: { DEFAULT: '#7659F8', light: '#A997FF', deep: '#5B3FE0' },
        ink: '#F7F6FD',
        muted: '#A2A6BD',
        glow: '#99DBFF',
        line: 'rgba(169, 151, 255, 0.16)',
        'line-strong': 'rgba(169, 151, 255, 0.36)',
        success: '#6EE7B7',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: { content: '1240px' },
      borderRadius: { card: '16px', panel: '22px' },
      boxShadow: {
        card: '0 20px 40px -20px rgba(0, 0, 0, 0.6)',
        glow: '0 0 80px rgba(118, 89, 248, 0.35)',
      },
    },
  },
  plugins: [],
}
