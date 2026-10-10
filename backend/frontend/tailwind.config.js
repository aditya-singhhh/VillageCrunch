/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: '#FBF6EE',
        cream: '#F3E9D8',
        sand: '#E6D6BD',
        line: '#E9DFCF',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#2B1D14', soft: '#5E4A3C', mute: '#7A6759' },
        brand: { DEFAULT: '#6B3A1E', dark: '#4A2713', deep: '#3A1E0F' },
        action: { DEFAULT: '#C2410C', dark: '#9A3412', tint: '#FDEBDD' },
        gold: '#B8860B',
        leaf: { DEFAULT: '#2F5D3A', tint: '#E6F0E4' },
        berry: { DEFAULT: '#B42318', tint: '#FDECEA' },
        focus: '#1D4ED8',
        // Legacy aliases (migrated to the new palette so older markup recolours)
        'desi-brown': '#6B3A1E',
        'desi-gold': '#C2410C',
        'desi-cream': '#F3E9D8',
        'desi-terracotta': '#B42318',
        'desi-green': '#2F5D3A',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        hindi: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { sm: '6px', md: '10px', lg: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(43,29,20,.06), 0 2px 8px rgba(43,29,20,.05)',
        raised: '0 8px 24px rgba(43,29,20,.12)',
      },
      spacing: { 'tab': '56px' },
    },
  },
  plugins: [],
}
