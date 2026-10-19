/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{html,js,ts,jsx,tsx}",
    "./public/**/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        }
      }
    },
  },
  plugins: [],
}
