/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F6F2EB',
        cocoa: '#30231E',
        caramel: { DEFAULT: '#B48761', deep: '#7A5536' },
        sand: '#E5D9CB',
        charcoal: '#211C19',
        muted: '#5E514A',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Inter Tight Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        photo: '6px',
      },
      maxWidth: {
        page: '88rem',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(.22,.61,.36,1)',
      },
    },
  },
  plugins: [],
}
