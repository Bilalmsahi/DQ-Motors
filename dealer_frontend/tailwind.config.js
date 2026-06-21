/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        metro: ['Metropolis', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#E20505',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          DEFAULT: '#E20505',
        },
        accent: {
          50:  '#eef0fb',
          100: '#dde0f7',
          200: '#b8c0ef',
          300: '#8794e3',
          400: '#5664d3',
          500: '#2d3dbb',
          600: '#052199',
          700: '#051a7a',
          800: '#0a1c5e',
          900: '#0a1947',
          950: '#050d28',
          DEFAULT: '#052199',
        },
      },
      boxShadow: {
        brand:       '0 0 15px rgba(226, 5, 5, 0.30)',
        'brand-sm':  '0 4px 12px rgba(226, 5, 5, 0.15)',
        'brand-lg':  '0 15px 40px rgba(226, 5, 5, 0.18)',
        accent:      '0 0 15px rgba(5, 33, 153, 0.30)',
        'accent-sm': '0 4px 12px rgba(5, 33, 153, 0.15)',
      },
    },
  },
  plugins: [],
}
